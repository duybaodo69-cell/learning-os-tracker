/**
 * TOÀN BỘ phép tính của màn hình Thống kê nằm ở đây.
 *
 * Tất cả đều là hàm thuần: đưa vào dữ liệu, trả ra con số.
 * Không đọc database, không đọc đồng hồ. Nhờ vậy test được — xem metrics.test.ts.
 *
 * Quy ước chung:
 *   - Mọi khoảng thời gian tính CẢ hai đầu (from và to).
 *   - Không có dữ liệu thì trả về `null`, KHÔNG phải 0.
 *     0 nghĩa là "đo được và bằng không", null nghĩa là "chưa đo được".
 *     Nhầm hai cái này sẽ vẽ ra biểu đồ nói dối.
 */
import type { DailyCheckin, ExperimentTag, FocusBlock, Prediction, ReviewLog } from "../db/types";
import { averageBrierLastDays } from "./calibration";
import { PROTOCOL_PHASES } from "../config/protocolPhases";
import { addDays } from "./scheduling";

/* ==================== Ngày và tuần ==================== */

/** Thứ Hai của tuần chứa ngày này. Tuần bắt đầu từ Thứ Hai. */
export function mondayOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  // getDay(): 0 = Chủ Nhật, 1 = Thứ Hai ... 6 = Thứ Bảy.
  // Chủ Nhật phải lùi 6 ngày chứ không phải tiến 1.
  const day = dt.getDay();
  const backToMonday = day === 0 ? 6 : day - 1;
  return addDays(iso, -backToMonday);
}

/**
 * Ngày này có phải Chủ Nhật không? Dùng để quyết định hiện thẻ tổng kết tuần.
 * Tách ra thành hàm riêng để test được — viết thẳng getDay() === 0 trong
 * component thì không có cách nào kiểm tra tự động.
 */
export function isSunday(iso: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay() === 0;
}

/** Khoảng Thứ Hai đến Chủ Nhật của tuần chứa ngày này. */
export function weekRange(iso: string): { from: string; to: string } {
  const from = mondayOf(iso);
  return { from, to: addDays(from, 6) };
}

/** Danh sách ngày liên tiếp từ `from` đến `to`, tính cả hai đầu. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  // Chặn 3650 vòng để một tham số sai không làm treo app.
  for (let i = 0; i < 3650 && cur <= to; i++) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

/** Ngày nằm trong khoảng [from, to] không? */
function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

/* ==================== Thống kê cơ bản ==================== */

/** Đổi "HH:mm" thành số phút kể từ 00:00. */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Trung bình. Mảng rỗng trả về null. */
export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Độ lệch chuẩn (population standard deviation).
 *
 * Dùng để đo "đều đặn": giờ thức dậy lệch chuẩn càng NHỎ thì càng đều.
 * Cần ít nhất 2 giá trị, một điểm thì không nói được gì về độ dao động.
 */
