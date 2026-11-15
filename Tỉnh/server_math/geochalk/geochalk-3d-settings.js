/**
 * GeoChalk 3D - Tự Động Lưu & Khôi Phục Thiết Lập Giao Diện 3D (LocalStorage)
 * Tích hợp trực tiếp vào Bảng Thiết Lập có sẵn của GeoGebra (Built-in Settings Panel):
 * 1. Tự động lưu LocalStorage: Lắng nghe sự kiện thay đổi từ bảng điều khiển Settings có sẵn
 *    (Lưới, Hệ trục tọa độ, TrucHoanh, TrucTung, TrucZ, Projection, màu sắc...)
 *    và lưu vào localStorage dưới dạng chuỗi JSON ngay khi người dùng tinh chỉnh.
 * 2. Khôi phục trạng thái khi tải trang: Tự động nạp cấu hình từ localStorage và áp dụng vào
 *    không gian 3D khi khởi tạo; nếu lần đầu truy cập thì nạp cấu hình mặc định (Bảng kỹ thuật).
 * 3. Trải nghiệm mượt mà (UX): Tích hợp nút "↺ Khôi phục mặc định" (Reset to Default)
 *    ngay bên trong bảng Thiết lập có sẵn để người dùng xóa dữ liệu lưu trữ khi cần.
 */
