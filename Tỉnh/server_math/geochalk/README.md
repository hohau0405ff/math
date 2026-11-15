# GeoChalk - Bảng Kỹ Thuật (Hình Học Phẳng, 3D, Đồ Thị & CAS)

Toàn bộ ứng dụng web đã được tùy biến hoàn chỉnh thành **GeoChalk** với giao diện **Bảng Kỹ Thuật** (Technical Chalkboard) màu xanh chống lóa cao cấp, hoạt động 100% ngoại tuyến (offline) trên máy tính của bạn và tự động lưu mọi thao tác vào bộ nhớ đệm.

---

## 🎨 Điểm Tùy Biến Theo Yêu Cầu

1. **Thanh công cụ chỉ chừa lại 4 mục**:
   - 🧊 **Hình Học 3D** (`3d`): Không gian 3 chiều $(x, y, z)$, mặt phẳng $xOy$, khối đa diện, khối chóp, lăng trụ, mặt cầu, nón, trụ.
   - 📏 **Hình Học Phẳng** (`geometry`): Dựng hình học phẳng, tam giác, đường tròn, góc, khoảng cách, phép biến hình.
   - 📈 **Đồ Thị** (`graphing`): Khảo sát hàm số 2D, cực trị, giao điểm, nguyên hàm, tích phân.
   - 🔢 **Đại Số CAS** (`cas`): Tính toán đại số hình thức, giải phương trình, rút gọn biểu thức chính xác.

2. **Hệ thống Lưu Tự Động Vào Bộ Nhớ Đệm (LocalStorage Cache)**:
   - Khi bạn **vẽ thêm đối tượng, chỉnh sửa, di chuyển, thay đổi thiết lập hay xoay hình**, hệ thống sẽ **tự động lưu ngay lập tức vào bộ nhớ đệm (cache)** trên máy của bạn.
   - Khi tắt trình duyệt, tải lại trang (F5) hoặc chuyển đổi qua lại giữa các ứng dụng, toàn bộ hình vẽ và thiết lập của bạn sẽ được **tự động khôi phục nguyên vẹn 100%**.
   - Có tùy chọn **"Bảng vẽ mới"** và **"Mở danh sách bài vẽ"** trong menu 3 gạch để quản lý bài vẽ độc lập.

3. **Mặc định Luôn Có Lưới và Gắn Hệ Trục Tọa Độ Sẵn**:
   - **Hình học 3D**: Luôn gắn sẵn hệ trục tọa độ 3 chiều $Ox, Oy, Oz$ và bật sẵn lưới tọa độ trên mặt phẳng $xOy$ với màu xanh kẻ ô bảng kỹ thuật sáng rõ.
   - **Các chế độ 2D**: Luôn bật sẵn hệ trục tọa độ và lưới ô vuông kỹ thuật.

4. **Hộp thoại SWITCH CALCULATOR chỉ chừa lại 4 mục trên**:
   - Khi mở menu hoặc bấm chuyển máy tính bên trong app, danh sách lựa chọn chỉ hiển thị đúng 4 máy tính: **Hình học phẳng**, **Hình học 3D**, **Đồ thị**, và **Đại số CAS**.

5. **Toàn bộ thương hiệu đổi sang GeoChalk & Màu Bảng Kỹ Thuật**:
   - Tên hiển thị, thanh điều hướng, tiêu đề trang, biểu tượng, hộp thoại đều mang tên **GeoChalk**.
   - Màu nền bảng vẽ sở hữu mã màu xanh bảng kỹ thuật chuyên dụng: **`#13382c`** (dịu mắt, độ tương phản cao, chống lóa). Trục tọa độ màu trắng bạc (`#ffffff`).

---

## 🚀 Hướng Dẫn Chạy GeoChalk Với Nginx & PHP (Không Cần Docker)

### Cách 1: Chạy Chung Với Toàn Bộ Math Hub (Khuyên dùng)
GeoChalk chạy chung Nginx trên cùng domain/IP với toàn bộ hệ sinh thái qua file [nginx-math-hub.conf](../nginx-math-hub.conf):
1. Cài đặt Nginx, PHP-FPM và module SQLite:
   ```bash
   sudo apt update
   sudo apt install -y nginx php-fpm php-sqlite3 php-curl
   ```
2. Đưa toàn bộ dự án vào `/var/www/server_math`:
   ```bash
   sudo mkdir -p /var/www/server_math
   sudo cp -r . /var/www/server_math/
   sudo chown -R www-data:www-data /var/www/server_math/geochalk/data
   sudo chmod -R 775 /var/www/server_math/geochalk/data
   ```
3. Kích hoạt cấu hình Nginx mẫu:
   ```bash
   sudo cp nginx-math-hub.conf /etc/nginx/sites-available/math_hub.conf
   sudo ln -s /etc/nginx/sites-available/math_hub.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```
4. Truy cập trình duyệt: `http://IP_HOAC_DOMAIN/geochalk/`

### Cách 2: Chạy Nhanh Trên Windows (1-Click)
Nhấp đúp chuột vào file **`GeoChalk.bat`** (hoặc `run_php_server.bat`). Trình duyệt sẽ tự động mở trang web tại `http://localhost:8080/geochalk.html`.

### Cách 3: Chạy Bằng Lệnh PHP CLI Trực Tiếp
```bash
php -S 0.0.0.0:8080 api.php
```

---

## 💾 Kiến Trúc Backend PHP & Cơ Sở Dữ Liệu SQLite

1. **Backend API**: File `api.php` xử lý toàn bộ các thao tác lưu/mở/xóa bản vẽ và kết nối xác thực đăng nhập sang EduShare (`http://192.168.1.240:5500/api/login`).
2. **Cơ sở dữ liệu SQLite**: Lưu tự động tại `geochalk/data/geochalk.db` (bảng `projects`).
3. **Kết nối EduShare**: Xem chi tiết tại tài liệu [API_KET_NOI_EDUSHARE.md](API_KET_NOI_EDUSHARE.md).

---

## 📁 Danh Sách Trang Truy Cập Trực Tiếp

| Ứng Dụng | File Trực Tiếp | Mô Tả |
| :--- | :--- | :--- |
| **GeoChalk Trung Tâm** | [`geochalk.html`](file:///d:/hinhhoc3d/geochalk.html) | Chứa thanh điều hướng chuyển đổi linh hoạt giữa 4 chế độ & quản lý bài vẽ |
| **Hình Học 3D** | [`geochalk-3d.html`](file:///d:/hinhhoc3d/geochalk-3d.html) | Toàn màn hình chế độ hình học không gian 3D |
| **Hình Học Phẳng** | [`geochalk-geometry.html`](file:///d:/hinhhoc3d/geochalk-geometry.html) | Toàn màn hình chế độ dựng hình học phẳng |
| **Máy Tính Đồ Thị** | [`geochalk-graphing.html`](file:///d:/hinhhoc3d/geochalk-graphing.html) | Toàn màn hình chế độ khảo sát đồ thị hàm số |
| **Đại Số CAS** | [`geochalk-cas.html`](file:///d:/hinhhoc3d/geochalk-cas.html) | Toàn màn hình chế độ máy tính đại số hình thức CAS |
