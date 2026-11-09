# EvidenceXLMR training

Đây là mô hình mới của bài toán, không phải tên thư viện: `EvidenceXLMR` = `FacebookAI/xlm-roberta-base` + đầu phân loại hoặc đầu gán nhãn token được fine-tune trên dữ liệu minh chứng của dự án.

## Hai nhiệm vụ

1. Phân loại tài liệu: `RESEARCH`, `TEACHING`, `KNOWLEDGE_TRANSFER`, `OTHER`.
2. Trích xuất trường: BIO tags như `B-TITLE`, `I-TITLE`, `B-AUTHOR`, `B-DOI`, `B-YEAR`, `B-SOURCE`.

Ví dụ huấn luyện:

```powershell
pip install -r requirements-ml.txt
python training/train_xlmr.py --data data/evidence_classification.jsonl --output models/evidence-xlmr-cls --labels RESEARCH,TEACHING,KNOWLEDGE_TRANSFER,OTHER
python training/train_ner.py --data data/evidence_ner.jsonl --output models/evidence-xlmr-ner --labels O,B-TITLE,I-TITLE,B-AUTHOR,I-AUTHOR,B-DOI,I-DOI,B-YEAR,I-YEAR,B-SOURCE,I-SOURCE
```

Sau khi fine-tune, đặt `ANALYZER_MODEL_PATH=models/evidence-xlmr-cls` trong AI service. API `/analyze` sẽ dùng xác suất của đầu phân loại; nếu chưa có checkpoint thì dùng bộ phân tích dự phòng minh bạch và trả `model=heuristic-v1`.

## Chạy tạm bằng API LLM

Nếu chưa có checkpoint XLM-R, có thể bật bộ phân tích qua API OpenAI-compatible:

```env
ANALYZER_USE_LLM=true
OPENAI_API_KEY=your-key
OPENAI_CHAT_MODEL=gpt-4o-mini
```

Với Gemini hoặc Ollama, giữ nguyên code và đổi `OPENAI_BASE_URL`, `OPENAI_CHAT_MODEL` theo provider. Nếu API lỗi, `/analyze` tự quay về `heuristic-v1` để luồng kê khai không bị dừng.
