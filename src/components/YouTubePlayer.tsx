/**
 * Player YouTube nhúng chính thức, lấp đầy khung chứa nó.
 *
 * Luật (theo điều khoản YouTube và yêu cầu của app):
 *   - Không có gì phủ lên player: đồng hồ, nút bấm đều nằm ở vùng khác.
 *     Người dùng luôn thấy và bấm được các nút của chính YouTube.
 *   - Tự phát ở chế độ tắt tiếng (trình duyệt chỉ cho tự phát khi tắt tiếng);
 *     muốn nghe thì bật tiếng bằng nút loa của YouTube.
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
  onStatus?: (s: PlayerStatus) => void;
  className?: string;
};

/** Sau bấy nhiêu giây mà vẫn chưa phát -> coi như bị chặn tự phát. */
const BLOCKED_AFTER_MS = 6000;

export default function YouTubePlayer({ videoId, start, autoplay, onStatus, className = "" }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
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
        player = new YT.Player(mount, {
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
      try {
        player?.destroy();
      } catch {
        /* player chưa kịp dựng xong */
      }
      host.replaceChildren();
    };
  }, [videoId, start, autoplay]);

  return <div ref={hostRef} className={`h-full w-full bg-black [&>iframe]:block [&>iframe]:h-full [&>iframe]:w-full ${className}`} />;
}
