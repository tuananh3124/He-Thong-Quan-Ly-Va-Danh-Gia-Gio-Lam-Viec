"""Administrator-managed journal ranking snapshots."""
from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.scimago_sync import save_scimago_snapshot

router = APIRouter(prefix="/rankings", tags=["journal-rankings"])


@router.post("/import")
async def import_ranking_csv(file: UploadFile = File(...)):
    filename = file.filename or "ranking.csv"
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=415, detail="Chỉ hỗ trợ file xếp hạng .csv")
    content = (await file.read()).decode("utf-8-sig", errors="replace")
    result = save_scimago_snapshot(content, filename)
    if not result.get("updated"):
        raise HTTPException(status_code=422, detail=result.get("message", "CSV không hợp lệ"))
    return result
