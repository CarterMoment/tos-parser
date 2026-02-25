from fastapi import FastAPI, HTTPException, UploadFile, File, Request, Depends, Header
from pydantic import BaseModel, Field, ValidationError
from typing import List, Literal, Optional
from datetime import datetime, timezone
from mangum import Mangum
import os, json, httpx


app = FastAPI(title="tos-mvp")

from fastapi.middleware.cors import CORSMiddleware


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://app.gertly.com"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["content-type", "authorization"],
)


def require_token(
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
):
    expected = os.getenv("API_TOKEN")
    if not expected:
        raise HTTPException(500, "Server misconfigured: API_TOKEN missing")
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    if not token and x_api_key:
        token = x_api_key
    if token != expected:
        raise HTTPException(401, "Unauthorized")
    return True

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

# ===== Core LLM call (shared) =====
async def analyze_text_with_llm(text: str, max_labels: int = 10) -> AnalyzeResponse:
    api_key = os.getenv("OPENAI_API_KEY")
    model_id = os.getenv("MODEL_ID", "gpt-4o-mini")
    if not api_key:
        raise HTTPException(500, "Model provider not configured")

    # keep MVP sane; chunking can come later
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
        data = json.loads(content)  # ensure valid JSON
        # validate/normalize
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

@app.post("/v1/analyze", response_model=AnalyzeResponse, dependencies=[Depends(require_token)])
async def analyze(req: AnalyzeRequest):
    return await analyze_text_with_llm(req.text, req.max_labels or 10)

@app.post("/v1/analyze-file", response_model=AnalyzeResponse, dependencies=[Depends(require_token)])
async def analyze_file(file: UploadFile = File(...)):
    # simple size guard (few MB fine for Function URLs; use S3 for large files later)
    MAX_BYTES = 5 * 1024 * 1024  # ~5MB MVP
    blob = await file.read()
    if len(blob) > MAX_BYTES:
        raise HTTPException(413, "File too large for direct upload; use S3 path for larger inputs.")
    # decode text; prefer utf-8, tolerate odd encodings
    try:
        text = blob.decode("utf-8")
    except UnicodeDecodeError:
        text = blob.decode("latin-1", errors="ignore")
    return await analyze_text_with_llm(text)

@app.post("/v1/analyze-raw", response_model=AnalyzeResponse, dependencies=[Depends(require_token)])
async def analyze_raw(request: Request):
    # accepts Content-Type: text/plain with body = ToS text
    MAX_BYTES = 5 * 1024 * 1024
    blob = await request.body()
    if len(blob) > MAX_BYTES:
        raise HTTPException(413, "Body too large for direct upload.")
    try:
        text = blob.decode("utf-8")
    except UnicodeDecodeError:
        text = blob.decode("latin-1", errors="ignore")
    return await analyze_text_with_llm(text)

# Lambda entrypoint
handler = Mangum(app)
