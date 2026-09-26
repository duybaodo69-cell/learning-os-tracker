/**
 * Chế độ tối / sáng.
 *
 * Toàn bộ màu của app là biến CSS (xem src/index.css). Đổi theme chỉ là đặt
 * thuộc tính data-theme trên thẻ <html>: CSS sẽ đổi bộ giá trị biến, mọi
 * màn hình tự đổi theo mà không cần sửa class nào.
 *
 *   "dark"  — thiết kế Quantitative Protocol (mặc định)
 *   "light" — bảng màu trước đó: nền trắng, nhấn xanh dương
 *
 * Lựa chọn lưu trong localStorage: đây là sở thích của riêng máy này,
 * không phải dữ liệu học tập, nên không cần nằm trong file sao lưu.
 *
 * index.html có một đoạn script nhỏ đọc cùng khoá này TRƯỚC khi trang
 * hiện ra, để mở app không bị chớp màn hình tối rồi mới sang sáng.
 * Đổi tên khoá ở đây thì phải đổi cả ở đó.
 */

export type Theme = "dark" | "light";

export const THEME_KEY = "learning-os:theme";

/** Màu thanh trạng thái điện thoại cho từng theme (trùng màu nền app). */
export const THEME_STATUS_COLOR: Record<Theme, string> = {
  dark: "#0c0e12",
  light: "#f8fafc",
};

/** Theme đã lưu. Không có hoặc giá trị lạ thì dùng tối. */
export function getTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Áp theme lên trang: thuộc tính <html data-theme> và màu thanh trạng thái. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_STATUS_COLOR[theme]);
}

/** Lưu và áp theme mới. */
export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* không lưu được thì vẫn đổi cho phiên này */
  }
  applyTheme(theme);
}
