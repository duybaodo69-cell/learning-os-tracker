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
import { anchorDelayId, checkinId, weekReviewId } from "./keys";
import type { AnchorDelay, Area, BrainDump, Card, CardSource, DailyCheckin, Deadline, Experiment, ExperimentTag, FocusBlock, Grade, IeltsSession, MockTest, Prediction, PredictionCategory, ReviewLog, Rating, WeeklyReview } from "./types";
import { newId } from "../lib/dates";
import { START_EASE, addDays } from "../lib/scheduling";
import { experimentTagKey, mondayOf } from "../lib/metrics";
import { FIRST_POSITION, defaultQuestions, positionAfter, type TestPosition } from "../lib/ielts";

/** Trừ đi n ngày từ một chuỗi "YYYY-MM-DD". */
function minusDays(iso: string, n: number): string {
  return addDays(iso, -n);
}

const DEMO_AREAS: Area[] = ["Internship VC", "Financial modeling", "IELTS", "IM/Memo", "EFM"];

/**
 * Tạo dữ liệu mẫu (14 ngày; IELTS 8 tuần cho biểu đồ Đợt 3): check-in, focus block, brain dump,
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
      id: checkinId(date),
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

  /* ---------- IELTS (Đợt 1, kéo dài 8 tuần ở Đợt 3) ----------
     8 tuần để các biểu đồ IELTS ở Thống kê có xu hướng: số câu đúng tăng dần,
     lỗi ① giảm dần, ③ nhích lên. Mỗi ngày trừ Thứ Năm một buổi Listening lúc 9:30, đi tiếp theo thứ tự đề
     (Cam 10 · Test 1 · S1, S2, ...), Thứ Hai / Thứ Bảy thêm một passage
     Reading. Vài buổi cố ý NGOÀI khung 9:30 (bắt đầu 11:00, hoặc chỉ 30 phút)
     để thấy "Khung 9:30" không đếm chúng. Một buổi "không làm đề". */
  let listenPos: TestPosition | null = FIRST_POSITION;
  let readPos: TestPosition | null = FIRST_POSITION;
  const IELTS_DAYS = 55;
  for (let i = IELTS_DAYS; i >= 0; i--) {
    const date = minusDays(today, i);
    const [y, m, d] = date.split("-").map(Number);
    const weekday = new Date(y, m - 1, d).getDay(); // 0 = Chủ Nhật
    if (weekday === 4) continue; // Thứ Năm nghỉ — có ngày trống để thấy x/7 < 7
    // Vài tuần cũ nghỉ thêm Thứ Ba để số ngày giữ khung mỗi tuần khác nhau.
    if (weekday === 2 && i > 20 && i % 3 === 0) continue;
    const progress = (IELTS_DAYS - i) / IELTS_DAYS; // 0 (8 tuần trước) -> 1 (hôm nay)

    // Buổi Listening. i % 5 === 2: bắt đầu muộn (ngoài khung).
    // i % 6 === 3: chỉ chép chính tả, không làm đề.
    const noTest = i % 6 === 3;
    let ielts: IeltsSession;
    if (noTest || listenPos === null) {
      ielts = { skill: "Listening", dictationMinutes: 15 };
    } else {
      // 4-6 đúng lúc đầu, 7-9 gần đây (dao động ±1 theo ngày).
      const correct = Math.min(10, Math.max(3, Math.round(4.5 + progress * 3.5 + ((i % 3) - 1))));
      const wrong = 10 - correct;
      // Chia số câu sai vào 4 loại: ① nhiều nhất lúc đầu (L 5.5), giảm dần theo tiến độ.
      const e1 = Math.min(wrong, Math.round(wrong * (0.6 - progress * 0.35)));
      const e2 = Math.min(1, wrong - e1);
      const e4 = wrong - e1 - e2 > 1 && i % 4 === 0 ? 1 : 0;
      const e3 = wrong - e1 - e2 - e4;
      ielts = {
        skill: "Listening",
        test: { book: listenPos.book, test: listenPos.test, parts: [listenPos.part], questions: 10, correct, errors: [e1, e2, e3, e4] },
        dictationMinutes: [5, 10][i % 2],
      };
      listenPos = positionAfter("Listening", listenPos);
    }
    blocks.push({
      id: newId(),
      date,
      startTime: i % 5 === 2 ? "11:00" : "09:30",
      minutes: i % 7 === 1 ? 30 : 55,
      area: "IELTS",
      focusRating: (((i + 2) % 5) + 1) as Rating,
      distractions: i % 3,
      phoneAway: true,
      resumeNote: "[MẪU] buổi IELTS xem thử",
      ielts,
    });

    // Thêm một passage Reading vào Thứ Hai và Thứ Bảy (ngày L + R, PRODUCT.md mục 4).
    if ((weekday === 1 || weekday === 6) && readPos !== null) {
      const questions = defaultQuestions("Reading", [readPos.part]);
      const wrongR = Math.max(1, Math.round(5 - progress * 2));
      const correct = questions - wrongR;
      // Ⓑ nhiều nhất; Ⓐ (hết giờ) chỉ ở các tuần đầu.
      const ra = progress < 0.4 ? 1 : 0;
      const rd = wrongR - ra > 1 ? 1 : 0;
      const rb = wrongR - ra - rd;
      blocks.push({
        id: newId(),
        date,
        startTime: "10:30",
        minutes: 25,
        area: "IELTS",
        focusRating: 3,
        distractions: 1,
        phoneAway: true,
        resumeNote: "[MẪU] passage xem thử",
        ielts: {
          skill: "Reading",
          test: { book: readPos.book, test: readPos.test, parts: [readPos.part], questions, correct, errors: [ra, rb, 0, rd] },
        },
      });
      readPos = positionAfter("Reading", readPos);
    }
  }

  // Một bài Writing do AI chấm.
  blocks.push({
    id: newId(),
    date: minusDays(today, 1),
    startTime: "14:00",
    minutes: 45,
    area: "IELTS",
    focusRating: 4,
    distractions: 0,
    phoneAway: false,
    resumeNote: "[MẪU] Writing Task 2",
    ielts: { skill: "Writing", aiBand: 6 },
  });

  /* Thi thử: baseline ở nhà (đủ 4 kỹ năng -> có overall) và một bài AI
     chỉ chấm Writing (thiếu kỹ năng -> không có overall). */
  const mockTests: MockTest[] = [
    {
      id: newId(),
      date: minusDays(today, 45),
      source: "home",
      listeningRaw: 18,
      readingRaw: 28,
      note: "[MẪU] thi thử cũ (chỉ L + R)",
    },
    {
      id: newId(),
      date: minusDays(today, 10),
      source: "home",
      listeningRaw: 21,
      readingRaw: 30,
      writingBand: 6,
      speakingBand: 6,
      note: "[MẪU] thi thử 0 — baseline",
    },
    {
      id: newId(),
      date: minusDays(today, 2),
      source: "ai",
      writingBand: 6.5,
      note: "[MẪU] AI chấm Task 2",
    },
  ];

  /* ---------- Thẻ ôn tập ----------
     Cố ý trải đều nhiều trạng thái để xem thử được mọi màn hình:
       - vài thẻ đến hạn HÔM NAY  -> hàng đợi ôn có việc để làm
       - vài thẻ hạn trong tương lai -> badge không bị phồng
       - vài thẻ chưa có mặt sau  -> thấy cảnh báo ở tab Thẻ
       - vài thẻ từng quên        -> có lapses để thống kê Phase 4 */
  const cards: Card[] = [];
  const logs: ReviewLog[] = [];

  const CARD_SEEDS: { front: string; back: string; area: Area; source?: CardSource }[] = [
    { front: "[MẪU] WACC tính thế nào?", back: "E/V·Re + D/V·Rd·(1−t)", area: "Financial modeling" },
    { front: "[MẪU] FCFF khác FCFE ở đâu?", back: "FCFF trước trả nợ, FCFE sau trả nợ.", area: "Financial modeling" },
    { front: "[MẪU] Terminal value: hai cách tính?", back: "Gordon growth và exit multiple.", area: "Financial modeling" },
    { front: "[MẪU] Beta unlevered công thức?", back: "βL / (1 + (1−t)·D/E)", area: "Financial modeling" },
    { front: "[MẪU] Term sheet: liquidation preference là gì?", back: "Thứ tự và bội số được chia khi thanh lý.", area: "Internship VC" },
    { front: "[MẪU] Pro-rata rights nghĩa là gì?", back: "Quyền góp thêm để giữ nguyên tỷ lệ sở hữu.", area: "Internship VC" },
    { front: "[MẪU] Cohort retention đọc thế nào?", back: "Tỷ lệ còn hoạt động theo tháng kể từ lúc vào.", area: "Internship VC" },
    { front: "[MẪU] IELTS Writing Task 1: mở bài gồm gì?", back: "Paraphrase đề + overview xu hướng chính.", area: "IELTS" },
    { front: "[MẪU] Từ nối chỉ tương phản?", back: "However, nevertheless, conversely, whereas.", area: "IELTS" },
    // Thẻ có nguồn (Đợt 3): lỗi nghe, từ vựng, lỗi Writing, góp ý manager.
    { front: "[MẪU] Nghe nhầm 'fifteen' / 'fifty'", back: "Trọng âm: fifTEEN (cuối) · FIFty (đầu).", area: "IELTS", source: "ielts-listening" },
    { front: "[MẪU] 'mitigate' nghĩa là?", back: "Làm giảm nhẹ (tác hại, rủi ro).", area: "IELTS", source: "ielts-vocab" },
    { front: "[MẪU] Lỗi lặp: mạo từ trước danh từ không đếm được", back: "Không dùng 'a/an': 'information', 'advice'.", area: "IELTS", source: "writing" },
    { front: "[MẪU] Góp ý: số liệu trong memo phải có nguồn", back: "Ghi nguồn + ngày ngay dưới mỗi bảng.", area: "Internship VC", source: "manager" },
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
      ...(seed.source ? { source: seed.source } : {}),
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

  /* ---------- Tổng kết tuần / chốt kế hoạch ----------
     3 tuần trước: dạng CŨ (3 câu hỏi viết tay) — để thấy tuần cũ vẫn đọc được.
     1 và 2 tuần trước: dạng MỚI (Đợt 3) có kế hoạch; kế hoạch chốt tuần trước
     là kế hoạch của TUẦN NÀY -> Hôm nay hiện "Kế hoạch tuần: Listening x/8". */
  const weeklyReviews: WeeklyReview[] = [
    {
      id: weekReviewId(mondayOf(minusDays(today, 21))),
      weekStart: mondayOf(minusDays(today, 21)),
      learnedWithoutNotes: "[MẪU] Dựng được mô hình DCF từ đầu mà không mở template.",
      dataInsight: "[MẪU] Ngày ngủ dưới 7h thì deep work hôm sau giảm rõ.",
      oneChange: "[MẪU] Tuần tới đặt giờ đi ngủ cố định 23:15.",
    },
    ...[2, 1].map((weeksAgo) => ({
      id: weekReviewId(mondayOf(minusDays(today, weeksAgo * 7))),
      weekStart: mondayOf(minusDays(today, weeksAgo * 7)),
      learnedWithoutNotes: "",
      dataInsight: "",
      oneChange: weeksAgo === 2 ? "[MẪU] Ra khỏi nhà 9:15, báo thức 8:00" : "[MẪU] Gạch chân từ khoá, đoán paraphrase trước khi nghe",
      lastChangeResult: weeksAgo === 1 ? ("partly" as const) : undefined,
      note: weeksAgo === 1 ? "[MẪU] Tuần sau có deadline nhóm AFEP." : undefined,
      plan: { listening: 8, reading: 6, light: false },
    })),
  ];

  /* Deadline tự thêm (Đợt 3): một cái trong 72 giờ (hiện ở Hôm nay), một cái xa hơn. */
  const deadlines: Deadline[] = [
    { id: newId(), date: addDays(today, 2), title: "[MẪU] Nộp báo cáo tuần cho manager" },
    { id: newId(), date: addDays(today, 6), title: "[MẪU] Slide nhóm AFEP" },
  ];

  // bulkPut = thêm mới hoặc ghi đè nếu trùng khoá.
  await db.dailyCheckins.bulkPut(checkins);
  await db.focusBlocks.bulkPut(blocks);
  await db.brainDumps.bulkPut(dumps);
  await db.cards.bulkPut(cards);
  await db.reviewLogs.bulkPut(logs);
  await db.predictions.bulkPut(predictions);
  await db.experiments.bulkPut([experiment]);
  await db.experimentTags.bulkPut(experimentTags);
  await db.weekReviews.bulkPut(weeklyReviews);
  await db.mockTests.bulkPut(mockTests);
  await db.deadlines.bulkPut(deadlines);

  /* Dời khung (Đợt 2): hai lần trong 14 ngày, lý do khác nhau. */
  const delays: AnchorDelay[] = [
    { id: anchorDelayId(minusDays(today, 3)), date: minusDays(today, 3), target: "evening", reason: "school", at: "10:40" },
    { id: anchorDelayId(minusDays(today, 9)), date: minusDays(today, 9), target: "after-class", reason: "work", at: "11:05" },
    { id: anchorDelayId(minusDays(today, 24)), date: minusDays(today, 24), target: "tomorrow", reason: "personal", at: "10:50" },
  ];
  await db.anchorDelays.bulkPut(delays);
}

/** Xoá sạch database demo. Chỉ ảnh hưởng chế độ demo. */
export async function clearDemoData(): Promise<void> {
  await db.dailyCheckins.clear();
  await db.focusBlocks.clear();
  await db.brainDumps.clear();
  await db.cards.clear();
  await db.reviewLogs.clear();
  await db.predictions.clear();
  await db.experiments.clear();
  await db.experimentTags.clear();
  await db.weekReviews.clear();
  await db.mockTests.clear();
  await db.anchorDelays.clear();
  await db.deadlines.clear();
}
