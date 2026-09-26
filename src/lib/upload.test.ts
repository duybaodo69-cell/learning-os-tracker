/**
 * Test kế hoạch đưa dữ liệu lên tài khoản.
 * Điều quan trọng nhất: không bao giờ ghi đè thứ đã có, không sinh bản đôi.
 */
import { describe, expect, it } from "vitest";
import { normaliseBackupData } from "./backup";
import { planUpload } from "./upload";

const local = normaliseBackupData({
  checkins: [{ date: "2026-09-25" } as never, { date: "2026-09-26" } as never],
  focusBlocks: [{ id: "b1" } as never, { id: "b2" } as never, { id: "b3" } as never],
  experimentTags: [{ key: "2026-09-26|e1" } as never],
});

describe("planUpload", () => {
  it("tài khoản trống -> đưa lên tất cả", () => {
    const p = planUpload(local, {});
    expect(p.totalToAdd).toBe(6);
    expect(p.totalSkipped).toBe(0);
  });

  it("bản ghi đã có trên tài khoản thì bỏ qua, không ghi đè", () => {
    const p = planUpload(local, { checkins: ["#2026-09-26"], focusBlocks: ["b2"] });
    expect(p.toAdd.checkins.map((c) => c.date)).toEqual(["2026-09-25"]);
    expect(p.toAdd.focusBlocks.map((b) => b.id)).toEqual(["b1", "b3"]);
    expect(p.totalSkipped).toBe(2);
  });

  it("nhãn thí nghiệm so theo cột key, không phải id", () => {
    const p = planUpload(local, { experimentTags: ["2026-09-26|e1"] });
    expect(p.toAdd.experimentTags).toEqual([]);
  });

  it("đưa lên lần hai (mọi thứ đã có) -> không thêm gì, không sinh bản đôi", () => {
    const first = planUpload(local, {});
    const keysAfter = {
      checkins: first.toAdd.checkins.map((c) => c.id),
      focusBlocks: first.toAdd.focusBlocks.map((b) => b.id),
      experimentTags: first.toAdd.experimentTags.map((t) => t.key),
    };
    const second = planUpload(local, keysAfter);
    expect(second.totalToAdd).toBe(0);
    expect(second.totalSkipped).toBe(6);
  });

  it("khoá lặp ngay trong dữ liệu trên máy chỉ lấy một bản", () => {
    const dup = normaliseBackupData({ focusBlocks: [{ id: "x" } as never, { id: "x" } as never] });
    expect(planUpload(dup, {}).toAdd.focusBlocks).toHaveLength(1);
  });

  it("mỗi bảng đều có một dòng xem trước, cộng đúng", () => {
    const p = planUpload(local, { focusBlocks: ["b1"] });
    expect(p.rows).toHaveLength(9);
    for (const r of p.rows) expect(r.toAdd + r.skipped).toBe(r.incoming);
  });
});
