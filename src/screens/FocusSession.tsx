/**
 * Màn hình "Phiên tập trung" — chiếm trọn màn hình khi bộ đếm đang chạy.
 *
 * Thanh tab dưới cùng bị ẩn: trong lúc làm việc sâu, không có lối tắt nào
 * dẫn sang chỗ khác. Muốn ra thì chỉ có hai đường: Hoàn thành hoặc Huỷ.
 *
 * Mọi con số đều tính từ dữ liệu lưu trong localStorage (mốc bắt đầu, số
 * phân tâm, việc chen ngang), nên đóng app rồi mở lại vẫn quay về đúng phiên.
 */
import { useEffect, useState } from "react";

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

import ConfirmDialog from "../components/ConfirmDialog";
import FocusBlockForm from "../components/FocusBlockForm";
import { Button, Card, SectionLabel, Tag } from "../components/ui";

/** Mốc tham chiếu cho vòng tròn tiến độ: 45 phút là một vòng đầy. */
const REFERENCE_MINUTES = 45;

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
    onExit();
  }

  function handleCancelSession() {
    clearSession();
    setConfirmCancel(false);
    onExit();
  }

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/95 px-4 pt-4 pb-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-wide text-ink uppercase">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-good" aria-hidden="true" />
            Phiên tập trung
          </h1>
          <Tag tone="indigo">{area}</Tag>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {/* ---------- Đồng hồ ---------- */}
        <Card className="mb-4 flex flex-col items-center py-6">
          <div className="relative h-52 w-52">
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
              <span className="font-num text-5xl font-semibold text-ink">
                {clock}
              </span>
              <span className="mt-1 text-xs text-ink-3">vòng đầy = {REFERENCE_MINUTES} phút</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink-2">
            Bắt đầu <span className="font-num text-ink">{startLabel}</span>
          </p>
        </Card>

        {/* ---------- +1 phân tâm: MỘT nút lớn, số đếm nằm bên trong ---------- */}
        <button
          type="button"
          onClick={() => setDistractions(addTimerDistraction())}
          className="mb-2 flex min-h-16 w-full items-center justify-between rounded-lg border border-warn/50 bg-warn/12 px-5 text-left active:bg-warn/25"
        >
          <span className="text-xl font-bold text-warn">+1 phân tâm</span>
          <span className="rounded-lg border border-warn/40 bg-canvas px-4 py-1 font-num text-2xl font-semibold text-warn">
            {distractions}
          </span>
        </button>
        <div className="mb-4 flex items-center justify-between px-1">
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

        {/* ---------- Việc chen ngang ---------- */}
        <Card className="mb-4">
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
        </Card>

        {/* ---------- Kết thúc ---------- */}
        <div className="mb-6 grid grid-cols-[1fr_2fr] gap-2">
          <Button variant="secondary" onClick={() => setConfirmCancel(true)}>
            Huỷ phiên
          </Button>
          <Button onClick={handleFinish} className="py-3 text-base">
            Hoàn thành phiên
          </Button>
        </div>
      </main>

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
