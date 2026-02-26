from fastapi import FastAPI, HTTPException, UploadFile, File, Request, Depends, Header
from pydantic import BaseModel, Field, ValidationError
from typing import List, Literal, Optional
from datetime import datetime, timezone
from mangum import Mangum
import os, json, httpx, asyncio

import firebase_admin
from firebase_admin import credentials, auth as firebase_auth, firestore


app = FastAPI(title="tos-mvp")

# CORS is handled by Lambda Function URL configuration.
# Do NOT add FastAPI CORSMiddleware here — it would produce duplicate
# Access-Control-Allow-Origin headers and cause browsers to block responses.


# ===== Firebase Admin init =====
# Local dev:  place firebaseServiceAccount.json in ToSAPI/
# Lambda:     set FIREBASE_SERVICE_ACCOUNT_JSON env var to the JSON file contents
_db = None
try:
    sa_env = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if sa_env:
        cred = credentials.Certificate(json.loads(sa_env))
    else:
        cred = credentials.Certificate("firebaseServiceAccount.json")
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    _db = firestore.client()
except Exception as e:
    print(f"Firebase Admin init failed (scan history disabled): {e}")


# ===== Auth =====
def require_firebase_token(
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> dict:
    """
    Accepts either:
      - A Firebase ID token (issued to signed-in web users)
      - The static API_TOKEN env var (Chrome extension / legacy clients)
    Returns a dict with at least {"uid": str}.
    """
    static_token = os.getenv("API_TOKEN")
    raw_token = None

    if authorization and authorization.lower().startswith("bearer "):
        raw_token = authorization[7:].strip()
    if not raw_token and x_api_key:
        raw_token = x_api_key

    # Static token fallback — extension and legacy callers still work
    if static_token and raw_token == static_token:
        return {"uid": "api-token-user"}

    if not raw_token:
        raise HTTPException(401, "Missing Authorization header")

    try:
        return firebase_auth.verify_id_token(raw_token)
    except Exception as e:
        print(f"Firebase token verification failed: {e}")
        raise HTTPException(401, "Invalid or expired token")


# ===== Firestore scan history =====
async def save_scan(uid: str, text: str, result: "AnalyzeResponse") -> Optional[str]:
    # Skip for legacy static-token callers (extension) and if Firestore isn't init'd
    if _db is None or uid == "api-token-user":
        return None

    def _write() -> str:
        _ts, doc_ref = _db.collection("users").document(uid).collection("scans").add({
            "uid": uid,
            "timestamp": datetime.now(timezone.utc),
            "text_preview": text[:200],
            "summary": result.summary,
            "spans": [s.model_dump() for s in result.spans],
        })
        return doc_ref.id

    try:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _write)
    except Exception as e:
        print(f"Firestore write failed (non-fatal): {e}")
        return None


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "tos-mvp",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ===== Schemas =====
Severity = Literal["LOW", "MED", "HIGH"]

class AnalyzeRequest(BaseModel):
    text: str = Field(..., description="Plain ToS text to analyze")
    max_labels: Optional[int] = Field(10, ge=1, le=50)

class Span(BaseModel):
    label: str
    severity: Severity
    start: int
    end: int
    explanation: str

class AnalyzeResponse(BaseModel):
    summary: dict
    spans: List[Span]
    model: dict
    scan_id: Optional[str] = None

class SummaryOnlyResponse(BaseModel):
    risk_count: int
    highest_severity: Severity


# ===== Fast summary-only LLM call =====
async def analyze_summary_only(text: str) -> dict:
    """Single cheap call: returns only {risk_count, highest_severity} in ~1-2s."""
    api_key = os.getenv("OPENAI_API_KEY")
    model_id = os.getenv("MODEL_ID", "gpt-4o-mini")
    if not api_key:
        raise HTTPException(500, "Model provider not configured")

    system = (
        "Analyze this Terms of Service. Return ONLY valid JSON with exactly these two keys: "
        '{"risk_count": <integer 0-50>, "highest_severity": "<LOW|MED|HIGH>"}. '
        "risk_count is the number of genuinely risky clauses. Be conservative."
    )
    payload = {
        "model": model_id,
        "temperature": 0,
        "max_tokens": 60,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": text[:200_000]},
        ],
    }
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json=payload,
        )
    r.raise_for_status()
    return json.loads(r.json()["choices"][0]["message"]["content"])


