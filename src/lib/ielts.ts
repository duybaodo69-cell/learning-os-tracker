/**
 * Toàn bộ phép tính IELTS của app (Đợt 1) — hàm thuần, có test (ielts.test.ts).
 *
 * Nguồn sự thật là docs/PRODUCT.md:
 *   mục 3  — bảng quy đổi điểm thô -> band, cách làm tròn overall, thứ tự đề,
 *            định nghĩa "giữ khung 9:30"
 *   mục 7  — 4 loại lỗi Listening ①–④
 *   mục 7b — 4 loại lỗi Reading Ⓐ–Ⓓ
 * Sửa định nghĩa thì sửa Ở ĐÂY, mọi màn hình đổi theo.
 */
import type { FocusBlock, IeltsSession, IeltsSkill, IeltsTestResult, MockTest } from "../db/types";
import { IELTS_SKILLS } from "../db/types";
import { addDays } from "./scheduling";
import { mondayOf } from "./metrics";
import { isIntIn, isNumberIn } from "./validation";

/* ==================== Đề: sách, test, phần ==================== */

/** Cam 10 → 19 (luyện Cam 10–14; 15–19 để dành, vd thi thử 1 và 3). */
export const FIRST_BOOK = 10;
export const LAST_BOOK = 19;
export const TESTS_PER_BOOK = 4;

/** Kỹ năng có đề và điểm thô. Writing/Speaking chỉ ghi band AI. */
export type ScoredSkill = "Listening" | "Reading";

export function isScoredSkill(skill: IeltsSkill): skill is ScoredSkill {
  return skill === "Listening" || skill === "Reading";
}

/**
 * Số câu mặc định của từng phần.
 * Listening: 4 section × 10 câu. Reading: 3 passage, 13 / 13 / 14 câu
 * (vài đề chia khác — form cho sửa tổng số câu).
 */
export const PART_QUESTIONS: Record<ScoredSkill, readonly number[]> = {
  Listening: [10, 10, 10, 10],
  Reading: [13, 13, 14],
};

/** Số phần trong một test: Listening 4, Reading 3. */
export function partCount(skill: ScoredSkill): number {
  return PART_QUESTIONS[skill].length;
}

/** "Section" hay "Passage". */
export function partName(skill: ScoredSkill): string {
  return skill === "Listening" ? "Section" : "Passage";
}

/** Chữ viết tắt trên chip: S1 / P1. */
export function partShort(skill: ScoredSkill, part: number): string {
  return `${skill === "Listening" ? "S" : "P"}${part}`;
}

/** Tổng số câu mặc định của các phần đã chọn. */
export function defaultQuestions(skill: ScoredSkill, parts: number[]): number {
  return parts.reduce((sum, p) => sum + (PART_QUESTIONS[skill][p - 1] ?? 0), 0);
}

/** "Cam 10 · Test 1 · S1+S2". */
export function formatTestRef(skill: ScoredSkill, t: { book: number; test: number; parts: number[] }): string {
  const parts = t.parts.map((p) => partShort(skill, p)).join("+");
  return `Cam ${t.book} · Test ${t.test} · ${parts}`;
}

/** Một vị trí trong chuỗi đề: sách, test, phần. */
export type TestPosition = { book: number; test: number; part: number };

/** Vị trí đầu tiên: Cam 10 · Test 1 · phần 1. */
export const FIRST_POSITION: TestPosition = { book: FIRST_BOOK, test: 1, part: 1 };

/**
 * Phần ngay sau một vị trí. Hết phần -> test kế tiếp; hết test -> sách kế tiếp.
 * Sau phần cuối của Cam 19 thì hết đề: trả về null.
 */
export function positionAfter(skill: ScoredSkill, pos: TestPosition): TestPosition | null {
  if (pos.part < partCount(skill)) return { ...pos, part: pos.part + 1 };
  if (pos.test < TESTS_PER_BOOK) return { book: pos.book, test: pos.test + 1, part: 1 };
  if (pos.book < LAST_BOOK) return { book: pos.book + 1, test: 1, part: 1 };
  return null;
}

