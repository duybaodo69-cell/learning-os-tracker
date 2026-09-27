/**
 * Test cho phần đọc file sao lưu.
 *
 * Chỉ test `parseBackup` và `daysSinceLastExport` — hai hàm thuần.
 * Phần ghi vào database cần trình duyệt thật nên được kiểm tra bằng tay.
 *
 * Vì sao quan trọng: nhập file là thao tác GHI ĐÈ. Nếu hàm này nhận nhầm
 * một file rác thì toàn bộ dữ liệu bị xoá và thay bằng rác.
 */
import { describe, expect, it } from "vitest";
import { BACKUP_FORMAT_VERSION, TABLE_NAMES, backupFileName, normaliseBackupData, parseBackup } from "./backup";

/* Một bản ghi hợp lệ cho mỗi bảng — giống hệt thứ app tự xuất ra. */
const CHECKIN = { id: "#2026-09-25", date: "2026-09-25", bedTime: "23:30", wakeTime: "06:30", sleepHours: 7, energy: 3 };
const BLOCK = {
  id: "1", date: "2026-09-25", startTime: "08:00", minutes: 50, area: "IELTS",
  focusRating: 4, distractions: 1, phoneAway: true,
};
const CARD = {
  id: "c1", front: "Q", back: "A", area: "EFM", createdAt: "2026-09-20", dueDate: "2026-09-25",
  intervalDays: 1, ease: 2.5, reps: 1, lapses: 0,
};
const PREDICTION = {
  id: "p1", statement: "S", probability: 70, category: "Study", createdAt: "2026-09-20",
  resolveBy: "2026-10-01", outcome: null,
};
const REVIEW = { id: "#2026-09-21", weekStart: "2026-09-21", learnedWithoutNotes: "a", dataInsight: "b", oneChange: "c" };

function fileWith(data: Record<string, unknown>) {
  return JSON.stringify({ app: "learning-os-tracker", formatVersion: 1, exportedAt: "2026-09-25T10:00:00.000Z", data });
}

function validFile(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    app: "learning-os-tracker",
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: "2026-09-25T10:00:00.000Z",
    data: {
      checkins: [CHECKIN],
      focusBlocks: [BLOCK, { ...BLOCK, id: "2" }],
      brainDumps: [],
      cards: [],
      reviewLogs: [],
      predictions: [],
      weeklyReviews: [],
      experiments: [],
      experimentTags: [],
    },
    ...overrides,
  });
}

describe("parseBackup — file hợp lệ", () => {
  it("đọc được và đếm đúng số bản ghi", () => {
    const { counts } = parseBackup(validFile());
    expect(counts.checkins).toBe(1);
    expect(counts.focusBlocks).toBe(2);
    expect(counts.cards).toBe(0);
  });

  it("luôn đếm đủ mọi bảng", () => {
    const { counts } = parseBackup(validFile());
    for (const name of TABLE_NAMES) {
      expect(counts[name]).toBeGreaterThanOrEqual(0);
    }
  });

  it("file cũ thiếu bảng mới vẫn nhập được, bảng đó coi như rỗng", () => {
    const old = JSON.stringify({
      app: "learning-os-tracker",
      formatVersion: 1,
      exportedAt: "2026-09-25T10:00:00.000Z",
      data: { checkins: [{ ...CHECKIN, id: undefined }] }, // chỉ có 1 bảng, check-in chưa có id
    });
    const { counts } = parseBackup(old);
    expect(counts.checkins).toBe(1);
    expect(counts.experiments).toBe(0);
    expect(counts.predictions).toBe(0);
  });
});

describe("parseBackup — từ chối file không dùng được", () => {
  it("không phải JSON", () => {
    expect(() => parseBackup("đây không phải json")).toThrow("JSON");
  });

  it("JSON nhưng không phải object", () => {
    expect(() => parseBackup('"chuỗi"')).toThrow();
    expect(() => parseBackup("123")).toThrow();
    expect(() => parseBackup("null")).toThrow();
  });

  it("file của app khác", () => {
    expect(() => parseBackup(validFile({ app: "app-khac" }))).toThrow("Learning OS Tracker");
  });

  it("thiếu phần data", () => {
    expect(() => parseBackup(validFile({ data: undefined }))).toThrow("thiếu phần dữ liệu");
  });

  it("file từ phiên bản MỚI HƠN thì từ chối thay vì đoán mò", () => {
    expect(() => parseBackup(validFile({ formatVersion: BACKUP_FORMAT_VERSION + 1 }))).toThrow(
      "mới hơn"
    );
  });

  it("một bảng không phải danh sách", () => {
    const broken = JSON.stringify({
      app: "learning-os-tracker",
      formatVersion: 1,
      exportedAt: "2026-09-25T10:00:00.000Z",
      data: { checkins: { khong: "phai mang" } },
    });
    expect(() => parseBackup(broken)).toThrow("hỏng");
  });

  it("file rỗng", () => {
    expect(() => parseBackup("")).toThrow();
  });

  it("thiếu exportedAt (file bị cắt dở)", () => {
    expect(() => parseBackup(validFile({ exportedAt: undefined }))).toThrow("exportedAt");
  });
});

