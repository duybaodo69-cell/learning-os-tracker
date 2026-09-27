/**
 * Test cho logic brain dump: một lần lưu tạo ra gì, và lọc lịch sử.
 */
import { describe, expect, it } from "vitest";
import type { BrainDump } from "../db/types";
import { buildBrainDump, filterBrainDumps, foldText } from "./brainDump";

const input = {
  area: "EFM" as const,
  recalled: "  Duration đo độ nhạy giá  ",
  gaps: "- Convexity là gì\n- Modified duration\n\n- Convexity là gì",
  minutes: 15,
  makeCards: true,
};

describe("buildBrainDump", () => {
  it("một brain dump + mỗi dòng chỗ hổng (không trùng) một thẻ nháp gắn với nó", () => {
    const { dump, cards } = buildBrainDump(input, "2026-09-27");
    expect(dump.recalled).toBe("Duration đo độ nhạy giá");
    expect(dump.date).toBe("2026-09-27");
    expect(cards.map((c) => c.front)).toEqual(["Convexity là gì", "Modified duration"]);
    for (const c of cards) {
      expect(c.back).toBe(""); // thẻ nháp: tự viết đáp án
      expect(c.brainDumpId).toBe(dump.id);
      expect(c.area).toBe("EFM");
      expect(c.reps).toBe(0);
    }
  });

  it("tắt 'tạo thẻ' thì chỉ có brain dump", () => {
    expect(buildBrainDump({ ...input, makeCards: false }, "2026-09-27").cards).toEqual([]);
  });
});

describe("filterBrainDumps", () => {
  const d = (id: string, date: string, area: BrainDump["area"], recalled: string, gaps = ""): BrainDump => ({
    id, date, area, recalled, gaps, minutes: 10,
  });
  const all = [
    d("a", "2026-09-20", "EFM", "Phân tích độ nhạy"),
    d("b", "2026-09-25", "IELTS", "Task 2 structure", "Đảo ngữ"),
    d("c", "2026-09-22", "EFM", "WACC", "beta đòn bẩy"),
  ];

  it("mới nhất trước khi không lọc", () => {
    expect(filterBrainDumps(all, null, "").map((x) => x.id)).toEqual(["b", "c", "a"]);
  });

  it("lọc theo area", () => {
    expect(filterBrainDumps(all, "EFM", "").map((x) => x.id)).toEqual(["c", "a"]);
  });

  it("tìm không cần dấu, trong cả 'nhớ được' và 'chỗ hổng'", () => {
    expect(filterBrainDumps(all, null, "phan tich").map((x) => x.id)).toEqual(["a"]);
    expect(filterBrainDumps(all, null, "dao ngu").map((x) => x.id)).toEqual(["b"]);
    expect(filterBrainDumps(all, null, "DON BAY").map((x) => x.id)).toEqual(["c"]);
    expect(filterBrainDumps(all, "IELTS", "wacc")).toEqual([]);
  });

  it("foldText bỏ dấu và đ", () => {
    expect(foldText("Đòn bẩy ĐẢO")).toBe("don bay dao");
  });
});