/**
 * "Đề tiếp theo" của một kỹ năng (PRODUCT.md mục 3):
 * phần ngay sau phần cuối cùng ĐÃ GHI của kỹ năng đó.
 *
 * "Đã ghi cuối cùng" = phiên gần nhất theo ngày rồi giờ bắt đầu — không phải
 * đề "xa nhất". Làm lại một đề cũ thì gợi ý đi tiếp từ đề đó.
 * Trong phiên ấy lấy phần có số lớn nhất (làm S1+S2 -> tiếp theo là S3).
 *
 * Chưa ghi gì: Cam 10 · Test 1 · phần 1. Hết đề: null.
 */
export function nextTest(blocks: FocusBlock[], skill: ScoredSkill): TestPosition | null {
  let last: { block: FocusBlock; test: IeltsTestResult } | null = null;
  for (const b of blocks) {
    const t = b.ielts?.test;
    if (b.area !== "IELTS" || b.ielts?.skill !== skill || !t || t.parts.length === 0) continue;
    if (
      last === null ||
      b.date > last.block.date ||
      (b.date === last.block.date && b.startTime > last.block.startTime)
    ) {
      last = { block: b, test: t };
    }
  }
  if (last === null) return FIRST_POSITION;
  const { book, test, parts } = last.test;
  return positionAfter(skill, { book, test, part: Math.max(...parts) });
}

/* ==================== Loại lỗi ==================== */

export type ErrorType = { mark: string; label: string; hint: string };

/** PRODUCT.md mục 7 — hỏi theo thứ tự này. */
export const LISTENING_ERRORS: readonly ErrorType[] = [
  { mark: "①", label: "Không nghe ra", hint: "Nghe lại vẫn không nhận ra từ đáp án" },
  { mark: "②", label: "Viết sai", hint: "Nghe ra nhưng sai chính tả, số ít/nhiều, số liệu, quá số từ" },
  { mark: "③", label: "Bẫy / paraphrase", hint: "Chọn/viết thông tin khác có trong bài" },
  { mark: "④", label: "Lạc chỗ", hint: "Không phải 3 loại trên: lỡ câu, lạc chỗ" },
];

/** PRODUCT.md mục 7b — bộ lỗi RIÊNG của Reading, không trộn với Listening. */
export const READING_ERRORS: readonly ErrorType[] = [
  { mark: "Ⓐ", label: "Hết giờ", hint: "Không kịp làm, bỏ trống hoặc đoán bừa" },
  { mark: "Ⓑ", label: "Không tìm ra chỗ", hint: "Không tìm ra đoạn chứa đáp án (lỡ paraphrase)" },
  { mark: "Ⓒ", label: "Hiểu sai câu", hint: "Đúng đoạn nhưng hiểu sai nghĩa (từ vựng, câu phức)" },
  { mark: "Ⓓ", label: "Sai logic / format", hint: "Nhầm False/Not Given, quá số từ, chép sai chính tả" },
];

export function errorTypes(skill: ScoredSkill): readonly ErrorType[] {
  return skill === "Listening" ? LISTENING_ERRORS : READING_ERRORS;
}

/* ==================== Quy đổi band ==================== */

/**
 * Bảng quy đổi (PRODUCT.md mục 3) — là ƯỚC LƯỢNG, màn hình luôn ghi "≈".
 * Mỗi dòng: [điểm thô thấp nhất của band, band]. Đọc từ trên xuống, gặp
 * dòng đầu tiên có điểm thô <= điểm của bạn là xong.
 */
const LISTENING_TABLE: readonly [number, number][] = [
  [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5],
  [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4],
];
/** Reading ACADEMIC. General Training quy đổi khác — app giả định bạn thi Academic. */
const READING_TABLE: readonly [number, number][] = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5],
  [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4],
];

/** Tổng số câu một bài thi đầy đủ. Chỉ quy đổi band khi làm đủ 40 câu. */
export const FULL_TEST_QUESTIONS = 40;

/**
 * Điểm thô /40 -> band ≈.
 * null khi: không phải số nguyên 0-40, hoặc dưới 10 (bảng trong PRODUCT.md
 * chỉ tới 4.0 — không đoán thêm).
 */
export function rawToBand(skill: ScoredSkill, raw: number): number | null {
  if (!isIntIn(raw, 0, FULL_TEST_QUESTIONS)) return null;
  const table = skill === "Listening" ? LISTENING_TABLE : READING_TABLE;
  for (const [min, band] of table) if (raw >= min) return band;
  return null;
}

