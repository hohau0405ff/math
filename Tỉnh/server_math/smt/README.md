# VINACAL 680EX PLUS III - Web App Source Code

Toàn bộ mã nguồn và tài nguyên tĩnh của ứng dụng web [VINACAL 680EX PLUS III](https://vinacalapp.pages.dev/).

> **Ghi chú cập nhật:** Đã lược bỏ hoàn toàn màn hình đăng nhập, form tạo tài khoản/quên mật khẩu, thông tin tài khoản và nút đăng xuất. Ứng dụng khởi động trực tiếp vào máy tính khoa học và hoạt động 100% offline mà không cần tài khoản hay kết nối mạng.

## Cấu trúc thư mục

```
smt/
├── index.html                      # Trang HTML chính của ứng dụng
├── manifest.webmanifest            # Cấu hình PWA (Progressive Web App)
├── sw.js                           # Service Worker phục vụ chế độ offline
├── logo.png                        # Favicon / Logo chính
├── css/
│   └── vinacal.82ce4eb71c.css      # CSS styling & bố cục máy tính
├── js/
│   └── vinacal.e8a0240a55.js       # Toàn bộ logic mô phỏng máy tính khoa học VINACAL
├── icons/
│   ├── apple-touch-icon.png
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-192.png
│   └── icon-maskable-512.png
└── assets/
    ├── vinacal-logo.png
    ├── vinacal-sticker.webp
    └── fonts/                      # Bộ font LCD và ký tự toán học
        ├── unifont-vinacal.woff2
        ├── vinacal-lcd.woff
        ├── vinacal-lcd-italic.woff
        ├── vinacal-lcd-small.woff
        ├── vinacal-lcd-small-italic.woff
        ├── vinacal-lcd-tiny.woff
        └── vinacal-lcd-tiny-italic.woff
```

## Cách chạy trên máy cục bộ (Localhost)

Bạn có thể chạy ứng dụng bằng bất kỳ web server tĩnh nào:

### 1. Dùng Python:
```bash
python -m http.server 8000
```
Sau đó truy cập: [http://localhost:8000](http://localhost:8000)

### 2. Dùng Node.js (npx serve / http-server):
```bash
npx serve .
```

### 3. Dùng Live Server (VS Code extension):
Mở thư mục trong VS Code và nhấn **Go Live** ở góc dưới phải.
