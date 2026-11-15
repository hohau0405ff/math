#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
EDUSHARE - PYTHON BACKEND SERVER (STANDARD LIBRARY + SQLITE3 + GMAIL SMTP)
=============================================================================
Máy chủ độc lập sử dụng 100% thư viện chuẩn của Python (Python Standard Library),
không cần cài thêm bất kỳ gói ngoài nào.
Hỗ trợ:
1. Phục vụ Web tĩnh (index.html, style.css, app.js)
2. Gửi Email OTP thật qua Gmail SMTP SSL Port 465 (Hiệu lực 10 phút)
3. Cung cấp API cơ sở dữ liệu SQLite3 (edushare.db) cho Users, Rooms, Posts, Docs
=============================================================================
"""

import os
import sys
import json
import time
import socket
import sqlite3
import smtplib
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header

# Đảm bảo mã hóa UTF-8 trên Windows console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Tự động đọc file .env nếu có
ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
if os.path.exists(ENV_PATH):
    try:
        with open(ENV_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k not in os.environ:
                        os.environ[k] = v
    except Exception as e:
        print(f"[Warning] Không thể đọc file .env: {e}")

# ==================== CẤU HÌNH HỆ THỐNG ====================
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 465))
SMTP_USER = os.environ.get('SMTP_USER', 'hotrantrunghau951842@gmail.com')
SMTP_PASS = os.environ.get('SMTP_PASS', 'qtfzemasubiterqv').replace(' ', '')
FROM_NAME = os.environ.get('FROM_NAME', 'Ban Quản Trị EduShare')

DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DIR, 'edushare.db')

# Cổng mặc định
port = 5500
if '--port' in sys.argv:
    try:
        idx = sys.argv.index('--port')
        port = int(sys.argv[idx + 1])
    except Exception:
        port = 5500
elif 'PORT' in os.environ:
    try:
        port = int(os.environ.get('PORT'))
    except Exception:
        port = 5500

# Bộ nhớ tạm OTP 10 phút
otp_memory_cache = {}

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def send_mail_via_gmail_smtp(to_email, subject, text_content, html_content):
    if not to_email or '@' not in to_email:
        raise ValueError("Địa chỉ email người nhận không hợp lệ.")

    msg = MIMEMultipart('alternative')
    msg['From'] = f"{Header(FROM_NAME, 'utf-8').encode()} <{SMTP_USER}>"
    msg['To'] = to_email
    msg['Subject'] = Header(subject, 'utf-8')

    msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
    msg.attach(MIMEText(html_content, 'html', 'utf-8'))

    server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=20)
    server.login(SMTP_USER, SMTP_PASS)
    server.sendmail(SMTP_USER, [to_email], msg.as_string())
    server.quit()
    return True

def get_db_con():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con

class EduShareHandler(SimpleHTTPRequestHandler):

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def send_json(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        # 1. API Health & SMTP
        if path == '/api/health':
            self.send_json({
                'status': 'healthy',
                'backend': 'Python Standard Library',
                'database': 'SQLite3 (edushare.db)',
                'cache': 'In-Memory TTL 600s',
                'smtp_gateway': SMTP_USER
            })
            return

        if path == '/api/smtp-status':
            self.send_json({
                'status': 'active',
                'host': SMTP_HOST,
                'port': SMTP_PORT,
                'user': SMTP_USER,
                'ready': True
            })
            return

        # 2. API Rooms
        if path == '/api/rooms':
            user_email = (qs.get('user_email', [''])[0]).lower().strip()
            con = get_db_con()
            try:
                cur = con.execute("SELECT * FROM rooms")
                rows = cur.fetchall()
                res = []
                for r in rows:
                    members = json.loads(r['members_json'] or '[]')
                    pending = json.loads(r['pending_json'] or '[]')
                    last_msg_row = con.execute("SELECT * FROM messages WHERE room_id = ? ORDER BY created_at DESC LIMIT 1", (r['id'],)).fetchone()

                    user_role = 'none'
                    is_member = False
                    for m in members:
                        if m.get('email') == user_email:
                            user_role = m.get('role', 'member')
                            is_member = True
                            break

                    if r['type'] == 'community':
                        is_member = True
                        if user_role == 'none': user_role = 'member'

                    res.append({
                        'id': r['id'],
                        'name': r['name'],
                        'code': r['code'],
                        'type': r['type'],
                        'subject': r['subject'] or 'Chung',
                        'owner_email': r['owner_email'],
                        'require_approval': bool(r['require_approval']),
                        'admin_only_chat': bool(r['admin_only_chat']),
                        'members_count': len(members),
                        'members': members,
                        'pending': pending,
                        'is_member': is_member,
                        'user_role': user_role,
                        'last_message': {
                            'text': last_msg_row['text'] if last_msg_row else 'Chưa có tin nhắn nào',
                            'sender_name': last_msg_row['sender_name'] if last_msg_row else '',
                            'created_at': str(last_msg_row['created_at']) if last_msg_row else str(r['created_at'])
                        } if last_msg_row else None
                    })
                self.send_json(res)
            finally:
                con.close()
            return

        # 3. API Messages
        if path.startswith('/api/rooms/') and path.endswith('/messages'):
            parts = path.split('/')
            room_id = parts[3]
            con = get_db_con()
            try:
                cur = con.execute("SELECT * FROM messages WHERE room_id = ? ORDER BY created_at ASC", (room_id,))
                rows = cur.fetchall()
                res = [
                    {
                        'id': r['id'],
                        'room_id': r['room_id'],
                        'sender_email': r['sender_email'],
                        'sender_name': r['sender_name'],
                        'sender_role': r['sender_role'],
                        'sender_avatar': r['sender_avatar'],
                        'text': r['text'],
                        'attachment': json.loads(r['attachment_json']) if r['attachment_json'] else None,
                        'created_at': str(r['created_at'])
                    }
                    for r in rows
                ]
                self.send_json(res)
            finally:
                con.close()
            return

        # 4. API Posts
        if path == '/api/posts':
            subject = qs.get('subject', ['all'])[0]
            search = qs.get('search', [''])[0].strip().lower()
            con = get_db_con()
            try:
                cur = con.execute("SELECT * FROM posts ORDER BY created_at DESC")
                rows = cur.fetchall()
                res = []
                for r in rows:
                    if subject != 'all' and r['subject'] != subject:
                        continue
                    if search and (search not in r['content'].lower() and search not in r['author_name'].lower()):
                        continue
                    res.append({
                        'id': r['id'],
                        'author_email': r['author_email'],
                        'author_name': r['author_name'],
                        'author_role_title': r['author_role_title'],
                        'avatar': r['avatar'],
                        'subject': r['subject'],
                        'content': r['content'],
                        'attachment': json.loads(r['attachment_json']) if r['attachment_json'] else None,
                        'likes': json.loads(r['likes_json'] or '[]'),
                        'comments': json.loads(r['comments_json'] or '[]'),
                        'shares_count': r['shares_count'] or 0,
                        'created_at': str(r['created_at'])
                    })
                self.send_json(res)
            finally:
                con.close()
            return

        # 5. API Documents
        if path == '/api/docs':
            con = get_db_con()
            try:
                cur = con.execute("SELECT * FROM documents ORDER BY created_at DESC")
                rows = cur.fetchall()
                res = [
                    {
                        'doc_id': r['doc_id'],
                        'title': r['title'],
                        'file_type': r['file_type'],
                        'file_size': r['file_size'],
                        'mime_type': r['mime_type'],
                        'uploader_name': r['uploader_name'],
                        'uploader_email': r['uploader_email'],
                        'subject': r['subject'],
                        'created_at': str(r['created_at'])
                    }
                    for r in rows
                ]
                self.send_json(res)
            finally:
                con.close()
            return

        # 6. API Users
        if path == '/api/users':
            con = get_db_con()
            try:
                cur = con.execute("SELECT id, email, name, role, is_system_admin, role_title, sub_info, avatar FROM users")
                rows = cur.fetchall()
                res = [
                    {
                        'id': r['id'],
                        'email': r['email'],
                        'name': r['name'],
                        'role': r['role'],
                        'isSystemAdmin': bool(r['is_system_admin']),
                        'roleTitle': r['role_title'] or '',
                        'subInfo': r['sub_info'] or '',
                        'avatar': r['avatar'] or ''
                    }
                    for r in rows
                ]
                self.send_json(res)
            finally:
                con.close()
            return

        # 7. Phục vụ file tĩnh
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get('Content-Length', 0))
        body_raw = self.rfile.read(length) if length > 0 else b'{}'
        try:
            body = json.loads(body_raw.decode('utf-8'))
        except Exception:
            body = {}

        # 1. API Gửi OTP qua Gmail SMTP
        if path == '/api/send-otp':
            email = body.get('email', '').strip().lower()
            otp = str(body.get('otp', '')).strip()
            req_type = body.get('type', 'register')
            type_label = 'ĐẶT LẠI MẬT KHẨU' if req_type == 'forgot' else 'ĐĂNG KÝ TÀI KHOẢN'

            if not email or not otp:
                self.send_json({'status': 'error', 'message': 'Thiếu địa chỉ email hoặc mã OTP.'}, 400)
                return

            otp_memory_cache[f"otp:{email}:{req_type}"] = {
                'otp': otp,
                'expire_at': time.time() + 600
            }

            subject = f"[EduShare] Mã xác thực OTP {type_label}: {otp}"
            text_content = f"Chào bạn,\n\nMã xác thực OTP của bạn là: {otp}\nHiệu lực trong 10 phút.\n\nBan Quản Trị EduShare"
            html_content = f"<h2>Mã xác thực OTP {type_label}: <span style='color:#0068ff;'>{otp}</span></h2><p>Mã có hiệu lực trong 10 phút.</p>"

            try:
                send_mail_via_gmail_smtp(email, subject, text_content, html_content)
                self.send_json({
                    'status': 'success',
                    'message': f"Mã OTP đã được gửi đến {email} qua Gmail SMTP",
                    'expiresIn': 600
                })
            except Exception as e:
                self.send_json({'status': 'error', 'message': f"Lỗi gửi SMTP: {str(e)}"}, 500)
            return

        # 2. API Đăng nhập
        if path == '/api/login':
            email = body.get('email', '').strip().lower()
            password = body.get('password', '').strip()
            con = get_db_con()
            try:
                user = con.execute("SELECT * FROM users WHERE email = ? AND password = ?", (email, password)).fetchone()
                if not user:
                    self.send_json({'detail': 'Gmail hoặc mật khẩu không chính xác.'}, 401)
                    return
                self.send_json({
                    'status': 'success',
                    'user': {
                        'id': user['id'],
                        'email': user['email'],
                        'name': user['name'],
                        'role': user['role'],
                        'isSystemAdmin': bool(user['is_system_admin']),
                        'roleTitle': user['role_title'] or 'Thành viên',
                        'subInfo': user['sub_info'] or '',
                        'avatar': user['avatar'] or ''
                    }
                })
            finally:
                con.close()
            return

        # 3. API Gửi tin nhắn
        if path.startswith('/api/rooms/') and path.endswith('/messages'):
            parts = path.split('/')
            room_id = parts[3]
            con = get_db_con()
            try:
                msg_id = f"msg_{int(time.time()*1000)}"
                attach_json = json.dumps(body.get('attachment')) if body.get('attachment') else None
                con.execute("""
                    INSERT INTO messages (id, room_id, sender_email, sender_name, sender_role, sender_avatar, text, attachment_json, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                """, (
                    msg_id, room_id,
                    body.get('sender_email'),
                    body.get('sender_name'),
                    body.get('sender_role', 'Thành viên'),
                    body.get('sender_avatar', ''),
                    body.get('text', ''),
                    attach_json
                ))
                con.commit()
                self.send_json({'status': 'success', 'message_id': msg_id})
            finally:
                con.close()
            return

        self.send_json({'error': 'Endpoint not found'}, 404)

def run_server():
    os.chdir(DIR)
    local_ip = get_local_ip()
    server_address = ('0.0.0.0', port)
    httpd = HTTPServer(server_address, EduShareHandler)

    print("====================================================")
    print("   EDUSHARE - PYTHON BACKEND & GMAIL SMTP      ")
    print("====================================================")
    print(f"- Mở trên máy tính này : http://localhost:{port}/")
    print(f"- Mở trên ĐIỆN THOẠI   : http://{local_ip}:{port}/")
    print(f"- Cổng gửi thư SMTP    : {SMTP_USER} ({SMTP_HOST}:{SMTP_PORT})")
    print("====================================================")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nĐang tắt máy chủ...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
