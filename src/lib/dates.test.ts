/**
 * Test cho các hàm xử lý ngày giờ.
 */
import { describe, expect, it } from "vitest";
import { computeSleepHours, formatDayLabel, formatMinutes, subtractMinutesFromHHmm } from "./dates";

describe("subtractMinutesFromHHmm", () => {
  it("lùi trong cùng một ngày", () => {
    expect(subtractMinutesFromHHmm("15:00", 45)).toBe("14:15");
    expect(subtractMinutesFromHHmm("09:30", 25)).toBe("09:05");
    expect(subtractMinutesFromHHmm("20:00", 90)).toBe("18:30");
  });

  it("lùi 0 phút giữ nguyên", () => {
    expect(subtractMinutesFromHHmm("15:00", 0)).toBe("15:00");
  });

  it("lùi qua nửa đêm thì vòng lại cuối ngày", () => {
    expect(subtractMinutesFromHHmm("00:10", 30)).toBe("23:40");
    expect(subtractMinutesFromHHmm("00:00", 60)).toBe("23:00");
  });

  it("lùi hơn một ngày vẫn ra giờ hợp lệ", () => {
    expect(subtractMinutesFromHHmm("10:00", 1500)).toBe("09:00"); // 25 tiếng
  });

  it("luôn trả về đúng định dạng HH:mm", () => {
    for (const m of [1, 7, 45, 61, 200, 719, 1439]) {
      expect(subtractMinutesFromHHmm("12:00", m)).toMatch(/^\d{2}:\d{2}$/);
    }
  });
});

describe("computeSleepHours (nhắc lại ở đây cho đủ bộ)", () => {
  it("qua nửa đêm", () => {
    expect(computeSleepHours("23:30", "06:30")).toBe(7);
  });
});

describe("formatMinutes", () => {
  it("dưới 1 tiếng thì hiện phút", () => {
    expect(formatMinutes(45)).toBe("45p");
  });
  it("tròn giờ", () => {
    expect(formatMinutes(120)).toBe("2h");
  });
  it("giờ lẻ phút", () => {
    expect(formatMinutes(205)).toBe("3h25");
  });
});

describe("formatDayLabel — ngày trên tiêu đề", () => {
  it("đúng thứ trong tuần", () => {
    expect(formatDayLabel("2026-09-26")).toBe("Thứ Bảy, 26/09");
    expect(formatDayLabel("2026-09-27")).toBe("Chủ Nhật, 27/09");
    expect(formatDayLabel("2026-09-28")).toBe("Thứ Hai, 28/09");
  });

  it("ngày và tháng một chữ số được thêm số 0", () => {
    expect(formatDayLabel("2026-10-05")).toBe("Thứ Hai, 05/10");
  });

  it("đủ bảy thứ trong một tuần liên tiếp", () => {
    const days = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"];
    expect(days.map((d) => formatDayLabel(d).split(",")[0])).toEqual([
      "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật",
    ]);
  });
});
