/**
 * Chương trình Glow-up 12 tuần (docs/PRODUCT.md mục 10).
 *
 * ĐÂY LÀ FILE BẠN SỬA khi đổi lịch tập, chỉ tiêu hay bắt đầu 12 tuần tiếp theo.
 * Chép từ kế hoạch "glow-up.json" (19/10/2026), có ba thay đổi đã chốt:
 *   - KHÔNG có tuổi / cân nặng / vòng bụng: file này nằm trong bản build mà ai
 *     có link app cũng tải được. Số đo của bạn chỉ nằm trong IndexedDB.
 *   - Mốc cân / vòng bụng ghi TƯƠNG ĐỐI so với check-in tuần 1 (-2 kg...).
 *   - Gym 07:15 thay vì 08:00, để không đụng khung IELTS 9:30.
 *
 * Mỗi bài tập có `id` cố định: lịch sử tăng tạ gắn với id, nên đổi tên bài
 * (`name`) không làm mất lịch sử. Đổi `id` thì coi như một bài mới.
 */

/** Ngày đầu (Thứ Hai) và ngày cuối (Chủ nhật) của 12 tuần. */
export const GLOW_START = "2026-10-19";
export const GLOW_END = "2027-01-10";

/** Giờ tắt đèn của các ĐÊM trong khoảng from..to (tính cả hai đầu). */
export const SLEEP_RAMP: { from: string; to: string; lightsOut: string }[] = [
  { from: "2026-10-19", to: "2026-10-21", lightsOut: "00:00" },
  { from: "2026-10-22", to: "2026-10-24", lightsOut: "23:30" },
  { from: "2026-10-25", to: "2027-01-10", lightsOut: "23:00" },
];
export const WAKE_TIME = "07:00";

/** Chỉ tiêu mỗi ngày dùng trong checklist. */
export const DAILY_TARGETS = {
  waterL: 2.7,
  /** Thêm bao nhiêu lít nước cho mỗi giờ chạy. */
  waterPerRunHourL: 0.5,
  proteinG: 125,
  fiberG: 30,
  steps: 8000,
} as const;

/** Một lần bấm "+" ở checklist cộng bao nhiêu. */
export const CHECKLIST_STEPS = { waterL: 0.25, proteinG: 25, fiberG: 10 } as const;

/** Ngày đạt Glow-up = đạt ít nhất từng này mục (9 mục, Chủ nhật 8). */
export const DAY_MET_MIN = 7;

/* ==================== Buổi tập ==================== */

export type GymSessionId = "gym_A" | "gym_B" | "gym_C";
export type RunSessionId = "run_easy" | "run_interval" | "run_long";
export type PlannedSessionId = GymSessionId | RunSessionId | "rest";

/** upper = thân trên (+2,5 kg) · lower = chân (+5 kg) · bodyweight = không tăng tạ. */
export type Load = "upper" | "lower" | "bodyweight";

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  /** Ví dụ "8-10". Chỉ dạng "a-b" hoặc một số mới có gợi ý tăng tạ. */
  reps: string;
  restS: number;
  load: Load;
};

/** Tăng tạ (kg) khi cả 3 hiệp đạt đỉnh số lần. */
export const LOAD_STEP_KG: Record<Exclude<Load, "bodyweight">, number> = { upper: 2.5, lower: 5 };

export const WARMUP = "5 phút đạp xe hoặc đi bộ nhanh, 2 hiệp nhẹ bài đầu";

