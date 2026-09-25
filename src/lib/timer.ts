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

/** Bắt đầu đếm từ bây giờ. Đồng thời reset bộ đếm phân tâm về 0. */
export function startTimer(): void {
  try {
    localStorage.setItem(TIMER_KEY, String(Date.now()));
  } catch {
    // Không lưu được thì bộ đếm không dùng được, nhưng app vẫn chạy.
  }
  clearTimerDistractions();
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

/* ==================== Đếm phân tâm trong lúc chạy ==================== */

/**
 * Số lần bị phân tâm, đếm NGAY TRONG LÚC bộ đếm đang chạy.
 *
 * Vì sao cần: ngồi xong 90 phút rồi mới cố nhớ "nãy mình bị phân tâm mấy
 * lần" thì luôn nhớ thiếu. Bấm ngay lúc vừa bị phân tâm mới ra số thật.
 *
 * Lưu trong localStorage cùng chỗ với mốc bắt đầu, nên thoát app rồi quay
 * lại vẫn còn.
 */
const DISTRACTION_KEY = "learning-os:timer-distractions";

export function getTimerDistractions(): number {
  try {
    const raw = localStorage.getItem(DISTRACTION_KEY);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

/** Cộng thêm một lần phân tâm. Trả về số mới để màn hình cập nhật ngay. */
export function addTimerDistraction(): number {
  const next = getTimerDistractions() + 1;
  try {
    localStorage.setItem(DISTRACTION_KEY, String(next));
  } catch {
    /* bỏ qua */
  }
  return next;
}

/** Bớt một lần (bấm nhầm). Không xuống dưới 0. */
export function removeTimerDistraction(): number {
  const next = Math.max(0, getTimerDistractions() - 1);
  try {
    localStorage.setItem(DISTRACTION_KEY, String(next));
  } catch {
    /* bỏ qua */
  }
  return next;
}

export function clearTimerDistractions(): void {
  try {
    localStorage.removeItem(DISTRACTION_KEY);
  } catch {
    /* bỏ qua */
  }
}
