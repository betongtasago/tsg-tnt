# AI CAMERA AGENT — Hướng dẫn cài đặt và vận hành

Agent chạy trên máy Windows tại nhà máy. Nó đọc luồng RTSP từ camera IP, chạy
nhận diện phương tiện bằng YOLO, đọc biển số bằng OCR, rồi đẩy sự kiện lên WebApp
qua HTTPS.

---

## 1. Yêu cầu hệ thống

| Mục | Tối thiểu | Khuyến nghị |
|---|---|---|
| CPU | Intel i3 / Ryzen 3 | Intel i5 / Ryzen 5 trở lên |
| RAM | 8 GB | 16 GB |
| Ổ cứng | 20 GB trống | 50 GB (lưu ảnh snapshot) |
| Hệ điều hành | Windows 10 64-bit | Windows 11 64-bit |
| Python | 3.11 | 3.11 |
| Mạng | Cùng LAN với camera | Cáp mạng, không dùng Wi-Fi |

Không cần GPU. Với `yolo11n.pt` trên CPU i5, mỗi frame xử lý khoảng 80–150ms.
Agent bỏ qua frame (`frame_skip: 5`) nên tải CPU ở mức 20–40%.

Nếu có GPU NVIDIA, đặt `device: "0"` trong `config.yaml` để nhanh hơn 5–10 lần
(cần cài CUDA + torch bản GPU).

---

## 2. Cài đặt

### Bước 1 — Cài Python

Tải Python 3.11 từ https://www.python.org/downloads/

> **Quan trọng:** tick vào **"Add Python to PATH"** ở màn hình đầu tiên của bộ cài.

Kiểm tra:

```powershell
python --version
```

### Bước 2 — Chạy setup

Mở thư mục `agent`, nhấp đôi **`setup.bat`**.

Script sẽ:
1. Tạo môi trường ảo `.venv`
2. Cài thư viện (5–15 phút, tải ~2 GB)
3. Tạo `config.yaml` từ file mẫu

### Bước 3 — Điền cấu hình

Mở `config.yaml` bằng Notepad, điền 3 thông tin bắt buộc:

```yaml
webapp:
  base_url: "https://tsg-tnt.vercel.app"     # domain WebApp
  api_token: "a478c461..."                    # AGENT_API_TOKEN trong .env của WebApp

cameras:
  - code: "CAM-CONG"                          # phải KHỚP mã camera trong WebApp
    name: "Cổng nhà máy"
    rtsp_url: "rtsp://admin:matkhau@192.168.1.64:554/Streaming/Channels/101"
```

**Lấy `api_token`:** mở file `web/.env` trên máy chủ, hoặc trên Vercel vào
Settings → Environment Variables → `AGENT_API_TOKEN`.

**Lấy RTSP URL:** vào WebApp → **AI Camera giám sát** → nút copy cạnh camera.
Hệ thống giải mã và hiển thị URL đầy đủ (thao tác này được ghi nhật ký).

### Bước 4 — Kiểm tra kết nối

```powershell
.\run.bat --check
```

Kết quả mong đợi:

```
=== KIEM TRA KET NOI ===
[OK]   WebApp: https://tsg-tnt.vercel.app
[OK]   Camera CAM-CONG: 1920x1080
[OK]   Model: yolo11n.pt
[OK]   OCR: paddleocr

Ket qua: SAN SANG
```

Nếu có dòng `[LOI]`, xem mục **Xử lý sự cố** bên dưới.

### Bước 5 — Chạy agent

```powershell
.\run.bat
```

Agent bắt đầu giám sát. Log hiển thị trực tiếp trên cửa sổ console và ghi vào
`agent/logs/agent.log`.

---

## 3. Cấu hình vùng nhận diện (ROI)

Vùng ROI quyết định khi nào một xe được coi là "đã vào cổng". Không có ROI,
agent dùng toàn bộ khung hình — dễ bắt nhầm xe chạy trên đường ngoài.

### Vẽ ROI

1. Vào WebApp → **AI Camera giám sát**
2. Nhấp nút **mắt** (Vẽ vùng nhận diện) ở dòng camera
3. Bấm vào khung để đặt các đỉnh đa giác — thường 4 điểm tạo hình thang
4. Đặt tên vùng, chọn chiều (Xe vào / Xe ra / Cả hai)
5. Bấm **Lưu vùng**

Toạ độ được chuẩn hóa 0–1 nên áp dụng đúng ở mọi độ phân giải camera.

### Đồng bộ ROI xuống agent

Agent đọc ROI từ `config.yaml`, **không** tự lấy từ WebApp. Sau khi vẽ ROI trên
WebApp, chép toạ độ vào `config.yaml`:

