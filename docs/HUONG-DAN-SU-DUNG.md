# HỆ THỐNG QUẢN LÝ VẬN HÀNH TSG-TNT

Tài liệu vận hành dành cho quản trị viên và người dùng hệ thống.

---

## 1. Đăng nhập

Mở địa chỉ WebApp, nhập tên đăng nhập và mật khẩu do quản trị viên cấp.

Phiên đăng nhập kéo dài **12 giờ**. Hết phiên, hệ thống tự chuyển về trang đăng
nhập. Bấm **Đăng xuất** ở cuối thanh bên khi dùng máy chung.

Nếu quên mật khẩu, liên hệ quản trị viên để đặt lại tại
**Quản lý người dùng → sửa tài khoản → Mật khẩu mới**.

---

## 2. Tổng quan

Trang đầu tiên sau khi đăng nhập. Hiển thị:

- **Sản lượng hôm nay** — tổng khối lượng thực tế và % so với kế hoạch
- **Lũy kế tháng** — tổng tháng và % kế hoạch tháng
- **Xe hoạt động** — số xe đang hoạt động trên tổng số
- **Tài xế đang làm** — số tài xế có trạng thái "Đang làm việc"
- **Giấy tờ sắp hết hạn** — số hồ sơ cần xử lý
- **Camera online** — số camera đang kết nối và số lượt xe nhận diện hôm nay

Bên dưới là biểu đồ sản lượng 7 ngày gần nhất (thực tế so với kế hoạch), biểu đồ
tròn tình trạng phương tiện, sản lượng theo trạm trong tháng, và danh sách cảnh
báo giấy tờ.

---

## 3. Báo cáo sản xuất

### Lập báo cáo

**Báo cáo sản xuất → Lập báo cáo**

Điền các trường:

| Trường | Ghi chú |
|---|---|
| Ngày sản xuất | Mặc định hôm nay |
| Ca sản xuất | Sáng / Chiều / Đêm |
| Trạm bê tông | Chọn từ danh mục |
| Khách hàng / Công trình | Chọn từ danh mục |
| Mác bê tông | Ví dụ M250, M300 |
| Độ sụt | cm |
| Khối lượng kế hoạch | m³ |
| Khối lượng thực tế | m³ |
| Số lượng xe | số xe tham gia |
| Số chuyến | số chuyến đã chạy |
| Thời gian bắt đầu / kết thúc | Giờ |
| Người phụ trách | |
| Ghi chú sự cố | Sự cố, dừng máy, thiếu vật tư… |

### Trạng thái báo cáo

| Trạng thái | Ý nghĩa |
|---|---|
| **Bản nháp** | Đang soạn, có thể sửa, chưa ai thấy |
| **Đã gửi** | Đã gửi Ban Giám đốc, không sửa được |
| **Đã duyệt** | Ban Giám đốc đã duyệt |

Bấm **Lưu nháp** để lưu tạm, **Gửi Ban Giám đốc** để chốt báo cáo.

### Xem và tổng hợp

Bộ lọc phía trên cho phép xem theo **ngày / tuần / tháng**, lọc theo trạm và
khách hàng. Các thẻ thống kê tự động tổng hợp:

- Tổng khối lượng kế hoạch và thực tế
- Tỷ lệ hoàn thành kế hoạch
- Tổng số chuyến
- Số báo cáo trong kỳ

### Xuất và in

- **Xuất Excel** — file `.xlsx` có tiêu đề công ty, đầy đủ cột, định dạng số
- **In báo cáo** — mở trang in theo mẫu biểu công ty, dùng `Ctrl+P`

Trang in tự ẩn thanh bên, nút bấm và các yếu tố giao diện, chỉ giữ nội dung báo
cáo trên khổ A4.

---

## 4. Bảng tài / Quản lý tài xế

**Bảng tài / Tài xế**

Thông tin mỗi tài xế: mã tài xế, họ tên, số điện thoại, biển số phụ trách, trạm,
ngày vào làm, tình trạng, ca làm việc, ghi chú.

### Thao tác

- **Tìm kiếm** — theo mã, tên, số điện thoại, biển số
- **Lọc theo trạm** và **tình trạng**
- **Thêm / Sửa / Xóa** tài xế (phụ thuộc quyền)
- **Xuất Excel** — toàn bộ danh sách

### Tình trạng

