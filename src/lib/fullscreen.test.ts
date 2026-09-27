/**
 * @vitest-environment happy-dom
 *
 * Test toàn màn hình + khoá xoay ngang. Trình duyệt thật không có trong test,
 * nên dựng một "trình duyệt giả" điều khiển được: cho / từ chối toàn màn hình,
 * khoá hướng được / bị từ chối / treo không trả lời.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FULLSCREEN_WAIT_MS,
  LOCK_TIMEOUT_MS,
  enterFullscreen,
  exitFullscreen,
  fullscreenNotice,
  isFullscreen,
  onFullscreenChange,
} from "./fullscreen";

type Mode = { enabled?: boolean; request?: "ok" | "deny" | "noop"; lock?: "ok" | "deny" | "hang" | "missing" };

let fsEl: Element | null = null;

function fakeBrowser({ enabled = true, request = "ok", lock = "ok" }: Mode = {}) {
  fsEl = null;
  Object.defineProperty(document, "fullscreenEnabled", { configurable: true, get: () => enabled });
  Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => fsEl });
  const requestFullscreen = vi.fn(async () => {
    if (request === "deny") throw new Error("Permissions check failed");
    // "noop": resolve mà không vào toàn màn hình (có trình duyệt làm vậy).
    if (request === "ok") {
      fsEl = document.documentElement;
      document.dispatchEvent(new Event("fullscreenchange"));
    }
  });
  const exit = vi.fn(async () => {
    fsEl = null;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  Object.defineProperty(document.documentElement, "requestFullscreen", { configurable: true, value: requestFullscreen });
  Object.defineProperty(document, "exitFullscreen", { configurable: true, value: exit });
  const orientation = {
    lock:
      lock === "missing"
        ? undefined
        : vi.fn(() =>
            lock === "ok"
              ? Promise.resolve()
              : lock === "hang"
                ? new Promise<void>(() => {})
                : Promise.reject(new Error("NotSupportedError"))
          ),
    unlock: vi.fn(),
  };
  Object.defineProperty(window.screen, "orientation", { configurable: true, value: orientation });
  return { requestFullscreen, exit, orientation };
}

beforeEach(() => {
  fsEl = null;
});
afterEach(() => {
  vi.useRealTimers();
});

describe("enterFullscreen", () => {
  it("Android Chrome: vào toàn màn hình rồi khoá ngang", async () => {
    const b = fakeBrowser();
    await expect(enterFullscreen()).resolves.toEqual({ entered: true, locked: true });
    expect(b.orientation.lock).toHaveBeenCalledWith("landscape");
    expect(isFullscreen()).toBe(true);
  });

  it("gọi requestFullscreen NGAY (đồng bộ) trong cú bấm, trước mọi await", () => {
    const b = fakeBrowser();
    void enterFullscreen();
    expect(b.requestFullscreen).toHaveBeenCalledTimes(1);
    // Khoá hướng chỉ sau khi toàn màn hình xong — chưa được gọi ở đây.
    expect(b.orientation.lock).not.toHaveBeenCalled();
  });

  it("iPhone (không có toàn màn hình): không gọi gì, báo unsupported", async () => {
    const b = fakeBrowser({ enabled: false });
    await expect(enterFullscreen()).resolves.toEqual({ entered: false, reason: "unsupported" });
    expect(b.requestFullscreen).not.toHaveBeenCalled();
    expect(b.orientation.lock).not.toHaveBeenCalled();
  });

  it("trình duyệt từ chối: báo denied, không khoá hướng, không ném lỗi", async () => {
    const b = fakeBrowser({ request: "deny" });
    await expect(enterFullscreen()).resolves.toEqual({ entered: false, reason: "denied" });
    expect(b.orientation.lock).not.toHaveBeenCalled();
  });

  it("resolve nhưng không thật sự vào toàn màn hình: chờ rồi coi là denied", async () => {
    vi.useFakeTimers();
    fakeBrowser({ request: "noop" });
    const p = enterFullscreen();
    await vi.advanceTimersByTimeAsync(FULLSCREEN_WAIT_MS);
    await expect(p).resolves.toEqual({ entered: false, reason: "denied" });
  });

  it("API cũ (webkit) trả về ngay, toàn màn hình đến sau: KHÔNG báo nhầm là bị từ chối", async () => {
    vi.useFakeTimers();
    fakeBrowser();
    // Giống Safari cũ: không có requestFullscreen chuẩn, bản webkit trả void.
    Object.defineProperty(document.documentElement, "requestFullscreen", { configurable: true, value: undefined });
    Object.defineProperty(document.documentElement, "webkitRequestFullscreen", {
      configurable: true,
      value: () => {
        setTimeout(() => {
          fsEl = document.documentElement;
          document.dispatchEvent(new Event("webkitfullscreenchange"));
        }, 200);
      },
    });
    const p = enterFullscreen();
    await vi.advanceTimersByTimeAsync(200);
    await expect(p).resolves.toEqual({ entered: true, locked: true });
    delete (document.documentElement as { webkitRequestFullscreen?: unknown }).webkitRequestFullscreen;
  });

  it("máy tính / iPad: toàn màn hình được, khoá hướng bị từ chối", async () => {
    fakeBrowser({ lock: "deny" });
    await expect(enterFullscreen()).resolves.toEqual({ entered: true, locked: false });
  });

  it("không có screen.orientation.lock: vẫn toàn màn hình, locked = false", async () => {
    fakeBrowser({ lock: "missing" });
    await expect(enterFullscreen()).resolves.toEqual({ entered: true, locked: false });
  });

  it("khoá hướng treo không trả lời: sau LOCK_TIMEOUT_MS coi như không khoá", async () => {
    vi.useFakeTimers();
    fakeBrowser({ lock: "hang" });
    const p = enterFullscreen();
    await vi.advanceTimersByTimeAsync(LOCK_TIMEOUT_MS);
    await expect(p).resolves.toEqual({ entered: true, locked: false });
  });
});

describe("exitFullscreen", () => {
  it("nhả khoá hướng rồi thoát toàn màn hình", async () => {
    const b = fakeBrowser();
    await enterFullscreen();
    await exitFullscreen();
    expect(b.orientation.unlock).toHaveBeenCalled();
    expect(b.exit).toHaveBeenCalledTimes(1);
    expect(isFullscreen()).toBe(false);
  });

  it("không ở toàn màn hình: chỉ nhả khoá, không gọi exitFullscreen (tránh lỗi)", async () => {
    const b = fakeBrowser();
    await exitFullscreen();
    expect(b.orientation.unlock).toHaveBeenCalled();
    expect(b.exit).not.toHaveBeenCalled();
  });
});

describe("onFullscreenChange", () => {
  it("báo cả khi người dùng thoát bằng Back / Esc", async () => {
    fakeBrowser();
    const cb = vi.fn();
    const off = onFullscreenChange(cb);
    await enterFullscreen();
    fsEl = null; // người dùng bấm Esc
    document.dispatchEvent(new Event("fullscreenchange"));
    expect(cb).toHaveBeenCalledTimes(2);
    off();
    document.dispatchEvent(new Event("fullscreenchange"));
    expect(cb).toHaveBeenCalledTimes(2);
  });
});

describe("fullscreenNotice — chỉ nói điều đã thật sự xảy ra", () => {
  it("chưa bấm / đã khoá ngang / đang nằm ngang: không nhắc gì", () => {
    expect(fullscreenNotice(null, true)).toBeNull();
    expect(fullscreenNotice({ entered: true, locked: true }, true)).toBeNull();
    expect(fullscreenNotice({ entered: true, locked: false }, false)).toBeNull();
  });

  it("toàn màn hình được nhưng không khoá hướng, máy đang dọc: nhắc tự xoay", () => {
    expect(fullscreenNotice({ entered: true, locked: false }, true)).toMatch(/xoay ngang điện thoại/);
  });

  it("bị từ chối: nói rõ bị từ chối, phiên vẫn chạy", () => {
    for (const portrait of [true, false]) {
      const t = fullscreenNotice({ entered: false, reason: "denied" }, portrait)!;
      expect(t).toMatch(/không cho mở toàn màn hình/);
      expect(t).toMatch(/Phiên vẫn chạy/);
    }
  });

  it("iPhone: hướng dẫn xoay tay khi đang dọc, và cách ẩn thanh địa chỉ", () => {
    expect(fullscreenNotice({ entered: false, reason: "unsupported" }, true)).toMatch(/Xoay ngang máy/);
    expect(fullscreenNotice({ entered: false, reason: "unsupported" }, false)).not.toMatch(/Xoay ngang/);
    expect(fullscreenNotice({ entered: false, reason: "unsupported" }, false)).toMatch(/Màn hình chính/);
  });

  it("không câu nào khẳng định đã xoay ngang", () => {
    const all: (string | null)[] = [];
    for (const portrait of [true, false]) {
      all.push(
        fullscreenNotice({ entered: true, locked: false }, portrait),
        fullscreenNotice({ entered: false, reason: "denied" }, portrait),
        fullscreenNotice({ entered: false, reason: "unsupported" }, portrait)
      );
    }
    for (const t of all) expect(t ?? "").not.toMatch(/đã xoay|đã khoá ngang/i);
  });
});
