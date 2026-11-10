# HỆ THỐNG QUẢN LÝ VẬN HÀNH — CÔNG TY BÊ TÔNG TSG-TNT

WebApp quản lý vận hành nội bộ cho **CÔNG TY CỔ PHẦN SX KD DV BÊ TÔNG TSG TNT**.

Giao diện tiếng Việt 100%, chạy trên Vercel, dữ liệu tập trung trên PostgreSQL,
có phân quyền, nhật ký thao tác, sao lưu và AI Camera giám sát phương tiện.

---

## 1. Kiến trúc

```
┌─────────────────────────────┐         ┌──────────────────────────┐
│  WebApp (Next.js 14)        │         │  AI Camera Agent         │
│  Vercel · HTTPS             │◄────────│  Python · Windows        │
│                             │  HTTPS  │  tại nhà máy             │
│  · Dashboard, báo cáo SX    │  +Token │                          │
│  · Tài xế, phương tiện      │         │  · RTSP Hikvision        │
│  · Đăng kiểm, bảo hiểm      │         │  · YOLO phát hiện xe     │
│  · AI Camera (quản lý)      │         │  · OCR biển số           │
│  · Telegram, người dùng     │         │  · Vùng ROI              │
└──────────┬──────────────────┘         └──────────┬───────────────┘
           │                                        │
           │ Prisma                                 │ RTSP (LAN)
           ▼                                        ▼
    ┌─────────────────┐                    ┌──────────────────┐
    │  PostgreSQL     │                    │  Camera IP       │
    │  (Neon / VPS)   │                    │  192.168.x.x     │
    └─────────────────┘                    └──────────────────┘
```

### Vì sao cần Agent riêng

Vercel chạy trên cloud, **không thể truy cập địa chỉ IP nội bộ** `192.168.x.x`.
Camera IP tại nhà máy nằm trong mạng LAN, nên không có cách nào để serverless
function đọc trực tiếp luồng RTSP.

Giải pháp: một **AI Camera Agent** chạy trên máy Windows tại nhà máy. Agent đọc
RTSP, chạy nhận diện AI cục bộ, rồi đẩy kết quả lên WebApp qua HTTPS API có token.
WebApp chỉ quản lý danh sách camera, cấu hình vùng ROI và hiển thị lịch sử.

Mật khẩu camera, RTSP URL và Telegram bot token **không bao giờ nằm trong code
frontend**. RTSP URL và bot token được mã hóa AES-256-GCM trong database.

---

## 2. Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Biểu đồ | Recharts |
| Dark mode | next-themes |
| Backend | Next.js Route Handlers (REST) |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Xác thực | JWT (jose), cookie httpOnly, bcrypt |
| Mã hóa secret | AES-256-GCM (Node crypto) |
| Excel | ExcelJS |
| In báo cáo | CSS `@media print` |
| AI Agent | Python 3.11, OpenCV, Ultralytics YOLO, PaddleOCR |

---

## 3. Cài đặt local

### 3.1. Yêu cầu

- Node.js 20+
- PostgreSQL 16 (hoặc dùng Neon cloud)
- Python 3.11 (chỉ cần cho Agent)

### 3.2. Cài đặt WebApp

```powershell
cd web
npm install
```

Tạo file `.env` từ mẫu:

```powershell
Copy-Item .env.example .env
```

Sinh các khóa bảo mật:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Dán lần lượt vào `AUTH_SECRET`, `ENCRYPTION_KEY`, `AGENT_API_TOKEN`.

Tạo database và nạp dữ liệu mẫu:

```powershell
npx prisma db push
npx prisma db seed
```

Chạy dev server:

```powershell
npm run dev
```

Mở http://localhost:3000

### 3.3. Tài khoản mặc định

| Tên đăng nhập | Mật khẩu | Vai trò |
|---|---|---|
| `admin` | `TsgTnt@2026` | Quản trị hệ thống |

Các tài khoản mẫu khác (mật khẩu giống nhau): `giamdoc`, `ketoan`, `dieudo`,
`doixe`, `baove`.

> **Đổi mật khẩu ngay sau khi triển khai.** Vào Quản lý người dùng → sửa tài khoản.

---

## 4. Triển khai lên Vercel

### 4.1. Chuẩn bị database

