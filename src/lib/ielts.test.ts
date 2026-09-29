import { describe, expect, it } from "vitest";
import type { FocusBlock, IeltsSession } from "../db/types";
import {
  dayIelts,
  anchorWeek,
  checkMockTest,
  defaultQuestions,
  draftError,
  errorSummary,
  draftFromSession,
  draftToSession,
  formatTestRef,
  holdsAnchor,
  isValidIeltsSession,
  mockBands,
  newDraft,
  nextTest,
  overallBand,
  positionAfter,
  practiceBand,
  rawToBand,
  sessionSummary,
  toggleDraftPart,
} from "./ielts";

/** Block IELTS tối thiểu cho test. */
function block(over: Partial<FocusBlock> = {}): FocusBlock {
  return {
    id: Math.random().toString(36),
    date: "2026-09-29",
    startTime: "09:30",
    minutes: 60,
    area: "IELTS",
    focusRating: 4,
    distractions: 0,
    phoneAway: true,
    ...over,
  };
}

function withTest(
  skill: "Listening" | "Reading",
  book: number,
  test: number,
  parts: number[],
  over: Partial<FocusBlock> = {}
): FocusBlock {
  const questions = defaultQuestions(skill, parts);
  return block({
    ielts: { skill, test: { book, test, parts, questions, correct: questions, errors: [0, 0, 0, 0] } },
    ...over,
  });
}

/* ==================== Quy đổi band ==================== */

describe("rawToBand — Listening, mọi mốc biên của bảng PRODUCT.md mục 3", () => {
  const cases: [number, number | null][] = [
    [40, 9], [39, 9], [38, 8.5], [37, 8.5], [36, 8], [35, 8], [34, 7.5], [32, 7.5], [31, 7], [30, 7],
    [29, 6.5], [26, 6.5], [25, 6], [23, 6], [22, 5.5], [18, 5.5], [17, 5], [16, 5], [15, 4.5], [13, 4.5],
    [12, 4], [10, 4], [9, null], [0, null],
  ];
  it.each(cases)("%i/40 -> %s", (raw, band) => {
    expect(rawToBand("Listening", raw)).toBe(band);
  });
});

describe("rawToBand — Reading Academic, mọi mốc biên", () => {
  const cases: [number, number | null][] = [
    [40, 9], [39, 9], [38, 8.5], [37, 8.5], [36, 8], [35, 8], [34, 7.5], [33, 7.5], [32, 7], [30, 7],
    [29, 6.5], [27, 6.5], [26, 6], [23, 6], [22, 5.5], [19, 5.5], [18, 5], [15, 5], [14, 4.5], [13, 4.5],
    [12, 4], [10, 4], [9, null],
  ];
  it.each(cases)("%i/40 -> %s", (raw, band) => {
    expect(rawToBand("Reading", raw)).toBe(band);
  });
});

describe("rawToBand — đầu vào hỏng", () => {
  it("không nhận số lẻ, âm, quá 40, NaN", () => {
    for (const raw of [30.5, -1, 41, Number.NaN]) expect(rawToBand("Listening", raw)).toBeNull();
  });
  it("Listening và Reading khác nhau ở cùng điểm thô (32)", () => {
    expect(rawToBand("Listening", 32)).toBe(7.5);
    expect(rawToBand("Reading", 32)).toBe(7);
  });
});

describe("practiceBand — chỉ quy đổi khi làm đủ 40 câu", () => {
  it("1 section 10 câu: không có band", () => {
    expect(practiceBand("Listening", { book: 10, test: 1, parts: [1], questions: 10, correct: 9, errors: [1, 0, 0, 0] })).toBeNull();
  });
  it("đủ 40 câu: có band", () => {
    expect(
      practiceBand("Listening", { book: 10, test: 1, parts: [1, 2, 3, 4], questions: 40, correct: 30, errors: [5, 5, 0, 0] })
    ).toBe(7);
  });
});

