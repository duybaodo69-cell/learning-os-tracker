/**
 * Cỡ hiển thị: 100% / 125% / 150% (Cài đặt -> Giao diện).
 *
 * CÁCH PHÓNG: đổi cỡ chữ gốc của trang (thẻ <html>). Gần như mọi kích thước
 * trong app (chữ, khoảng cách, bề rộng hộp) đều tính bằng `rem` = bội số của
 * cỡ chữ gốc, nên chữ to lên thì cả bố cục giãn theo và TỰ XUỐNG DÒNG như khi
 * phóng to trình duyệt. CỐ Ý không dùng `transform: scale()`: scale chỉ phóng
 * hình vẽ, nội dung tràn ra ngoài màn hình và vùng bấm lệch khỏi chỗ hiển thị.
 *
 * Bố cục (thanh tab dưới / bên trái, một hay hai cột) dùng container query
 * tính bằng rem, nên ở 150% app tự chuyển sang bố cục hẹp hơn — giống hệt
 * màn hình nhỏ hơn. Xem src/App.tsx.
 *
 * Thao tác chụm ngón tay để zoom vẫn dùng được bình thường (index.html không
 * chặn); đây chỉ là mức mặc định dễ đọc hơn.
 *
 * Lựa chọn lưu trong localStorage: sở thích của riêng máy này, không nằm
 * trong file sao lưu, không đồng bộ. index.html có đoạn script đọc cùng khoá
 * này TRƯỚC khi trang hiện ra để không bị nhảy bố cục lúc mở app.
 */

export type UiScale = 100 | 125 | 150;

export const UI_SCALES: UiScale[] = [100, 125, 150];

export const UI_SCALE_KEY = "learning-os:ui-scale";

/** Đọc một giá trị bất kỳ thành cỡ hợp lệ; lạ hoặc thiếu thì 100. */
export function parseUiScale(raw: string | null | undefined): UiScale {
  const n = Number(raw);
  return UI_SCALES.includes(n as UiScale) ? (n as UiScale) : 100;
}

/** Cỡ đã lưu trên máy này. */
export function getUiScale(): UiScale {
  try {
    return parseUiScale(localStorage.getItem(UI_SCALE_KEY));
  } catch {
    return 100;
  }
}

/** Hệ số phóng (1, 1.25, 1.5) — cho chỗ phải tính bằng px, vd chữ biểu đồ. */
export function uiScaleFactor(): number {
  return getUiScale() / 100;
}

/**
 * Áp cỡ lên trang: <html data-scale="125">. CSS trong index.css đổi cỡ chữ
 * gốc theo thuộc tính này. 100% thì bỏ thuộc tính (dùng cỡ mặc định).
 */
export function applyUiScale(scale: UiScale): void {
  const root = document.documentElement;
  if (scale === 100) delete root.dataset.scale;
  else root.dataset.scale = String(scale);
}

/** Lưu và áp cỡ mới. Không lưu được thì vẫn đổi cho lần mở này. */
export function setUiScale(scale: UiScale): void {
  try {
    localStorage.setItem(UI_SCALE_KEY, String(scale));
  } catch {
    /* bỏ qua */
  }
  applyUiScale(scale);
}
