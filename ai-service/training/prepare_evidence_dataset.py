"""Prepare a local evidence dataset from PDF and DOCX minh-chung files.

The generated JSONL files are intentionally local artifacts. Raw evidence can
contain personal information and should not be committed to the repository.
"""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path

from docx import Document
from pypdf import PdfReader


LABEL_IDS = {"RESEARCH": 0, "TEACHING": 1, "KNOWLEDGE_TRANSFER": 2, "OTHER": 3}
REFERENCE_LABEL_IDS = {
    "PUBLICATION_1_1": 0,
    "PUBLICATION_1_4": 1,
    "PUBLICATION_1_5": 2,
    "PUBLICATION_2_2": 3,
    "TEACHING": 4,
    "OTHER": 5,
}
RULE_TO_REFERENCE_CODE = {
    "RESEARCH_ARTICLE_ISI_SCOPUS": "1.1",
    "RESEARCH_ARTICLE_FOREIGN_OTHER": "1.2",
    "RESEARCH_ARTICLE_VNU_SCOPUS_SECTION": "1.3",
    "RESEARCH_ARTICLE_DOMESTIC_05": "1.4",
    "RESEARCH_ARTICLE_DOMESTIC_1": "1.5",
    "RESEARCH_CONFERENCE_ISI_SCOPUS": "2.1",
    "RESEARCH_CONFERENCE_INTERNATIONAL_REVIEWED": "2.2",
    "RESEARCH_CONFERENCE_NATIONAL_ISBN": "2.3",
}
NER_LABELS = [
    "O",
    "B-TITLE", "I-TITLE",
    "B-AUTHOR", "I-AUTHOR",
    "B-DOI", "I-DOI",
    "B-YEAR", "I-YEAR",
    "B-SOURCE", "I-SOURCE",
]
NER_IDS = {label: index for index, label in enumerate(NER_LABELS)}


OVERRIDES = {
    "Quan_ly_nuoc_Tay_Nung.pdf": {
        "label": "RESEARCH", "title": "Indigenous water governance in a China-Vietnam borderland: ethnographic insights from Nung and Tay communities",
        "authors": ["Ly Viet Truong"], "source_name": "Journal of Ethnobiology and Ethnomedicine", "publication_year": 2026,
        "doi": "10.1186/s13002-026-00867-8", "rule_code": "RESEARCH_ARTICLE_ISI_SCOPUS", "reference_item_code": "1.1",
    },
    "Thuc_vat_nghi_le_Tay_Nung.pdf": {
        "label": "RESEARCH", "title": "Ethnographic research on plant species used in ritual festivals of the Nung people in the northern mountainous region of Vietnam",
        "authors": ["Ly Viet Truong"], "source_name": "Journal of Ethnobiology and Ethnomedicine", "publication_year": 2026,
        "doi": "10.1186/s13002-026-00894-5", "rule_code": "RESEARCH_ARTICLE_ISI_SCOPUS", "reference_item_code": "1.1",
    },
    "Chu_the_thuc_hanh_di_san_bia_muc_luc_bai_viet.pdf": {
        "label": "RESEARCH", "title": "Chủ thể thực hành và bảo vệ di sản tín ngưỡng Nùng, Tày (Trường hợp người thực hành Then trẻ tuổi ở Lạng Sơn)",
        "authors": ["Lý Viết Trường"], "source_name": "Tạp chí Khoa học Xã hội và Nhân văn", "publication_year": 2026,
        "doi": "10.33100/vjossh.2026.12.1.5", "rule_code": "RESEARCH_ARTICLE_DOMESTIC_1", "reference_item_code": "1.5",
    },
    "Tu_nuong_ray_den_rung_trong.pdf": {
        "label": "RESEARCH", "title": "Từ nương rẫy đến rừng trồng: chuyển dịch sinh kế của người Nùng, Tày ở vùng Đông Bắc tỉnh Lạng Sơn",
        "authors": ["Lý Viết Trường"], "source_name": "Tạp chí Khoa học xã hội Việt Nam", "publication_year": 2026,
        "rule_code": "RESEARCH_ARTICLE_DOMESTIC_1", "reference_item_code": "1.5",
    },
    "Bieu tuong tet mung 3 thang 3.pdf": {
        "label": "RESEARCH", "title": "Biểu tượng văn hóa trong Tết mùng 3 tháng Ba của người Nùng, Tày ở Lạng Sơn",
        "authors": ["Lý Viết Trường"], "source_name": "Đặc san Di sản văn hóa", "publication_year": 2026,
        "rule_code": "RESEARCH_ARTICLE_DOMESTIC_05", "reference_item_code": "1.4",
    },
    "Tu tin nguong dan gian den y thuc chu quyen Tay Nung.pdf": {
        "label": "RESEARCH", "title": "Từ tín ngưỡng dân gian đến ý thức chủ quyền: Nghiên cứu tục thờ Thổ công của người Nùng, Tày ở vùng Đông Bắc tỉnh Lạng Sơn",
        "authors": ["Lý Viết Trường"], "source_name": "Tạp chí Nghiên cứu Văn hóa", "publication_year": 2026,
        "rule_code": "RESEARCH_ARTICLE_DOMESTIC_1", "reference_item_code": "1.5",
    },
    "Thieng hoa khong gian Tho cong - Ly Viet Truong.pdf": {
        "label": "RESEARCH", "title": "Thiêng hóa không gian cư trú qua tín ngưỡng thờ Thổ công của người Nùng, Tày ở vùng Đông Bắc tỉnh Lạng Sơn",
        "authors": ["Lý Viết Trường"], "source_name": "Kỷ yếu hội thảo khoa học quốc tế Ngôn ngữ học và Việt Nam học trong kỷ nguyên mới",
        "publication_year": 2026, "rule_code": "RESEARCH_CONFERENCE_INTERNATIONAL_REVIEWED", "reference_item_code": "2.2",
    },
    "Phiếu đánh giá PĐA, VKC 2026.pdf": {
        "label": "OTHER", "title": "Phiếu đánh giá, xếp loại chất lượng cán bộ lãnh đạo, quản lý năm 2025",
        "authors": ["Phạm Đức Anh"], "publication_year": 2025,
    },
}


