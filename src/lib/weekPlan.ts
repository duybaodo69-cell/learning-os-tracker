/**
 * Chốt kế hoạch Chủ nhật (Đợt 3) — hàm thuần, có test (weekPlan.test.ts).
 *
 * Buổi 12:00 Chủ nhật (PRODUCT.md mục 4) gồm ba bước, gần như chỉ bấm chạm:
 *   1. Nhìn lại tuần này bằng số: khung 9:30 x/7, giờ IELTS / mục tiêu,
 *      loại lỗi nhiều nhất, số lần dời, kế hoạch tuần trước làm được bao nhiêu
 *   2. Một điều chỉnh cho tuần tới (gợi ý từ số liệu, hoặc tự gõ)
 *   3. Chốt tuần tới: khối lượng đề (app đề xuất), deadline 7 ngày, tuần nhẹ nhịp
 *
 * Kế hoạch tuần tới lưu trong WeeklyReview của TUẦN NÀY (trường `plan`),
 * vì buổi chốt diễn ra vào Chủ nhật của tuần này.
 */
import { MILESTONES, type Milestone } from "../config/schedule";
import type { AnchorDelay, Deadline, FocusBlock, WeeklyReview, WeekPlan } from "../db/types";
import { daysUntil } from "./dates";
import {
  LISTENING_ERRORS,
  READING_ERRORS,
  anchorWeek,
  errorSummary,
  positionAfter,
  type ScoredSkill,
  type TestPosition,
} from "./ielts";
import { mondayOf } from "./metrics";
import { delaysInWeek, lightWeekExam } from "./plan";
import { addDays } from "./scheduling";
import { isValidDate } from "./validation";

/* ==================== Mục tiêu tuần ==================== */

/** Giờ IELTS mỗi tuần (PRODUCT.md mục 3). */
export const WEEK_TARGET_MINUTES = 11.5 * 60;
/** Tuần nhẹ nhịp: sàn 30 phút Listening mỗi ngày × 7. */
export const LIGHT_WEEK_TARGET_MINUTES = 30 * 7;
/** Khung 9:30: đích >= 5/7. */
export const ANCHOR_TARGET_DAYS = 5;

/**
 * Khối lượng đề app đề xuất (số phần). Từ lịch tuần mục 4:
 *   - Listening mỗi ngày, 1–2 section một buổi -> 8 section / tuần
 *   - Reading T2, T5, T7, 2 passage mỗi buổi -> 6 passage / tuần
 * Tuần nhẹ nhịp: 1 section Listening mỗi ngày (sàn 30 phút), không Reading.
 * Chủ app bấm +/- nếu muốn khác.
 */
export const DEFAULT_PLAN = { listening: 8, reading: 6 } as const;
export const LIGHT_PLAN = { listening: 7, reading: 0 } as const;

/* ==================== Tuần nhẹ nhịp ==================== */

/**
 * Tuần bắt đầu `weekStart` có nhẹ nhịp không:
 *   - tự động khi trong tuần có kỳ thi môn (schedule.ts), hoặc
 *   - chủ app bật tay lúc chốt kế hoạch (plan.light của buổi Chủ nhật trước).
 * Kế hoạch đã chốt thắng (tắt tay tuần thi môn cũng được tôn trọng).
 */
export function isLightWeek(weekStart: string, reviews: WeeklyReview[]): boolean {
  const plan = planForWeek(weekStart, reviews);
  if (plan) return plan.light;
  return lightWeekExam(weekStart) !== null;
}

/** Kế hoạch đã chốt cho tuần bắt đầu `weekStart` (lưu ở buổi Chủ nhật tuần trước). */
export function planForWeek(weekStart: string, reviews: WeeklyReview[]): WeekPlan | null {
  const prev = addDays(mondayOf(weekStart), -7);
  return reviews.find((r) => r.weekStart === prev)?.plan ?? null;
}

/* ==================== Đề ==================== */

/**
 * Đi tiếp `n` phần tính cả phần `from`: trả về phần CUỐI của khối lượng đó.
 * n = 1 -> chính `from`. Hết đề giữa chừng -> phần cuối cùng còn đề.
 */
