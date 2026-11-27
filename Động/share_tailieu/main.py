#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
EDUSHARE - UNIFIED FASTAPI BACKEND + SQL (SQLAlchemy) + REDIS + GMAIL SMTP
=============================================================================
Hệ thống máy chủ Backend toàn diện cho EduShare:
1. Framework : FastAPI + Uvicorn (Asynchronous, High-Performance)
2. Database  : SQLite (SQLAlchemy ORM) lưu trữ Users, Rooms, Messages, Posts, Documents
3. Cache     : Redis (Cache phòng học và tin nhắn)
4. Mailer    : Gmail SMTP SSL (Port 465)
5. Static Web: Phục vụ Frontend EduShare (index.html, app.js, style.css)
=============================================================================
"""

import os
import sys
import time
import json
import random
import socket
import smtplib
import base64
import re
import secrets
import hashlib
import hmac
from uuid import uuid4
from typing import Optional, List, Dict, Any, Set
from datetime import datetime, timedelta
import threading

# Đảm bảo mã hóa UTF-8 trên Windows console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, HTTPException, BackgroundTasks, status, Query, WebSocket, WebSocketDisconnect, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
from pydantic import BaseModel, Field

from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, text
from sqlalchemy.orm import declarative_base, sessionmaker

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header

# Tích hợp drive.vn-ai.cloud API (HCDrive)
from vnai_drive import (
    upload_to_vnai_drive,
    fetch_file_binary,
    delete_from_vnai_drive,
    VNAI_DRIVE_FOLDER,
    VNAI_DRIVE_API_NAME
)

# ==================== CẤU HÌNH MÔI TRƯỜNG ====================
PORT = int(os.environ.get("PORT", 5500))
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./edushare.db")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

# Cấu hình Gmail SMTP
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 465))
SMTP_USER = os.environ.get("SMTP_USER", "hotrantrunghau951842@gmail.com")
SMTP_PASS = os.environ.get("SMTP_PASS", "qtfzemasubiterqv").replace(" ", "")
FROM_NAME = os.environ.get("FROM_NAME", "Ban Quản Trị EduShare")

# ==================== 1. SQL DATABASE & MODELS ====================
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class DBUser(Base):
    __tablename__ = "users"
    id = Column(String(64), primary_key=True, index=True)
    email = Column(String(128), unique=True, index=True, nullable=False)
    password = Column(String(256), nullable=False, default="123")
    name = Column(String(128), nullable=False)
    role = Column(String(32), default="user")
    is_system_admin = Column(Boolean, default=False)
    role_title = Column(String(128), nullable=True, default="Thành viên học tập")
    avatar = Column(Text, nullable=True)
    sub_info = Column(String(256), nullable=True, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class DBRoom(Base):
    __tablename__ = "rooms"
    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    code = Column(String(32), unique=True, index=True, nullable=False)
    type = Column(String(32), default="study_group")  # "community" | "study_group" | "direct"
    subject = Column(String(64), default="Chuyên đề chung")
    owner_email = Column(String(128), nullable=True)
    require_approval = Column(Boolean, default=False)
    admin_only_chat = Column(Boolean, default=False)
    members_json = Column(Text, default="[]")  # List of {"email": str, "role": "leader"|"coleader"|"member"}
    pending_json = Column(Text, default="[]")  # List of emails awaiting approval
    metadata_json = Column(Text, nullable=True)
    pinned_message_id = Column(String(64), nullable=True)
    pinned_message_ids = Column(Text, default="[]")
    blocked_by = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DBMessage(Base):
    __tablename__ = "messages"
    id = Column(String(64), primary_key=True, index=True)
    room_id = Column(String(64), index=True, nullable=False)
    sender_id = Column(String(64), nullable=True)
    sender_email = Column(String(128), nullable=False)
    sender_name = Column(String(128), nullable=False)
    sender_role = Column(String(64), default="Thành viên")
    sender_avatar = Column(Text, nullable=True)
    text = Column(Text, nullable=False, default="")
    attachment_json = Column(Text, nullable=True)  # File metadata if any
    reply_to_json = Column(Text, nullable=True)  # Quoted reply message metadata
    is_pinned = Column(Boolean, default=False)
    reactions_json = Column(Text, default="[]")
    deleted_for_json = Column(Text, default="[]")  # List of user emails who deleted this message for themselves
    created_at = Column(DateTime, default=datetime.utcnow)

class DBDocument(Base):
    __tablename__ = "documents"
    doc_id = Column(String(64), primary_key=True, index=True)
    title = Column(String(256), nullable=False)
    file_type = Column(String(32), default="pdf")
    file_size = Column(String(32), default="1.5 MB")
    mime_type = Column(String(64), default="application/pdf")
    file_base64 = Column(Text, nullable=True)
    file_path = Column(String(256), nullable=True)
    drive_file_id = Column(String(128), nullable=True)
    drive_url = Column(String(512), nullable=True)
    drive_download_url = Column(String(512), nullable=True)
    vnai_file_id = Column(String(128), nullable=True)
    vnai_provider_file_id = Column(String(128), nullable=True)
    uploader_name = Column(String(128), nullable=True)
    uploader_email = Column(String(128), nullable=True)
    subject = Column(String(64), default="Chuyên đề chung")
    room_id = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DBFriendship(Base):
    __tablename__ = "friendships"
    id = Column(String(64), primary_key=True, index=True)
    requester_email = Column(String(128), index=True, nullable=False)
    receiver_email = Column(String(128), index=True, nullable=False)
    status = Column(String(32), default="pending")  # "pending" | "accepted" | "rejected" | "blocked"
    direct_room_id = Column(String(128), nullable=True)
    blocked_by = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class DBPost(Base):
    __tablename__ = "posts"
    id = Column(String(64), primary_key=True, index=True)
    author_id = Column(String(64), nullable=True)
    author_email = Column(String(128), nullable=False)
    author_name = Column(String(128), nullable=False)
    author_role_title = Column(String(128), nullable=True)
    avatar = Column(Text, nullable=True)
    subject = Column(String(64), default="Chuyên đề chung")
    content = Column(Text, nullable=False)
    attachment_json = Column(Text, nullable=True)
    likes_json = Column(Text, default="[]")  # list of emails who liked
    comments_json = Column(Text, default="[]")  # list of comments
    shares_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

# ==================== SEED DATA CHUẨN ====================
SEED_USERS = [
    {
        "id": "usr_super_admin",
        "email": "hotranminhky0405@gmail.com",
        "password": "951842Hau@",
        "name": "Admin Trung Hậu",
        "role": "user",
        "is_system_admin": True,
        "role_title": "Admin [MÃ #951842]",
        "sub_info": "Admin [Mã #951842] • Thành viên EduShare",
        "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=AdminTrungHau"
    }
]

SEED_ROOMS = [
    {
        "id": "room_community",
        "name": "Diễn Đàn Học Sinh - Toàn Trường",
        "code": "EDUSHARE2026ALL1",
        "type": "community",
        "subject": "Chuyên đề chung",
        "owner_email": "hotranminhky0405@gmail.com",
        "require_approval": False,
        "admin_only_chat": False,
        "members": [
            {"email": "hotranminhky0405@gmail.com", "role": "leader"}
        ],
        "pending": []
    }
]

SEED_MESSAGES = [
    {
        "id": "msg_c1",
        "room_id": "room_community",
        "sender_email": "hotranminhky0405@gmail.com",
        "sender_name": "Admin Trung Hậu",
        "sender_role": "Super Admin",
        "sender_avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=AdminTrungHau",
        "text": "🎉 Chào mừng các bạn đến với Hệ Thống Trao Đổi & Chia Sẻ Tài Liệu EduShare! Mọi tài liệu gửi lên đây đều được sao lưu và lưu trữ tự động an toàn 60 ngày.",
        "attachment": None
    }
]

SEED_DOCUMENTS = [
    {
        "doc_id": "doc_hoahoc_huuco",
        "title": "Tong-Hop-Phan-Ung-Hoa-Huu-Co-Lop-12.docx",
        "file_type": "docx",
        "file_size": "3.1 MB",
        "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "uploader_name": "Admin Trung Hậu",
        "uploader_email": "hotranminhky0405@gmail.com",
        "subject": "Hóa học",
        "room_id": "room_community"
    }
]

SEED_POSTS = [
    {
        "id": "post_seed_01",
        "author_email": "hotranminhky0405@gmail.com",
        "author_name": "Admin Trung Hậu",
        "author_role_title": "Quản trị viên tối cao (Super Admin)",
        "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=AdminTrungHau",
        "subject": "Toán học",
        "content": "Tuyển tập 50 câu Vận Dụng Cao (VDC) Chuyên Đề Tích Phân & Hình Học Không Gian Oxyz có lời giải chi tiết năm 2026. Các bạn cùng tải file bên dưới về luyện nhé!",
        "attachment_json": None,
        "likes": [],
        "comments": [],
        "shares_count": 0
    }
]

def ensure_schema_migrations():
    """Tự động kiểm tra và thêm các cột mới vào DB nếu DB đã tồn tại từ trước"""
    try:
        os.makedirs("uploads", exist_ok=True)
        with engine.connect() as conn:
            def add_col_if_missing(table_name, col_name, col_type):
                try:
                    res = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
                    cols = [r[1] for r in res]
                    if col_name not in cols:
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                except Exception as err:
                    print(f"[Migration Warn] {table_name}.{col_name}: {err}")

            add_col_if_missing("rooms", "pinned_message_id", "VARCHAR(64)")
            add_col_if_missing("rooms", "pinned_message_ids", "TEXT DEFAULT '[]'")
            add_col_if_missing("rooms", "blocked_by", "VARCHAR(128)")
            add_col_if_missing("messages", "reactions_json", "TEXT DEFAULT '[]'")
            add_col_if_missing("messages", "is_pinned", "BOOLEAN DEFAULT 0")
            add_col_if_missing("messages", "reply_to_json", "TEXT")
            add_col_if_missing("messages", "deleted_for_json", "TEXT DEFAULT '[]'")
            add_col_if_missing("documents", "file_path", "VARCHAR(256)")
            add_col_if_missing("documents", "drive_file_id", "VARCHAR(128)")
            add_col_if_missing("documents", "drive_url", "VARCHAR(512)")
            add_col_if_missing("documents", "drive_download_url", "VARCHAR(512)")
            add_col_if_missing("documents", "vnai_file_id", "VARCHAR(128)")
            add_col_if_missing("documents", "vnai_provider_file_id", "VARCHAR(128)")
    except Exception as e:
        print(f"[Migration Error] {e}")

def init_db():
    """Tạo bảng và nạp dữ liệu khởi tạo đầy đủ nếu chưa có"""
    Base.metadata.create_all(bind=engine)
    ensure_schema_migrations()
    db = SessionLocal()
    try:
        # 1. Nạp Users (Nếu tài khoản đã có, bảo toàn tên và avatar người dùng đã chỉnh sửa)
        for u in SEED_USERS:
            existing = db.query(DBUser).filter(DBUser.email == u["email"]).first()
            if not existing:
                db.add(DBUser(
                    id=u["id"],
                    email=u["email"],
                    password=hash_password(u["password"]) if not u["password"].startswith("pbkdf2_sha256$") else u["password"],
                    name=u["name"],
                    role=u["role"],
                    is_system_admin=u["is_system_admin"],
                    role_title=u["role_title"],
                    sub_info=u["sub_info"],
                    avatar=u["avatar"]
                ))
        db.commit()

        # 2. Nạp Rooms
        for r in SEED_ROOMS:
            existing = db.query(DBRoom).filter(DBRoom.id == r["id"]).first()
            if not existing:
                db.add(DBRoom(
                    id=r["id"],
                    name=r["name"],
                    code=r["code"],
                    type=r["type"],
                    subject=r["subject"],
                    owner_email=r["owner_email"],
                    require_approval=r["require_approval"],
                    admin_only_chat=r["admin_only_chat"],
                    members_json=json.dumps(r["members"]),
                    pending_json=json.dumps(r["pending"])
                ))
        db.commit()

        # 3. Nạp Messages
        for m in SEED_MESSAGES:
            existing = db.query(DBMessage).filter(DBMessage.id == m["id"]).first()
            if not existing:
                db.add(DBMessage(
                    id=m["id"],
                    room_id=m["room_id"],
                    sender_email=m["sender_email"],
                    sender_name=m["sender_name"],
                    sender_role=m["sender_role"],
                    sender_avatar=m["sender_avatar"],
                    text=m["text"],
                    attachment_json=m["attachment_json"]
                ))
        db.commit()

        # 4. Nạp Documents
        minimal_pdf = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n"
        for d in SEED_DOCUMENTS:
            f_path = os.path.join("uploads", f"{d['doc_id']}_{d['title']}")
            if not os.path.exists(f_path):
                with open(f_path, "wb") as f_out:
                    f_out.write(minimal_pdf)

            existing = db.query(DBDocument).filter(DBDocument.doc_id == d["doc_id"]).first()
            if not existing:
                db.add(DBDocument(
                    doc_id=d["doc_id"],
                    title=d["title"],
                    file_type=d["file_type"],
                    file_size=d["file_size"],
                    mime_type=d["mime_type"],
                    file_base64="",
                    file_path=f_path,
                    uploader_name=d["uploader_name"],
                    uploader_email=d["uploader_email"],
                    subject=d["subject"],
                    room_id=d["room_id"]
                ))
            elif not existing.file_path:
                existing.file_path = f_path

        # Tạo sẵn camungtu.pdf chuẩn nhị phân nếu tải tài liệu cảm ứng từ
        camungtu_path = os.path.join("uploads", "camungtu.pdf")
        if not os.path.exists(camungtu_path):
            with open(camungtu_path, "wb") as f_out:
                f_out.write(minimal_pdf)

        db.commit()

        # 5. Nạp Posts
        for p in SEED_POSTS:
            existing = db.query(DBPost).filter(DBPost.id == p["id"]).first()
            if not existing:
                db.add(DBPost(
                    id=p["id"],
                    author_email=p["author_email"],
                    author_name=p["author_name"],
                    author_role_title=p["author_role_title"],
                    avatar=p["avatar"],
                    subject=p["subject"],
                    content=p["content"],
                    attachment_json=p["attachment_json"],
                    likes_json=json.dumps(p["likes"]),
                    comments_json=json.dumps(p["comments"]),
                    shares_count=p["shares_count"]
                ))
        db.commit()

        print(f"[*] CSDL SQL đã được khởi tạo hoàn chỉnh và nạp đầy đủ dữ liệu mẫu chuẩn.")
    except Exception as e:
        print(f"[!] Lỗi khởi tạo DB: {e}")
        db.rollback()
    finally:
        db.close()

init_db()

# ==================== 2. REDIS CACHE (With fallback in-memory) ====================
redis_client = None
in_memory_cache = {}

try:
    import redis
    client = redis.Redis.from_url(REDIS_URL, decode_responses=True, socket_timeout=2)
    client.ping()
    redis_client = client
    print(f"[*] Redis Cache đã kết nối thành công: {REDIS_URL}")
except Exception:
    print("[!] Không kết nối được Redis Server -> Kích hoạt bộ đệm In-Memory TTL 600s")
    redis_client = None

def cache_set(key: str, value: str, ttl_seconds: int = 600):
    if redis_client:
        try:
            redis_client.setex(key, ttl_seconds, value)
            return
        except Exception:
            pass
    in_memory_cache[key] = {
        "value": value,
        "expire_at": time.time() + ttl_seconds
    }

def cache_get(key: str) -> Optional[str]:
    if redis_client:
        try:
            return redis_client.get(key)
        except Exception:
            pass
    item = in_memory_cache.get(key)
    if not item:
        return None
    if time.time() > item["expire_at"]:
        del in_memory_cache[key]
        return None
    return item["value"]

def cache_delete(key: str):
    if redis_client:
        try:
            redis_client.delete(key)
        except Exception:
            pass
    if key in in_memory_cache:
        del in_memory_cache[key]

def cache_delete_pattern(pattern: str):
    if redis_client:
        try:
            keys = redis_client.keys(pattern)
            if keys:
                redis_client.delete(*keys)
        except Exception:
            pass
    regex = re.compile("^" + pattern.replace("*", ".*") + "$")
    keys_to_del = [k for k in in_memory_cache.keys() if regex.match(k)]
    for k in keys_to_del:
        if k in in_memory_cache:
            del in_memory_cache[k]

# ==================== GOOGLE DRIVE SYNC HELPER ====================
GOOGLE_DRIVE_WEBAPP_URL = os.environ.get("GOOGLE_DRIVE_WEBAPP_URL", "")
GOOGLE_DRIVE_FOLDER_URL = os.environ.get("GOOGLE_DRIVE_FOLDER_URL", "https://drive.google.com/drive/folders/1jfeInxopW2mbPNpVkjsc-nAhZfyPZr7e?usp=sharing")

# ==================== ĐỒNG BỘ THỜI GIAN CHUẨN ISO 8601 UTC ====================
def to_iso_utc(dt: Optional[datetime]) -> str:
    """Đảm bảo chuỗi thời gian trả về luôn có định dạng chuẩn ISO 8601 kèm hậu tố Z (UTC)"""
    if dt is None:
        dt = datetime.utcnow()
    iso = dt.isoformat()
    if not iso.endswith("Z") and not ("+" in iso or (len(iso) > 10 and "-" in iso[10:])):
        iso += "Z"
    return iso

# ==================== BẢO MẬT MẬT KHẨU (PBKDF2-HMAC-SHA256) ====================
def hash_password(password: str) -> str:
    """Băm mật khẩu chuẩn NIST sử dụng PBKDF2-HMAC-SHA256 với Salt 16 bytes và 100.000 vòng lặp"""
    if not password:
        return ""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"pbkdf2_sha256$100000${salt}${key.hex()}"

def verify_password(plain_password: str, stored_password: str) -> bool:
    """Xác thực mật khẩu với thời gian hằng số (Constant-Time) chống Timing Attack"""
    if not stored_password or not plain_password:
        return False
    if stored_password.startswith("pbkdf2_sha256$"):
        try:
            _, iters, salt, h = stored_password.split("$")
            calculated = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), int(iters))
            return hmac.compare_digest(calculated.hex(), h)
        except Exception:
            return False
    # Tương thích ngược bảo vệ constant-time cho mật khẩu cũ trước khi migrate
    return hmac.compare_digest(plain_password.encode('utf-8'), stored_password.encode('utf-8'))

# ==================== XÁC THỰC PHIÊN LÀM VIỆC & PHÂN QUYỀN (BEARER TOKEN) ====================
def get_auth_user(request: Request, db) -> Optional[DBUser]:
    """Trích xuất và xác thực Bearer Token từ header Authorization hoặc query param qua Redis/Memory cache"""
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header:
        parts = auth_header.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1].strip()
        elif len(parts) == 1:
            token = parts[0].strip()
    if not token:
        token = request.query_params.get("token")
    if token:
        user_id = cache_get(f"token:{token}")
        if user_id:
            return db.query(DBUser).filter(DBUser.id == user_id).first()
    return None

# ==================== DANH SÁCH FILE VÀ PHÒNG CHỐNG STORED XSS ====================
DANGEROUS_INLINE_MIMES = {
    "text/html", "application/xhtml+xml", "text/javascript",
    "application/javascript", "image/svg+xml", "application/xml", "text/xml"
}

def is_safe_for_inline(mime_type: Optional[str], filename: Optional[str]) -> bool:
    """Kiểm tra tệp an toàn để hiển thị inline, chặn các file có khả năng thực thi script gây XSS"""
    mime = (mime_type or "").lower().split(";")[0].strip()
    if mime in DANGEROUS_INLINE_MIMES:
        return False
    fn = (filename or "").lower()
    if any(fn.endswith(ext) for ext in [".html", ".htm", ".svg", ".js", ".xml", ".xhtml", ".shtml"]):
        return False
    return True

# ==================== PHÂN HỆ HÌNH HỌC GEOCHALK ====================
GEOCHALK_URL = os.environ.get("GEOCHALK_URL", "https://math.vn-ai.cloud/geochalk/geochalk.html").rstrip("/")

def get_drive_sync_url():
    global GOOGLE_DRIVE_WEBAPP_URL
    if GOOGLE_DRIVE_WEBAPP_URL:
        if "AKfycb_sample_test" in GOOGLE_DRIVE_WEBAPP_URL:
            return ""
        return GOOGLE_DRIVE_WEBAPP_URL
    try:
        if os.path.exists(".env"):
            with open(".env", "r", encoding="utf-8") as f:
                for line in f:
                    if line.startswith("GOOGLE_DRIVE_WEBAPP_URL="):
                        val = line.split("=", 1)[1].strip()
                        if val and "AKfycb_sample_test" not in val:
                            GOOGLE_DRIVE_WEBAPP_URL = val
                            return val
    except Exception:
        pass
    return ""

def sync_file_to_drive(file_title, mime_type, file_b64, uploader, room_id="", group_name="", doc_id=""):
    url = get_drive_sync_url()
    if not url or "script.google.com" not in url:
        return None
    try:
        import urllib.request
        clean_b64 = file_b64.split(",", 1)[1] if "," in file_b64 else file_b64
        payload = json.dumps({
            "action": "upload_file",
            "fileName": file_title,
            "mimeType": mime_type,
            "fileBase64": clean_b64,
            "uploader": uploader,
            "roomId": room_id,
            "groupName": group_name,
            "docId": doc_id
        }).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("status") == "success":
                print(f"[Google Drive Sync Success]: {file_title} -> {data.get('driveUrl')}")
                return data
    except Exception as ex:
        print(f"[Google Drive Sync Warn]: {ex}")
    return None

def delete_file_from_drive(file_id=None, doc_id=None, file_name=None, room_id=None, group_name=None, doc_ids=None):
    url = get_drive_sync_url()
    if not url or "script.google.com" not in url:
        return
    try:
        import urllib.request
        if room_id or group_name or doc_ids:
            payload = json.dumps({
                "action": "delete_group_files",
                "roomId": room_id or "",
                "groupName": group_name or "",
                "docIds": doc_ids or []
            }).encode("utf-8")
        else:
            payload = json.dumps({
                "action": "delete_file",
                "fileId": file_id or "",
                "docId": doc_id or "",
                "fileName": file_name or ""
            }).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=6) as resp:
            print(f"[Google Drive Delete Sync]: Success")
    except Exception as ex:
        print(f"[Google Drive Delete Warn]: {ex}")

# ==================== 3. GMAIL SMTP SERVICE ====================
def send_email_via_gmail_smtp(to_email: str, subject: str, text_content: str, html_content: str):
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{Header(FROM_NAME, 'utf-8').encode()} <{SMTP_USER}>"
    msg["To"] = to_email
    msg["Subject"] = Header(subject, "utf-8")

    msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=20)
    server.login(SMTP_USER, SMTP_PASS)
    server.sendmail(SMTP_USER, [to_email], msg.as_string())
    server.quit()
    return True

# ==================== 4. FASTAPI APP & SCHEMAS ====================
app = FastAPI(
    title="EduShare API",
    description="Hệ thống Backend FastAPI + SQL + Redis cho EduShare",
    version="6.0.0"
)

# Cấu hình Whitelist CORS bảo mật (Vá Lỗ hổng 7: Chặn CORS Wildcard kết hợp Credentials)
env_origins = os.environ.get("ALLOWED_ORIGINS", "")
if env_origins:
    ALLOWED_ORIGINS = [o.strip() for o in env_origins.split(",") if o.strip()]
else:
    ALLOWED_ORIGINS = [
        "https://edushare.vn-ai.cloud",
        "https://math.vn-ai.cloud",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8080",
        "http://127.0.0.1:8080"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Vá Lỗ hổng 2 (Tầng Middleware): Chặn tuyệt đối các yêu cầu truy cập trực tiếp file nhạy cảm
FORBIDDEN_EXTENSIONS = {
    ".db", ".sqlite", ".sqlite3", ".env", ".py", ".pyc", ".pyd",
    ".yml", ".yaml", ".sh", ".bash", ".log", ".git", ".md", ".gs",
    ".ini", ".conf", ".cfg", ".bak", ".swp"
}

@app.middleware("http")
async def block_sensitive_files_middleware(request: Request, call_next):
    raw_path = request.url.path.lower()
    for bad_ext in FORBIDDEN_EXTENSIONS:
        if raw_path.endswith(bad_ext) or f"{bad_ext}?" in raw_path or f"{bad_ext}/" in raw_path:
            return JSONResponse(status_code=404, content={"detail": "Tài nguyên không tồn tại hoặc đã bị khóa bảo mật."})
    for bad_name in ["edushare.db", ".env", "/.git", "dockerfile", "docker-compose", "requirements.txt"]:
        if bad_name in raw_path:
            return JSONResponse(status_code=404, content={"detail": "Tài nguyên không tồn tại hoặc đã bị khóa bảo mật."})
    return await call_next(request)

@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    """
    Vô hiệu hóa triệt để browser cache đối với file HTML, JS, CSS và toàn bộ API.
    Người dùng không bao giờ bị dính cache cũ hoặc phải bấm Ctrl+F5 mới thấy cập nhật.
    """
    response = await call_next(request)
    path = request.url.path.lower()
    if (
        path.endswith((".js", ".css", ".html", ".json")) or
        path in ["/", "/index.html", "/feed"] or
        path.startswith("/api/")
    ):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# ==================== WEBSOCKET REALTIME CONNECTION MANAGER ====================
class ConnectionManager:
    """
    Quản lý kết nối WebSocket thời gian thực cho EduShare:
    - Đồng bộ tin nhắn phòng chat (room_id) ngay lập tức không cần F5/Reload.
    - Phát thông báo bài viết mới, thu hồi tin nhắn, thả biểu cảm thời gian thực.
    - Quản lý ngắt kết nối an toàn, loại bỏ socket đã đóng.
    """
    def __init__(self):
        # room_id -> set of WebSocket instances
        self.room_connections: Dict[str, Set[WebSocket]] = {}
        # user_email -> set of WebSocket instances
        self.user_connections: Dict[str, Set[WebSocket]] = {}
        # Tất cả kết nối đang hoạt động
        self.all_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, room_id: Optional[str] = None, user_email: Optional[str] = None):
        await websocket.accept()
        self.all_connections.add(websocket)
        if room_id:
            if room_id not in self.room_connections:
                self.room_connections[room_id] = set()
            self.room_connections[room_id].add(websocket)
        if user_email:
            email = user_email.strip().lower()
            if email not in self.user_connections:
                self.user_connections[email] = set()
            self.user_connections[email].add(websocket)

    def disconnect(self, websocket: WebSocket, room_id: Optional[str] = None, user_email: Optional[str] = None):
        self.all_connections.discard(websocket)
        if room_id and room_id in self.room_connections:
            self.room_connections[room_id].discard(websocket)
            if not self.room_connections[room_id]:
                del self.room_connections[room_id]
        if user_email:
            email = user_email.strip().lower()
            if email in self.user_connections:
                self.user_connections[email].discard(websocket)
                if not self.user_connections[email]:
                    del self.user_connections[email]
        # Dọn sạch toàn bộ room_connections chứa socket này
        for r_id in list(self.room_connections.keys()):
            self.room_connections[r_id].discard(websocket)
            if not self.room_connections[r_id]:
                del self.room_connections[r_id]
        # Dọn sạch toàn bộ user_connections chứa socket này
        for u_e in list(self.user_connections.keys()):
            self.user_connections[u_e].discard(websocket)
            if not self.user_connections[u_e]:
                del self.user_connections[u_e]

    def set_user_email(self, websocket: WebSocket, user_email: str):
        if not user_email:
            return
        email = user_email.strip().lower()
        if email not in self.user_connections:
            self.user_connections[email] = set()
        self.user_connections[email].add(websocket)

    def switch_room(self, websocket: WebSocket, old_room_id: Optional[str], new_room_id: str):
        if old_room_id and old_room_id in self.room_connections:
            self.room_connections[old_room_id].discard(websocket)
            if not self.room_connections[old_room_id]:
                del self.room_connections[old_room_id]
        if new_room_id:
            if new_room_id not in self.room_connections:
                self.room_connections[new_room_id] = set()
            self.room_connections[new_room_id].add(websocket)

    async def broadcast_chat_message(
        self,
        room_id: str,
        room_type: str,
        member_emails: list,
        data: dict,
        exclude: Optional[WebSocket] = None
    ):
        """
        Phát sóng tin nhắn tới 100% người nhận mục tiêu mà không bao giờ bị trùng lặp hay sót:
        1. Tất cả client đang mở phòng này (self.room_connections[room_id])
        2. Tất cả thành viên trong nhóm theo email (self.user_connections[email])
        3. Nếu là phòng cộng đồng (community): phát tới TOÀN BỘ client đang kết nối (self.all_connections)
        """
        target_sockets: Set[WebSocket] = set()

        # 1. Các socket đang đứng trong phòng
        if room_id in self.room_connections:
            target_sockets.update(self.room_connections[room_id])

        # 2. Các socket của thành viên phòng
        if member_emails:
            for e in member_emails:
                e_clean = (e or "").strip().lower()
                if e_clean in self.user_connections:
                    target_sockets.update(self.user_connections[e_clean])

        # 3. Phòng cộng đồng chung toàn trường -> tất cả mọi người online
        if room_type == "community" or room_id == "room_community":
            target_sockets.update(self.all_connections)

        dead = set()
        for ws in target_sockets:
            if ws == exclude:
                continue
            try:
                await ws.send_json(data)
            except Exception:
                dead.add(ws)

        for ws in dead:
            self.all_connections.discard(ws)
            if room_id in self.room_connections:
                self.room_connections[room_id].discard(ws)
            for u_e in list(self.user_connections.keys()):
                self.user_connections[u_e].discard(ws)

    async def broadcast_to_room(self, room_id: str, data: dict, exclude: Optional[WebSocket] = None):
        if room_id in self.room_connections:
            dead = set()
            for ws in list(self.room_connections[room_id]):
                if ws == exclude:
                    continue
                try:
                    await ws.send_json(data)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.room_connections[room_id].discard(ws)
                self.all_connections.discard(ws)

    async def broadcast_to_users(self, emails: list, data: dict, exclude: Optional[WebSocket] = None):
        """Phát tin nhắn thời gian thực tới các tài khoản cụ thể (dù họ đang ở phòng khác)"""
        if not emails:
            return
        dead = []
        for e in emails:
            e_clean = (e or "").strip().lower()
            if e_clean in self.user_connections:
                for ws in list(self.user_connections[e_clean]):
                    if ws == exclude:
                        continue
                    try:
                        await ws.send_json(data)
                    except Exception:
                        dead.append((e_clean, ws))
        for e_clean, ws in dead:
            if e_clean in self.user_connections:
                self.user_connections[e_clean].discard(ws)
            self.all_connections.discard(ws)

    async def broadcast_to_all(self, data: dict):
        dead = set()
        for ws in list(self.all_connections):
            try:
                await ws.send_json(data)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.all_connections.discard(ws)

ws_manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: Optional[str] = Query(None),
    user_email: Optional[str] = Query(None)
):
    await ws_manager.connect(websocket, room_id, user_email)
    current_room = room_id
    current_email = user_email
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type") or data.get("action")
            if msg_type == "join_room":
                new_room = data.get("room_id")
                new_email = data.get("user_email") or data.get("email")
                if new_email:
                    current_email = new_email.strip().lower()
                    ws_manager.set_user_email(websocket, current_email)
                if new_room:
                    ws_manager.switch_room(websocket, current_room, new_room)
                    current_room = new_room
                    await websocket.send_json({"type": "room_joined", "room_id": new_room})
            elif msg_type in ["set_user", "update_user"]:
                new_email = data.get("user_email") or data.get("email")
                if new_email:
                    current_email = new_email.strip().lower()
                    ws_manager.set_user_email(websocket, current_email)
                    await websocket.send_json({"type": "user_updated", "user_email": current_email})
            elif msg_type == "leave_room":
                if current_room and current_room in ws_manager.room_connections:
                    ws_manager.room_connections[current_room].discard(websocket)
                    if not ws_manager.room_connections[current_room]:
                        del ws_manager.room_connections[current_room]
                current_room = None
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong", "time": time.time()})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, current_room, current_email)
    except Exception:
        ws_manager.disconnect(websocket, current_room, current_email)

@app.websocket("/ws/rooms/{room_id}")
async def websocket_room_endpoint(
    websocket: WebSocket,
    room_id: str,
    user_email: Optional[str] = Query(None)
):
    await ws_manager.connect(websocket, room_id, user_email)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong", "time": time.time()})
    except (WebSocketDisconnect, Exception):
        ws_manager.disconnect(websocket, room_id, user_email)

# Schemas
class SendOtpRequest(BaseModel):
    email: str
    type: Optional[str] = "register"

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str
    type: Optional[str] = "register"

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterUserRequest(BaseModel):
    email: str
    password: str
    name: str
    otp: Optional[str] = ""
    avatar: Optional[str] = ""
    sub_info: Optional[str] = ""

class ResetPasswordRequest(BaseModel):
    email: str
    otp: Optional[str] = ""
    new_password: str

class ProfileUpdateRequest(BaseModel):
    email: str
    name: str
    sub_info: Optional[str] = ""
    avatar: Optional[str] = ""

class CreateRoomRequest(BaseModel):
    name: str
    code: str
    subject: Optional[str] = "Chuyên đề chung"
    type: Optional[str] = "study_group"
    owner_email: str
    initial_members: Optional[List[str]] = None

class JoinRoomRequest(BaseModel):
    code: str
    user_email: str

class RoomSettingsRequest(BaseModel):
    user_email: str
    admin_only_chat: Optional[bool] = None
    require_approval: Optional[bool] = None

class SendMessageRequest(BaseModel):
    room_id: Optional[str] = None
    sender_email: Optional[str] = None
    sender_name: Optional[str] = None
    sender_role: Optional[str] = "Thành viên"
    sender_avatar: Optional[str] = ""
    text: Optional[str] = ""
    attachment: Optional[Dict[str, Any]] = None
    reply_to: Optional[Dict[str, Any]] = None
    # Hỗ trợ phân hệ Hình Học GeoChalk
    user_id: Optional[str] = None
    content: Optional[str] = None

class SSOCreateTokenRequest(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None

class SSOVerifyRequest(BaseModel):
    token: str

class FriendRequest(BaseModel):
    requester_email: str
    receiver_email: Optional[str] = None
    target_email: Optional[str] = None

class FriendResponse(BaseModel):
    user_email: str
    requester_email: str
    action: str  # "accept" | "reject"

class DirectChatOpenRequest(BaseModel):
    user_email: str
    target_email: str

class BlockUserRequest(BaseModel):
    user_email: str
    target_email: str
    room_id: Optional[str] = None

class PinMessageRequest(BaseModel):
    message_id: Optional[str] = None
    action: str = "pin"  # "pin" | "unpin"

class MessageReactionRequest(BaseModel):
    user_email: str
    emoji: str

class CreatePostRequest(BaseModel):
    author_id: Optional[str] = None
    author_email: str
    author_name: str
    author_role_title: Optional[str] = "Thành viên"
    avatar: Optional[str] = ""
    subject: Optional[str] = "Chuyên đề chung"
    content: str
    attachment: Optional[Dict[str, Any]] = None

class LikePostRequest(BaseModel):
    user_email: str

class CommentPostRequest(BaseModel):
    author_email: str
    author_name: str
    avatar: Optional[str] = ""
    content: str

class SharePostRequest(BaseModel):
    user_email: str
    target_room_id: str

class DocumentCreate(BaseModel):
    doc_id: str
    title: str
    file_type: Optional[str] = "pdf"
    file_size: Optional[str] = "1.5 MB"
    mime_type: Optional[str] = "application/pdf"
    file_base64: Optional[str] = ""
    uploader_name: Optional[str] = "Người dùng"
    uploader_email: Optional[str] = ""
    subject: Optional[str] = "Chuyên đề chung"
    room_id: Optional[str] = ""

# ==================== 5. REST API ENDPOINTS ====================

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "backend": "FastAPI 6.0",
        "database": "SQLite (SQLAlchemy)",
        "cache": "Redis" if redis_client else "In-Memory TTL",
        "smtp_gateway": SMTP_USER,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/smtp-status")
def smtp_status():
    return {
        "status": "active",
        "host": SMTP_HOST,
        "port": SMTP_PORT,
        "user": SMTP_USER,
        "ready": True
    }

# ----------------- AUTH & OTP -----------------
@app.post("/api/send-otp")
def api_send_otp(req: SendOtpRequest):
    email = req.email.lower().strip()
    # Sinh mã OTP 6 chữ số ngẫu nhiên an toàn bằng CSPRNG (secrets) từ server, chặn hoàn toàn injection
    otp = f"{secrets.randbelow(900000) + 100000}"
    req_type = req.type
    type_label = "ĐẶT LẠI MẬT KHẨU" if req_type == "forgot" else "ĐĂNG KÝ TÀI KHOẢN"

    # Lưu mã OTP vào Cache với TTL 600s (10 phút)
    cache_key = f"otp:{email}:{req_type}"
    cache_set(cache_key, otp, ttl_seconds=600)

    subject = f"[EduShare] Mã xác thực OTP {type_label}: {otp}"
    text_content = (
        f"Chào bạn,\n\n"
        f"Bạn vừa yêu cầu {type_label} trên ứng dụng EduShare.\n\n"
        f"Mã xác minh OTP của bạn là: {otp}\n\n"
        f"Lưu ý: Mã này có HIỆU LỰC TRONG 10 PHÚT từ thời điểm gửi. "
        f"Tuyệt đối không cung cấp mã này cho người khác để bảo vệ tài khoản.\n\n"
        f"Trân trọng,\nBan Quản Trị EduShare\nEmail hỗ trợ: {SMTP_USER}"
    )

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0; padding:20px; background-color:#f0f4f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:540px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.08); border:1px solid #e1e8ed;">
        <div style="background:linear-gradient(135deg, #0068ff, #0050d8); padding:24px 20px; text-align:center; color:#ffffff;">
          <h1 style="margin:0; font-size:22px; font-weight:700; letter-spacing:0.5px;">EduShare</h1>
          <p style="margin:6px 0 0; font-size:13px; opacity:0.9;">Hệ Thống Trao Đổi & Chia Sẻ Tài Liệu Học Tập</p>
        </div>
        <div style="padding:28px 24px; color:#2c3e50; line-height:1.6;">
          <h2 style="margin:0 0 14px; font-size:18px; color:#1a1a1a; text-align:center;">Xác Thực {type_label}</h2>
          <p style="margin:0 0 16px; font-size:14px; color:#555;">Xin chào bạn,</p>
          <p style="margin:0 0 20px; font-size:14px; color:#555;">Bạn vừa gửi yêu cầu <strong>{type_label}</strong> trên hệ thống EduShare. Đây là mã OTP xác minh của bạn:</p>

          <div style="background:#f4f8ff; border:2px dashed #0068ff; border-radius:10px; padding:18px; text-align:center; margin:20px 0;">
            <span style="font-size:34px; font-weight:800; letter-spacing:8px; color:#0068ff; font-family:monospace;">{otp}</span>
            <div style="font-size:12px; color:#666; margin-top:8px;">(Hiệu lực trong vòng <strong>10 phút</strong>)</div>
          </div>

          <div style="background:#fffbe6; border-left:4px solid #faad14; padding:10px 14px; border-radius:4px; margin:20px 0; font-size:12.5px; color:#873800;">
            <strong>⚠️ Cảnh báo an toàn:</strong> Tuyệt đối không cung cấp mã OTP này cho bất kỳ ai, kể cả giáo viên hay quản trị viên.
          </div>

          <p style="margin:20px 0 0; font-size:13px; color:#888; text-align:center;">Email được gửi tự động qua cổng Gmail SMTP SSL.<br>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua thư.</p>
        </div>
        <div style="background:#fafafa; border-top:1px solid #eee; padding:14px 20px; text-align:center; font-size:11.5px; color:#999;">
          Ban Quản Trị EduShare • {SMTP_USER}
        </div>
      </div>
    </body>
    </html>
    """

    try:
        send_email_via_gmail_smtp(email, subject, text_content, html_content)
        return {
            "status": "success",
            "message": f"Mã OTP đã được gửi đến {email} qua Gmail SMTP",
            "expiresIn": 600
        }
    except Exception as e:
        print(f"[FastAPI SMTP Error]: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi gửi email qua SMTP: {str(e)}")

