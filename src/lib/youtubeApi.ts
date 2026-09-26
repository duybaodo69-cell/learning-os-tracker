/**
 * Tải YouTube IFrame Player API (thư viện chính thức của YouTube) — MỘT lần,
 * và chỉ khi người dùng thật sự chọn chế độ player YouTube. Người không dùng
 * YouTube thì app không gọi tới máy chủ YouTube lần nào.
 *
 * https://developers.google.com/youtube/iframe_api_reference
 */

/** Phần nhỏ của API mà app dùng tới. */
export type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  getPlayerState(): number;
  destroy(): void;
};

export type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      host?: string;
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number; target: YTPlayer }) => void;
        onError?: (e: { data: number }) => void;
      };
    }
  ) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; BUFFERING: number; ENDED: number; CUED: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<YTNamespace> | null = null;

/** Mất mạng / bị chặn -> lỗi sau 15 giây, không treo mãi. */
export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;

  loading = new Promise<YTNamespace>((resolve, reject) => {
    const timeout = setTimeout(() => {
      loading = null;
      reject(new Error("timeout"));
    }, 15000);

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      clearTimeout(timeout);
      if (window.YT) resolve(window.YT);
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      clearTimeout(timeout);
      loading = null;
      script.remove();
      reject(new Error("script"));
    };
    document.head.appendChild(script);
  });
  return loading;
}