describe("parseBackup — kiểm tra TỪNG bản ghi (audit F01)", () => {
  it("thẻ thiếu trường bị từ chối, lỗi nêu tên bảng, dòng và trường", () => {
    expect(() => parseBackup(fileWith({ cards: [CARD, { id: "broken" }] }))).toThrow(
      /Thẻ ôn tập, dòng 2: trường "front"/
    );
  });

  it("từng loại lỗi thường gặp đều bị bắt", () => {
    const bad: [string, unknown][] = [
      ["checkins", { ...CHECKIN, date: "2026-02-30" }], // ngày không có thật
      ["checkins", { ...CHECKIN, energy: 7 }],
      ["focusBlocks", { ...BLOCK, area: "Không có" }],
      ["focusBlocks", { ...BLOCK, minutes: "50" }], // sai kiểu
      ["cards", { ...CARD, back: undefined }],
      ["predictions", { ...PREDICTION, outcome: "yes" }],
      ["predictions", { ...PREDICTION, category: "Khác" }],
      ["reviewLogs", { id: "l", cardId: "c1", date: "2026-09-25", grade: "perfect", intervalBefore: 0 }],
      ["weeklyReviews", { ...REVIEW, oneChange: 5 }],
      ["experimentTags", { key: "k", date: "2026-09-25", experimentId: "e", condition: "C" }],
      ["cards", null],
      ["cards", [1, 2]],
      // IELTS (Đợt 1)
      ["focusBlocks", { ...BLOCK, ielts: { skill: "Grammar" } }],
      ["focusBlocks", { ...BLOCK, ielts: { skill: "Listening", test: { book: 10, test: 1, parts: [1], questions: 10, correct: 7, errors: [3] } } }],
      ["mockTests", { id: "m", date: "2026-10-03", source: "online" }],
      ["mockTests", { id: "m", date: "2026-10-03", source: "home", listeningRaw: 41 }],
      ["mockTests", { id: "m", date: "2026-10-03", source: "home", writingBand: 6.3 }],
    ];
    for (const [table, row] of bad) {
      expect(() => parseBackup(fileWith({ [table]: [row] })), `${table} ${JSON.stringify(row)}`).toThrow("hỏng");
    }
  });

  it("hai dòng trùng khoá bị từ chối", () => {
    expect(() => parseBackup(fileWith({ cards: [CARD, CARD] }))).toThrow("trùng khoá");
    expect(() => parseBackup(fileWith({ checkins: [CHECKIN, { ...CHECKIN, id: "#x" }] }))).toThrow("trùng khoá");
  });

  it("nhiều lỗi: chỉ liệt kê 3, còn lại đếm", () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ id: `b${i}` }));
    expect(() => parseBackup(fileWith({ cards: rows }))).toThrow("và 2 lỗi khác");
  });

  it("trường tuỳ chọn được phép vắng hoặc có mặt", () => {
    const ok = fileWith({
      focusBlocks: [{ ...BLOCK, resumeNote: "tiếp", capturedNotes: ["a", "b"] }],
      cards: [{ ...CARD, brainDumpId: "d1" }],
      predictions: [{ ...PREDICTION, outcome: true, resolvedAt: "2026-09-26", note: "n", preMortem: "p" }],
      weeklyReviews: [{ ...REVIEW, lastChangeResult: "partly" }],
    });
    expect(parseBackup(ok).counts.focusBlocks).toBe(1);
  });

  it("vẫn nhận giá trị mà form bản cũ có thể đã lưu (để file cũ luôn khôi phục được)", () => {
    const old = fileWith({
      checkins: [{ ...CHECKIN, bedTime: "", sleepHours: null }], // NaN thành null trong JSON
      focusBlocks: [{ ...BLOCK, minutes: 10000 }],
      predictions: [{ ...PREDICTION, resolveBy: "" }],
    });
    expect(parseBackup(old).counts.checkins).toBe(1);
  });
});

