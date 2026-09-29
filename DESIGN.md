# Design System — Learning OS "Mặt hồ đêm" (Deep Water)

Chốt với chủ app qua /design-consultation ngày 2026-09-29. Mọi quyết định màu, chữ, khoảng
cách của app lấy từ file này. Muốn đổi thì hỏi chủ app trước.

## Product context
- **Là gì:** PWA cá nhân theo dõi học IELTS / deep work, mở nhiều lần mỗi ngày trên điện thoại.
- **Cho ai:** một người — chủ app, sinh viên tài chính, mệnh **Thủy**.
- **Cảm giác cần nhớ:** *bình tĩnh, sâu — như nhìn xuống mặt hồ ban đêm.*
- **Tham khảo:** Dribbble tags focus-timer / dark-timer-app / habit-tracker-app; Headspace
  (mỗi màu phục vụ một cảm xúc, gradient chỉ ở vùng lớn). Khác biệt chọn: navy + gradient nước
  thay cho nền đen + tím phát sáng của hầu hết app học tập.
- **Mẫu Stitch:** project "Learning OS — Mặt hồ đêm 2026-09" (projects/2375333300527889091),
  design system `assets/6524693003817329971`. Đã duyệt: Hôm nay (tối + sáng), Ôn tập (tối).

## Aesthetic
- **Hướng:** tối giản bình tĩnh, có chiều sâu. Trang trí *có chủ đích nhưng tiết chế*.
- **Ngũ hành:** đen / navy / xanh (Thủy) là màu chính; bạc / trắng (Kim sinh Thủy) là màu phụ;
  không dùng vàng đất / nâu (Thổ khắc Thủy) làm màu chủ đạo — cảnh báo dùng cam đào.

## Gradient — chỉ là điểm nhấn (3 chỗ, không hơn)
1. **Vầng sáng đầu trang** (`body`, `--glow`): radial rất nhẹ, tối đa 16% độ phủ.
2. **Thẻ mặt nước** (`Card water` / `.bg-water`): MỘT thẻ mỗi màn cho thứ quan trọng nhất.
   Hôm nay + IELTS = `CountdownCard`; Ôn tập = thẻ hàng ôn hôm nay; Thống kê = biểu đồ
   "Giờ IELTS và điểm Listening". Cài đặt không có (màn danh sách, không có thẻ nào nổi bật).
   Bên trong thẻ, `.bg-water` tự ghi đè `--ink-2/-3`, `--accent`, `--line`, `--surface(-2)`,
   `--chart-bar` sang bản đủ tương phản trên nền gradient.
3. **Nút chính** (`Button` primary / `.bg-flow`): sapphire → ngọc lam đậm, chữ trắng; dải trôi
   14 s, tắt khi `prefers-reduced-motion`. Vẫn là MỘT nút nổi bật mỗi màn.

Mọi thứ khác phẳng. Không tím, không kính mờ (blur), không đốm phát sáng, không streak.

## Color
Token trong `src/index.css` (cả hai khối theme), dùng qua class Tailwind (`bg-surface`...).

| Token | Tối (mặc định) | Sáng |
|---|---|---|
| canvas | `#060C18` | `#F3F7FC` |
| surface / surface-2 | `#0C1628` / `#13213A` | `#FFFFFF` / `#EAF1F9` |
| line | `#1D2C48` | `#D8E2EE` |
| ink / ink-2 / ink-3 | `#E8EEF9` / `#A3B3CE` / `#8C9DBA` | `#0B1B33` / `#3E5170` / `#56688A` |
| accent (ngọc lam / xanh) | `#22C7E8` | `#1D4ED8` |
| good / warn / bad | `#34D399` / `#F6A56B` / `#FB7185` | `#166534` / `#9A3412` / `#DC2626` |
| flow (nút) | `#2A5FF5` → `#0B7FA3` | `#1D4ED8` → `#0E7490` |
| water (thẻ) | `#10357F` → `#0E4D6A` → `#0C1628` | `#DCE8FF` → `#D4F3F8` → `#FFFFFF` |
| chart-1..4 | sapphire `#5B8CFF`, ngọc lam `#22C7E8`, bạc `#C9D4E8`, lam dừa cạn `#9AA8FF` | `#2F5FE0`, `#0E7490`, `#64748B`, `#6D5FD8` |

**Màu area** (`src/lib/areaColors.ts` → biến `--area-*`, mỗi theme một bộ): IELTS ngọc lam,
Internship VC sapphire, IM/Memo lam dừa cạn, Financial modeling xanh biển, EFM cam đào,
AFEP xanh lục lam, BFN hồng nhạt, Stock competition xanh trời, M&A sourcing bạc, Other xám thép.
Tối >= 5.7:1 trên surface, sáng >= 4.7:1 trên trắng.

**Đo, không đoán:** chữ >= 4.5:1 trên mọi nền nó đứng (kể cả từng điểm của gradient), đồ hoạ
>= 3:1. Bản Stitch để chữ trắng trên ngọc lam `#22C7E8` (2:1) — đầu dải nút được lùi về
`#0B7FA3`. Quét toàn bộ chữ 5 tab (dữ liệu mẫu): tối nhất 4.59:1 (tối), 4.83:1 (sáng).

## Typography
- **Be Vietnam Pro** (400–700) cho mọi chữ — dấu tiếng Việt đẹp nhất; self-host @fontsource.
- **Geist** (`font-num`, tabular) cho số. Font có chân Fraunces cho số lớn đã được đề xuất và
  chủ app **không chọn**.
- Viết thường kiểu câu, không IN HOA. Chữ tối thiểu 12px.

## Spacing, shape, motion
- Đơn vị 4px, mật độ thoải mái. Bo góc: control 12px (`rounded-xl`), thẻ 16px, thẻ mặt nước
  20px, chip tròn hẳn. Nút/chip/ô >= 44px.
- Chuyển động tối giản: 150–250 ms cho chuyển trạng thái; chỉ nút chính có chuyển động nền.

## Decisions log
| Ngày | Quyết định | Lý do |
|---|---|---|
| 2026-09-29 | Tạo hệ "Mặt hồ đêm" thay "Calm Protocol" (xám đen + cyan phẳng) | Chủ app muốn gradient hài hoà, mệnh Thủy; chọn "bình tĩnh, sâu" |
| 2026-09-29 | Gradient chỉ ở 3 chỗ; một thẻ mặt nước mỗi màn | Chủ app chọn "điểm nhấn"; giữ luật một điểm nhìn mỗi màn |
| 2026-09-29 | Màu area theo họ nước, thành biến CSS theo theme | Chủ app chọn; bản cũ một mã cho cả hai theme không đạt 3:1 trên trắng |
| 2026-09-29 | Không dùng Fraunces cho số | Chủ app không chọn |
| 2026-09-29 | Nút gradient kết thúc ở `#0B7FA3`, không `#22C7E8` | Chữ trắng phải >= 4.5:1 |
