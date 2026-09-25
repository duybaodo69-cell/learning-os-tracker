/**
 * Test cho các phép tính của màn hình Thống kê.
 *
 * Vì sao cần: một con số thống kê sai vẫn hiện ra rất tự tin. Bạn sẽ đổi
 * cách học dựa trên nó mà không bao giờ biết là nó sai.
 */
import { describe, expect, it } from "vitest";
import type { DailyCheckin, ExperimentTag, FocusBlock, ReviewLog } from "../db/types";
import {
  BASELINE_FROM,
  BASELINE_TO,
  EXPERIMENT_MIN_DAYS,
  RETENTION_MIN_INTERVAL,
  baselineFinished,
  buildExperimentResult,
  buildSleepVsNextDayFocus,
  buildWeeklyByArea,
  buildWeeklyRetention,
  compareMetric,
  computeMetrics,
  consistency,
  daysBetween,
  hhmmToMinutes,
  isSunday,
  mean,
  mondayOf,
  standardDeviation,
  weekRange,
} from "./metrics";

/* -------- tiện ích tạo dữ liệu giả -------- */
function checkin(date: string, sleepHours: number, wakeTime = "06:30"): DailyCheckin {
  return { date, bedTime: "23:30", wakeTime, sleepHours, energy: 3 };
}
function block(date: string, minutes: number, extra: Partial<FocusBlock> = {}): FocusBlock {
  return {
    id: `${date}-${minutes}-${Math.random()}`,
    date,
    startTime: "09:00",
    minutes,
    area: "IELTS",
    focusRating: 3,
    distractions: 0,
    phoneAway: false,
    ...extra,
  };
}
function log(date: string, grade: ReviewLog["grade"], intervalBefore: number): ReviewLog {
  return { id: `${date}-${Math.random()}`, cardId: "c1", date, grade, intervalBefore };
}

describe("mondayOf — tuần bắt đầu Thứ Hai", () => {
  it("Thứ Hai trả về chính nó", () => {
    expect(mondayOf("2026-09-28")).toBe("2026-09-28"); // Thứ Hai
  });

  it("giữa tuần lùi về Thứ Hai", () => {
    expect(mondayOf("2026-09-30")).toBe("2026-09-28"); // Thứ Tư
    expect(mondayOf("2026-10-02")).toBe("2026-09-28"); // Thứ Sáu
  });

  it("CHỦ NHẬT thuộc tuần đang chạy, phải lùi 6 ngày chứ không tiến 1", () => {
    // Đây là lỗi kinh điển: getDay() trả 0 cho Chủ Nhật.
    expect(mondayOf("2026-10-04")).toBe("2026-09-28"); // Chủ Nhật
  });

  it("qua mốc đổi tháng", () => {
    expect(mondayOf("2026-10-01")).toBe("2026-09-28");
  });
});

describe("isSunday", () => {
  it("nhận đúng Chủ Nhật", () => {
    expect(isSunday("2026-09-27")).toBe(true);
    expect(isSunday("2026-10-04")).toBe(true);
  });

  it("các ngày khác trả về false", () => {
    expect(isSunday("2026-09-25")).toBe(false); // Thứ Sáu
    expect(isSunday("2026-09-28")).toBe(false); // Thứ Hai
    expect(isSunday("2026-10-03")).toBe(false); // Thứ Bảy
  });
});

describe("weekRange", () => {
  it("Thứ Hai đến Chủ Nhật", () => {
    expect(weekRange("2026-09-30")).toEqual({ from: "2026-09-28", to: "2026-10-04" });
  });
});

describe("daysBetween", () => {
  it("tính cả hai đầu", () => {
    expect(daysBetween("2026-09-28", "2026-09-30")).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
    ]);
  });

  it("cùng một ngày trả về đúng một phần tử", () => {
    expect(daysBetween("2026-09-28", "2026-09-28")).toEqual(["2026-09-28"]);
  });

  it("from sau to thì trả về rỗng, không treo", () => {
    expect(daysBetween("2026-09-30", "2026-09-28")).toEqual([]);
  });
});

describe("hhmmToMinutes", () => {
  it("đổi đúng", () => {
    expect(hhmmToMinutes("00:00")).toBe(0);
    expect(hhmmToMinutes("06:30")).toBe(390);
    expect(hhmmToMinutes("23:59")).toBe(1439);
  });
});