/**
 * Band của một đề luyện: chỉ khi làm đủ 40 câu. Làm 1–2 section thì null —
 * màn hình hiện điểm thô và % đúng, không hiện band (PRODUCT.md mục 3).
 */
export function practiceBand(skill: ScoredSkill, t: IeltsTestResult): number | null {
  return t.questions === FULL_TEST_QUESTIONS ? rawToBand(skill, t.correct) : null;
}

/** Band hợp lệ: 0 → 9, bước 0.5. */
export function isBand(v: unknown): v is number {
  return isNumberIn(v, 0, 9) && Number.isInteger(v * 2);
}

/** Các band hay gặp, làm chip chọn nhanh cho Writing/Speaking. */
export const BAND_CHOICES: readonly number[] = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

/** 7 -> "7.0", 6.5 -> "6.5". */
export function formatBand(band: number): string {
  return band.toFixed(1);
}

/**
 * Overall = trung bình 4 kỹ năng, làm tròn tới 0.5 gần nhất; x.25 lên x.5,
 * x.75 lên số tròn kế tiếp (PRODUCT.md mục 3).
 * Nhân 2 để đưa về "làm tròn tới số nguyên gần nhất, .5 thì lên": floor(x + 0.5).
 * Band là bội của 0.5 nên trung bình là bội của 0.125 — số nhị phân chính xác,
 * không có sai số dấu phẩy động ở các mốc .25 / .75.
 */
export function overallBand(l: number, r: number, w: number, s: number): number {
  const avg = (l + r + w + s) / 4;
  return Math.floor(avg * 2 + 0.5) / 2;
}

/* ==================== Thi thử ==================== */

export type MockBands = {
  listening: number | null;
  reading: number | null;
  writing: number | null;
  speaking: number | null;
  /** null khi thiếu bất kỳ kỹ năng nào. */
  overall: number | null;
};

export function mockBands(m: MockTest): MockBands {
  const listening = m.listeningRaw === undefined ? null : rawToBand("Listening", m.listeningRaw);
  const reading = m.readingRaw === undefined ? null : rawToBand("Reading", m.readingRaw);
  const writing = m.writingBand ?? null;
  const speaking = m.speakingBand ?? null;
  const overall =
    listening !== null && reading !== null && writing !== null && speaking !== null
      ? overallBand(listening, reading, writing, speaking)
      : null;
  return { listening, reading, writing, speaking, overall };
}

export const MOCK_SOURCE_LABELS: Record<MockTest["source"], string> = {
  home: "Ở nhà",
  center: "Trung tâm",
  ai: "AI chấm",
};

/** Kiểm tra form thi thử. null = hợp lệ. */
export function checkMockTest(m: Omit<MockTest, "id">): string | null {
  const any =
    m.listeningRaw !== undefined ||
    m.readingRaw !== undefined ||
    m.writingBand !== undefined ||
    m.speakingBand !== undefined;
  if (!any) return "Nhập ít nhất một kỹ năng.";
  for (const [raw, name] of [
    [m.listeningRaw, "Listening"],
    [m.readingRaw, "Reading"],
  ] as const) {
    if (raw !== undefined && !isIntIn(raw, 0, FULL_TEST_QUESTIONS)) {
      return `${name}: điểm thô là số nguyên từ 0 đến 40.`;
    }
  }
  for (const [band, name] of [
    [m.writingBand, "Writing"],
    [m.speakingBand, "Speaking"],
  ] as const) {
    if (band !== undefined && !isBand(band)) return `${name}: band từ 0 đến 9, bước 0.5.`;
  }
  return null;
}

/* ==================== Khung 9:30 ==================== */

/**
 * Giữ khung 9:30 (PRODUCT.md mục 3): trong ngày có một phiên area IELTS
 * bắt đầu từ 9:00 đến 10:30 (tính CẢ HAI đầu) và dài >= 45 phút.
 * So sánh chuỗi "HH:mm" được vì luôn đủ 2 chữ số.
 */
export const ANCHOR_FROM = "09:00";
export const ANCHOR_TO = "10:30";
export const ANCHOR_MIN_MINUTES = 45;

