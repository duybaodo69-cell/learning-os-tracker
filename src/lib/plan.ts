/**
 * "Người giao việc" (Đợt 2) — hàm thuần, có test (plan.test.ts):
 *   - đếm ngược tới kỳ thi thử kế tiếp (lịch ở src/config/schedule.ts)
 *   - tuần nhẹ nhịp: tuần có thi môn -> chỉ giữ sàn 30 phút Listening
 *   - dời khung 9:30: khi nào hỏi, đếm số lần dời mỗi tuần
 *
 * Nguồn: docs/PRODUCT.md mục 3 (định nghĩa), 5 (mốc), 6 (luật dời khung).
 */
import { MILESTONES, type Milestone } from "../config/schedule";
import type { AnchorDelay, DelayReason, DelayTarget, FocusBlock } from "../db/types";
import { daysUntil } from "./dates";
import { mondayOf } from "./metrics";

/* ==================== Đếm ngược ==================== */

export type Countdown = {
  milestone: Milestone;
  /** Số ngày tới ngày bắt đầu. 0 = hôm nay (hoặc đang diễn ra). */
  daysLeft: number;
  /** Hôm nay nằm trong mốc (thi thử 2 ngày: cả hai ngày đều là "đang thi"). */
  ongoing: boolean;
};

/**
 * Kỳ thi thử kế tiếp (hoặc thi thật khi đã hết thi thử). Mốc đang diễn ra
 * vẫn được tính cho tới hết ngày cuối. Hết lịch: null.
 */
export function nextTestMilestone(today: string, milestones: readonly Milestone[] = MILESTONES): Countdown | null {
  const upcoming = milestones
    .filter((m) => (m.kind === "mock" || m.kind === "exam") && (m.to ?? m.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const m = upcoming[0];
  if (!m) return null;
  const ongoing = today >= m.date;
  return { milestone: m, daysLeft: ongoing ? 0 : daysUntil(today, m.date), ongoing };
}

/**
 * Tuần nhẹ nhịp: tuần (Thứ Hai → Chủ Nhật) chứa một kỳ thi môn.
 * Trả về mốc thi đó, hoặc null. Thi Chủ Nhật 11/10 -> cả tuần 5/10–11/10 nhẹ.
 */
export function lightWeekExam(today: string, milestones: readonly Milestone[] = MILESTONES): Milestone | null {
  const week = mondayOf(today);
  return milestones.find((m) => m.kind === "school-exam" && mondayOf(m.date) === week) ?? null;
}

/* ==================== Dời khung 9:30 ==================== */

/** Sau giờ này mà chưa có phiên IELTS thì hỏi "dời sang lúc nào?" (chủ app chốt 2026-09-28). */
export const DELAY_ASK_AFTER = "10:30";

/**
 * Có hiện câu hỏi dời khung không?
 * Chỉ khi: đã QUA 10:30, hôm nay chưa có phiên IELTS nào (bất kể giờ nào),
 * và hôm nay chưa dời. So sánh chuỗi "HH:mm" được vì luôn đủ 2 chữ số.
 */
export function shouldAskDelay(now: string, todaysBlocks: FocusBlock[], delayToday: AnchorDelay | null): boolean {
  if (now <= DELAY_ASK_AFTER) return false;
  if (delayToday) return false;
  return !todaysBlocks.some((b) => b.area === "IELTS");
}

/** Số lần dời trong tuần (Thứ Hai → Chủ Nhật) chứa `today`. Đếm ngày, mỗi ngày tối đa 1. */
export function delaysInWeek(delays: AnchorDelay[], today: string): number {
  const week = mondayOf(today);
  return new Set(delays.filter((d) => mondayOf(d.date) === week).map((d) => d.date)).size;
}

export const DELAY_TARGET_LABELS: Record<DelayTarget, string> = {
  "after-class": "Sau giờ học",
  evening: "Tối nay",
  tomorrow: "Mai",
};

export const DELAY_REASON_LABELS: Record<DelayReason, string> = {
  school: "Việc gấp của trường",
  work: "Việc gấp công ty",
  personal: "Việc riêng",
  other: "Khác",
};
