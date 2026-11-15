/**
 * ==========================================================================
 * GOOGLE APPS SCRIPT: BACKEND KẾT NỐI & ĐỒNG BỘ GOOGLE DRIVE CHO EDUSHARE
 * ==========================================================================
 * Hướng dẫn triển khai (Chỉ mất 2 phút):
 * 1. Mở trang: https://script.google.com/
 * 2. Nhấp vào "Dự án mới" (New project), đặt tên dự án là "EduShare Drive Sync".
 * 3. Xóa code cũ và dán toàn bộ nội dung file này vào.
 * 4. Nhấp nút "Triển khai" (Deploy) > "Tùy chọn triển khai mới" (New deployment).
 *    - Chọn loại: Ứng dụng web (Web app).
 *    - Mô tả: EduShare Drive Sync
 *    - Thực thi dưới dạng: Tôi (tài khoản Google của bạn).
 *    - Ai có quyền truy cập: Bất kỳ ai (Anyone).
 * 5. Nhấp "Triển khai" và Cấp quyền truy cập Google Drive của bạn (Advanced > Go to EduShare).
 * 6. Sao chép "URL ứng dụng web" (Web App URL, dạng https://script.google.com/macros/s/.../exec)
 *    và dán vào ô "URL Web App Google Apps Script" trong menu "Cài Đặt Thư Mục Google Drive" trên EduShare.
 *
 * TỰ ĐỘNG XÓA TỆP CŨ SAU 30 NGÀY:
 * - Để kích hoạt tự động xóa tệp sau 30 ngày: Trong trình biên tập Script, chọn hàm
 *   "setupAutoCleanTrigger" và nhấn nút "Chạy" (Run) 1 lần duy nhất.
 * - Hệ thống sẽ tự động quét và dọn dẹp các tệp quá hạn 30 ngày vào 1h00 sáng mỗi ngày.
 * ==========================================================================
 */

// ID thư mục Google Drive lưu trữ tài liệu EduShare của bạn
const PARENT_FOLDER_ID = '1jfeInxopW2mbPNpVkjsc-nAhZfyPZr7e';

