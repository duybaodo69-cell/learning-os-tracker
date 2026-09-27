/**
 * TOÀN BỘ logic lịch ôn tập nằm trong file này.
 *
 * Đây là các hàm "thuần" (pure): đưa vào cùng một dữ liệu thì luôn ra cùng
 * một kết quả, không đọc database, không đọc đồng hồ, không vẽ giao diện.
 * Nhờ vậy mới test được tự động — xem scheduling.test.ts.
 *
 * Muốn chỉnh cách giãn cách ôn tập thì CHỈ sửa file này.
 */
import type { Card, Grade } from "../db/types";

/* ==================== Các con số điều chỉnh được ==================== */

/** Ease khởi điểm của thẻ mới. */
export const START_EASE = 2.5;

/** Bấm "Khó" thì khoảng cách chỉ nhân 1.2 (tăng chậm). */
export const HARD_MULTIPLIER = 1.2;

/** Bấm "Dễ" thì nhân thêm 1.3 so với "Được". */
export const EASY_BONUS = 1.3;

/**
 * Hai nấc đầu tiên của một thẻ mới: ôn lại sau 1 ngày, rồi 3 ngày.
 * Từ nấc thứ ba trở đi mới nhân với ease.
 */
export const FIRST_INTERVALS = [1, 3];

/**
 * Tối đa 30 thẻ MỖI PHIÊN, để một buổi ôn không bao giờ dài vô tận.
 * Đây không phải giới hạn ngày: ôn xong phiên vẫn mở được phiên mới nếu còn
 * thẻ đến hạn (audit 27/09/2026 — nhãn cũ ghi "30 thẻ/ngày" là sai).
 */
export const SESSION_LIMIT = 30;

/* ==================== Kiểu dữ liệu ==================== */

/** Phần trạng thái của thẻ mà thuật toán quan tâm. */
export type SchedulingState = {
  intervalDays: number;
  ease: number;
  reps: number;   // số lần ôn thành công liên tiếp (bấm Quên là về 0)
  lapses: number; // tổng số lần bấm Quên
};

/** Trạng thái của một thẻ hoàn toàn mới. */
export function newCardState(): SchedulingState {
  return { intervalDays: 0, ease: START_EASE, reps: 0, lapses: 0 };
}

/* ==================== Thuật toán ==================== */

/**
 * "Khoảng cách gốc" để nhân lên.
 *
 * Thẻ mới có intervalDays = 0, nhân với bất cứ số nào cũng ra 0.
 * Nên với thẻ chưa qua hai nấc đầu, ta lấy chính nấc đó làm gốc.
 */
function baseInterval(state: SchedulingState): number {
  if (state.reps < FIRST_INTERVALS.length) {
    return FIRST_INTERVALS[state.reps];
  }
  // Đề phòng dữ liệu cũ bị 0: luôn ít nhất 1 ngày.
  return Math.max(1, state.intervalDays);
}

/** Khoảng cách khi bấm "Được" — dùng lại cho "Dễ" nên tách riêng. */
function goodInterval(state: SchedulingState): number {
  // Hai nấc đầu là cố định: 1 ngày, rồi 3 ngày.
  if (state.reps < FIRST_INTERVALS.length) {
    return FIRST_INTERVALS[state.reps];
  }
  return Math.max(1, Math.round(state.intervalDays * state.ease));
}

/**
 * Tính trạng thái mới của thẻ sau khi chấm điểm.
 *
 * Bốn nút:
 *   Quên (again) → ôn lại NGÀY MAI, lapses +1, và reps về 0
 *                  (về 0 để thẻ đi lại từ nấc 1 ngày → 3 ngày, tức là học lại)
 *   Khó  (hard)  → ở nấc học đầu thì GIỮ NGUYÊN nấc; về sau × 1.2
 *                  và không bao giờ vượt quá "Được"
 *   Được (good)  → nấc 1 ngày → 3 ngày → sau đó × ease
 *   Dễ   (easy)  → như "Được" rồi × 1.3, và luôn dài hơn "Được" ít nhất 1 ngày
 *
 * LƯU Ý: ease hiện KHÔNG thay đổi theo điểm (luôn 2.5), đúng theo yêu cầu
 * ban đầu. SM-2 thật thì giảm ease khi bấm Quên. Muốn thêm, sửa ở đây.
 */
