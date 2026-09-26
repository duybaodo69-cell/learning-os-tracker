/**
 * Mỗi area có MỘT màu cố định, dùng chung cho màn hình Hôm nay và các biểu đồ.
 *
 * Vì sao cố định theo area chứ không theo thứ tự: nếu tô màu theo thứ tự
 * xuất hiện thì "IELTS" hôm nay màu xanh, mai lại màu vàng — mắt không bao
 * giờ học được màu nào là area nào.
 */
import type { Area } from "../db/types";

export const AREA_COLORS: Record<Area, string> = {
  "Internship VC": "#38bdf8",
  "IM/Memo": "#a5b4fc",
  "Financial modeling": "#10b981",
  IELTS: "#f59e0b",
  EFM: "#f472b6",
  AFEP: "#2dd4bf",
  BFN: "#c084fc",
  "Stock competition": "#fb923c",
  "M&A sourcing": "#84cc16",
  Other: "#94a3b8",
};

/** Màu của một area; chuỗi lạ (dữ liệu cũ) thì trả về xám trung tính. */
export function areaColor(area: string): string {
  return (AREA_COLORS as Record<string, string>)[area] ?? "#94a3b8";
}
