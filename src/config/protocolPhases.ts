/**
 * Các giai đoạn (phase) của protocol học tập 12 tuần.
 *
 * ĐÂY LÀ FILE BẠN SỬA khi muốn đổi lịch: chỉ cần sửa bảng bên dưới,
 * không cần đụng vào bất kỳ file nào khác.
 *
 * Quy tắc: `from` và `to` đều tính CẢ ngày đó (inclusive),
 * viết theo dạng "YYYY-MM-DD".
 */

export type ProtocolPhase = {
  from: string;  // ngày bắt đầu, "YYYY-MM-DD"
  to: string;    // ngày kết thúc, "YYYY-MM-DD"
  label: string; // câu hiển thị trên banner ở màn hình Hôm nay
};

export const PROTOCOL_PHASES: ProtocolPhase[] = [
  { from: "2026-09-28", to: "2026-10-11", label: "Tuần 1–2 · Đo baseline — chỉ log, chưa thay đổi gì" },
  { from: "2026-10-12", to: "2026-10-25", label: "Tuần 3–4 · Retrieval + spacing" },
  { from: "2026-10-26", to: "2026-11-08", label: "Tuần 5–6 · Block tập trung, điện thoại ở phòng khác" },
  { from: "2026-11-09", to: "2026-11-22", label: "Tuần 7–8 · Neo giờ thức + vận động" },
  { from: "2026-11-23", to: "2026-12-06", label: "Tuần 9–10 · Nhật ký dự đoán + pre-mortem" },
  { from: "2026-12-07", to: "2026-12-20", label: "Tuần 11–12 · AI-as-tutor + tổng kết" },
];

/**
 * Tìm giai đoạn ứng với một ngày.
 *
 * So sánh chuỗi "YYYY-MM-DD" bằng <= và >= là chính xác,
 * vì định dạng này sắp xếp theo thứ tự chữ cái trùng với thứ tự thời gian.
 *
 * Trả về `null` nếu ngày đó nằm ngoài toàn bộ lịch (trước khi bắt đầu
 * hoặc sau khi kết thúc) — lúc đó banner sẽ không hiện.
 */
export function findProtocolPhase(date: string): ProtocolPhase | null {
  return PROTOCOL_PHASES.find((p) => date >= p.from && date <= p.to) ?? null;
}

/**
 * Số thứ tự của giai đoạn (1, 2, 3...) để hiện "Giai đoạn 2/6".
 * Trả về 0 nếu không tìm thấy.
 */
export function findProtocolPhaseIndex(date: string): number {
  return PROTOCOL_PHASES.findIndex((p) => date >= p.from && date <= p.to) + 1;
}
