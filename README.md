# 📐 Math Hub & EduShare - Nền Tảng Học Liệu & Công Cụ Toán Học Toàn Diện

<p align="center">
  <img src="https://img.shields.io/badge/Trạng_thái-Hoạt_động_100%25-brightgreen?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/Phiên_bản-v2.5_Stable-blue?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/Nền_tảng-Web_%7C_PWA_%7C_Mobile-orange?style=for-the-badge" alt="Platform">
  <img src="https://img.shields.io/badge/Giấy_phép-MIT_License-green?style=for-the-badge" alt="License">
</p>

<p align="center">
  <b>Hệ sinh thái tích hợp công cụ dựng hình học trực quan, máy tính khoa học giả lập, ngân hàng đề thi và tài liệu Toán học từ cơ bản đến nâng cao.</b>
</p>

<p align="center">
  👉 <b>Cổng chính:</b> <a href="https://math.vn-ai.cloud/"><b>https://math.vn-ai.cloud/</b></a>
</p>

---

## 📌 Mục Lục

- [1. Bảng Điều Hướng & Đường Dẫn Trang Con](#-1-bảng-điều-hướng--đường-dẫn-trang-con)
- [2. Sơ Đồ Kiến Trúc Hệ Thống](#-2-sơ-đồ-kiến-trúc-hệ-thống)
- [3. Chi Tiết Từng Phân Hệ Chức Năng](#-3-chi-tiết-từng-phân-hệ-chức-năng)
  - [3.1. GeoChalk - Bảng Kỹ Thuật Tương Tác](#31-geochalk---bảng-kỹ-thuật-tương-tác)
  - [3.2. SMT - Giả Lập Máy Tính Cầm Tay PWA](#32-smt---giả-lập-máy-tính-cầm-tay-pwa)
  - [3.3. Hình Học Phẳng 2D](#33-hình-học-phẳng-2d)
  - [3.4. Tài Liệu & Sổ Tay Công Thức THPT](#34-tài-liệu--sổ-tay-công-thức-thpt)
  - [3.5. EduShare - Kho Học Liệu & Thảo Luận](#35-edushare---kho-học-liệu--thảo-luận)
- [4. Cấu Trúc Thư Mục Dự Án](#-4-cấu-trúc-thư-mục-dự-án)
- [5. Hướng Dẫn Cài Đặt & Triển Khai (Self-Host)](#-5-hướng-dẫn-cài-đặt--triển-khai-self-host)
- [6. Cấu Hình Biến Môi Trường (.env)](#-6-cấu-hình-biến-môi-trường-env)
- [7. Kế Hoạch Nâng Cấp (Roadmap)](#-7-kế-hoạch-nâng-cấp-roadmap)

---

## ⚡ 1. Bảng Điều Hướng & Đường Dẫn Trang Con

Toàn bộ các phân hệ đã được cấu hình và vận hành độc lập trên máy chủ đám mây:

| # | Phân Hệ / Công Cụ | Đường Dẫn Trực Tiếp | Mô Tả Chức Năng Chính | Công Nghệ Lõi |
| :-: | :--- | :--- | :--- | :--- |
| **0** | **🌐 Math Hub Portal** | [math.vn-ai.cloud](https://math.vn-ai.cloud/) | Cổng điều hướng tập trung vào tất cả các phân hệ Toán học | HTML5, CSS3, JS Vanilla |
| **1** | **🧊 GeoChalk (3D & 2D)** | [math.vn-ai.cloud/geochalk/geochalk.html](https://math.vn-ai.cloud/geochalk/geochalk.html) | Bảng vẽ kỹ thuật: Hình không gian $Oxyz$, Hình học phẳng, Khảo sát đồ thị, Đại số máy tính (CAS) | GeoGebra 5.0 Core, WebGL, LocalStorage AutoSave |
| **2** | **🔢 SMT Calculator** | [math.vn-ai.cloud/smt/index.html](https://math.vn-ai.cloud/smt/index.html) | Giả lập máy tính khoa học bỏ túi (Casio / Vinacal 680EX) đầy đủ tính năng giải PT, ma trận, số phức | PWA, JavaScript Canvas, MathEngine |
| **3** | **📐 Hình Học 2D** | [math.vn-ai.cloud/toan/hh2D.html](https://math.vn-ai.cloud/toan/hh2D.html) | Bảng vẽ minh họa định lý hình học phẳng nhanh, đo góc, diện tích và dựng tiếp tuyến | Canvas API, GeoGebra 2D Engine |
| **4** | **📖 Tài Liệu Tổng Hợp** | [math.vn-ai.cloud/toan/tailieutonghop.html](https://math.vn-ai.cloud/toan/tailieutonghop.html) | Tra cứu nhanh định lý, bảng công thức Toán THPT (Lớp 10, 11, 12), kho tệp PDF phân loại | Responsive Reader, PDF.js |
| **5** | **📚 EduShare Platform** | [edushare.vn-ai.cloud](https://edushare.vn-ai.cloud/) | Cổng lưu trữ tài liệu, ngân hàng đề thi thử, diễn đàn hỏi đáp và trao đổi học tập | Python FastAPI, SQLite, Cloud Drive API |

---

## 🏛️ 2. Sơ Đồ Kiến Trúc Hệ Thống

Hệ thống được thiết kế theo mô hình **Tách biệt Máy chủ Tĩnh (Static Server) & Máy chủ Dịch vụ Động (Dynamic API Backend)** giúp chịu tải cao và tối ưu độ trễ:

```text
                               ┌────────────────────────────────────────┐
                               │       Người Dùng (Browser / PWA)       │
                               └──────────────────┬─────────────────────┘
                                                  │
                                                  ▼
                        ┌─────────────────────────────────────────────────────┐
                        │             Reverse Proxy Nginx / SSL               │
                        │           (math.vn-ai.cloud & edushare)             │
                        └───────────────┬─────────────────────┬───────────────┘
                                        │                     │
                    [Tài nguyên Tĩnh]   │                     │   [Yêu cầu Động / API]
                                        ▼                     ▼
              ┌──────────────────────────────────┐   ┌──────────────────────────────────┐
              │     Server 1: Static Web Hub     │   │    Server 2: Dynamic Backend     │
              ├──────────────────────────────────┤   ├──────────────────────────────────┤
              │ • index.html (Portal)            │   │ • EduShare API (FastAPI - :5500) │
              │ • /smt/ (Giả lập Vinacal PWA)    │   │ • GeoChalk API (PHP-FPM SQLite)  │
              │ • /toan/ (hh2D.html, tài liệu)   │   │ • SQLite Database Engine         │
              │ • /geochalk/ (GeoGebra HTML5 JS) │   │ • Cloud Sync (Google / VNAI)     │
              └──────────────────────────────────┘   └──────────────────────────────────┘
```

---

## 🌟 3. Chi Tiết Từng Phân Hệ Chức Năng

### 3.1. 🧊 GeoChalk - Bảng Kỹ Thuật Tương Tác
- **Không gian 3D (`3D Geometry`)**: Dựng mặt phẳng $(Oxy)$, $(Oyz)$, $(Oxz)$, khối chóp, lăng trụ, mặt nón, mặt trụ, mặt cầu. Cho phép xoay tự do theo trục không gian 3 chiều với lưới tọa độ rõ nét.
- **Hình học phẳng (`2D Geometry`)**: Dựng hình học Euclid, đa giác đều, đường tròn nội/ngoại tiếp, giao điểm và các phép đối xứng, tịnh tiến, vị tự.
- **Khảo sát hàm số (`Graphing`)**: Khảo sát hàm số đa thức, phân thức, hàm lượng giác; tìm cực trị, điểm uốn, tiệm cận, tính diện tích hình phẳng giới hạn bởi tích phân.
- **Đại số máy tính (`CAS`)**: Giải phương trình vô tỉ, hệ phương trình, tính nguyên hàm, đạo hàm cấp cao và rút gọn biểu thức đại số dạng căn thức.
- **Điểm nổi bật độc quyền**:
  - Tông màu xanh bảng phấn chống mỏi mắt: `#13382c`, tương phản cao.
  - Tự động lưu tức thì (Realtime Auto-Save) qua LocalStorage.
  - Hoạt động 100% ngoại tuyến (Offline) ngay cả khi mất kết nối mạng.

### 3.2. 🔢 SMT - Giả Lập Máy Tính Cầm Tay PWA
- Tái hiện chính xác giao diện và thuật toán của máy tính khoa học thế hệ mới (Vinacal 680EX / Casio fx-580VN X).
- Giải phương trình bậc 2, 3, 4; hệ phương trình lên đến 4 ẩn.
- Ma trận cấp 4x4, tính định thức $\det(A)$, ma trận nghịch đảo $A^{-1}$.
- Tính toán số phức (dạng đại số và lượng giác), phân phối thống kê, vector không gian.
- Chuẩn PWA: Có thể cài đặt trực tiếp lên màn hình chính của điện thoại iPhone/Android như một ứng dụng gốc.

### 3.3. 📐 Hình Học Phẳng 2D
- Bảng công cụ tinh gọn phục vụ giảng dạy nhanh bài học trên lớp.
- Thao tác kéo thả mượt mà, hỗ trợ xuất hình ảnh độ phân giải cao phục vụ chèn đề thi vào Word/LaTeX.

### 3.4. 📖 Tài Liệu & Sổ Tay Công Thức THPT
- Sổ tay phân loại theo từng lớp (Lớp 10, Lớp 11, Lớp 12).
- Bao quát toàn bộ: Lượng giác, Đạo hàm, Tích phân, Mũ - Logarit, Số phức, Hình học thuần túy và Phương pháp tọa độ trong không gian $Oxyz$.
- Tích hợp bộ đọc tài liệu trực tuyến không cần tải file về máy.

### 3.5. 📚 EduShare - Kho Học Liệu & Thảo Luận
- Quản lý và chia sẻ đề thi giữa kỳ, cuối kỳ, đề thi thử tốt nghiệp THPT Quốc gia có lời giải chi tiết.
- Hệ thống diễn đàn mở cho phép học sinh đặt câu hỏi và giáo viên giải đáp.
- Hỗ trợ xem trước tài liệu đa định dạng (PDF, DOCX, Hình ảnh).

---

## 📂 4. Cấu Trúc Thư Mục Dự Án

```bash
svmath/
├── README.md                          # Tài liệu hướng dẫn dự án
├── .gitignore                         # Danh sách file và thư mục loại trừ
│
├── Tỉnh/server_math/                  # PHÂN HỆ TĨNH & CÔNG CỤ TOÁN
│   ├── index.html                     # Trang chủ điều hướng chính (Portal)
│   ├── export_static_bundle.py        # Script tự động xuất gói web tĩnh (dist)
│   ├── docker-compose-backend.yml     # Docker compose triển khai backend
│   ├── HUONG_DAN_TACH_SERVER.md       # Tài liệu chi tiết phân bổ Server
│   │
│   ├── geochalk/                      # Phân hệ GeoChalk
│   │   ├── geochalk.html              # Bảng vẽ kỹ thuật chính
│   │   ├── api.php                    # Backend API PHP lưu bài vẽ
│   │   └── GeoChalk/                  # Thư viện lõi GeoGebra 5.0 (HTML5, JS, CSS)
│   │
│   ├── smt/                           # Phân hệ máy tính giả lập
│   │   └── index.html                 # Giao diện máy tính PWA
│   │
│   └── toan/                          # Phân hệ hình học & tài liệu
│       ├── hh2D.html                  # Bảng vẽ 2D
│       └── tailieutonghop.html        # Trang tra cứu tài liệu & công thức
│
└── Động/share_tailieu/                # PHÂN HỆ ĐỘNG EDUSHARE
    ├── server.py                      # FastAPI App (Cổng dịch vụ 5500)
    ├── server.js                      # NodeJS Server (tuỳ chọn)
    ├── Dockerfile                     # Đóng gói Docker backend EduShare
    ├── docker-compose.yml             # Khởi chạy EduShare Container
    ├── requirements.txt               # Thư viện Python phụ thuộc
    ├── .env.example                   # Cấu hình mẫu biến môi trường
    └── uploads/                       # Thư mục lưu trữ tài liệu tải lên
```

---

## 🚀 5. Hướng Dẫn Cài Đặt & Triển Khai (Self-Host)

### Yêu Cầu Môi Trường
- **Hệ điều hành**: Linux Ubuntu 20.04/22.04 LTS hoặc Windows Server
- **Web Server**: Nginx
- **Ngôn ngữ**: Python 3.10+, PHP 8.1+ (kèm `php-fpm`, `php-sqlite3`), Node.js 18+ (tùy chọn)

### Bước 1: Clone kho mã nguồn

```bash
git clone https://github.com/hohau0405ff/math.git
cd math
```

### Bước 2: Triển khai Backend EduShare (Python FastAPI)

```bash
cd "Động/share_tailieu"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Chỉnh sửa cấu hình trong file .env
uvicorn server:app --host 0.0.0.0 --port 5500 --reload
```

### Bước 3: Cấu hình Nginx Web Tĩnh & Reverse Proxy

Mẫu cấu hình Nginx cơ bản (`/etc/nginx/sites-available/math-hub.conf`):

```nginx
server {
    listen 80;
    server_name math.vn-ai.cloud;
    root /var/www/server_math;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cấu hình GeoChalk PHP Backend
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
    }

    # Proxy tới EduShare API
    location /api/edushare/ {
        proxy_pass http://127.0.0.1:5500/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Kích hoạt cấu hình và tải lại Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/math-hub.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 6. Cấu Hình Biến Môi Trường (.env)

Tạo file `.env` bên trong thư mục `Động/share_tailieu/` dựa theo mẫu:

```ini
# Cổng dịch vụ
PORT=5500

# Cấu hình SMTP gửi thông báo (Tùy chọn)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Cấu hình Lưu Trữ Đám Mây Cloud Drive
VNAI_DRIVE_BASE_URL=https://drive.vn-ai.cloud/api
VNAI_DRIVE_API_NAME=api_edu_share
VNAI_DRIVE_API_KEY=your_secret_api_key
FILE_RETENTION_DAYS=60

# Đường dẫn GeoChalk
GEOCHALK_URL=https://math.vn-ai.cloud/geochalk/geochalk.html
```

> **Lưu ý bảo mật:** Tuyệt đối không commit file `.env` thực tế chứa mật khẩu hoặc API Key lên kho GitHub công khai.

---

## 🗺️ 7. Kế Hoạch Nâng Cấp (Roadmap)

- [x] Tích hợp bộ công cụ GeoChalk bảng kỹ thuật 4 trong 1.
- [x] Tối ưu hóa bộ nhớ đệm LocalStorage tự động lưu bài vẽ.
- [x] Đồng bộ phân hệ máy tính khoa học PWA hỗ trợ đa nền tảng.
- [ ] Tích hợp tính năng AI nhận diện đề toán qua hình ảnh (LaTeX OCR).
- [ ] Xuất file hình vẽ động 3D sang định dạng nhúng WebGL và tệp in 3D (.STL).
- [ ] Nâng cấp ngân hàng đề thi trắc nghiệm chấm điểm tự động trên EduShare.

---

## 👥 Đóng Góp & Tác Giả

- **Quản trị & Phát triển dự án**: [hohau0405ff](https://github.com/hohau0405ff)
- **Email liên hệ**: [hotrantrunghau951842@gmail.com](mailto:hotrantrunghau951842@gmail.com)
- **Đóng góp ý kiến**: Mọi đóng góp xin vui lòng gửi qua mục [Issues](https://github.com/hohau0405ff/math/issues) hoặc mở một [Pull Request](https://github.com/hohau0405ff/math/pulls).

---

<p align="center">
  <i>Được xây dựng với niềm đam mê Toán học và Công nghệ giáo dục.</i><br>
  © 2025 <b>Math Hub Community</b>. All rights reserved.
</p>