```yaml
cameras:
  - code: "CAM-CONG"
    zones:
      - name: "Vùng cổng chính"
        direction: "IN"
        points:
          - { x: 0.15, y: 0.55 }
          - { x: 0.85, y: 0.55 }
          - { x: 0.95, y: 0.95 }
          - { x: 0.05, y: 0.95 }
```

> **Mẹo:** chạy `.\run.bat --snapshot CAM-CONG` để chụp ảnh thực tế từ camera,
> mở ảnh bằng Paint và ước lượng toạ độ các đỉnh vùng.

### Cách agent xác định xe trong vùng

Agent lấy **điểm giữa cạnh dưới** của bounding box (nơi bánh xe tiếp xúc mặt
đường) và kiểm tra điểm đó có nằm trong đa giác không. Cách này ổn định hơn dùng
tâm box, vì tâm box có thể nằm trong vùng trong khi xe vẫn ở ngoài cổng.

---

## 4. Cấu hình nhận diện

```yaml
detection:
  model: "yolo11n.pt"          # yolo11n (nhanh) | yolo11s (chính xác hơn)
  confidence: 0.45             # ngưỡng tin cậy phát hiện xe
  vehicle_classes: [2, 5, 7]   # car, bus, truck (chuẩn COCO)
  imgsz: 640                   # kích thước ảnh vào model
  device: "cpu"                # "cpu" hoặc "0" nếu có GPU
  frame_skip: 5                # xử lý 1/5 số frame
  min_event_interval_seconds: 60   # chống trùng phía agent
  min_box_area_ratio: 0.01     # bỏ box nhỏ hơn 1% diện tích khung
```

### Chọn model

| Model | Tốc độ (CPU) | Độ chính xác | Dùng khi |
|---|---|---|---|
| `yolo11n.pt` | ~80ms/frame | Khá | Máy yếu, 1–3 camera |
| `yolo11s.pt` | ~200ms/frame | Tốt | Máy khỏe, cần chính xác |
| `yolo11m.pt` | ~450ms/frame | Rất tốt | Có GPU |

Model tự tải về lần chạy đầu, lưu tại thư mục gốc agent.

---

## 5. Cấu hình OCR

```yaml
ocr:
  enabled: true
  lang: "en"                   # "en" đọc biển số VN tốt hơn "vi"
  engine: "paddleocr"          # paddleocr | easyocr
  min_confidence: 0.55         # dưới ngưỡng này coi như chưa xác định
  save_plate_crop: true
```

Agent cắt 45% phía dưới của bounding box xe (nơi biển số thường nằm), chạy OCR,
rồi làm sạch chuỗi theo định dạng biển số Việt Nam.

Ví dụ chuỗi OCR thô → kết quả:

| OCR đọc được | Sau khi làm sạch |
|---|---|
| `51C-123.45` | `51C12345` |
| `5IC12345` | `51C12345` (I→1) |
| `51C 123 45` | `51C12345` |
| `abc` | *(loại bỏ)* |

Nếu OCR đọc không ra, sự kiện vẫn được gửi với `plate: null` và WebApp hiển thị
"Chưa xác định", đồng thời gửi cảnh báo Telegram nếu bật loại thông báo đó.

---

## 6. Chống nhận diện trùng

Có hai lớp chống trùng:

**Lớp 1 — Agent** (`min_event_interval_seconds`, mặc định 60s):
Agent ghi nhớ biển số vừa thấy. Cùng biển số trên cùng camera trong khoảng này
sẽ không gửi lại. Xe đứng yên ở cổng không tạo hàng trăm sự kiện.

**Lớp 2 — WebApp** (`dedupeSeconds`, mặc định 120s):
Cấu hình tại **Thông báo Telegram**. Server kiểm tra lần cuối cùng thấy biển số
này trên camera này. Nếu trong khoảng thời gian đó, sự kiện bị bỏ qua.

Lớp 2 quan trọng khi có nhiều agent hoặc agent khởi động lại (mất bộ nhớ đệm).

---

## 7. Heartbeat và trạng thái camera

Agent gửi trạng thái mỗi 60 giây:

```yaml
heartbeat:
  interval_seconds: 60
  offline_after_seconds: 30    # không có frame trong 30s -> OFFLINE
```

WebApp cập nhật cột **Trạng thái** và **Lần cuối online** trên trang AI Camera.

Khi camera mất kết nối, agent tự thử lại sau `reconnect.delay_seconds` (mặc định
10s), không giới hạn số lần (`max_attempts: 0`).

---