Tạo PostgreSQL trên [Neon](https://neon.tech) (miễn phí, có sẵn cho Vercel):

1. Tạo project, chọn region **Singapore** (gần Việt Nam nhất).
2. Copy connection string dạng:
   `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/tsg_tnt?sslmode=require`

### 4.2. Đẩy code lên GitHub

```powershell
cd tsg-tnt
git init
git add .
git commit -m "Khoi tao he thong quan ly van hanh TSG-TNT"
git branch -M main
git remote add origin https://github.com/<tai-khoan>/tsg-tnt.git
git push -u origin main
```

> `.env` đã nằm trong `.gitignore`, không bị đẩy lên.

### 4.3. Import vào Vercel

1. Vercel → **Add New Project** → chọn repo `tsg-tnt`.
2. **Root Directory**: `web`
3. Framework: Next.js (tự nhận)
4. Thêm Environment Variables:

| Biến | Giá trị |
|---|---|
| `DATABASE_URL` | connection string Neon |
| `AUTH_SECRET` | chuỗi ngẫu nhiên 48 byte |
| `ENCRYPTION_KEY` | base64 của 32 byte |
| `AGENT_API_TOKEN` | hex 32 byte |
| `NEXT_PUBLIC_APP_NAME` | `TSG-TNT` |
| `TZ` | `Asia/Ho_Chi_Minh` |

5. **Deploy**.

### 4.4. Nạp schema và dữ liệu lên database production

Chạy từ máy local, trỏ vào database Neon:

```powershell
cd web
$env:DATABASE_URL="postgresql://...neon.tech/tsg_tnt?sslmode=require"
npx prisma db push
npx prisma db seed
```

---

## 5. AI Camera Agent

Xem hướng dẫn chi tiết tại [`docs/AGENT.md`](docs/AGENT.md).

Tóm tắt:

```powershell
cd agent
.\setup.bat              # cai dat lan dau
# sua config.yaml: base_url, api_token, rtsp_url
.\run.bat --check        # kiem tra ket noi
.\run.bat                # bat dau giam sat
```

---

## 6. Phân quyền

| Vai trò | Quyền hạn |
|---|---|
| **Quản trị hệ thống** (ADMIN) | Toàn quyền mọi phân hệ |
| **Ban Giám đốc** | Xem + xuất báo cáo, dashboard, thống kê |
| **Kế toán** | Xem/thêm/sửa báo cáo sản xuất, xuất Excel |
| **Điều độ** | Quản lý tài xế, phương tiện, bảng tài |
| **Quản lý đội xe** | Hồ sơ đăng kiểm, bảo hiểm, GPLX |
| **Bảo vệ** | Camera giám sát, lịch sử xe vào/ra |

Ma trận chi tiết (Xem / Thêm / Sửa / Xóa / Xuất) hiển thị tại
**Quản lý người dùng → Ma trận phân quyền**.

---

## 7. Cấu trúc thư mục

```
tsg-tnt/
├── web/                        # WebApp Next.js
│   ├── app/
│   │   ├── (app)/              # Các trang sau đăng nhập
│   │   │   ├── dashboard/      # Tổng quan
│   │   │   ├── reports/        # Báo cáo sản xuất (+ in)
│   │   │   ├── drivers/        # Bảng tài / tài xế
│   │   │   ├── vehicles/       # Phương tiện
│   │   │   ├── documents/      # Đăng kiểm – bảo hiểm
│   │   │   ├── licenses/       # Giấy phép lái xe
│   │   │   ├── cameras/        # AI Camera (+ vùng ROI)
│   │   │   ├── telegram/       # Cấu hình thông báo
│   │   │   ├── users/          # Người dùng + phân quyền
│   │   │   ├── audit/          # Nhật ký thao tác
│   │   │   └── settings/       # Cài đặt + sao lưu
│   │   ├── (auth)/login/       # Đăng nhập
│   │   └── api/                # REST API
│   ├── components/             # UI components
│   ├── lib/                    # db, session, crypto, rbac, telegram…
│   └── prisma/                 # schema + seed
├── agent/                      # AI Camera Agent (Python)
│   ├── agent.py                # vòng lặp chính
│   ├── config.py               # đọc YAML
│   ├── rtsp_reader.py          # đọc RTSP, tự kết nối lại
│   ├── detector.py             # YOLO + ROI
│   ├── ocr.py                  # OCR biển số
│   ├── api_client.py           # gửi sự kiện lên WebApp
│   ├── setup.bat / run.bat     # script Windows
│   └── config.example.yaml
└── docs/                       # Tài liệu
```

---

## 8. Bảo mật

- Mật khẩu hash bằng **bcrypt** (cost 10), không lưu plaintext.
- Phiên đăng nhập: JWT ký HS256, cookie `httpOnly` + `sameSite=lax`, hết hạn 12 giờ.
- RTSP URL và Telegram bot token: mã hóa **AES-256-GCM**, khóa từ `ENCRYPTION_KEY`.
- Token agent: so sánh bằng `timingSafeEqual`, không lộ qua log.
- Mọi thao tác ghi/xóa/xuất đều ghi **nhật ký** kèm IP.
- API agent nằm ngoài middleware session, xác thực riêng bằng Bearer token.
- Secret không bao giờ trả về client: API camera chỉ trả `hasToken: true/false`.

---

## 9. Sao lưu

**Cài đặt hệ thống → Tải bản sao lưu** xuất toàn bộ dữ liệu nghiệp vụ ra JSON
(trạm, khách hàng, tài xế, phương tiện, giấy tờ, báo cáo, camera, sự kiện).
Không bao gồm mật khẩu, token hay RTSP URL.

Với dữ liệu production, nên bật **Neon automatic backups** hoặc chạy `pg_dump`
định kỳ trên VPS.

---

## 10. Lệnh thường dùng

```powershell
cd web
npm run dev              # chạy dev
npm run build            # build production
npx prisma studio        # xem database trực quan
npx prisma db push       # đồng bộ schema
npx prisma db seed       # nạp dữ liệu mẫu
npx tsc --noEmit         # kiểm tra TypeScript
```