@app.post("/api/verify-otp")
def api_verify_otp(req: VerifyOtpRequest):
    email = req.email.lower().strip()
    otp = req.otp.strip()
    cache_key = f"otp:{email}:{req.type}"
    cached_val = cache_get(cache_key)

    if not cached_val:
        raise HTTPException(status_code=400, detail="Mã OTP đã hết hạn 10 phút hoặc không tồn tại. Vui lòng bấm 'Gửi mã OTP' để nhận mã mới.")
    if cached_val != otp:
        raise HTTPException(status_code=400, detail="Mã OTP không chính xác. Vui lòng kiểm tra lại trong hộp thư Gmail.")

    cache_delete(cache_key)
    return {"status": "success", "verified": True, "message": "Xác thực OTP thành công."}

@app.post("/api/login")
def api_login(req: LoginRequest):
    email = req.email.strip().lower()
    password = req.password.strip()
    db = SessionLocal()
    try:
        user = db.query(DBUser).filter(DBUser.email == email).first()
        if not user or not verify_password(password, user.password):
            raise HTTPException(status_code=401, detail="Địa chỉ Gmail hoặc mật khẩu không chính xác.")

        # Zero-Downtime Migration: Tự động nâng cấp mật khẩu cũ sang PBKDF2-HMAC-SHA256
        if not user.password.startswith("pbkdf2_sha256$"):
            user.password = hash_password(password)
            db.commit()

        # Sinh Bearer Token chuẩn cho GeoChalk và API Clients (Phương án A)
        access_token = f"edt_{uuid4().hex}_{int(time.time())}"
        cache_set(f"token:{access_token}", user.id, ttl_seconds=86400 * 7)

        return {
            "status": "success",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "isSystemAdmin": bool(user.is_system_admin),
                "roleTitle": user.role_title or "Thành viên học tập",
                "subInfo": user.sub_info or "",
                "avatar": user.avatar or f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.email}"
            }
        }
    finally:
        db.close()

