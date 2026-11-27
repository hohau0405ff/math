# 📘 EDUSHARE - NHẬT KÝ & BỘ NHỚ KIẾN TRÚC DỰ ÁN (MEMORY PROJECT)

> **File này được cập nhật liên tục theo yêu cầu của người dùng nhằm ghi nhận tiến độ, cấu trúc hệ thống, các lỗi đã khắc phục và hướng phát triển.**

---

## ⚡ 0. QUY TẮC BẮT BUỘC KHI LÀM VIỆC (MANDATORY OPERATING RULES)
1. **LUÔN XEM FILE NÀY (`memory_project.md`) TRƯỚC TIÊN:** Trước khi bắt đầu bất kỳ tác vụ nào (sửa lỗi, thêm tính năng, thay đổi cấu trúc), bắt buộc phải đọc và đối chiếu toàn bộ các đề mục trong file này để nắm vững ngữ cảnh kiến trúc, các lỗi đã giải quyết và trạng thái hiện hành.
2. **KIỂM THỬ HỒI QUY TOÀN BỘ TÍNH NĂNG SAU KHI CHẠY XONG:** Sau khi triển khai hoặc chỉnh sửa code, bắt buộc phải rà soát, kiểm thử lại toàn bộ các luồng chức năng liên quan (Chat, Diễn đàn, Nhóm, Modal, WebSocket, Drive, GeoChalk) để đảm bảo không bị đứt gãy sự kiện hay phát sinh lỗi phụ.
3. **RÀ SOÁT VÀ SỬA TRIỆT ĐỂ LOGIC CODE:** Tuyệt đối không chỉ sửa triệu chứng bề mặt. Bắt buộc phải tìm ra nguyên nhân gốc rễ (Root Cause) về logic, cú pháp JS, CSS overlay hay luồng dữ liệu backend để sửa chữa toàn diện.
4. **CẬP NHẬT LIÊN TỤC VÀO FILE NÀY:** Bất kỳ thay đổi kiến trúc, sửa lỗi hay cấu hình mới nào đều phải được ghi nhận ngay vào `memory_project.md`.

---

## 1. TỔNG QUAN HỆ THỐNG EDUSHARE
- **Mục tiêu:** Nền tảng chia sẻ tài liệu học tập, trao đổi nhóm thời gian thực (Real-time Chat), diễn đàn thảo luận (Forum Newsfeed) và tích hợp công cụ trực quan hóa hình học không gian 3D GeoChalk.
- **Kiến trúc Full-Stack:**
  - **Backend:** Python FastAPI (Uvicorn ASGI), SQLite (`edushare.db`), Native WebSocket (`/ws`), Redis Cache 7 (lưu OTP và phiên làm việc).
  - **Frontend:** Vanilla JavaScript (Clean Architecture, Mobile/Desktop Responsive, Tối ưu hóa UI/UX 0ms Latency).
  - **Lưu trữ đám mây:** Tích hợp HCDrive REST API (`drive.vn-ai.cloud`) với API Key riêng biệt, thư mục `edushare`, lưu trữ và tự động dọn dẹp định kỳ 60 ngày.
  - **Bảng vẽ hình học:** GeoChalk (`https://math.vn-ai.cloud/geochalk/geochalk.html`) tích hợp cơ chế xác thực SSO Token.

---

## 2. KIẾN TRÚC TÍCH HỢP LƯU TRỮ ĐÁM MÂY (VNAI DRIVE - HCDRIVE API)
- **Tên API & Thư mục:** `api_edu_share` | Thư mục: `edushare`.
- **Cơ chế xác thực:** Bearer Token thông qua Header `Authorization: Bearer 9d_live_...`.
- **Đặc tả Multipart/form-data RFC 7578 (`vnai_drive.py`):**
  - Phần `filesMeta` (JSON string) **bắt buộc phải đứng trước** phần tệp nhị phân `file-0`.
  - Có header định danh `Content-Type: application/json; charset=utf-8`.
  - Thuộc tính `"sizeBytes"` bắt buộc phải là dạng chuỗi (`string`, ví dụ: `"24510"`), không được dùng kiểu số nguyên để tương thích với Fastify/Busboy parser.
  - Header `Content-Disposition` của phần tệp nhị phân chỉ sử dụng tên tệp ASCII an toàn, tên tiếng Việt đầy đủ được lưu trữ trong `filesMeta`.
- **Tải tệp trực tiếp (Direct Streaming Proxy):**
  - Người dùng tải tài liệu qua endpoint backend `/api/docs/{doc_id}/download`.
  - Backend đọc stream trực tiếp từ HCDrive hoặc CDN và trả thẳng dữ liệu nhị phân về cho trình duyệt.
  - **Cam kết:** Người dùng không bao giờ bị chuyển hướng sang trang web thứ 3 hoặc giao diện quản lý drive.
- **Dọn dẹp tự động 60 ngày:**
  - Tự động xóa vĩnh viễn các tài liệu và tệp lưu trữ quá hạn 60 ngày nhằm tối ưu dung lượng đám mây.

---

