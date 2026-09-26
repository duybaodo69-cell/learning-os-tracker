/**
 * Màn hình "Phiên tập trung" — chiếm trọn màn hình khi bộ đếm đang chạy.
 *
 * Thanh tab dưới cùng bị ẩn: trong lúc làm việc sâu, không có lối tắt nào
 * dẫn sang chỗ khác. Muốn ra thì chỉ có hai đường: Hoàn thành hoặc Huỷ.
 *
 * Mọi con số đều tính từ dữ liệu lưu trong localStorage (mốc bắt đầu, số
 * phân tâm, việc chen ngang), nên đóng app rồi mở lại vẫn quay về đúng phiên.
 *
 * HÌNH NỀN (FocusBackdrop + BackgroundPicker): một cảnh động phủ kín màn
 * hình phía sau đồng hồ. Nền chỉ là lớp trang trí — đổi nền, xem trước,
 * nền lỗi hay vào/thoát toàn màn hình KHÔNG đụng tới mốc bắt đầu, nên
 * không thể làm sai thời gian phiên.
 *
 * XOAY NGANG: màn hình ngang chia hai cột (đồng hồ | nút bấm). Nút toàn màn
 * hình thử khoá hướng ngang; trình duyệt không cho thì nhắc tự xoay máy.
 */
import { useCallback, useEffect, useState } from "react";

import { db } from "../db/db";
import type { FocusBlock } from "../db/types";
import { formatMinutes, todayISO } from "../lib/dates";
import { getLastArea } from "../lib/prefs";
import {
  SUSPICIOUS_MINUTES,
  addTimerCapture,
  addTimerDistraction,
  clearSession,
  elapsedClock,
  elapsedMinutes,
  getTimerCaptures,
  getTimerDistractions,
  isSuspiciousDuration,
  removeTimerDistraction,
} from "../lib/timer";
import { getBackground, readDeviceHints, saveBackground, stillReason } from "../lib/background";
import type { FocusBackground } from "../lib/background";
import { canFullscreen, enterFullscreen, exitFullscreen, isFullscreen, onFullscreenChange } from "../lib/fullscreen";

import BackgroundPicker from "../components/BackgroundPicker";
import FocusBackdrop from "../components/FocusBackdrop";
import type { BackdropStatus } from "../components/FocusBackdrop";
import ConfirmDialog from "../components/ConfirmDialog";
import FocusBlockForm from "../components/FocusBlockForm";
import { Button, SectionLabel, Tag } from "../components/ui";

/** Mốc tham chiếu cho vòng tròn tiến độ: 45 phút là một vòng đầy. */
const REFERENCE_MINUTES = 45;

// Các class `[@media(max-height:500px)]:...` = màn hình thấp (điện thoại xoay
// ngang): thu nhỏ đồng hồ và khoảng cách. Phải viết nguyên văn, vì Tailwind
// chỉ nhận ra class viết thẳng trong code, không nhận class ghép từ biến.

/** Số liệu chốt lại tại lúc bấm "Hoàn thành phiên". */
type Snapshot = {
  minutes: number;
  startTime: string;
  distractions: number;
  capturedNotes: string[];
};