# ----------------- GEOCHALK & SSO INTEGRATION (PHƯƠNG ÁN B & C) -----------------
@app.get("/api/geochalk/config")
def get_geochalk_config():
    """Cung cấp cấu hình kết nối phân hệ Hình Học GeoChalk"""
    geochalk_url = os.environ.get("GEOCHALK_URL", "https://math.vn-ai.cloud/geochalk/geochalk.html").rstrip("/")
    return {
        "status": "success",
        "geochalk_url": geochalk_url,
        "sso_enabled": True,
        "auth_url": "/api/login",
        "sso_verify_url": "/api/sso/verify"
    }

@app.post("/api/sso/create-token")
def create_sso_token(req: SSOCreateTokenRequest):
    """
    Sinh mã SSO Token ngắn hạn (60 giây) để đăng nhập 1-chạm từ EduShare sang GeoChalk (Phương án B)
    """
    db = SessionLocal()
    try:
        user = None
        if req.user_id:
            user = db.query(DBUser).filter(DBUser.id == req.user_id.strip()).first()
        if not user and req.email:
            user = db.query(DBUser).filter(DBUser.email == req.email.strip().lower()).first()

        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản người dùng để tạo phiên đăng nhập 1-chạm.")

        # Sinh mã token ngẫu nhiên an toàn
        sso_token = f"sso_{secrets.token_urlsafe(32)}"

        user_info = {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "isSystemAdmin": bool(user.is_system_admin),
            "roleTitle": user.role_title or "Thành viên học tập",
            "subInfo": user.sub_info or "",
            "avatar": user.avatar or f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.email}"
        }
        # Lưu vào cache thời hạn 60 giây (hỗ trợ cả Redis và In-Memory)
        cache_set(f"sso:{sso_token}", json.dumps(user_info), ttl_seconds=60)

        geochalk_base = os.environ.get("GEOCHALK_URL", "https://math.vn-ai.cloud/geochalk/geochalk.html").rstrip("/")
        sep = "&" if "?" in geochalk_base else "?"
        redirect_url = f"{geochalk_base}{sep}sso_token={sso_token}"

        return {
            "status": "success",
            "sso_token": sso_token,
            "expires_in": 60,
            "geochalk_url": redirect_url,
            "redirect_url": redirect_url,
            "user": user_info
        }
    finally:
        db.close()

@app.post("/api/sso/verify")
def verify_sso_token(req: SSOVerifyRequest):
    """
    Xác thực mã SSO Token do GeoChalk backend (PHP) gửi sang (Phương án B)
    Trả về thông tin user và hủy token (Single-use) để ngăn chặn Replay Attack.
    """
    token_str = (req.token or "").strip()
    if not token_str:
        raise HTTPException(status_code=400, detail="Mã xác thực SSO không được để trống.")

    cached_raw = cache_get(f"sso:{token_str}")
    if not cached_raw:
        raise HTTPException(status_code=401, detail="Mã xác thực SSO không hợp lệ hoặc đã hết hạn (60 giây).")

    # Xóa token ngay lập tức (Single-use token)
    cache_delete(f"sso:{token_str}")

    try:
        user_info = json.loads(cached_raw)
    except Exception:
        raise HTTPException(status_code=500, detail="Lỗi giải mã thông tin tài khoản từ phiên SSO.")

    return {
        "status": "success",
        "user": user_info
    }

@app.post("/api/register-user")
def api_register_user(req: RegisterUserRequest):
    email = req.email.strip().lower()
    otp = (req.otp or "").strip()

    # BẮT BUỘC XÁC THỰC MÃ OTP GMAIL (HIỆU LỰC 10 PHÚT)
    cached_otp = cache_get(f"otp:{email}:register")
    if not cached_otp or cached_otp != otp:
        raise HTTPException(
            status_code=400,
            detail="Mã OTP xác thực Gmail không chính xác hoặc đã hết hạn 10 phút. Vui lòng bấm 'Gửi mã OTP' để nhận mã mới vào hòm thư Gmail."
        )
    # Xác thực xong thì xóa OTP để chống dùng lại
    cache_delete(f"otp:{email}:register")

    db = SessionLocal()
    try:
        existing = db.query(DBUser).filter(DBUser.email == email).first()
        if existing:
            existing.password = hash_password(req.password)
            existing.name = req.name
            if req.avatar:
                existing.avatar = req.avatar
            if req.sub_info:
                existing.sub_info = req.sub_info
            db.commit()
            user_dict = {
                "id": existing.id,
                "email": existing.email,
                "name": existing.name,
                "role": existing.role,
                "isSystemAdmin": bool(existing.is_system_admin),
                "roleTitle": existing.role_title or "Thành viên học tập",
                "subInfo": existing.sub_info or "",
                "avatar": existing.avatar or f"https://api.dicebear.com/7.x/avataaars/svg?seed={email}"
            }
            return {"status": "success", "message": f"Tài khoản {email} đã được cập nhật thành công!", "user": user_dict}

        new_u = DBUser(
            id=f"usr_{int(time.time()*1000)}",
            email=email,
            password=hash_password(req.password),
            name=req.name,
            role="user",
            is_system_admin=False,
            role_title="Thành viên học tập",
            sub_info=req.sub_info or "Học sinh thành viên",
            avatar=req.avatar or f"https://api.dicebear.com/7.x/avataaars/svg?seed={email}"
        )
        db.add(new_u)

        # Tự động thêm vào phòng cộng đồng "Diễn Đàn Học Sinh"
        comm_room = db.query(DBRoom).filter(DBRoom.id == "room_community").first()
        if comm_room:
            members = json.loads(comm_room.members_json or "[]")
            if not any(m.get("email") == email for m in members):
                members.append({"email": email, "role": "member"})
                comm_room.members_json = json.dumps(members)

        db.commit()
        user_dict = {
            "id": new_u.id,
            "email": new_u.email,
            "name": new_u.name,
            "role": new_u.role,
            "isSystemAdmin": bool(new_u.is_system_admin),
            "roleTitle": new_u.role_title or "Thành viên học tập",
            "subInfo": new_u.sub_info or "",
            "avatar": new_u.avatar or f"https://api.dicebear.com/7.x/avataaars/svg?seed={email}"
        }
        return {"status": "success", "message": f"Đăng ký tài khoản EduShare thành công! Chào mừng {new_u.name}.", "user": user_dict}
    finally:
        db.close()