describe("mean và standardDeviation", () => {
  it("mảng rỗng trả về null chứ không phải 0", () => {
    expect(mean([])).toBeNull();
    expect(standardDeviation([])).toBeNull();
  });

  it("một giá trị thì không có độ lệch chuẩn", () => {
    expect(mean([5])).toBe(5);
    expect(standardDeviation([5])).toBeNull();
  });

  it("giờ dậy y hệt nhau -> độ lệch 0 (hoàn toàn đều)", () => {
    expect(standardDeviation([390, 390, 390])).toBe(0);
  });

  it("tính đúng độ lệch chuẩn", () => {
    // [2,4,4,4,5,5,7,9] có population SD = 2
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 10);
  });

  it("dậy thất thường cho độ lệch lớn hơn dậy đều", () => {
    const deu = standardDeviation([390, 395, 385, 390])!;
    const thatThuong = standardDeviation([360, 480, 400, 540])!;
    expect(thatThuong).toBeGreaterThan(deu);
  });
});

describe("computeMetrics", () => {
  const input = {
    checkins: [checkin("2026-09-28", 7, "06:00"), checkin("2026-09-29", 8, "07:00")],
    focusBlocks: [
      block("2026-09-28", 60, { distractions: 2 }),
      block("2026-09-29", 90, { distractions: 4 }),
      block("2026-10-20", 999, { distractions: 99 }), // ngoài khoảng
    ],
    reviewLogs: [
      log("2026-09-28", "good", 8), // chín, nhớ
      log("2026-09-28", "easy", 5), // chín, nhớ
      log("2026-09-29", "again", 10), // chín, quên
      log("2026-09-29", "again", 1), // CHƯA chín -> không tính retention
    ],
    predictions: [],
  };

  const m = computeMetrics(input, "2026-09-28", "2026-09-29");

  it("chỉ tính dữ liệu trong khoảng", () => {
    expect(m.deepWorkMinutes).toBe(150); // 60 + 90, không có 999
  });

  it("trung bình giấc ngủ", () => {
    expect(m.avgSleepHours).toBeCloseTo(7.5, 10);
  });

  it("độ lệch giờ dậy tính bằng phút", () => {
    // 06:00 = 360, 07:00 = 420 -> SD = 30 phút
    expect(m.wakeTimeSdMinutes).toBeCloseTo(30, 10);
  });

  it("phân tâm trung bình mỗi block", () => {
    expect(m.avgDistractionsPerBlock).toBeCloseTo(3, 10); // (2+4)/2
  });

  it("đếm tất cả lượt ôn", () => {
    expect(m.cardsReviewed).toBe(4);
  });

  it("retention CHỈ tính thẻ có interval >= 3 ngày", () => {
    expect(RETENTION_MIN_INTERVAL).toBe(3);
    // 3 lượt chín: good, easy, again -> 2/3 nhớ
    expect(m.retentionRate).toBeCloseTo((2 / 3) * 100, 6);
  });

  it("không có lượt ôn chín nào thì retention là null chứ không phải 0", () => {
    const only = computeMetrics(
      { ...input, reviewLogs: [log("2026-09-28", "again", 1)] },
      "2026-09-28",
      "2026-09-29"
    );
    expect(only.retentionRate).toBeNull();
  });

  it("khoảng rỗng: số cộng dồn là 0, số trung bình là null", () => {
    const empty = computeMetrics(input, "2027-01-01", "2027-01-07");
    expect(empty.deepWorkMinutes).toBe(0);
    expect(empty.cardsReviewed).toBe(0);
    expect(empty.avgSleepHours).toBeNull();
    expect(empty.retentionRate).toBeNull();
  });
});