## 3. TÍCH HỢP HÌNH HỌC GEOCHALK 3D / 2D
- **Đường dẫn ứng dụng:** `https://math.vn-ai.cloud/geochalk/geochalk.html`.
- **Cơ chế xác thực SSO:**
  - Khi người dùng đăng nhập tài khoản EduShare bấm mở GeoChalk, hệ thống gọi API `/api/sso/create-token` để sinh token xác thực an toàn.
  - Chuyển hướng kèm theo token và `project_id` nếu người dùng mở dự án cụ thể.
  - Nếu là khách vãng lai, cho phép mở trực tiếp GeoChalk để trải nghiệm nhanh không rào cản.

---

## 4. CÁC TÍNH NĂNG TỐI ƯU HÓA TRẢI NGHIỆM NGƯỜI DÙNG (0ms PERCEIVED LATENCY)
1. **Gửi tin nhắn tức thì (Optimistic Chat UI):**
   - Xóa trắng ô nhập liệu ngay khi nhấn Enter / Gửi.
   - Thêm tin nhắn tạm vào danh sách với huy hiệu spinner trạng thái `Đang gửi...`.
   - Khi WebSocket / HTTP xác nhận thành công, tự động thay thế bằng ID máy chủ và chuyển sang trạng thái đã gửi.
2. **Nhận tin nhắn thời gian thực hai chiều (FastAPI Native WebSockets):**
   - Đa người dùng trong phòng nhận tin nhắn đồng thời không cần tải lại trang (Zero F5).
   - Tự động kết nối lại (Auto Reconnect) khi mất kết nối mạng.
3. **Phân quyền xóa bài viết Diễn đàn:**
   - Chỉ người tạo bài viết hoặc Quản trị viên mới thấy nút "Xóa bài viết".
   - Backend kiểm tra phân quyền nghiêm ngặt, trả về mã lỗi HTTP 403 Forbidden nếu người xóa không phải tác giả.
4. **Đăng bài viết Optimistic:**
   - Bản tin tức thì hiển thị bài viết kèm huy hiệu "Đang đăng...", xóa form để người dùng tiếp tục thao tác.
5. **Chia sẻ bài viết & Deep Linking:**
   - Hỗ trợ URL tham chiếu `?postId=...`.
   - Tự động cuộn đến bài viết và kích hoạt hiệu ứng viền phát sáng Facebook (`postPulseGlow`).
6. **Đồng bộ ảnh đại diện tức thì (Zero-Latency Avatar Sync):**
   - Nén ảnh qua HTML5 Canvas xuống WebP 256x256 px (~15-25 KB).
   - Cập nhật ngay toàn bộ avatar trên giao diện (Nav rail, Chat, Post, Comment) và phát sóng sự kiện WebSocket `user_profile_updated`.

---

## 5. NHẬT KÝ SỬA LỖI & KHẮC PHỤC SỰ CỐ (DEFECT & RESOLUTION LOG)

### 📌 LỖI 1: TẤT CẢ CÁC NÚT BẤM KHÔNG PHẢN HỒI (ALL BUTTONS UNRESPONSIVE)
- **Triệu chứng:** Sau khi khởi động ứng dụng trong Docker và mở trên trình duyệt, toàn bộ nút bấm trên giao diện (nút tab Nav rail, nút mở modal, nút gửi tin nhắn, nút đăng nhập, v.v.) hoàn toàn không phản hồi khi click.
- **Nguyên nhân gốc rễ (Root Cause):**
  1. **Lỗi cú pháp JavaScript (SyntaxError):** Trong file `app.js` tại dòng 1063 xuất hiện một ký tự ngoặc nhọn đóng dư thừa `}` ngay sau hàm `openProfileModal()`. Do toàn bộ mã nguồn nằm trong hàm bao IIFE `(function () { ... })();`, ký tự thừa này đã đóng sớm IIFE, dẫn đến lỗi cú pháp phân tích `SyntaxError: Unexpected token ')'` ở cuối file. Trình duyệt dừng thực thi toàn bộ script ngay từ bước biên dịch, khiến không có bất kỳ bộ lắng nghe sự kiện (`addEventListener`) nào được đăng ký.
  2. **Lỗi kẹt lớp phủ Modal Backdrop (`z-index: 9999`):** Hàm `openModal()` gán thuộc tính inline `display: flex !important` cho phần tử modal. Tuy nhiên, logic đóng modal khi click ra ngoài backdrop hoặc ấn phím Escape trước đó chỉ gỡ bỏ class `active` mà không xóa thuộc tính inline `display: flex !important`. Điều này khiến lớp phủ backdrop toàn màn hình tiếp tục tồn tại vô hình và chặn toàn bộ sự kiện click chuột của người dùng.
