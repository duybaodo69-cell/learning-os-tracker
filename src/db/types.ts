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
  /** Khoá chính = "#" + date (xem src/db/keys.ts). Thêm ở Dexie version 6. */
  id: string;
  date: string;       // "YYYY-MM-DD" — mỗi ngày đúng một bản ghi
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
  /**
   * "Việc chen ngang" ghi nhanh TRONG LÚC phiên đang chạy (ý nghĩ nảy ra,
   * việc cần làm sau...). Mỗi ghi chú cũng tính là một lần phân tâm.
   * Không bắt buộc: block cũ và block log tay không có trường này.
   */
  capturedNotes?: string[];
  /**
   * Phần IELTS của phiên — chỉ có khi area là "IELTS" (Đợt 1, 2026-09).
   * Nằm ngay trong block để phiên và điểm luôn được lưu cùng một lần ghi.
   * Block cũ và block area khác không có trường này.
   */
  ielts?: IeltsSession;
};

/* ===================== IELTS (Đợt 1) ===================== */

export const IELTS_SKILLS = ["Listening", "Reading", "Writing", "Speaking"] as const;
export type IeltsSkill = (typeof IELTS_SKILLS)[number];

/**
 * Một đề đã làm trong phiên Listening / Reading.
 * `errors` là 4 bộ đếm lỗi. Nghĩa của từng ô TUỲ KỸ NĂNG (docs/PRODUCT.md):
 *   Listening (mục 7):  [① Không nghe ra, ② Viết sai, ③ Bẫy/paraphrase, ④ Lạc chỗ]
 *   Reading   (mục 7b): [Ⓐ Hết giờ, Ⓑ Không tìm ra chỗ, Ⓒ Hiểu sai câu, Ⓓ Sai logic/format]
 * Hai bộ KHÔNG trộn: luôn đọc kèm `skill` của phiên.
 * Luôn đúng: errors cộng lại = questions − correct.
 */
export type IeltsTestResult = {
  book: number;       // Cam 10-19
  test: number;       // Test 1-4
  parts: number[];    // Listening: section 1-4 · Reading: passage 1-3 (tăng dần)
  questions: number;  // số câu đã làm (mặc định tự cộng từ các phần, sửa được)
  correct: number;    // số câu đúng
  errors: [number, number, number, number];
};

export type IeltsSession = {
  skill: IeltsSkill;
  /** Không có = buổi không làm đề (chỉ chép chính tả, từ vựng...) hoặc Writing/Speaking. */
  test?: IeltsTestResult;
  /** Phút chép chính tả — chỉ Listening. */
  dictationMinutes?: number;
  /** Band AI chấm — chỉ Writing/Speaking, tuỳ chọn (0-9, bước 0.5). */
  aiBand?: number;
};

/** Nơi thi thử (PRODUCT.md mục 8: ở nhà / trung tâm / AI). */
export const MOCK_SOURCES = ["home", "center", "ai"] as const;
export type MockSource = (typeof MOCK_SOURCES)[number];

/**
 * Một lần thi thử. Mỗi kỹ năng tuỳ chọn (thi thử AI có thể chỉ chấm Writing).
 * Band L/R và overall KHÔNG lưu — luôn tính lại từ điểm thô (src/lib/ielts.ts),
 * để sửa bảng quy đổi là mọi màn hình đổi theo.
 */
export type MockTest = {
  id: string;
  date: string;            // "YYYY-MM-DD"
  source: MockSource;
  listeningRaw?: number;   // 0-40
  readingRaw?: number;     // 0-40
  writingBand?: number;    // 0-9, bước 0.5
  speakingBand?: number;   // 0-9, bước 0.5
  note?: string;
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
  /** Thẻ tạo từ ô "chỗ hổng" của brain dump nào (không có = tạo tay). */
  brainDumpId?: string;
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
  /** Khoá chính = "#" + weekStart (xem src/db/keys.ts). Thêm ở Dexie version 6. */
  id: string;
  weekStart: string;            // Thứ Hai, "YYYY-MM-DD"
  learnedWithoutNotes: string;  // học được gì mà làm lại được không cần tài liệu
  dataInsight: string;          // dữ liệu cho thấy gì
  oneChange: string;            // một điều chỉnh duy nhất cho tuần tới
  /**
   * Điều chỉnh đã chọn ở tuần TRƯỚC có làm được không — trả lời khi viết
   * tổng kết tuần này. Không có = tuần trước chưa chọn gì, hoặc bỏ qua.
   */
  lastChangeResult?: "yes" | "partly" | "no";
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