describe("compareMetric — hướng tốt/xấu", () => {
  it("ngủ nhiều hơn là tốt hơn", () => {
    expect(compareMetric("avgSleepHours", 7.5, 7).better).toBe(true);
    expect(compareMetric("avgSleepHours", 6.5, 7).better).toBe(false);
  });

  it("giờ dậy lệch ÍT hơn là tốt hơn", () => {
    expect(compareMetric("wakeTimeSdMinutes", 20, 45).better).toBe(true);
    expect(compareMetric("wakeTimeSdMinutes", 60, 45).better).toBe(false);
  });

  it("phân tâm ít hơn và Brier thấp hơn là tốt hơn", () => {
    expect(compareMetric("avgDistractionsPerBlock", 1, 3).better).toBe(true);
    expect(compareMetric("brier30", 0.15, 0.25).better).toBe(true);
  });

  it("thiếu một vế thì không kết luận", () => {
    expect(compareMetric("avgSleepHours", null, 7).better).toBeNull();
    expect(compareMetric("avgSleepHours", 7, null).diff).toBeNull();
  });

  it("bằng nhau thì không tốt cũng không xấu", () => {
    expect(compareMetric("deepWorkMinutes", 100, 100).better).toBeNull();
  });
});

describe("baseline", () => {
  it("khớp với giai đoạn 1 của protocol", () => {
    expect(BASELINE_FROM).toBe("2026-09-28");
    expect(BASELINE_TO).toBe("2026-10-11");
  });

  it("chỉ so sánh SAU khi giai đoạn baseline kết thúc", () => {
    expect(baselineFinished("2026-10-11")).toBe(false); // ngày cuối, vẫn đang đo
    expect(baselineFinished("2026-10-12")).toBe(true);
    expect(baselineFinished("2026-09-25")).toBe(false);
  });
});

describe("consistency — đếm ngày, không phải chuỗi liên tiếp", () => {
  it("log đủ 14 ngày", () => {
    const all = daysBetween("2026-09-12", "2026-09-25").map((d) => checkin(d, 7));
    expect(consistency(all, "2026-09-25")).toEqual({ logged: 14, total: 14, percent: 100 });
  });

  it("nghỉ giữa chừng KHÔNG xoá hết thành quả", () => {
    // 13 ngày có log, nghỉ đúng một hôm.
    const dates = daysBetween("2026-09-12", "2026-09-25").filter((d) => d !== "2026-09-20");
    const c = consistency(dates.map((d) => checkin(d, 7)), "2026-09-25");
    expect(c.logged).toBe(13); // nếu là streak thì đã về 5
  });

  it("ngày cũ hơn 14 ngày không được tính", () => {
    expect(consistency([checkin("2026-01-01", 7)], "2026-09-25").logged).toBe(0);
  });

  it("chưa log gì", () => {
    expect(consistency([], "2026-09-25")).toEqual({ logged: 0, total: 14, percent: 0 });
  });
});

describe("buildSleepVsNextDayFocus", () => {
  it("ghép giấc ngủ đêm nay với deep work NGÀY HÔM SAU", () => {
    const points = buildSleepVsNextDayFocus(
      [checkin("2026-09-24", 8)],
      [block("2026-09-25", 120)],
      "2026-09-25",
      2
    );
    const d24 = points.find((p) => p.date === "2026-09-24")!;
    expect(d24.sleepHours).toBe(8);
    expect(d24.nextDayMinutes).toBe(120); // của ngày 25, đúng ý đồ
  });

  it("trả về đủ số ngày yêu cầu, ngày trống vẫn có mặt", () => {
    const points = buildSleepVsNextDayFocus([], [], "2026-09-25", 28);
    expect(points).toHaveLength(28);
    expect(points[0].date).toBe("2026-08-29");
    expect(points[27].date).toBe("2026-09-25");
    expect(points[0].sleepHours).toBeNull();
    expect(points[0].nextDayMinutes).toBe(0);
  });

  it("cộng dồn nhiều block trong cùng một ngày", () => {
    const points = buildSleepVsNextDayFocus(
      [checkin("2026-09-24", 7)],
      [block("2026-09-25", 60), block("2026-09-25", 30)],
      "2026-09-25",
      2
    );
    expect(points.find((p) => p.date === "2026-09-24")!.nextDayMinutes).toBe(90);
  });
});

