import { describe, expect, it } from "vitest";
import type { AnchorDelay, Deadline, FocusBlock, WeeklyReview } from "../db/types";
import {
  DEFAULT_PLAN,
  LIGHT_PLAN,
  checkDeadline,
  deadlinesSoon,
  isLightWeek,
  lastPartOf,
  lookBack,
  partsDone,
  planForWeek,
  proposePlan,
  suggestChanges,
  topError,
  upcomingDeadlines,
} from "./weekPlan";

function block(over: Partial<FocusBlock> = {}): FocusBlock {
  return {
    id: Math.random().toString(),
    date: "2026-10-13",
    startTime: "09:30",
    minutes: 60,
    area: "IELTS",
    focusRating: 4,
    distractions: 0,
    phoneAway: true,
    ...over,
  };
}

function listening(date: string, parts: number[], correct: number, errors: [number, number, number, number], over: Partial<FocusBlock> = {}) {
  return block({
    date,
    ielts: { skill: "Listening", test: { book: 10, test: 1, parts, questions: parts.length * 10, correct, errors } },
    ...over,
  });
}

function review(weekStart: string, over: Partial<WeeklyReview> = {}): WeeklyReview {
  return { id: `#${weekStart}`, weekStart, learnedWithoutNotes: "", dataInsight: "", oneChange: "", ...over };
}

describe("lastPartOf — phần cuối của khối lượng tuần", () => {
  it("1 phần = chính nó; 8 section từ Cam 10 T1 S1 -> Cam 10 T2 S4", () => {
    expect(lastPartOf("Listening", { book: 10, test: 1, part: 1 }, 1)).toEqual({ book: 10, test: 1, part: 1 });
    expect(lastPartOf("Listening", { book: 10, test: 1, part: 1 }, 8)).toEqual({ book: 10, test: 2, part: 4 });
  });
  it("Reading 3 passage mỗi test: 6 passage từ P2 -> Test 3 P1", () => {
    expect(lastPartOf("Reading", { book: 10, test: 1, part: 2 }, 6)).toEqual({ book: 10, test: 3, part: 1 });
  });
  it("sang sách mới, và dừng ở phần cuối cùng của Cam 19", () => {
    expect(lastPartOf("Listening", { book: 10, test: 4, part: 4 }, 2)).toEqual({ book: 11, test: 1, part: 1 });
    expect(lastPartOf("Listening", { book: 19, test: 4, part: 3 }, 5)).toEqual({ book: 19, test: 4, part: 4 });
  });
});

describe("partsDone", () => {
  it("cộng số phần của đúng kỹ năng trong khoảng, bỏ buổi không làm đề", () => {
    const blocks = [
      listening("2026-10-12", [1, 2], 15, [2, 1, 1, 1]),
      listening("2026-10-14", [3], 8, [1, 0, 1, 0]),
      listening("2026-10-19", [4], 8, [1, 0, 1, 0]), // tuần sau
      block({ date: "2026-10-13", ielts: { skill: "Listening" } }),
      block({ date: "2026-10-13", ielts: { skill: "Reading", test: { book: 10, test: 1, parts: [1], questions: 13, correct: 10, errors: [1, 1, 1, 0] } } }),
    ];
    expect(partsDone(blocks, "Listening", "2026-10-12", "2026-10-18")).toBe(3);
    expect(partsDone(blocks, "Reading", "2026-10-12", "2026-10-18")).toBe(1);
  });
});

describe("tuần nhẹ nhịp: tự động + bật tay", () => {
  it("tuần có Midterm EFM tự nhẹ; tuần thường không", () => {
    expect(isLightWeek("2026-10-05", [])).toBe(true);
    expect(isLightWeek("2026-10-12", [])).toBe(false);
  });
  it("kế hoạch đã chốt (ở Chủ nhật tuần trước) thắng cả hai chiều", () => {
    const reviews = [
      review("2026-10-05", { plan: { listening: 7, reading: 0, light: true } }), // bật tay cho tuần 12/10
      review("2026-09-28", { plan: { listening: 8, reading: 6, light: false } }), // tắt tay tuần 5/10
    ];
    expect(isLightWeek("2026-10-12", reviews)).toBe(true);
    expect(isLightWeek("2026-10-05", reviews)).toBe(false);
    expect(planForWeek("2026-10-14", reviews)?.light).toBe(true); // giữa tuần vẫn tìm đúng
  });
});

describe("proposePlan", () => {
  it("tuần thường: 8 section + 6 passage, kèm đề bắt đầu", () => {
    const p = proposePlan("2026-10-12", { listening: { book: 10, test: 2, part: 1 }, reading: null });
    expect(p).toEqual({ ...DEFAULT_PLAN, light: false, listeningFrom: { book: 10, test: 2, part: 1 } });
  });
  it("tuần thi môn: nhẹ nhịp, 7 section, không Reading", () => {
    expect(proposePlan("2026-11-23", { listening: null, reading: null })).toEqual({ ...LIGHT_PLAN, light: true });
  });
});

