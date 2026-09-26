/**
 * Màn hình "Phiên tập trung" — chiếm trọn màn hình khi bộ đếm đang chạy.
 *
 * Thanh tab dưới cùng bị ẩn: trong lúc làm việc sâu, không có lối tắt nào
 * dẫn sang chỗ khác. Muốn ra thì chỉ có hai đường: Hoàn thành hoặc Huỷ.
 *
 * Mọi con số đều tính từ dữ liệu lưu trong localStorage (mốc bắt đầu, số
 * phân tâm, việc chen ngang), nên đóng app rồi mở lại vẫn quay về đúng phiên.
 *
 * BỐ CỤC (kiểu openquiz.ai): cảnh nền phủ kín màn hình (FocusBackdrop — video
 * MP4, ảnh, hoặc video YouTube), đồng hồ lớn nổi CHÍNH GIỮA trên một gradient
 * tối tỏa tròn, một hàng nút nhỏ ở trên (bật/tắt video, ⚙ Cài đặt, toàn màn
 * hình) và một hàng nút ở dưới (phân tâm, chen ngang, huỷ, hoàn thành).
 * Cảnh nền không nhận chạm: mọi thao tác là của đồng hồ và nút của app.
 *
 * Cảnh nền chỉ là lớp trang trí — tải video, bật/tắt video, mở Cài đặt, đổi
 * nền hay video lỗi KHÔNG đụng tới mốc bắt đầu, nên không thể làm sai thời
 * gian phiên (có test trong BackgroundPicker.test.tsx).
 *
 * Màu ở màn này cố ý dùng trắng/đen trực tiếp thay vì biến theme: chữ luôn
 * nằm trên một cảnh video tối hoá, ở cả giao diện sáng lẫn tối.
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
import {
  DIM_LEVELS,
  getBackground,
  getDim,
  getVideoOn,
  readDeviceHints,
  saveBackground,
  saveDim,
  saveVideoOn,
  stillReason,
} from "../lib/background";
import type { DimLevel, FocusBackground } from "../lib/background";
import { canFullscreen, enterFullscreen, exitFullscreen, isFullscreen, onFullscreenChange } from "../lib/fullscreen";

import BackgroundPicker from "../components/BackgroundPicker";
import FocusBackdrop from "../components/FocusBackdrop";
import type { BackdropStatus } from "../components/FocusBackdrop";
import ConfirmDialog from "../components/ConfirmDialog";
import FocusBlockForm from "../components/FocusBlockForm";
import { Button, SectionLabel } from "../components/ui";

/** Mốc tham chiếu cho vòng tròn tiến độ: 45 phút là một vòng đầy. */
const REFERENCE_MINUTES = 45;

