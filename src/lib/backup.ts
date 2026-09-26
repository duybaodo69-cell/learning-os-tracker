/**
 * Sao lưu và khôi phục dữ liệu.
 *
 * Đây là thứ duy nhất đứng giữa bạn và việc mất sạch dữ liệu. Tất cả nằm
 * trong IndexedDB của MỘT trình duyệt trên MỘT máy — xoá site data, gỡ app,
 * hoặc mất điện thoại là mất hết, không có bản nào trên server.
 *
 * Định dạng file cố ý để dạng JSON đọc được bằng mắt, không nén, không mã hoá:
 * mười năm nữa mở ra vẫn hiểu được, không cần app này.
 */
import { db, isDemoMode, type LearningDB } from "../db/db";
import { checkinId, weekReviewId } from "../db/keys";
import type {
  BrainDump,
  Card,
  DailyCheckin,
  Experiment,
  ExperimentTag,
  FocusBlock,
  Prediction,
  ReviewLog,
  WeeklyReview,
} from "../db/types";

/**
 * Tăng số này khi định dạng file thay đổi theo cách không tương thích.
 *
 * Việc thêm trường `id` cho check-in / tổng kết tuần (Dexie version 6) KHÔNG
 * cần tăng số: file cũ thiếu `id` vẫn nhập được, `normaliseBackupData` tự
 * điền. Tên bảng trong file vẫn là "checkins" và "weeklyReviews" như cũ.
 */
export const BACKUP_FORMAT_VERSION = 1;

const APP_TAG = "learning-os-tracker";

export type BackupData = {
  checkins: DailyCheckin[];
  focusBlocks: FocusBlock[];
  brainDumps: BrainDump[];
  cards: Card[];
  reviewLogs: ReviewLog[];
  predictions: Prediction[];
  weeklyReviews: WeeklyReview[];
  experiments: Experiment[];
  experimentTags: ExperimentTag[];
};

export type BackupFile = {
  app: string;
  formatVersion: number;
  exportedAt: string; // ISO đầy đủ, có cả giờ
  data: BackupData;
};

/** Tên các bảng, dùng chung cho đọc và ghi để không bao giờ lệch nhau. */
export const TABLE_NAMES = [
  "checkins",
  "focusBlocks",
  "brainDumps",
  "cards",
  "reviewLogs",
  "predictions",
  "weeklyReviews",
  "experiments",
  "experimentTags",
] as const;

/** Tên tiếng Việt để hiện cho người dùng xem. */
export const TABLE_LABELS: Record<string, string> = {
  checkins: "Check-in",
  focusBlocks: "Focus block",
  brainDumps: "Brain dump",
  cards: "Thẻ ôn tập",
  reviewLogs: "Lượt ôn",
  predictions: "Dự đoán",
  weeklyReviews: "Tổng kết tuần",
  experiments: "Thí nghiệm",
  experimentTags: "Nhãn thí nghiệm",
};

/* ==================== Làm sạch dữ liệu ==================== */

/**
 * Các trường Dexie Cloud tự gắn vào mỗi bản ghi khi đồng bộ (chủ sở hữu,
 * vùng dữ liệu...). Chúng không phải dữ liệu học tập của bạn, và nếu nhập
 * lại vào tài khoản khác sẽ trỏ nhầm chủ — nên luôn bỏ đi.
 */
const CLOUD_FIELDS = ["owner", "realmId", "$ts"] as const;

function stripCloudFields<T extends object>(row: T): T {
  const copy = { ...row } as Record<string, unknown>;
  for (const f of CLOUD_FIELDS) delete copy[f];
  return copy as T;
}

/**
 * Đưa dữ liệu (từ file hoặc từ database) về đúng dạng hiện tại:
 *   - bỏ các trường nội bộ của Dexie Cloud
 *   - check-in / tổng kết tuần luôn có `id` = "#ngày" — file xuất trước
 *     version 6 không có trường này
 * Hàm thuần, không đụng database — có test.
 */
export function normaliseBackupData(d: Partial<BackupData>): BackupData {
  const clean = <T extends object>(rows: T[] | undefined): T[] => (rows ?? []).map(stripCloudFields);
  return {
    checkins: clean(d.checkins).map((c) => ({ ...c, id: checkinId(c.date) })),
    focusBlocks: clean(d.focusBlocks),
    brainDumps: clean(d.brainDumps),
    cards: clean(d.cards),
    reviewLogs: clean(d.reviewLogs),
    predictions: clean(d.predictions),
    weeklyReviews: clean(d.weeklyReviews).map((r) => ({ ...r, id: weekReviewId(r.weekStart) })),
    experiments: clean(d.experiments),
    experimentTags: clean(d.experimentTags),
  };
}