# ===== Core LLM call — unchanged =====
async def analyze_text_with_llm(text: str, max_labels: int = 10) -> AnalyzeResponse:
    api_key = os.getenv("OPENAI_API_KEY")
    model_id = os.getenv("MODEL_ID", "gpt-4o-mini")
    if not api_key:
        raise HTTPException(500, "Model provider not configured")

    text = text[:200_000]

    system = (
        "You are a contract reviewer for Terms of Service. "
        "Extract risky clauses as character spans over the ORIGINAL input text and return ONLY JSON:\n"
        "{"
        '"spans":[{"label":str,"severity":"LOW|MED|HIGH","start":int,"end":int,"explanation":str}],'
        '"summary":{"risk_count":int,"highest_severity":"LOW|MED|HIGH"}'
        "}\n"
        "Rules: start/end are 0-based offsets into the ORIGINAL text; merge adjacent same-label spans; "
        "prefer labels from: Arbitration, Class-Action Waiver, Limitation of Liability, Unilateral ToS Changes, "
        "Data Sharing, Tracking/Profiling, Indemnification, Auto-Renewal, IP/Content License. Be conservative."
    )

    payload = {
        "model": model_id,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": text},
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json=payload,
            )
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"]
        data = json.loads(content)
        return AnalyzeResponse(
            summary=data.get("summary", {}),
            spans=[Span(**s) for s in data.get("spans", [])],
            model={"provider": "openai", "id": model_id},
        )
    except httpx.HTTPStatusError as e:
        print(f"LLM HTTP {e.response.status_code}: {e.response.text[:200]}")
        raise HTTPException(502, "Model call failed")
    except (json.JSONDecodeError, ValidationError) as e:
        print("Bad JSON from model:", repr(e))
        return AnalyzeResponse(
            summary={"risk_count": 0, "highest_severity": "LOW"},
            spans=[],
            model={"provider": "openai", "id": model_id},
        )


# ===== Endpoints =====

@app.post("/v1/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest, token: dict = Depends(require_firebase_token)):
    result = await analyze_text_with_llm(req.text, req.max_labels or 10)
    result.scan_id = await save_scan(token["uid"], req.text, result)
    return result

@app.post("/v1/analyze-file", response_model=AnalyzeResponse)
async def analyze_file(file: UploadFile = File(...), token: dict = Depends(require_firebase_token)):
    MAX_BYTES = 5 * 1024 * 1024
    blob = await file.read()
    if len(blob) > MAX_BYTES:
        raise HTTPException(413, "File too large for direct upload; use S3 path for larger inputs.")
    try:
        text = blob.decode("utf-8")
    except UnicodeDecodeError:
        text = blob.decode("latin-1", errors="ignore")
    result = await analyze_text_with_llm(text)
    result.scan_id = await save_scan(token["uid"], text, result)
    return result

@app.post("/v1/analyze-raw", response_model=AnalyzeResponse)
async def analyze_raw(request: Request, token: dict = Depends(require_firebase_token)):
    MAX_BYTES = 5 * 1024 * 1024
    blob = await request.body()
    if len(blob) > MAX_BYTES:
        raise HTTPException(413, "Body too large for direct upload.")
    try:
        text = blob.decode("utf-8")
    except UnicodeDecodeError:
        text = blob.decode("latin-1", errors="ignore")
    result = await analyze_text_with_llm(text)
    result.scan_id = await save_scan(token["uid"], text, result)
    return result


@app.post("/v1/analyze-summary", response_model=SummaryOnlyResponse)
async def analyze_summary(req: AnalyzeRequest, token: dict = Depends(require_firebase_token)):
    """Fast endpoint — returns only risk_count + highest_severity in ~1-2s.
    Intended to be called concurrently with /v1/analyze for progressive UI."""
    try:
        data = await analyze_summary_only(req.text)
        return SummaryOnlyResponse(**data)
    except HTTPException:
        raise
    except Exception as e:
        print(f"analyze-summary error: {e}")
        raise HTTPException(502, "Summary call failed")


# Lambda entrypoint
handler = Mangum(app)
