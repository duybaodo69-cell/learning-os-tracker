/**
 * Database chạy ngay trong trình duyệt (IndexedDB), qua thư viện Dexie.
 *
 * Không có server, không đăng nhập — dữ liệu nằm trong máy bạn.
 *
 * BA KHO DỮ LIỆU (xem src/db/store.ts):
 * App mở MỘT trong BA database, tuỳ công tắc trong màn hình Cài đặt:
 *   - "learning-os"       → dữ liệu thật, chỉ trên máy này (mặc định)
 *   - "learning-os-cloud" → dữ liệu thật, đồng bộ qua Dexie Cloud (sau khi đăng nhập)
 *   - "learning-os-demo"  → dữ liệu mẫu để xem thử, không bao giờ đồng bộ
 * Ba cái tách biệt hoàn toàn. Đổi kho KHÔNG bao giờ xoá dữ liệu của kho kia.
 */
import Dexie, { type DexieOptions, type Table } from "dexie";
import dexieCloud from "dexie-cloud-addon";
import { CLOUD_DB_URL } from "../config/cloud";
import { STORE_DB_NAME, chooseStore, type StoreKind } from "./store";
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
} from "./types";
import { checkinId, weekReviewId } from "./keys";

/** Khoá lưu công tắc demo trong localStorage. */
const DEMO_MODE_KEY = "learning-os:demo-mode";

/** Đang ở chế độ dữ liệu mẫu? */
export function isDemoMode(): boolean {
  try {
    return localStorage.getItem(DEMO_MODE_KEY) === "1";
  } catch {
    // Một số trình duyệt chặn localStorage (chế độ riêng tư).
    // Khi đó coi như đang dùng dữ liệu thật.
    return false;
  }
}

/** Bật/tắt chế độ demo. Trang sẽ được tải lại để đổi database. */
export function setDemoMode(on: boolean): void {
  try {
    if (on) localStorage.setItem(DEMO_MODE_KEY, "1");
    else localStorage.removeItem(DEMO_MODE_KEY);
  } catch {
    // Không lưu được thì thôi, không làm app crash.
  }
}

export class LearningDB extends Dexie {
  // Dấu `!` nói với TypeScript: "Dexie sẽ gán giá trị, đừng lo".
  // Version 6 đổi tên: `checkins` -> `dailyCheckins`, `weeklyReviews` -> `weekReviews`.
  dailyCheckins!: Table<DailyCheckin, string>;
  focusBlocks!: Table<FocusBlock, string>;
  // Phase 2
  brainDumps!: Table<BrainDump, string>;
  cards!: Table<Card, string>;
  reviewLogs!: Table<ReviewLog, string>;
  // Phase 3
  predictions!: Table<Prediction, string>;
  // Phase 4
  weekReviews!: Table<WeeklyReview, string>;
  experiments!: Table<Experiment, string>;
  experimentTags!: Table<ExperimentTag, string>;

