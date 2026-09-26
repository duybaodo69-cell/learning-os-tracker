/** Test việc chọn kho: demo không bao giờ được đồng bộ. */
import { describe, expect, it } from "vitest";
import { chooseStore } from "./store";

const URL = "https://example.dexie.cloud";

describe("chooseStore", () => {
  it("mặc định dùng kho trên máy", () => {
    expect(chooseStore(false, false, URL)).toBe("local");
  });
  it("bật đồng bộ thì dùng kho cloud", () => {
    expect(chooseStore(false, true, URL)).toBe("cloud");
  });
  it("demo luôn thắng, kể cả khi đang bật đồng bộ", () => {
    expect(chooseStore(true, true, URL)).toBe("demo");
    expect(chooseStore(true, false, URL)).toBe("demo");
  });
  it("chưa cấu hình địa chỉ database thì không dùng cloud", () => {
    expect(chooseStore(false, true, "")).toBe("local");
  });
});
