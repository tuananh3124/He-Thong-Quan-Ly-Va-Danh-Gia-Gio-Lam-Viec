"""Periodic import of the official SCImago country journal export."""
from __future__ import annotations

import csv
import io
import re
from datetime import datetime
from pathlib import Path

import httpx

from app.config import get_settings


def _data_dir() -> Path:
    configured = Path(get_settings().scimago_data_dir)
    return configured if configured.is_absolute() else Path(__file__).resolve().parents[2] / configured


def _snapshot_year(content: str, filename: str | None = None) -> int | None:
    filename_years = [int(value) for value in re.findall(r"(?:19|20)\d{2}", filename or "")]
    if filename_years:
        return max(filename_years)
    header = content.splitlines()[0] if content else ""
    years = [int(value) for value in re.findall(r"(?:19|20)\d{2}", header)]
    return max(years) if years else None


def _delimiter(content: str) -> str:
    header = content.splitlines()[0] if content else ""
    return ";" if header.count(";") >= header.count(",") else ","


def _validate_export(content: str) -> tuple[bool, str]:
    try:
        reader = csv.DictReader(io.StringIO(content), delimiter=_delimiter(content))
        fieldnames = [field.strip().lstrip("\ufeff") for field in (reader.fieldnames or [])]
        required = {"Title", "Issn", "SJR Best Quartile"}
        if not required.issubset(set(fieldnames)):
            return False, "SCImago export thiếu cột Title/Issn/SJR Best Quartile"
        rows = list(reader)
        if not rows:
            return False, "SCImago export không có bản ghi"
        return True, f"{len(rows)} journal records"
    except (csv.Error, UnicodeError) as exc:
        return False, f"CSV không hợp lệ: {exc}"


def save_scimago_snapshot(content: str, filename: str | None = None) -> dict[str, str | int | bool]:
    valid, message = _validate_export(content)
    if not valid:
        return {"updated": False, "message": message}
    year = _snapshot_year(content, filename) or datetime.now().year
    target_dir = _data_dir()
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / f"scimagojr_{year}_vn.csv"
    temporary = target.with_suffix(".tmp")
    temporary.write_text(content, encoding="utf-8")
    temporary.replace(target)
    return {"updated": True, "year": year, "message": message, "file": target.name}


async def download_latest_scimago() -> dict[str, str | int | bool]:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=settings.quartile_lookup_timeout, follow_redirects=True) as client:
        response = await client.get(
            settings.scimago_download_url,
            headers={"User-Agent": "AcademicEvidence/1.0 (+journal-ranking-sync)"},
        )
        response.raise_for_status()
        content = response.content.decode("utf-8-sig", errors="replace")

    return save_scimago_snapshot(content)