export function scheduleNext(state: SchedulingState, grade: Grade): SchedulingState {
  switch (grade) {
    case "again":
      return {
        intervalDays: 1,
        ease: state.ease,
        reps: 0,
        lapses: state.lapses + 1,
      };

    case "hard": {
      // Ở hai nấc học đầu (1 ngày, 3 ngày): GIỮ NGUYÊN nấc hiện tại.
      // Nếu nhân 1.2 thì nấc 3 ngày thành round(3 × 1.2) = 4 ngày,
      // tức là bấm "Khó" lại được hoãn XA HƠN bấm "Được" (3 ngày).
      // Vô lý: nút Khó phải luôn cho khoảng cách ngắn hơn hoặc bằng Được.
      if (state.reps < FIRST_INTERVALS.length) {
        return {
          intervalDays: FIRST_INTERVALS[state.reps],
          ease: state.ease,
          // reps KHÔNG tăng: trả lời khó nghĩa là chưa qua được nấc này.
          reps: state.reps,
          lapses: state.lapses,
        };
      }

      // Từ nấc ba trở đi: nhân 1.2, nhưng chặn trên bằng "Được"
      // để không bao giờ vượt qua nó.
      const good = goodInterval(state);
      const hard = Math.max(1, Math.round(baseInterval(state) * HARD_MULTIPLIER));
      return {
        intervalDays: Math.min(hard, good),
        ease: state.ease,
        reps: state.reps + 1,
        lapses: state.lapses,
      };
    }

    case "good":
      return {
        intervalDays: goodInterval(state),
        ease: state.ease,
        reps: state.reps + 1,
        lapses: state.lapses,
      };

    case "easy": {
      const good = goodInterval(state);
      return {
        // Math.max(..., good + 1): "Dễ" phải luôn giãn xa hơn "Được",
        // nếu không thì bấm Dễ chẳng có tác dụng gì với thẻ mới.
        intervalDays: Math.max(good + 1, Math.round(baseInterval(state) * state.ease * EASY_BONUS)),
        ease: state.ease,
        reps: state.reps + 1,
        lapses: state.lapses,
      };
    }
  }
}

/* ==================== Ngày tháng ==================== */

/**
 * Cộng thêm số ngày vào một chuỗi "YYYY-MM-DD".
 *
 * Tự viết thay vì dùng thư viện vì đây là phép tính trên NGÀY LỊCH,
 * không dính múi giờ: "2026-02-28" + 1 = "2026-03-01".
 */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  // new Date(năm, thángTừ0, ngày) tự xử lý tràn tháng và năm nhuận.
  const dt = new Date(y, m - 1, d + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/* ==================== Hàng đợi ôn tập ==================== */

/**
 * Thẻ nháp = chưa có mặt sau (thường tạo từ chỗ hổng brain dump).
 * Chưa có đáp án thì không tự chấm được, nên thẻ nháp KHÔNG vào hàng ôn,
 * không tính vào số đến hạn và lịch "Sắp tới". Điền mặt sau là vào hàng.
 */
export function isDraft(card: Card): boolean {
  return card.back.trim() === "";
}

/**
 * Thẻ đã đến hạn chưa? Đến hạn khi dueDate <= hôm nay (kể cả quá hạn)
 * và thẻ không phải thẻ nháp.
 */
export function isDue(card: Card, today: string): boolean {
  return !isDraft(card) && card.dueDate <= today;
}

/**
 * Chọn ra danh sách thẻ để ôn hôm nay.
 *
 * Thứ tự: thẻ quá hạn lâu nhất lên trước (dueDate nhỏ nhất),
 * để không có thẻ nào bị bỏ quên mãi.
 * Cắt ở SESSION_LIMIT thẻ cho một phiên.
 */
export function buildQueue(cards: Card[], today: string, limit: number = SESSION_LIMIT): Card[] {
  return cards
    .filter((c) => isDue(c, today))
    .sort((a, b) => (a.dueDate === b.dueDate ? a.createdAt.localeCompare(b.createdAt) : a.dueDate.localeCompare(b.dueDate)))
    .slice(0, limit);
}

/**
 * TỔNG số thẻ đến hạn (không cắt ở giới hạn phiên) — dùng cho con số nhỏ
 * trên tab "Ôn tập", để thấy đúng lượng tồn đọng thật.
 */
export function dueCount(cards: Card[], today: string): number {
  return cards.filter((c) => isDue(c, today)).length;
}

/**
 * Lịch "Sắp tới": số thẻ đến hạn trong `days` ngày kế tiếp (KHÔNG tính hôm
 * nay), chỉ những ngày có thẻ, sớm nhất trước. Dùng cho màn hình chờ ôn.
 */
export function upcomingDue(cards: Card[], today: string, days = 7): { date: string; count: number }[] {
  const last = addDays(today, days);
  const counts = new Map<string, number>();
  for (const c of cards) {
    if (!isDraft(c) && c.dueDate > today && c.dueDate <= last) counts.set(c.dueDate, (counts.get(c.dueDate) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));
}

/* ==================== Tạo thẻ từ brain dump ==================== */

/**
 * Tách ô "chỗ hổng" thành từng dòng, mỗi dòng thành mặt trước của một thẻ nháp.
 *
 * - Bỏ dòng trống.
 * - Bỏ ký hiệu gạch đầu dòng ở đầu ("-", "*", "•", "1.", "2)") cho sạch.
 * - Bỏ dòng trùng nhau.
 */
export function splitGapsIntoFronts(gaps: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawLine of gaps.split("\n")) {
    const line = rawLine
      .trim()
      // ^ đầu dòng, [-*•] một trong ba ký hiệu, hoặc \d+[.)] như "1." "2)"
      .replace(/^([-*•]|\d+[.)])\s*/, "")
      .trim();

    if (line === "") continue;
    if (seen.has(line)) continue;

    seen.add(line);
    result.push(line);
  }

  return result;
}