export function holdsAnchor(b: FocusBlock): boolean {
  return (
    b.area === "IELTS" &&
    b.startTime >= ANCHOR_FROM &&
    b.startTime <= ANCHOR_TO &&
    b.minutes >= ANCHOR_MIN_MINUTES
  );
}

export type AnchorDay = { date: string; held: boolean };

/**
 * 7 ngày Thứ Hai → Chủ Nhật của tuần chứa `today`, ngày nào giữ khung.
 * Đếm NGÀY (hai phiên hợp lệ cùng ngày vẫn là 1), không đếm chuỗi.
 */
export function anchorWeek(blocks: FocusBlock[], today: string): AnchorDay[] {
  const monday = mondayOf(today);
  const held = new Set(blocks.filter(holdsAnchor).map((b) => b.date));
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    return { date, held: held.has(date) };
  });
}

/* ==================== Form kết thúc phiên ==================== */

/**
 * Trạng thái phần IELTS trong form (khác với dữ liệu lưu: có cả những ô
 * chưa điền). `correct: null` = chưa nhập số câu đúng.
 */
export type IeltsDraft = {
  skill: IeltsSkill;
  noTest: boolean;
  book: number;
  test: number;
  parts: number[];
  questions: number;
  correct: number | null;
  errors: [number, number, number, number];
  dictationMinutes: number;
  aiBand: number | null;
};

/** Chip phút chép chính tả (chỉ Listening). */
export const DICTATION_CHOICES = [0, 5, 10, 15] as const;

/**
 * Form mới cho một kỹ năng: điền sẵn đề tiếp theo của CHÍNH kỹ năng đó,
 * chọn sẵn 1 phần (quyết định của chủ app 2026-09-27).
 * Hết đề (sau Cam 19) thì để Cam 19 · Test 4, không chọn phần nào.
 */
export function newDraft(skill: IeltsSkill, blocks: FocusBlock[]): IeltsDraft {
  const base: IeltsDraft = {
    skill,
    noTest: false,
    book: FIRST_BOOK,
    test: 1,
    parts: [],
    questions: 0,
    correct: null,
    errors: [0, 0, 0, 0],
    dictationMinutes: 0,
    aiBand: null,
  };
  if (!isScoredSkill(skill)) return base;
  const next = nextTest(blocks, skill);
  if (next === null) return { ...base, book: LAST_BOOK, test: TESTS_PER_BOOK };
  return { ...base, book: next.book, test: next.test, parts: [next.part], questions: defaultQuestions(skill, [next.part]) };
}

/** Mở lại một phiên đã lưu để sửa. */
export function draftFromSession(s: IeltsSession): IeltsDraft {
  return {
    skill: s.skill,
    noTest: isScoredSkill(s.skill) && s.test === undefined,
    book: s.test?.book ?? FIRST_BOOK,
    test: s.test?.test ?? 1,
    parts: s.test?.parts ?? [],
    questions: s.test?.questions ?? 0,
    correct: s.test?.correct ?? null,
    errors: s.test?.errors ?? [0, 0, 0, 0],
    dictationMinutes: s.dictationMinutes ?? 0,
    aiBand: s.aiBand ?? null,
  };
}

/** Bật/tắt một phần; tổng số câu tính lại theo mặc định của các phần đã chọn. */
export function toggleDraftPart(d: IeltsDraft, part: number): IeltsDraft {
  if (!isScoredSkill(d.skill)) return d;
  const parts = d.parts.includes(part) ? d.parts.filter((p) => p !== part) : [...d.parts, part].sort((a, b) => a - b);
  return { ...d, parts, questions: defaultQuestions(d.skill, parts) };
}

/** Số câu sai = đã làm − đúng. null khi chưa nhập số câu đúng. */
export function wrongCount(d: IeltsDraft): number | null {
  return d.correct === null ? null : d.questions - d.correct;
}

export function errorTotal(errors: readonly number[]): number {
  return errors.reduce((a, b) => a + b, 0);
}

/**
 * Lỗi đầu tiên của phần IELTS, hoặc null nếu lưu được.
 * Luật chính (PRODUCT.md mục 7/7b): tổng 4 loại lỗi PHẢI bằng số câu sai.
 */