describe("overallBand — làm tròn tới 0.5 gần nhất, .25 lên .5, .75 lên số tròn", () => {
  const cases: [number[], number][] = [
    [[6, 6, 6, 6], 6],
    [[6.5, 6, 6, 6], 6], // 6.125 -> 6.0
    [[6.5, 6.5, 6, 6], 6.5], // 6.25 -> 6.5
    [[6.5, 6.5, 6.5, 6], 6.5], // 6.375 -> 6.5
    [[6.5, 6.5, 6.5, 6.5], 6.5],
    [[7, 6.5, 6.5, 6.5], 6.5], // 6.625 -> 6.5
    [[7, 7, 6.5, 6.5], 7], // 6.75 -> 7.0
    [[7, 7, 7, 6.5], 7], // 6.875 -> 7.0
    [[8, 7.5, 7, 7], 7.5], // 7.375 -> 7.5 (ví dụ đích trong PRODUCT.md)
  ];
  it.each(cases)("%j -> %s", (bands, expected) => {
    const [l, r, w, s] = bands;
    expect(overallBand(l, r, w, s)).toBe(expected);
  });
  it("hiện trạng R 7.0 · L 5.5 · W 6.0 · S 6.0 = 6.125 -> 6.0 (khớp PRODUCT.md)", () => {
    expect(overallBand(5.5, 7, 6, 6)).toBe(6);
  });
});

describe("mockBands", () => {
  it("đủ 4 kỹ năng: có overall", () => {
    const b = mockBands({ id: "m", date: "2026-10-03", source: "home", listeningRaw: 23, readingRaw: 30, writingBand: 6, speakingBand: 6 });
    expect(b).toEqual({ listening: 6, reading: 7, writing: 6, speaking: 6, overall: 6.5 });
  });
  it("thiếu một kỹ năng: không có overall", () => {
    const b = mockBands({ id: "m", date: "2026-10-03", source: "ai", writingBand: 6.5 });
    expect(b.overall).toBeNull();
    expect(b.writing).toBe(6.5);
  });
  it("L dưới 10 câu: band null, overall null", () => {
    expect(mockBands({ id: "m", date: "2026-10-03", source: "home", listeningRaw: 8, readingRaw: 30, writingBand: 6, speakingBand: 6 }).overall).toBeNull();
  });
});

describe("checkMockTest", () => {
  it("rỗng: báo lỗi", () => {
    expect(checkMockTest({ date: "2026-10-03", source: "home" })).toMatch(/ít nhất/);
  });
  it("điểm thô ngoài 0-40 hoặc lẻ: báo lỗi", () => {
    expect(checkMockTest({ date: "2026-10-03", source: "home", listeningRaw: 41 })).toMatch(/Listening/);
    expect(checkMockTest({ date: "2026-10-03", source: "home", readingRaw: 20.5 })).toMatch(/Reading/);
  });
  it("band không phải bước 0.5: báo lỗi", () => {
    expect(checkMockTest({ date: "2026-10-03", source: "ai", writingBand: 6.3 })).toMatch(/Writing/);
  });
  it("hợp lệ", () => {
    expect(checkMockTest({ date: "2026-10-03", source: "home", listeningRaw: 0, speakingBand: 6 })).toBeNull();
  });
});

/* ==================== Đề tiếp theo ==================== */

describe("positionAfter", () => {
  it("Listening S1 -> S2, S4 -> test sau, T4 S4 -> sách sau", () => {
    expect(positionAfter("Listening", { book: 10, test: 1, part: 1 })).toEqual({ book: 10, test: 1, part: 2 });
    expect(positionAfter("Listening", { book: 10, test: 1, part: 4 })).toEqual({ book: 10, test: 2, part: 1 });
    expect(positionAfter("Listening", { book: 10, test: 4, part: 4 })).toEqual({ book: 11, test: 1, part: 1 });
  });
  it("Reading chỉ có 3 passage: P3 -> test sau", () => {
    expect(positionAfter("Reading", { book: 12, test: 2, part: 3 })).toEqual({ book: 12, test: 3, part: 1 });
  });
  it("Cam 14 hết thì sang Cam 15; sau Cam 19 thì hết đề", () => {
    expect(positionAfter("Listening", { book: 14, test: 4, part: 4 })).toEqual({ book: 15, test: 1, part: 1 });
    expect(positionAfter("Listening", { book: 19, test: 4, part: 4 })).toBeNull();
    expect(positionAfter("Reading", { book: 19, test: 4, part: 3 })).toBeNull();
  });
});

