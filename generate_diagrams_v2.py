import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

# Cài đặt cấu hình Matplotlib chuẩn cho Tiếng Việt
plt.rcParams['font.sans-serif'] = ['Segoe UI', 'Arial', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

def create_hinh1():
    """Hình 1: Sơ đồ tư duy kiến trúc hệ sinh thái Math Hub (Chuẩn Y-Axis, sắc nét)"""
    fig, ax = plt.subplots(figsize=(8.2, 5.8), dpi=300)
    ax.set_facecolor('#F8FAFC')
    fig.patch.set_facecolor('#F8FAFC')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)  # Sửa chính xác trục Y từ 0 đến 100 để không bị lộn ngược
    ax.axis('off')

    # Header
    ax.text(50, 96, "HÌNH 1: SƠ ĐỒ KIẾN TRÚC HỆ SINH THÁI TOÁN HỌC MATH HUB",
            ha='center', va='center', fontsize=13.5, fontweight='bold', color='#0F172A')
    ax.text(50, 92, "Cổng điều hướng trung tâm kết nối 5 phân hệ chuyên sâu & luồng bảo mật đa tầng",
            ha='center', va='center', fontsize=10, fontstyle='italic', color='#475569')

    # Khối trung tâm: CỔNG CHÍNH MATH HUB
    hub_rect = patches.FancyBboxPatch((35, 42), 30, 18, boxstyle="round,pad=1.2,rounding_size=3",
                                      linewidth=2.5, edgecolor='#1E40AF', facecolor='#EFF6FF')
    ax.add_patch(hub_rect)
    ax.text(50, 54.5, "CỔNG CHÍNH MATH HUB", ha='center', va='center', fontsize=12.5, fontweight='bold', color='#1E3A8A')
    ax.text(50, 49, "https://math.vn-ai.cloud", ha='center', va='center', fontsize=10.5, fontweight='bold', color='#2563EB')
    ax.text(50, 44.5, "Điều hướng All-in-One • Tải tĩnh < 1s", ha='center', va='center', fontsize=9.5, color='#1E40AF')

    # Khối 1: EduShare (Trên cùng bên trái)
    edushare = patches.FancyBboxPatch((4, 69), 39, 18, boxstyle="round,pad=0.8,rounding_size=2",
                                      linewidth=2, edgecolor='#0284C7', facecolor='#F0F9FF')
    ax.add_patch(edushare)
    ax.text(23.5, 82.5, "1. EduShare (edushare.vn-ai.cloud)", ha='center', va='center', fontsize=10.5, fontweight='bold', color='#0369A1')
    ax.text(23.5, 77.5, "Mạng xã hội học tập, thảo luận, chia sẻ học liệu", ha='center', va='center', fontsize=9, color='#0F172A')
    # Badge xác thực
    auth_edu = patches.FancyBboxPatch((6, 71), 35, 4.2, boxstyle="round,pad=0.4,rounding_size=1",
                                      linewidth=1.2, edgecolor='#0369A1', facecolor='#E0F2FE')
    ax.add_patch(auth_edu)
    ax.text(23.5, 73.1, "Bảo mật: Gmail + Mã OTP (Chống spam)", ha='center', va='center', fontsize=8.8, fontweight='bold', color='#0C4A6E')

    # Khối 2: GeoChalk (Trên cùng bên phải)
    geochalk = patches.FancyBboxPatch((57, 69), 39, 18, boxstyle="round,pad=0.8,rounding_size=2",
                                      linewidth=2, edgecolor='#059669', facecolor='#ECFDF5')
    ax.add_patch(geochalk)
    ax.text(76.5, 82.5, "2. GeoChalk (Bảng Kỹ Thuật)", ha='center', va='center', fontsize=10.5, fontweight='bold', color='#047857')
    ax.text(76.5, 77.5, "Hình không gian 3D, Phẳng, Đồ thị, Đại số CAS", ha='center', va='center', fontsize=9, color='#0F172A')
    # Badge xác thực
    auth_geo = patches.FancyBboxPatch((59, 71), 35, 4.2, boxstyle="round,pad=0.4,rounding_size=1",
                                      linewidth=1.2, edgecolor='#047857', facecolor='#D1FAE5')
    ax.add_patch(auth_geo)
    ax.text(76.5, 73.1, "Bảo mật: API FastAPI Python (User/Pass)", ha='center', va='center', fontsize=8.8, fontweight='bold', color='#065F46')

    # Khối 3: SMT Vinacal 680EX Plus III (Dưới cùng bên trái)
    smt = patches.FancyBboxPatch((4, 14), 28, 19, boxstyle="round,pad=0.8,rounding_size=2",
                                 linewidth=2, edgecolor='#D97706', facecolor='#FFFBEB')
    ax.add_patch(smt)
    ax.text(18, 28, "3. SMT Vinacal 680EX", ha='center', va='center', fontsize=10.5, fontweight='bold', color='#B45309')
    ax.text(18, 22.8, "Giả lập máy tính khoa học PWA\nChạy Offline 100% không cần mạng", ha='center', va='center', fontsize=8.8, color='#0F172A')
    auth_smt = patches.FancyBboxPatch((6, 15.5), 24, 4.2, boxstyle="round,pad=0.4,rounding_size=1",
                                      linewidth=1, edgecolor='#B45309', facecolor='#FEF3C7')
    ax.add_patch(auth_smt)
    ax.text(18, 17.6, "Không cần tài khoản (0đ)", ha='center', va='center', fontsize=8.5, fontweight='bold', color='#92400E')

    # Khối 4: Hình học 2D Ver 2 (Dưới cùng ở giữa)
    hh2d = patches.FancyBboxPatch((36, 14), 28, 19, boxstyle="round,pad=0.8,rounding_size=2",
                                  linewidth=2, edgecolor='#7C3AED', facecolor='#F5F3FF')
    ax.add_patch(hh2d)
    ax.text(50, 28, "4. Hình Học 2D Ver 2", ha='center', va='center', fontsize=10.5, fontweight='bold', color='#6D28D9')
    ax.text(50, 22.8, "Tách nhánh độc lập từ GeoChalk\nTối ưu vẽ hình phẳng siêu tốc", ha='center', va='center', fontsize=8.8, color='#0F172A')
    auth_hh2d = patches.FancyBboxPatch((38, 15.5), 24, 4.2, boxstyle="round,pad=0.4,rounding_size=1",
                                       linewidth=1, edgecolor='#6D28D9', facecolor='#EDE9FE')
    ax.add_patch(auth_hh2d)
    ax.text(50, 17.6, "Trực tiếp • Mở tức thì", ha='center', va='center', fontsize=8.5, fontweight='bold', color='#5B21B6')

    # Khối 5: Kho Tài Liệu Toán (Dưới cùng bên phải)
    toan = patches.FancyBboxPatch((68, 14), 28, 19, boxstyle="round,pad=0.8,rounding_size=2",
                                  linewidth=2, edgecolor='#BE185D', facecolor='#FDF2F8')
    ax.add_patch(toan)
    ax.text(82, 28, "5. Tài Liệu Toán THPT", ha='center', va='center', fontsize=10.5, fontweight='bold', color='#9D174D')
    ax.text(82, 22.8, "Kho học liệu chuẩn Lớp 10-11-12\nMục lục lọc thông minh PDF", ha='center', va='center', fontsize=8.8, color='#0F172A')
    auth_toan = patches.FancyBboxPatch((70, 15.5), 24, 4.2, boxstyle="round,pad=0.4,rounding_size=1",
                                       linewidth=1, edgecolor='#9D174D', facecolor='#FCE7F3')
    ax.add_patch(auth_toan)
    ax.text(82, 17.6, "Tra cứu 1 chạm miễn phí", ha='center', va='center', fontsize=8.5, fontweight='bold', color='#831843')

    # Đường kết nối mũi tên 2 chiều
    def draw_arrow(x1, y1, x2, y2, color):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="<->", color=color, lw=2, mutation_scale=15))

    draw_arrow(41, 60, 26, 69, '#0284C7')  # Hub -> EduShare
    draw_arrow(59, 60, 74, 69, '#059669')  # Hub -> GeoChalk
    draw_arrow(40, 42, 22, 33, '#D97706')  # Hub -> SMT
    draw_arrow(50, 42, 50, 33, '#7C3AED')  # Hub -> HH2D
    draw_arrow(60, 42, 78, 33, '#BE185D')  # Hub -> Tài liệu

    # Mũi tên liên thông giữa EduShare và GeoChalk
    ax.annotate('', xy=(57, 78), xytext=(43, 78),
                arrowprops=dict(arrowstyle="<->", color="#4338CA", lw=2, ls='--', mutation_scale=14))
    ax.text(50, 81.5, "Liên thông CSDL\n& Giao bài tập", ha='center', va='center', fontsize=8.5, fontweight='bold', color='#4338CA')

    # Chân trang ghi chú
    ax.text(50, 5, "* Toàn bộ hệ sinh thái hoạt động trực tiếp trên nền tảng Web, không cần cài đặt phần mềm",
            ha='center', va='center', fontsize=8.8, color='#64748B')

    plt.tight_layout()
    plt.savefig("hinh1_kien_truc_he_sinh_thai.png", dpi=300, bbox_inches='tight')
    plt.close()
    print("Saved hinh1_kien_truc_he_sinh_thai.png")

