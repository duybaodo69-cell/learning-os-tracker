/**
 * Toàn màn hình + khoá xoay ngang cho màn "Phiên tập trung".
 *
 * Trình duyệt hỗ trợ rất khác nhau, nên mọi hàm đều "thử, không được thì thôi":
 *   - Android Chrome: vào toàn màn hình được, và khi đã toàn màn hình thì
 *     khoá hướng ngang được (screen.orientation.lock).
 *   - iPhone Safari: KHÔNG có toàn màn hình cho trang web và không khoá hướng
 *     được. App vẫn có giao diện ngang — người dùng tự xoay máy.
 *   - iPad / máy tính: toàn màn hình được, không cần khoá hướng.
 * Không hàm nào ném lỗi ra ngoài: thất bại ở đây không được làm hỏng phiên học.
 */

type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenEnabled?: boolean;
};
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type LockableOrientation = ScreenOrientation & {
  lock?: (o: "landscape") => Promise<void>;
  unlock?: () => void;
};

/** Trình duyệt này có cho trang web vào toàn màn hình không. */
export function canFullscreen(): boolean {
  const d = document as FsDocument;
  return Boolean(d.fullscreenEnabled || d.webkitFullscreenEnabled);
}

export function isFullscreen(): boolean {
  const d = document as FsDocument;
  return Boolean(d.fullscreenElement || d.webkitFullscreenElement);
}

/**
 * Vào toàn màn hình, rồi thử khoá hướng ngang.
 * Trả về `locked` = đã khoá ngang được hay chưa, để biết có cần nhắc
 * người dùng tự xoay máy không.
 */
export async function enterFullscreen(): Promise<{ entered: boolean; locked: boolean }> {
  const el = document.documentElement as FsElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    else return { entered: false, locked: false };
  } catch {
    return { entered: false, locked: false };
  }

  let locked = false;
  try {
    const o = screen.orientation as LockableOrientation | undefined;
    if (o?.lock) {
      await o.lock("landscape");
      locked = true;
    }
  } catch {
    // Máy tính / iPad / trình duyệt không cho khoá — bình thường, bỏ qua.
  }
  return { entered: true, locked };
}

export async function exitFullscreen(): Promise<void> {
  try {
    (screen.orientation as LockableOrientation | undefined)?.unlock?.();
  } catch {
    /* bỏ qua */
  }
  const d = document as FsDocument;
  try {
    if (d.fullscreenElement && d.exitFullscreen) await d.exitFullscreen();
    else if (d.webkitFullscreenElement && d.webkitExitFullscreen) await d.webkitExitFullscreen();
  } catch {
    /* bỏ qua */
  }
}

/** Lắng nghe việc vào/thoát toàn màn hình (kể cả khi bấm nút Back / Esc). */
export function onFullscreenChange(cb: () => void): () => void {
  document.addEventListener("fullscreenchange", cb);
  document.addEventListener("webkitfullscreenchange", cb);
  return () => {
    document.removeEventListener("fullscreenchange", cb);
    document.removeEventListener("webkitfullscreenchange", cb);
  };
}
