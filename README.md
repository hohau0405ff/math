# 📐 Math Hub & EduShare - Hệ Sinh Thái Học Liệu & Công Cụ Toán Học Toàn Diện

<p align="center">
  <img src="https://img.shields.io/badge/Trạng_thái-Hoạt_động_100%25-brightgreen?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/Phiên_bản-v2.6_Stable-blue?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/Nền_tảng-Web_%7C_PWA_%7C_Docker-orange?style=for-the-badge" alt="Platform">
  <img src="https://img.shields.io/badge/Bảo_mật-PBKDF2_HMAC_SHA256-darkgreen?style=for-the-badge" alt="Security">
</p>

<p align="center">
  <b>Nền tảng tích hợp công cụ dựng hình học tương tác, máy tính khoa học giả lập PWA, ngân hàng đề thi và kho học liệu Toán học từ cơ bản đến nâng cao.</b>
</p>

<p align="center">
  👉 <b>Cổng chính Math Hub:</b> <a href="https://math.vn-ai.cloud/"><b>https://math.vn-ai.cloud/</b></a> &nbsp;|&nbsp; 👉 <b>Nền tảng EduShare:</b> <a href="https://edushare.vn-ai.cloud/"><b>https://edushare.vn-ai.cloud/</b></a>
</p>

---

## 📌 Mục Lục

