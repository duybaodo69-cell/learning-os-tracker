/**
 * @vitest-environment happy-dom
 *
 * Phiên tập trung: toàn màn hình, xoay ngang và khôi phục KHÔNG BAO GIỜ làm
 * sai mốc bắt đầu hay số phân tâm. Trình duyệt thật được thay bằng bản giả
 * điều khiển được (cho / từ chối toàn màn hình, khoá hướng được / không).
 */
import "fake-indexeddb/auto";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import FocusSession from "./FocusSession";

const TIMER_KEY = "learning-os:timer-started-at";
const DISTRACTION_KEY = "learning-os:timer-distractions";

let fsEl: Element | null = null;
let portrait = true;

function fakeBrowser({
  enabled = true,
  request = "ok",
  lock = "ok",
}: { enabled?: boolean; request?: "ok" | "deny"; lock?: "ok" | "deny" } = {}) {
  fsEl = null;
  Object.defineProperty(document, "fullscreenEnabled", { configurable: true, get: () => enabled });
  Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => fsEl });
  const requestFullscreen = vi.fn(async () => {
    if (request === "deny") throw new Error("denied");
    fsEl = document.documentElement;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  const exit = vi.fn(async () => {
    fsEl = null;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  Object.defineProperty(document.documentElement, "requestFullscreen", { configurable: true, value: requestFullscreen });
  Object.defineProperty(document, "exitFullscreen", { configurable: true, value: exit });
  const orientation = {
    lock: vi.fn(() => (lock === "ok" ? Promise.resolve() : Promise.reject(new Error("NotSupportedError")))),
    unlock: vi.fn(),
  };
  Object.defineProperty(window.screen, "orientation", { configurable: true, value: orientation });
  return { requestFullscreen, exit, orientation };
}

/** Người dùng thoát toàn màn hình bằng nút Back / Esc (không qua nút của app). */
function userPressesBack() {
  act(() => {
    fsEl = null;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
}

async function tapFullscreen(name: RegExp | string = "Toàn màn hình") {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-27T09:00:00"));
  localStorage.clear();
  portrait = true;
  window.matchMedia = ((q: string) => ({
    matches: q.includes("portrait") ? portrait : false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function startSession(secondsAgo: number, distractions = 0) {
  const startedAt = Date.now() - secondsAgo * 1000;
  localStorage.setItem(TIMER_KEY, String(startedAt));
  localStorage.setItem(DISTRACTION_KEY, String(distractions));
  return startedAt;
}

describe("FocusSession — toàn màn hình và xoay ngang", () => {
  it("Android: bấm -> toàn màn hình + khoá ngang, có nút Thoát rõ ràng, thoát thì nhả khoá", async () => {
    const b = fakeBrowser();
    const startedAt = startSession(90);
    render(<FocusSession startedAt={startedAt} onExit={() => {}} />);

    await tapFullscreen();
    expect(b.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(b.orientation.lock).toHaveBeenCalledWith("landscape");
    // Nút đổi thành "Thoát" CÓ CHỮ, không chỉ là icon.
    const exitBtn = screen.getByRole("button", { name: "Thoát toàn màn hình" });
    expect(exitBtn.textContent).toContain("Thoát");
    // Khoá được -> không có lời nhắc nào.
    expect(screen.queryByText(/xoay ngang/i)).toBeNull();

    // Ghi phân tâm trong lúc toàn màn hình.
    fireEvent.click(screen.getByRole("button", { name: /\+1 phân tâm/ }));
    expect(localStorage.getItem(DISTRACTION_KEY)).toBe("1");

    await tapFullscreen("Thoát toàn màn hình");
    expect(b.orientation.unlock).toHaveBeenCalled();
    expect(b.exit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Toàn màn hình" })).toBeTruthy();
    // Mốc bắt đầu không đổi, đồng hồ vẫn tính từ mốc đó.
    expect(localStorage.getItem(TIMER_KEY)).toBe(String(startedAt));
    expect(screen.getByText("01:30")).toBeTruthy();
  });

  it("thoát bằng nút Back: nhả khoá hướng, bỏ lời nhắc, phiên vẫn chạy", async () => {
    const b = fakeBrowser({ lock: "deny" });
    const startedAt = startSession(10);
    render(<FocusSession startedAt={startedAt} onExit={() => {}} />);

    await tapFullscreen();
    // Toàn màn hình được nhưng không khoá hướng, máy đang dọc -> nhắc tự xoay.
    expect(screen.getByText(/xoay ngang điện thoại/)).toBeTruthy();

    userPressesBack();
    expect(b.orientation.unlock).toHaveBeenCalled();
    expect(screen.queryByText(/xoay ngang điện thoại/)).toBeNull();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText("00:15")).toBeTruthy();
    expect(localStorage.getItem(TIMER_KEY)).toBe(String(startedAt));
  });

  it("trình duyệt từ chối: báo thật, không giả vờ đã toàn màn hình, đồng hồ không đổi", async () => {
    fakeBrowser({ request: "deny" });
    const startedAt = startSession(60, 2);
    render(<FocusSession startedAt={startedAt} onExit={() => {}} />);

    await tapFullscreen();
    expect(screen.getByText(/không cho mở toàn màn hình/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Toàn màn hình" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Thoát toàn màn hình" })).toBeNull();
    expect(localStorage.getItem(TIMER_KEY)).toBe(String(startedAt));
    expect(localStorage.getItem(DISTRACTION_KEY)).toBe("2");
    expect(screen.getByText("01:00")).toBeTruthy();
  });

  it("iPhone (không có toàn màn hình): hướng dẫn xoay tay; xoay xong thì phần 'xoay' tự ẩn", async () => {
    const b = fakeBrowser({ enabled: false });
    render(<FocusSession startedAt={startSession(5)} onExit={() => {}} />);

    await tapFullscreen();
    expect(b.requestFullscreen).not.toHaveBeenCalled();
    expect(screen.getByText(/Xoay ngang máy/)).toBeTruthy();
    // Đóng lời nhắc được.
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    expect(screen.queryByText(/Xoay ngang máy/)).toBeNull();
  });

  it("bấm Hoàn thành phiên khi đang toàn màn hình: thoát + nhả khoá ngang, form mở, phiên vẫn chạy", async () => {
    const b = fakeBrowser();
    const onExit = vi.fn();
    render(<FocusSession startedAt={startSession(50 * 60)} onExit={onExit} />);
    await tapFullscreen();
    b.orientation.unlock.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Hoàn thành phiên/ }));
    });
    expect(b.exit).toHaveBeenCalled();
    expect(b.orientation.unlock).toHaveBeenCalled();
    // Form là một trang cuộn thường (không phải lớp phủ) — xem FocusSession.tsx.
    expect(screen.getByText("Ghi nhận kết thúc phiên")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    // Chỉ mở form, chưa lưu, chưa rời phiên.
    expect(onExit).not.toHaveBeenCalled();
    expect(localStorage.getItem(TIMER_KEY)).not.toBeNull();
    // "‹ Về đồng hồ": quay lại màn phiên, đồng hồ còn nguyên.
    fireEvent.click(screen.getByRole("button", { name: /Về đồng hồ/ }));
    expect(screen.getByRole("button", { name: /Hoàn thành phiên/ })).toBeTruthy();
    expect(localStorage.getItem(TIMER_KEY)).not.toBeNull();
  });

  it("huỷ phiên khi đang toàn màn hình: thoát toàn màn hình + nhả khoá, không kẹt ngang", async () => {
    const b = fakeBrowser();
    const onExit = vi.fn();
    render(<FocusSession startedAt={startSession(30)} onExit={onExit} />);
    await tapFullscreen();

    fireEvent.click(screen.getByRole("button", { name: "Huỷ phiên" }));
    await act(async () => {
      // Nút xác nhận trong hộp thoại cũng tên "Huỷ phiên" — lấy cái cuối.
      const buttons = screen.getAllByRole("button", { name: "Huỷ phiên" });
      fireEvent.click(buttons[buttons.length - 1]);
    });
    expect(onExit).toHaveBeenCalled();
    expect(b.exit).toHaveBeenCalled();
    expect(b.orientation.unlock).toHaveBeenCalled();
    expect(localStorage.getItem(TIMER_KEY)).toBeNull();
  });

  it("tải lại app giữa phiên: khôi phục đúng thời lượng và số phân tâm từ mốc đã lưu", () => {
    fakeBrowser();
    const startedAt = startSession(600, 3); // 10 phút, 3 lần phân tâm
    render(<FocusSession startedAt={startedAt} onExit={() => {}} />);
    expect(screen.getByText("10:00")).toBeTruthy();
    expect(screen.getByRole("button", { name: /\+1 phân tâm/ }).textContent).toContain("3");
    // Sau khi tải lại, trình duyệt đã tự thoát toàn màn hình: nút trở về bình thường.
    expect(screen.getByRole("button", { name: "Toàn màn hình" })).toBeTruthy();
  });

  it("khoá màn hình 5 phút rồi mở lại: đồng hồ nhảy đúng ngay, không chờ nhịp kế tiếp", () => {
    fakeBrowser();
    const startedAt = startSession(60);
    render(<FocusSession startedAt={startedAt} onExit={() => {}} />);
    // Trình duyệt dừng setInterval khi máy khoá: giờ hệ thống chạy, timer thì không.
    vi.setSystemTime(Date.now() + 5 * 60_000);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(screen.getByText("06:00")).toBeTruthy();
    expect(localStorage.getItem(TIMER_KEY)).toBe(String(startedAt));
  });
});
