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
  clearTimerCaptures();
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

/**
 * Quá số phút này thì nhiều khả năng bạn QUÊN BẤM DỪNG chứ không phải
 * ngồi liền một mạch. Hỏi lại trước khi điền vào form, nếu không một
 * buổi bỏ quên qua đêm sẽ ghi thành 600 phút deep work và làm hỏng
 * toàn bộ thống kê.
 */
export const SUSPICIOUS_MINUTES = 180;

/** Số phút này có đáng ngờ không? */
export function isSuspiciousDuration(minutes: number): boolean {
  return minutes > SUSPICIOUS_MINUTES;
}

/** Chuỗi "MM:SS" để hiện đồng hồ đang chạy. */
export function elapsedClock(startedAt: number, now: number = Date.now()): string {
  const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
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

/* ==================== Việc chen ngang trong lúc chạy ==================== */

/**
 * Ghi nhanh những thứ chen vào đầu trong lúc đang làm ("nhớ gửi mail cho
 * anh X", "kiểm tra lại beta"). Viết ra để khỏi phải giữ trong đầu, rồi
 * quay lại việc chính.
 *
 * MỖI ghi chú cũng tính là một lần phân tâm: đầu óc đã rời khỏi việc chính
 * đủ lâu để nghĩ ra và gõ nó.
 *
 * Lưu trong localStorage cạnh mốc bắt đầu, nên thoát app vẫn còn.
 */
const CAPTURE_KEY = "learning-os:timer-captures";

export function getTimerCaptures(): string[] {
  try {
    const raw = localStorage.getItem(CAPTURE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    // Chỉ giữ chuỗi — dữ liệu hỏng thì coi như rỗng, không làm vỡ app.
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Thêm một việc chen ngang. Chuỗi rỗng bị bỏ qua.
 * Trả về danh sách mới VÀ số phân tâm mới, để màn hình cập nhật cả hai.
 */
export function addTimerCapture(text: string): { captures: string[]; distractions: number } {
  const clean = text.trim();
  if (clean === "") {
    return { captures: getTimerCaptures(), distractions: getTimerDistractions() };
  }
  const captures = [...getTimerCaptures(), clean];
  try {
    localStorage.setItem(CAPTURE_KEY, JSON.stringify(captures));
  } catch {
    /* bỏ qua */
  }
  return { captures, distractions: addTimerDistraction() };
}

export function clearTimerCaptures(): void {
  try {
    localStorage.removeItem(CAPTURE_KEY);
  } catch {
    /* bỏ qua */
  }
}

/** Dọn sạch mọi thứ của một phiên: mốc bắt đầu, số phân tâm, việc chen ngang. */
export function clearSession(): void {
  clearTimer();
  clearTimerDistractions();
  clearTimerCaptures();
}
