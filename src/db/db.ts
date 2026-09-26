/**
 * Database chạy ngay trong trình duyệt (IndexedDB), qua thư viện Dexie.
 *
 * Không có server, không đăng nhập — dữ liệu nằm trong máy bạn.
 *
 * CHẾ ĐỘ DỮ LIỆU MẪU (demo):
 * App mở MỘT trong HAI database, tuỳ công tắc trong màn hình Cài đặt:
 *   - "learning-os"      → dữ liệu thật của bạn
 *   - "learning-os-demo" → dữ liệu mẫu để xem thử
 * Hai cái này tách biệt hoàn toàn. Bật/tắt demo KHÔNG bao giờ
 * đụng tới dữ liệu thật.
 */
import Dexie, { type Table } from "dexie";
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

class LearningDB extends Dexie {
  // Dấu `!` nói với TypeScript: "Dexie sẽ gán giá trị, đừng lo".
  checkins!: Table<DailyCheckin, string>;
  focusBlocks!: Table<FocusBlock, string>;
  // Phase 2
  brainDumps!: Table<BrainDump, string>;
  cards!: Table<Card, string>;
  reviewLogs!: Table<ReviewLog, string>;
  // Phase 3
  predictions!: Table<Prediction, string>;
  // Phase 4
  weeklyReviews!: Table<WeeklyReview, string>;
  experiments!: Table<Experiment, string>;
  experimentTags!: Table<ExperimentTag, string>;

  constructor(databaseName: string) {
    super(databaseName);

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
  }
}

/**
 * Database đang dùng. Được chọn MỘT LẦN lúc app khởi động,
 * nên đổi công tắc demo thì phải tải lại trang (Cài đặt tự làm việc này).
 */
export const db = new LearningDB(isDemoMode() ? "learning-os-demo" : "learning-os");