describe("nextTest", () => {
  it("chưa ghi gì: Cam 10 · Test 1 · phần 1", () => {
    expect(nextTest([], "Listening")).toEqual({ book: 10, test: 1, part: 1 });
  });
  it("làm S1+S2: tiếp theo là S3", () => {
    expect(nextTest([withTest("Listening", 10, 1, [1, 2])], "Listening")).toEqual({ book: 10, test: 1, part: 3 });
  });
  it("lấy phiên GẦN NHẤT (ngày rồi giờ), không phải đề xa nhất", () => {
    const blocks = [
      withTest("Listening", 11, 2, [4], { date: "2026-09-29", startTime: "09:30" }),
      withTest("Listening", 10, 3, [1], { date: "2026-09-30", startTime: "09:30" }),
    ];
    expect(nextTest(blocks, "Listening")).toEqual({ book: 10, test: 3, part: 2 });
  });
  it("cùng ngày: phiên bắt đầu muộn hơn thắng", () => {
    const blocks = [
      withTest("Listening", 10, 1, [3], { startTime: "14:00" }),
      withTest("Listening", 10, 1, [1], { startTime: "09:30" }),
    ];
    expect(nextTest(blocks, "Listening")).toEqual({ book: 10, test: 1, part: 4 });
  });
  it("tính RIÊNG từng kỹ năng", () => {
    const blocks = [withTest("Listening", 10, 2, [1]), withTest("Reading", 10, 1, [1, 2])];
    expect(nextTest(blocks, "Listening")).toEqual({ book: 10, test: 2, part: 2 });
    expect(nextTest(blocks, "Reading")).toEqual({ book: 10, test: 1, part: 3 });
  });
  it("bỏ qua phiên không làm đề, phiên Writing và area khác", () => {
    const blocks = [
      withTest("Listening", 10, 1, [2], { date: "2026-09-28" }),
      block({ date: "2026-09-29", ielts: { skill: "Listening" } }),
      block({ date: "2026-09-30", ielts: { skill: "Writing", aiBand: 6 } }),
      withTest("Listening", 13, 1, [1], { date: "2026-10-01", area: "Other" }),
    ];
    expect(nextTest(blocks, "Listening")).toEqual({ book: 10, test: 1, part: 3 });
  });
});

describe("formatTestRef", () => {
  it("S cho Listening, P cho Reading", () => {
    expect(formatTestRef("Listening", { book: 10, test: 1, parts: [1, 2] })).toBe("Cam 10 · Test 1 · S1+S2");
    expect(formatTestRef("Reading", { book: 12, test: 3, parts: [3] })).toBe("Cam 12 · Test 3 · P3");
  });
});

/* ==================== Khung 9:30 ==================== */

describe("holdsAnchor — IELTS, bắt đầu 9:00–10:30 (tính cả hai đầu), >= 45 phút", () => {
  const cases: [string, number, boolean][] = [
    ["08:59", 60, false],
    ["09:00", 60, true],
    ["09:30", 45, true],
    ["09:30", 44, false],
    ["10:30", 45, true],
    ["10:31", 90, false],
    ["00:00", 600, false],
  ];
  it.each(cases)("bắt đầu %s, %i phút -> %s", (startTime, minutes, expected) => {
    expect(holdsAnchor(block({ startTime, minutes }))).toBe(expected);
  });
  it("area khác IELTS không tính", () => {
    expect(holdsAnchor(block({ area: "EFM" }))).toBe(false);
  });
});

