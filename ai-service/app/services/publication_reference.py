"""Classification against Table 1 of the Institute's scientific-publication rules."""
from __future__ import annotations

import re
import unicodedata


REFERENCE_TABLE = "TABLE_1_SCIENTIFIC_PUBLICATIONS"

QUARTILE_RULE_CODES = {
    "Q1": "RESEARCH_ARTICLE_WOS_SCOPUS_Q1",
    "Q2": "RESEARCH_ARTICLE_WOS_SCOPUS_Q2",
    "Q3": "RESEARCH_ARTICLE_WOS_SCOPUS_Q3",
    "Q4": "RESEARCH_ARTICLE_WOS_SCOPUS_Q4",
}

PUBLICATION_ITEMS = {
    "1.1": {
        "label": "Bài báo tại tạp chí thuộc hệ thống ISI/Scopus",
        "category": "ARTICLE",
        "rule_code": "RESEARCH_ARTICLE_ISI_SCOPUS",
    },
    "1.2": {
        "label": "Bài báo tại tạp chí ngoài ISI/Scopus công bố bằng tiếng nước ngoài",
        "category": "ARTICLE",
        "rule_code": "RESEARCH_ARTICLE_FOREIGN_OTHER",
    },
    "1.3": {
        "label": "Bài báo quốc tế khác có mã ISSN",
        "category": "ARTICLE",
        "rule_code": "RESEARCH_ARTICLE_INTERNATIONAL_ISSN",
    },
    "1.4": {
        "label": "Bài báo tại chuyên san tạp chí ĐHQGHN đạt chuẩn Scopus",
        "category": "ARTICLE",
        "rule_code": "RESEARCH_ARTICLE_VNU_SCOPUS_SECTION",
    },
    "1.5": {
        "label": "Bài báo trong nước được tính tối đa 0,5 điểm",
        "category": "ARTICLE",
        "rule_code": "RESEARCH_ARTICLE_DOMESTIC_05",
    },
    "1.6": {
        "label": "Bài báo trong nước được tính tối đa 0,75 điểm",
        "category": "ARTICLE",
        "rule_code": "RESEARCH_ARTICLE_DOMESTIC_075",
    },
    "1.7": {
        "label": "Bài báo trong nước được tính tối đa 1 điểm",
        "category": "ARTICLE",
        "rule_code": "RESEARCH_ARTICLE_DOMESTIC_1",
    },
    "2.1": {
        "label": "Báo cáo khoa học tại hội nghị quốc tế thuộc ISI/Scopus hoặc được tổ chức quốc tế uy tín bảo trợ",
        "category": "SCIENTIFIC_REPORT",
        "rule_code": "RESEARCH_CONFERENCE_ISI_SCOPUS",
    },
    "2.2": {
        "label": "Báo cáo khoa học tại hội nghị quốc tế có phản biện ngoài ISI/Scopus",
        "category": "SCIENTIFIC_REPORT",
        "rule_code": "RESEARCH_CONFERENCE_INTERNATIONAL_REVIEWED",
    },
    "2.3": {
        "label": "Báo cáo khoa học tại hội nghị quốc gia có ISBN và phản biện",
        "category": "SCIENTIFIC_REPORT",
        "rule_code": "RESEARCH_CONFERENCE_NATIONAL_ISBN",
    },
    "3.1a": {
        "label": "Sách chuyên khảo xuất bản trong nước",
        "category": "BOOK",
        "rule_code": "RESEARCH_BOOK_DOMESTIC_MONOGRAPH",
    },
    "3.1b": {
        "label": "Giáo trình hoặc tài liệu giảng dạy xuất bản trong nước",
        "category": "BOOK",
        "rule_code": "RESEARCH_BOOK_DOMESTIC_TEXTBOOK",
    },
    "3.1c": {
        "label": "Sách tham khảo hoặc tương đương xuất bản trong nước",
        "category": "BOOK",
        "rule_code": "RESEARCH_BOOK_DOMESTIC_REFERENCE",
    },
    "3.2a": {
        "label": "Sách chuyên khảo xuất bản ở nước ngoài",
        "category": "BOOK",
        "rule_code": "RESEARCH_BOOK_FOREIGN_MONOGRAPH",
    },
    "3.2b": {
        "label": "Sách tham khảo hoặc tương đương xuất bản ở nước ngoài",
        "category": "BOOK",
        "rule_code": "RESEARCH_BOOK_FOREIGN_REFERENCE",
    },
    "3.2c": {
        "label": "Chương trong sách chuyên khảo xuất bản ở nước ngoài",
        "category": "BOOK",
        "rule_code": "RESEARCH_BOOK_FOREIGN_CHAPTER",
    },
}