def create_hinh2():
    """Hình 2: Sơ đồ chu trình học tập khép kín 4 bước - Layout thoáng đãng, không đè chữ"""
    fig, ax = plt.subplots(figsize=(8.4, 5.8), dpi=300)
    ax.set_facecolor('#F8FAFC')
    fig.patch.set_facecolor('#F8FAFC')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Header
    ax.text(50, 96, "HÌNH 2: SƠ ĐỒ CHU TRÌNH HỌC TẬP TOÁN KHÉP KÍN 4 BƯỚC",
            ha='center', va='center', fontsize=13.5, fontweight='bold', color='#0F172A')
    ax.text(50, 92, "Phương pháp học chủ động: Khám phá lý thuyết → Dựng hình → Kiểm chứng → Thảo luận",
            ha='center', va='center', fontsize=10, fontstyle='italic', color='#475569')

    # Bố trí: Khối trái x=4..41 (w=37), Khối phải x=58..95 (w=37). Khoảng trống giữa = 17 units
    steps = [
        {
            "step": "BƯỚC 1",
            "title": "TRA CỨU & KHÁM PHÁ",
            "tool": "Kho Tài Liệu Toán THPT",
            "desc": "• Tra cứu định lý, công thức, bài tập mẫu\n• Xem tóm tắt kiến thức chuẩn Bộ GD&ĐT\n• Lọc thông minh theo khối lớp 10-11-12",
            "x": 4, "y": 51, "w": 38, "h": 36,
            "border": "#2563EB", "bg": "#EFF6FF", "tc": "#1E40AF"
        },
        {
            "step": "BƯỚC 2",
            "title": "TRỰC QUAN HÌNH HỌC",
            "tool": "GeoChalk & Hình 2D Ver 2",
            "desc": "• Dựng hình không gian 3D, xoay 360 độ\n• Khảo sát hàm số, tìm cực trị, tiếp tuyến\n• Trực quan hóa mặt cắt, giao tuyến hình học",
            "x": 58, "y": 51, "w": 38, "h": 36,
            "border": "#059669", "bg": "#ECFDF5", "tc": "#065F46"
        },
        {
            "step": "BƯỚC 4",
            "title": "CHIA SẺ & THẢO LUẬN",
            "tool": "EduShare (Mạng Xã Hội Toán)",
            "desc": "• Đăng bài tập cần giải đáp, trao đổi\n• Thầy cô sửa bài, giao chuyên đề lớp\n• Tương tác cộng đồng học tập tích cực",
            "x": 4, "y": 7, "w": 38, "h": 36,
            "border": "#7C3AED", "bg": "#F5F3FF", "tc": "#5B21B6"
        },
        {
            "step": "BƯỚC 3",
            "title": "BẤM MÁY KIỂM CHỨNG",
            "tool": "SMT Vinacal 680EX Plus III",
            "desc": "• Luyện bấm máy tính khoa học PWA\n• Giải phương trình, ma trận, tích phân\n• Tự kiểm tra kết quả tức thì (0 đồng)",
            "x": 58, "y": 7, "w": 38, "h": 36,
            "border": "#D97706", "bg": "#FFFBEB", "tc": "#92400E"
        }
    ]

    for s in steps:
        box = patches.FancyBboxPatch((s['x'], s['y']), s['w'], s['h'], boxstyle="round,pad=0.8,rounding_size=2",
                                     linewidth=2, edgecolor=s['border'], facecolor=s['bg'])
        ax.add_patch(box)

        # Badge số bước
        badge = patches.FancyBboxPatch((s['x']+1.5, s['y']+s['h']-7.2), 14, 5.8, boxstyle="round,pad=0.3,rounding_size=1",
                                      linewidth=1, edgecolor=s['border'], facecolor=s['border'])
        ax.add_patch(badge)
        ax.text(s['x']+8.5, s['y']+s['h']-4.3, s['step'], ha='center', va='center', fontsize=9, fontweight='bold', color='#FFFFFF')

        ax.text(s['x']+17, s['y']+s['h']-4.3, s['title'], ha='left', va='center', fontsize=10, fontweight='bold', color=s['tc'])
        ax.text(s['x']+2, s['y']+s['h']-11, f"Công cụ: {s['tool']}", ha='left', va='center', fontsize=9, fontweight='bold', color='#334155')
        ax.text(s['x']+2, s['y']+11, s['desc'], ha='left', va='center', fontsize=8.6, color='#1E293B', linespacing=1.35)

    # 4 Mũi tên chuyển tiếp vòng tròn có khoảng cách chuẩn, KHÔNG ĐÈ CHỮ
    # 1 -> 2: Ngang trên
    ax.annotate('', xy=(57, 69), xytext=(43, 69),
                arrowprops=dict(arrowstyle="->", color="#1E40AF", lw=3, mutation_scale=20))
    ax.text(50, 73, "Dựng hình\ntrực quan", ha='center', va='center', fontsize=8.5, fontweight='bold', color='#1E40AF')

    # 2 -> 3: Dọc phải
    ax.annotate('', xy=(77, 44), xytext=(77, 50),
                arrowprops=dict(arrowstyle="->", color="#059669", lw=3, mutation_scale=20))
    ax.text(85, 47, "Kiểm chứng số liệu", ha='left', va='center', fontsize=8.5, fontweight='bold', color='#059669')

    # 3 -> 4: Ngang dưới
    ax.annotate('', xy=(43, 25), xytext=(57, 25),
                arrowprops=dict(arrowstyle="->", color="#D97706", lw=3, mutation_scale=20))
    ax.text(50, 20.5, "Chia sẻ lời giải\n& Hỏi đáp bài tập", ha='center', va='center', fontsize=8.5, fontweight='bold', color='#D97706')

    # 4 -> 1: Dọc trái
    ax.annotate('', xy=(23, 50), xytext=(23, 44),
                arrowprops=dict(arrowstyle="->", color="#7C3AED", lw=3, mutation_scale=20))
    ax.text(14, 47, "Củng cố lý thuyết", ha='right', va='center', fontsize=8.5, fontweight='bold', color='#7C3AED')

    # Tâm vòng tròn: NHÃN HIỆU QUẢ HỌC TẬP
    center_circle = patches.Circle((50, 47), 4.6, facecolor='#0F172A', edgecolor='#38BDF8', linewidth=2)
    ax.add_patch(center_circle)
    ax.text(50, 47, "MATH\nHUB", ha='center', va='center', fontsize=8, fontweight='bold', color='#FFFFFF')

    plt.tight_layout()
    plt.savefig("hinh2_chu_trinh_hoc_tap.png", dpi=300, bbox_inches='tight')
    plt.close()
    print("Saved hinh2_chu_trinh_hoc_tap.png")

