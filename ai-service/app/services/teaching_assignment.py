"""Extract teaching-assignment rows from PDF and Word documents.

The parser intentionally returns the source values and a confidence flag. The
backend remains responsible for matching a lecturer to a local user and for
applying the institution's conversion rules.
"""
from __future__ import annotations

import io
import re
import unicodedata
from typing import Any


HEADER_ALIASES: dict[str, tuple[str, ...]] = {
    "lecturer_name": ("họ và tên", "họ tên", "giảng viên", "giáo viên", "lecturer", "teacher", "người dạy"),
    "course_name": ("môn giảng dạy", "học phần", "course", "subject", "tên học phần"),
    "class_name": ("lớp", "class", "mã lớp"),
    "education_level": ("trình độ", "bậc", "hệ đào tạo", "level", "education"),
    "credits": ("tín chỉ", "tc", "credit", "credits"),
    "periods": ("số tiết", "tiết", "period", "periods", "giờ dạy"),
    "student_count": ("sĩ số", "số sinh viên", "sinh viên", "students", "student count"),
    "teaching_type": ("hình thức", "loại giảng dạy", "loại giờ", "teaching type", "type"),
}


def _clean(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("\u00a0", " ")).strip(" |;\t")


def _number(value: Any) -> float | None:
    match = re.search(r"^\s*(\d+(?:[.,]\d+)?)\b", str(value or ""))
    if not match:
        return None
    try:
        return float(match.group(1).replace(",", "."))
    except ValueError:
        return None


def _is_invalid_course_name(value: Any) -> bool:
    """Reject placeholders and shifted numeric cells as course names."""
    text = _clean(value)
    normalized = unicodedata.normalize("NFD", text.lower().replace("đ", "d"))
    normalized = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    normalized = re.sub(r"\s+", " ", normalized)
    if not normalized or normalized in {"khong co", "-", "—", "–"}:
        return True
    # A course title must contain descriptive text. Values such as ``3`` or
    # ``3 - 1`` indicate that the PDF/Word columns were shifted during OCR.
    return bool(re.fullmatch(r"\d+(?:\s*[-/]\s*\d+)?", normalized))


def _header_key(value: Any) -> str | None:
    text = _clean(value).lower()
    # Specific numeric columns must be checked before generic text such as
    # "môn học"; otherwise "Số tín chỉ môn học" is mistaken for the course.
    priority = (
        "credits",
        "periods",
        "student_count",
        "lecturer_name",
        "course_name",
        "class_name",
        "education_level",
        "teaching_type",
    )
    for key in priority:
        aliases = HEADER_ALIASES[key]
        if any(alias in text for alias in aliases):
            return key
    return None


def _row_from_mapping(values: dict[str, Any], row_number: int, source_text: str = "") -> dict[str, Any] | None:
    name = _clean(values.get("lecturer_name"))
    course = _clean(values.get("course_name"))
    if not name or _is_invalid_course_name(course):
        return None
    normalized_name = name.lower().replace(".", " ")
    header_names = {"tt", "stt", "họ tên", "họ và tên", "giảng viên", "giáo viên", "lecturer", "teacher"}
    if normalized_name in header_names:
        return None
    if "cột mẫu" in source_text.lower() or "mẫu, không xóa" in source_text.lower():
        return None
    credits = _number(values.get("credits"))
    periods = _number(values.get("periods"))
    students = _number(values.get("student_count"))
    quantity = credits or periods or 1
    quantity_unit = "tín chỉ" if credits is not None else ("tiết" if periods is not None else "lần")
    return {
        "row_number": row_number,
        "lecturer_name": name,
        "course_name": course or "Phân công giảng dạy",
        "class_name": _clean(values.get("class_name")) or None,
        "education_level": _clean(values.get("education_level")) or None,
        "teaching_type": _clean(values.get("teaching_type")) or None,
        "credits": credits,
        "periods": periods,
        "theory_periods": _number(values.get("theory_periods")),
        "practical_periods": _number(values.get("practical_periods")),
        "self_study_periods": _number(values.get("self_study_periods")),
        "student_count": students,
        "quantity": quantity,
        "quantity_unit": quantity_unit,
        "source_text": source_text or " | ".join(_clean(value) for value in values.values() if _clean(value)),
    }


