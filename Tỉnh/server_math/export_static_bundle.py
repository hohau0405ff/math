#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
SCRIPT XUẤT BẢN TOÀN BỘ WEB TĨNH (STATIC WEB EXPORTER)
===============================================================================
Script này tự động gom toàn bộ các thành phần Web Tĩnh từ các thư mục:
- math/ (Math Hub & Vinacal SMT)
- toan/ (Hình học 2D, 3D & Tài liệu toán THPT)
- hinhhoc/ (Frontend GeoChalk 3D/2D/CAS & GeoGebra HTML5 core)
- share_tailieu/ (Frontend EduShare: index.html, app.js, style.css, config.js)

Tạo thành một thư mục hoàn chỉnh `dist_web_static/` sẵn sàng tải lên
bất kỳ máy chủ Web Tĩnh nào (Nginx, Apache, Cloudflare Pages, Vercel, Netlify,
GitHub Pages, VPS static hosting).
===============================================================================
"""

import os
import shutil
import sys

# Đảm bảo UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "dist_web_static")

print("=" * 70)
print("  BẮT ĐẦU ĐÓNG GÓI GIAO DIỆN WEB TĨNH (DIST_WEB_STATIC)")
print("=" * 70)

# 1. Tạo thư mục đích
if os.path.exists(OUTPUT_DIR):
    print(f"[*] Làm sạch thư mục cũ: {OUTPUT_DIR}")
    shutil.rmtree(OUTPUT_DIR)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 2. Sao chép Cổng Math Hub (index.html -> dist_web_static/index.html)
print("[*] 1/5 Sao chép Cổng Math Hub (index.html -> dist_web_static/index.html)...")
src_index = os.path.join(BASE_DIR, "index.html")
if not os.path.exists(src_index):
    src_index = os.path.join(BASE_DIR, "math", "index.html")
shutil.copy2(src_index, os.path.join(OUTPUT_DIR, "index.html"))

# 3. Sao chép bộ giả lập Vinacal (smt/)
print("[*] 2/5 Sao chép Máy tính Vinacal 680EX (smt/ -> dist_web_static/smt/)...")
src_smt = os.path.join(BASE_DIR, "smt")
if not os.path.exists(src_smt):
    src_smt = os.path.join(BASE_DIR, "math", "smt")
shutil.copytree(
    src_smt,
    os.path.join(OUTPUT_DIR, "smt"),
    dirs_exist_ok=True,
    ignore=shutil.ignore_patterns(".claude", ".git*", "__pycache__")
)

# 4. Sao chép Thư mục Toán (toan/)
print("[*] 3/5 Sao chép Hình học 2D & Tài liệu toán THPT (toan/ -> dist_web_static/toan/)...")
shutil.copytree(
    os.path.join(BASE_DIR, "toan"),
    os.path.join(OUTPUT_DIR, "toan"),
    dirs_exist_ok=True,
    ignore=shutil.ignore_patterns(".claude", ".agents", ".git*", "__pycache__", "build_html.py")
)

# 5. Sao chép Frontend Hình học (geochalk/)
print("[*] 4/5 Sao chép Frontend GeoChalk (geochalk/ -> dist_web_static/geochalk/)...")
dest_geochalk = os.path.join(OUTPUT_DIR, "geochalk")
os.makedirs(dest_geochalk, exist_ok=True)

# Sao chép thư mục GeoChalk HTML5
shutil.copytree(
    os.path.join(BASE_DIR, "geochalk", "GeoChalk"),
    os.path.join(dest_geochalk, "GeoChalk"),
    dirs_exist_ok=True
)

# Sao chép các file html, js, css, ico của geochalk (bỏ file backend)
geochalk_static_files = [
    "geochalk.html",
    "geochalk-3d.html",
    "geochalk-geometry.html",
    "geochalk-graphing.html",
    "geochalk-cas.html",
    "geochalk-3d-settings.js",
    "config.js",
    "favicon.ico"
]
for f in geochalk_static_files:
    src_f = os.path.join(BASE_DIR, "geochalk", f)
    if os.path.exists(src_f):
        shutil.copy2(src_f, os.path.join(dest_geochalk, f))

# 6. Sao chép Frontend EduShare (share_tailieu/ nếu có)
print("[*] 5/5 Kiểm tra Frontend EduShare...")
src_share = os.path.join(BASE_DIR, "share_tailieu")
if os.path.exists(src_share):
    dest_edushare = os.path.join(OUTPUT_DIR, "share_tailieu")
    os.makedirs(dest_edushare, exist_ok=True)
    for f in ["index.html", "app.js", "style.css", "config.js"]:
        src_f = os.path.join(src_share, f)
        if os.path.exists(src_f):
            shutil.copy2(src_f, os.path.join(dest_edushare, f))

# 7. Tạo file cấu hình tổng master config.js ở thư mục gốc của dist_web_static
print("[*] Tạo file cấu hình API master: dist_web_static/config.js...")
master_config_content = """/**
 * ==============================================================================
 * MATH HUB & ECOSYSTEM - MASTER API CONFIGURATION
 * ==============================================================================
 * Cấu hình địa chỉ máy chủ Web Động (Backend Server) cho toàn bộ hệ sinh thái:
 *
 * Khi bạn tải thư mục này lên Server Web Tĩnh riêng (ví dụ: Nginx, Cloudflare Pages, Vercel...):
 *
 * 1. BACKEND_EDUSHARE:
 *    Địa chỉ máy chủ FastAPI (chạy Python/Docker port 5500)
 *    Ví dụ: 'https://api-edushare.yourdomain.com' hoặc 'http://103.xxx.xxx.xxx:5500'
 *
 * 2. BACKEND_GEOCHALK:
 *    Địa chỉ máy chủ Node.js (chạy port 8080)
 *    Ví dụ: 'https://api-geochalk.yourdomain.com' hoặc 'http://103.xxx.xxx.xxx:8080'
 * ==============================================================================
 */
