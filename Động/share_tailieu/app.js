/**
 * ==========================================================================
 * EDUSHARE - CORE JAVASCRIPT APPLICATION (CLEAN ARCHITECTURE & ENHANCED UX/UI)
 * ==========================================================================
 * Toàn bộ logic frontend được thiết kế tối ưu trải nghiệm người dùng (UX/UI):
 * 1. State Management & Defensive Data Handling
 * 2. Xác thực tài khoản Gmail, 1-Click Test Accounts & Show/Hide Password
 * 3. Gửi nhận mã OTP bảo mật 10 phút qua Gmail SMTP
 * 4. Chat & Nhóm học tập (Mã 16 ký tự 1-Click Copy, Phân quyền Trưởng/Phó, Duyệt thành viên)
 * 5. Emoji Picker Popover & Auto-expanding Textarea
 * 6. Lightbox Preview Modal cho hình ảnh và tài liệu học tập
 * 7. Bảng tin Diễn Đàn Học Sinh (Đăng bài, Thích, Bình luận, Chia sẻ vào nhóm)
 * 8. Kho Tài Liệu Google Drive (Lọc theo Môn học & Định dạng PDF/DOCX/XLSX/PPTX, Tải về)
 * 9. Danh bạ học tập & Nhắn tin nhanh
 * 10. Tùy biến giao diện 3 Theme (Sáng, Tối, Xanh Bảng Phấn) & Phím tắt Esc
 * ==========================================================================
 */

