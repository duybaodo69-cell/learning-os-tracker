/**
 * Glow-up 12 tuần (docs/PRODUCT.md mục 10) — toàn bộ phép tính, hàm thuần, có test
 * (glowUp.test.ts). Lịch và chỉ tiêu nằm ở src/config/glowUp.ts.
 *
 * Quy ước giống phần IELTS:
 *   - đếm NGÀY đạt trong tuần (x/7), không bao giờ đếm chuỗi
 *   - không có dữ liệu thì trả `null`, không trả 0
 */
import {
  ADAPALENE_ALTERNATE_UNTIL_WEEK,
  ADJUST_RULES,
  DAILY_TARGETS,
  DAY_MET_MIN,
  GLOW_END,
  GLOW_START,
  PHOTO_WEEKS,
  GYM,
  LOAD_STEP_KG,
  PHASE_LABELS,
  RUNNING,
  SLEEP_RAMP,
  WEEKS,
  WEEK_TEMPLATE,
  type Exercise,
  type GymSessionId,
  type PlannedSessionId,
  type ProgramWeek,
} from "../config/glowUp";
import type { BodyCheckin, DailyCheckin, GlowDay, Workout, WorkoutSet } from "../db/types";
import { daysUntil } from "./dates";
import { mondayOf } from "./metrics";
import { addDays } from "./scheduling";

/* ==================== Tuần nào, buổi gì ==================== */

/** Tuần 1-12 của chương trình chứa ngày này. Ngoài 12 tuần: null. */
export function programWeek(date: string): ProgramWeek | null {
  if (date < GLOW_START || date > GLOW_END) return null;
  const index = Math.floor(daysUntil(GLOW_START, date) / 7);
  return WEEKS[index] ?? null;
}

/** "Tuần 1 · Nền tảng". */
export function weekTitle(w: ProgramWeek): string {
  return `Tuần ${w.week} · ${PHASE_LABELS[w.phase]}`;
}

/** Vị trí trong tuần: 0 = Thứ Hai ... 6 = Chủ nhật. */
export function weekdayIndex(date: string): number {
  return daysUntil(mondayOf(date), date);
}

export type DayPlan = {
  session: PlannedSessionId;
  label: string;
  time: string | null;
  minutes: string;
  /** Nội dung cụ thể: bài chạy theo giai đoạn, hoặc lời nhắc tuần giảm tải. */
  detail?: string;
};

/** Buổi tập theo lịch của ngày này. Ngoài 12 tuần: null. */
export function planFor(date: string): DayPlan | null {
  const week = programWeek(date);
  if (!week) return null;
  const t = WEEK_TEMPLATE[weekdayIndex(date)];
  const plan: DayPlan = { session: t.session, label: t.label, time: t.time, minutes: t.minutes };
  if (t.session === "run_easy" || t.session === "run_interval" || t.session === "run_long") {
    const phase = RUNNING.find((r) => week.week >= r.from && week.week <= r.to);
    // Tuần giảm tải: mọi buổi chạy đều là chạy nhẹ.
    plan.detail = week.deload ? "Tuần giảm tải: chỉ chạy nhẹ" : phase?.[t.session];
  } else if (t.session !== "rest" && week.deload) {
    plan.detail = "Tuần giảm tải: 2 hiệp mỗi bài";
  }
  return plan;
}

/** Số hiệp mỗi bài gym trong tuần này (tuần giảm tải còn 2). */
export function setsFor(exercise: Exercise, date: string): number {
  return programWeek(date)?.deload ? Math.min(2, exercise.sets) : exercise.sets;
}

/* ==================== Giấc ngủ ==================== */

/** Giờ tắt đèn của ĐÊM bắt đầu ngày `night`. Ngoài lộ trình: null. */
export function lightsOutFor(night: string): string | null {
  return SLEEP_RAMP.find((r) => night >= r.from && night <= r.to)?.lightsOut ?? null;
}

/**
 * "HH:mm" -> số phút, nhưng giờ trước 12:00 tính là SAU nửa đêm (+24h).
 * Nhờ vậy 00:30 trễ hơn 23:30, đúng với giờ đi ngủ.
 */
function bedMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  const minutes = h * 60 + m;
  return h < 12 ? minutes + 24 * 60 : minutes;
}

export type SleepCheck = { bedTime: string; target: string; onTime: boolean };

