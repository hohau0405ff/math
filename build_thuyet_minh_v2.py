import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_margins(cell, top=90, bottom=90, left=130, right=130):
    """Thiết lập padding cho ô trong bảng (đơn vị dxa, 20 dxa = 1 pt)"""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_shading(cell, color_hex):
    """Thiết lập màu nền cho ô"""
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_border(cell, **kwargs):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for border_name in ['top', 'left', 'bottom', 'right']:
        if border_name in kwargs:
            edge = OxmlElement(f'w:{border_name}')
            for key, val in kwargs[border_name].items():
                edge.set(qn(f'w:{key}'), str(val))
            tcBorders.append(edge)
        else:
            edge = OxmlElement(f'w:{border_name}')
            edge.set(qn('w:val'), 'none')
            tcBorders.append(edge)
    tcPr.append(tcBorders)

def prevent_row_split(table):
    """Ngăn các dòng trong bảng bị tách đôi giữa 2 trang giấy"""
    for row in table.rows:
        trPr = row._tr.get_or_add_trPr()
        trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))

def add_callout_box(doc, text_list, title="ĐIỂM NHẤN CHIẾN LƯỢC", border_color="1E40AF", bg_color="EFF6FF"):
    """Tạo khung nhấn mạnh Callout Box đẹp mắt, không bao giờ bị cắt trang"""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    prevent_row_split(tbl)
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)

    set_cell_shading(cell, bg_color)
    set_cell_margins(cell, top=130, bottom=130, left=180, right=160)
    set_cell_border(cell,
                    left={'val': 'single', 'sz': 32, 'color': border_color},
                    top={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                    bottom={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                    right={'val': 'single', 'sz': 4, 'color': 'E2E8F0'})

    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    run_t = p.add_run(f"★ {title}\n")
    run_t.font.name = 'Arial'
    run_t.font.size = Pt(10.5)
    run_t.font.bold = True
    run_t.font.color.rgb = RGBColor(0x1E, 0x40, 0xAF)

    for item in text_list:
        p_item = cell.add_paragraph()
        p_item.paragraph_format.space_before = Pt(1)
        p_item.paragraph_format.space_after = Pt(2)
        p_item.paragraph_format.line_spacing = 1.18
        r = p_item.add_run(item)
        r.font.name = 'Arial'
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_before = Pt(0)
    p_spacer.paragraph_format.space_after = Pt(3)

def format_paragraph(p, space_before=0, space_after=3, line_spacing=1.18):
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing

def add_heading_1(doc, text):
    h = doc.add_paragraph()
    format_paragraph(h, space_before=11, space_after=4)
    r = h.add_run(text)
    r.font.name = 'Arial'
    r.font.size = Pt(13)
    r.font.bold = True
    r.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
    return h

def add_heading_2(doc, text):
    h = doc.add_paragraph()
    format_paragraph(h, space_before=8, space_after=3)
    r = h.add_run(text)
    r.font.name = 'Arial'
    r.font.size = Pt(11)
    r.font.bold = True
    r.font.color.rgb = RGBColor(0x03, 0x69, 0xA1)
    return h

def add_clean_bullet(doc, text, bold_prefix=""):
    """Thêm gạch đầu dòng chuẩn (1 bullet duy nhất, không lặp ký tự)"""
    p = doc.add_paragraph(style='List Bullet')
    format_paragraph(p, space_before=1, space_after=2, line_spacing=1.16)
    if bold_prefix:
        r_b = p.add_run(bold_prefix)
        r_b.font.name = 'Arial'
        r_b.font.size = Pt(9.8)
        r_b.font.bold = True
        r_b.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    r = p.add_run(text)
    r.font.name = 'Arial'
    r.font.size = Pt(9.8)
    r.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
    return p

def add_body_p(doc, text, italic=False, bold=False):
    p = doc.add_paragraph()
    format_paragraph(p, space_before=2, space_after=3, line_spacing=1.18)
    r = p.add_run(text)
    r.font.name = 'Arial'
    r.font.size = Pt(9.8)
    r.font.italic = italic
    r.font.bold = bold
    r.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
    return p

def add_image_with_caption(doc, image_path, caption_text, width=Inches(6.3)):
    if os.path.exists(image_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        format_paragraph(p_img, space_before=5, space_after=2)
        run_img = p_img.add_run()
        run_img.add_picture(image_path, width=width)

        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        format_paragraph(p_cap, space_before=1, space_after=6)
        run_cap = p_cap.add_run(caption_text)
        run_cap.font.name = 'Arial'
        run_cap.font.size = Pt(8.8)
        run_cap.font.italic = True
        run_cap.font.bold = True
        run_cap.font.color.rgb = RGBColor(0x47, 0x55, 0x69)

def build_thuyet_minh():
    doc = Document()

    # Thiết lập lề trang A4 chuẩn (1.8cm các phía, gáy 2.2cm)
    for section in doc.sections:
        section.top_margin = Cm(1.8)
        section.bottom_margin = Cm(1.8)
        section.left_margin = Cm(2.2)
        section.right_margin = Cm(1.8)
        section.page_width = Cm(21.0)
        section.page_height = Cm(29.7)

    # =========================================================================
    # TRANG 1: TRANG BÌA (COVER PAGE)
    # =========================================================================
    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    format_paragraph(p_meta, space_before=15, space_after=4)
    r_meta = p_meta.add_run("BỘ GIÁO DỤC VÀ ĐÀO TẠO — DỰ ÁN SÁNG TẠO CÔNG NGHỆ SỐ GIÁO DỤC")
    r_meta.font.name = 'Arial'
    r_meta.font.size = Pt(10)
    r_meta.font.bold = True
    r_meta.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    p_div = doc.add_paragraph()
    p_div.alignment = WD_ALIGN_PARAGRAPH.CENTER
    format_paragraph(p_div, space_before=0, space_after=35)
    r_div = p_div.add_run("─────────── ★ ───────────")
    r_div.font.name = 'Arial'
    r_div.font.size = Pt(11)
    r_div.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    format_paragraph(p_title, space_before=5, space_after=10)
    r_title = p_title.add_run("BẢN THUYẾT MINH DỰ ÁN\nHỆ SINH THÁI TOÁN HỌC MATH HUB")
    r_title.font.name = 'Arial'
    r_title.font.size = Pt(21)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    format_paragraph(p_sub, space_before=0, space_after=30)
    r_sub = p_sub.add_run("Nền Tảng Chuyển Đổi Số Dạy & Học Toán Toàn Diện Cấp THPT (Lớp 10 – 11 – 12)\nHợp Nhất Học Liệu — Dựng Hình Trực Quan — Giả Lập Vinacal 680EX — Mạng Xã Hội Học Tập")
    r_sub.font.name = 'Arial'
    r_sub.font.size = Pt(11)
    r_sub.font.italic = True
    r_sub.font.color.rgb = RGBColor(0x02, 0x84, 0xC7)

    add_callout_box(doc, [
        "• Địa chỉ hệ sinh thái trực tuyến: https://math.vn-ai.cloud/ (Cổng chính điều hướng All-in-One)",
        "• Mục tiêu cốt lõi: Xóa bỏ rào cản chi phí thiết bị, tích hợp chu trình học toán khép kín, trực quan hóa Chương trình GDPT 2018.",
        "• Đối tượng phục vụ: 100% học sinh THPT (Lớp 10, 11, 12) và giáo viên Toán học trên toàn quốc hoàn toàn miễn phí."
    ], title="THÔNG TIN ĐỊNH VỊ DỰ ÁN", border_color="1E40AF", bg_color="EFF6FF")

    p_info = doc.add_paragraph()
    p_info.alignment = WD_ALIGN_PARAGRAPH.CENTER
    format_paragraph(p_info, space_before=65, space_after=4)
    r_auth = p_info.add_run("Đơn vị phát triển: Nhóm Nghiên cứu & Sáng tạo Công nghệ Giáo dục Math Hub\nNăm hoàn thành: 2025")
    r_auth.font.name = 'Arial'
    r_auth.font.size = Pt(10)
    r_auth.font.bold = True
    r_auth.font.color.rgb = RGBColor(0x47, 0x55, 0x69)

    doc.add_page_break()

    # =========================================================================
    # TRANG 2: MỤC LỤC & PHẦN I (ĐẶT VẤN ĐỀ)
    # =========================================================================
    p_toct = doc.add_paragraph()
    format_paragraph(p_toct, space_before=4, space_after=6)
    r_toct = p_toct.add_run("MỤC LỤC TỔNG QUAN DỰ ÁN")
    r_toct.font.name = 'Arial'
    r_toct.font.size = Pt(12.5)
    r_toct.font.bold = True
    r_toct.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

    toc_items = [
        ("I. ĐẶT VẤN ĐỀ & BỐI CẢNH", "Thực trạng phân mảnh công cụ & rào cản chi phí máy tính cầm tay"),
        ("II. CÔNG NGHỆ LÕI & KIẾN TRÚC (15%)", "Kiến trúc phân tách Web Tĩnh/Động & Luồng xác thực đa tầng"),
        ("III. TÍNH MỚI VÀ TÍNH SÁNG TẠO (40%)", "Mô hình All-in-One, Tách nhánh 2D, Vinacal 680EX & Chu trình học 4 bước"),
        ("IV. GIÁ TRỊ ỨNG DỤNG THỰC TIỄN (45%)", "Giải pháp đột phá cho Giáo viên và Học sinh THPT (Lớp 10 – 11 – 12)"),
        ("V. ĐỊNH HƯỚNG PHÁT TRIỂN & KẾT LUẬN", "Kế hoạch nâng cấp hệ thống & Ý nghĩa nhân văn giáo dục")
    ]

    t_toc = doc.add_table(rows=len(toc_items), cols=2)
    t_toc.alignment = WD_TABLE_ALIGNMENT.CENTER
    prevent_row_split(t_toc)
    for i, (part, desc) in enumerate(toc_items):
        cell_l = t_toc.cell(i, 0)
        cell_r = t_toc.cell(i, 1)
        cell_l.width = Inches(2.9)
        cell_r.width = Inches(3.6)
        set_cell_margins(cell_l, top=50, bottom=50, left=80, right=80)
        set_cell_margins(cell_r, top=50, bottom=50, left=80, right=80)
        set_cell_shading(cell_l, "F8FAFC" if i % 2 == 0 else "FFFFFF")
        set_cell_shading(cell_r, "F8FAFC" if i % 2 == 0 else "FFFFFF")
        set_cell_border(cell_l, bottom={'val': 'single', 'sz': 4, 'color': 'E2E8F0'})
        set_cell_border(cell_r, bottom={'val': 'single', 'sz': 4, 'color': 'E2E8F0'})

        pl = cell_l.paragraphs[0]
        format_paragraph(pl, space_before=1, space_after=1)
        rl = pl.add_run(part)
        rl.font.name = 'Arial'
        rl.font.size = Pt(9.2)
        rl.font.bold = True
        rl.font.color.rgb = RGBColor(0x1E, 0x40, 0xAF)

        pr = cell_r.paragraphs[0]
        format_paragraph(pr, space_before=1, space_after=1)
        rr = pr.add_run(desc)
        rr.font.name = 'Arial'
        rr.font.size = Pt(9.2)
        rr.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # PHẦN I
    add_heading_1(doc, "I. ĐẶT VẤN ĐỀ & BỐI CẢNH THỰC TIỄN")
    add_body_p(doc, "Thực tế đổi mới phương pháp dạy học môn Toán theo Chương trình GDPT 2018 đang gặp 3 rào cản lớn:")

    add_clean_bullet(doc, "Học sinh và thầy cô phải mở 4-5 phần mềm tách biệt: file PDF xem bài tập, GeoGebra vẽ hình, máy tính cầm tay tính toán, Zalo/Facebook hỏi bài. Quá trình này gây phân tâm và ngắt quãng mạch tư duy toán học.",
                     bold_prefix="1. Phân mảnh công cụ học tập: ")

    add_clean_bullet(doc, "Máy tính khoa học đạt chuẩn thi THPT (Casio fx-580VN X, Vinacal 680EX Plus) có giá 650.000 – 850.000 VNĐ. Nhiều học sinh nghèo, học sinh vùng khó khăn không có điều kiện trang bị sớm, dẫn đến thiếu hụt kỹ năng bấm máy giải nhanh trắc nghiệm.",
                     bold_prefix="2. Rào cản chi phí thiết bị: ")

    add_clean_bullet(doc, "Hình học không gian (Lớp 11) và Tọa độ Oxyz (Lớp 12) rất trừu tượng. Hình vẽ phấn bảng 2D không diễn tả được góc nhìn 3D đa chiều, góc xoay và mặt phẳng cắt.",
                     bold_prefix="3. Thiếu công cụ trực quan 3D: ")

    # Bảng tóm tắt đối chiếu thực trạng
    t_prob = doc.add_table(rows=4, cols=3)
    t_prob.alignment = WD_TABLE_ALIGNMENT.CENTER
    prevent_row_split(t_prob)
    prob_data = [
        ("Nội Dung", "Thực Trạng Trước Đây", "Giải Pháp Đột Phá Của Math Hub"),
        ("Công cụ học tập", "Dùng 4-5 ứng dụng rời rạc, tốn thời gian chuyển đổi", "Tất cả trong 1 (All-in-One), 1 chạm trên trình duyệt"),
        ("Máy tính khoa học", "Mua máy cầm tay đắt tiền (650k - 850k VNĐ)", "SMT Vinacal 680EX Plus III trên Web PWA (0 đồng)"),
        ("Hình học & Đồ thị", "Hình vẽ tĩnh trên giấy/bảng phấn khó hình dung", "Mô hình 3D xoay 360 độ tương tác trực tiếp")
    ]
    prob_widths = [Inches(1.5), Inches(2.5), Inches(2.5)]
    for r_i, r_data in enumerate(prob_data):
        for c_i, val in enumerate(r_data):
            cell = t_prob.cell(r_i, c_i)
            cell.width = prob_widths[c_i]
            set_cell_margins(cell, top=65, bottom=65, left=80, right=80)
            p = cell.paragraphs[0]
            format_paragraph(p, space_before=1, space_after=1)
            r = p.add_run(val)
            r.font.name = 'Arial'
            if r_i == 0:
                set_cell_shading(cell, "1E3A8A")
                set_cell_border(cell, bottom={'val': 'single', 'sz': 12, 'color': '1E40AF'})
                r.font.size = Pt(9.2)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            else:
                set_cell_shading(cell, "F8FAFC" if r_i % 2 == 1 else "FFFFFF")
                set_cell_border(cell,
                                bottom={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                                top={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                                left={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                                right={'val': 'single', 'sz': 4, 'color': 'E2E8F0'})
                r.font.size = Pt(8.8)
                if c_i == 0:
                    r.font.bold = True
                    r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
                elif c_i == 1:
                    r.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)
                else:
                    r.font.bold = True
                    r.font.color.rgb = RGBColor(0x03, 0x69, 0xA1)

    doc.add_page_break()

    # =========================================================================
    # TRANG 3: PHẦN II (CÔNG NGHỆ LÕI & KIẾN TRÚC HỆ THỐNG - 15%)
    # =========================================================================
    add_heading_1(doc, "II. CÔNG NGHỆ LÕI & KIẾN TRÚC HỆ THỐNG (15%)")
    add_body_p(doc, "Hệ thống Math Hub áp dụng kiến trúc phân tách Web Tĩnh / Web Động hiện đại, đảm bảo tốc độ mở < 1 giây, bảo mật cao và vận hành bền bỉ:")

    # Ma trận 5 phân hệ
    t_sys = doc.add_table(rows=6, cols=4)
    t_sys.alignment = WD_TABLE_ALIGNMENT.CENTER
    prevent_row_split(t_sys)
    sys_data = [
        ("Phân Hệ", "Công Nghệ Nền Tảng", "Cơ Chế Xác Thực", "Ưu Điểm Nổi Bật"),
        ("1. Cổng chính Math Hub", "HTML5, CSS3, Nginx Static", "Không cần đăng nhập", "Tải trang tức thì, điều hướng 1 chạm"),
        ("2. EduShare", "FastAPI Python, Redis, SQLite", "Gmail + Mã OTP xác thực", "Chống nick ảo, bảo mật dữ liệu học tập"),
        ("3. GeoChalk (3D/CAS)", "GeoGebra Core WebGL, PHP", "API Login FastAPI Python", "Lưu bài vẽ online, đồng bộ CSDL"),
        ("4. SMT Vinacal 680EX", "PWA, Service Worker, LCD Font", "Không cần tài khoản (0đ)", "Chạy Offline 100% không cần Internet"),
        ("5. Hình học 2D Ver 2", "Tách nhánh từ GeoChalk", "Trực tiếp, không tài khoản", "Vẽ hình phẳng siêu tốc, cực nhẹ"),
    ]
    sys_widths = [Inches(1.8), Inches(1.8), Inches(1.5), Inches(1.4)]
    for r_i, r_data in enumerate(sys_data):
        for c_i, val in enumerate(r_data):
            cell = t_sys.cell(r_i, c_i)
            cell.width = sys_widths[c_i]
            set_cell_margins(cell, top=55, bottom=55, left=75, right=75)
            p = cell.paragraphs[0]
            format_paragraph(p, space_before=1, space_after=1)
            r = p.add_run(val)
            r.font.name = 'Arial'
            if r_i == 0:
                set_cell_shading(cell, "1E3A8A")
                set_cell_border(cell, bottom={'val': 'single', 'sz': 12, 'color': '1E40AF'})
                r.font.size = Pt(9.2)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            else:
                set_cell_shading(cell, "F8FAFC" if r_i % 2 == 1 else "FFFFFF")
                set_cell_border(cell,
                                bottom={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                                top={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                                left={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                                right={'val': 'single', 'sz': 4, 'color': 'E2E8F0'})
                r.font.size = Pt(8.6)
                if c_i == 0:
                    r.font.bold = True
                    r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
                elif c_i == 2:
                    r.font.bold = True
                    r.font.color.rgb = RGBColor(0x03, 0x69, 0xA1)
                else:
                    r.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # Chèn Hình 1
    add_image_with_caption(doc, "hinh1_kien_truc_he_sinh_thai.png",
                           "Hình 1 – Sơ đồ kiến trúc hệ sinh thái Math Hub và luồng xác thực đa tầng", width=Inches(6.2))

    doc.add_page_break()

    # =========================================================================
    # TRANG 4: PHẦN III (TÍNH MỚI & TÍNH SÁNG TẠO - TRỌNG TÂM 1: 40%)
    # =========================================================================
    add_heading_1(doc, "III. TÍNH MỚI VÀ TÍNH SÁNG TẠO (TRỌNG TÂM 1 - 40%)")

    add_heading_2(doc, "1. Tính Mới Đột Phá")
    add_clean_bullet(doc, "Hợp nhất trọn vẹn 6 phân hệ toán học vào 1 domain duy nhất (math.vn-ai.cloud), xóa bỏ tình trạng phân mảnh công cụ.",
                     bold_prefix="Mô hình All-in-One duy nhất: ")
    add_clean_bullet(doc, "Chủ động tách nhánh 'Hình học 2D Ver 2' từ GeoChalk lõi, loại bỏ module 3D/CAS cồng kềnh, giúp trang vẽ hình phẳng mở tức thì, đáp ứng hơn 70% nhu cầu vẽ hình học THPT.",
                     bold_prefix="Tách nhánh độc lập Hình học 2D: ")
    add_clean_bullet(doc, "Công cụ học tập tự do (SMT, 2D, Tài liệu) mở tức thì không cần tài khoản; công cụ cộng đồng (EduShare) bảo vệ bằng Gmail OTP; phân hệ lưu bài (GeoChalk) dùng API FastAPI.",
                     bold_prefix="Phân tách bảo mật theo ngữ cảnh: ")

    add_heading_2(doc, "2. Tính Sáng Tạo Độc Đáo & Nhân Văn")
    add_clean_bullet(doc, "Đưa nguyên bản máy tính Vinacal 680EX Plus III lên web chuẩn PWA, cài vào điện thoại chạy Offline 100% không tốn pin, giúp học sinh nghèo có ngay máy tính khoa học 0 đồng.",
                     bold_prefix="Số hóa máy tính Vinacal 680EX (PWA 0đ): ")
    add_clean_bullet(doc, "Xây dựng chu trình liên hoàn: Tra cứu lý thuyết → Dựng hình trực quan → Bấm máy kiểm chứng → Thảo luận hỏi đáp.",
                     bold_prefix="Chu trình học tập khép kín 4 bước: ")

    # Chèn Hình 2
    add_image_with_caption(doc, "hinh2_chu_trinh_hoc_tap.png",
                           "Hình 2 – Sơ đồ chu trình học tập toán khép kín 4 bước trên Math Hub", width=Inches(6.2))

    doc.add_page_break()

    # =========================================================================
    # TRANG 5: BẢNG SO SÁNH & PHẦN IV (GIÁ TRỊ ỨNG DỤNG - TRỌNG TÂM 2: 45%)
    # =========================================================================
    add_heading_2(doc, "Bảng So Sánh Đối Chiếu: Math Hub vs Công Cụ Rời Rạc")
    cmp_tbl = doc.add_table(rows=6, cols=3)
    cmp_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    prevent_row_split(cmp_tbl)
    cmp_data = [
        ("Tiêu Chí", "Công Cụ Rời Rạc Truyền Thống", "Hệ Sinh Thái Math Hub"),
        ("1. Chi phí đầu tư", "650.000 - 850.000 VNĐ mua máy; mua bản quyền app", "HOÀN TOÀN MIỄN PHÍ (0 VNĐ) trên nền tảng Web"),
        ("2. Khả năng truy cập", "Phải cài đặt nhiều ứng dụng (GeoGebra, Giả lập, Zalo)", "Mở ngay trên trình duyệt (PC, tablet, smartphone)"),
        ("3. Trực quan hóa 3D", "Hình vẽ tĩnh khó hình dung thiết diện, góc xoay", "Mô hình 3D tương tác thời gian thực, xoay 360 độ"),
        ("4. Liên thông dữ liệu", "Rời rạc: vở bài tập, phần mềm riêng, chat riêng", "Khép kín: Tra cứu → Dựng hình → Bấm máy → Thảo luận"),
        ("5. Bình đẳng giáo dục", "Học sinh nghèo không có máy tính bấm trắc nghiệm", "100% học sinh được luyện máy tính khoa học sớm")
    ]
    cmp_widths = [Inches(1.5), Inches(2.5), Inches(2.5)]
    for r_i, r_data in enumerate(cmp_data):
        for c_i, val in enumerate(r_data):
            cell = cmp_tbl.cell(r_i, c_i)
            cell.width = cmp_widths[c_i]
            set_cell_margins(cell, top=50, bottom=50, left=75, right=75)
            p = cell.paragraphs[0]
            format_paragraph(p, space_before=1, space_after=1)
            r = p.add_run(val)
            r.font.name = 'Arial'
            if r_i == 0:
                set_cell_shading(cell, "1E3A8A")
                set_cell_border(cell, bottom={'val': 'single', 'sz': 12, 'color': '1E40AF'})
                r.font.size = Pt(9.2)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            else:
                set_cell_shading(cell, "F8FAFC" if r_i % 2 == 1 else "FFFFFF")
                set_cell_border(cell,
                                bottom={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                                top={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                                left={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                                right={'val': 'single', 'sz': 4, 'color': 'E2E8F0'})
                r.font.size = Pt(8.6)
                if c_i == 0:
                    r.font.bold = True
                    r.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
                elif c_i == 1:
                    r.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)
                else:
                    r.font.bold = True
                    r.font.color.rgb = RGBColor(0x03, 0x69, 0xA1)

    doc.add_paragraph().paragraph_format.space_after = Pt(3)

    # PHẦN IV
    add_heading_1(doc, "IV. KHẢ NĂNG GIÚP ÍCH TRONG GIẢNG DẠY & HỌC TẬP (45%)")

    t_val = doc.add_table(rows=3, cols=3)
    t_val.alignment = WD_TABLE_ALIGNMENT.CENTER
    prevent_row_split(t_val)
    val_data = [
        ("Đối Tượng", "Lợi Ích Cốt Lõi", "Ứng Dụng Thực Tiễn"),
        ("GIÁO VIÊN TOÁN", "• Trực quan hóa bài giảng 3D\n• Xuất ảnh hình vẽ đề thi tức thì\n• Giao tài liệu, quản lý lớp an toàn", "Dạy hình không gian 11, hàm số 12 sinh động trên máy chiếu; tạo đề thi Word chuẩn Bộ GD&ĐT trong vài giây qua GeoChalk."),
        ("HỌC SINH (10-11-12)", "• Tiếp cận máy tính 680EX miễn phí\n• Tự kiểm chứng bài giải qua CAS/Đồ thị\n• Tra cứu lý thuyết 3 khối lớp siêu tốc", "Học sinh nghèo rèn kỹ năng bấm máy trắc nghiệm; tự kiểm tra đáp án phương trình, tích phân, thể tích; hỏi bài không sợ nick ảo.")
    ]
    val_widths = [Inches(1.5), Inches(2.5), Inches(2.5)]
    for r_i, r_data in enumerate(val_data):
        for c_i, val in enumerate(r_data):
            cell = t_val.cell(r_i, c_i)
            cell.width = val_widths[c_i]
            set_cell_margins(cell, top=60, bottom=60, left=75, right=75)
            p = cell.paragraphs[0]
            format_paragraph(p, space_before=1, space_after=1, line_spacing=1.15)
            r = p.add_run(val)
            r.font.name = 'Arial'
            if r_i == 0:
                set_cell_shading(cell, "047857")
                set_cell_border(cell, bottom={'val': 'single', 'sz': 12, 'color': '065F46'})
                r.font.size = Pt(9.2)
                r.font.bold = True
                r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            else:
                set_cell_shading(cell, "F0FDF4" if r_i == 1 else "FFFFFF")
                set_cell_border(cell,
                                bottom={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                                top={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                                left={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                                right={'val': 'single', 'sz': 4, 'color': 'E2E8F0'})
                r.font.size = Pt(8.6)
                if c_i == 0:
                    r.font.bold = True
                    r.font.color.rgb = RGBColor(0x06, 0x5F, 0x46)
                else:
                    r.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)

    # Chèn Hình 3 trực tiếp vào trang 5
    add_image_with_caption(doc, "hinh3_so_sanh_hieu_qua.png",
                           "Hình 3 – Biểu đồ so sánh hiệu quả và tính tiện lợi giữa Math Hub và công cụ rời rạc", width=Inches(6.1))

    doc.add_page_break()

    # =========================================================================
    # TRANG 6: PHẦN V (ĐỊNH HƯỚNG & KẾT LUẬN)
    # =========================================================================
    add_heading_1(doc, "V. ĐỊNH HƯỚNG PHÁT TRIỂN & KẾT LUẬN")

    add_heading_2(doc, "1. Kế Hoạch Nâng Cấp Hệ Thống")
    add_clean_bullet(doc, "Xây dựng ngân hàng trắc nghiệm theo 4 mức độ nhận thức (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao) có chấm điểm tự động.",
                     bold_prefix="Ngân hàng câu hỏi trắc nghiệm tương tác: ")
    add_clean_bullet(doc, "Nghiên cứu ứng dụng trí tuệ nhân tạo để nhận dạng hình vẽ tay của học sinh và chuyển đổi thành hình 3D chuẩn xác, gợi ý hướng giải.",
                     bold_prefix="Trợ lý AI gia sư Toán học: ")
    add_clean_bullet(doc, "Đóng gói phiên bản ứng dụng di động hoàn chỉnh trên App Store và Google Play, duy trì chính sách 100% miễn phí.",
                     bold_prefix="Mở rộng ứng dụng di động Native: ")

    add_heading_2(doc, "2. Lời Kết Luận")
    add_body_p(doc, "Hệ sinh thái Toán học Math Hub là minh chứng tiêu biểu cho giải pháp công nghệ giáo dục 'Lấy học sinh và giáo viên làm trung tâm'. Bằng việc tích hợp chu trình học tập khép kín và số hóa máy tính khoa học Vinacal 680EX miễn phí, dự án mang ý nghĩa nhân văn sâu sắc, góp phần xóa bỏ rào cản tài chính thiết bị, nâng tầm chất lượng dạy học môn Toán trong thời đại số.")

    add_callout_box(doc, [
        "\"Math Hub không chỉ là một trang web kỹ thuật, mà là cây cầu bình đẳng giáo dục: mang máy tính khoa học và bảng vẽ kỹ thuật đến tay mọi học sinh khó khăn, đồng hành cùng thầy cô đổi mới sáng tạo dạy học môn Toán toàn quốc.\""
    ], title="Ý NGHĨA NHÂN VĂN & GIÁ TRỊ XÃ HỘI BỀN VỮNG", border_color="059669", bg_color="ECFDF5")

    # Lưu file Word
    output_docx = "D:/svmath/Thuyet_Minh_Math_Hub.docx"
    doc.save(output_docx)
    print(f"Document saved successfully: {output_docx}")

if __name__ == '__main__':
    build_thuyet_minh()
