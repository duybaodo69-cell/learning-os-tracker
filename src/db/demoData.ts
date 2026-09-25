/**
 * Dữ liệu mẫu để xem thử giao diện và biểu đồ.
 *
 * AN TOÀN: hàm ở đây CHỈ ghi vào database "learning-os-demo".
 * Khi app đang chạy ở chế độ demo thì `db` đã trỏ sang database đó,
 * nên dữ liệu thật của bạn không bao giờ bị đụng tới.
 *
 * Mọi nội dung mẫu đều có chữ "[MẪU]" để không nhầm với dữ liệu thật.
 */
import { db } from "./db";
import type { Area, BrainDump, Card, DailyCheckin, FocusBlock, Grade, ReviewLog, Rating } from "./types";
import { newId } from "../lib/dates";
import { START_EASE, addDays } from "../lib/scheduling";

/** Trừ đi n ngày từ một chuỗi "YYYY-MM-DD". */
function minusDays(iso: string, n: number): string {
  return addDays(iso, -n);
}

const DEMO_AREAS: Area[] = ["Internship VC", "Financial modeling", "IELTS", "IM/Memo", "EFM"];

/**
 * Tạo 14 ngày dữ liệu mẫu: check-in, focus block, brain dump,
 * thẻ ôn tập và nhật ký ôn.
 *
 * Các con số thay đổi theo một quy luật cố định (không ngẫu nhiên)
 * để biểu đồ ở Phase 4 nhìn có xu hướng rõ ràng và test được lặp lại.
 */
export async function loadDemoData(today: string): Promise<void> {
  const checkins: DailyCheckin[] = [];
  const blocks: FocusBlock[] = [];
  const dumps: BrainDump[] = [];

  for (let i = 13; i >= 0; i--) {
    const date = minusDays(today, i);

    // Giờ ngủ dao động nhẹ quanh 23:15-23:45.
    const bedMinute = 15 + (i % 3) * 15;
    const bedTime = `23:${String(bedMinute).padStart(2, "0")}`;
    const wakeTime = i % 4 === 0 ? "07:00" : "06:30";
    const sleepHours =
      Math.round(((24 * 60 - (23 * 60 + bedMinute) + (wakeTime === "07:00" ? 420 : 390)) / 60) * 4) / 4;

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

    // Brain dump cách ngày một lần.
    if (i % 2 === 0) {
      dumps.push({
        id: newId(),
        date,
        area: DEMO_AREAS[i % DEMO_AREAS.length],
        recalled: "[MẪU] Những gì nhớ được khi không mở tài liệu.",
        gaps: "[MẪU] Chỗ hổng 1\n[MẪU] Chỗ hổng 2",
        minutes: [10, 15, 20][i % 3],
      });
    }
  }

  /* ---------- Thẻ ôn tập ----------
     Cố ý trải đều nhiều trạng thái để xem thử được mọi màn hình:
       - vài thẻ đến hạn HÔM NAY  -> hàng đợi ôn có việc để làm
       - vài thẻ hạn trong tương lai -> badge không bị phồng
       - vài thẻ chưa có mặt sau  -> thấy cảnh báo ở tab Thẻ
       - vài thẻ từng quên        -> có lapses để thống kê Phase 4 */
  const cards: Card[] = [];
  const logs: ReviewLog[] = [];

  const CARD_SEEDS: { front: string; back: string; area: Area }[] = [
    { front: "[MẪU] WACC tính thế nào?", back: "E/V·Re + D/V·Rd·(1−t)", area: "Financial modeling" },
    { front: "[MẪU] FCFF khác FCFE ở đâu?", back: "FCFF trước trả nợ, FCFE sau trả nợ.", area: "Financial modeling" },
    { front: "[MẪU] Terminal value: hai cách tính?", back: "Gordon growth và exit multiple.", area: "Financial modeling" },
    { front: "[MẪU] Beta unlevered công thức?", back: "βL / (1 + (1−t)·D/E)", area: "Financial modeling" },
    { front: "[MẪU] Term sheet: liquidation preference là gì?", back: "Thứ tự và bội số được chia khi thanh lý.", area: "Internship VC" },
    { front: "[MẪU] Pro-rata rights nghĩa là gì?", back: "Quyền góp thêm để giữ nguyên tỷ lệ sở hữu.", area: "Internship VC" },
    { front: "[MẪU] Cohort retention đọc thế nào?", back: "Tỷ lệ còn hoạt động theo tháng kể từ lúc vào.", area: "Internship VC" },
    { front: "[MẪU] IELTS Writing Task 1: mở bài gồm gì?", back: "Paraphrase đề + overview xu hướng chính.", area: "IELTS" },
    { front: "[MẪU] Từ nối chỉ tương phản?", back: "However, nevertheless, conversely, whereas.", area: "IELTS" },
    { front: "[MẪU] IM một trang gồm mục nào?", back: "Vấn đề, giải pháp, thị trường, traction, team, deal.", area: "IM/Memo" },
    // Hai thẻ cuối để TRỐNG mặt sau — mô phỏng thẻ vừa tạo từ chỗ hổng.
    { front: "[MẪU] Chỗ hổng chưa điền đáp án", back: "", area: "EFM" },
    { front: "[MẪU] Chỗ hổng thứ hai chưa điền", back: "", area: "EFM" },
  ];

  CARD_SEEDS.forEach((seed, idx) => {
    const cardId = newId();
    const createdAt = minusDays(today, 13 - (idx % 10));

    // 5 thẻ đầu đến hạn hôm nay, số còn lại rải ra 1-6 ngày tới.
    const dueDate = idx < 5 ? today : addDays(today, (idx % 6) + 1);

    // Thẻ mới tinh (mặt sau trống) thì chưa ôn lần nào.
    const isFresh = seed.back === "";
    const reps = isFresh ? 0 : (idx % 4) + 1;
    const intervalDays = isFresh ? 0 : [1, 3, 8, 20][idx % 4];
    const lapses = idx % 5 === 0 ? 1 : 0;

    cards.push({
      id: cardId,
      front: seed.front,
      back: seed.back,
      area: seed.area,
      createdAt,
      dueDate,
      intervalDays,
      ease: START_EASE,
      reps,
      lapses,
    });

    // Nhật ký ôn tương ứng, để Phase 4 có dữ liệu vẽ biểu đồ.
    const grades: Grade[] = ["again", "hard", "good", "easy"];
    for (let r = 0; r < reps; r++) {
      logs.push({
        id: newId(),
        cardId,
        date: minusDays(today, reps - r),
        grade: grades[(idx + r) % grades.length],
        intervalBefore: r === 0 ? 0 : [1, 3, 8, 20][(r - 1) % 4],
      });
    }
  });

  // bulkPut = thêm mới hoặc ghi đè nếu trùng khoá.
  await db.checkins.bulkPut(checkins);
  await db.focusBlocks.bulkPut(blocks);
  await db.brainDumps.bulkPut(dumps);
  await db.cards.bulkPut(cards);
  await db.reviewLogs.bulkPut(logs);
}

/** Xoá sạch database demo. Chỉ ảnh hưởng chế độ demo. */
export async function clearDemoData(): Promise<void> {
  await db.checkins.clear();
  await db.focusBlocks.clear();
  await db.brainDumps.clear();
  await db.cards.clear();
  await db.reviewLogs.clear();
}