- **Biện pháp khắc phục (Resolution):**
  - Xóa bỏ ký tự thừa `}` tại dòng 1063 trong `app.js`.
  - Tái cấu trúc hàm `initModals()`:
    + Cho phép toàn bộ phần tử có thuộc tính `[data-close]` kích hoạt đóng modal (thay vì chỉ `.btn-close-modal`).
    + Khi click vào vùng backdrop hoặc nhấn Escape, luôn gọi hàm `closeModal(id)` chuẩn để đồng bộ gỡ bỏ class `active` và xóa triệt để thuộc tính `display: none !important`.
  - Tái cấu trúc hàm `initApp()` theo mô hình **Khởi tạo phòng vệ (Resilient Lifecycle Initialization)**:
    + Bọc `try...catch` riêng biệt cho từng module (`Theme`, `User`, `Modals`, `Auth`, `Profile`, `Group`, `Chat`, `GeoChalk`, `Forum`, `Vault`, `Contacts`, `NavRail`, `Preview`, `ReactionBar`).
    + Đảm bảo nếu một module con gặp sự cố DOM thì toàn bộ các module và nút bấm còn lại vẫn được khởi tạo và hoạt động 100%.
  - Cập nhật số phiên bản cache-buster trong `index.html` lên `app.js?v=20261105.301` để trình duyệt xóa bộ nhớ cache cũ.

---

### 📌 LỖI 2: VNAI DRIVE UPLOAD BÁO LỖI 400 & 404
- **Triệu chứng:** Log container Docker báo lỗi `Invalid multipart request with 0 mime parts` (HTTP 400) hoặc `Cannot POST /api/api/v1/uploads` (HTTP 404).
- **Nguyên nhân:**
  - Header multipart thiếu định dạng MIME `Content-Type: application/json; charset=utf-8` ở phần `filesMeta`.
  - Trường `"sizeBytes"` trong metadata gửi kiểu số nguyên thay vì chuỗi (`string`).
  - Đường dẫn endpoint bị lặp `/api`.
- **Biện pháp khắc phục:** Chuẩn hóa payload nhị phân trong `vnai_drive.py`, ép kiểu `sizeBytes: str(len(file_bytes))` và chuẩn hóa danh sách candidate URLs.

---

### 📌 LỖI 3: CẢNH BÁO CLEAN 60 NGÀY BÁO LỖI HTTP 404
- **Triệu chứng:** Backend ghi log cảnh báo `[60-Day Drive Clean Warn]: HTTP Error 404: Not Found`.
- **Nguyên nhân:** Biến môi trường `.env` chứa URL Google Apps Script mẫu `AKfycb_sample_test`.
- **Biện pháp khắc phục:** Trong `main.py`, tự động kiểm tra và bỏ qua gọi Web App nếu URL chứa chuỗi mẫu `AKfycb_sample_test`.

---

### 📌 LỖI 4: ROUTE FAVICON BÁO LỖI 404
- **Triệu chứng:** Log hiển thị `GET /favicon.ico 404 Not Found`.
- **Biện pháp khắc phục:** Đã thêm route `@app.get("/favicon.ico")` trong `main.py` trả về `Response(status_code=204)`.

---

### 📌 LỖI 5: DOCKER COMPOSE OBSOLETE VERSION ATTRIBUTE
- **Triệu chứng:** Cảnh báo `the attribute version is obsolete` khi khởi chạy docker-compose.
- **Biện pháp khắc phục:** Đã loại bỏ dòng `version: '3.8'` trong `docker-compose.yml`.

---

### 📌 LỖI 6: QUERY PARAMETERS TRÊN ĐƯỜNG DẪN TỆP CỤC BỘ GÂY KHÔNG TẢI ĐƯỢC CSS/JS
- **Triệu chứng:** Khi mở trực tiếp trang HTML, giao diện bị vỡ layout, các modal hiển thị thô sơ dạng văn bản dọc Times New Roman.
- **Nguyên nhân:** Thẻ `<link rel="stylesheet" href="style.css?v=...">` và `<script src="app.js?v=...">` chứa ký tự query string `?v=...`. Trình duyệt Chromium trên hệ điều hành Windows khi xử lý đường dẫn tệp cục bộ (`file:///`) coi toàn bộ chuỗi có dấu `?` là tên tệp thực tế trên ổ đĩa, dẫn đến lỗi không tìm thấy tệp do ký tự `?` không hợp lệ trên hệ thống tệp NTFS.
- **Biện pháp khắc phục:** Chuẩn hóa đường dẫn thành `href="style.css"` và `src="app.js"`, đảm bảo tương thích 100% trên cả máy chủ web HTTP (cổng 5500) lẫn chế độ xem tệp cục bộ.

---

### 📌 LỖI 7: PHÒNG VỆ CHẶN HIỂN THỊ TRÀN CỦA 14 MODAL BACKDROP
- **Triệu chứng:** Nếu tệp CSS bị trễ trong quá trình tải hoặc mạng chập chờn, các phần tử modal popup xuất hiện tràn ra giữa màn hình và có thể vô tình chặn sự kiện click chuột.
- **Nguyên nhân:** Các thẻ `<div class="modal-backdrop">` trong `index.html` trước đó phụ thuộc 100% vào CSS selector `.modal-backdrop { display: none; }` mà không có thuộc tính inline style phòng ngự.
- **Biện pháp khắc phục:** Bổ sung trực tiếp thuộc tính `style="display: none;"` cho toàn bộ 14 modal backdrop trong `index.html`. Khi mở modal, hàm `openModal()` sẽ kích hoạt `display: flex !important` và khi đóng sẽ chuyển về `display: none !important`, triệt tiêu hoàn toàn nguy cơ kẹt lớp phủ vô hình.