describe("backupFileName", () => {
  it("dữ liệu thật: tên bình thường", () => {
    expect(backupFileName("2026-09-26", false)).toBe("learning-os-2026-09-26.json");
  });

  it("chế độ demo: có chữ DEMO trong tên", () => {
    expect(backupFileName("2026-09-26", true)).toBe("learning-os-DEMO-2026-09-26.json");
  });

  it("hai tên không bao giờ trùng nhau trong cùng một ngày", () => {
    // Nếu trùng, mở thư mục ra sẽ không phân biệt nổi file nào là thật.
    expect(backupFileName("2026-09-26", true)).not.toBe(backupFileName("2026-09-26", false));
  });

  it("luôn là đuôi .json", () => {
    for (const demo of [true, false]) {
      expect(backupFileName("2026-01-01", demo).endsWith(".json")).toBe(true);
    }
  });
});

describe("normaliseBackupData — file cũ và dữ liệu từ Dexie Cloud", () => {
  it("file xuất trước version 6 (check-in chưa có id) được điền id = #ngày", () => {
    const d = normaliseBackupData({
      checkins: [{ date: "2026-09-25", bedTime: "23:00", wakeTime: "06:00", sleepHours: 7, energy: 3 } as never],
      weeklyReviews: [{ weekStart: "2026-09-21", learnedWithoutNotes: "", dataInsight: "", oneChange: "" } as never],
    });
    expect(d.checkins[0].id).toBe("#2026-09-25");
    expect(d.weeklyReviews[0].id).toBe("#2026-09-21");
  });

  it("id luôn đi theo ngày, kể cả khi file ghi id sai", () => {
    const d = normaliseBackupData({
      checkins: [{ id: "lung-tung", date: "2026-09-25" } as never],
    });
    expect(d.checkins[0].id).toBe("#2026-09-25");
  });

  it("bỏ các trường nội bộ của Dexie Cloud, giữ nguyên phần còn lại", () => {
    const d = normaliseBackupData({
      focusBlocks: [{ id: "b1", minutes: 50, owner: "x@y.z", realmId: "rlm-1", $ts: 5 } as never],
    });
    expect(d.focusBlocks[0]).toEqual({ id: "b1", minutes: 50 });
  });

  it("bảng thiếu thành danh sách rỗng", () => {
    const d = normaliseBackupData({});
    for (const name of TABLE_NAMES) expect(d[name]).toEqual([]);
  });
});

describe("IELTS (Đợt 1) trong file sao lưu", () => {
  const IELTS_BLOCK = {
    ...BLOCK,
    ielts: { skill: "Listening", test: { book: 10, test: 1, parts: [1, 2], questions: 20, correct: 14, errors: [3, 1, 2, 0] }, dictationMinutes: 10 },
  };
  const MOCK = { id: "m1", date: "2026-10-03", source: "home", listeningRaw: 22, readingRaw: 30, writingBand: 6, speakingBand: 6 };

  it("nhận block có phần IELTS và bảng thi thử", () => {
    const { counts } = parseBackup(fileWith({ focusBlocks: [IELTS_BLOCK, { ...BLOCK, id: "2" }], mockTests: [MOCK] }));
    expect(counts.focusBlocks).toBe(2);
    expect(counts.mockTests).toBe(1);
  });

  it("thi thử chỉ có một kỹ năng vẫn hợp lệ", () => {
    expect(() => parseBackup(fileWith({ mockTests: [{ id: "m2", date: "2026-10-03", source: "ai", writingBand: 6.5 }] }))).not.toThrow();
  });

  it("file cũ (trước Đợt 1) không có mockTests: nhập được, bảng rỗng", () => {
    const { counts } = parseBackup(fileWith({ focusBlocks: [BLOCK] }));
    expect(counts.mockTests).toBe(0);
    expect(normaliseBackupData({}).mockTests).toEqual([]);
  });

  it("thi thử trùng id bị từ chối", () => {
    expect(() => parseBackup(fileWith({ mockTests: [MOCK, MOCK] }))).toThrow("trùng khoá");
  });

  it("làm sạch trường Dexie Cloud trên bản ghi thi thử", () => {
    const d = normaliseBackupData({ mockTests: [{ ...MOCK, owner: "u", realmId: "r", $ts: 1 } as never] });
    expect(d.mockTests[0]).toEqual(MOCK);
  });
});
