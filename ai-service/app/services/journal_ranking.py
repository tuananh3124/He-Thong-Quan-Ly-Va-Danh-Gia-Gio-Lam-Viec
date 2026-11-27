"""Resolve journal ISSN and Quartile from administrator-managed CSV snapshots.

The DOI/article page identifies the journal, but it does not reliably contain
its Q1-Q4 ranking. This module keeps that concern separate from document
classification and makes the provider response auditable.
"""
from __future__ import annotations

import csv
import io
import re
from pathlib import Path
from typing import Any

import httpx

from app.config import get_settings


ISSN_RE = re.compile(r"\b\d{4}[- ]?\d{3}[0-9Xx]\b")


def normalize_issn(value: str | None) -> str | None:
    if not value:
        return None
    match = ISSN_RE.search(value)
    if not match:
        return None
    digits = re.sub(r"[^0-9Xx]", "", match.group(0)).upper()
    return f"{digits[:4]}-{digits[4:]}"


def extract_issn(*values: str | None) -> str | None:
    for value in values:
        issn = normalize_issn(value)
        if issn:
            return issn
    return None


def _issns(value: str | None) -> set[str]:
    if not value:
        return set()
    return {issn for issn in (normalize_issn(part) for part in re.split(r"[,;|]", value)) if issn}


def _scimago_directory() -> Path:
    configured = Path(get_settings().scimago_data_dir)
    return configured if configured.is_absolute() else Path(__file__).resolve().parents[2] / configured


def lookup_scimago_local(issn: str | None, publication_year: int | None = None) -> dict[str, Any] | None:
    """Look up the latest imported SCImago snapshot by ISSN.

    SCImago exports contain a ``SJR Best Quartile`` column and may contain
    multiple ISSNs in one row. The snapshot year is kept in the filename so
    old rankings remain auditable.
    """
    target = normalize_issn(issn)
    if not target:
        return None
    files: list[tuple[int, Path]] = []
    for path in _scimago_directory().glob("*.csv"):
        match = re.search(r"(?:19|20)\d{2}", path.stem)
        if match:
            files.append((int(match.group(0)), path))
    if not files:
        return None
    preferred = sorted(files, key=lambda item: (item[0] > (publication_year or 9999), -item[0]))
    for snapshot_year, path in preferred:
        try:
            with path.open("r", encoding="utf-8-sig", newline="") as handle:
                content = handle.read()
                reader = csv.DictReader(io.StringIO(content), delimiter=";" if content.splitlines()[0].count(";") >= content.splitlines()[0].count(",") else ",")
                for row in reader:
                    if target not in _issns(row.get("Issn")):
                        continue
                    quartile = (row.get("SJR Best Quartile") or "").strip().upper()
                    if quartile not in {"Q1", "Q2", "Q3", "Q4"}:
                        continue
                    return {
                        "issn": target,
                        "quartile": quartile,
                        "quartile_source": "scimago",
                        "quartile_year": snapshot_year,
                        "quartile_status": "verified",
                        "quartile_reason": f"SCImago snapshot {snapshot_year}",
                    }
        except (OSError, csv.Error, UnicodeError):
            continue
    return None


async def resolve_issn_from_doi(doi: str | None) -> str | None:
    if not doi:
        return None
    try:
        async with httpx.AsyncClient(timeout=get_settings().quartile_lookup_timeout) as client:
            response = await client.get(
                f"https://api.crossref.org/works/{doi.strip()}",
                headers={"User-Agent": "AcademicEvidence/1.0 (mailto:admin@example.org)"},
            )
            response.raise_for_status()
            message = response.json().get("message", {})
        return extract_issn(*(message.get("ISSN") or []))
    except (httpx.HTTPError, ValueError, AttributeError):
        return None


def _walk_values(value: Any, wanted: set[str]) -> list[Any]:
    found: list[Any] = []
    if isinstance(value, dict):
        for key, child in value.items():
            if key.lower().replace("_", "") in wanted:
                found.append(child)
            found.extend(_walk_values(child, wanted))
    elif isinstance(value, list):
        for child in value:
            found.extend(_walk_values(child, wanted))
    return found


async def lookup_quartile(issn: str | None, publication_year: int | None = None) -> dict[str, Any]:
    normalized_issn = normalize_issn(issn)
    result: dict[str, Any] = {
        "issn": normalized_issn,
        "quartile": None,
        "quartile_source": None,
        "quartile_year": None,
        "quartile_status": "not_configured",
        "quartile_reason": None,
    }
    settings = get_settings()
    local_fallback = lookup_scimago_local(normalized_issn, publication_year) if settings.scimago_fallback_enabled else None
    if not normalized_issn:
        result.update({"quartile_status": "missing_issn", "quartile_reason": "Không tìm thấy ISSN của tạp chí."})
        return result
    if local_fallback:
        return local_fallback
    result.update({
        "quartile_status": "not_found",
        "quartile_reason": "Chưa có snapshot SCImago phù hợp với ISSN này.",
    })
    return result
