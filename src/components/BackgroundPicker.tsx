/**
 * Hộp "Hình nền" của màn "Phiên tập trung".
 *
 * Bố cục: ô dán link, dòng "Nền hiện tại", các nhóm thumbnail chọn nhanh,
 * rồi ba nút Xoá nền / Huỷ / Áp dụng.
 *
 * Quy tắc:
 *   - Chọn thumbnail hoặc dán link -> XEM TRƯỚC ngay trên nền thật phía sau
 *     hộp (qua onPreview), CHƯA lưu gì.
 *   - Chỉ "Áp dụng" mới lưu. "Huỷ", nút X, bấm ra ngoài hay phím Esc đều
 *     trả về nền đang dùng.
 *   - Link chưa tải được (hoặc là YouTube) thì nút Áp dụng bị khoá, kèm lý
 *     do — không bao giờ báo "thành công" giả.
 */
import { useEffect, useState } from "react";

import { BACKGROUND_PRESETS, GROUP_LABELS } from "../config/backgrounds";
import type { BackgroundGroup } from "../config/backgrounds";
import { NO_BACKGROUND, checkBackgroundUrl, describeBackground, sameBackground } from "../lib/background";
import type { FocusBackground } from "../lib/background";
import type { BackdropStatus } from "./FocusBackdrop";
import { Button } from "./ui";

type Props = {
  /** Nền đang dùng (đã lưu). */
  saved: FocusBackground;
  /** Trạng thái tải của nền đang hiện phía sau (bản xem trước). */
  previewStatus: BackdropStatus;
  /** Lý do nền phải là ảnh tĩnh trên máy này, nếu có. */
  stillNote: string | null;
  /** Hiện thử một nền phía sau. null = trả về nền đã lưu. */
  onPreview: (bg: FocusBackground | null) => void;
  onApply: (bg: FocusBackground) => void;
  onClose: () => void;
};

const GROUPS: BackgroundGroup[] = ["morning", "night", "study"];

export default function BackgroundPicker({ saved, previewStatus, stillNote, onPreview, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<FocusBackground>(saved);
  const [urlText, setUrlText] = useState(saved.kind === "url" ? saved.url : "");
  const check = checkBackgroundUrl(urlText);
  const urlError = !check.ok && check.reason !== "empty" ? check.message : null;

  function choose(bg: FocusBackground) {
    setDraft(bg);
    onPreview(bg);
  }

  function cancel() {
    onPreview(null);
    onClose();
  }

  // Dán / gõ link: chờ ngừng gõ một nhịp rồi mới tải thử, khỏi tải từng ký tự.
  useEffect(() => {
    const c = checkBackgroundUrl(urlText);
    if (!c.ok) return;
    const id = setTimeout(() => {
      const bg: FocusBackground = { kind: "url", url: c.url, media: c.media };
      setDraft(bg);
      onPreview(bg);
    }, 400);
    return () => clearTimeout(id);
  }, [urlText, onPreview]);

  // Esc = Huỷ.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") cancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const draftIsUrl = draft.kind === "url";
  const urlLoaded = draftIsUrl && (previewStatus === "ready" || previewStatus === "still");
  const canApply = !urlError && (!draftIsUrl || urlLoaded);

  return (
    // Nền mờ NHẸ: để thấy bản xem trước phía sau.
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
            Link ảnh / GIF / video (MP4, WebM)
          </label>
          <div
            className={`flex items-center gap-2 rounded-lg border bg-surface px-3 focus-within:outline focus-within:outline-1 ${
              urlError ? "border-bad focus-within:outline-bad" : "border-line focus-within:border-accent focus-within:outline-accent"
            }`}
          >
            <LinkIcon />
            <input
              id="bg-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={urlText}
              onChange={(e) => setUrlText(e.target.value)}
              placeholder="https://.../canh-nen.mp4"
              className="tap-target min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-3 focus:outline-none"
              aria-describedby="bg-url-help bg-url-status"
            />
          </div>
          <p id="bg-url-help" className="mt-1.5 text-xs text-ink-2">
            Dán link trực tiếp tới file .jpg, .png, .gif, .webp, .mp4 hoặc .webm (bắt đầu bằng https://). Link YouTube
            không dùng được làm nền.
          </p>

          <div id="bg-url-status" aria-live="polite">
            {urlError && <StatusLine tone="bad">{urlError}</StatusLine>}
            {!urlError && draftIsUrl && previewStatus === "loading" && (
              <StatusLine tone="neutral">Đang tải thử link...</StatusLine>
            )}
            {!urlError && draftIsUrl && urlLoaded && (
              <StatusLine tone="good">Tải được — đang xem trước phía sau. Bấm Áp dụng để dùng.</StatusLine>
            )}
            {!urlError && draftIsUrl && previewStatus === "error" && (
              <StatusLine tone="bad">
                Không tải được link này. Có thể link hỏng, không phải file ảnh/video, hoặc trang gốc chặn dùng ở
                trang khác.
              </StatusLine>
            )}
            {draft.kind === "preset" && previewStatus === "fallback" && (
              <StatusLine tone="warn">Video không phát được trên máy này — sẽ dùng ảnh tĩnh của cảnh này.</StatusLine>
            )}
          </div>

          {/* ---------- Nền hiện tại ---------- */}
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink-2">
            <CheckIcon />
            <span className="min-w-0 break-all">
              Nền hiện tại: <span className="text-ink">{describeBackground(saved)}</span>
            </span>
          </div>
          {stillNote && <p className="mt-2 text-xs text-ink-2">{stillNote}</p>}

          {/* ---------- Chọn nhanh ---------- */}
          <div className="my-4 flex items-center gap-3 text-sm text-ink-2">
            <span className="h-px flex-1 bg-line" />
            Hoặc chọn nhanh
            <span className="h-px flex-1 bg-line" />
          </div>

          {GROUPS.map((group) => (
            <section key={group} className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-ink">{GROUP_LABELS[group]}</h3>
              <div className="grid grid-cols-3 gap-2">
                {BACKGROUND_PRESETS.filter((p) => p.group === group).map((p) => {
                  const selected = draft.kind === "preset" && draft.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setUrlText("");
                        choose({ kind: "preset", id: p.id });
                      }}
                      aria-pressed={selected}
                      className="group text-left"
                    >
                      <span
                        className={`relative block aspect-video overflow-hidden rounded-lg border-2 ${
                          selected ? "border-accent" : "border-transparent"
                        }`}
                      >
                        <img src={p.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                        {selected && (
                          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-on-accent">
                            <CheckIcon small />
                          </span>
                        )}
                      </span>
                      <span className={`mt-1 block text-xs leading-snug ${selected ? "text-ink" : "text-ink-2"}`}>
                        {p.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {/* ---------- Ghi công tác giả (bắt buộc với CC BY / CC BY-SA) ---------- */}
          <details className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-2">
            <summary className="tap-target flex cursor-pointer items-center text-sm text-ink-2">
              Nguồn & giấy phép video
            </summary>
            <p className="mt-1 mb-2">
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
          <Button
            onClick={() => onApply(draft)}
            disabled={!canApply}
            className="flex items-center gap-1.5"
          >
            <CheckIcon small />
            {sameBackground(draft, saved) ? "Giữ nền này" : "Áp dụng"}
          </Button>
        </div>
      </div>
    </div>
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