| Tình trạng | Ý nghĩa |
|---|---|
| Đang làm việc | Đang hoạt động, được tính vào thống kê |
| Nghỉ phép | Tạm nghỉ, vẫn trong danh sách |
| Nghỉ việc | Đã nghỉ, không tính vào thống kê |

### Lịch sử đổi xe

Khi gán tài xế sang xe khác, hệ thống ghi lại lịch sử thay đổi để truy vết.
Xem tại trang chi tiết phương tiện.

---

## 5. Quản lý phương tiện

**Quản lý phương tiện**

Thông tin mỗi xe: biển số, mã xe, loại, nhãn hiệu, năm sản xuất, tải trọng, tài
xế phụ trách, trạm, tình trạng, hạn đăng kiểm, hạn bảo hiểm, ghi chú.

### Tình trạng xe

| Tình trạng | Ý nghĩa |
|---|---|
| Đang hoạt động | Chạy bình thường |
| Đang sửa chữa | Nằm xưởng |
| Đang bảo dưỡng | Bảo dưỡng định kỳ |
| Tạm ngưng | Không huy động |
| Ngừng sử dụng | Thanh lý / loại khỏi đội |

Biểu đồ tròn trên dashboard phản ánh tỷ lệ các tình trạng này.

### Xuất Excel

Nút **Xuất Excel** tạo file có đầy đủ cột, kèm hạn đăng kiểm và bảo hiểm gần nhất
lấy từ hồ sơ giấy tờ.

---

## 6. Đăng kiểm – Bảo hiểm

**Đăng kiểm – Bảo hiểm**

Quản lý hồ sơ giấy tờ của phương tiện:

- Đăng kiểm
- Bảo hiểm TNDS (trách nhiệm dân sự bắt buộc)
- Bảo hiểm vật chất
- Phù hiệu vận tải
- Giấy tờ khác

### Cảnh báo hết hạn

Hệ thống tự tính số ngày còn lại và phân loại:

| Mức | Hiển thị | Màu |
|---|---|---|
| Đã hết hạn | Quá ngày | Đỏ |
| Còn ≤ 3 ngày | Khẩn cấp | Đỏ |
| Còn ≤ 7 ngày | Rất gấp | Cam |
| Còn ≤ 15 ngày | Gấp | Cam |
| Còn ≤ 30 ngày | Cần chuẩn bị | Cam |
| Còn hiệu lực | Bình thường | Xanh |
| Chưa cập nhật | Thiếu ngày hết hạn | Xám |

Bốn thẻ đầu trang đếm số lượng theo từng nhóm. Khung đỏ phía trên liệt kê các
giấy tờ **hết hạn hoặc còn ≤ 7 ngày** cần xử lý ngay.

### Thêm hồ sơ

Bấm **Thêm giấy tờ**, chọn xe, loại giấy tờ, số giấy tờ, ngày cấp, ngày hết hạn.

> Mỗi xe có thể có nhiều hồ sơ cùng loại (ví dụ đăng kiểm cũ và mới). Hệ thống
> hiển thị tất cả, sắp xếp theo ngày hết hạn gần nhất.

---

## 7. Giấy phép lái xe

**Giấy phép lái xe**

Quản lý GPLX của tài xế: hạng, số GPLX, ngày cấp, ngày hết hạn.

Cảnh báo hết hạn hoạt động giống module Đăng kiểm – Bảo hiểm. Khung đỏ đầu trang
liệt kê tài xế cần gia hạn gấp.

Hạng GPLX hỗ trợ: A1, A2, B1, B2, C, D, E, FC.

> **Lưu ý:** tài xế lái xe bồn bê tông thường cần hạng **C** trở lên. Hệ thống
> không tự kiểm tra điều kiện này — người quản lý đội xe cần đối chiếu thủ công.

---

## 8. AI Camera giám sát

**AI Camera giám sát**

Trang này quản lý camera và xem lịch sử nhận diện. Việc đọc luồng video và chạy
AI do **AI Camera Agent** thực hiện trên máy tính tại nhà máy (xem
`docs/AGENT.md`).

### Tab Danh sách camera

Mỗi dòng hiển thị: mã, tên, vị trí, trạm, trạng thái (Online/Offline), lần cuối
online, số vùng ROI.

