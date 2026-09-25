/**
 * @vitest-environment happy-dom
 *
 * Test cho useToday.
 *
 * Vì sao cần: lỗi "ngày kẹt qua nửa đêm" không bao giờ lộ ra khi test tay —
 * không ai ngồi canh app tới 00:00. Test giả lập đồng hồ thì bắt được ngay.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { TODAY_POLL_MS, useToday } from "./useToday";

/** Đặt đồng hồ hệ thống tới một thời điểm cụ thể theo giờ Việt Nam. */
function setVNTime(iso: string, hhmm: string) {
  // VN là UTC+7, nên trừ 7 tiếng để ra giờ UTC tương ứng.
  const [h, m] = hhmm.split(":").map(Number);
  const utc = new Date(`${iso}T00:00:00.000Z`);
  utc.setUTCHours(h - 7, m, 0, 0);
  vi.setSystemTime(utc);
}

describe("useToday", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("trả về ngày hôm nay lúc khởi tạo", () => {
    setVNTime("2026-09-26", "10:00");
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe("2026-09-26");
  });

  it("tự đổi sang ngày mới sau khi qua nửa đêm", () => {
    setVNTime("2026-09-26", "23:59");
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe("2026-09-26");

    // Để app mở yên đó cho qua nửa đêm.
    act(() => {
      setVNTime("2026-09-27", "00:05");
      vi.advanceTimersByTime(TODAY_POLL_MS);
    });

    expect(result.current).toBe("2026-09-27");
  });

  it("cập nhật khi quay lại app (visibilitychange)", () => {
    setVNTime("2026-09-26", "23:58");
    const { result } = renderHook(() => useToday());

    act(() => {
      setVNTime("2026-09-27", "08:00");
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current).toBe("2026-09-27");
  });

  it("cập nhật khi cửa sổ được chọn lại (focus)", () => {
    setVNTime("2026-09-26", "23:58");
    const { result } = renderHook(() => useToday());

    act(() => {
      setVNTime("2026-09-27", "09:30");
      window.dispatchEvent(new Event("focus"));
    });

    expect(result.current).toBe("2026-09-27");
  });

  it("chưa qua ngày thì giữ nguyên, không vẽ lại vô ích", () => {
    setVNTime("2026-09-26", "10:00");
    const { result } = renderHook(() => useToday());
    const before = result.current;

    act(() => {
      setVNTime("2026-09-26", "10:30");
      vi.advanceTimersByTime(TODAY_POLL_MS * 5);
    });

    // Cùng một chuỗi VÀ cùng một tham chiếu -> React không vẽ lại.
    expect(result.current).toBe(before);
  });

  it("gỡ bỏ hết listener và timer khi màn hình đóng", () => {
    setVNTime("2026-09-26", "10:00");
    const removeDoc = vi.spyOn(document, "removeEventListener");
    const removeWin = vi.spyOn(window, "removeEventListener");
    const clear = vi.spyOn(globalThis, "clearInterval");

    const { unmount } = renderHook(() => useToday());
    unmount();

    expect(removeDoc).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(removeWin).toHaveBeenCalledWith("focus", expect.any(Function));
    expect(clear).toHaveBeenCalled();
  });
});
