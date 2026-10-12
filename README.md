# Hệ thống Quản lý & Đánh giá giờ làm việc tiêu chuẩn

Dự án Hệ thống quản lý và đánh giá giờ làm việc tiêu chuẩn của Giảng viên và Nghiên cứu viên, được thiết kế theo cấu trúc Monorepo, quản lý bằng [Turborepo](https://turbo.build/) và [pnpm workspaces](https://pnpm.io/workspaces). Hệ thống tích hợp Trí tuệ Nhân tạo (AI) giúp tự động trích xuất thông tin minh chứng và Rule Engine để quy đổi giờ làm việc.

## 🚀 Công nghệ sử dụng (Tech Stack)

### 1. Frontend (`frontend` - `@projectname/frontend`)

- **Framework:** React 19
- **Build Tool:** Vite 7
- **UI Library:** Ant Design 6
- **State Management:** Zustand
- **Vai trò:** Giao diện cho Giảng viên, Nghiên cứu viên khai báo thông tin, nộp minh chứng (PDF/Link). Cung cấp Dashboard cho Quản lý phê duyệt.

### 2. Backend (`backend` - `@projectname/backend`)

- **Framework:** NestJS
- **Database ORM:** Prisma
- **Database:** PostgreSQL
- **Vai trò:** Máy chủ nghiệp vụ chính, quản lý người dùng, phân quyền (RBAC), lưu trữ cấu hình quy định (Quy đổi giờ, tỷ lệ phân bổ tác giả). Tích hợp **Rule Engine** để tự động tính toán giờ làm việc chính thức dựa trên kết quả AI đề xuất.

### 3. AI Service (`ai-service`)

- **Framework:** FastAPI (Python)
- **Công cụ:** PDF extraction, RAG, LLM API
- **Vai trò:** Xử lý file PDF minh chứng hoặc thu thập metadata từ Link (URL) bài báo. Trích xuất tự động tên bài, tác giả, nơi công bố và xếp loại tạp chí. AI chỉ đóng vai trò **đề xuất**, không tự ý quyết định số giờ.

### 4. Shared (`shared` - `@projectname/shared`)

- **Vai trò:** Chứa các Type, Interface dùng chung giữa Frontend và Backend, đảm bảo tính đồng nhất dữ liệu (API Contracts).

## 📂 Cấu trúc thư mục

```
.
├── frontend/           # Giao diện người dùng (React/Vite)
├── backend/            # Máy chủ nghiệp vụ trung tâm & Rule Engine (NestJS)
├── ai-service/         # Dịch vụ trích xuất dữ liệu AI (FastAPI/Python)
├── shared/             # Cấu trúc dữ liệu dùng chung (TypeScript)
├── docker-compose.yaml # Cấu hình hạ tầng Database/Redis
└── package.json        # Cấu hình Root Workspace
```

## ⚙️ Luồng hoạt động chính (Pipeline)

1. **Upload Minh chứng:** Người dùng (Giảng viên/Nghiên cứu viên) nộp minh chứng bằng file PDF hoặc đường dẫn (URL) bài báo qua `frontend`.
2. **AI Bóc tách:** `backend` tiếp nhận và gửi dữ liệu sang `ai-service`. AI đọc file PDF hoặc thu thập metadata từ URL, kết hợp LLM để đề xuất thông tin bài báo.
3. **Đối chiếu & Tính giờ:** Kết quả AI trả về `backend`. Tại đây, **Rule Engine** tra cứu bảng quy định (`conversion_rules`, `working_hour_norms`) để quy đổi chính xác số giờ làm việc dựa trên hạng chức danh, số tác giả, và xếp loại nguồn công bố.
4. **Phê duyệt:** Dữ liệu hoàn chỉnh hiện trên `frontend` để người dùng kiểm tra, xác nhận và nộp lên Quản lý phê duyệt.

## 🛠 Hướng dẫn cài đặt

Hướng dẫn chạy đầy đủ cho Windows/PowerShell nằm tại [HUONG_DAN_CHAY_DU_AN.md](./HUONG_DAN_CHAY_DU_AN.md).

### 1. Yêu cầu hệ thống

- [Node.js](https://nodejs.org/) (>= 22.0.0)
- [pnpm](https://pnpm.io/)
- Python 3.10+ (Cho AI Service)
- Docker & Docker Compose

### 2. Cài đặt & Khởi động Backend + Frontend

```bash
# Cài đặt thư viện Node
pnpm install

# Khởi chạy Database (PostgreSQL + pgvector & Redis)
docker-compose up -d

# Cập nhật Database Schema
pnpm prisma:push

# Chạy hệ thống Backend và Frontend
pnpm dev
```

### 3. Cài đặt AI Service (Python)

```bash
cd ai-service
pip install -r requirements.txt
# Copy và cấu hình file .env (nếu có)
cp .env.example .env
# Chạy server FastAPI
uvicorn app.main:app --reload
```

AI service dùng chung PostgreSQL `projectname` từ Docker Compose root theo cấu hình
mặc định trong `ai-service/.env.example`. Nếu chạy AI độc lập, dùng `make db` trong
thư mục `ai-service` và đổi database URL sang port `55432`.
