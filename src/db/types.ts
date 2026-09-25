/**
 * Toàn bộ kiểu dữ liệu của app.
 *
 * Đây là "bản hợp đồng" cho mọi phase — Phase 1 mới dùng 2 kiểu đầu,
 * các kiểu còn lại sẽ được thêm khi tới phase của nó.
 */

/** Các mảng (area) học tập / công việc. */
export const AREAS = [
  "Internship VC",
  "IM/Memo",
  "Financial modeling",
  "IELTS",
  "EFM",
  "AFEP",
  "BFN",
  "Stock competition",
  "M&A sourcing",
  "Other",
] as const;

// `typeof AREAS[number]` = "một trong các chuỗi nằm trong mảng AREAS".
// Nhờ vậy gõ sai tên area là TypeScript báo lỗi ngay.
export type Area = (typeof AREAS)[number];

/** Thang điểm 1-5 dùng cho năng lượng và độ tập trung. */
export type Rating = 1 | 2 | 3 | 4 | 5;

/** Check-in buổi sáng — mỗi ngày đúng một bản ghi. */
export type DailyCheckin = {
  date: string;       // "YYYY-MM-DD" — đồng thời là khoá chính
  bedTime: string;    // "HH:mm" giờ đi ngủ tối qua
  wakeTime: string;   // "HH:mm" giờ thức dậy sáng nay
  sleepHours: number; // tự tính từ bedTime + wakeTime
  energy: Rating;
  note?: string;
};

/** Một khối deep work. */
export type FocusBlock = {
  id: string;
  date: string;       // "YYYY-MM-DD"
  startTime: string;  // "HH:mm"
  minutes: number;
  area: Area;
  focusRating: Rating;
  distractions: number; // số lần bị phân tâm
  phoneAway: boolean;   // điện thoại có ở phòng khác không
  resumeNote?: string;  // "làm tiếp từ đâu"
};