describe("anchorWeek", () => {
  // 2026-09-28 là Thứ Hai, 2026-10-04 là Chủ Nhật.
  it("7 ngày từ Thứ Hai, đếm ngày chứ không đếm phiên", () => {
    const blocks = [
      block({ date: "2026-09-28" }),
      block({ date: "2026-09-28", startTime: "10:00" }), // cùng ngày: vẫn 1
      block({ date: "2026-09-30", startTime: "11:00" }), // ngoài khung
      block({ date: "2026-10-04" }), // Chủ Nhật thuộc tuần này
      block({ date: "2026-09-27" }), // Chủ Nhật tuần trước
    ];
    const week = anchorWeek(blocks, "2026-10-01");
    expect(week.map((d) => d.date)).toEqual([
      "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04",
    ]);
    expect(week.filter((d) => d.held).map((d) => d.date)).toEqual(["2026-09-28", "2026-10-04"]);
  });
  it("hôm nay là Chủ Nhật: vẫn là tuần bắt đầu từ Thứ Hai trước đó", () => {
    expect(anchorWeek([], "2026-10-04")[0].date).toBe("2026-09-28");
  });
});

/* ==================== Form ==================== */

describe("newDraft", () => {
  it("Listening: điền sẵn đề tiếp theo, chọn 1 section, 10 câu", () => {
    const d = newDraft("Listening", [withTest("Listening", 10, 1, [1])]);
    expect(d).toMatchObject({ book: 10, test: 1, parts: [2], questions: 10, correct: null });
  });
  it("Reading passage 3 mặc định 14 câu", () => {
    const d = newDraft("Reading", [withTest("Reading", 10, 1, [1, 2])]);
    expect(d).toMatchObject({ parts: [3], questions: 14 });
  });
  it("hết đề: không chọn phần nào", () => {
    const d = newDraft("Listening", [withTest("Listening", 19, 4, [4])]);
    expect(d.parts).toEqual([]);
  });
});

describe("toggleDraftPart", () => {
  it("thêm P2 vào P1 -> 26 câu; bỏ P1 -> 13", () => {
    const d = { ...newDraft("Reading", []), parts: [1], questions: 13 };
    const two = toggleDraftPart(d, 2);
    expect(two).toMatchObject({ parts: [1, 2], questions: 26 });
    expect(toggleDraftPart(two, 1)).toMatchObject({ parts: [2], questions: 13 });
  });
  it("giữ thứ tự tăng dần", () => {
    const d = { ...newDraft("Listening", []), parts: [3], questions: 10 };
    expect(toggleDraftPart(d, 1).parts).toEqual([1, 3]);
  });
});

describe("draftError — tổng lỗi phải khớp số câu sai", () => {
  const base = { ...newDraft("Listening", []), correct: 7 }; // 10 câu, sai 3
  it("chưa phân loại đủ: chặn", () => {
    expect(draftError({ ...base, errors: [1, 1, 0, 0] })).toMatch(/2\/3/);
  });
  it("phân loại thừa: chặn", () => {
    expect(draftError({ ...base, errors: [2, 2, 0, 0] })).toMatch(/4\/3/);
  });
  it("khớp: lưu được", () => {
    expect(draftError({ ...base, errors: [1, 1, 1, 0] })).toBeNull();
  });
  it("đúng hết: 0 lỗi là khớp", () => {
    expect(draftError({ ...base, correct: 10 })).toBeNull();
  });
  it("chưa nhập số đúng / đúng nhiều hơn số câu: chặn", () => {
    expect(draftError({ ...base, correct: null })).toMatch(/Nhập số câu đúng/);
    expect(draftError({ ...base, correct: 11 })).toMatch(/từ 0 đến 10/);
  });
  it("không chọn phần nào: chặn, gợi ý nút Không làm đề", () => {
    expect(draftError({ ...base, parts: [] })).toMatch(/Không làm đề/);
  });
  it("không làm đề: lưu được, không cần điểm", () => {
    expect(draftError({ ...base, correct: null, noTest: true })).toBeNull();
  });
  it("Writing: band AI tuỳ chọn", () => {
    const w = newDraft("Writing", []);
    expect(draftError(w)).toBeNull();
    expect(draftError({ ...w, aiBand: 6.5 })).toBeNull();
    expect(draftError({ ...w, aiBand: 9.5 })).not.toBeNull();
  });
});

