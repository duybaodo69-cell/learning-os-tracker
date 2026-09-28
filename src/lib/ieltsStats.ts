/**
 * Số liệu cho phần IELTS ở đầu tab Thống kê (Đợt 3) — hàm thuần, có test
 * (ieltsStats.test.ts). Mọi tuần là Thứ Hai → Chủ Nhật.
 *
 * Trung thực thống kê (CLAUDE.md): tuần ít câu thì đánh dấu "sơ bộ" kèm n,
 * tuần không có dữ liệu thì null (không vẽ), không bao giờ coi là 0%.
 */
import type { FocusBlock, MockTest } from "../db/types";
import { anchorWeek, errorSummary, rawToBand, FULL_TEST_QUESTIONS, type ScoredSkill } from "./ielts";
import { recentWeekStarts } from "./metrics";
import { addDays } from "./scheduling";
import { ieltsMinutes } from "./weekPlan";

/** Dưới số câu này trong một tuần thì % đúng / tỉ lệ lỗi là "sơ bộ". */
export const PRELIM_QUESTIONS = 20;

export type IeltsWeekPoint = {
  weekStart: string;
  /** Giờ IELTS của tuần (1 chữ số thập phân). */
  hours: number;
  /** % đúng Listening của các buổi luyện, null = tuần không làm đề Listening. */
  listeningPct: number | null;
  listeningQuestions: number;
  /** Thi thử trong tuần: điểm thô Listening /40 đổi ra % (cùng trục với % luyện). */
  mockPct: number | null;
  /** Band ≈ của lần thi thử đó (null nếu dưới bảng, hoặc tuần không thi). */
  mockBand: number | null;
  /** Số ngày giữ khung 9:30 trong tuần (0–7). */
  anchorDays: number;
};

/**
 * 8 tuần gần nhất (cũ -> mới), mỗi tuần: giờ IELTS, % đúng Listening, thi thử,
 * khung 9:30. Tuần có hai lần thi thử lấy lần sau cùng.
 */
export function ieltsWeekly(blocks: FocusBlock[], mocks: MockTest[], today: string, weeks = 8): IeltsWeekPoint[] {
  return recentWeekStarts(today, weeks)
    .reverse()
    .map((weekStart) => {
      const end = addDays(weekStart, 6);
      const l = errorSummary(blocks, "Listening", weekStart, end);
      const mock = mocks
        .filter((m) => m.date >= weekStart && m.date <= end && m.listeningRaw !== undefined)
        .sort((a, b) => a.date.localeCompare(b.date))
        .pop();
      return {
        weekStart,
        hours: Math.round((ieltsMinutes(blocks, weekStart, end) / 60) * 10) / 10,
        listeningPct: l.questions > 0 ? Math.round((l.correct * 100) / l.questions) : null,
        listeningQuestions: l.questions,
        // Nhân 100 TRƯỚC khi chia: 23 / 40 * 100 = 57.49999… (sai số dấu phẩy động).
        mockPct: mock ? Math.round(((mock.listeningRaw as number) * 100) / FULL_TEST_QUESTIONS) : null,
        mockBand: mock ? rawToBand("Listening", mock.listeningRaw as number) : null,
        anchorDays: anchorWeek(blocks, weekStart).filter((d) => d.held).length,
      };
    });
}

export type ErrorWeekPoint = {
  weekStart: string;
  /** Số câu đã làm trong tuần (n). */
  questions: number;
  prelim: boolean;
  /**
   * Số câu sai mỗi loại TÍNH TRÊN 10 CÂU (1 chữ số thập phân), để tuần làm
   * nhiều đề và tuần làm ít đề so được với nhau. null = tuần không làm đề.
   * Tổng 4 ô = số câu sai trên 10 câu.
   */
  e0: number | null;
  e1: number | null;
  e2: number | null;
  e3: number | null;
};

const per10 = (n: number, q: number) => Math.round((n / q) * 100) / 10;

/** Xu hướng 4 loại lỗi của MỘT kỹ năng, 8 tuần (cũ -> mới). Hai bộ lỗi không trộn. */
export function errorWeekly(blocks: FocusBlock[], skill: ScoredSkill, today: string, weeks = 8): ErrorWeekPoint[] {
  return recentWeekStarts(today, weeks)
    .reverse()
    .map((weekStart) => {
      const s = errorSummary(blocks, skill, weekStart, addDays(weekStart, 6));
      const q = s.questions;
      const v = (i: number) => (q > 0 ? per10(s.errors[i], q) : null);
      return { weekStart, questions: q, prelim: q < PRELIM_QUESTIONS, e0: v(0), e1: v(1), e2: v(2), e3: v(3) };
    });
}

/** Có tuần nào đủ dữ liệu để vẽ không. */
export function hasErrorData(points: ErrorWeekPoint[]): boolean {
  return points.some((p) => p.questions > 0);
}
