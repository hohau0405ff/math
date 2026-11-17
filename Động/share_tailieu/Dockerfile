# ==============================================================================
# DOCKERFILE CHO EDUSHARE (FASTAPI + SQL + REDIS + GMAIL SMTP)
# ==============================================================================
FROM python:3.11-slim

WORKDIR /app

# Thiết lập biến môi trường Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5500 \
    DATABASE_URL=sqlite:///./edushare.db \
    REDIS_URL=redis://redis:6379/0 \
    SMTP_HOST=smtp.gmail.com \
    SMTP_PORT=465 \
    SMTP_USER=hotrantrunghau951842@gmail.com \
    SMTP_PASS=qtfzemasubiterqv

# Cài đặt các gói phụ thuộc
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Sao chép toàn bộ mã nguồn ứng dụng
COPY . /app/

# Mở cổng phục vụ ứng dụng
EXPOSE 5500

# Khởi chạy máy chủ FastAPI qua Uvicorn (kèm cờ --reload để tự động nhận code mới từ volume mount)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5500", "--reload"]
