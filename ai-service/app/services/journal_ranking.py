"""Resolve journal ISSN and Quartile from an external ranking provider.

The DOI/article page identifies the journal, but it does not reliably contain
its Q1-Q4 ranking. This module keeps that concern separate from document
classification and makes the provider response auditable.
"""
from __future__ import annotations

import csv
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
                reader = csv.DictReader(handle, delimiter=";")
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


def _quartiles_from_scopus(payload: dict[str, Any]) -> tuple[set[str], int | None]:
    explicit: set[str] = set()
    for value in _walk_values(payload, {"quartile", "quartiles"}):
        for match in re.findall(r"\bQ([1-4])\b", str(value), re.IGNORECASE):
            explicit.add(f"Q{match}")

    # Some Scopus metrics responses expose CiteScore percentile rather than a
    # ready-made Q label. The standard four bands are used as a transparent
    # fallback: 75-100 Q1, 50-74 Q2, 25-49 Q3, 0-24 Q4.
    percentiles: list[float] = []
    for value in _walk_values(
        payload,
        {"citescorepercentile", "citescorepercentiles", "percentile", "percentiles"},
    ):
        values = value if isinstance(value, list) else [value]
        for item in values:
            if isinstance(item, dict):
                item = item.get("value") or item.get("percentile") or item.get("percent")
            try:
                number = float(str(item).replace("%", "").strip())
            except (TypeError, ValueError):
                continue
            if 0 <= number <= 100:
                percentiles.append(number)
    for percentile in percentiles:
        explicit.add("Q1" if percentile >= 75 else "Q2" if percentile >= 50 else "Q3" if percentile >= 25 else "Q4")

    years: list[int] = []
    for value in _walk_values(payload, {"year", "publicationyear", "citescoreyear"}):
        try:
            year = int(value)
        except (TypeError, ValueError):
            continue
        if 1990 <= year <= 2100:
            years.append(year)
    return explicit, max(years) if years else None


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
    if settings.quartile_provider.lower() != "scopus":
        if local_fallback:
            return local_fallback
        result.update({"quartile_status": "unsupported_provider", "quartile_reason": "Nguồn Quartile chưa được hỗ trợ."})
        return result
    if not settings.scopus_api_key:
        if local_fallback:
            return local_fallback
        result.update({"quartile_status": "missing_api_key", "quartile_reason": "Chưa cấu hình SCOPUS_API_KEY."})
        return result

    try:
        async with httpx.AsyncClient(timeout=settings.quartile_lookup_timeout) as client:
            response = await client.get(
                settings.scopus_api_url,
                params={"issn": normalized_issn, "view": "ENHANCED"},
                headers={
                    "X-ELS-APIKey": settings.scopus_api_key,
                    "Accept": "application/json",
                },
            )
            response.raise_for_status()
            payload = response.json()
        quartiles, metric_year = _quartiles_from_scopus(payload)
        if len(quartiles) == 1:
            result.update({
                "quartile": next(iter(quartiles)),
                "quartile_source": "scopus",
                "quartile_year": metric_year or publication_year,
                "quartile_status": "verified",
            })
        elif len(quartiles) > 1:
            result.update({
                "quartile_status": "ambiguous",
                "quartile_reason": "Scopus trả nhiều Quartile theo các lĩnh vực; cần chính sách chọn lĩnh vực.",
            })
        else:
            if local_fallback:
                return local_fallback
            result.update({"quartile_status": "not_found", "quartile_reason": "Scopus không trả Quartile/percentile cho ISSN này."})
    except httpx.HTTPStatusError as exc:
        if local_fallback:
            return local_fallback
        result.update({
            "quartile_status": "provider_error",
            "quartile_reason": f"Scopus trả mã HTTP {exc.response.status_code}.",
        })
    except (httpx.HTTPError, ValueError) as exc:
        if local_fallback:
            return local_fallback
        result.update({"quartile_status": "provider_error", "quartile_reason": str(exc)})
    return result
