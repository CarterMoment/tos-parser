from fastapi.testclient import TestClient
from app.main import app, analyze_text_with_llm
from unittest.mock import AsyncMock, patch
import os
import pytest
from httpx import Response, Request, HTTPStatusError
from fastapi import HTTPException

client = TestClient(app)

mock_response = {
    "summary": {"risk_count": 1, "highest_severity": "HIGH"},
    "spans": [
        {"label": "Arbitration", "severity": "HIGH", "start": 0, "end": 20, "explanation": "Sample"}
    ],
    "model": {"provider": "openai", "id": "gpt-4o-mini"}
}

incorrect_response = {
    "summary": {"risk_count": 0, "highest_severity": "HIGH"},
    "spans": [],
    "model": {"provider": "openai", "id": "gpt-4o-mini"}
}

@pytest.fixture
def patch_llm_async():
    with patch("app.main.analyze_text_with_llm", new_callable=AsyncMock) as mock_func:
        mock_func.return_value = mock_response
        yield mock_func

@pytest.fixture
def patch_llm_http_error():
    async def fake_post(*args, **kwargs):
        request = Request("POST", "https://api.openai.com/v1/chat/completions")
        response = Response(502, request=request, content=b"Bad Gateway")
        raise HTTPStatusError("Error", request=request, response=response)

    with patch("httpx.AsyncClient.post", new=fake_post):
        yield

@pytest.fixture
def patch_incorrect_llm_async():
    with patch("app.main.analyze_text_with_llm", new_callable=AsyncMock) as mock_func:
        mock_func.return_value = incorrect_response
        yield mock_func

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"

def test_correct_auth():
    os.environ["API_TOKEN"] = "test-token"
    r = client.post("/v1/analyze", json={"text": "Hello"}, headers={"Authorization": "Bearer test-token"})
    assert r.status_code != 401

def test_incorrect_auth():
    os.environ["API_TOKEN"] = "different-token"
    r = client.post("/v1/analyze", json={"text": "Hello"}, headers={"Authorization": "Bearer test-token"})
    assert r.status_code == 401

def test_analyze_async(patch_llm_async):
    os.environ["API_TOKEN"] = "test-token"
    headers = {"Authorization": "Bearer test-token"}
    r = client.post("/v1/analyze", json={"text": "Hello world"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["summary"]["risk_count"] == 1

def test_analyze_raw_async(patch_llm_async):
    os.environ["API_TOKEN"] = "test-token"
    headers = {"Authorization": "Bearer test-token"}
    r = client.post("/v1/analyze-raw", json={"text": "Hello world"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["summary"]["risk_count"] == 1

def test_analyze_file_async(patch_llm_async):
    headers = {"Authorization": "Bearer test-token"}
    
    # Open the test file in binary mode
    with open("tests/sample_tos.txt", "rb") as f:
        files = {"file": ("sample_tos.txt", f, "text/plain")}   
        r = client.post("/v1/analyze-file", files=files, headers=headers)
    
    assert r.status_code == 200
    data = r.json()
    assert data["summary"]["risk_count"] == 1
    assert len(data["spans"]) == 1
    assert data["spans"][0]["label"] == "Arbitration"

def test_analyze_raw_too_large():
    headers = {"Authorization": "Bearer test-token", "Content-Type": "text/plain"}

    # Create a body larger than MAX_BYTES
    large_body = b"x" * (5 * 1024 * 1024 + 1)

    r = client.post("/v1/analyze-raw", content=large_body, headers=headers)
    
    assert r.status_code == 413
    assert "too large" in r.text.lower()

def test_analyze_file_too_large():
    headers = {"Authorization": "Bearer test-token"}

    # Create a file larger than MAX_BYTES (5MB + 1 byte)
    large_content = b"x" * (5 * 1024 * 1024 + 1)
    files = {"file": ("big.txt", large_content, "text/plain")}

    r = client.post("/v1/analyze-file", files=files, headers=headers)
    
    assert r.status_code == 413
    assert "too large" in r.text.lower()

@pytest.mark.asyncio
async def test_api_key_error(patch_llm_http_error):
    with pytest.raises(HTTPException) as exc:
        await analyze_text_with_llm("Test text")
    assert exc.value.status_code == 500

@pytest.mark.asyncio
async def test_http_error(patch_llm_http_error):
    os.environ["OPENAI_API_KEY"] = "test-key"
    with pytest.raises(HTTPException) as exc:
        await analyze_text_with_llm("Test text")
    assert exc.value.status_code == 502

@pytest.mark.asyncio
async def test_bad_json(patch_incorrect_llm_async):
    os.environ["API_TOKEN"] = "test-token"
    headers = {"Authorization": "Bearer test-token"}
    r = client.post("/v1/analyze", json={"text": "Hello world"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["summary"]["risk_count"] == 0






