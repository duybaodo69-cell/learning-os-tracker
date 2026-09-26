/**
 * Buổi ôn tập: hiện từng thẻ một.
 *
 * Luồng: thấy mặt trước -> tự nhớ lại trong đầu -> bấm "Hiện đáp án"
 * -> tự chấm bằng 4 nút.
 *
 * Việc CỐ NHỚ TRƯỚC KHI XEM mới là phần có tác dụng. Vì thế mặt sau
 * bị che hoàn toàn cho tới khi bạn bấm nút.
 */
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../db/db";
import type { Card, Grade } from "../db/types";
import { newId } from "../lib/dates";
import { useToday } from "../lib/useToday";
import { DAILY_LIMIT, addDays, buildQueue, scheduleNext } from "../lib/scheduling";

import { Button, Card as CardBox, EmptyState, Toggle } from "./ui";

/** Chế độ 10 phút: hết giờ là dừng buổi ôn. */
const TEN_MINUTES_MS = 10 * 60 * 1000;

/** Bốn nút chấm điểm. Thứ tự từ khó nhớ nhất tới dễ nhất. */
const GRADE_BUTTONS: { grade: Grade; label: string; className: string }[] = [
  { grade: "again", label: "Quên", className: "bg-surface-2 border border-bad/40 text-bad-ink active:bg-bad/20" },
  { grade: "hard", label: "Khó", className: "bg-warn/15 border border-warn/50 text-warn active:bg-warn/25" },
  { grade: "good", label: "Được", className: "bg-accent text-on-accent active:brightness-110" },
  { grade: "easy", label: "Dễ", className: "bg-good/15 border border-good/40 text-good active:bg-good/25" },
];

