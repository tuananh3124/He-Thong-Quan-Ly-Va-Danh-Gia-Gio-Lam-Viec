"""URL-based metadata extraction for publication evidence."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.url_metadata import fetch_url_metadata

router = APIRouter(prefix="/analyze-url", tags=["evidence-ai"])


class AnalyzeUrlRequest(BaseModel):
    url: str = Field(..., min_length=8, examples=["https://ivides.vnu.edu.vn/article"])


@router.post("")
async def analyze_url(payload: AnalyzeUrlRequest):
    try:
        return await fetch_url_metadata(payload.url)
    except Exception as exc:  # noqa: BLE001 - return a client-safe validation error
        raise HTTPException(status_code=422, detail=f"Cannot analyze URL: {exc}") from exc