/**
 * Mục "Ngủ" của ngày `date`. Check-in ngày D ghi giờ lên giường của ĐÊM TRƯỚC
 * (đêm D-1), nên so với giờ tắt đèn của đêm D-1. Ngày đầu chương trình (đêm
 * trước còn ngoài lộ trình) dùng mốc đầu tiên.
 * Chưa check-in, hoặc giờ ngủ trống: null (chưa biết).
 */
export function sleepCheck(checkin: DailyCheckin | null | undefined, date: string): SleepCheck | null {
  if (!checkin || !checkin.bedTime) return null;
  const target = lightsOutFor(addDays(date, -1)) ?? (programWeek(date) ? SLEEP_RAMP[0].lightsOut : null);
  if (!target) return null;
  return { bedTime: checkin.bedTime, target, onTime: bedMinutes(checkin.bedTime) <= bedMinutes(target) };
}

/* ==================== Skincare ==================== */

/**
 * Tối nay có bôi adapalene không? Tuần 1-2: cách đêm, bắt đầu từ tối ngày
 * đầu tiên (19/10 có, 20/10 không...). Từ tuần 3: mỗi tối. Ngoài 12 tuần: null.
 */
export function adapaleneTonight(date: string): boolean | null {
  const week = programWeek(date);
  if (!week) return null;
  if (week.week > ADAPALENE_ALTERNATE_UNTIL_WEEK) return true;
  return daysUntil(GLOW_START, date) % 2 === 0;
}

/* ==================== Checklist hằng ngày ==================== */

/** Cộng một bước "+" (hoặc trừ, `sign` = -1), không xuống dưới 0, làm tròn tránh 0.30000000000000004. */
export function stepValue(current: number | undefined, step: number, sign: 1 | -1): number {
  const next = (current ?? 0) + sign * step;
  return Math.max(0, Math.round(next * 100) / 100);
}

/** Phút chạy trong ngày (để cộng thêm nước). */
function runMinutes(workouts: Workout[], date: string): number {
  return workouts
    .filter((w) => w.date === date && w.session.startsWith("run_"))
    .reduce((sum, w) => sum + w.minutes, 0);
}

/** Lít nước cần trong ngày: 2,7 + 0,5 mỗi giờ chạy đã ghi, làm tròn 0,1. */
export function waterTarget(workouts: Workout[], date: string): number {
  const extra = (runMinutes(workouts, date) / 60) * DAILY_TARGETS.waterPerRunHourL;
  return Math.round((DAILY_TARGETS.waterL + extra) * 10) / 10;
}

export type ChecklistId =
  | "sleep"
  | "water"
  | "protein"
  | "fiber"
  | "steps"
  | "noSugaryDrinks"
  | "skincareAm"
  | "skincarePm"
  | "training";

export type ChecklistItem = { id: ChecklistId; done: boolean };

export type DayChecklist = {
  items: ChecklistItem[];
  done: number;
  /** Số mục tính trong ngày: 9, Chủ nhật 8 (không có buổi tập). */
  total: number;
  /** Ngày đạt Glow-up: done >= 7. */
  met: boolean;
};

/**
 * Checklist của một ngày, theo PRODUCT.md mục 10.
 * Ngủ lấy từ check-in, buổi tập từ bảng workouts; còn lại từ GlowDay.
 * Ngày nghỉ (Chủ nhật) không có mục buổi tập.
 */
export function dayChecklist(
  date: string,
  day: GlowDay | null | undefined,
  checkin: DailyCheckin | null | undefined,
  workouts: Workout[]
): DayChecklist {
  const d = day ?? undefined;
  const items: ChecklistItem[] = [
    { id: "sleep", done: sleepCheck(checkin, date)?.onTime === true },
    { id: "water", done: (d?.waterL ?? 0) >= waterTarget(workouts, date) },
    { id: "protein", done: (d?.proteinG ?? 0) >= DAILY_TARGETS.proteinG },
    { id: "fiber", done: (d?.fiberG ?? 0) >= DAILY_TARGETS.fiberG },
    { id: "steps", done: (d?.steps ?? 0) >= DAILY_TARGETS.steps },
    { id: "noSugaryDrinks", done: d?.noSugaryDrinks === true },
    { id: "skincareAm", done: d?.skincareAm === true },
    { id: "skincarePm", done: d?.skincarePm === true },
  ];
  if (planFor(date)?.session !== "rest") {
    items.push({ id: "training", done: workouts.some((w) => w.date === date) });
  }
  const done = items.filter((i) => i.done).length;
  return { items, done, total: items.length, met: done >= DAY_MET_MIN };
}

