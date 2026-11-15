import json

with open('final_tree_data.json', 'r', encoding='utf-8') as f:
    toc_data = json.load(f)

json_str = json.dumps(toc_data, ensure_ascii=False)

html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  <title>Tài liệu Toán THPT - Thầy Lê Trung Kiên</title>

  <!-- PDF.js library -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf_viewer.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>

  <style>
    :root {{
      --sidebar-width: 340px;
      --bg-dark: #1e2022;
      --bg-sidebar: #282a2d;
      --bg-hover: rgba(255, 255, 255, 0.08);
      --bg-active: rgba(138, 180, 248, 0.22);
      --text-main: #f1f3f4;
      --text-muted: #9aa0a6;
      --text-accent: #8ab4f8;
      --border-color: #3c4043;
      --header-bg: #323639;
      --viewer-bg: #525659;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }}

    html, body {{
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--viewer-bg);
      color: var(--text-main);
      display: flex;
    }}

    /* Sidebar Drawer */
    #sidebar {{
      width: var(--sidebar-width);
      min-width: 260px;
      max-width: 550px;
      height: 100%;
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      user-select: none;
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      z-index: 1000;
    }}

    #sidebar.collapsed {{
      margin-left: calc(-1 * var(--sidebar-width));
    }}

    /* Backdrop on Mobile */
    #sidebarBackdrop {{
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(2px);
      z-index: 999;
      opacity: 0;
      transition: opacity 0.25s ease;
    }}

    #sidebarBackdrop.visible {{
      display: block;
      opacity: 1;
    }}

    /* Sidebar Header */
    .sidebar-header {{
      padding: 12px 14px;
      background: var(--header-bg);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }}

    .brand-row {{
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}

    .brand-title {{
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text-accent);
      letter-spacing: 0.3px;
    }}

    .brand-title svg {{
      width: 20px;
      height: 20px;
      fill: currentColor;
      flex-shrink: 0;
    }}

    .close-drawer-btn {{
      display: none;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
    }}

    .close-drawer-btn:hover {{
      color: #fff;
      background: var(--bg-hover);
    }}

    .search-box {{
      position: relative;
      width: 100%;
    }}

    .search-box input {{
      width: 100%;
      height: 34px;
      background: var(--bg-dark);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 0 10px 0 34px;
      color: var(--text-main);
      font-size: 13.5px;
      outline: none;
      transition: border-color 0.2s;
    }}

    .search-box input:focus {{
      border-color: var(--text-accent);
    }}

    .search-box svg {{
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      fill: var(--text-muted);
    }}

    .sidebar-actions {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-muted);
      padding-top: 2px;
    }}

    .action-btn {{
      background: transparent;
      border: none;
      color: var(--text-accent);
      cursor: pointer;
      font-size: 12px;
      padding: 3px 6px;
      border-radius: 3px;
    }}

    .action-btn:hover {{
      background: var(--bg-hover);
      text-decoration: underline;
    }}

    /* Tree View */
    .tree-container {{
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 8px 6px;
      -webkit-overflow-scrolling: touch;
    }}

    /* Root Node */
    .tree-root {{
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 10px;
      background: rgba(0, 0, 0, 0.25);
      border-radius: 6px;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #e8eaed;
      border: 1px solid var(--border-color);
      cursor: pointer;
    }}

    .tree-root:hover {{
      background: rgba(0, 0, 0, 0.4);
    }}

    /* 1st Gen: Major Section */
    .tree-section {{
      margin-bottom: 3px;
    }}

    .tree-section-header {{
      display: flex;
      align-items: center;
      padding: 9px 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12.5px;
      font-weight: 700;
      color: #e8eaed;
      transition: background-color 0.15s;
      gap: 6px;
    }}

    .tree-section-header:hover {{
      background: var(--bg-hover);
      color: var(--text-accent);
    }}

    .chevron {{
      width: 18px;
      height: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--text-muted);
      transition: transform 0.2s ease;
    }}

    .tree-section.open > .tree-section-header .chevron {{
      transform: rotate(90deg);
      color: var(--text-accent);
    }}

    .section-title-text {{
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }}

    .section-badge {{
      font-size: 11px;
      font-weight: 400;
      color: var(--text-muted);
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 7px;
      border-radius: 10px;
      flex-shrink: 0;
    }}

    /* 2nd Gen: Sub items container */
    .tree-sub-list {{
      display: none;
      padding-left: 18px;
      position: relative;
      margin-left: 8px;
      border-left: 1px dashed rgba(255, 255, 255, 0.16);
    }}

    .tree-section.open > .tree-sub-list {{
      display: block;
    }}

    .tree-item {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 8px;
      margin: 2px 0;
      border-radius: 4px;
      font-size: 12.5px;
      color: #bdc1c6;
      cursor: pointer;
      text-decoration: none;
      line-height: 1.35;
      gap: 8px;
      position: relative;
      transition: all 0.12s;
    }}

    .tree-item::before {{
      content: "";
      position: absolute;
      left: -18px;
      top: 50%;
      width: 12px;
      height: 1px;
      background: rgba(255, 255, 255, 0.16);
    }}

    .tree-item:hover {{
      background: var(--bg-hover);
      color: var(--text-main);
    }}

    .tree-item.active {{
      background: var(--bg-active);
      color: var(--text-accent);
      font-weight: 600;
    }}

    .item-text {{
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }}

    .page-tag {{
      font-size: 11px;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
      flex-shrink: 0;
    }}

    .tree-item.active .page-tag {{
      color: var(--text-accent);
      border-color: rgba(138, 180, 248, 0.35);
      background: rgba(138, 180, 248, 0.1);
    }}

    /* Splitter / Resizer bar */
    #resizer {{
      width: 4px;
      height: 100%;
      background: transparent;
      cursor: col-resize;
      z-index: 30;
      flex-shrink: 0;
      transition: background-color 0.2s;
    }}

    #resizer:hover, #resizer.dragging {{
      background: var(--text-accent);
    }}

    /* Main Content Area */
    #mainContent {{
      flex: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--viewer-bg);
      position: relative;
    }}

    /* Top Bar */
    #topBar {{
      height: 44px;
      min-height: 44px;
      background: var(--header-bg);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      user-select: none;
      z-index: 10;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }}

    .top-left {{
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 1;
      overflow: hidden;
    }}

    .toggle-sidebar-btn {{
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      height: 32px;
      padding: 0 10px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      outline: none;
      transition: all 0.15s;
      flex-shrink: 0;
      font-size: 13px;
      font-weight: 600;
    }}

    .toggle-sidebar-btn:hover, .toggle-sidebar-btn:active {{
      background: var(--bg-hover);
      border-color: var(--text-accent);
      color: var(--text-accent);
    }}

    .current-topic {{
      font-size: 13px;
      color: #e8eaed;
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      overflow: hidden;
    }}

    #activeTitle {{
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text-accent);
      font-weight: 600;
    }}

    .top-right {{
      display: flex;
      align-items: center;
      gap: 5px;
      flex-shrink: 0;
    }}

    .nav-btn {{
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-main);
      width: 30px;
      height: 30px;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      outline: none;
      transition: background-color 0.15s;
    }}

    .nav-btn:hover {{
      background: var(--bg-hover);
      border-color: var(--text-accent);
    }}

    .jump-input {{
      width: 48px;
      height: 28px;
      background: var(--bg-dark);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      text-align: right;
      padding: 0 6px;
      font-size: 13px;
      border-radius: 4px;
      outline: none;
    }}

    .jump-input:focus {{
      border-color: var(--text-accent);
    }}

    /* Viewer Container */
    #viewerContainer {{
      flex: 1;
      width: 100%;
      height: calc(100% - 44px);
      overflow: auto;
      background: var(--viewer-bg);
      -webkit-overflow-scrolling: touch;
      position: relative;
    }}

    /* Native Iframe: Perfect for PC desktop file:/// with zero CORS errors */
    #pdfFrame {{
      width: 100%;
      height: 100%;
      border: none;
      display: none;
      background: #525659;
    }}

    /* Mobile Canvas Wrapper */
    #pageWrapper {{
      display: none;
      flex-direction: column;
      align-items: center;
      padding: 12px 0 40px 0;
      min-height: 100%;
    }}

    .pdf-canvas-card {{
      background: white;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      margin: 6px auto;
      border-radius: 2px;
      max-width: 98%;
      display: block;
      touch-action: pan-y pinch-zoom;
    }}

    /* Floating Table of Contents button on mobile */
    #mobileFabBtn {{
      display: none;
      position: fixed;
      left: 18px;
      bottom: 22px;
      height: 46px;
      padding: 0 18px;
      border-radius: 23px;
      background: #1a73e8;
      color: white;
      border: none;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.55);
      font-size: 14px;
      font-weight: 700;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      z-index: 500;
      transition: transform 0.15s, background 0.15s;
    }}

    #mobileFabBtn:active {{
      transform: scale(0.94);
      background: #1557b0;
    }}

    /* Mobile File Picker Card (when phone browser blocks file:// fetch) */
    #mobilePickerCard {{
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 40px 20px;
      padding: 24px 20px;
      background: var(--bg-sidebar);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      gap: 16px;
    }}

    .picker-btn {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #1a73e8;
      color: white;
      padding: 12px 24px;
      border-radius: 24px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      box-shadow: 0 4px 12px rgba(26, 115, 232, 0.4);
    }}

    .picker-btn:active {{
      background: #1557b0;
    }}

    /* Loading Spinner */
    #loadingOverlay {{
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--viewer-bg);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 800;
      gap: 12px;
    }}

    .spinner {{
      width: 38px;
      height: 38px;
      border: 3.5px solid rgba(255, 255, 255, 0.15);
      border-top-color: var(--text-accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }}

    @keyframes spin {{
      to {{ transform: rotate(360deg); }}
    }}

    /* Mobile Responsive */
    @media (max-width: 768px) {{
      #resizer {{
        display: none;
      }}

      #sidebar {{
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        width: 86vw;
        max-width: 340px;
        transform: translateX(-100%);
        margin-left: 0 !important;
        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.65);
      }}

      #sidebar.mobile-open {{
        transform: translateX(0);
      }}

      .close-drawer-btn {{
        display: flex;
      }}

      .toggle-sidebar-btn {{
        background: transparent;
        border: none;
        padding: 0 4px;
      }}

      .toggle-sidebar-btn .btn-text {{
        display: none;
      }}

      .current-topic {{
        font-size: 12.5px;
      }}

      #mobileFabBtn {{
        display: flex;
      }}

      #pageWrapper {{
        padding: 6px 0 75px 0;
      }}
    }}
  </style>
