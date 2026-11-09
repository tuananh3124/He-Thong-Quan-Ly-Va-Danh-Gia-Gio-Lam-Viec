# Hướng dẫn chạy dự án

## 1. Tổng quan

Dự án gồm các thành phần:

- `frontend`: giao diện React/Vite.
- `backend`: API NestJS, Prisma và PostgreSQL.
- `ai-service`: dịch vụ FastAPI xử lý tài liệu và RAG.
- `shared`: type và hằng số dùng chung.

## 2. Yêu cầu môi trường

Cần cài đặt:

- Node.js phiên bản 22 trở lên.
- pnpm phiên bản 10 trở lên.
- Python 3.10 trở lên, khuyến nghị Python 3.12 cho `ai-service`.
- Docker Desktop đang chạy.
- Git.

Kiểm tra phiên bản:

```powershell
node --version
pnpm --version
python --version
docker --version
docker compose version
```

## 3. Cài đặt dependency

Mở PowerShell tại thư mục gốc dự án:

```powershell
cd D:\DOANTOTNGHIEP
pnpm install
```

## 4. Tạo file cấu hình môi trường

Chạy một lần:

```powershell
Copy-Item backend\.env.sample backend\.env
Copy-Item frontend\.env.sample frontend\.env
Copy-Item ai-service\.env.example ai-service\.env
```

Các cấu hình mặc định dùng cho môi trường local:

### Backend

File: `backend/.env`

```env
DATABASE_URL="postgresql://postgres:password@localhost:55432/projectname?schema=public"
JWT_SECRET_KEY="local-access-secret-change-me"
JWT_REFRESH_SECRET_KEY="local-refresh-secret-change-me"
REDIS_HOST="localhost"
NODE_ENV="local"
BASE_URL="http://localhost:3000"
```

### Frontend

File: `frontend/.env`

```env
VITE_API_BASE_URL="http://localhost:3000"
```

### AI Service

File: `ai-service/.env`

Mặc định file này đã trỏ tới PostgreSQL dùng chung:

```env
DATABASE_URL=postgresql+psycopg://postgres:password@localhost:55432/projectname
OPENAI_API_KEY=your-api-key
```

Nếu chưa sử dụng AI, có thể để AI service chưa chạy. Khi sử dụng AI, cần thay `your-api-key` bằng API key hợp lệ hoặc cấu hình một provider tương thích OpenAI.

## 5. Khởi động PostgreSQL, pgvector và Redis

Đảm bảo Docker Desktop đang chạy, sau đó thực hiện:

```powershell
docker compose up -d
```

Kiểm tra container:

```powershell
docker compose ps
```

Các cổng mặc định:

| Thành phần            |   Cổng |
| --------------------- | -----: |
| PostgreSQL + pgvector | `55432` |
| PgBouncer             | `6432` |
| Redis                 | `6379` |

## 6. Khởi tạo database

Đẩy schema Prisma vào PostgreSQL:

```powershell
pnpm prisma:push
```

Tạo dữ liệu mẫu:

```powershell
pnpm prisma:seed
```

Lệnh seed tạo:

- Tài khoản cán bộ mẫu.
- Tài khoản Admin mẫu.
- Năm học `2025-2026`.
- Phân loại nguồn ISI/SCIE và SCOPUS.
- Nguồn công bố mẫu.
- Một số quy tắc quy đổi giờ.
- Quy tắc phân bổ tác giả.

## 7. Chạy Backend và Frontend

Mở terminal thứ nhất:

```powershell
cd D:\DOANTOTNGHIEP
pnpm dev
```