export default function ReviewQueue() {
  const today = useToday();

  const allCards = useLiveQuery(() => db.cards.toArray(), [], [] as Card[]);

  /* ----- Hàng đợi -----
     Chốt danh sách MỘT LẦN khi buổi ôn bắt đầu. Nếu tính lại liên tục thì
     thẻ vừa chấm sẽ biến mất khỏi danh sách và thứ tự nhảy loạn giữa chừng. */
  const [queueIds, setQueueIds] = useState<string[] | null>(null);
  const [position, setPosition] = useState(0);
  const [answerShown, setAnswerShown] = useState(false);

  /* ----- Chế độ 10 phút ----- */
  const [tenMinuteMode, setTenMinuteMode] = useState(false);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  // Số giây còn lại, giữ trong state chứ không tính lúc vẽ:
  // đọc đồng hồ giữa lúc render làm kết quả không ổn định.
  const [remainingSec, setRemainingSec] = useState(TEN_MINUTES_MS / 1000);

  // Danh sách thẻ đến hạn, tính lại khi dữ liệu đổi (dùng cho màn hình chờ).
  const dueCards = useMemo(() => buildQueue(allCards, today), [allCards, today]);

  // Đồng hồ đếm ngược của chế độ 10 phút.
  // Giống bộ đếm ở màn hình Hôm nay: mốc bắt đầu là nguồn sự thật duy nhất,
  // nên khoá màn hình hay chuyển app cũng không làm sai giờ.
  useEffect(() => {
    if (sessionStart === null || !tenMinuteMode) return;

    function update() {
      const left = TEN_MINUTES_MS - (Date.now() - (sessionStart as number));
      setRemainingSec(Math.max(0, Math.ceil(left / 1000)));
      if (left <= 0) setTimeUp(true);
    }

    update(); // chạy ngay một lần, không chờ hết giây đầu tiên
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [sessionStart, tenMinuteMode]);

  function startSession() {
    setQueueIds(buildQueue(allCards, today).map((c) => c.id));
    setPosition(0);
    setAnswerShown(false);
    setTimeUp(false);
    setRemainingSec(TEN_MINUTES_MS / 1000);
    setSessionStart(Date.now());
  }

  function endSession() {
    setQueueIds(null);
    setPosition(0);
    setAnswerShown(false);
    setSessionStart(null);
    setTimeUp(false);
  }

  /** Chấm điểm thẻ đang hiện, lưu lịch mới và ghi nhật ký. */
  async function grade(card: Card, g: Grade) {
    const next = scheduleNext(
      {
        intervalDays: card.intervalDays,
        ease: card.ease,
        reps: card.reps,
        lapses: card.lapses,
      },
      g
    );

    // Hai việc này luôn đi cùng nhau, nên gói trong một transaction:
    // hoặc cả hai thành công, hoặc không có gì thay đổi.
    await db.transaction("rw", db.cards, db.reviewLogs, async () => {
      await db.cards.update(card.id, {
        intervalDays: next.intervalDays,
        ease: next.ease,
        reps: next.reps,
        lapses: next.lapses,
        dueDate: addDays(today, next.intervalDays),
      });
      await db.reviewLogs.add({
        id: newId(),
        cardId: card.id,
        date: today,
        grade: g,
        intervalBefore: card.intervalDays, // khoảng cách TRƯỚC lần ôn này
      });
    });

    setAnswerShown(false);
    setPosition((p) => p + 1);
  }

  /* ==================== Màn hình chờ ==================== */

  if (queueIds === null) {
    return (
      <div className="pb-4">
        <CardBox className="mb-4 text-center">
          <div className="text-5xl font-bold text-ink">{dueCards.length}</div>
          <p className="mt-1 text-sm text-ink-2">
            thẻ đến hạn hôm nay
            {allCards.length > dueCards.length && ` (tổng ${allCards.length} thẻ)`}
          </p>

          {dueCards.length >= DAILY_LIMIT && (
            <p className="mt-2 text-xs text-ink-3">
              Giới hạn {DAILY_LIMIT} thẻ/ngày. Thẻ quá hạn lâu nhất được ưu tiên.
            </p>
          )}

          <div className="mt-4">
            <Toggle
              label="Chế độ 10 phút"
              description="Tự dừng buổi ôn sau 10 phút"
              checked={tenMinuteMode}
              onChange={setTenMinuteMode}
            />
          </div>

          <Button
            onClick={startSession}
            disabled={dueCards.length === 0}
            className="mt-4 w-full text-base"
          >
            Bắt đầu ôn
          </Button>
        </CardBox>

        {dueCards.length === 0 && (
          <EmptyState
            title={allCards.length === 0 ? "Chưa có thẻ nào" : "Hôm nay ôn xong rồi"}
            hint={
              allCards.length === 0
                ? 'Tạo thẻ ở tab "Thẻ" hoặc từ chỗ hổng trong brain dump'
                : "Quay lại ngày mai"
            }
          />
        )}
      </div>
    );
  }

  /* ==================== Đang ôn ==================== */

  const finished = position >= queueIds.length;
  const stoppedByTimer = timeUp && !finished;

  if (finished || stoppedByTimer) {
    return (
      <CardBox className="text-center">
        <div className="text-2xl font-bold text-ink">
          {stoppedByTimer ? "Hết 10 phút" : "Xong buổi ôn"}
        </div>
        <p className="mt-2 text-sm text-ink-2">
          Đã ôn {position}/{queueIds.length} thẻ.
          {stoppedByTimer && " Phần còn lại vẫn đến hạn, ôn tiếp lúc nào cũng được."}
        </p>
        <Button onClick={endSession} className="mt-4 w-full">
          Quay lại
        </Button>
      </CardBox>
    );
  }

  // Lấy thẻ hiện tại từ dữ liệu mới nhất (đã cập nhật sau mỗi lần chấm).
  const card = allCards.find((c) => c.id === queueIds[position]);

  // Thẻ bị xoá ở nơi khác giữa buổi ôn — bỏ qua, không làm app crash.
  if (!card) {
    return (
      <CardBox className="text-center">
        <p className="text-sm text-ink-2">Thẻ này đã bị xoá.</p>
        <Button onClick={() => setPosition((p) => p + 1)} className="mt-3 w-full">
          Thẻ tiếp theo
        </Button>
      </CardBox>
    );
  }

  return (
    <div className="pb-4">
      {/* Thanh tiến độ */}
      <div className="mb-3 flex items-center justify-between text-xs text-ink-3">
        <span>
          Thẻ {position + 1}/{queueIds.length}
        </span>
        {tenMinuteMode && (
          <span className="font-semibold tabular-nums">
            còn {Math.floor(remainingSec / 60)}:{String(remainingSec % 60).padStart(2, "0")}
          </span>
        )}
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${(position / queueIds.length) * 100}%` }}
        />
      </div>

      {/* Mặt trước */}
      <CardBox className="mb-3">
        <div className="text-xs font-semibold tracking-wide text-ink-3 uppercase">
          {card.area}
        </div>
        <div className="mt-2 text-lg leading-relaxed font-semibold whitespace-pre-wrap text-ink">
          {card.front}
        </div>
      </CardBox>

      {/* Mặt sau — chỉ hiện sau khi bấm nút */}
      {!answerShown ? (
        <>
          <Button onClick={() => setAnswerShown(true)} className="w-full text-base">
            Hiện đáp án
          </Button>
          <p className="mt-2 text-center text-xs text-ink-3">
            Cố nhớ ra trước đã — đó mới là phần có tác dụng
          </p>
        </>
      ) : (
        <>
          <CardBox className="mb-4 border-accent/30 bg-accent/10">
            {card.back.trim() === "" ? (
              <p className="text-sm text-warn">
                Thẻ này chưa có mặt sau. Sang tab "Thẻ" để điền đáp án.
              </p>
            ) : (
              <div className="leading-relaxed whitespace-pre-wrap text-ink">{card.back}</div>
            )}
          </CardBox>

          {/* 4 nút chấm điểm, kèm ngày ôn lại tiếp theo để bạn thấy hậu quả lựa chọn */}
          <div className="grid grid-cols-4 gap-2">
            {GRADE_BUTTONS.map(({ grade: g, label, className }) => {
              const preview = scheduleNext(
                {
                  intervalDays: card.intervalDays,
                  ease: card.ease,
                  reps: card.reps,
                  lapses: card.lapses,
                },
                g
              );
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => grade(card, g)}
                  className={`tap-target flex flex-col items-center justify-center rounded-lg py-2 font-semibold ${className}`}
                >
                  <span className="text-sm">{label}</span>
                  <span className="text-xs font-normal opacity-80">
                    {preview.intervalDays}d
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <Button variant="ghost" onClick={endSession} className="mt-4 w-full text-sm">
        Dừng buổi ôn
      </Button>
    </div>
  );
}