/** Nút nhỏ nổi trên cảnh nền: nền đen 60% để chữ trắng luôn đọc rõ. */
const CHIP =
  "tap-target flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-black/60 px-3 text-sm font-semibold text-white active:bg-black/80";

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
  const [captureOpen, setCaptureOpen] = useState(false);

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

  /* ----- Cảnh nền ----- */
  const [savedBg, setSavedBg] = useState<FocusBackground>(getBackground);
  // Bản đang xem thử trong Cài đặt; null = hiện nền đã lưu.
  const [previewBg, setPreviewBg] = useState<FocusBackground | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bgStatus, setBgStatus] = useState<BackdropStatus>("none");
  const [bgMessage, setBgMessage] = useState<string | undefined>();
  const [playRequest, setPlayRequest] = useState(0);
  // Đọc một lần: máy yếu / giảm chuyển động / tiết kiệm dữ liệu -> không tự phát.
  const [stillNote] = useState(() => stillReason(readDeviceHints()));
  // YouTube xem trước ngay trong hộp Cài đặt, nên phía sau vẫn là nền đã lưu.
  const shownBg = previewBg && previewBg.kind !== "youtube" ? previewBg : savedBg;

  /* ----- Tuỳ chọn hiển thị (đổi ngay, nhớ trên máy) ----- */
  const [videoOn, setVideoOnState] = useState(getVideoOn);
  const [dim, setDimState] = useState<DimLevel>(getDim);
  const d = DIM_LEVELS[dim];

  function setVideoOn(on: boolean) {
    saveVideoOn(on);
    setVideoOnState(on);
  }
  function setDim(level: DimLevel) {
    saveDim(level);
    setDimState(level);
  }

  const handleStatus = useCallback((s: BackdropStatus, message?: string) => {
    setBgStatus(s);
    setBgMessage(message);
  }, []);

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
    setSettingsOpen(false);
    // Chọn cảnh mới thì hiển nhiên muốn thấy nó.
    if (bg.kind !== "none") setVideoOn(true);
  }

  function closeSettings() {
    setPreviewBg(null);
    setSettingsOpen(false);
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

  const hasScene = savedBg.kind !== "none";

  return (
    <div className="relative h-full overflow-hidden bg-[#0c0e12] text-white">
      {/* ---------- Cảnh nền (không nhận chạm) ---------- */}
      <FocusBackdrop
        background={shownBg}
        still={stillNote !== null}
        videoOn={videoOn || previewBg !== null}
        playRequest={playRequest}
        onStatus={handleStatus}
      />

      {/* ---------- Lớp phủ tối ----------
          Nhẹ cả màn hình + đậm ở mép trên/dưới (sau các nút). Độ đậm theo tuỳ
          chọn "Độ tối"; mức nhẹ nhất vẫn giữ chữ trắng >= 4.5:1 trên khung
          hình trắng xoá (test trong background.test.ts). */}
      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background: `linear-gradient(to bottom, rgba(0,0,0,${d.bars}) 0%, rgba(0,0,0,${d.base}) 22%, rgba(0,0,0,${d.base}) 78%, rgba(0,0,0,${d.bars}) 100%)`,
        }}
        aria-hidden="true"
      />

      <div
        className="relative z-10 flex h-full flex-col"
        style={{
          paddingTop: "max(0.75rem, env(safe-area-inset-top))",
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        {/* ---------- Hàng trên ---------- */}
        <header className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-good" aria-hidden="true" />
            <h1 className="sr-only">Phiên tập trung</h1>
            <span className="truncate rounded-lg border border-white/20 bg-black/60 px-2.5 py-1 text-sm font-semibold text-white">
              {area}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {hasScene && (
              <button
                type="button"
                onClick={() => setVideoOn(!videoOn)}
                className={CHIP}
                aria-pressed={videoOn}
                aria-label={videoOn ? "Tắt video nền" : "Bật video nền"}
                title={videoOn ? "Tắt video nền" : "Bật video nền"}
              >
                <VideoIcon off={!videoOn} />
                <span className="hidden sm:inline landscape:inline">{videoOn ? "Tắt video" : "Bật video"}</span>
              </button>
            )}
            <button type="button" onClick={() => setSettingsOpen(true)} className={CHIP} aria-label="Cài đặt phiên" title="Cài đặt phiên">
              <GearIcon />
              <span className="hidden sm:inline landscape:inline">Cài đặt</span>
            </button>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className={CHIP}
              aria-label={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
              title={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            >
              <FullscreenIcon exit={fullscreen} />
            </button>
          </div>
        </header>

        {/* ---------- Thông báo (không bao giờ im lặng khi nền không như đã chọn) ---------- */}
        <div className="mx-auto mt-2 flex w-full max-w-xl flex-col gap-2" aria-live="polite">
          {videoOn && !settingsOpen && bgStatus === "blocked" && (
            <Notice
              action={{ label: "Phát video", onClick: () => setPlayRequest((n) => n + 1) }}
            >
              {stillNote ? `${stillNote.replace("nên nền là ảnh tĩnh", "nên video không tự phát")}` : "Trình duyệt chưa cho tự phát video."}
            </Notice>
          )}
          {videoOn && !settingsOpen && bgStatus === "fallback" && (
            <Notice>Video nền không phát được — đang dùng ảnh tĩnh của cảnh này.</Notice>
          )}
          {videoOn && !settingsOpen && bgStatus === "error" && hasScene && (
            <Notice tone="bad" action={{ label: "Đổi nền", onClick: () => setSettingsOpen(true) }}>
              Video nền không phát được{bgMessage ? `: ${bgMessage}` : ""} Đang dùng nền tĩnh.
            </Notice>
          )}
          {showRotateHint && (
            <Notice action={{ label: "Đóng", onClick: () => setWantLandscape(false) }}>
              {canFullscreen()
                ? "Xoay ngang điện thoại để xem toàn cảnh."
                : "Trình duyệt này không có chế độ toàn màn hình. Xoay ngang máy để xem toàn cảnh; trên iPhone, thêm app vào Màn hình chính để ẩn thanh địa chỉ."}
            </Notice>
          )}
        </div>

        {/* ---------- Đồng hồ chính giữa ---------- */}
        <main className="flex min-h-0 flex-1 items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* Gradient tỏa tròn: đậm sau chữ, mờ dần ra ngoài — vẫn thấy rõ cảnh. */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-[170%] w-[170%] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background: `radial-gradient(closest-side, rgba(0,0,0,${d.center}) 0%, rgba(0,0,0,${d.ring}) 60%, rgba(0,0,0,0) 100%)`,
              }}
              aria-hidden="true"
            />
            <div className="relative h-[min(19rem,58vh,72vw)] w-[min(19rem,58vh,72vw)]">
              <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="6" />
                <circle
                  cx="100"
                  cy="100"
                  r={R}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - progress)}
                />
              </svg>
              <div
                className="absolute inset-0 flex flex-col items-center justify-center"
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}
              >
                <span className="text-xs tracking-wider text-white/85 uppercase">Đã trôi qua</span>
                <span className="font-num text-[clamp(3rem,15vh,5.5rem)] leading-none font-semibold text-white">
                  {clock}
                </span>
                <span className="mt-2 text-sm text-white/85">
                  Bắt đầu <span className="font-num text-white">{startLabel}</span>
                </span>
              </div>
            </div>
          </div>
        </main>

        {/* ---------- Hàng dưới ---------- */}
        <footer className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-2 landscape:grid-cols-[1.2fr_1fr_0.8fr_1.4fr]">
          <button
            type="button"
            onClick={() => setDistractions(addTimerDistraction())}
            className="tap-target flex items-center justify-between gap-2 rounded-lg border border-warn/60 bg-black/70 px-4 font-bold text-warn active:bg-black/85"
          >
            <span>+1 phân tâm</span>
            <span className="font-num text-xl">{distractions}</span>
          </button>
          <button type="button" onClick={() => setCaptureOpen(true)} className={CHIP}>
            <PencilIcon />
            Chen ngang{captures.length > 0 && <span className="font-num">({captures.length})</span>}
          </button>
          <button type="button" onClick={() => setConfirmCancel(true)} className={CHIP}>
            Huỷ phiên
          </button>
          <Button onClick={handleFinish} className="text-base">
            Hoàn thành phiên
          </Button>
        </footer>
      </div>

      {/* ---------- Cài đặt phiên (⚙): hiển thị + chọn cảnh nền ---------- */}
      {settingsOpen && (
        <BackgroundPicker
          saved={savedBg}
          previewStatus={bgStatus}
          stillNote={stillNote}
          onPreview={handlePreview}
          onApply={applyBackground}
          onClose={closeSettings}
          display={{ videoOn, onVideoOn: setVideoOn, dim, onDim: setDim }}
        />
      )}

      {/* ---------- Phân tâm & việc chen ngang ---------- */}
      {captureOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={() => setCaptureOpen(false)}>
          <div
            className="max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-t-xl border-t border-accent/60 bg-surface-2 p-4 text-ink"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Phân tâm và việc chen ngang"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-ink-2">
                Phân tâm trong phiên: <strong className="font-num text-lg text-ink">{distractions}</strong>
              </span>
              {distractions > 0 && (
                <button
                  type="button"
                  onClick={() => setDistractions(removeTimerDistraction())}
                  className="tap-target rounded-lg px-3 text-sm text-ink-2 active:bg-surface"
                >
                  Bớt 1
                </button>
              )}
            </div>
            <SectionLabel right="mỗi ghi chú +1 phân tâm">Việc chen ngang</SectionLabel>
            <div className="flex gap-2">
              <input
                type="text"
                value={captureText}
                autoFocus
                onChange={(e) => setCaptureText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCapture();
                }}
                placeholder="Ghi ra để khỏi giữ trong đầu..."
                className="tap-target min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-3 focus:border-accent focus:outline focus:outline-1 focus:outline-accent"
              />
              <Button onClick={handleCapture} disabled={captureText.trim() === ""} className="shrink-0">
                Ghi
              </Button>
            </div>
            {captures.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {captures.map((c, i) => (
                  <li key={i} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-2">
                    {c}
                  </li>
                ))}
              </ul>
            )}
            <Button variant="secondary" onClick={() => setCaptureOpen(false)} className="mt-4 w-full">
              Xong
            </Button>
          </div>
        </div>
      )}

      {/* ---------- Bottom sheet: chỉ hiện SAU khi bấm "Hoàn thành phiên" ---------- */}
      {finishing && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/70" onClick={() => setFinishing(null)}>
          <div
            className="max-h-[88dvh] w-full overflow-y-auto rounded-t-xl border-t border-accent/60 bg-surface-2 p-4 text-ink shadow-[0_-8px_32px_rgba(0,0,0,0.65)]"
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

/* ---------- Mảnh nhỏ ---------- */

function Notice({
  children,
  tone = "warn",
  action,
}: {
  children: React.ReactNode;
  tone?: "warn" | "bad";
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg border bg-black/75 px-3 py-1.5 text-sm text-white ${
        tone === "bad" ? "border-bad/60" : "border-warn/60"
      }`}
    >
      <span>{children}</span>
      {action && (
        <button type="button" onClick={action.onClick} className="tap-target shrink-0 rounded-lg px-2 font-semibold text-accent">
          {action.label}
        </button>
      )}
    </div>
  );
}

function VideoIcon({ off }: { off: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="m16 10 6-3v10l-6-3" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

function FullscreenIcon({ exit }: { exit: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {exit ? (
        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
      ) : (
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
      )}
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}
