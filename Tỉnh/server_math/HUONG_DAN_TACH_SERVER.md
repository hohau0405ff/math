# HƯỚNG DẪN PHÂN BỔ & TRIỂN KHAI TÁCH BIỆT WEB TĨNH VÀ WEB ĐỘNG

Tài liệu này hướng dẫn chi tiết cách tách toàn bộ hệ sinh thái **Math Hub** thành 2 máy chủ riêng biệt:
- **Server 1 (Web Tĩnh)**: Chứa toàn bộ giao diện HTML, CSS, JavaScript, WebAssembly, Fonts, hình ảnh, tài liệu PDF. Cực nhẹ, an toàn, có thể dùng Nginx tĩnh, Cloudflare Pages, Vercel, Netlify hoặc Hosting giá rẻ.
- **Server 2 (Web Động / Backend API)**: Chứa các dịch vụ Python FastAPI (EduShare IP: `192.168.1.240:5500`), PHP PDO SQLite (GeoChalk `geochalk/api.php`), CSDL SQLite và Redis Cache. (Lưu ý: GeoChalk chạy trực tiếp qua Nginx + PHP-FPM, không cần Docker).

---

## I. BẢNG PHÂN LOẠI TÀI NGUYÊN TĨNH VÀ ĐỘNG

| Thư mục / Thành phần | Phân loại | Vai trò & Công nghệ | Server đích |
| :--- | :---: | :--- | :--- |
| **`index.html`** | **TĨNH** | Cổng chính Math Hub điều hướng 5 công cụ | Server Web Tĩnh |
| **`smt/`** | **TĨNH** | Bộ giả lập máy tính khoa học Vinacal 680EX (PWA) | Server Web Tĩnh |
| **`toan/`** | **TĨNH** | Bảng hình học 2D/3D, tóm tắt công thức THPT, file PDF | Server Web Tĩnh |
| **`geochalk/GeoChalk/`** | **TĨNH** | Thư viện GeoGebra HTML5 (CSS, JS, Fonts, Web, Web3D) | Server Web Tĩnh |
| **`geochalk/geochalk*.html`** | **TĨNH** | Giao diện vẽ hình GeoChalk 3D, 2D, CAS, Đồ thị | Server Web Tĩnh |
| **`geochalk/api.php`** | **ĐỘNG** | API PHP PDO SQLite lưu trữ dự án và proxy auth EduShare | Nginx + PHP-FPM (Không Docker) |
| **`geochalk/data/geochalk.db`** | **ĐỘNG** | CSDL SQLite lưu trữ bản vẽ và dự án online | Thư mục `geochalk/data/` |
| **EduShare (Port 5500)** | **ĐỘNG** | Máy chủ xác thực & tài liệu (IP: `192.168.1.240:5500`) | Server EduShare |

---

## II. BƯỚC 1: XUẤT BẢN THƯ MỤC WEB TĨNH

Trong thư mục gốc của dự án, bạn chạy script:

```bash
python export_static_bundle.py
```

Script sẽ tự động tạo ra thư mục **`dist_web_static/`** với cấu trúc chuẩn hoá:
```
dist_web_static/
├── index.html                 (Cổng điều hướng Math Hub)
├── config.js                  (Cấu hình URL API Backend cho toàn bộ web)
├── nginx-static.conf          (File cấu hình Nginx mẫu cho server tĩnh)
├── smt/                       (Vinacal 680EX)
├── toan/                      (Hình học 2D, 3D, Tài liệu THPT)
└── geochalk/                  (Bảng kỹ thuật GeoChalk 3D/2D/CAS & GeoGebra HTML5)
```

---

## III. BƯỚC 2: CẤU HÌNH KẾT NỐI API TRÊN SERVER WEB TĨNH

Khi tải thư mục `dist_web_static/` lên Server Web Tĩnh riêng, bạn chỉ cần mở file:
👉 **`dist_web_static/config.js`** (hoặc `geochalk/config.js`)

Điền địa chỉ IP hoặc Domain của Server Web Động:

```javascript
window.MASTER_CONFIG = {
  // Điền domain hoặc IP:Port của Server EduShare:
  EDUSHARE_API_URL: 'http://192.168.1.240:5500',
  GEOCHALK_API_URL: '', // Để trống nếu chạy chung Nginx trên cùng domain
  GEOCHALK_AUTH_URL: 'http://192.168.1.240:5500/api/login'
};
```

*(Lưu ý: Nếu để trống `''`, hệ thống sẽ tự động gọi theo cùng domain của web tĩnh - áp dụng khi dùng chung domain qua Nginx Reverse Proxy).*

---

## IV. BƯỚC 3: TRIỂN KHAI SERVER WEB TĨNH (SERVER 1)

