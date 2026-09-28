import { describe, expect, it } from "vitest";
import { BASELINE, MILESTONES, type Milestone } from "../config/schedule";
import type { AnchorDelay, FocusBlock } from "../db/types";
import { BASELINE_FROM, BASELINE_TO } from "./metrics";
import { currentStretch, delaysInWeek, lightWeekExam, nextTestMilestone, roadToExam, shouldAskDelay } from "./plan";

function block(over: Partial<FocusBlock> = {}): FocusBlock {
  return {
    id: "b",
    date: "2026-09-29",
    startTime: "09:30",
    minutes: 50,
    area: "IELTS",
    focusRating: 4,
    distractions: 0,
    phoneAway: true,
    ...over,
  };
}

function delay(date: string): AnchorDelay {
  return { id: `#${date}`, date, target: "evening", reason: "school", at: "10:45" };
}

describe("lịch (src/config/schedule.ts)", () => {
  it("baseline giữ nguyên khoảng cũ 28/9–11/10 để Thống kê không đổi", () => {
    expect(BASELINE).toEqual({ from: "2026-09-28", to: "2026-10-11" });
    expect(BASELINE_FROM).toBe("2026-09-28");
    expect(BASELINE_TO).toBe("2026-10-11");
  });
  it("mọi mốc theo thứ tự ngày, ngày hợp lệ, `to` không trước `date`", () => {
    const dates = MILESTONES.map((m) => m.date);
    expect([...dates].sort()).toEqual(dates);
    for (const m of MILESTONES) {
      expect(m.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (m.to) expect(m.to >= m.date).toBe(true);
    }
  });
  it("đủ 5 thi thử + thi thật và 3 kỳ thi môn (PRODUCT.md mục 5)", () => {
    expect(MILESTONES.filter((m) => m.kind === "mock")).toHaveLength(5);
    expect(MILESTONES.filter((m) => m.kind === "exam")).toHaveLength(1);
    expect(MILESTONES.filter((m) => m.kind === "school-exam").map((m) => m.date)).toEqual([
      "2026-10-11",
      "2026-11-25",
      "2026-12-02",
    ]);
  });
});

describe("nextTestMilestone — đếm ngược", () => {
  it("28/9: thi thử 0 còn 5 ngày", () => {
    const c = nextTestMilestone("2026-09-28");
    expect(c?.milestone.label).toMatch(/Thi thử 0/);
    expect(c?.daysLeft).toBe(5);
    expect(c?.ongoing).toBe(false);
  });
  it("ngày đầu và ngày thứ hai của thi thử 2 ngày: đang thi, còn 0", () => {
    for (const d of ["2026-10-03", "2026-10-04"]) {
      expect(nextTestMilestone(d)).toMatchObject({ daysLeft: 0, ongoing: true });
      expect(nextTestMilestone(d)?.milestone.label).toMatch(/Thi thử 0/);
    }
  });
  it("hết thi thử 0 thì sang thi thử 1, bỏ qua mốc thi môn / AFEP", () => {
    const c = nextTestMilestone("2026-10-05");
    expect(c?.milestone.label).toMatch(/Thi thử 1/);
    expect(c?.daysLeft).toBe(41);
  });
  it("sau thi thử 4 thì đếm tới thi thật; sau thi thật thì hết", () => {
    expect(nextTestMilestone("2027-02-21")?.milestone.kind).toBe("exam");
    expect(nextTestMilestone("2027-03-20")).toMatchObject({ daysLeft: 0, ongoing: true });
    expect(nextTestMilestone("2027-03-21")).toBeNull();
  });
  it("mốc đưa vào không theo thứ tự vẫn chọn mốc sớm nhất", () => {
    const ms: Milestone[] = [
      { date: "2026-12-01", label: "B", kind: "mock" },
      { date: "2026-11-01", label: "A", kind: "mock" },
    ];
    expect(nextTestMilestone("2026-10-01", ms)?.milestone.label).toBe("A");
  });
});

describe("lightWeekExam — tuần nhẹ nhịp (Thứ Hai → Chủ Nhật chứa kỳ thi môn)", () => {
  it("Midterm EFM Chủ Nhật 11/10: cả tuần 5/10–11/10", () => {
    expect(lightWeekExam("2026-10-05")?.label).toBe("Midterm EFM");
    expect(lightWeekExam("2026-10-11")?.label).toBe("Midterm EFM");
    expect(lightWeekExam("2026-10-04")).toBeNull(); // Chủ Nhật tuần trước
    expect(lightWeekExam("2026-10-12")).toBeNull(); // Thứ Hai tuần sau
  });
  it("Final EFM 25/11 (T4) và Final BFN 2/12 (T4) ở hai tuần khác nhau", () => {
    expect(lightWeekExam("2026-11-23")?.label).toMatch(/Final EFM/);
    expect(lightWeekExam("2026-11-30")?.label).toBe("Final BFN");
  });
  it("tuần có hạn AFEP (không phải thi môn) không nhẹ nhịp", () => {
    expect(lightWeekExam("2026-10-25")).toBeNull();
  });
});

describe("shouldAskDelay — chỉ sau 10:30, chưa có phiên IELTS, chưa dời", () => {
  it("10:30 đúng: chưa hỏi; 10:31: hỏi", () => {
    expect(shouldAskDelay("10:30", [], null)).toBe(false);
    expect(shouldAskDelay("10:31", [], null)).toBe(true);
    expect(shouldAskDelay("08:00", [], null)).toBe(false);
    expect(shouldAskDelay("23:59", [], null)).toBe(true);
  });
  it("đã có phiên IELTS hôm nay (bất kể giờ, bất kể ngắn) thì không hỏi", () => {
    expect(shouldAskDelay("10:45", [block({ startTime: "07:00", minutes: 10 })], null)).toBe(false);
  });
  it("phiên area khác không tính", () => {
    expect(shouldAskDelay("10:45", [block({ area: "EFM" })], null)).toBe(true);
  });
  it("đã dời hôm nay thì không hỏi lại", () => {
    expect(shouldAskDelay("10:45", [], delay("2026-09-29"))).toBe(false);
  });
});

describe("delaysInWeek", () => {
  it("đếm các ngày dời trong tuần chứa hôm nay, Chủ Nhật thuộc tuần của nó", () => {
    const delays = [delay("2026-09-27"), delay("2026-09-28"), delay("2026-09-30"), delay("2026-10-04"), delay("2026-10-05")];
    expect(delaysInWeek(delays, "2026-10-01")).toBe(3);
    expect(delaysInWeek(delays, "2026-09-27")).toBe(1);
  });
  it("hai bản ghi cùng ngày (hiếm, nếu đồng bộ lệch) vẫn là 1", () => {
    expect(delaysInWeek([delay("2026-09-30"), { ...delay("2026-09-30"), id: "x" }], "2026-09-30")).toBe(1);
  });
});

describe("currentStretch — thanh tiến độ của chặng hiện tại", () => {
  it("chặng đầu: từ 28/9 (bắt đầu lịch) tới thi thử 0 ngày 3/10", () => {
    expect(currentStretch("2026-09-28")).toEqual({ from: "2026-09-28", to: "2026-10-03", progress: 0 });
    expect(currentStretch("2026-10-01")?.progress).toBeCloseTo(3 / 5);
  });
  it("đang thi thử 0 (3/10 và 4/10): đầy", () => {
    expect(currentStretch("2026-10-04")?.progress).toBe(1);
  });
  it("sau thi thử 0: chặng mới từ NGÀY CUỐI của nó (4/10) tới thi thử 1 (15/11)", () => {
    const s = currentStretch("2026-10-05");
    expect(s?.from).toBe("2026-10-04");
    expect(s?.to).toBe("2026-11-15");
    expect(s?.progress).toBeCloseTo(1 / 42);
  });
  it("trước ngày bắt đầu lịch: 0, không âm", () => {
    expect(currentStretch("2026-09-20")?.progress).toBe(0);
  });
  it("hết lịch: null", () => {
    expect(currentStretch("2027-04-01")).toBeNull();
  });
});

describe("roadToExam — các nút timeline", () => {
  it("6 nút: T0..T4 + Thi thật, T2 là cổng quyết định", () => {
    const road = roadToExam("2026-09-28");
    expect(road.map((n) => n.milestone.short)).toEqual(["T0", "T1", "T2", "T3", "T4", "Thi thật"]);
    expect(road.filter((n) => n.milestone.gate).map((n) => n.milestone.short)).toEqual(["T2"]);
  });
  it("28/9: T0 là mốc kế tiếp, còn lại chưa tới", () => {
    expect(roadToExam("2026-09-28").map((n) => n.state)).toEqual(["next", "later", "later", "later", "later", "later"]);
  });
  it("4/10 (ngày 2 của T0): T0 vẫn là 'next'; 5/10: T0 xong, T1 kế tiếp", () => {
    expect(roadToExam("2026-10-04")[0].state).toBe("next");
    expect(roadToExam("2026-10-05").map((n) => n.state).slice(0, 3)).toEqual(["done", "next", "later"]);
  });
  it("sau thi thật: tất cả đã qua", () => {
    expect(roadToExam("2027-03-21").every((n) => n.state === "done")).toBe(true);
  });
});
