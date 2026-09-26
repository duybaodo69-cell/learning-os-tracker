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
import type { Area, BrainDump, Card, DailyCheckin, Experiment, ExperimentTag, FocusBlock, Grade, Prediction, PredictionCategory, ReviewLog, Rating, WeeklyReview } from "./types";
import { newId } from "../lib/dates";
import { START_EASE, addDays } from "../lib/scheduling";
import { experimentTagKey, mondayOf } from "../lib/metrics";

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
        // Vài block có "việc chen ngang" để thấy cách nó hiện ở màn hình Hôm nay.
        capturedNotes: b === 0 && i % 3 === 0 ? ["[MẪU] nhớ gửi mail", "[MẪU] kiểm tra lại beta"] : undefined,
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

  /* ---------- Dự đoán ----------
     Cố ý tạo một người HƠI QUÁ TỰ TIN: ở khoảng 80-100% thì nói cao hơn
     thực tế, còn khoảng thấp thì khá chuẩn. Nhờ vậy biểu đồ calibration
     có hình dạng đọc được chứ không phải một đống chấm ngẫu nhiên.
     Tạo 24 dự đoán ĐÃ CHẤM để vượt ngưỡng 20 và tắt được câu
     "chưa đủ dữ liệu". */
  const predictions: Prediction[] = [];
  const CATS: PredictionCategory[] = ["Deal/VC", "Market", "Study", "Personal"];

  // [xác suất, số lần đúng, tổng số lần] cho từng nhóm.
  const RESOLVED_PATTERN: [number, number, number][] = [
    [10, 0, 4],  // nói 10% -> thực tế 0%   (khá chuẩn)
    [30, 1, 4],  // nói 30% -> thực tế 25%  (khá chuẩn)
    [50, 2, 4],  // nói 50% -> thực tế 50%  (chuẩn)
    [70, 3, 6],  // nói 70% -> thực tế 50%  (hơi quá tự tin)
    [90, 3, 6],  // nói 90% -> thực tế 50%  (quá tự tin rõ rệt)
  ];

  let n = 0;
  for (const [prob, hits, total] of RESOLVED_PATTERN) {
    for (let k = 0; k < total; k++) {
      const cat = CATS[n % CATS.length];
      predictions.push({
        id: newId(),
        statement: `[MẪU] Dự đoán ${prob}% số ${k + 1} — ${cat}`,
        probability: prob,
        category: cat,
        createdAt: minusDays(today, 40 + n),
        resolveBy: minusDays(today, 10 + (n % 20)),
        outcome: k < hits,
        // Rải ngày chấm: một nửa trong 30 ngày gần đây, một nửa cũ hơn,
        // để hai con số Brier (tất cả / 30 ngày) khác nhau.
        resolvedAt: minusDays(today, n % 2 === 0 ? (n % 25) : 40 + n),
        note: "[MẪU] base rate tham khảo",
        preMortem: cat === "Deal/VC" ? "[MẪU] Thất bại vì team không giữ được nhịp tăng trưởng." : undefined,
      });
      n++;
    }
  }

  // 2 dự đoán ĐẾN HẠN CHẤM (quá hạn, chưa có kết quả).
  for (let k = 0; k < 2; k++) {
    predictions.push({
      id: newId(),
      statement: `[MẪU] Dự đoán đã tới hạn, cần chấm — số ${k + 1}`,
      probability: k === 0 ? 65 : 35,
      category: CATS[k % CATS.length],
      createdAt: minusDays(today, 30),
      resolveBy: minusDays(today, k + 1),
      outcome: null,
      preMortem: CATS[k % CATS.length] === "Deal/VC" ? "[MẪU] Rủi ro lớn nhất là định giá quá cao." : undefined,
    });
  }

  // 3 dự đoán ĐANG MỞ (hạn trong tương lai).
  for (let k = 0; k < 3; k++) {
    predictions.push({
      id: newId(),
      statement: `[MẪU] Dự đoán đang mở — số ${k + 1}`,
      probability: [25, 55, 80][k],
      category: CATS[(k + 1) % CATS.length],
      createdAt: today,
      resolveBy: addDays(today, (k + 1) * 14),
      outcome: null,
      note: "[MẪU] chưa tới hạn",
    });
  }

  /* ---------- Thí nghiệm ----------
     Một thí nghiệm đang chạy, gắn nhãn xen kẽ A/B cho 14 ngày.
     Mỗi nhánh 7 ngày -> dưới ngưỡng 10, nên phần kết quả sẽ hiện đúng
     câu "chưa đủ ngày". Đó là trạng thái thật mà bạn sẽ gặp lúc đầu. */
  const experiment: Experiment = {
    id: "demo-experiment-1",
    name: "[MẪU] Vị trí điện thoại",
    labelA: "Phòng khác",
    labelB: "Trên bàn",
    createdAt: minusDays(today, 13),
    active: true,
  };
  const experimentTags: ExperimentTag[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = minusDays(today, i);
    const condition: "A" | "B" = i % 2 === 0 ? "A" : "B";
    experimentTags.push({
      key: experimentTagKey(date, experiment.id),
      date,
      experimentId: experiment.id,
      condition,
    });
  }

  /* ---------- Tổng kết tuần ---------- */
  const weeklyReviews: WeeklyReview[] = [1, 2].map((weeksAgo) => ({
    weekStart: mondayOf(minusDays(today, weeksAgo * 7)),
    learnedWithoutNotes: "[MẪU] Dựng được mô hình DCF từ đầu mà không mở template.",
    dataInsight: "[MẪU] Ngày ngủ dưới 7h thì deep work hôm sau giảm rõ.",
    oneChange: "[MẪU] Tuần tới đặt giờ đi ngủ cố định 23:15.",
  }));

  // bulkPut = thêm mới hoặc ghi đè nếu trùng khoá.
  await db.checkins.bulkPut(checkins);
  await db.focusBlocks.bulkPut(blocks);
  await db.brainDumps.bulkPut(dumps);
  await db.cards.bulkPut(cards);
  await db.reviewLogs.bulkPut(logs);
  await db.predictions.bulkPut(predictions);
  await db.experiments.bulkPut([experiment]);
  await db.experimentTags.bulkPut(experimentTags);
  await db.weeklyReviews.bulkPut(weeklyReviews);
}

/** Xoá sạch database demo. Chỉ ảnh hưởng chế độ demo. */
export async function clearDemoData(): Promise<void> {
  await db.checkins.clear();
  await db.focusBlocks.clear();
  await db.brainDumps.clear();
  await db.cards.clear();
  await db.reviewLogs.clear();
  await db.predictions.clear();
  await db.experiments.clear();
  await db.experimentTags.clear();
  await db.weeklyReviews.clear();
}
