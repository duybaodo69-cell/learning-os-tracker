/**
 * @vitest-environment happy-dom
 *
 * Test cho bộ đếm giờ và bộ đếm phân tâm.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addTimerCapture,
  clearSession,
  getTimerCaptures,
  addTimerDistraction,
  clearTimer,
  clearTimerDistractions,
  elapsedClock,
  elapsedMinutes,
  getTimerDistractions,
  getTimerStart,
  removeTimerDistraction,
  isSuspiciousDuration,
  SUSPICIOUS_MINUTES,
  startTimer,
} from "./timer";

beforeEach(() => {
  localStorage.clear();
});

describe("bộ đếm giờ", () => {
  it("chưa chạy thì không có mốc bắt đầu", () => {
    expect(getTimerStart()).toBeNull();
  });

  it("bắt đầu rồi dừng", () => {
    startTimer();
    expect(getTimerStart()).not.toBeNull();
    clearTimer();
    expect(getTimerStart()).toBeNull();
  });

  it("số phút tính từ mốc bắt đầu, không phải từ bộ đếm chạy", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-26T08:00:00Z"));
    startTimer();
    const start = getTimerStart()!;

    // Giả lập việc khoá màn hình 45 phút: đồng hồ nhảy, không có tick nào chạy.
    vi.setSystemTime(new Date("2026-09-26T08:45:00Z"));
    expect(elapsedMinutes(start)).toBe(45);
    expect(elapsedClock(start)).toBe("45:00");
    vi.useRealTimers();
  });

  it("giá trị rác trong localStorage không làm vỡ app", () => {
    localStorage.setItem("learning-os:timer-started-at", "không phải số");
    expect(getTimerStart()).toBeNull();
  });
});

describe("elapsedClock nhận mốc 'bây giờ' từ ngoài", () => {
  it("dùng được với giá trị now truyền vào, không phụ thuộc đồng hồ thật", () => {
    const start = 1_000_000;
    expect(elapsedClock(start, start + 125_000)).toBe("02:05");
    expect(elapsedClock(start, start - 5_000)).toBe("00:00"); // không âm
  });
});

describe("bộ đếm phân tâm", () => {
  it("mặc định là 0", () => {
    expect(getTimerDistractions()).toBe(0);
  });

  it("cộng dồn qua nhiều lần bấm", () => {
    expect(addTimerDistraction()).toBe(1);
    expect(addTimerDistraction()).toBe(2);
    expect(addTimerDistraction()).toBe(3);
    expect(getTimerDistractions()).toBe(3);
  });

  it("bớt được khi bấm nhầm, nhưng không xuống dưới 0", () => {
    addTimerDistraction();
    expect(removeTimerDistraction()).toBe(0);
    expect(removeTimerDistraction()).toBe(0);
    expect(getTimerDistractions()).toBe(0);
  });

  it("còn nguyên sau khi đóng và mở lại app", () => {
    addTimerDistraction();
    addTimerDistraction();
    // localStorage không bị xoá giữa chừng -> mô phỏng mở lại app.
    expect(getTimerDistractions()).toBe(2);
  });

  it("bắt đầu buổi mới thì reset về 0", () => {
    addTimerDistraction();
    addTimerDistraction();
    startTimer();
    expect(getTimerDistractions()).toBe(0);
  });

  it("xoá thủ công", () => {
    addTimerDistraction();
    clearTimerDistractions();
    expect(getTimerDistractions()).toBe(0);
  });

  it("giá trị rác hoặc âm đều quy về 0", () => {
    localStorage.setItem("learning-os:timer-distractions", "-5");
    expect(getTimerDistractions()).toBe(0);
    localStorage.setItem("learning-os:timer-distractions", "abc");
    expect(getTimerDistractions()).toBe(0);
  });
});

describe("isSuspiciousDuration", () => {
  it("ngưỡng là 180 phút", () => {
    expect(SUSPICIOUS_MINUTES).toBe(180);
  });

  it("buổi làm bình thường thì không đáng ngờ", () => {
    for (const m of [25, 45, 60, 90, 120, 179, 180]) {
      expect(isSuspiciousDuration(m)).toBe(false);
    }
  });

  it("quá 180 phút thì hỏi lại", () => {
    // Thường là quên bấm Dừng rồi đi ngủ.
    for (const m of [181, 240, 600, 1440]) {
      expect(isSuspiciousDuration(m)).toBe(true);
    }
  });

  it("đúng 180 KHÔNG bị hỏi — biên phải rõ ràng", () => {
    expect(isSuspiciousDuration(180)).toBe(false);
    expect(isSuspiciousDuration(181)).toBe(true);
  });
});

describe("việc chen ngang", () => {
  it("mặc định rỗng", () => {
    expect(getTimerCaptures()).toEqual([]);
  });

  it("mỗi ghi chú được lưu lại theo thứ tự", () => {
    addTimerCapture("gửi mail anh X");
    const r = addTimerCapture("kiểm tra beta");
    expect(r.captures).toEqual(["gửi mail anh X", "kiểm tra beta"]);
    expect(getTimerCaptures()).toEqual(["gửi mail anh X", "kiểm tra beta"]);
  });

  it("MỖI ghi chú cũng cộng một lần phân tâm", () => {
    addTimerDistraction(); // bấm +1 một lần
    const r1 = addTimerCapture("ý nghĩ A");
    const r2 = addTimerCapture("ý nghĩ B");
    expect(r1.distractions).toBe(2);
    expect(r2.distractions).toBe(3);
    expect(getTimerDistractions()).toBe(3);
  });

  it("chuỗi rỗng hoặc toàn khoảng trắng bị bỏ qua, không cộng phân tâm", () => {
    const r = addTimerCapture("   ");
    expect(r.captures).toEqual([]);
    expect(r.distractions).toBe(0);
  });

  it("cắt khoảng trắng hai đầu", () => {
    expect(addTimerCapture("  gọi lại  ").captures).toEqual(["gọi lại"]);
  });

  it("bắt đầu phiên mới thì xoá ghi chú của phiên trước", () => {
    addTimerCapture("cũ");
    startTimer();
    expect(getTimerCaptures()).toEqual([]);
  });

  it("clearSession dọn cả mốc giờ, phân tâm và ghi chú", () => {
    startTimer();
    addTimerCapture("x");
    clearSession();
    expect(getTimerStart()).toBeNull();
    expect(getTimerDistractions()).toBe(0);
    expect(getTimerCaptures()).toEqual([]);
  });

  it("dữ liệu hỏng trong localStorage không làm vỡ app", () => {
    localStorage.setItem("learning-os:timer-captures", "{không phải json");
    expect(getTimerCaptures()).toEqual([]);
    localStorage.setItem("learning-os:timer-captures", JSON.stringify(["ok", 5, null]));
    expect(getTimerCaptures()).toEqual(["ok"]);
  });
});