export function standardDeviation(values: number[]): number | null {
  if (values.length < 2) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/* ==================== Bộ chỉ số của một khoảng ==================== */

export type MetricsInput = {
  checkins: DailyCheckin[];
  focusBlocks: FocusBlock[];
  reviewLogs: ReviewLog[];
  predictions: Prediction[];
};

export type MetricSet = {
  avgSleepHours: number | null;
  /** Độ lệch chuẩn giờ thức dậy, tính bằng PHÚT. Càng nhỏ càng đều. */
  wakeTimeSdMinutes: number | null;
  deepWorkMinutes: number;
  avgDistractionsPerBlock: number | null;
  cardsReviewed: number;
  /** % lượt ôn được chấm Được/Dễ, chỉ tính thẻ có interval >= 3 ngày. */
  retentionRate: number | null;
  /** Brier của 30 ngày tính ngược từ ngày cuối khoảng. */
  brier30: number | null;
};

/**
 * Chỉ nhìn thẻ đã qua giai đoạn học vẹt (interval >= 3 ngày) mới có nghĩa:
 * thẻ mới ôn lại sau 1 ngày thì ai cũng nhớ, tính vào sẽ làm đẹp số một cách giả tạo.
 */
export const RETENTION_MIN_INTERVAL = 3;

/** Tính toàn bộ chỉ số cho khoảng [from, to]. */
export function computeMetrics(input: MetricsInput, from: string, to: string): MetricSet {
  const checkins = input.checkins.filter((c) => inRange(c.date, from, to));
  const blocks = input.focusBlocks.filter((b) => inRange(b.date, from, to));
  const logs = input.reviewLogs.filter((l) => inRange(l.date, from, to));

  const deepWorkMinutes = blocks.reduce((s, b) => s + b.minutes, 0);

  // Chỉ những lượt ôn trên thẻ đã "chín" mới tính vào retention.
  const matureLogs = logs.filter((l) => l.intervalBefore >= RETENTION_MIN_INTERVAL);
  const kept = matureLogs.filter((l) => l.grade === "good" || l.grade === "easy").length;

  return {
    avgSleepHours: mean(checkins.map((c) => c.sleepHours)),
    wakeTimeSdMinutes: standardDeviation(checkins.map((c) => hhmmToMinutes(c.wakeTime))),
    deepWorkMinutes,
    avgDistractionsPerBlock: mean(blocks.map((b) => b.distractions)),
    cardsReviewed: logs.length,
    retentionRate: matureLogs.length === 0 ? null : (kept / matureLogs.length) * 100,
    // Brier luôn nhìn 30 ngày ngược từ cuối khoảng — một tuần đơn lẻ
    // thường quá ít dự đoán để nói được gì.
    brier30: averageBrierLastDays(input.predictions, to, 30),
  };
}

/* ==================== So sánh ==================== */

export type MetricKey = keyof MetricSet;

/** Chỉ số này thấp hơn thì tốt hơn? */
export const LOWER_IS_BETTER: Record<MetricKey, boolean> = {
  avgSleepHours: false,
  wakeTimeSdMinutes: true,
  deepWorkMinutes: false,
  avgDistractionsPerBlock: true,
  cardsReviewed: false,
  retentionRate: false,
  brier30: true,
};

export type Delta = {
  current: number | null;
  previous: number | null;
  /** Chênh lệch tuyệt đối. null khi thiếu một trong hai vế. */
  diff: number | null;
  /** Chênh lệch này là tốt lên (true), xấu đi (false), hay không rõ (null). */
  better: boolean | null;
};

export function compareMetric(key: MetricKey, current: number | null, previous: number | null): Delta {
  if (current === null || previous === null) {
    return { current, previous, diff: null, better: null };
  }
  const diff = current - previous;
  if (diff === 0) return { current, previous, diff, better: null };
  const improved = LOWER_IS_BETTER[key] ? diff < 0 : diff > 0;
  return { current, previous, diff, better: improved };
}

/* ==================== Baseline ==================== */

/** Giai đoạn baseline = giai đoạn 1 trong protocol (xem config/protocolPhases.ts). */
export const BASELINE_FROM = PROTOCOL_PHASES[0].from;
export const BASELINE_TO = PROTOCOL_PHASES[0].to;

/** Đã qua giai đoạn baseline chưa? Chưa qua thì chưa có gì để so. */
export function baselineFinished(today: string): boolean {
  return today > BASELINE_TO;
}

/**
 * Baseline là TRUNG BÌNH MỖI NGÀY trong 14 ngày đo, không phải tổng.
 * Tổng 14 ngày đem so với tổng 7 ngày thì lúc nào cũng thua.
 */
export function baselineMetrics(input: MetricsInput): MetricSet {
  const raw = computeMetrics(input, BASELINE_FROM, BASELINE_TO);
  const days = daysBetween(BASELINE_FROM, BASELINE_TO).length;
  return {
    ...raw,
    // Hai chỉ số cộng dồn cần quy về mỗi ngày rồi nhân lại theo độ dài tuần.
    deepWorkMinutes: (raw.deepWorkMinutes / days) * 7,
    cardsReviewed: (raw.cardsReviewed / days) * 7,
  };
}

/* ==================== Đều đặn ==================== */

export type Consistency = { logged: number; total: number; percent: number };

/**
 * Số ngày có check-in trong N ngày gần nhất.
 *
 * CỐ Ý không dùng "chuỗi ngày liên tiếp" (streak): nghỉ một hôm là chuỗi
 * về 0, tạo cảm giác trừng phạt và khiến người ta bỏ luôn. Đếm số ngày
 * đã log thì nghỉ một hôm chỉ mất một hôm.
 */
export function consistency(checkins: DailyCheckin[], today: string, days = 14): Consistency {
  const from = addDays(today, -(days - 1));
  const dates = new Set(checkins.map((c) => c.date));
  let logged = 0;
  for (const d of daysBetween(from, today)) {
    if (dates.has(d)) logged++;
  }
  return { logged, total: days, percent: (logged / days) * 100 };
}

/* ==================== Dữ liệu cho biểu đồ ==================== */

export type SleepVsFocusPoint = {
  date: string;
  sleepHours: number | null;
  /** Số phút deep work của NGÀY HÔM SAU. */
  nextDayMinutes: number;
};

/**
 * Giấc ngủ đêm nay so với deep work NGÀY HÔM SAU.
 *
 * Lệch một ngày là cố ý: ngủ đêm nay ảnh hưởng tới ngày mai, không phải
 * hôm nay. So cùng ngày sẽ đo nhầm chiều nhân quả.
 */
export function buildSleepVsNextDayFocus(
  checkins: DailyCheckin[],
  blocks: FocusBlock[],
  today: string,
  days = 28
): SleepVsFocusPoint[] {
  const from = addDays(today, -(days - 1));
  const sleepByDate = new Map(checkins.map((c) => [c.date, c.sleepHours]));

  const minutesByDate = new Map<string, number>();
  for (const b of blocks) {
    minutesByDate.set(b.date, (minutesByDate.get(b.date) ?? 0) + b.minutes);
  }

  return daysBetween(from, today).map((date) => ({
    date,
    sleepHours: sleepByDate.get(date) ?? null,
    nextDayMinutes: minutesByDate.get(addDays(date, 1)) ?? 0,
  }));
}

export type WeeklyAreaPoint = { weekStart: string } & Record<string, number | string>;

/** Số phút deep work mỗi tuần, tách theo area (để vẽ cột chồng). */
export function buildWeeklyByArea(
  blocks: FocusBlock[],
  today: string,
  weeks = 8
): { points: WeeklyAreaPoint[]; areas: string[] } {
  const thisMonday = mondayOf(today);
  const firstMonday = addDays(thisMonday, -7 * (weeks - 1));

  const areasUsed = new Set<string>();
  const byWeek = new Map<string, Record<string, number>>();

  for (let i = 0; i < weeks; i++) {
    byWeek.set(addDays(firstMonday, 7 * i), {});
  }

  for (const b of blocks) {
    const wk = mondayOf(b.date);
    const bucket = byWeek.get(wk);
    if (!bucket) continue; // ngoài cửa sổ đang xem
    bucket[b.area] = (bucket[b.area] ?? 0) + b.minutes;
    areasUsed.add(b.area);
  }

  const areas = [...areasUsed].sort();
  const points: WeeklyAreaPoint[] = [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([weekStart, bucket]) => {
      const row: WeeklyAreaPoint = { weekStart };
      for (const a of areas) row[a] = bucket[a] ?? 0;
      return row;
    });

  return { points, areas };
}

export type WeeklyRetentionPoint = {
  weekStart: string;
  retentionRate: number | null;
  reviews: number;
};

/** Tỷ lệ nhớ theo tuần (chỉ tính thẻ có interval >= 3 ngày). */
export function buildWeeklyRetention(
  logs: ReviewLog[],
  today: string,
  weeks = 8
): WeeklyRetentionPoint[] {
  const thisMonday = mondayOf(today);
  const firstMonday = addDays(thisMonday, -7 * (weeks - 1));

  const out: WeeklyRetentionPoint[] = [];
  for (let i = 0; i < weeks; i++) {
    const weekStart = addDays(firstMonday, 7 * i);
    const weekEnd = addDays(weekStart, 6);
    const mature = logs.filter(
      (l) => inRange(l.date, weekStart, weekEnd) && l.intervalBefore >= RETENTION_MIN_INTERVAL
    );
    const kept = mature.filter((l) => l.grade === "good" || l.grade === "easy").length;
    out.push({
      weekStart,
      retentionRate: mature.length === 0 ? null : (kept / mature.length) * 100,
      reviews: mature.length,
    });
  }
  return out;
}

/* ==================== Thí nghiệm ==================== */

export type ConditionResult = {
  days: number;
  focusMean: number | null;
  focusMin: number | null;
  focusMax: number | null;
  distractionsPerBlock: number | null;
  deepWorkMinutes: number;
};

export type ExperimentResult = {
  a: ConditionResult;
  b: ConditionResult;
  /** Đủ ngày để so sánh chưa? Cần cả hai nhánh >= 10 ngày. */
  enough: boolean;
};

/** Dưới ngưỡng này thì chênh lệch chỉ là nhiễu. */
export const EXPERIMENT_MIN_DAYS = 10;

/**
 * Khoá của một nhãn thí nghiệm: ghép ngày với id thí nghiệm.
 * Nhờ khoá ghép này, mỗi thí nghiệm mỗi ngày chỉ có đúng một nhãn —
 * gắn lại là ghi đè, không tạo bản ghi trùng.
 */
export function experimentTagKey(date: string, experimentId: string): string {
  return `${date}|${experimentId}`;
}

function summariseCondition(dates: string[], blocks: FocusBlock[]): ConditionResult {
  const dateSet = new Set(dates);
  const relevant = blocks.filter((b) => dateSet.has(b.date));
  const ratings = relevant.map((b) => b.focusRating);

  return {
    days: dates.length,
    focusMean: mean(ratings),
    focusMin: ratings.length === 0 ? null : Math.min(...ratings),
    focusMax: ratings.length === 0 ? null : Math.max(...ratings),
    distractionsPerBlock: mean(relevant.map((b) => b.distractions)),
    deepWorkMinutes: relevant.reduce((s, b) => s + b.minutes, 0),
  };
}

/** So sánh hai nhánh A và B của một thí nghiệm. */
export function buildExperimentResult(
  tags: ExperimentTag[],
  blocks: FocusBlock[],
  experimentId: string
): ExperimentResult {
  const mine = tags.filter((t) => t.experimentId === experimentId);
  const aDates = mine.filter((t) => t.condition === "A").map((t) => t.date);
  const bDates = mine.filter((t) => t.condition === "B").map((t) => t.date);

  const a = summariseCondition(aDates, blocks);
  const b = summariseCondition(bDates, blocks);

  return {
    a,
    b,
    enough: a.days >= EXPERIMENT_MIN_DAYS && b.days >= EXPERIMENT_MIN_DAYS,
  };
}
