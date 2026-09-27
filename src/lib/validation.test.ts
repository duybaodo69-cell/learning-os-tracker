/**
 * Test cho lớp kiểm tra dữ liệu dùng chung (form + file sao lưu).
 * Audit 27/09/2026 (F05) đã lưu được block 10.000 phút, giờ ngủ NaN và
 * dự đoán không có hạn chấm — các test dưới đây giữ cho chuyện đó không lặp lại.
 */
import { describe, expect, it } from "vitest";
import { MAX_BLOCK_MINUTES, checkBlockMinutes, checkDate, checkTime, isIntIn, isNumberIn, isValidDate, isValidTime } from "./validation";

describe("isValidDate", () => {
  it("nhận ngày có thật, kể cả 29/02 năm nhuận", () => {
    expect(isValidDate("2026-09-27")).toBe(true);
    expect(isValidDate("2028-02-29")).toBe(true);
  });

  it("từ chối ngày không có thật, sai định dạng, rỗng, không phải chuỗi", () => {
    for (const bad of ["2026-02-29", "2026-02-30", "2026-13-01", "2026-00-10", "2026-9-27", "27/09/2026", "", null, undefined, 20260927]) {
      expect(isValidDate(bad), String(bad)).toBe(false);
    }
  });
});

describe("isValidTime", () => {
  it("00:00 đến 23:59", () => {
    expect(isValidTime("00:00")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
  });

  it("từ chối giờ trống, 24:00, phút 60, định dạng lạ", () => {
    for (const bad of ["", "24:00", "12:60", "7:30", "07:30:00", null]) {
      expect(isValidTime(bad), String(bad)).toBe(false);
    }
  });
});

describe("isNumberIn / isIntIn", () => {
  it("NaN và Infinity không bao giờ hợp lệ", () => {
    expect(isNumberIn(NaN, 0, 10)).toBe(false);
    expect(isNumberIn(Infinity, 0, Infinity)).toBe(false);
    expect(isNumberIn("5", 0, 10)).toBe(false);
  });

  it("biên được tính", () => {
    expect(isIntIn(1, 1, 5)).toBe(true);
    expect(isIntIn(5, 1, 5)).toBe(true);
    expect(isIntIn(2.5, 1, 5)).toBe(false);
  });
});

describe("thông báo lỗi của form", () => {
  it("số phút block: 1..600, số nguyên", () => {
    expect(checkBlockMinutes(1)).toBeNull();
    expect(checkBlockMinutes(MAX_BLOCK_MINUTES)).toBeNull();
    for (const bad of [0, 601, 10000, 2.5, NaN]) expect(checkBlockMinutes(bad), String(bad)).not.toBeNull();
  });

  it("giờ và ngày trống thì có câu lỗi nêu đúng tên ô", () => {
    expect(checkTime("", "Giờ đi ngủ")).toContain("Giờ đi ngủ");
    expect(checkTime("22:15", "Giờ đi ngủ")).toBeNull();
    expect(checkDate("", "Hạn chấm")).toContain("Hạn chấm");
    expect(checkDate("2026-10-01", "Hạn chấm")).toBeNull();
  });
});
