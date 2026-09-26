/**
 * Kế hoạch "Đưa dữ liệu trên máy này lên tài khoản".
 *
 * Nguyên tắc (yêu cầu của chủ app):
 *   - KHÔNG BAO GIỜ xoá hay ghi đè thứ đã có trên tài khoản. Xoá trên cloud
 *     nghĩa là xoá trên MỌI máy.
 *   - Bản ghi trùng khoá (đã có trên tài khoản) thì BỎ QUA, giữ bản trên
 *     tài khoản. Nhờ khoá "#ngày" và UUID, cùng một bản ghi luôn trùng khoá,
 *     nên đưa lên hai lần cũng không sinh bản ghi đôi.
 *   - Kho trên máy giữ nguyên, không bị đụng tới.
 *
 * File này chỉ TÍNH (hàm thuần, có test). Việc ghi nằm ở cloudUpload.ts.
 */
import { TABLE_NAMES, type BackupData } from "./backup";

export type TableName = (typeof TABLE_NAMES)[number];

/** Tên cột khoá chính của từng bảng, theo tên trong file sao lưu. */
export const PRIMARY_KEY: Record<TableName, string> = {
  checkins: "id",
  focusBlocks: "id",
  brainDumps: "id",
  cards: "id",
  reviewLogs: "id",
  predictions: "id",
  weeklyReviews: "id",
  experiments: "id",
  experimentTags: "key",
};

export type UploadRow = { table: TableName; incoming: number; toAdd: number; skipped: number };

export type UploadPlan = {
  /** Chỉ những bản ghi CHƯA có trên tài khoản. */
  toAdd: BackupData;
  rows: UploadRow[];
  totalToAdd: number;
  totalSkipped: number;
};

/**
 * @param local        dữ liệu kho trên máy (đã qua normaliseBackupData)
 * @param existingKeys khoá đang có trên tài khoản, theo từng bảng
 */
export function planUpload(
  local: BackupData,
  existingKeys: Partial<Record<TableName, Iterable<string>>>
): UploadPlan {
  const toAdd = {} as Record<TableName, unknown[]>;
  const rows: UploadRow[] = [];

  for (const table of TABLE_NAMES) {
    const have = new Set(existingKeys[table] ?? []);
    const key = PRIMARY_KEY[table];
    const incoming = local[table] as unknown as Record<string, unknown>[];

    // Trong chính file cũng có thể có khoá lặp (hiếm) — chỉ lấy bản đầu.
    const seen = new Set<string>();
    const fresh = incoming.filter((r) => {
      const k = String(r[key]);
      if (have.has(k) || seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    toAdd[table] = fresh;
    rows.push({ table, incoming: incoming.length, toAdd: fresh.length, skipped: incoming.length - fresh.length });
  }

  return {
    toAdd: toAdd as unknown as BackupData,
    rows,
    totalToAdd: rows.reduce((s, r) => s + r.toAdd, 0),
    totalSkipped: rows.reduce((s, r) => s + r.skipped, 0),
  };
}
