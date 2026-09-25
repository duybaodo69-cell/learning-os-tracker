/**
 * TOÀN BỘ phần toán chấm điểm dự đoán nằm trong file này.
 *
 * Hai thứ khác nhau, đừng nhầm:
 *
 *   BRIER SCORE — bạn dự đoán CHÍNH XÁC tới đâu.
 *     Càng thấp càng tốt. Phạt nặng việc tự tin sai.
 *
 *   CALIBRATION — con số bạn nói có ĐÁNG TIN không.
 *     Trong tất cả những lần bạn nói "70%", có đúng khoảng 70% số lần
 *     xảy ra thật không? Người calibrated tốt thì nói 70% là trúng ~70%.
 *
 * Một người có thể calibrated hoàn hảo mà Brier vẫn tệ (luôn nói 50%
 * và đúng 50% số lần). Nên cần nhìn cả hai.
 *
 * Tất cả đều là hàm thuần — xem calibration.test.ts.
 */

/**
 * Chỉ cần đúng 3 trường này để chấm điểm.
 * Kiểu Prediction đầy đủ tự khớp với kiểu này, nên không cần chuyển đổi gì.
 */
export type ScorablePrediction = {
  probability: number;          // 1-99 (phần trăm)
  outcome: boolean | null;      // null = chưa chấm
  resolvedAt?: string;          // "YYYY-MM-DD"
};

/** Dự đoán đã chấm — outcome chắc chắn không còn null. */
export type ResolvedPrediction = ScorablePrediction & { outcome: boolean };

/** Dưới ngưỡng này thì mẫu quá nhỏ, không kết luận được gì. */
export const MIN_RESOLVED_FOR_CONCLUSION = 20;

/** Brier của người luôn nói 50%: (0.5 − 0)² = (0.5 − 1)² = 0.25. */
export const BRIER_ALWAYS_FIFTY = 0.25;

/* ==================== Brier score ==================== */

/**
 * Brier score của MỘT dự đoán = (p − kết quả)²
 *   p        : xác suất đã nói, đổi về 0-1
 *   kết quả  : 1 nếu đúng, 0 nếu sai
 *
 * Ví dụ:
 *   nói 90%, xảy ra thật  -> (0.9 − 1)² = 0.01  (rất tốt)
 *   nói 90%, KHÔNG xảy ra -> (0.9 − 0)² = 0.81  (rất tệ — tự tin mà sai)
 *   nói 50% -> luôn = 0.25 bất kể kết quả
 */
export function brierScore(probabilityPercent: number, outcome: boolean): number {
  const p = probabilityPercent / 100;
  const actual = outcome ? 1 : 0;
  return (p - actual) ** 2;
}

/** Lọc ra những dự đoán đã chấm. */
export function resolvedOnly(predictions: ScorablePrediction[]): ResolvedPrediction[] {
  return predictions.filter((p): p is ResolvedPrediction => p.outcome !== null);
}

/**
 * Brier trung bình. Trả về null khi chưa chấm cái nào
 * (null khác 0 — 0 nghĩa là hoàn hảo, rất dễ hiểu nhầm).
 */
export function averageBrier(predictions: ScorablePrediction[]): number | null {
  const resolved = resolvedOnly(predictions);
  if (resolved.length === 0) return null;

  const total = resolved.reduce((sum, p) => sum + brierScore(p.probability, p.outcome), 0);
  return total / resolved.length;
}

/* ==================== Lọc theo thời gian ==================== */

/** Đổi "YYYY-MM-DD" thành số ngày, để trừ nhau cho dễ. */
function toDayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** Ngày `iso` có nằm trong `days` ngày gần đây (tính cả hôm nay) không? */
export function isWithinLastDays(iso: string, today: string, days: number): boolean {
  const diff = toDayNumber(today) - toDayNumber(iso);
  return diff >= 0 && diff < days;
}

