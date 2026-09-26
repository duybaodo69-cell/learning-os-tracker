/**
 * Lớp nền phủ kín màn hình PHÍA SAU đồng hồ của "Phiên tập trung".
 *
 * Luôn có một nền gradient tĩnh ở dưới cùng. Phía trên là cảnh đã chọn:
 * video MP4 có sẵn, ảnh/video tự dán, hoặc video YouTube (phủ kín kiểu
 * openquiz.ai, xem YouTubePlayer variant="background"). Tắt "video nền",
 * chưa chọn gì hay cảnh bị lỗi -> chỉ còn gradient tĩnh.
 * Cả lớp không nhận chạm: mọi thao tác đi thẳng tới đồng hồ và nút của app.
 * Lớp phủ tối (gradient tỏa tròn sau đồng hồ) do FocusSession vẽ.
 *
 * Nguyên tắc:
 *   - Video: phủ kín kiểu cover, tự lặp, tắt tiếng, phát ngay trong trang
 *     (playsInline — iPhone không bật trình phát toàn màn hình riêng).
 *   - Luôn có đường lui: video lỗi / không tự phát được / máy yếu / bật giảm
 *     chuyển động -> ảnh tĩnh (poster). Poster cũng lỗi -> màu nền app.
 *   - Trang bị ẩn (khoá máy, chuyển app) -> tạm dừng video cho đỡ tốn pin.
 *   - Lớp phủ tối vừa phải để đồng hồ và nút bấm luôn đọc rõ.
 *
 * Component này KHÔNG đụng tới bộ đếm giờ: đổi nền, nền lỗi hay tải lại nền
 * không thể làm sai thời gian phiên — thời gian luôn tính từ mốc bắt đầu.
 */
import { useEffect, useRef, useState } from "react";

import { findPreset } from "../config/backgrounds";
import type { FocusBackground } from "../lib/background";
import YouTubePlayer from "./YouTubePlayer";

/**
 * Trạng thái để báo lên trên:
 *   ready    — đang hiện đúng thứ đã chọn
 *   still    — là video nhưng đang hiện ảnh tĩnh (máy yếu, không tự phát được...)
 *   fallback — video lỗi, đang hiện ảnh tĩnh thay thế
 *   blocked  — YouTube tải được nhưng chưa phát (tự phát bị chặn / tắt vì
 *              giảm chuyển động) — cần bấm nút "Phát video" của app
 *   error    — không hiện được gì (link hỏng / bị chặn / YouTube từ chối)
 *   none     — không có cảnh (chưa chọn, hoặc đang tắt video nền)
 */
export type BackdropStatus = "none" | "loading" | "ready" | "still" | "fallback" | "blocked" | "error";

type Props = {
  background: FocusBackground;
  /** true = không phát video, chỉ hiện ảnh tĩnh (xem stillReason trong lib/background.ts). */
  still: boolean;
  /** false = người dùng tắt video nền: chỉ hiện gradient tĩnh, không tải gì. */
  videoOn?: boolean;
  /** Tăng số này để phát video YouTube (nút "Phát video" khi tự phát bị chặn). */
  playRequest?: number;
  onStatus?: (status: BackdropStatus, message?: string) => void;
};

/** Nền tĩnh khi không có cảnh: tối, sáng nhẹ ở giữa — không chuyển động. */
const STATIC_GRADIENT = "radial-gradient(ellipse at 50% 42%, #1f2937 0%, #111827 45%, #0c0e12 100%)";

export default function FocusBackdrop({ background, still, videoOn = true, playRequest = 0, onStatus }: Props) {
  // Mỗi lựa chọn mới dựng lại phần tử media từ đầu (key), nên trạng thái
  // lỗi của nền cũ không dính sang nền mới.
  const key =
    background.kind === "preset"
      ? `p:${background.id}`
      : background.kind === "url"
        ? `u:${background.url}`
        : background.kind === "youtube"
          ? `y:${background.videoId}:${background.start ?? 0}`
          : "none";
  const show = videoOn && background.kind !== "none";

  useEffect(() => {
    if (!show) onStatus?.("none");
  }, [show, onStatus]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" style={{ background: STATIC_GRADIENT }} aria-hidden="true">
      {show && background.kind === "youtube" && (
        <YouTubeCover key={key} background={background} still={still} playRequest={playRequest} onStatus={onStatus} />
      )}
      {show && background.kind !== "youtube" && (
        <Media key={`${key}:${still}`} background={background} still={still} onStatus={onStatus} />
      )}
    </div>
  );
}

