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

/* ===================== Phase 2 ===================== */

/** Brain dump: viết lại những gì nhớ được, rồi đối chiếu tìm chỗ hổng. */
export type BrainDump = {
  id: string;
  date: string;   // "YYYY-MM-DD"
  area: Area;
  recalled: string; // nhớ được gì (không mở tài liệu)
  gaps: string;     // chỗ hổng / sai khi đối chiếu
  minutes: number;
};

/** Điểm khi ôn một thẻ. */
export type Grade = "again" | "hard" | "good" | "easy";

/** Một thẻ ôn tập (spaced repetition). */
export type Card = {
  id: string;
  front: string;
  back: string;
  area: Area;
  createdAt: string;   // "YYYY-MM-DD"
  dueDate: string;     // "YYYY-MM-DD" — đến hạn khi dueDate <= hôm nay
  intervalDays: number;
  ease: number;
  reps: number;        // số lần ôn đúng liên tiếp
  lapses: number;      // số lần bấm "Quên"
};

/** Nhật ký mỗi lần ôn — không bao giờ sửa, chỉ ghi thêm. */
export type ReviewLog = {
  id: string;
  cardId: string;
  date: string;
  grade: Grade;
  intervalBefore: number; // khoảng cách ngày TRƯỚC lần ôn này
};

/* ===================== Phase 3 ===================== */

export const PREDICTION_CATEGORIES = ["Deal/VC", "Market", "Study", "Personal"] as const;
export type PredictionCategory = (typeof PREDICTION_CATEGORIES)[number];

/** Một dự đoán kèm xác suất, sau này chấm đúng/sai và tính Brier score. */
export type Prediction = {
  id: string;
  statement: string;
  probability: number;            // 1-99 (phần trăm)
  category: PredictionCategory;
  createdAt: string;              // "YYYY-MM-DD"
  resolveBy: string;              // "YYYY-MM-DD" — hạn chót để chấm
  outcome: true | false | null;   // null = chưa chấm
  resolvedAt?: string;            // "YYYY-MM-DD" — ngày bấm chấm
  note?: string;                  // vd: base rate đã dùng
  /**
   * Chỉ dùng cho category "Deal/VC".
   * "Giả sử 3 năm sau khoản này thất bại — vì sao?"
   * Viết TRƯỚC khi biết kết quả, để tự ép mình nghĩ mặt trái.
   */
  preMortem?: string;
};

/* ===================== Phase 4 ===================== */

/** Tổng kết tuần — mỗi tuần một bản ghi, khoá là ngày Thứ Hai. */
export type WeeklyReview = {
  weekStart: string;            // Thứ Hai, "YYYY-MM-DD" (khoá chính)
  learnedWithoutNotes: string;  // học được gì mà làm lại được không cần tài liệu
  dataInsight: string;          // dữ liệu cho thấy gì
  oneChange: string;            // một điều chỉnh duy nhất cho tuần tới
};

/** Một thí nghiệm cá nhân: so sánh hai cách làm A và B. */
export type Experiment = {
  id: string;
  name: string;       // vd: "Vị trí điện thoại"
  labelA: string;     // vd: "Điện thoại phòng khác"
  labelB: string;     // vd: "Trên bàn"
  createdAt: string;
  active: boolean;    // chỉ thí nghiệm đang chạy mới hiện chip ở màn hình Hôm nay
};

/** Đánh dấu một ngày thuộc nhánh A hay B của một thí nghiệm. */
export type ExperimentTag = {
  /** Khoá ghép "date|experimentId" — mỗi thí nghiệm mỗi ngày chỉ một nhãn. */
  key: string;
  date: string;
  experimentId: string;
  condition: "A" | "B";
};
