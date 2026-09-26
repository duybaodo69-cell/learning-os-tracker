/**
 * Hộp "Hình nền" của màn "Phiên tập trung".
 *
 * Bố cục: ô dán link, dòng "Nền hiện tại", các nhóm thumbnail chọn nhanh,
 * rồi ba nút Xoá nền / Huỷ / Áp dụng.
 *
 * HAI CHẾ ĐỘ, hiện rõ trong hộp:
 *   - Link YouTube / video mẫu YouTube -> PLAYER: video trong khung riêng,
 *     đồng hồ bên cạnh (ngang) hoặc bên dưới (dọc), không phủ lên video.
 *     Xem trước ngay TRONG hộp này (khung nhỏ), để bấm ▶ được khi trình
 *     duyệt chặn tự phát.
 *   - Link ảnh/GIF/video trực tiếp / cảnh mẫu -> NỀN PHỦ sau đồng hồ.
 *     Xem trước trên nền thật phía sau hộp.
 *
 * Quy tắc:
 *   - Chọn hay dán chỉ là XEM TRƯỚC. Chỉ "Áp dụng" mới lưu. "Huỷ", nút X,
 *     bấm ra ngoài hay phím Esc đều trả về nền đang dùng.
 *   - Áp dụng bị khoá tới khi bản xem trước THẬT SỰ hiện được (YouTube:
 *     đã phát; link trực tiếp: đã tải) — không bao giờ báo thành công giả.
 */
import { useEffect, useRef, useState } from "react";

import { BACKGROUND_PRESETS, GROUP_LABELS } from "../config/backgrounds";
import type { BackgroundGroup } from "../config/backgrounds";
import { YOUTUBE_PRESETS } from "../config/youtubePresets";
import { NO_BACKGROUND, checkBackgroundUrl, describeBackground, displayMode, sameBackground } from "../lib/background";
import type { FocusBackground } from "../lib/background";
import type { BackdropStatus } from "./FocusBackdrop";
import YouTubePlayer from "./YouTubePlayer";
import type { PlayerStatus } from "./YouTubePlayer";
import { Button } from "./ui";

type Props = {
  /** Nền đang dùng (đã lưu). */
  saved: FocusBackground;
  /** Trạng thái tải của nền phủ đang xem trước phía sau hộp. */
  previewStatus: BackdropStatus;
  /** Lý do máy này không tự phát video (giảm chuyển động...), nếu có. */
  stillNote: string | null;
  /** Hiện thử một NỀN PHỦ phía sau. null = trả về nền đã lưu. */
  onPreview: (bg: FocusBackground | null) => void;
  onApply: (bg: FocusBackground) => void;
  onClose: () => void;
};

const OVERLAY_GROUPS: BackgroundGroup[] = ["morning", "night", "study"];