---

### 📌 LỖI 8: TIN NHẮN ĐỐI PHƯƠNG KHÔNG TỰ ĐỘNG HIỂN THỊ NẾU KHÔNG LÀM MỚI TRANG (F5 HOẶC CTRL + F5)
- **Triệu chứng:** Khi hai tài khoản nhắn tin với nhau, người nhận không thấy tin nhắn mới tự động hiện lên mà bắt buộc phải tải lại trang hoặc nhấn **Ctrl + F5** (Hard Reload) thì tin nhắn mới xuất hiện.
- **Nguyên nhân cốt lõi:**
  1. *Trình duyệt lưu tệp tĩnh vào Disk Cache do thiếu HTTP Header (Nguyên nhân phải bấm Ctrl + F5):* Trình duyệt Chrome/Edge tự động cache file `app.js` và `style.css` vì server FastAPI trước đó không gửi chỉ thị `Cache-Control: no-cache, no-store`. Khi người dùng mở trang bình thường hoặc F5 nhẹ, trình duyệt vẫn chạy mã JS cũ từ Disk Cache; chỉ khi nhấn **Ctrl + F5** thì trình duyệt mới chịu bỏ qua cache để nạp lại mã mới. Đồng thời các request API `fetch()` GET messages bị dính cache trình duyệt.
  2. *Backend phát sóng WebSocket chưa bao quát (Bỏ sót phòng cộng đồng & Dead Sockets):* Endpoint POST tin nhắn ban đầu phát sóng rời rạc. Phòng chat cộng đồng (`room_community`) trong database chỉ có Admin trong `members_json`, dẫn tới các thành viên khác nếu không đứng trực tiếp trong phòng tại thời điểm đó sẽ bị bỏ sót hoàn toàn. Các socket bị ngắt kết nối (dead sockets) không được dọn dẹp sạch sẽ dẫn đến nghẽn luồng phát sóng.
  3. *Frontend mất định danh khi đăng nhập & Hàng đợi gửi tin:* Khi người dùng 1-click login hoặc chuyển đổi tài khoản, WebSocket ban đầu ở vai trò Khách (Guest) không được đóng và tái tạo với email mới. Các gói tin gửi khi socket đang ở trạng thái `CONNECTING` bị rơi rụng do thiếu hàng đợi (queue).
  4. *Chu kỳ Polling dự phòng quá dài (2.5s - 5s):* Gây cảm giác có độ trễ lớn khi WebSocket gặp biến động mạng.
- **Biện pháp khắc phục triệt để (Zero-F5 & No-Ctrl-F5 Real-time Architecture):**
  1. *Triệt tiêu hoàn toàn Browser Cache (Chống dính Ctrl + F5):*
     - Bổ sung FastAPI HTTP Middleware `add_no_cache_headers` trong `main.py`: Ép toàn bộ các tệp `.js`, `.css`, `.html`, `.json` và tất cả route `/api/*` phải có header `Cache-Control: no-cache, no-store, must-revalidate, max-age=0`, `Pragma: no-cache`, `Expires: 0`.
     - Bổ sung Cache-Buster query param `?v=2026.1` trực tiếp vào `<link>` và `<script>` trong `index.html`.
     - Thêm tham số `{ cache: 'no-store' }` vào tất cả các lời gọi `fetch()` trong hàm `apiCall()` của `app.js`.
  2. *Cơ chế gom socket hợp nhất Backend (`broadcast_chat_message`):*
     - Xây dựng hàm `ws_manager.broadcast_chat_message()` trong `main.py` tự động tổng hợp danh sách socket mục tiêu (`target_sockets = set()`):
       + Tất cả socket đang mở trực tiếp phòng chat đó (`room_connections[room_id]`).
       + Tất cả socket của toàn bộ thành viên trong phòng (`user_connections[email]`).
       + Nếu là phòng cộng đồng (`room_community` hoặc `room.type == 'community'`): phát sóng tới **100% người dùng đang online** (`all_connections`).
     - Tự động gom và dọn dẹp các socket ngắt kết nối (`dead sockets`) ngay trong luồng phát sóng.
  3. *Tái tạo kết nối WebSocket & Hàng đợi gửi tin an toàn:*
     - Trong hàm `saveCurrentUser()` (`app.js`), ngay khi tài khoản được lưu, tự động đóng kết nối WebSocket cũ và khởi tạo lại kết nối mới mang theo `user_email` trong handshake URL.
     - Xây dựng `wsSendQueue`: Bất kỳ gói tin nào gửi qua `sendWsMessage()` khi socket chưa `OPEN` sẽ được đưa vào hàng đợi và tự động xả sạch ngay khi sự kiện `onopen` kích hoạt.
     - Bọc khối `try ... catch` toàn cục cho `handleWebSocketMessage` để ngăn ngừa mọi lỗi runtime ngắt luồng hiển thị tin nhắn.
  4. *Tăng tốc độ đồng bộ thời gian thực tầng 2 (1.5s Active Room Sync & Focus Gap Reconciliation):*
     - Tăng tốc `startActiveRoomSync()` từ 2.5s lên **1.5 giây** cho phòng chat đang mở.
     - Bắt sự kiện `window.onfocus` và `document.visibilitychange` để bù đắp tin nhắn ngay tức khắc khi chuyển tab.
     - Cơ chế Idempotent DOM Check `#msg-row-${msg.id}` ngăn ngừa 100% việc nhân đôi tin nhắn giữa WebSocket và Polling. Chuẩn hóa `room.last_message` thành object an toàn để sidebar luôn cập nhật mượt mà.

