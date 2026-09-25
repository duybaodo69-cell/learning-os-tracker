/**
 * Dữ liệu mẫu để xem thử giao diện và biểu đồ.
 *
 * AN TOÀN: hàm ở đây CHỈ ghi vào database "learning-os-demo".
 * Khi app đang chạy ở chế độ demo thì `db` đã trỏ sang database đó,
 * nên dữ liệu thật của bạn không bao giờ bị đụng tới.
 *
 * Mọi ghi chú trong dữ liệu mẫu đều có chữ "[MẪU]" để không nhầm với dữ liệu thật.
 */
import { db } from "./db";
import type { Area, DailyCheckin, FocusBlock, Rating } from "./types";
import { newId } from "../lib/dates";

/** Trừ đi n ngày từ một chuỗi "YYYY-MM-DD". */
function minusDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d - n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

const DEMO_AREAS: Area[] = ["Internship VC", "Financial modeling", "IELTS", "IM/Memo", "EFM"];

/**
 * Tạo 14 ngày dữ liệu mẫu.
 * Các con số thay đổi theo một quy luật cố định (không ngẫu nhiên)
 * để biểu đồ ở Phase 4 nhìn có xu hướng rõ ràng.
 */
export async function loadDemoData(today: string): Promise<void> {
  const checkins: DailyCheckin[] = [];
  const blocks: FocusBlock[] = [];

  for (let i = 13; i >= 0; i--) {
    const date = minusDays(today, i);

    // Giờ ngủ dao động nhẹ quanh 23:15-23:45.
    const bedMinute = 15 + (i % 3) * 15;
    const bedTime = `23:${String(bedMinute).padStart(2, "0")}`;
    const wakeTime = i % 4 === 0 ? "07:00" : "06:30";
    const sleepHours = Math.round(((24 * 60 - (23 * 60 + bedMinute) + (wakeTime === "07:00" ? 420 : 390)) / 60) * 4) / 4;

    checkins.push({
      date,
      bedTime,
      wakeTime,
      sleepHours,
      energy: ((i % 5) + 1) as Rating,
      note: "[MẪU] dữ liệu xem thử",
    });

    // Mỗi ngày 1-3 khối deep work.
    const blockCount = (i % 3) + 1;
    for (let b = 0; b < blockCount; b++) {
      blocks.push({
        id: newId(),
        date,
        startTime: `${String(8 + b * 3).padStart(2, "0")}:00`,
        minutes: [25, 45, 60, 90][(i + b) % 4],
        area: DEMO_AREAS[(i + b) % DEMO_AREAS.length],
        focusRating: (((i + b) % 5) + 1) as Rating,
        distractions: (i + b) % 4,
        phoneAway: (i + b) % 2 === 0,
        resumeNote: b === 0 ? "[MẪU] ghi chú xem thử" : undefined,
      });
    }
  }

  // bulkPut = thêm mới hoặc ghi đè nếu trùng khoá.
  await db.checkins.bulkPut(checkins);
  await db.focusBlocks.bulkPut(blocks);
}

/** Xoá sạch database demo. Chỉ ảnh hưởng chế độ demo. */
export async function clearDemoData(): Promise<void> {
  await db.checkins.clear();
  await db.focusBlocks.clear();
}