def _deduplicate_rows(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    """Remove exact repeated rows while preserving distinct teaching components."""
    seen: set[tuple[Any, ...]] = set()
    unique: list[dict[str, Any]] = []
    for row in rows:
        key = (
            re.sub(r"\s+", " ", _clean(row.get("lecturer_name")).lower()),
            re.sub(r"\s+", " ", _clean(row.get("course_name")).lower()),
            re.sub(r"\s+", " ", _clean(row.get("class_name")).lower()),
            re.sub(r"\s+", " ", _clean(row.get("education_level")).lower()),
            row.get("credits"),
            row.get("periods"),
            row.get("theory_periods"),
            row.get("practical_periods"),
            row.get("self_study_periods"),
        )
        if key in seen:
            continue
        seen.add(key)
        unique.append(row)
    return unique, len(rows) - len(unique)


def _guidance_quantity(value: Any) -> float | None:
    text = _clean(value)
    if not text or text.lower() in {"không có", "khong co", "-"}:
        return None
    leading = re.match(r"^\s*(\d+(?:[.,]\d+)?)", text)
    if leading:
        return _number(leading.group(1))
    described = re.search(r"\b(\d+(?:[.,]\d+)?)\s*(?:người|ncs|học viên|luận án|luận văn)\b", text, re.I)
    return _number(described.group(1)) if described else 1.0


def _append_guidance_item(
    items: dict[tuple[str, str, str], dict[str, Any]],
    lecturer_name: str,
    rule_code: str,
    label: str,
    value: Any,
    row_number: int,
) -> None:
    quantity = _guidance_quantity(value)
    source_text = _clean(value)
    if quantity is None:
        return
    if "đồng hướng dẫn" in source_text.lower() and "DOCTORAL_MAIN" in rule_code:
        rule_code = rule_code.replace("DOCTORAL_MAIN", "DOCTORAL_CO")
        label = label.replace("- chính", "- đồng hướng dẫn")
    key = (lecturer_name.lower(), rule_code, source_text.lower())
    if key in items:
        return
    items[key] = {
        "row_number": row_number,
        "lecturer_name": lecturer_name,
        "course_name": label,
        "education_level": "Tiến sĩ" if "DOCTORAL" in rule_code else "Thạc sĩ",
        "quantity": quantity,
        "quantity_unit": "luận án" if "DOCTORAL" in rule_code else "luận văn",
        "rule_code": rule_code,
        "source_text": source_text,
    }


def _extract_tables(data: bytes) -> list[dict[str, Any]]:
    """Use pdfplumber when available because it preserves table columns."""
    try:
        import pdfplumber
    except ImportError:
        return []

    rows: list[dict[str, Any]] = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables() or []:
                if not table or len(table) < 2:
                    continue
                header_index = next(
                    (index for index, row in enumerate(table[:3]) if sum(_header_key(cell) is not None for cell in row) >= 1),
                    None,
                )
                if header_index is None:
                    continue
                headers = [_header_key(cell) for cell in table[header_index]]
                for row_index, row in enumerate(table[header_index + 1 :], start=header_index + 1):
                    values = {key: row[column] for column, key in enumerate(headers) if key and column < len(row)}
                    parsed = _row_from_mapping(values, row_index + 1, " | ".join(_clean(cell) for cell in row if _clean(cell)))
                    if parsed:
                        rows.append(parsed)
    return rows


def _extract_text_rows_from_text(text: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    quantity_header_unit = "tín chỉ"
    for line_number, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.replace("\u00a0", " ").strip()
        header_text = line.lower()
        if "số tiết" in header_text or re.search(r"\btiết\b|\bperiods?\b", header_text):
            quantity_header_unit = "tiết"
        elif "tín chỉ" in header_text or re.search(r"\bcredits?\b|\btc\b", header_text):
            quantity_header_unit = "tín chỉ"
        if not line or any(token in line.lower() for token in ("phân công giảng dạy", "họ và tên", "giảng viên", "học phần")):
            continue
        match = re.match(r"^(?:\d{1,3}[.)-]?\s+)?(.+)$", line)
        if not match:
            continue
        columns = [_clean(item) for item in re.split(r"\t+|\s{2,}|\|", match.group(1)) if _clean(item)]
        if len(columns) < 2:
            continue
        if columns[0].lower() in {"stt", "no", "number", "tt"}:
            continue
        values: dict[str, Any] = {"lecturer_name": columns[0], "course_name": columns[1]}
        for column in columns[2:]:
            lower = column.lower()
            if any(alias in lower for alias in HEADER_ALIASES["education_level"]):
                values["education_level"] = column
            elif any(alias in lower for alias in HEADER_ALIASES["class_name"]):
                values["class_name"] = column
            elif values.get("class_name") is None and re.fullmatch(r"[A-Za-zÀ-ỹ]+[- ]?\d+[A-Za-z0-9À-ỹ-]*", column):
                values["class_name"] = column
            elif values.get("credits") is None and values.get("periods") is None and _number(column) is not None:
                values["periods" if quantity_header_unit == "tiết" else "credits"] = column
            elif values.get("student_count") is None and _number(column) is not None:
                values["student_count"] = column
        parsed = _row_from_mapping(values, line_number, line)
        if parsed:
            rows.append(parsed)
    return rows


def _extract_text_rows(data: bytes) -> tuple[list[dict[str, Any]], str]:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    return _extract_text_rows_from_text(text), text


def _extract_docx_rows(data: bytes) -> tuple[list[dict[str, Any]], list[dict[str, Any]], str]:
    from docx import Document

    document = Document(io.BytesIO(data))
    rows: list[dict[str, Any]] = []
    guidance_items: dict[tuple[str, str, str], dict[str, Any]] = {}
    for table in document.tables:
        table_rows = [[_clean(cell.text) for cell in row.cells] for row in table.rows]
        if len(table_rows) < 2:
            continue
        header_index = next(
            (index for index, row in enumerate(table_rows[:3]) if sum(_header_key(cell) is not None for cell in row) >= 1),
            None,
        )
        if header_index is None:
            continue
        headers = [_header_key(cell) for cell in table_rows[header_index]]
        for row_index, row in enumerate(table_rows[header_index + 1 :], start=header_index + 1):
            source_text = " | ".join(row)
            # This institutional Word template has a three-level header. Use
            # the stable column positions so "Số tín chỉ môn học" cannot be
            # confused with the course title and so guidance columns are kept.
            if len(row) >= 7 and _header_key(row[1]) == "lecturer_name":
                continue
            if "cột mẫu" in source_text.lower() or "mẫu, không xóa" in source_text.lower():
                continue
            if len(row) >= 7:
                credits = _number(row[6])
                theory = _number(row[7]) if len(row) > 7 else None
                practical = _number(row[8]) if len(row) > 8 else None
                periods = (theory or 0) + (practical or 0)
                if periods <= 0 and credits is not None:
                    periods = credits * 15
                values = {
                    "lecturer_name": row[1] if len(row) > 1 else "",
                    "course_name": row[3] if len(row) > 3 else "",
                    "class_name": row[4] if len(row) > 4 else "",
                    "education_level": row[5] if len(row) > 5 else "",
                    "credits": credits,
                    "periods": periods or None,
                    "theory_periods": theory,
                    "practical_periods": practical,
                    "self_study_periods": _number(row[9]) if len(row) > 9 else None,
                }
                parsed = _row_from_mapping(values, row_index + 1, source_text)
                if parsed:
                    parsed["quantity"] = periods or credits or 1
                    parsed["quantity_unit"] = "tiết" if periods else ("tín chỉ" if credits is not None else "lần")
                    rows.append(parsed)

                lecturer_name = _clean(row[1] if len(row) > 1 else "")
                if lecturer_name and lecturer_name.lower() not in {"họ và tên", "họ tên"}:
                    if len(row) > 10:
                        _append_guidance_item(guidance_items, lecturer_name, "POSTGRAD_MASTER_THESIS", "Hướng dẫn luận văn thạc sĩ", row[10], row_index + 1)
                    main_codes = ("POSTGRAD_DOCTORAL_MAIN_Y1", "POSTGRAD_DOCTORAL_MAIN_Y2", "POSTGRAD_DOCTORAL_MAIN_Y3")
                    assist_codes = ("POSTGRAD_DOCTORAL_ASSIST_Y1", "POSTGRAD_DOCTORAL_ASSIST_Y2", "POSTGRAD_DOCTORAL_ASSIST_Y3")
                    for offset, code in enumerate(main_codes, start=11):
                        label = f"Hướng dẫn luận án tiến sĩ - Năm {offset - 10} - chính"
                        _append_guidance_item(guidance_items, lecturer_name, code, label, row[offset] if len(row) > offset else "", row_index + 1)
                    for offset, code in enumerate(assist_codes, start=14):
                        label = f"Hướng dẫn luận án tiến sĩ - Năm {offset - 13} - phụ"
                        _append_guidance_item(guidance_items, lecturer_name, code, label, row[offset] if len(row) > offset else "", row_index + 1)

    paragraphs = "\n".join(paragraph.text for paragraph in document.paragraphs if paragraph.text.strip())
    if not rows and paragraphs:
        rows = _extract_text_rows_from_text(paragraphs)
    return rows, list(guidance_items.values()), paragraphs


def parse_teaching_assignment_document(data: bytes, filename: str) -> dict[str, Any]:
    suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    guidance_rows: list[dict[str, Any]] = []
    if suffix == "pdf":
        table_rows = _extract_tables(data)
        text_rows, text = _extract_text_rows(data)
        rows = table_rows or text_rows
        model = "TeachingAssignmentParser:pdfplumber+pypdf"
        confidence = 0.9 if table_rows else (0.65 if text_rows else 0.0)
        needs_review = not bool(table_rows)
        warnings = [] if table_rows else (["Không nhận diện được cấu trúc bảng đầy đủ; cần kiểm tra các dòng đã tách."] if text_rows else ["Không tìm thấy dòng phân công có thể đọc được trong PDF."])
    elif suffix == "docx":
        table_rows, guidance_rows, text = _extract_docx_rows(data)
        rows = table_rows
        model = "TeachingAssignmentParser:python-docx"
        confidence = 0.95 if table_rows else 0.0
        needs_review = not bool(table_rows)
        warnings = [] if table_rows else ["Không tìm thấy bảng phân công có thể đọc được trong Word."]
    else:
        raise ValueError("Chỉ hỗ trợ PDF và Word .docx")

    rows, duplicate_count = _deduplicate_rows(rows)
    if duplicate_count:
        warnings.append(f"Đã loại bỏ {duplicate_count} dòng phân công trùng lặp.")
    rows = rows[:500]
    # Header rows may be removed from a multi-level Word table. Renumber the
    # remaining data rows so the UI always shows a continuous sequence.
    for index, row in enumerate(rows, start=1):
        row["row_number"] = index
    return {
        "assignments": rows,
        "guidance_assignments": guidance_rows if suffix == "docx" else [],
        "row_count": len(rows),
        "model": model,
        "confidence": confidence,
        "needs_review": needs_review,
        "warnings": warnings,
        "text_preview": text[:1000],
    }


def parse_teaching_assignment_pdf(data: bytes) -> dict[str, Any]:
    return parse_teaching_assignment_document(data, "assignment.pdf")
