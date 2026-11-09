"""Evidence classification and metadata extraction.

The default path is deterministic and works without model weights. When
ANALYZER_MODEL_PATH points to a fine-tuned XLM-R sequence classifier, the
classifier head is used for document classification and the deterministic
extractors remain as a transparent fallback for metadata.
"""
from __future__ import annotations

import io
import json
import re
from dataclasses import dataclass

from app.config import get_settings
from app.schemas import EvidenceAnalyzeResponse, EvidenceField
from app.services.openai_client import get_client


@dataclass
class PageText:
    page: int
    text: str


_DOI = re.compile(r"\b10\.\d{4,9}/[-._;()/:A-Z0-9]+\b", re.I)
_YEAR = re.compile(r"\b(?:19|20)\d{2}\b")


def _pdf_pages(data: bytes) -> list[PageText]:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    return [PageText(index + 1, page.extract_text() or "") for index, page in enumerate(reader.pages)]


def _first_match(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text, re.I | re.M)
    return match.group(1).strip(" .,:;\n\r\t") if match else None


def _classify(text: str) -> tuple[str, str, float, str | None]:
    normalized = text.lower()
    research_terms = (
        "abstract", "doi", "issn", "journal", "conference", "tạp chí",
        "hội thảo", "nghiên cứu", "research", "publication", "bài báo",
    )
    teaching_terms = ("giáo án", "lecture", "teaching", "môn học", "syllabus", "bài giảng")
    transfer_terms = ("chuyển giao", "hợp đồng", "technology transfer", "consulting")
    scores = {
        "RESEARCH": sum(normalized.count(term) for term in research_terms),
        "TEACHING": sum(normalized.count(term) for term in teaching_terms),
        "KNOWLEDGE_TRANSFER": sum(normalized.count(term) for term in transfer_terms),
    }
    activity = max(scores, key=scores.get)
    best = scores[activity]
    confidence = min(0.95, 0.55 + min(best, 8) * 0.05)
    rule = {
        "RESEARCH": "RESEARCH_PUBLICATION",
        "TEACHING": "TEACHING_MATERIAL",
        "KNOWLEDGE_TRANSFER": "KNOWLEDGE_TRANSFER",
    }[activity]
    return activity, "PUBLICATION" if activity == "RESEARCH" else "ACTIVITY_RECORD", confidence, rule


def _extract_fields(pages: list[PageText], entities: list[tuple[str, str]] | None = None):
    text = "\n".join(page.text for page in pages)
    title = _first_match(r"^(?:title|tiêu đề|tên bài)\s*[:：]\s*(.+)$", text)
    doi_match = _DOI.search(text)
    doi = doi_match.group(0).rstrip(".,;") if doi_match else None
    years = [int(value) for value in _YEAR.findall(text)]
    year = next((value for value in years if 1950 <= value <= 2100), None)
    source = _first_match(r"^(?:journal|tạp chí|conference|hội thảo|venue)\s*[:：]\s*(.+)$", text)
    authors_line = _first_match(r"^(?:authors?|tác giả)\s*[:：]\s*(.+)$", text)
    authors = [item.strip() for item in re.split(r"[,;]|\band\b|\bvà\b", authors_line or "") if item.strip()]
    for label, value in entities or []:
        if "TITLE" in label and not title:
            title = value
        elif "AUTHOR" in label:
            authors.append(value)
        elif "DOI" in label and not doi:
            doi = value
        elif "YEAR" in label and not year and value.isdigit():
            year = int(value)
        elif "SOURCE" in label and not source:
            source = value
    evidence: list[EvidenceField] = []
    for page in pages:
        for field, value in (("title", title), ("doi", doi), ("source_name", source)):
            if value and value.lower() in page.text.lower():
                evidence.append(EvidenceField(page=page.page, field=field, text=value))
    return title, authors, doi, year, source, evidence


def _xlmr_predict(text: str) -> tuple[str, float, str] | None:
    model_path = get_settings().analyzer_model_path
    if not model_path:
        return None
    try:
        from transformers import AutoModelForSequenceClassification, AutoTokenizer
        import torch

        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModelForSequenceClassification.from_pretrained(model_path)
        inputs = tokenizer(text[:12000], return_tensors="pt", truncation=True, max_length=512)
        with torch.no_grad():
            probabilities = torch.softmax(model(**inputs).logits, dim=-1)[0]
        index = int(torch.argmax(probabilities))
        label = str(model.config.id2label.get(index, index))
        return label, float(probabilities[index]), "EvidenceXLMR"
    except Exception:
        return None


