# EvidenceXLMR training

## Chuẩn bị dữ liệu minh chứng

Tạo bộ dữ liệu cục bộ từ PDF và DOCX do người dùng cung cấp:

```powershell
python training/prepare_evidence_dataset.py `
  --input C:\path\to\data `
  --output data\processed
```

Script chuẩn hóa văn bản, gán nhãn tài liệu, tạo metadata cho DOI/tác giả/năm/nguồn
và tạo thêm bộ BIO cho bài toán nhận dạng thực thể. Tài liệu scan không có lớp chữ
được đánh dấu `needs_ocr=true` để không biến dữ liệu rỗng thành nhãn giả.

Đây là mô hình mới của bài toán, không phải tên thư viện: `EvidenceXLMR` = `FacebookAI/xlm-roberta-base` + đầu phân loại hoặc đầu gán nhãn token được fine-tune trên dữ liệu minh chứng của dự án.

## Hai nhiệm vụ

1. Phân loại tài liệu: `RESEARCH`, `TEACHING`, `KNOWLEDGE_TRANSFER`, `OTHER`.
2. Trích xuất trường: BIO tags như `B-TITLE`, `I-TITLE`, `B-AUTHOR`, `B-DOI`, `B-YEAR`, `B-SOURCE`.

Ví dụ huấn luyện:

```powershell
pip install -r requirements-ml.txt
python training/train_xlmr.py --data data/evidence_classification.jsonl --output models/evidence-xlmr-cls --labels RESEARCH,TEACHING,KNOWLEDGE_TRANSFER,OTHER --label-field label_id
python training/train_ner.py --data data/evidence_ner.jsonl --output models/evidence-xlmr-ner --labels O,B-TITLE,I-TITLE,B-AUTHOR,I-AUTHOR,B-DOI,I-DOI,B-YEAR,I-YEAR,B-SOURCE,I-SOURCE
```

Sau khi fine-tune, đặt `ANALYZER_MODEL_PATH=models/evidence-xlmr-cls` và
`ANALYZER_NER_MODEL_PATH=models/evidence-xlmr-ner` trong AI service. API
`/analyze` sẽ dùng đầu phân loại để chọn nhóm minh chứng và đầu BIO để bổ sung
tiêu đề, tác giả, DOI, năm, nguồn. Nếu chưa có checkpoint thì dùng bộ phân tích
dự phòng minh bạch và trả `model=heuristic-v1`.

## Chạy tạm bằng API LLM

Nếu chưa có checkpoint XLM-R, có thể bật bộ phân tích qua API OpenAI-compatible:

```env
ANALYZER_USE_LLM=true
OPENAI_API_KEY=your-key
OPENAI_CHAT_MODEL=gpt-4o-mini
```

Với Gemini hoặc Ollama, giữ nguyên code và đổi `OPENAI_BASE_URL`, `OPENAI_CHAT_MODEL` theo provider. Nếu API lỗi, `/analyze` tự quay về `heuristic-v1` để luồng kê khai không bị dừng.
