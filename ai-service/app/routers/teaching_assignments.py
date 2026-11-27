"""Teaching-assignment PDF and Word parsing endpoint."""
from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.teaching_assignment import parse_teaching_assignment_document

router = APIRouter(prefix="/teaching-assignments", tags=["teaching-assignments"])


@router.post("/parse")
async def parse_assignment(file: UploadFile = File(...)):
    filename = file.filename or ""
    suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if suffix not in {"pdf", "docx"}:
        raise HTTPException(status_code=415, detail="Chỉ hỗ trợ PDF hoặc Word .docx phân công giảng dạy")
    data = await file.read()
    if suffix == "pdf" and not data.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="Tệp tải lên không phải là PDF hợp lệ")
    if suffix == "docx" and not data.startswith(b"PK"):
        raise HTTPException(status_code=400, detail="Tệp tải lên không phải là Word .docx hợp lệ")
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Tệp không được vượt quá 20 MB")
    try:
        return parse_teaching_assignment_document(data, filename)
    except ValueError as error:
        raise HTTPException(status_code=415, detail=str(error)) from error