describe("draftToSession / draftFromSession", () => {
  it("Listening có đề: lưu đề, điểm, lỗi, chép chính tả", () => {
    const d = { ...newDraft("Listening", []), correct: 8, errors: [1, 1, 0, 0] as [number, number, number, number], dictationMinutes: 10 };
    expect(draftToSession(d)).toEqual({
      skill: "Listening",
      test: { book: 10, test: 1, parts: [1], questions: 10, correct: 8, errors: [1, 1, 0, 0] },
      dictationMinutes: 10,
    });
  });
  it("Reading không lưu phút chép chính tả", () => {
    const d = { ...newDraft("Reading", []), correct: 13, dictationMinutes: 10 };
    expect(draftToSession(d).dictationMinutes).toBeUndefined();
  });
  it("không làm đề: chỉ còn kỹ năng (+ chép chính tả)", () => {
    const d = { ...newDraft("Listening", []), noTest: true, dictationMinutes: 15 };
    expect(draftToSession(d)).toEqual({ skill: "Listening", dictationMinutes: 15 });
  });
  it("Speaking không chấm: chỉ kỹ năng", () => {
    expect(draftToSession(newDraft("Speaking", []))).toEqual({ skill: "Speaking" });
  });
  it("mở lại để sửa rồi lưu: không đổi gì", () => {
    const s: IeltsSession = {
      skill: "Reading",
      test: { book: 11, test: 2, parts: [1, 2], questions: 27, correct: 20, errors: [2, 3, 1, 1] },
    };
    expect(draftToSession(draftFromSession(s))).toEqual(s);
    expect(draftFromSession({ skill: "Listening" }).noTest).toBe(true);
  });
});

describe("sessionSummary", () => {
  it("đủ 40 câu có band ≈", () => {
    expect(
      sessionSummary({ skill: "Listening", test: { book: 10, test: 1, parts: [1, 2, 3, 4], questions: 40, correct: 26, errors: [6, 4, 3, 1] } })
    ).toBe("Listening · Cam 10 · Test 1 · S1+S2+S3+S4 · 26/40 · ≈ 6.5");
  });
  it("không làm đề", () => {
    expect(sessionSummary({ skill: "Listening", dictationMinutes: 10 })).toBe("Listening · không làm đề · chép 10p");
  });
});

describe("isValidIeltsSession (file sao lưu)", () => {
  it("nhận phiên hợp lệ", () => {
    expect(isValidIeltsSession({ skill: "Writing" })).toBe(true);
    expect(
      isValidIeltsSession({ skill: "Listening", test: { book: 10, test: 1, parts: [1], questions: 10, correct: 7, errors: [1, 1, 1, 0] } })
    ).toBe(true);
  });
  it("từ chối sai hình", () => {
    expect(isValidIeltsSession(null)).toBe(false);
    expect(isValidIeltsSession({ skill: "Grammar" })).toBe(false);
    expect(isValidIeltsSession({ skill: "Listening", test: { book: 10, test: 1, parts: [1], questions: 10, correct: 7, errors: [1, 1] } })).toBe(false);
    expect(isValidIeltsSession({ skill: "Writing", aiBand: 6.3 })).toBe(false);
  });
});