window.MASTER_CONFIG = {
  // Điền địa chỉ IP hoặc domain server Backend của bạn vào đây:
  EDUSHARE_API_URL: 'http://192.168.1.240:5500',
  GEOCHALK_API_URL: '',
  GEOCHALK_AUTH_URL: 'http://192.168.1.240:5500/api/login'
};

// Đồng bộ tự động tới các module con nếu có
if (window.MASTER_CONFIG.EDUSHARE_API_URL) {
  window.EDUSHARE_API_URL = window.MASTER_CONFIG.EDUSHARE_API_URL;
}
if (window.MASTER_CONFIG.GEOCHALK_API_URL) {
  window.GEOCHALK_API_URL = window.MASTER_CONFIG.GEOCHALK_API_URL;
}
if (window.MASTER_CONFIG.GEOCHALK_AUTH_URL) {
  window.EDUSHARE_AUTH_URL = window.MASTER_CONFIG.GEOCHALK_AUTH_URL;
}
"""
with open(os.path.join(OUTPUT_DIR, "config.js"), "w", encoding="utf-8") as f:
    f.write(master_config_content)

# 8. Tạo file cấu hình Nginx mẫu cho Server Web Tĩnh
print("[*] Tạo file cấu hình Nginx mẫu: dist_web_static/nginx-static.conf...")
nginx_static_conf = """# ==============================================================================
# CẤU HÌNH NGINX CHO SERVER PHỤC VỤ WEB TĨNH (STATIC WEB SERVER)
# ==============================================================================
# Đặt file này vào /etc/nginx/sites-available/math_static
# và symlink sang /etc/nginx/sites-enabled/
# ==============================================================================

server {
    listen 80;
    server_name math.yourdomain.com; # Thay thế bằng domain hoặc IP của server tĩnh

    root /var/www/dist_web_static; # Thư mục chứa toàn bộ web tĩnh đã giải nén
    index index.html;

    # Bật nén Gzip tối ưu tải nhanh cho JS, CSS, Font và GeoGebra
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        application/json
        application/javascript
        application/x-javascript
        application/xml
        application/xml+rss
        text/javascript
        image/svg+xml
        font/woff
        font/woff2
        application/wasm;

    # Bộ nhớ đệm cache dài hạn cho file tĩnh không đổi (fonts, GeoChalk bundle)
    location ~* \.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg|wasm|ggb)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        access_log off;
    }

    # Trang chủ Math Hub
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Module Vinacal 680EX (PWA)
    location /smt/ {
        try_files $uri $uri/ /smt/index.html;
    }

    # Module Toán THPT & Hình học 2D
    location /toan/ {
        try_files $uri $uri/ =404;
    }

    # Module Hình học GeoChalk 3D/2D
    location /hinhhoc/ {
        try_files $uri $uri/ /hinhhoc/geochalk.html;
    }

    # Module EduShare Web
    location /share_tailieu/ {
        try_files $uri $uri/ /share_tailieu/index.html;
    }

    # Bật HTTP/2 và SSL Let's Encrypt (Nếu dùng certbot: certbot --nginx -d math.yourdomain.com)
}
"""
with open(os.path.join(OUTPUT_DIR, "nginx-static.conf"), "w", encoding="utf-8") as f:
    f.write(nginx_static_conf)

print("=" * 70)
print("  HOÀN TẤT ĐÓNG GÓI THÀNH CÔNG VÀO THƯ MỤC: dist_web_static/")
print("  Bạn chỉ cần tải toàn bộ thư mục `dist_web_static` này lên Server Web Tĩnh!")
print("=" * 70)