def clean_text(value: str) -> str:
    value = unicodedata.normalize("NFKC", value or "")
    value = value.replace("\u00ad", "").replace("\u200b", "")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def pdf_record(path: Path, root: Path) -> dict:
    override = dict(OVERRIDES.get(path.name, {}))
    reader = PdfReader(str(path))
    pages = [clean_text(page.extract_text() or "") for page in reader.pages]
    extracted = clean_text("\n\n".join(page for page in pages if page))
    quality = "text" if len(extracted) >= 200 else "image_only"
    text = extracted or path.stem.replace("_", " ")
    if not override:
        label = "TEACHING" if "giảng dạy" in path.name.lower() else "RESEARCH"
        override = {"label": label, "title": path.stem.replace("_", " ")}
    record = {
        "id": path.stem.lower().replace(" ", "-")[:80],
        "source_file": str(path.relative_to(root)),
        "text": text,
        "label": override["label"],
        "label_id": LABEL_IDS[override["label"]],
        "label_origin": "manual_seed",
        "text_quality": quality,
        "needs_ocr": quality == "image_only",
        "metadata": {key: value for key, value in override.items() if key != "label"},
        "pages": len(reader.pages),
    }
    return record


def docx_records(path: Path, root: Path) -> list[dict]:
    document = Document(str(path))
    records: list[dict] = []
    if "Minh chung cong trinh" in path.name:
        rows = document.tables[0].rows
        for index, row in enumerate(rows[1:], start=1):
            values = [clean_text(cell.text) for cell in row.cells]
            title, source, publication, quality, role = values
            year_match = re.search(r"\b((?:19|20)\d{2})\b", publication)
            doi_match = re.search(r"10\.\d{4,9}/[-._;()/:A-Z0-9]+", source, re.I)
            authors = ["Lý Viết Trường"]
            rule_code = "RESEARCH_CONFERENCE_INTERNATIONAL_REVIEWED" if "Ngôn ngữ học và Việt Nam học" in source else (
                "RESEARCH_ARTICLE_ISI_SCOPUS" if "Scopus" in source else "RESEARCH_ARTICLE_DOMESTIC_1"
            )
            metadata = {
                "title": title, "authors": authors, "source_name": source,
                "publication_year": int(year_match.group(1)) if year_match else None,
                "doi": doi_match.group(0).rstrip(".,;") if doi_match else None,
                "role": role, "quality": quality,
                "rule_code": rule_code,
                "reference_item_code": RULE_TO_REFERENCE_CODE.get(rule_code),
            }
            text = clean_text("\n".join(f"{label}: {value}" for label, value in zip(
                ("title", "source", "publication", "quality", "role"), values)))
            records.append({
                "id": f"minh-chung-cong-trinh-row-{index}",
                "source_file": f"{path.relative_to(root)}#row-{index}", "text": text,
                "label": "RESEARCH", "label_id": LABEL_IDS["RESEARCH"],
                "label_origin": "manual_seed", "text_quality": "text", "needs_ocr": False,
                "metadata": metadata, "pages": None,
            })
        return records

    paragraphs = [clean_text(paragraph.text) for paragraph in document.paragraphs if paragraph.text.strip()]
    rows = [" | ".join(clean_text(cell.text) for cell in row.cells) for table in document.tables for row in table.rows]
    text = clean_text("\n".join(paragraphs + rows))
    return [{
        "id": path.stem.lower().replace(" ", "-")[:80], "source_file": str(path.relative_to(root)), "text": text,
        "label": "TEACHING", "label_id": LABEL_IDS["TEACHING"], "label_origin": "manual_seed",
        "text_quality": "text", "needs_ocr": False,
        "metadata": {"title": path.stem, "rule_code": "TEACHING_ACTIVITY", "reference_item_code": None}, "pages": None,
    }]