export function lastPartOf(skill: ScoredSkill, from: TestPosition, n: number): TestPosition {
  let cur = from;
  for (let i = 1; i < n; i++) {
    const next = positionAfter(skill, cur);
    if (next === null) break;
    cur = next;
  }
  return cur;
}

/** Số phần (section / passage) đã làm của một kỹ năng trong [from, to]. */
export function partsDone(blocks: FocusBlock[], skill: ScoredSkill, from: string, to: string): number {
  let n = 0;
  for (const b of blocks) {
    const t = b.ielts?.test;
    if (b.area !== "IELTS" || b.ielts?.skill !== skill || !t || b.date < from || b.date > to) continue;
    n += t.parts.length;
  }
  return n;
}

/** Tổng phút IELTS trong [from, to]. */
export function ieltsMinutes(blocks: FocusBlock[], from: string, to: string): number {
  return blocks
    .filter((b) => b.area === "IELTS" && b.date >= from && b.date <= to)
    .reduce((sum, b) => sum + b.minutes, 0);
}

/* ==================== Bước 1: nhìn lại ==================== */

export type TopError = { index: number; mark: string; label: string; count: number };

/** Loại lỗi nhiều nhất (bằng nhau lấy loại đứng trước). Không có lỗi nào: null. */
export function topError(skill: ScoredSkill, errors: readonly number[]): TopError | null {
  let best = -1;
  errors.forEach((n, i) => {
    if (n > 0 && (best === -1 || n > errors[best])) best = i;
  });
  if (best === -1) return null;
  const t = (skill === "Listening" ? LISTENING_ERRORS : READING_ERRORS)[best];
  return { index: best, mark: t.mark, label: t.label, count: errors[best] };
}

export type WeekLookBack = {
  weekStart: string;
  anchorDays: number;
  minutes: number;
  targetMinutes: number;
  light: boolean;
  topListening: TopError | null;
  topReading: TopError | null;
  delays: number;
  /** Kế hoạch đã chốt cho tuần này và đã làm được bao nhiêu. null = chưa chốt. */
  plan: (WeekPlan & { doneListening: number; doneReading: number }) | null;
};

/**
 * Số liệu tuần chứa `today` (Thứ Hai → hôm nay). Chủ nhật 12:00 vẫn còn
 * nửa ngày: số của Chủ nhật tính tới lúc mở màn hình.
 */
export function lookBack(
  blocks: FocusBlock[],
  delays: AnchorDelay[],
  reviews: WeeklyReview[],
  today: string
): WeekLookBack {
  const weekStart = mondayOf(today);
  const end = addDays(weekStart, 6);
  const light = isLightWeek(weekStart, reviews);
  const plan = planForWeek(weekStart, reviews);
  return {
    weekStart,
    anchorDays: anchorWeek(blocks, today).filter((d) => d.held).length,
    minutes: ieltsMinutes(blocks, weekStart, end),
    targetMinutes: light ? LIGHT_WEEK_TARGET_MINUTES : WEEK_TARGET_MINUTES,
    light,
    topListening: topError("Listening", errorSummary(blocks, "Listening", weekStart, end).errors),
    topReading: topError("Reading", errorSummary(blocks, "Reading", weekStart, end).errors),
    delays: delaysInWeek(delays, today),
    plan: plan
      ? {
          ...plan,
          doneListening: partsDone(blocks, "Listening", weekStart, end),
          doneReading: partsDone(blocks, "Reading", weekStart, end),
        }
      : null,
  };
}

/* ==================== Bước 2: một điều chỉnh ==================== */

/** Gợi ý cho từng loại lỗi — theo đúng thứ tự ①–④ / Ⓐ–Ⓓ. */
const LISTENING_FIXES = [
  "Chép chính tả thêm 5 phút mỗi buổi Listening",
  "Soát chính tả, số ít/nhiều, số liệu trước khi chấm",
  "Gạch chân từ khoá, đoán paraphrase trước khi nghe",
  "Đọc trước câu hỏi, đánh dấu câu đang nghe tới đâu",
];
const READING_FIXES = [
  "Bấm đúng 20 phút mỗi passage, câu khó bỏ qua làm sau",
  "Tìm từ khoá và cách diễn đạt khác trước khi đọc bài",
  "Mỗi lỗi Ⓒ làm một thẻ từ vựng",
  "Ôn lại cách phân biệt False và Not Given",
];