### Cách A: Dùng Nginx (Khuyên dùng cho VPS riêng)
1. Tải toàn bộ thư mục `dist_web_static/` lên thư mục `/var/www/dist_web_static` trên server tĩnh.
2. Dùng file mẫu `dist_web_static/nginx-static.conf` đặt vào `/etc/nginx/sites-available/math_static`.
3. Kích hoạt và tải lại Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/math_static /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```
4. Cấp chứng chỉ SSL HTTPS miễn phí:
   ```bash
   sudo certbot --nginx -d math.yourdomain.com
   ```

### Cách B: Dùng Cloudflare Pages / Vercel / Netlify (Miễn phí 100%)
- Kéo thả trực tiếp toàn bộ thư mục `dist_web_static/` lên dashboard của **Cloudflare Pages** hoặc **Vercel**.
- Hệ thống sẽ tự động phân phối qua CDN toàn cầu với tốc độ siêu nhanh.

---

## V. BƯỚC 4: TRIỂN KHAI SERVER WEB ĐỘNG / BACKEND (SERVER 2)

### 1. Dịch vụ EduShare (FastAPI + Redis) - Chạy bằng Docker Compose
EduShare được đóng gói độc lập, không làm ảnh hưởng đến mã nguồn của EduShare:
1. Sao chép thư mục `share_tailieu/` và file `docker-compose-backend.yml` lên server.
2. Khởi chạy:
   ```bash
   docker compose -f docker-compose-backend.yml up -d
   ```
3. Kiểm tra các dịch vụ đang chạy:
   - Redis: Port `6379`
   - EduShare FastAPI: Port `5500` (Kiểm tra tại `http://IP:5500/docs`)

### 2. Dịch vụ GeoChalk - Chạy Native Nginx + PHP-FPM Chung Server (HOÀN TOÀN KHÔNG DÙNG DOCKER)
GeoChalk đã được chuyển toàn bộ sang PHP + SQLite và chạy chung Nginx trên cùng domain/IP với Math Hub:
1. Cài đặt Nginx và PHP-FPM với module SQLite & cURL:
   ```bash
   sudo apt update
   sudo apt install -y nginx php-fpm php-sqlite3 php-curl
   ```
2. Đưa toàn bộ thư mục `server_math` (gồm `index.html`, `smt/`, `toan/`, `geochalk/`) vào `/var/www/server_math`:
   ```bash
   sudo mkdir -p /var/www/server_math
   sudo cp -r . /var/www/server_math/
   sudo chown -R www-data:www-data /var/www/server_math/geochalk/data
   sudo chmod -R 775 /var/www/server_math/geochalk/data
   ```
3. Kích hoạt file cấu hình Nginx chung `nginx-math-hub.conf`:
   ```bash
   sudo cp nginx-math-hub.conf /etc/nginx/sites-available/math_hub.conf
   sudo ln -s /etc/nginx/sites-available/math_hub.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```
4. Kiểm tra sức khỏe hệ thống:
   - Cổng Math Hub: `http://IP_HOAC_DOMAIN/`
   - Bảng vẽ GeoChalk: `http://IP_HOAC_DOMAIN/geochalk/`
   - API GeoChalk: `http://IP_HOAC_DOMAIN/geochalk/api/health` -> Trả về `{"status":"ok","db_ready":true,"auth_target":"http://192.168.1.240:5500/api/login"}`

---

## VI. CƠ CHẾ PROXY LẤY DỮ LIỆU TỪ SERVER 2 SANG SERVER 1 (CÙNG DOMAIN)

Khi người dùng mở web tại Server 1 (`https://math.vn-ai.cloud`), trình duyệt của người dùng chỉ giao tiếp với duy nhất Server 1. Server 1 sẽ chịu trách nhiệm lấy dữ liệu xác thực từ Server 2 (`192.168.1.240:5500`) thông qua 2 cơ chế phối hợp:

### 1. Cơ chế PHP Backend cURL Proxy (Tự động trong `api.php`):
- Trình duyệt gửi thông tin đăng nhập đến `https://math.vn-ai.cloud/geochalk/api.php?endpoint=/api/auth/login`.
- PHP trên Server 1 thực hiện cURL request bí mật đến Server 2 (`http://192.168.1.240:5500/api/login`, tự động thử thêm `https://edushare.vn-ai.cloud/api/login` nếu đang trên Cloud VPS).
- Trả kết quả đăng nhập thành công về cho trình duyệt. Trình duyệt hoàn toàn không bị lỗi CORS hay Mixed Content (HTTPS gọi HTTP nội bộ).

### 2. Cấu hình Nginx Proxy trên Server 1 (`math.vn-ai.cloud`):
Nếu muốn Nginx trên Server 1 chuyển tiếp trực tiếp sang Server 2 mà không cần qua PHP, thêm đoạn cấu hình sau vào block server trong `/etc/nginx/sites-available/...`:

```nginx
# Proxy trực tiếp yêu cầu đăng nhập từ Server 1 sang Server 2
location /geochalk/api/auth/login {
    proxy_pass http://192.168.1.240:5500/api/login;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Proxy tất cả API khác của GeoChalk vào PHP-FPM
location ^~ /geochalk/api/ {
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root/geochalk/api.php;
    fastcgi_param EDUSHARE_AUTH_URL "http://192.168.1.240:5500/api/login";
    fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
}
```

---

## VII. CƠ CHẾ BẢO MẬT VÀ CORS

- `geochalk/api.php` tự động proxy xác thực đến EduShare (`http://192.168.1.240:5500/api/login`) qua cURL mà không chạm vào mã nguồn của `share_tailieu`.
- Cấu hình mở **CORS** (`Access-Control-Allow-Origin: *`) giúp trình duyệt gọi API lưu bài vẽ trơn tru từ mọi nguồn.
