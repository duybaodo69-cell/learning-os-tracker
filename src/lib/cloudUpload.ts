/**
 * Đưa dữ liệu kho trên máy ("learning-os") lên tài khoản đồng bộ.
 *
 * Dùng lại đúng đường sao lưu JSON: đọc kho trên máy bằng collectBackupFrom
 * (giống hệt nút Xuất), làm sạch bằng normaliseBackupData (giống hệt nút Nhập),
 * rồi planUpload chọn ra bản ghi chưa có trên tài khoản.
 *
 * Chỉ THÊM, không xoá, không ghi đè. Kho trên máy không bị đụng tới.
 */
import { LearningDB, db } from "../db/db";
import { STORE_DB_NAME } from "../db/store";
import type { Table } from "dexie";
import { TABLE_NAMES, collectBackupFrom } from "./backup";
import { planUpload, type TableName, type UploadPlan } from "./upload";

/** Bảng trong database ứng với từng tên bảng trong file sao lưu. */
function cloudTable(name: TableName): Table<object, string> {
  const table =
    name === "checkins" ? db.dailyCheckins : name === "weeklyReviews" ? db.weekReviews : db[name];
  // Ép về kiểu chung để một vòng lặp xử lý được mọi bảng.
  return table as unknown as Table<object, string>;
}

/** Khoá chính đang có trên tài khoản (bản sao đã đồng bộ về máy này). */
async function existingKeys(): Promise<Record<TableName, string[]>> {
  const entries = await Promise.all(
    TABLE_NAMES.map(async (n) => [n, (await cloudTable(n).toCollection().primaryKeys()) as string[]] as const)
  );
  return Object.fromEntries(entries) as Record<TableName, string[]>;
}

/** Tổng số bản ghi trong kho trên máy — 0 thì không cần hiện thẻ chuyển. */
export async function localStoreTotal(): Promise<number> {
  const local = new LearningDB(STORE_DB_NAME.local);
  try {
    const counts = await Promise.all(local.tables.map((t) => t.count()));
    return counts.reduce((a, b) => a + b, 0);
  } finally {
    local.close();
  }
}

/** Xem trước: bao nhiêu bản ghi sẽ được thêm, bao nhiêu bỏ qua vì đã có. */
export async function previewUpload(): Promise<UploadPlan> {
  const local = new LearningDB(STORE_DB_NAME.local);
  try {
    const file = await collectBackupFrom(local);
    return planUpload(file.data, await existingKeys());
  } finally {
    local.close();
  }
}

/**
 * Thực hiện. Chỉ gọi SAU khi người dùng đã xác nhận trong app.
 *
 * Tính lại kế hoạch NGAY TRONG transaction, phòng khi giữa lúc xem trước và
 * lúc bấm xác nhận có bản ghi mới đồng bộ về. Một transaction: lỗi giữa chừng
 * thì không bản ghi nào được thêm.
 * Trả về số bản ghi đã thêm.
 */
export async function runUpload(): Promise<number> {
  const local = new LearningDB(STORE_DB_NAME.local);
  let file;
  try {
    file = await collectBackupFrom(local);
  } finally {
    local.close();
  }

  return db.transaction("rw", TABLE_NAMES.map(cloudTable), async () => {
    const plan = planUpload(file.data, await existingKeys());
    for (const n of TABLE_NAMES) {
      const rows = plan.toAdd[n] as object[];
      if (rows.length > 0) await cloudTable(n).bulkAdd(rows);
    }
    return plan.totalToAdd;
  });
}

/* ---------- Đã chuyển xong chưa (lưu trên máy này) ---------- */

const UPLOAD_DONE_KEY = "learning-os:upload-done";

export function isUploadDone(): boolean {
  try {
    return localStorage.getItem(UPLOAD_DONE_KEY) !== null;
  } catch {
    return false;
  }
}

export function markUploadDone(): void {
  try {
    localStorage.setItem(UPLOAD_DONE_KEY, new Date().toISOString());
  } catch {
    /* bỏ qua */
  }
}