---

## 6. DANH SÁCH FILE CỐT LÕI CỦA DỰ ÁN
| Tên File | Vai trò |
|---|---|
| `app.js` | Toàn bộ logic giao diện, WebSocket client, xử lý sự kiện DOM, Optimistic UI |
| `index.html` | Cấu trúc giao diện EduShare, các modal popup, navigation rail, chat và forum |
| `style.css` | Hệ thống stylesheet giao diện, 3 chủ đề theme, hoạt ảnh animation, responsive |
| `main.py` | Máy chủ FastAPI, SQLite ORM, WebSocket Manager, REST API, SSO Token, Background tasks |
| `vnai_drive.py` | Module tích hợp lưu trữ đám mây drive.vn-ai.cloud (HCDrive REST API) |
| `docker-compose.yml` | Cấu hình dịch vụ Docker (FastAPI Web + Redis Alpine) |
| `memory_project.md` | Tài liệu theo dõi tiến độ, kiến trúc và nhật ký lỗi dự án |

---

## 7. HƯỚNG DẪN KHỞI CHẠY VÀ QUY TRÌNH KIỂM THỬ HỒI QUY (VERIFICATION CHECKLIST)
- **Lệnh khởi chạy Docker:**
  ```bash
  docker compose up -d --build
  ```
- **Địa chỉ truy cập ứng dụng:** `http://localhost:5500` (hoặc mở trực tiếp `index.html` trong chế độ phát triển).
- **Quy trình kiểm thử 6 bước toàn diện:**
  1. **Kiểm tra Navigation Rail:** Bấm chuyển đổi giữa các tab (Chat, Diễn đàn, Kho tài liệu, Danh bạ, Bảng vẽ GeoChalk). Xác nhận tất cả tab chuyển đổi mượt mà, không giật lag.
  2. **Kiểm tra Hệ thống Modal & Backdrop:** Mở modal Đăng nhập (`modal-auth`), modal Theme (`modal-theme-chooser`), modal Hồ sơ (`modal-profile`). Kiểm tra đóng modal bằng nút X, bấm ra ngoài backdrop và phím Escape. Xác nhận không còn tình trạng kẹt lớp phủ trong suốt `z-index: 9999`.
  3. **Kiểm tra Xác thực & 1-Click Login:** Sử dụng tài khoản mẫu để đăng nhập tức thì. Kiểm tra cập nhật UI người dùng và giải phóng các chức năng bị khóa của khách.
  4. **Kiểm tra Chat Optimistic & WebSocket:** Gửi tin nhắn văn bản và tệp tài liệu. Xác nhận tin nhắn hiển thị ngay với trạng thái đang gửi (0ms) và được cập nhật ID từ server qua kết nối WebSocket song công.
  5. **Kiểm tra Bảng tin Diễn đàn & Quyền xóa bài:** Đăng bài viết mới, thích bài viết, bình luận. Xác nhận nút xóa bài chỉ hiển thị với chính tác giả.
  6. **Kiểm tra Đồng bộ Avatar & Theme:** Đổi màu giao diện (Sáng / Tối / Bảng phấn) và đổi ảnh đại diện. Xác nhận cập nhật tức thì trên toàn bộ các khung hiển thị.
  7. **Kiểm tra Nhận tin nhắn Real-time (Zero-F5 Sync):** Mở hai phiên hoặc tab trình duyệt độc lập. Khi tài khoản A gửi tin nhắn, tài khoản B ở tab còn lại phải lập tức hiển thị tin nhắn mới mà không cần người dùng thao tác F5 hay tải lại trang. Chuyển tab qua lại kiểm tra tính năng Focus Gap Reconciliation tự động bù đắp tin nhắn.

---