| Nút | Chức năng |
|---|---|
| 👁 Mắt | Vẽ vùng nhận diện (ROI) |
| 📋 Copy | Xem RTSP URL đầy đủ để cấu hình agent |
| ✏ Bút | Sửa thông tin camera |
| 🗑 Thùng rác | Xóa camera |

### Vẽ vùng nhận diện

1. Bấm nút **mắt** ở dòng camera
2. Bấm vào khung hình để đặt các đỉnh đa giác (thường 4 điểm)
3. Đặt tên vùng, chọn chiều nhận diện
4. Bấm **Lưu vùng**

Vùng đã lưu hiển thị màu xanh, vùng đang vẽ hiển thị màu vàng nét đứt.

Toạ độ chuẩn hóa 0–1, áp dụng đúng ở mọi độ phân giải. Sau khi lưu, cần chép toạ
độ vào `config.yaml` của agent để agent áp dụng.

### Tab Lịch sử nhận diện

Bảng sự kiện gồm: thời gian, biển số, độ tin cậy OCR, loại xe, hướng, camera,
đối chiếu, ghi chú.

- **Đối chiếu "Thuộc danh sách công ty"** — biển số khớp xe trong hệ thống
- **Đối chiếu "Chưa xác định"** — xe lạ hoặc OCR không đọc được

Tìm kiếm theo biển số, lọc theo camera và trạng thái đối chiếu.

---

## 9. Thông báo Telegram

**Thông báo Telegram**

### Cấu hình lần đầu

1. Mở Telegram, chat với **@BotFather**
2. Gõ `/newbot`, đặt tên bot, nhận **Bot Token**
3. Thêm bot vào nhóm Telegram của công ty, cấp quyền gửi tin nhắn
4. Lấy **Chat ID** nhóm (dùng @userinfobot hoặc gọi `getUpdates`)
5. Dán token và Chat ID vào trang cấu hình
6. Bật công tắc **Đang bật**
7. Bấm **Lưu cấu hình**, rồi **Gửi tin nhắn thử**

### Loại thông báo

| Loại | Khi nào gửi |
|---|---|
| Báo cáo sản xuất | Báo cáo được gửi Ban Giám đốc |
| Xe vào vùng nhận diện | Camera phát hiện xe thuộc công ty |
| Biển số chưa xác định | Xe lạ hoặc OCR không khớp |
| Camera mất kết nối | Agent báo camera offline |
| Giấy tờ sắp hết hạn | Đăng kiểm, bảo hiểm, GPLX đến hạn |
| Tổng hợp cuối ngày | Sản lượng, chuyến, sự kiện trong ngày |

Mỗi loại có công tắc riêng. Tắt những loại không cần để tránh nhiễu nhóm.

### Định dạng tin nhắn phát hiện xe

```
🚨 TSG-TNT — PHÁT HIỆN PHƯƠNG TIỆN

• Biển số: 51C-123.45
• Thời gian: 14:32:18
• Camera: Cổng nhà máy
• Trạng thái: Xe đã vào vùng nhận diện
• Đối chiếu: Xe thuộc danh sách công ty
• Độ tin cậy OCR: 93%
```

Với xe lạ: `• Biển số: Chưa xác định` và `• Đối chiếu: Chưa xác định được phương tiện`.

### Chống trùng

Trường **Chống trùng (giây)** — mặc định 120s. Cùng biển số trên cùng camera
trong khoảng này không gửi lại. Tăng lên nếu xe đứng lâu ở cổng gây nhiễu nhóm.

### Lịch sử gửi

Bảng cuối trang ghi mọi lần gửi: thời gian, loại, trạng thái (Thành công/Thất
bại), nội dung, lỗi. Dùng để kiểm tra khi nhóm không nhận được tin.

---

## 10. Quản lý người dùng

**Quản lý người dùng**

### Tab Tài khoản

Danh sách tài khoản: tên đăng nhập, họ tên, điện thoại, vai trò, trạng thái,
lần đăng nhập gần nhất.

- **Thêm người dùng** — nhập tên đăng nhập (chữ thường, số, dấu chấm/gạch),
  họ tên, vai trò, mật khẩu tối thiểu 8 ký tự
- **Sửa** — đổi họ tên, vai trò, khóa/mở tài khoản, đặt lại mật khẩu
- **Xóa** — xóa hẳn tài khoản

> Không thể tự xóa tài khoản đang đăng nhập, không thể tự hạ quyền mình khỏi
> Quản trị hệ thống, và hệ thống luôn giữ ít nhất một quản trị viên hoạt động.