Sau khi khởi động:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:3000/api/v1](http://localhost:3000/api/v1)
- Swagger API: [http://localhost:3000/apidoc](http://localhost:3000/apidoc)

## 8. Chạy AI Service

AI service không nằm trong pnpm workspace, nên chạy bằng terminal riêng:

```powershell
cd D:\DOANTOTNGHIEP\ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

AI service sẽ chạy tại:

- API: [http://localhost:8000](http://localhost:8000)
- Swagger: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health check: [http://localhost:8000/health](http://localhost:8000/health)

Các API chính của AI:

```text
GET  /documents
POST /documents
POST /documents/upload
POST /query
POST /query/stream
```

## 9. Tài khoản mẫu

Sau khi chạy `pnpm prisma:seed`:

| Vai trò | Email             | Mật khẩu    | Đường dẫn      |
| ------- | ----------------- | ----------- | -------------- |
| Cán bộ  | `test@test.com`   | `Abc123456` | `/login`       |
| Quản lý | `manager@test.com` | `Abc123456` | `/login`       |
| Admin   | `admin@admin.com` | `Abc123456` | `/admin/login` |

Đây chỉ là tài khoản local để kiểm thử. Không dùng các thông tin này trên production.
Tài khoản quản lý xem và xử lý kê khai của cán bộ trong cùng tenant.

## 10. Luồng sử dụng chính

### Cán bộ

1. Đăng nhập tại `/login`.
2. Mở mục `Kê khai hoạt động`.
3. Tạo bản kê khai mới hoặc sửa bản nháp/bản bị từ chối.
4. Chọn loại hoạt động và năm học; với nghiên cứu, nhập năm xuất bản, DOI và tác giả.
5. Thêm URL minh chứng hoặc tải lên một tệp PDF tối đa 20 MB.
6. Lưu bản nháp, bấm `Tính giờ` và kiểm tra giờ phân bổ cho tác giả.
7. Bấm `Gửi duyệt`.

Tệp PDF được lưu cục bộ trong `backend/uploads/evidence` và không được đưa vào Git. Khi triển khai nhiều máy chủ, cần chuyển sang object storage dùng chung.

### Quản lý

1. Đăng nhập tại `/login`.
2. Mở `Kê khai hoạt động` để xem hồ sơ đã gửi trong tenant.
3. Mở hồ sơ, kiểm tra metadata và minh chứng, sau đó phê duyệt hoặc từ chối kèm lý do.

### Admin

1. Đăng nhập tại `/admin/login`.
2. Mở `Người dùng` để tạo tài khoản hoặc chỉnh sửa vai trò, nhóm cán bộ và đơn vị.
3. Tài khoản cán bộ cần chọn giảng viên/nghiên cứu viên và đơn vị; tài khoản quản lý cần chọn đơn vị.
4. Quản lý năm học, nguồn và phân loại công bố.
5. Cấu hình quy tắc quy đổi.
6. Theo dõi kê khai và cấu hình hệ thống.

## 11. Build và kiểm tra

Build toàn bộ monorepo:

```powershell
pnpm build
```

Build riêng Frontend:

```powershell
pnpm --filter @projectname/frontend build
```

Build riêng Backend:

```powershell
pnpm --filter @projectname/backend build
```

Format code:

```powershell
pnpm format
```

## 12. Một số lỗi thường gặp

### Docker không chạy

Nếu gặp lỗi liên quan đến `dockerDesktopLinuxEngine`, hãy mở Docker Desktop rồi chạy lại:

```powershell
docker compose up -d
```

### Không kết nối được database

Kiểm tra:

```powershell
docker compose ps
docker compose logs nest_postgres_dev
```

Đảm bảo `backend/.env` dùng đúng database:

```env
DATABASE_URL="postgresql://postgres:password@localhost:55432/projectname?schema=public"
```

### Prisma báo thiếu biến môi trường

Đảm bảo đã tạo `backend/.env` từ `backend/.env.sample`, sau đó chạy lại:

```powershell
pnpm prisma:push
```

### Port đã được sử dụng

Kiểm tra các cổng `3000`, `5173`, `55432`, `6379` và `8000`. Có thể dừng stack Docker bằng:

```powershell
docker compose down
```

## 13. Dừng hệ thống

Dừng Frontend/Backend bằng `Ctrl + C` tại terminal đang chạy `pnpm dev`.

Dừng PostgreSQL, PgBouncer và Redis:

```powershell
docker compose down
```

Lệnh trên không xóa volume database. Dữ liệu local vẫn được giữ lại cho lần chạy sau.
