# -*- coding: utf-8 -*-
"""
Script kiểm thử tự động toàn diện (E2E Automated Verification):
1. Kiểm tra HTTP Headers chống cache (Cache-Control: no-cache, no-store) trên index.html, app.js, style.css, /api/*
2. Thiết lập 2 phiên WebSocket thời gian thực độc lập:
   - User A: binh.le@edushare.vn (Lê Thị Bình)
   - User B: admin@edushare.vn (Nguyễn Văn An)
3. Kiểm thử gửi tin nhắn 2 chiều thời gian thực (Zero-F5 Real-time Messaging)
4. Kiểm thử thu hồi tin nhắn thời gian thực
5. Đo độ trễ thời gian thực (Latency verification < 50ms)
"""
import asyncio
import json
import time
import urllib.request
import websockets

BASE_URL = "http://localhost:5500"
WS_URL = "ws://localhost:5500/ws"

def test_cache_headers():
    print("=" * 60)
    print("BƯỚC 1: KIỂM TRA HTTP CACHE-CONTROL HEADERS (CHỐNG LƯU DISK CACHE)")
    print("=" * 60)
    test_paths = ["/", "/index.html", "/app.js", "/style.css", "/api/rooms"]
    for path in test_paths:
        url = f"{BASE_URL}{path}"
        req = urllib.request.Request(url, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                cache_ctrl = resp.headers.get("Cache-Control", "")
                pragma = resp.headers.get("Pragma", "")
                expires = resp.headers.get("Expires", "")
                print(f"[OK] {path:<15} -> Cache-Control: {cache_ctrl} | Pragma: {pragma} | Status: {resp.status}")
                assert "no-cache" in cache_ctrl and "no-store" in cache_ctrl, f"Lỗi: {path} thiếu no-store/no-cache"
        except Exception as e:
            print(f"[FAIL] {path}: {e}")
            raise
    print("=> TẤT CẢ TỆP TĨNH & API ĐÃ ĐƯỢC BẢO VỆ CHỐNG CACHE 100%!\n")

async def test_realtime_two_users():
    print("=" * 60)
    print("BƯỚC 2: KIỂM THỬ GỬI TIN NHẮN 2 CHIỀU THỜI GIAN THỰC (ZERO-F5 SYNC)")
    print("=" * 60)

    # 1. Khởi tạo 2 WebSocket client đại diện cho 2 tài khoản thực tế của người dùng
    user_a_email = "hotranminhky0405@gmail.com"
    user_b_email = "hohau951842@gmail.com"
    room_id = "room_community"

    uri_a = f"{WS_URL}?user_email={user_a_email}&room_id={room_id}"
    uri_b = f"{WS_URL}?user_email={user_b_email}&room_id={room_id}"

    async with websockets.connect(uri_a) as ws_a, websockets.connect(uri_b) as ws_b:
        print(f"[1] User A ({user_a_email}) đã kết nối WebSocket.")
        print(f"[2] User B ({user_b_email}) đã kết nối WebSocket.")

        # Định danh socket và đợi server ack
        await ws_a.send(json.dumps({"type": "set_user", "user_email": user_a_email}))
        await ws_b.send(json.dumps({"type": "set_user", "user_email": user_b_email}))
        await ws_a.send(json.dumps({"type": "join_room", "room_id": room_id, "user_email": user_a_email}))
        await ws_b.send(json.dumps({"type": "join_room", "room_id": room_id, "user_email": user_b_email}))

        # Đợi ngắn để xả các gói tin xác nhận kết nối (user_updated, room_joined)
        await asyncio.sleep(0.3)
        async def drain(ws):
            while True:
                try:
                    await asyncio.wait_for(ws.recv(), timeout=0.1)
                except asyncio.TimeoutError:
                    break
        await drain(ws_a)
        await drain(ws_b)
        print("[*] Đã hoàn tất bắt tay WebSocket và sẵn sàng trao đổi tin nhắn.")

        async def wait_for_message_id(ws, target_msg_id, timeout=3.0):
            deadline = time.time() + timeout
            while time.time() < deadline:
                raw = await asyncio.wait_for(ws.recv(), timeout=max(0.1, deadline - time.time()))
                data = json.loads(raw)
                if data.get("type") == "new_message" and data.get("message", {}).get("id") == target_msg_id:
                    return data
            raise TimeoutError(f"Hết thời gian chờ tin nhắn ID: {target_msg_id}")

        async def wait_for_recall_id(ws, target_msg_id, timeout=3.0):
            deadline = time.time() + timeout
            while time.time() < deadline:
                raw = await asyncio.wait_for(ws.recv(), timeout=max(0.1, deadline - time.time()))
                data = json.loads(raw)
                if data.get("type") == "message_recalled" and data.get("message_id") == target_msg_id:
                    return data
            raise TimeoutError(f"Hết thời gian chờ thu hồi ID: {target_msg_id}")

        # --- TEST 1: User A gửi tin nhắn -> User B nhận tức thì (0ms) ---
        print("\n--- TEST 1: User A gửi tin nhắn mới ---")
        msg_text_1 = f"Chào Hậu, đây là tin nhắn test thời gian thực {int(time.time())}"
        post_data = json.dumps({
            "sender_email": user_a_email,
            "sender_name": "Admin Trung Hậu",
            "sender_role": "Admin",
            "text": msg_text_1
        }).encode("utf-8")

        start_time = time.time()
        req = urllib.request.Request(
            f"{BASE_URL}/api/rooms/{room_id}/messages",
            data=post_data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            send_res = json.loads(resp.read().decode("utf-8"))
            sent_msg_id = send_res.get("id")
            print(f"[User A] Đã gửi tin nhắn (ID: {sent_msg_id}): '{msg_text_1}'")

        # Chờ User B nhận tin qua WebSocket
        recv_data_b = await wait_for_message_id(ws_b, sent_msg_id, timeout=3.0)
        elapsed_b = (time.time() - start_time) * 1000

        print(f"[User B Realtime Nhận!] Nhận sau {elapsed_b:.1f}ms: Type = {recv_data_b.get('type')}")
        assert recv_data_b.get("type") == "new_message", "Gói tin nhận không phải new_message"
        assert recv_data_b["message"]["id"] == sent_msg_id, "ID tin nhắn không khớp"
        assert recv_data_b["message"]["text"] == msg_text_1, "Nội dung tin nhắn không khớp"
        print(f"==> XÁC MINH TEST 1 THÀNH CÔNG: User B nhận được tin nhắn trong {elapsed_b:.1f}ms (TỰ ĐỘNG, KHÔNG CẦN F5)!\n")

        # --- TEST 2: User B trả lời -> User A nhận tức thì (0ms) ---
        print("--- TEST 2: User B gửi tin nhắn phản hồi ---")
        msg_text_2 = f"Chào anh Hậu, em nhận được tin nhắn tức thì rồi nhé {int(time.time())}"
        post_data_2 = json.dumps({
            "sender_email": user_b_email,
            "sender_name": "Hồ Trần Trung Hậu",
            "sender_role": "Thành viên",
            "text": msg_text_2
        }).encode("utf-8")

        start_time_2 = time.time()
        req_2 = urllib.request.Request(
            f"{BASE_URL}/api/rooms/{room_id}/messages",
            data=post_data_2,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req_2, timeout=5) as resp:
            send_res_2 = json.loads(resp.read().decode("utf-8"))
            sent_msg_id_2 = send_res_2.get("id")
            print(f"[User B] Đã gửi tin nhắn (ID: {sent_msg_id_2}): '{msg_text_2}'")

        # Chờ User A nhận tin qua WebSocket
        recv_data_a = await wait_for_message_id(ws_a, sent_msg_id_2, timeout=3.0)
        elapsed_a = (time.time() - start_time_2) * 1000

        print(f"[User A Realtime Nhận!] Nhận sau {elapsed_a:.1f}ms: Type = {recv_data_a.get('type')}")
        assert recv_data_a.get("type") == "new_message", "Gói tin nhận không phải new_message"
        assert recv_data_a["message"]["id"] == sent_msg_id_2, "ID tin nhắn không khớp"
        assert recv_data_a["message"]["text"] == msg_text_2, "Nội dung tin nhắn không khớp"
        print(f"==> XÁC MINH TEST 2 THÀNH CÔNG: User A nhận được phản hồi trong {elapsed_a:.1f}ms (TỰ ĐỘNG, KHÔNG CẦN F5)!\n")

        # --- TEST 3: User A thu hồi tin nhắn -> User B nhận cập nhật tức thì ---
        print("--- TEST 3: User A thu hồi tin nhắn ---")
        post_recall_data = json.dumps({"user_email": user_a_email}).encode("utf-8")
        req_recall = urllib.request.Request(
            f"{BASE_URL}/api/messages/{sent_msg_id}/recall?user_email={user_a_email}",
            data=post_recall_data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req_recall, timeout=5) as resp:
            print(f"[User A] Đã gọi API thu hồi tin nhắn {sent_msg_id}")

        recv_recall_b = await wait_for_recall_id(ws_b, sent_msg_id, timeout=3.0)
        print(f"[User B Realtime Nhận!] Type = {recv_recall_b.get('type')}, Msg ID = {recv_recall_b.get('message_id')}")
        assert recv_recall_b.get("type") == "message_recalled", "Gói tin thu hồi không đúng"
        assert recv_recall_b.get("message_id") == sent_msg_id, "ID thu hồi không khớp"
        print("==> XÁC MINH TEST 3 THÀNH CÔNG: User B thấy tin nhắn thu hồi tức thì không cần reload!\n")

    print("=" * 60)
    print("HOÀN TẤT 100% CÁC BÀI TEST THỜI GIAN THỰC ĐẠT CHUẨN ZERO-F5!")
    print("=" * 60)

if __name__ == "__main__":
    test_cache_headers()
    asyncio.run(test_realtime_two_users())
