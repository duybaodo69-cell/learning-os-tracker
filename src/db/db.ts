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
import type { DailyCheckin, FocusBlock } from "./types";

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

  constructor(databaseName: string) {
    super(databaseName);

    // version(1) = cấu trúc bảng đời đầu.
    // Chuỗi bên phải liệt kê các cột được đánh index (tìm kiếm nhanh).
    // Cột đầu tiên là khoá chính.
    this.version(1).stores({
      checkins: "date",              // mỗi ngày 1 bản ghi
      focusBlocks: "id, date, area", // tìm theo ngày và theo area
    });
  }
}

/**
 * Database đang dùng. Được chọn MỘT LẦN lúc app khởi động,
 * nên đổi công tắc demo thì phải tải lại trang (Cài đặt tự làm việc này).
 */
export const db = new LearningDB(isDemoMode() ? "learning-os-demo" : "learning-os");