export const GYM: Record<GymSessionId, { name: string; exercises: Exercise[] }> = {
  gym_A: {
    name: "Gym A: đẩy + chân",
    exercises: [
      { id: "goblet_squat", name: "Goblet squat (squat tạ đòn từ tuần 5)", sets: 3, reps: "8-10", restS: 120, load: "lower" },
      { id: "bench_press", name: "Bench press hoặc đẩy tạ đơn", sets: 3, reps: "8-10", restS: 120, load: "upper" },
      { id: "seated_db_press", name: "Đẩy vai tạ đơn ngồi", sets: 3, reps: "8-10", restS: 90, load: "upper" },
      { id: "lat_pulldown", name: "Lat pulldown", sets: 3, reps: "10-12", restS: 90, load: "upper" },
      { id: "lateral_raise", name: "Lateral raise", sets: 3, reps: "12-15", restS: 60, load: "upper" },
      { id: "plank", name: "Plank", sets: 3, reps: "30-45 giây", restS: 60, load: "bodyweight" },
    ],
  },
  gym_B: {
    name: "Gym B: kéo + core",
    exercises: [
      { id: "romanian_deadlift", name: "Romanian deadlift", sets: 3, reps: "8-10", restS: 120, load: "lower" },
      { id: "assisted_pullup", name: "Kéo xà trợ lực (hoặc lat pulldown)", sets: 3, reps: "6-10", restS: 120, load: "upper" },
      { id: "seated_cable_row", name: "Seated cable row", sets: 3, reps: "10-12", restS: 90, load: "upper" },
      { id: "incline_db_press", name: "Incline dumbbell press", sets: 3, reps: "10-12", restS: 90, load: "upper" },
      { id: "face_pull", name: "Face pull", sets: 3, reps: "15", restS: 60, load: "upper" },
      { id: "dead_bug", name: "Dead bug", sets: 3, reps: "10 mỗi bên", restS: 60, load: "bodyweight" },
    ],
  },
  gym_C: {
    name: "Gym C: toàn thân",
    exercises: [
      { id: "leg_press", name: "Leg press hoặc Bulgarian split squat", sets: 3, reps: "10 mỗi chân", restS: 120, load: "lower" },
      { id: "one_arm_db_row", name: "One-arm dumbbell row", sets: 3, reps: "10 mỗi bên", restS: 90, load: "upper" },
      { id: "push_up", name: "Hít đất", sets: 3, reps: "tối đa", restS: 90, load: "bodyweight" },
      { id: "hip_thrust", name: "Hip thrust", sets: 3, reps: "10", restS: 90, load: "lower" },
      { id: "rear_delt_fly", name: "Rear delt fly", sets: 3, reps: "15", restS: 60, load: "upper" },
      { id: "hanging_knee_raise", name: "Nâng gối treo xà", sets: 3, reps: "10", restS: 60, load: "bodyweight" },
    ],
  },
};

/** Lịch tuần lặp lại. Thứ tự: Thứ Hai (0) → Chủ nhật (6). */
export const WEEK_TEMPLATE: { session: PlannedSessionId; label: string; time: string | null; minutes: string }[] = [
  { session: "gym_A", label: "Gym A (đẩy + chân)", time: "07:15", minutes: "60 phút" },
  { session: "run_easy", label: "Chạy nhẹ", time: "07:15", minutes: "30–45 phút" },
  { session: "gym_B", label: "Gym B (kéo + core)", time: "07:15", minutes: "60 phút" },
  { session: "run_interval", label: "Chạy interval", time: "07:15", minutes: "40–50 phút" },
  { session: "gym_C", label: "Gym C (toàn thân)", time: "07:15", minutes: "60 phút" },
  { session: "run_long", label: "Chạy dài", time: "06:45", minutes: "45–90 phút" },
  { session: "rest", label: "Nghỉ + check-in + chuẩn bị đồ ăn", time: null, minutes: "10–30 phút" },
];

/** Tên ngắn của mọi loại buổi (kể cả "other" = buổi ngoài lịch). */
export const SESSION_LABELS: Record<GymSessionId | RunSessionId | "other", string> = {
  gym_A: "Gym A",
  gym_B: "Gym B",
  gym_C: "Gym C",
  run_easy: "Chạy nhẹ",
  run_interval: "Chạy interval",
  run_long: "Chạy dài",
  other: "Buổi khác",
};

/** Nội dung buổi chạy theo giai đoạn (tuần from..to). */
export const RUNNING: { from: number; to: number; run_easy: string; run_interval: string; run_long: string }[] = [
  { from: 1, to: 4, run_easy: "30 phút nhẹ", run_interval: "6 × (1 phút nhanh, 2 phút nhẹ)", run_long: "6–8 km" },
  { from: 5, to: 8, run_easy: "40 phút nhẹ", run_interval: "5 × (3 phút tempo, 2 phút nhẹ)", run_long: "8–12 km" },
  { from: 9, to: 12, run_easy: "45 phút nhẹ", run_interval: "20 phút tempo đều", run_long: "12–16 km" },
];

/* ==================== 12 tuần ==================== */

export type Phase = "foundation" | "build" | "sharpen";
export const PHASE_LABELS: Record<Phase, string> = {
  foundation: "Nền tảng",
  build: "Phát triển",
  sharpen: "Bứt phá",
};