export function draftError(d: IeltsDraft): string | null {
  if (!isScoredSkill(d.skill)) {
    return d.aiBand === null || isBand(d.aiBand) ? null : "Band AI từ 0 đến 9, bước 0.5.";
  }
  if (d.noTest) return null;
  const unit = partName(d.skill).toLowerCase();
  if (d.parts.length === 0) return `Chọn ít nhất một ${unit} (hoặc bấm "Không làm đề").`;
  if (!isIntIn(d.questions, 1, FULL_TEST_QUESTIONS)) return "Số câu đã làm là số nguyên từ 1 đến 40.";
  if (d.correct === null) return "Nhập số câu đúng.";
  if (!isIntIn(d.correct, 0, d.questions)) return `Số câu đúng là số nguyên từ 0 đến ${d.questions}.`;
  const wrong = d.questions - d.correct;
  const sorted = errorTotal(d.errors);
  if (sorted !== wrong) return `Đã phân loại ${sorted}/${wrong} câu sai — phải khớp mới lưu được.`;
  return null;
}

/** Dữ liệu sẽ lưu vào FocusBlock.ielts. Chỉ gọi khi draftError(d) === null. */
export function draftToSession(d: IeltsDraft): IeltsSession {
  if (!isScoredSkill(d.skill)) {
    return d.aiBand === null ? { skill: d.skill } : { skill: d.skill, aiBand: d.aiBand };
  }
  const session: IeltsSession = { skill: d.skill };
  if (!d.noTest && d.correct !== null) {
    session.test = {
      book: d.book,
      test: d.test,
      parts: [...d.parts],
      questions: d.questions,
      correct: d.correct,
      errors: [...d.errors] as IeltsTestResult["errors"],
    };
  }
  if (d.skill === "Listening" && d.dictationMinutes > 0) session.dictationMinutes = d.dictationMinutes;
  return session;
}

/** Một dòng tóm tắt cho danh sách block: "Listening · Cam 10 · Test 1 · S1 · 7/10". */
export function sessionSummary(s: IeltsSession): string {
  const bits: string[] = [s.skill];
  if (isScoredSkill(s.skill) && s.test) {
    bits.push(formatTestRef(s.skill, s.test), `${s.test.correct}/${s.test.questions}`);
    const band = practiceBand(s.skill, s.test);
    if (band !== null) bits.push(`≈ ${formatBand(band)}`);
  } else if (isScoredSkill(s.skill)) {
    bits.push("không làm đề");
  }
  if (s.dictationMinutes) bits.push(`chép ${s.dictationMinutes}p`);
  if (s.aiBand !== undefined) bits.push(`AI ${formatBand(s.aiBand)}`);
  return bits.join(" · ");
}

/* ==================== Kiểm tra dữ liệu từ file sao lưu ==================== */

const nonNegInt = (v: unknown) => isIntIn(v, 0, Number.MAX_SAFE_INTEGER);

/**
 * Trường `ielts` của một block trong file sao lưu có đúng HÌNH không.
 * Chỉ chặn thứ làm hỏng màn hình (sai kiểu, thiếu trường). Tổng lỗi lệch số
 * câu sai thì vẫn nhận — không làm hỏng gì, và không bao giờ chặn khôi phục
 * dữ liệu của chính bạn.
 */
export function isValidIeltsSession(v: unknown): boolean {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const s = v as Record<string, unknown>;
  if (!(IELTS_SKILLS as readonly unknown[]).includes(s.skill)) return false;
  if (s.dictationMinutes !== undefined && !nonNegInt(s.dictationMinutes)) return false;
  if (s.aiBand !== undefined && !isBand(s.aiBand)) return false;
  if (s.test === undefined) return true;
  if (typeof s.test !== "object" || s.test === null) return false;
  const t = s.test as Record<string, unknown>;
  return (
    isIntIn(t.book, 1, 99) &&
    isIntIn(t.test, 1, TESTS_PER_BOOK) &&
    Array.isArray(t.parts) &&
    t.parts.every((p) => isIntIn(p, 1, 4)) &&
    nonNegInt(t.questions) &&
    nonNegInt(t.correct) &&
    Array.isArray(t.errors) &&
    t.errors.length === 4 &&
    t.errors.every(nonNegInt)
  );
}
