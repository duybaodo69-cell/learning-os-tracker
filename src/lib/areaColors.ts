/**
 * Mỗi area có MỘT màu cố định, dùng chung cho màn hình Hôm nay và các biểu đồ.
 *
 * Vì sao cố định theo area chứ không theo thứ tự: nếu tô màu theo thứ tự
 * xuất hiện thì "IELTS" hôm nay màu xanh, mai lại màu vàng — mắt không bao
 * giờ học được màu nào là area nào.
 */
import type { Area } from "../db/types";

/*
 * Giá trị là BIẾN CSS (khai báo ở src/index.css, cả hai theme), nên cùng một
 * area tự đổi sang bản đậm hơn trên nền sáng. Họ màu nước "Mặt hồ đêm":
 * ngọc lam, sapphire, lam dừa cạn, bạc trăng... — mỗi màu >= 3:1 trên nền thẻ.
 * Dùng được trực tiếp trong style={{ backgroundColor }} và fill/stroke của SVG.
 */
export const AREA_COLORS: Record<Area, string> = {
  "Internship VC": "var(--area-vc)",
  "IM/Memo": "var(--area-memo)",
  "Financial modeling": "var(--area-model)",
  IELTS: "var(--area-ielts)",
  EFM: "var(--area-efm)",
  AFEP: "var(--area-afep)",
  BFN: "var(--area-bfn)",
  "Stock competition": "var(--area-stock)",
  "M&A sourcing": "var(--area-ma)",
  Other: "var(--area-other)",
};

/** Màu của một area; chuỗi lạ (dữ liệu cũ) thì trả về màu "Other". */
export function areaColor(area: string): string {
  return (AREA_COLORS as Record<string, string>)[area] ?? "var(--area-other)";
}