export default function BackgroundPicker({ saved, previewStatus, stillNote, onPreview, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<FocusBackground>(saved);
  const [urlText, setUrlText] = useState(saved.kind === "url" ? saved.url : "");
  // Trạng thái của khung xem trước YouTube trong hộp.
  const [ytStatus, setYtStatus] = useState<PlayerStatus>({ state: "loading" });

  // true = vừa sửa link, chưa kịp xem thử link MỚI. Trong lúc này mọi trạng
  // thái đang hiện là của lựa chọn CŨ, nên khoá Áp dụng — nếu không, bấm
  // nhanh sẽ lưu nhầm video trước đó trong khi ô nhập đã là link khác.
  const [pending, setPending] = useState(false);
  const ytPreviewRef = useRef<HTMLDivElement>(null);

  const check = checkBackgroundUrl(urlText);
  const urlError = !check.ok && check.reason !== "empty" ? check.message : null;
  const linkMode = check.ok ? displayMode(check.background) : null;

  function choose(bg: FocusBackground) {
    setDraft(bg);
    if (bg.kind === "youtube") {
      setYtStatus({ state: "loading" });
      // YouTube xem trước trong hộp; phía sau trả về nền đã lưu.
      onPreview(null);
    } else {
      onPreview(bg);
    }
  }

  function cancel() {
    onPreview(null);
    onClose();
  }

  // Dán / gõ link: chờ ngừng gõ một nhịp rồi mới tải thử, khỏi tải từng ký tự.
  useEffect(() => {
    const c = checkBackgroundUrl(urlText);
    if (!c.ok) {
      setPending(false);
      return;
    }
    const id = setTimeout(() => {
      choose(c.background);
      setPending(false);
    }, 400);
    return () => clearTimeout(id);
    // choose chỉ gọi setState + onPreview (ổn định) — không cần theo dõi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlText]);

  // Chọn video YouTube -> cuộn tới khung xem trước. Trên điện thoại xoay
  // ngang, thumbnail nằm dưới xa nên khung xem trước (và lời nhắc "bấm ▶")
  // sẽ khuất khỏi màn hình nếu không cuộn.
  const draftVideo = draft.kind === "youtube" ? draft.videoId : null;
  useEffect(() => {
    if (draftVideo) ytPreviewRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [draftVideo]);

  // Esc = Huỷ.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") cancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Giữ nguyên nền đang dùng thì không cần thử lại (và không mở player thứ hai).
  const unchanged = sameBackground(draft, saved) && !pending;
  const isYouTube = draft.kind === "youtube" && !unchanged;
  const isUrl = draft.kind === "url" && !unchanged;
  const urlLoaded = isUrl && (previewStatus === "ready" || previewStatus === "still");
  const ytPlaying = isYouTube && ytStatus.state === "playing";
  const canApply = !pending && !urlError && (unchanged || (isYouTube ? ytPlaying : !isUrl || urlLoaded));

  return (
    // Nền mờ NHẸ: để thấy bản xem trước nền phủ phía sau.
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center sm:p-4" onClick={cancel}>
      <div
        className="flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-xl border border-line bg-surface-2 shadow-[0_8px_32px_rgba(0,0,0,0.65)] sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bg-picker-title"
      >
        {/* ---------- Tiêu đề ---------- */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 id="bg-picker-title" className="flex items-center gap-2 text-lg font-bold text-ink">
            <ImageIcon />
            Hình nền
          </h2>
          <button
            type="button"
            onClick={cancel}
            className="tap-target -mr-2 flex items-center justify-center rounded-lg text-ink-2 active:bg-surface"
            aria-label="Đóng, giữ nền hiện tại"
          >
            <XIcon />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          {/* ---------- Ô dán link ---------- */}
          <label htmlFor="bg-url" className="mb-1.5 block text-sm font-semibold text-ink">
            Link YouTube, ảnh / GIF / video (MP4, WebM)
          </label>
          <div
            className={`flex items-center gap-2 rounded-lg border bg-surface px-3 focus-within:outline focus-within:outline-1 ${
              urlError ? "border-bad focus-within:outline-bad" : "border-line focus-within:border-accent focus-within:outline-accent"
            }`}
          >
            {linkMode === "player" ? <PlayIcon /> : <LinkIcon />}
            <input
              id="bg-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={urlText}
              onChange={(e) => {
                setUrlText(e.target.value);
                setPending(true);
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="tap-target min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-3 focus:outline-none"
              aria-describedby="bg-url-help bg-url-status"
            />
          </div>
          <p id="bg-url-help" className="mt-1.5 text-xs text-ink-2">
            Link YouTube → <strong className="text-ink">player riêng</strong>, đồng hồ nằm bên cạnh. Link trực tiếp tới
            file .jpg, .png, .gif, .webp, .mp4, .webm (https://) → <strong className="text-ink">nền phủ</strong> sau đồng
            hồ.
          </p>

          <div id="bg-url-status" aria-live="polite">
            {urlError && <StatusLine tone="bad">{urlError}</StatusLine>}
            {linkMode && <ModeChip mode={linkMode} />}
            {pending && !urlError && linkMode && <StatusLine tone="neutral">Đang kiểm tra link...</StatusLine>}
            {!pending && !urlError && isUrl && previewStatus === "loading" && <StatusLine tone="neutral">Đang tải thử link...</StatusLine>}
            {!pending && !urlError && isUrl && urlLoaded && (
              <StatusLine tone="good">Tải được — đang xem trước phía sau. Bấm Áp dụng để dùng.</StatusLine>
            )}
            {!pending && !urlError && isUrl && previewStatus === "error" && (
              <StatusLine tone="bad">
                Không tải được link này. Có thể link hỏng, không phải file ảnh/video, hoặc trang gốc chặn dùng ở
                trang khác.
              </StatusLine>
            )}
            {draft.kind === "preset" && previewStatus === "fallback" && (
              <StatusLine tone="warn">Video không phát được trên máy này — sẽ dùng ảnh tĩnh của cảnh này.</StatusLine>
            )}
          </div>

          {/* ---------- Xem trước YouTube (trong hộp, bấm được) ---------- */}
          {isYouTube && draft.kind === "youtube" && !pending && !urlError && (
            <div ref={ytPreviewRef} className="mt-3 scroll-mt-2">
              <div className="aspect-video overflow-hidden rounded-lg border border-line bg-black">
                <YouTubePlayer
                  key={`${draft.videoId}:${draft.start ?? 0}`}
                  videoId={draft.videoId}
                  start={draft.start}
                  autoplay={stillNote === null}
                  onStatus={setYtStatus}
                />
              </div>
              {ytStatus.state === "loading" && <StatusLine tone="neutral">Đang tải video YouTube...</StatusLine>}
              {ytStatus.state === "playing" && (
                <StatusLine tone="good">Video đang phát. Bấm Áp dụng để dùng khi bấm giờ.</StatusLine>
              )}
              {ytStatus.state === "blocked" && (
                <StatusLine tone="warn">{ytStatus.message} Phát được thì mới Áp dụng được.</StatusLine>
              )}
              {ytStatus.state === "error" && <StatusLine tone="bad">Không phát được: {ytStatus.message}</StatusLine>}
            </div>
          )}

          {/* ---------- Nền hiện tại ---------- */}
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink-2">
            <CheckIcon />
            <span className="min-w-0 break-all">
              Nền hiện tại: <span className="text-ink">{describeBackground(saved)}</span>
            </span>
          </div>
          {stillNote && <p className="mt-2 text-xs text-ink-2">{stillNote} Video YouTube sẽ không tự phát.</p>}

          {/* ---------- Chọn nhanh ---------- */}
          <div className="my-4 flex items-center gap-3 text-sm text-ink-2">
            <span className="h-px flex-1 bg-line" />
            Hoặc chọn nhanh
            <span className="h-px flex-1 bg-line" />
          </div>

          <GroupTitle mode="player">YouTube · Study with me</GroupTitle>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {YOUTUBE_PRESETS.map((p) => (
              <Thumb
                key={p.videoId}
                label={p.label}
                src={p.thumb}
                badge="youtube"
                selected={draft.kind === "youtube" && draft.videoId === p.videoId}
                onClick={() => {
                  setUrlText("");
                  choose({ kind: "youtube", videoId: p.videoId });
                }}
              />
            ))}
          </div>

          {OVERLAY_GROUPS.map((group) => (
            <section key={group} className="mb-4">
              <GroupTitle mode="overlay">{`Nền phủ · ${GROUP_LABELS[group]}`}</GroupTitle>
              <div className="grid grid-cols-3 gap-2">
                {BACKGROUND_PRESETS.filter((p) => p.group === group).map((p) => (
                  <Thumb
                    key={p.id}
                    label={p.label}
                    src={p.thumb}
                    selected={draft.kind === "preset" && draft.id === p.id}
                    onClick={() => {
                      setUrlText("");
                      choose({ kind: "preset", id: p.id });
                    }}
                  />
                ))}
              </div>
            </section>
          ))}

          {/* ---------- Ghi công ---------- */}
          <details className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-2">
            <summary className="tap-target flex cursor-pointer items-center text-sm text-ink-2">
              Nguồn & giấy phép video
            </summary>
            <p className="mt-1 mb-1 font-semibold text-ink">Video YouTube</p>
            <p className="mb-2">
              Phát bằng player nhúng chính thức của YouTube, bản quyền thuộc kênh gốc. App không tải hay chỉnh sửa video.
            </p>
            <ul className="mb-3 space-y-1.5">
              {YOUTUBE_PRESETS.map((p) => (
                <li key={p.videoId}>
                  <span className="text-ink">{p.label}</span> —{" "}
                  <a href={p.url} target="_blank" rel="noreferrer" className="underline">
                    {p.channel}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mb-1 font-semibold text-ink">Nền phủ</p>
            <p className="mb-2">
              Tất cả từ Wikimedia Commons. Đã cắt ngắn, nén lại và bỏ tiếng; ảnh nhỏ là khung hình của chính video.
            </p>
            <ul className="space-y-1.5 pb-1">
              {BACKGROUND_PRESETS.map((p) => (
                <li key={p.id}>
                  <span className="text-ink">{p.label}</span> —{" "}
                  <a href={p.source.page} target="_blank" rel="noreferrer" className="underline">
                    {p.source.author}
                  </a>
                  ,{" "}
                  <a href={p.source.licenseUrl} target="_blank" rel="noreferrer" className="underline">
                    {p.source.license}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </div>

        {/* ---------- Nút ---------- */}
        <div
          className="flex items-center gap-2 border-t border-line px-5 py-3"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <Button
            variant="secondary"
            onClick={() => {
              setUrlText("");
              choose(NO_BACKGROUND);
            }}
            disabled={draft.kind === "none"}
            className="flex items-center gap-1.5 text-sm"
          >
            <XIcon small />
            Xoá nền
          </Button>
          <span className="flex-1" />
          <Button variant="ghost" onClick={cancel}>
            Huỷ
          </Button>
          <Button onClick={() => onApply(draft)} disabled={!canApply} className="flex items-center gap-1.5">
            <CheckIcon small />
            {unchanged ? "Giữ nền này" : "Áp dụng"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Mảnh nhỏ ---------- */

function ModeChip({ mode }: { mode: "none" | "overlay" | "player" }) {
  if (mode === "none") return null;
  return (
    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-indigo/40 bg-indigo/15 px-3 py-1 text-xs font-semibold text-indigo-ink">
      {mode === "player" ? <PlayIcon small /> : <LayersIcon />}
      {mode === "player"
        ? "Chế độ player YouTube: video ở khung riêng, đồng hồ bên cạnh"
        : "Chế độ nền phủ: hình / video phủ kín phía sau đồng hồ"}
    </p>
  );
}

function GroupTitle({ mode, children }: { mode: "player" | "overlay"; children: string }) {
  return (
    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
      {mode === "player" ? <PlayIcon small /> : <LayersIcon />}
      {children}
    </h3>
  );
}

function Thumb({
  label,
  src,
  selected,
  badge,
  onClick,
}: {
  label: string;
  src: string;
  selected: boolean;
  badge?: "youtube";
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className="text-left">
      <span
        className={`relative block aspect-video overflow-hidden rounded-lg border-2 bg-black ${
          selected ? "border-accent" : "border-transparent"
        }`}
      >
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        {badge === "youtube" && (
          <span className="absolute right-1 bottom-1 rounded bg-black/75 px-1 py-0.5 text-white">
            <PlayIcon small />
          </span>
        )}
        {selected && (
          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-on-accent">
            <CheckIcon small />
          </span>
        )}
      </span>
      <span className={`mt-1 block text-xs leading-snug ${selected ? "text-ink" : "text-ink-2"}`}>{label}</span>
    </button>
  );
}

function StatusLine({ tone, children }: { tone: "good" | "warn" | "bad" | "neutral"; children: React.ReactNode }) {
  const color = { good: "text-good", warn: "text-warn", bad: "text-bad-ink", neutral: "text-ink-2" }[tone];
  return <p className={`mt-2 text-sm ${color}`}>{children}</p>;
}

/* ---------- Icon nhỏ, vẽ bằng SVG để khỏi thêm thư viện ---------- */

function ImageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-ink-2" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </svg>
  );
}

function PlayIcon({ small }: { small?: boolean }) {
  const s = small ? 14 : 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <path d="m10 9 5 3-5 3z" fill="currentColor" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden="true">
      <path d="m12 2 10 5-10 5L2 7z" />
      <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function XIcon({ small }: { small?: boolean }) {
  const s = small ? 16 : 22;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function CheckIcon({ small }: { small?: boolean }) {
  const s = small ? 14 : 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={small ? "" : "mt-0.5 shrink-0 text-good"} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