def token_ner_record(record: dict) -> dict:
    text = record["text"]
    tokens = [match.group(0) for match in re.finditer(r"\S+", text)]
    offsets = [(match.start(), match.end()) for match in re.finditer(r"\S+", text)]
    labels = ["O"] * len(tokens)
    metadata = record.get("metadata", {})
    for field, tag in (("title", "TITLE"), ("doi", "DOI"), ("publication_year", "YEAR"), ("source_name", "SOURCE")):
        value = str(metadata.get(field) or "").strip()
        if not value:
            continue
        start = text.lower().find(value.lower())
        if start < 0:
            continue
        end = start + len(value)
        matched = [index for index, (left, right) in enumerate(offsets) if left < end and right > start]
        for position, index in enumerate(matched):
            labels[index] = f"{'B' if position == 0 else 'I'}-{tag}"
    return {"id": record["id"], "tokens": tokens, "ner_tags": [NER_IDS[label] for label in labels]}


def reference_label(record: dict) -> tuple[str, int]:
    code = record.get("metadata", {}).get("reference_item_code")
    if code:
        label = f"PUBLICATION_{code.replace('.', '_').upper()}"
        if label in REFERENCE_LABEL_IDS:
            return label, REFERENCE_LABEL_IDS[label]
    label = record["label"] if record["label"] in {"TEACHING", "OTHER"} else "OTHER"
    return label, REFERENCE_LABEL_IDS[label]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    records: list[dict] = []
    for path in sorted(args.input.rglob("*")):
        if not path.is_file() or path.name.lower() == "desktop.ini":
            continue
        if path.suffix.lower() == ".pdf":
            records.append(pdf_record(path, args.input))
        elif path.suffix.lower() == ".docx":
            records.extend(docx_records(path, args.input))
    for record in records:
        label, label_id = reference_label(record)
        record["reference_label"] = label
        record["reference_label_id"] = label_id
    with (args.output / "evidence_classification.jsonl").open("w", encoding="utf-8") as stream:
        for record in records:
            stream.write(json.dumps(record, ensure_ascii=False) + "\n")
    with (args.output / "evidence_ner.jsonl").open("w", encoding="utf-8") as stream:
        for record in records:
            stream.write(json.dumps(token_ner_record(record), ensure_ascii=False) + "\n")
    summary = {
        "records": len(records), "labels": {label: sum(item["label"] == label for item in records) for label in LABEL_IDS},
        "needs_ocr": sum(item["needs_ocr"] for item in records),
        "label_ids": LABEL_IDS, "reference_label_ids": REFERENCE_LABEL_IDS, "ner_labels": NER_LABELS,
        "source_root": str(args.input), "generated_from": [item["source_file"] for item in records],
    }
    (args.output / "manifest.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
