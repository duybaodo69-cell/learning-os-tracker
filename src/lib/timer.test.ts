/**
 * @vitest-environment happy-dom
 *
 * Test cho bộ đếm giờ và bộ đếm phân tâm.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addTimerDistraction,
  clearTimer,
  clearTimerDistractions,
  elapsedClock,
  elapsedMinutes,
  getTimerDistractions,
  getTimerStart,
  removeTimerDistraction,
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
