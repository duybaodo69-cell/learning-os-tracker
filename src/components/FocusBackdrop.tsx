/**
 * Lớp nền phủ kín màn hình PHÍA SAU đồng hồ của "Phiên tập trung".
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

/**
 * Trạng thái để báo lên trên:
 *   ready    — đang hiện đúng thứ đã chọn
 *   still    — là video nhưng đang hiện ảnh tĩnh (máy yếu, không tự phát được...)
 *   fallback — video lỗi, đang hiện ảnh tĩnh thay thế
 *   error    — không hiện được gì (link hỏng / bị chặn)
 */
export type BackdropStatus = "none" | "loading" | "ready" | "still" | "fallback" | "error";

type Props = {
  background: FocusBackground;
  /** true = không phát video, chỉ hiện ảnh tĩnh (xem stillReason trong lib/background.ts). */
  still: boolean;
  onStatus?: (status: BackdropStatus) => void;
};

export default function FocusBackdrop({ background, still, onStatus }: Props) {
  // Mỗi lựa chọn mới dựng lại phần tử media từ đầu (key), nên trạng thái
  // lỗi của nền cũ không dính sang nền mới.
  const key =
    background.kind === "preset" ? `p:${background.id}` : background.kind === "url" ? `u:${background.url}` : "none";

  useEffect(() => {
    if (background.kind === "none") onStatus?.("none");
  }, [background.kind, onStatus]);

  if (background.kind === "none") return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-canvas" aria-hidden="true">
      <Media key={`${key}:${still}`} background={background} still={still} onStatus={onStatus} />
      {/* Lớp phủ tối: đậm hơn ở trên (tiêu đề) và dưới (nút), nhẹ ở giữa để thấy cảnh. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.42) 35%, rgba(0,0,0,0.45) 65%, rgba(0,0,0,0.65) 100%)",
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
