/**
 * Buổi ôn tập: hiện từng thẻ một.
 *
 * Luồng: thấy mặt trước -> tự nhớ lại trong đầu -> bấm "Hiện đáp án"
 * -> tự chấm bằng 4 nút.
 *
 * Việc CỐ NHỚ TRƯỚC KHI XEM mới là phần có tác dụng. Vì thế mặt sau
 * bị che hoàn toàn cho tới khi bạn bấm nút.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../db/db";
import type { Card, Grade } from "../db/types";
import { newId } from "../lib/dates";
import { useToday } from "../lib/useToday";
import {
  SESSION_LIMIT,
  addDays,
  buildQueue,
  dueCount,
  isDraft,
  isDue,
  scheduleNext,
  upcomingDue,
} from "../lib/scheduling";
import { formatDayLabel } from "../lib/dates";

import { Button, Card as CardBox, EmptyState, ListGroup, ListRow, SectionLabel, SwitchKnob, Tag } from "./ui";

/** Chế độ 10 phút: hết giờ là dừng buổi ôn. */
const TEN_MINUTES_MS = 10 * 60 * 1000;

/**
 * Bốn nút chấm điểm. Thứ tự từ khó nhớ nhất tới dễ nhất.
 * Bản "Calm": chỉ "Được" (lựa chọn hay dùng nhất) có viền màu nhấn; "Quên"
 * đỏ nhạt; còn lại trung tính — bốn ô màu đặc cạnh nhau rất rối mắt.
 */
const GRADE_BUTTONS: { grade: Grade; label: string; className: string }[] = [
  { grade: "again", label: "Quên", className: "bg-bad/10 text-bad-ink active:bg-bad/20" },
  { grade: "hard", label: "Khó", className: "bg-surface-2 text-ink-2 active:bg-line" },
  { grade: "good", label: "Được", className: "border border-accent text-accent active:bg-accent/10" },
  { grade: "easy", label: "Dễ", className: "bg-surface-2 text-ink-2 active:bg-line" },
];

