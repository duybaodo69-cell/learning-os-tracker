import { describe, expect, it } from "vitest";
import type { FocusBlock, MockTest } from "../db/types";
import { errorWeekly, hasErrorData, ieltsWeekly } from "./ieltsStats";

function ieltsBlock(date: string, skill: "Listening" | "Reading", questions: number, correct: number, errors: [number, number, number, number], over: Partial<FocusBlock> = {}): FocusBlock {
  return {
    id: Math.random().toString(),
    date,
    startTime: "09:30",
    minutes: 60,
    area: "IELTS",
    focusRating: 4,
    distractions: 0,
    phoneAway: true,
    ielts: { skill, test: { book: 10, test: 1, parts: [1], questions, correct, errors } },
    ...over,
  };
}

const TODAY = "2026-10-21"; // Thứ Tư, tuần 19/10

describe("ieltsWeekly", () => {
  it("8 tuần cũ -> mới, tuần cuối là tuần hiện tại", () => {
    const w = ieltsWeekly([], [], TODAY);
    expect(w).toHaveLength(8);
    expect(w[7].weekStart).toBe("2026-10-19");
    expect(w[0].weekStart).toBe("2026-08-31");
  });
  it("giờ, % đúng Listening, khung 9:30; tuần không làm đề = null (không phải 0%)", () => {
    const blocks = [
      ieltsBlock("2026-10-19", "Listening", 10, 6, [1, 1, 2, 0]),
      ieltsBlock("2026-10-20", "Listening", 20, 15, [1, 1, 2, 1], { startTime: "15:00", minutes: 45 }),
      ieltsBlock("2026-10-20", "Reading", 13, 10, [0, 1, 1, 1]),
      { ...ieltsBlock("2026-10-13", "Listening", 10, 5, [1, 1, 2, 1]), area: "EFM" as const, ielts: undefined },
    ];
    const w = ieltsWeekly(blocks, [], TODAY);
    expect(w[7]).toMatchObject({ hours: 2.8, listeningPct: 70, listeningQuestions: 30, anchorDays: 2 });
    expect(w[6]).toMatchObject({ hours: 0, listeningPct: null, anchorDays: 0 });
  });
  it("thi thử: điểm thô /40 -> % và band ≈, lấy lần sau cùng trong tuần", () => {
    const mocks: MockTest[] = [
      { id: "a", date: "2026-10-03", source: "home", listeningRaw: 20 },
      { id: "b", date: "2026-10-04", source: "home", listeningRaw: 23 },
      { id: "c", date: "2026-10-15", source: "ai", writingBand: 6 }, // không có Listening
    ];
    const w = ieltsWeekly([], mocks, TODAY);
    const t0 = w.find((p) => p.weekStart === "2026-09-28");
    expect(t0).toMatchObject({ mockPct: 58, mockBand: 6 });
    expect(w.find((p) => p.weekStart === "2026-10-12")?.mockPct).toBeNull();
  });
});

describe("errorWeekly", () => {
  it("lỗi trên 10 câu, Listening và Reading không trộn, n và sơ bộ", () => {
    const blocks = [
      ieltsBlock("2026-10-19", "Listening", 20, 12, [2, 2, 4, 0]),
      ieltsBlock("2026-10-20", "Reading", 13, 10, [0, 3, 0, 0]),
    ];
    const l = errorWeekly(blocks, "Listening", TODAY);
    expect(l[7]).toEqual({ weekStart: "2026-10-19", questions: 20, prelim: false, e0: 1, e1: 1, e2: 2, e3: 0 });
    expect(l[6]).toMatchObject({ questions: 0, prelim: true, e0: null });
    const r = errorWeekly(blocks, "Reading", TODAY);
    expect(r[7]).toMatchObject({ questions: 13, prelim: true, e1: 2.3 });
    expect(hasErrorData(r)).toBe(true);
    expect(hasErrorData(errorWeekly([], "Reading", TODAY))).toBe(false);
  });
});