/**
 * Video YouTube phủ kín màn hình (cách của openquiz.ai): khung 16:9 được
 * phóng tới khi phủ hết màn hình ở mọi hướng, phần thừa tràn ra ngoài và bị
 * cắt. Không nhận chạm (lớp cha pointer-events: none).
 */
function YouTubeCover({
  background,
  still,
  playRequest,
  onStatus,
}: {
  background: Extract<FocusBackground, { kind: "youtube" }>;
  still: boolean;
  playRequest: number;
  onStatus?: Props["onStatus"];
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ${failed ? "opacity-0" : "opacity-100"}`}
      style={{ width: "max(177.78vh, 100vw)", height: "max(56.25vw, 100vh)" }}
    >
      <YouTubePlayer
        videoId={background.videoId}
        start={background.start}
        autoplay={!still}
        variant="background"
        playRequest={playRequest}
        onStatus={(st) => {
          // Lỗi -> ẩn khung (gradient tĩnh lộ ra), không để màn lỗi của YouTube.
          setFailed(st.state === "error");
          const map = { loading: "loading", playing: "ready", blocked: "blocked", error: "error" } as const;
          onStatus?.(map[st.state], st.message);
        }}
      />
    </div>
  );
}

const COVER = "absolute inset-0 h-full w-full object-cover";

function Media({ background, still, onStatus }: Props) {
  const preset = background.kind === "preset" ? findPreset(background.id) : undefined;
  const url = background.kind === "url" ? background.url : undefined;

  // Link không rõ loại: thử như ảnh trước, lỗi thì thử như video.
  const initialKind =
    background.kind === "url" ? (background.media === "video" ? "video" : "image") : preset ? "video" : "image";
  const [kind, setKind] = useState<"image" | "video">(initialKind);
  const [status, setStatus] = useState<BackdropStatus>("loading");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    onStatus?.(status);
  }, [status, onStatus]);

  const videoSrc = preset?.video ?? url;
  const poster = preset?.poster;
  const showVideo = kind === "video" && status !== "fallback" && !(still && preset);

  // Bật tiếng TẮT bằng code (thuộc tính muted của React không luôn được áp
  // lên thẻ, mà iPhone chỉ cho tự phát video đã tắt tiếng), rồi tự phát.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !showVideo) return;
    v.muted = true;
    v.defaultMuted = true;
    if (still) return; // video tự dán + máy yếu: chỉ hiện khung hình đầu
    v.play().catch(() => {
      // Không tự phát được (iPhone ở chế độ nguồn điện thấp, trình duyệt chặn...).
      setStatus(poster ? "fallback" : "still");
    });

    // Khoá máy / chuyển app -> dừng; quay lại -> phát tiếp.
    function onVisibility() {
      if (!v) return;
      if (document.hidden) v.pause();
      else v.play().catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [showVideo, still, poster]);

  // Không hiện được gì -> để trống, màu nền app lộ ra. Không có ảnh vỡ.
  if (status === "error") return null;

  /* ---------- Cảnh có sẵn ở chế độ ảnh tĩnh, hoặc video lỗi -> poster ---------- */
  if (preset && (still || status === "fallback")) {
    return (
      <img
        src={preset.poster}
        alt=""
        className={COVER}
        onLoad={() => setStatus((s) => (s === "fallback" ? "fallback" : "still"))}
        onError={() => setStatus("error")}
      />
    );
  }

  if (showVideo && videoSrc) {
    return (
      <video
        ref={videoRef}
        className={COVER}
        src={videoSrc}
        poster={poster}
        muted
        loop
        playsInline
        autoPlay={!still}
        preload={still ? "metadata" : "auto"}
        disablePictureInPicture
        disableRemotePlayback
        // Ở chế độ tĩnh chỉ tải phần đầu file, nên "loadeddata" có thể không
        // bao giờ tới — lấy mốc "loadedmetadata" thay thế.
        onLoadedMetadata={() => still && setStatus("still")}
        onLoadedData={() => setStatus(still ? "still" : "ready")}
        onError={() => {
          if (poster) setStatus("fallback");
          else setStatus("error");
        }}
      />
    );
  }

  if (url && kind === "image") {
    return (
      <img
        src={url}
        alt=""
        className={COVER}
        onLoad={() => setStatus("ready")}
        onError={() => {
          // Không rõ loại -> thử tiếp như video; đã biết là ảnh -> báo lỗi.
          if (background.kind === "url" && background.media === "unknown") setKind("video");
          else setStatus("error");
        }}
      />
    );
  }

  return null;
}