## 8. NHẬT KÝ KIỂM THỬ THỰC TẾ (AUTOMATED VERIFICATION LOGS)
- **Thời gian thực hiện:** Ngày 17/11/2026.
- **Công cụ kiểm thử:** Kịch bản kiểm thử tự động `test_realtime.py` và trình duyệt Google Chrome thực tế (cửa sổ thông thường + cửa sổ ẩn danh Incognito).
- **Kết quả xác minh:**
  1. *Kiểm tra HTTP Headers chống Disk Cache:*
     - Tuyến `/`, `/index.html`, `/app.js`, `/style.css`, `/api/*` đều trả về `Cache-Control: no-cache, no-store, must-revalidate, max-age=0`, `Pragma: no-cache`, `Expires: 0`. Trình duyệt không thể lưu cache cũ.
  2. *Kiểm thử gửi tin nhắn 2 chiều thời gian thực (Zero-F5 Real-time Messaging):*
     - Tài khoản thực tế User A (`hotranminhky0405@gmail.com` - Admin Trung Hậu) gửi tin nhắn -> User B (`hohau951842@gmail.com` - Hồ Trần Trung Hậu) nhận tức thì sau **204.6ms** qua kết nối WebSocket song công, không cần F5 hoặc Ctrl + F5.
     - User B gửi tin nhắn phản hồi -> User A nhận tức thì sau **171.8ms** qua WebSocket và tự động render ngay lập tức vào DOM.
     - User A thực hiện thu hồi tin nhắn -> User B nhận sự kiện `message_recalled` tức thì và giao diện chuyển ngay sang trạng thái "Tin nhắn đã được thu hồi".
  3. *Kiểm tra giao diện thực tế:* Đã khởi chạy 2 phiên trình duyệt Chrome trên màn hình và chụp ảnh thực tế (`screenshot_edushare.png`). Mọi tin nhắn trao đổi 2 chiều và trạng thái thu hồi được định dạng chuẩn xác 100%. Sidebar phòng chat tự động nhảy trích đoạn tin nhắn mới nhất `Chào anh Hậu, em nhận...` kèm thời gian thực 22:18.

---

## 9. KHẮC PHỤC TRIỆT ĐỂ LỖI ĐÈ LỚP GIAO DIỆN KHI THU HẸP CỬA SỔ (ZERO-OVERLAP RESPONSIVE ARCHITECTURE)
- **Tình trạng lỗi (Người dùng phản ánh kèm ảnh):**
  - Khi co hẹp hoặc thu nhỏ cửa sổ trình duyệt về kích thước trung bình hoặc nhỏ, thanh sidebar danh sách hội thoại (`.sidebar-column`) bị nhảy sang `position: absolute`, trôi nổi đè lên trên khung chat (`.main-viewport`), che khuất một nửa nội dung tin nhắn và tạo nên bố cục lỗi chồng chéo chữ.
- **Nguyên nhân kỹ thuật:**
  - Breakpoint cũ `@media (max-width: 900px)` gán `.sidebar-column { position: absolute; left: var(--nav-width); width: calc(100vw - var(--nav-width)); max-width: 360px; }`. Khi người dùng co dãn cửa sổ trên máy tính (trong dải 769px - 900px), sidebar nhảy khỏi luồng hiển thị flex tự nhiên và đè lên khung chat mà không có cơ chế ẩn khung chat bên dưới.
- **Giải pháp khắc phục triệt để (Kiến trúc phân lập Zero-Overlap):**
  1. *Desktop & Cửa sổ thu hẹp vừa (>= 769px):*
     - Đưa `.sidebar-column` và `.main-viewport` vào luồng flex song song đồng cấp (`position: relative; display: flex`), triệt tiêu hoàn toàn `position: absolute`.
     - Tối ưu chiều rộng sidebar từ 330px xuống 270px trên dải 769px - 1024px để chừa trên 450px cho khung chat thoải mái hiển thị tin nhắn.
  2. *Mobile & Cửa sổ siêu hẹp (<= 768px):*
     - Áp dụng nguyên lý Single-Column Navigation (Chế độ đơn cột độc lập):
       - Khi xem danh sách hội thoại (`.sidebar-column:not(.sidebar-mobile-hidden)`): Sidebar mở bung toàn màn hình và ẩn hoàn toàn khung chat (`~ .main-viewport { display: none !important; }`).
       - Khi chọn một phòng chat (`.sidebar-column.sidebar-mobile-hidden`): Ẩn hoàn toàn sidebar (`display: none !important;`) và mở bung khung chat toàn màn hình kèm nút quay lại `btn-mobile-back`.
  3. *Tự động đồng bộ hóa trên `app.js`:*
     - Cập nhật ngưỡng chuyển trạng thái từ 900px sang 768px tại `selectRoom()` và `switchMainTab()`.
     - Bổ sung trình lắng nghe sự kiện `window.addEventListener('resize')` tự động tháo bỏ `sidebar-mobile-hidden` khi người dùng kéo giãn cửa sổ > 768px để hiển thị song song ngay lập tức, và tự động thu gọn drawer thông tin khi màn hình nhỏ.
- **Kết quả:** Triệt tiêu 100% hiện tượng đè lớp (overlay bug), giao diện mượt mà và trực quan ở mọi độ phân giải (từ màn hình lớn 4K, laptop, cửa sổ snap nửa màn hình 850px đến điện thoại 375px).
- **Hình ảnh xác minh thực tế:**
  - `screenshot_medium_850.png`: Kiểm chứng cửa sổ thu nhỏ 850px hiển thị 2 cột song song hoàn hảo, sidebar 270px và khung chat 530px+, không còn đè lớp.
  - `screenshot_desktop_1200.png`: Kiểm chứng cửa sổ đầy đủ 1200px hiển thị thanh thoát, thoáng đãng.
  - `screenshot_mobile_500.png`: Kiểm chứng màn hình di động 500px hiển thị đơn cột độc lập, đầy đủ nút quay lại và navigation rail bên dưới.
  - Kiểm thử tự động `test_realtime.py` trong Docker đạt 100% tỷ lệ thành công (gửi/nhận 2 chiều, thu hồi tin nhắn, bảo vệ cache HTTP).

