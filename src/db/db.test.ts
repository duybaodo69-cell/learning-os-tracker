/**
 * Test việc nâng cấp database lên version 6/7 (đổi khoá chính của check-in
 * và tổng kết tuần).
 *
 * Đây là đoạn code sẽ chạy MỘT LẦN trên kho dữ liệu thật trong điện thoại,
 * nên phải chắc chắn không mất bản ghi nào. fake-indexeddb giả lập IndexedDB
 * ngay trong Node để chạy thử cả quá trình.
 */
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { LearningDB } from "./db";

const NAME = "test-upgrade";

afterEach(async () => {
  await Dexie.delete(NAME);
});

/** Tạo một database y như bản đang chạy trên điện thoại (version 5). */
async function makeVersion5Db() {
  const old = new Dexie(NAME);
  old.version(1).stores({ checkins: "date", focusBlocks: "id, date, area" });
  old.version(2).stores({ brainDumps: "id, date, area", cards: "id, area, dueDate", reviewLogs: "id, cardId, date" });
  old.version(3).stores({ predictions: "id, resolveBy, category" });
  old.version(4).stores({ weeklyReviews: "weekStart", experiments: "id, active", experimentTags: "key, date, experimentId" });
  old.version(5).stores({ focusBlocks: "id, date, area" });
  await old.open();
  await old.table("checkins").bulkAdd([
    { date: "2026-09-25", bedTime: "23:30", wakeTime: "06:30", sleepHours: 7, energy: 4 },
    { date: "2026-09-26", bedTime: "00:10", wakeTime: "07:00", sleepHours: 6.83, energy: 2, note: "mệt" },
  ]);
  await old.table("weeklyReviews").add({
    weekStart: "2026-09-21",
    learnedWithoutNotes: "DCF",
    dataInsight: "ngủ ít",
    oneChange: "ngủ sớm",
  });
  await old.table("focusBlocks").add({ id: "b1", date: "2026-09-26", startTime: "09:00", minutes: 50 });
  old.close();
}

describe("nâng cấp version 5 -> 9", () => {
  it("chép đủ mọi check-in sang bảng mới với khoá #ngày, giữ nguyên nội dung", async () => {
    await makeVersion5Db();
    const db = new LearningDB(NAME);
    const rows = await db.dailyCheckins.orderBy("date").toArray();
    expect(rows).toEqual([
      { id: "#2026-09-25", date: "2026-09-25", bedTime: "23:30", wakeTime: "06:30", sleepHours: 7, energy: 4 },
      { id: "#2026-09-26", date: "2026-09-26", bedTime: "00:10", wakeTime: "07:00", sleepHours: 6.83, energy: 2, note: "mệt" },
    ]);
    expect((await db.dailyCheckins.get("#2026-09-26"))?.note).toBe("mệt");
    db.close();
  });

  it("chép tổng kết tuần sang khoá #thứ-hai", async () => {
    await makeVersion5Db();
    const db = new LearningDB(NAME);
    const r = await db.weekReviews.get("#2026-09-21");
    expect(r?.weekStart).toBe("2026-09-21");
    expect(r?.oneChange).toBe("ngủ sớm");
    db.close();
  });

  it("bỏ hai bảng cũ và không đụng tới các bảng khác", async () => {
    await makeVersion5Db();
    const db = new LearningDB(NAME);
    await db.open();
    const names = db.tables.map((t) => t.name);
    expect(names).not.toContain("checkins");
    expect(names).not.toContain("weeklyReviews");
    expect(await db.focusBlocks.count()).toBe(1);
    expect(db.verno).toBe(9);
    db.close();
  });

  it("máy mới cài (chưa có database) mở thẳng version 9", async () => {
    const db = new LearningDB(NAME);
    await db.dailyCheckins.put({ id: "#2026-09-26", date: "2026-09-26", bedTime: "23:00", wakeTime: "06:00", sleepHours: 7, energy: 3 });
    expect(await db.dailyCheckins.count()).toBe(1);
    db.close();
  });
});

/**
 * Version 8 (IELTS Đợt 1): thêm bảng mockTests + trường FocusBlock.ielts.
 * Máy của chủ app đang ở version 7 — nâng lên KHÔNG được mất block nào,
 * và block cũ (không có `ielts`) vẫn đọc được như cũ.
 */
describe("nâng cấp version 7 -> 9", () => {
  async function makeVersion7Db() {
    const old = new Dexie(NAME);
    old.version(1).stores({ checkins: "date", focusBlocks: "id, date, area" });
    old.version(2).stores({ brainDumps: "id, date, area", cards: "id, area, dueDate", reviewLogs: "id, cardId, date" });
    old.version(3).stores({ predictions: "id, resolveBy, category" });
    old.version(4).stores({ weeklyReviews: "weekStart", experiments: "id, active", experimentTags: "key, date, experimentId" });
    old.version(5).stores({ focusBlocks: "id, date, area" });
    old.version(6).stores({ dailyCheckins: "id, date", weekReviews: "id, weekStart" });
    old.version(7).stores({ checkins: null, weeklyReviews: null });
    await old.open();
    await old.table("focusBlocks").bulkAdd([
      { id: "b1", date: "2026-09-26", startTime: "09:30", minutes: 50, area: "IELTS", focusRating: 4, distractions: 0, phoneAway: true },
      { id: "b2", date: "2026-09-26", startTime: "14:00", minutes: 30, area: "EFM", focusRating: 3, distractions: 1, phoneAway: false },
    ]);
    await old.table("dailyCheckins").add({ id: "#2026-09-26", date: "2026-09-26", bedTime: "23:30", wakeTime: "07:00", sleepHours: 7.5, energy: 4 });
    old.close();
  }

  it("giữ nguyên mọi block và check-in, thêm bảng mockTests rỗng", async () => {
    await makeVersion7Db();
    const db = new LearningDB(NAME);
    expect(await db.focusBlocks.count()).toBe(2);
    expect((await db.focusBlocks.get("b1"))?.ielts).toBeUndefined();
    expect(await db.dailyCheckins.count()).toBe(1);
    expect(await db.mockTests.count()).toBe(0);
    expect(await db.anchorDelays.count()).toBe(0);
    expect(db.verno).toBe(9);
    db.close();
  });

  it("lưu được block có phần IELTS và một lần thi thử", async () => {
    await makeVersion7Db();
    const db = new LearningDB(NAME);
    await db.focusBlocks.update("b1", {
      ielts: { skill: "Listening", test: { book: 10, test: 1, parts: [1], questions: 10, correct: 7, errors: [2, 1, 0, 0] } },
    });
    await db.mockTests.add({ id: "m1", date: "2026-10-03", source: "home", listeningRaw: 22 });
    expect((await db.focusBlocks.get("b1"))?.ielts?.test?.correct).toBe(7);
    expect(await db.mockTests.where("date").equals("2026-10-03").count()).toBe(1);
    db.close();
  });
});