describe("buildWeeklyByArea", () => {
  it("gom theo tuần và theo area", () => {
    const { points, areas } = buildWeeklyByArea(
      [
        block("2026-09-28", 60, { area: "IELTS" }),
        block("2026-09-30", 30, { area: "IELTS" }),
        block("2026-09-29", 45, { area: "EFM" }),
      ],
      "2026-10-02",
      2
    );
    expect(areas).toEqual(["EFM", "IELTS"]);
    const thisWeek = points.find((p) => p.weekStart === "2026-09-28")!;
    expect(thisWeek.IELTS).toBe(90);
    expect(thisWeek.EFM).toBe(45);
  });

  it("luôn trả đủ số tuần, tuần trống là 0", () => {
    const { points } = buildWeeklyByArea([], "2026-10-02", 8);
    expect(points).toHaveLength(8);
  });

  it("bỏ qua block nằm ngoài cửa sổ", () => {
    const { points } = buildWeeklyByArea([block("2020-01-01", 999)], "2026-10-02", 4);
    const total = points.reduce(
      (s, p) => s + Object.entries(p).filter(([k]) => k !== "weekStart").reduce((x, [, v]) => x + (v as number), 0),
      0
    );
    expect(total).toBe(0);
  });
});

describe("buildWeeklyRetention", () => {
  it("tuần không có lượt ôn chín nào thì retention là null", () => {
    const pts = buildWeeklyRetention([log("2026-09-28", "good", 1)], "2026-10-02", 1);
    expect(pts[0].retentionRate).toBeNull();
    expect(pts[0].reviews).toBe(0);
  });

  it("tính đúng tỷ lệ nhớ trong tuần", () => {
    const pts = buildWeeklyRetention(
      [
        log("2026-09-28", "good", 8),
        log("2026-09-29", "easy", 8),
        log("2026-09-30", "hard", 8),
        log("2026-10-01", "again", 8),
      ],
      "2026-10-02",
      1
    );
    expect(pts[0].reviews).toBe(4);
    expect(pts[0].retentionRate).toBeCloseTo(50, 10); // good + easy = 2/4
  });

  it('"Khó" KHÔNG tính là nhớ được', () => {
    const pts = buildWeeklyRetention([log("2026-09-28", "hard", 8)], "2026-10-02", 1);
    expect(pts[0].retentionRate).toBe(0);
  });
});

describe("buildExperimentResult", () => {
  function tag(date: string, condition: "A" | "B"): ExperimentTag {
    return { key: `${date}|e1`, date, experimentId: "e1", condition };
  }

  it("tách đúng hai nhánh và tính số liệu riêng", () => {
    const tags = [tag("2026-09-01", "A"), tag("2026-09-02", "B")];
    const blocks = [
      block("2026-09-01", 60, { focusRating: 5, distractions: 0 }),
      block("2026-09-02", 30, { focusRating: 2, distractions: 6 }),
    ];
    const r = buildExperimentResult(tags, blocks, "e1");

    expect(r.a.days).toBe(1);
    expect(r.a.focusMean).toBe(5);
    expect(r.a.deepWorkMinutes).toBe(60);
    expect(r.b.focusMean).toBe(2);
    expect(r.b.distractionsPerBlock).toBe(6);
  });

  it("cần CẢ HAI nhánh đủ 10 ngày mới kết luận", () => {
    expect(EXPERIMENT_MIN_DAYS).toBe(10);

    const nhieuA = Array.from({ length: 12 }, (_, i) => tag(`2026-09-${String(i + 1).padStart(2, "0")}`, "A"));
    const itB = Array.from({ length: 3 }, (_, i) => tag(`2026-10-${String(i + 1).padStart(2, "0")}`, "B"));
    expect(buildExperimentResult([...nhieuA, ...itB], [], "e1").enough).toBe(false);

    const duB = Array.from({ length: 10 }, (_, i) => tag(`2026-10-${String(i + 1).padStart(2, "0")}`, "B"));
    expect(buildExperimentResult([...nhieuA, ...duB], [], "e1").enough).toBe(true);
  });

  it("bỏ qua nhãn của thí nghiệm khác", () => {
    const tags: ExperimentTag[] = [
      tag("2026-09-01", "A"),
      { key: "2026-09-02|e2", date: "2026-09-02", experimentId: "e2", condition: "A" },
    ];
    expect(buildExperimentResult(tags, [], "e1").a.days).toBe(1);
  });

  it("nhánh chưa có ngày nào thì các số trung bình là null", () => {
    const r = buildExperimentResult([tag("2026-09-01", "A")], [], "e1");
    expect(r.b.days).toBe(0);
    expect(r.b.focusMean).toBeNull();
    expect(r.b.deepWorkMinutes).toBe(0);
  });
});
