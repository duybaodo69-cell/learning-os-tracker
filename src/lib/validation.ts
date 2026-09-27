/**
 * Kiểm tra dữ liệu trước khi ghi — dùng chung cho các form và cho file sao lưu.
 *
 * Vì sao cần: các nút "Lưu" gọi thẳng hàm lưu, nên thuộc tính HTML như
 * `min`, `max`, `type="time"` KHÔNG chặn được gì (đợt audit 27/09/2026 đã lưu
 * được block 10.000 phút và giờ ngủ NaN). Mọi kiểm tra thật nằm ở đây, là
 * hàm thuần, có test (validation.test.ts).
 *
 * Quy ước: mỗi hàm `check...` trả về `null` nếu hợp lệ, hoặc một câu tiếng
 * Việt ngắn nói rõ sai ở đâu để hiện ngay dưới ô nhập.
 */

/** "YYYY-MM-DD" và là một ngày CÓ THẬT (không nhận 2026-02-30). */
export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** "HH:mm", từ 00:00 đến 23:59. */
export function isValidTime(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(":").map(Number);
  return h <= 23 && m <= 59;
}

/** Số thật (không NaN, không Infinity) nằm trong [min, max]. */
export function isNumberIn(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

/** Số nguyên nằm trong [min, max]. */
export function isIntIn(value: unknown, min: number, max: number): value is number {
  return isNumberIn(value, min, max) && Number.isInteger(value);
}

/* ==================== Giới hạn dùng chung ==================== */

/** Một block dài nhất 600 phút (10 tiếng) — khớp `max` của ô nhập. */
export const MAX_BLOCK_MINUTES = 600;

/* ==================== Kiểm tra cho từng form ==================== */

export function checkBlockMinutes(minutes: number): string | null {
  if (!isIntIn(minutes, 1, MAX_BLOCK_MINUTES)) {
    return `Số phút phải là số nguyên từ 1 đến ${MAX_BLOCK_MINUTES}.`;
  }
  return null;
}

export function checkTime(value: string, label: string): string | null {
  return isValidTime(value) ? null : `${label}: chọn giờ hợp lệ (HH:mm).`;
}

export function checkDate(value: string, label: string): string | null {
  return isValidDate(value) ? null : `${label}: chọn một ngày hợp lệ.`;
}