describe("errorSummary — tổng lỗi theo loại, Listening và Reading riêng", () => {
  const L = (date: string, errors: [number, number, number, number], correct = 6) =>
    block({ date, ielts: { skill: "Listening", test: { book: 10, test: 1, parts: [1], questions: 10, correct, errors } } });
  const blocks = [
    L("2026-09-01", [1, 1, 1, 1]),
    L("2026-09-10", [2, 1, 1, 0]),
    L("2026-10-07", [3, 0, 1, 0]),
    L("2026-10-08", [0, 0, 0, 0], 10),
    block({ date: "2026-10-01", ielts: { skill: "Reading", test: { book: 10, test: 1, parts: [1], questions: 13, correct: 9, errors: [0, 2, 1, 1] } } }),
    block({ date: "2026-10-02", ielts: { skill: "Listening", dictationMinutes: 10 } }), // không làm đề
    block({ date: "2026-10-03", area: "Other", ielts: { skill: "Listening", test: { book: 10, test: 1, parts: [1], questions: 10, correct: 0, errors: [10, 0, 0, 0] } } }),
  ];
  it("chỉ cộng trong khoảng, tính cả hai đầu", () => {
    expect(errorSummary(blocks, "Listening", "2026-09-10", "2026-10-07")).toEqual({
      sessions: 2,
      questions: 20,
      correct: 12,
      errors: [5, 1, 2, 0],
    });
  });
  it("Reading tách riêng, không lẫn lỗi Listening", () => {
    expect(errorSummary(blocks, "Reading", "2026-09-01", "2026-10-31")).toEqual({
      sessions: 1,
      questions: 13,
      correct: 9,
      errors: [0, 2, 1, 1],
    });
  });
  it("bỏ qua buổi không làm đề và area khác; buổi 10/10 vẫn đếm là 1 buổi", () => {
    const s = errorSummary(blocks, "Listening", "2026-10-01", "2026-10-31");
    expect(s.sessions).toBe(2);
    expect(s.errors).toEqual([3, 0, 1, 0]);
  });
  it("không có gì: 0 buổi, 0 lỗi", () => {
    expect(errorSummary([], "Reading", "2026-01-01", "2026-12-31")).toEqual({ sessions: 0, questions: 0, correct: 0, errors: [0, 0, 0, 0] });
  });
});

describe("dayIelts — vì sao hôm nay chưa có tick", () => {
  const b = (startTime: string, minutes: number, over: Partial<FocusBlock> = {}): FocusBlock => ({
    id: Math.random().toString(),
    date: "2026-09-29",
    startTime,
    minutes,
    area: "IELTS",
    focusRating: 4,
    distractions: 0,
    phoneAway: true,
    ...over,
  });
  it("chưa có phiên: không tick, không lý do", () => {
    expect(dayIelts([], "2026-09-29")).toEqual({ held: false, minutes: 0, floor: false, miss: null });
  });
  it("9:30 · 50 phút: tick", () => {
    expect(dayIelts([b("09:30", 50)], "2026-09-29")).toMatchObject({ held: true, floor: true, miss: null });
  });
  it("14:00 · 50 phút: đạt sàn, chưa tick vì ngoài khung", () => {
    expect(dayIelts([b("14:00", 50)], "2026-09-29")).toMatchObject({
      held: false,
      floor: true,
      miss: { cause: "outside", startTime: "14:00", minutes: 50 },
    });
  });
  it("9:40 · 35 phút: trong khung nhưng thiếu phút — ưu tiên lý do này", () => {
    expect(dayIelts([b("15:00", 60), b("09:40", 35)], "2026-09-29").miss).toEqual({ cause: "short", startTime: "09:40", minutes: 35 });
  });
  it("10:31 là ngoài khung; 10:30 vẫn trong khung", () => {
    expect(dayIelts([b("10:31", 60)], "2026-09-29").miss?.cause).toBe("outside");
    expect(dayIelts([b("10:30", 60)], "2026-09-29").held).toBe(true);
  });
  it("chỉ tính area IELTS và đúng ngày", () => {
    expect(dayIelts([b("09:30", 60, { area: "EFM" }), b("09:30", 60, { date: "2026-09-28" })], "2026-09-29").minutes).toBe(0);
  });
});
