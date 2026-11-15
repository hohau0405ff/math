@echo off
chcp 65001 >nul
title GeoChalk - Bảng Kỹ Thuật (Hình Học 3D & Toán Học - PHP + SQLite)
cls
echo ==============================================================
echo        KHỞI ĐỘNG GEOCHALK - BẢNG KỸ THUẬT (PHP + SQLITE)
echo ==============================================================
echo.

where php >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Đã tìm thấy PHP. Đang khởi động máy chủ GeoChalk...
    echo [OK] Database: geochalk/data/geochalk.db
    start http://localhost:8080/geochalk.html
    php -S 0.0.0.0:8080 api.php
    goto end
)

where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [CẢNH BÁO] Không tìm thấy PHP, đang chạy tạm bằng Python tĩnh...
    echo (Lưu ý: Python chỉ phục vụ giao diện tĩnh, không lưu được vào SQLite)
    start http://localhost:8080/geochalk.html
    python -m http.server 8080
    goto end
)

echo [LỖI] Không tìm thấy PHP trên máy tính.
echo Vui lòng cài đặt PHP (hoặc XAMPP / Laragon) để máy chủ lưu bản vẽ hoạt động.
echo.
pause

:end