export type ProgramWeek = {
  week: number;
  start: string; // Thứ Hai
  phase: Phase;
  focus: string;
  checkpoint?: string;
  /** Mốc so với check-in tuần 1 (số âm = giảm). */
  milestone?: { weightKg: number; waistCm: number };
  /** Tuần giảm tải: gym 2 hiệp mỗi bài, chỉ chạy nhẹ. */
  deload?: boolean;
};

export const WEEKS: ProgramWeek[] = [
  { week: 1, start: "2026-10-19", phase: "foundation", focus: "Chụp ảnh gốc, đo bụng, mua đồ skincare, vào gym, chuyển giờ ngủ", checkpoint: "Ảnh + cân + vòng bụng gốc" },
  { week: 2, start: "2026-10-26", phase: "foundation", focus: "Đủ 3 buổi gym, bỏ hẳn nước ngọt" },
  { week: 3, start: "2026-11-02", phase: "foundation", focus: "Bắt đầu tăng tạ, adapalene dùng mỗi tối" },
  { week: 4, start: "2026-11-09", phase: "foundation", focus: "Trên 8.000 bước mỗi ngày, quay video kiểm tra form", checkpoint: "Ảnh", milestone: { weightKg: -2, waistCm: -2 } },
  { week: 5, start: "2026-11-16", phase: "build", focus: "Chạy giai đoạn 2, squat tạ đòn", checkpoint: "Cắt tóc" },
  { week: 6, start: "2026-11-23", phase: "build", focus: "Nấu sẵn đạm cho 3 ngày vào Chủ nhật" },
  { week: 7, start: "2026-11-30", phase: "build", focus: "Giảm mức trợ lực khi kéo xà" },
  { week: 8, start: "2026-12-07", phase: "build", focus: "Tuần giảm tải: gym 2 hiệp mỗi bài, chỉ chạy nhẹ", checkpoint: "Ảnh, đánh giá da", milestone: { weightKg: -4, waistCm: -4 }, deload: true },
  { week: 9, start: "2026-12-14", phase: "sharpen", focus: "Chạy giai đoạn 3, tăng tạ lại", checkpoint: "Cắt tóc" },
  { week: 10, start: "2026-12-21", phase: "sharpen", focus: "Noel: 1 bữa thoải mái có kế hoạch, vẫn tập" },
  { week: 11, start: "2026-12-28", phase: "sharpen", focus: "Năm mới: cùng quy tắc, không bỏ buổi" },
  { week: 12, start: "2027-01-04", phase: "sharpen", focus: "Test lại tạ chính và 5 km, so ảnh với tuần 1", checkpoint: "Ảnh, lên kế hoạch 12 tuần tiếp", milestone: { weightKg: -5.5, waistCm: -6 } },
];

/** Tuần chụp ảnh tiến độ (ảnh để trong app Ảnh, app chỉ đánh dấu). */
export const PHOTO_WEEKS = [1, 4, 8, 12];

/** Adapalene: tuần 1..ALTERNATE_UNTIL_WEEK dùng cách đêm, sau đó mỗi tối. */
export const ADAPALENE_ALTERNATE_UNTIL_WEEK = 2;

/* ==================== Check-in Chủ nhật (G3) ==================== */

/** Khoảng hợp lệ khi nhập số đo — ngoài khoảng này gần như chắc là gõ nhầm. */
export const WEIGHT_RANGE_KG = { min: 30, max: 250 } as const;
export const WAIST_RANGE_CM = { min: 40, max: 200 } as const;

/** Hai luật điều chỉnh của kế hoạch (PRODUCT.md mục 10), hiện thành một dòng gợi ý. */
export const ADJUST_RULES = {
  /** Cân trung bình giảm DƯỚI mức này hai tuần liền (kg/tuần)... */
  slowLossKg: 0.2,
  slowLossAdvice: "Giảm một phần tư chén cơm bữa tối hoặc thêm 2.000 bước mỗi ngày.",
  /** ...hoặc giảm TRÊN mức này trong một tuần, từ tuần 3 trở đi. */
  fastLossKg: 1,
  fastLossFromWeek: 3,
  fastLossAdvice: "Ăn thêm khoảng 150 kcal mỗi ngày (nhất là nếu tạ tập đang tụt).",
} as const;
