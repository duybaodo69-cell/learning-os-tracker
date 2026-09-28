/**
 * Lịch học kỳ và thi thử (docs/PRODUCT.md mục 5).
 *
 * ĐÂY LÀ FILE BẠN SỬA khi lịch thay đổi (đổi ngày thi thử, thêm hạn chót...):
 * chỉ cần sửa bảng bên dưới, không cần đụng vào file nào khác.
 * Thay cho lịch 12 tuần cũ (protocolPhases.ts) từ Đợt 2, 2026-09-28.
 *
 * Ngày viết dạng "YYYY-MM-DD". Mốc kéo dài nhiều ngày thì thêm `to` (tính cả ngày đó).
 */

export type MilestoneKind =
  | "mock"        // thi thử IELTS — màn Hôm nay đếm ngược tới mốc này
  | "exam"        // thi thật IELTS — đếm ngược khi đã hết thi thử
  | "school-exam" // thi môn ở trường — tuần có mốc này là "tuần nhẹ nhịp"
  | "deadline";   // hạn nộp khác (AFEP...) — chỉ để ghi nhớ, chưa hiện ở đâu

export type Milestone = {
  date: string;   // ngày bắt đầu, "YYYY-MM-DD"
  to?: string;    // ngày kết thúc nếu kéo dài nhiều ngày (tính cả ngày đó)
  label: string;  // câu hiện trên màn hình
  kind: MilestoneKind;
  /** Nhãn ngắn trên timeline "Đường tới 7.5" (chỉ mốc thi thử / thi thật). */
  short?: string;
  /** Cổng quyết định (PRODUCT.md mục 3): dưới 6.5 thì dời thi thật. */
  gate?: boolean;
};

/**
 * Thi thử 3, 4 và thi thật là ngày TẠM (chủ app chốt 2026-09-28): PRODUCT.md
 * chỉ ghi "giữa T1 / giữa T2 / T3". Có lịch chính thức thì sửa ở đây.
 */
export const MILESTONES: Milestone[] = [
  { date: "2026-10-03", to: "2026-10-04", label: "Thi thử 0 · baseline, ở nhà", kind: "mock", short: "T0" },
  { date: "2026-10-11", label: "Midterm EFM", kind: "school-exam" },
  { date: "2026-10-25", label: "AFEP bản cá nhân + thuyết trình", kind: "deadline" },
  { date: "2026-11-08", label: "AFEP bản nhóm + thuyết trình", kind: "deadline" },
  { date: "2026-11-15", label: "Thi thử 1 · ở nhà", kind: "mock", short: "T1" },
  { date: "2026-11-25", label: "Final EFM + AFEP reflection", kind: "school-exam" },
  { date: "2026-12-02", label: "Final BFN", kind: "school-exam" },
  { date: "2026-12-12", to: "2026-12-13", label: "Thi thử 2 · trung tâm · cổng quyết định", kind: "mock", short: "T2", gate: true },
  { date: "2027-01-16", label: "Thi thử 3 · ở nhà", kind: "mock", short: "T3" },
  { date: "2027-02-20", label: "Thi thử 4 · trung tâm", kind: "mock", short: "T4" },
  { date: "2027-03-20", label: "Thi thật IELTS", kind: "exam", short: "Thi thật" },
];

/**
 * Khoảng "baseline" mà Thống kê dùng để so sánh (14 ngày đầu, chỉ log, chưa
 * đổi gì). Trước đây là "giai đoạn 1" của lịch 12 tuần; giữ nguyên đúng
 * khoảng đó để số liệu so sánh không đổi khi thay lịch.
 */
export const BASELINE = { from: "2026-09-28", to: "2026-10-11" } as const;
