/**
 * Bộ đếm giờ cho khối deep work.
 *
 * CÁCH LÀM QUAN TRỌNG: app KHÔNG đếm từng giây rồi cộng dồn.
 * Nó chỉ lưu MỘT con số — thời điểm bạn bấm Bắt đầu.
 * Số phút = (bây giờ) − (lúc bắt đầu).
 *
 * Vì sao: khi bạn chuyển sang app khác hoặc tắt màn hình, trình duyệt
 * sẽ tạm dừng mọi thứ đang chạy. Nếu đếm từng giây thì sẽ bị thiếu giờ.
 * Lưu mốc bắt đầu thì quay lại lúc nào cũng tính đúng.
 *
 * Mốc này lưu trong localStorage nên đóng app mở lại vẫn còn.
 */

const TIMER_KEY = "learning-os:timer-started-at";

/** Lấy mốc bắt đầu (milli giây). Trả về null nếu chưa chạy. */
export function getTimerStart(): number | null {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** Bắt đầu đếm từ bây giờ. */
export function startTimer(): void {
  try {
    localStorage.setItem(TIMER_KEY, String(Date.now()));
  } catch {
    // Không lưu được thì bộ đếm không dùng được, nhưng app vẫn chạy.
  }
}

/** Dừng và xoá mốc. */
export function clearTimer(): void {
  try {
    localStorage.removeItem(TIMER_KEY);
  } catch {
    /* bỏ qua */
  }
}

/** Số phút đã trôi qua kể từ mốc bắt đầu (làm tròn xuống). */
export function elapsedMinutes(startedAt: number): number {
  return Math.max(0, Math.floor((Date.now() - startedAt) / 60000));
}

/** Chuỗi "MM:SS" để hiện đồng hồ đang chạy. */
export function elapsedClock(startedAt: number): string {
  const totalSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
