/**
 * Các hàm xử lý ngày giờ.
 *
 * Quy tắc của dự án: mọi ngày lưu dưới dạng chuỗi "YYYY-MM-DD" theo
 * giờ Việt Nam (Asia/Ho_Chi_Minh), KHÔNG lưu timestamp UTC.
 * Lý do: nếu lưu UTC thì lúc 1h sáng ở VN, UTC vẫn là ngày hôm trước
 * → log bị nhảy sang sai ngày.
 */
import { TZDate } from "@date-fns/tz";
import { format, subDays } from "date-fns";

const TZ = "Asia/Ho_Chi_Minh";

/** Thời điểm "bây giờ" nhưng tính theo giờ Việt Nam. */
function nowInVN(): TZDate {
  return new TZDate(new Date(), TZ);
}

/** Hôm nay, dạng "YYYY-MM-DD". */
export function todayISO(): string {
  return format(nowInVN(), "yyyy-MM-dd");
}

/** Hôm qua, dạng "YYYY-MM-DD". */
export function yesterdayISO(): string {
  return format(subDays(nowInVN(), 1), "yyyy-MM-dd");
}

/** Giờ hiện tại, dạng "HH:mm" — dùng làm giá trị mặc định cho form. */
export function nowHHmm(): string {
  return format(nowInVN(), "HH:mm");
}

/** Đổi "HH:mm" thành tổng số phút kể từ 00:00. Ví dụ "06:30" → 390. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Tính số giờ ngủ từ giờ đi ngủ và giờ thức dậy.
 *
 * Điểm quan trọng: giấc ngủ thường vắt qua nửa đêm.
 *   - Ngủ 23:30, dậy 06:30 → 06:30 nhỏ hơn 23:30, nghĩa là đã sang ngày mới
 *     → cộng thêm 24 giờ → 7.0 giờ. ĐÚNG.
 *   - Ngủ 01:00, dậy 08:00 → cùng một ngày → 7.0 giờ. ĐÚNG.
 *
 * Làm tròn tới 0.25 giờ (15 phút) cho gọn.
 */
export function computeSleepHours(bedTime: string, wakeTime: string): number {
  const bed = toMinutes(bedTime);
  let wake = toMinutes(wakeTime);

  // Dậy sớm hơn (hoặc bằng) giờ ngủ => đã qua nửa đêm, cộng 1 ngày.
  if (wake <= bed) wake += 24 * 60;

  const hours = (wake - bed) / 60;
  return Math.round(hours * 4) / 4;
}

/** Hiện số phút cho dễ đọc: 90 → "1h30", 45 → "45p". */
export function formatMinutes(total: number): string {
  if (total < 60) return `${total}p`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** Hiện ngày cho người đọc: "2026-09-25" → "Thứ Sáu, 25/09". */
export function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  // Dùng Date thuần ở đây là an toàn vì ta chỉ lấy thứ trong tuần.
  const weekday = new Date(y, m - 1, d).getDay();
  const names = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  return `${names[weekday]}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

/** Tạo id ngẫu nhiên cho bản ghi mới. */
export function newId(): string {
  // crypto.randomUUID có sẵn trên mọi trình duyệt hiện đại.
  // Phần dự phòng dành cho trường hợp hiếm không có nó.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
