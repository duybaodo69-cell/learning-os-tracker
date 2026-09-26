/** Test đọc header Range — thiếu nó iPhone không phát video nền. */
import { describe, expect, it } from "vitest";
import { parseRange } from "./range.js";

describe("parseRange", () => {
  it("không có Range -> trả cả file", () => {
    expect(parseRange(null, 1000)).toBeNull();
  });
  it("đoạn đầu mà Safari luôn xin trước: bytes=0-1", () => {
    expect(parseRange("bytes=0-1", 1000)).toEqual({ start: 0, end: 1 });
  });
  it("từ một byte tới hết file", () => {
    expect(parseRange("bytes=500-", 1000)).toEqual({ start: 500, end: 999 });
  });
  it("xin quá cuối file thì cắt ở byte cuối", () => {
    expect(parseRange("bytes=900-5000", 1000)).toEqual({ start: 900, end: 999 });
  });
  it("N byte cuối", () => {
    expect(parseRange("bytes=-100", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange("bytes=-5000", 1000)).toEqual({ start: 0, end: 999 });
  });
  it("bắt đầu ngoài file -> 416", () => {
    expect(parseRange("bytes=1000-", 1000)).toBe("unsatisfiable");
    expect(parseRange("bytes=5-2", 1000)).toBe("unsatisfiable");
    expect(parseRange("bytes=-0", 1000)).toBe("unsatisfiable");
  });
  it("nhiều đoạn hoặc sai cú pháp -> trả cả file (hợp lệ theo chuẩn)", () => {
    expect(parseRange("bytes=0-1,5-9", 1000)).toBeNull();
    expect(parseRange("items=0-1", 1000)).toBeNull();
    expect(parseRange("bytes=-", 1000)).toBeNull();
  });
});
