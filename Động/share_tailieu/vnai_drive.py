# -*- coding: utf-8 -*-
"""
Module tích hợp lưu trữ đám mây drive.vn-ai.cloud (HCDrive REST API)
Dành cho hệ thống EduShare:
- API Name: api_edu_share
- Thư mục lưu trữ: edushare
- Phương thức xác thực: Bearer Token (API Key dạng 9d_live_...)
- Hỗ trợ tải trực tiếp thông qua backend proxy/stream (không mở giao diện bên thứ 3)
- Hỗ trợ tự động xóa file định kỳ
"""

import os
import re
import json
import uuid
import time
import base64
import urllib.request
import urllib.error
import urllib.parse
from typing import Optional, Dict, Any, Tuple, Generator

# ==================== CẤU HÌNH API DRIVE ====================
def get_env_var(name: str, default: str = "") -> str:
    val = os.environ.get(name, "").strip()
    if val:
        return val
    try:
        if os.path.exists(".env"):
            with open(".env", "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith(f"{name}="):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
    except Exception:
        pass
    return default

VNAI_DRIVE_BASE_URL = get_env_var("VNAI_DRIVE_BASE_URL", "https://drive.vn-ai.cloud/api").rstrip("/")
VNAI_DRIVE_API_NAME = get_env_var("VNAI_DRIVE_API_NAME", "api_edu_share")
VNAI_DRIVE_API_KEY = get_env_var("VNAI_DRIVE_API_KEY", "9d_live_cvdiyshE_-XUasvP99t7s0fQSEaTwjIpmrCAnJ9GtPg")
VNAI_DRIVE_FOLDER = get_env_var("VNAI_DRIVE_FOLDER", "edushare")
VNAI_DRIVE_FOLDER_ID = get_env_var("VNAI_DRIVE_FOLDER_ID", "")

# Cache endpoint upload đã kiểm tra thành công
_CACHED_UPLOAD_URL: Optional[str] = None
_CACHED_FOLDER_ID: Optional[str] = VNAI_DRIVE_FOLDER_ID or None

def get_auth_headers() -> Dict[str, str]:
    """Tạo headers chứa API Key xác thực Bearer Token"""
    api_key = get_env_var("VNAI_DRIVE_API_KEY", VNAI_DRIVE_API_KEY)
    return {
        "Authorization": f"Bearer {api_key}",
        "User-Agent": f"EduShare-Client/{VNAI_DRIVE_API_NAME}"
    }

def _build_multipart_payload(
    files_meta_json: str,
    file_field_name: str,
    filename: str,
    mime_type: str,
    file_bytes: bytes
) -> Tuple[bytes, str]:
    """
    Xây dựng chuẩn payload multipart/form-data theo tài liệu HCDrive API:
    Phần 'filesMeta' (JSON) PHẢI đứng trước các phần tệp 'file-0'.
    Header Content-Disposition chỉ chứa safe ASCII filename để tương thích tối đa với Fastify/busboy.
    Tên tệp đầy đủ (kể cả có dấu tiếng Việt, khoảng trắng) được định danh trong filesMeta.
    """
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    crlf = b"\r\n"
    parts = []

    # 1. Phần filesMeta (JSON string, định dạng chuẩn form field giống curl)
    parts.append(f"--{boundary}".encode("utf-8"))
    parts.append(b'Content-Disposition: form-data; name="filesMeta"')
    parts.append(b"Content-Type: application/json; charset=utf-8")
    parts.append(b"")
    parts.append(files_meta_json.encode("utf-8"))

    # 2. Phần tệp nhị phân (file-0)
    # Rút trích tên file ASCII an toàn cho phần MIME header
    ext = os.path.splitext(filename)[1]
    base = os.path.splitext(filename)[0]
    safe_base = re.sub(r'[^a-zA-Z0-9_-]', '_', base)
    if not safe_base:
        safe_base = "file"
    safe_part_filename = f"{safe_base}{ext}"

    parts.append(f"--{boundary}".encode("utf-8"))
    parts.append(f'Content-Disposition: form-data; name="{file_field_name}"; filename="{safe_part_filename}"'.encode("utf-8"))
    parts.append(f"Content-Type: {mime_type or 'application/octet-stream'}".encode("utf-8"))
    parts.append(b"")
    parts.append(file_bytes)

    # 3. Kết thúc boundary
    parts.append(f"--{boundary}--".encode("utf-8"))
    parts.append(b"")

    body = crlf.join(parts)
    content_type = f"multipart/form-data; boundary={boundary}"
    return body, content_type

def get_or_create_edushare_folder() -> Optional[str]:
    """
    Tra cứu hoặc tạo thư mục 'edushare' trên drive.vn-ai.cloud nếu API Key hỗ trợ.
    Nếu API Key chỉ có scope files:upload, sẽ trả về VNAI_DRIVE_FOLDER_ID nếu có.
    """
    global _CACHED_FOLDER_ID
    if _CACHED_FOLDER_ID:
        return _CACHED_FOLDER_ID

    folder_name = get_env_var("VNAI_DRIVE_FOLDER", "edushare")
    base_url = get_env_var("VNAI_DRIVE_BASE_URL", VNAI_DRIVE_BASE_URL)
    headers = get_auth_headers()

    # Thử gọi API tìm thư mục
    try:
        req_url = f"{base_url}/folders"
        req = urllib.request.Request(req_url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            folders = data.get("folders", []) if isinstance(data, dict) else []
            for f in folders:
                if f.get("name") == folder_name:
                    _CACHED_FOLDER_ID = f.get("id")
                    print(f"[VNAI Drive]: Đã tìm thấy thư mục '{folder_name}' (ID: {_CACHED_FOLDER_ID})")
                    return _CACHED_FOLDER_ID
    except Exception as e:
        # Scope files:upload có thể không có quyền đọc danh sách folders
        pass

    # Thử tạo thư mục nếu chưa có
    try:
        req_url = f"{base_url}/folders"
        payload = json.dumps({"name": folder_name, "parentId": None}).encode("utf-8")
        req_headers = dict(headers)
        req_headers["Content-Type"] = "application/json"
        req = urllib.request.Request(req_url, data=payload, headers=req_headers, method="POST")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            folder_id = data.get("id") or (data.get("folder") or {}).get("id")
            if folder_id:
                _CACHED_FOLDER_ID = folder_id
                print(f"[VNAI Drive]: Đã tạo mới thư mục '{folder_name}' (ID: {_CACHED_FOLDER_ID})")
                return _CACHED_FOLDER_ID
    except Exception:
        pass

    return _CACHED_FOLDER_ID

def upload_to_vnai_drive(
    file_bytes: bytes,
    filename: str,
    mime_type: str = "application/pdf",
    folder_id: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Tải file nhị phân lên drive.vn-ai.cloud (HCDrive) vào thư mục edushare.
    Trả về dict chứa thông tin file: id, providerFileId, name, sizeBytes, v.v.
    """
    global _CACHED_UPLOAD_URL
    api_key = get_env_var("VNAI_DRIVE_API_KEY", VNAI_DRIVE_API_KEY)
    if not api_key:
        print("[VNAI Drive Warn]: Chưa cấu hình VNAI_DRIVE_API_KEY")
        return None

    base_url = get_env_var("VNAI_DRIVE_BASE_URL", VNAI_DRIVE_BASE_URL)
    target_folder_id = folder_id or get_or_create_edushare_folder()

    field_name = "file-0"
    file_meta_item = {
        "fieldName": field_name,
        "fileName": filename,
        "mimeType": mime_type or "application/octet-stream",
        "sizeBytes": str(len(file_bytes))
    }
    if target_folder_id:
        file_meta_item["folderId"] = target_folder_id

    files_meta_json = json.dumps([file_meta_item])
    body, content_type = _build_multipart_payload(
        files_meta_json=files_meta_json,
        file_field_name=field_name,
        filename=filename,
        mime_type=mime_type,
        file_bytes=file_bytes
    )

    headers = get_auth_headers()
    headers["Content-Type"] = content_type
    headers["Content-Length"] = str(len(body))

    # Danh sách endpoint upload theo chuẩn HCDrive docs (chỉ dùng các endpoint cho phép API Key files:upload)
    candidate_urls = []
    if _CACHED_UPLOAD_URL:
        candidate_urls.append(_CACHED_UPLOAD_URL)
    clean_base = base_url.rstrip("/")
    if clean_base.endswith("/api"):
        endpoint_v1 = f"{clean_base}/v1/uploads"
    else:
        endpoint_v1 = f"{clean_base}/api/v1/uploads"
    candidate_urls.extend([
        endpoint_v1,
        "https://drive.vn-ai.cloud/api/v1/uploads"
    ])
    # Loại bỏ URL trùng lặp nhưng giữ nguyên thứ tự
    seen = set()
    candidate_urls = [u for u in candidate_urls if not (u in seen or seen.add(u))]

    last_error = None
    for upload_url in candidate_urls:
        # Thử tối đa 2 lần cho endpoint upload
        for attempt in range(2):
            try:
                req = urllib.request.Request(upload_url, data=body, headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=35) as resp:
                    resp_data = resp.read().decode("utf-8")
                    data = json.loads(resp_data)
                    files_res = data.get("files", [])
                    if files_res and len(files_res) > 0:
                        file_info = files_res[0]
                        _CACHED_UPLOAD_URL = upload_url
                        file_id = file_info.get("id")
                        provider_file_id = file_info.get("providerFileId")
                        print(f"[VNAI Drive Success]: Đã upload '{filename}' lên edushare -> ID: {file_id}, ProviderID: {provider_file_id}")
                        return {
                            "status": "success",
                            "file_id": file_id,
                            "provider_file_id": provider_file_id,
                            "name": file_info.get("name", filename),
                            "size_bytes": file_info.get("sizeBytes", len(file_bytes)),
                            "mime_type": file_info.get("mimeType", mime_type),
                            "folder_id": file_info.get("folderId"),
                            "created_at": file_info.get("createdAt"),
                            "raw_info": file_info
                        }
            except urllib.error.HTTPError as he:
                err_body = ""
                try:
                    err_body = he.read().decode("utf-8")
                except Exception:
                    pass
                last_error = f"HTTP {he.code}: {he.reason} - {err_body}"
                if he.code in (404, 405):
                    # Endpoint không tồn tại trên server, thử endpoint kế tiếp
                    break
                elif he.code == 400 and attempt == 0:
                    # Nếu gặp 400 lần 1, đợi 1.2s rồi thử lại
                    time.sleep(1.2)
                    continue
                else:
                    print(f"[VNAI Drive Error] {upload_url} -> {last_error}")
                    break
            except Exception as ex:
                last_error = str(ex)
                if attempt == 0:
                    time.sleep(1.0)
                    continue
                break

    print(f"[VNAI Drive Upload Failed]: {last_error}")
    return None

def fetch_file_binary(file_id: str, provider_file_id: Optional[str] = None) -> Optional[Tuple[bytes, str]]:
    """
    Tải trực tiếp nội dung nhị phân của tệp từ drive.vn-ai.cloud hoặc CDN lưu trữ
    để máy chủ EduShare trả thẳng cho người dùng (người dùng KHÔNG BAO GIỜ bị chuyển hướng
    hay mở trang web edushare/hcdrive).
    Trả về: (bytes, mime_type)
    """
    base_url = get_env_var("VNAI_DRIVE_BASE_URL", VNAI_DRIVE_BASE_URL)
    headers = get_auth_headers()

    # Cách 1: Tải trực tiếp từ HCDrive API /files/{id}/download
    download_urls = [
        f"{base_url}/files/{file_id}/download",
        f"https://drive.vn-ai.cloud/api/files/{file_id}/download"
    ]
    for dl_url in download_urls:
        try:
            req = urllib.request.Request(dl_url, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=25) as resp:
                content = resp.read()
                mime = resp.headers.get("Content-Type", "application/octet-stream")
                if content and len(content) > 0:
                    return content, mime
        except Exception:
            pass

    # Cách 2: Nếu có provider_file_id (Google Drive/S3 bên dưới của HCDrive), tải trực tiếp từ CDN
    if provider_file_id:
        cdn_urls = [
            f"https://drive.google.com/uc?export=download&id={provider_file_id}",
            f"https://lh3.googleusercontent.com/d/{provider_file_id}"
        ]
        for cdn_url in cdn_urls:
            try:
                req = urllib.request.Request(cdn_url, headers={"User-Agent": "Mozilla/5.0"}, method="GET")
                with urllib.request.urlopen(req, timeout=25) as resp:
                    content = resp.read()
                    mime = resp.headers.get("Content-Type", "application/octet-stream")
                    # Kiểm tra tránh trang xác nhận HTML của Google
                    if content and not (b"<html" in content[:200] and b"Google Drive" in content[:500]):
                        return content, mime
            except Exception:
                pass

    return None

def delete_from_vnai_drive(file_id: str, provider_file_id: Optional[str] = None) -> bool:
    """
    Xóa tệp khỏi drive.vn-ai.cloud khi hết hạn lưu trữ 60 ngày hoặc người dùng xóa
    """
    if not file_id:
        return False

    base_url = get_env_var("VNAI_DRIVE_BASE_URL", VNAI_DRIVE_BASE_URL)
    headers = get_auth_headers()

    # 1. Gọi API xóa tệp của HCDrive
    del_urls = [
        f"{base_url}/files/{file_id}",
        f"https://drive.vn-ai.cloud/api/files/{file_id}"
    ]
    deleted = False
    for u in del_urls:
        try:
            req = urllib.request.Request(u, headers=headers, method="DELETE")
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status in (200, 204):
                    print(f"[VNAI Drive Delete]: Đã xóa file ID {file_id} trên drive.vn-ai.cloud")
                    deleted = True
                    break
        except Exception as ex:
            # Tiếp tục thử endpoint khác hoặc dọn dẹp thường
            pass

    # 2. Xóa vĩnh viễn (Permanent Delete) nếu nằm trong thùng rác
    try:
        perm_url = f"{base_url}/files/batch/permanent"
        payload = json.dumps({"fileIds": [file_id]}).encode("utf-8")
        h = dict(headers)
        h["Content-Type"] = "application/json"
        req = urllib.request.Request(perm_url, data=payload, headers=h, method="DELETE")
        with urllib.request.urlopen(req, timeout=8) as resp:
            pass
    except Exception:
        pass

    return deleted