/* ==================== Ngày xuất gần nhất ==================== */

const LAST_EXPORT_KEY = "learning-os:last-export";

export function getLastExportDate(): string | null {
  try {
    return localStorage.getItem(LAST_EXPORT_KEY);
  } catch {
    return null;
  }
}

function setLastExportDate(iso: string): void {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, iso);
  } catch {
    /* bỏ qua */
  }
}

/** Số ngày kể từ lần xuất gần nhất. null = chưa xuất bao giờ. */
export function daysSinceLastExport(today: string): number | null {
  const last = getLastExportDate();
  if (!last) return null;
  const toNum = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  };
  return toNum(today) - toNum(last);
}

/** Quá bao nhiêu ngày thì nhắc trên màn hình Hôm nay. */
export const EXPORT_REMINDER_DAYS = 7;

/**
 * Tên file sao lưu.
 *
 * Ở chế độ dữ liệu mẫu, chèn thêm "DEMO" vào tên. Nếu không, vài tháng sau
 * mở thư mục ra bạn sẽ thấy hai file trông y hệt nhau và không biết cái nào
 * là dữ liệu thật — rồi có thể nhập nhầm file mẫu đè lên dữ liệu thật.
 */
export function backupFileName(todayISO: string, demo: boolean): string {
  return demo ? `learning-os-DEMO-${todayISO}.json` : `learning-os-${todayISO}.json`;
}

/* ==================== Xuất ==================== */

/** Đọc toàn bộ dữ liệu của kho đang mở ra một object. */
export async function collectBackup(): Promise<BackupFile> {
  return collectBackupFrom(db);
}

/**
 * Đọc toàn bộ dữ liệu của một kho BẤT KỲ — dùng khi đang ở kho cloud mà cần
 * đọc kho trên máy để đưa lên tài khoản (src/lib/cloudUpload.ts).
 */
export async function collectBackupFrom(db: LearningDB): Promise<BackupFile> {
  const [
    checkins,
    focusBlocks,
    brainDumps,
    cards,
    reviewLogs,
    predictions,
    weeklyReviews,
    experiments,
    experimentTags,
  ] = await Promise.all([
    db.dailyCheckins.toArray(),
    db.focusBlocks.toArray(),
    db.brainDumps.toArray(),
    db.cards.toArray(),
    db.reviewLogs.toArray(),
    db.predictions.toArray(),
    db.weekReviews.toArray(),
    db.experiments.toArray(),
    db.experimentTags.toArray(),
  ]);

  return {
    app: APP_TAG,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data: normaliseBackupData({
      checkins,
      focusBlocks,
      brainDumps,
      cards,
      reviewLogs,
      predictions,
      weeklyReviews,
      experiments,
      experimentTags,
    }),
  };
}

/**
 * Xuất file ra máy.
 *
 * Thử hai cách, vì iPhone và Android khác nhau:
 *   1. navigator.share — iPhone (kể cả khi đã cài app vào màn hình chính)
 *      mở bảng chia sẻ để lưu vào Files, iCloud, gửi mail cho chính mình...
 *      Trên iOS đây gần như là cách DUY NHẤT lấy file ra khỏi PWA.
 *   2. Thẻ <a download> — Android và máy tính tải thẳng về.
 *
 * Trả về cách đã dùng để màn hình Cài đặt báo lại cho đúng.
 *
 * Ở chế độ demo: file được đặt tên khác và ngày sao lưu KHÔNG được cập nhật.
 */
export async function exportBackup(todayISO: string): Promise<"share" | "download"> {
  // Đang ở chế độ demo thì đây KHÔNG phải bản sao lưu dữ liệu thật.
  const demo = isDemoMode();

  const backup = await collectBackup();
  // Xuống dòng cho dễ đọc khi mở file bằng mắt.
  const text = JSON.stringify(backup, null, 2);
  const fileName = backupFileName(todayISO, demo);

  const file = new File([text], fileName, { type: "application/json" });

  // canShare với files: hỏi trước xem trình duyệt có làm được không,
  // nếu gọi thẳng share() mà không hỗ trợ sẽ văng lỗi.
  const canShareFiles =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });

  if (canShareFiles) {
    try {
      await navigator.share({ files: [file], title: fileName });
      // KHÔNG ghi ngày sao lưu khi đang ở chế độ demo: xuất dữ liệu mẫu
      // không bảo vệ được gì, mà lại làm tắt lời nhắc sao lưu thật.
      if (!demo) setLastExportDate(todayISO);
      return "share";
    } catch (err) {
      // Người dùng bấm Huỷ trên bảng chia sẻ -> KHÔNG coi là đã sao lưu,
      // và cũng không rơi xuống cách tải về (sẽ gây tải file ngoài ý muốn).
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      // Lỗi thật thì thử cách tải về.
    }
  }

  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Thu hồi URL sau một nhịp, nếu thu ngay có trình duyệt huỷ luôn việc tải.
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  if (!demo) setLastExportDate(todayISO);
  return "download";
}