  constructor(databaseName: string, options?: DexieOptions) {
    super(databaseName, options);

    // version(1) = cấu trúc bảng đời đầu.
    // Chuỗi bên phải liệt kê các cột được đánh index (tìm kiếm nhanh).
    // Cột đầu tiên là khoá chính.
    this.version(1).stores({
      checkins: "date",              // mỗi ngày 1 bản ghi
      focusBlocks: "id, date, area", // tìm theo ngày và theo area
    });

    // version(2) — Phase 2 thêm 3 bảng.
    // QUY TẮC: KHÔNG BAO GIỜ sửa version(1) ở trên. Muốn thêm bảng thì
    // thêm một version mới, nếu không máy nào đã cài app sẽ hỏng database.
    // Dexie chỉ cần liệt kê bảng MỚI; các bảng cũ tự giữ nguyên.
    this.version(2).stores({
      brainDumps: "id, date, area",
      cards: "id, area, dueDate",  // dueDate có index để lấy thẻ đến hạn cho nhanh
      reviewLogs: "id, cardId, date",
    });

    // version(3) — Phase 3 thêm bảng dự đoán.
    // Lại nhắc: KHÔNG sửa version(1) hay (2) ở trên, chỉ thêm version mới.
    this.version(3).stores({
      predictions: "id, resolveBy, category",
    });

    // version(4) — Phase 4.
    this.version(4).stores({
      weeklyReviews: "weekStart",
      experiments: "id, active",
      experimentTags: "key, date, experimentId",
    });

    // version(5) — thêm trường FocusBlock.capturedNotes (string[], không bắt buộc).
    // Trường này KHÔNG có index nên cấu trúc bảng giữ nguyên; khai báo version
    // mới để lịch sử database ghi nhận thời điểm đổi dữ liệu, đúng quy tắc
    // "không bao giờ sửa version cũ". Block cũ không có trường này vẫn hợp lệ.
    this.version(5).stores({
      focusBlocks: "id, date, area",
    });

    // version(6) + version(7) — chuẩn bị cho đồng bộ Dexie Cloud.
    //
    // Dexie Cloud cần khoá chính duy nhất trên toàn hệ thống. Hai bảng cũ dùng
    // ngày trơn làm khoá ("2026-09-26"), nên chuyển sang khoá "#2026-09-26"
    // (xem src/db/keys.ts). IndexedDB KHÔNG cho đổi khoá chính của một bảng
    // có sẵn, nên phải làm hai bước:
    //   6: tạo bảng mới với khoá `id`, rồi CHÉP từng bản ghi cũ sang
    //   7: bỏ hai bảng cũ (lúc này dữ liệu đã nằm ở bảng mới)
    // Mỗi bước chạy trong một transaction: lỗi giữa chừng thì database giữ
    // nguyên như cũ, không bao giờ nửa nọ nửa kia. Có test trong db.test.ts.
    this.version(6)
      .stores({
        dailyCheckins: "id, date",
        weekReviews: "id, weekStart",
      })
      .upgrade(async (tx) => {
        const oldCheckins: Omit<DailyCheckin, "id">[] = await tx.table("checkins").toArray();
        await tx
          .table("dailyCheckins")
          .bulkPut(oldCheckins.map((c) => ({ ...c, id: checkinId(c.date) })));

        const oldReviews: Omit<WeeklyReview, "id">[] = await tx.table("weeklyReviews").toArray();
        await tx
          .table("weekReviews")
          .bulkPut(oldReviews.map((r) => ({ ...r, id: weekReviewId(r.weekStart) })));
      });

    this.version(7).stores({
      checkins: null,
      weeklyReviews: null,
    });
  }
}

/* ==================== Đồng bộ ==================== */

/** Khoá lưu công tắc đồng bộ trong localStorage. "1" = đã bấm đăng nhập. */
const SYNC_KEY = "learning-os:sync";

/** Đã bật đồng bộ (bấm "Đăng nhập để đồng bộ") trên máy này chưa? */
export function isSyncEnabled(): boolean {
  try {
    return localStorage.getItem(SYNC_KEY) === "1";
  } catch {
    return false;
  }
}

/** Bật/tắt đồng bộ. Trang phải tải lại để đổi database. */
export function setSyncEnabled(on: boolean): void {
  try {
    if (on) localStorage.setItem(SYNC_KEY, "1");
    else localStorage.removeItem(SYNC_KEY);
  } catch {
    /* bỏ qua */
  }
}

/** Kho đang mở. Chọn MỘT LẦN lúc khởi động. */
export const activeStore: StoreKind = chooseStore(isDemoMode(), isSyncEnabled(), CLOUD_DB_URL);

/** Kho cloud đã có địa chỉ database chưa (đã chạy `npx dexie-cloud create`)? */
export const cloudConfigured = CLOUD_DB_URL !== "";

function openActiveDb(): LearningDB {
  if (activeStore !== "cloud") {
    // Kho trên máy và kho demo: KHÔNG gắn addon, nên không thể gửi gì lên mạng.
    return new LearningDB(STORE_DB_NAME[activeStore]);
  }
  const cloudDb = new LearningDB(STORE_DB_NAME.cloud, { addons: [dexieCloud] });
  cloudDb.cloud.configure({
    databaseUrl: CLOUD_DB_URL,
    // Bắt buộc đăng nhập trước khi đọc/ghi. Nhờ vậy kho cloud không bao giờ
    // chứa dữ liệu "chưa có chủ" — thứ mà Dexie Cloud sẽ tự đẩy lên tài khoản
    // lúc đăng nhập. Dữ liệu cũ chỉ lên tài khoản khi bạn tự bấm chuyển.
    requireAuth: true,
    // Hộp đăng nhập tiếng Việt của mình (src/components/CloudLoginDialog.tsx)
    // thay cho hộp tiếng Anh mặc định.
    customLoginGui: true,
  });
  return cloudDb;
}

/**
 * Database đang dùng. Được chọn MỘT LẦN lúc app khởi động,
 * nên đổi công tắc demo / đồng bộ thì phải tải lại trang (Cài đặt tự làm).
 */
export const db = openActiveDb();
