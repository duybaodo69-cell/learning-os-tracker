/**
 * Test cho phần toán chấm điểm dự đoán.
 *
 * Chạy bằng: npm test
 *
 * Vì sao cần: Brier và calibration sai thì con số vẫn hiện ra bình thường,
 * chỉ là SAI — và bạn sẽ rút ra kết luận sai về chính mình. Không có cách
 * nào phát hiện bằng mắt.
 */
import { describe, expect, it } from "vitest";
import {
  BRIER_ALWAYS_FIFTY,
  MIN_RESOLVED_FOR_CONCLUSION,
  averageBrier,
  averageBrierLastDays,
  brierScore,
  bucketIndexFor,
  buildCalibration,
  compareToFifty,
  fiftyVerdict,
  describeBrier,
  hasEnoughToConclude,
  isWithinLastDays,
  resolvedOnly,
} from "./calibration";
import type { ScorablePrediction } from "./calibration";

/** Tạo nhanh một dự đoán cho test. */
function p(probability: number, outcome: boolean | null, resolvedAt?: string): ScorablePrediction {
  return { probability, outcome, resolvedAt };
}

describe("brierScore — một dự đoán", () => {
  it("tự tin và đúng thì điểm rất thấp (tốt)", () => {
    expect(brierScore(90, true)).toBeCloseTo(0.01, 10);
    expect(brierScore(99, true)).toBeCloseTo(0.0001, 10);
  });

  it("tự tin nhưng sai thì bị phạt nặng", () => {
    expect(brierScore(90, false)).toBeCloseTo(0.81, 10);
    expect(brierScore(99, false)).toBeCloseTo(0.9801, 10);
  });

  it("nói 50% thì luôn đúng bằng 0.25 bất kể kết quả", () => {
    expect(brierScore(50, true)).toBeCloseTo(BRIER_ALWAYS_FIFTY, 10);
    expect(brierScore(50, false)).toBeCloseTo(BRIER_ALWAYS_FIFTY, 10);
  });

  it("nói xác suất thấp mà điều đó không xảy ra cũng là dự đoán tốt", () => {
    expect(brierScore(10, false)).toBeCloseTo(0.01, 10);
  });

  it("điểm luôn nằm trong khoảng 0 đến 1", () => {
    for (let prob = 1; prob <= 99; prob++) {
      for (const outcome of [true, false]) {
        const s = brierScore(prob, outcome);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("resolvedOnly", () => {
  it("bỏ qua dự đoán chưa chấm", () => {
    const list = [p(70, true), p(30, null), p(80, false), p(50, null)];
    expect(resolvedOnly(list)).toHaveLength(2);
  });

  it("danh sách toàn chưa chấm thì trả về rỗng", () => {
    expect(resolvedOnly([p(70, null), p(30, null)])).toEqual([]);
  });
});

describe("averageBrier", () => {
  it("chưa chấm cái nào thì trả về null, KHÔNG phải 0", () => {
    expect(averageBrier([])).toBeNull();
    expect(averageBrier([p(70, null)])).toBeNull();
  });

  it("tính trung bình đúng", () => {
    // (0.01 + 0.81) / 2 = 0.41
    expect(averageBrier([p(90, true), p(90, false)])).toBeCloseTo(0.41, 10);
  });

  it("dự đoán chưa chấm không bị tính vào trung bình", () => {
    const chiDaCham = averageBrier([p(90, true)]);
    const lanVaoChuaCham = averageBrier([p(90, true), p(10, null), p(50, null)]);
    expect(lanVaoChuaCham).toBe(chiDaCham);
  });

  it("dự đoán hoàn hảo cho điểm gần 0", () => {
    const avg = averageBrier([p(99, true), p(1, false)]);
    expect(avg).toBeLessThan(0.001);
  });
});

describe("isWithinLastDays", () => {
  const today = "2026-09-25";

  it("hôm nay được tính là trong khoảng", () => {
    expect(isWithinLastDays("2026-09-25", today, 30)).toBe(true);
  });

  it("đúng 29 ngày trước vẫn trong khoảng 30 ngày, 30 ngày trước thì không", () => {
    expect(isWithinLastDays("2026-08-27", today, 30)).toBe(true); // 29 ngày
    expect(isWithinLastDays("2026-08-26", today, 30)).toBe(false); // 30 ngày
  });

  it("ngày trong tương lai không được tính", () => {
    expect(isWithinLastDays("2026-09-26", today, 30)).toBe(false);
  });

  it("qua mốc đổi tháng vẫn đúng", () => {
    expect(isWithinLastDays("2026-08-31", today, 30)).toBe(true);
  });
});

describe("averageBrierLastDays", () => {
  const today = "2026-09-25";

  it("chỉ tính dự đoán chấm trong 30 ngày gần đây", () => {
    const list = [
      p(90, true, "2026-09-20"), // trong khoảng -> 0.01
      p(90, false, "2026-01-01"), // quá cũ -> bỏ
    ];
    expect(averageBrierLastDays(list, today, 30)).toBeCloseTo(0.01, 10);
  });

  it("dự đoán đã chấm nhưng thiếu resolvedAt thì bỏ qua", () => {
    expect(averageBrierLastDays([p(90, true)], today, 30)).toBeNull();
  });

  it("không có gì trong khoảng thì trả về null", () => {
    expect(averageBrierLastDays([p(90, true, "2020-01-01")], today, 30)).toBeNull();
  });
});

describe("bucketIndexFor — ranh giới các khoảng", () => {
  it("cận dưới tính vào khoảng đó", () => {
    expect(bucketIndexFor(0)).toBe(0);
    expect(bucketIndexFor(20)).toBe(1);
    expect(bucketIndexFor(40)).toBe(2);
    expect(bucketIndexFor(60)).toBe(3);
    expect(bucketIndexFor(80)).toBe(4);
  });

  it("giá trị ngay dưới cận trên vẫn ở khoảng cũ", () => {
    expect(bucketIndexFor(19)).toBe(0);
    expect(bucketIndexFor(39)).toBe(1);
    expect(bucketIndexFor(59)).toBe(2);
    expect(bucketIndexFor(79)).toBe(3);
  });

  it("100 rơi vào khoảng cuối cùng chứ không bị rớt ra ngoài", () => {
    expect(bucketIndexFor(100)).toBe(4);
    expect(bucketIndexFor(99)).toBe(4);
  });

  it("mọi giá trị 1-99 đều rơi vào đúng một khoảng hợp lệ", () => {
    for (let i = 1; i <= 99; i++) {
      const idx = bucketIndexFor(i);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(4);
    }
  });
});

describe("buildCalibration", () => {
  it("luôn trả về đủ 5 khoảng, kể cả khi không có dữ liệu", () => {
    const buckets = buildCalibration([]);
    expect(buckets).toHaveLength(5);
    expect(buckets.map((b) => b.label)).toEqual(["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"]);
    for (const b of buckets) {
      expect(b.count).toBe(0);
      expect(b.statedAverage).toBeNull();
      expect(b.actualRate).toBeNull();
    }
  });

  it("tính đúng tỷ lệ thực tế trong một khoảng", () => {
    // 4 dự đoán quanh 70%, 3 cái đúng -> 75%
    const list = [p(70, true), p(70, true), p(70, true), p(70, false)];
    const b = buildCalibration(list)[3]; // khoảng 60-80%
    expect(b.count).toBe(4);
    expect(b.statedAverage).toBeCloseTo(70, 10);
    expect(b.actualRate).toBeCloseTo(75, 10);
  });

  it("người calibrated hoàn hảo: nói 80% thì trúng 80%", () => {
    const list = [
      ...Array.from({ length: 8 }, () => p(80, true)),
      ...Array.from({ length: 2 }, () => p(80, false)),
    ];
    const b = buildCalibration(list)[4];
    expect(b.statedAverage).toBeCloseTo(80, 10);
    expect(b.actualRate).toBeCloseTo(80, 10);
  });

  it("người quá tự tin: nói 90% nhưng chỉ trúng 50%", () => {
    const list = [p(90, true), p(90, true), p(90, false), p(90, false)];
    const b = buildCalibration(list)[4];
    expect(b.statedAverage).toBeCloseTo(90, 10);
    expect(b.actualRate).toBeCloseTo(50, 10);
    expect(b.actualRate! < b.statedAverage!).toBe(true); // dấu hiệu quá tự tin
  });

  it("dự đoán chưa chấm không lọt vào khoảng nào", () => {
    const buckets = buildCalibration([p(70, null), p(70, null)]);
    expect(buckets.reduce((s, b) => s + b.count, 0)).toBe(0);
  });

  it("tổng số đếm của 5 khoảng bằng đúng số dự đoán đã chấm", () => {
    const list = [p(5, true), p(25, false), p(45, true), p(65, false), p(95, true), p(50, null)];
    const buckets = buildCalibration(list);
    expect(buckets.reduce((s, b) => s + b.count, 0)).toBe(5);
    expect(buckets.map((b) => b.count)).toEqual([1, 1, 1, 1, 1]);
  });
});

describe("hasEnoughToConclude", () => {
  it("cần ít nhất 20 dự đoán ĐÃ CHẤM", () => {
    expect(MIN_RESOLVED_FOR_CONCLUSION).toBe(20);

    const mot9 = Array.from({ length: 19 }, () => p(70, true));
    expect(hasEnoughToConclude(mot9)).toBe(false);

    const hai0 = Array.from({ length: 20 }, () => p(70, true));
    expect(hasEnoughToConclude(hai0)).toBe(true);
  });

  it("dự đoán chưa chấm không được tính", () => {
    const list = [
      ...Array.from({ length: 10 }, () => p(70, true)),
      ...Array.from({ length: 50 }, () => p(70, null)),
    ];
    expect(hasEnoughToConclude(list)).toBe(false);
  });
});

describe("describeBrier", () => {
  it("chưa có dữ liệu", () => {
    expect(describeBrier(null)).toBe("Chưa chấm dự đoán nào");
  });

  it("0.25 được gọi đúng tên là ngang với luôn nói 50%", () => {
    expect(describeBrier(0.25)).toContain("50%");
  });

  it("tệ hơn 0.25 thì cảnh báo quá tự tin", () => {
    expect(describeBrier(0.4)).toContain("quá tự tin");
  });

  it("điểm thấp thì khen", () => {
    expect(describeBrier(0.05)).toBe("Rất tốt");
  });
});

describe("compareToFifty", () => {
  it("thấp hơn 0.25 là tốt hơn", () => {
    expect(compareToFifty(0.194)).toBe("Tốt hơn mức luôn đoán 50% (0.25)");
  });
  it("cao hơn 0.25 là kém hơn", () => {
    expect(compareToFifty(0.31)).toBe("Kém hơn mức luôn đoán 50% (0.25)");
  });
  it("đúng 0.25 là ngang, kể cả khi có sai số dấu phẩy động", () => {
    expect(compareToFifty(0.25)).toBe("Ngang mức luôn đoán 50% (0.25)");
    expect(compareToFifty(0.1 + 0.15)).toBe("Ngang mức luôn đoán 50% (0.25)");
  });
  it("chưa có dữ liệu", () => {
    expect(compareToFifty(null)).toBe("Chưa chấm dự đoán nào");
  });
});

describe("fiftyVerdict — một phán định cho cả chữ lẫn màu", () => {
  it("so sánh đúng bằng độ chính xác hiển thị (3 chữ số)", () => {
    // 0.2499999 hiện ra là "0.250" -> phải là ngang, không được gọi là tốt hơn.
    expect(fiftyVerdict(0.2499999)).toBe("equal");
    expect(fiftyVerdict(0.2504)).toBe("equal");
    expect(fiftyVerdict(0.249)).toBe("better");
    expect(fiftyVerdict(0.251)).toBe("worse");
  });
  it("câu chữ luôn khớp phán định", () => {
    expect(compareToFifty(0.2499999)).toBe("Ngang mức luôn đoán 50% (0.25)");
  });
  it("null khi chưa có dữ liệu", () => {
    expect(fiftyVerdict(null)).toBeNull();
  });
});

describe("describeBrier khớp với phần tóm tắt", () => {
  it("0.2499999 (hiện là 0.250) được gọi là ngang, không phải khá", () => {
    expect(describeBrier(0.2499999)).toBe("Ngang với việc luôn nói 50%");
  });
  it("các dải vẫn đúng", () => {
    expect(describeBrier(0.2)).toBe("Khá — tốt hơn việc luôn nói 50%");
    expect(describeBrier(0.12)).toBe("Tốt");
  });
});
