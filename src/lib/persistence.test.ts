/**
 * @vitest-environment happy-dom
 *
 * Test cho phần xin quyền lưu trữ bền vững.
 *
 * Vì sao cần: hàm này chạy một lần lúc khởi động và không hiện gì ra
 * màn hình. Nếu nó ném lỗi thì app trắng bóc, mà không ai đoán ra tại sao.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkPersistence,
  describePersistence,
  ensurePersistence,
  supportsPersistence,
} from "./persistence";

/** Gắn một navigator.storage giả. */
function mockStorage(impl: Partial<StorageManager> | null) {
  if (impl === null) {
    Object.defineProperty(navigator, "storage", { value: undefined, configurable: true });
  } else {
    Object.defineProperty(navigator, "storage", { value: impl, configurable: true });
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("supportsPersistence", () => {
  it("false khi trình duyệt không có navigator.storage", () => {
    mockStorage(null);
    expect(supportsPersistence()).toBe(false);
  });

  it("true khi có đủ persist và persisted", () => {
    mockStorage({ persist: async () => true, persisted: async () => false });
    expect(supportsPersistence()).toBe(true);
  });
});

describe("ensurePersistence", () => {
  it("đã được cấp rồi thì KHÔNG xin lại", async () => {
    const persist = vi.fn(async () => true);
    mockStorage({ persist, persisted: async () => true });

    expect(await ensurePersistence()).toBe("persisted");
    expect(persist).not.toHaveBeenCalled();
  });

  it("chưa có thì xin, và được cấp", async () => {
    const persist = vi.fn(async () => true);
    mockStorage({ persist, persisted: async () => false });

    expect(await ensurePersistence()).toBe("persisted");
    expect(persist).toHaveBeenCalledOnce();
  });

  it("xin mà bị từ chối", async () => {
    mockStorage({ persist: async () => false, persisted: async () => false });
    expect(await ensurePersistence()).toBe("not-persisted");
  });

  it("trình duyệt không hỗ trợ", async () => {
    mockStorage(null);
    expect(await ensurePersistence()).toBe("unsupported");
  });

  it("KHÔNG BAO GIỜ ném lỗi, kể cả khi API văng exception", async () => {
    mockStorage({
      persist: async () => {
        throw new Error("hỏng");
      },
      persisted: async () => {
        throw new Error("hỏng");
      },
    });
    // Nếu hàm này ném lỗi thì app trắng màn hình lúc khởi động.
    await expect(ensurePersistence()).resolves.toBe("not-persisted");
  });
});

describe("checkPersistence — chỉ đọc, không xin", () => {
  it("không gọi persist()", async () => {
    const persist = vi.fn(async () => true);
    mockStorage({ persist, persisted: async () => false });

    expect(await checkPersistence()).toBe("not-persisted");
    expect(persist).not.toHaveBeenCalled();
  });
});

describe("describePersistence", () => {
  it("mỗi trạng thái đều có câu giải thích", () => {
    for (const s of ["persisted", "not-persisted", "unsupported", "checking"] as const) {
      expect(describePersistence(s).title.length).toBeGreaterThan(0);
    }
  });

  it("trạng thái chưa bảo vệ được đánh dấu cảnh báo và nhắc xuất JSON", () => {
    const d = describePersistence("not-persisted");
    expect(d.tone).toBe("warn");
    expect(d.detail).toContain("JSON");
  });
});