## 8. Chạy tự động khi khởi động Windows

### Cách 1 — Task Scheduler (khuyến nghị)

1. Mở **Task Scheduler** → **Create Task**
2. Tab **General**:
   - Name: `TSG-TNT Camera Agent`
   - Chọn **Run whether user is logged on or not**
   - Tick **Run with highest privileges**
3. Tab **Triggers** → New → **At startup** → OK
4. Tab **Actions** → New:
   - Program: `C:\tsg-tnt\agent\.venv\Scripts\pythonw.exe`
   - Arguments: `agent.py --config config.yaml`
   - Start in: `C:\tsg-tnt\agent`
5. Tab **Settings**:
   - Tick **If the task fails, restart every** → 1 minute
   - Bỏ tick **Stop the task if it runs longer than**
6. OK, nhập mật khẩu Windows

> Dùng `pythonw.exe` (không có `w`) để chạy ẩn, không hiện cửa sổ console.
> Log vẫn ghi vào `agent/logs/agent.log`.

### Cách 2 — Startup folder

Tạo shortcut tới `run.bat` trong:
`C:\Users\<user>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`

Cách này chỉ chạy khi có người đăng nhập, và hiện cửa sổ console.

---

## 9. Xử lý sự cố

### `[LOI] Camera: khong doc duoc frame`

| Nguyên nhân | Cách kiểm tra |
|---|---|
| Sai IP / cổng | `ping 192.168.1.64` |
| Sai user/password | Mở RTSP bằng VLC: Media → Open Network Stream |
| Camera dùng HTTP port khác | Hikvision mặc định RTSP 554 |
| Cổng RTSP bị tắt | Vào web camera → Network → Advanced → RTSP |
| Firewall chặn | Tắt Windows Firewall tạm để kiểm tra |

**Kiểm tra RTSP bằng VLC:** mở VLC → Ctrl+N → dán URL → Play. Nếu VLC xem được
thì agent cũng đọc được.

### `[LOI] WebApp: 401`

`api_token` không khớp `AGENT_API_TOKEN`. Chép lại chính xác, không có khoảng trắng.

### `[LOI] WebApp: khong ket noi duoc`

- `base_url` sai hoặc thiếu `https://`
- Máy không có internet
- Proxy công ty chặn — thêm biến môi trường `HTTPS_PROXY`

### `[LOI] Model: ...`

Lần chạy đầu cần internet để tải model (~6 MB). Nếu mạng công ty chặn, tải thủ
công file `.pt` từ https://github.com/ultralytics/assets/releases và đặt vào thư
mục `agent/`.

### OCR không đọc được biển số

- Ảnh quá mờ hoặc ngược sáng → đổi góc đặt camera, thêm đèn hồng ngoại
- Biển số quá xa → dùng camera có zoom quang học, hoặc tăng `imgsz` lên 1280
- Biển số bẩn/che → OCR không thể đọc, hệ thống sẽ báo "Chưa xác định"

### Agent chạy nhưng không gửi sự kiện

- Kiểm tra `enabled: true` cho camera trong `config.yaml`
- Kiểm tra ROI: xe có đi qua vùng đã vẽ không
- Xem log: `agent/logs/agent.log`
- Giảm `confidence` xuống 0.35 nếu xe bị bỏ sót

### CPU luôn 100%

- Tăng `frame_skip` lên 10
- Đổi sang `yolo11n.pt`
- Giảm `imgsz` xuống 480
- Tắt OCR nếu chỉ cần đếm xe

---

## 10. Bảo trì

### Dung lượng ổ đĩa

Ảnh snapshot tự xóa sau `retention_days` (mặc định 30 ngày). Agent kiểm tra mỗi
giờ. Với 3 camera hoạt động liên tục, 30 ngày chiếm khoảng 2–5 GB.

### Cập nhật agent

```powershell
cd agent
.\.venv\Scripts\python.exe -m pip install --upgrade -r requirements.txt
```

### Xem log

```powershell
Get-Content .\logs\agent.log -Tail 100 -Wait
```

Log tự xoay vòng theo ngày, giữ 14 ngày.

---

## 11. Bảo mật

- `config.yaml` chứa mật khẩu camera → **không commit lên GitHub** (đã có trong
  `.gitignore`).
- Token agent chỉ có quyền gửi sự kiện, không đọc được dữ liệu khác.
- Nếu token bị lộ: đổi `AGENT_API_TOKEN` trong `.env` của WebApp, cập nhật
  `config.yaml`, khởi động lại agent.
- RTSP URL trong WebApp được mã hóa AES-256-GCM; mỗi lần xem đều ghi nhật ký.