export default function ReviewQueue({ onOpenCards }: { onOpenCards?: () => void }) {
  const today = useToday();

  const allCards = useLiveQuery(() => db.cards.toArray(), [], [] as Card[]);

  /* ----- Hàng đợi -----
     Chốt danh sách MỘT LẦN khi buổi ôn bắt đầu. Nếu tính lại liên tục thì
     thẻ vừa chấm sẽ biến mất khỏi danh sách và thứ tự nhảy loạn giữa chừng. */
  const [queueIds, setQueueIds] = useState<string[] | null>(null);
  const [position, setPosition] = useState(0);
  const [answerShown, setAnswerShown] = useState(false);

  /* ----- Chống chấm hai lần -----
     Chạm đúp trên điện thoại từng ghi hai lượt ôn cho cùng một thẻ và bỏ qua
     thẻ kế tiếp (audit F03). `grading` là ref nên khoá có hiệu lực NGAY trong
     cùng lượt bấm; `saving` chỉ để làm mờ nút. */
  const grading = useRef(false);
  const [saving, setSaving] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);

  /* ----- Chế độ 10 phút ----- */
  const [tenMinuteMode, setTenMinuteMode] = useState(false);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  // Số giây còn lại, giữ trong state chứ không tính lúc vẽ:
  // đọc đồng hồ giữa lúc render làm kết quả không ổn định.
  const [remainingSec, setRemainingSec] = useState(TEN_MINUTES_MS / 1000);

  // "Bây giờ" cho dòng "Phiên hiện tại". Cập nhật mỗi giây trong lúc ôn,
  // giữ trong state thay vì đọc đồng hồ lúc vẽ.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (sessionStart === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sessionStart]);

  // Danh sách thẻ đến hạn, tính lại khi dữ liệu đổi (dùng cho màn hình chờ).
  // `dueCards` = phiên kế tiếp (tối đa SESSION_LIMIT), `totalDue` = tồn đọng thật.
  const dueCards = useMemo(() => buildQueue(allCards, today), [allCards, today]);
  const totalDue = dueCount(allCards, today);
  // Thẻ mới (chưa ôn lần nào) và lịch mấy ngày tới — chỉ để hiển thị.
  const newDue = allCards.filter((c) => isDue(c, today) && c.reps === 0).length;
  const upcoming = useMemo(() => upcomingDue(allCards, today).slice(0, 3), [allCards, today]);
  const missingBack = allCards.filter(isDraft).length;

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
    const t = Date.now();
    setNow(t);
    setSessionStart(t);
  }

  function endSession() {
    setQueueIds(null);
    setPosition(0);
    setAnswerShown(false);
    setSessionStart(null);
    setTimeUp(false);
  }

  /** Chấm điểm thẻ đang hiện, lưu lịch mới và ghi nhật ký. */
  async function grade(cardId: string, g: Grade) {
    if (grading.current) return; // lượt chấm trước chưa lưu xong
    grading.current = true;
    setSaving(true);
    setGradeError(null);

    try {
      // Hai việc này luôn đi cùng nhau, nên gói trong một transaction:
      // hoặc cả hai thành công, hoặc không có gì thay đổi.
      await db.transaction("rw", db.cards, db.reviewLogs, async () => {
        // Đọc lại thẻ NGAY TRONG transaction, không tin bản đang vẽ trên màn hình.
        const card = await db.cards.get(cardId);
        // Thẻ đã bị xoá, thành thẻ nháp, hoặc đã được chấm (ở tab/máy khác)
        // -> không ghi gì, chỉ chuyển sang thẻ tiếp theo.
        if (!card || !isDue(card, today)) return;

        const next = scheduleNext(
          {
            intervalDays: card.intervalDays,
            ease: card.ease,
            reps: card.reps,
            lapses: card.lapses,
          },
          g
        );
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

      // Chỉ sang thẻ kế tiếp khi đã lưu THÀNH CÔNG.
      setAnswerShown(false);
      setPosition((p) => p + 1);
    } catch {
      setGradeError("Chưa lưu được lượt chấm. Bấm lại để thử.");
    } finally {
      grading.current = false;
      setSaving(false);
    }
  }

  /* ==================== Màn hình chờ ==================== */

  if (queueIds === null) {
    return (
      // Máy tính: thẻ "Hôm nay" bên trái, thẻ nháp + sắp tới bên phải.
      <div className="grid items-start gap-x-4 pb-4 @3xl/content:grid-cols-2">
        <CardBox className="mb-3 min-w-0">
          <p className="text-sm text-ink-2">Hôm nay</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="font-num text-5xl font-semibold text-accent">{totalDue}</span>
            <span className="text-base font-medium text-ink">thẻ đến hạn</span>
          </p>
          {totalDue > 0 && (
            <p className="mt-1 text-sm text-ink-2">
              <span className="font-num">{newDue}</span> thẻ mới ·{" "}
              <span className="font-num">{totalDue - newDue}</span> ôn lại
              {allCards.length > totalDue && (
                <span className="text-ink-3"> · tổng {allCards.length} thẻ</span>
              )}
            </p>
          )}

          {totalDue > SESSION_LIMIT && (
            <p className="mt-2 text-xs text-ink-3">
              Mỗi phiên tối đa {SESSION_LIMIT} thẻ, quá hạn lâu nhất trước. Xong phiên này vẫn ôn tiếp được{" "}
              <span className="font-num">{totalDue - SESSION_LIMIT}</span> thẻ còn lại.
            </p>
          )}

          {/* Công tắc là một dòng trong thẻ, ngăn bằng đường kẻ mảnh. */}
          <button
            type="button"
            role="switch"
            aria-checked={tenMinuteMode}
            onClick={() => setTenMinuteMode(!tenMinuteMode)}
            className="mt-4 flex min-h-[52px] w-full items-center justify-between gap-3 border-t border-line/70 pt-3 text-left"
          >
            <span>
              <span className="block text-sm font-semibold text-ink">Chế độ 10 phút</span>
              <span className="block text-xs text-ink-3">Tự dừng buổi ôn sau 10 phút</span>
            </span>
            <SwitchKnob checked={tenMinuteMode} />
          </button>

          <Button
            onClick={startSession}
            disabled={dueCards.length === 0}
            className="mt-3 w-full py-3 text-base"
          >
            {totalDue > SESSION_LIMIT ? `Bắt đầu ôn ${SESSION_LIMIT} thẻ` : "Bắt đầu ôn"}
          </Button>
        </CardBox>

        <div className="min-w-0">
          {/* Thẻ nháp từ brain dump chưa có mặt sau — một chạm sang Kho thẻ. */}
          {missingBack > 0 && onOpenCards && (
            <ListGroup className="mb-3">
              <ListRow
                label={
                  <>
                    <span className="font-num">{missingBack}</span> thẻ chưa có mặt sau
                  </>
                }
                description="Thẻ nháp chưa vào hàng ôn — viết đáp án để bắt đầu"
                onClick={onOpenCards}
              />
            </ListGroup>
          )}

          {upcoming.length > 0 && (
            <ListGroup label="Sắp tới" className="mb-3">
              {upcoming.map(({ date, count }) => (
                <ListRow
                  key={date}
                  label={date === addDays(today, 1) ? "Mai" : formatDayLabel(date)}
                  value={
                    <span className="rounded-md bg-surface-2 px-2 py-0.5">
                      <span className="font-num">{count}</span> thẻ
                    </span>
                  }
                />
              ))}
            </ListGroup>
          )}

          {dueCards.length === 0 && (
            <EmptyState
              title={allCards.length === 0 ? "Chưa có thẻ nào" : "Hôm nay ôn xong rồi"}
              hint={
                allCards.length === 0
                  ? 'Tạo thẻ ở mục "Kho thẻ" hoặc từ chỗ hổng trong brain dump'
                  : "Quay lại ngày mai"
              }
            />
          )}
        </div>
      </div>
    );
  }

  /* ==================== Đang ôn ==================== */

  const finished = position >= queueIds.length;
  const stoppedByTimer = timeUp && !finished;

  if (finished || stoppedByTimer) {
    return (
      <CardBox className="max-w-2xl text-center">
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
      <CardBox className="max-w-2xl text-center">
        <p className="text-sm text-ink-2">Thẻ này đã bị xoá.</p>
        <Button onClick={() => setPosition((p) => p + 1)} className="mt-3 w-full">
          Thẻ tiếp theo
        </Button>
      </CardBox>
    );
  }

  return (
    // Đang ôn: một thẻ, không kéo quá rộng trên máy tính cho dễ đọc.
    <div className="max-w-2xl pb-4">
      {/* Thẻ hiện tại: area + vị trí trong hàng đợi */}
      <CardBox className="mb-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Tag tone="indigo">{card.area}</Tag>
          <span className="font-num text-sm text-ink-2">
            Thẻ {position + 1}/{queueIds.length}
          </span>
        </div>
        <SectionLabel>Mặt trước</SectionLabel>
        <div className="text-lg leading-relaxed font-medium whitespace-pre-wrap text-ink">
          {card.front}
        </div>
      </CardBox>

      {/* Mặt sau — chỉ hiện sau khi bấm nút */}
      {!answerShown ? (
        <>
          <Button
            variant="secondary"
            onClick={() => setAnswerShown(true)}
            className="w-full py-3 text-base"
          >
            Hiện đáp án
          </Button>
          <p className="mt-2 text-center text-xs text-ink-3">
            Cố nhớ ra trước đã — đó mới là phần có tác dụng
          </p>
        </>
      ) : (
        <>
          <CardBox className="mb-3 bg-surface-2">
            <SectionLabel>Mặt sau</SectionLabel>
            {isDraft(card) ? (
              <p className="text-sm text-warn">
                Thẻ này vừa bị xoá mặt sau nên không chấm được. Bỏ qua, rồi điền đáp án ở "Kho thẻ".
              </p>
            ) : (
              <div className="leading-relaxed whitespace-pre-wrap text-ink">{card.back}</div>
            )}
          </CardBox>

          {isDraft(card) && (
            <Button variant="secondary" onClick={() => setPosition((p) => p + 1)} className="w-full">
              Bỏ qua thẻ này
            </Button>
          )}

          {/* 4 nút chấm điểm, kèm ngày ôn lại tiếp theo để bạn thấy hậu quả lựa chọn */}
          {!isDraft(card) && (
          <>
          <p className="mb-2 text-center text-xs text-ink-3">Nhớ tới đâu? Ôn lại sau:</p>
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
                  onClick={() => grade(card.id, g)}
                  disabled={saving}
                  className={`tap-target flex flex-col items-center justify-center rounded-xl py-2 font-semibold disabled:opacity-40 ${className}`}
                >
                  <span className="text-sm">{label}</span>
                  <span className="text-xs font-normal">
                    <span className="font-num">{preview.intervalDays}</span> ngày
                  </span>
                </button>
              );
            })}
          </div>
          {gradeError && (
            <p role="alert" className="mt-2 rounded-xl bg-bad/10 px-3 py-2 text-center text-sm text-bad-ink">
              {gradeError}
            </p>
          )}
          </>
          )}
        </>
      )}

      {/* Phiên hiện tại + tiến độ */}
      <div className="mt-4 rounded-2xl border border-line/70 bg-surface px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-2">
            Phiên hiện tại{" "}
            <span className="font-num text-ink">
              {sessionStart === null
                ? "00:00"
                : `${String(Math.floor((now - sessionStart) / 60000)).padStart(2, "0")}:${String(
                    Math.floor(((now - sessionStart) % 60000) / 1000)
                  ).padStart(2, "0")}`}
            </span>
          </span>
          <span className="font-num text-accent">
            {position}/{queueIds.length} xong ({Math.round((position / queueIds.length) * 100)}%)
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${(position / queueIds.length) * 100}%` }}
          />
        </div>
        {tenMinuteMode && (
          <p className="mt-2 text-xs text-ink-2">
            Chế độ 10 phút: còn{" "}
            <span className="font-num text-ink">
              {Math.floor(remainingSec / 60)}:{String(remainingSec % 60).padStart(2, "0")}
            </span>
          </p>
        )}
      </div>

      <Button variant="ghost" onClick={endSession} className="mt-2 w-full text-sm">
        Dừng buổi ôn
      </Button>
    </div>
  );
}
