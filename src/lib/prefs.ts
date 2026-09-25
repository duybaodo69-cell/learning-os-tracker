/**
 * Ghi nhớ lựa chọn gần nhất, để lần sau mở form là điền sẵn.
 * Đây là một trong những mẹo chính giúp log dưới 30 giây.
 */
import type { Area } from "../db/types";
import { AREAS } from "../db/types";

const LAST_AREA_KEY = "learning-os:last-area";

/** Area dùng lần gần nhất. Mặc định "Internship VC" cho lần đầu tiên. */
export function getLastArea(): Area {
  try {
    const saved = localStorage.getItem(LAST_AREA_KEY);
    // Kiểm tra giá trị cũ còn hợp lệ không (phòng khi danh sách area đổi).
    if (saved && (AREAS as readonly string[]).includes(saved)) {
      return saved as Area;
    }
  } catch {
    /* bỏ qua */
  }
  return "Internship VC";
}

export function setLastArea(area: Area): void {
  try {
    localStorage.setItem(LAST_AREA_KEY, area);
  } catch {
    /* bỏ qua */
  }
}