def create_hinh3():
    """Hình 3: Biểu đồ Infographic so sánh Math Hub vs Công cụ truyền thống - Legend góc trên phải không đè số"""
    fig, ax = plt.subplots(figsize=(8.2, 5.2), dpi=300)
    ax.set_facecolor('#F8FAFC')
    fig.patch.set_facecolor('#F8FAFC')

    categories = [
        'Tiếp cận công bằng\n(100% học sinh có máy tính)',
        'Liên thông & Đồng bộ\n(Học liệu - Vẽ hình - Bấm máy)',
        'Trực quan hóa không gian\n(Mô hình 3D xoay 360 độ tương tác)',
        'Tiết kiệm chi phí\n(Máy tính 650k-850k + Bản quyền)',
        'Tốc độ triển khai dạy học\n(Không cài đặt, mở ngay trình duyệt)'
    ]

    math_hub_scores = [9.8, 9.6, 9.7, 10.0, 9.9]       # Math Hub
    traditional_scores = [3.5, 4.0, 3.2, 2.5, 4.2]    # Truyền thống

    y = np.arange(len(categories))
    height = 0.35

    rects1 = ax.barh(y + height/2, math_hub_scores, height, label='Hệ sinh thái Math Hub (Tích hợp All-in-One)',
                     color='#2563EB', edgecolor='#1D4ED8', linewidth=1.2)
    rects2 = ax.barh(y - height/2, traditional_scores, height, label='Phương pháp truyền thống (Công cụ rời rạc)',
                     color='#94A3B8', edgecolor='#64748B', linewidth=1.2)

    ax.set_xlim(0, 12.2)
    ax.set_xlabel('Thang điểm đánh giá hiệu quả & tính tiện ích (Thang 1 - 10)', fontsize=10.5, fontweight='bold', color='#1E293B', labelpad=8)
    ax.set_title('HÌNH 3: SO SÁNH HIỆU QUẢ GIỮA MATH HUB VÀ CÔNG CỤ TRUYỀN THỐNG\n',
                 fontsize=13, fontweight='bold', color='#0F172A', pad=8)
    ax.set_yticks(y)
    ax.set_yticklabels(categories, fontsize=9.5, fontweight='bold', color='#1E293B')
    ax.invert_yaxis()

    for rect in rects1:
        w = rect.get_width()
        ax.text(w + 0.25, rect.get_y() + rect.get_height()/2, f'{w:.1f}/10',
                ha='left', va='center', fontsize=9, fontweight='bold', color='#1E40AF')

    for rect in rects2:
        w = rect.get_width()
        ax.text(w + 0.25, rect.get_y() + rect.get_height()/2, f'{w:.1f}/10',
                ha='left', va='center', fontsize=9, fontweight='bold', color='#475569')

    ax.grid(axis='x', linestyle='--', alpha=0.5, color='#CBD5E1')
    ax.set_axisbelow(True)

    ax.legend(loc='upper right', frameon=True, facecolor='#FFFFFF', edgecolor='#CBD5E1',
              fontsize=9.5, fancybox=True)

    for spine in ['top', 'right', 'left']:
        ax.spines[spine].set_visible(False)
    ax.spines['bottom'].set_color('#94A3B8')

    plt.tight_layout()
    plt.savefig("hinh3_so_sanh_hieu_qua.png", dpi=300, bbox_inches='tight')
    plt.close()
    print("Saved hinh3_so_sanh_hieu_qua.png")

if __name__ == '__main__':
    create_hinh1()
    create_hinh2()
    create_hinh3()
    print("Regenerated all 3 diagrams cleanly.")
