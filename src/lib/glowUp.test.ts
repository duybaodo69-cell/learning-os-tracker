import { describe, expect, it } from "vitest";
import { GLOW_END, GLOW_START, GYM, PHOTO_WEEKS, SLEEP_RAMP, WEEKS, WEEK_TEMPLATE } from "../config/glowUp";
import type { BodyCheckin, DailyCheckin, GlowDay, Workout, WorkoutSet } from "../db/types";
import { daysUntil } from "./dates";
import { addDays } from "./scheduling";
import {
  adapaleneTonight,
  adjustHints,
  averageWeight,
  checkinWeekToAsk,
  isPhotoWeek,
  startComparison,
  weekSessionCounts,
  weekWeighIns,
  dayChecklist,
  defaultReps,
  formatKg,
  glowWeek,
  lastSetsFor,
  lightsOutFor,
  parseDecimal,
  planFor,
  prefillSets,
  programWeek,
  repRange,
  setsFor,
  sleepCheck,
  stepValue,
  suggestLoad,
  waterTarget,
  weekTitle,
} from "./glowUp";

const checkin = (date: string, bedTime: string): DailyCheckin => ({
  id: `#${date}`,
  date,
  bedTime,
  wakeTime: "07:00",
  sleepHours: 7,
  energy: 3,
});

const workout = (date: string, session: Workout["session"], minutes = 60, extra: Partial<Workout> = {}): Workout => ({
  id: `${date}-${session}-${extra.startTime ?? "07:15"}`,
  date,
  startTime: "07:15",
  session,
  minutes,
  ...extra,
});

/** Một ngày đủ mọi mục trừ ngủ và buổi tập. */
const fullDay = (date: string): GlowDay => ({
  id: `#${date}`,
  date,
  waterL: 3,
  proteinG: 125,
  fiberG: 30,
  steps: 8000,
  noSugaryDrinks: true,
  skincareAm: true,
  skincarePm: true,
});