export type GlowWeekDay = { date: string; met: boolean };

/**
 * 7 ngày Thứ Hai → Chủ nhật của tuần chứa `today`, ngày nào đạt Glow-up.
 * Ngày tương lai luôn là chưa đạt. Đếm ngày, không đếm chuỗi.
 */
export function glowWeek(
  today: string,
  days: GlowDay[],
  checkins: DailyCheckin[],
  workouts: Workout[]
): GlowWeekDay[] {
  const monday = mondayOf(today);
  const dayByDate = new Map(days.map((d) => [d.date, d]));
  const checkinByDate = new Map(checkins.map((c) => [c.date, c]));
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const met =
      date <= today && dayChecklist(date, dayByDate.get(date), checkinByDate.get(date), workouts).met;
    return { date, met };
  });
}

/* ==================== Ghi buổi tập (gym) ==================== */

/** 42.5 -> "42,5" (dấu phẩy thập phân kiểu Việt Nam). */
export function formatKg(kg: number): string {
  return String(kg).replace(".", ",");
}

/** Ô số thập phân: "42,5" hoặc "42.5" -> 42.5 · trống -> null · chữ hoặc số âm -> NaN. */
export function parseDecimal(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

/** Bài tập của một buổi gym (theo config). */
export function exercisesFor(session: GymSessionId): Exercise[] {
  return GYM[session].exercises;
}

/** "8-10" -> {min: 8, max: 10}, "15" -> {min: 15, max: 15}. "tối đa", "30-45 giây"...: null. */
export function repRange(reps: string): { min: number; max: number } | null {
  const range = /^(\d+)-(\d+)$/.exec(reps.trim());
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const single = /^(\d+)$/.exec(reps.trim());
  if (single) return { min: Number(single[1]), max: Number(single[1]) };
  return null;
}

/**
 * Số lần điền sẵn khi chưa có buổi trước: đáy khoảng ("8-10" -> 8), hoặc số
 * đầu tiên trong chuỗi ("30-45 giây" -> 30, "10 mỗi bên" -> 10), "tối đa" -> 10.
 */
export function defaultReps(reps: string): number {
  const range = repRange(reps);
  if (range) return range.min;
  const first = /\d+/.exec(reps);
  return first ? Number(first[0]) : 10;
}

/**
 * Buổi gần nhất có ghi bài này, TRƯỚC buổi đang sửa (`excludeId`).
 * Sắp theo ngày rồi giờ bắt đầu, giống "đề tiếp theo" của IELTS.
 */
export function lastSetsFor(workouts: Workout[], exerciseId: string, excludeId?: string): WorkoutSet[] {
  const withExercise = workouts
    .filter((w) => w.id !== excludeId && w.sets?.some((s) => s.exercise === exerciseId))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const last = withExercise[withExercise.length - 1];
  return last?.sets?.filter((s) => s.exercise === exerciseId) ?? [];
}

/**
 * Gợi ý mức tạ cho buổi tới (PRODUCT.md mục 10, "Tăng tạ"):
 * buổi trước làm đủ số hiệp, MỌI hiệp đạt đỉnh số lần và cùng một mức tạ
 * -> tăng +2,5 kg (thân trên) hoặc +5 kg (chân). Không thì giữ mức cũ.
 * Bài tạ người, số lần không phải số ("tối đa"), chưa có buổi trước: null.
 */
export function suggestLoad(exercise: Exercise, lastSets: WorkoutSet[]): { kg: number; increase: boolean } | null {
  if (exercise.load === "bodyweight") return null;
  const range = repRange(exercise.reps);
  const weighted = lastSets.filter((s) => s.kg !== null);
  if (!range || weighted.length === 0) return null;
  const heaviest = Math.max(...weighted.map((s) => s.kg as number));
  const topped =
    lastSets.length >= exercise.sets &&
    lastSets.every((s) => s.kg === heaviest && s.reps >= range.max);
  return topped ? { kg: heaviest + LOAD_STEP_KG[exercise.load], increase: true } : { kg: heaviest, increase: false };
}

/**
 * Các hiệp điền sẵn khi mở form gym: mỗi bài đủ số hiệp của tuần này (giảm
 * tải còn 2). Nên tăng tạ: mọi hiệp = mức mới, số lần về đáy khoảng. Không
 * thì chép đúng hiệp tương ứng của buổi trước (kg + số lần). Chưa có buổi
 * trước: kg trống, số lần = `defaultReps`.
 */
export function prefillSets(session: GymSessionId, date: string, workouts: Workout[], excludeId?: string): WorkoutSet[] {
  return exercisesFor(session).flatMap((ex) => {
    const last = lastSetsFor(workouts, ex.id, excludeId);
    const firstReps = defaultReps(ex.reps);
    const suggestion = suggestLoad(ex, last);
    return Array.from({ length: setsFor(ex, date) }, (_, i): WorkoutSet => {
      const prev = last[i] ?? last[last.length - 1];
      if (suggestion?.increase) return { exercise: ex.id, kg: suggestion.kg, reps: firstReps };
      return { exercise: ex.id, kg: prev?.kg ?? null, reps: prev?.reps ?? firstReps };
    });
  });
}

/* ==================== Check-in Chủ nhật (G3) ==================== */

/**
 * Tuần cần check-in hôm nay (Thứ Hai của tuần đó), hoặc null:
 *   - Chủ nhật trong 12 tuần: tuần này
 *   - Thứ Hai: tuần TRƯỚC, nếu tuần đó thuộc chương trình mà chưa check-in
 *     (lỡ Chủ nhật thì vẫn còn một ngày để ghi, nhất là check-in gốc tuần 1)
 */
export function checkinWeekToAsk(today: string, checkins: BodyCheckin[]): string | null {
  const day = weekdayIndex(today);
  if (day === 6) return programWeek(today) ? mondayOf(today) : null;
  if (day === 0) {
    const lastMonday = addDays(today, -7);
    const missing = !checkins.some((c) => c.weekStart === lastMonday);
    return programWeek(lastMonday) && missing ? lastMonday : null;
  }
  return null;
}

/** Các lần cân sáng trong tuần bắt đầu `weekStart`, Thứ Hai trước. */
export function weekWeighIns(days: GlowDay[], weekStart: string): number[] {
  const end = addDays(weekStart, 6);
  return days
    .filter((d) => d.date >= weekStart && d.date <= end && d.weightKg !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => d.weightKg as number);
}

/** Trung bình, làm tròn 0,1 kg. Không có lần cân nào: null (không phải 0). */
export function averageWeight(weights: number[]): number | null {
  if (weights.length === 0) return null;
  const sum = weights.reduce((a, b) => a + b, 0);
  // Nhân 10 trước rồi mới chia, tránh lỗi số thực kiểu 70.15 -> 70.1.
  return Math.round((sum * 10) / weights.length) / 10;
}

/** Số buổi gym và chạy đã ghi trong tuần (Thứ Hai → Chủ nhật). */
export function weekSessionCounts(workouts: Workout[], weekStart: string): { gym: number; run: number } {
  const end = addDays(weekStart, 6);
  const inWeek = workouts.filter((w) => w.date >= weekStart && w.date <= end);
  return {
    gym: inWeek.filter((w) => w.session.startsWith("gym_")).length,
    run: inWeek.filter((w) => w.session.startsWith("run_")).length,
  };
}

/** Tuần này có phải tuần chụp ảnh tiến độ (1, 4, 8, 12) không. */
export function isPhotoWeek(weekStart: string): boolean {
  const week = programWeek(weekStart);
  return week !== null && PHOTO_WEEKS.includes(week.week);
}

/** Làm tròn hiệu số tới 0,1 (tránh 69.8 - 70 = -0.20000000000000284). */
const diff1 = (a: number, b: number) => Math.round((a - b) * 10) / 10;

/**
 * Hai luật điều chỉnh (PRODUCT.md mục 10), dùng cân trung bình của tuần này
 * (`currentAvg`, có thể đang gõ dở) và các check-in đã lưu của tuần trước:
 *   1. giảm dưới 0,2 kg hai tuần liền (cần 3 tuần liên tiếp có số) -> bớt cơm / thêm bước
 *   2. từ tuần 3, giảm trên 1 kg so với tuần trước -> ăn thêm ~150 kcal
 * Thiếu số thì không kết luận gì (trả về danh sách rỗng).
 */
export function adjustHints(checkins: BodyCheckin[], weekStart: string, currentAvg: number | null): string[] {
  if (currentAvg === null) return [];
  const avgOf = (monday: string) => checkins.find((c) => c.weekStart === monday)?.avgWeightKg ?? null;
  const prev = avgOf(addDays(weekStart, -7));
  const prev2 = avgOf(addDays(weekStart, -14));
  const hints: string[] = [];
  if (prev !== null && prev2 !== null) {
    const slow = diff1(prev2, prev) < ADJUST_RULES.slowLossKg && diff1(prev, currentAvg) < ADJUST_RULES.slowLossKg;
    if (slow) hints.push(ADJUST_RULES.slowLossAdvice);
  }
  const week = programWeek(weekStart)?.week ?? 0;
  if (prev !== null && week >= ADJUST_RULES.fastLossFromWeek && diff1(prev, currentAvg) > ADJUST_RULES.fastLossKg) {
    hints.push(ADJUST_RULES.fastLossAdvice);
  }
  return hints;
}

export type StartComparison = {
  /** Thay đổi so với tuần 1 (âm = giảm). null khi thiếu số của một trong hai tuần. */
  weightKg: number | null;
  waistCm: number | null;
  /** Mốc của tuần này (tuần 4 / 8 / 12), nếu có. */
  milestone?: { weightKg: number; waistCm: number };
};

/**
 * So số đo tuần này với check-in tuần 1 (mốc tính tương đối, PRODUCT.md mục 10).
 * Chính tuần 1, hoặc chưa có check-in tuần 1: null.
 */
export function startComparison(
  checkins: BodyCheckin[],
  weekStart: string,
  avgWeightKg: number | null,
  waistCm: number | null
): StartComparison | null {
  if (weekStart <= GLOW_START) return null;
  const base = checkins.find((c) => c.weekStart === GLOW_START);
  if (!base) return null;
  return {
    weightKg: avgWeightKg !== null && base.avgWeightKg !== undefined ? diff1(avgWeightKg, base.avgWeightKg) : null,
    waistCm: waistCm !== null && base.waistCm !== undefined ? diff1(waistCm, base.waistCm) : null,
    milestone: programWeek(weekStart)?.milestone,
  };
}

/* ==================== Màn lịch 12 tuần + biểu đồ (G4) ==================== */

export type BodyWeekPoint = {
  week: number;
  weekStart: string;
  /** Nhãn trục ngang: "T1" ... "T12". */
  label: string;
  /** Số đã check-in. Tuần chưa check-in: null (đường nối qua, không về 0). */
  weightKg: number | null;
  waistCm: number | null;
  /** Mốc của tuần 4 / 8 / 12 = số tuần 1 + mốc tương đối. Chưa có số tuần 1: null. */
  targetWeightKg: number | null;
  targetWaistCm: number | null;
};

/** 12 điểm cho biểu đồ cân / vòng bụng và bảng số đo (PRODUCT.md mục 10, "Mốc"). */
export function bodySeries(checkins: BodyCheckin[]): BodyWeekPoint[] {
  const byWeek = new Map(checkins.map((c) => [c.weekStart, c]));
  const base = byWeek.get(GLOW_START);
  // Cộng mốc tương đối vào số gốc, làm tròn 0,1 (78 + -5.5 = 72.5).
  const target = (baseValue: number | undefined, delta: number | undefined) =>
    baseValue === undefined || delta === undefined ? null : Math.round((baseValue + delta) * 10) / 10;
  return WEEKS.map((w) => {
    const c = byWeek.get(w.start);
    return {
      week: w.week,
      weekStart: w.start,
      label: `T${w.week}`,
      weightKg: c?.avgWeightKg ?? null,
      waistCm: c?.waistCm ?? null,
      targetWeightKg: target(base?.avgWeightKg, w.milestone?.weightKg),
      targetWaistCm: target(base?.waistCm, w.milestone?.waistCm),
    };
  });
}

/**
 * Số ngày đạt Glow-up của một tuần (đếm tới hôm nay nếu là tuần đang chạy).
 * Tuần chưa tới: null — không phải 0, vì chưa có gì để đếm.
 */
export function weekMetCount(
  weekStart: string,
  today: string,
  days: GlowDay[],
  checkins: DailyCheckin[],
  workouts: Workout[]
): number | null {
  if (weekStart > today) return null;
  const sunday = addDays(weekStart, 6);
  return glowWeek(sunday < today ? sunday : today, days, checkins, workouts).filter((d) => d.met).length;
}
