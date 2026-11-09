"""Fetch and extract bibliographic metadata from a public article URL."""
from __future__ import annotations

import html
import ipaddress
import json
import re
import socket
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import httpx

from app.services.analyzer import analyze_pdf


class _MetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.meta: dict[str, list[str]] = {}
        self.title_parts: list[str] = []
        self.text_parts: list[str] = []
        self.json_ld: list[str] = []
        self._in_title = False
        self._in_json_ld = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key.lower(): value or "" for key, value in attrs}
        if tag.lower() == "meta":
            key = (values.get("name") or values.get("property") or values.get("itemprop") or "").lower()
            content = values.get("content", "").strip()
            if key and content:
                self.meta.setdefault(key, []).append(content)
        elif tag.lower() == "title":
            self._in_title = True
        elif tag.lower() == "script" and values.get("type", "").lower() == "application/ld+json":
            self._in_json_ld = True

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self._in_title = False
        elif tag.lower() == "script" and self._in_json_ld:
            self._in_json_ld = False

    def handle_data(self, data: str) -> None:
        value = " ".join(data.split())
        if not value:
            return
        self.text_parts.append(value)
        if self._in_title:
            self.title_parts.append(value)
        if self._in_json_ld:
            self.json_ld.append(data)


def _first(meta: dict[str, list[str]], *keys: str) -> str | None:
    for key in keys:
        values = meta.get(key.lower()) or []
        if values and values[0].strip():
            return values[0].strip()
    return None


def _years(value: str | None) -> int | None:
    if not value:
        return None
    match = re.search(r"\b((?:19|20)\d{2})\b", value)
    return int(match.group(1)) if match else None


def _json_ld_values(parser: _MetadataParser) -> dict:
    for raw in parser.json_ld:
        try:
            value = json.loads(raw)
        except json.JSONDecodeError:
            continue
        items = value if isinstance(value, list) else [value]
        for item in items:
            if isinstance(item, dict) and any(key in item for key in ("headline", "author", "datePublished")):
                return item
    return {}


def _safe_public_url(value: str) -> str:
    parsed = urlparse(value.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("URL must use http or https")
    try:
        addresses = socket.getaddrinfo(parsed.hostname, parsed.port or (443 if parsed.scheme == "https" else 80))
    except socket.gaierror as exc:
        raise ValueError("URL host cannot be resolved") from exc
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise ValueError("Private and local network URLs are not allowed")
    return value.strip()


def _extract_html(url: str, body: bytes) -> dict:
    decoded = body.decode("utf-8", errors="replace")
    parser = _MetadataParser()
    parser.feed(decoded)
    meta = parser.meta
    schema = _json_ld_values(parser)
    page_text = html.unescape(" ".join(parser.text_parts))

    title = _first(meta, "citation_title", "dc.title", "og:title", "headline")
    title = title or (schema.get("headline") if isinstance(schema.get("headline"), str) else None)
    title = title or " ".join(parser.title_parts).strip() or None

    authors = list(meta.get("citation_author", []))
    if not authors:
        creators = meta.get("dc.creator", []) or meta.get("author", [])
        authors = creators[:]
    if not authors and isinstance(schema.get("author"), (dict, list)):
        schema_authors = schema["author"] if isinstance(schema["author"], list) else [schema["author"]]
        authors = [item.get("name", "").strip() for item in schema_authors if isinstance(item, dict) and item.get("name")]

    doi_match = re.search(r"\b10\.\d{4,9}/[-._;()/:A-Z0-9]+\b", page_text, re.I)
    doi = _first(meta, "citation_doi", "dc.identifier") or (doi_match.group(0).rstrip(".,;") if doi_match else None)

    site_name = _first(meta, "og:site_name")
    source_name = _first(meta, "citation_journal_title", "dc.source")
    source_year = _years(_first(meta, "citation_publication_date", "article:published_time", "date"))
    publication_year = source_year or _years(schema.get("datePublished") if isinstance(schema.get("datePublished"), str) else None)

    cited_match = re.search(
        r"của\s+((?:GS|PGS|TS|ThS)[^!?]{3,120}?)\s+đăng trên\s+(.+?)\s+số\s+\d+/(?:\s*)?((?:19|20)\d{2})",
        page_text,
        re.I,
    )
    if cited_match:
        cited_author = cited_match.group(1).strip(" .,:;")
        source_name = cited_match.group(2).strip(" .,:;")
        publication_year = int(cited_match.group(3))
        authors = [cited_author]

    source_name = source_name or site_name

    fields_found = sum(bool(value) for value in (title, authors, doi, publication_year, source_name))
    confidence = min(0.98, 0.45 + fields_found * 0.10)
    return {
        "source_url": url,
        "content_type": "text/html",
        "document_type": "PUBLICATION",
        "activity_type": "RESEARCH",
        "suggested_rule_code": "RESEARCH_PUBLICATION",
        "title": title,
        "authors": authors,
        "doi": doi,
        "publication_year": publication_year,
        "source_name": source_name,
        "classification": source_name,
        "confidence": round(confidence, 4),
        "needs_review": confidence < 0.75,
        "model": "url-metadata-v1",
        "warnings": [] if fields_found >= 3 else ["Some metadata fields could not be verified from the page"],
    }


async def fetch_url_metadata(url: str) -> dict:
    current = _safe_public_url(url)
    headers = {"User-Agent": "EvidenceMetadataBot/1.0 (+academic-evidence)"}
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=False, headers=headers) as client:
        for _ in range(4):
            response = await client.get(current)
            if response.status_code in {301, 302, 303, 307, 308}:
                location = response.headers.get("location")
                if not location:
                    break
                current = _safe_public_url(urljoin(current, location))
                continue
            response.raise_for_status()
            if len(response.content) > 8 * 1024 * 1024:
                raise ValueError("Remote document is larger than 8 MB")
            content_type = response.headers.get("content-type", "").lower()
            if "application/pdf" in content_type or current.lower().split("?", 1)[0].endswith(".pdf"):
                result = analyze_pdf(response.content).model_dump()
                result.update({"source_url": current, "content_type": "application/pdf", "model": f"{result['model']}+url"})
                return result
            return _extract_html(current, response.content)
    raise ValueError("Too many redirects while fetching URL")