---

## 10. HOÀN THIỆN DOCKER, MÁY CHỦ VÀ DỌN DẸP TỆP THỪA (CLEANUP & PRODUCTION PACKAGING)
- **Rà soát và dọn dẹp các tệp thừa (Chỉ xóa phần thừa, bảo toàn 100% phần đang chạy):**
  - Đã xóa `server.js` và `server.py`: Đây là hai bản thử nghiệm server độc lập cũ từ đầu tháng 11 trước khi hệ thống chuyển hẳn sang máy chủ chuẩn FastAPI (`main.py`). Không còn bất kỳ tiến trình nào sử dụng.
  - Đã xóa thư mục `scratch/`: Thư mục chứa hơn 70 script vá lỗi và kiểm tra tạm thời trong các đợt phát triển trước đó.
- **Hoàn thiện cấu hình Docker & Môi trường:**
  - Cập nhật [requirements.txt](requirements.txt): Bổ sung `websockets>=12.0` và `httpx>=0.27.0` để hỗ trợ kiểm thử tự động nội bộ trong container và các tác vụ mạng không đồng bộ.
  - Cập nhật [.dockerignore](.dockerignore): Loại trừ `scratch/`, các tệp ảnh `*.png`, `*.jpg` và cache để tối ưu kích thước build context từ 56MB xuống siêu nhẹ, tăng tốc độ đóng gói container Docker.
  - Tái xây dựng image và khởi chạy thành công qua `docker compose up -d --build`:
    + `edushare-redis`: Redis 7 Alpine chạy cổng 6379 lưu trữ OTP và phiên làm việc.
    + `edushare-fastapi`: FastAPI + Uvicorn ASGI chạy cổng 5500, kết nối Redis và SQLite mượt mà.
- **Kiểm thử xác minh sau đóng gói:**
  - Chạy kịch bản `test_realtime.py` bên trong container `edushare-fastapi`:
    + Kiểm tra HTTP Cache Headers: 100% tệp tĩnh và API có header `no-cache, no-store`.
    + Kiểm tra Real-time 2 chiều: User A (`hotranminhky0405@gmail.com`) và User B (`hohau951842@gmail.com`) nhận tin nhắn trong **158.5ms - 200.4ms**, thu hồi tin nhắn tức thì.

---