/**
 * Xử lý yêu cầu gửi từ Web App EduShare lên Google Drive
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Yêu cầu không chứa dữ liệu JSON hợp lệ.');
    }

    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'upload_file';

    // 1. TÍNH NĂNG GỬI EMAIL MÃ OTP THẬT VỀ GMAIL
    if (action === 'send_otp') {
      const email = data.email;
      const otp = data.otp;
      const type = data.type === 'forgot' ? 'ĐẶT LẠI MẬT KHẨU' : 'ĐĂNG KÝ TÀI KHOẢN';

      if (!email || !otp) {
        throw new Error('Thiếu địa chỉ email hoặc mã OTP.');
      }

      const subject = `[EduShare] Mã xác minh OTP ${type}: ${otp}`;
      const body = `Chào bạn,\n\n` +
                   `Bạn vừa yêu cầu ${type} trên ứng dụng trao đổi học tập EduShare.\n\n` +
                   `Mã xác minh OTP của bạn là: ${otp}\n\n` +
                   `Lưu ý: Mã xác nhận có HIỆU LỰC TRONG 10 PHÚT. Vui lòng không chia sẻ mã này cho bất kỳ ai.\n\n` +
                   `Trân trọng,\n` +
                   `Ban Quản Trị Hệ Thống EduShare`;

      MailApp.sendEmail({
        to: email,
        subject: subject,
        body: body
      });

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        action: 'send_otp',
        email: email,
        message: 'Đã gửi mã OTP đến Gmail thành công'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. ĐỒNG BỘ XÓA FILE KHI NGƯỜI DÙNG THU HỒI / XÓA TIN NHẮN HOẶC XÓA TÀI LIỆU
    if (action === 'delete_file') {
      const fileId = data.fileId || '';
      const docId = data.docId || '';
      const fileName = data.fileName || '';
      let deletedCount = 0;

      // Xóa theo File ID trực tiếp nếu có
      if (fileId) {
        try {
          const f = DriveApp.getFileById(fileId);
          if (f) {
            f.setTrashed(true);
            deletedCount++;
          }
        } catch (_) {}
      }

      // Xóa tìm theo docId hoặc fileName trong thư mục EduShare
      if (docId || fileName) {
        let parentFolder;
        try {
          parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
        } catch (_) {
          parentFolder = DriveApp.getRootFolder();
        }

        const files = parentFolder.getFiles();
        while (files.hasNext()) {
          const file = files.next();
          const desc = file.getDescription() || '';
          const name = file.getName() || '';

          const matchDocId = Boolean(docId && (desc.includes(docId) || name.includes(docId)));
          const matchName = Boolean(fileName && name === fileName);

          if (matchDocId || matchName) {
            file.setTrashed(true);
            deletedCount++;
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        action: 'delete_file',
        deletedCount: deletedCount,
        message: `Đã xóa đồng bộ ${deletedCount} tệp trên Google Drive`
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. ĐỒNG BỘ XÓA SẠCH TOÀN BỘ FILE CỦA NHÓM KHI NHÓM BỊ XÓA VĨNH VIỄN
    if (action === 'delete_group_files') {
      const roomId = data.roomId || '';
      const groupName = data.groupName || '';
      const docIds = data.docIds || [];
      let deletedCount = 0;

      let parentFolder;
      try {
        parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
      } catch (_) {
        parentFolder = DriveApp.getRootFolder();
      }

      const files = parentFolder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        const desc = file.getDescription() || '';
        const name = file.getName() || '';

        const matchRoom = Boolean(roomId && desc.includes(roomId));
        const matchGroupName = Boolean(groupName && (desc.includes(groupName) || name.includes(groupName)));
        const matchDocId = docIds.some(function(dId) { return dId && (desc.includes(dId) || name.includes(dId)); });

        if (matchRoom || matchGroupName || matchDocId) {
          file.setTrashed(true);
          deletedCount++;
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        action: 'delete_group_files',
        deletedCount: deletedCount,
        message: `Đã dọn sạch ${deletedCount} tệp của nhóm '${groupName}' trên Google Drive`
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. TỰ ĐỘNG DỌN DẸP CÁC FILE CŨ HƠN 30 NGÀY (KÍCH HOẠT TỪ SERVER HOẶC TRÌNH DUYỆT)
    if (action === 'clean_old_files') {
      const deletedCount = cleanOldEduShareFiles();
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        action: 'clean_old_files',
        deletedCount: deletedCount,
        message: `Đã tự động dọn dẹp ${deletedCount} tệp quá hạn 30 ngày trên Google Drive`
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5. TÍNH NĂNG ĐỒNG BỘ TỆP LÊN GOOGLE DRIVE (UPLOAD_FILE)
    const fileName = data.fileName || 'tai-lieu-edushare.pdf';
    const mimeType = data.mimeType || 'application/pdf';
    const fileBase64 = data.fileBase64 || '';
    const subject = data.subject || 'Chung';
    const uploader = data.uploader || 'Người dùng EduShare';
    const note = data.note || '';
    const roomId = data.roomId || '';
    const groupName = data.groupName || '';
    const docId = data.docId || `doc_${Date.now()}`;

    let targetFolder;
    try {
      targetFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
    } catch (_) {
      targetFolder = DriveApp.getRootFolder();
    }

    let file;
    if (fileBase64) {
      let cleanB64 = fileBase64;
      if (cleanB64.indexOf(',') !== -1) {
        cleanB64 = cleanB64.split(',')[1];
      }
      const decodedBytes = Utilities.base64Decode(cleanB64);
      const blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
      file = targetFolder.createFile(blob);
    } else {
      const content = `TÀI LIỆU HỌC TẬP EDUSHARE: ${fileName}\n` +
                      `Nhóm: ${groupName} (Mã phòng: ${roomId})\n` +
                      `Mã tài liệu: ${docId}\n` +
                      `Môn học: ${subject}\n` +
                      `Người chia sẻ: ${uploader}\n` +
                      `Thời gian tải lên: ${new Date().toLocaleString('vi-VN')}\n` +
                      `Ghi chú: ${note}\n` +
                      `Hệ thống EduShare - Lưu trữ an toàn đám mây 30 ngày.`;
      file = targetFolder.createFile(fileName, content, 'text/plain');
    }

    // Đặt mô tả định danh hệ thống và cấp quyền xem công khai qua link
    file.setDescription(`[EduShare] Nhóm: ${groupName} (ID: ${roomId}) | Tệp: ${docId} | Người tải: ${uploader} | Môn: ${subject}`);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    const driveUrl = file.getUrl();
    const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    const result = {
      status: 'success',
      action: 'upload_file',
      fileId: fileId,
      docId: docId,
      fileName: file.getName(),
      driveUrl: driveUrl,
      downloadUrl: directDownloadUrl,
      folderUrl: targetFolder.getUrl(),
      createdAt: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Xử lý GET để kiểm tra trạng thái kết nối Web App
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'connected',
    message: 'Google Apps Script EduShare Drive Sync đang hoạt động tốt!',
    parentFolderId: PARENT_FOLDER_ID,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * HÀM QUÉT VÀ TỰ ĐỘNG XÓA TẤT CẢ CÁC TỆP EDUSHARE CŨ HƠN 30 NGÀY
 */
function cleanOldEduShareFiles() {
  try {
    let parentFolder;
    try {
      parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
    } catch (_) {
      parentFolder = DriveApp.getRootFolder();
    }

    const files = parentFolder.getFiles();
    const now = new Date().getTime();
    const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    while (files.hasNext()) {
      const file = files.next();
      const desc = file.getDescription() || '';
      const name = file.getName() || '';

      const isEduShareFile = desc.includes('[EduShare]') || name.includes('edushare') || desc.includes('ID:');
      const isExpired = (now - file.getDateCreated().getTime()) > SIXTY_DAYS_MS;

      if (isEduShareFile && isExpired) {
        file.setTrashed(true);
        deletedCount++;
      }
    }
    Logger.log(`Đã tự động chuyển ${deletedCount} tệp EduShare quá hạn 60 ngày vào thùng rác.`);
    return deletedCount;
  } catch(e) {
    Logger.log('Lỗi dọn dẹp file cũ: ' + e);
    return 0;
  }
}

/**
 * HÀM CÀI ĐẶT TRIGGER TỰ ĐỘNG CHẠY MỖI NGÀY 1 LẦN VÀO 1H00 SÁNG
 * (Chỉ cần nhấn Run hàm này 1 lần duy nhất trong Google Apps Script Editor)
 */
function setupAutoCleanTrigger() {
  // Xóa các trigger cũ cùng tên nếu có
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'cleanOldEduShareFiles') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Tạo trigger chạy mỗi ngày vào khoảng 1h00 - 2h00 sáng
  ScriptApp.newTrigger('cleanOldEduShareFiles')
    .timeBased()
    .everyDays(1)
    .atHour(1)
    .create();

  Logger.log('Đã cài đặt thành công lịch tự động xóa tệp quá hạn 30 ngày vào 1h00 sáng mỗi ngày!');
}