### Tab Ma trận phân quyền

Bảng hiển thị quyền của 6 vai trò trên 8 phân hệ, chi tiết đến từng thao tác
(Xem / Thêm / Sửa / Xóa / Xuất).

| Vai trò | Phạm vi |
|---|---|
| **Quản trị hệ thống** | Toàn quyền mọi phân hệ |
| **Ban Giám đốc** | Xem + xuất báo cáo, dashboard, thống kê |
| **Kế toán** | Xem/thêm/sửa báo cáo sản xuất, xuất Excel |
| **Điều độ** | Quản lý tài xế, phương tiện, bảng tài |
| **Quản lý đội xe** | Hồ sơ đăng kiểm, bảo hiểm, GPLX |
| **Bảo vệ** | Camera giám sát, lịch sử xe vào/ra |

---

## 11. Nhật ký thao tác

**Nhật ký thao tác**

Ghi lại 300 thao tác gần nhất: thời gian, người dùng, hành động, phân hệ, chi
tiết, địa chỉ IP.

Các hành động được ghi: Tạo mới, Cập nhật, Xóa, Đăng nhập, Đăng nhập lỗi, Đăng
xuất, Xuất dữ liệu, Gửi.

Dùng để truy vết khi có sai lệch số liệu hoặc sự cố bảo mật. Ví dụ: ai đã sửa báo
cáo ngày 5/11, ai đã xuất danh sách tài xế, tài khoản nào đăng nhập lỗi nhiều lần.

---

## 12. Cài đặt hệ thống

**Cài đặt hệ thống**

### Thông tin công ty

Tên đầy đủ, tên viết tắt, mã số thuế, địa chỉ, điện thoại, email, người đại diện
pháp luật. Thông tin này hiển thị trên tiêu đề báo cáo khi in.

### Báo cáo sản xuất

- **Giờ tự động gửi báo cáo** — mặc định 17:00
- **Bật tự động gửi hằng ngày**
- **Ghi chú mẫu báo cáo** — hiển thị ở chân trang khi in

### Sao lưu dữ liệu

Bấm **Tải bản sao lưu** để xuất toàn bộ dữ liệu nghiệp vụ ra file JSON:

- Trạm, khách hàng
- Tài xế, phương tiện, giấy tờ
- Báo cáo sản xuất
- Camera, vùng ROI, sự kiện nhận diện
- Cài đặt hệ thống

File **không chứa** mật khẩu, token Telegram hay RTSP URL.

Bảng **Lịch sử sao lưu** ghi lại các lần xuất: tên file, dung lượng, trạng thái,
thời gian.

> Nên tải bản sao lưu **mỗi tuần** và lưu ở nơi khác (Google Drive, ổ ngoài).
> Với dữ liệu production trên Neon, bật thêm automatic backups của Neon.

---

## 13. Câu hỏi thường gặp

**Số liệu trên dashboard không khớp với báo cáo?**

Dashboard tính theo **khối lượng thực tế** của các báo cáo đã gửi và đã duyệt.
Bản nháp không được tính. Kiểm tra lại trạng thái báo cáo.

**Tôi sửa báo cáo nhưng không lưu được?**

Báo cáo ở trạng thái "Đã gửi" hoặc "Đã duyệt" không sửa được. Liên hệ quản trị
viên nếu cần điều chỉnh.

**Camera hiển thị Offline nhưng vẫn hoạt động?**

Agent gửi heartbeat mỗi 60 giây. Nếu agent dừng hoặc mất mạng, sau 30 giây không
có frame, camera chuyển Offline. Kiểm tra máy chạy agent.

**Nhóm Telegram không nhận được tin?**

Vào **Thông báo Telegram → Lịch sử gửi**, xem cột Lỗi. Nguyên nhân thường gặp:
bot bị xóa khỏi nhóm, Chat ID sai, token hết hiệu lực.

**Làm sao đổi mật khẩu?**

**Quản lý người dùng → sửa tài khoản của bạn → Mật khẩu mới**. Không thể tự đổi
vai trò của chính mình.

**Dữ liệu có đồng bộ giữa nhiều máy không?**

Có. Tất cả dữ liệu lưu trên PostgreSQL tập trung. Mở WebApp trên máy nào cũng
thấy cùng dữ liệu. Tải lại trang (F5) để lấy số liệu mới nhất.
