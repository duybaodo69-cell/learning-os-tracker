/**
 * Toàn màn hình + khoá xoay ngang cho màn "Phiên tập trung".
 *
 * Trình duyệt hỗ trợ rất khác nhau, nên mọi hàm đều "thử, không được thì thôi":
 *   - Android Chrome (cả app đã cài): vào toàn màn hình được, và khi đã toàn
 *     màn hình thì khoá hướng ngang được (screen.orientation.lock).
 *   - iPhone Safari: KHÔNG có toàn màn hình cho trang web và không khoá hướng
 *     được. App vẫn có giao diện ngang — người dùng tự xoay máy.
 *   - iPad / máy tính: toàn màn hình được, thường không khoá hướng được.
 * Không hàm nào ném lỗi ra ngoài: thất bại ở đây không được làm hỏng phiên học.
 * Mốc bắt đầu phiên nằm trong localStorage (lib/timer.ts); file này không
 * bao giờ đụng tới nó.
 *
 * THỨ TỰ BẮT BUỘC: requestFullscreen phải được gọi NGAY trong lúc xử lý cú
 * bấm của người dùng (trình duyệt chặn nếu không có thao tác thật). Khoá hướng
 * chỉ được phép SAU KHI đã vào toàn màn hình, nên nó chạy sau `await`.
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

/** Khoá hướng không trả lời sau chừng này thì coi như không khoá được. */
export const LOCK_TIMEOUT_MS = 3000;

/** Kết quả một lần bấm nút Toàn màn hình. */
export type FullscreenResult =
  /** Đã toàn màn hình; `locked` = đã khoá ngang được hay chưa. */
  | { entered: true; locked: boolean }
  /** unsupported = trình duyệt không có (iPhone); denied = có nhưng từ chối. */
  | { entered: false; reason: "unsupported" | "denied" };

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
 * GỌI TRỰC TIẾP trong hàm xử lý cú bấm (không `await` gì trước nó).
 */
export async function enterFullscreen(): Promise<FullscreenResult> {
  const el = document.documentElement as FsElement;
  if (!canFullscreen()) return { entered: false, reason: "unsupported" };
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    else return { entered: false, reason: "unsupported" };
  } catch {
    return { entered: false, reason: "denied" };
  }
  // API cũ có tiền tố webkit không trả Promise: lệnh chạy xong NGAY nhưng
  // toàn màn hình đến sau một nhịp. Chờ sự kiện thật trước khi kết luận,
  // để không báo "bị từ chối" trong khi màn hình đã toàn màn hình.
  if (!isFullscreen() && !(await waitForFullscreen(FULLSCREEN_WAIT_MS))) {
    return { entered: false, reason: "denied" };
  }

  return { entered: true, locked: await lockLandscape() };
}

/** Chờ tối đa chừng này để API cũ (webkit) vào toàn màn hình. */
export const FULLSCREEN_WAIT_MS = 1000;

/** true khi đã vào toàn màn hình trong `ms`; false khi báo lỗi hoặc hết giờ. */
function waitForFullscreen(ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const events = ["fullscreenchange", "webkitfullscreenchange", "fullscreenerror", "webkitfullscreenerror"];
    const done = (ok: boolean) => {
      clearTimeout(timer);
      for (const e of events) document.removeEventListener(e, check);
      resolve(ok);
    };
    const check = () => done(isFullscreen());
    const timer = setTimeout(() => done(isFullscreen()), ms);
    for (const e of events) document.addEventListener(e, check);
  });
}

/** Thử khoá ngang. true = đã khoá. Không bao giờ treo quá LOCK_TIMEOUT_MS. */
async function lockLandscape(): Promise<boolean> {
  const o = screen.orientation as LockableOrientation | undefined;
  if (!o?.lock) return false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), LOCK_TIMEOUT_MS);
    });
    return await Promise.race([o.lock("landscape").then(() => true), timeout]);
  } catch {
    // Máy tính / iPad / trình duyệt không cho khoá — bình thường, bỏ qua.
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Nhả khoá hướng (nếu có). Gọi khi thoát toàn màn hình hoặc kết thúc phiên. */
export function unlockOrientation(): void {
  try {
    (screen.orientation as LockableOrientation | undefined)?.unlock?.();
  } catch {
    /* bỏ qua */
  }
}

/** Nhả khoá hướng rồi thoát toàn màn hình. Không có gì để thoát thì thôi. */
export async function exitFullscreen(): Promise<void> {
  unlockOrientation();
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

/**
 * Lời nhắc hiện sau khi bấm nút Toàn màn hình, theo KẾT QUẢ THẬT.
 * null = không cần nhắc (đã toàn màn hình và đang nằm ngang).
 * Không bao giờ nói "đã xoay ngang" — chỉ nói điều đã xảy ra và việc cần làm.
 */
export function fullscreenNotice(result: FullscreenResult | null, portrait: boolean): string | null {
  if (!result) return null;
  if (result.entered) {
    // Đã khoá ngang, hoặc máy đang nằm ngang sẵn: không cần nói gì.
    if (result.locked || !portrait) return null;
    return "Máy này không cho web tự xoay. Hãy xoay ngang điện thoại (tắt khoá xoay nếu đang bật).";
  }
  if (result.reason === "denied") {
    return portrait
      ? "Trình duyệt không cho mở toàn màn hình. Phiên vẫn chạy bình thường — có thể tự xoay ngang máy."
      : "Trình duyệt không cho mở toàn màn hình. Phiên vẫn chạy bình thường.";
  }
  // unsupported: iPhone Safari và vài trình duyệt khác.
  return portrait
    ? "Trình duyệt này không có chế độ toàn màn hình. Xoay ngang máy để xem toàn cảnh; trên iPhone, thêm app vào Màn hình chính để ẩn thanh địa chỉ."
    : "Trình duyệt này không có chế độ toàn màn hình. Trên iPhone, thêm app vào Màn hình chính để ẩn thanh địa chỉ.";
}