def _xlmr_entities(text: str) -> list[tuple[str, str]]:
    model_path = get_settings().analyzer_ner_model_path
    if not model_path:
        return []


def _llm_predict(text: str) -> dict | None:
    """Use an OpenAI-compatible chat API as a temporary analyzer backend."""
    settings = get_settings()
    if not settings.analyzer_use_llm:
        return None
    prompt = f"""
Phân tích nội dung minh chứng học thuật dưới đây. Chỉ trả về một JSON object,
không markdown, theo đúng các trường:
document_type, activity_type, suggested_rule_code, title, authors, doi,
publication_year, source_name, classification, confidence, needs_review.

activity_type chỉ được là RESEARCH, TEACHING, KNOWLEDGE_TRANSFER hoặc OTHER.
confidence là số thực từ 0 đến 1. authors là mảng chuỗi. Nếu không xác định
được trường nào thì dùng null hoặc mảng rỗng.

Nội dung minh chứng:
{text[:24000]}
"""
    try:
        response = get_client().chat.completions.create(
            model=settings.openai_chat_model,
            messages=[
                {
                    "role": "system",
                    "content": "Bạn là bộ phân loại và trích xuất thông tin minh chứng cho hệ thống quản lý giờ làm việc.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=settings.analyzer_llm_temperature,
        )
        content = (response.choices[0].message.content or "").strip()
        content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content, flags=re.I)
        start, end = content.find("{"), content.rfind("}")
        if start < 0 or end <= start:
            return None
        result = json.loads(content[start : end + 1])
        return result if isinstance(result, dict) else None
    except Exception:
        return None
    try:
        from transformers import AutoModelForTokenClassification, AutoTokenizer
        import torch

        tokenizer = AutoTokenizer.from_pretrained(model_path, use_fast=True)
        model = AutoModelForTokenClassification.from_pretrained(model_path)
        encoded = tokenizer(
            text[:12000], return_tensors="pt", truncation=True,
            max_length=512, return_offsets_mapping=True,
        )
        offsets = encoded.pop("offset_mapping")[0].tolist()
        with torch.no_grad():
            labels = torch.argmax(model(**encoded).logits, dim=-1)[0].tolist()
        entities: list[tuple[str, str]] = []
        for label_id, (start, end) in zip(labels, offsets):
            if end <= start:
                continue
            label = str(model.config.id2label.get(label_id, "O"))
            if label == "O":
                continue
            value = text[start:end].strip()
            if value:
                entities.append((label, value))
        return entities
    except Exception:
        return []


def analyze_pdf(data: bytes) -> EvidenceAnalyzeResponse:
    pages = _pdf_pages(data)[: get_settings().max_analyze_pages]
    text = "\n".join(page.text for page in pages)
    activity, document_type, confidence, rule = _classify(text)
    model_name = "heuristic-v1"
    prediction = _xlmr_predict(text)
    if prediction:
        activity, confidence, model_name = prediction
        activity = activity.upper()
        rule = {
            "RESEARCH": "RESEARCH_PUBLICATION",
            "TEACHING": "TEACHING_MATERIAL",
            "KNOWLEDGE_TRANSFER": "KNOWLEDGE_TRANSFER",
        }.get(activity, rule)
        document_type = "PUBLICATION" if activity == "RESEARCH" else "ACTIVITY_RECORD"
    title, authors, doi, year, source, evidence = _extract_fields(pages, _xlmr_entities(text))
    llm_result = _llm_predict(text)
    if llm_result:
        predicted_activity = str(llm_result.get("activity_type") or activity).upper()
        if predicted_activity in {"RESEARCH", "TEACHING", "KNOWLEDGE_TRANSFER", "OTHER"}:
            activity = predicted_activity
        document_type = str(llm_result.get("document_type") or document_type)
        rule = llm_result.get("suggested_rule_code") or rule
        title = llm_result.get("title") or title
        authors = llm_result.get("authors") or authors
        doi = llm_result.get("doi") or doi
        year = llm_result.get("publication_year") or year
        source = llm_result.get("source_name") or source
        confidence = max(0.0, min(1.0, float(llm_result.get("confidence", confidence))))
        model_name = f"OpenAICompatible:{get_settings().openai_chat_model}"
    return EvidenceAnalyzeResponse(
        document_type=document_type,
        activity_type=activity,
        suggested_rule_code=rule,
        title=title,
        authors=authors,
        doi=doi,
        publication_year=year,
        source_name=source,
        classification=source,
        confidence=round(confidence, 4),
        needs_review=confidence < get_settings().analyzer_min_confidence,
        model=model_name,
        evidence=evidence,
    )