(function(window, document) {
    'use strict';

    const STORAGE_KEY = 'geochalk_3d_settings';

    // Cấu hình mặc định chuẩn phong cách Bảng Kỹ Thuật (Chalkboard Green)
    const DEFAULT_CONFIG = {
        version: 1,
        bgColor: '#13382c',          // Màu xanh bảng kỹ thuật
        axesColor: '#ffffff',        // Trục tọa độ màu trắng bạc
        gridColor: '#48b88f',        // Lưới tọa độ màu xanh ngọc sáng rõ
        showAxes: true,              // Hiển thị hệ trục tọa độ
        showXAxis: true,             // Trục Ox (TrucHoanh)
        showYAxis: true,             // Trục Oy (TrucTung)
        showZAxis: true,             // Trục Oz (TrucZ)
        showAxisNumbers: true,       // Hiển thị số đo trên trục
        showGrid: true,              // Hiển thị lưới tọa độ (Lưới)
        gridIsBold: false,           // Lưới nét đậm
        showPlane: true,             // Mặt phẳng xOy
        useLight: true,              // Ánh sáng 3D
        projection: 0                // Kiểu phối cảnh: 0 = Trực giao/Song song, 1 = Xa gần
    };

    let currentConfig = Object.assign({}, DEFAULT_CONFIG);
    let appletApi = null;
    let isInitialized = false;
    let saveDebounceTimer = null;

    /**
     * 1. Đọc cấu hình từ LocalStorage (hoặc trả về mặc định nếu chưa có)
     */
    function loadSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    return Object.assign({}, DEFAULT_CONFIG, parsed);
                }
            }
        } catch (e) {
            console.warn('[GeoChalk3D] Lỗi đọc cấu hình từ localStorage:', e);
        }
        return Object.assign({}, DEFAULT_CONFIG);
    }

    /**
     * 2. Lưu cấu hình hiện tại vào LocalStorage dưới dạng đối tượng JSON
     */
    function saveSettings(config) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
            console.log('[GeoChalk3D] Đã lưu cấu hình giao diện 3D vào LocalStorage:', config);
        } catch (e) {
            console.warn('[GeoChalk3D] Không thể ghi vào localStorage:', e);
        }
    }

    /**
     * 3. Áp dụng cấu hình vào khung nhìn 3D GeoGebra
     */
    function applySettingsTo3D(api, config) {
        const ggb = api || appletApi || window.geoChalkApplet || window.ggbApplet;
        if (!config) config = currentConfig;

        // Đồng bộ màu nền thẻ chứa ngoài cùng ngay lập tức để không bị chớp sáng
        const container = document.getElementById('ggb-element');
        if (container && config.bgColor) {
            container.style.backgroundColor = config.bgColor;
        }

        if (!ggb) return;

        try {
            // Đồng bộ hiển thị hệ trục tọa độ
            if (ggb.setAxesVisible) {
                if (!config.showAxes) {
                    ggb.setAxesVisible(-1, false, false, false);
                } else {
                    ggb.setAxesVisible(
                        -1,
                        !!config.showXAxis,
                        !!config.showYAxis,
                        !!config.showZAxis
                    );
                }
            }

            // Đồng bộ hiển thị lưới
            if (ggb.setGridVisible) {
                ggb.setGridVisible(-1, !!config.showGrid);
            }

            // Áp dụng các tùy chọn đồ họa nâng cao cho khung nhìn 3D (-1)
            if (ggb.setGraphicsOptions) {
                ggb.setGraphicsOptions(-1, {
                    bgColor: config.bgColor,
                    axesColor: config.axesColor,
                    gridColor: config.gridColor,
                    grid: !!config.showGrid,
                    gridIsBold: !!config.gridIsBold,
                    axes: {
                        x: {
                            visible: !!(config.showAxes && config.showXAxis),
                            label: 'x',
                            showNumbers: !!config.showAxisNumbers
                        },
                        y: {
                            visible: !!(config.showAxes && config.showYAxis),
                            label: 'y',
                            showNumbers: !!config.showAxisNumbers
                        },
                        z: {
                            visible: !!(config.showAxes && config.showZAxis),
                            label: 'z',
                            showNumbers: !!config.showAxisNumbers
                        }
                    },
                    plate: !!config.showPlane,
                    light: { val: !!config.useLight },
                    projection: parseInt(config.projection, 10) || 0
                });
            }
        } catch (err) {
            console.warn('[GeoChalk3D] Lỗi áp dụng cấu hình vào 3D View:', err);
        }
    }

    /**
     * 4. Trích xuất thông số giao diện 3D hiện tại từ GeoGebra và bảng Thiết lập có sẵn
     */
    function extractCurrent3DSettings(api) {
        const ggb = api || appletApi || window.geoChalkApplet || window.ggbApplet;
        const result = Object.assign({}, currentConfig);

        // Đọc từ API GeoGebra chính thức
        if (ggb && ggb.getGraphicsOptions) {
            try {
                const opts = ggb.getGraphicsOptions(-1);
                if (opts) {
                    if (opts.bgColor) result.bgColor = opts.bgColor;
                    if (opts.axesColor) result.axesColor = opts.axesColor;
                    if (opts.gridColor) result.gridColor = opts.gridColor;
                    if (opts.grid !== undefined) result.showGrid = !!opts.grid;
                    if (opts.gridIsBold !== undefined) result.gridIsBold = !!opts.gridIsBold;

                    if (opts.axes) {
                        if (opts.axes.x) {
                            result.showXAxis = !!opts.axes.x.visible;
                            if (opts.axes.x.showNumbers !== undefined) {
                                result.showAxisNumbers = !!opts.axes.x.showNumbers;
                            }
                        }
                        if (opts.axes.y) result.showYAxis = !!opts.axes.y.visible;
                        if (opts.axes.z) result.showZAxis = !!opts.axes.z.visible;
                        result.showAxes = !!(result.showXAxis || result.showYAxis || result.showZAxis);
                    }
                }
            } catch (e) {}
        }

        // Đọc trực tiếp từ trạng thái các ô checkbox trong bảng Thiết lập có sẵn nếu đang mở
        try {
            const sideSheet = document.querySelector('.floatingSideSheet, .PropertiesViewW, .propertiesTab');
            if (sideSheet) {
                const rows = sideSheet.querySelectorAll('.expandableList, .checkboxPanel, .materialCheckBoxPanel');
                rows.forEach(row => {
                    const text = (row.textContent || '').trim();
                    const cb = row.querySelector('input[type="checkbox"]');
                    if (!cb) return;

                    if (text.includes('Lưới') || text.includes('Grid')) {
                        result.showGrid = cb.checked;
                    } else if (text.includes('Hệ trục tọa độ') || text.includes('Axes')) {
                        result.showAxes = cb.checked;
                    } else if (text.includes('TrucHoanh') || text.includes('xAxis') || text.includes('Trục hoành')) {
                        result.showXAxis = cb.checked;
                    } else if (text.includes('TrucTung') || text.includes('yAxis') || text.includes('Trục tung')) {
                        result.showYAxis = cb.checked;
                    } else if (text.includes('TrucZ') || text.includes('zAxis') || text.includes('Trục z')) {
                        result.showZAxis = cb.checked;
                    }
                });
            }
        } catch (e) {}

        return result;
    }

    /**
     * Kích hoạt lưu tự động khi có thao tác chỉnh sửa thiết lập
     */
    function triggerAutoSave() {
        if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
        saveDebounceTimer = setTimeout(() => {
            const latest = extractCurrent3DSettings(appletApi);
            currentConfig = latest;
            saveSettings(latest);
        }, 150);
    }

    /**
     * 5. Khôi phục mặc định (Reset to Default)
     * - Xóa dữ liệu trong LocalStorage
     * - Đưa cấu hình về DEFAULT_CONFIG (Bảng kỹ thuật)
     * - Cập nhật lại khung nhìn 3D
     * - Đồng bộ lại các ô checkbox trong bảng Thiết lập có sẵn nếu đang mở
     * - Thông báo toast nổi
     */
    function resetToDefault() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            console.log('[GeoChalk3D] Đã xóa thiết lập tùy chỉnh trong LocalStorage, khôi phục mặc định');
        } catch (e) {}

        currentConfig = Object.assign({}, DEFAULT_CONFIG);
        applySettingsTo3D(appletApi, currentConfig);

        // Đồng bộ lại các checkbox trong bảng Thiết lập có sẵn nếu đang mở
        try {
            const sideSheet = document.querySelector('.floatingSideSheet, .PropertiesViewW, .propertiesTab');
            if (sideSheet) {
                const rows = sideSheet.querySelectorAll('.expandableList, .checkboxPanel, .materialCheckBoxPanel');
                rows.forEach(row => {
                    const text = (row.textContent || '').trim();
                    const cb = row.querySelector('input[type="checkbox"]');
                    if (!cb) return;

                    if (text.includes('Lưới') || text.includes('Grid')) {
                        cb.checked = true;
                    } else if (text.includes('Hệ trục tọa độ') || text.includes('Axes')) {
                        cb.checked = true;
                    } else if (text.includes('TrucHoanh') || text.includes('xAxis') || text.includes('Trục hoành')) {
                        cb.checked = true;
                    } else if (text.includes('TrucTung') || text.includes('yAxis') || text.includes('Trục tung')) {
                        cb.checked = true;
                    } else if (text.includes('TrucZ') || text.includes('zAxis') || text.includes('Trục z')) {
                        cb.checked = true;
                    }
                });
            }
        } catch (e) {}

        showToast('✓ Đã khôi phục thiết lập giao diện 3D mặc định!');
    }

    /**
     * Hiển thị thông báo Toast nhẹ nhàng
     */
    function showToast(msg) {
        let toast = document.getElementById('geochalk-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'geochalk-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                background-color: #0f2b22;
                border: 1px solid #4ade80;
                color: #f0fdf4;
                padding: 10px 18px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
                z-index: 100000;
                opacity: 0;
                pointer-events: none;
                transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
        }, 2600);
    }

    /**
     * 6. Gắn nút "Khôi phục mặc định" (Reset to Default) vào Bảng Thiết Lập có sẵn
     */
    function injectResetButtonIntoNativeSettings() {
        const sideSheet = document.querySelector('.floatingSideSheet, .PropertiesViewW');
        if (!sideSheet) return;

        // Tránh gắn trùng lặp
        if (sideSheet.querySelector('#geochalk-builtin-reset-btn')) return;

        // Tìm vùng tab panel hoặc container danh sách thiết lập
        const targetContainer = sideSheet.querySelector('.tabPanel, .propertiesTab, .contentPanel') || sideSheet;

        const btnContainer = document.createElement('div');
        btnContainer.id = 'geochalk-builtin-reset-container';
        btnContainer.style.cssText = `
            margin: 18px 16px 24px 16px;
            padding-top: 14px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            flex-direction: column;
            gap: 6px;
        `;

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.id = 'geochalk-builtin-reset-btn';
        resetBtn.title = 'Xóa dữ liệu đã lưu trong localStorage và đặt lại toàn bộ về mặc định';
        resetBtn.innerHTML = `
            <span style="font-size: 15px;">↺</span>
            <span>Khôi phục mặc định</span>
        `;
        resetBtn.style.cssText = `
            width: 100%;
            padding: 9px 14px;
            background-color: #fef2f2;
            border: 1px solid #f87171;
            color: #b91c1c;
            border-radius: 8px;
            font-size: 12.5px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.18s ease;
            box-sizing: border-box;
            font-family: inherit;
        `;

        resetBtn.addEventListener('mouseenter', () => {
            resetBtn.style.backgroundColor = '#fee2e2';
            resetBtn.style.borderColor = '#ef4444';
            resetBtn.style.color = '#991b1b';
        });
        resetBtn.addEventListener('mouseleave', () => {
            resetBtn.style.backgroundColor = '#fef2f2';
            resetBtn.style.borderColor = '#f87171';
            resetBtn.style.color = '#b91c1c';
        });

        resetBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            resetToDefault();
        });

        const helpText = document.createElement('div');
        helpText.textContent = 'Đặt lại màu nền, hệ trục và lưới về chuẩn Bảng Kỹ Thuật';
        helpText.style.cssText = 'font-size: 11px; color: #64748b; text-align: center;';

        btnContainer.appendChild(resetBtn);
        btnContainer.appendChild(helpText);
        targetContainer.appendChild(btnContainer);
    }

    /**
     * 7. Gắn nút làm sạch bảng vẽ (clear) trực tiếp vào tab Các công cụ
     */
    function injectClearToolButton() {
        const categoryPanel = document.querySelector('.toolsPanel .categoryPanel, .toolListPanel .categoryPanel');
        if (!categoryPanel || categoryPanel.querySelector('#geochalk-clear-tool-btn')) return;

        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'toolButton geochalk-clear-tool-btn';
        clearBtn.id = 'geochalk-clear-tool-btn';
        clearBtn.setAttribute('aria-label', 'Làm sạch bảng vẽ (Clear)');
        clearBtn.setAttribute('title', 'Làm sạch bảng vẽ (Clear)');
        clearBtn.style.cssText = 'cursor: pointer; position: relative;';

        clearBtn.innerHTML = `
            <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 4px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </div>
            <div class="gwt-Label" style="font-weight: 600; color: #ef4444; text-align: center; width: 100%; display: block; font-size: 11px;">clear</div>
        `;

        clearBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.openNewCanvas === 'function') {
                window.openNewCanvas();
            } else {
                const ggb = appletApi || window.geoChalkApplet || window.ggbApplet;
                let hasObjects = false;
                try {
                    if (ggb && ggb.getAllObjectNames) {
                        hasObjects = ggb.getAllObjectNames().length > 0;
                    }
                } catch (err) {}
                const proceed = !hasObjects || confirm('Bạn có muốn làm sạch bảng vẽ không?');
                if (proceed && ggb && ggb.newConstruction) {
                    try {
                        localStorage.removeItem('geochalk_state_3d');
                        ggb.newConstruction();
                        applySettingsTo3D(ggb);
                        showToast('✓ Đã làm sạch bảng vẽ!');
                    } catch (err) {
                        window.location.reload();
                    }
                }
            }
        });

        categoryPanel.insertBefore(clearBtn, categoryPanel.firstChild);
    }

    /**
     * 8. Lắng nghe các sự kiện từ Bảng Thiết Lập có sẵn và GeoGebra
     */
    function attachListeners() {
        // Lắng nghe trực tiếp các sự kiện change và click trên DOM của bảng thiết lập có sẵn
        const ggbContainer = document.getElementById('ggb-element') || document.body;

        ggbContainer.addEventListener('change', function(e) {
            const target = e.target;
            if (!target) return;
            // Nếu người dùng thao tác trong bảng sideSheet hoặc thuộc tính GeoGebra
            if (target.closest('.floatingSideSheet, .PropertiesViewW, .propertiesTab, .tabPanel')) {
                triggerAutoSave();
            }
        }, true);

        ggbContainer.addEventListener('click', function(e) {
            const target = e.target;
            if (!target) return;
            // Nếu click vào checkbox, mũi tên mở rộng hoặc nút chọn màu trong bảng thiết lập
            if (target.closest('.checkboxPanel, .expandableList, .colorPalette, .dropDown, .comboBox, .headerArrow')) {
                triggerAutoSave();
            }
            // Thử gắn nút Reset nếu bảng Thiết lập vừa mở ra
            setTimeout(injectResetButtonIntoNativeSettings, 80);
            // Thử gắn nút Clear nếu chuyển sang tab Các công cụ
            if (target.closest('.button.tabButton, .toolsPanel, .toolbar')) {
                setTimeout(injectClearToolButton, 80);
            }
        }, true);

        // Quan sát thay đổi DOM để gắn nút Khôi phục mặc định và nút Clear công cụ
        const observer = new MutationObserver(function(mutations) {
            const sideSheet = document.querySelector('.floatingSideSheet, .PropertiesViewW');
            if (sideSheet && !sideSheet.querySelector('#geochalk-builtin-reset-btn')) {
                injectResetButtonIntoNativeSettings();
            }
            const toolsPanel = document.querySelector('.toolsPanel .categoryPanel, .toolListPanel .categoryPanel');
            if (toolsPanel && !toolsPanel.querySelector('#geochalk-clear-tool-btn')) {
                injectClearToolButton();
            }
        });

        observer.observe(ggbContainer, { childList: true, subtree: true });
    }

    /**
     * 9. Khởi tạo toàn diện hệ thống
     */
    function init(api) {
        if (api) appletApi = api;

        // 1. Tải cấu hình từ LocalStorage (hoặc lấy mặc định)
        currentConfig = loadSettings();

        // 2. Lắng nghe sự kiện từ bảng thiết lập có sẵn
        if (!isInitialized) {
            attachListeners();
            isInitialized = true;
        }

        // 3. Đăng ký ClientListener của GeoGebra để phát hiện các thay đổi đồ họa 3D
        if (appletApi && appletApi.registerClientListener) {
            try {
                appletApi.registerClientListener(function(event) {
                    if (!event) return;
                    if (event.type === 'viewChanged3D' || event.type === 'updateStyle' ||
                        event.type === 'setMode' || event.type === 'perspectiveChange') {
                        triggerAutoSave();
                    }
                });
            } catch (e) {}
        }

        // 4. Áp dụng cấu hình đã lưu vào khung nhìn 3D
        applySettingsTo3D(appletApi, currentConfig);

        console.log('[GeoChalk3D] Khởi tạo thành công bộ lưu trữ thiết lập giao diện 3D:', currentConfig);
    }

    // Xuất API công khai
    window.GeoChalk3DSettings = {
        DEFAULT_CONFIG: DEFAULT_CONFIG,
        init: init,
        loadSettings: loadSettings,
        saveSettings: saveSettings,
        applySettingsTo3D: applySettingsTo3D,
        resetToDefault: resetToDefault,
        getConfig: function() { return Object.assign({}, currentConfig); }
    };

})(window, document);