</head>
<body>

  <!-- Nền tối mờ phía sau khi mở menu trên Điện thoại -->
  <div id="sidebarBackdrop"></div>

  <!-- Sidebar: Cây thư mục mục lục (Gốc -> Đề mục lớn -> Đề mục nhỏ) -->
  <aside id="sidebar" class="collapsed">
    <div class="sidebar-header">
      <div class="brand-row">
        <div class="brand-title">
          <svg viewBox="0 0 24 24">
            <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/>
          </svg>
          <span>MỤC LỤC TOÁN THPT</span>
        </div>
        <button class="close-drawer-btn" id="closeDrawerBtn" title="Đóng mục lục">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <div class="search-box">
        <svg viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input type="text" id="filterInput" placeholder="Tìm đề mục hoặc số trang...">
      </div>

      <div class="sidebar-actions">
        <span id="statsText">73 chuyên đề • 510 mục</span>
        <div>
          <button class="action-btn" id="expandAllBtn">Mở hết</button> •
          <button class="action-btn" id="collapseAllBtn">Đóng hết</button>
        </div>
      </div>
    </div>

    <!-- Tree Structure -->
    <div class="tree-container" id="treeContainer">
      <!-- Gốc cây (Website root) -->
      <div class="tree-root" id="rootItem" title="Bấm để về đầu tài liệu">
        <span>🌐</span>
        <span>Toán THPT - Thầy Lê Trung Kiên</span>
      </div>

      <!-- Danh sách đề mục lớn (hệ con thứ nhất) & đề mục nhỏ (hệ con thứ hai) -->
      <div id="treeList"></div>
    </div>
  </aside>

  <!-- Kéo thả kích thước sidebar (chỉ hiển thị trên desktop) -->
  <div id="resizer"></div>

  <!-- Khung hiển thị PDF chính (Tương thích 100% điện thoại và máy tính) -->
  <main id="mainContent">
    <div id="topBar">
      <div class="top-left">
        <button class="toggle-sidebar-btn" id="toggleSidebarBtn" title="Hiện mục lục">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
          <span class="btn-text">Mục lục</span>
        </button>
        <div class="current-topic" id="currentTopicLabel">
          <span id="activeTitle">Trang 7</span>
        </div>
      </div>

      <div class="top-right">
        <!-- Zoom controls -->
        <button class="nav-btn" id="zoomOutBtn" title="Thu nhỏ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>
        </button>
        <button class="nav-btn" id="zoomInBtn" title="Phóng to">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        </button>

        <!-- Navigation buttons -->
        <button class="nav-btn" id="prevPageBtn" title="Trang trước">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
        <input type="number" class="jump-input" id="directPageInput" value="7" min="1" max="388">
        <span style="font-size: 13px; color: var(--text-muted);">/ 388</span>
        <button class="nav-btn" id="nextPageBtn" title="Trang sau">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </button>
      </div>
    </div>

    <!-- Container hiển thị PDF -->
    <div id="viewerContainer">
      <!-- 1. Native Iframe: Tuyệt đối không lỗi CORS trên PC khi mở file:/// -->
      <iframe id="pdfFrame" src="tom-tat-toan-bo-kien-thuc-mon-toan-bac-thpt-le-trung-kien.pdf#page=7"></iframe>

      <!-- 2. Mobile Canvas: Vẽ trực tiếp lên màn hình điện thoại -->
      <div id="pageWrapper">
        <canvas id="pdfCanvas" class="pdf-canvas-card"></canvas>
      </div>

      <!-- 3. Thẻ chọn file khi mở trên điện thoại qua file:// -->
      <div id="mobilePickerCard">
        <div style="font-size: 32px;">📱</div>
        <div style="font-size: 15px; font-weight: 600; color: #fff;">Chế độ xem trên Điện Thoại</div>
        <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5;">
          Trình duyệt điện thoại chặn tự động đọc file qua giao thức nội bộ. Vui lòng bấm nút bên dưới và chọn file sách <strong>tom-tat-toan-bo-kien-thuc-mon-toan-bac-thpt-le-trung-kien.pdf</strong> một lần duy nhất:
        </p>
        <label class="picker-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
          </svg>
          <span>Chọn file PDF để mở</span>
          <input type="file" id="pdfFileInput" accept="application/pdf" style="display: none;">
        </label>
      </div>

      <div id="loadingOverlay">
        <div class="spinner"></div>
        <div id="loadingText" style="font-size: 13.5px; color: var(--text-muted);">Đang mở tài liệu...</div>
      </div>
    </div>
  </main>

  <!-- Nút mở mục lục nổi trên điện thoại (Floating button) -->
  <button id="mobileFabBtn" title="Bấm để mở bảng mục lục">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
    </svg>
    <span>Mục lục</span>
  </button>

  <script>
    // Cấu hình PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const PDF_URL = 'tom-tat-toan-bo-kien-thuc-mon-toan-bac-thpt-le-trung-kien.pdf';

    // Dữ liệu cây mục lục 2 cấp
    const TREE_DATA = {json_str};

    let pdfDoc = null;
    let currentPageNum = 7;
    let pageRendering = false;
    let pageNumPending = null;
    let activeItemElement = null;
    let zoomScaleFactor = 1.0;
    let useIframeMode = false;

    const pdfFrame = document.getElementById('pdfFrame');
    const pageWrapper = document.getElementById('pageWrapper');
    const canvas = document.getElementById('pdfCanvas');
    const ctx = canvas.getContext('2d');
    const viewerContainer = document.getElementById('viewerContainer');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    const mobilePickerCard = document.getElementById('mobilePickerCard');
    const pdfFileInput = document.getElementById('pdfFileInput');

    const treeList = document.getElementById('treeList');
    const filterInput = document.getElementById('filterInput');
    const activeTitle = document.getElementById('activeTitle');
    const directPageInput = document.getElementById('directPageInput');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const mobileFabBtn = document.getElementById('mobileFabBtn');
    const expandAllBtn = document.getElementById('expandAllBtn');
    const collapseAllBtn = document.getElementById('collapseAllBtn');
    const rootItem = document.getElementById('rootItem');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');

    // Nhận biết thiết bị di động
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

    // Chuyển sang chế độ Iframe Native (Dành cho máy tính PC, không bao giờ bị lỗi CORS trên file:///)
    function activateIframeMode(page) {{
      useIframeMode = true;
      pdfFrame.style.display = 'block';
      pageWrapper.style.display = 'none';
      mobilePickerCard.style.display = 'none';
      loadingOverlay.style.display = 'none';
      zoomInBtn.style.display = 'none';
      zoomOutBtn.style.display = 'none';
      pdfFrame.src = `${{PDF_URL}}?p=${{page}}#page=${{page}}`;
    }}

    // Chuyển sang chế độ Canvas (Dành cho điện thoại)
    function activateCanvasMode() {{
      useIframeMode = false;
      pdfFrame.style.display = 'none';
      pageWrapper.style.display = 'flex';
      mobilePickerCard.style.display = 'none';
      zoomInBtn.style.display = 'flex';
      zoomOutBtn.style.display = 'flex';
    }}

    // Nạp PDF từ mảng bytes (ArrayBuffer)
    async function loadPdfFromData(dataBuffer) {{
      try {{
        loadingOverlay.style.display = 'flex';
        loadingText.textContent = 'Đang nạp dữ liệu sách...';

        const loadingTask = pdfjsLib.getDocument({{ data: dataBuffer }});
        pdfDoc = await loadingTask.promise;
        directPageInput.max = pdfDoc.numPages;

        loadingOverlay.style.display = 'none';
        activateCanvasMode();
        renderPage(currentPageNum);
      }} catch (e) {{
        console.error('Lỗi đọc PDF từ data:', e);
        activateIframeMode(currentPageNum);
      }}
    }}

    // Nạp PDF tự động
    async function initDocumentViewer() {{
      // Nếu là Desktop PC: Dùng trực tiếp Iframe (Hoạt động hoàn hảo 100% trên PC, không bị chặn CORS)
      if (!isMobileDevice) {{
        activateIframeMode(currentPageNum);
        return;
      }}

      // Nếu là Điện thoại: Thử nạp qua PDF.js để vẽ Canvas
      try {{
        loadingOverlay.style.display = 'flex';
        loadingText.textContent = 'Đang mở tài liệu...';

        const loadingTask = pdfjsLib.getDocument({{
          url: PDF_URL,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true
        }});

        pdfDoc = await loadingTask.promise;
        directPageInput.max = pdfDoc.numPages;

        loadingOverlay.style.display = 'none';
        activateCanvasMode();
        renderPage(currentPageNum);
      }} catch (err) {{
        // Nếu điện thoại mở qua file:/// bị chặn CORS: Hiện thẻ chọn file 1 chạm
        console.warn('CORS blocked on mobile file://, showing picker card');
        loadingOverlay.style.display = 'none';
        pageWrapper.style.display = 'none';
        mobilePickerCard.style.display = 'flex';
      }}
    }}

    // Xử lý khi người dùng chọn file PDF trên điện thoại
    pdfFileInput.addEventListener('change', (e) => {{
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {{
        loadPdfFromData(evt.target.result);
      }};
      reader.readAsArrayBuffer(file);
    }});

    // Hàm render 1 trang PDF lên canvas theo đúng độ rộng màn hình
    async function renderPage(num) {{
      if (useIframeMode || !pdfDoc) return;
      pageRendering = true;
      try {{
        const page = await pdfDoc.getPage(num);

        const containerWidth = viewerContainer.clientWidth - 16;
        const unscaledViewport = page.getViewport({{ scale: 1.0 }});
        const baseScale = Math.max(containerWidth / unscaledViewport.width, 0.4);
        const finalScale = baseScale * zoomScaleFactor;
        const viewport = page.getViewport({{ scale: finalScale }});

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {{
          canvasContext: ctx,
          transform: transform,
          viewport: viewport
        }};

        await page.render(renderContext).promise;
        pageRendering = false;

        if (pageNumPending !== null) {{
          renderPage(pageNumPending);
          pageNumPending = null;
        }}

        viewerContainer.scrollTop = 0;
      }} catch (e) {{
        pageRendering = false;
        console.error(e);
      }}

      directPageInput.value = num;
    }}

    function queueRenderPage(num) {{
      if (pageRendering) {{
        pageNumPending = num;
      }} else {{
        renderPage(num);
      }}
    }}

    // Hàm chuyển trang và đóng drawer nếu đang ở trên mobile
    function jumpToPage(page, title) {{
      if (!page || page < 1 || (pdfDoc && page > pdfDoc.numPages)) return;
      currentPageNum = page;
      directPageInput.value = page;

      if (title) {{
        activeTitle.textContent = `${{title}} (Trang ${{page}})`;
      }} else {{
        activeTitle.textContent = `Trang ${{page}}`;
      }}

      if (useIframeMode) {{
        pdfFrame.src = `${{PDF_URL}}?p=${{page}}#page=${{page}}`;
      }} else {{
        queueRenderPage(currentPageNum);
      }}

      if (window.innerWidth <= 768) {{
        closeMobileSidebar();
      }}
    }}

    // Điều khiển Sidebar trên Mobile
    function openMobileSidebar() {{
      sidebar.classList.add('mobile-open');
      sidebar.classList.remove('collapsed');
      sidebarBackdrop.classList.add('visible');
    }}

    function closeMobileSidebar() {{
      sidebar.classList.remove('mobile-open');
      sidebar.classList.add('collapsed');
      sidebarBackdrop.classList.remove('visible');
    }}

    function toggleSidebar() {{
      if (window.innerWidth <= 768) {{
        if (sidebar.classList.contains('mobile-open')) {{
          closeMobileSidebar();
        }} else {{
          openMobileSidebar();
        }}
      }} else {{
        sidebar.classList.toggle('collapsed');
      }}
    }}

    toggleSidebarBtn.addEventListener('click', toggleSidebar);
    mobileFabBtn.addEventListener('click', openMobileSidebar);
    closeDrawerBtn.addEventListener('click', closeMobileSidebar);
    sidebarBackdrop.addEventListener('click', closeMobileSidebar);

    // Zoom buttons
    zoomInBtn.addEventListener('click', () => {{
      zoomScaleFactor = Math.min(zoomScaleFactor + 0.25, 3.0);
      renderPage(currentPageNum);
    }});

    zoomOutBtn.addEventListener('click', () => {{
      zoomScaleFactor = Math.max(zoomScaleFactor - 0.25, 0.75);
      renderPage(currentPageNum);
    }});

    // Vuốt màn hình điện thoại (Swipe Gesture) để lật trang
    let touchStartX = 0;
    let touchStartY = 0;

    viewerContainer.addEventListener('touchstart', (e) => {{
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }}, {{ passive: true }});

    viewerContainer.addEventListener('touchend', (e) => {{
      const diffX = e.changedTouches[0].screenX - touchStartX;
      const diffY = e.changedTouches[0].screenY - touchStartY;
      if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {{
        if (diffX < 0) {{
          if (currentPageNum < 388) jumpToPage(currentPageNum + 1);
        }} else {{
          if (currentPageNum > 1) jumpToPage(currentPageNum - 1);
        }}
      }}
    }}, {{ passive: true }});

    // Xây dựng cây mục lục:
    // Gốc: Trang web
    // Con cấp 1: Đề mục lớn (Click sổ xuống / thu gọn)
    // Con cấp 2: Đề mục nhỏ (Click nhảy ngay trang đó)
    function renderTree(data) {{
      treeList.innerHTML = '';

      data.forEach((sec, sIdx) => {{
        const secDiv = document.createElement('div');
        secDiv.className = 'tree-section';
        secDiv.dataset.index = sIdx;

        // Header đề mục lớn (Thế hệ con thứ nhất)
        const header = document.createElement('div');
        header.className = 'tree-section-header';
        header.innerHTML = `
          <span class="chevron">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
            </svg>
          </span>
          <span class="section-title-text" title="${{sec.title}}">${{sec.title}}</span>
          <span class="section-badge">${{sec.items.length}} mục</span>
        `;

        header.addEventListener('click', () => {{
          secDiv.classList.toggle('open');
        }});

        // Danh sách mục nhỏ (Thế hệ con thứ hai)
        const subList = document.createElement('div');
        subList.className = 'tree-sub-list';

        sec.items.forEach(item => {{
          const itemLink = document.createElement('div');
          itemLink.className = 'tree-item';
          itemLink.dataset.page = item.page;
          itemLink.innerHTML = `
            <span class="item-text" title="${{item.title}}">${{item.title}}</span>
            <span class="page-tag">Tr. ${{item.page}}</span>
          `;

          // Khi bấm vào mục nhỏ: Nhảy trực tiếp đến trang đó
          itemLink.addEventListener('click', (e) => {{
            e.stopPropagation();
            if (activeItemElement) {{
              activeItemElement.classList.remove('active');
            }}
            itemLink.classList.add('active');
            activeItemElement = itemLink;

            jumpToPage(item.page, item.title);
          }});

          subList.appendChild(itemLink);
        }});

        secDiv.appendChild(header);
        secDiv.appendChild(subList);
        treeList.appendChild(secDiv);
      }});
    }}

    // Về trang bìa khi bấm gốc cây
    rootItem.addEventListener('click', () => {{
      jumpToPage(1, 'Trang bìa');
    }});

    // Tìm kiếm nhanh đề mục
    filterInput.addEventListener('input', (e) => {{
      const q = e.target.value.toLowerCase().trim();
      const sections = treeList.querySelectorAll('.tree-section');

      sections.forEach(secEl => {{
        const sIdx = secEl.dataset.index;
        const secData = TREE_DATA[sIdx];
        const secMatches = secData.title.toLowerCase().includes(q);

        let hasMatchingChild = false;
        const items = secEl.querySelectorAll('.tree-item');

        items.forEach((itemEl, iIdx) => {{
          const itemData = secData.items[iIdx];
          const itemMatches = itemData.title.toLowerCase().includes(q) || String(itemData.page) === q;

          if (itemMatches || !q) {{
            itemEl.style.display = 'flex';
            if (itemMatches) hasMatchingChild = true;
          }} else {{
            itemEl.style.display = 'none';
          }}
        }});

        if (!q) {{
          secEl.style.display = 'block';
          secEl.classList.remove('open');
        }} else if (secMatches || hasMatchingChild) {{
          secEl.style.display = 'block';
          secEl.classList.add('open');
        }} else {{
          secEl.style.display = 'none';
        }}
      }});
    }});

    // Nút mở hết / đóng hết
    expandAllBtn.addEventListener('click', () => {{
      document.querySelectorAll('.tree-section').forEach(s => s.classList.add('open'));
    }});

    collapseAllBtn.addEventListener('click', () => {{
      document.querySelectorAll('.tree-section').forEach(s => s.classList.remove('open'));
    }});

    // Nút trang trước / trang sau
    prevPageBtn.addEventListener('click', () => {{
      if (currentPageNum > 1) {{
        jumpToPage(currentPageNum - 1);
      }}
    }});

    nextPageBtn.addEventListener('click', () => {{
      if (currentPageNum < 388) {{
        jumpToPage(currentPageNum + 1);
      }}
    }});

    // Nhập số trang trực tiếp
    directPageInput.addEventListener('keydown', (e) => {{
      if (e.key === 'Enter') {{
        const p = parseInt(directPageInput.value);
        if (p >= 1 && p <= 388) {{
          jumpToPage(p);
        }}
      }}
    }});

    // Kéo giãn độ rộng sidebar trên desktop
    const resizer = document.getElementById('resizer');
    let isResizing = false;

    resizer.addEventListener('mousedown', () => {{
      isResizing = true;
      resizer.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
    }});

    document.addEventListener('mousemove', (e) => {{
      if (!isResizing) return;
      const newWidth = Math.max(260, Math.min(e.clientX, 600));
      sidebar.style.width = newWidth + 'px';
      document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
    }});

    document.addEventListener('mouseup', () => {{
      if (isResizing) {{
        isResizing = false;
        resizer.classList.remove('dragging');
        document.body.style.cursor = '';
      }}
    }});

    // Tự động vẽ lại theo kích thước màn hình khi xoay điện thoại
    let resizeTimer;
    window.addEventListener('resize', () => {{
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {{
        if (pdfDoc && !useIframeMode) renderPage(currentPageNum);
      }}, 200);
    }});

    // Khởi tạo cây mục lục
    renderTree(TREE_DATA);

    // Mở sidebar trên Desktop lúc khởi tạo, ẩn trên Mobile
    if (window.innerWidth > 768) {{
      sidebar.classList.remove('collapsed');
      if (treeList.children.length > 0) {{
        treeList.children[0].classList.add('open');
      }}
    }}

    // Khởi tạo Viewer
    initDocumentViewer();
  </script>
</body>
</html>
"""

with open('tailieutonghop.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("SUCCESS_FINAL_PERFECT_BUILD")
