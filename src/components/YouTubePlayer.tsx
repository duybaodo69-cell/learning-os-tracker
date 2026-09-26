/**
 * Player YouTube nhúng chính thức (qua IFrame API), lấp đầy khung chứa nó.
 *
 * Hai kiểu:
 *   interactive — player bình thường, có nút điều khiển (dùng để xem trước
 *                 trong hộp Cài đặt, bấm ▶ được khi trình duyệt chặn tự phát).
 *   background  — làm CẢNH NỀN phía sau đồng hồ, giống openquiz.ai: ẩn nút
 *                 điều khiển, tự lặp, không nhận chạm (lớp chứa đặt
 *                 pointer-events: none). Chủ app đã chọn cách này ngày
 *                 2026-09-26 dù nó đi ngược Chính sách YouTube API (phủ lớp lên
 *                 player, ẩn điều khiển) — rủi ro: YouTube có thể chặn nhúng.
 *
 * Chung cho cả hai:
 *   - Tự phát ở chế độ tắt tiếng (trình duyệt chỉ cho tự phát khi tắt tiếng).
 *   - Dùng youtube-nocookie.com (chế độ bảo mật nâng cao của YouTube).
 *
 * Báo trạng thái lên trên để KHÔNG BAO GIỜ nói "áp dụng thành công" với một
 * video không phát được:
 *   loading  — đang tải
 *   playing  — đã thật sự phát (YouTube báo PLAYING)
 *   blocked  — tải được nhưng chưa phát (trình duyệt chặn tự phát, hoặc
 *              tắt tự phát vì giảm chuyển động): cần bấm ▶ trên player
 *   error    — không phát được, kèm lý do (tắt nhúng, video bị xoá, mất mạng...)
 *
 * Player không đụng tới bộ đếm giờ — lỗi ở đây không thể làm sai phiên học.
 */
import { useEffect, useRef } from "react";

import { loadYouTubeApi } from "../lib/youtubeApi";
import type { YTPlayer } from "../lib/youtubeApi";
import { describeYouTubeError } from "../lib/youtube";

export type PlayerStatus = { state: "loading" | "playing" | "blocked" | "error"; message?: string };

type Props = {
  videoId: string;
  start?: number;
  /** false = không tự phát (máy bật giảm chuyển động / tiết kiệm dữ liệu). */
  autoplay: boolean;
  variant?: "interactive" | "background";
  /** Tăng số này để ra lệnh phát (nút "Phát video" của app, khi tự phát bị chặn). */
  playRequest?: number;
  onStatus?: (s: PlayerStatus) => void;
  className?: string;
};

/** Sau bấy nhiêu giây mà vẫn chưa phát -> coi như bị chặn tự phát. */
const BLOCKED_AFTER_MS = 6000;

export default function YouTubePlayer({
  videoId,
  start,
  autoplay,
  variant = "interactive",
  playRequest = 0,
  onStatus,
  className = "",
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  // Giữ callback mới nhất mà không phải dựng lại player mỗi lần vẽ.
  const statusRef = useRef(onStatus);
  useEffect(() => {
    statusRef.current = onStatus;
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let player: YTPlayer | null = null;
    let cancelled = false;
    let played = false;
    let wasPlaying = false;
    let blockedTimer: ReturnType<typeof setTimeout> | undefined;
    const report = (s: PlayerStatus) => !cancelled && statusRef.current?.(s);

    report({ state: "loading" });
    if (!navigator.onLine) {
      report({ state: "error", message: "Đang mất mạng — YouTube cần mạng để phát." });
      return;
    }

    // YouTube thay thế phần tử này bằng iframe; tạo phần tử riêng để React
    // không bao giờ phải quản lý iframe đó.
    const mount = document.createElement("div");
    host.appendChild(mount);

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        player = playerRef.current = new YT.Player(mount, {
          host: "https://www.youtube-nocookie.com",
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: autoplay ? 1 : 0,
            mute: 1,
            playsinline: 1, // iPhone: phát ngay trong trang, không bật trình phát riêng
            rel: 0,
            ...(start ? { start } : {}),
            ...(variant === "background"
              ? {
                  controls: 0, // cảnh nền: ẩn thanh điều khiển
                  disablekb: 1,
                  fs: 0,
                  iv_load_policy: 3, // ẩn chú thích nổi
                  loop: 1,
                  playlist: videoId, // YouTube chỉ lặp khi có playlist
                }
              : {}),
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              if (!autoplay) {
                report({ state: "blocked", message: "Bấm ▶ trên video để phát." });
                return;
              }
              e.target.mute();
              e.target.playVideo();
              blockedTimer = setTimeout(() => {
                if (!played) {
                  report({ state: "blocked", message: "Trình duyệt chưa cho tự phát — bấm ▶ trên video để phát." });
                }
              }, BLOCKED_AFTER_MS);
            },
            onStateChange: (e) => {
              // Dự phòng cho việc lặp: hết video thì phát lại từ đầu.
              if (variant === "background" && e.data === YT.PlayerState.ENDED) e.target.playVideo();
              if (e.data === YT.PlayerState.PLAYING) {
                played = true;
                clearTimeout(blockedTimer);
                report({ state: "playing" });
              }
            },
            onError: (e) => {
              clearTimeout(blockedTimer);
              report({ state: "error", message: describeYouTubeError(e.data) });
            },
          },
        });
      })
      .catch(() => report({ state: "error", message: "Không tải được YouTube (mất mạng hoặc bị chặn)." }));

    // Khoá máy / chuyển app -> tạm dừng; quay lại -> phát tiếp nếu trước đó đang phát.
    function onVisibility() {
      if (!player?.getPlayerState) return;
      if (document.hidden) {
        wasPlaying = player.getPlayerState() === window.YT?.PlayerState.PLAYING;
        if (wasPlaying) player.pauseVideo();
      } else if (wasPlaying) {
        player.playVideo();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearTimeout(blockedTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      playerRef.current = null;
      try {
        player?.destroy();
      } catch {
        /* player chưa kịp dựng xong */
      }
      host.replaceChildren();
    };
  }, [videoId, start, autoplay, variant]);

  // Nút "Phát video" của app (bấm tay = trình duyệt cho phép phát).
  useEffect(() => {
    if (playRequest > 0) playerRef.current?.playVideo?.();
  }, [playRequest]);

  return <div ref={hostRef} className={`h-full w-full bg-black [&>iframe]:block [&>iframe]:h-full [&>iframe]:w-full ${className}`} />;
}
