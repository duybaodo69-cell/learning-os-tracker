/**
 * Hình nền cho màn "Phiên tập trung": đọc/ghi lựa chọn và kiểm tra link.
 *
 * Lựa chọn lưu trong localStorage: là sở thích của riêng máy này (giống
 * chế độ tối), không phải dữ liệu học tập — không nằm trong file sao lưu
 * và không đồng bộ.
 *
 * Toàn bộ phần kiểm tra là hàm thuần, có test trong background.test.ts.
 */
import { findPreset } from "../config/backgrounds";
import { findYouTubePreset } from "../config/youtubePresets";
import { isYouTubeHost, parseYouTube } from "./youtube";

export type MediaKind = "image" | "video";

/**
 * Một lựa chọn nền. Có HAI chế độ hiển thị khác nhau:
 *
 * NỀN PHỦ sau đồng hồ (FocusBackdrop):
 *   preset  — một cảnh có sẵn trong src/config/backgrounds.ts
 *   url     — link ảnh/video trực tiếp người dùng tự dán. `media` = "unknown"
 *             khi đuôi file không cho biết loại; lúc hiển thị thử ảnh trước, video sau.
 *
 * PLAYER YOUTUBE trong khung riêng (YouTubePlayer), đồng hồ nằm bên cạnh /
 * bên dưới, KHÔNG phủ lên video:
 *   youtube — mã video 11 ký tự + giây bắt đầu (nếu link có &t=)
 *
 *   none    — không có nền (màu nền app như cũ)
 */
export type FocusBackground =
  | { kind: "none" }
  | { kind: "preset"; id: string }
  | { kind: "url"; url: string; media: MediaKind | "unknown" }
  | { kind: "youtube"; videoId: string; start?: number };

/** Chế độ hiển thị của một lựa chọn: phủ sau đồng hồ, hay player riêng. */
export function displayMode(bg: FocusBackground): "none" | "overlay" | "player" {
  if (bg.kind === "none") return "none";
  return bg.kind === "youtube" ? "player" : "overlay";
}

export const NO_BACKGROUND: FocusBackground = { kind: "none" };

/* ==================== Kiểm tra link ==================== */

export type UrlCheck =
  | { ok: true; background: Extract<FocusBackground, { kind: "url" | "youtube" }> }
  | { ok: false; reason: "empty" | "invalid" | "not-https" | "youtube-no-video" | "video-page"; message: string };

const IMAGE_EXT = ["jpg", "jpeg", "png", "gif", "webp", "avif"];
const VIDEO_EXT = ["mp4", "webm", "m4v", "mov"];

/** Tên miền của các trang xem video — link tới TRANG, không phải file video. */
const VIDEO_PAGE_HOSTS = ["vimeo.com", "tiktok.com", "facebook.com", "fb.watch", "instagram.com", "dailymotion.com"];

function hostIs(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * Link dán vào dùng được không, và dùng ở chế độ nào.
 *
 *   Link YouTube có mã video  -> chế độ PLAYER (player nhúng chính thức, khung riêng)
 *   Link file ảnh/video https -> chế độ NỀN PHỦ sau đồng hồ
 *
 * YouTube KHÔNG BAO GIỜ được đặt làm nền phủ hay ẩn dưới đồng hồ: điều khoản
 * của YouTube cấm che player, và app cũng không tải file video từ YouTube.
 */
export function checkBackgroundUrl(input: string): UrlCheck {
  const text = input.trim();
  if (text === "") return { ok: false, reason: "empty", message: "" };

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, reason: "invalid", message: "Đây không phải một đường link hợp lệ." };
  }

  const host = url.hostname.toLowerCase();
  if (isYouTubeHost(host)) {
    const yt = parseYouTube(text);
    if (yt) return { ok: true, background: { kind: "youtube", ...yt } };
    return {
      ok: false,
      reason: "youtube-no-video",
      message: "Link YouTube này không trỏ tới một video (có thể là link kênh, playlist hay trang tìm kiếm). Mở video rồi sao chép link của video đó.",
    };
  }
  if (VIDEO_PAGE_HOSTS.some((d) => hostIs(host, d))) {
    return {
      ok: false,
      reason: "video-page",
      message: "Đây là link trang xem video, không phải file video. Cần link trực tiếp tới file .mp4 hoặc .webm.",
    };
  }
  if (url.protocol !== "https:") {
    return {
      ok: false,
      reason: "not-https",
      message: "Link phải bắt đầu bằng https:// — trình duyệt chặn nội dung http trong app https.",
    };
  }

  // Đuôi file nằm ở phần đường dẫn, bỏ qua ?query và #hash.
  const ext = url.pathname.split(".").pop()?.toLowerCase() ?? "";
  const media: MediaKind | "unknown" = IMAGE_EXT.includes(ext)
    ? "image"
    : VIDEO_EXT.includes(ext)
      ? "video"
      : "unknown";
  return { ok: true, background: { kind: "url", url: url.href, media } };
}

