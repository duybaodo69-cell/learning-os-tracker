/**
 * Vùng nhìn thấy thật trên điện thoại: bàn phím ảo và "vùng an toàn".
 *
 * BÀN PHÍM: trên Android Chrome và iPhone Safari, bàn phím mở ra KHÔNG làm
 * trang ngắn lại — nó chỉ che phần dưới. Hộp thoại dính đáy (bottom sheet)
 * vì vậy bị che mất nút Lưu. `window.visualViewport` cho biết phần còn nhìn
 * thấy; chênh lệch với chiều cao trang chính là phần bàn phím đang che.
 *
 * VÙNG AN TOÀN: tai thỏ, thanh gạt home, góc bo — `env(safe-area-inset-*)`
 * (index.html có viewport-fit=cover). Máy không có thì các giá trị là 0.
 */
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

/**
 * Số px bàn phím (hoặc thanh công cụ) đang che ở ĐÁY màn hình.
 * `layoutHeight` = window.innerHeight; `vv` = window.visualViewport.
 * Nhỏ hơn 1px coi như không che (làm tròn khi phóng to).
 * Đang chụm hai ngón để zoom (`scale` > 1) thì vùng nhìn thấy cũng nhỏ lại —
 * đó KHÔNG phải bàn phím, nên trả 0.
 */
export function keyboardInset(
  layoutHeight: number,
  vv: { height: number; offsetTop: number; scale?: number } | null | undefined
): number {
  if (!vv) return 0;
  if (vv.scale !== undefined && vv.scale > 1.01) return 0;
  const covered = layoutHeight - vv.height - vv.offsetTop;
  return covered >= 1 ? Math.round(covered) : 0;
}

/** Theo dõi phần bàn phím đang che, cập nhật khi bàn phím mở/đóng. */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(() =>
    typeof window === "undefined" ? 0 : keyboardInset(window.innerHeight, window.visualViewport)
  );
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setInset(keyboardInset(window.innerHeight, vv));
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}

/**
 * Đệm cho lớp phủ của hộp thoại: tránh tai thỏ / thanh home, và khi bàn phím
 * mở thì đẩy hộp thoại lên TRÊN bàn phím. `gap` = khoảng cách tối thiểu tới mép.
 */
export function overlayPadding(inset: number, gap = "1rem"): CSSProperties {
  return {
    paddingTop: `max(${gap}, env(safe-area-inset-top))`,
    paddingLeft: `max(${gap}, env(safe-area-inset-left))`,
    paddingRight: `max(${gap}, env(safe-area-inset-right))`,
    paddingBottom: inset > 0 ? `calc(${gap} + ${inset}px)` : `max(${gap}, env(safe-area-inset-bottom))`,
  };
}