/**
 * Tối đa 3 gợi ý từ số liệu tuần này. Chỉ là gợi ý: chủ app chọn một hoặc
 * tự gõ. Không có số liệu nào đáng chú ý thì trả về danh sách rỗng.
 */
export function suggestChanges(w: WeekLookBack): string[] {
  const out: string[] = [];
  if (w.anchorDays < ANCHOR_TARGET_DAYS) out.push("Ra khỏi nhà 9:15, báo thức 8:00");
  if (w.topListening) out.push(LISTENING_FIXES[w.topListening.index]);
  if (w.topReading) out.push(READING_FIXES[w.topReading.index]);
  if (w.delays >= 3) out.push("Xem lịch việc gấp từ tối hôm trước, dời trước 9:00");
  return out.slice(0, 3);
}

/* ==================== Bước 3: chốt tuần tới ==================== */

/** Kế hoạch app đề xuất cho tuần bắt đầu `nextWeekStart`. */
export function proposePlan(
  nextWeekStart: string,
  from: { listening: TestPosition | null; reading: TestPosition | null }
): WeekPlan {
  const light = lightWeekExam(nextWeekStart) !== null;
  const counts = light ? LIGHT_PLAN : DEFAULT_PLAN;
  const plan: WeekPlan = { listening: counts.listening, reading: counts.reading, light };
  if (from.listening) plan.listeningFrom = from.listening;
  if (from.reading) plan.readingFrom = from.reading;
  return plan;
}

/** Một hạn chót trong danh sách "7 ngày tới". */
export type UpcomingDeadline = {
  date: string;
  label: string;
  /** schedule = mốc cố định trong schedule.ts; custom = tự thêm (có id để sửa/xoá). */
  from: "schedule" | "custom";
  id?: string;
  /** Loại mốc (chỉ với mốc cố định). */
  kind?: Milestone["kind"];
  daysLeft: number;
};

/**
 * Hạn chót trong [from, from + days - 1]: mốc cố định (thi môn, AFEP, thi thử,
 * thi thật) và deadline tự thêm, theo ngày.
 */
export function upcomingDeadlines(
  deadlines: Deadline[],
  from: string,
  days: number,
  milestones: readonly Milestone[] = MILESTONES
): UpcomingDeadline[] {
  const to = addDays(from, days - 1);
  const fixed: UpcomingDeadline[] = milestones
    .filter((m) => m.date >= from && m.date <= to)
    .map((m) => ({ date: m.date, label: m.label, from: "schedule", kind: m.kind, daysLeft: daysUntil(from, m.date) }));
  const custom: UpcomingDeadline[] = deadlines
    .filter((d) => d.date >= from && d.date <= to)
    .map((d) => ({ date: d.date, label: d.title, from: "custom", id: d.id, daysLeft: daysUntil(from, d.date) }));
  return [...fixed, ...custom].sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label));
}

/**
 * Deadline hiện trên Hôm nay: còn <= 72 giờ (PRODUCT.md mục 6, ưu tiên 2),
 * tức hôm nay, mai, ngày kia. Bỏ thi thử / thi thật — thẻ đếm ngược đã nói rồi.
 */
export function deadlinesSoon(deadlines: Deadline[], today: string): UpcomingDeadline[] {
  return upcomingDeadlines(deadlines, today, 3).filter((d) => d.kind !== "mock" && d.kind !== "exam");
}

/** Kiểm tra form deadline. null = hợp lệ. */
export function checkDeadline(title: string, date: string, today: string): string | null {
  if (title.trim() === "") return "Nhập tên deadline.";
  if (!isValidDate(date)) return "Chọn ngày.";
  if (date < today) return "Ngày đã qua.";
  return null;
}