/** Brier trung bình của những dự đoán được chấm trong N ngày gần đây. */
export function averageBrierLastDays(
  predictions: ScorablePrediction[],
  today: string,
  days: number
): number | null {
  const recent = resolvedOnly(predictions).filter(
    (p) => p.resolvedAt !== undefined && isWithinLastDays(p.resolvedAt, today, days)
  );
  if (recent.length === 0) return null;

  const total = recent.reduce((sum, p) => sum + brierScore(p.probability, p.outcome), 0);
  return total / recent.length;
}

/* ==================== Calibration ==================== */

/**
 * Năm khoảng xác suất.
 * Cận dưới tính vào, cận trên KHÔNG tính vào — trừ khoảng cuối cùng
 * thì tính cả 100. Nhờ vậy mỗi giá trị chỉ rơi vào đúng một khoảng.
 */
export const BUCKET_EDGES = [0, 20, 40, 60, 80, 100] as const;

export type CalibrationBucket = {
  label: string;          // "0-20%"
  from: number;
  to: number;
  count: number;          // số dự đoán đã chấm rơi vào khoảng này
  statedAverage: number | null; // trung bình xác suất đã nói (%)
  actualRate: number | null;    // % thực tế xảy ra
};

/** Tìm chỉ số khoảng cho một xác suất. */
export function bucketIndexFor(probabilityPercent: number): number {
  for (let i = 0; i < BUCKET_EDGES.length - 1; i++) {
    const from = BUCKET_EDGES[i];
    const to = BUCKET_EDGES[i + 1];
    const isLast = i === BUCKET_EDGES.length - 2;
    if (probabilityPercent >= from && (isLast ? probabilityPercent <= to : probabilityPercent < to)) {
      return i;
    }
  }
  // Ngoài 0-100 thì kẹp về khoảng gần nhất, để không bao giờ mất dữ liệu.
  return probabilityPercent < 0 ? 0 : BUCKET_EDGES.length - 2;
}

/**
 * Gom các dự đoán ĐÃ CHẤM vào 5 khoảng.
 *
 * Luôn trả về đủ 5 khoảng, kể cả khoảng rỗng (count = 0,
 * statedAverage và actualRate = null) để biểu đồ và bảng không bị nhảy cột.
 */
export function buildCalibration(predictions: ScorablePrediction[]): CalibrationBucket[] {
  const resolved = resolvedOnly(predictions);

  const buckets: CalibrationBucket[] = [];
  for (let i = 0; i < BUCKET_EDGES.length - 1; i++) {
    const from = BUCKET_EDGES[i];
    const to = BUCKET_EDGES[i + 1];
    const inBucket = resolved.filter((p) => bucketIndexFor(p.probability) === i);

    const count = inBucket.length;
    const statedAverage =
      count === 0 ? null : inBucket.reduce((s, p) => s + p.probability, 0) / count;
    const hits = inBucket.filter((p) => p.outcome).length;
    const actualRate = count === 0 ? null : (hits / count) * 100;

    buckets.push({ label: `${from}-${to}%`, from, to, count, statedAverage, actualRate });
  }
  return buckets;
}

/** Đã đủ dữ liệu để kết luận chưa? */
export function hasEnoughToConclude(predictions: ScorablePrediction[]): boolean {
  return resolvedOnly(predictions).length >= MIN_RESOLVED_FOR_CONCLUSION;
}

/* ==================== Diễn giải ==================== */

/** Một câu tiếng Việt giải thích con số Brier đang ở mức nào. */
export function describeBrier(score: number | null): string {
  if (score === null) return "Chưa chấm dự đoán nào";
  if (score < 0.1) return "Rất tốt";
  if (score < 0.18) return "Tốt";
  if (score < BRIER_ALWAYS_FIFTY) return "Khá — tốt hơn việc luôn nói 50%";
  if (score === BRIER_ALWAYS_FIFTY) return "Ngang với việc luôn nói 50%";
  return "Kém hơn việc luôn nói 50% — có thể đang quá tự tin";
}