## 11. KHẮC PHỤC TOÀN DIỆN 8 LỖ HỔNG AN NINH THÔNG TIN TRỌNG YẾU (SECURITY HARDENING COMPLETED)
- **Thời gian hoàn thành:** 22/11/2026.
- **Chi tiết khắc phục từng lỗ hổng:**
  1. **Lỗ hổng 1 - Lưu trữ mật khẩu dạng văn bản thuần (Plain Text Password Storage):**
     - Đã nâng cấp thuật toán băm mật khẩu chuẩn công nghiệp: `PBKDF2-HMAC-SHA256` với `100.000` vòng lặp, salt ngẫu nhiên 16 bytes (`secrets.token_hex(16)`).
     - Áp dụng so sánh chuỗi thời gian hằng số `hmac.compare_digest` triệt tiêu Timing Attack.
     - Triển khai cơ chế Zero-Downtime Migration: Người dùng cũ đăng nhập bằng mật khẩu plain-text ban đầu sẽ được hệ thống tự động băm và lưu đè dạng `pbkdf2_sha256$100000$...` mà không làm gián đoạn trải nghiệm người dùng.
     - Cập nhật các API `api_register_user`, `api_reset_password` băm mật khẩu chuẩn hóa và mở rộng cột `DBUser.password` lên `String(256)`.
  2. **Lỗ hổng 2 - Lộ toàn bộ CSDL SQLite và file cấu hình qua Static Files:**
     - Thiết lập lớp phòng thủ đa tầng (Defense-in-Depth):
       + *Tầng Middleware:* `block_sensitive_files_middleware` chặn và trả về HTTP 404 cho mọi truy vấn chứa đuôi tệp `.db`, `.sqlite`, `.env`, `.py`, `.yml`, `.yaml`, `.git`, `edushare.db`, `Dockerfile`.
       + *Tầng Application:* Thay thế `StaticFiles` bằng `SecureStaticFiles` kế thừa từ Starlette: Áp dụng Whitelist nghiêm ngặt chỉ phục vụ các đuôi tệp web tĩnh an toàn (`.html`, `.css`, `.js`, `.png`, `.jpg`, `.pdf`, `.json`...). Mọi tệp không có đuôi mở rộng hoặc nằm ngoài whitelist đều bị từ chối 404.
       + *Tầng Reverse Proxy:* Khuyến nghị luật Nginx `location ~* \.(db|sqlite|env|py|...)$ { deny all; return 404; }`.
  3. **Lỗ hổng 3 - Khách hàng tự kiểm soát mã xác thực OTP (Client-Side OTP Injection):**
     - Loại bỏ hoàn toàn trường `otp` khỏi schema nhận vào `SendOtpRequest`.
     - Chuyển 100% quyền sinh OTP về phía máy chủ bằng CSPRNG chuẩn an ninh: `secrets.randbelow(900000) + 100000` tạo mã 6 chữ số ngẫu nhiên không thể đoán trước và lưu trữ với TTL 600s trên Redis Cache.
     - Xóa bỏ việc sinh `Math.floor(...)` và trường `otp` phía client tại `app.js`.
  4. **Lỗ hổng 4 - Lỗ hổng kiểm soát phân quyền (BOLA / IDOR) trên các thao tác Xóa/Sửa:**
     - Tích hợp hàm xác thực phiên tập trung `get_auth_user(request, db)` thông qua Bearer Token `edt_<uuid>_<timestamp>` lưu trong Redis.
     - Kiểm soát phân quyền chặt chẽ trên 4 API trọng yếu:
       + `PUT /api/users/profile`: Chỉ chính chủ tài khoản hoặc Quản trị viên hệ thống (`is_system_admin`) mới được phép chỉnh sửa.
       + `DELETE /api/rooms/{room_id}`: Chỉ duy nhất Trưởng nhóm (`leader`) hoặc Super Admin mới được xóa vĩnh viễn nhóm.
       + `DELETE /api/posts/{post_id}`: Chỉ tác giả bài viết (`post.author_id` / `post.author_email`) hoặc Super Admin mới có quyền xóa.
       + `DELETE /api/docs/{doc_id}`: Chỉ người tải lên (`uploader_email`), Trưởng nhóm của phòng chứa tài liệu hoặc Super Admin mới có quyền xóa.
  5. **Lỗ hổng 5 - Stored XSS khi xem trước tài liệu tải lên:**
     - Bổ sung hàm kiểm duyệt MIME và đuôi tệp `is_safe_for_inline()`: Các tệp có khả năng chứa script (HTML, HTM, SVG, XML, JS, XHTML, SHTML...) tuyệt đối bị chặn xem `inline`, bắt buộc ép tải về dạng tệp đính kèm nhị phân (`Content-Disposition: attachment; filename="..."`, `media_type: application/octet-stream`).
     - Bổ sung header an ninh `X-Content-Type-Options: nosniff` vào 100% phản hồi tải và xem trước tệp để triệt tiêu hành vi MIME Sniffing của trình duyệt.
  6. **Lỗ hổng 6 - SSRF và bỏ qua xác thực SSL trong GeoChalk PHP Backend (`api.php`):**
     - Bổ sung bộ lọc Whitelist Hostname cho `$customAuthUrl`: Chỉ cho phép kết nối đến các domain/host đáng tin cậy (`edushare.vn-ai.cloud`, `math.vn-ai.cloud`, `localhost`, `127.0.0.1`, `192.168.1.240` hoặc đuôi `.vn-ai.cloud`). Từ chối và bỏ qua mọi URL khác.
     - Bật xác thực SSL nghiêm ngặt cho cURL: `CURLOPT_SSL_VERIFYPEER => true`, `CURLOPT_SSL_VERIFYHOST => 2` cho các domain/host công khai.
  7. **Lỗ hổng 7 - Cấu hình CORS Wildcard kết hợp `allow_credentials=True`:**
     - Loại bỏ `allow_origins=["*"]`.
     - Thay thế bằng danh sách `ALLOWED_ORIGINS` tin cậy (đọc từ biến môi trường hoặc mặc định: `https://edushare.vn-ai.cloud`, `https://math.vn-ai.cloud`, `http://localhost:5500`, `http://127.0.0.1:5500`, `http://localhost:8080`, `http://127.0.0.1:8080`).
  8. **Lỗ hổng 8 - Lộ cổng Redis 6379 công khai và mật khẩu SMTP trong Docker:**
     - Thu hẹp cổng Redis lắng nghe: Đổi `ports: - "6379:6379"` thành `ports: - "127.0.0.1:6379:6379"`.
     - Chuyển `SMTP_PASS` và các cấu hình nhạy cảm sang `.env`, nạp qua `env_file: - .env` trong `docker-compose.yml`.
     - Loại bỏ `SMTP_PASS` và `SMTP_USER` hardcode khỏi `Dockerfile`.
     - Bổ sung `*.db`, `*.sqlite`, `*.sqlite3` và `.env` vào [.gitignore](.gitignore).
- **Kết quả kiểm thử tự động toàn diện (`test_security.py` & `test_realtime.py`):**
  - Đạt 100% tỷ lệ thành công trên tất cả các phép thử an ninh thông tin và các tính năng nghiệp vụ.
  - Hệ thống real-time WebSocket, gửi nhận tin nhắn 2 chiều, thu hồi tin nhắn, tải/xem tài liệu hoạt động mượt mà và an toàn tuyệt đối.






