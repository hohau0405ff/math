# ĐẶC TẢ KỸ THUẬT: KẾT NỐI API GIỮA GEOCHALK (HÌNH HỌC) VÀ EDUSHARE

> **Mục đích tài liệu:**  
> Tài liệu này được biên soạn dành cho **Đội ngũ phát triển hệ thống EduShare (share_tailieu)**. Tài liệu nêu rõ các quy chuẩn kết nối, định dạng dữ liệu (Request/Response) và cơ chế xác thực mà phân hệ **Hình Học (GeoChalk PHP + SQLite)** sử dụng khi tích hợp với EduShare.
> 
> Nhờ bản đặc tả này, bên EduShare có thể tự do phát triển, nâng cấp API, bảo trì cơ sở dữ liệu tài khoản mà **hoàn toàn không cần can thiệp hay chỉnh sửa mã nguồn của nhau**.

---

## 1. TỔNG QUAN KIẾN TRÚC & NGUYÊN TẮC HOẠT ĐỘNG

- **GeoChalk (Hình Học):** Chạy độc lập bằng **PHP + SQLite (`geochalk.db`)**, chỉ quản lý dữ liệu bản vẽ (3D, 2D, CAS, Đồ thị). GeoChalk **không** lưu trữ mật khẩu hay quản lý bảng tài khoản riêng.
- **EduShare:** Giữ vai trò **Identity Provider (IdP)** trung tâm, quản lý tài khoản người dùng, mã hóa mật khẩu, xác thực OTP qua Gmail.
- **Mô hình kết nối:** Client GeoChalk gửi thông tin đăng nhập tới Backend PHP của GeoChalk (`geochalk/api.php`), PHP sẽ đóng vai trò **Proxy Client** gọi sang API của EduShare qua giao thức HTTP RESTful.

```
┌────────────────────────┐         ┌────────────────────────┐         ┌────────────────────────┐
│  Trình duyệt GeoChalk  │ ──────> │  GeoChalk Backend PHP  │ ──────> │   EduShare Backend     │
│   (Giao diện Bảng vẽ)  │ <────── │  (SQLite geochalk.db)  │ <────── │ (192.168.1.240:5500)   │
└────────────────────────┘         └────────────────────────┘         └────────────────────────┘
                                    - Lưu bài vẽ vào SQLite            - Quản lý tài khoản
                                    - Kiểm tra quyền sở hữu            - Xác thực mật khẩu, OTP
```

---

## 2. API ĐĂNG NHẬP HIỆN TẠI (LOGIN AUTHENTICATION)

Đây là API mà GeoChalk đang gọi sang EduShare để đăng nhập tài khoản.

### Endpoint:
- **Phương thức:** `POST`
- **Đường dẫn:** `/api/login` (Mặc định: `http://192.168.1.240:5500/api/login` hoặc domain của EduShare)
- **Content-Type:** `application/json`

### Request Body (Dữ liệu gửi từ GeoChalk):
```json
{
  "email": "user@gmail.com",
  "password": "mat_khau_nguoi_dung"
}
```

### Response thành công (HTTP Status: `200 OK`):
EduShare trả về thông tin người dùng. GeoChalk cần tối thiểu trường `id` (hoặc `userId`) và `email`:

```json
{
  "status": "success",
  "user": {
    "id": "usr_951842abcdef1234",
    "email": "user@gmail.com",
    "name": "Hồ Trần Trung Hậu",
    "role": "user",
    "isSystemAdmin": false,
    "roleTitle": "Thành viên học tập",
    "subInfo": "Lớp 12A1",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=user@gmail.com"
  }
}
```

> **Ghi chú dữ liệu:**
> - `user.id`: Khóa chính định danh duy nhất (String). GeoChalk dùng trường này làm `user_id` để phân quyền và lưu bài vẽ trong SQLite.
> - `user.email`: Dùng để hiển thị và đối soát.
> - `user.name`: Họ tên hiển thị trên thanh điều hướng của bảng vẽ.
> - `user.avatar`: Ảnh đại diện của người dùng.

### Response thất bại (HTTP Status: `401 Unauthorized` hoặc `400 Bad Request`):
Khi sai thông tin đăng nhập hoặc tài khoản bị khóa:

```json
{
  "detail": "Địa chỉ Gmail hoặc mật khẩu không chính xác."
}
```
*(GeoChalk chấp nhận thông báo lỗi nằm trong trường `detail` hoặc `message`).*