describe("topError", () => {
  it("loại nhiều nhất; bằng nhau lấy loại đứng trước; không lỗi -> null", () => {
    expect(topError("Listening", [1, 0, 4, 2])).toMatchObject({ index: 2, mark: "③", count: 4 });
    expect(topError("Reading", [3, 3, 0, 0])).toMatchObject({ index: 0, mark: "Ⓐ" });
    expect(topError("Listening", [0, 0, 0, 0])).toBeNull();
  });
});

describe("lookBack — nhìn lại tuần", () => {
  const delays: AnchorDelay[] = [
    { id: "#2026-10-13", date: "2026-10-13", target: "evening", reason: "work", at: "10:40" },
  ];
  const blocks = [
    listening("2026-10-12", [1], 6, [0, 1, 3, 0]),
    listening("2026-10-14", [2, 3], 14, [1, 1, 4, 0], { startTime: "14:00" }), // ngoài khung
    listening("2026-10-15", [4], 7, [1, 0, 2, 0]),
  ];
  it("đếm khung, phút, lỗi nhiều nhất, số lần dời, kế hoạch làm được bao nhiêu", () => {
    const reviews = [review("2026-10-05", { plan: { listening: 8, reading: 6, light: false } })];
    const w = lookBack(blocks, delays, reviews, "2026-10-18");
    expect(w.weekStart).toBe("2026-10-12");
    expect(w.anchorDays).toBe(2);
    expect(w.minutes).toBe(180);
    expect(w.targetMinutes).toBe(690);
    expect(w.topListening).toMatchObject({ mark: "③", count: 9 });
    expect(w.topReading).toBeNull();
    expect(w.delays).toBe(1);
    expect(w.plan).toMatchObject({ listening: 8, doneListening: 4, doneReading: 0 });
  });
  it("tuần nhẹ nhịp: mục tiêu là sàn 30 phút × 7", () => {
    expect(lookBack([], [], [], "2026-10-11").targetMinutes).toBe(210);
  });
  it("chưa chốt kế hoạch tuần này: plan = null", () => {
    expect(lookBack(blocks, [], [], "2026-10-18").plan).toBeNull();
  });
});

describe("suggestChanges", () => {
  it("khung dưới 5/7 + lỗi ③ + lỗi Ⓑ -> 3 gợi ý, tối đa 3", () => {
    const s = suggestChanges({
      weekStart: "2026-10-12",
      anchorDays: 3,
      minutes: 400,
      targetMinutes: 690,
      light: false,
      topListening: { index: 2, mark: "③", label: "", count: 5 },
      topReading: { index: 1, mark: "Ⓑ", label: "", count: 3 },
      delays: 4,
      plan: null,
    });
    expect(s).toHaveLength(3);
    expect(s[0]).toMatch(/9:15/);
    expect(s[1]).toMatch(/paraphrase/);
  });
  it("tuần tốt, không lỗi: không gợi ý gì", () => {
    expect(
      suggestChanges({ weekStart: "", anchorDays: 6, minutes: 700, targetMinutes: 690, light: false, topListening: null, topReading: null, delays: 0, plan: null })
    ).toEqual([]);
  });
});

describe("deadline", () => {
  const custom: Deadline[] = [
    { id: "d1", date: "2026-10-09", title: "Báo cáo tuần công ty" },
    { id: "d2", date: "2026-10-20", title: "Xa" },
  ];
  it("7 ngày tới: gộp mốc cố định và deadline tự thêm, theo ngày", () => {
    const list = upcomingDeadlines(custom, "2026-10-05", 7);
    expect(list.map((d) => d.label)).toEqual(["Báo cáo tuần công ty", "Midterm EFM"]);
    expect(list[0]).toMatchObject({ from: "custom", id: "d1", daysLeft: 4 });
    expect(list[1]).toMatchObject({ from: "schedule", kind: "school-exam", daysLeft: 6 });
  });
  it("Hôm nay: chỉ trong 72 giờ, bỏ thi thử (thẻ đếm ngược đã có)", () => {
    expect(deadlinesSoon(custom, "2026-10-07").map((d) => d.label)).toEqual(["Báo cáo tuần công ty"]);
    expect(deadlinesSoon([], "2026-10-02")).toEqual([]); // thi thử 0 ngày 3/10 không lặp lại
    expect(deadlinesSoon([], "2026-10-09").map((d) => d.label)).toEqual(["Midterm EFM"]);
  });
  it("kiểm tra form", () => {
    expect(checkDeadline(" ", "2026-10-09", "2026-10-05")).toMatch(/tên/);
    expect(checkDeadline("A", "", "2026-10-05")).toMatch(/ngày/);
    expect(checkDeadline("A", "2026-10-01", "2026-10-05")).toMatch(/qua/);
    expect(checkDeadline("A", "2026-10-05", "2026-10-05")).toBeNull();
  });
});