def _normalize(value: str | None) -> str:
    text = unicodedata.normalize("NFKD", value or "")
    text = "".join(char for char in text if not unicodedata.combining(char))
    return re.sub(r"\s+", " ", text.lower()).strip()


def _has(text: str, *terms: str) -> bool:
    return any(term in text for term in terms)


def extract_quartile(*values: str | None) -> str | None:
    """Return an explicitly stated journal quartile, never infer it from Scopus alone."""
    text = _normalize(" ".join(value for value in values if value))
    patterns = (
        r"\bquartile(?:\s+rank)?\s*[:\-]?\s*q?([1-4])\b",
        r"\bq([1-4])\s+(?:quartile|journal|scopus|tạp chí|tap chi)\b",
        r"\b(?:journal|tạp chí|tap chi)[^.!?\n]{0,100}\bq([1-4])\b",
    )
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return f"Q{match.group(1)}"
    return None


def item_from_code(code: str | None) -> dict | None:
    if not code or code not in PUBLICATION_ITEMS:
        return None
    return {"publication_item_code": code, **PUBLICATION_ITEMS[code]}


def classify_publication_item(
    text: str,
    source_name: str | None = None,
    title: str | None = None,
) -> dict:
    normalized = _normalize(" ".join(value for value in (text, source_name, title) if value))
    source = _normalize(source_name)
    quartile = extract_quartile(text, source_name, title)
    indexed = _has(normalized, "isi", "scopus", "web of science", "wos") or quartile is not None
    vnu = _has(normalized, "dhqghn", "dai hoc quoc gia ha noi", "vietnam national university", "vnu journal")
    report = _has(
        normalized,
        "bao cao khoa hoc",
        "ky yeu",
        "hoi thao",
        "hoi nghi",
        "conference",
        "proceedings",
        "symposium",
        "workshop",
        "seminar",
    )
    peer_reviewed = _has(normalized, "phan bien", "peer review", "peer-reviewed", "refereed")
    international = _has(normalized, "quoc te", "international", "foreign", "nuoc ngoai", "tieng nuoc ngoai")
    national = _has(normalized, "quoc gia", "trong nuoc", "vietnam", "viet nam", "isbn")
    article = _has(normalized, "bai bao", "tap chi", "journal", "doi", "issn", "article")
    book = _has(normalized, "sach", "book", "monograph", "textbook", "giao trinh", "chuong sach")
    patent = _has(normalized, "patent", "sang che", "giai phap huu ich", "utility model")

    # Publisher pages often contain unrelated links or taxonomy text mentioning
    # "book"/"chapter". A structured journal source is stronger evidence than
    # those page-wide keywords and must keep the document in the article branch.
    journal_source = _has(source, "journal", "tap chi", "periodical")
    if journal_source and article:
        report = False
        book = False

    if report:
        if indexed or _has(normalized, "bao tro", "international association", "association internationale"):
            code, confidence, reason = "2.1", 0.88, "Báo cáo có tín hiệu ISI/Scopus hoặc bảo trợ quốc tế uy tín."
        elif national and _has(normalized, "isbn") and peer_reviewed:
            code, confidence, reason = "2.3", 0.90, "Báo cáo có tín hiệu hội nghị quốc gia, ISBN và phản biện."
        elif international and peer_reviewed:
            code, confidence, reason = "2.2", 0.88, "Báo cáo thuộc hội nghị quốc tế có phản biện ngoài ISI/Scopus."
        else:
            code, confidence, reason = "2.2", 0.52, "Có dấu hiệu báo cáo hội thảo nhưng chưa đủ dữ kiện về cấp hội nghị, ISBN hoặc phản biện."
    elif book:
        if _has(normalized, "chuong sach", "book chapter", "chapter") and international:
            code, confidence, reason = "3.2c", 0.86, "Nội dung có dấu hiệu là chương sách chuyên khảo nước ngoài."
        elif _has(normalized, "sach chuyen khao", "monograph") and international:
            code, confidence, reason = "3.2a", 0.84, "Nội dung có dấu hiệu là sách chuyên khảo nước ngoài."
        elif _has(normalized, "sach tham khao", "reference book") and international:
            code, confidence, reason = "3.2b", 0.84, "Nội dung có dấu hiệu là sách tham khảo nước ngoài."
        elif _has(normalized, "giao trinh", "tai lieu giang day", "textbook"):
            code, confidence, reason = "3.1b", 0.82, "Nội dung có dấu hiệu là giáo trình hoặc tài liệu giảng dạy."
        elif _has(normalized, "sach tham khao", "reference book"):
            code, confidence, reason = "3.1c", 0.80, "Nội dung có dấu hiệu là sách tham khảo trong nước."
        else:
            code, confidence, reason = "3.1a", 0.58, "Có dấu hiệu là sách nhưng chưa xác định chắc loại sách."
    elif patent:
        return {
            "reference_table": REFERENCE_TABLE,
            "publication_item_code": None,
            "publication_item_label": None,
            "publication_category": "INTELLECTUAL_PROPERTY",
            "suggested_rule_code": None,
            "confidence": 0.35,
            "needs_review": True,
            "classification_reason": "Sở hữu trí tuệ thuộc mục 4 của bảng tham chiếu, không thuộc nhóm ấn phẩm 1 đến 3.",
        }
    elif article:
        if vnu and indexed:
            code, confidence, reason = "1.4", 0.92, "Nguồn có tín hiệu chuyên san ĐHQGHN và Scopus."
        elif indexed:
            code, confidence = "1.1", 0.94 if quartile else 0.72
            if quartile:
                reason = f"Nguồn có tín hiệu ISI/Scopus và hạng {quartile} được nêu rõ trong minh chứng."
            else:
                reason = "Nguồn có tín hiệu ISI/Scopus nhưng chưa có dữ kiện xác thực hạng Q1/Q2/Q3/Q4."
        elif international or not _has(normalized, "tap chi", "journal", "dac san", "viet nam", "vietnam"):
            if _has(normalized, "uy tin", "reputable", "prestigious"):
                code, confidence, reason = "1.2", 0.76, "Bài báo quốc tế ngoài ISI/Scopus tại nguồn được mô tả là uy tín."
            else:
                code, confidence, reason = "1.3", 0.66, "Bài báo quốc tế có mã ISSN nhưng chưa xác định thuộc danh mục ISI/Scopus."
        elif _has(normalized, "0,5 diem", "0.5 diem", "nua diem"):
            code, confidence, reason = "1.5", 0.88, "Nguồn trong nước có tín hiệu mức tối đa 0,5 điểm."
        elif _has(normalized, "0,75 diem", "0.75 diem", "ba phan tu diem"):
            code, confidence, reason = "1.6", 0.88, "Nguồn trong nước có tín hiệu mức tối đa 0,75 điểm."
        else:
            code, confidence, reason = "1.7", 0.58, "Nguồn trong nước; chưa xác minh được mức điểm 0,5, 0,75 hay 1,0 của Hội đồng chức danh giáo sư."
    else:
        return {
            "reference_table": REFERENCE_TABLE,
            "publication_item_code": None,
            "publication_item_label": None,
            "publication_category": None,
            "suggested_rule_code": None,
            "confidence": 0.30,
            "needs_review": True,
            "classification_reason": "Chưa đủ tín hiệu để xác định dòng trong Bảng 1.",
        }

    item = item_from_code(code) or {}
    suggested_rule_code = item.get("rule_code")
    if code == "1.1":
        # Table 1 has four different hours for 1.1. A generic Scopus label is
        # not enough to choose one of them, so leave the rule empty until the
        # quartile is confirmed by the page or the administrator's catalog.
        suggested_rule_code = QUARTILE_RULE_CODES.get(quartile) if quartile else None
    return {
        "reference_table": REFERENCE_TABLE,
        "publication_item_code": code,
        "publication_item_label": item.get("label"),
        "publication_category": item.get("category"),
        "suggested_rule_code": suggested_rule_code,
        "quartile": quartile,
        "quartile_source": "page" if quartile else None,
        "confidence": confidence,
        "needs_review": confidence < 0.70 or (code == "1.1" and quartile is None),
        "classification_reason": reason,
    }
