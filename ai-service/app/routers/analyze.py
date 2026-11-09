"""Evidence analysis endpoint used by the declaration workflow."""
from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas import EvidenceAnalyzeResponse
from app.services.analyzer import analyze_pdf

router = APIRouter(prefix="/analyze", tags=["evidence-ai"])


@router.post("", response_model=EvidenceAnalyzeResponse)
async def analyze_evidence(file: UploadFile = File(...)):
    if file.content_type != "application/pdf" and not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Only PDF evidence is supported")
    data = await file.read()
    if not data.startswith(b"%PDF-"):
        raise HTTPException(status_code=422, detail="Uploaded file is not a valid PDF")
    try:
        return analyze_pdf(data)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Cannot analyze PDF: {exc}") from exc
