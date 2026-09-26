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

describe("nâng cấp version 5 -> 7", () => {
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
    expect(db.verno).toBe(7);
    db.close();
  });

  it("máy mới cài (chưa có database) mở thẳng version 7", async () => {
    const db = new LearningDB(NAME);
    await db.dailyCheckins.put({ id: "#2026-09-26", date: "2026-09-26", bedTime: "23:00", wakeTime: "06:00", sleepHours: 7, energy: 3 });
    expect(await db.dailyCheckins.count()).toBe(1);
    db.close();
  });
});