(function () {
  'use strict';

  // ==================== CẤU HÌNH & KHỞI TẠO ====================
  const STORAGE_KEYS = {
    CURRENT_USER: 'edushare_user_v7',
    ACTIVE_ROOM: 'edushare_active_room_v7',
    DEVICE_THEME: 'edushare_theme_v7',
    DRIVE_URL: 'edushare_drive_folder_url',
    ACCESS_TOKEN: 'edushare_access_token'
  };

  
  // Tự động chuyển đổi dữ liệu phiên cũ sang khóa EduShare sạch sẽ
  try {
    const oldUser = localStorage.getItem('edushare_edushare_user_v6');
    if (oldUser && !localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, oldUser);
    }
    const oldRoom = localStorage.getItem('edushare_edushare_active_room_v6');
    if (oldRoom && !localStorage.getItem(STORAGE_KEYS.ACTIVE_ROOM)) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ROOM, oldRoom);
    }
    const oldTheme = localStorage.getItem('edushare_edushare_theme_v6');
    if (oldTheme && !localStorage.getItem(STORAGE_KEYS.DEVICE_THEME)) {
      localStorage.setItem(STORAGE_KEYS.DEVICE_THEME, oldTheme);
    }
    const oldFolder = localStorage.getItem(STORAGE_KEYS.DRIVE_URL) || localStorage.getItem('edushare_edushare_drive_folder_url');
    if (oldFolder && !localStorage.getItem(STORAGE_KEYS.DRIVE_URL)) {
      localStorage.setItem(STORAGE_KEYS.DRIVE_URL, oldFolder);
    }
    ['edushare_edushare_user_v6', 'edushare_edushare_active_room_v6', 'edushare_edushare_theme_v6', STORAGE_KEYS.DRIVE_URL, 'edushare_edushare_drive_folder_url'].forEach(k => localStorage.removeItem(k));
  } catch (_) {}

  const DEFAULT_DRIVE_FOLDER = 'https://drive.google.com/drive/folders/1jfeInxopW2mbPNpVkjsc-nAhZfyPZr7e?usp=sharing';

  const GUEST_USER = {
    id: 'usr_guest',
    email: '',
    name: 'Khách (Chưa đăng nhập)',
    role: 'guest',
    isSystemAdmin: false,
    roleTitle: 'Chế độ xem tài liệu',
    subInfo: 'Khách vãng lai',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=GuestVisitor'
  };

  // Avatar presets cho modal chỉnh sửa profile
  const AVATAR_PRESETS = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=AdminTrungHau',
    'https://api.dicebear.com/7.x/bottts/svg?seed=NguyenVanAn',
    'https://api.dicebear.com/7.x/bottts/svg?seed=TranThiBinh',
    'https://api.dicebear.com/7.x/bottts/svg?seed=LeThiCuc',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=UserTest01',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=UserTest02',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=StudentCute1',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=StudentCute2',
    'https://api.dicebear.com/7.x/bottts/svg?seed=SmartRobot',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=TeacherPro',
    'https://api.dicebear.com/7.x/bottts/svg?seed=EduShareStar',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=SchoolChamp'
  ];

  // ==================== APPLICATION STATE ====================
  const AppState = {
    currentUser: GUEST_USER,
    activeTab: 'chat', // 'chat' | 'forum' | 'vault' | 'contacts'
    activeRoomId: 'room_community',
    activeRoomData: null,
    rooms: [],
    messages: [],
    posts: [],
    documents: [],
    users: [],
    sidebarFilter: 'all', // 'all' | 'groups' | 'friends'
    forumSubject: 'all',
    vaultSubject: 'all',
    vaultType: 'all', // 'all' | 'pdf' | 'docx' | 'xlsx' | 'pptx'
    searchConversationQuery: '',
    pendingOtpState: {
      email: '',
      timer: null,
      countdown: 600
    },
    activePostForShare: null,
    activeReplyTo: null,
    friends: [],
    pendingReceived: [],
    activePreviewFile: null,
    tempProfileAvatar: null,
    currentTheme: 'theme-light'
  };

  // ==================== TIỆN ÍCH THÔNG BÁO TOAST ====================
  function showToast(message, type = 'info') {
    // Tắt toàn bộ thông báo toast theo yêu cầu
    return;
  }

  // ==================== API CALL WRAPPER ====================
  async function apiCall(endpoint, method = 'GET', body = null) {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const options = {
        method: method,
        headers: headers,
        cache: 'no-store'
      };
      if (body) {
        options.body = JSON.stringify(body);
      }
      const res = await fetch(endpoint, options);
      if (!res.ok) {
        let errMsg = 'Lỗi kết nối máy chủ';
        try {
          const errData = await res.json();
          errMsg = errData.detail || errData.message || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }
      return await res.json();
    } catch (err) {
      console.warn(`[API Call ${endpoint} Error]:`, err);
      throw err;
    }
  }

  // ==================== MÃ 16 KÝ TỰ BẢO MẬT ====================
  function generateAccessCode(length = 16) {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function copyTextToClipboard(text, successMsg = 'Đã sao chép vào bộ nhớ tạm!') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg, 'success');
      }).catch(() => fallbackCopy(text, successMsg));
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      showToast(successMsg, 'success');
    } catch (_) {
      showToast('Không thể sao chép tự động, vui lòng chọn và sao chép thủ công.', 'error');
    }
    document.body.removeChild(ta);
  }

  // ==================== ĐỊNH DẠNG ICON VÀ MÀU SẮC TỆP ====================
  function getFileIconMeta(type) {
    const t = (type || '').toLowerCase();
    if (t === 'pdf') {
      return { icon: 'fa-file-pdf', colorClass: 'pdf', label: 'PDF' };
    }
    if (t.includes('doc')) {
      return { icon: 'fa-file-word', colorClass: 'docx', label: 'DOCX' };
    }
    if (t.includes('xls') || t.includes('sheet') || t.includes('csv')) {
      return { icon: 'fa-file-excel', colorClass: 'xlsx', label: 'XLSX' };
    }
    if (t.includes('ppt') || t.includes('slide')) {
      return { icon: 'fa-file-powerpoint', colorClass: 'pptx', label: 'PPTX' };
    }
    if (t.includes('zip') || t.includes('rar') || t.includes('7z') || t.includes('tar')) {
      return { icon: 'fa-file-zipper', colorClass: 'fa-file-zipper', label: 'NÉN' };
    }
    if (t === 'image' || t === 'png' || t === 'jpg' || t === 'jpeg' || t === 'webp' || t === 'gif') {
      return { icon: 'fa-file-image', colorClass: 'fa-file-image', label: 'ẢNH' };
    }
    return { icon: 'fa-file-lines', colorClass: 'generic', label: 'TỆP' };
  }


  // ==================== BẢO MẬT XSS & NHẬN DIỆN LIÊN KẾT (LINKIFY) ====================
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // TỰ ĐỘNG NHẬN DIỆN VÀ TẠO LIÊN KẾT WEB (CLICKABLE URL) TRONG TIN NHẮN
  function linkifyText(rawText) {
    if (!rawText) return '';
    const safe = escapeHtml(rawText);
    const urlRegex = /((?:https?:\/\/|www\.)[^\s<]+)/gi;
    const replaced = safe.replace(urlRegex, (url) => {
      let href = url;
      if (url.toLowerCase().startsWith('www.')) {
        href = 'https://' + url;
      }
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="chat-inline-link">${url}</a>`;
    });
    return replaced.replace(/\n/g, '<br>');
  }

  // QUÉT TẤT CẢ LIÊN KẾT ĐÃ CHIA SẺ TRONG PHÒNG
  function extractLinksFromMessages(messages) {
    const links = [];
    const urlRegex = /((?:https?:\/\/|www\.)[^\s<]+)/gi;
    (messages || []).forEach(msg => {
      if (msg.is_recalled || !msg.text) return;
      const matches = msg.text.match(urlRegex);
      if (matches) {
        matches.forEach(url => {
          let cleanUrl = url.trim().replace(/[.,;!?)]+$/, '');
          let href = cleanUrl;
          if (cleanUrl.toLowerCase().startsWith('www.')) {
            href = 'https://' + cleanUrl;
          }
          let domain = cleanUrl;
          try {
            const u = new URL(href);
            domain = u.hostname;
          } catch (_) {}
          links.push({
            url: cleanUrl,
            href: href,
            domain: domain,
            sender_name: msg.sender_name || 'Thành viên',
            created_at: msg.created_at
          });
        });
      }
    });
    return links;
  }

  // ==================== QUẢN LÝ MODAL POPUP ====================
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.setProperty('display', 'flex', 'important');
      modal.classList.add('active');
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.setProperty('display', 'none', 'important');
      modal.classList.remove('active');
    }
  }

  function initModals() {
    // Đóng khi bấm vào bất kỳ nút close nào có data-close
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = btn.dataset.close || btn.getAttribute('data-close');
        if (target) closeModal(target);
      });
    });

    // Đóng khi click ngoài vùng modal card
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          closeModal(backdrop.id);
        }
      });
    });

    // Phím tắt Escape đóng mọi modal, drawer và popover
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop').forEach(m => {
          if (m.classList.contains('active') || m.style.display === 'flex') {
            closeModal(m.id);
          }
        });
        document.getElementById('chat-info-drawer')?.classList.add('hidden');
        const emojiPopover = document.getElementById('emoji-picker-popover');
        if (emojiPopover) emojiPopover.style.display = 'none';
      }
    });
  }

  // ==================== QUẢN LÝ THEME GIAO DIỆN ====================
  function applyTheme(themeName) {
    document.body.className = '';
    document.body.classList.add(themeName);
    AppState.currentTheme = themeName;
    localStorage.setItem(STORAGE_KEYS.DEVICE_THEME, themeName);

    // Cập nhật trạng thái active trong modal theme
    document.querySelectorAll('.theme-card').forEach(card => {
      if (card.dataset.theme === themeName) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.DEVICE_THEME) || 'theme-light';
    applyTheme(savedTheme);

    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
      openModal('modal-theme-chooser');
    });

    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => {
        const theme = card.dataset.theme;
        applyTheme(theme);
        closeModal('modal-theme-chooser');
        showToast(`Đã chuyển sang giao diện: ${theme === 'theme-dark' ? 'Tối (Dark Mode)' : (theme === 'theme-chalkboard' ? 'Xanh Bảng Phấn' : 'Sáng (Edu Blue)')}`, 'success');
      });
    });
  }

  // ==================== QUẢN LÝ XÁC THỰC & NGƯỜI DÙNG ====================
  function loadSavedUser() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (saved) {
        AppState.currentUser = JSON.parse(saved);
      } else {
        AppState.currentUser = GUEST_USER;
      }
    } catch (_) {
      AppState.currentUser = GUEST_USER;
    }
    updateUserUI();
  }

  function saveCurrentUser(user) {
    AppState.currentUser = user;
    if (user.role === 'guest') {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    } else {
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      } catch (err) {
        console.warn('Lỗi lưu currentUser vào LocalStorage:', err);
      }
    }
    updateUserUI();

    // Làm mới kết nối WebSocket để handshake mang user_email mới nhất ngay lập tức
    if (typeof wsClient !== 'undefined' && wsClient) {
      try { wsClient.close(); } catch (_) {}
      wsClient = null;
    }
    if (typeof initWebSocket === 'function') {
      initWebSocket();
    }
  }

  function updateUserUI() {
    const u = AppState.currentUser;
    const isGuest = u.role === 'guest';

    // 1. Cập nhật Avatar Nav Rail
    const navAvatar = document.getElementById('nav-user-avatar');
    if (navAvatar) {
      navAvatar.src = u.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Guest';
      navAvatar.title = isGuest ? 'Chưa đăng nhập - Bấm để đăng nhập' : `${u.name} (${u.roleTitle || 'Thành viên'})`;
    }

    // 2. Cập nhật thẻ trạng thái người dùng góc dưới Sidebar
    const barAvatar = document.getElementById('status-bar-avatar');
    const barName = document.getElementById('status-bar-name');
    const barRole = document.getElementById('status-bar-role');
    const authBtn = document.getElementById('btn-quick-auth-action');

    if (barAvatar) barAvatar.src = u.avatar;
    if (barName) barName.textContent = u.name;
    if (barRole) barRole.textContent = u.subInfo || u.roleTitle || (isGuest ? 'Chế độ xem tài liệu' : 'Thành viên');

    if (authBtn) {
      authBtn.textContent = isGuest ? 'Đăng nhập' : 'Đăng xuất';
      authBtn.onclick = () => {
        if (isGuest) {
          openModal('modal-auth');
        } else {
          handleLogout();
        }
      };
    }

    // 3. Khóa/Mở composer trong Chat
    const guestLocked = document.getElementById('composer-guest-locked');
    const activeComposer = document.getElementById('composer-active-box');
    const forumGuestNotice = document.getElementById('forum-guest-notice');
    const forumCreateCard = document.getElementById('forum-create-card');
    const createPostAvatar = document.getElementById('create-post-avatar');

    if (guestLocked && activeComposer) {
      if (isGuest) {
        guestLocked.style.display = 'flex';
        activeComposer.style.display = 'none';
      } else {
        guestLocked.style.display = 'none';
        activeComposer.style.display = 'block';
      }
    }

    if (forumGuestNotice && forumCreateCard) {
      if (isGuest) {
        forumGuestNotice.style.display = 'flex';
        forumCreateCard.style.display = 'none';
      } else {
        forumGuestNotice.style.display = 'none';
        forumCreateCard.style.display = 'flex';
        if (createPostAvatar) createPostAvatar.src = u.avatar;
      }
    }

    // Nút đăng nhập trong composer & forum
    document.getElementById('btn-composer-login')?.addEventListener('click', () => openModal('modal-auth'));
    document.getElementById('btn-forum-guest-login')?.addEventListener('click', () => openModal('modal-auth'));

    // Nút Nav Rail Auth
    const btnUserAuth = document.getElementById('btn-user-auth');
    if (btnUserAuth) {
      btnUserAuth.title = isGuest ? 'Đăng nhập' : 'Đăng xuất tài khoản';
      btnUserAuth.innerHTML = isGuest ? '<i class="fa-solid fa-right-to-bracket"></i>' : '<i class="fa-solid fa-arrow-right-from-bracket"></i>';
      btnUserAuth.onclick = () => {
        if (isGuest) openModal('modal-auth');
        else handleLogout();
      };
    }
  }

  function handleLogout() {
    saveCurrentUser(GUEST_USER);
    AppState.activeRoomId = 'room_community';
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ROOM, 'room_community');
    showToast('Đã đăng xuất tài khoản. Đang ở chế độ khách xem Diễn đàn.', 'info');
    loadRooms();
    loadMessages('room_community');
  }

  // ==================== AUTH TABS & ĐĂNG NHẬP / ĐĂNG KÝ / QUÊN MK ====================
  function initAuthSystem() {
    // Chuyển đổi tab Auth (Đăng nhập, Đăng ký, Quên mật khẩu)
    document.querySelectorAll('.auth-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.authTab;
        switchAuthTab(tab);
      });
    });

    document.getElementById('link-go-to-forgot')?.addEventListener('click', () => {
      switchAuthTab('forgot');
    });

    async function executeLogin(email, password) {
      if (!email || !password) {
        showToast('Vui lòng nhập đầy đủ Gmail và mật khẩu!', 'error');
        return;
      }

      try {
        const res = await apiCall('/api/login', 'POST', { email, password });
        if (res.status === 'success' && res.user) {
          if (res.access_token) {
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, res.access_token);
          }
          saveCurrentUser(res.user);
          closeModal('modal-auth');
          showToast(`Đăng nhập thành công! Chào mừng ${res.user.name}.`, 'success');
          loadRooms();
          loadMessages(AppState.activeRoomId);
          loadPosts();
        }
      } catch (err) {
        showToast(err.message || 'Gmail hoặc mật khẩu không chính xác!', 'error');
      }
    }

    // 1. FORM ĐĂNG NHẬP
    document.getElementById('form-login')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('input-login-email')?.value.trim().toLowerCase();
      const password = document.getElementById('input-login-password')?.value.trim();
      executeLogin(email, password);
    });

    // 2. CHỌN NHANH TÀI KHOẢN ĐỂ TEST (1-CLICK LOGIN)
    document.querySelectorAll('.quick-user-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const email = btn.dataset.quickEmail;
        const pass = btn.dataset.quickPass;
        const emailInput = document.getElementById('input-login-email');
        const passInput = document.getElementById('input-login-password');
        if (emailInput) emailInput.value = email;
        if (passInput) passInput.value = pass;

        const tag = btn.querySelector('.quick-login-tag');
        const originalHtml = tag ? tag.innerHTML : '';
        if (tag) tag.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang vào...';

        try {
          await executeLogin(email, pass);
        } finally {
          if (tag) tag.innerHTML = originalHtml;
        }
      });
    });

    // 3. GỬI MÃ OTP ĐĂNG KÝ VỀ GMAIL (HIỆU LỰC 10 PHÚT)
    document.getElementById('btn-send-reg-otp')?.addEventListener('click', async () => {
      const email = document.getElementById('reg-email')?.value.trim().toLowerCase();
      if (!email || !email.includes('@') || !email.includes('.')) {
        showToast('Vui lòng nhập đúng định dạng Gmail nhận mã OTP!', 'error');
        return;
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const statusText = document.getElementById('reg-otp-status-text');
      const btn = document.getElementById('btn-send-reg-otp');

      if (btn) btn.disabled = true;
      if (statusText) statusText.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi mã OTP đến ${email} qua Gmail SMTP...`;

      try {
        await apiCall('/api/send-otp', 'POST', {
          email: email,
          otp: otp,
          type: 'register'
        });
        showToast(`Đã gửi mã OTP đến ${email}! Hiệu lực trong 10 phút.`, 'success');
        startOtpCountdown('reg', email);
      } catch (err) {
        showToast('Lỗi gửi OTP qua Gmail SMTP: ' + (err.message || err), 'error');
        if (btn) btn.disabled = false;
        if (statusText) statusText.textContent = 'Gửi OTP thất bại, vui lòng thử lại sau.';
      }
    });

    // 4. FORM HOÀN TẤT ĐĂNG KÝ VỚI MÃ OTP
    document.getElementById('form-register')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name')?.value.trim();
      const email = document.getElementById('reg-email')?.value.trim().toLowerCase();
      const otp = document.getElementById('reg-otp')?.value.trim();
      const subInfo = document.getElementById('reg-subinfo')?.value.trim() || 'Học sinh';
      const password = document.getElementById('reg-password')?.value.trim();

      if (!name || !email || !otp || !password) {
        showToast('Vui lòng điền đầy đủ họ tên, Gmail, mã OTP và mật khẩu!', 'error');
        return;
      }

      const submitBtn = document.getElementById('btn-submit-register');
      const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xác thực...';
      }

      try {
        const res = await apiCall('/api/register-user', 'POST', {
          name, email, password, sub_info: subInfo, otp
        });
        showToast('Đăng ký tài khoản EduShare thành công! Tự động đăng nhập...', 'success');

        if (res.user) {
          saveCurrentUser(res.user);
          closeModal('modal-auth');
          loadRooms();
          loadMessages(AppState.activeRoomId);
          loadPosts();
        } else {
          executeLogin(email, password);
        }
      } catch (err) {
        showToast(err.message || 'Mã OTP không đúng hoặc đăng ký thất bại.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnHtml;
        }
      }
    });

    // 5. GỬI MÃ OTP ĐẶT LẠI MẬT KHẨU (HIỆU LỰC 10 PHÚT)
    document.getElementById('btn-send-forgot-otp')?.addEventListener('click', async () => {
      const email = document.getElementById('forgot-email')?.value.trim().toLowerCase();
      if (!email || !email.includes('@')) {
        showToast('Vui lòng nhập địa chỉ Gmail tài khoản!', 'error');
        return;
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const statusText = document.getElementById('forgot-otp-status-text');
      const btn = document.getElementById('btn-send-forgot-otp');

      if (btn) btn.disabled = true;
      if (statusText) statusText.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi mã OTP đến ${email}...`;

      try {
        await apiCall('/api/send-otp', 'POST', {
          email: email,
          otp: otp,
          type: 'forgot'
        });
        showToast(`Đã gửi mã OTP đến ${email}! Hiệu lực trong 10 phút.`, 'success');
        startOtpCountdown('forgot', email);
      } catch (err) {
        showToast(err.message || 'Lỗi gửi mã OTP qua Gmail SMTP.', 'error');
        if (btn) btn.disabled = false;
        if (statusText) statusText.textContent = 'Gửi OTP thất bại, vui lòng thử lại.';
      }
    });

    // 6. FORM ĐẶT LẠI MẬT KHẨU VỚI MÃ OTP
    document.getElementById('form-forgot')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgot-email')?.value.trim().toLowerCase();
      const otp = document.getElementById('forgot-otp')?.value.trim();
      const newPassword = document.getElementById('forgot-new-pass')?.value.trim();

      if (!email || !otp || !newPassword) {
        showToast('Vui lòng nhập địa chỉ Gmail, mã OTP và mật khẩu mới!', 'error');
        return;
      }

      const submitBtn = document.getElementById('btn-submit-forgot');
      const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang cập nhật...';
      }

      try {
        await apiCall('/api/reset-password', 'POST', {
          email, new_password: newPassword, otp
        });
        showToast('Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.', 'success');
        switchAuthTab('login');
        const loginEmail = document.getElementById('input-login-email');
        const loginPass = document.getElementById('input-login-password');
        if (loginEmail) loginEmail.value = email;
        if (loginPass) {
          loginPass.value = newPassword;
          loginPass.focus();
        }
      } catch (err) {
        showToast(err.message || 'Mã OTP không đúng hoặc đặt lại mật khẩu thất bại.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnHtml;
        }
      }
    });

    // 7. Nút Ẩn/Hiện mật khẩu (Show/Hide Password Toggle)
    document.querySelectorAll('.btn-toggle-password').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (input) {
          if (input.type === 'password') {
            input.type = 'text';
            btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
          } else {
            input.type = 'password';
            btn.innerHTML = '<i class="fa-solid fa-eye"></i>';
          }
        }
      });
    });
  }

  function switchAuthTab(tabName) {
    document.querySelectorAll('.auth-nav-btn').forEach(b => {
      if (b.dataset.authTab === tabName) b.classList.add('active');
      else b.classList.remove('active');
    });

    document.querySelectorAll('.auth-tab-panel').forEach(p => {
      p.classList.remove('active');
    });

    const targetPanel = document.getElementById(`auth-panel-${tabName}`);
    if (targetPanel) targetPanel.classList.add('active');
  }

  function startOtpCountdown(prefix = 'reg', email = '') {
    clearInterval(AppState.pendingOtpState.timer);
    AppState.pendingOtpState.countdown = 600; // 10 phút = 600s
    let resendCooldown = 30; // 30s được phép bấm gửi lại mã

    const btn = document.getElementById(prefix === 'reg' ? 'btn-send-reg-otp' : 'btn-send-forgot-otp');
    const statusText = document.getElementById(prefix === 'reg' ? 'reg-otp-status-text' : 'forgot-otp-status-text');

    AppState.pendingOtpState.timer = setInterval(() => {
      AppState.pendingOtpState.countdown--;
      const mins = Math.floor(AppState.pendingOtpState.countdown / 60);
      const secs = AppState.pendingOtpState.countdown % 60;
      const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      if (resendCooldown > 0) {
        resendCooldown--;
        if (btn) btn.innerHTML = `<i class="fa-solid fa-clock"></i> Gửi lại (${resendCooldown}s)`;
      } else {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Gửi lại mã`;
        }
      }

      if (statusText) {
        statusText.innerHTML = `Mã OTP đã gửi đến <strong>${email}</strong>. Hiệu lực còn: <strong>${timeStr}</strong>`;
      }

      if (AppState.pendingOtpState.countdown <= 0) {
        clearInterval(AppState.pendingOtpState.timer);
        if (statusText) statusText.innerHTML = `<span style="color:#ef4444;">Mã OTP đã hết hạn 10 phút. Vui lòng bấm Gửi lại mã mới.</span>`;
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Gửi lại mã`;
        }
      }
    }, 1000);
  }

  // ==================== TIỆN ÍCH NÉN ẢNH AVATAR BẰNG HTML5 CANVAS ====================
  function resizeImageToDataUrl(file, maxWidth = 256, maxHeight = 256, quality = 0.88) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('Tệp không tồn tại'));
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          try {
            const width = img.width || maxWidth;
            const height = img.height || maxHeight;
            const minDim = Math.min(width, height);
            const startX = (width - minDim) / 2;
            const startY = (height - minDim) / 2;

            const canvas = document.createElement('canvas');
            const targetSize = Math.min(maxWidth, maxHeight);
            canvas.width = targetSize;
            canvas.height = targetSize;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              return resolve(e.target.result);
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            // Cắt vuông tỷ lệ 1:1 từ tâm ảnh để avatar luôn cân đối
            ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetSize, targetSize);

            // Xuất định dạng WebP/JPEG nhẹ gọn (~10KB - 25KB)
            let resultUrl = '';
            try {
              resultUrl = canvas.toDataURL('image/webp', quality);
            } catch (_) {}

            if (!resultUrl || !resultUrl.startsWith('data:image/webp')) {
              try {
                resultUrl = canvas.toDataURL('image/jpeg', quality);
              } catch (_) {
                resultUrl = e.target.result;
              }
            }
            resolve(resultUrl || e.target.result);
          } catch (err) {
            console.warn('Lỗi xử lý canvas avatar:', err);
            resolve(e.target.result);
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ==================== ĐỒNG BỘ ẢNH ĐẠI DIỆN TỨC THÌ (OPTIMISTIC ZERO-LATENCY) ====================
  function syncUserAvatarAcrossUI(email, name, avatar, subInfo) {
    if (!email) return;
    const lowerEmail = email.toLowerCase().trim();

    // 1. Cập nhật AppState.currentUser nếu trùng email
    if (AppState.currentUser && (AppState.currentUser.email || '').toLowerCase().trim() === lowerEmail) {
      if (avatar) AppState.currentUser.avatar = avatar;
      if (name) AppState.currentUser.name = name;
      if (subInfo !== undefined) {
        AppState.currentUser.subInfo = subInfo;
        AppState.currentUser.sub_info = subInfo;
      }
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(AppState.currentUser));
      } catch (err) {
        console.warn('Lỗi lưu currentUser:', err);
      }
      updateUserUI();
    }

    // 2. Cập nhật trong danh sách người dùng AppState.users
    if (AppState.users && Array.isArray(AppState.users)) {
      const uIdx = AppState.users.findIndex(x => (x.email || '').toLowerCase().trim() === lowerEmail);
      if (uIdx !== -1) {
        if (avatar) AppState.users[uIdx].avatar = avatar;
        if (name) AppState.users[uIdx].name = name;
        if (subInfo !== undefined) {
          AppState.users[uIdx].subInfo = subInfo;
          AppState.users[uIdx].sub_info = subInfo;
        }
      }
    }

    // 3. Cập nhật tin nhắn trong bộ nhớ AppState.messages
    if (AppState.messages && Array.isArray(AppState.messages)) {
      AppState.messages.forEach(m => {
        if ((m.sender_email || '').toLowerCase().trim() === lowerEmail) {
          if (avatar) m.sender_avatar = avatar;
          if (name) m.sender_name = name;
        }
      });
    }

    // 4. Cập nhật bài viết và bình luận trong bộ nhớ AppState.posts
    if (AppState.posts && Array.isArray(AppState.posts)) {
      AppState.posts.forEach(p => {
        if ((p.author_email || '').toLowerCase().trim() === lowerEmail) {
          if (avatar) p.avatar = avatar;
          if (name) p.author_name = name;
        }
        if (p.comments && Array.isArray(p.comments)) {
          p.comments.forEach(c => {
            if ((c.author_email || '').toLowerCase().trim() === lowerEmail) {
              if (avatar) c.avatar = avatar;
              if (name) c.author_name = name;
            }
          });
        }
      });
    }

    // 5. Cập nhật trực tiếp DOM của các phần tử đang hiển thị trên trang (0ms Delay)
    if (avatar) {
      // Tin nhắn trong khung chat
      document.querySelectorAll(`.msg-row[data-sender-email="${lowerEmail}"] img.msg-avatar, img.msg-avatar[data-sender-email="${lowerEmail}"]`).forEach(img => {
        img.src = avatar;
      });

      // Bài viết trên bảng tin
      document.querySelectorAll(`.post-card[data-author-email="${lowerEmail}"] .post-author-box img, img.post-author-avatar-img[data-author-email="${lowerEmail}"]`).forEach(img => {
        img.src = avatar;
      });

      // Bình luận bài viết
      document.querySelectorAll(`.comment-item[data-author-email="${lowerEmail}"] img, img.comment-avatar-img[data-author-email="${lowerEmail}"]`).forEach(img => {
        img.src = avatar;
      });

      // Cuộc trò chuyện đang mở (nếu là phòng chat 1-1 với user này)
      if (AppState.activeRoomData && AppState.activeRoomData.type === 'direct') {
        const otherMember = (AppState.activeRoomData.members || []).find(m => (m.email || '').toLowerCase().trim() === lowerEmail);
        if (otherMember) {
          otherMember.avatar = avatar;
          const headerAvatar = document.getElementById('chat-header-avatar');
          if (headerAvatar) headerAvatar.src = avatar;
        }
      }
    }

    if (name) {
      document.querySelectorAll(`.msg-row[data-sender-email="${lowerEmail}"] .msg-sender-meta span`).forEach(el => {
        el.textContent = name;
      });
      document.querySelectorAll(`.post-card[data-author-email="${lowerEmail}"] .post-author-name`).forEach(el => {
        el.textContent = name;
      });
      document.querySelectorAll(`.comment-item[data-author-email="${lowerEmail}"] .comment-author`).forEach(el => {
        el.textContent = name;
      });
      if (AppState.activeRoomData && AppState.activeRoomData.type === 'direct') {
        const otherMember = (AppState.activeRoomData.members || []).find(m => (m.email || '').toLowerCase().trim() === lowerEmail);
        if (otherMember) {
          otherMember.name = name;
          const headerTitle = document.getElementById('chat-header-title');
          if (headerTitle) headerTitle.textContent = name;
        }
      }
    }

    // 6. Cập nhật danh sách phòng và danh bạ nếu đang mở
    renderRoomsList();
    renderContactsList();
  }

  // ==================== HỒ SƠ CÁ NHÂN & ĐỔI AVATAR ĐỒNG BỘ ====================
  function initProfileSystem() {
    const triggerProfile = () => {
      if (AppState.currentUser.role === 'guest') {
        openModal('modal-auth');
        return;
      }
      openProfileModal();
    };

    document.getElementById('nav-user-avatar-wrap')?.addEventListener('click', triggerProfile);
    document.getElementById('btn-profile-trigger')?.addEventListener('click', triggerProfile);

    // Render danh sách preset avatars
    const presetGrid = document.getElementById('avatar-preset-grid');
    if (presetGrid) {
      presetGrid.innerHTML = '';
      AVATAR_PRESETS.forEach(url => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'preset-avatar-btn';
        btn.innerHTML = `<img src="${url}" alt="Avatar">`;
        btn.onclick = () => {
          document.querySelectorAll('.preset-avatar-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          AppState.tempProfileAvatar = url;
          const preview = document.getElementById('profile-edit-avatar-preview');
          if (preview) preview.src = url;
          const statusText = document.getElementById('profile-upload-status-text');
          if (statusText) statusText.textContent = 'Đã chọn ảnh mẫu hệ thống';
        };
        presetGrid.appendChild(btn);
      });
    }

    // Tải ảnh đại diện từ máy tính
    document.getElementById('profile-avatar-upload')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const statusText = document.getElementById('profile-upload-status-text');
        if (statusText) statusText.textContent = `Đang xử lý ảnh: ${file.name}...`;

        resizeImageToDataUrl(file, 256, 256, 0.88).then(dataUrl => {
          AppState.tempProfileAvatar = dataUrl;
          const preview = document.getElementById('profile-edit-avatar-preview');
          if (preview) preview.src = dataUrl;
          if (statusText) {
            const kb = Math.round(dataUrl.length * 0.75 / 1024);
            statusText.textContent = `Đã chọn: ${file.name} (Tối ưu ~${kb} KB)`;
          }
        }).catch(err => {
          console.warn('Lỗi nén ảnh, sử dụng FileReader mặc định:', err);
          const reader = new FileReader();
          reader.onload = (evt) => {
            AppState.tempProfileAvatar = evt.target.result;
            const preview = document.getElementById('profile-edit-avatar-preview');
            if (preview) preview.src = evt.target.result;
            if (statusText) statusText.textContent = `Đã chọn: ${file.name}`;
          };
          reader.readAsDataURL(file);
        });
      }
    });

    // Form Lưu hồ sơ & Đồng bộ Avatar (Zero Latency Optimistic UI)
    document.getElementById('form-edit-profile')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = AppState.currentUser;
      if (u.role === 'guest') {
        showToast('Vui lòng đăng nhập để chỉnh sửa hồ sơ!', 'warning');
        return;
      }

      const nameInput = document.getElementById('profile-edit-name');
      const subInput = document.getElementById('profile-edit-subinfo');
      const preview = document.getElementById('profile-edit-avatar-preview');
      const name = nameInput ? nameInput.value.trim() : u.name;
      const subInfo = subInput ? subInput.value.trim() : (u.subInfo || '');
      const avatar = AppState.tempProfileAvatar || (preview ? preview.src : u.avatar) || u.avatar;

      if (!name) {
        showToast('Vui lòng nhập họ và tên!', 'error');
        return;
      }

      // 1. CẬP NHẬT TRẠNG THÁI VÀ GIAO DIỆN NGAY LẬP TỨC (0ms DELAY)
      const updatedUser = {
        ...u,
        name: name,
        subInfo: subInfo,
        sub_info: subInfo,
        avatar: avatar
      };

      saveCurrentUser(updatedUser);
      syncUserAvatarAcrossUI(updatedUser.email, updatedUser.name, updatedUser.avatar, updatedUser.subInfo);

      // Đóng modal và báo thành công ngay lập tức
      closeModal('modal-profile');
      showToast('Đã lưu hồ sơ và tự động đồng bộ ảnh đại diện ngay lập tức!', 'success');

      // 2. GỬI YÊU CẦU LƯU VÀ PHÁT SÓNG LÊN MÁY CHỦ TRONG NỀN (BACKGROUND SYNC)
      apiCall('/api/users/profile', 'PUT', {
        email: u.email,
        name: name,
        sub_info: subInfo,
        avatar: avatar
      }).then(res => {
        if (res.status === 'success' && res.user) {
          saveCurrentUser(res.user);
          syncUserAvatarAcrossUI(res.user.email, res.user.name, res.user.avatar, res.user.sub_info || res.user.subInfo);
        }
      }).catch(err => {
        console.warn('Lỗi lưu hồ sơ lên server:', err);
        showToast('Đã lưu cục bộ: Máy chủ chưa phản hồi (' + (err.message || 'Lỗi mạng') + ')', 'warning');
      });
    });
  }

  function openProfileModal() {
    const u = AppState.currentUser;
    const nameInput = document.getElementById('profile-edit-name');
    const subInput = document.getElementById('profile-edit-subinfo');
    const preview = document.getElementById('profile-edit-avatar-preview');
    const statusText = document.getElementById('profile-upload-status-text');

    if (nameInput) nameInput.value = u.name || '';
    if (subInput) subInput.value = u.subInfo || u.sub_info || '';
    if (preview) preview.src = u.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=GuestVisitor';
    if (statusText) statusText.textContent = 'Chọn ảnh từ thiết bị (JPG, PNG, WebP)...';
    AppState.tempProfileAvatar = u.avatar;

    openModal('modal-profile');
  }

  // ==================== QUẢN LÝ PHÒNG & DANH SÁCH HỘI THOẠI ====================
  async function loadRooms() {
    try {
      const email = AppState.currentUser.email || '';
      const data = await apiCall(`/api/rooms?user_email=${encodeURIComponent(email)}`);
      const rooms = Array.isArray(data) ? data : [];
      AppState.rooms = rooms;
      renderRoomsList();

      // Nếu phòng đang chọn nằm trong danh sách, cập nhật activeRoomData
      const curr = rooms.find(r => r.id === AppState.activeRoomId);
      if (curr) {
        AppState.activeRoomData = curr;
        updateChatHeader(curr);
      } else if (rooms.length > 0) {
        switchRoom(rooms[0].id);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách phòng:', err);
    }
  }

  // ==================== QUẢN LÝ GHIM CUỘC TRÒ CHUYỆN (PIN CONVERSATION) ====================
  function getPinnedRoomIds() {
    const u = AppState.currentUser;
    const emailKey = (u && u.email) ? u.email.toLowerCase() : 'default';
    try {
      return JSON.parse(localStorage.getItem(`edushare_pinned_rooms_${emailKey}`) || '[]');
    } catch (_) {
      return [];
    }
  }

  function isRoomPinned(roomId) {
    return getPinnedRoomIds().includes(roomId);
  }

  function toggleRoomPinned(roomId) {
    const u = AppState.currentUser;
    if (!u || u.role === 'guest') {
      showToast('Vui lòng đăng nhập để ghim cuộc trò chuyện!', 'info');
      return;
    }
    const emailKey = u.email.toLowerCase();
    let pinned = getPinnedRoomIds();
    const isPinned = pinned.includes(roomId);

    if (isPinned) {
      pinned = pinned.filter(id => id !== roomId);
      showToast('Đã bỏ ghim cuộc trò chuyện.', 'info');
    } else {
      pinned.unshift(roomId);
      showToast('Đã ghim cuộc trò chuyện lên đầu danh sách!', 'success');
    }
    localStorage.setItem(`edushare_pinned_rooms_${emailKey}`, JSON.stringify(pinned));
    renderRoomsList();
    if (AppState.activeRoomData && AppState.activeRoomData.id === roomId) {
      updateDrawerPinButton(roomId);
    }
  }

  function updateDrawerPinButton(roomId) {
    const btnPin = document.getElementById('btn-drawer-toggle-pin');
    const labelPin = document.getElementById('label-drawer-pin');
    if (!btnPin) return;
    const isPinned = isRoomPinned(roomId);
    if (labelPin) labelPin.textContent = isPinned ? 'Bỏ ghim' : 'Ghim hội thoại';
    btnPin.classList.toggle('active', isPinned);
  }

  // ==================== BANNER TIN NHẮN ĐÃ GHIM (CHUẨN EduShare PC NHƯ IMAGE 3) ====================
  function checkPinnedMessageBanner() {
    const banner = document.getElementById('chat-pinned-banner');
    const snippetElem = document.getElementById('pinned-banner-snippet');
    const countBadge = document.getElementById('pinned-count-badge');
    const popover = document.getElementById('pinned-dropdown-popover');
    const popoverList = document.getElementById('pinned-popover-list');
    const popoverCount = document.getElementById('pinned-popover-count');
    const clickArea = document.getElementById('pinned-banner-click-area');
    const btnDropdown = document.getElementById('btn-pinned-dropdown');
    const btnMore = document.getElementById('btn-pinned-more');
    const btnUnpinAll = document.getElementById('btn-unpin-all');
    if (!banner) return;

    const room = AppState.activeRoomData;
    if (!room) {
      banner.style.display = 'none';
      if (popover) popover.style.display = 'none';
      return;
    }

    // Lọc TẤT CẢ các tin nhắn đang được ghim trong phòng
    const pinnedMsgs = (AppState.messages || []).filter(m => m.is_pinned && !m.is_recalled);

    if (pinnedMsgs.length === 0) {
      banner.style.display = 'none';
      if (popover) popover.style.display = 'none';
      return;
    }

    banner.style.display = 'flex';
    const latestPin = pinnedMsgs[pinnedMsgs.length - 1];

    let snippet = latestPin.text || '';
    if (latestPin.attachment) {
      const isImg = latestPin.attachment.file_type === 'image' || (latestPin.attachment.file_type || '').includes('image');
      snippet = isImg ? '🖼 Ảnh' : `📄 ${latestPin.attachment.title}`;
    }
    if (snippetElem) {
      snippetElem.textContent = `${latestPin.sender_name}: ${snippet}`;
    }

    if (countBadge) {
      countBadge.textContent = pinnedMsgs.length > 1 ? `Đã ghim (${pinnedMsgs.length}) tin nhắn` : 'Đã ghim 1 tin nhắn';
    }
    if (popoverCount) {
      popoverCount.textContent = pinnedMsgs.length;
    }

    // Bấm vào thanh ghim -> Tự động cuộn mượt đến tin nhắn gốc và nháy sáng
    if (clickArea) {
      clickArea.onclick = () => scrollToMessage(latestPin.id);
    }

    // Render danh sách popover
    if (popoverList) {
      popoverList.innerHTML = '';
      pinnedMsgs.slice().reverse().forEach(p => {
        let pText = p.text || '';
        let iconHtml = '<i class="fa-regular fa-comment-dots" style="color:var(--primary);"></i>';
        if (p.attachment) {
          const isImg = p.attachment.file_type === 'image' || (p.attachment.file_type || '').includes('image');
          iconHtml = isImg ? '<i class="fa-regular fa-image" style="color:#10b981;"></i>' : '<i class="fa-solid fa-file" style="color:#f59e0b;"></i>';
          pText = isImg ? 'Ảnh đính kèm' : p.attachment.title;
        }

        const item = document.createElement('div');
        item.className = 'pinned-popover-item';
        item.innerHTML = `
          <div style="font-size:16px; margin-right:4px;">${iconHtml}</div>
          <div class="pinned-item-info">
            <span class="pinned-item-sender">${escapeHtml(p.sender_name)}</span>
            <span class="pinned-item-text">${escapeHtml(pText)}</span>
          </div>
          <button type="button" class="btn-unpin-single" title="Bỏ ghim tin này"><i class="fa-solid fa-xmark"></i></button>
        `;

        item.onclick = (e) => {
          if (e.target.closest('.btn-unpin-single')) {
            e.stopPropagation();
            unpinMessage(p.id);
            return;
          }
          if (popover) popover.style.display = 'none';
          scrollToMessage(p.id);
        };
        popoverList.appendChild(item);
      });
    }

    // Toggle popover danh sách các tin ghim
    if (btnDropdown) {
      btnDropdown.onclick = (e) => {
        e.stopPropagation();
        if (popover) {
          popover.style.display = popover.style.display === 'none' ? 'flex' : 'none';
        }
      };
    }

    if (btnMore) {
      btnMore.onclick = (e) => {
        e.stopPropagation();
        if (popover) {
          popover.style.display = popover.style.display === 'none' ? 'flex' : 'none';
        }
      };
    }

    if (btnUnpinAll) {
      btnUnpinAll.onclick = async (e) => {
        e.stopPropagation();
        if (confirm('Bạn có chắc chắn muốn bỏ ghim TẤT CẢ tin nhắn trong phòng này?')) {
          try {
            await apiCall(`/api/rooms/${room.id}/pin-message`, 'POST', { action: 'unpin' });
            if (popover) popover.style.display = 'none';
            banner.style.display = 'none';
            showToast('Đã bỏ ghim tất cả tin nhắn.', 'info');
            loadMessages(room.id);
          } catch (err) {
            showToast(err.message || 'Lỗi khi bỏ ghim tin nhắn.', 'error');
          }
        }
      };
    }

    const btnCollapse = document.getElementById('btn-pinned-collapse');
    if (btnCollapse) {
      btnCollapse.onclick = (e) => {
        e.stopPropagation();
        if (popover) popover.style.display = 'none';
      };
    }

    const linkForum = document.getElementById('link-pinned-view-forum');
    if (linkForum) {
      linkForum.onclick = (e) => {
        e.stopPropagation();
        if (popover) popover.style.display = 'none';
        switchMainTab('forum');
      };
    }
  }

  async function unpinMessage(msgId) {
    const room = AppState.activeRoomData;
    if (!room) return;
    try {
      await apiCall(`/api/rooms/${room.id}/pin-message`, 'POST', {
        action: 'unpin',
        message_id: msgId
      });
      showToast('Đã bỏ ghim tin nhắn.', 'info');
      loadMessages(room.id);
    } catch (err) {
      showToast(err.message || 'Lỗi khi bỏ ghim tin nhắn.', 'error');
    }
  }

  function scrollToMessage(msgId) {
    if (!msgId) return;
    const target = document.getElementById(`msg-row-${msgId}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('msg-pinned-highlight');
      setTimeout(() => target.classList.remove('msg-pinned-highlight'), 2200);
    } else {
      showToast('Tin nhắn nằm ngoài phạm vi hiển thị hiện tại.', 'info');
    }
  }

  function renderRoomsList() {
    const container = document.getElementById('room-list-container');
    if (!container) return;

    container.innerHTML = '';
    const filter = AppState.sidebarFilter;
    const q = AppState.searchConversationQuery.toLowerCase();

    let filteredRooms = AppState.rooms.filter(r => {
      if (filter === 'groups' && r.type === 'direct') return false;
      if (filter === 'friends' && r.type !== 'direct') return false;

      if (q) {
        const matchName = r.name.toLowerCase().includes(q);
        const matchSubject = (r.subject || '').toLowerCase().includes(q);
        return matchName || matchSubject;
      }
      return true;
    });

    // Sắp xếp các cuộc trò chuyện ĐÃ GHIM lên trên cùng danh sách!
    filteredRooms.sort((a, b) => {
      const pa = isRoomPinned(a.id) ? 1 : 0;
      const pb = isRoomPinned(b.id) ? 1 : 0;
      return pb - pa;
    });

    if (filteredRooms.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 35px 12px; color: var(--text-muted); font-size: 13px;">
          <i class="fa-solid fa-folder-open" style="font-size: 28px; margin-bottom: 10px; opacity: 0.7; display: block;"></i>
          ${filter === 'friends' ? 'Chưa có bạn bè nào. Bấm vào nút Thêm bạn bè để kết nối!' : 'Không tìm thấy nhóm hoặc cuộc trò chuyện phù hợp.'}
        </div>
      `;
      return;
    }

    filteredRooms.forEach(room => {
      const item = document.createElement('div');
      item.className = `room-item-card ${room.id === AppState.activeRoomId ? 'active' : ''}`;
      item.onclick = () => switchRoom(room.id);
      item.oncontextmenu = (e) => {
        e.preventDefault();
        toggleRoomPinned(room.id);
      };

      const isComm = room.type === 'community';
      const isDirect = room.type === 'direct';
      const pinnedBadge = isRoomPinned(room.id) ? `<i class="fa-solid fa-thumbtack room-pinned-badge" title="Cuộc trò chuyện đã ghim"></i>` : '';

      let avatarHtml = `<i class="${isComm ? 'fa-solid fa-users' : 'fa-solid fa-book-open'}"></i>`;
      if (isDirect && room.avatar) {
        avatarHtml = `<img src="${room.avatar}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
      }

      const lastMsgText = typeof room.last_message === 'object' && room.last_message !== null
        ? (room.last_message.text || (room.last_message.attachment ? '[Tệp tin đính kèm]' : ''))
        : (room.last_message || 'Chưa có tin nhắn nào');
      const lastMsgTime = typeof room.last_message === 'object' && room.last_message !== null
        ? room.last_message.created_at
        : (room.last_time || null);
      const timeBadgeText = lastMsgTime ? formatMsgTime(lastMsgTime) : (isDirect ? 'Cá nhân' : `${room.members_count || 1} TV`);

      item.innerHTML = `
        <div class="room-avatar-box">
          ${avatarHtml}
        </div>
        <div class="room-meta-box">
          <div class="room-row-top">
            <div class="room-name-title">${room.name} ${pinnedBadge}</div>
            <div class="room-time-badge">${timeBadgeText}</div>
          </div>
          <div class="room-row-bottom">
            <div class="room-last-msg">${lastMsgText}</div>
            <span class="subject-chip-mini">${room.subject || 'Chung'}</span>
          </div>
        </div>
      `;
      container.appendChild(item);
    });
  }

  function switchRoom(roomId) {
    // Đóng hoàn toàn khung công cụ (context menu) và các popover khi chuyển đoạn chat
    const cmenu = document.getElementById('chat-context-menu');
    if (cmenu) cmenu.style.display = 'none';

    const popover = document.getElementById('pinned-dropdown-popover');
    if (popover) popover.style.display = 'none';

    const mentionPopup = document.getElementById('chat-mention-popup');
    if (mentionPopup) mentionPopup.style.display = 'none';

    const emojiPicker = document.getElementById('emoji-picker-popover');
    if (emojiPicker) emojiPicker.style.display = 'none';

    if (isMultiSelectMode) {
      endMultiSelectMode();
    }

    if (AppState.activeRoomId !== roomId) {
      AppState.activeReplyTo = null;
      const replyPreview = document.getElementById('chat-reply-preview-bar');
      if (replyPreview) replyPreview.style.display = 'none';
    }

    AppState.activeRoomId = roomId;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ROOM, roomId);

    // Tự động đóng Bảng tin (hoặc tab khác) và chuyển ngay sang đoạn chat/nhóm đã chọn
    if (AppState.activeTab !== 'chat') {
      switchMainTab('chat');
    }

    const room = AppState.rooms.find(r => r.id === roomId);
    if (room) {
      AppState.activeRoomData = room;
      updateChatHeader(room);
      renderGroupInfoDrawer(room);
    // Item 12: Mặc định KHÔNG ĐƯỢC TỰ MỞ panel thông tin khi vào bất kỳ phòng nào
    document.getElementById('chat-info-drawer')?.classList.add('hidden');
    }

    renderRoomsList();
    loadMessages(roomId);

    // Thông báo cho WebSocket server để chuyển phòng chat thời gian thực
    if (typeof sendWsMessage === 'function') {
      sendWsMessage({
        type: 'join_room',
        room_id: roomId,
        user_email: (AppState.currentUser?.email || '').trim().toLowerCase()
      });
    }

    if (typeof syncActiveRoomMessages === 'function') {
      setTimeout(() => syncActiveRoomMessages(true), 100);
    }

    if (window.innerWidth <= 768) {
      document.getElementById('sidebar-column')?.classList.add('sidebar-mobile-hidden');
    }
  }

  function updateChatHeader(room) {
    const title = document.getElementById('chat-title');
    const codeBtn = document.getElementById('chat-group-code-chip');
    const codeText = document.getElementById('chat-group-code-text');
    const memberCount = document.getElementById('chat-member-count');
    const noticeText = document.getElementById('chat-notice-text');
    const avatarElem = document.getElementById('chat-header-avatar');
    const subtitleElem = document.getElementById('chat-subtitle');

    if (title) title.textContent = room.name;

    if (room.type === 'direct') {
      if (codeBtn) codeBtn.style.display = 'none';
      if (avatarElem) {
        avatarElem.innerHTML = room.avatar ? `<img src="${room.avatar}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : `<i class="fa-solid fa-user"></i>`;
      }
      if (subtitleElem) {
        subtitleElem.innerHTML = `<span style="color:#10b981; font-weight:600;"><i class="fa-solid fa-circle" style="font-size:8px;"></i> Đang hoạt động</span> • Trò chuyện cá nhân`;
      }
    } else {
      if (codeBtn) {
        codeBtn.style.display = 'none';
      }
      if (avatarElem) {
        const isComm = room.type === 'community';
        avatarElem.innerHTML = `<i class="${isComm ? 'fa-solid fa-users' : 'fa-solid fa-book-open'}"></i>`;
      }
      if (subtitleElem) {
        subtitleElem.innerHTML = `<i class="fa-solid fa-users"></i> <span id="chat-member-count">${room.members_count || (room.members ? room.members.length : 0)}</span> thành viên`;
      }
    }

    if (noticeText) {
      if (room.admin_only_chat) {
        noticeText.innerHTML = `<strong>Chế độ Quản trị:</strong> Chỉ Trưởng nhóm và Phó nhóm mới có quyền gửi tin nhắn và tệp.`;
      } else {
        noticeText.textContent = `Tất cả tài liệu được lưu trữ tự động an toàn trên hệ thống trong 60 ngày.`;
      }
    }

    // ĐIỀU KIỆN QUAN TRỌNG: CHỈ CÓ DIỄN ĐÀN HỌC SINH TOÀN TRƯỜNG (room_community) MỚI CÓ BẢNG TIN!
    const btnShortcutForum = document.getElementById('btn-switch-to-forum-shortcut');
    if (btnShortcutForum) {
      btnShortcutForum.style.display = (room.id === 'room_community') ? 'inline-flex' : 'none';
    }

    checkComposerPermissions(room);
    checkPinnedMessageBanner();
  }

  function checkComposerPermissions(room) {
    const guestLocked = document.getElementById('composer-guest-locked');
    const adminLocked = document.getElementById('composer-admin-locked');
    const blockedLocked = document.getElementById('composer-blocked-locked');
    const blockedText = document.getElementById('composer-blocked-text');
    const unblockBtn = document.getElementById('btn-composer-unblock');
    const activeBox = document.getElementById('composer-active-box');
    const u = AppState.currentUser;

    if (guestLocked) guestLocked.style.display = 'none';
    if (adminLocked) adminLocked.style.display = 'none';
    if (blockedLocked) blockedLocked.style.display = 'none';

    if (u.role === 'guest') {
      if (guestLocked) guestLocked.style.display = 'flex';
      if (activeBox) activeBox.style.display = 'none';
      return;
    }

    // Kiểm tra chặn trong cuộc trò chuyện 1-1
    if (room.type === 'direct' && room.is_blocked) {
      if (blockedLocked) {
        blockedLocked.style.display = 'flex';
        const isBlocker = (room.blocked_by || '').toLowerCase() === (u.email || '').toLowerCase();
        if (isBlocker) {
          if (blockedText) blockedText.textContent = 'Bạn đã chặn cuộc trò chuyện này.';
          if (unblockBtn) {
            unblockBtn.style.display = 'inline-flex';
            unblockBtn.onclick = () => unblockDirectUser(room.other_user_email);
          }
        } else {
          if (blockedText) blockedText.textContent = 'Bạn không thể gửi tin nhắn vì đối phương đã chặn trò chuyện.';
          if (unblockBtn) unblockBtn.style.display = 'none';
        }
      }
      if (activeBox) activeBox.style.display = 'none';
      return;
    }

    if (room.admin_only_chat) {
      const isLeaderOrCo = room.user_role === 'leader' || room.user_role === 'coleader';
      if (!isLeaderOrCo) {
        if (adminLocked) adminLocked.style.display = 'flex';
        if (activeBox) activeBox.style.display = 'none';
        return;
      }
    }

    if (activeBox) activeBox.style.display = 'block';
  }

  // ==================== TIN NHẮN TRONG PHÒNG CHAT ====================
  async function loadMessages(roomId) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    try {
      const myEmail = encodeURIComponent(AppState.currentUser.email || '');
      const data = await apiCall(`/api/rooms/${roomId}/messages?user_email=${myEmail}`);
      const serverMsgs = Array.isArray(data) ? data : [];

      // Giữ lại các tin nhắn đang gửi (sending) hoặc gửi thất bại (failed) của phòng hiện tại để không bị mất khi load
      const pendingMsgs = (AppState.messages || []).filter(m => m.room_id === roomId && (m.status === 'sending' || m.status === 'failed'));
      const mergedMsgs = [...serverMsgs];
      pendingMsgs.forEach(pm => {
        if (!mergedMsgs.some(m => m.id === pm.id)) {
          mergedMsgs.push(pm);
        }
      });

      AppState.messages = mergedMsgs;
      renderMessages(mergedMsgs);
      checkPinnedMessageBanner();
    } catch (err) {
      console.warn('Lỗi tải tin nhắn:', err);
    }
  }

  function buildMessageRowElement(msg, myEmail) {
    const isOutgoing = msg.sender_email && msg.sender_email.toLowerCase() === myEmail;
    const row = document.createElement('div');
    row.className = `msg-row ${isOutgoing ? 'outgoing' : 'incoming'} ${msg.status === 'failed' ? 'msg-send-failed' : ''}`;
    row.id = `msg-row-${msg.id}`;
    row.setAttribute('data-msg-id', msg.id);
    if (msg.sender_email) {
      row.setAttribute('data-sender-email', msg.sender_email.toLowerCase().trim());
    }

    // Thao tác chuột phải hiện bảng tùy chọn EduShare PC
    row.oncontextmenu = (e) => handleMessageContextMenu(e, msg);

    // Thao tác nhấn giữ trên điện thoại (Mobile Touch Long-Press)
    let touchTimer = null;
    let touchStartX = 0;
    let touchStartY = 0;

    row.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;

      touchTimer = setTimeout(() => {
        handleMessageContextMenu({
          preventDefault: () => {},
          clientX: touchStartX,
          clientY: touchStartY
        }, msg);
        if (navigator.vibrate) navigator.vibrate(40);
      }, 500);
    }, { passive: true });

    row.addEventListener('touchmove', (e) => {
      if (!touchTimer) return;
      const touch = e.touches[0];
      if (Math.abs(touch.clientX - touchStartX) > 10 || Math.abs(touch.clientY - touchStartY) > 10) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    }, { passive: true });

    row.addEventListener('touchend', () => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    });

    row.addEventListener('touchcancel', () => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    });

    let roleBadge = '';
    if (msg.sender_role === 'Super Admin' || (msg.sender_role && (msg.sender_role.includes('Super') || msg.sender_role.includes('Admin')))) {
      roleBadge = `<span class="role-badge-chip super-admin"><i class="fa-solid fa-crown"></i> Admin <span class="admin-prestige-code">[#951842]</span></span>`;
    } else if (msg.sender_role.includes('Trưởng')) {
      roleBadge = `<span class="role-badge-chip leader"><i class="fa-solid fa-star"></i> Trưởng nhóm</span>`;
    } else if (msg.sender_role.includes('Phó')) {
      roleBadge = `<span class="role-badge-chip coleader">Phó nhóm</span>`;
    }

    // Quoted Reply Preview chuẩn EduShare PC
    let replyQuoteHtml = '';
    if (msg.reply_to) {
      let quoteSnippet = msg.reply_to.text || '';
      if (!quoteSnippet && msg.reply_to.attachment) {
        const isImg = msg.reply_to.attachment.file_type === 'image' || (msg.reply_to.attachment.file_type || '').includes('image');
        quoteSnippet = isImg ? '🖼 Ảnh' : `📄 ${msg.reply_to.attachment.title}`;
      }
      replyQuoteHtml = `
        <div class="chat-reply-quote-box" onclick="window.EduShare.scrollToMessage('${msg.reply_to.id}')" title="Bấm để cuộn đến tin nhắn gốc">
          <div class="reply-quote-author">${escapeHtml(msg.reply_to.sender_name || 'Người dùng')}</div>
          <div class="reply-quote-snippet">${escapeHtml(quoteSnippet)}</div>
        </div>
      `;
    }

    let attachHtml = '';
    if (msg.attachment) {
      const att = msg.attachment;

      if (att.type === 'geochalk_project') {
        const previewImg = att.preview_url ? `
          <div class="geochalk-preview-img-wrap" onclick="window.EduShare.openGeoChalk('${escapeHtml(att.project_id || '')}')">
            <img src="${att.preview_url}" alt="${escapeHtml(att.title || 'Dự án hình học')}" class="geochalk-preview-img" onerror="this.parentElement.style.display='none'">
          </div>
        ` : '';
        attachHtml = `
          <div class="geochalk-attachment-card">
            <div class="geochalk-card-header">
              <div class="geochalk-icon-box">
                <i class="fa-solid fa-shapes"></i>
              </div>
              <div class="geochalk-card-info">
                <div class="geochalk-card-title" title="${escapeHtml(att.title || 'Dự án Hình Học')}">${escapeHtml(att.title || 'Dự án Hình Học GeoChalk')}</div>
                <div class="geochalk-card-sub">
                  <span class="geochalk-badge"><i class="fa-solid fa-cube"></i> GeoChalk 3D</span>
                  ${att.project_id ? `<span>Mã: ${escapeHtml(att.project_id)}</span>` : ''}
                </div>
              </div>
            </div>
            ${previewImg}
            <div class="geochalk-card-actions">
              <button type="button" class="btn-open-geochalk-action" onclick="window.EduShare.openGeoChalk('${escapeHtml(att.project_id || '')}')" title="Mở bản vẽ trực tiếp trên GeoChalk">
                <i class="fa-solid fa-up-right-from-square"></i> Mở vẽ hình GeoChalk
              </button>
            </div>
          </div>
        `;
      } else {
        const meta = getFileIconMeta(att.file_type);
        const isImg = att.file_type === 'image' || (att.file_type || '').includes('image') || ['png','jpg','jpeg','webp','gif'].includes((att.file_type || '').toLowerCase()) || (att.mime_type || '').startsWith('image/');

        if (isImg && (att.file_base64 || att.drive_url || att.doc_id)) {
          const imgSrc = att.file_base64 || att.drive_url || `/api/docs/${encodeURIComponent(att.doc_id)}/download`;
          attachHtml = `
            <div class="chat-img-bubble-wrap" style="position:relative; display:inline-block; margin-top:6px;">
              <img src="${imgSrc}" alt="${escapeHtml(att.title || 'Hình ảnh')}" class="chat-img-thumb" onclick="window.EduShare.previewMessageImage('${msg.id}')" title="Bấm để xem ảnh phóng to" style="max-width:280px; max-height:220px; border-radius:10px; object-fit:cover; border:1px solid var(--border-color); cursor:pointer; display:block;">
              <div style="position:absolute; right:8px; bottom:8px; display:flex; gap:6px;">
                <button type="button" class="btn-chat-img-download" onclick="event.stopPropagation(); window.EduShare.shareDocMessage('${msg.id}')" title="Chia sẻ ảnh này" style="background:rgba(0,0,0,0.65); color:#fff; border:none; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:12px; transition:all 0.15s ease;">
                  <i class="fa-solid fa-share"></i>
                </button>
                <button type="button" class="btn-chat-img-download" onclick="event.stopPropagation(); window.EduShare.downloadMessageImage('${msg.id}')" title="Tải ảnh về máy" style="background:rgba(0,0,0,0.65); color:#fff; border:none; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:12px; transition:all 0.15s ease;">
                  <i class="fa-solid fa-download"></i>
                </button>
              </div>
            </div>
          `;
        } else {
          attachHtml = `
            <div class="doc-attachment-card">
              <i class="fa-solid ${meta.icon} doc-file-icon ${meta.colorClass}"></i>
              <div class="doc-info-col">
                <div class="doc-title-text" title="${att.title}">${att.title}</div>
                <div class="doc-size-text">${att.file_size || '1.5 MB'} • Đám mây 60 ngày</div>
              </div>
              <div class="doc-actions-wrap">
                <button class="btn-doc-download" onclick="window.EduShare.previewDoc('${att.title}', '${att.file_type}', '${att.file_size}', '')" title="Xem trước">
                  <i class="fa-solid fa-eye"></i>
                </button>
                <button class="btn-doc-download" onclick="window.EduShare.downloadDoc('${att.doc_id}', '${att.title}')" title="Tải về trực tiếp">
                  <i class="fa-solid fa-download"></i> Tải về
                </button>
                <button class="btn-doc-download" onclick="window.EduShare.shareDocMessage('${msg.id}')" title="Chia sẻ tệp này">
                  <i class="fa-solid fa-share"></i> Chia sẻ
                </button>
              </div>
            </div>
          `;
        }
      }
    }

    const isRecalled = msg.is_recalled || msg.text === 'Tin nhắn đã được thu hồi';
    let msgBubbleHtml = '';
    if (isRecalled) {
      msgBubbleHtml = `<div class="msg-bubble msg-recalled-bubble"><i class="fa-solid fa-rotate-left"></i> Tin nhắn đã được thu hồi</div>`;
    } else if (msg.text || replyQuoteHtml) {
      msgBubbleHtml = `<div class="msg-bubble">${replyQuoteHtml}${linkifyText(msg.text || '')}</div>`;
    }

    // Trạng thái Optimistic (Đang gửi... / Gửi lỗi) hoặc Thời gian gửi
    let statusOrTimeHtml = '';
    if (msg.status === 'sending') {
      statusOrTimeHtml = `<span class="msg-status-tag status-sending" id="msg-status-${msg.id}"><i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...</span>`;
    } else if (msg.status === 'failed') {
      statusOrTimeHtml = `<span class="msg-status-tag status-failed" id="msg-status-${msg.id}"><i class="fa-solid fa-circle-exclamation"></i> Gửi lỗi <button type="button" class="btn-retry-msg" onclick="window.EduShare.retrySendMessage('${msg.id}')"><i class="fa-solid fa-rotate-right"></i> Thử lại</button></span>`;
    } else {
      statusOrTimeHtml = `<span>${formatMsgTime(msg.created_at)}</span>`;
    }

    // Chỉ duy nhất tin nhắn do chính mình gửi (isOutgoing) mới có nút Thu hồi, tin nhắn của user khác tuyệt đối không có
    let recallBtn = '';
    const myEmailForRecall = (AppState.currentUser?.email || '').trim().toLowerCase();
    const senderEmailForRecall = (msg.sender_email || '').trim().toLowerCase();
    const isMyMessage = Boolean(myEmailForRecall && senderEmailForRecall && myEmailForRecall === senderEmailForRecall && AppState.currentUser?.role !== 'guest');
    const canRecall = !isRecalled && isMyMessage && msg.status !== 'sending' && msg.status !== 'failed';
    if (canRecall) {
      recallBtn = `<button type="button" class="btn-msg-recall" title="Thu hồi tin nhắn này với mọi người" onclick="window.EduShare.recallMessage('${msg.id}')"><i class="fa-solid fa-rotate-left"></i> Thu hồi</button>`;
    }

    let reactionsHtml = '';
    if (!isRecalled && msg.reactions && msg.reactions.length > 0) {
      const emojiCounts = {};
      msg.reactions.forEach(r => { emojiCounts[r.emoji] = (emojiCounts[r.emoji] || 0) + 1; });
      let topEmoji = '❤️';
      let maxCount = 0;
      for (const [em, cnt] of Object.entries(emojiCounts)) {
        if (cnt > maxCount) {
          maxCount = cnt;
          topEmoji = em;
        }
      }
      reactionsHtml = `<div class="msg-reaction-badge" onclick="event.stopPropagation(); window.EduShare.openReactionModal('${msg.id}')" onpointerdown="event.stopPropagation()" ontouchstart="event.stopPropagation()" title="Xem danh sách người thả biểu cảm">
        <span>${topEmoji}</span>
        <span style="margin-left: 3px; font-weight: 600;">${msg.reactions.length}</span>
      </div>`;
    }

    row.innerHTML = `
      ${!isOutgoing ? `<img src="${msg.sender_avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=User'}" alt="Avatar" class="msg-avatar" data-sender-email="${(msg.sender_email || '').toLowerCase().trim()}" onclick="window.EduShare.openUserProfile('${msg.sender_email}')" title="Bấm để xem hồ sơ và kết bạn" style="cursor:pointer;">` : ''}
      <div class="msg-body-col">
        ${!isOutgoing ? `
          <div class="msg-sender-meta">
            <span style="font-weight:600; cursor:pointer;" onclick="window.EduShare.openUserProfile('${msg.sender_email}')">${msg.sender_name}</span>
            ${roleBadge}
          </div>
        ` : ''}
        ${msgBubbleHtml}
        ${!isRecalled ? attachHtml : ''}
        ${reactionsHtml}
        <div class="msg-timestamp" title="${formatFullMsgTime(msg.created_at)}">
          ${statusOrTimeHtml}
          ${!isRecalled && msg.status !== 'sending' && msg.status !== 'failed' ? `<button type="button" class="msg-quick-react-btn" title="Thả biểu cảm" onclick="event.stopPropagation(); window.EduShare.quickReact(event, '${msg.id}')" onpointerdown="event.stopPropagation()" ontouchstart="event.stopPropagation()"><i class="fa-regular fa-face-smile"></i></button>` : ''}
          ${recallBtn}
        </div>
      </div>
    `;

    return row;
  }

  function renderMessages(messages) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    container.innerHTML = `
      <div class="chat-date-separator">
        <span>Bắt đầu cuộc trò chuyện • Lưu trữ đám mây 60 ngày</span>
      </div>
    `;

    const myEmail = (AppState.currentUser.email || '').toLowerCase();
    let lastDateStr = '';

    messages.forEach(msg => {
      const msgDate = parseServerDate(msg.created_at);
      const dateKey = msgDate.toDateString();
      if (dateKey !== lastDateStr) {
        lastDateStr = dateKey;
        const divider = document.createElement('div');
        divider.className = 'chat-date-divider';
        divider.innerHTML = `<span>${getDateDividerLabel(msgDate)}</span>`;
        container.appendChild(divider);
      }

      const row = buildMessageRowElement(msg, myEmail);
      container.appendChild(row);
    });

    container.scrollTop = container.scrollHeight;
  }

  function appendOptimisticMessage(optimisticMsg) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    const myEmail = (AppState.currentUser.email || '').toLowerCase();
    const msgDate = parseServerDate(optimisticMsg.created_at);
    const targetLabel = getDateDividerLabel(msgDate);

    // Kiểm tra xem đã có dải phân cách ngày hôm nay chưa
    const dividers = container.querySelectorAll('.chat-date-divider');
    let hasDateDivider = false;
    dividers.forEach(d => {
      if (d.textContent && (d.textContent.includes('Hôm nay') || d.textContent.includes(targetLabel))) {
        hasDateDivider = true;
      }
    });
    if (!hasDateDivider && dividers.length === 0) {
      const divider = document.createElement('div');
      divider.className = 'chat-date-divider';
      divider.innerHTML = `<span>${targetLabel}</span>`;
      container.appendChild(divider);
    }

    const row = buildMessageRowElement(optimisticMsg, myEmail);
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  // ==================== ĐỒNG BỘ & ĐỊNH DẠNG THỜI GIAN ====================
  function parseServerDate(isoStr) {
    if (!isoStr) return new Date();
    if (isoStr instanceof Date) return isoStr;
    let s = String(isoStr).trim();
    if (!s) return new Date();
    // Chuẩn hóa UTC nếu thiếu hậu tố múi giờ
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s) && !s.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) {
      s += 'Z';
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  function formatMsgTime(isoStr) {
    if (!isoStr) return '';
    try {
      const d = parseServerDate(isoStr);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (_) {
      return '';
    }
  }

  function formatFullMsgTime(isoStr) {
    if (!isoStr) return '';
    try {
      const d = parseServerDate(isoStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour12: false
      });
    } catch (_) {
      return '';
    }
  }

  function getDateDividerLabel(date) {
    const now = new Date();
    const d = new Date(date);
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    if (isToday) return 'Hôm nay';
    if (isYesterday) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatTimeAgo(isoStr) {
    if (!isoStr) return '';
    try {
      const d = parseServerDate(isoStr);
      const now = new Date();
      const diffSec = Math.floor((now - d) / 1000);
      if (diffSec < 45) return 'Vừa xong';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} phút trước`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} giờ trước`;
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay < 7) return `${diffDay} ngày trước`;
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (_) {
      return '';
    }
  }

  async function executeSendMessage(optimisticMsg) {
    const tempId = optimisticMsg.id;
    try {
      const res = await apiCall(`/api/rooms/${optimisticMsg.room_id}/messages`, 'POST', optimisticMsg._payload);
      const realId = res.id || res.message_id || tempId;
      optimisticMsg.id = realId;
      optimisticMsg.status = 'sent';
      if (res.created_at) optimisticMsg.created_at = res.created_at;

      reconcileOptimisticMessage(optimisticMsg, tempId);

      loadRooms();

      // Đồng bộ Google Drive nếu có tệp đính kèm và có URL Apps Script
      if (optimisticMsg.attachment && optimisticMsg.attachment.file_base64) {
        const driveUrl = localStorage.getItem(STORAGE_KEYS.DRIVE_URL);
        if (driveUrl && driveUrl.includes('script.google.com')) {
          const rawBase64 = optimisticMsg.attachment.file_base64.includes(',') ? optimisticMsg.attachment.file_base64.split(',')[1] : optimisticMsg.attachment.file_base64;
          fetch(driveUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'upload_file',
              fileName: optimisticMsg.attachment.title,
              mimeType: optimisticMsg.attachment.mime_type,
              fileBase64: rawBase64,
              uploader: optimisticMsg.sender_name,
              roomId: optimisticMsg.room_id,
              docId: optimisticMsg.attachment.doc_id
            })
          }).catch(e => console.warn('[Drive Upload Sync]', e));
        }
      }
    } catch (err) {
      console.warn('Lỗi gửi tin nhắn:', err);
      optimisticMsg.status = 'failed';
      optimisticMsg.errorMessage = err.message || 'Lỗi mạng hoặc máy chủ';

      const rowEl = document.getElementById(`msg-row-${tempId}`);
      if (rowEl) {
        rowEl.classList.add('msg-send-failed');
        const statusTag = rowEl.querySelector(`#msg-status-${tempId}`);
        if (statusTag) {
          statusTag.className = 'msg-status-tag status-failed';
          statusTag.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Gửi lỗi <button type="button" class="btn-retry-msg" onclick="window.EduShare.retrySendMessage('${tempId}')"><i class="fa-solid fa-rotate-right"></i> Thử lại</button>`;
        }
      }
      showToast(err.message || 'Gửi tin nhắn thất bại. Vui lòng bấm Thử lại.', 'error');
    }
  }

  function handleSendMessage(attachment = null) {
    const input = document.getElementById('chat-message-input');
    const text = input ? input.value.trim() : '';

    // Nếu không truyền attachment trực tiếp nhưng có ảnh dán từ Clipboard (Ctrl + V)
    if (!attachment && AppState.stagedClipboardAttachment) {
      attachment = AppState.stagedClipboardAttachment;
      AppState.stagedClipboardAttachment = null;
      const clipBar = document.getElementById('chat-clipboard-preview-bar');
      if (clipBar) clipBar.style.display = 'none';
    }

    if (!text && !attachment) return;

    const u = AppState.currentUser;
    if (u.role === 'guest') {
      showToast('Vui lòng đăng nhập để gửi tin nhắn!', 'info');
      openModal('modal-auth');
      return;
    }

    // 1. Phản hồi tức thì: Ngay lập tức xóa trống ô nhập liệu để người dùng gõ tiếp
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }
    const currentReplyTo = AppState.activeReplyTo || null;
    AppState.activeReplyTo = null;
    const replyPreview = document.getElementById('chat-reply-preview-bar');
    if (replyPreview) replyPreview.style.display = 'none';

    // 2. Tối ưu payload và sinh ID tạm thời
    const tempId = 'temp_msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const payload = {
      room_id: AppState.activeRoomId,
      sender_email: u.email,
      sender_name: u.name,
      sender_role: u.roleTitle || 'Thành viên',
      sender_avatar: u.avatar,
      text: text,
      attachment: attachment,
      reply_to: currentReplyTo
    };

    const optimisticMsg = {
      id: tempId,
      room_id: AppState.activeRoomId,
      sender_email: u.email,
      sender_name: u.name,
      sender_role: u.roleTitle || 'Thành viên',
      sender_avatar: u.avatar,
      text: text,
      attachment: attachment,
      reply_to: currentReplyTo,
      created_at: new Date().toISOString(),
      status: 'sending',
      _payload: payload
    };

    // 3. Render ngay lập tức lên khung chat (Optimistic UI) mà không re-render danh sách cũ
    AppState.messages = AppState.messages || [];
    AppState.messages.push(optimisticMsg);
    appendOptimisticMessage(optimisticMsg);

    // 4. Gửi ngầm tới server
    executeSendMessage(optimisticMsg);
  }

  function initChatEvents() {
    const chatInput = document.getElementById('chat-message-input');
    chatInput?.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });

    document.getElementById('btn-send-chat')?.addEventListener('click', () => handleSendMessage());

    // Nút đóng Drawer Thông tin hội thoại (Dấu X và Toggle)
    document.getElementById('btn-close-drawer')?.addEventListener('click', () => {
      document.getElementById('chat-info-drawer')?.classList.add('hidden');
    });
    document.getElementById('btn-close-drawer-detail')?.addEventListener('click', () => {
      closeDrawerDetail();
      document.getElementById('chat-info-drawer')?.classList.add('hidden');
    });
    document.getElementById('btn-toggle-info-drawer')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('chat-info-drawer')?.classList.toggle('hidden');
    });

    // Bấm ra ngoài Drawer trên điện thoại/máy tính bảng sẽ đóng Drawer
    document.addEventListener('click', (e) => {
      const drawer = document.getElementById('chat-info-drawer');
      const toggleBtn = document.getElementById('btn-toggle-info-drawer');
      if (drawer && !drawer.classList.contains('hidden') && window.innerWidth <= 768) {
        if (!drawer.contains(e.target) && !toggleBtn?.contains(e.target)) {
          drawer.classList.add('hidden');
        }
      }
    });

    // Nút chuyển nhanh sang Bảng tin Diễn đàn từ thanh công cụ Header
    document.getElementById('btn-switch-to-forum-shortcut')?.addEventListener('click', () => {
      switchMainTab('forum');
    });

    // Tự động đóng Panel thông tin khi màn hình thu hẹp < 768px và đồng bộ hiển thị sidebar khi co giãn
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        document.getElementById('sidebar-column')?.classList.remove('sidebar-mobile-hidden');
      } else {
        if (AppState.activeRoomId && AppState.activeTab === 'chat') {
          document.getElementById('sidebar-column')?.classList.add('sidebar-mobile-hidden');
        }
      }
      if (window.innerWidth < 768) {
        document.getElementById('chat-info-drawer')?.classList.add('hidden');
      }
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        const container = document.getElementById('chat-messages-container');
        if (container) container.scrollTop = container.scrollHeight;
      });
    }
    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const popup = document.getElementById('chat-mention-popup');
        if (popup && popup.style.display !== 'none') {
          return;
        }
        e.preventDefault();
        handleSendMessage();
      }
    });

    // Popover Emoji
    const emojiBtn = document.getElementById('btn-open-emoji');
    const emojiPopover = document.getElementById('emoji-picker-popover');
    emojiBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!emojiPopover) return;
      emojiPopover.style.display = emojiPopover.style.display === 'none' ? 'block' : 'none';
    });

    document.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (chatInput) {
          chatInput.value += btn.textContent;
          chatInput.focus();
        }
        if (emojiPopover) emojiPopover.style.display = 'none';
      });
    });

    document.addEventListener('click', (e) => {
      if (emojiPopover && !emojiPopover.contains(e.target) && e.target !== emojiBtn && !emojiBtn?.contains(e.target)) {
        emojiPopover.style.display = 'none';
      }
    });

    // ĐÍNH KÈM TỆP TÀI LIỆU (PDF, Word, Excel, Slide) - Đọc ĐẦY ĐỦ base64 bytes thật!
    document.getElementById('chat-file-input')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const ext = file.name.split('.').pop().toLowerCase();
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
        const docId = `doc_${Date.now()}`;
        const reader = new FileReader();
        reader.onload = (evt) => {
          const attachment = {
            doc_id: docId,
            title: file.name,
            file_type: ext,
            file_size: sizeMb,
            mime_type: file.type || 'application/octet-stream',
            file_base64: evt.target.result
          };
          handleSendMessage(attachment);
          showToast(`Đã đính kèm tệp: ${file.name}`, 'success');
        };
        reader.readAsDataURL(file);
        e.target.value = '';
      }
    });

    // Đính kèm hình ảnh
    document.getElementById('chat-image-input')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const docId = `img_${Date.now()}`;
          const attachment = {
            doc_id: docId,
            title: file.name,
            file_type: 'image',
            file_size: (file.size / 1024).toFixed(0) + ' KB',
            mime_type: file.type || 'image/png',
            file_base64: evt.target.result
          };
          handleSendMessage(attachment);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
      }
    });

    // Đính kèm tài liệu mẫu nhanh (Đề thi thử 2026)
    document.getElementById('btn-quick-sample-doc')?.addEventListener('click', () => {
      const sampleDoc = {
        doc_id: `doc_sample_${Date.now()}`,
        title: 'De-Thi-Thu-Tot-Nghiep-THPT-2026-Toan-Ly-Hoa.pdf',
        file_type: 'pdf',
        file_size: '2.4 MB',
        mime_type: 'application/pdf',
        file_base64: 'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+CmVuZG9iagoyIDAgb2JqPDwvVHlwZS9QYWdlcy9LaWRzWzMgMCBSXS9Db3VudCAxPj4KZW5kb2JqCjMgMCBvYmo8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCA2MTIgNzkyXT4+CmVuZG9iagp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTggMDAwMDAgbiAKMDAwMDAwMDA2NyAwMDAwMCBuIAowMDAwMDAwMTI0IDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA0L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMTgyCiUlRU9G'
      };
      handleSendMessage(sampleDoc);
      showToast('Đã đính kèm Đề Thi Thử Tốt Nghiệp THPT 2026!', 'success');
    });

    // Lắng nghe sự kiện Paste (Ctrl + V) từ Clipboard (Ảnh chụp màn hình Snipping Tool hoặc sao chép ảnh)
    const handleClipboardPaste = (e) => {
      const items = (e.clipboardData || window.clipboardData)?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = (evt) => {
            const dataUrl = evt.target.result;
            const sizeStr = (file.size / 1024).toFixed(0) + ' KB';
            const fileName = `screenshot_${Date.now()}.png`;

            AppState.stagedClipboardAttachment = {
              doc_id: `img_paste_${Date.now()}`,
              title: fileName,
              file_type: 'image',
              file_size: sizeStr,
              mime_type: file.type || 'image/png',
              file_base64: dataUrl
            };

            const clipBar = document.getElementById('chat-clipboard-preview-bar');
            const clipImg = document.getElementById('clipboard-preview-img');
            const clipName = document.getElementById('clipboard-preview-name');
            const clipSize = document.getElementById('clipboard-preview-size');

            if (clipImg) clipImg.src = dataUrl;
            if (clipName) clipName.textContent = fileName;
            if (clipSize) clipSize.textContent = `${sizeStr} • Bạn có thể gõ thêm lời nhắn bên dưới và bấm Gửi`;
            if (clipBar) clipBar.style.display = 'flex';

            chatInput?.focus();
            showToast('Đã dán ảnh từ bảng nhớ tạm! Bạn có thể nhập thêm tin nhắn và bấm Gửi.', 'success');
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };

    chatInput?.addEventListener('paste', handleClipboardPaste);
    document.getElementById('composer-active-box')?.addEventListener('paste', handleClipboardPaste);
    window.addEventListener('paste', (e) => {
      if ((AppState.activeTab || 'chat') !== 'chat') return;
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea') return;
      handleClipboardPaste(e);
    });

    // Hủy ảnh đính kèm từ clipboard
    document.getElementById('btn-cancel-clipboard-attach')?.addEventListener('click', () => {
      AppState.stagedClipboardAttachment = null;
      const clipBar = document.getElementById('chat-clipboard-preview-bar');
      if (clipBar) clipBar.style.display = 'none';
      showToast('Đã hủy ảnh đính kèm.', 'info');
    });

    // Xử lý các nút tác vụ Chọn nhiều tin nhắn
    document.getElementById('btn-multiselect-cancel')?.addEventListener('click', endMultiSelectMode);
    document.getElementById('btn-multiselect-download')?.addEventListener('click', async () => {
      const selectedMsgsWithAtt = (AppState.messages || []).filter(m => selectedMsgIds.has(m.id) && m.attachment);
      if (selectedMsgsWithAtt.length === 0) {
        showToast('Không có tệp hoặc ảnh nào trong các tin nhắn đã chọn!', 'warning');
        return;
      }
      showToast(`Bắt đầu tải ${selectedMsgsWithAtt.length} tệp...`, 'info');
      for (let i = 0; i < selectedMsgsWithAtt.length; i++) {
        const att = selectedMsgsWithAtt[i].attachment;
        const isImg = att.file_type === 'image' || (att.file_type || '').includes('image');
        if (isImg) {
          await downloadImageDirect(att);
        } else {
          await downloadDocumentDirect(att.doc_id, att.title);
        }
        if (i < selectedMsgsWithAtt.length - 1) {
          await new Promise(r => setTimeout(r, 600));
        }
      }
      showToast(`Đã tải xong toàn bộ ${selectedMsgsWithAtt.length} tệp!`, 'success');
    });
    document.getElementById('btn-multiselect-share')?.addEventListener('click', () => {
      if (selectedMsgIds.size === 0) {
        showToast('Vui lòng chọn ít nhất 1 tin nhắn để chia sẻ!', 'warning');
        return;
      }
      const msgs = (AppState.messages || []).filter(m => selectedMsgIds.has(m.id));
      if (msgs.length > 0) openShareMessageModal(msgs);
      endMultiSelectMode();
    });
    document.getElementById('btn-multiselect-delete')?.addEventListener('click', async () => {
      if (selectedMsgIds.size === 0) return;
      const count = selectedMsgIds.size;
      const u = AppState.currentUser;
      for (const id of selectedMsgIds) {
        try {
          await apiCall(`/api/messages/${id}/delete-for-me?user_email=${encodeURIComponent(u.email || '')}`, 'DELETE');
          document.getElementById(`msg-row-${id}`)?.remove();
        } catch (_) {}
      }
      endMultiSelectMode();
      showToast(`Đã xóa ${count} tin nhắn chỉ ở phía bạn.`, 'info');
    });

    initContextMenu();
    initMentionSystem();
    initShareConfirm();

    document.getElementById('btn-cancel-reply')?.addEventListener('click', () => {
      AppState.activeReplyTo = null;
      const previewBar = document.getElementById('chat-reply-preview-bar');
      if (previewBar) previewBar.style.display = 'none';
    });
  }

  // ==================== BẢNG TÙY CHỌN CHUỘT PHẢI / NHẤN GIỮ (CONTEXT MENU CHUẨN EduShare PC) ====================
  let activeContextMenuMsg = null;
  let isMultiSelectMode = false;
  let selectedMsgIds = new Set();

  function initContextMenu() {
    const cmenu = document.getElementById('chat-context-menu');
    if (!cmenu) return;

    // Hàm đóng tất cả các khung công cụ và popover
    const closeToolbars = (e) => {
      // 1. Đóng khung công cụ context menu nếu click / chạm ra ngoài
      if (cmenu.style.display !== 'none' && (!e || !cmenu.contains(e.target))) {
        cmenu.style.display = 'none';
      }

      // 2. Đóng popover danh sách tin ghim nếu bấm ra ngoài
      const popover = document.getElementById('pinned-dropdown-popover');
      const btnDropdown = document.getElementById('btn-pinned-dropdown');
      const btnMore = document.getElementById('btn-pinned-more');
      if (popover && popover.style.display !== 'none') {
        if (!e || (!popover.contains(e.target) && !btnDropdown?.contains(e.target) && !btnMore?.contains(e.target))) {
          popover.style.display = 'none';
        }
      }

      // 3. Đóng emoji picker popover nếu bấm ra ngoài
      const emojiPicker = document.getElementById('emoji-picker-popover');
      const btnEmoji = document.getElementById('btn-toggle-emoji-picker');
      if (emojiPicker && emojiPicker.style.display !== 'none') {
        if (!e || (!emojiPicker.contains(e.target) && !btnEmoji?.contains(e.target))) {
          emojiPicker.style.display = 'none';
        }
      }

      // 4. Đóng mention popup nếu bấm ra ngoài
      const mentionPopup = document.getElementById('chat-mention-popup');
      const chatInput = document.getElementById('chat-message-input');
      if (mentionPopup && mentionPopup.style.display !== 'none') {
        if (!e || (!mentionPopup.contains(e.target) && e.target !== chatInput)) {
          mentionPopup.style.display = 'none';
        }
      }
    };

    // Đóng ngay khi click chuột hoặc chạm ngón tay vào bất kỳ nơi nào khác ngoài khung công cụ (bắt cả capture)
    document.addEventListener('pointerdown', (e) => closeToolbars(e), true);
    document.addEventListener('click', (e) => closeToolbars(e), true);

    // Đóng ngay khi cuộn danh sách tin nhắn hoặc cuộn trang
    window.addEventListener('scroll', () => {
      if (cmenu.style.display !== 'none') cmenu.style.display = 'none';
    }, { capture: true, passive: true });

    document.getElementById('chat-messages-container')?.addEventListener('scroll', () => {
      if (cmenu.style.display !== 'none') cmenu.style.display = 'none';
    }, { passive: true });

    // Đóng khi click chuột phải ra ngoài các tin nhắn
    document.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('.msg-row')) {
        if (cmenu.style.display !== 'none') cmenu.style.display = 'none';
      }
    });

    // Đóng khi nhấn phím Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeToolbars();
      }
    });

    // Item 2: Thả biểu cảm nhanh từ thanh icon reaction dưới context menu
    cmenu.querySelectorAll('#cmenu-reactions-strip .reaction-item').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const emoji = btn.getAttribute('data-emoji');
        cmenu.style.display = 'none';
        if (!activeContextMenuMsg) return;
        await reactToMessage(activeContextMenuMsg.id, emoji);
      };
    });

    cmenu.querySelectorAll('.cmenu-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        const action = item.getAttribute('data-action');
        cmenu.style.display = 'none';
        if (!activeContextMenuMsg) return;
        const msg = activeContextMenuMsg;

        switch (action) {
          case 'reply': {
            AppState.activeReplyTo = msg;
            const previewBar = document.getElementById('chat-reply-preview-bar');
            const senderElem = document.getElementById('reply-preview-sender');
            const contentElem = document.getElementById('reply-preview-content');
            if (senderElem) senderElem.textContent = `Trả lời ${msg.sender_name || 'thành viên'}`;
            if (contentElem) {
              if (msg.attachment) {
                contentElem.textContent = `[${msg.attachment.file_type === 'image' ? 'Hình ảnh' : 'Tệp'}] ${msg.attachment.title || ''}`;
              } else {
                contentElem.textContent = msg.text || '...';
              }
            }
            if (previewBar) previewBar.style.display = 'flex';
            document.getElementById('chat-message-input')?.focus();
            break;
          }

          case 'share': {
            openShareMessageModal(msg);
            break;
          }

          case 'copy': {
            const hasImage = msg.attachment && (msg.attachment.file_type === 'image' || (msg.attachment.file_type || '').includes('image'));
            if (hasImage) {
              await copyImageBinaryToClipboard(msg.attachment);
            } else if (msg.attachment) {
              await navigator.clipboard.writeText(msg.attachment.drive_url || msg.attachment.title);
              showToast('Đã sao chép tên tài liệu vào bộ nhớ tạm!', 'success');
            } else {
              await navigator.clipboard.writeText(msg.text || '');
              showToast('Đã sao chép tin nhắn vào bộ nhớ tạm!', 'success');
            }
            break;
          }

          case 'download': {
            if (msg.attachment) {
              const isImg = msg.attachment.file_type === 'image' || (msg.attachment.file_type || '').includes('image') || ['png','jpg','jpeg','webp','gif'].includes((msg.attachment.file_type || '').toLowerCase()) || (msg.attachment.mime_type || '').startsWith('image/');
              if (isImg) {
                downloadImageDirect(msg.attachment);
              } else {
                window.EduShare.downloadDoc(msg.attachment.doc_id, msg.attachment.title);
              }
            }
            break;
          }

          case 'pin': {
            const isCurrentlyPinned = Boolean(msg.is_pinned);
            try {
              const res = await apiCall(`/api/rooms/${AppState.activeRoomId}/pin-message`, 'POST', {
                action: isCurrentlyPinned ? 'unpin' : 'pin',
                message_id: msg.id
              });
              if (res.status === 'success') {
                showToast(isCurrentlyPinned ? 'Đã bỏ ghim tin nhắn.' : 'Đã ghim tin nhắn lên đầu nhóm!', 'success');
                loadMessages(AppState.activeRoomId);
                loadRooms();
              }
            } catch (err) {
              showToast(err.message || 'Lỗi khi thao tác ghim tin nhắn', 'error');
            }
            break;
          }

          case 'select_multiple': {
            startMultiSelectMode(msg.id);
            break;
          }

          case 'recall': {
            window.EduShare.recallMessage(msg.id);
            break;
          }

          case 'delete_for_me': {
            const u = AppState.currentUser;
            try {
              await apiCall(`/api/messages/${msg.id}/delete-for-me?user_email=${encodeURIComponent(u.email || '')}`, 'DELETE');
              const targetRow = document.getElementById(`msg-row-${msg.id}`);
              if (targetRow) {
                targetRow.style.transition = 'all 0.25s ease';
                targetRow.style.opacity = '0';
                targetRow.style.transform = 'scale(0.9)';
                setTimeout(() => targetRow.remove(), 250);
              }
              showToast('Đã xóa tin nhắn ở phía bạn.', 'info');
            } catch (err) {
              showToast(err.message || 'Lỗi khi xóa tin nhắn', 'error');
            }
            break;
          }
        }
      });
    });
  }

  function startMultiSelectMode(initialMsgId) {
    isMultiSelectMode = true;
    selectedMsgIds.clear();
    if (initialMsgId) selectedMsgIds.add(initialMsgId);

    const bar = document.getElementById('chat-multiselect-bar');
    if (bar) bar.style.display = 'flex';
    updateMultiSelectUI();
  }

  function endMultiSelectMode() {
    isMultiSelectMode = false;
    selectedMsgIds.clear();
    const bar = document.getElementById('chat-multiselect-bar');
    if (bar) bar.style.display = 'none';

    document.querySelectorAll('.msg-row').forEach(row => {
      row.classList.remove('selected-for-batch');
      const cb = row.querySelector('.msg-multiselect-checkbox');
      if (cb) cb.remove();
    });
  }

  function updateMultiSelectUI() {
    const countElem = document.getElementById('multiselect-selected-count');
    if (countElem) countElem.textContent = selectedMsgIds.size;

    // Item 7: Kiểm tra các tin nhắn được chọn có chứa ảnh/file đính kèm hay không
    const selectedMsgsWithAtt = (AppState.messages || []).filter(m => selectedMsgIds.has(m.id) && m.attachment);
    const btnBatchDownload = document.getElementById('btn-multiselect-download');
    const batchCountElem = document.getElementById('multiselect-download-count');
    if (btnBatchDownload) {
      if (selectedMsgsWithAtt.length >= 2) {
        btnBatchDownload.style.display = 'inline-flex';
        if (batchCountElem) batchCountElem.textContent = selectedMsgsWithAtt.length;
      } else {
        btnBatchDownload.style.display = 'none';
      }
    }

    document.querySelectorAll('.msg-row').forEach(row => {
      const msgId = row.getAttribute('data-msg-id');
      let cb = row.querySelector('.msg-multiselect-checkbox');
      if (!cb) {
        cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'msg-multiselect-checkbox';
        cb.onchange = (e) => {
          e.stopPropagation();
          if (cb.checked) {
            selectedMsgIds.add(msgId);
            row.classList.add('selected-for-batch');
          } else {
            selectedMsgIds.delete(msgId);
            row.classList.remove('selected-for-batch');
          }
          updateMultiSelectUI();
        };
        row.insertBefore(cb, row.firstChild);
      }
      cb.checked = selectedMsgIds.has(msgId);
      row.classList.toggle('selected-for-batch', selectedMsgIds.has(msgId));
    });
  }

  // ==================== CHIA SẺ TIN NHẮN (CHUẨN EduShare PC NHƯ IMAGE 2) ====================
  let selectedShareTargets = new Set();
  let activeShareTab = 'recent';
  let shareSearchQuery = '';
  let messagesToShare = [];

  function openShareMessageModal(msgs) {
    if (!msgs) return;
    messagesToShare = Array.isArray(msgs) ? msgs : [msgs];
    selectedShareTargets.clear();
    activeShareTab = 'recent';
    shareSearchQuery = '';

    const searchInput = document.getElementById('share-search-input');
    if (searchInput) searchInput.value = '';

    const extraInput = document.getElementById('share-extra-message-input');
    if (extraInput) extraInput.value = '';

    // Render xem trước nội dung được chia sẻ
    const snippetBox = document.getElementById('share-preview-snippet');
    if (snippetBox) {
      if (messagesToShare.length === 1) {
        const m = messagesToShare[0];
        if (m.attachment) {
          const isImg = m.attachment.file_type === 'image' || (m.attachment.file_type || '').includes('image');
          snippetBox.innerHTML = `<div><strong>[${isImg ? 'Hình ảnh' : 'Tệp'}: ${escapeHtml(m.attachment.title)}]</strong> ${escapeHtml(m.text || '')}</div>`;
        } else {
          snippetBox.textContent = m.text || '(Tin nhắn)';
        }
      } else {
        snippetBox.innerHTML = `<strong>Đang chia sẻ ${messagesToShare.length} tin nhắn / tệp đã chọn</strong>`;
      }
    }

    renderShareDialog();
    openModal('modal-share-message');
  }

  function renderShareDialog() {
    const listLeft = document.getElementById('share-targets-list');
    const listRight = document.getElementById('share-selected-chips-list');
    const countElem = document.getElementById('share-selected-count');
    if (!listLeft || !listRight) return;

    if (countElem) countElem.textContent = selectedShareTargets.size;

    // Lọc danh sách theo tab và ô tìm kiếm
    let rooms = (AppState.rooms || []).filter(r => {
      if (activeShareTab === 'groups' && r.type === 'direct') return false;
      if (activeShareTab === 'friends' && r.type !== 'direct') return false;
      if (shareSearchQuery) {
        return (r.name || '').toLowerCase().includes(shareSearchQuery);
      }
      return true;
    });

    // Render cột trái (Danh sách liên hệ kèm checkbox)
    listLeft.innerHTML = '';
    if (rooms.length === 0) {
      listLeft.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:12.5px;">Không tìm thấy liên hệ phù hợp.</div>`;
    } else {
      rooms.forEach(r => {
        const isChecked = selectedShareTargets.has(r.id);
        const row = document.createElement('div');
        row.className = 'share-target-row';
        const avatarUrl = r.avatar || (r.type === 'direct' ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(r.name)}` : `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(r.name)}`);

        row.innerHTML = `
          <input type="checkbox" ${isChecked ? 'checked' : ''}>
          <img src="${avatarUrl}" alt="${r.name}" class="share-target-avatar">
          <span class="share-target-name">${escapeHtml(r.name)}</span>
        `;

        row.onclick = () => {
          if (selectedShareTargets.has(r.id)) {
            selectedShareTargets.delete(r.id);
          } else {
            selectedShareTargets.add(r.id);
          }
          renderShareDialog();
        };

        listLeft.appendChild(row);
      });
    }

    // Render cột phải (Các chip liên hệ đã chọn)
    listRight.innerHTML = '';
    const selectedRooms = (AppState.rooms || []).filter(r => selectedShareTargets.has(r.id));
    selectedRooms.forEach(r => {
      const chip = document.createElement('div');
      chip.className = 'share-chip-item';
      const avatarUrl = r.avatar || (r.type === 'direct' ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(r.name)}` : `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(r.name)}`);

      chip.innerHTML = `
        <div class="share-chip-left">
          <img src="${avatarUrl}" alt="${r.name}" class="share-chip-avatar">
          <span class="share-chip-name">${escapeHtml(r.name)}</span>
        </div>
        <button type="button" class="btn-remove-chip" title="Bỏ chọn"><i class="fa-solid fa-xmark"></i></button>
      `;

      chip.querySelector('.btn-remove-chip').onclick = (e) => {
        e.stopPropagation();
        selectedShareTargets.delete(r.id);
        renderShareDialog();
      };

      listRight.appendChild(chip);
    });
  }

  function handleMessageContextMenu(e, msg) {
    if (e.preventDefault) e.preventDefault();
    activeContextMenuMsg = msg;
    const cmenu = document.getElementById('chat-context-menu');
    if (!cmenu) return;

    const isOutgoing = msg.sender_email && msg.sender_email.toLowerCase() === (AppState.currentUser.email || '').toLowerCase();
    const hasImage = msg.attachment && (msg.attachment.file_type === 'image' || (msg.attachment.file_type || '').includes('image'));
    const hasFile = msg.attachment && !hasImage;

    const copyLabel = document.getElementById('cmenu-copy-label');
    const downloadItem = document.getElementById('cmenu-download-item');
    const downloadLabel = document.getElementById('cmenu-download-label');
    const pinLabel = document.getElementById('cmenu-pin-label');
    const recallItem = document.getElementById('cmenu-recall-item');

    if (hasImage) {
      if (copyLabel) copyLabel.textContent = 'Copy hình ảnh';
      if (downloadItem) downloadItem.style.display = 'flex';
      if (downloadLabel) downloadLabel.textContent = 'Lưu về máy';
    } else if (hasFile) {
      if (copyLabel) copyLabel.textContent = 'Copy liên kết file';
      if (downloadItem) downloadItem.style.display = 'flex';
      if (downloadLabel) downloadLabel.textContent = 'Lưu về máy';
    } else {
      if (copyLabel) copyLabel.textContent = 'Copy tin nhắn';
      if (downloadItem) downloadItem.style.display = 'none';
    }

    const isPinned = Boolean(msg.is_pinned);
    if (pinLabel) pinLabel.textContent = isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn';

    const recallDivider = document.getElementById('cmenu-recall-divider');
    const myEmail = (AppState.currentUser?.email || '').trim().toLowerCase();
    const senderEmail = (msg.sender_email || '').trim().toLowerCase();
    const isMyMessage = Boolean(myEmail && senderEmail && myEmail === senderEmail && AppState.currentUser?.role !== 'guest');
    const isRecalled = msg.is_recalled || msg.text === 'Tin nhắn đã được thu hồi';

    // XÓA NÚT THU HỒI KHI CHUỘT PHẢI VÀO TIN NHẮN CỦA USER KHÁC:
    // Tuyệt đối chỉ hiển thị nút thu hồi với tin nhắn do chính mình gửi đi (isMyMessage).
    // Nếu là tin nhắn của user khác: ẩn hoàn toàn nút thu hồi và thanh phân cách đi kèm.
    const canRecall = isMyMessage && !isRecalled;
    if (recallItem) {
      recallItem.style.setProperty('display', canRecall ? 'flex' : 'none', 'important');
    }
    if (recallDivider) {
      recallDivider.style.setProperty('display', canRecall ? 'block' : 'none', 'important');
    }

    cmenu.style.display = 'block';
    const menuWidth = cmenu.offsetWidth || 220;
    const menuHeight = cmenu.offsetHeight || 380;
    let posX = (e && typeof e.clientX === 'number') ? e.clientX : 100;
    let posY = (e && typeof e.clientY === 'number') ? e.clientY : 100;

    // Căn chỉnh nghiêm ngặt trong viewport màn hình (không trồi ra ngoài)
    posX = Math.max(8, Math.min(posX, window.innerWidth - menuWidth - 8));
    posY = Math.max(8, Math.min(posY, window.innerHeight - menuHeight - 8));

    cmenu.style.left = `${posX}px`;
    cmenu.style.top = `${posY}px`;
  }

  // ==================== HỆ THỐNG BIỂU CẢM TIN NHẮN (REACTIONS SYSTEM - chuẩn EduShare) ====================
  let activeReactionMsgId = null;
  let currentReactionMsg = null;
  let currentReactionTab = 'all';

  function showFloatingReactionBar(targetElem, msg) {
    activeReactionMsgId = msg.id;
    const bar = document.getElementById('floating-reaction-bar');
    if (!bar) return;

    const anchor = targetElem.closest('.msg-row') || targetElem.querySelector('.msg-bubble') || targetElem.querySelector('.doc-attachment-card') || targetElem;
    const rect = anchor.getBoundingClientRect();

    bar.style.position = 'fixed';
    bar.style.display = 'flex';
    const barWidth = bar.offsetWidth || 240;
    const barHeight = bar.offsetHeight || 44;

    let left = rect.left + (rect.width / 2) - (barWidth / 2);
    let top = rect.top - barHeight - 8;

    // Nếu gần mép trên cùng thì lật xuống dưới bong bóng tin nhắn
    if (top < 8) {
      top = rect.bottom + 8;
    }

    // Giới hạn nghiêm ngặt trong viewport màn hình (không trồi ra ngoài mép trên, dưới, trái, phải)
    top = Math.max(8, Math.min(top, window.innerHeight - barHeight - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - barWidth - 8));

    bar.style.left = `${left}px`;
    bar.style.top = `${top}px`;
  }

  function initReactionBarEvents() {
    const bar = document.getElementById('floating-reaction-bar');
    if (!bar) return;

    bar.querySelectorAll('.reaction-item').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const emoji = btn.getAttribute('data-emoji');
        bar.style.display = 'none';
        if (!activeReactionMsgId) return;
        await reactToMessage(activeReactionMsgId, emoji);
      });
    });

    document.addEventListener('click', (e) => {
      if (bar && !bar.contains(e.target) && !e.target.closest('.msg-quick-react-btn')) {
        bar.style.display = 'none';
      }
    });
  }

  async function reactToMessage(msgId, emoji) {
    const u = AppState.currentUser;
    if (u.role === 'guest') {
      showToast('Vui lòng đăng nhập để thả biểu cảm tin nhắn!', 'info');
      openModal('modal-auth');
      return;
    }
    try {
      const res = await apiCall(`/api/messages/${msgId}/reactions`, 'POST', {
        user_email: u.email,
        emoji: emoji
      });
      if (res && res.status === 'success') {
        const targetMsg = (AppState.messages || []).find(m => m.id === msgId);
        if (targetMsg) {
          targetMsg.reactions = res.reactions;
        }
        if (AppState.messages) {
          renderMessages(AppState.messages);
        }
        loadMessages(AppState.activeRoomId);
      }
    } catch (err) {
      console.warn('Lỗi khi thả biểu cảm:', err);
    }
  }

  async function openReactionModal(msgId) {
    let msg = (AppState.messages || []).find(m => m.id === msgId);
    if (!msg && AppState.activeRoomId) {
      const row = document.getElementById(`msg-row-${msgId}`);
      if (row) {
        msg = (AppState.messages || []).find(m => m.id === msgId);
      }
    }

    currentReactionMsg = msg || { id: msgId, reactions: [] };
    currentReactionTab = 'all';

    renderReactionModalContent();
    openModal('modal-message-reactions');

    // Luôn fetch reactions tươi mới từ database server để đảm bảo 100% hiển thị danh sách
    try {
      const res = await apiCall(`/api/messages/${msgId}/reactions`);
      if (res && res.status === 'success' && res.reactions) {
        if (msg) msg.reactions = res.reactions;
        currentReactionMsg = { id: msgId, reactions: res.reactions };
        renderReactionModalContent();
      }
    } catch (e) {
      console.warn('Fetch reactions error:', e);
    }
  }

  function renderReactionModalContent() {
    if (!currentReactionMsg) return;
    const reactions = currentReactionMsg.reactions || [];
    const tabsContainer = document.getElementById('reactions-tabs');
    const usersContainer = document.getElementById('reactions-users-list');

    const emojiMap = {};
    reactions.forEach(r => {
      emojiMap[r.emoji] = (emojiMap[r.emoji] || 0) + 1;
    });

    if (tabsContainer) {
      tabsContainer.innerHTML = '';
      
      // Tab "Tất cả" (chuẩn EduShare Hình 4)
      const allTab = document.createElement('button');
      allTab.type = 'button';
      allTab.className = `reactions-tab-item ${currentReactionTab === 'all' ? 'active' : ''}`;
      allTab.innerHTML = `<span>Tất cả</span><span class="reactions-tab-count">${reactions.length}</span>`;
      allTab.onclick = (e) => {
        e.stopPropagation();
        currentReactionTab = 'all';
        renderReactionModalContent();
      };
      tabsContainer.appendChild(allTab);

      // Các tab từng biểu cảm (😡, 👍, ❤️...)
      Object.keys(emojiMap).forEach(em => {
        const tabBtn = document.createElement('button');
        tabBtn.type = 'button';
        tabBtn.className = `reactions-tab-item ${currentReactionTab === em ? 'active' : ''}`;
        tabBtn.innerHTML = `<span>${em}</span><span class="reactions-tab-count">${emojiMap[em]}</span>`;
        tabBtn.onclick = (e) => {
          e.stopPropagation();
          currentReactionTab = em;
          renderReactionModalContent();
        };
        tabsContainer.appendChild(tabBtn);
      });
    }

    if (usersContainer) {
      usersContainer.innerHTML = '';
      const filtered = currentReactionTab === 'all' ? reactions : reactions.filter(r => r.emoji === currentReactionTab);
      if (filtered.length === 0) {
        usersContainer.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); font-size:13.5px;">Chưa có biểu cảm nào.</div>`;
      } else {
        filtered.forEach(r => {
          const item = document.createElement('div');
          item.className = 'reaction-user-row';
          
          // Kiểm tra vương miện Admin/Trưởng nhóm (chuẩn EduShare Hình 4)
          const isOwnerOrAdmin = r.user_role === 'Super Admin' || r.is_owner || 
                                (r.user_role && (r.user_role.includes('Admin') || r.user_role.includes('Trưởng'))) ||
                                r.user_email === 'hotranminhky0405@gmail.com';
          const crownBadge = isOwnerOrAdmin ? `<span class="reaction-crown-badge" title="Quản trị viên / Trưởng nhóm">👑</span>` : '';
          
          item.innerHTML = `
            <div class="reaction-user-left-info">
              <div class="reaction-avatar-wrap">
                <img src="${r.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=User'}" alt="Avatar">
                ${crownBadge}
              </div>
              <div class="reaction-user-name-text">${escapeHtml(r.user_name || r.user_email)}</div>
            </div>
            <div class="reaction-user-right-emoji">
              <span>${r.emoji}</span>
              ${emojiMap[r.emoji] > 1 ? `<span style="font-size:12.5px; color:var(--text-muted);">${emojiMap[r.emoji]}</span>` : ''}
            </div>
          `;
          usersContainer.appendChild(item);
        });
      }
    }
  }

  // ==================== TÍNH NĂNG NHẮC TÊN THÀNH VIÊN (@ MENTION AUTOCOMPLETE) ====================\n
  let activeMentionIndex = 0;
  let activeMentionList = [];

  function initMentionSystem() {
    const input = document.getElementById('chat-message-input');
    const popup = document.getElementById('chat-mention-popup');
    const listElem = document.getElementById('mention-popup-list');
    if (!input || !popup || !listElem) return;

    input.addEventListener('input', () => {
      const val = input.value;
      const cursorPos = input.selectionStart;
      const textBefore = val.slice(0, cursorPos);
      const match = textBefore.match(/@([a-zA-Z0-9À-ỹ_]*)$/);

      if (!match) {
        popup.style.display = 'none';
        return;
      }

      const query = match[1].toLowerCase();
      const room = AppState.activeRoomData;
      const members = room ? (room.members || []) : [];

      const candidates = [
        { email: 'all', name: 'All (Nhắc tất cả mọi người)', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AllGroup', roleTitle: 'Toàn bộ nhóm' },
        ...members
      ];

      activeMentionList = candidates.filter(c => {
        if (!query) return true;
        return (c.name || '').toLowerCase().includes(query) || (c.email || '').toLowerCase().includes(query);
      });

      if (activeMentionList.length === 0) {
        popup.style.display = 'none';
        return;
      }

      activeMentionIndex = 0;
      renderMentionPopup();
      popup.style.display = 'flex';
    });

    input.addEventListener('keydown', (e) => {
      if (popup.style.display !== 'none' && activeMentionList.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          activeMentionIndex = (activeMentionIndex + 1) % activeMentionList.length;
          renderMentionPopup();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          activeMentionIndex = (activeMentionIndex - 1 + activeMentionList.length) % activeMentionList.length;
          renderMentionPopup();
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          if (!e.shiftKey) {
            e.preventDefault();
            selectMention(activeMentionList[activeMentionIndex]);
          }
        } else if (e.key === 'Escape') {
          popup.style.display = 'none';
        }
      }
    });

    function renderMentionPopup() {
      listElem.innerHTML = '';
      activeMentionList.forEach((m, idx) => {
        const item = document.createElement('div');
        item.className = `mention-popup-item ${idx === activeMentionIndex ? 'active' : ''}`;
        item.innerHTML = `
          <img src="${m.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}" alt="Avatar" class="mention-popup-avatar">
          <span class="mention-popup-name">${m.email === 'all' ? '@All' : m.name}</span>
          <span class="mention-popup-sub">${m.roleTitle || ''}</span>
        `;
        item.onclick = () => selectMention(m);
        listElem.appendChild(item);
      });
    }

    function selectMention(member) {
      const val = input.value;
      const cursorPos = input.selectionStart;
      const textBefore = val.slice(0, cursorPos);
      const textAfter = val.slice(cursorPos);
      const tagText = member.email === 'all' ? '@All ' : `@${member.name} `;
      const newBefore = textBefore.replace(/@([a-zA-Z0-9À-ỹ_]*)$/, tagText);
      input.value = newBefore + textAfter;
      popup.style.display = 'none';
      input.focus();
      const newCursor = newBefore.length;
      input.setSelectionRange(newCursor, newCursor);
    }
  }

  // ==================== CHIA SẺ TIN NHẮN (SHARE MESSAGE MODAL) ====================
  let activeShareMessage = null;

  function openShareModal(msgOrPostId) {
    if (typeof msgOrPostId === 'string') {
      openSharePostModal(msgOrPostId);
      return;
    }
    openShareMessageModal(msgOrPostId);
  }

  function initShareConfirm() {
    // Tìm kiếm trong modal chia sẻ
    document.getElementById('share-search-input')?.addEventListener('input', (e) => {
      shareSearchQuery = e.target.value.trim().toLowerCase();
      renderShareDialog();
    });

    // Các tab: Gần đây / Nhóm / Bạn bè
    document.querySelectorAll('.share-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.share-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeShareTab = btn.getAttribute('data-share-tab');
        renderShareDialog();
      });
    });

    // Xóa tất cả đã chọn
    document.getElementById('btn-share-clear-all')?.addEventListener('click', () => {
      selectedShareTargets.clear();
      renderShareDialog();
    });

    // Nút xác nhận Chia sẻ tới tất cả các liên hệ đã tích chọn
    document.getElementById('btn-confirm-share-message')?.addEventListener('click', async () => {
      if (selectedShareTargets.size === 0) {
        showToast('Vui lòng chọn ít nhất 1 người nhận để chia sẻ!', 'warning');
        return;
      }
      if (messagesToShare.length === 0) return;

      const extraText = document.getElementById('share-extra-message-input')?.value.trim() || '';
      const u = AppState.currentUser;
      const targetRoomIds = Array.from(selectedShareTargets);

      try {
        for (const targetId of targetRoomIds) {
          for (const msg of messagesToShare) {
            const payload = {
              room_id: targetId,
              sender_email: u.email,
              sender_name: u.name,
              sender_role: u.roleTitle || 'Thành viên',
              sender_avatar: u.avatar,
              text: msg.text || '',
              attachment: msg.attachment || null
            };
            await apiCall(`/api/rooms/${targetId}/messages`, 'POST', payload);
          }
          if (extraText) {
            await apiCall(`/api/rooms/${targetId}/messages`, 'POST', {
              room_id: targetId,
              sender_email: u.email,
              sender_name: u.name,
              sender_role: u.roleTitle || 'Thành viên',
              sender_avatar: u.avatar,
              text: extraText
            });
          }
        }

        closeModal('modal-share-message');
        showToast(`Đã chia sẻ thành công tới ${targetRoomIds.length} cuộc trò chuyện!`, 'success');
        if (targetRoomIds.includes(AppState.activeRoomId)) {
          loadMessages(AppState.activeRoomId);
        }
      } catch (err) {
        showToast(err.message || 'Lỗi khi chia sẻ tin nhắn.', 'error');
      }
    });
  }

  // ==================== BẠN BÈ & CHAT RIÊNG 1-1 (FRIENDSHIP & DIRECT CHAT) ====================
  async function openUserProfile(email) {
    const u = AppState.currentUser;
    if (!email) return;

    try {
      const res = await apiCall(`/api/users/find?email=${encodeURIComponent(email)}&current_user=${encodeURIComponent(u.email || '')}`);
      const avatarElem = document.getElementById('upv-avatar');
      const nameElem = document.getElementById('upv-name');
      const roleElem = document.getElementById('upv-role-title');
      const emailElem = document.getElementById('upv-email');
      const subElem = document.getElementById('upv-sub-info');
      const actionsBox = document.getElementById('upv-actions-box');

      if (avatarElem) avatarElem.src = res.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.email}`;
      if (nameElem) nameElem.textContent = res.name;
      if (roleElem) roleElem.textContent = res.role_title || 'Thành viên học tập';
      if (emailElem) emailElem.textContent = res.email;
      if (subElem) subElem.textContent = res.sub_info || 'Chưa cập nhật thông tin lớp học';

      if (actionsBox) {
        actionsBox.innerHTML = '';
        if (res.friendship_status === 'self') {
          actionsBox.innerHTML = `<span style="background:var(--bg-hover); color:var(--text-muted); padding:6px 16px; border-radius:20px; font-size:13px;"><i class="fa-solid fa-user-check"></i> Đây là tài khoản của bạn</span>`;
        } else if (res.friendship_status === 'accepted') {
          actionsBox.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:8px;">
              <span style="color:#10b981; font-weight:600; font-size:13px;"><i class="fa-solid fa-check-circle"></i> Hai bạn đang là bạn bè</span>
              <button type="button" class="btn-primary-edushare btn-block" onclick="window.EduShare.startDirectChat('${res.email}', '${res.name}')">
                <i class="fa-solid fa-comment-dots"></i> Nhắn Tin Riêng
              </button>
            </div>
          `;
        } else if (res.friendship_status === 'pending_sent') {
          actionsBox.innerHTML = `<span style="color:#f59e0b; font-size:13px; font-weight:600;"><i class="fa-solid fa-clock"></i> Đã gửi lời mời kết bạn (Chờ đối phương đồng ý)</span>`;
        } else if (res.friendship_status === 'pending_received') {
          actionsBox.innerHTML = `
            <div style="display:flex; gap:10px; justify-content:center;">
              <button type="button" class="btn-primary-small" style="background:#10b981; color:#fff;" onclick="window.EduShare.respondFriend('${res.email}', 'accept')">
                <i class="fa-solid fa-check"></i> Đồng Ý Kết Bạn
              </button>
              <button type="button" class="btn-primary-small" style="background:#ef4444; color:#fff;" onclick="window.EduShare.respondFriend('${res.email}', 'reject')">
                <i class="fa-solid fa-xmark"></i> Từ Chối
              </button>
            </div>
          `;
        } else if (res.friendship_status === 'blocked') {
          actionsBox.innerHTML = `<span style="color:#ef4444; font-size:13px;"><i class="fa-solid fa-ban"></i> Bạn đã chặn người dùng này</span>`;
        } else {
          actionsBox.innerHTML = `
            <button type="button" class="btn-primary-edushare btn-block" onclick="window.EduShare.sendFriendRequest('${res.email}')">
              <i class="fa-solid fa-user-plus"></i> Gửi Lời Mời Kết Bạn
            </button>
          `;
        }
      }

      openModal('modal-user-profile-view');
    } catch (err) {
      showToast(err.message || 'Không thể tải thông tin người dùng.', 'error');
    }
  }

  async function startDirectChat(targetEmail, targetName) {
    const u = AppState.currentUser;
    if (u.role === 'guest') {
      showToast('Vui lòng đăng nhập để trò chuyện riêng!', 'info');
      openModal('modal-auth');
      return;
    }

    try {
      // showToast('Đang kết nối...', 'info');
      const res = await apiCall('/api/direct-chat/open', 'POST', {
        user_email: u.email,
        target_email: targetEmail
      });

      if (res && res.room_id) {
        closeModal('modal-add-friend');
        closeModal('modal-user-profile-view');
        switchMainTab('chat');
        await loadRooms();
        switchRoom(res.room_id);
        // showToast(opened direct chat);
      }
    } catch (err) {
      showToast(err.message || 'Chỉ bạn bè mới có thể nhắn tin riêng. Hãy kết bạn trước!', 'error');
    }
  }

  async function blockDirectUser(targetEmail) {
    const u = AppState.currentUser;
    if (!targetEmail) return;
    if (confirm(`Bạn có chắc chắn muốn CHẶN người dùng ${targetEmail}?\nSau khi chặn, người này sẽ không thể gửi tin nhắn cho bạn nữa.`)) {
      try {
        const res = await apiCall('/api/direct-chat/block', 'POST', {
          user_email: u.email,
          target_email: targetEmail
        });
        showToast(res.message || 'Đã chặn người dùng.', 'success');
        await loadRooms();
        if (AppState.activeRoomData) {
          AppState.activeRoomData.is_blocked = true;
          AppState.activeRoomData.blocked_by = u.email;
        }
        checkComposerPermissions(AppState.activeRoomData);
        renderGroupInfoDrawer(AppState.activeRoomData);
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  }

  async function unblockDirectUser(targetEmail) {
    const u = AppState.currentUser;
    if (!targetEmail) return;
    try {
      const res = await apiCall('/api/direct-chat/unblock', 'POST', {
        user_email: u.email,
        target_email: targetEmail
      });
      showToast(res.message || 'Đã bỏ chặn người dùng thành công!', 'success');
      await loadRooms();
      if (AppState.activeRoomData) {
        AppState.activeRoomData.is_blocked = false;
        AppState.activeRoomData.blocked_by = null;
      }
      checkComposerPermissions(AppState.activeRoomData);
      renderGroupInfoDrawer(AppState.activeRoomData);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function clearDirectChat(roomId) {
    const u = AppState.currentUser;
    if (confirm('Bạn có chắc chắn muốn XÓA TOÀN BỘ ĐOẠN CHAT này không?\nDữ liệu tin nhắn sẽ bị xóa vĩnh viễn.')) {
      try {
        await apiCall(`/api/direct-chat/${roomId}/clear?user_email=${encodeURIComponent(u.email)}`, 'DELETE');
        showToast('Đã xóa toàn bộ lịch sử trò chuyện.', 'success');
        loadMessages(roomId);
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  }

  // ==================== DRAWER THÔNG TIN NHÓM & MỤC RIÊNG CHI TIẾT (CHUẨN EduShare PC) ====================
  let activeDetailType = null;

  function renderGroupInfoDrawer(room) {
    if (!room) room = AppState.activeRoomData;
    if (!room) return;

    const viewMain = document.getElementById('drawer-view-main');
    const viewDetail = document.getElementById('drawer-view-detail');
    if (viewMain && viewDetail && !activeDetailType) {
      viewMain.style.display = 'flex';
      viewDetail.style.display = 'none';
    }

    const drawerMainTitle = document.getElementById('drawer-main-title');
    const drawerName = document.getElementById('drawer-group-name');
    const drawerType = document.getElementById('drawer-group-type');
    const drawerCode = document.getElementById('drawer-access-code');
    const membersCount = document.getElementById('drawer-members-count');
    const adminSection = document.getElementById('drawer-admin-section');
    const toggleAdminChat = document.getElementById('toggle-admin-only-chat');
    const toggleApproval = document.getElementById('toggle-require-approval');
    const pendingSection = document.getElementById('drawer-pending-section');
    const pendingCount = document.getElementById('drawer-pending-count');
    const pendingList = document.getElementById('drawer-pending-list');
    const btnRename = document.getElementById('btn-drawer-rename-group');
    const heroAvatar = document.getElementById('drawer-hero-avatar');

    const isCommunity = room.id === 'room_community' || room.type === 'community';
    const isDirect = room.type === 'direct';

    if (drawerMainTitle) drawerMainTitle.textContent = isDirect ? 'Thông tin hội thoại' : (isCommunity ? 'Thông tin hội thoại' : 'Thông tin nhóm');
    if (drawerName) drawerName.textContent = room.name;
    if (drawerType) drawerType.textContent = isDirect ? 'Trò chuyện cá nhân 1-1' : (isCommunity ? 'Cộng đồng chính thức' : `Nhóm chuyên đề [${room.subject || 'Học tập'}]`);
    if (drawerCode) drawerCode.textContent = room.code;
    if (membersCount) membersCount.textContent = (room.members || []).length;

    if (heroAvatar) {
      if (isDirect && room.avatar) {
        heroAvatar.innerHTML = `<img src="${room.avatar}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
      } else {
        heroAvatar.innerHTML = `<i class="${isCommunity ? 'fa-solid fa-users' : 'fa-solid fa-book-open'}"></i>`;
      }
    }

    const u = AppState.currentUser;
    const myMemberObj = (room.members || []).find(m => m.email && m.email.toLowerCase() === (u.email || '').toLowerCase());
    const myRole = (myMemberObj ? myMemberObj.role : room.user_role) || 'member';
    const isLeader = myRole === 'leader' || (room.owner_email && room.owner_email.toLowerCase() === (u.email || '').toLowerCase());
    const isColeader = myRole === 'coleader';
    const isLeaderOrCo = isLeader || isColeader;

    const drawerCodeBox = document.getElementById('drawer-code-section');
    if (drawerCodeBox) {
      drawerCodeBox.style.display = (!isDirect && !isCommunity) ? 'flex' : 'none';
    }

    if (btnRename) {
      btnRename.style.display = isLeader && !isCommunity && !isDirect ? 'inline-flex' : 'none';
      btnRename.onclick = async () => {
        const newName = prompt('Nhập tên mới cho nhóm học tập:', room.name);
        if (newName && newName.trim() && newName.trim() !== room.name) {
          try {
            await apiCall(`/api/rooms/${room.id}/settings`, 'PUT', {
              user_email: u.email,
              name: newName.trim()
            });
            showToast('Đã đổi tên nhóm thành công!', 'success');
            room.name = newName.trim();
            if (drawerName) drawerName.textContent = newName.trim();
            const chatTitle = document.getElementById('chat-title');
            if (chatTitle) chatTitle.textContent = newName.trim();
            loadRooms();
          } catch (err) {
            showToast(err.message || 'Lỗi khi đổi tên nhóm', 'error');
          }
        }
      };
    }

    // Nút Bật/Tắt thông báo
    const btnMute = document.getElementById('btn-drawer-toggle-mute');
    const iconMute = document.getElementById('icon-drawer-mute');
    const labelMute = document.getElementById('label-drawer-mute');
    if (btnMute) {
      let mutedRooms = [];
      try {
        mutedRooms = JSON.parse(localStorage.getItem('edushare_muted_rooms') || '[]');
      } catch (_) {}
      const isMuted = mutedRooms.includes(room.id);
      if (iconMute) iconMute.className = isMuted ? 'fa-solid fa-bell' : 'fa-solid fa-bell-slash';
      if (labelMute) labelMute.textContent = isMuted ? 'Bật thông báo' : 'Tắt thông báo';
      btnMute.classList.toggle('active', isMuted);
      btnMute.onclick = () => {
        let currentMuted = [];
        try {
          currentMuted = JSON.parse(localStorage.getItem('edushare_muted_rooms') || '[]');
        } catch (_) {}
        if (currentMuted.includes(room.id)) {
          currentMuted = currentMuted.filter(id => id !== room.id);
          showToast(`Đã bật lại thông báo cho '${room.name}'.`, 'info');
        } else {
          currentMuted.push(room.id);
          showToast(`Đã tắt thông báo cho '${room.name}'.`, 'info');
        }
        localStorage.setItem('edushare_muted_rooms', JSON.stringify(currentMuted));
        renderGroupInfoDrawer(room);
      };
    }

    // Nút Ghim hội thoại lên đầu danh sách
    const btnPin = document.getElementById('btn-drawer-toggle-pin');
    if (btnPin) {
      updateDrawerPinButton(room.id);
      btnPin.onclick = () => toggleRoomPinned(room.id);
    }

    const btnCreateDirect = document.getElementById('btn-drawer-create-group-direct');
    const labelCreateDirect = document.getElementById('label-drawer-create-group-direct');
    if (btnCreateDirect) {
      if (isDirect) {
        const myEmail = (AppState.currentUser.email || '').toLowerCase();
        const otherMember = (room.members || []).find(m => (m.email || '').toLowerCase() !== myEmail);
        if (labelCreateDirect) labelCreateDirect.textContent = `Tạo nhóm cùng ${otherMember ? otherMember.name : 'bạn bè'}`;
        btnCreateDirect.onclick = () => {
          openCreateGroupWithFriend(otherMember ? { email: otherMember.email, name: otherMember.name || room.name } : null);
        };
      }
    }

    const btnAddMember = document.getElementById('btn-drawer-add-member');
    if (btnAddMember) {
      const labelAdd = btnAddMember.querySelector('.drawer-quick-label');
      const iconAdd = btnAddMember.querySelector('i');
      if (isDirect) {
        if (labelAdd) labelAdd.textContent = 'Tạo nhóm';
        if (iconAdd) iconAdd.className = 'fa-solid fa-user-group';
        btnAddMember.onclick = () => {
          const myEmail = (AppState.currentUser.email || '').toLowerCase();
          const otherMember = (room.members || []).find(m => (m.email || '').toLowerCase() !== myEmail);
          openCreateGroupWithFriend(otherMember ? { email: otherMember.email, name: otherMember.name || room.name } : null);
        };
      } else {
        if (labelAdd) labelAdd.textContent = 'Thêm t.viên';
        if (iconAdd) iconAdd.className = 'fa-solid fa-user-plus';
        btnAddMember.onclick = () => {
          if (isCommunity) {
            showToast('Nhóm cộng đồng chung toàn trường mở tự do cho tất cả thành viên.', 'info');
            return;
          }
          copyTextToClipboard(room.code, `Đã sao chép mã nhóm 16 ký tự: ${room.code}. Hãy gửi mã này cho bạn bè!`);
        };
      }
    }

    const btnSettings = document.getElementById('btn-drawer-group-settings');
    if (btnSettings) {
      btnSettings.style.display = isDirect ? 'none' : 'flex';
      btnSettings.onclick = () => {
        if (!isLeader) {
          showToast('Chỉ duy nhất Trưởng nhóm mới có quyền điều chỉnh cài đặt quản lý nhóm.', 'warning');
          return;
        }
        if (adminSection) {
          adminSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          adminSection.style.borderColor = 'var(--accent-primary)';
          setTimeout(() => {
            adminSection.style.borderColor = 'var(--border-color)';
          }, 1500);
        }
      };
    }

    // ĐỀ MỤC 1: THÀNH VIÊN NHÓM (Ẩn khi ở phòng chat 1-1)
    const membersSection = document.getElementById('drawer-members-section');
    if (membersSection) {
      membersSection.style.display = isDirect ? 'none' : 'block';
    }
    const btnOpenMembers = document.getElementById('btn-drawer-open-members');
    if (btnOpenMembers) {
      btnOpenMembers.onclick = () => {
        openDrawerDetail('members', room);
      };
    }

    // ĐỀ MỤC 2: BẢNG TIN NHÓM - QUY TẮC CỐT LÕI: CHỈ DIỄN ĐÀN CHUNG (room_community) MỚI CÓ BẢNG TIN!
    const boardSection = document.getElementById('drawer-board-section');
    if (boardSection) {
      boardSection.style.display = isCommunity ? 'block' : 'none';
    }
    const itemSchedule = document.getElementById('drawer-item-schedule');
    if (itemSchedule) {
      itemSchedule.onclick = () => {
        showToast('Tính năng Lịch thi & Nhắc hẹn đang đồng bộ với Bảng tin Diễn đàn.', 'info');
      };
    }
    const itemNotes = document.getElementById('drawer-item-notes');
    if (itemNotes) {
      itemNotes.onclick = () => {
        const forumShortcut = document.getElementById('btn-switch-to-forum-shortcut');
        if (forumShortcut) forumShortcut.click();
      };
    }

    // ĐỀ MỤC 3: ẢNH/VIDEO (Preview 8 ảnh)
    const mediaGrid = document.getElementById('drawer-media-grid');
    const viewAllMedia = document.getElementById('btn-drawer-view-all-media');
    const allImages = (AppState.messages || [])
      .filter(m => !m.is_recalled && m.attachment && (m.attachment.file_type === 'image' || (m.attachment.file_type || '').includes('image')) && m.attachment.file_base64)
      .map(m => m.attachment);

    if (mediaGrid) {
      mediaGrid.innerHTML = '';
      if (allImages.length === 0) {
        mediaGrid.innerHTML = `<div style="grid-column: span 4; font-size:12px; color:var(--text-muted); text-align:center; padding:10px 0;">Chưa có ảnh/video nào được chia sẻ.</div>`;
      } else {
        const previewImgs = allImages.slice(0, 8);
        previewImgs.forEach(img => {
          const thumb = document.createElement('div');
          thumb.className = 'drawer-media-thumb';
          thumb.title = img.title || 'Ảnh chia sẻ';
          thumb.innerHTML = `<img src="${img.file_base64}" alt="${img.title || 'Media'}">`;
          thumb.onclick = () => {
            window.EduShare.previewDoc(img.title || 'Hình ảnh', 'image', img.file_size || 'Ảnh', img.file_base64);
          };
          mediaGrid.appendChild(thumb);
        });
      }
    }
    if (viewAllMedia) {
      viewAllMedia.onclick = () => openDrawerDetail('media', room);
    }

    // ĐỀ MỤC 4: FILE TÀI LIỆU
    const filesList = document.getElementById('drawer-files-list');
    const viewAllFiles = document.getElementById('btn-drawer-view-all-files');
    const msgFiles = (AppState.messages || [])
      .filter(m => !m.is_recalled && m.attachment && m.attachment.title && m.attachment.file_type !== 'image')
      .map(m => m.attachment);

    const docFiles = (AppState.documents || [])
      .filter(d => (d.room_id === room.id || (isCommunity && !d.room_id)) && d.file_type !== 'image')
      .map(d => ({
        doc_id: d.doc_id,
        title: d.title,
        file_type: d.file_type,
        file_size: d.file_size || '1.5 MB'
      }));

    const allFilesMap = new Map();
    [...msgFiles, ...docFiles].forEach(f => {
      if (!allFilesMap.has(f.title)) allFilesMap.set(f.title, f);
    });
    const allFiles = Array.from(allFilesMap.values());

    if (filesList) {
      filesList.innerHTML = '';
      if (allFiles.length === 0) {
        filesList.innerHTML = `<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:10px 0;">Chưa có tài liệu nào trong cuộc trò chuyện này.</div>`;
      } else {
        const previewFiles = allFiles.slice(0, 3);
        previewFiles.forEach(f => {
          const ext = (f.file_type || 'file').toLowerCase();
          const badgeClass = ['pdf', 'xlsx', 'xls', 'docx', 'doc', 'pptx', 'ppt', 'zip', 'rar'].includes(ext) ? ext : 'other';
          const badgeLabel = ext === 'xlsx' || ext === 'xls' ? 'XLS' : (ext === 'docx' || ext === 'doc' ? 'DOC' : (ext === 'pptx' || ext === 'ppt' ? 'PPT' : ext.toUpperCase().slice(0, 4)));

          const item = document.createElement('div');
          item.className = 'drawer-file-item';
          item.innerHTML = `
            <div class="file-badge-square ${badgeClass}">${badgeLabel}</div>
            <div class="drawer-member-info" style="flex:1; min-width:0;">
              <div class="drawer-member-name" title="${f.title}" style="font-size:12.5px;">${f.title}</div>
              <small style="color:var(--text-muted); font-size:11px;">${f.file_size || '1.5 MB'} • 60 ngày</small>
            </div>
            <div class="drawer-member-actions">
              <button class="btn-member-action" title="Xem trước" onclick="window.EduShare.previewDoc('${f.title}', '${f.file_type}', '${f.file_size}', '')">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button class="btn-member-action" title="Tải về máy" onclick="window.EduShare.downloadDoc('${f.doc_id}', '${f.title}')">
                <i class="fa-solid fa-download"></i>
              </button>
            </div>
          `;
          filesList.appendChild(item);
        });
      }
    }
    if (viewAllFiles) {
      viewAllFiles.onclick = () => openDrawerDetail('files', room);
    }

    // ĐỀ MỤC 5: LINK LIÊN KẾT
    const linksList = document.getElementById('drawer-links-list');
    const viewAllLinks = document.getElementById('btn-drawer-view-all-links');
    const allLinks = extractLinksFromMessages(AppState.messages || []);

    if (linksList) {
      linksList.innerHTML = '';
      if (allLinks.length === 0) {
        linksList.innerHTML = `<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:10px 0;">Chưa có liên kết web nào trong cuộc trò chuyện này.</div>`;
      } else {
        const previewLinks = allLinks.slice(0, 3);
        previewLinks.forEach(l => {
          const item = document.createElement('div');
          item.className = 'drawer-link-item';
          item.innerHTML = `
            <div class="drawer-link-icon"><i class="fa-solid fa-globe"></i></div>
            <div class="drawer-link-info">
              <a href="${l.href}" target="_blank" rel="noopener noreferrer" class="drawer-link-url" title="${l.url}">
                ${l.domain || l.url}
              </a>
              <div class="drawer-link-sender">${l.sender_name} • ${formatMsgTime(l.created_at)}</div>
            </div>
            <button class="btn-member-action" title="Sao chép liên kết" onclick="window.EduShare.copyLink('${l.href}')">
              <i class="fa-regular fa-copy"></i>
            </button>
          `;
          linksList.appendChild(item);
        });
      }
    }
    if (viewAllLinks) {
      viewAllLinks.onclick = () => openDrawerDetail('links', room);
    }

    if (activeDetailType && viewDetail && viewDetail.style.display !== 'none') {
      openDrawerDetail(activeDetailType, room);
    }

    // Mã nhóm (Ẩn khi ở Diễn đàn chung hoặc Direct chat)
    const copyDrawerBtn = document.getElementById('btn-copy-drawer-code');
    const codeSection = document.getElementById('drawer-code-section');
    if (codeSection) {
      codeSection.style.display = (isCommunity || isDirect) ? 'none' : 'flex';
    }
    if (copyDrawerBtn) {
      copyDrawerBtn.onclick = () => {
        copyTextToClipboard(room.code, `Đã sao chép mã nhóm 16 ký tự: ${room.code}`);
        copyDrawerBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => {
          copyDrawerBtn.innerHTML = '<i class="fa-solid fa-copy"></i>';
        }, 1500);
      };
    }

    // Cài đặt quản trị nhóm (Ẩn khi ở Direct chat)
    if (adminSection) {
      // Chỉ duy nhất Trưởng nhóm mới thấy mục Cài Đặt Nhóm (và nút Xóa Nhóm)
      adminSection.style.display = (!isDirect && isLeader) ? 'flex' : 'none';
    }
    const boxAdminDelete = document.getElementById('box-admin-delete-room');
    if (boxAdminDelete) {
      boxAdminDelete.style.display = (!isCommunity && isLeader) ? 'block' : 'none';
    }

    if (toggleAdminChat) {
      toggleAdminChat.checked = Boolean(room.admin_only_chat);
      toggleAdminChat.onchange = async () => {
        try {
          await apiCall(`/api/rooms/${room.id}/settings`, 'PUT', {
            user_email: u.email,
            admin_only_chat: toggleAdminChat.checked
          });
          showToast(`Đã ${toggleAdminChat.checked ? 'bật' : 'tắt'} chế độ chỉ Trưởng/Phó gửi bài.`, 'success');
          loadRooms();
        } catch (err) {
          showToast(err.message, 'error');
          toggleAdminChat.checked = !toggleAdminChat.checked;
        }
      };
    }

    if (toggleApproval) {
      toggleApproval.checked = Boolean(room.require_approval);
      toggleApproval.onchange = async () => {
        try {
          await apiCall(`/api/rooms/${room.id}/settings`, 'PUT', {
            user_email: u.email,
            require_approval: toggleApproval.checked
          });
          showToast(`Đã ${toggleApproval.checked ? 'bật' : 'tắt'} yêu cầu phê duyệt thành viên.`, 'success');
          loadRooms();
        } catch (err) {
          showToast(err.message, 'error');
          toggleApproval.checked = !toggleApproval.checked;
        }
      };
    }

    // Yêu cầu chờ phê duyệt
    const pending = room.pending || [];
    if (pendingSection && pendingCount && pendingList) {
      if (!isDirect && isLeaderOrCo && pending.length > 0) {
        pendingSection.style.display = 'flex';
        pendingCount.textContent = pending.length;
        pendingList.innerHTML = '';
        pending.forEach(email => {
          const item = document.createElement('div');
          item.className = 'drawer-member-card';
          item.innerHTML = `
            <div class="drawer-member-info">
              <div class="drawer-member-name">${email}</div>
              <small style="color:var(--text-muted);">Đang xin gia nhập</small>
            </div>
            <div class="drawer-member-actions">
              <button class="btn-member-action" style="background:#10b981; color:#fff;" onclick="window.EduShare.manageMember('approve', '${email}')">
                <i class="fa-solid fa-check"></i> Duyệt
              </button>
              <button class="btn-member-action" style="background:#ef4444; color:#fff;" onclick="window.EduShare.manageMember('reject', '${email}')">
                <i class="fa-solid fa-xmark"></i> Hủy
              </button>
            </div>
          `;
          pendingList.appendChild(item);
        });
      } else {
        pendingSection.style.display = 'none';
      }
    }

    // Nút hành động chân Drawer:
    const groupActionsBox = document.getElementById('drawer-group-actions-box');
    const directActionsBox = document.getElementById('drawer-direct-actions-box');
    const btnBlockUser = document.getElementById('btn-drawer-block-user');
    const labelBlock = document.getElementById('label-drawer-block');
    const btnClearChat = document.getElementById('btn-drawer-clear-chat');

    if (isDirect) {
      if (groupActionsBox) groupActionsBox.style.display = 'none';
      if (directActionsBox) directActionsBox.style.display = 'block';

      if (btnBlockUser) {
        if (room.is_blocked) {
          const isBlocker = (room.blocked_by || '').toLowerCase() === (u.email || '').toLowerCase();
          if (labelBlock) labelBlock.textContent = isBlocker ? 'Bỏ chặn người này' : 'Bạn đã bị chặn';
          btnBlockUser.onclick = isBlocker ? () => unblockDirectUser(room.other_user_email) : null;
        } else {
          if (labelBlock) labelBlock.textContent = 'Chặn cuộc trò chuyện';
          btnBlockUser.onclick = () => blockDirectUser(room.other_user_email);
        }
      }

      if (btnClearChat) {
        btnClearChat.onclick = () => clearDirectChat(room.id);
      }
    } else {
      if (groupActionsBox) groupActionsBox.style.display = 'block';
      if (directActionsBox) directActionsBox.style.display = 'none';

      const leaveBtn = document.getElementById('btn-leave-group');
      if (leaveBtn) {
        // Chỉ thành viên hoặc phó nhóm thấy nút Rời nhóm (trưởng nhóm không rời mà phải xóa nhóm)
        leaveBtn.style.display = (!isCommunity && !isLeader) ? 'block' : 'none';
        leaveBtn.onclick = async () => {
          if (confirm(`Bạn có chắc chắn muốn rời nhóm '${room.name}'?`)) {
            try {
              await apiCall(`/api/rooms/${room.id}/leave?user_email=${encodeURIComponent(u.email)}`, 'POST');
              showToast('Đã rời khỏi nhóm học tập.', 'info');
              loadRooms();
              switchRoom('room_community');
            } catch (err) {
              showToast(err.message, 'error');
            }
          }
        };
      }

      const deleteForeverBtn = document.getElementById('btn-delete-group-forever');
      if (deleteForeverBtn) {
        const canDelete = !isCommunity && isLeader;
        deleteForeverBtn.style.display = canDelete ? 'flex' : 'none';
        deleteForeverBtn.onclick = canDelete ? async () => {
          const confirmMsg = `CẢNH BÁO NGUY HIỂM TỐI CAO:\nBạn có chắc chắn muốn XÓA VĨNH VIỄN nhóm '${room.name}'?\n\nToàn bộ dữ liệu tin nhắn, bài tập, thảo luận và tài liệu trong nhóm sẽ bị xóa sạch hoàn toàn khỏi Server và đồng bộ dọn sạch trên Google Drive, không thể khôi phục!`;
          if (confirm(confirmMsg)) {
            try {
              const res = await apiCall(`/api/rooms/${room.id}?user_email=${encodeURIComponent(u.email)}`, 'DELETE');
              showToast(res.message || `Đã xóa vĩnh viễn nhóm '${room.name}'!`, 'success');
              const drawer = document.getElementById('chat-info-drawer');
              if (drawer) drawer.classList.add('hidden');
              await loadRooms();
              switchRoom('room_community');
            } catch (err) {
              showToast(err.message || 'Lỗi khi xóa nhóm vĩnh viễn.', 'error');
            }
          }
        } : null;
      }
    }
  }

  // ==================== MỤC RIÊNG CHI TIẾT (DEDICATED FULL VIEW TRONG DRAWER) ====================
  function openDrawerDetail(type, room, filterText = '') {
    if (!room) room = AppState.activeRoomData;
    if (!room) return;

    activeDetailType = type;
    const viewMain = document.getElementById('drawer-view-main');
    const viewDetail = document.getElementById('drawer-view-detail');
    const detailTitle = document.getElementById('drawer-detail-title');
    const detailBody = document.getElementById('drawer-detail-body');
    const searchInput = document.getElementById('input-drawer-detail-search');
    const btnBack = document.getElementById('btn-drawer-back-to-main');
    const btnClose = document.getElementById('btn-close-drawer-detail');
    const btnExpand = document.getElementById('btn-drawer-expand-modal');

    if (viewMain) viewMain.style.display = 'none';
    if (viewDetail) viewDetail.style.display = 'flex';

    if (btnBack) {
      btnBack.onclick = () => closeDrawerDetail();
    }
    if (btnClose) {
      btnClose.onclick = () => {
        closeDrawerDetail();
        document.getElementById('chat-info-drawer')?.classList.add('hidden');
      };
    }
    if (btnExpand) {
      btnExpand.onclick = () => openRepoModal(type, room);
    }

    if (searchInput) {
      searchInput.oninput = (e) => {
        openDrawerDetail(type, room, e.target.value.trim().toLowerCase());
      };
    }

    const u = AppState.currentUser;
    const myMemberObj = (room.members || []).find(m => m.email && m.email.toLowerCase() === (u.email || '').toLowerCase());
    const myRole = (myMemberObj ? myMemberObj.role : room.user_role) || 'member';
    const isLeader = myRole === 'leader' || (room.owner_email && room.owner_email.toLowerCase() === (u.email || '').toLowerCase());
    const isColeader = myRole === 'coleader';
    const filter = (filterText || '').toLowerCase();

    if (type === 'members') {
      const members = room.members || [];
      const filtered = members.filter(m => {
        if (!filter) return true;
        return (m.name || '').toLowerCase().includes(filter) || (m.email || '').toLowerCase().includes(filter);
      });

      if (detailTitle) detailTitle.textContent = `Thành viên (${members.length})`;
      if (detailBody) {
        detailBody.innerHTML = '';
        if (filtered.length === 0) {
          detailBody.innerHTML = `<div style="font-size:12.5px; color:var(--text-muted); text-align:center; padding:24px 0;">Không tìm thấy thành viên phù hợp.</div>`;
        } else {
          filtered.forEach(m => {
            const isSelf = m.email && m.email.toLowerCase() === (u.email || '').toLowerCase();
            const roleLabel = m.role === 'leader' ? 'Trưởng nhóm' : (m.role === 'coleader' ? 'Phó nhóm' : 'Thành viên');
            const roleClass = m.role === 'leader' ? 'leader' : (m.role === 'coleader' ? 'coleader' : 'member');
            const displayName = m.name || m.email;
            const avatarUrl = m.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.email)}`;

            const card = document.createElement('div');
            card.className = 'drawer-member-card';

            let actionBtns = '';
            // Phân quyền chặt chẽ: Thành viên bình thường KHÔNG THẤY bất kỳ nút quản lý nào
            if (u.role !== 'guest' && !isSelf && m.role !== 'leader') {
              if (isLeader) {
                if (m.role === 'member') {
                  actionBtns += `<button class="btn-member-action" title="Bổ nhiệm làm Phó nhóm" onclick="window.EduShare.manageMember('promote', '${m.email}')"><i class="fa-solid fa-arrow-up"></i></button>`;
                } else if (m.role === 'coleader') {
                  actionBtns += `<button class="btn-member-action" title="Hạ cấp về Thành viên" onclick="window.EduShare.manageMember('demote', '${m.email}')"><i class="fa-solid fa-arrow-down"></i></button>`;
                }
                actionBtns += `<button class="btn-member-action" style="color:#ef4444;" title="Mời ra khỏi nhóm" onclick="window.EduShare.manageMember('kick', '${m.email}')"><i class="fa-solid fa-user-xmark"></i></button>`;
              } else if (isColeader && m.role === 'member') {
                // Phó nhóm chỉ được phép xóa Thành viên thông thường
                actionBtns += `<button class="btn-member-action" style="color:#ef4444;" title="Mời ra khỏi nhóm" onclick="window.EduShare.manageMember('kick', '${m.email}')"><i class="fa-solid fa-user-xmark"></i></button>`;
              }
            }

            card.innerHTML = `
              <img src="${avatarUrl}" alt="${displayName}" class="drawer-member-avatar" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid var(--border-color);">
              <div class="drawer-member-info" style="flex:1; min-width:0;">
                <div class="drawer-member-name" style="font-weight:600; font-size:13px; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${displayName} ${isSelf ? '<span class="self-badge">(Bạn)</span>' : ''}
                </div>
                <div style="font-size:11px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.email}</div>
                <span class="role-badge-chip ${roleClass}" style="margin-top:3px;">${roleLabel}</span>
              </div>
              <div class="drawer-member-actions">
                ${actionBtns}
              </div>
            `;
            detailBody.appendChild(card);
          });
        }
      }
    } else if (type === 'media') {
      const allImages = (AppState.messages || [])
        .filter(m => !m.is_recalled && m.attachment && (m.attachment.file_type === 'image' || (m.attachment.file_type || '').includes('image')) && m.attachment.file_base64)
        .map(m => m.attachment);

      const filtered = allImages.filter(img => {
        if (!filter) return true;
        return (img.title || '').toLowerCase().includes(filter);
      });

      if (detailTitle) detailTitle.textContent = `Ảnh / Video (${allImages.length})`;
      if (detailBody) {
        detailBody.innerHTML = '';
        if (filtered.length === 0) {
          detailBody.innerHTML = `<div style="font-size:12.5px; color:var(--text-muted); text-align:center; padding:24px 0;">Không có hình ảnh nào phù hợp.</div>`;
        } else {
          const grid = document.createElement('div');
          grid.className = 'drawer-media-grid';
          grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
          grid.style.gap = '8px';

          filtered.forEach(img => {
            const thumb = document.createElement('div');
            thumb.className = 'drawer-media-thumb';
            thumb.style.aspectRatio = '1';
            thumb.title = img.title || 'Ảnh chia sẻ';
            thumb.innerHTML = `<img src="${img.file_base64}" alt="${img.title || 'Media'}">`;
            thumb.onclick = () => {
              window.EduShare.previewDoc(img.title || 'Hình ảnh', 'image', img.file_size || 'Ảnh', img.file_base64);
            };
            grid.appendChild(thumb);
          });
          detailBody.appendChild(grid);
        }
      }
    } else if (type === 'files') {
      const isCommunity = room.id === 'room_community' || room.type === 'community';
      const msgFiles = (AppState.messages || [])
        .filter(m => !m.is_recalled && m.attachment && m.attachment.title && m.attachment.file_type !== 'image')
        .map(m => m.attachment);

      const docFiles = (AppState.documents || [])
        .filter(d => (d.room_id === room.id || (isCommunity && !d.room_id)) && d.file_type !== 'image')
        .map(d => ({
          doc_id: d.doc_id,
          title: d.title,
          file_type: d.file_type,
          file_size: d.file_size || '1.5 MB'
        }));

      const allFilesMap = new Map();
      [...msgFiles, ...docFiles].forEach(f => {
        if (!allFilesMap.has(f.title)) allFilesMap.set(f.title, f);
      });
      const allFiles = Array.from(allFilesMap.values());

      const filtered = allFiles.filter(f => {
        if (!filter) return true;
        return (f.title || '').toLowerCase().includes(filter) || (f.file_type || '').toLowerCase().includes(filter);
      });

      if (detailTitle) detailTitle.textContent = `File Tài Liệu (${allFiles.length})`;
      if (detailBody) {
        detailBody.innerHTML = '';
        if (filtered.length === 0) {
          detailBody.innerHTML = `<div style="font-size:12.5px; color:var(--text-muted); text-align:center; padding:24px 0;">Không tìm thấy tài liệu phù hợp.</div>`;
        } else {
          filtered.forEach(f => {
            const ext = (f.file_type || 'file').toLowerCase();
            const badgeClass = ['pdf', 'xlsx', 'xls', 'docx', 'doc', 'pptx', 'ppt', 'zip', 'rar'].includes(ext) ? ext : 'other';
            const badgeLabel = ext === 'xlsx' || ext === 'xls' ? 'XLS' : (ext === 'docx' || ext === 'doc' ? 'DOC' : (ext === 'pptx' || ext === 'ppt' ? 'PPT' : ext.toUpperCase().slice(0, 4)));

            const item = document.createElement('div');
            item.className = 'drawer-file-item';
            item.innerHTML = `
              <div class="file-badge-square ${badgeClass}">${badgeLabel}</div>
              <div class="drawer-member-info" style="flex:1; min-width:0;">
                <div class="drawer-member-name" title="${f.title}" style="font-size:12.5px;">${f.title}</div>
                <small style="color:var(--text-muted); font-size:11px;">${f.file_size || '1.5 MB'} • 60 ngày</small>
              </div>
              <div class="drawer-member-actions">
                <button class="btn-member-action" title="Xem trước" onclick="window.EduShare.previewDoc('${f.title}', '${f.file_type}', '${f.file_size}', '')">
                  <i class="fa-solid fa-eye"></i>
                </button>
                <button class="btn-member-action" title="Tải về máy" onclick="window.EduShare.downloadDoc('${f.doc_id}', '${f.title}')">
                  <i class="fa-solid fa-download"></i>
                </button>
              </div>
            `;
            detailBody.appendChild(item);
          });
        }
      }
    } else if (type === 'links') {
      const allLinks = extractLinksFromMessages(AppState.messages || []);
      const filtered = allLinks.filter(l => {
        if (!filter) return true;
        return (l.url || '').toLowerCase().includes(filter) || (l.domain || '').toLowerCase().includes(filter) || (l.sender_name || '').toLowerCase().includes(filter);
      });

      if (detailTitle) detailTitle.textContent = `Liên Kết Web (${allLinks.length})`;
      if (detailBody) {
        detailBody.innerHTML = '';
        if (filtered.length === 0) {
          detailBody.innerHTML = `<div style="font-size:12.5px; color:var(--text-muted); text-align:center; padding:24px 0;">Không tìm thấy liên kết web nào.</div>`;
        } else {
          filtered.forEach(l => {
            const item = document.createElement('div');
            item.className = 'drawer-link-item';
            item.innerHTML = `
              <div class="drawer-link-icon"><i class="fa-solid fa-globe"></i></div>
              <div class="drawer-link-info">
                <a href="${l.href}" target="_blank" rel="noopener noreferrer" class="drawer-link-url" title="${l.url}">
                  ${l.domain || l.url}
                </a>
                <div class="drawer-link-sender">${l.sender_name} • ${formatMsgTime(l.created_at)}</div>
              </div>
              <button class="btn-member-action" title="Sao chép liên kết" onclick="window.EduShare.copyLink('${l.href}')">
                <i class="fa-regular fa-copy"></i>
              </button>
            `;
            detailBody.appendChild(item);
          });
        }
      }
    }
  }

  function closeDrawerDetail() {
    activeDetailType = null;
    const viewMain = document.getElementById('drawer-view-main');
    const viewDetail = document.getElementById('drawer-view-detail');
    if (viewDetail) viewDetail.style.display = 'none';
    if (viewMain) viewMain.style.display = 'flex';
  }

  // ==================== MODAL KHO LƯU TRỮ & THÀNH VIÊN LỚN (CHUẨN EduShare PC) ====================
  let activeRepoModalTab = 'members';

  function openRepoModal(initialTab = 'members', room) {
    if (!room) room = AppState.activeRoomData;
    if (!room) return;

    activeRepoModalTab = initialTab;
    openModal('modal-storage-repository');

    const isCommunity = room.id === 'room_community' || room.type === 'community';
    const modalTitle = document.getElementById('repo-modal-title');
    if (modalTitle) modalTitle.textContent = `Kho Lưu Trữ & Thành Viên [${room.name}]`;

    // Cập nhật số lượng trên các tab
    const members = room.members || [];
    const images = (AppState.messages || [])
      .filter(m => !m.is_recalled && m.attachment && (m.attachment.file_type === 'image' || (m.attachment.file_type || '').includes('image')) && m.attachment.file_base64)
      .map(m => m.attachment);

    const msgFiles = (AppState.messages || [])
      .filter(m => !m.is_recalled && m.attachment && m.attachment.title && m.attachment.file_type !== 'image')
      .map(m => m.attachment);

    const docFiles = (AppState.documents || [])
      .filter(d => (d.room_id === room.id || (isCommunity && !d.room_id)) && d.file_type !== 'image')
      .map(d => ({ doc_id: d.doc_id, title: d.title, file_type: d.file_type, file_size: d.file_size || '1.5 MB' }));

    const allFilesMap = new Map();
    [...msgFiles, ...docFiles].forEach(f => {
      if (!allFilesMap.has(f.title)) allFilesMap.set(f.title, f);
    });
    const files = Array.from(allFilesMap.values());
    const links = extractLinksFromMessages(AppState.messages || []);

    const countMembers = document.getElementById('modal-count-members');
    const countMedia = document.getElementById('modal-count-media');
    const countFiles = document.getElementById('modal-count-files');
    const countLinks = document.getElementById('modal-count-links');
    if (countMembers) countMembers.textContent = members.length;
    if (countMedia) countMedia.textContent = images.length;
    if (countFiles) countFiles.textContent = files.length;
    if (countLinks) countLinks.textContent = links.length;

    // Gắn sự kiện chuyển tab
    document.querySelectorAll('.repo-tab-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.repo-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeRepoModalTab = btn.dataset.repoTab;
        renderRepoModalContent(room, '');
      };
    });

    // Kích hoạt tab được chọn
    document.querySelectorAll('.repo-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.repoTab === activeRepoModalTab);
    });

    // Gắn sự kiện tìm kiếm
    const searchInput = document.getElementById('input-repo-modal-search');
    if (searchInput) {
      searchInput.value = '';
      searchInput.oninput = (e) => {
        renderRepoModalContent(room, e.target.value.trim().toLowerCase());
      };
    }

    renderRepoModalContent(room, '');
  }

  function renderRepoModalContent(room, filter = '') {
    const body = document.getElementById('repo-modal-body');
    if (!body) return;
    body.innerHTML = '';

    const u = AppState.currentUser;
    const myMemberObj = (room.members || []).find(m => m.email && m.email.toLowerCase() === (u.email || '').toLowerCase());
    const myRole = (myMemberObj ? myMemberObj.role : room.user_role) || 'member';
    const isLeader = myRole === 'leader' || (room.owner_email && room.owner_email.toLowerCase() === (u.email || '').toLowerCase());
    const isColeader = myRole === 'coleader';
    const isCommunity = room.id === 'room_community' || room.type === 'community';

    if (activeRepoModalTab === 'members') {
      const members = (room.members || []).filter(m => {
        if (!filter) return true;
        return (m.name || '').toLowerCase().includes(filter) || (m.email || '').toLowerCase().includes(filter);
      });

      if (members.length === 0) {
        body.innerHTML = `<div style="font-size:13px; color:var(--text-muted); text-align:center; padding:32px 0;">Không tìm thấy thành viên phù hợp.</div>`;
      } else {
        members.forEach(m => {
          const isSelf = m.email && m.email.toLowerCase() === (u.email || '').toLowerCase();
          const roleLabel = m.role === 'leader' ? 'Trưởng nhóm' : (m.role === 'coleader' ? 'Phó nhóm' : 'Thành viên');
          const roleClass = m.role === 'leader' ? 'leader' : (m.role === 'coleader' ? 'coleader' : 'member');
          const displayName = m.name || m.email;
          const avatarUrl = m.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.email)}`;

          const card = document.createElement('div');
          card.className = 'drawer-member-card';

          let actionBtns = '';
          if (u.role !== 'guest' && !isSelf && m.role !== 'leader') {
            if (isLeader) {
              if (m.role === 'member') {
                actionBtns += `<button class="btn-member-action" title="Bổ nhiệm làm Phó nhóm" onclick="window.EduShare.manageMember('promote', '${m.email}')"><i class="fa-solid fa-arrow-up"></i></button>`;
              } else if (m.role === 'coleader') {
                actionBtns += `<button class="btn-member-action" title="Hạ cấp về Thành viên" onclick="window.EduShare.manageMember('demote', '${m.email}')"><i class="fa-solid fa-arrow-down"></i></button>`;
              }
              actionBtns += `<button class="btn-member-action" style="color:#ef4444;" title="Mời ra khỏi nhóm" onclick="window.EduShare.manageMember('kick', '${m.email}')"><i class="fa-solid fa-user-xmark"></i></button>`;
            } else if (isColeader && m.role === 'member') {
              actionBtns += `<button class="btn-member-action" style="color:#ef4444;" title="Mời ra khỏi nhóm" onclick="window.EduShare.manageMember('kick', '${m.email}')"><i class="fa-solid fa-user-xmark"></i></button>`;
            }
          }

          card.innerHTML = `
            <img src="${avatarUrl}" alt="${displayName}" class="drawer-member-avatar" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:1px solid var(--border-color);">
            <div class="drawer-member-info" style="flex:1; min-width:0;">
              <div class="drawer-member-name" style="font-weight:600; font-size:13.5px; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${displayName} ${isSelf ? '<span class="self-badge">(Bạn)</span>' : ''}
              </div>
              <div style="font-size:11.5px; color:var(--text-muted);">${m.email}</div>
              <span class="role-badge-chip ${roleClass}" style="margin-top:3px;">${roleLabel}</span>
            </div>
            <div class="drawer-member-actions">
              ${actionBtns}
            </div>
          `;
          body.appendChild(card);
        });
      }
    } else if (activeRepoModalTab === 'media') {
      const allImages = (AppState.messages || [])
        .filter(m => !m.is_recalled && m.attachment && (m.attachment.file_type === 'image' || (m.attachment.file_type || '').includes('image')) && m.attachment.file_base64)
        .map(m => m.attachment);

      const filtered = allImages.filter(img => {
        if (!filter) return true;
        return (img.title || '').toLowerCase().includes(filter);
      });

      if (filtered.length === 0) {
        body.innerHTML = `<div style="font-size:13px; color:var(--text-muted); text-align:center; padding:32px 0;">Không có hình ảnh/video nào được chia sẻ.</div>`;
      } else {
        const grid = document.createElement('div');
        grid.className = 'drawer-media-grid';
        grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
        grid.style.gap = '10px';

        filtered.forEach(img => {
          const thumb = document.createElement('div');
          thumb.className = 'drawer-media-thumb';
          thumb.title = img.title || 'Ảnh chia sẻ';
          thumb.innerHTML = `<img src="${img.file_base64}" alt="${img.title || 'Media'}">`;
          thumb.onclick = () => {
            window.EduShare.previewDoc(img.title || 'Hình ảnh', 'image', img.file_size || 'Ảnh', img.file_base64);
          };
          grid.appendChild(thumb);
        });
        body.appendChild(grid);
      }
    } else if (activeRepoModalTab === 'files') {
      const msgFiles = (AppState.messages || [])
        .filter(m => !m.is_recalled && m.attachment && m.attachment.title && m.attachment.file_type !== 'image')
        .map(m => m.attachment);

      const docFiles = (AppState.documents || [])
        .filter(d => (d.room_id === room.id || (isCommunity && !d.room_id)) && d.file_type !== 'image')
        .map(d => ({ doc_id: d.doc_id, title: d.title, file_type: d.file_type, file_size: d.file_size || '1.5 MB' }));

      const allFilesMap = new Map();
      [...msgFiles, ...docFiles].forEach(f => {
        if (!allFilesMap.has(f.title)) allFilesMap.set(f.title, f);
      });
      const allFiles = Array.from(allFilesMap.values());

      const filtered = allFiles.filter(f => {
        if (!filter) return true;
        return (f.title || '').toLowerCase().includes(filter) || (f.file_type || '').toLowerCase().includes(filter);
      });

      if (filtered.length === 0) {
        body.innerHTML = `<div style="font-size:13px; color:var(--text-muted); text-align:center; padding:32px 0;">Chưa có tài liệu nào trong nhóm này.</div>`;
      } else {
        filtered.forEach(f => {
          const ext = (f.file_type || 'file').toLowerCase();
          const badgeClass = ['pdf', 'xlsx', 'xls', 'docx', 'doc', 'pptx', 'ppt', 'zip', 'rar'].includes(ext) ? ext : 'other';
          const badgeLabel = ext === 'xlsx' || ext === 'xls' ? 'XLS' : (ext === 'docx' || ext === 'doc' ? 'DOC' : (ext === 'pptx' || ext === 'ppt' ? 'PPT' : ext.toUpperCase().slice(0, 4)));

          const item = document.createElement('div');
          item.className = 'drawer-file-item';
          item.innerHTML = `
            <div class="file-badge-square ${badgeClass}">${badgeLabel}</div>
            <div class="drawer-member-info" style="flex:1; min-width:0;">
              <div class="drawer-member-name" title="${f.title}" style="font-size:13px; font-weight:600;">${f.title}</div>
              <small style="color:var(--text-muted); font-size:11.5px;">${f.file_size || '1.5 MB'} • 60 ngày</small>
            </div>
            <div class="drawer-member-actions">
              <button class="btn-member-action" title="Xem trước" onclick="window.EduShare.previewDoc('${f.title}', '${f.file_type}', '${f.file_size}', '')">
                <i class="fa-solid fa-eye"></i> Xem
              </button>
              <button class="btn-member-action" title="Tải về máy" onclick="window.EduShare.downloadDoc('${f.doc_id}', '${f.title}')">
                <i class="fa-solid fa-download"></i> Tải về
              </button>
            </div>
          `;
          body.appendChild(item);
        });
      }
    } else if (activeRepoModalTab === 'links') {
      const allLinks = extractLinksFromMessages(AppState.messages || []);
      const filtered = allLinks.filter(l => {
        if (!filter) return true;
        return (l.url || '').toLowerCase().includes(filter) || (l.domain || '').toLowerCase().includes(filter) || (l.sender_name || '').toLowerCase().includes(filter);
      });

      if (filtered.length === 0) {
        body.innerHTML = `<div style="font-size:13px; color:var(--text-muted); text-align:center; padding:32px 0;">Chưa có liên kết web nào trong nhóm này.</div>`;
      } else {
        filtered.forEach(l => {
          const item = document.createElement('div');
          item.className = 'drawer-link-item';
          item.innerHTML = `
            <div class="drawer-link-icon"><i class="fa-solid fa-globe"></i></div>
            <div class="drawer-link-info">
              <a href="${l.href}" target="_blank" rel="noopener noreferrer" class="drawer-link-url" title="${l.url}">
                ${l.domain || l.url}
              </a>
              <div class="drawer-link-sender">${l.sender_name} • ${formatMsgTime(l.created_at)}</div>
            </div>
            <button class="btn-member-action" title="Sao chép liên kết" onclick="window.EduShare.copyLink('${l.href}')">
              <i class="fa-regular fa-copy"></i> Sao chép
            </button>
          `;
          body.appendChild(item);
        });
      }
    }
  }

  // ==================== TẠO NHÓM MỚI & THAM GIA BẰNG MÃ ====================
    let pendingInitialGroupMembers = [];

  function openCreateGroupWithFriend(friend) {
    pendingInitialGroupMembers = friend ? [friend.email] : [];
    const nameInput = document.getElementById('new-group-name');
    if (nameInput) {
      nameInput.value = friend ? `Nhóm học cùng ${friend.name || friend.email}` : '';
    }
    const initialRow = document.getElementById('create-group-initial-member-row');
    const initialName = document.getElementById('create-group-initial-name');
    const initialEmail = document.getElementById('create-group-initial-email');
    const initialAvatar = document.getElementById('create-group-initial-avatar');
    if (initialRow) {
      if (friend) {
        initialRow.style.display = 'block';
        if (initialName) initialName.textContent = friend.name || friend.email;
        if (initialEmail) initialEmail.textContent = friend.email;
        if (initialAvatar) initialAvatar.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(friend.email)}`;
      } else {
        initialRow.style.display = 'none';
      }
    }
    const codeInput = document.getElementById('new-group-code');
    if (codeInput) codeInput.value = generateAccessCode(16);
    openModal('modal-create-group');
  }

  function initGroupCreationAndJoin() {
    document.getElementById('btn-open-create-group')?.addEventListener('click', () => {
      if (AppState.currentUser.role === 'guest') {
        showToast('Vui lòng đăng nhập để tạo nhóm học tập!', 'info');
        openModal('modal-auth');
        return;
      }
      const codeInput = document.getElementById('new-group-code');
      if (codeInput) codeInput.value = generateAccessCode(16);
      openModal('modal-create-group');
    });

    document.getElementById('btn-regen-code')?.addEventListener('click', () => {
      const codeInput = document.getElementById('new-group-code');
      if (codeInput) codeInput.value = generateAccessCode(16);
    });

    document.getElementById('form-create-group')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('new-group-name')?.value.trim();
      const subject = document.getElementById('new-group-subject')?.value;
      const code = document.getElementById('new-group-code')?.value.trim();

      if (!name || !code) {
        showToast('Vui lòng điền đầy đủ tên nhóm!', 'error');
        return;
      }

      try {
        const payload = {
          name, code, subject,
          type: 'study_group',
          owner_email: AppState.currentUser.email
        };
        if (pendingInitialGroupMembers.length > 0) {
          payload.initial_members = pendingInitialGroupMembers;
        }
        const res = await apiCall('/api/rooms', 'POST', payload);
        showToast(`Tạo nhóm '${name}' thành công! Mã 16 ký tự: ${code}`, 'success');
        closeModal('modal-create-group');
        loadRooms();
        switchRoom(res.room_id);
      } catch (err) {
        showToast(err.message || 'Lỗi tạo nhóm học tập.', 'error');
      }
    });

    document.getElementById('btn-open-join-code')?.addEventListener('click', () => {
      if (AppState.currentUser.role === 'guest') {
        showToast('Vui lòng đăng nhập để tham gia nhóm học tập!', 'info');
        openModal('modal-auth');
        return;
      }
      openModal('modal-join-group');
    });

    document.getElementById('form-join-group')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = document.getElementById('input-join-code')?.value.trim();
      if (!code) {
        showToast('Vui lòng nhập mã 16 ký tự của nhóm!', 'error');
        return;
      }

      try {
        const res = await apiCall('/api/rooms/join', 'POST', {
          code,
          user_email: AppState.currentUser.email
        });
        showToast(res.message, res.status === 'success' ? 'success' : 'info');
        closeModal('modal-join-group');
        loadRooms();
        if (res.room_id) switchRoom(res.room_id);
      } catch (err) {
        showToast(err.message || 'Mã tham gia không chính xác.', 'error');
      }
    });

    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        AppState.sidebarFilter = tab.dataset.filter;
        renderRoomsList();
      });
    });

    const searchInput = document.getElementById('search-conversation');
    const clearBtn = document.getElementById('btn-clear-search');

    searchInput?.addEventListener('input', (e) => {
      AppState.searchConversationQuery = e.target.value.trim();
      if (clearBtn) clearBtn.style.display = e.target.value ? 'block' : 'none';
      renderRoomsList();
    });

    clearBtn?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      AppState.searchConversationQuery = '';
      clearBtn.style.display = 'none';
      renderRoomsList();
    });
  }

  // ==================== BẢNG TIN DIỄN ĐÀN HỌC SINH (FORUM) ====================
  async function loadPosts() {
    try {
      const q = document.getElementById('forum-search-input')?.value.trim() || '';
      const subject = AppState.forumSubject;
      const data = await apiCall(`/api/posts?subject=${encodeURIComponent(subject)}&search=${encodeURIComponent(q)}`);
      const serverPosts = Array.isArray(data) ? data : [];

      // Giữ lại các bài viết đang đăng hoặc lỗi của phiên hiện tại ở đầu feed
      const pendingPosts = (AppState.posts || []).filter(p => p.status === 'posting' || p.status === 'failed');
      const mergedPosts = [...pendingPosts];
      serverPosts.forEach(sp => {
        if (!mergedPosts.some(p => p.id === sp.id)) {
          mergedPosts.push(sp);
        }
      });

      AppState.posts = mergedPosts;
      renderPostsFeed(mergedPosts);
    } catch (err) {
      console.warn('Lỗi tải bài viết diễn đàn:', err);
    }
  }

  function buildPostCardElement(post) {
    const card = document.createElement('div');
    const isOptimistic = post.status === 'posting' || post.status === 'failed';
    card.className = `post-card ${isOptimistic ? 'post-card-optimistic' : ''} ${post.status === 'failed' ? 'failed' : ''}`;
    card.id = `post-card-${post.id}`;

    const currentUserEmail = (AppState.currentUser?.email || '').trim().toLowerCase();
    const currentUserId = (AppState.currentUser?.id || '').trim();
    const postAuthorId = (post.authorId || post.author_id || '').trim();
    const postAuthorEmail = (post.author_email || '').trim().toLowerCase();
    if (postAuthorEmail) {
      card.setAttribute('data-author-email', postAuthorEmail);
    }

    // PHẦN 1: PHÂN QUYỀN XÓA BÀI ĐĂNG (Delete Post Authorization)
    // Chỉ hiển thị nút "Xóa bài viết" nếu currentUser.id === post.authorId (hoặc email tương ứng nếu post cũ)
    // Ẩn hoàn toàn nút xóa đối với các bài đăng của người dùng khác
    const isAuthor = Boolean(
      AppState.currentUser?.role !== 'guest' && (
        (currentUserId && postAuthorId && currentUserId === postAuthorId) ||
        (!postAuthorId && currentUserEmail && postAuthorEmail && currentUserEmail === postAuthorEmail)
      )
    );

    const isLiked = (post.likes || []).map(e => (e || '').toLowerCase()).includes(currentUserEmail);
    const likesCount = (post.likes || []).length;
    const comments = post.comments || [];
    const commentsCount = comments.length;
    const sharesCount = post.shares_count || 0;

    let attachHtml = '';
    if (post.attachment) {
      const att = post.attachment;
      const meta = getFileIconMeta(att.file_type);
      const isImg = att.file_type === 'image' || (att.file_type || '').includes('image') || ['png','jpg','jpeg','webp','gif'].includes((att.file_type || '').toLowerCase()) || (att.mime_type || '').startsWith('image/');

      let imgPreviewHtml = '';
      if (isImg && (att.file_base64 || att.drive_url || att.doc_id)) {
        const imgSrc = att.file_base64 || att.drive_url || `/api/docs/${encodeURIComponent(att.doc_id)}/download`;
        imgPreviewHtml = `
          <div style="margin-top: 10px; border-radius: 8px; overflow: hidden; max-height: 320px; cursor: pointer; border: 1px solid var(--border-color);" onclick="window.EduShare.previewDoc('${escapeHtml(att.title || 'Hình ảnh')}', 'image', '${escapeHtml(att.file_size || '')}', '', '${escapeHtml(att.doc_id || '')}')">
            <img src="${imgSrc}" alt="${escapeHtml(att.title || 'Hình ảnh')}" style="width: 100%; max-height: 320px; object-fit: cover; display: block;">
          </div>
        `;
      }

      attachHtml = `
        ${imgPreviewHtml}
        <div class="doc-attachment-card" style="margin-top:10px;">
          <i class="fa-solid ${meta.icon} doc-file-icon ${meta.colorClass}"></i>
          <div class="doc-info-col">
            <div class="doc-title-text" title="${escapeHtml(att.title || 'Tài liệu')}">${escapeHtml(att.title || 'Tài liệu')}</div>
            <div class="doc-size-text">${escapeHtml(att.file_size || '1.5 MB')} • Đám mây 60 ngày</div>
          </div>
          <div class="doc-actions-wrap">
            <button class="btn-doc-download" onclick="window.EduShare.previewDoc('${escapeHtml(att.title || '')}', '${escapeHtml(att.file_type || '')}', '${escapeHtml(att.file_size || '')}', '', '${escapeHtml(att.doc_id || '')}')" title="Xem trước">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn-doc-download" onclick="window.EduShare.downloadDoc('${escapeHtml(att.doc_id || '')}', '${escapeHtml(att.title || '')}')" title="Tải về">
              <i class="fa-solid fa-download"></i> Tải về
            </button>
          </div>
        </div>
      `;
    }

    let commentsListHtml = '';
    comments.forEach(c => {
      const cEmail = (c.author_email || '').toLowerCase().trim();
      commentsListHtml += `
        <div class="comment-item" ${cEmail ? `data-author-email="${escapeHtml(cEmail)}"` : ''}>
          <img src="${c.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=User'}" class="avatar-mini comment-avatar-img" ${cEmail ? `data-author-email="${escapeHtml(cEmail)}"` : ''} alt="Avatar">
          <div class="comment-bubble">
            <div class="comment-author" ${cEmail ? `data-author-name-for="${escapeHtml(cEmail)}"` : ''}>${escapeHtml(c.author_name || 'Người dùng')}</div>
            <div>${escapeHtml(c.content || '')}</div>
          </div>
        </div>
      `;
    });

    // PHẦN 3: Banner đang tải hoặc lỗi cho Optimistic Post
    let optimisticBannerHtml = '';
    if (post.status === 'posting') {
      optimisticBannerHtml = `
        <div class="post-optimistic-banner" id="post-banner-${post.id}">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span>Đang đăng bài viết lên bảng tin...</span>
        </div>
      `;
    } else if (post.status === 'failed') {
      optimisticBannerHtml = `
        <div class="post-optimistic-error" id="post-banner-${post.id}">
          <div class="post-error-text">
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>Đăng bài thất bại: ${escapeHtml(post.errorMessage || 'Lỗi kết nối máy chủ')}</span>
          </div>
          <div class="post-error-actions">
            <button type="button" class="btn-retry-post" onclick="window.EduShare.retryPost('${post.id}')">
              <i class="fa-solid fa-rotate-right"></i> Đăng lại
            </button>
            <button type="button" class="btn-cancel-post" onclick="window.EduShare.cancelPost('${post.id}')">
              <i class="fa-solid fa-xmark"></i> Hủy bỏ
            </button>
          </div>
        </div>
      `;
    }

    // Vô hiệu hóa tạm thời các nút tương tác (Like, Bình luận, Chia sẻ, Xóa) trên bài viết đang đăng
    const isActionsDisabled = post.status === 'posting' || post.status === 'failed';

    card.innerHTML = `
      ${optimisticBannerHtml}
      <div class="post-header-row">
        <div class="post-author-box">
          <img src="${post.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=User'}" class="avatar-mini post-author-avatar-img" ${postAuthorEmail ? `data-author-email="${escapeHtml(postAuthorEmail)}"` : ''} alt="Avatar">
          <div>
            <div class="post-author-name" ${postAuthorEmail ? `data-author-name-for="${escapeHtml(postAuthorEmail)}"` : ''}>${escapeHtml(post.author_name || 'Người dùng')}</div>
            <div class="post-time-ago">${post.author_role_title ? escapeHtml(post.author_role_title) + ' • ' : ''}${formatTimeAgo(post.created_at)}</div>
          </div>
        </div>
        <span class="post-subject-badge">${escapeHtml(post.subject || 'Chung')}</span>
      </div>

      <div class="post-body-content">${escapeHtml(post.content || '')}</div>
      ${attachHtml}

      <div class="post-action-bar ${isActionsDisabled ? 'disabled' : ''}">
        <button class="btn-post-action ${isLiked ? 'liked' : ''}" onclick="window.EduShare.toggleLike('${post.id}')">
          <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart"></i> Thích (${likesCount})
        </button>
        <button class="btn-post-action" onclick="window.EduShare.toggleCommentSection('${post.id}')">
          <i class="fa-regular fa-comment"></i> Bình luận (${commentsCount})
        </button>
        <button class="btn-post-action btn-copy-link-post" onclick="window.EduShare.copyPostLink('${post.id}')" title="Sao chép liên kết chia sẻ bài viết">
          <i class="fa-solid fa-share-nodes"></i> Chia sẻ
        </button>
        <button class="btn-post-action" onclick="window.EduShare.openShareModal('${post.id}')" title="Gửi bài viết vào nhóm chat">
          <i class="fa-solid fa-paper-plane"></i> Gửi nhóm (${sharesCount})
        </button>
        ${isAuthor ? `
          <button class="btn-post-action btn-delete-post" title="Xóa bài viết này" onclick="window.EduShare.deletePost('${post.id}')">
            <i class="fa-solid fa-trash-can"></i> Xóa
          </button>
        ` : ''}
      </div>

      <div class="post-comments-section" id="comments-section-${post.id}" style="display:none;">
        <div class="comments-list" id="comments-list-${post.id}">
          ${commentsListHtml}
        </div>
        <div class="comment-input-row">
          <input type="text" id="comment-input-${post.id}" placeholder="Viết câu trả lời hoặc thảo luận..." onkeydown="if(event.key==='Enter') window.EduShare.submitComment('${post.id}')">
          <button class="btn-send-comment" onclick="window.EduShare.submitComment('${post.id}')">Gửi</button>
        </div>
      </div>
    `;

    return card;
  }

  function renderPostsFeed(posts) {
    const container = document.getElementById('posts-feed-container');
    if (!container) return;

    container.innerHTML = '';
    const safePosts = Array.isArray(posts) ? posts : [];
    if (safePosts.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 45px 12px; color: var(--text-muted);">
          <i class="fa-solid fa-newspaper" style="font-size: 32px; margin-bottom: 12px; opacity: 0.7; display: block;"></i>
          Chưa có bài viết nào trong chủ đề này. Hãy là người đầu tiên chia sẻ câu hỏi hoặc tài liệu!
        </div>
      `;
      return;
    }

    safePosts.forEach(post => {
      const card = buildPostCardElement(post);
      container.appendChild(card);
    });
  }

  async function executeCreatePost(optimisticPost) {
    const tempId = optimisticPost.id;
    try {
      const res = await apiCall('/api/posts', 'POST', optimisticPost._payload);
      const realId = res.id || res.post_id || tempId;
      optimisticPost.id = realId;
      optimisticPost.status = 'posted';
      if (res.created_at) optimisticPost.created_at = res.created_at;
      if (res.attachment) optimisticPost.attachment = res.attachment;

      // Cập nhật DOM mượt mà không làm giật trang (Smooth transition)
      const cardEl = document.getElementById(`post-card-${tempId}`);
      if (cardEl) {
        cardEl.id = `post-card-${realId}`;
        cardEl.classList.remove('failed');
        cardEl.classList.add('posted');

        // Gỡ bỏ banner loading với hiệu ứng mờ dần
        const banner = cardEl.querySelector('.post-optimistic-banner, .post-optimistic-error');
        if (banner) {
          banner.style.opacity = '0';
          banner.style.transition = 'opacity 0.25s ease';
          setTimeout(() => banner.remove(), 250);
        }

        // Kích hoạt lại thanh tương tác
        const actionBar = cardEl.querySelector('.post-action-bar');
        if (actionBar) {
          actionBar.classList.remove('disabled');
        }

        // Cập nhật thời gian
        const timeAgoEl = cardEl.querySelector('.post-time-ago');
        if (timeAgoEl) {
          const rolePrefix = optimisticPost.author_role_title ? `${escapeHtml(optimisticPost.author_role_title)} • ` : '';
          timeAgoEl.textContent = `${rolePrefix}${formatTimeAgo(optimisticPost.created_at)}`;
        }

        // Cập nhật sự kiện click với realId
        const likeBtn = cardEl.querySelector('.btn-post-action:nth-child(1)');
        if (likeBtn) likeBtn.setAttribute('onclick', `window.EduShare.toggleLike('${realId}')`);
        const commentBtn = cardEl.querySelector('.btn-post-action:nth-child(2)');
        if (commentBtn) commentBtn.setAttribute('onclick', `window.EduShare.toggleCommentSection('${realId}')`);
        const shareBtn = cardEl.querySelector('.btn-post-action:nth-child(3)');
        if (shareBtn) shareBtn.setAttribute('onclick', `window.EduShare.openShareModal('${realId}')`);
        const deleteBtn = cardEl.querySelector('.btn-delete-post');
        if (deleteBtn) deleteBtn.setAttribute('onclick', `window.EduShare.deletePost('${realId}')`);

        const commentSec = cardEl.querySelector('.post-comments-section');
        if (commentSec) {
          commentSec.id = `comments-section-${realId}`;
          const cList = commentSec.querySelector('.comments-list');
          if (cList) cList.id = `comments-list-${realId}`;
          const cInput = commentSec.querySelector('input');
          if (cInput) {
            cInput.id = `comment-input-${realId}`;
            cInput.setAttribute('onkeydown', `if(event.key==='Enter') window.EduShare.submitComment('${realId}')`);
          }
          const cSend = commentSec.querySelector('.btn-send-comment');
          if (cSend) cSend.setAttribute('onclick', `window.EduShare.submitComment('${realId}')`);
        }

        // Trả lại độ mờ bình thường (opacity: 1)
        setTimeout(() => {
          cardEl.classList.remove('post-card-optimistic', 'posted');
        }, 400);
      }

      showToast('Đăng bài viết lên diễn đàn thành công!', 'success');
    } catch (err) {
      console.warn('Lỗi đăng bài viết:', err);
      optimisticPost.status = 'failed';
      optimisticPost.errorMessage = err.message || 'Lỗi kết nối máy chủ';

      const cardEl = document.getElementById(`post-card-${tempId}`);
      if (cardEl) {
        cardEl.classList.remove('posted');
        cardEl.classList.add('failed');

        const errorHtml = `
          <div class="post-error-text">
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>Đăng bài thất bại: ${escapeHtml(optimisticPost.errorMessage)}</span>
          </div>
          <div class="post-error-actions">
            <button type="button" class="btn-retry-post" onclick="window.EduShare.retryPost('${tempId}')">
              <i class="fa-solid fa-rotate-right"></i> Đăng lại
            </button>
            <button type="button" class="btn-cancel-post" onclick="window.EduShare.cancelPost('${tempId}')">
              <i class="fa-solid fa-xmark"></i> Hủy bỏ
            </button>
          </div>
        `;

        let banner = cardEl.querySelector('.post-optimistic-banner, .post-optimistic-error');
        if (banner) {
          banner.className = 'post-optimistic-error';
          banner.innerHTML = errorHtml;
        } else {
          const errDiv = document.createElement('div');
          errDiv.className = 'post-optimistic-error';
          errDiv.innerHTML = errorHtml;
          cardEl.insertBefore(errDiv, cardEl.firstChild);
        }
      }

      showToast(err.message || 'Lỗi khi đăng bài. Bạn có thể bấm Đăng lại hoặc Hủy bỏ.', 'error');
    }
  }

  // ==================== TÍNH NĂNG CHIA SẺ BÀI VIẾT & DEEP LINKING (FACEBOOK STYLE) ====================
  function copyPostLink(postId) {
    if (!postId) return;
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/feed?postId=${encodeURIComponent(postId)}`;
    copyTextToClipboard(shareUrl, 'Đã sao chép liên kết');
  }

  async function scrollToAndHighlightPost(postId) {
    if (!postId) return;

    // Chuyển sang tab Bảng tin nếu đang ở tab khác
    if (AppState.activeTab !== 'forum') {
      switchMainTab('forum');
    }

    const attemptScrollAndGlow = () => {
      const cardEl = document.getElementById(`post-card-${postId}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cardEl.classList.remove('post-card-highlighted');
        void cardEl.offsetWidth; // Trigger reflow để kích hoạt lại CSS animation
        cardEl.classList.add('post-card-highlighted');
        setTimeout(() => {
          cardEl.classList.remove('post-card-highlighted');
        }, 4000);
        return true;
      }
      return false;
    };

    // Nếu bài viết đã có sẵn trong DOM hiện tại
    if (attemptScrollAndGlow()) return;

    // Nếu chưa có trong DOM, tự động nạp từ API máy chủ (bài viết nằm ngoài phân trang ban đầu)
    try {
      const post = await apiCall(`/api/posts/${encodeURIComponent(postId)}`);
      if (post && post.id) {
        if (!AppState.posts) AppState.posts = [];
        const existingIdx = AppState.posts.findIndex(p => p.id === post.id);
        if (existingIdx !== -1) {
          AppState.posts[existingIdx] = post;
        } else {
          AppState.posts.unshift(post);
        }
        renderPostsFeed(AppState.posts);
        setTimeout(() => {
          attemptScrollAndGlow();
        }, 120);
      }
    } catch (err) {
      console.warn('Lỗi nạp bài viết deep link:', err);
      showToast('Không tìm thấy bài viết hoặc bài viết đã bị xóa.', 'error');
    }
  }

  function checkDeepLinking() {
    try {
      const params = new URLSearchParams(window.location.search);
      let postId = params.get('postId') || params.get('post_id') || params.get('p');
      if (!postId) {
        const path = window.location.pathname;
        const match = path.match(/^\/(?:posts|feed)\/([a-zA-Z0-9_\-]+)/);
        if (match) {
          postId = match[1];
        }
      }
      if (postId) {
        setTimeout(() => {
          scrollToAndHighlightPost(postId);
        }, 350);
      }
    } catch (e) {
      console.warn('Lỗi kiểm tra Deep Link:', e);
    }
  }

  function initForumEvents() {
    document.querySelectorAll('#forum-subject-chips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#forum-subject-chips .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        AppState.forumSubject = chip.dataset.subject;
        loadPosts();
      });
    });

    document.getElementById('forum-search-input')?.addEventListener('input', () => {
      loadPosts();
    });

    let pendingPostAttachment = null;
    let isReadingPostFile = false;

    document.getElementById('forum-file-input')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const ext = file.name.split('.').pop().toLowerCase();
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
        const docId = `doc_forum_${Date.now()}`;
        const preview = document.getElementById('post-file-preview');
        const filename = document.getElementById('post-preview-filename');
        const meta = getFileIconMeta(ext);
        if (preview && filename) {
          const iconEl = preview.querySelector('i');
          if (iconEl) iconEl.className = `fa-solid ${meta.icon} doc-file-icon ${meta.colorClass}`;
          filename.textContent = `Đang đọc tệp: ${file.name}...`;
          preview.style.display = 'flex';
        }

        isReadingPostFile = true;
        const reader = new FileReader();
        reader.onload = (evt) => {
          isReadingPostFile = false;
          pendingPostAttachment = {
            doc_id: docId,
            title: file.name,
            file_type: ext,
            file_size: sizeMb,
            mime_type: file.type || 'application/octet-stream',
            file_base64: evt.target.result
          };
          if (filename) filename.textContent = `${file.name} (${sizeMb})`;
          showToast(`Đã đính kèm tệp: ${file.name}`, 'info');
        };
        reader.onerror = () => {
          isReadingPostFile = false;
          pendingPostAttachment = null;
          if (preview) preview.style.display = 'none';
          showToast('Lỗi đọc dữ liệu tệp đính kèm.', 'error');
        };
        reader.readAsDataURL(file);
      }
    });

    document.getElementById('btn-remove-post-file')?.addEventListener('click', () => {
      pendingPostAttachment = null;
      isReadingPostFile = false;
      const preview = document.getElementById('post-file-preview');
      if (preview) preview.style.display = 'none';
      const fileInput = document.getElementById('forum-file-input');
      if (fileInput) fileInput.value = '';
    });

    document.getElementById('btn-submit-post')?.addEventListener('click', () => {
      const u = AppState.currentUser;
      if (u.role === 'guest') {
        showToast('Vui lòng đăng nhập để đăng bài viết!', 'info');
        openModal('modal-auth');
        return;
      }

      if (isReadingPostFile) {
        showToast('Đang đọc dữ liệu tệp, vui lòng chờ trong giây lát...', 'info');
        return;
      }

      const text = document.getElementById('create-post-text')?.value.trim() || '';
      const subject = document.getElementById('forum-post-subject')?.value || 'Chuyên đề chung';
      const attachedFile = pendingPostAttachment;

      if (!text && !attachedFile) {
        showToast('Vui lòng nhập nội dung câu hỏi hoặc đính kèm tài liệu!', 'error');
        return;
      }

      // 1. Phản hồi tức thì: Xóa sạch form nhập liệu để người dùng không phải chờ
      const postTextArea = document.getElementById('create-post-text');
      if (postTextArea) postTextArea.value = '';
      pendingPostAttachment = null;
      isReadingPostFile = false;
      const preview = document.getElementById('post-file-preview');
      if (preview) preview.style.display = 'none';
      const fileInput = document.getElementById('forum-file-input');
      if (fileInput) fileInput.value = '';

      // 2. Tạo đối tượng bài viết Optimistic với preview ảnh/tệp cục bộ
      const tempPostId = 'temp_post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const postPayload = {
        author_id: u.id,
        author_email: u.email,
        author_name: u.name,
        author_role_title: u.roleTitle || 'Thành viên',
        avatar: u.avatar,
        subject: subject,
        content: text,
        attachment: attachedFile
      };

      const optimisticPost = {
        id: tempPostId,
        author_id: u.id,
        authorId: u.id,
        author_email: u.email,
        author_name: u.name,
        author_role_title: u.roleTitle || 'Thành viên',
        avatar: u.avatar,
        subject: subject,
        content: text,
        attachment: attachedFile,
        likes: [],
        comments: [],
        shares_count: 0,
        created_at: new Date().toISOString(),
        status: 'posting',
        _payload: postPayload
      };

      // 3. Chèn ngay bài viết mới lên đầu bản tin (Newsfeed) với độ mờ và loading banner
      AppState.posts = AppState.posts || [];
      AppState.posts.unshift(optimisticPost);

      const feedContainer = document.getElementById('posts-feed-container');
      if (feedContainer) {
        const emptyState = feedContainer.querySelector('.fa-newspaper');
        if (emptyState && emptyState.parentElement) {
          feedContainer.innerHTML = '';
        }
        const cardEl = buildPostCardElement(optimisticPost);
        feedContainer.insertBefore(cardEl, feedContainer.firstChild);
      }

      // 4. Đồng bộ nền tới máy chủ
      executeCreatePost(optimisticPost);
    });

    document.getElementById('btn-open-forum-chat')?.addEventListener('click', () => {
      switchMainTab('chat');
      switchRoom('room_community');
    });

    document.getElementById('btn-back-to-sidebar')?.addEventListener('click', () => {
      document.getElementById('sidebar-column')?.classList.remove('sidebar-mobile-hidden');
      document.getElementById('chat-info-drawer')?.classList.add('hidden');
    });

    document.getElementById('btn-back-forum-sidebar')?.addEventListener('click', () => {
      document.getElementById('sidebar-column')?.classList.remove('sidebar-mobile-hidden');
    });
  }

  // ==================== KHO LƯU TRỮ TÀI LIỆU (VAULT) ====================
  async function loadDocuments() {
    try {
      const q = document.getElementById('vault-search-input')?.value.trim() || '';
      const subject = AppState.vaultSubject;
      const data = await apiCall(`/api/docs?subject=${encodeURIComponent(subject)}&search=${encodeURIComponent(q)}`);
      const docs = Array.isArray(data) ? data : [];
      AppState.documents = docs;
      renderVaultGrid(docs);
    } catch (err) {
      console.warn('Lỗi tải danh sách tài liệu:', err);
    }
  }

  function renderVaultGrid(docs) {
    const container = document.getElementById('vault-docs-container');
    if (!container) return;

    container.innerHTML = '';
    const safeDocs = Array.isArray(docs) ? docs : [];
    const filterType = AppState.vaultType || 'all';

    const filteredDocs = safeDocs.filter(d => {
      if (filterType !== 'all') {
        const ft = (d.file_type || '').toLowerCase();
        if (filterType === 'pdf' && ft !== 'pdf') return false;
        if (filterType === 'docx' && !ft.includes('doc')) return false;
        if (filterType === 'xlsx' && !ft.includes('xls')) return false;
        if (filterType === 'pptx' && !ft.includes('ppt')) return false;
      }
      return true;
    });

    if (filteredDocs.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding: 50px 10px; color: var(--text-muted);">
          <i class="fa-solid fa-folder-open" style="font-size: 36px; margin-bottom: 12px; opacity:0.7; display: block;"></i>
          Không tìm thấy tài liệu phù hợp với bộ lọc hiện tại.
        </div>
      `;
      return;
    }

    filteredDocs.forEach(doc => {
      const card = document.createElement('div');
      card.className = 'vault-card';

      const type = doc.file_type || 'pdf';
      const meta = getFileIconMeta(type);
      card.innerHTML = `
        <div class="vault-card-top">
          <i class="fa-solid ${meta.icon} doc-file-icon ${meta.colorClass}"></i>
          <div style="flex:1; min-width:0;">
            <div class="vault-card-title" title="${doc.title}">${doc.title}</div>
            <div class="vault-card-meta">
              <i class="fa-solid fa-user"></i> ${doc.uploader_name || 'Người dùng'} • ${doc.file_size || '1.5 MB'}
            </div>
          </div>
        </div>

        <div class="vault-card-footer">
          <span class="subject-chip-mini">${doc.subject || 'Chung'}</span>
          <div style="display:flex; gap:6px;">
            <button class="btn-download-vault" onclick="window.EduShare.previewDoc('${doc.title}', '${doc.file_type}', '${doc.file_size}', '')" title="Xem trước">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn-download-vault" onclick="window.EduShare.downloadDoc('${doc.doc_id}', '${doc.title}')" title="Tải về máy">
              <i class="fa-solid fa-download"></i> Tải về
            </button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function initVaultEvents() {
    document.getElementById('vault-search-input')?.addEventListener('input', () => loadDocuments());
    document.getElementById('vault-filter-subject')?.addEventListener('change', (e) => {
      AppState.vaultSubject = e.target.value;
      loadDocuments();
    });

    // Bộ lọc định dạng file (PDF, Word, Excel, Slide)
    document.querySelectorAll('#vault-type-chips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#vault-type-chips .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        AppState.vaultType = chip.dataset.type;
        renderVaultGrid(AppState.documents);
      });
    });

    document.getElementById('btn-back-vault-sidebar')?.addEventListener('click', () => {
      document.getElementById('sidebar-column')?.classList.remove('sidebar-mobile-hidden');
    });

    // Cài đặt Google Drive
    document.getElementById('btn-drive-cfg')?.addEventListener('click', async () => {
      const inputFolder = document.getElementById('input-drive-folder-url');
      const inputWebApp = document.getElementById('input-drive-webapp-url');
      const connBadge = document.getElementById('drive-conn-badge');
      const btnOpenFolder = document.getElementById('btn-open-drive-folder');

      try {
        const cfg = await apiCall('/api/config/drive');
        if (cfg) {
          if (inputWebApp) inputWebApp.value = cfg.webapp_url || localStorage.getItem(STORAGE_KEYS.DRIVE_URL) || '';
          if (inputFolder) inputFolder.value = cfg.folder_url || localStorage.getItem(STORAGE_KEYS.DRIVE_URL) || DEFAULT_DRIVE_FOLDER;
          if (connBadge) {
            connBadge.textContent = cfg.is_connected ? 'Đã kết nối Google Drive' : 'Chưa kết nối Web App';
            connBadge.style.background = cfg.is_connected ? '#dcfce7' : '#f1f5f9';
            connBadge.style.color = cfg.is_connected ? '#15803d' : 'var(--text-muted)';
          }
          if (btnOpenFolder && inputFolder) btnOpenFolder.href = inputFolder.value;
        }
      } catch (_) {
        if (inputWebApp) inputWebApp.value = localStorage.getItem(STORAGE_KEYS.DRIVE_URL) || '';
        if (inputFolder) inputFolder.value = localStorage.getItem(STORAGE_KEYS.DRIVE_URL) || DEFAULT_DRIVE_FOLDER;
      }
      openModal('modal-drive-config');
    });

    document.getElementById('btn-test-drive-conn')?.addEventListener('click', async () => {
      const webappUrl = document.getElementById('input-drive-webapp-url')?.value.trim();
      const connBadge = document.getElementById('drive-conn-badge');
      if (!webappUrl) {
        showToast('Vui lòng dán URL Web App Google Apps Script trước khi kiểm tra!', 'info');
        return;
      }
      showToast('Đang kiểm tra kết nối với Google Apps Script...', 'info');
      try {
        const res = await apiCall('/api/config/drive', 'POST', {
          webapp_url: webappUrl,
          folder_url: document.getElementById('input-drive-folder-url')?.value.trim()
        });
        if (res.test_result === 'connected') {
          showToast('Kết nối Google Apps Script thành công! Đám mây Drive sẵn sàng.', 'success');
          if (connBadge) {
            connBadge.textContent = 'Đã kết nối Google Drive';
            connBadge.style.background = '#dcfce7';
            connBadge.style.color = '#15803d';
          }
        } else {
          showToast(`Lưu cấu hình thành công! (Trạng thái kiểm tra: ${res.test_result})`, 'info');
        }
      } catch (err) {
        showToast('Lỗi kiểm tra kết nối: ' + err.message, 'error');
      }
    });

    document.getElementById('btn-purge-local-cache')?.addEventListener('click', async () => {
      if (confirm('Bạn có muốn giải phóng ổ cứng ngay bây giờ không?\nHệ thống sẽ xóa toàn bộ bản sao tệp trên máy tính đối với các tệp đã được đồng bộ an toàn trên Google Drive.')) {
        try {
          showToast('Đang giải phóng dung lượng ổ cứng...', 'info');
          const res = await apiCall('/api/config/drive/purge-local-cache', 'POST');
          showToast(res.message || 'Đã giải phóng ổ cứng thành công!', 'success');
        } catch (err) {
          showToast('Lỗi giải phóng: ' + err.message, 'error');
        }
      }
    });

    document.getElementById('btn-trigger-clean-30d')?.addEventListener('click', async () => {
      if (confirm('Bạn có muốn quét và tự động dọn dẹp các tệp quá hạn 60 ngày trên Cloud Drive và Server ngay bây giờ không?')) {
        try {
          showToast('Đang quét và dọn dẹp tệp cũ 60 ngày...', 'info');
          const res = await apiCall('/api/config/drive/clean-60-days', 'POST');
          showToast(res.message || 'Đã dọn dẹp tệp quá hạn 60 ngày thành công!', 'success');
        } catch (err) {
          showToast('Lỗi dọn dẹp: ' + err.message, 'error');
        }
      }
    });

    document.getElementById('form-drive-config')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const webappUrl = document.getElementById('input-drive-webapp-url')?.value.trim();
      const folderUrl = document.getElementById('input-drive-folder-url')?.value.trim() || DEFAULT_DRIVE_FOLDER;

      localStorage.setItem(STORAGE_KEYS.DRIVE_URL, webappUrl || '');
      localStorage.setItem(STORAGE_KEYS.DRIVE_URL, folderUrl);

      try {
        await apiCall('/api/config/drive', 'POST', {
          webapp_url: webappUrl,
          folder_url: folderUrl
        });
        showToast('Đã lưu cấu hình Google Drive và kích hoạt đồng bộ tự động!', 'success');
      } catch (err) {
        showToast('Đã lưu cấu hình trình duyệt! (Server: ' + err.message + ')', 'info');
      }
      closeModal('modal-drive-config');
    });
  }

  // ==================== DANH BẠ HỌC TẬP (CONTACTS) ====================
  async function loadUsers() {
    try {
      const data = await apiCall('/api/users');
      const users = Array.isArray(data) ? data : [];
      AppState.users = users;
      renderContactsList(users);
    } catch (err) {
      console.warn('Lỗi tải danh bạ người dùng:', err);
    }
  }

  async function renderContactsList() {
    const u = AppState.currentUser;
    const container = document.getElementById('contacts-list-container');
    if (!container) return;

    if (u.role === 'guest') {
      container.innerHTML = `
        <div style="text-align:center; padding: 40px; color: var(--text-muted); grid-column: 1 / -1;">
          <i class="fa-solid fa-lock" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
          Vui lòng đăng nhập để xem danh bạ và kết nối bạn bè học tập.
        </div>
      `;
      return;
    }

    try {
      const data = await apiCall(`/api/friends?user_email=${encodeURIComponent(u.email)}`);
      container.innerHTML = '';

      const pendingReceived = data.pending_received || [];
      if (pendingReceived.length > 0) {
        const pendingSection = document.createElement('div');
        pendingSection.style.cssText = 'grid-column: 1 / -1; margin-bottom: 24px;';
        pendingSection.innerHTML = `
          <h4 style="font-size:14px; font-weight:700; color:var(--text-color); margin-bottom:12px; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-user-clock" style="color:#f59e0b;"></i> Lời mời kết bạn đã nhận (${pendingReceived.length})
          </h4>
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">
            ${pendingReceived.map(p => `
              <div class="contact-card" style="border-left: 3px solid #f59e0b;">
                <img src="${p.avatar}" alt="Avatar" class="contact-avatar" onclick="window.EduShare.openUserProfile('${p.email}')" style="cursor:pointer;">
                <div class="contact-info">
                  <div class="contact-name">${p.name}</div>
                  <div class="contact-sub">${p.role_title || p.email}</div>
                </div>
                <div style="display:flex; gap:6px;">
                  <button type="button" class="btn-member-action" style="background:#10b981; color:#fff;" title="Đồng ý" onclick="window.EduShare.respondFriend('${p.email}', 'accept')">
                    <i class="fa-solid fa-check"></i>
                  </button>
                  <button type="button" class="btn-member-action" style="background:#ef4444; color:#fff;" title="Từ chối" onclick="window.EduShare.respondFriend('${p.email}', 'reject')">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `;
        container.appendChild(pendingSection);
      }

      const friends = data.friends || [];
      const friendsSection = document.createElement('div');
      friendsSection.style.cssText = 'grid-column: 1 / -1;';
      friendsSection.innerHTML = `
        <h4 style="font-size:14px; font-weight:700; color:var(--text-color); margin-bottom:12px; display:flex; align-items:center; gap:8px;">
          <i class="fa-solid fa-user-group" style="color:var(--primary);"></i> Danh sách bạn bè (${friends.length})
        </h4>
      `;
      container.appendChild(friendsSection);

      if (friends.length === 0) {
        const emptyNotice = document.createElement('div');
        emptyNotice.style.cssText = 'grid-column: 1 / -1; text-align:center; padding:30px; color:var(--text-muted); font-size:13px;';
        emptyNotice.innerHTML = `
          <i class="fa-solid fa-user-plus" style="font-size:28px; margin-bottom:10px; display:block; opacity:0.6;"></i>
          Bạn chưa có bạn bè nào. Bấm <strong>"Thêm bạn mới"</strong> hoặc tìm bằng Gmail để gửi lời mời kết bạn!
        `;
        container.appendChild(emptyNotice);
      } else {
        friends.forEach(f => {
          const card = document.createElement('div');
          card.className = 'contact-card';
          card.innerHTML = `
            <img src="${f.avatar}" alt="Avatar" class="contact-avatar" onclick="window.EduShare.openUserProfile('${f.email}')" style="cursor:pointer;">
            <div class="contact-info" onclick="window.EduShare.openUserProfile('${f.email}')" style="cursor:pointer;">
              <div class="contact-name">${f.name}</div>
              <div class="contact-sub">${f.role_title || f.email}</div>
            </div>
            <button class="btn-msg-contact" onclick="window.EduShare.startDirectChat('${f.email}', '${f.name}')" title="Nhắn tin riêng 1-1">
              <i class="fa-solid fa-comment-dots"></i> Nhắn tin
            </button>
          `;
          container.appendChild(card);
        });
      }
    } catch (err) {
      console.warn('Lỗi tải danh bạ:', err);
    }
  }

  function initContactsEvents() {
    document.getElementById('contacts-search-input')?.addEventListener('input', (e) => {
      renderAddFriendResults(e.target.value.trim());
    });

    document.getElementById('btn-contacts-add-friend')?.addEventListener('click', () => {
      openModal('modal-add-friend');
      renderAddFriendResults();
    });

    document.getElementById('btn-open-add-friend')?.addEventListener('click', () => {
      openModal('modal-add-friend');
      renderAddFriendResults();
    });

    document.getElementById('input-search-new-friend')?.addEventListener('input', (e) => {
      renderAddFriendResults(e.target.value.trim());
    });

    document.getElementById('btn-back-contacts-sidebar')?.addEventListener('click', () => {
      document.getElementById('sidebar-column')?.classList.remove('sidebar-mobile-hidden');
    });
  }

  async function renderAddFriendResults(query = '') {
    const container = document.getElementById('add-friend-results-container');
    if (!container) return;

    const q = (query || document.getElementById('input-search-new-friend')?.value || '').trim().toLowerCase();
    const myEmail = (AppState.currentUser.email || '').toLowerCase();

    if (!q) {
      container.innerHTML = `
        <div style="text-align:center; padding: 25px 12px; color: var(--text-muted); font-size: 13px;">
          <i class="fa-solid fa-envelope" style="font-size:24px; margin-bottom:8px; opacity:0.6; display:block;"></i>
          Nhập địa chỉ Gmail chính xác của bạn bè để gửi lời mời kết bạn an toàn.
        </div>
      `;
      return;
    }

    try {
      const res = await apiCall(`/api/users/find?email=${encodeURIComponent(q)}&current_user=${encodeURIComponent(myEmail)}`);
      container.innerHTML = `
        <div class="contact-card" style="margin-top: 8px;">
          <img src="${res.avatar}" class="contact-avatar" alt="Avatar">
          <div class="contact-card-info">
            <div class="contact-card-name" title="${escapeHtml(res.name)}">${escapeHtml(res.name)}</div>
            <div class="contact-card-role" title="${escapeHtml(res.email)}">${escapeHtml(res.role_title || res.email)}</div>
          </div>
          <div class="contact-card-actions">
            ${res.friendship_status === 'self' ? `<span style="font-size:12px; color:var(--text-muted);">Là bạn</span>` :
              res.friendship_status === 'accepted' ? `<button type="button" class="btn-primary-small" onclick="window.EduShare.startDirectChat('${res.email}', '${escapeHtml(res.name)}')"><i class="fa-solid fa-comment-dots"></i> Nhắn tin</button>` :
              res.friendship_status === 'pending_sent' ? `<span style="font-size:12px; color:#f59e0b; font-weight:600;"><i class="fa-solid fa-clock"></i> Đã gửi lời mời</span>` :
              res.friendship_status === 'pending_received' ? `<button type="button" class="btn-primary-small" style="background:#10b981; color:#fff;" onclick="window.EduShare.respondFriend('${res.email}', 'accept')"><i class="fa-solid fa-check"></i> Đồng ý</button>` :
              `<button type="button" class="btn-primary-small" onclick="window.EduShare.sendFriendRequest('${res.email}')"><i class="fa-solid fa-user-plus"></i> Kết bạn</button>`
            }
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div style="text-align:center; padding: 20px; color: var(--text-muted); font-size: 13px;">
          Không tìm thấy người dùng với Gmail '${q}'. Vui lòng kiểm tra lại địa chỉ Gmail.
        </div>
      `;
    }
  }

  // ==================== ĐIỀU HƯỚNG TAB CHÍNH ====================
  function switchMainTab(tab) {
    // Đóng khung công cụ (context menu) và các popover khi chuyển tab chính
    const cmenu = document.getElementById('chat-context-menu');
    if (cmenu) cmenu.style.display = 'none';
    const popover = document.getElementById('pinned-dropdown-popover');
    if (popover) popover.style.display = 'none';
    const mentionPopup = document.getElementById('chat-mention-popup');
    if (mentionPopup) mentionPopup.style.display = 'none';
    const emojiPicker = document.getElementById('emoji-picker-popover');
    if (emojiPicker) emojiPicker.style.display = 'none';
    if (isMultiSelectMode) endMultiSelectMode();

    AppState.activeTab = tab;

    document.querySelectorAll('.nav-items .nav-btn').forEach(btn => {
      if (btn.dataset.tab === tab) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    document.querySelectorAll('.viewport-section').forEach(sec => {
      sec.style.display = 'none';
    });

    const targetSec = document.getElementById(`view-${tab}`);
    if (targetSec) targetSec.style.display = 'flex';

    if (tab === 'chat') {
      loadMessages(AppState.activeRoomId);
    } else if (tab === 'forum') {
      if (!window.__forumHasLoadedOnce) {
        window.__forumHasLoadedOnce = true;
        loadPosts();
      } else {
        // Giữ nguyên trạng thái và khôi phục vị trí cuộn trang (Item 11)
        setTimeout(() => {
          const scrollEl = document.getElementById('view-forum')?.querySelector('.forum-scroll-area') || document.getElementById('posts-feed-container');
          if (scrollEl && window.__forumScrollTop) {
            scrollEl.scrollTop = window.__forumScrollTop;
          }
        }, 50);
      }
    } else if (tab === 'vault') {
      loadDocuments();
    } else if (tab === 'contacts') {
      loadUsers();
    }

    if (window.innerWidth <= 768) {
      document.getElementById('sidebar-column')?.classList.add('sidebar-mobile-hidden');
    }
  }

  function initNavRailEvents() {
    document.querySelectorAll('.nav-items .nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = btn.dataset.tab;
        if (tab === 'geochalk') {
          e.preventDefault();
          e.stopPropagation();
          openGeoChalkModal();
          return;
        }
        switchMainTab(tab);
      });
    });
  }

  // ==================== LIGHTBOX XEM TRƯỚC TÀI LIỆU & HÌNH ẢNH ====================
  let activePreviewFileObj = null;

  function openFilePreview(title, type, size, contentOrUrl, attachmentObj = null) {
    activePreviewFileObj = { title, type, size, content: contentOrUrl, attachment: attachmentObj };
    const modalTitle = document.getElementById('preview-modal-title');
    const modalContent = document.getElementById('preview-modal-content');
    const modalSize = document.getElementById('preview-file-size');

    const meta = getFileIconMeta(type);
    if (modalTitle) modalTitle.innerHTML = `<i class="fa-solid ${meta.icon} ${meta.colorClass}"></i> ${title}`;
    if (modalSize) modalSize.textContent = `Dung lượng: ${size || '1.5 MB'}`;

    if (modalContent) {
      if (type === 'image' && contentOrUrl) {
        modalContent.innerHTML = `<img src="${contentOrUrl}" alt="Preview" style="max-width:100%; max-height:55vh; border-radius:10px; box-shadow:var(--shadow-md);">`;
      } else {
        modalContent.innerHTML = `
          <div style="padding: 24px 10px;">
            <i class="fa-solid ${meta.icon} doc-file-icon ${meta.colorClass}" style="font-size: 64px; margin-bottom: 16px;"></i>
            <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">${title}</h4>
            <p style="font-size: 13px; color: var(--text-muted); max-width: 420px; margin: 0 auto 16px;">
              Tài liệu học tập chính thức đã được mã hóa an toàn trên máy chủ đám mây 60 ngày. Bấm nút bên dưới để tải trực tiếp về thiết bị của bạn.
            </p>
          </div>
        `;
      }
    }

    openModal('modal-image-preview');
  }

  // ==================== TẢI HÌNH ẢNH TRỰC TIẾP VỀ MÁY TÍNH / ĐIỆN THOẠI ====================
  function triggerBlobDownload(blob, filename) {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
    showToast(`Đã lưu tệp '${filename}' về máy!`, 'success');
  }

  async function copyImageBinaryToClipboard(attachment) {
    if (!attachment) return;
    try {
      let imgSrc = attachment.file_base64;
      if (!imgSrc && attachment.doc_id) {
        imgSrc = `/api/docs/${encodeURIComponent(attachment.doc_id)}/download`;
      } else if (!imgSrc && attachment.drive_url) {
        imgSrc = attachment.drive_url;
      }
      if (!imgSrc) throw new Error('Không có nguồn dữ liệu ảnh');

      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Không thể tải ảnh để sao chép'));
        img.src = imgSrc;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!pngBlob) throw new Error('Lỗi chuyển đổi PNG blob');

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob })
      ]);
      showToast('Đã sao chép dữ liệu ảnh vào bộ nhớ tạm (Có thể dán Ctrl+V để sử dụng)!', 'success');
    } catch (err) {
      console.warn('Lỗi copy binary image:', err);
      try {
        await navigator.clipboard.writeText(attachment.drive_url || attachment.title || '');
        showToast('Đã sao chép liên kết ảnh vào bộ nhớ tạm.', 'info');
      } catch (_) {
        showToast('Không thể truy cập Clipboard trên trình duyệt này.', 'error');
      }
    }
  }

  async function downloadImageDirect(att) {
    if (!att) return;
    const filename = att.title || `image_${Date.now()}.png`;

    // 1. Tải bằng Blob từ chuỗi Data URL Base64
    if (att.file_base64 && att.file_base64.startsWith('data:')) {
      try {
        const parts = att.file_base64.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = (mimeMatch && mimeMatch[1]) || att.mime_type || 'image/png';
        const byteCharacters = atob(parts[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });
        triggerBlobDownload(blob, filename);
        return;
      } catch (err) {
        console.warn('Lỗi tạo Blob ảnh:', err);
      }
    }

    // 2. Nếu có doc_id, tải trực tiếp blob từ server
    if (att.doc_id) {
      try {
        const response = await fetch(`/api/docs/${encodeURIComponent(att.doc_id)}/download`);
        if (response.ok) {
          const blob = await response.blob();
          triggerBlobDownload(blob, filename);
          return;
        }
      } catch (e) {
        console.warn('Fetch image doc error:', e);
      }
    }

    // 3. Fallback: virtual anchor download (không mở tab mới trống)
    const dlUrl = att.drive_download_url || att.drive_url || (att.doc_id ? `/api/docs/${encodeURIComponent(att.doc_id)}/download` : '');
    if (dlUrl) {
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`Đang tải ảnh: ${filename}`, 'info');
      return;
    }
    showToast('Không thể tải tệp hình ảnh này.', 'error');
  }

  function initPreviewEvents() {
    document.getElementById('btn-preview-share-action')?.addEventListener('click', () => {
      if (activePreviewFileObj) {
        const sharePayload = {
          text: activePreviewFileObj.title || '',
          attachment: activePreviewFileObj.attachment || activePreviewFileObj
        };
        openShareMessageModal(sharePayload);
      }
    });

    document.getElementById('btn-preview-download-action')?.addEventListener('click', () => {
      if (activePreviewFileObj) {
        if (activePreviewFileObj.type === 'image' || (activePreviewFileObj.type || '').includes('image')) {
          downloadImageDirect(activePreviewFileObj.attachment || activePreviewFileObj);
        } else {
          downloadDocumentDirect(activePreviewFileObj.attachment?.doc_id || activePreviewFileObj.title, activePreviewFileObj.title);
        }
      }
    });
  }

  // ==================== TẢI TÀI LIỆU XUỐNG MÁY TÍNH ====================
  async function downloadDocumentDirect(docId, title) {
    const filename = title || 'tai-lieu-edushare.pdf';

    // 1. Nếu có tệp xem trước ảnh dạng data URI
    if (activePreviewFileObj && activePreviewFileObj.content && activePreviewFileObj.content.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = activePreviewFileObj.content;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`Đang tải tệp: ${filename}`, 'success');
      return;
    }

    // 2. Tìm trong tin nhắn hiện tại xem có file_base64 không
    const curMsgWithDoc = (AppState.messages || []).find(m => m.attachment && m.attachment.doc_id === docId);
    if (curMsgWithDoc && curMsgWithDoc.attachment.file_base64 && curMsgWithDoc.attachment.file_base64.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = curMsgWithDoc.attachment.file_base64;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`Đang tải tệp: ${filename}`, 'success');
      return;
    }

    // 2.5 Tìm trong bài viết bảng tin (posts) xem có file_base64 không
    const curPostWithDoc = (AppState.posts || []).find(p => p.attachment && (p.attachment.doc_id === docId || p.id === docId));
    if (curPostWithDoc && curPostWithDoc.attachment.file_base64 && curPostWithDoc.attachment.file_base64.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = curPostWithDoc.attachment.file_base64;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`Đang tải tệp: ${filename}`, 'success');
      return;
    }

    // 3. Tải tệp nhị phân thực sự (PDF, Word, Excel, Slide) từ Server /api/docs/{doc_id}/download
    try {
      showToast(`Đang tải xuống tệp: ${filename}...`, 'info');
      const response = await fetch(`/api/docs/${encodeURIComponent(docId)}/download`);
      if (!response.ok) {
        throw new Error('Không thể tải tệp từ máy chủ.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Đã tải xuống thành công: ${filename}`, 'success');
    } catch (err) {
      console.warn('Lỗi tải tệp binary:', err);
      window.open(`/api/docs/${encodeURIComponent(docId)}/download`, '_blank');
    }
  }

  // ==================== PUBLIC API EXPOSE FOR HTML HANDLERS ====================
  window.EduShare = {
    // Diễn đàn Bảng tin học sinh (Item 10)
    toggleLike: async (postId) => {
      const u = AppState.currentUser;
      if (u.role === 'guest') {
        showToast('Vui lòng đăng nhập để tương tác bài viết!', 'info');
        openModal('modal-auth');
        return;
      }
      try {
        await apiCall(`/api/posts/${postId}/like`, 'POST', { user_email: u.email });
        loadPosts();
      } catch (err) {
        showToast(err.message || 'Lỗi khi thích bài viết.', 'error');
      }
    },
    likePost: async (postId) => {
      return window.EduShare.toggleLike(postId);
    },
    toggleCommentSection: (postId) => {
      const sec = document.getElementById(`comments-section-${postId}`);
      if (sec) {
        sec.style.display = sec.style.display === 'none' ? 'block' : 'none';
        if (sec.style.display === 'block') {
          document.getElementById(`comment-input-${postId}`)?.focus();
        }
      }
    },
    submitComment: async (postId) => {
      const input = document.getElementById(`comment-input-${postId}`);
      if (!input) return;
      const content = input.value.trim();
      if (!content) return;
      const u = AppState.currentUser;
      if (u.role === 'guest') {
        showToast('Vui lòng đăng nhập để bình luận bài viết!', 'info');
        openModal('modal-auth');
        return;
      }
      try {
        await apiCall(`/api/posts/${postId}/comments`, 'POST', {
          author_email: u.email,
          author_name: u.name,
          avatar: u.avatar,
          content: content
        });
        input.value = '';
        loadPosts();
      } catch (err) {
        showToast(err.message || 'Lỗi khi gửi bình luận.', 'error');
      }
    },
    addComment: async (postId) => {
      return window.EduShare.submitComment(postId);
    },
    openShareModal: (postId) => {
      const p = (AppState.posts || []).find(x => x.id === postId);
      if (p) {
        openShareMessageModal({
          text: `[Chia sẻ từ Diễn đàn] ${p.author_name}: "${p.content}"`,
          attachment: p.attachment || null
        });
      }
    },
    sharePost: (postId) => {
      return window.EduShare.openShareModal(postId);
    },
    copyPostLink: (postId) => {
      copyPostLink(postId);
    },
    scrollToAndHighlightPost: (postId) => {
      scrollToAndHighlightPost(postId);
    },
    retryPost: (postId) => {
      const p = (AppState.posts || []).find(x => x.id === postId);
      if (!p) return;
      p.status = 'posting';
      const cardEl = document.getElementById(`post-card-${postId}`);
      if (cardEl) {
        cardEl.classList.remove('failed');
        cardEl.classList.add('post-card-optimistic');
        const banner = cardEl.querySelector('.post-optimistic-error, .post-optimistic-banner');
        if (banner) {
          banner.className = 'post-optimistic-banner';
          banner.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Đang đăng lại bài viết lên bảng tin...</span>
          `;
        }
      }
      executeCreatePost(p);
    },
    cancelPost: (postId) => {
      AppState.posts = (AppState.posts || []).filter(x => x.id !== postId);
      const cardEl = document.getElementById(`post-card-${postId}`);
      if (cardEl) {
        cardEl.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        cardEl.style.opacity = '0';
        cardEl.style.transform = 'translateY(-10px)';
        setTimeout(() => cardEl.remove(), 250);
      }
      showToast('Đã hủy bài viết tạm thời.', 'info');
    },
    deletePost: async (postId) => {
      const u = AppState.currentUser;
      if (u.role === 'guest') {
        showToast('Vui lòng đăng nhập để thực hiện xóa bài viết!', 'info');
        return;
      }
      if (confirm('Bạn có chắc chắn muốn XÓA bài viết này khỏi bảng tin diễn đàn?')) {
        try {
          const queryParams = `user_id=${encodeURIComponent(u.id || '')}&author_id=${encodeURIComponent(u.id || '')}&user_email=${encodeURIComponent(u.email || '')}`;
          const res = await apiCall(`/api/posts/${postId}?${queryParams}`, 'DELETE');
          showToast(res.message || 'Đã xóa bài viết thành công!', 'success');
          AppState.posts = (AppState.posts || []).filter(p => p.id !== postId);
          const cardEl = document.getElementById(`post-card-${postId}`);
          if (cardEl) {
            cardEl.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            cardEl.style.opacity = '0';
            cardEl.style.transform = 'scale(0.95)';
            setTimeout(() => cardEl.remove(), 250);
          } else {
            loadPosts();
          }
        } catch (err) {
          // Trả về mã lỗi 403 Forbidden kèm "Bạn không có quyền xóa bài viết này"
          showToast(err.message || 'Lỗi khi xóa bài viết.', 'error');
        }
      }
    },
    retrySendMessage: (msgId) => {
      const msg = (AppState.messages || []).find(m => m.id === msgId);
      if (!msg) return;
      msg.status = 'sending';
      const rowEl = document.getElementById(`msg-row-${msgId}`);
      if (rowEl) {
        rowEl.classList.remove('msg-send-failed');
        const statusTag = rowEl.querySelector(`#msg-status-${msgId}`);
        if (statusTag) {
          statusTag.className = 'msg-status-tag status-sending';
          statusTag.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...`;
        }
      }
      executeSendMessage(msg);
    },

    // Biểu cảm tin nhắn (Item 3)
    openReactionModal: (msgId) => {
      openReactionModal(msgId);
    },
    quickReact: (e, msgId) => {
      e.stopPropagation();
      const msg = (AppState.messages || []).find(m => m.id === msgId);
      if (msg) {
        showFloatingReactionBar(e.currentTarget, msg);
      }
    },
    reactToMessage: async (msgId, emoji) => {
      await reactToMessage(msgId, emoji);
    },
    recallMessage: async (msgId) => {
      const u = AppState.currentUser;
      if (confirm('Bạn có chắc chắn muốn THU HỒI tin nhắn này với mọi người không?')) {
        try {
          const res = await apiCall(`/api/messages/${msgId}?user_email=${encodeURIComponent(u.email)}`, 'DELETE');
          showToast(res.message || 'Đã thu hồi tin nhắn thành công!', 'success');
          loadMessages(AppState.activeRoomId);
        } catch (err) {
          showToast(err.message || 'Lỗi khi thu hồi tin nhắn.', 'error');
        }
      }
    },
    downloadDoc: (docId, title) => {
      downloadDocumentDirect(docId, title);
    },
    previewDoc: (title, type, size, contentOrUrl, docId) => {
      let content = contentOrUrl;
      let attObj = null;
      if (!content && docId) {
        const postWithDoc = (AppState.posts || []).find(p => p.attachment && (p.attachment.doc_id === docId || p.id === docId));
        if (postWithDoc && postWithDoc.attachment) {
          attObj = postWithDoc.attachment;
          content = postWithDoc.attachment.file_base64 || postWithDoc.attachment.drive_url;
        } else {
          const msgWithDoc = (AppState.messages || []).find(m => m.attachment && m.attachment.doc_id === docId);
          if (msgWithDoc && msgWithDoc.attachment) {
            attObj = msgWithDoc.attachment;
            content = msgWithDoc.attachment.file_base64 || msgWithDoc.attachment.drive_url;
          }
        }
      }
      openFilePreview(title, type, size, content, attObj || { doc_id: docId, title, file_type: type, file_size: size });
    },
    manageMember: async (action, email) => {
      const u = AppState.currentUser;
      if (action === 'kick') {
        if (!confirm(`Bạn có chắc chắn muốn mời thành viên '${email}' ra khỏi nhóm học tập?`)) {
          return;
        }
      }
      try {
        const res = await apiCall(`/api/rooms/${AppState.activeRoomId}/members/${action}?target_email=${encodeURIComponent(email)}&actor_email=${encodeURIComponent(u.email)}&user_email=${encodeURIComponent(u.email)}`, 'POST');
        showToast(res.message || 'Thao tác thành viên thành công!', 'success');
        await loadRooms();
        const updatedRoom = AppState.rooms.find(r => r.id === AppState.activeRoomId);
        if (updatedRoom) {
          AppState.activeRoomData = updatedRoom;
          renderGroupInfoDrawer(updatedRoom);
          if (activeDetailType === 'members') {
            openDrawerDetail('members', updatedRoom);
          }
        }
      } catch (err) {
        showToast(err.message || 'Lỗi phân quyền thành viên.', 'error');
      }
    },
    downloadMessageImage: (msgId) => {
      const msg = (AppState.messages || []).find(m => m.id === msgId);
      if (msg && msg.attachment) {
        downloadImageDirect(msg.attachment);
      }
    },
    previewMessageImage: (msgId) => {
      const msg = (AppState.messages || []).find(m => m.id === msgId);
      if (msg && msg.attachment) {
        openFilePreview(msg.attachment.title || 'Hình ảnh', 'image', msg.attachment.file_size || '', msg.attachment.file_base64 || msg.attachment.drive_url, msg.attachment);
      }
    },
    copyLink: (url) => {
      copyTextToClipboard(url, `Đã sao chép liên kết: ${url}`);
    },
    startDirectChat: (targetEmail, targetName) => {
      startDirectChat(targetEmail, targetName);
    },
    openUserProfile: (email) => {
      openUserProfile(email);
    },
    sendFriendRequest: async (targetEmail) => {
      const u = AppState.currentUser;
      if (u.role === 'guest') {
        showToast('Vui lòng đăng nhập để kết bạn!', 'info');
        openModal('modal-auth');
        return;
      }
      try {
        const res = await apiCall('/api/friends/request', 'POST', {
          requester_email: u.email,
          receiver_email: targetEmail
        });
        showToast(res.message || 'Đã gửi lời mời kết bạn!', 'success');
        openUserProfile(targetEmail);
        renderContactsList();
      } catch (err) {
        showToast(err.message || 'Lỗi gửi kết bạn.', 'error');
      }
    },
    respondFriend: async (targetEmail, action) => {
      const u = AppState.currentUser;
      try {
        const res = await apiCall('/api/friends/respond', 'POST', {
          user_email: u.email,
          requester_email: targetEmail,
          action: action
        });
        showToast(res.message || 'Thao tác lời mời kết bạn thành công!', 'success');
        closeModal('modal-user-profile-view');
        renderContactsList();
        loadRooms();
        if (action === 'accept' && res.room_id) {
          switchRoom(res.room_id);
        }
      } catch (err) {
        showToast(err.message || 'Lỗi phản hồi kết bạn.', 'error');
      }
    },
    scrollToMessage: (msgId) => {
      scrollToMessage(msgId);
    },
    unpinMessage: (msgId) => {
      unpinMessage(msgId);
    },
    shareDocMessage: (msgId) => {
      const msg = (AppState.messages || []).find(m => m.id === msgId);
      if (msg) openShareMessageModal(msg);
    },
    openCreateGroupWithFriend: (friend) => {
      openCreateGroupWithFriend(friend);
    },
    handleMentionClick: (e, tag) => {
      e.stopPropagation();
      showToast(`Nhắc tên: @${tag}`, 'info');
    },
    openGeoChalk: (projectId) => {
      openGeoChalk(projectId);
    },
    openGeoChalkModal: () => {
      openGeoChalkModal();
    }
  };
  // Clean EduShare namespace

  // ==================== TÍCH HỢP HÌNH HỌC GEOCHALK 3D ====================
  function openGeoChalkModal() {
    openModal('modal-geochalk');
  }

  async function openGeoChalk(projectId = null) {
    const targetBase = window.GEOCHALK_URL || 'https://math.vn-ai.cloud/geochalk/geochalk.html';
    const user = AppState.currentUser;

    // Nếu là khách vãng lai hoặc chưa đăng nhập, mở trực tiếp GeoChalk để trải nghiệm ngay
    if (!user || user.role === 'guest' || !user.email) {
      let destUrl = targetBase;
      if (projectId) {
        const sep = destUrl.includes('?') ? '&' : '?';
        destUrl = `${destUrl}${sep}project_id=${encodeURIComponent(projectId)}`;
      }
      window.open(destUrl, '_blank');
      closeModal('modal-geochalk');
      return;
    }

    try {
      showToast('Đang kết nối GeoChalk bằng tài khoản EduShare...', 'info');
      const ssoRes = await apiCall('/api/sso/create-token', 'POST', {
        user_id: user.id || ('u_' + Date.now()),
        email: user.email
      });

      if (ssoRes.status === 'success' && ssoRes.redirect_url) {
        let targetUrl = ssoRes.redirect_url;
        if (projectId) {
          const sep = targetUrl.includes('?') ? '&' : '?';
          targetUrl = `${targetUrl}${sep}project_id=${encodeURIComponent(projectId)}`;
        }
        window.open(targetUrl, '_blank');
        closeModal('modal-geochalk');
      } else {
        throw new Error(ssoRes.detail || 'Không thể tạo phiên đăng nhập GeoChalk');
      }
    } catch (err) {
      console.warn('Lỗi SSO GeoChalk:', err);
      let fallbackUrl = targetBase;
      if (projectId) {
        const sep = fallbackUrl.includes('?') ? '&' : '?';
        fallbackUrl = `${fallbackUrl}${sep}project_id=${encodeURIComponent(projectId)}`;
      }
      window.open(fallbackUrl, '_blank');
      closeModal('modal-geochalk');
    }
  }

  async function handleGeoChalkAttachSubmit() {
    const title = document.getElementById('geochalk-attach-title')?.value.trim();
    const projectId = document.getElementById('geochalk-attach-id')?.value.trim();
    const previewUrl = document.getElementById('geochalk-attach-preview')?.value.trim();

    if (!title && !projectId) {
      showToast('Vui lòng nhập tiêu đề hoặc mã dự án GeoChalk!', 'warning');
      return;
    }

    if (!AppState.activeRoomId) {
      showToast('Vui lòng chọn một phòng chat để đính kèm bản vẽ!', 'warning');
      return;
    }

    const payloadAttachment = {
      type: 'geochalk_project',
      project_id: projectId || `proj_${Date.now()}`,
      title: title || 'Dự án Hình Học Không Gian',
      preview_url: previewUrl || ''
    };

    const user = AppState.currentUser || {};
    const payload = {
      room_id: AppState.activeRoomId,
      sender_email: user.email || 'thanhvien@edushare.vn',
      sender_name: user.name || 'Thành viên',
      sender_role: user.roleTitle || user.role || 'Thành viên',
      sender_avatar: user.avatar || '',
      text: `Chia sẻ bản vẽ GeoChalk 3D: ${payloadAttachment.title}`,
      attachment: payloadAttachment
    };

    try {
      await apiCall(`/api/rooms/${AppState.activeRoomId}/messages`, 'POST', payload);
      closeModal('modal-geochalk');
      const tInput = document.getElementById('geochalk-attach-title');
      const idInput = document.getElementById('geochalk-attach-id');
      const prevInput = document.getElementById('geochalk-attach-preview');
      if (tInput) tInput.value = '';
      if (idInput) idInput.value = '';
      if (prevInput) prevInput.value = '';

      loadMessages(AppState.activeRoomId);
      loadRooms();
      showToast('Đã đính kèm bản vẽ GeoChalk vào phòng chat!', 'success');
    } catch (err) {
      showToast(err.message || 'Lỗi gửi đính kèm GeoChalk', 'error');
    }
  }

  function initGeoChalkSystem() {
    document.getElementById('btn-open-geochalk')?.addEventListener('click', (e) => {
      e.preventDefault();
      openGeoChalkModal();
    });

    document.getElementById('btn-open-geochalk-header')?.addEventListener('click', () => {
      openGeoChalkModal();
    });

    document.getElementById('btn-open-geochalk-composer')?.addEventListener('click', () => {
      openGeoChalkModal();
    });

    document.getElementById('btn-geochalk-launch')?.addEventListener('click', () => {
      openGeoChalk();
    });

    document.getElementById('btn-geochalk-attach-submit')?.addEventListener('click', () => {
      handleGeoChalkAttachSubmit();
    });

    window.GEOCHALK_URL = 'https://math.vn-ai.cloud/geochalk/geochalk.html';
    apiCall('/api/geochalk/config')
      .then(cfg => {
        if (cfg && cfg.geochalk_url) {
          window.GEOCHALK_URL = cfg.geochalk_url;
        }
      })
      .catch(e => console.warn('Không tải được cấu hình GeoChalk:', e));
  }

  // ==================== KẾT NỐI REAL-TIME WEBSOCKET (FASTAPI NATIVE WEBSOCKETS) ====================
  let wsClient = null;
  let wsReconnectTimeout = null;
  let wsPingInterval = null;
  let isWsConnecting = false;
  const wsSendQueue = [];

  function sendWsMessage(payload) {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      try {
        wsClient.send(raw);
      } catch (err) {
        console.warn('[WS] Lỗi gửi dữ liệu socket:', err);
      }
    } else {
      // Lưu vào hàng đợi để gửi ngay khi kết nối thành công
      wsSendQueue.push(raw);
    }
  }

  function initWebSocket() {
    if (isWsConnecting) return;
    if (wsClient && (wsClient.readyState === WebSocket.OPEN || wsClient.readyState === WebSocket.CONNECTING)) {
      sendWsMessage({
        type: 'join_room',
        room_id: AppState.activeRoomId,
        user_email: (AppState.currentUser?.email || '').trim().toLowerCase()
      });
      return;
    }

    try {
      isWsConnecting = true;
      let protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let host = window.location.host;
      if (!host || host === '' || window.location.protocol === 'file:') {
        host = 'localhost:5500';
        protocol = 'ws:';
      }
      const userEmail = (AppState.currentUser?.email || '').trim().toLowerCase();
      const roomId = AppState.activeRoomId || 'room_community';
      const wsUrl = `${protocol}//${host}/ws?user_email=${encodeURIComponent(userEmail)}&room_id=${encodeURIComponent(roomId)}`;

      wsClient = new WebSocket(wsUrl);

      wsClient.onopen = () => {
        isWsConnecting = false;
        console.log('[*] WebSocket kết nối thành công:', wsUrl);
        const curUserEmail = (AppState.currentUser?.email || '').trim().toLowerCase();
        if (curUserEmail) {
          sendWsMessage({
            type: 'set_user',
            user_email: curUserEmail
          });
        }
        sendWsMessage({
          type: 'join_room',
          room_id: AppState.activeRoomId,
          user_email: curUserEmail
        });

        // Xả toàn bộ gói tin trong hàng đợi còn tồn đọng
        while (wsSendQueue.length > 0) {
          const item = wsSendQueue.shift();
          try { wsClient.send(item); } catch (_) {}
        }

        // Bù đắp ngay toàn bộ tin nhắn bị lỡ trong lúc mất kết nối
        if (AppState.activeRoomId && AppState.activeTab === 'chat') {
          syncActiveRoomMessages(true);
        }
        loadRooms();

        if (wsPingInterval) clearInterval(wsPingInterval);
        wsPingInterval = setInterval(() => {
          sendWsMessage({ type: 'ping' });
        }, 15000);
      };

      wsClient.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (err) {
          console.warn('[WS] Lỗi parse dữ liệu nhận được:', err);
        }
      };

      wsClient.onclose = () => {
        isWsConnecting = false;
        if (wsPingInterval) clearInterval(wsPingInterval);
        scheduleWsReconnect();
      };

      wsClient.onerror = (err) => {
        isWsConnecting = false;
        console.warn('[WS] Lỗi kết nối WebSocket:', err);
        try { wsClient.close(); } catch (_) {}
      };
    } catch (err) {
      isWsConnecting = false;
      console.warn('[WS] Không thể khởi tạo WebSocket:', err);
      scheduleWsReconnect();
    }
  }

  function scheduleWsReconnect() {
    if (wsReconnectTimeout) clearTimeout(wsReconnectTimeout);
    wsReconnectTimeout = setTimeout(() => {
      initWebSocket();
    }, 2500);
  }

  function handleWebSocketMessage(data) {
    if (!data || !data.type) return;

    try {
      switch (data.type) {
        case 'pong':
          break;

        case 'new_message': {
          const msg = data.message;
          const targetRoomId = data.room_id || msg.room_id;
          if (!msg) break;

          // Cập nhật thông tin phòng trong danh sách sidebar
          const room = (AppState.rooms || []).find(r => r.id === targetRoomId);
          if (room) {
            room.last_message = {
              text: msg.text || (msg.attachment ? '[Tệp tin đính kèm]' : ''),
              created_at: msg.created_at || new Date().toISOString()
            };
            room.last_time = msg.created_at || new Date().toISOString();
            if (targetRoomId !== AppState.activeRoomId) {
              room.unread_count = (room.unread_count || 0) + 1;
            }
            renderRoomsList();
          }

          // Nếu tin nhắn thuộc phòng chat đang mở trên màn hình
          if (targetRoomId === AppState.activeRoomId) {
            const currentMyEmail = (AppState.currentUser?.email || '').trim().toLowerCase();
            const senderEmail = (msg.sender_email || '').trim().toLowerCase();
            const isSenderMe = Boolean(currentMyEmail && senderEmail && currentMyEmail === senderEmail);

            // Kiểm tra xem tin nhắn với real ID này đã được render chưa
            const existingRealRow = document.getElementById(`msg-row-${msg.id}`);
            if (existingRealRow) {
              existingRealRow.classList.remove('msg-send-failed');
              break;
            }

            // Kiểm tra đối soát Optimistic UI nếu người gửi là chính mình
            let matchedTempMsg = null;
            if (isSenderMe && AppState.messages) {
              matchedTempMsg = AppState.messages.find(m =>
                m.id && String(m.id).startsWith('temp_msg_') &&
                m.room_id === targetRoomId &&
                m.text === msg.text
              );
            }

            if (matchedTempMsg) {
              reconcileOptimisticMessage(msg, matchedTempMsg.id);
            } else {
              // Tin nhắn từ User B hoặc thiết bị khác: render ngay và tự động cuộn
              appendIncomingRealtimeMessage(msg);
            }
          }
          break;
        }

      case 'message_recalled': {
        const msgId = data.message_id;
        const targetRoomId = data.room_id;
        if (targetRoomId === AppState.activeRoomId) {
          const rowEl = document.getElementById(`msg-row-${msgId}`);
          if (rowEl) {
            const bubble = rowEl.querySelector('.msg-text-bubble') || rowEl.querySelector('.msg-bubble');
            if (bubble) {
              bubble.innerHTML = '<span class="msg-recalled-text" style="font-style: italic; opacity: 0.7;"><i class="fa-solid fa-rotate-left" style="font-size: 11px; margin-right: 4px;"></i> Tin nhắn đã được thu hồi</span>';
            }
            const attachBox = rowEl.querySelector('.msg-attachment-box');
            if (attachBox) attachBox.remove();
            const recallBtn = rowEl.querySelector('.btn-msg-recall');
            if (recallBtn) recallBtn.remove();
            const reactBtn = rowEl.querySelector('.msg-quick-react-btn');
            if (reactBtn) reactBtn.remove();
            const reactBadge = rowEl.querySelector('.msg-reaction-badge');
            if (reactBadge) reactBadge.remove();
          }
          if (AppState.messages) {
            const m = AppState.messages.find(item => item.id === msgId);
            if (m) {
              m.recalled = true;
              m.text = 'Tin nhắn đã được thu hồi';
              m.attachment = null;
            }
          }
        }
        break;
      }

      case 'reaction_updated': {
        const msgId = data.message_id;
        const targetRoomId = data.room_id;
        if (targetRoomId === AppState.activeRoomId && AppState.messages) {
          const targetMsg = AppState.messages.find(m => m.id === msgId);
          if (targetMsg) {
            targetMsg.reactions = data.reactions || [];
            renderMessages(AppState.messages);
          }
        }
        break;
      }

      case 'new_post': {
        const post = data.post;
        if (!post || !post.id) break;
        if (!AppState.posts) AppState.posts = [];
        if (!AppState.posts.some(p => p.id === post.id)) {
          AppState.posts.unshift(post);
          if (AppState.activeTab === 'forum') {
            const container = document.getElementById('posts-feed-container');
            if (container) {
              const emptyNotice = container.querySelector('div[style*="text-align:center"]');
              if (emptyNotice) emptyNotice.remove();
              const card = buildPostCardElement(post);
              card.style.animation = 'slideInDown 0.35s ease';
              container.insertBefore(card, container.firstChild);
            }
          }
        }
        break;
      }

      case 'post_deleted': {
        const postId = data.post_id;
        if (!postId) break;
        if (AppState.posts) {
          AppState.posts = AppState.posts.filter(p => p.id !== postId);
        }
        const cardEl = document.getElementById(`post-card-${postId}`);
        if (cardEl) {
          cardEl.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
          cardEl.style.opacity = '0';
          cardEl.style.transform = 'scale(0.96)';
          setTimeout(() => cardEl.remove(), 250);
        }
        break;
      }

      case 'user_profile_updated': {
        const u = data.user;
        if (!u || !u.email) break;
        // Đồng bộ ảnh đại diện và thông tin trên toàn bộ giao diện theo thời gian thực
        syncUserAvatarAcrossUI(u.email, u.name, u.avatar, u.subInfo || u.sub_info);
        break;
      }
    }
  } catch (err) {
    console.warn('[WS] Lỗi xử lý gói tin socket:', err);
  }
}

  function appendIncomingRealtimeMessage(msg) {
    if (!msg || !msg.id) return;
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    // Tránh render trùng lặp nếu tin nhắn đã xuất hiện trên giao diện
    const existing = document.getElementById(`msg-row-${msg.id}`);
    if (existing) {
      existing.classList.remove('msg-send-failed');
      return;
    }

    if (!AppState.messages) AppState.messages = [];
    if (!AppState.messages.some(m => m.id === msg.id)) {
      AppState.messages.push(msg);
    }

    const myEmail = (AppState.currentUser?.email || '').toLowerCase();
    const msgDate = parseServerDate(msg.created_at);
    const targetLabel = getDateDividerLabel(msgDate);

    const dividers = container.querySelectorAll('.chat-date-divider');
    let hasDateDivider = false;
    dividers.forEach(d => {
      if (d.textContent && (d.textContent.includes('Hôm nay') || d.textContent.includes(targetLabel))) {
        hasDateDivider = true;
      }
    });
    if (!hasDateDivider && dividers.length === 0) {
      const divider = document.createElement('div');
      divider.className = 'chat-date-divider';
      divider.innerHTML = `<span>${targetLabel}</span>`;
      container.appendChild(divider);
    }

    const row = buildMessageRowElement(msg, myEmail);
    container.appendChild(row);

    // Tự động cuộn mượt xuống tin nhắn mới nhất
    container.scrollTop = container.scrollHeight;
  }

  // ==================== CƠ CHẾ ĐỒNG BỘ TIN NHẮN TỰ ĐỘNG (SMART ACTIVE ROOM SYNC) ====================
  let activeRoomSyncInterval = null;
  let isSyncingActiveRoom = false;

  async function syncActiveRoomMessages(forceScroll = false) {
    const roomId = AppState.activeRoomId;
    if (!roomId || AppState.activeTab !== 'chat') return;
    if (isSyncingActiveRoom) return;

    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    try {
      isSyncingActiveRoom = true;
      const myEmail = encodeURIComponent(AppState.currentUser?.email || '');
      const data = await apiCall(`/api/rooms/${roomId}/messages?user_email=${myEmail}`);
      const serverMsgs = Array.isArray(data) ? data : [];
      if (!serverMsgs.length) {
        isSyncingActiveRoom = false;
        return;
      }

      const localMsgs = AppState.messages || [];
      let hasNewMsg = false;

      // Tính khoảng cách tới đáy để quyết định tự động cuộn
      const isNearBottom = (container.scrollHeight - container.scrollTop - container.clientHeight) < 180;

      for (const sMsg of serverMsgs) {
        const inDom = document.getElementById(`msg-row-${sMsg.id}`);
        if (!inDom) {
          // Bỏ qua nếu là tin nhắn chính mình đang gửi tạm (Optimistic)
          const isMySendingTemp = localMsgs.some(m =>
            m.id && String(m.id).startsWith('temp_msg_') &&
            m.text === sMsg.text &&
            (m.sender_email || '').toLowerCase() === (sMsg.sender_email || '').toLowerCase()
          );

          if (!isMySendingTemp) {
            hasNewMsg = true;
            appendIncomingRealtimeMessage(sMsg);
          }
        } else {
          // Cập nhật trạng thái thu hồi nếu đối phương vừa thu hồi
          if (sMsg.is_recalled && !inDom.querySelector('.msg-recalled-text')) {
            const bubble = inDom.querySelector('.msg-text-bubble') || inDom.querySelector('.msg-bubble');
            if (bubble) {
              bubble.innerHTML = '<span class="msg-recalled-text" style="font-style: italic; opacity: 0.7;"><i class="fa-solid fa-rotate-left" style="font-size: 11px; margin-right: 4px;"></i> Tin nhắn đã được thu hồi</span>';
            }
            inDom.querySelector('.msg-attachment-box')?.remove();
            inDom.querySelector('.btn-msg-recall')?.remove();
            inDom.querySelector('.msg-quick-react-btn')?.remove();
            inDom.querySelector('.msg-reaction-badge')?.remove();
          }
        }
      }

      if (hasNewMsg && (isNearBottom || forceScroll)) {
        container.scrollTop = container.scrollHeight;
      }
    } catch (_) {
      // Yên lặng khi có lỗi mạng tạm thời
    } finally {
      isSyncingActiveRoom = false;
    }
  }

  function startActiveRoomSync() {
    if (activeRoomSyncInterval) clearInterval(activeRoomSyncInterval);
    // Polling thông minh mỗi 1.5s phòng vệ tuyệt đối khi mạng WebSocket bị rớt/chập chờn
    activeRoomSyncInterval = setInterval(() => {
      if (AppState.activeTab === 'chat' && AppState.activeRoomId && !document.hidden) {
        syncActiveRoomMessages(false);
      }
    }, 1500);

    // Bắt ngay khi người dùng chuyển lại tab (Focus)
    window.addEventListener('focus', () => {
      if (AppState.activeTab === 'chat' && AppState.activeRoomId) {
        syncActiveRoomMessages(true);
        loadRooms();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (AppState.activeTab === 'chat' && AppState.activeRoomId) {
          syncActiveRoomMessages(true);
          loadRooms();
        }
      }
    });
  }

  function reconcileOptimisticMessage(realMsg, tempId) {
    const realId = realMsg.id || realMsg.message_id;
    const rowEl = document.getElementById(`msg-row-${tempId}`) || document.getElementById(`msg-row-${realId}`);
    if (rowEl) {
      rowEl.id = `msg-row-${realId}`;
      rowEl.setAttribute('data-msg-id', realId);
      rowEl.classList.remove('msg-send-failed');

      // Gán lại contextmenu với ID thật
      rowEl.oncontextmenu = (e) => handleMessageContextMenu(e, realMsg);

      const timestampCol = rowEl.querySelector('.msg-timestamp');
      if (timestampCol) {
        timestampCol.setAttribute('title', formatFullMsgTime(realMsg.created_at));
        timestampCol.innerHTML = `
          <span>${formatMsgTime(realMsg.created_at)}</span>
          <button type="button" class="msg-quick-react-btn" title="Thả biểu cảm" onclick="event.stopPropagation(); window.EduShare.quickReact(event, '${realId}')" onpointerdown="event.stopPropagation()" ontouchstart="event.stopPropagation()"><i class="fa-regular fa-face-smile"></i></button>
          <button type="button" class="btn-msg-recall" title="Thu hồi tin nhắn này với mọi người" onclick="window.EduShare.recallMessage('${realId}')"><i class="fa-solid fa-rotate-left"></i> Thu hồi</button>
        `;
      }
    }

    if (AppState.messages) {
      const idx = AppState.messages.findIndex(m => m.id === tempId || m.id === realId);
      if (idx !== -1) {
        AppState.messages[idx] = { ...AppState.messages[idx], ...realMsg, id: realId, status: 'sent' };
      }
    }
  }

  // ==================== KHỞI CHẠY ỨNG DỤNG ====================
  function initApp() {
    const tasks = [
      ['Theme', initTheme],
      ['User', loadSavedUser],
      ['Modals', initModals],
      ['Auth', initAuthSystem],
      ['Profile', initProfileSystem],
      ['Group', initGroupCreationAndJoin],
      ['Chat', initChatEvents],
      ['GeoChalk', initGeoChalkSystem],
      ['Forum', initForumEvents],
      ['Vault', initVaultEvents],
      ['Contacts', initContactsEvents],
      ['NavRail', initNavRailEvents],
      ['Preview', initPreviewEvents],
      ['ReactionBar', initReactionBarEvents]
    ];
    tasks.forEach(([name, fn]) => {
      try {
        fn();
      } catch (err) {
        console.error(`[Init ${name} Error]:`, err);
      }
    });

    try { loadRooms(); } catch (e) { console.error(e); }
    try { loadPosts(); } catch (e) { console.error(e); }
    try { loadDocuments(); } catch (e) { console.error(e); }
    try { loadUsers(); } catch (e) { console.error(e); }
    try { initWebSocket(); } catch (e) { console.error(e); }
    try { startActiveRoomSync(); } catch (e) { console.error(e); }
    try { checkDeepLinking(); } catch (e) { console.error(e); }
    window.addEventListener('popstate', checkDeepLinking);

    console.log('[*] EduShare Web App đã khởi chạy thành công!');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