/* ==================== Lưu trên máy ==================== */

export const BACKGROUND_KEY = "learning-os:focus-background";

/** Đọc lựa chọn đã lưu. Giá trị hỏng / cảnh đã bị xoá khỏi danh sách -> không nền. */
export function parseBackground(raw: string | null): FocusBackground {
  if (!raw) return NO_BACKGROUND;
  try {
    const v = JSON.parse(raw) as Partial<{ kind: string; id: string; url: string; media: string; videoId: string; start: number }>;
    if (v.kind === "preset" && typeof v.id === "string" && findPreset(v.id)) {
      return { kind: "preset", id: v.id };
    }
    if (v.kind === "url" && typeof v.url === "string") {
      const check = checkBackgroundUrl(v.url);
      if (check.ok && check.background.kind === "url") return check.background;
    }
    if (v.kind === "youtube" && typeof v.videoId === "string" && /^[A-Za-z0-9_-]{11}$/.test(v.videoId)) {
      const start = typeof v.start === "number" && v.start > 0 ? Math.floor(v.start) : undefined;
      return start ? { kind: "youtube", videoId: v.videoId, start } : { kind: "youtube", videoId: v.videoId };
    }
  } catch {
    /* hỏng thì coi như chưa chọn */
  }
  return NO_BACKGROUND;
}

export function getBackground(): FocusBackground {
  try {
    return parseBackground(localStorage.getItem(BACKGROUND_KEY));
  } catch {
    return NO_BACKGROUND;
  }
}

export function saveBackground(bg: FocusBackground): void {
  try {
    if (bg.kind === "none") localStorage.removeItem(BACKGROUND_KEY);
    else localStorage.setItem(BACKGROUND_KEY, JSON.stringify(bg));
  } catch {
    /* không lưu được thì vẫn dùng cho phiên này */
  }
}

export function sameBackground(a: FocusBackground, b: FocusBackground): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "preset" && b.kind === "preset") return a.id === b.id;
  if (a.kind === "url" && b.kind === "url") return a.url === b.url;
  if (a.kind === "youtube" && b.kind === "youtube") return a.videoId === b.videoId && a.start === b.start;
  return true;
}

/** Mô tả ngắn để hiện dòng "Nền hiện tại". */
export function describeBackground(bg: FocusBackground): string {
  if (bg.kind === "none") return "Không có";
  if (bg.kind === "preset") return `Nền phủ · ${findPreset(bg.id)?.label ?? "?"}`;
  if (bg.kind === "youtube") {
    const p = findYouTubePreset(bg.videoId);
    return `YouTube · ${p ? p.label : `video ${bg.videoId}`}`;
  }
  return `Nền phủ · ${bg.url}`;
}

/* ==================== Tiết kiệm tài nguyên ==================== */

export type DeviceHints = {
  /** prefers-reduced-motion: reduce */
  reducedMotion: boolean;
  /** navigator.connection.saveData — người dùng bật tiết kiệm dữ liệu */
  saveData: boolean;
  /** navigator.deviceMemory (GB), không phải trình duyệt nào cũng có */
  deviceMemory?: number;
  /** navigator.hardwareConcurrency (số nhân CPU) */
  cpuCores?: number;
};

/**
 * Có nên dùng ảnh tĩnh thay cho video không. Trả về lý do để hiện cho
 * người dùng biết vì sao nền đứng yên, hoặc null nếu phát video bình thường.
 */
export function stillReason(h: DeviceHints): string | null {
  if (h.reducedMotion) return "Máy đang bật giảm chuyển động, nên nền là ảnh tĩnh.";
  if (h.saveData) return "Máy đang bật tiết kiệm dữ liệu, nên nền là ảnh tĩnh.";
  if ((h.deviceMemory !== undefined && h.deviceMemory <= 2) || (h.cpuCores !== undefined && h.cpuCores <= 2)) {
    return "Máy cấu hình thấp, nên nền là ảnh tĩnh để đồng hồ chạy mượt.";
  }
  return null;
}

/** Đọc các gợi ý trên từ trình duyệt thật. */
export function readDeviceHints(): DeviceHints {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  return {
    reducedMotion:
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: nav.connection?.saveData === true,
    deviceMemory: nav.deviceMemory,
    cpuCores: nav.hardwareConcurrency || undefined,
  };
}