/* ==================== Nhập ==================== */

export type ParsedBackup = {
  file: BackupFile;
  /** Số bản ghi mỗi bảng, để xem trước trước khi ghi đè. */
  counts: Record<string, number>;
};

/**
 * Đọc và kiểm tra nội dung file.
 * Ném lỗi kèm câu tiếng Việt nếu file không dùng được — thà báo rõ
 * còn hơn ghi đè bằng dữ liệu rác.
 */
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("File không phải JSON hợp lệ.");
  }

  if (typeof raw !== "object" || raw === null) {
    throw new Error("Nội dung file không đúng định dạng.");
  }

  const obj = raw as Partial<BackupFile>;

  if (obj.app !== APP_TAG) {
    throw new Error("File này không phải bản sao lưu của Learning OS Tracker.");
  }
  if (typeof obj.formatVersion !== "number" || obj.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new Error(
      `File được tạo bởi phiên bản mới hơn (định dạng ${obj.formatVersion}). Hãy cập nhật app rồi thử lại.`
    );
  }
  if (typeof obj.data !== "object" || obj.data === null) {
    throw new Error("File thiếu phần dữ liệu.");
  }

  const data = obj.data as Record<string, unknown>;
  const counts: Record<string, number> = {};

  for (const name of TABLE_NAMES) {
    const value = data[name];
    // Bảng thiếu thì coi như rỗng — file cũ từ phase trước vẫn nhập được.
    if (value === undefined) {
      counts[name] = 0;
      continue;
    }
    if (!Array.isArray(value)) {
      throw new Error(`Bảng "${name}" trong file bị hỏng (phải là một danh sách).`);
    }
    counts[name] = value.length;
  }

  return { file: obj as BackupFile, counts };
}

/** Đếm số bản ghi đang có trong database — để so với file trước khi ghi đè. */
export async function currentCounts(): Promise<Record<string, number>> {
  const [a, b, c, d, e, f, g, h, i] = await Promise.all([
    db.dailyCheckins.count(),
    db.focusBlocks.count(),
    db.brainDumps.count(),
    db.cards.count(),
    db.reviewLogs.count(),
    db.predictions.count(),
    db.weekReviews.count(),
    db.experiments.count(),
    db.experimentTags.count(),
  ]);
  return {
    checkins: a,
    focusBlocks: b,
    brainDumps: c,
    cards: d,
    reviewLogs: e,
    predictions: f,
    weeklyReviews: g,
    experiments: h,
    experimentTags: i,
  };
}

/**
 * GHI ĐÈ toàn bộ dữ liệu bằng nội dung file.
 *
 * Chỉ gọi hàm này SAU khi người dùng đã xác nhận trong app (luật số 4).
 *
 * Làm trong MỘT transaction: nếu có lỗi giữa chừng, Dexie quay ngược lại
 * toàn bộ — không bao giờ để lại tình trạng nửa cũ nửa mới.
 */
export async function importBackup(file: BackupFile): Promise<void> {
  const d = normaliseBackupData(file.data);
  await db.transaction(
    "rw",
    [
      db.dailyCheckins,
      db.focusBlocks,
      db.brainDumps,
      db.cards,
      db.reviewLogs,
      db.predictions,
      db.weekReviews,
      db.experiments,
      db.experimentTags,
    ],
    async () => {
      await Promise.all([
        db.dailyCheckins.clear(),
        db.focusBlocks.clear(),
        db.brainDumps.clear(),
        db.cards.clear(),
        db.reviewLogs.clear(),
        db.predictions.clear(),
        db.weekReviews.clear(),
        db.experiments.clear(),
        db.experimentTags.clear(),
      ]);
      await Promise.all([
        db.dailyCheckins.bulkAdd(d.checkins),
        db.focusBlocks.bulkAdd(d.focusBlocks),
        db.brainDumps.bulkAdd(d.brainDumps),
        db.cards.bulkAdd(d.cards),
        db.reviewLogs.bulkAdd(d.reviewLogs),
        db.predictions.bulkAdd(d.predictions),
        db.weekReviews.bulkAdd(d.weeklyReviews),
        db.experiments.bulkAdd(d.experiments),
        db.experimentTags.bulkAdd(d.experimentTags),
      ]);
    }
  );
}
