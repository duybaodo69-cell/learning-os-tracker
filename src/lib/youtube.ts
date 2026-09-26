/**
 * Đọc link YouTube -> mã video (11 ký tự) và giây bắt đầu.
 *
 * Video được phát bằng PLAYER NHÚNG CHÍNH THỨC của YouTube, trong một khung
 * riêng không bị đồng hồ hay nút nào che (src/components/YouTubePlayer.tsx).
 * App không tải, không cắt, không phủ gì lên video.
 *
 * Hàm thuần, có test trong youtube.test.ts.
 */

export type YouTubeRef = { videoId: string; start?: number };

const ID = /^[A-Za-z0-9_-]{11}$/;

function hostIs(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** Link có phải của YouTube không (kể cả khi không đọc được mã video). */
export function isYouTubeHost(host: string): boolean {
  const h = host.toLowerCase();
  return hostIs(h, "youtube.com") || hostIs(h, "youtu.be") || hostIs(h, "youtube-nocookie.com");
}

/** "90", "90s", "1m30s", "1h2m3s" -> số giây. Không đọc được -> undefined. */
export function parseStartTime(t: string | null): number | undefined {
  if (!t) return undefined;
  if (/^\d+s?$/.test(t)) return Number.parseInt(t, 10) || undefined;
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
  if (!m || (!m[1] && !m[2] && !m[3])) return undefined;
  const secs = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return secs > 0 ? secs : undefined;
}

/**
 * Các dạng link được nhận:
 *   youtube.com/watch?v=ID (kèm &list=, &t=, &si=...), m. / music. / www.
 *   youtu.be/ID?t=90
 *   youtube.com/shorts/ID, /live/ID, /embed/ID, /v/ID
 *   youtube-nocookie.com/embed/ID
 * Không nhận: link kênh, playlist không có video, link tìm kiếm -> null.
 */
export function parseYouTube(input: string): YouTubeRef | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (!isYouTubeHost(host)) return null;

  let id: string | null = null;
  const parts = url.pathname.split("/").filter(Boolean);

  if (hostIs(host, "youtu.be")) {
    id = parts[0] ?? null;
  } else if (parts[0] === "watch") {
    id = url.searchParams.get("v");
  } else if (["shorts", "live", "embed", "v"].includes(parts[0] ?? "")) {
    id = parts[1] ?? null;
  }

  if (!id || !ID.test(id)) return null;
  const start = parseStartTime(url.searchParams.get("t") ?? url.searchParams.get("start"));
  return start ? { videoId: id, start } : { videoId: id };
}

/** Ảnh thumbnail 16:9 (320x180) do YouTube cung cấp cho mọi video. */
export function youTubeThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

export function youTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Câu tiếng Việt cho mã lỗi của YouTube IFrame Player.
 * https://developers.google.com/youtube/iframe_api_reference#onError
 */
export function describeYouTubeError(code: number): string {
  switch (code) {
    case 2:
      return "Mã video không hợp lệ.";
    case 5:
      return "Trình duyệt này không phát được video này.";
    case 100:
      return "Video không tồn tại hoặc đã chuyển sang riêng tư.";
    case 101:
    case 150:
      // YouTube dùng CHUNG mã này cho cả "tắt nhúng" lẫn "video không còn /
      // không công khai" khi phát trong khung nhúng — nói đủ cả hai khả năng.
      return "YouTube không cho phát video này trong app: chủ video tắt nhúng, hoặc video không còn / không công khai.";
    case 153:
      return "YouTube từ chối phát vì thiếu thông tin trang nhúng. Thử tải lại app.";
    default:
      return `YouTube báo lỗi (mã ${code}).`;
  }
}