export default function FocusSession({
  startedAt,
  onExit,
}: {
  /** Mốc bắt đầu (milli giây). */
  startedAt: number;
  /** Gọi khi phiên kết thúc (đã lưu hoặc đã huỷ) để quay về màn hình chính. */
  onExit: () => void;
}) {
  const [distractions, setDistractions] = useState<number>(getTimerDistractions);
  const [captures, setCaptures] = useState<string[]>(getTimerCaptures);
  const [captureText, setCaptureText] = useState("");

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [longSession, setLongSession] = useState<Snapshot | null>(null);
  // Có snapshot = đang mở bottom sheet kết thúc phiên.
  const [finishing, setFinishing] = useState<Snapshot | null>(null);

  // "Bây giờ" giữ trong state và cập nhật mỗi giây, thay vì đọc đồng hồ
  // ngay lúc vẽ (đọc lúc vẽ làm kết quả không ổn định). Đây CHỈ để hiển thị —
  // số phút thật khi lưu luôn tính lại từ mốc bắt đầu.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const clock = elapsedClock(startedAt, now);

  const started = new Date(startedAt);
  const startLabel = `${String(started.getHours()).padStart(2, "0")}:${String(started.getMinutes()).padStart(2, "0")}`;
  const area = getLastArea();

  /* ----- Hình nền ----- */
  const [savedBg, setSavedBg] = useState<FocusBackground>(getBackground);
  // Bản đang xem thử trong hộp chọn; null = hiện nền đã lưu.
  const [previewBg, setPreviewBg] = useState<FocusBackground | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bgStatus, setBgStatus] = useState<BackdropStatus>("none");
  // Đọc một lần: máy yếu / giảm chuyển động / tiết kiệm dữ liệu -> ảnh tĩnh.
  const [stillNote] = useState(() => stillReason(readDeviceHints()));
  const shownBg = previewBg ?? savedBg;
  const hasBg = shownBg.kind !== "none";

  const handlePreview = useCallback((bg: FocusBackground | null) => {
    setPreviewBg(bg);
    // Đặt lại "đang tải" NGAY, để hộp chọn không kịp đọc trạng thái "tải được"
    // của nền trước mà mở khoá nút Áp dụng cho một link chưa tải xong.
    setBgStatus("loading");
  }, []);

  function applyBackground(bg: FocusBackground) {
    saveBackground(bg);
    setSavedBg(bg);
    setPreviewBg(null);
    setPickerOpen(false);
  }

  function closePicker() {
    setPreviewBg(null);
    setPickerOpen(false);
  }

  /* ----- Toàn màn hình + xoay ngang ----- */
  const [fullscreen, setFullscreen] = useState(isFullscreen);
  const [portrait, setPortrait] = useState(
    () => typeof window.matchMedia === "function" && window.matchMedia("(orientation: portrait)").matches
  );
  // Nhắc xoay máy: bật khi đã bấm nút toàn màn hình mà máy vẫn đứng dọc.
  const [wantLandscape, setWantLandscape] = useState(false);

  useEffect(() => onFullscreenChange(() => setFullscreen(isFullscreen())), []);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(orientation: portrait)");
    const update = () => setPortrait(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  async function toggleFullscreen() {
    if (fullscreen) {
      await exitFullscreen();
      setWantLandscape(false);
      return;
    }
    const r = canFullscreen() ? await enterFullscreen() : { entered: false, locked: false };
    // Không khoá được hướng ngang (iPhone, máy tính...) -> nhắc tự xoay nếu đang dọc.
    setWantLandscape(!r.locked);
  }
  const showRotateHint = wantLandscape && portrait;

  // Khung thẻ: có nền thì hơi trong suốt để thấy cảnh. Độ đậm lấy từ biến
  // --glass trong index.css (tối 90%, sáng 94%), tính cho trường hợp xấu nhất
  // — video trắng xoá hoặc đen kịt ngay sau thẻ — chữ mờ nhất vẫn >= 4.5:1. Không dùng hiệu ứng làm mờ (blur) phía sau vì blur chồng
  // lên video rất tốn pin trên điện thoại.
  const panel = hasBg
    ? "rounded-lg border border-white/10 bg-[color-mix(in_srgb,var(--surface)_var(--glass),transparent)] p-4"
    : "rounded-lg border border-line bg-surface p-4";

  /* ----- Vòng tròn tiến độ tới mốc 45 phút ----- */
  const R = 88;
  const CIRC = 2 * Math.PI * R;
  const progress = Math.min(1, (now - startedAt) / (REFERENCE_MINUTES * 60000));

  function handleCapture() {
    const r = addTimerCapture(captureText);
    setCaptures(r.captures);
    setDistractions(r.distractions);
    setCaptureText("");
  }

  /** Bấm "Hoàn thành phiên": chốt số liệu tại thời điểm này. */
  function handleFinish() {
    const snap: Snapshot = {
      minutes: Math.max(1, elapsedMinutes(startedAt)),
      startTime: startLabel,
      distractions: getTimerDistractions(),
      capturedNotes: getTimerCaptures(),
    };
    // Quá 3 tiếng gần như luôn là quên bấm — hỏi trước khi điền vào form (sửa 9).
    if (isSuspiciousDuration(snap.minutes)) {
      setLongSession(snap);
      return;
    }
    setFinishing(snap);
  }

  async function handleSave(block: FocusBlock) {
    // Ngày lấy NGAY LÚC LƯU (sửa 1): phiên bắt đầu 23:30, lưu lúc 00:15 thì
    // vẫn ghi đúng ngày đang hiện trên lịch lúc bấm.
    await db.focusBlocks.put({ ...block, date: todayISO() });
    clearSession();
    void exitFullscreen();
    onExit();
  }

  function handleCancelSession() {
    clearSession();
    setConfirmCancel(false);
    void exitFullscreen();
    onExit();
  }

  return (
    <div className="relative flex h-full flex-col">
      <FocusBackdrop background={shownBg} still={stillNote !== null} onStatus={setBgStatus} />

      <header
        className={`relative z-10 border-b px-4 pt-4 pb-3 [@media(max-height:500px)]:pt-2 [@media(max-height:500px)]:pb-2 ${
          hasBg ? "border-white/10 bg-[color-mix(in_srgb,var(--canvas)_var(--glass),transparent)]" : "border-line bg-canvas/95"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-wide text-ink uppercase">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-good" aria-hidden="true" />
            Phiên tập trung
          </h1>
          <div className="flex items-center gap-1.5">
            <Tag tone="indigo">{area}</Tag>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="tap-target flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 text-sm font-semibold text-ink active:bg-surface"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
              </svg>
              Hình nền
            </button>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="tap-target flex items-center justify-center rounded-lg border border-line bg-surface-2 px-2.5 text-ink active:bg-surface"
              aria-label={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
              title={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                {fullscreen ? (
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                ) : (
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Nền không hiện được như đã chọn -> nói rõ, không im lặng. */}
        {!pickerOpen && bgStatus === "fallback" && (
          <p className="mt-2 text-xs text-warn">Video nền không phát được — đang dùng ảnh tĩnh của cảnh này.</p>
        )}
        {!pickerOpen && bgStatus === "error" && hasBg && (
          <p className="mt-2 text-xs text-warn">Không tải được hình nền — đang dùng màu nền mặc định.</p>
        )}
        {showRotateHint && (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-accent/40 bg-surface-2 px-3 py-2 text-sm text-ink">
            <span>
              {canFullscreen()
                ? "Xoay ngang điện thoại để xem toàn cảnh."
                : "Trình duyệt này không có chế độ toàn màn hình. Xoay ngang máy để xem toàn cảnh; trên iPhone, thêm app vào Màn hình chính để ẩn thanh địa chỉ."}
            </span>
            <button type="button" onClick={() => setWantLandscape(false)} className="tap-target shrink-0 px-2 text-sm text-ink-2">
              Đóng
            </button>
          </div>
        )}
      </header>

      <main className={`relative z-10 flex-1 overflow-y-auto px-4 py-4 [@media(max-height:500px)]:py-2`}>
        <div className="mx-auto w-full max-w-5xl landscape:grid landscape:grid-cols-2 landscape:items-start landscape:gap-4">
          {/* ---------- Đồng hồ (cột trái khi xoay ngang) ---------- */}
          <div className={`${panel} mb-4 flex flex-col items-center py-6 [@media(max-height:500px)]:py-3`}>
            <div className={`relative h-52 w-52 [@media(max-height:500px)]:h-40 [@media(max-height:500px)]:w-40`}>
              <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
                <circle cx="100" cy="100" r={R} fill="none" stroke="var(--line)" strokeWidth="8" />
                <circle
                  cx="100"
                  cy="100"
                  r={R}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - progress)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs tracking-wider text-ink-2 uppercase">Đã trôi qua</span>
                <span className={`font-num text-5xl font-semibold text-ink [@media(max-height:500px)]:text-4xl`}>{clock}</span>
                <span className="mt-1 text-xs text-ink-3">vòng đầy = {REFERENCE_MINUTES} phút</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-ink-2">
              Bắt đầu <span className="font-num text-ink">{startLabel}</span>
            </p>
          </div>

          {/* ---------- Các nút (cột phải khi xoay ngang) ---------- */}
          <div>
            {/* +1 phân tâm: MỘT nút lớn, số đếm nằm bên trong */}
            <button
              type="button"
              onClick={() => setDistractions(addTimerDistraction())}
              className={`mb-2 flex min-h-16 w-full items-center justify-between rounded-lg border border-warn/50 px-5 text-left active:bg-warn/25 ${
                // Có nền: lót màu thẻ gần như đặc, nếu không lớp cam trong suốt
                // nằm thẳng trên video và chữ cam mất tương phản.
                hasBg ? "bg-[color-mix(in_srgb,var(--surface)_88%,var(--warn))]" : "bg-warn/12"
              }`}
            >
              <span className="text-xl font-bold text-warn">+1 phân tâm</span>
              <span className="rounded-lg border border-warn/40 bg-canvas px-4 py-1 font-num text-2xl font-semibold text-warn">
                {distractions}
              </span>
            </button>
            <div className={`mb-4 flex items-center justify-between px-1 ${hasBg ? "rounded-lg bg-[color-mix(in_srgb,var(--canvas)_var(--glass),transparent)] px-2" : ""}`}>
              <p className="text-xs text-ink-3">Bấm ngay lúc vừa bị phân tâm — nhớ lại sau luôn thiếu.</p>
              {distractions > 0 && (
                <button
                  type="button"
                  onClick={() => setDistractions(removeTimerDistraction())}
                  className="tap-target shrink-0 px-2 text-sm text-ink-2"
                >
                  Bớt 1
                </button>
              )}
            </div>

            {/* Việc chen ngang */}
            <div className={`${panel} mb-4`}>
              <SectionLabel right="mỗi ghi chú +1 phân tâm">Việc chen ngang</SectionLabel>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={captureText}
                  onChange={(e) => setCaptureText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCapture();
                  }}
                  placeholder="Ghi ra để khỏi giữ trong đầu..."
                  className="tap-target min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3 text-base text-ink placeholder:text-ink-3 focus:border-accent focus:outline focus:outline-1 focus:outline-accent"
                />
                <Button onClick={handleCapture} disabled={captureText.trim() === ""} className="shrink-0">
                  Ghi
                </Button>
              </div>
              {captures.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {captures.map((c, i) => (
                    <li key={i} className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink-2">
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Kết thúc */}
            <div className="mb-6 grid grid-cols-[1fr_2fr] gap-2">
              <Button variant="secondary" onClick={() => setConfirmCancel(true)}>
                Huỷ phiên
              </Button>
              <Button onClick={handleFinish} className="py-3 text-base">
                Hoàn thành phiên
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* ---------- Hộp chọn hình nền ---------- */}
      {pickerOpen && (
        <BackgroundPicker
          saved={savedBg}
          previewStatus={bgStatus}
          stillNote={stillNote}
          onPreview={handlePreview}
          onApply={applyBackground}
          onClose={closePicker}
        />
      )}

      {/* ---------- Bottom sheet: chỉ hiện SAU khi bấm "Hoàn thành phiên" ---------- */}
      {finishing && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/70" onClick={() => setFinishing(null)}>
          <div
            className="max-h-[88dvh] w-full overflow-y-auto rounded-t-xl border-t border-accent/60 bg-surface-2 p-4 shadow-[0_-8px_32px_rgba(0,0,0,0.65)]"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
            <SectionLabel right={formatMinutes(finishing.minutes)}>Ghi nhận kết thúc phiên</SectionLabel>
            <FocusBlockForm
              date={todayISO()}
              initialMinutes={finishing.minutes}
              initialStartTime={finishing.startTime}
              initialDistractions={finishing.distractions}
              initialCapturedNotes={finishing.capturedNotes}
              onSave={handleSave}
              // Đóng sheet thì phiên VẪN CHẠY — chưa lưu gì, chưa mất gì.
              onCancel={() => setFinishing(null)}
            />
          </div>
        </div>
      )}

      {/* Huỷ phiên = bỏ toàn bộ số liệu đã đếm (luật số 4: phải hỏi). */}
      <ConfirmDialog
        open={confirmCancel}
        title="Huỷ phiên này?"
        detail={
          <>
            Bỏ <strong className="font-num">{clock}</strong> đã đếm,{" "}
            <strong className="font-num">{distractions}</strong> lần phân tâm
            {captures.length > 0 && (
              <>
                {" "}
                và <strong className="font-num">{captures.length}</strong> việc chen ngang
              </>
            )}
            . Không có block nào được lưu.
          </>
        }
        confirmLabel="Huỷ phiên"
        onConfirm={handleCancelSession}
        onCancel={() => setConfirmCancel(false)}
      />

      <ConfirmDialog
        open={longSession !== null}
        title="Phiên này dài bất thường"
        detail={
          longSession && (
            <>
              Bộ đếm chạy <strong>{formatMinutes(longSession.minutes)}</strong>, bắt đầu lúc{" "}
              {longSession.startTime}.
              <br />
              Quá {formatMinutes(SUSPICIOUS_MINUTES)} thường là do quên bấm Hoàn thành. Nếu ghi vào,
              con số này sẽ làm lệch thống kê deep work — bạn vẫn sửa được số phút ở bước sau.
            </>
          )
        }
        confirmLabel="Tiếp tục"
        destructive={false}
        onConfirm={() => {
          if (longSession) setFinishing(longSession);
          setLongSession(null);
        }}
        onCancel={() => setLongSession(null)}
      />
    </div>
  );
}
