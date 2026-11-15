@echo off
title GeoChalk PHP Backend Server (Port 8080)
echo ========================================================
echo  KHOI CHAY GEOCHALK PHP BACKEND + SQLITE
echo ========================================================
echo  Server: http://localhost:8080/
echo  Database: geochalk/data/geochalk.db
echo ========================================================
cd /d "%~dp0"
php -S 0.0.0.0:8080 api.php
pause
