/**
 * Câu hỏi follow up của tổng kết tuần: điều chỉnh đã chọn tuần trước có làm
 * được không. Giá trị lưu ở WeeklyReview.lastChangeResult.
 */
import type { WeeklyReview } from "../db/types";

/** Ba câu trả lời cho "điều chỉnh tuần trước có làm được không". */
export const CHANGE_RESULTS = [
  { id: "yes", label: "Làm được" },
  { id: "partly", label: "Một phần" },
  { id: "no", label: "Chưa" },
] as const;
export type ChangeResult = (typeof CHANGE_RESULTS)[number]["id"];

export function changeResultLabel(r: WeeklyReview["lastChangeResult"]): string | null {
  return CHANGE_RESULTS.find((x) => x.id === r)?.label ?? null;
}