- [1. Giới Thiệu Dự Án](#-1-giới-thiệu-dự-án)
- [2. Tính Năng Chính](#-2-tính-năng-chính)
  - [2.1. Math Hub Portal](#21-math-hub-portal)
  - [2.2. GeoChalk - Bảng Kỹ Thuật Tương Tác (3D, 2D, CAS, Graphing)](#22-geochalk---bảng-kỹ-thuật-tương-tác-3d-2d-cas-graphing)
  - [2.3. SMT Calculator - Giả Lập Máy Tính Khoa Học PWA](#23-smt-calculator---giả-lập-máy-tính-khoa-học-pwa)
  - [2.4. EduShare - Kho Học Liệu, Đề Thi & Diễn Đàn Học Tập](#24-edushare---kho-học-liệu-đề-thi--diễn-đàn-học-tập)
  - [2.5. Phòng Học & Trò Chuyện Trực Tuyến Thời Gian Thực](#25-phòng-học--trò-chuyện-trực-tuyến-thời-gian-thực)
- [3. Công Nghệ Sử Dụng (Tech Stack) & Kiến Trúc](#-3-công-nghệ-sử-dụng-tech-stack--kiến-trúc)
- [4. Cấu Trúc Thư Mục Dự Án](#-4-cấu-trúc-thư-mục-dự-án)
- [5. Tính Năng Bảo Mật Hiện Có (Security Features)](#-5-tính-năng-bảo-mật-hiện-có-security-features)
- [6. Hướng Dẫn Cài Đặt & Khởi Chạy](#-6-hướng-dẫn-cài-đặt--khởi-chạy)
  - [6.1. Triển khai bằng Docker Compose (Khuyến nghị)](#61-triển-khai-bằng-docker-compose-khuyến-nghị)
  - [6.2. Triển khai thủ công (Manual Setup)](#62-triển-khai-thủ-công-manual-setup)
  - [6.3. Cấu hình Nginx Reverse Proxy](#63-cấu-hình-nginx-reverse-proxy)
- [7. Biến Môi Trường (.env)](#-7-biến-môi-trường-env)
- [8. Thông Tin Tác Giả & Đóng Góp](#-8-thông-tin-tác-giả--đóng-góp)

---

## 🌐 1. Giới Thiệu Dự Án

**Math Hub & EduShare** là hệ sinh thái giáo dục số toàn diện, kết hợp chặt chẽ giữa các công cụ tính toán, vẽ hình trực quan và nền tảng cộng đồng chia sẻ tri thức:
- **Math Hub**: Đóng vai trò là cổng công cụ tương tác, cung cấp bộ bảng vẽ hình học không gian 3D, hình học phẳng 2D, đồ thị hàm số, đại số máy tính (CAS) và máy tính khoa học PWA hoạt động mượt mà trên cả máy tính lẫn thiết bị di động.
- **EduShare**: Là trung tâm cộng tác học tập, cho phép học sinh và giáo viên chia sẻ đề thi, tài liệu ôn luyện theo từng khối lớp (Lớp 10, 11, 12, Luyện thi THPT Quốc gia), trao đổi thảo luận qua diễn đàn và phòng học trực tuyến thời gian thực.

---

## ⚡ 2. Tính Năng Chính

### 2.1. Math Hub Portal
- Giao diện điều hướng tập trung, kết nối nhanh chóng đến các phân hệ công cụ và học liệu.
- Thiết kế hiện đại, hỗ trợ Responsive hoàn hảo trên máy tính để bàn, máy tính bảng và điện thoại di động.

### 2.2. GeoChalk - Bảng Kỹ Thuật Tương Tác (3D, 2D, CAS, Graphing)
- **Hình Không Gian 3D ($Oxyz$):** Dựng mặt phẳng tọa độ, đa diện, hình nón, trụ, cầu, góc và khoảng cách trong không gian 3 chiều với khả năng xoay tự do và đổ bóng thực tế.
- **Hình Học Phẳng 2D:** Dựng hình học Euclid, đường tròn nội/ngoại tiếp, giao điểm, phép biến hình (đối xứng, vị tự, tịnh tiến).
- **Khảo Sát Đồ Thị (Graphing):** Vẽ đồ thị đa thức, hàm hữu tỉ, lượng giác, xác định cực trị, điểm uốn và tính diện tích hình phẳng tích phân.
- **Đại Số Máy Tính (CAS):** Giải phương trình, hệ phương trình, tính đạo hàm, nguyên hàm, tích phân và rút gọn biểu thức tượng trưng.
- **Tính năng mở rộng:** Tự động lưu bản vẽ vào LocalStorage và lưu trữ dự án lên máy chủ đám mây, tích hợp đăng nhập đồng bộ từ EduShare.

### 2.3. SMT Calculator - Giả Lập Máy Tính Khoa Học PWA
- Tái lập đầy đủ các thuật toán và bố cục của các dòng máy tính cầm tay tiên tiến (Casio fx-580VN X / Vinacal 680EX).
- Hỗ trợ giải phương trình bậc 4, hệ 4 ẩn, ma trận cấp $4 \times 4$, số phức, phân phối xác suất thống kê và vector không gian.
- Chuẩn Progressive Web App (PWA): Hỗ trợ cài đặt trực tiếp về màn hình chính thiết bị và vận hành ngoại tuyến (Offline Mode).

### 2.4. EduShare - Kho Học Liệu, Đề Thi & Diễn Đàn Học Tập
- **Kho Tài Liệu Đa Dạng:** Phân loại theo khối lớp, chuyên đề toán học và năm học với bộ lọc tìm kiếm thông minh.
- **Trình Đọc Tài Liệu Trực Tuyến:** Tích hợp bộ xem trước tài liệu đa định dạng (PDF, DOCX, Hình ảnh) trực tiếp trên trình duyệt.
- **Đồng Bộ Đám Mây:** Kết nối linh hoạt với Google Drive và Cloud Drive API để sao lưu và chia sẻ file dung lượng lớn.
- **Hệ Thống Diễn Đàn:** Tạo bài viết, bình luận, tương tác hỏi đáp giữa giáo viên và học sinh.

### 2.5. Phòng Học & Trò Chuyện Trực Tuyến Thời Gian Thực
- Nhóm học tập theo chuyên đề với khả năng thảo luận qua WebSocket tốc độ cao.
- Trò chuyện trực tiếp 1-1 và trò chuyện nhóm, hỗ trợ gửi tệp đính kèm học tập, hình ảnh và công thức Toán học.

---

## 🛠️ 3. Công Nghệ Sử Dụng (Tech Stack) & Kiến Trúc

### Sơ Đồ Kiến Trúc Hệ Thống:
```text
                          ┌────────────────────────────────────┐
                          │     Người Dùng (Web / PWA / App)   │
                          └─────────────────┬──────────────────┘
                                            │ HTTPS / WSS
                                            ▼
                  ┌──────────────────────────────────────────────────┐
                  │            Nginx Reverse Proxy & SSL             │
                  │        (math.vn-ai.cloud & edushare)             │
                  └─────────────┬──────────────────────┬─────────────┘
                                │                      │
                 [Static Files] │                      │ [API / WebSocket]
                                ▼                      ▼
             ┌─────────────────────────────┐   ┌─────────────────────────────┐
             │    Static Web Server Hub    │   │  EduShare FastAPI Service   │
             │                             │   │                             │
             │ • Portal (index.html)       │   │ • RESTful API (Python 3.10) │
             │ • SMT Calculator (PWA)      │   │ • WebSocket Manager         │
             │ • GeoChalk Suite (WebGL)    │   │ • SQLAlchemy 2.0 ORM        │
             │ • PHP-FPM GeoChalk Backend  │   │ • SQLite Database Engine    │
             │ • Responsive PDF Reader     │   │ • Redis 7 Cache & Session   │
             └─────────────────────────────┘   └─────────────────────────────┘
```

### Chi Tiết Công Nghệ:
- **Backend API:** Python 3.10+, FastAPI (Asynchronous Web Framework), Uvicorn ASGI Server, Pydantic v2.
- **Backend PHP:** PHP 8.1+ FPM phục vụ lưu trữ bản vẽ GeoChalk.
- **Cơ Sở Dữ Liệu:** SQLite với cơ chế WAL (Write-Ahead Logging), SQLAlchemy 2.0 ORM đảm bảo toàn vẹn dữ liệu.
- **Bộ Nhớ Đệm & Quản Lý Phiên:** Redis 7 (hỗ trợ tự động fallback sang In-Memory Cache an toàn).
- **Frontend:** Vanilla JavaScript hiện đại (ES6+), HTML5 Canvas, WebGL, GeoGebra Web Core 5.0, FontAwesome 6.
- **Container & Triển Khai:** Docker, Docker Compose, Nginx Reverse Proxy.

---

## 📂 4. Cấu Trúc Thư Mục Dự Án

```bash
svmath/
├── README.md                          # Tài liệu kỹ thuật dự án
├── .gitignore                         # Danh sách file bỏ qua khi đồng bộ Git
│
├── Tỉnh/server_math/                  # PHÂN HỆ TĨNH & CÔNG CỤ TOÁN HỌC
│   ├── index.html                     # Trang chủ điều hướng trung tâm (Portal)
│   ├── export_static_bundle.py        # Kịch bản đóng gói phân phối web tĩnh
│   ├── nginx-math-hub.conf            # Cấu hình Nginx máy chủ Math Hub
│   ├── nginx-backend.conf             # Cấu hình Nginx máy chủ dịch vụ backend
│   ├── docker-compose-backend.yml     # Docker Compose cho dịch vụ tĩnh & PHP
│   │
│   ├── geochalk/                      # Ứng dụng bảng vẽ kỹ thuật GeoChalk
│   │   ├── geochalk.html              # Giao diện chính bảng vẽ
│   │   ├── api.php                    # API lưu trữ và quản lý bản vẽ
│   │   └── GeoChalk/                  # Lõi GeoGebra 5.0 (HTML5, JS, CSS)
│   │
│   ├── smt/                           # Ứng dụng máy tính khoa học PWA
│   │   ├── index.html                 # Giao diện máy tính
│   │   └── manifest.json              # Khai báo cấu hình PWA di động
│   │
│   └── toan/                          # Tài liệu & hình học 2D
│       ├── hh2D.html                  # Bảng vẽ hình học phẳng 2D
│       └── tailieutonghop.html        # Sổ tay công thức và tài liệu PDF
│
└── Động/share_tailieu/                # PHÂN HỆ ĐỘNG EDUSHARE
    ├── main.py                        # Ứng dụng lõi FastAPI (REST API & WebSocket)
    ├── vnai_drive.py                  # Module tích hợp Cloud Drive lưu trữ
    ├── app.js                         # Điều khiển logic giao diện EduShare SPA
    ├── index.html                     # Giao diện chính nền tảng EduShare
    ├── Dockerfile                     # Đóng gói Docker Container EduShare
    ├── docker-compose.yml             # Cấu hình khởi chạy EduShare & Redis
    ├── requirements.txt               # Danh mục thư viện Python phụ thuộc
    ├── .env.example                   # Biến môi trường mẫu
    └── uploads/                       # Thư mục lưu trữ tệp đính kèm cục bộ
```

---

## 🔒 5. Tính Năng Bảo Mật Hiện Có (Security Features)

Hệ thống được thiết kế với phương châm đảm bảo an toàn thông tin theo kiến trúc phòng thủ đa tầng (**Defense-in-Depth**), áp dụng các chuẩn mã hóa và bảo mật dữ liệu hiện đại:

1. **Chuẩn Băm Mật Khẩu PBKDF2-HMAC-SHA256:**
   - Hệ thống áp dụng khuyến nghị của NIST về an toàn mật khẩu: Sử dụng thuật toán `PBKDF2-HMAC-SHA256` với **100.000 vòng lặp** và Salt ngẫu nhiên 16 bytes sinh bằng bộ sinh số ngẫu nhiên an toàn mật mã (CSPRNG).
   - Kiểm tra mật khẩu bằng hàm so sánh thời gian cố định `hmac.compare_digest` nhằm loại bỏ hoàn toàn nguy cơ tấn công đo thời gian (Timing Attack / Side-Channel Attack).
   - Tích hợp cơ chế **Zero-Downtime Migration**: Tự động chuyển đổi và nâng cấp mật khẩu cũ sang chuẩn băm PBKDF2 ngay khi người dùng đăng nhập thành công.

2. **Cơ Chế Sinh Mã Xác Thực OTP An Toàn:**
   - Mã OTP 6 chữ số được sinh hoàn toàn ngẫu nhiên tại máy chủ bằng thư viện `secrets` an toàn mật mã (`secrets.randbelow`).
   - OTP được lưu trữ tập trung trên Redis Cache với thời gian hết hạn tự động (TTL) 10 phút và được truyền tải an toàn qua máy chủ gửi thư Gmail SMTP mã hóa SSL/TLS.

3. **Lớp Phòng Vệ File Tĩnh Đa Tầng (Multi-Layer File Protection):**
   - **Tầng Middleware:** `block_sensitive_files_middleware` chủ động kiểm tra và chặn ngay lập tức (trả về HTTP 404) mọi yêu cầu truy xuất tệp nhạy cảm có phần mở rộng như `.db`, `.sqlite`, `.env`, `.py`, `.yml`, `.sh`, `.git`.
   - **Tầng Ứng Dụng:** Sử dụng lớp kế thừa chuyên biệt `SecureStaticFiles` chỉ cho phép phục vụ các định dạng tệp tĩnh an toàn trong danh sách whitelist (`.html`, `.css`, `.js`, `.png`, `.jpg`, `.pdf`, v.v.).

4. **Phòng Ngừa Stored XSS Khi Tải Tệp:**
   - Hệ thống kiểm soát nghiêm ngặt loại MIME của tệp thông qua hàm `is_safe_for_inline()`.
   - Các định dạng tệp tiềm ẩn nguy cơ thực thi mã (HTML, SVG, XML, JS) được tự động ép buộc tải về dưới dạng tệp đính kèm (`Content-Disposition: attachment`) kèm theo tiêu đề bảo mật `X-Content-Type-Options: nosniff` để vô hiệu hóa tính năng MIME Sniffing của trình duyệt.

5. **Kiểm Soát Truy Cập CORS Theo Danh Sách Tin Cậy (Whitelist):**
   - Cấu hình CORS được thắt chặt, chỉ cho phép các tên miền chính thức trong hệ sinh thái (`https://edushare.vn-ai.cloud`, `https://math.vn-ai.cloud`, `http://localhost:5500`) truy cập tài nguyên API với đầy đủ thông tin xác thực (Credentials).

6. **Phòng Ngừa Tấn Công SQL Injection:**
   - 100% các thao tác truy vấn dữ liệu nghiệp vụ (người dùng, bài viết, phòng học, tin nhắn) đều được thực hiện qua **SQLAlchemy ORM** với cơ chế tham số hóa tự động (Parameterized Queries).

7. **Cách Ly Mạng Nội Bộ Redis:**
   - Dịch vụ Redis trong Docker Compose được ràng buộc chặt chẽ vào giao diện loopback `127.0.0.1:6379`, ngăn chặn mọi truy cập trái phép từ bên ngoài mạng Internet.

---

## 🚀 6. Hướng Dẫn Cài Đặt & Khởi Chạy

### Yêu Cầu Môi Trường
- **Hệ điều hành:** Linux (Ubuntu 20.04/22.04 LTS), macOS hoặc Windows 10/11
- **Docker & Docker Compose** (khuyến nghị cho môi trường Production)
- **Hoặc môi trường thủ công:** Python 3.10+, PHP 8.1+ (kèm `php-fpm`, `php-sqlite3`), Nginx

---

### 6.1. Triển khai bằng Docker Compose (Khuyến nghị)

Khởi chạy toàn bộ dịch vụ EduShare và Redis bằng Docker Compose:

```bash
cd "Động/share_tailieu"
docker compose up -d --build
```

Kiểm tra trạng thái các container:
```bash
docker compose ps
```

---

### 6.2. Triển khai thủ công (Manual Setup)

#### Bước 1: Khởi chạy Backend EduShare (FastAPI)
```bash
cd "Động/share_tailieu"
python -m venv venv

# Kích hoạt môi trường ảo (Linux/macOS)
source venv/bin/activate
# Hoặc trên Windows:
# .\venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env
# Chỉnh sửa thông tin trong file .env phù hợp

uvicorn main:app --host 0.0.0.0 --port 5500 --reload
```

#### Bước 2: Khởi chạy Dịch Vụ Web Tĩnh & GeoChalk (PHP)
Đảm bảo PHP-FPM đang hoạt động và trỏ thư mục gốc của Nginx vào `Tỉnh/server_math/`.

---

### 6.3. Cấu hình Nginx Reverse Proxy

Mẫu cấu hình tham khảo cho Nginx phục vụ Math Hub và chuyển tiếp API EduShare:

```nginx
server {
    listen 80;
    server_name math.vn-ai.cloud;
    root /var/www/svmath/Tỉnh/server_math;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Xử lý PHP cho ứng dụng GeoChalk
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
    }

    # Proxy tới dịch vụ Backend EduShare
    location /api/ {
        proxy_pass http://127.0.0.1:5500/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Proxy cho phòng học trực tuyến
    location /ws {
        proxy_pass http://127.0.0.1:5500/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

Kiểm tra và áp dụng cấu hình:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## ⚙️ 7. Biến Môi Trường (.env)

Tạo file `.env` tại thư mục `Động/share_tailieu/` với nội dung mẫu:

```ini
# Cấu hình cổng ứng dụng
PORT=5500

# Cấu hình kết nối Redis Cache
REDIS_URL=redis://127.0.0.1:6379/0

# Cấu hình gửi thư OTP (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Cấu hình Cloud Storage (Tùy chọn)
VNAI_DRIVE_BASE_URL=https://drive.vn-ai.cloud/api
VNAI_DRIVE_API_NAME=api_edu_share
VNAI_DRIVE_API_KEY=your_drive_api_key
FILE_RETENTION_DAYS=60

# Đường dẫn GeoChalk tương tác
GEOCHALK_URL=https://math.vn-ai.cloud/geochalk/geochalk.html
```

---

## 👥 8. Thông Tin Tác Giả & Đóng Góp

- **Quản trị & Phát triển dự án:** [hohau0405ff](https://github.com/hohau0405ff)
- **Email liên hệ:** [hotrantrunghau951842@gmail.com](mailto:hotrantrunghau951842@gmail.com)
- **Đóng góp phát triển:** Mọi đề xuất cải tiến hoặc đóng góp tính năng xin vui lòng gửi thông qua [Issues](https://github.com/hohau0405ff/math/issues) hoặc mở một [Pull Request](https://github.com/hohau0405ff/math/pulls).

---

<p align="center">
  <i>Được xây dựng vì mục tiêu nâng cao chất lượng giáo dục và kết nối cộng đồng Toán học Việt Nam.</i><br>
  © 2026 <b>Math Hub & EduShare Community</b>. All rights reserved.
</p>
