const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const tls = require('tls');

// Cấu hình cổng: ưu tiên tham số dòng lệnh --port hoặc biến môi trường PORT, mặc định 5500
const portArgIdx = process.argv.indexOf('--port');
const PORT = process.env.PORT ? parseInt(process.env.PORT) : (portArgIdx !== -1 ? parseInt(process.argv[portArgIdx + 1]) : 5500);
const DIR = __dirname;

// ==================== CẤU HÌNH GMAIL SMTP ====================
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 465,
  user: 'hotrantrunghau951842@gmail.com',
  pass: 'qtfzemasubiterqv', // Google App Password (qtfz emas ubit erqv)
  fromName: 'Ban Quản Trị EduShare'
};

/**
 * Gửi email thật qua giao thức SMTP Gmail (TLS Port 465)
 * Thuần Node.js (tls), không cần cài đặt thêm thư viện phụ thuộc.
 */
function sendMailViaGmailSMTP({ to, subject, html, text }) {
  return new Promise((resolve, reject) => {
    if (!to || !to.includes('@')) {
      return reject(new Error('Địa chỉ email người nhận không hợp lệ.'));
    }

    const socket = tls.connect(SMTP_CONFIG.port, SMTP_CONFIG.host, { minVersion: 'TLSv1.2' }, () => {
      // Đã kết nối TLS tới smtp.gmail.com:465
    });

    socket.setTimeout(20000); // 20s timeout
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Kết nối SMTP Gmail quá thời gian chờ (Timeout).'));
    });

    let step = 0;
    const userB64 = Buffer.from(SMTP_CONFIG.user).toString('base64');
    const passB64 = Buffer.from(SMTP_CONFIG.pass.replace(/\s+/g, '')).toString('base64');

    socket.on('data', (data) => {
      const response = data.toString();

      if (step === 0 && response.startsWith('220')) {
        step = 1;
        socket.write('EHLO localhost\r\n');
      } else if (step === 1 && response.includes('250')) {
        step = 2;
        socket.write('AUTH LOGIN\r\n');
      } else if (step === 2 && response.startsWith('334')) {
        step = 3;
        socket.write(userB64 + '\r\n');
      } else if (step === 3 && response.startsWith('334')) {
        step = 4;
        socket.write(passB64 + '\r\n');
      } else if (step === 4 && response.startsWith('235')) {
        // Đăng nhập SMTP thành công
        step = 5;
        socket.write(`MAIL FROM:<${SMTP_CONFIG.user}>\r\n`);
      } else if (step === 5 && response.startsWith('250')) {
        step = 6;
        socket.write(`RCPT TO:<${to}>\r\n`);
      } else if (step === 6 && response.startsWith('250')) {
        step = 7;
        socket.write('DATA\r\n');
      } else if (step === 7 && response.startsWith('354')) {
        step = 8;
        const boundary = '----=_EduShare_' + Date.now();
        const emailContent = [
          `From: =?UTF-8?B?${Buffer.from(SMTP_CONFIG.fromName).toString('base64')}?= <${SMTP_CONFIG.user}>`,
          `To: <${to}>`,
          `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
          'MIME-Version: 1.0',
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          '',
          `--${boundary}`,
          'Content-Type: text/plain; charset=utf-8',
          'Content-Transfer-Encoding: base64',
          '',
          Buffer.from(text || '').toString('base64'),
          '',
          `--${boundary}`,
          'Content-Type: text/html; charset=utf-8',
          'Content-Transfer-Encoding: base64',
          '',
          Buffer.from(html || text || '').toString('base64'),
          '',
          `--${boundary}--`,
          '',
          '.'
        ].join('\r\n') + '\r\n';

        socket.write(emailContent);
      } else if (step === 8 && response.startsWith('250')) {
        step = 9;
        socket.write('QUIT\r\n');
        socket.end();
        resolve({ success: true, messageId: response.trim() });
      } else if (!response.startsWith('2') && !response.startsWith('3')) {
        socket.destroy();
        reject(new Error('Lỗi máy chủ SMTP Gmail: ' + response.trim()));
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });
  });
}

// Bảng định dạng MIME
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon'
};

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('192.168.')) {
        return iface.address;
      }
    }
  }
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();

// ==================== TẠO HTTP SERVER ====================
const server = http.createServer((req, res) => {
  // CORS Headers cho mọi request (hỗ trợ gọi từ localhost:5500, localhost:8888, IP điện thoại)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. API GỬI MÃ OTP THẬT QUA SMTP GMAIL
  if (req.method === 'POST' && pathname === '/api/send-otp') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const email = (payload.email || '').trim().toLowerCase();
        const otp = (payload.otp || '').trim();
        const type = payload.type === 'forgot' ? 'ĐẶT LẠI MẬT KHẨU' : 'ĐĂNG KÝ TÀI KHOẢN';

        if (!email || !otp) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ status: 'error', message: 'Thiếu email hoặc mã OTP' }));
          return;
        }

        const subject = `[EduShare] Mã xác thực OTP ${type}: ${otp}`;
        const textContent = `Chào bạn,\n\nBạn (hoặc ai đó) vừa yêu cầu ${type} trên hệ thống EduShare.\n\nMã xác minh OTP của bạn là: ${otp}\n\nLưu ý: Mã có HIỆU LỰC TRONG 10 PHÚT từ thời điểm gửi. Vui lòng không cung cấp mã cho người khác để bảo vệ tài khoản.\n\nTrân trọng,\nBan Quản Trị EduShare\nEmail hỗ trợ: ${SMTP_CONFIG.user}`;

        const htmlContent = `
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
                <h2 style="margin:0 0 14px; font-size:18px; color:#1a1a1a; text-align:center;">Xác Thực ${type}</h2>
                <p style="margin:0 0 16px; font-size:14px; color:#555;">Xin chào bạn,</p>
                <p style="margin:0 0 20px; font-size:14px; color:#555;">Bạn vừa gửi yêu cầu <strong>${type}</strong> trên hệ thống EduShare. Đây là mã OTP xác minh của bạn:</p>

                <div style="background:#f4f8ff; border:2px dashed #0068ff; border-radius:10px; padding:18px; text-align:center; margin:20px 0;">
                  <span style="font-size:32px; font-weight:800; letter-spacing:8px; color:#0068ff; font-family:monospace;">${otp}</span>
                  <div style="font-size:12px; color:#666; margin-top:8px;">(Hiệu lực trong vòng <strong>10 phút</strong>)</div>
                </div>

                <div style="background:#fffbe6; border-left:4px solid #faad14; padding:10px 14px; border-radius:4px; margin:20px 0; font-size:12.5px; color:#873800;">
                  <strong>⚠️ Cảnh báo an toàn:</strong> Không chia sẻ mã OTP này với bất kỳ ai, kể cả giáo viên hay quản trị viên.
                </div>

                <p style="margin:20px 0 0; font-size:13px; color:#888; text-align:center;">Email được gửi tự động qua cổng bảo mật SMTP Gmail.<br>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua thư.</p>
              </div>
              <div style="background:#fafafa; border-top:1px solid #eee; padding:14px 20px; text-align:center; font-size:11.5px; color:#999;">
                Ban Quản Trị EduShare • ${SMTP_CONFIG.user}
              </div>
            </div>
          </body>
          </html>
        `;

        const sendResult = await sendMailViaGmailSMTP({
          to: email,
          subject: subject,
          text: textContent,
          html: htmlContent
        });

        console.log(`[SMTP Gmail] Đã gửi mã OTP (${otp}) thành công đến: ${email}`);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          status: 'success',
          message: `Mã OTP đã được gửi đến ${email} qua SMTP Gmail`,
          smtpUser: SMTP_CONFIG.user,
          details: sendResult
        }));
      } catch (err) {
        console.error('[SMTP Gmail Error]:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          status: 'error',
          message: 'Lỗi gửi email qua máy chủ SMTP Gmail: ' + err.message
        }));
      }
    });
    return;
  }

  // 2. API KIỂM TRA TRẠNG THÁI SMTP
  if (req.method === 'GET' && pathname === '/api/smtp-status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'active',
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      user: SMTP_CONFIG.user,
      ready: true
    }));
    return;
  }

  // 3. PHỤC VỤ FILE TĨNH (HTML, CSS, JS, IMAGES)
  let reqPath = decodeURI(pathname);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(DIR, reqPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

// Khởi động server
server.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log('   EDUSHARE SERVER + GMAIL SMTP ĐANG CHẠY       ');
  console.log('====================================================');
  console.log(`- Mở trên máy tính này : http://localhost:${PORT}/`);
  console.log(`- Mở trên ĐIỆN THOẠI   : http://${localIp}:${PORT}/`);
  console.log(`- Cổng gửi thư SMTP    : ${SMTP_CONFIG.user} (${SMTP_CONFIG.host}:${SMTP_CONFIG.port})`);
  console.log('----------------------------------------------------');
  console.log('Lưu ý: Điện thoại chỉ cần kết nối cùng mạng Wi-Fi với máy tính.');
  console.log('====================================================');
});