describe("config Glow-up", () => {
  it("12 tuần liền nhau, mỗi tuần bắt đầu Thứ Hai, từ 19/10/2026 tới 10/01/2027", () => {
    expect(WEEKS).toHaveLength(12);
    WEEKS.forEach((w, i) => {
      expect(w.week).toBe(i + 1);
      expect(w.start).toBe(addDays(GLOW_START, i * 7));
    });
    expect(addDays(WEEKS[11].start, 6)).toBe(GLOW_END);
  });

  it("lộ trình ngủ phủ kín 12 tuần, không chồng nhau", () => {
    expect(SLEEP_RAMP[0].from).toBe(GLOW_START);
    expect(SLEEP_RAMP[SLEEP_RAMP.length - 1].to).toBe(GLOW_END);
    for (let i = 1; i < SLEEP_RAMP.length; i++) {
      expect(SLEEP_RAMP[i].from).toBe(addDays(SLEEP_RAMP[i - 1].to, 1));
    }
  });

  it("lịch tuần có 7 ngày, buổi tập trước 8:30 để không đụng khung 9:30", () => {
    expect(WEEK_TEMPLATE).toHaveLength(7);
    for (const t of WEEK_TEMPLATE) if (t.time) expect(t.time < "08:30").toBe(true);
  });

  it("id bài tập không trùng nhau", () => {
    const ids = Object.values(GYM).flatMap((g) => g.exercises.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("tuần chụp ảnh là 1, 4, 8, 12", () => {
    expect(PHOTO_WEEKS).toEqual([1, 4, 8, 12]);
  });
});

describe("programWeek / planFor", () => {
  it("ngoài 12 tuần: null", () => {
    expect(programWeek("2026-10-18")).toBeNull();
    expect(programWeek("2027-01-11")).toBeNull();
    expect(planFor("2026-10-18")).toBeNull();
  });

  it("biên của tuần", () => {
    expect(programWeek("2026-10-19")?.week).toBe(1);
    expect(programWeek("2026-10-25")?.week).toBe(1);
    expect(programWeek("2026-10-26")?.week).toBe(2);
    expect(programWeek("2027-01-10")?.week).toBe(12);
    expect(weekTitle(programWeek("2026-11-16")!)).toBe("Tuần 5 · Phát triển");
  });

  it("buổi theo thứ trong tuần, Chủ nhật nghỉ", () => {
    expect(planFor("2026-10-19")?.session).toBe("gym_A");
    expect(planFor("2026-10-20")?.session).toBe("run_easy");
    expect(planFor("2026-10-21")?.session).toBe("gym_B");
    expect(planFor("2026-10-22")?.session).toBe("run_interval");
    expect(planFor("2026-10-23")?.session).toBe("gym_C");
    expect(planFor("2026-10-24")?.session).toBe("run_long");
    expect(planFor("2026-10-25")?.session).toBe("rest");
  });

  it("nội dung chạy theo giai đoạn", () => {
    expect(planFor("2026-10-20")?.detail).toBe("30 phút nhẹ");
    expect(planFor("2026-11-21")?.detail).toBe("8–12 km"); // tuần 5, Thứ Bảy
    expect(planFor("2026-12-17")?.detail).toBe("20 phút tempo đều"); // tuần 9, Thứ Năm
  });

  it("tuần 8 giảm tải: chạy nhẹ, gym 2 hiệp", () => {
    expect(planFor("2026-12-10")?.detail).toBe("Tuần giảm tải: chỉ chạy nhẹ");
    expect(planFor("2026-12-07")?.detail).toBe("Tuần giảm tải: 2 hiệp mỗi bài");
    expect(setsFor(GYM.gym_A.exercises[0], "2026-12-07")).toBe(2);
    expect(setsFor(GYM.gym_A.exercises[0], "2026-12-14")).toBe(3);
    expect(planFor("2026-12-13")?.detail).toBeUndefined(); // Chủ nhật nghỉ
  });
});

describe("giấc ngủ", () => {
  it("giờ tắt đèn theo đêm", () => {
    expect(lightsOutFor("2026-10-21")).toBe("00:00");
    expect(lightsOutFor("2026-10-22")).toBe("23:30");
    expect(lightsOutFor("2026-10-25")).toBe("23:00");
    expect(lightsOutFor("2026-10-18")).toBeNull();
  });

  it("check-in ngày D so với đêm D-1", () => {
    // Check-in 23/10 = đêm 22/10, mốc 23:30.
    expect(sleepCheck(checkin("2026-10-23", "23:30"), "2026-10-23")).toEqual({
      bedTime: "23:30",
      target: "23:30",
      onTime: true,
    });
    expect(sleepCheck(checkin("2026-10-23", "23:31"), "2026-10-23")?.onTime).toBe(false);
    // Check-in 22/10 = đêm 21/10, mốc còn là 00:00.
    expect(sleepCheck(checkin("2026-10-22", "23:50"), "2026-10-22")?.onTime).toBe(true);
  });

  it("qua nửa đêm: 00:30 trễ hơn 00:00, 23:59 sớm hơn", () => {
    expect(sleepCheck(checkin("2026-10-20", "00:30"), "2026-10-20")?.onTime).toBe(false);
    expect(sleepCheck(checkin("2026-10-20", "00:00"), "2026-10-20")?.onTime).toBe(true);
    expect(sleepCheck(checkin("2026-10-20", "23:59"), "2026-10-20")?.onTime).toBe(true);
    expect(sleepCheck(checkin("2026-11-01", "22:15"), "2026-11-01")?.onTime).toBe(true);
    expect(sleepCheck(checkin("2026-11-01", "01:10"), "2026-11-01")?.onTime).toBe(false);
  });

  it("ngày đầu dùng mốc đầu tiên; chưa check-in / giờ trống / ngoài chương trình: null", () => {
    expect(sleepCheck(checkin("2026-10-19", "23:45"), "2026-10-19")?.target).toBe("00:00");
    expect(sleepCheck(null, "2026-10-20")).toBeNull();
    expect(sleepCheck(checkin("2026-10-20", ""), "2026-10-20")).toBeNull();
    expect(sleepCheck(checkin("2026-10-18", "23:00"), "2026-10-18")).toBeNull();
  });
});

describe("adapalene", () => {
  it("tuần 1-2 cách đêm từ tối đầu tiên, từ tuần 3 mỗi tối", () => {
    expect(adapaleneTonight("2026-10-19")).toBe(true);
    expect(adapaleneTonight("2026-10-20")).toBe(false);
    expect(adapaleneTonight("2026-10-21")).toBe(true);
    expect(adapaleneTonight("2026-11-01")).toBe(false); // ngày 14
    expect(adapaleneTonight("2026-11-02")).toBe(true); // tuần 3
    expect(adapaleneTonight("2026-11-03")).toBe(true);
    expect(adapaleneTonight("2027-01-11")).toBeNull();
  });
});

describe("checklist", () => {
  it("bước +/- không âm, không lỗi số thực", () => {
    expect(stepValue(undefined, 0.25, 1)).toBe(0.25);
    expect(stepValue(0.1, 0.2, 1)).toBe(0.3);
    expect(stepValue(0.25, 0.25, -1)).toBe(0);
    expect(stepValue(undefined, 25, -1)).toBe(0);
  });

  it("nước: 2,7 L + 0,5 L mỗi giờ chạy", () => {
    expect(waterTarget([], "2026-10-20")).toBe(2.7);
    expect(waterTarget([workout("2026-10-20", "run_easy", 60)], "2026-10-20")).toBe(3.2);
    expect(waterTarget([workout("2026-10-24", "run_long", 90)], "2026-10-24")).toBe(3.5);
    // Gym không cộng nước, buổi chạy ngày khác cũng không.
    expect(waterTarget([workout("2026-10-19", "gym_A"), workout("2026-10-21", "run_easy")], "2026-10-20")).toBe(2.7);
  });

  it("ngày thường 9 mục, Chủ nhật 8 (không có buổi tập)", () => {
    expect(dayChecklist("2026-10-19", null, null, []).total).toBe(9);
    expect(dayChecklist("2026-10-25", null, null, []).total).toBe(8);
    expect(dayChecklist("2026-10-25", null, null, []).items.some((i) => i.id === "training")).toBe(false);
  });

  it("chưa có gì: 0 mục, chưa đạt", () => {
    expect(dayChecklist("2026-10-19", undefined, undefined, [])).toMatchObject({ done: 0, met: false });
  });

  it("ngày đạt = >= 7 mục", () => {
    const date = "2026-10-20";
    // 7 mục của GlowDay, chưa ngủ đúng giờ, chưa tập: 7/9 -> đạt.
    expect(dayChecklist(date, fullDay(date), null, [])).toMatchObject({ done: 7, total: 9, met: true });
    // Thiếu một mục nữa: 6/9 -> chưa đạt.
    expect(dayChecklist(date, { ...fullDay(date), steps: 7999 }, null, []).met).toBe(false);
    // Đủ cả 9.
    const all = dayChecklist(date, fullDay(date), checkin(date, "23:00"), [workout(date, "run_easy", 30)]);
    expect(all).toMatchObject({ done: 9, total: 9, met: true });
  });

  it("ngày chạy dài: 3 L nước chưa đủ vì cần 3,5 L", () => {
    const date = "2026-10-24";
    const items = dayChecklist(date, fullDay(date), null, [workout(date, "run_long", 90)]).items;
    expect(items.find((i) => i.id === "water")?.done).toBe(false);
    expect(items.find((i) => i.id === "training")?.done).toBe(true);
  });

  it("tuần: đếm ngày đạt, ngày tương lai không bao giờ đạt", () => {
    const days = ["2026-10-19", "2026-10-20", "2026-10-22"].map(fullDay);
    const future = fullDay("2026-10-24");
    const week = glowWeek("2026-10-22", [...days, future], [], []);
    expect(week.map((d) => d.date)).toEqual([
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
    expect(week.map((d) => d.met)).toEqual([true, true, false, true, false, false, false]);
  });

  it("Chủ nhật hỏi trong tuần: tuần là Thứ Hai trước đó", () => {
    expect(glowWeek("2026-10-25", [], [], [])[0].date).toBe("2026-10-19");
  });
});

describe("tăng tạ", () => {
  const squat = GYM.gym_A.exercises[0]; // 3 × 8-10, chân
  const bench = GYM.gym_A.exercises[1]; // 3 × 8-10, thân trên
  const plank = GYM.gym_A.exercises[5]; // tạ người
  const sets = (exercise: string, kg: number | null, reps: number[]): WorkoutSet[] =>
    reps.map((r) => ({ exercise, kg, reps: r }));

  it("kg kiểu Việt Nam: dấu phẩy", () => {
    expect(formatKg(42.5)).toBe("42,5");
    expect(parseDecimal("42,5")).toBe(42.5);
    expect(parseDecimal("42.5")).toBe(42.5);
    expect(parseDecimal("  ")).toBeNull();
    expect(parseDecimal("abc")).toBeNaN();
    expect(parseDecimal("-5")).toBeNaN();
  });

  it("số lần mặc định", () => {
    expect(defaultReps("8-10")).toBe(8);
    expect(defaultReps("30-45 giây")).toBe(30);
    expect(defaultReps("10 mỗi bên")).toBe(10);
    expect(defaultReps("tối đa")).toBe(10);
  });

  it("đọc khoảng số lần", () => {
    expect(repRange("8-10")).toEqual({ min: 8, max: 10 });
    expect(repRange("15")).toEqual({ min: 15, max: 15 });
    expect(repRange("tối đa")).toBeNull();
    expect(repRange("30-45 giây")).toBeNull();
    expect(repRange("10 mỗi bên")).toBeNull();
  });

  it("cả 3 hiệp đạt đỉnh: thân trên +2,5 kg, chân +5 kg", () => {
    expect(suggestLoad(bench, sets("bench_press", 40, [10, 10, 10]))).toEqual({ kg: 42.5, increase: true });
    expect(suggestLoad(squat, sets("goblet_squat", 20, [10, 10, 11]))).toEqual({ kg: 25, increase: true });
  });

  it("chưa đủ: giữ mức cũ", () => {
    expect(suggestLoad(bench, sets("bench_press", 40, [10, 10, 9]))).toEqual({ kg: 40, increase: false });
    // Thiếu một hiệp.
    expect(suggestLoad(bench, sets("bench_press", 40, [10, 10]))).toEqual({ kg: 40, increase: false });
    // Các hiệp khác mức tạ: chưa coi là đạt đỉnh ở mức nặng nhất.
    expect(suggestLoad(bench, [...sets("bench_press", 40, [10, 10]), ...sets("bench_press", 35, [10])])).toEqual({
      kg: 40,
      increase: false,
    });
  });

  it("tạ người, số lần không phải số, chưa có buổi trước: không gợi ý", () => {
    expect(suggestLoad(plank, sets("plank", null, [40, 40, 40]))).toBeNull();
    expect(suggestLoad(bench, [])).toBeNull();
    expect(suggestLoad(bench, sets("bench_press", null, [10, 10, 10]))).toBeNull();
  });

  it("buổi trước = buổi gần nhất có bài đó, trừ buổi đang sửa", () => {
    const w1 = workout("2026-10-19", "gym_A", 60, { id: "w1", sets: sets("bench_press", 40, [8, 8, 8]) });
    const w2 = workout("2026-10-26", "gym_A", 60, { id: "w2", sets: sets("bench_press", 42.5, [9, 9, 8]) });
    const w3 = workout("2026-10-21", "gym_B", 60, { id: "w3", sets: sets("face_pull", 10, [15, 15, 15]) });
    expect(lastSetsFor([w2, w1, w3], "bench_press")[0].kg).toBe(42.5);
    expect(lastSetsFor([w2, w1, w3], "bench_press", "w2")[0].kg).toBe(40);
    expect(lastSetsFor([w3], "bench_press")).toEqual([]);
  });

  it("điền sẵn: chưa có buổi trước -> kg trống, số lần = đáy khoảng", () => {
    const pre = prefillSets("gym_A", "2026-10-19", [], undefined);
    expect(pre).toHaveLength(18); // 6 bài × 3 hiệp
    expect(pre[0]).toEqual({ exercise: "goblet_squat", kg: null, reps: 8 });
    expect(pre.find((s) => s.exercise === "plank")).toEqual({ exercise: "plank", kg: null, reps: 30 });
    expect(prefillSets("gym_C", "2026-10-23", []).find((s) => s.exercise === "push_up")?.reps).toBe(10);
  });

  it("điền sẵn: chép buổi trước, hoặc tăng tạ và về đáy khoảng", () => {
    const prev = workout("2026-10-19", "gym_A", 60, {
      id: "p",
      sets: [...sets("bench_press", 40, [10, 10, 10]), ...sets("goblet_squat", 20, [10, 9, 8])],
    });
    const pre = prefillSets("gym_A", "2026-10-26", [prev]);
    expect(pre.filter((s) => s.exercise === "bench_press")).toEqual(sets("bench_press", 42.5, [8, 8, 8]));
    expect(pre.filter((s) => s.exercise === "goblet_squat")).toEqual(sets("goblet_squat", 20, [10, 9, 8]));
  });

  it("tuần giảm tải điền 2 hiệp mỗi bài", () => {
    expect(prefillSets("gym_B", "2026-12-09", [])).toHaveLength(12);
  });
});

describe("không lệch ngày theo múi giờ", () => {
  it("đếm ngày bằng chuỗi YYYY-MM-DD", () => {
    expect(daysUntil(GLOW_START, GLOW_END)).toBe(83);
  });
});

describe("check-in Chủ nhật (G3)", () => {
  const body = (weekStart: string, avgWeightKg?: number, waistCm?: number): BodyCheckin => ({
    id: `#${weekStart}`,
    weekStart,
    avgWeightKg,
    waistCm,
  });

  it("hỏi vào Chủ nhật; Thứ Hai hỏi bù tuần trước nếu chưa có", () => {
    expect(checkinWeekToAsk("2026-10-25", [])).toBe("2026-10-19"); // CN tuần 1
    expect(checkinWeekToAsk("2026-10-26", [])).toBe("2026-10-19"); // T2 tuần 2, bù tuần 1
    expect(checkinWeekToAsk("2026-10-26", [body("2026-10-19", 70)])).toBeNull();
    expect(checkinWeekToAsk("2026-10-21", [])).toBeNull(); // Thứ Tư
    expect(checkinWeekToAsk("2026-10-19", [])).toBeNull(); // T2 đầu tiên: tuần trước ngoài chương trình
    expect(checkinWeekToAsk("2026-10-18", [])).toBeNull(); // CN trước chương trình
    expect(checkinWeekToAsk("2027-01-10", [])).toBe("2027-01-04"); // CN tuần 12
    expect(checkinWeekToAsk("2027-01-11", [])).toBe("2027-01-04"); // T2 sau cùng, bù tuần 12
    expect(checkinWeekToAsk("2027-01-17", [])).toBeNull();
  });

  it("lần cân trong tuần và trung bình làm tròn 0,1", () => {
    const days: GlowDay[] = [
      { id: "#2026-10-21", date: "2026-10-21", weightKg: 70.1 },
      { id: "#2026-10-19", date: "2026-10-19", weightKg: 70.4 },
      { id: "#2026-10-20", date: "2026-10-20", waterL: 1 },
      { id: "#2026-10-26", date: "2026-10-26", weightKg: 69 }, // tuần sau
    ];
    expect(weekWeighIns(days, "2026-10-19")).toEqual([70.4, 70.1]);
    expect(averageWeight([70.4, 70.1])).toBe(70.3); // 70.25 -> 70.3
    expect(averageWeight([70.1, 70.2])).toBe(70.2); // 70.15 -> 70.2, không phải 70.1
    expect(averageWeight([])).toBeNull();
  });

  it("đếm buổi gym / chạy trong tuần", () => {
    const ws = [
      workout("2026-10-19", "gym_A"),
      workout("2026-10-20", "run_easy"),
      workout("2026-10-25", "other"),
      workout("2026-10-26", "gym_A"), // tuần sau
    ];
    expect(weekSessionCounts(ws, "2026-10-19")).toEqual({ gym: 1, run: 1 });
  });

  it("tuần chụp ảnh 1, 4, 8, 12", () => {
    expect(isPhotoWeek("2026-10-19")).toBe(true);
    expect(isPhotoWeek("2026-10-26")).toBe(false);
    expect(isPhotoWeek("2026-11-09")).toBe(true);
    expect(isPhotoWeek("2027-01-04")).toBe(true);
  });

  it("luật 1: giảm dưới 0,2 kg hai tuần liền", () => {
    const saved = [body("2026-10-19", 78), body("2026-10-26", 77.9)];
    // 78 -> 77,9 -> 77,8: mỗi tuần chỉ giảm 0,1.
    expect(adjustHints(saved, "2026-11-02", 77.8)).toEqual([
      "Giảm một phần tư chén cơm bữa tối hoặc thêm 2.000 bước mỗi ngày.",
    ]);
    // Giảm đúng 0,2 một tuần: không còn "dưới 0,2".
    expect(adjustHints(saved, "2026-11-02", 77.7)).toEqual([]);
    // Thiếu một tuần ở giữa: không kết luận.
    expect(adjustHints([body("2026-10-19", 78)], "2026-11-02", 77.9)).toEqual([]);
    // Chưa có số tuần này: không kết luận.
    expect(adjustHints(saved, "2026-11-02", null)).toEqual([]);
  });

  it("luật 2: từ tuần 3, giảm trên 1 kg một tuần", () => {
    expect(adjustHints([body("2026-10-26", 77)], "2026-11-02", 75.9)).toEqual([
      "Ăn thêm khoảng 150 kcal mỗi ngày (nhất là nếu tạ tập đang tụt).",
    ]);
    expect(adjustHints([body("2026-10-26", 77)], "2026-11-02", 76)).toEqual([]); // đúng 1 kg
    expect(adjustHints([body("2026-10-19", 78)], "2026-10-26", 76.5)).toEqual([]); // tuần 2: chưa áp dụng
  });

  it("so với tuần 1, kèm mốc tuần 4", () => {
    const saved = [body("2026-10-19", 78, 98)];
    expect(startComparison(saved, "2026-11-09", 76.2, 96.5)).toEqual({
      weightKg: -1.8,
      waistCm: -1.5,
      milestone: { weightKg: -2, waistCm: -2 },
    });
    expect(startComparison(saved, "2026-10-26", 77.6, null)).toEqual({
      weightKg: -0.4,
      waistCm: null,
      milestone: undefined,
    });
    expect(startComparison(saved, "2026-10-19", 78, 98)).toBeNull(); // chính tuần 1
    expect(startComparison([], "2026-11-09", 76, 96)).toBeNull(); // chưa có tuần 1
  });
});