@app.post("/api/reset-password")
def api_reset_password(req: ResetPasswordRequest):
    email = req.email.strip().lower()
    otp = (req.otp or "").strip()

    # BẮT BUỘC XÁC THỰC MÃ OTP GMAIL (HIỆU LỰC 10 PHÚT)
    cached_otp = cache_get(f"otp:{email}:forgot")
    if not cached_otp or cached_otp != otp:
        raise HTTPException(
            status_code=400,
            detail="Mã OTP xác thực Gmail không chính xác hoặc đã hết hạn 10 phút. Vui lòng bấm 'Gửi mã OTP' để nhận mã mới vào hòm thư Gmail."
        )
    # Xác thực xong thì xóa OTP để chống dùng lại
    cache_delete(f"otp:{email}:forgot")

    db = SessionLocal()
    try:
        user = db.query(DBUser).filter(DBUser.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản với Gmail/Email này.")

        user.password = hash_password(req.new_password)
        db.commit()
        return {"status": "success", "message": f"Đã cập nhật mật khẩu mới cho tài khoản {email} thành công! Vui lòng đăng nhập."}
    finally:
        db.close()

# ----------------- USERS & PROFILE -----------------
@app.get("/api/users")
def get_all_users():
    db = SessionLocal()
    try:
        users = db.query(DBUser).all()
        return [
            {
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "role": u.role,
                "isSystemAdmin": bool(u.is_system_admin),
                "roleTitle": u.role_title or "",
                "subInfo": u.sub_info or "",
                "avatar": u.avatar or ""
            }
            for u in users
        ]
    finally:
        db.close()

@app.put("/api/users/profile")
async def update_profile(req: ProfileUpdateRequest, request: Request):
    email = req.email.strip().lower()
    db = SessionLocal()
    try:
        # Kiểm tra xác thực quyền sở hữu qua Bearer Token (Vá Lỗ hổng 4: BOLA / IDOR)
        auth_user = get_auth_user(request, db)
        if not auth_user:
            raise HTTPException(status_code=401, detail="Phiên làm việc hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.")
        if auth_user.email.lower() != email and not auth_user.is_system_admin:
            raise HTTPException(status_code=403, detail="Bạn không có quyền chỉnh sửa hồ sơ của tài khoản khác.")

        user = db.query(DBUser).filter(DBUser.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="Người dùng không tồn tại.")

        user.name = req.name.strip()
        if req.sub_info is not None:
            user.sub_info = req.sub_info.strip()
        if req.avatar:
            user.avatar = req.avatar

        # ĐỒNG BỘ TOÀN DIỆN: Cập nhật tên và avatar trên tất cả tin nhắn, bài viết diễn đàn, bình luận, kho tài liệu và phòng chat
        db.query(DBMessage).filter(DBMessage.sender_email == email).update({
            DBMessage.sender_name: user.name,
            DBMessage.sender_avatar: user.avatar
        })

        db.query(DBPost).filter(DBPost.author_email == email).update({
            DBPost.author_name: user.name,
            DBPost.avatar: user.avatar
        })

        db.query(DBDocument).filter(DBDocument.uploader_email == email).update({
            DBDocument.uploader_name: user.name
        })

        # Cập nhật trong comments_json của các bài viết có bình luận của user này
        posts_with_comments = db.query(DBPost).filter(DBPost.comments_json.like(f"%{email}%")).all()
        for p in posts_with_comments:
            cmts = json.loads(p.comments_json or "[]")
            modified = False
            for c in cmts:
                if (c.get("author_email") or "").lower() == email:
                    c["author_name"] = user.name
                    c["avatar"] = user.avatar
                    modified = True
            if modified:
                p.comments_json = json.dumps(cmts)

        # Cập nhật danh sách thành viên trong tất cả các nhóm & cập nhật tên phòng chat riêng
        rooms_with_member = db.query(DBRoom).filter(DBRoom.members_json.like(f"%{email}%")).all()
        for r in rooms_with_member:
            r_modified = False
            members = json.loads(r.members_json or "[]")
            for m in members:
                if (m.get("email") or "").lower() == email:
                    m["name"] = user.name
                    m["avatar"] = user.avatar
                    if user.sub_info:
                        m["sub_info"] = user.sub_info
                    r_modified = True
            if r_modified:
                r.members_json = json.dumps(members)

            # Nếu là phòng chat riêng 1-1, cập nhật lại tên phòng kết hợp cả 2 bên
            if r.type == "direct" and email in (r.id or ""):
                other_m = next((m for m in members if (m.get("email") or "").lower() != email), None)
                if other_m:
                    other_u = db.query(DBUser).filter(DBUser.email == (other_m.get("email") or "").lower()).first()
                    other_name = other_u.name if other_u else other_m.get("email")
                    r.name = f"{user.name} & {other_name}"

        db.commit()

        # Dọn sạch toàn bộ cache để giao diện nhận dữ liệu mới ngay lập tức
        cache_delete_pattern("room:*:messages")
        cache_delete("rooms:all")
        cache_delete("docs:all")
        cache_delete("posts:all")
        cache_delete("users:all")

        user_data = {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "isSystemAdmin": bool(user.is_system_admin),
            "roleTitle": user.role_title,
            "subInfo": user.sub_info,
            "avatar": user.avatar
        }

        # Phát thông báo WebSocket thời gian thực tới tất cả các client đang online
        try:
            await ws_manager.broadcast_to_all({
                "type": "user_profile_updated",
                "user": user_data
            })
        except Exception as ws_err:
            print(f"[WS Profile Broadcast Warn]: {ws_err}")

        return {
            "status": "success",
            "message": "Đã cập nhật hồ sơ và đồng bộ avatar toàn hệ thống!",
            "user": user_data
        }
    finally:
        db.close()

# ----------------- ROOMS & GROUPS -----------------
@app.get("/api/rooms")
def get_rooms(user_email: Optional[str] = None, user_id: Optional[str] = None):
    db = SessionLocal()
    try:
        rooms = db.query(DBRoom).all()
        result = []
        email = (user_email or "").strip().lower()
        if not email and user_id:
            u_obj = db.query(DBUser).filter(DBUser.id == user_id.strip()).first()
            if u_obj:
                email = u_obj.email.strip().lower()

        is_guest = not email or email == "guest@edushare.local"
        super_admin = False
        if not is_guest:
            super_admin = bool(db.query(DBUser).filter(DBUser.email == email, DBUser.is_system_admin == True).first())

        for r in rooms:
            members = json.loads(r.members_json or "[]")
            pending = json.loads(r.pending_json or "[]")

            user_role = "none"
            is_member = False
            is_pending = email in pending
            is_owner = (r.owner_email or "").strip().lower() == email

            for m in members:
                if m.get("email", "").lower() == email:
                    user_role = m.get("role", "member")
                    is_member = True
                    break

            if is_owner and user_role == "none":
                user_role = "leader"
                is_member = True

            # Nếu là phòng cộng đồng thì ai cũng có quyền xem và là thành viên mặc định
            if r.type == "community":
                is_member = True
                if user_role == "none":
                    user_role = "member"

            # BẢO MẬT PHÒNG HỌC:
            # 1. Nếu là Khách (chưa đăng nhập / vừa đăng xuất): CHỈ THẤY phòng Diễn đàn Cộng đồng lớn mặc định!
            if is_guest and r.type != "community":
                continue

            # 2. Nếu là Người dùng đã đăng nhập: CHỈ THẤY phòng Cộng đồng HOẶC phòng mình đã tham gia / là chủ phòng!
            if not is_guest and r.type != "community":
                if not is_member and not is_owner:
                    continue

            # Lấy thông tin tin nhắn gần nhất
            last_msg = db.query(DBMessage).filter(DBMessage.room_id == r.id).order_by(DBMessage.created_at.desc()).first()

            # BỔ SUNG CHI TIẾT ĐẦY ĐỦ THÀNH VIÊN (Tên thật, Avatar, Chức vụ, Email)
            detailed_members = []
            for m in members:
                m_email = m.get("email", "").strip().lower()
                m_user = db.query(DBUser).filter(DBUser.email == m_email).first()
                detailed_members.append({
                    "email": m_email,
                    "name": m_user.name if m_user else m_email,
                    "avatar": m_user.avatar if (m_user and m_user.avatar) else f"https://api.dicebear.com/7.x/avataaars/svg?seed={m_email}",
                    "role": m.get("role", "member"),
                    "roleTitle": m_user.role_title if (m_user and m_user.role_title) else ("Trưởng nhóm" if m.get("role") == "leader" else "Thành viên"),
                    "subInfo": m_user.sub_info if (m_user and m_user.sub_info) else ""
                })

            detailed_pending = []
            for p_email in pending:
                p_email = p_email.strip().lower()
                p_user = db.query(DBUser).filter(DBUser.email == p_email).first()
                detailed_pending.append({
                    "email": p_email,
                    "name": p_user.name if p_user else p_email,
                    "avatar": p_user.avatar if (p_user and p_user.avatar) else f"https://api.dicebear.com/7.x/avataaars/svg?seed={p_email}"
                })

            # Xử lý hiển thị tên và avatar phù hợp: nếu là trò chuyện cá nhân 1-1 (direct)
            display_name = r.name
            display_avatar = ""
            display_subject = r.subject or "Chung"
            other_email = ""

            if r.type == "direct":
                other_m = next((m for m in detailed_members if m["email"] != email), None)
                if not other_m and detailed_members:
                    other_m = detailed_members[0]
                if other_m:
                    display_name = other_m["name"]
                    display_avatar = other_m["avatar"]
                    display_subject = other_m["roleTitle"] or "Trò chuyện cá nhân"
                    other_email = other_m["email"]

            result.append({
                "id": r.id,
                "name": display_name,
                "avatar": display_avatar,
                "code": r.code,
                "type": r.type,
                "subject": display_subject,
                "owner_email": r.owner_email,
                "other_user_email": other_email,
                "require_approval": bool(r.require_approval),
                "admin_only_chat": bool(r.admin_only_chat),
                "pinned_message_id": r.pinned_message_id,
                "pinned_message_ids": json.loads(r.pinned_message_ids or "[]") if hasattr(r, 'pinned_message_ids') and r.pinned_message_ids else [],
                "is_blocked": bool(r.blocked_by),
                "blocked_by": r.blocked_by,
                "members_count": len(detailed_members),
                "members": detailed_members,
                "pending": pending,
                "pending_details": detailed_pending,
                "is_member": is_member,
                "is_pending": is_pending,
                "user_role": user_role,
                "last_message": {
                    "text": last_msg.text if last_msg else "Chưa có tin nhắn nào",
                    "sender_name": last_msg.sender_name if last_msg else "",
                    "created_at": to_iso_utc(last_msg.created_at) if last_msg else to_iso_utc(r.created_at)
                } if last_msg else None
            })
        return result
    finally:
        db.close()

@app.post("/api/rooms")
def create_room(req: CreateRoomRequest):
    owner_email = req.owner_email.strip().lower()
    code = req.code.strip()
    db = SessionLocal()
    try:
        # Kiểm tra trùng code
        existing = db.query(DBRoom).filter(DBRoom.code == code).first()
        if existing:
            raise HTTPException(status_code=400, detail="Mã phòng đã tồn tại. Vui lòng bấm sinh mã mới.")

        room_id = f"room_{int(time.time()*1000)}"
        members = [{"email": owner_email, "role": "leader"}]
        if req.initial_members:
            for m_email in req.initial_members:
                clean_m = (m_email or "").strip().lower()
                if clean_m and clean_m != owner_email and not any(m.get("email") == clean_m for m in members):
                    members.append({"email": clean_m, "role": "member"})

        new_room = DBRoom(
            id=room_id,
            name=req.name.strip(),
            code=code,
            type=req.type or "study_group",
            subject=req.subject or "Chuyên đề chung",
            owner_email=owner_email,
            require_approval=False,
            admin_only_chat=False,
            members_json=json.dumps(members),
            pending_json="[]"
        )
        db.add(new_room)

        # Tạo tin nhắn chào mừng mặc định
        welcome_msg = DBMessage(
            id=f"msg_{int(time.time()*1000)}",
            room_id=room_id,
            sender_email=owner_email,
            sender_name="Hệ Thống EduShare",
            sender_role="Hệ thống",
            sender_avatar="https://api.dicebear.com/7.x/bottts/svg?seed=SystemBot",
            text=f"🎉 Nhóm học tập '{req.name.strip()}' đã được khởi tạo thành công! Mã tham gia nhóm: {code}"
        )
        db.add(welcome_msg)
        db.commit()

        return {"status": "success", "room_id": room_id, "code": code}
    finally:
        db.close()

@app.post("/api/rooms/join")
def join_room(req: JoinRoomRequest):
    code = req.code.strip()
    email = req.user_email.strip().lower()
    db = SessionLocal()
    try:
        room = db.query(DBRoom).filter(DBRoom.code == code).first()
        if not room:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhóm học tập với mã truy cập này.")

        members = json.loads(room.members_json or "[]")
        pending = json.loads(room.pending_json or "[]")

        if any(m.get("email") == email for m in members):
            return {"status": "already_member", "room_id": room.id, "message": "Bạn đã là thành viên trong nhóm này rồi."}

        if room.require_approval:
            if email not in pending:
                pending.append(email)
                room.pending_json = json.dumps(pending)
                db.commit()
            return {"status": "pending_approval", "room_id": room.id, "message": "Yêu cầu gia nhập đã được gửi đến Trưởng/Phó nhóm để phê duyệt."}

        # Nếu không cần duyệt, tham gia trực tiếp
        members.append({"email": email, "role": "member"})
        room.members_json = json.dumps(members)

        # Lấy tên user
        u = db.query(DBUser).filter(DBUser.email == email).first()
        uname = u.name if u else email
        join_msg = DBMessage(
            id=f"msg_{int(time.time()*1000)}",
            room_id=room.id,
            sender_email=email,
            sender_name=uname,
            sender_role="Thành viên",
            sender_avatar=u.avatar if u else "",
            text=f"👋 {uname} đã tham gia vào nhóm học tập."
        )
        db.add(join_msg)
        db.commit()

        return {"status": "success", "room_id": room.id, "message": f"Bạn đã gia nhập thành công nhóm '{room.name}'."}
    finally:
        db.close()

@app.put("/api/rooms/{room_id}/settings")
def update_room_settings(room_id: str, req: RoomSettingsRequest):
    db = SessionLocal()
    try:
        room = db.query(DBRoom).filter(DBRoom.id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhóm.")

        members = json.loads(room.members_json or "[]")
        user_role = next((m.get("role") for m in members if m.get("email") == req.user_email.lower()), None)

        # BẢO MẬT BÌNH ĐẲNG: CHỈ DUY NHẤT TRƯỞNG NHÓM (LEADER) của nhóm mới được điều chỉnh cấu hình bảo mật của nhóm
        if user_role != "leader":
            raise HTTPException(status_code=403, detail="Chỉ Trưởng nhóm mới có quyền điều chỉnh cài đặt bảo mật và quyền gửi bài của nhóm.")

        if req.admin_only_chat is not None:
            room.admin_only_chat = req.admin_only_chat
        if req.require_approval is not None:
            room.require_approval = req.require_approval

        db.commit()
        return {"status": "success", "message": "Đã cập nhật cài đặt nhóm thành công."}
    finally:
        db.close()

@app.post("/api/rooms/{room_id}/members/{action}")
def handle_member_action(
    room_id: str,
    action: str,
    target_email: str = Query(...),
    actor_email: Optional[str] = Query(None),
    user_email: Optional[str] = Query(None)
):
    effective_actor = (actor_email or user_email or "").strip().lower()
    if not effective_actor:
        raise HTTPException(status_code=400, detail="Thiếu thông tin người thực hiện (user_email/actor_email).")

    db = SessionLocal()
    try:
        room = db.query(DBRoom).filter(DBRoom.id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhóm.")

        members = json.loads(room.members_json or "[]")
        pending = json.loads(room.pending_json or "[]")

        actor_role = next((m.get("role") for m in members if m.get("email") == effective_actor), None)
        if (room.owner_email or "").strip().lower() == effective_actor:
            actor_role = "leader"

        target = target_email.lower().strip()
        target_role = next((m.get("role") for m in members if m.get("email") == target), "member")

        # QUYỀN HẠN PHÂN CẤP CHUẨN EDUSHARE:
        if action in ["promote", "demote"]:
            if actor_role != "leader":
                raise HTTPException(status_code=403, detail="Chỉ duy nhất Trưởng nhóm mới có quyền bổ nhiệm hoặc hạ cấp Phó nhóm.")
        elif action == "kick":
            if actor_role == "leader":
                if target == effective_actor:
                    raise HTTPException(status_code=400, detail="Trưởng nhóm không thể tự kích chính mình khỏi nhóm.")
            elif actor_role == "coleader":
                if target_role != "member":
                    raise HTTPException(status_code=403, detail="Phó nhóm chỉ có quyền mời Thành viên thông thường ra khỏi nhóm, không thể mời Trưởng nhóm hoặc Phó nhóm khác.")
            else:
                raise HTTPException(status_code=403, detail="Chỉ Trưởng nhóm và Phó nhóm mới có quyền mời thành viên ra khỏi nhóm.")
        elif action in ["approve", "reject"]:
            if actor_role not in ["leader", "coleader"]:
                raise HTTPException(status_code=403, detail="Bạn không có quyền phê duyệt thành viên trong nhóm này.")
        else:
            raise HTTPException(status_code=400, detail="Hành động không hợp lệ.")

        target = target_email.lower().strip()

        if action == "promote":  # Bổ nhiệm làm Phó nhóm
            for m in members:
                if m.get("email") == target:
                    m["role"] = "coleader"
            room.members_json = json.dumps(members)
            msg = f"Đã bổ nhiệm {target} làm Phó nhóm."

        elif action == "demote":  # Hạ cấp về Thành viên
            for m in members:
                if m.get("email") == target:
                    m["role"] = "member"
            room.members_json = json.dumps(members)
            msg = f"Đã hạ cấp {target} về Thành viên thông thường."

        elif action == "kick":  # Mời ra khỏi nhóm
            members = [m for m in members if m.get("email") != target]
            room.members_json = json.dumps(members)
            msg = f"Đã mời {target} ra khỏi nhóm."

        elif action == "approve":  # Phê duyệt gia nhập
            if target in pending:
                pending.remove(target)
                room.pending_json = json.dumps(pending)
            if not any(m.get("email") == target for m in members):
                members.append({"email": target, "role": "member"})
                room.members_json = json.dumps(members)
            msg = f"Đã phê duyệt {target} vào nhóm."

        elif action == "reject":  # Từ chối gia nhập
            if target in pending:
                pending.remove(target)
                room.pending_json = json.dumps(pending)
            msg = f"Đã từ chối yêu cầu của {target}."

        db.commit()
        return {"status": "success", "message": msg}
    finally:
        db.close()

@app.post("/api/rooms/{room_id}/leave")
def leave_room(room_id: str, user_email: str = Query(...)):
    db = SessionLocal()
    try:
        room = db.query(DBRoom).filter(DBRoom.id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhóm.")

        members = json.loads(room.members_json or "[]")
        members = [m for m in members if m.get("email") != user_email.lower()]
        room.members_json = json.dumps(members)
        db.commit()
        return {"status": "success", "message": "Bạn đã rời khỏi nhóm học tập."}
    finally:
        db.close()

@app.delete("/api/rooms/{room_id}")
def delete_room_forever(room_id: str, request: Request, user_email: Optional[str] = Query(None)):
    if room_id == "room_community":
        raise HTTPException(status_code=400, detail="Không thể xóa nhóm Diễn Đàn Học Sinh cộng đồng chung toàn trường.")

    db = SessionLocal()
    try:
        auth_user = get_auth_user(request, db)
        req_email = (auth_user.email.lower() if auth_user else (user_email or "").strip().lower())
        if not req_email:
            raise HTTPException(status_code=401, detail="Phiên làm việc hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.")

        room = db.query(DBRoom).filter(DBRoom.id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhóm cần xóa.")

        # Kiểm tra quyền: CHỈ DUY NHẤT TRƯỞNG NHÓM (leader) hoặc QUẢN TRỊ VIÊN mới được xóa vĩnh viễn (Vá Lỗ hổng 4: BOLA)
        members = json.loads(room.members_json or "[]")
        user_role = next((m.get("role") for m in members if m.get("email") == req_email), None)
        is_admin = auth_user.is_system_admin if auth_user else False

        if user_role != "leader" and not is_admin:
            raise HTTPException(status_code=403, detail="Chỉ duy nhất Trưởng nhóm hoặc Quản trị viên mới có quyền xóa vĩnh viễn nhóm này.")

        room_name = room.name

        # 1. Thu thập danh sách ID tài liệu và tệp của phòng cần dọn dẹp
        docs_to_delete = db.query(DBDocument).filter(DBDocument.room_id == room_id).all()
        doc_ids = [d.doc_id for d in docs_to_delete]

        # 2. Xóa các tệp đính kèm trong tin nhắn của phòng
        room_msgs = db.query(DBMessage).filter(DBMessage.room_id == room_id).all()
        for msg in room_msgs:
            if msg.attachment_json:
                try:
                    att = json.loads(msg.attachment_json)
                    if "doc_id" in att and att["doc_id"] not in doc_ids:
                        doc_ids.append(att["doc_id"])
                except Exception:
                    pass

        # 3. Dọn sạch tệp tin vật lý trên ổ đĩa Server (nếu có)
        upload_dir = os.path.join(STATIC_DIR, "uploads")
        if os.path.exists(upload_dir):
            try:
                for filename in os.listdir(upload_dir):
                    if filename.startswith(f"{room_id}_") or any(d_id in filename for d_id in doc_ids):
                        file_path = os.path.join(upload_dir, filename)
                        if os.path.isfile(file_path):
                            os.remove(file_path)
            except Exception as e:
                print(f"[File Cleanup Warning]: {e}")

        # 4. Xóa sạch tin nhắn & tài liệu trong cơ sở dữ liệu SQLite
        db.query(DBMessage).filter(DBMessage.room_id == room_id).delete()
        if doc_ids:
            db.query(DBDocument).filter(DBDocument.doc_id.in_(doc_ids)).delete(synchronize_session=False)
        db.query(DBDocument).filter(DBDocument.room_id == room_id).delete()

        # 5. Xóa nhóm học tập
        db.delete(room)
        db.commit()

        # 6. Dọn sạch bộ đệm Redis Cache
        cache_delete(f"room:{room_id}:messages")
        cache_delete("rooms:all")
        cache_delete("docs:all")

        # 7. ĐỒNG BỘ XÓA SẠCH TRÊN GOOGLE DRIVE (DRIVER) QUA GOOGLE APPS SCRIPT
        drive_sync_url = os.environ.get("GOOGLE_DRIVE_WEBAPP_URL", "")
        if drive_sync_url:
            try:
                import urllib.request
                payload = json.dumps({
                    "action": "delete_group_files",
                    "roomId": room_id,
                    "groupName": room_name,
                    "docIds": doc_ids
                }).encode("utf-8")
                d_req = urllib.request.Request(
                    drive_sync_url,
                    data=payload,
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                with urllib.request.urlopen(d_req, timeout=6) as d_resp:
                    print(f"[Google Drive Sync]: Đã dọn dẹp dữ liệu nhóm '{room_name}' trên Google Drive.")
            except Exception as ex:
                print(f"[Google Drive Sync Notice]: {ex}")

        return {
            "status": "success",
            "message": f"Đã xóa vĩnh viễn nhóm '{room_name}' cùng toàn bộ dữ liệu tin nhắn, tài liệu trên Server và đồng bộ Google Drive thành công."
        }
    finally:
        db.close()

# ----------------- MESSAGES -----------------
@app.get("/api/rooms/{room_id}/messages")
def get_room_messages(room_id: str, user_email: Optional[str] = None):
    db = SessionLocal()
    try:
        msgs = db.query(DBMessage).filter(DBMessage.room_id == room_id).order_by(DBMessage.created_at.asc()).all()
        cur_email = (user_email or "").strip().lower()
        res = []
        for m in msgs:
            deleted_for = json.loads(m.deleted_for_json or "[]")
            if cur_email and cur_email in deleted_for:
                continue
            res.append({
                "id": m.id,
                "room_id": m.room_id,
                "sender_email": m.sender_email,
                "sender_name": m.sender_name,
                "sender_role": m.sender_role,
                "sender_avatar": m.sender_avatar,
                "text": m.text,
                "attachment": json.loads(m.attachment_json) if m.attachment_json else None,
                "reply_to": json.loads(m.reply_to_json) if m.reply_to_json else None,
                "is_pinned": bool(m.is_pinned),
                "reactions": json.loads(m.reactions_json or "[]") if hasattr(m, 'reactions_json') and m.reactions_json else [],
                "is_recalled": (m.text == "Tin nhắn đã được thu hồi"),
                "created_at": to_iso_utc(m.created_at)
            })
        return res
    finally:
        db.close()

@app.delete("/api/messages/{message_id}")
@app.post("/api/messages/{message_id}/recall")
async def recall_message(message_id: str, user_email: str = Query(...)):
    email = user_email.strip().lower()
    db = SessionLocal()
    try:
        msg = db.query(DBMessage).filter(DBMessage.id == message_id).first()
        if not msg:
            raise HTTPException(status_code=404, detail="Tin nhắn không tồn tại hoặc đã được thu hồi.")

        room = db.query(DBRoom).filter(DBRoom.id == msg.room_id).first()
        user = db.query(DBUser).filter(DBUser.email == email).first()

        is_sender = (msg.sender_email or "").strip().lower() == email
        if not is_sender:
            raise HTTPException(status_code=403, detail="Chỉ người gửi mới có quyền thu hồi tin nhắn của mình.")

        # Thu hồi tin nhắn & tự động xóa đồng bộ tệp trên server và Google Drive
        msg.text = "Tin nhắn đã được thu hồi"
        if msg.attachment_json:
            try:
                att = json.loads(msg.attachment_json)
                doc_id = att.get("doc_id")
                file_title = att.get("title")
                file_id = att.get("file_id")
                if doc_id:
                    doc = db.query(DBDocument).filter(DBDocument.doc_id == doc_id).first()
                    if doc:
                        if doc.file_path and os.path.exists(doc.file_path):
                            try:
                                os.remove(doc.file_path)
                            except Exception:
                                pass
                        delete_file_from_drive(
                            file_id=doc.drive_file_id or file_id,
                            doc_id=doc_id,
                            file_name=file_title
                        )
                        db.delete(doc)
            except Exception as ex:
                print(f"[Recall attachment cleanup err] {ex}")
        msg.attachment_json = None
        db.commit()

        # Xóa cache tin nhắn phòng
        cache_delete(f"room:{msg.room_id}:messages")

        # Broadcast realtime sự kiện thu hồi tin nhắn đến tất cả thành viên trong phòng
        try:
            room_members = json.loads(room.members_json or "[]") if room else []
            target_member_emails = [m.get("email", "").strip().lower() for m in room_members if m.get("email")]
            await ws_manager.broadcast_chat_message(
                room_id=msg.room_id,
                room_type=room.type if room else "",
                member_emails=target_member_emails,
                data={
                    "type": "message_recalled",
                    "room_id": msg.room_id,
                    "message_id": message_id
                }
            )
        except Exception as ws_ex:
            print(f"[WS Recall Broadcast Error]: {ws_ex}")

        return {"status": "success", "message": "Đã thu hồi tin nhắn với mọi người thành công."}
    finally:
        db.close()

@app.delete("/api/messages/{message_id}/delete-for-me")
@app.post("/api/messages/{message_id}/delete-for-me")
def delete_message_for_me(message_id: str, user_email: str = Query(...)):
    u_e = user_email.strip().lower()
    db = SessionLocal()
    try:
        msg = db.query(DBMessage).filter(DBMessage.id == message_id).first()
        if not msg:
            raise HTTPException(status_code=404, detail="Không tìm thấy tin nhắn.")

        deleted_list = json.loads(msg.deleted_for_json or "[]")
        if u_e not in deleted_list:
            deleted_list.append(u_e)
            msg.deleted_for_json = json.dumps(deleted_list)
            db.commit()

        return {"status": "success", "message": "Đã xóa tin nhắn chỉ ở phía bạn."}
    finally:
        db.close()

@app.post("/api/rooms/{room_id}/pin-message")
def pin_room_message(room_id: str, req: PinMessageRequest):
    db = SessionLocal()
    try:
        room = db.query(DBRoom).filter(DBRoom.id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhóm.")

        pids = json.loads(room.pinned_message_ids or "[]") if hasattr(room, 'pinned_message_ids') and room.pinned_message_ids else []
        if req.action == "pin":
            if not req.message_id:
                raise HTTPException(status_code=400, detail="Thiếu mã tin nhắn cần ghim.")
            msg = db.query(DBMessage).filter(DBMessage.id == req.message_id).first()
            if not msg:
                raise HTTPException(status_code=404, detail="Không tìm thấy tin nhắn cần ghim.")
            msg.is_pinned = True
            room.pinned_message_id = req.message_id
            if not any(p.get("message_id") == req.message_id for p in pids):
                pids.append({
                    "message_id": req.message_id,
                    "pinned_at": datetime.utcnow().isoformat(),
                    "pinned_by": getattr(req, 'user_email', None) or ""
                })
            room.pinned_message_ids = json.dumps(pids)
            db.commit()
            return {"status": "success", "message": "Đã ghim tin nhắn lên đầu nhóm.", "pinned_message_id": req.message_id, "is_pinned": True, "pinned_ids": pids}
        else:
            if req.message_id:
                msg = db.query(DBMessage).filter(DBMessage.id == req.message_id).first()
                if msg:
                    msg.is_pinned = False
                pids = [p for p in pids if p.get("message_id") != req.message_id]
                room.pinned_message_ids = json.dumps(pids)
                if room.pinned_message_id == req.message_id:
                    remaining = db.query(DBMessage).filter(
                        DBMessage.room_id == room_id,
                        DBMessage.is_pinned == True,
                        DBMessage.id != req.message_id
                    ).order_by(DBMessage.created_at.desc()).first()
                    room.pinned_message_id = remaining.id if remaining else None
            else:
                db.query(DBMessage).filter(DBMessage.room_id == room_id).update({DBMessage.is_pinned: False})
                room.pinned_message_id = None
                room.pinned_message_ids = "[]"
            db.commit()
            return {"status": "success", "message": "Đã bỏ ghim tin nhắn.", "is_pinned": False, "pinned_ids": pids}
    finally:
        db.close()


@app.get("/api/messages/{message_id}/reactions")
def get_message_reactions(message_id: str):
    db = SessionLocal()
    try:
        msg = db.query(DBMessage).filter(DBMessage.id == message_id).first()
        if not msg:
            raise HTTPException(status_code=404, detail="Không tìm thấy tin nhắn.")
        reactions = json.loads(msg.reactions_json or "[]") if hasattr(msg, 'reactions_json') and msg.reactions_json else []
        return {"status": "success", "reactions": reactions}
    finally:
        db.close()

@app.post("/api/messages/{message_id}/reactions")
async def react_to_message(message_id: str, req: MessageReactionRequest):
    email = req.user_email.strip().lower()
    emoji = req.emoji.strip()
    db = SessionLocal()
    try:
        msg = db.query(DBMessage).filter(DBMessage.id == message_id).first()
        if not msg:
            raise HTTPException(status_code=404, detail="Không tìm thấy tin nhắn.")
        user = db.query(DBUser).filter(DBUser.email == email).first()
        user_name = user.name if user else email
        avatar = user.avatar if (user and user.avatar) else f"https://api.dicebear.com/7.x/bottts/svg?seed={email}"

        reactions = json.loads(msg.reactions_json or "[]")
        existing = next((r for r in reactions if r.get("user_email") == email), None)
        if existing:
            if existing.get("emoji") == emoji:
                # Toggle off nếu bấm lại cùng emoji
                reactions = [r for r in reactions if r.get("user_email") != email]
            else:
                existing["emoji"] = emoji
                existing["created_at"] = to_iso_utc(datetime.utcnow())
        else:
            reactions.append({
                "user_email": email,
                "user_name": user_name,
                "avatar": avatar,
                "emoji": emoji,
                "created_at": to_iso_utc(datetime.utcnow())
            })

        msg.reactions_json = json.dumps(reactions)
        db.commit()

        # Broadcast realtime sự kiện cập nhật biểu cảm đến tất cả thành viên trong phòng
        try:
            room = db.query(DBRoom).filter(DBRoom.id == msg.room_id).first()
            room_members = json.loads(room.members_json or "[]") if room else []
            target_member_emails = [m.get("email", "").strip().lower() for m in room_members if m.get("email")]
            await ws_manager.broadcast_chat_message(
                room_id=msg.room_id,
                room_type=room.type if room else "",
                member_emails=target_member_emails,
                data={
                    "type": "reaction_updated",
                    "room_id": msg.room_id,
                    "message_id": message_id,
                    "reactions": reactions
                }
            )
        except Exception as ws_ex:
            print(f"[WS Reaction Broadcast Error]: {ws_ex}")

        return {"status": "success", "reactions": reactions}
    finally:
        db.close()

@app.post("/api/rooms/{room_id}/messages")
async def send_message(room_id: str, req: SendMessageRequest):
    db = SessionLocal()
    try:
        # Hỗ trợ phân hệ Hình Học GeoChalk: Tra cứu user nếu gửi bằng user_id (Phương án C)
        if req.user_id and (not req.sender_email or not req.sender_name):
            u_obj = db.query(DBUser).filter(DBUser.id == req.user_id.strip()).first()
            if u_obj:
                if not req.sender_email:
                    req.sender_email = u_obj.email
                if not req.sender_name:
                    req.sender_name = u_obj.name
                if not req.sender_avatar:
                    req.sender_avatar = u_obj.avatar or f"https://api.dicebear.com/7.x/avataaars/svg?seed={u_obj.email}"
                if not req.sender_role:
                    req.sender_role = u_obj.role_title or "Thành viên"

        # Hỗ trợ GeoChalk: Map content -> text
        if req.content and not req.text:
            req.text = req.content

        email = (req.sender_email or "").strip().lower()
        if not email:
            raise HTTPException(status_code=400, detail="Thiếu thông tin người gửi (sender_email hoặc user_id).")
        room = db.query(DBRoom).filter(DBRoom.id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhóm.")

        # Nếu là direct chat 1-1: Kiểm tra quan hệ bạn bè và chặn
        if room.type == "direct":
            if room.blocked_by:
                if room.blocked_by.lower() == email:
                    raise HTTPException(status_code=403, detail="Bạn đã chặn cuộc trò chuyện này. Hãy bỏ chặn để tiếp tục nhắn tin.")
                else:
                    raise HTTPException(status_code=403, detail="Bạn không thể gửi tin nhắn vì đối phương đã chặn cuộc trò chuyện này.")
            # Kiểm tra xem có phải bạn bè không
            members = json.loads(room.members_json or "[]")
            other_email = next((m.get("email", "").lower() for m in members if m.get("email", "").lower() != email), None)
            if other_email:
                fs = db.query(DBFriendship).filter(
                    ((DBFriendship.requester_email == email) & (DBFriendship.receiver_email == other_email)) |
                    ((DBFriendship.requester_email == other_email) & (DBFriendship.receiver_email == email))
                ).first()
                if not fs or fs.status != "accepted":
                    raise HTTPException(status_code=403, detail="Chỉ bạn bè mới có thể gửi tin nhắn riêng cho nhau. Hãy kết bạn trước!")

        # Kiểm tra quyền: nếu nhóm khóa chat (admin_only_chat)
        if room.admin_only_chat:
            members = json.loads(room.members_json or "[]")
            user_role = next((m.get("role") for m in members if m.get("email") == email), None)
            if user_role not in ["leader", "coleader"]:
                raise HTTPException(status_code=403, detail="Chỉ Trưởng nhóm và Phó nhóm mới có quyền gửi tin nhắn trong nhóm này.")

        msg_id = f"msg_{int(time.time()*1000)}"
        attach_json = json.dumps(req.attachment) if req.attachment else None
        reply_json = json.dumps(req.reply_to) if req.reply_to else None

        new_msg = DBMessage(
            id=msg_id,
            room_id=room_id,
            sender_email=email,
            sender_name=req.sender_name,
            sender_role=req.sender_role or "Thành viên",
            sender_avatar=req.sender_avatar or "",
            text=req.text or "",
            attachment_json=attach_json,
            reply_to_json=reply_json,
            is_pinned=False,
            deleted_for_json="[]"
        )
        db.add(new_msg)

        # Nếu có file đính kèm, lưu luôn vào bảng documents và đồng bộ lên drive.vn-ai.cloud (thư mục edushare)
        if req.attachment:
            att = req.attachment
            if att.get("type") == "geochalk_project":
                prj_id = att.get("project_id") or f"geochalk_prj_{int(time.time()*1000)}"
                att["project_id"] = prj_id
                att["doc_id"] = att.get("doc_id") or prj_id
                att["title"] = att.get("title") or "Bản vẽ hình học GeoChalk"
                if not att.get("preview_url"):
                    geochalk_base = os.environ.get("GEOCHALK_URL", "https://math.vn-ai.cloud/geochalk/geochalk.html").rstrip("/")
                    sep = "&" if "?" in geochalk_base else "?"
                    att["preview_url"] = f"{geochalk_base}{sep}openProject={prj_id}"
                new_msg.attachment_json = json.dumps(att)
            elif "doc_id" in att or att.get("file_base64"):
                doc_id = att.get("doc_id") or f"doc_{int(time.time()*1000)}"
                att["doc_id"] = doc_id
                file_title = att.get("title", f"file_{int(time.time())}.pdf")
                file_b64 = att.get("file_base64", "")
                mime_type = att.get("mime_type", "application/pdf")
                file_disk_path = ""
                file_bytes = b""

                if file_b64 and "," in file_b64:
                    try:
                        os.makedirs("uploads", exist_ok=True)
                        clean_b64 = file_b64.split(",", 1)[1]
                        file_bytes = base64.b64decode(clean_b64)
                        file_disk_path = os.path.join("uploads", f"{doc_id}_{file_title}")
                        with open(file_disk_path, "wb") as f_out:
                            f_out.write(file_bytes)
                    except Exception as ex:
                        print(f"[Upload Error] {ex}")
                elif file_b64:
                    try:
                        file_bytes = base64.b64decode(file_b64)
                    except Exception:
                        pass

                # 1. ĐỒNG BỘ LÊN CLOUD DRIVE: drive.vn-ai.cloud (Thư mục edushare)
                vnai_res = None
                vnai_file_id = None
                vnai_provider_file_id = None
                if file_bytes:
                    try:
                        vnai_res = upload_to_vnai_drive(
                            file_bytes=file_bytes,
                            filename=file_title,
                            mime_type=mime_type
                        )
                        if vnai_res:
                            vnai_file_id = vnai_res.get("file_id")
                            vnai_provider_file_id = vnai_res.get("provider_file_id")
                    except Exception as vex:
                        print(f"[VNAI Drive Chat Upload Error]: {vex}")

                # 2. ĐỒNG BỘ DỰ PHÒNG GOOGLE DRIVE APPS SCRIPT (NẾU CÓ CẤU HÌNH)
                drive_res = None
                if not vnai_res and file_b64:
                    drive_res = sync_file_to_drive(
                        file_title=file_title,
                        mime_type=mime_type,
                        file_b64=file_b64,
                        uploader=req.sender_name,
                        room_id=room_id,
                        group_name=room.name if room else "",
                        doc_id=doc_id
                    )

                drive_url = f"/api/docs/{doc_id}/download" if vnai_file_id else (drive_res.get("driveUrl") if drive_res else att.get("drive_url"))
                drive_file_id = vnai_file_id or (drive_res.get("fileId") if drive_res else att.get("file_id"))
                drive_dl_url = f"/api/docs/{doc_id}/download" if vnai_file_id else (drive_res.get("downloadUrl") if drive_res else None)

                if vnai_file_id or (drive_url and drive_file_id):
                    att["drive_url"] = drive_url
                    att["drive_file_id"] = drive_file_id
                    if vnai_file_id:
                        att["vnai_file_id"] = vnai_file_id
                        att["vnai_provider_file_id"] = vnai_provider_file_id
                    new_msg.attachment_json = json.dumps(att)
                    # GIẢI PHÓNG DUNG LƯỢNG Ổ CỨNG: Tệp đã đồng bộ thành công lên Cloud Drive
                    if file_disk_path and os.path.exists(file_disk_path):
                        try:
                            os.remove(file_disk_path)
                            file_disk_path = ""
                        except Exception:
                            pass
                    file_b64 = ""
                elif drive_url:
                    att["drive_url"] = drive_url
                    new_msg.attachment_json = json.dumps(att)

                existing_doc = db.query(DBDocument).filter(DBDocument.doc_id == doc_id).first()
                if not existing_doc:
                    db.add(DBDocument(
                        doc_id=doc_id,
                        title=file_title,
                        file_type=att.get("file_type", "pdf"),
                        file_size=att.get("file_size", "1.5 MB"),
                        mime_type=mime_type,
                        file_base64=file_b64,
                        file_path=file_disk_path,
                        drive_file_id=drive_file_id,
                        drive_url=drive_url,
                        drive_download_url=drive_dl_url,
                        vnai_file_id=vnai_file_id,
                        vnai_provider_file_id=vnai_provider_file_id,
                        uploader_name=req.sender_name,
                        uploader_email=email,
                        subject=room.subject or "Chuyên đề chung",
                        room_id=room_id
                    ))
                else:
                    if file_b64:
                        existing_doc.file_base64 = file_b64
                    if file_disk_path:
                        existing_doc.file_path = file_disk_path
                    if drive_url:
                        existing_doc.drive_url = drive_url
                    if drive_file_id:
                        existing_doc.drive_file_id = drive_file_id
                    if drive_dl_url:
                        existing_doc.drive_download_url = drive_dl_url
                    if vnai_file_id:
                        existing_doc.vnai_file_id = vnai_file_id
                    if vnai_provider_file_id:
                        existing_doc.vnai_provider_file_id = vnai_provider_file_id

        db.commit()

        # Broadcast realtime tin nhắn mới đến toàn bộ thành viên trong phòng chat
        try:
            msg_payload = {
                "id": msg_id,
                "room_id": room_id,
                "sender_email": email,
                "sender_name": req.sender_name,
                "sender_role": req.sender_role or "Thành viên",
                "sender_avatar": req.sender_avatar or "",
                "text": req.text or "",
                "attachment": json.loads(new_msg.attachment_json) if new_msg.attachment_json else None,
                "reply_to": json.loads(new_msg.reply_to_json) if new_msg.reply_to_json else None,
                "is_pinned": False,
                "reactions": [],
                "created_at": to_iso_utc(new_msg.created_at)
            }
            room_members = json.loads(room.members_json or "[]")
            target_member_emails = [m.get("email", "").strip().lower() for m in room_members if m.get("email")]
            # Thêm người gửi vào danh sách thành viên nếu chưa có
            if email and email not in target_member_emails:
                target_member_emails.append(email)

            await ws_manager.broadcast_chat_message(
                room_id=room_id,
                room_type=room.type or "",
                member_emails=target_member_emails,
                data={
                    "type": "new_message",
                    "room_id": room_id,
                    "message": msg_payload
                }
            )
        except Exception as ws_ex:
            print(f"[WS Send Message Broadcast Error]: {ws_ex}")

        return {
            "status": "success",
            "id": msg_id,
            "message_id": msg_id,
            "created_at": to_iso_utc(new_msg.created_at)
        }
    finally:
        db.close()

# ----------------- BẠN BÈ & CHAT RIÊNG 1-1 (FRIENDS & DIRECT CHAT) -----------------
@app.get("/api/friends")
def get_friends(user_email: str = Query(...)):
    email = user_email.strip().lower()
    db = SessionLocal()
    try:
        friendships = db.query(DBFriendship).filter(
            (DBFriendship.requester_email == email) | (DBFriendship.receiver_email == email)
        ).all()

        friends_list = []
        pending_received = []
        pending_sent = []
        blocked_list = []

        for f in friendships:
            is_requester = f.requester_email.lower() == email
            other_email = f.receiver_email.lower() if is_requester else f.requester_email.lower()
            other_user = db.query(DBUser).filter(DBUser.email == other_email).first()
            if not other_user:
                continue

            user_obj = {
                "id": f.id,
                "email": other_user.email,
                "name": other_user.name,
                "avatar": other_user.avatar or f"https://api.dicebear.com/7.x/avataaars/svg?seed={other_user.email}",
                "role_title": other_user.role_title or "Thành viên học tập",
                "sub_info": other_user.sub_info or "",
                "direct_room_id": f.direct_room_id,
                "created_at": to_iso_utc(f.created_at)
            }

            if f.status == "accepted":
                user_obj["is_blocked"] = bool(f.blocked_by)
                user_obj["blocked_by"] = f.blocked_by
                friends_list.append(user_obj)
            elif f.status == "pending":
                if is_requester:
                    pending_sent.append(user_obj)
                else:
                    pending_received.append(user_obj)
            elif f.status == "blocked":
                user_obj["blocked_by"] = f.blocked_by
                blocked_list.append(user_obj)

        return {
            "status": "success",
            "friends": friends_list,
            "pending_received": pending_received,
            "pending_sent": pending_sent,
            "blocked": blocked_list
        }
    finally:
        db.close()

@app.post("/api/friends/request")
def send_friend_request(req: FriendRequest):
    req_email = req.requester_email.strip().lower()
    rec_email = (req.receiver_email or req.target_email or "").strip().lower()
    if not rec_email:
        raise HTTPException(status_code=400, detail="Thiếu thông tin người nhận kết bạn.")

    if req_email == rec_email:
        raise HTTPException(status_code=400, detail="Không thể gửi lời mời kết bạn cho chính mình.")

    db = SessionLocal()
    try:
        user_req = db.query(DBUser).filter(DBUser.email == req_email).first()
        user_rec = db.query(DBUser).filter(DBUser.email == rec_email).first()
        if not user_req or not user_rec:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản người dùng.")

        existing = db.query(DBFriendship).filter(
            ((DBFriendship.requester_email == req_email) & (DBFriendship.receiver_email == rec_email)) |
            ((DBFriendship.requester_email == rec_email) & (DBFriendship.receiver_email == req_email))
        ).first()

        if existing:
            if existing.status == "accepted":
                return {"status": "already_friends", "message": "Hai bạn đã là bạn bè của nhau rồi!"}
            if existing.status == "blocked":
                raise HTTPException(status_code=403, detail="Không thể gửi lời mời kết bạn đến người dùng này.")
            if existing.status == "pending":
                if existing.requester_email.lower() == rec_email:
                    # Người kia đã gửi lời mời trước đó -> Tự động chấp nhận luôn!
                    existing.status = "accepted"
                    emails = sorted([req_email, rec_email])
                    dm_room_id = f"dm_{emails[0]}__{emails[1]}"
                    existing.direct_room_id = dm_room_id
                    
                    room = db.query(DBRoom).filter(DBRoom.id == dm_room_id).first()
                    if not room:
                        db.add(DBRoom(
                            id=dm_room_id,
                            name=f"{user_req.name} & {user_rec.name}",
                            code=f"DM_{abs(hash(dm_room_id)) % 10000000000:010d}",
                            type="direct",
                            subject="Trò chuyện riêng tư",
                            owner_email=req_email,
                            members_json=json.dumps([{"email": req_email, "role": "member"}, {"email": rec_email, "role": "member"}]),
                            pending_json="[]"
                        ))
                    db.commit()
                    return {"status": "accepted", "message": "Cả hai bạn cùng gửi lời mời, đã tự động kết bạn thành công!", "room_id": dm_room_id}
                else:
                    return {"status": "pending", "message": "Lời mời kết bạn đã được gửi trước đó, đang chờ đối phương đồng ý."}

        # Tạo mới
        fs_id = f"fs_{int(time.time()*1000)}"
        new_fs = DBFriendship(
            id=fs_id,
            requester_email=req_email,
            receiver_email=rec_email,
            status="pending"
        )
        db.add(new_fs)
        db.commit()
        return {"status": "success", "message": f"Đã gửi lời mời kết bạn thành công đến {user_rec.name}!"}
    finally:
        db.close()

@app.post("/api/friends/respond")
def respond_friend_request(req: FriendResponse):
    user_e = req.user_email.strip().lower()
    req_e = req.requester_email.strip().lower()
    action = req.action.lower()

    db = SessionLocal()
    try:
        fs = db.query(DBFriendship).filter(
            (DBFriendship.requester_email == req_e) & (DBFriendship.receiver_email == user_e)
        ).first()

        if not fs:
            raise HTTPException(status_code=404, detail="Không tìm thấy lời mời kết bạn này.")

        if action == "accept":
            fs.status = "accepted"
            emails = sorted([user_e, req_e])
            dm_room_id = f"dm_{emails[0]}__{emails[1]}"
            fs.direct_room_id = dm_room_id

            u1 = db.query(DBUser).filter(DBUser.email == user_e).first()
            u2 = db.query(DBUser).filter(DBUser.email == req_e).first()

            room = db.query(DBRoom).filter(DBRoom.id == dm_room_id).first()
            if not room:
                db.add(DBRoom(
                    id=dm_room_id,
                    name=f"{(u1.name if u1 else user_e)} & {(u2.name if u2 else req_e)}",
                    code=f"DM_{abs(hash(dm_room_id)) % 10000000000:010d}",
                    type="direct",
                    subject="Trò chuyện riêng tư",
                    owner_email=req_e,
                    members_json=json.dumps([{"email": user_e, "role": "member"}, {"email": req_e, "role": "member"}]),
                    pending_json="[]"
                ))
            db.commit()
            return {"status": "success", "message": "Đã chấp nhận kết bạn! Hai bạn đã có thể nhắn tin riêng.", "room_id": dm_room_id}
        else:
            db.delete(fs)
            db.commit()
            return {"status": "success", "message": "Đã từ chối lời mời kết bạn."}
    finally:
        db.close()

@app.get("/api/users/find")
def find_user(email: str = Query(...), current_user: str = Query(...)):
    t_email = email.strip().lower()
    c_email = current_user.strip().lower()
    db = SessionLocal()
    try:
        user = db.query(DBUser).filter(DBUser.email == t_email).first()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng với Gmail này.")

        if t_email == c_email:
            return {
                "email": user.email,
                "name": user.name,
                "avatar": user.avatar or f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.email}",
                "role_title": user.role_title,
                "sub_info": user.sub_info,
                "friendship_status": "self"
            }

        fs = db.query(DBFriendship).filter(
            ((DBFriendship.requester_email == c_email) & (DBFriendship.receiver_email == t_email)) |
            ((DBFriendship.requester_email == t_email) & (DBFriendship.receiver_email == c_email))
        ).first()

        status_str = "none"
        direct_room_id = None
        if fs:
            if fs.status == "accepted":
                status_str = "accepted"
                direct_room_id = fs.direct_room_id
            elif fs.status == "pending":
                if fs.requester_email.lower() == c_email:
                    status_str = "pending_sent"
                else:
                    status_str = "pending_received"
            elif fs.status == "blocked":
                status_str = "blocked" if (fs.blocked_by or "").lower() == c_email else "blocked_by_them"

        return {
            "email": user.email,
            "name": user.name,
            "avatar": user.avatar or f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.email}",
            "role_title": user.role_title,
            "sub_info": user.sub_info,
            "friendship_status": status_str,
            "direct_room_id": direct_room_id
        }
    finally:
        db.close()

@app.post("/api/direct-chat/open")
def open_direct_chat(req: DirectChatOpenRequest):
    u1 = req.user_email.strip().lower()
    u2 = req.target_email.strip().lower()
    db = SessionLocal()
    try:
        fs = db.query(DBFriendship).filter(
            ((DBFriendship.requester_email == u1) & (DBFriendship.receiver_email == u2)) |
            ((DBFriendship.requester_email == u2) & (DBFriendship.receiver_email == u1))
        ).first()

        if not fs or fs.status != "accepted":
            raise HTTPException(status_code=403, detail="Bạn và người này chưa kết bạn. Chỉ bạn bè mới có thể mở cuộc trò chuyện riêng!")

        emails = sorted([u1, u2])
        dm_room_id = f"dm_{emails[0]}__{emails[1]}"

        # Ensure room exists
        room = db.query(DBRoom).filter(DBRoom.id == dm_room_id).first()
        if not room:
            user1 = db.query(DBUser).filter(DBUser.email == u1).first()
            user2 = db.query(DBUser).filter(DBUser.email == u2).first()
            room = DBRoom(
                id=dm_room_id,
                name=f"{(user1.name if user1 else u1)} & {(user2.name if user2 else u2)}",
                code=f"DM_{abs(hash(dm_room_id)) % 10000000000:010d}",
                type="direct",
                subject="Trò chuyện riêng tư",
                owner_email=u1,
                members_json=json.dumps([{"email": u1, "role": "member"}, {"email": u2, "role": "member"}]),
                pending_json="[]"
            )
            db.add(room)
            fs.direct_room_id = dm_room_id
            db.commit()

        return {"status": "success", "room_id": dm_room_id}
    finally:
        db.close()

@app.post("/api/direct-chat/block")
def block_user(req: BlockUserRequest):
    u_e = req.user_email.strip().lower()
    t_e = req.target_email.strip().lower()
    db = SessionLocal()
    try:
        fs = db.query(DBFriendship).filter(
            ((DBFriendship.requester_email == u_e) & (DBFriendship.receiver_email == t_e)) |
            ((DBFriendship.requester_email == t_e) & (DBFriendship.receiver_email == u_e))
        ).first()

        if fs:
            fs.status = "blocked"
            fs.blocked_by = u_e

        emails = sorted([u_e, t_e])
        dm_room_id = f"dm_{emails[0]}__{emails[1]}"
        room = db.query(DBRoom).filter(DBRoom.id == dm_room_id).first()
        if room:
            room.blocked_by = u_e

        db.commit()
        return {"status": "success", "message": f"Đã chặn người dùng {t_e}."}
    finally:
        db.close()

@app.post("/api/direct-chat/unblock")
def unblock_user(req: BlockUserRequest):
    u_e = req.user_email.strip().lower()
    t_e = req.target_email.strip().lower()
    db = SessionLocal()
    try:
        fs = db.query(DBFriendship).filter(
            ((DBFriendship.requester_email == u_e) & (DBFriendship.receiver_email == t_e)) |
            ((DBFriendship.requester_email == t_e) & (DBFriendship.receiver_email == u_e))
        ).first()

        if fs and fs.blocked_by and fs.blocked_by.lower() == u_e:
            fs.status = "accepted"
            fs.blocked_by = None

        emails = sorted([u_e, t_e])
        dm_room_id = f"dm_{emails[0]}__{emails[1]}"
        room = db.query(DBRoom).filter(DBRoom.id == dm_room_id).first()
        if room and room.blocked_by and room.blocked_by.lower() == u_e:
            room.blocked_by = None

        db.commit()
        return {"status": "success", "message": f"Đã bỏ chặn người dùng {t_e}."}
    finally:
        db.close()

@app.delete("/api/direct-chat/{room_id}/clear")
def clear_direct_chat(room_id: str, user_email: str = Query(...)):
    u_e = user_email.strip().lower()
    db = SessionLocal()
    try:
        room = db.query(DBRoom).filter(DBRoom.id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Không tìm thấy cuộc trò chuyện.")
        members = json.loads(room.members_json or "[]")
        if not any(m.get("email", "").lower() == u_e for m in members):
            raise HTTPException(status_code=403, detail="Bạn không phải thành viên của cuộc trò chuyện này.")

        # Xóa các tệp đính kèm trên server và Google Drive
        messages_with_att = db.query(DBMessage).filter(DBMessage.room_id == room_id, DBMessage.attachment_json.isnot(None)).all()
        doc_ids = []
        for m in messages_with_att:
            try:
                att = json.loads(m.attachment_json)
                if "doc_id" in att:
                    doc_ids.append(att["doc_id"])
                    doc = db.query(DBDocument).filter(DBDocument.doc_id == att["doc_id"]).first()
                    if doc and doc.file_path and os.path.exists(doc.file_path):
                        try:
                            os.remove(doc.file_path)
                        except Exception:
                            pass
            except Exception:
                pass
        if doc_ids:
            delete_file_from_drive(room_id=room_id, doc_ids=doc_ids)
            db.query(DBDocument).filter(DBDocument.doc_id.in_(doc_ids)).delete(synchronize_session=False)

        db.query(DBMessage).filter(DBMessage.room_id == room_id).delete()
        db.commit()
        return {"status": "success", "message": "Đã xóa toàn bộ lịch sử trò chuyện và đồng bộ dọn tệp đính kèm."}
    finally:
        db.close()

def make_file_download_response(
    content: bytes,
    filename: str,
    raw_mime: Optional[str],
    inline_requested: bool = False
) -> Response:
    """Tạo phản hồi tải tệp nhị phân an toàn, ép attachment nếu tệp có nguy cơ Stored XSS (Vá Lỗ hổng 5)"""
    is_safe = is_safe_for_inline(raw_mime, filename)
    disp = "inline" if (inline_requested and is_safe) else "attachment"
    media_type = (raw_mime or "application/octet-stream") if is_safe else "application/octet-stream"
    safe_title = (filename or "file").replace('"', '\\"')
    encoded_title = urllib.parse.quote(filename or "file")
    headers = {
        "Content-Disposition": f'{disp}; filename="{safe_title}"; filename*=UTF-8\'\'{encoded_title}',
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Expose-Headers": "Content-Disposition"
    }
    return Response(content=content, media_type=media_type, headers=headers)

def make_file_path_response(
    path: str,
    filename: str,
    raw_mime: Optional[str],
    inline_requested: bool = False
) -> FileResponse:
    """Tạo FileResponse an toàn từ tệp trên ổ đĩa, kèm header nosniff (Vá Lỗ hổng 5)"""
    is_safe = is_safe_for_inline(raw_mime, filename)
    disp = "inline" if (inline_requested and is_safe) else "attachment"
    media_type = (raw_mime or "application/octet-stream") if is_safe else "application/octet-stream"
    safe_title = (filename or "file").replace('"', '\\"')
    encoded_title = urllib.parse.quote(filename or "file")
    headers = {
        "Content-Disposition": f'{disp}; filename="{safe_title}"; filename*=UTF-8\'\'{encoded_title}',
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Expose-Headers": "Content-Disposition"
    }
    return FileResponse(path=path, media_type=media_type, headers=headers)

@app.get("/api/docs/{doc_id}/download")
def download_doc(doc_id: str, inline: Optional[bool] = False):
    """
    Tải tệp trực tiếp thông qua EduShare Backend (Proxy / Stream Binary).
    Đảm bảo 100% người dùng tải file thẳng về máy tính, KHÔNG BAO GIỜ bị chuyển hướng
    hoặc mở giao diện trang web EduShare / HCDrive bên thứ 3.
    Áp dụng kiểm duyệt an ninh Stored XSS và nosniff (Vá Lỗ hổng 5).
    """
    db = SessionLocal()
    try:
        doc = db.query(DBDocument).filter(DBDocument.doc_id == doc_id).first()
        if not doc:
            # 1. Tra cứu trong bảng bài viết diễn đàn DBPost (tài liệu đăng trên bảng tin)
            post = db.query(DBPost).filter(DBPost.attachment_json.like(f'%"{doc_id}"%')).first()
            if post and post.attachment_json:
                try:
                    att = json.loads(post.attachment_json)
                    att_vnai_id = att.get("vnai_file_id") or att.get("drive_file_id")
                    att_provider_id = att.get("vnai_provider_file_id")
                    att_title = att.get("title", "tai_lieu_dien_dan")
                    att_mime = att.get("mime_type", "application/octet-stream")

                    if att_vnai_id:
                        res = fetch_file_binary(file_id=att_vnai_id, provider_file_id=att_provider_id)
                        if res:
                            raw_bytes, fetched_mime = res
                            return make_file_download_response(
                                content=raw_bytes,
                                filename=att_title,
                                raw_mime=fetched_mime or att_mime,
                                inline_requested=bool(inline)
                            )

                    b64_str = att.get("file_base64", "")
                    if b64_str:
                        if "," in b64_str:
                            b64_str = b64_str.split(",", 1)[1]
                        raw_bytes = base64.b64decode(b64_str)
                        return make_file_download_response(
                            content=raw_bytes,
                            filename=att_title,
                            raw_mime=att_mime,
                            inline_requested=bool(inline)
                        )
                except Exception as ex:
                    print(f"[Download from DBPost err] {ex}")

            # 2. Tra cứu trong bảng tin nhắn DBMessage (ảnh hoặc file gửi qua chat)
            msg = db.query(DBMessage).filter(DBMessage.attachment_json.like(f'%"{doc_id}"%')).first()
            if msg and msg.attachment_json:
                try:
                    att = json.loads(msg.attachment_json)
                    att_vnai_id = att.get("vnai_file_id") or att.get("drive_file_id")
                    att_provider_id = att.get("vnai_provider_file_id")
                    att_title = att.get("title", "file")
                    att_mime = att.get("mime_type", "application/octet-stream")

                    # Thử lấy từ VNAI Cloud Drive nếu có ID
                    if att_vnai_id:
                        res = fetch_file_binary(file_id=att_vnai_id, provider_file_id=att_provider_id)
                        if res:
                            raw_bytes, fetched_mime = res
                            return make_file_download_response(
                                content=raw_bytes,
                                filename=att_title,
                                raw_mime=fetched_mime or att_mime,
                                inline_requested=bool(inline)
                            )

                    b64_str = att.get("file_base64", "")
                    if b64_str:
                        if "," in b64_str:
                            b64_str = b64_str.split(",", 1)[1]
                        raw_bytes = base64.b64decode(b64_str)
                        return make_file_download_response(
                            content=raw_bytes,
                            filename=att_title,
                            raw_mime=att_mime,
                            inline_requested=bool(inline)
                        )
                except Exception as ex:
                    print(f"[Download from DBMessage err] {ex}")

            # 3. Tra cứu file vật lý trong thư mục uploads/
            if os.path.exists("uploads"):
                for fname in os.listdir("uploads"):
                    if fname.startswith(f"{doc_id}_"):
                        fpath = os.path.join("uploads", fname)
                        orig_title = fname.split("_", 1)[1] if "_" in fname else fname
                        return make_file_path_response(
                            path=fpath,
                            filename=orig_title,
                            raw_mime=None,
                            inline_requested=bool(inline)
                        )

            raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu yêu cầu.")

        # 1. TẢI TRỰC TIẾP TỪ CLOUD DRIVE (drive.vn-ai.cloud / HCDrive):
        target_cloud_id = doc.vnai_file_id or doc.drive_file_id
        if target_cloud_id:
            cloud_res = fetch_file_binary(
                file_id=target_cloud_id,
                provider_file_id=doc.vnai_provider_file_id
            )
            if cloud_res:
                content_bytes, mime = cloud_res
                return make_file_download_response(
                    content=content_bytes,
                    filename=doc.title or "file",
                    raw_mime=mime or doc.mime_type or "application/octet-stream",
                    inline_requested=bool(inline)
                )

        # 2. Nếu có file lưu trữ vật lý trên máy chủ
        target_path = doc.file_path if (doc.file_path and os.path.exists(doc.file_path)) else None
        if not target_path and os.path.exists("uploads"):
            for fname in os.listdir("uploads"):
                if fname.startswith(f"{doc_id}_"):
                    target_path = os.path.join("uploads", fname)
                    break
        if target_path and os.path.exists(target_path):
            return make_file_path_response(
                path=target_path,
                filename=doc.title or "file",
                raw_mime=doc.mime_type or "application/octet-stream",
                inline_requested=bool(inline)
            )

        # 3. Nếu có dữ liệu base64 trong CSDL
        if doc.file_base64:
            b64_str = doc.file_base64
            if "," in b64_str:
                b64_str = b64_str.split(",", 1)[1]
            try:
                raw_bytes = base64.b64decode(b64_str)
                return make_file_download_response(
                    content=raw_bytes,
                    filename=doc.title or "file",
                    raw_mime=doc.mime_type or "application/octet-stream",
                    inline_requested=bool(inline)
                )
            except Exception as e:
                print(f"[Download base64 decode err] {e}")

        # 4. Fallback tệp PDF chuẩn hiển thị thông báo
        minimal_pdf = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n"
        return make_file_download_response(
            content=minimal_pdf,
            filename=(doc.title or "file") + ".pdf",
            raw_mime="application/pdf",
            inline_requested=bool(inline)
        )
    finally:
        db.close()

# ----------------- FORUM / POSTS -----------------
@app.get("/api/posts")
def get_posts(subject: Optional[str] = None, search: Optional[str] = None):
    db = SessionLocal()
    try:
        q = db.query(DBPost).order_by(DBPost.created_at.desc())
        if subject and subject != "all":
            q = q.filter(DBPost.subject == subject)
        if search:
            s = f"%{search.strip()}%"
            q = q.filter(DBPost.content.like(s) | DBPost.author_name.like(s))

        posts = q.all()
        # Ánh xạ author_id nếu bài cũ chưa có
        user_id_map = {}
        for p in posts:
            if not p.author_id and p.author_email:
                em = p.author_email.lower().strip()
                if em not in user_id_map:
                    u = db.query(DBUser).filter(DBUser.email == em).first()
                    user_id_map[em] = u.id if u else em

        return [
            {
                "id": p.id,
                "author_id": p.author_id or user_id_map.get(p.author_email.lower().strip(), p.author_email),
                "authorId": p.author_id or user_id_map.get(p.author_email.lower().strip(), p.author_email),
                "author_email": p.author_email,
                "author_name": p.author_name,
                "author_role_title": p.author_role_title,
                "avatar": p.avatar,
                "subject": p.subject,
                "content": p.content,
                "attachment": json.loads(p.attachment_json) if p.attachment_json else None,
                "likes": json.loads(p.likes_json or "[]"),
                "comments": json.loads(p.comments_json or "[]"),
                "shares_count": p.shares_count or 0,
                "created_at": to_iso_utc(p.created_at)
            }
            for p in posts
        ]
    finally:
        db.close()

@app.get("/api/posts/{post_id}")
def get_single_post(post_id: str):
    db = SessionLocal()
    try:
        p = db.query(DBPost).filter(DBPost.id == post_id).first()
        if not p:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài viết.")

        author_id = p.author_id
        if not author_id and p.author_email:
            u = db.query(DBUser).filter(DBUser.email == p.author_email.lower().strip()).first()
            author_id = u.id if u else p.author_email

        return {
            "id": p.id,
            "author_id": author_id,
            "authorId": author_id,
            "author_email": p.author_email,
            "author_name": p.author_name,
            "author_role_title": p.author_role_title,
            "avatar": p.avatar,
            "subject": p.subject,
            "content": p.content,
            "attachment": json.loads(p.attachment_json) if p.attachment_json else None,
            "likes": json.loads(p.likes_json or "[]"),
            "comments": json.loads(p.comments_json or "[]"),
            "shares_count": p.shares_count or 0,
            "created_at": to_iso_utc(p.created_at)
        }
    finally:
        db.close()

@app.post("/api/posts")
async def create_post(req: CreatePostRequest):
    db = SessionLocal()
    try:
        post_id = f"post_{int(time.time()*1000)}"
        attach_json = json.dumps(req.attachment) if req.attachment else None

        # Tra cứu hoặc gán author_id
        author_id = (req.author_id or "").strip()
        if not author_id:
            u_author = db.query(DBUser).filter(DBUser.email == req.author_email.lower().strip()).first()
            if u_author:
                author_id = u_author.id

        new_post = DBPost(
            id=post_id,
            author_id=author_id,
            author_email=req.author_email.lower(),
            author_name=req.author_name,
            author_role_title=req.author_role_title or "Thành viên",
            avatar=req.avatar or "",
            subject=req.subject or "Chuyên đề chung",
            content=req.content,
            attachment_json=attach_json,
            likes_json="[]",
            comments_json="[]",
            shares_count=0
        )
        db.add(new_post)

        if req.attachment and "doc_id" in req.attachment:
            att = req.attachment
            doc_id = att["doc_id"]
            file_title = att.get("title", "Tài liệu diễn đàn")
            file_b64 = att.get("file_base64", "")
            mime_type = att.get("mime_type", "application/pdf")
            vnai_file_id = None
            vnai_provider_file_id = None
            file_bytes = b""
            file_disk_path = ""

            if file_b64 and "," in file_b64:
                try:
                    clean_b64 = file_b64.split(",", 1)[1]
                    file_bytes = base64.b64decode(clean_b64)
                except Exception as ex:
                    print(f"[Post Attachment Decode Error]: {ex}")
            elif file_b64:
                try:
                    file_bytes = base64.b64decode(file_b64)
                except Exception:
                    pass

            if file_bytes:
                try:
                    os.makedirs("uploads", exist_ok=True)
                    file_disk_path = os.path.join("uploads", f"{doc_id}_{file_title}")
                    with open(file_disk_path, "wb") as f_out:
                        f_out.write(file_bytes)
                except Exception as ex:
                    print(f"[Post Attachment Write Disk Error]: {ex}")

                try:
                    vnai_res = upload_to_vnai_drive(
                        file_bytes=file_bytes,
                        filename=file_title,
                        mime_type=mime_type
                    )
                    if vnai_res:
                        vnai_file_id = vnai_res.get("file_id")
                        vnai_provider_file_id = vnai_res.get("provider_file_id")
                        att["vnai_file_id"] = vnai_file_id
                        att["vnai_provider_file_id"] = vnai_provider_file_id
                        att["drive_file_id"] = vnai_file_id
                except Exception as vex:
                    print(f"[Post Attachment Upload Error]: {vex}")

            att["drive_url"] = f"/api/docs/{doc_id}/download"
            new_post.attachment_json = json.dumps(att)

            existing_doc = db.query(DBDocument).filter(DBDocument.doc_id == doc_id).first()
            if not existing_doc:
                db.add(DBDocument(
                    doc_id=doc_id,
                    title=file_title,
                    file_type=att.get("file_type", "pdf"),
                    file_size=att.get("file_size", "1.5 MB"),
                    mime_type=mime_type,
                    file_base64=file_b64 if not vnai_file_id else "",
                    file_path=file_disk_path,
                    vnai_file_id=vnai_file_id,
                    vnai_provider_file_id=vnai_provider_file_id,
                    drive_file_id=vnai_file_id,
                    drive_url=f"/api/docs/{doc_id}/download",
                    drive_download_url=f"/api/docs/{doc_id}/download",
                    uploader_name=req.author_name,
                    uploader_email=req.author_email.lower(),
                    subject=req.subject or "Chuyên đề chung",
                    room_id="forum"
                ))
            else:
                existing_doc.file_path = file_disk_path
                existing_doc.drive_url = f"/api/docs/{doc_id}/download"
                existing_doc.drive_download_url = f"/api/docs/{doc_id}/download"
                if vnai_file_id:
                    existing_doc.vnai_file_id = vnai_file_id
                    existing_doc.vnai_provider_file_id = vnai_provider_file_id
                    existing_doc.drive_file_id = vnai_file_id
                if file_b64 and not vnai_file_id:
                    existing_doc.file_base64 = file_b64

        db.commit()

        # Broadcast realtime bài viết mới đến tất cả người dùng
        try:
            await ws_manager.broadcast_to_all({
                "type": "new_post",
                "post": {
                    "id": post_id,
                    "author_id": author_id,
                    "authorId": author_id,
                    "author_email": req.author_email.lower(),
                    "author_name": req.author_name,
                    "author_role_title": req.author_role_title or "Thành viên",
                    "avatar": req.avatar or "",
                    "subject": req.subject or "Chuyên đề chung",
                    "content": req.content,
                    "attachment": json.loads(new_post.attachment_json) if new_post.attachment_json else None,
                    "likes": [],
                    "comments": [],
                    "shares_count": 0,
                    "created_at": to_iso_utc(new_post.created_at)
                }
            })
        except Exception as ws_ex:
            print(f"[WS Create Post Broadcast Error]: {ws_ex}")

        return {
            "status": "success",
            "post_id": post_id,
            "id": post_id,
            "author_id": author_id,
            "authorId": author_id,
            "created_at": to_iso_utc(new_post.created_at)
        }
    finally:
        db.close()

@app.post("/api/posts/{post_id}/like")
def toggle_like_post(post_id: str, req: LikePostRequest):
    email = req.user_email.strip().lower()
    db = SessionLocal()
    try:
        post = db.query(DBPost).filter(DBPost.id == post_id).first()
        if not post:
            raise HTTPException(status_code=404, detail="Bài viết không tồn tại.")

        likes = json.loads(post.likes_json or "[]")
        if email in likes:
            likes.remove(email)
            liked = False
        else:
            likes.append(email)
            liked = True

        post.likes_json = json.dumps(likes)
        db.commit()
        return {"status": "success", "liked": liked, "likes_count": len(likes)}
    finally:
        db.close()

@app.post("/api/posts/{post_id}/comments")
def add_comment_post(post_id: str, req: CommentPostRequest):
    db = SessionLocal()
    try:
        post = db.query(DBPost).filter(DBPost.id == post_id).first()
        if not post:
            raise HTTPException(status_code=404, detail="Bài viết không tồn tại.")

        comments = json.loads(post.comments_json or "[]")
        new_cmt = {
            "id": f"cmt_{int(time.time()*1000)}",
            "author_email": req.author_email.lower(),
            "author_name": req.author_name,
            "avatar": req.avatar or "",
            "content": req.content,
            "time": "Vừa xong"
        }
        comments.append(new_cmt)
        post.comments_json = json.dumps(comments)
        db.commit()
        return {"status": "success", "comment": new_cmt, "comments_count": len(comments)}
    finally:
        db.close()

@app.post("/api/posts/{post_id}/share")
async def share_post(post_id: str, req: SharePostRequest):
    email = req.user_email.strip().lower()
    target_room_id = req.target_room_id.strip()
    db = SessionLocal()
    try:
        post = db.query(DBPost).filter(DBPost.id == post_id).first()
        if not post:
            raise HTTPException(status_code=404, detail="Bài viết không tồn tại.")

        # Tăng lượt chia sẻ
        post.shares_count = (post.shares_count or 0) + 1

        # Gửi thẻ chia sẻ vào phòng chat đích
        user = db.query(DBUser).filter(DBUser.email == email).first()
        uname = user.name if user else email

        snippet = (post.content[:140] + "...") if len(post.content) > 140 else post.content
        share_msg = DBMessage(
            id=f"msg_{int(time.time()*1000)}",
            room_id=target_room_id,
            sender_email=email,
            sender_name=uname,
            sender_role="Thành viên",
            sender_avatar=user.avatar if user else "",
            text=f"📢 **Chia sẻ từ Diễn Đàn [{post.subject}]:**\n\n_{snippet}_\n\n👉 *Bấm vào Bảng Tin để xem toàn bộ bài viết.*",
            attachment_json=post.attachment_json
        )
        db.add(share_msg)
        db.commit()

        # Broadcast realtime tin nhắn chia sẻ vào phòng đích
        try:
            await ws_manager.broadcast_to_room(target_room_id, {
                "type": "new_message",
                "room_id": target_room_id,
                "message": {
                    "id": share_msg.id,
                    "room_id": target_room_id,
                    "sender_email": email,
                    "sender_name": uname,
                    "sender_role": "Thành viên",
                    "sender_avatar": user.avatar if user else "",
                    "text": share_msg.text,
                    "attachment": json.loads(post.attachment_json) if post.attachment_json else None,
                    "reply_to": None,
                    "is_pinned": False,
                    "reactions": [],
                    "created_at": to_iso_utc(share_msg.created_at)
                }
            })
        except Exception as ws_ex:
            print(f"[WS Share Broadcast Error]: {ws_ex}")

        return {"status": "success", "shares_count": post.shares_count}
    finally:
        db.close()

@app.delete("/api/posts/{post_id}")
@app.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    request: Request,
    user_id: Optional[str] = Query(None),
    author_id: Optional[str] = Query(None),
    user_email: Optional[str] = Query(None)
):
    db = SessionLocal()
    try:
        post = db.query(DBPost).filter(DBPost.id == post_id).first()
        if not post:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài viết cần xóa.")

        # Kiểm tra quyền sở hữu bài viết qua Bearer Token (Vá Lỗ hổng 4: BOLA / IDOR)
        auth_user = get_auth_user(request, db)
        if not auth_user:
            raise HTTPException(status_code=401, detail="Phiên làm việc hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.")

        is_author = False
        if auth_user.is_system_admin:
            is_author = True
        elif post.author_id and auth_user.id == post.author_id:
            is_author = True
        elif (post.author_email or "").strip().lower() == auth_user.email.lower():
            is_author = True

        if not is_author:
            raise HTTPException(status_code=403, detail="Bạn không có quyền xóa bài viết này.")

        # Xóa các tệp đính kèm gắn với bài viết trên server và Google Drive
        if post.attachment_json:
            try:
                att = json.loads(post.attachment_json)
                doc_id = att.get("doc_id")
                if doc_id:
                    doc = db.query(DBDocument).filter(DBDocument.doc_id == doc_id).first()
                    if doc:
                        if doc.file_path and os.path.exists(doc.file_path):
                            try:
                                os.remove(doc.file_path)
                            except Exception:
                                pass
                        delete_file_from_drive(
                            file_id=doc.drive_file_id,
                            doc_id=doc_id,
                            file_name=att.get("title")
                        )
                        db.delete(doc)
            except Exception as ex:
                print(f"[Delete post attachment cleanup err] {ex}")

        db.delete(post)
        db.commit()

        # Broadcast realtime sự kiện xóa bài viết đến tất cả client
        try:
            await ws_manager.broadcast_to_all({
                "type": "post_deleted",
                "post_id": post_id
            })
        except Exception as ws_ex:
            print(f"[WS Delete Post Broadcast Error]: {ws_ex}")

        return {"status": "success", "message": "Đã xóa bài viết khỏi bảng tin thành công."}
    finally:
        db.close()

# ----------------- DOCUMENTS / VAULT -----------------
@app.get("/api/docs")
def list_documents(subject: Optional[str] = None, search: Optional[str] = None):
    db = SessionLocal()
    try:
        q = db.query(DBDocument).order_by(DBDocument.created_at.desc())
        if subject and subject != "all":
            q = q.filter(DBDocument.subject == subject)
        if search:
            s = f"%{search.strip()}%"
            q = q.filter(DBDocument.title.like(s) | DBDocument.uploader_name.like(s))

        docs = q.all()
        return [
            {
                "doc_id": d.doc_id,
                "title": d.title,
                "file_type": d.file_type,
                "file_size": d.file_size,
                "mime_type": d.mime_type,
                "drive_url": d.drive_url,
                "uploader_name": d.uploader_name,
                "uploader_email": d.uploader_email,
                "subject": d.subject,
                "created_at": to_iso_utc(d.created_at)
            }
            for d in docs
        ]
    finally:
        db.close()

@app.post("/api/docs")
def save_document(doc: DocumentCreate):
    db = SessionLocal()
    try:
        vnai_file_id = None
        vnai_provider_file_id = None
        file_bytes = b""
        file_b64 = doc.file_base64 or ""

        if file_b64 and "," in file_b64:
            try:
                clean_b64 = file_b64.split(",", 1)[1]
                file_bytes = base64.b64decode(clean_b64)
            except Exception as ex:
                print(f"[Doc Decode Error]: {ex}")
        elif file_b64:
            try:
                file_bytes = base64.b64decode(file_b64)
            except Exception:
                pass

        if file_bytes:
            try:
                vnai_res = upload_to_vnai_drive(
                    file_bytes=file_bytes,
                    filename=doc.title,
                    mime_type=doc.mime_type or "application/pdf"
                )
                if vnai_res:
                    vnai_file_id = vnai_res.get("file_id")
                    vnai_provider_file_id = vnai_res.get("provider_file_id")
                    file_b64 = ""  # Giải phóng chuỗi base64 trong CSDL
            except Exception as vex:
                print(f"[Doc Vault Upload Error]: {vex}")

        existing = db.query(DBDocument).filter(DBDocument.doc_id == doc.doc_id).first()
        if existing:
            existing.title = doc.title
            existing.file_type = doc.file_type
            existing.file_size = doc.file_size
            existing.mime_type = doc.mime_type
            if file_b64:
                existing.file_base64 = file_b64
            if vnai_file_id:
                existing.vnai_file_id = vnai_file_id
                existing.vnai_provider_file_id = vnai_provider_file_id
                existing.drive_file_id = vnai_file_id
                existing.drive_url = f"/api/docs/{doc.doc_id}/download"
                existing.file_base64 = ""
            existing.uploader_name = doc.uploader_name
            existing.uploader_email = doc.uploader_email
            existing.subject = doc.subject or "Chuyên đề chung"
        else:
            db.add(DBDocument(
                doc_id=doc.doc_id,
                title=doc.title,
                file_type=doc.file_type,
                file_size=doc.file_size,
                mime_type=doc.mime_type,
                file_base64=file_b64,
                vnai_file_id=vnai_file_id,
                vnai_provider_file_id=vnai_provider_file_id,
                drive_file_id=vnai_file_id,
                drive_url=f"/api/docs/{doc.doc_id}/download" if vnai_file_id else None,
                uploader_name=doc.uploader_name,
                uploader_email=doc.uploader_email,
                subject=doc.subject or "Chuyên đề chung",
                room_id=doc.room_id
            ))
        db.commit()
        cache_delete("docs:all")
        return {"status": "success", "doc_id": doc.doc_id}
    finally:
        db.close()

@app.get("/api/docs/{doc_id}")
def get_document(doc_id: str):
    db = SessionLocal()
    try:
        doc = db.query(DBDocument).filter(DBDocument.doc_id == doc_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu trong CSDL.")
        return {
            "doc_id": doc.doc_id,
            "title": doc.title,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "mime_type": doc.mime_type,
            "drive_url": doc.drive_url,
            "file_base64": doc.file_base64,
            "uploader_name": doc.uploader_name,
            "uploader_email": doc.uploader_email,
            "subject": doc.subject,
            "created_at": doc.created_at.isoformat()
        }
    finally:
        db.close()

@app.delete("/api/docs/{doc_id}")
def delete_document(doc_id: str, request: Request, user_email: Optional[str] = None):
    db = SessionLocal()
    try:
        doc = db.query(DBDocument).filter(DBDocument.doc_id == doc_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu cần xóa.")

        # Kiểm tra quyền sở hữu qua Bearer Token (Vá Lỗ hổng 4: BOLA / IDOR)
        auth_user = get_auth_user(request, db)
        if not auth_user:
            raise HTTPException(status_code=401, detail="Phiên làm việc hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.")

        is_allowed = False
        if auth_user.is_system_admin:
            is_allowed = True
        elif doc.uploader_email and auth_user.email.lower() == doc.uploader_email.lower():
            is_allowed = True
        elif doc.room_id:
            room = db.query(DBRoom).filter(DBRoom.id == doc.room_id).first()
            if room:
                members = json.loads(room.members_json or "[]")
                is_allowed = any(m.get("role") == "leader" and m.get("email", "").lower() == auth_user.email.lower() for m in members)

        if not is_allowed:
            raise HTTPException(status_code=403, detail="Bạn không có quyền xóa tài liệu này.")
        if doc.file_path and os.path.exists(doc.file_path):
            try:
                os.remove(doc.file_path)
            except Exception:
                pass
        delete_file_from_drive(file_id=doc.drive_file_id, doc_id=doc_id, file_name=doc.title)
        db.delete(doc)
        db.commit()
        cache_delete("docs:all")
        return {"status": "success", "message": "Đã xóa tài liệu khỏi hệ thống và Google Drive thành công."}
    finally:
        db.close()

# ----------------- CẤU HÌNH GOOGLE DRIVE & DỌN DẸP 30 NGÀY -----------------
class DriveConfigRequest(BaseModel):
    webapp_url: Optional[str] = None
    folder_url: Optional[str] = None

@app.get("/api/config/drive")
def get_drive_config():
    w_url = get_drive_sync_url()
    return {
        "webapp_url": w_url,
        "folder_url": GOOGLE_DRIVE_FOLDER_URL,
        "is_connected": bool(w_url and "script.google.com" in w_url)
    }

@app.post("/api/config/drive")
def set_drive_config(req: DriveConfigRequest):
    global GOOGLE_DRIVE_WEBAPP_URL, GOOGLE_DRIVE_FOLDER_URL
    if req.webapp_url is not None:
        GOOGLE_DRIVE_WEBAPP_URL = req.webapp_url.strip()
    if req.folder_url is not None:
        GOOGLE_DRIVE_FOLDER_URL = req.folder_url.strip()

    try:
        lines = []
        if os.path.exists(".env"):
            with open(".env", "r", encoding="utf-8") as f:
                lines = f.readlines()
        has_w = False
        has_f = False
        new_lines = []
        for l in lines:
            if l.startswith("GOOGLE_DRIVE_WEBAPP_URL="):
                new_lines.append(f"GOOGLE_DRIVE_WEBAPP_URL={GOOGLE_DRIVE_WEBAPP_URL}\n")
                has_w = True
            elif l.startswith("GOOGLE_DRIVE_FOLDER_URL="):
                new_lines.append(f"GOOGLE_DRIVE_FOLDER_URL={GOOGLE_DRIVE_FOLDER_URL}\n")
                has_f = True
            else:
                new_lines.append(l)
        if not has_w and GOOGLE_DRIVE_WEBAPP_URL:
            new_lines.append(f"GOOGLE_DRIVE_WEBAPP_URL={GOOGLE_DRIVE_WEBAPP_URL}\n")
        if not has_f and GOOGLE_DRIVE_FOLDER_URL:
            new_lines.append(f"GOOGLE_DRIVE_FOLDER_URL={GOOGLE_DRIVE_FOLDER_URL}\n")
        with open(".env", "w", encoding="utf-8") as f:
            f.writelines(new_lines)
    except Exception as ex:
        print(f"[Save .env Error] {ex}")

    test_result = "not_tested"
    if GOOGLE_DRIVE_WEBAPP_URL and "script.google.com" in GOOGLE_DRIVE_WEBAPP_URL:
        try:
            import urllib.request
            req_t = urllib.request.Request(GOOGLE_DRIVE_WEBAPP_URL, headers={"User-Agent": "EduShare"}, method="GET")
            with urllib.request.urlopen(req_t, timeout=6) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("status") == "connected":
                    test_result = "connected"
        except Exception as e:
            test_result = f"error: {str(e)}"

    return {
        "status": "success",
        "message": "Đã lưu cấu hình Google Drive thành công!",
        "webapp_url": GOOGLE_DRIVE_WEBAPP_URL,
        "folder_url": GOOGLE_DRIVE_FOLDER_URL,
        "test_result": test_result
    }

def sync_all_existing_files_to_edushare():
    """
    Tự động quét và chuyển toàn bộ file, ảnh hiện có trong hệ thống
    (CSDL documents và thư mục uploads/) lên thư mục edushare trên drive.vn-ai.cloud,
    giải phóng ổ cứng theo yêu cầu.
    """
    db = SessionLocal()
    synced_count = 0
    try:
        docs = db.query(DBDocument).all()
        for doc in docs:
            # Nếu chưa có trên VNAI Cloud Drive
            if not doc.vnai_file_id:
                file_bytes = b""
                # 1. Thử đọc từ đường dẫn file_path
                cand_paths = []
                if doc.file_path:
                    cand_paths.append(doc.file_path)
                    cand_paths.append(os.path.join("uploads", os.path.basename(doc.file_path)))
                cand_paths.append(os.path.join("uploads", f"doc_{doc.doc_id}_{doc.title}"))
                cand_paths.append(os.path.join("uploads", doc.title))

                for cp in cand_paths:
                    if cp and os.path.exists(cp) and os.path.isfile(cp):
                        try:
                            with open(cp, "rb") as f_in:
                                file_bytes = f_in.read()
                            if file_bytes:
                                doc.file_path = cp
                                break
                        except Exception:
                            pass

                # 2. Thử đọc từ base64 nếu không có file vật lý
                if not file_bytes and doc.file_base64:
                    try:
                        b64 = doc.file_base64
                        if "," in b64:
                            b64 = b64.split(",", 1)[1]
                        file_bytes = base64.b64decode(b64)
                    except Exception:
                        pass

                if file_bytes:
                    try:
                        res = upload_to_vnai_drive(
                            file_bytes=file_bytes,
                            filename=doc.title,
                            mime_type=doc.mime_type or "application/pdf"
                        )
                        if res:
                            doc.vnai_file_id = res.get("file_id")
                            doc.vnai_provider_file_id = res.get("provider_file_id")
                            doc.drive_file_id = res.get("file_id")
                            doc.drive_url = f"/api/docs/{doc.doc_id}/download"
                            # Giải phóng dung lượng cục bộ
                            if doc.file_path and os.path.exists(doc.file_path):
                                try:
                                    os.remove(doc.file_path)
                                    doc.file_path = ""
                                except Exception:
                                    pass
                            doc.file_base64 = ""
                            synced_count += 1
                        time.sleep(0.5)
                    except Exception as ex:
                        print(f"[Sync Existing Doc Warn] {doc.title}: {ex}")

        db.commit()
    finally:
        db.close()

    # Quét thêm các file lẻ còn sót lại trong thư mục uploads/
    try:
        if os.path.exists("uploads"):
            for fname in os.listdir("uploads"):
                fpath = os.path.join("uploads", fname)
                if os.path.isfile(fpath):
                    # Bỏ qua các file nhị phân thực thi hệ thống hoặc file rỗng
                    if fname.lower().endswith((".exe", ".dll", ".so")):
                        continue
                    try:
                        with open(fpath, "rb") as f_in:
                            f_bytes = f_in.read()
                        if f_bytes:
                            res = upload_to_vnai_drive(
                                file_bytes=f_bytes,
                                filename=fname,
                                mime_type="application/octet-stream"
                            )
                            if res:
                                try:
                                    os.remove(fpath)
                                except Exception:
                                    pass
                                synced_count += 1
                            time.sleep(0.5)
                    except Exception:
                        pass
    except Exception:
        pass

    print(f"[VNAI Drive Sync Initial]: Đã đồng bộ {synced_count} tệp lên thư mục edushare.")
    return synced_count

def cleanup_expired_files(days: int = 60):
    """
    Tự động xóa các file trên server và drive.vn-ai.cloud sau 60 ngày lưu trữ (hoặc số ngày cấu hình).
    """
    try:
        retention_days = int(os.environ.get("FILE_RETENTION_DAYS", str(days)))
    except Exception:
        retention_days = days

    deleted_count = 0
    try:
        db = SessionLocal()
        cutoff = datetime.utcnow() - timedelta(days=retention_days)
        expired_docs = db.query(DBDocument).filter(DBDocument.created_at < cutoff).all()
        doc_ids = []
        for d in expired_docs:
            doc_ids.append(d.doc_id)
            # 1. Xóa file trên drive.vn-ai.cloud
            target_cloud_id = d.vnai_file_id or d.drive_file_id
            if target_cloud_id:
                try:
                    delete_from_vnai_drive(target_cloud_id, d.vnai_provider_file_id)
                except Exception as ex:
                    print(f"[VNAI Drive Delete Warn] {d.title}: {ex}")

            # 2. Xóa bản sao tệp trên ổ cứng nếu còn
            if d.file_path and os.path.exists(d.file_path):
                try:
                    os.remove(d.file_path)
                except Exception:
                    pass
            deleted_count += 1

        if doc_ids:
            db.query(DBDocument).filter(DBDocument.doc_id.in_(doc_ids)).delete(synchronize_session=False)
            db.commit()
            print(f"[{retention_days}-Day Auto Clean]: Đã dọn dẹp vĩnh viễn {len(doc_ids)} tài liệu quá hạn {retention_days} ngày.")
        db.close()

        # 3. Đồng bộ dọn dẹp Google Drive nếu có cấu hình
        url = get_drive_sync_url()
        if url and "script.google.com" in url and "AKfycb_sample_test" not in url:
            try:
                import urllib.request
                payload = json.dumps({"action": "clean_old_files"}).encode("utf-8")
                r = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
                with urllib.request.urlopen(r, timeout=8) as resp:
                    print(f"[{retention_days}-Day Drive Clean]: Triggered on Google Drive")
            except Exception as e:
                print(f"[{retention_days}-Day Drive Clean Warn]: {e}")
    except Exception as ex:
        print(f"[{retention_days}-Day Clean Warn]: {ex}")

    return deleted_count

def _background_retention_worker():
    """Luồng chạy ngầm tự động đồng bộ và dọn dẹp file quá hạn 60 ngày mỗi 24 giờ"""
    time.sleep(5)  # Chờ server khởi động hoàn tất
    try:
        sync_all_existing_files_to_edushare()
    except Exception as ex:
        print(f"[Background Sync Initial Error]: {ex}")

    while True:
        try:
            cleanup_expired_files(days=60)
        except Exception as ex:
            print(f"[Background Retention Worker Error]: {ex}")
        time.sleep(86400)  # Lặp lại sau mỗi 24 giờ

@app.post("/api/config/drive/clean-60-days")
def trigger_clean_60_days():
    cnt = cleanup_expired_files(days=60)
    return {"status": "success", "message": f"Đã kích hoạt dọn dẹp các tệp quá hạn 60 ngày trên Server và Cloud Drive (Đã xóa {cnt} tệp)."}

@app.post("/api/config/drive/sync-all-to-edushare")
def trigger_sync_all():
    cnt = sync_all_existing_files_to_edushare()
    return {"status": "success", "message": f"Đã hoàn thành đồng bộ {cnt} tệp lên thư mục edushare."}

@app.post("/api/config/drive/clean-30-days")
def trigger_clean_30_days():
    cnt = cleanup_expired_files(days=30)
    return {"status": "success", "message": f"Đã kích hoạt dọn dẹp các tệp quá hạn trên Server và Cloud Drive (Đã xóa {cnt} tệp)."}

@app.post("/api/config/drive/purge-local-cache")
def purge_local_cache():
    """Giải phóng ổ cứng: Xóa các file trong uploads/ đã được sao lưu an toàn trên Google Drive"""
    db = SessionLocal()
    freed_count = 0
    freed_bytes = 0
    try:
        docs = db.query(DBDocument).all()
        for doc in docs:
            if (doc.drive_file_id or doc.drive_url) and doc.file_path and os.path.exists(doc.file_path):
                try:
                    size = os.path.getsize(doc.file_path)
                    os.remove(doc.file_path)
                    doc.file_path = ""
                    freed_count += 1
                    freed_bytes += size
                except Exception:
                    pass
            if (doc.drive_file_id or doc.drive_url) and doc.file_base64:
                doc.file_base64 = ""
        db.commit()
    finally:
        db.close()

    mb = round(freed_bytes / (1024 * 1024), 2)
    return {
        "status": "success",
        "freed_files_count": freed_count,
        "freed_mb": mb,
        "message": f"Đã giải phóng thành công {freed_count} tệp (~{mb} MB) trên ổ cứng. Toàn bộ tệp được lưu trữ an toàn trên Google Drive."
    }

# Endpoint nạp lại seed data sạch khi cần
@app.get("/api/seed-database")
def reseed_database():
    init_db()
    return {"status": "success", "message": "Đã khởi tạo và nạp lại cơ sở dữ liệu hoàn chỉnh."}

# ==================== PHỤC VỤ WEB FRONTEND TĨNH ====================
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

@app.get("/")
def serve_index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

@app.get("/index.html")
def serve_index_html():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

@app.get("/feed")
def serve_feed():
    """Phục vụ trang Bảng tin Diễn Đàn & hỗ trợ Deep Linking (?postId=...)"""
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

@app.get("/posts/{post_id}")
def serve_post_deep_link(post_id: str):
    """Phục vụ Deep Linking trực tiếp tới bài viết cụ thể trên Diễn Đàn (/posts/123)"""
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

SAFE_STATIC_EXTENSIONS = {
    ".html", ".htm", ".css", ".js", ".mjs", ".png", ".jpg", ".jpeg",
    ".gif", ".webp", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".eot",
    ".mp3", ".mp4", ".pdf", ".json", ".map", ".txt"
}

class SecureStaticFiles(StaticFiles):
    """
    Lớp StaticFiles bảo mật (Vá Lỗ hổng 2: Chặn rò rỉ CSDL SQLite, file cấu hình và mã nguồn)
    Chỉ cho phép phục vụ các định dạng web tĩnh an toàn trong whitelist.
    """
    async def get_response(self, path: str, scope):
        clean_p = path.replace("\\", "/").lower()
        base_name = os.path.basename(clean_p)
        ext = os.path.splitext(base_name)[1]

        if base_name.startswith(".") or "/." in clean_p or ext in FORBIDDEN_EXTENSIONS:
            raise HTTPException(status_code=404, detail="Tài nguyên không tồn tại hoặc đã bị khóa bảo mật.")

        # Bắt buộc tệp phải có đuôi mở rộng và nằm trong whitelist cho phép
        if not ext or ext not in SAFE_STATIC_EXTENSIONS:
            raise HTTPException(status_code=404, detail="Định dạng tệp không được phép truy cập trực tiếp.")

        return await super().get_response(path, scope)

app.mount("/", SecureStaticFiles(directory=STATIC_DIR, html=True), name="static")

@app.on_event("startup")
def on_startup():
    init_db()
    # Khởi động luồng chạy ngầm đồng bộ file lên edushare và dọn dẹp định kỳ 60 ngày
    t = threading.Thread(target=_background_retention_worker, daemon=True)
    t.start()

def main():
    import uvicorn
    local_ip = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass

    print("====================================================")
    print("      EDUSHARE - FASTAPI + SQL + REDIS + SMTP       ")
    print("====================================================")
    print(f"- Mở trên máy tính này : http://localhost:{PORT}/")
    print(f"- Mở trên ĐIỆN THOẠI   : http://{local_ip}:{PORT}/")
    print(f"- Tài liệu Swagger UI  : http://localhost:{PORT}/docs")
    print(f"- Cổng gửi thư SMTP    : {SMTP_USER} ({SMTP_HOST}:{SMTP_PORT})")
    print(f"- Cơ sở dữ liệu SQL    : {DATABASE_URL}")
    print(f"- Bộ nhớ đệm Redis     : {REDIS_URL if redis_client else 'In-Memory TTL 600s'}")
    print("====================================================")

    uvicorn.run(app, host="0.0.0.0", port=PORT)

if __name__ == "__main__":
    main()