---

## 3. CÁCH CẤU HÌNH ĐỊA CHỈ API CỦA EDUSHARE

Phía GeoChalk được thiết kế để không bao giờ bị hardcode địa chỉ IP hay domain:

1. **Qua biến môi trường hệ thống (Environment Variable):**
   ```bash
   EDUSHARE_AUTH_URL=https://edushare.vn-ai.cloud/api/login
   ```
2. **Qua file cấu hình [hinhhoc/config.js](hinhhoc/config.js):**
   ```javascript
   window.EDUSHARE_AUTH_URL = 'https://edushare.vn-ai.cloud/api/login';
   ```
3. **Mặc định dự phòng:** Nếu không truyền, GeoChalk tự động kết nối sang `http://192.168.1.240:5500/api/login`.

---

## 4. ĐỀ XUẤT NÂNG CẤP DÀNH CHO TEAM EDUSHARE (NẾU MỞ RỘNG SAU NÀY)

Nếu bên EduShare muốn nâng cấp bảo mật hoặc bổ sung tính năng liên kết sâu giữa hai hệ thống, vui lòng tham khảo các phương án sau:

### Phương án A: Hỗ trợ Bearer Token (JWT)
Nếu EduShare chuyển từ xác thực session/mật khẩu sang JWT Token, EduShare chỉ cần bổ sung `access_token` vào response của `/api/login`:

```json
{
  "status": "success",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "usr_951842abcdef1234",
    "email": "user@gmail.com",
    "name": "Nguyễn Văn A"
  }
}
```

### Phương án B: Single Sign-On (Đăng nhập 1 chạm từ EduShare sang GeoChalk)
Người dùng đang lướt EduShare có thể bấm nút **"Mở Bảng Vẽ GeoChalk"** và tự động đăng nhập luôn mà không cần gõ lại mật khẩu:
1. EduShare sinh một `sso_token` ngắn hạn (thời hạn 60 giây).
2. EduShare mở link: `https://geochalk.yourdomain.com/?sso_token=XYZ123`.
3. Backend GeoChalk PHP sẽ gọi ngầm sang EduShare:
   `POST https://edushare.yourdomain.com/api/sso/verify` với body `{"token": "XYZ123"}`.
4. EduShare trả về thông tin `user` tương ứng.

### Phương án C: Đăng bài vẽ trực tiếp từ GeoChalk lên Nhóm học EduShare
Khi giáo viên hoặc học sinh vẽ xong hình 3D/2D trên GeoChalk, họ có thể bấm **"Chia sẻ vào Nhóm EduShare"**:
- GeoChalk gửi payload sang EduShare:
  ```json
  POST /api/rooms/{room_id}/messages
  {
    "user_id": "usr_...",
    "content": "Mình vừa hoàn thành bài vẽ lăng trụ tam giác đều:",
    "attachment": {
      "type": "geochalk_project",
      "project_id": "geochalk_prj_12345",
      "title": "Hình chóp S.ABC",
      "preview_url": "https://geochalk.yourdomain.com/?openProject=geochalk_prj_12345"
    }
  }
  ```

---

## 5. CÁCH KIỂM TRA (TEST) API LOGIN TỪ PHÍA BẠN

Bên EduShare có thể kiểm tra xem API của mình có tương thích chuẩn với GeoChalk hay không bằng lệnh cURL sau:

```bash
curl -X POST "http://192.168.1.240:5500/api/login" \
     -H "Content-Type: application/json" \
     -d '{"email": "hotrantrunghau951842@gmail.com", "password": "mat_khau_cua_ban"}'
```

Nếu kết quả trả về mã HTTP `200` kèm object `user` chứa `id` và `email`, hệ thống Hình Học (GeoChalk) sẽ tự động hoạt động mượt mà 100%.

---

## 6. BẢO MẬT & PHẠM VI TRÁCH NHIỆM

- **Phía GeoChalk:** Cam kết không lưu trữ mật khẩu plain-text vào database SQLite, chỉ chuyển tiếp qua kết nối bảo mật đến EduShare.
- **Phía EduShare:** Đảm bảo duy trì tính ổn định của trường `user.id` và `user.email` trong response API.
- Hai hệ thống hoạt động hoàn toàn độc lập, tách biệt source code, tách biệt database và có thể deploy trên hai cụm máy chủ khác nhau.
