/**
 * Video YouTube mẫu làm cảnh nền cho màn "Phiên tập trung".
 *
 * Các video này KHÔNG nằm trong app: chúng được phát bằng player nhúng chính
 * thức của YouTube (chủ kênh có thể tắt nhúng bất cứ lúc nào — app sẽ báo lỗi
 * rõ ràng, xem describeYouTubeError). Bản quyền thuộc kênh gốc; app chỉ ghi
 * tên kênh và dẫn link, không tải, không cắt video. Khi làm nền, player bị
 * phủ lớp và ẩn điều khiển — xem ghi chú rủi ro trong CLAUDE.md.
 *
 * Đã kiểm tra ngày 2026-09-26 qua YouTube oEmbed: cả 6 video còn tồn tại và
 * cho phép nhúng. Thumbnail lấy thẳng từ YouTube (i.ytimg.com).
 */
import { youTubeThumb, youTubeWatchUrl } from "../lib/youtube";

export type YouTubePreset = {
  videoId: string;
  group: "morning" | "night";
  label: string;
  channel: string;
  title: string;
  thumb: string;
  url: string;
};

function yt(videoId: string, group: YouTubePreset["group"], label: string, channel: string, title: string): YouTubePreset {
  return { videoId, group, label, channel, title, thumb: youTubeThumb(videoId), url: youTubeWatchUrl(videoId) };
}

export const YOUTUBE_PRESETS: YouTubePreset[] = [
  yt("GSep96CLsgo", "morning", "Bắc Kinh lúc bình minh", "Sean Study", "2-Hour Study with Me / Beijing · Sunrise"),
  yt("UHGYNJzuTJU", "morning", "Panama City bình minh", "Sean Study", "4-Hour Study with Me / Panama City Sunrise"),
  yt("reyJo2i3kik", "morning", "Tokyo ngày hè (không nhạc)", "Abao in Tokyo", "2-HOUR STUDY WITH ME / Tokyo Skyline on a summer day"),
  yt("HFM-EHduRrQ", "night", "Thượng Hải tới hoàng hôn", "Sean Study", "2-Hour Study with Me / Shanghai Skyline Until Sunset"),
  yt("AdV-Gt6KjzI", "night", "London dưới trăng", "Sean Study", "3-Hour Study with Me / Moonlit London"),
  yt("6A-H1tni5Xg", "night", "Mưa đêm New York", "Window Angle", "4K Rain Window View in NYC at Night"),
];

export function findYouTubePreset(videoId: string): YouTubePreset | undefined {
  return YOUTUBE_PRESETS.find((p) => p.videoId === videoId);
}
