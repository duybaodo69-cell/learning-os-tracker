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

function validFile(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    app: "learning-os-tracker",
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: "2026-09-25T10:00:00.000Z",
    data: {
      checkins: [{ date: "2026-09-25" }],
      focusBlocks: [{ id: "1" }, { id: "2" }],
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
      data: { checkins: [{ date: "2026-09-25" }] }, // chỉ có 1 bảng
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
