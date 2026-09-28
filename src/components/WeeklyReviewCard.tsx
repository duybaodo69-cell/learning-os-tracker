/**
 * Chốt kế hoạch Chủ nhật (Đợt 3) — thay "Tổng kết tuần" 3 câu hỏi viết tay.
 *
 *   - WeeklyReviewCard  : thẻ thu gọn, chỉ hiện CHỦ NHẬT ở màn hình Hôm nay
 *   - WeeklyReviewForm  : ba bước, gần như chỉ bấm chạm (~10 phút),
 *                         dùng chung cho Chủ Nhật và cho "viết bù" ở Thống kê
 *       1. Nhìn lại: khung 9:30 x/7, giờ IELTS / mục tiêu, loại lỗi nhiều nhất,
 *          số lần dời, kế hoạch tuần này làm được bao nhiêu, điều chỉnh tuần trước
 *       2. Một điều chỉnh cho tuần tới: chọn gợi ý hoặc tự gõ (oneChange)
 *       3. Chốt tuần tới: khối lượng đề (app đề xuất, bấm +/-), tuần nhẹ nhịp,
 *          deadline 7 ngày tới (mốc cố định + tự thêm)
 *   - ThisWeekChange    : nhắc "điều chỉnh tuần này" đã chọn ở tuần trước
 *
 * Dữ liệu tổng kết cũ (learnedWithoutNotes, dataInsight) KHÔNG bị xoá: tuần cũ
 * mở ra vẫn thấy, chỉ để đọc. Form mới không hỏi hai câu đó nữa (chủ app chốt
 * 2026-09-28), thay bằng một ô "Ghi chú" tuỳ chọn.
 * Tính toán nằm ở src/lib/weekPlan.ts (có test).
 */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../db/db";
import type { AnchorDelay, Deadline, FocusBlock, WeeklyReview, WeekPlan } from "../db/types";
import { weekReviewId } from "../db/keys";
import { formatShortDate, newId, todayISO } from "../lib/dates";
import { formatTestRef, nextTest, partName, type ScoredSkill, type TestPosition } from "../lib/ielts";
import { lightWeekExam } from "../lib/plan";
import { addDays } from "../lib/scheduling";
import { useSubmit } from "../lib/useSubmit";
import {
  ANCHOR_TARGET_DAYS,
  DEFAULT_PLAN,
  LIGHT_PLAN,
  checkDeadline,
  lastPartOf,
  lookBack,
  proposePlan,
  suggestChanges,
  upcomingDeadlines,
  type TopError,
} from "../lib/weekPlan";
import { CHANGE_RESULTS, changeResultLabel, type ChangeResult } from "../lib/weeklyReview";

import ConfirmDialog from "./ConfirmDialog";
import {
  Button,
  Card,
  ChipGroup,
  Counter,
  DateInput,
  Disclosure,
  Field,
  FieldError,
  TextArea,
  TextInput,
  Toggle,
} from "./ui";

/** "28/09" */
const ddmm = (iso: string) => formatShortDate(iso).slice(0, 5);
/** "28/09 – 04/10" */
const weekRange = (monday: string) => `${ddmm(monday)} – ${ddmm(addDays(monday, 6))}`;

/* ==================== Thẻ Chủ Nhật ==================== */

export default function WeeklyReviewCard({
  weekStart,
  existing,
  previousChange,
  onSave,
}: {
  weekStart: string;
  existing?: WeeklyReview;
  /** "Một điều chỉnh" đã chọn ở buổi chốt tuần trước (nếu có). */
  previousChange?: string;
  onSave: (r: WeeklyReview) => void | Promise<void>;
}) {
  // Mặc định thu gọn: Chủ Nhật mở app để log như mọi ngày, không phải lúc nào
  // cũng sẵn sàng ngồi chốt kế hoạch.
  const [open, setOpen] = useState(false);
  const done = existing?.plan !== undefined;

  if (open) {
    return (
      <Card className="mb-4">
        <WeeklyReviewForm
          weekStart={weekStart}
          existing={existing}
          previousChange={previousChange}
          onSave={onSave}
          onClose={() => setOpen(false)}
        />
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-ink">
            {done ? "Đã chốt kế hoạch tuần tới" : "Chủ nhật — chốt kế hoạch tuần"}
          </div>
          <div className="mt-0.5 text-xs text-ink-2">
            {done ? "Bấm để xem lại hoặc sửa" : "Khoảng 10 phút, chủ yếu bấm chạm"}
          </div>
        </div>
        {/* Nút phụ (không tô đặc): "Bắt đầu IELTS" mới là hành động chính của màn hình. */}
        <Button variant="secondary" onClick={() => setOpen(true)} className={done ? "" : "text-accent"}>
          {done ? "Xem" : "Bắt đầu"}
        </Button>
      </div>
    </Card>
  );
}

/* ==================== Form ==================== */

export function WeeklyReviewForm({
  weekStart,
  existing,
  previousChange,
  onSave,
  onClose,
}: {
  weekStart: string;
  existing?: WeeklyReview;
  previousChange?: string;
  onSave: (r: WeeklyReview) => void | Promise<void>;
  onClose: () => void;
}) {
  const blocks = useLiveQuery(() => db.focusBlocks.toArray(), []);
  const delays = useLiveQuery(() => db.anchorDelays.toArray(), []);
  const reviews = useLiveQuery(() => db.weekReviews.toArray(), []);

  // Chờ đủ dữ liệu rồi mới dựng form, để kế hoạch đề xuất tính từ đúng đề tiếp theo.
  if (blocks === undefined || delays === undefined || reviews === undefined) {
    return <p className="py-8 text-center text-sm text-ink-3">Đang tải…</p>;
  }
  return (
    <PlanForm
      weekStart={weekStart}
      existing={existing}
      previousChange={previousChange}
      onSave={onSave}
      onClose={onClose}
      blocks={blocks}
      delays={delays}
      reviews={reviews}
    />
  );
}

function PlanForm({
  weekStart,
  existing,
  previousChange,
  onSave,
  onClose,
  blocks,
  delays,
  reviews,
}: {
  weekStart: string;
  existing?: WeeklyReview;
  previousChange?: string;
  onSave: (r: WeeklyReview) => void | Promise<void>;
  onClose: () => void;
  blocks: FocusBlock[];
  delays: AnchorDelay[];
  reviews: WeeklyReview[];
}) {
  const today = todayISO();
  const weekEnd = addDays(weekStart, 6);
  const nextWeek = addDays(weekStart, 7);
  // Viết bù tuần cũ: số liệu tính tới Chủ nhật của tuần đó, không phải hôm nay.
  const look = lookBack(blocks, delays, reviews, weekEnd < today ? weekEnd : today);
  const suggestions = suggestChanges(look);

  const [change, setChange] = useState(existing?.oneChange ?? "");
  const [result, setResult] = useState<ChangeResult | null>(existing?.lastChangeResult ?? null);
  const [note, setNote] = useState(existing?.note ?? "");
  const [plan, setPlan] = useState<WeekPlan>(
    () =>
      existing?.plan ??
      proposePlan(nextWeek, { listening: nextTest(blocks, "Listening"), reading: nextTest(blocks, "Reading") })
  );
  const submit = useSubmit();

  const autoLight = lightWeekExam(nextWeek);
  const hadOldText = Boolean(existing?.learnedWithoutNotes.trim() || existing?.dataInsight.trim());

  function setLight(light: boolean) {
    // Bật/tắt tuần nhẹ thì đổi khối lượng về mức đề xuất tương ứng; vẫn sửa được bằng +/-.
    const counts = light ? LIGHT_PLAN : DEFAULT_PLAN;
    setPlan({ ...plan, light, listening: counts.listening, reading: counts.reading });
  }

  function handleSave() {
    // Chỉ đóng form khi đã lưu THÀNH CÔNG; lỗi thì giữ nguyên những gì đã chọn.
    void submit.run(async () => {
      const r: WeeklyReview = {
        id: weekReviewId(weekStart),
        weekStart,
        // Hai câu hỏi cũ không còn hỏi; giữ nguyên câu trả lời cũ nếu tuần này đã có.
        learnedWithoutNotes: existing?.learnedWithoutNotes ?? "",
        dataInsight: existing?.dataInsight ?? "",
        oneChange: change.trim(),
        plan,
      };
      if (previousChange && result) r.lastChangeResult = result;
      if (note.trim()) r.note = note.trim();
      await onSave(r);
      onClose();
    });
  }

  return (
    <div>
      <h2 className="text-base font-bold text-ink">Chốt kế hoạch tuần</h2>
      <p className="mb-4 text-xs text-ink-3">Tuần {weekRange(weekStart)} · khoảng 10 phút</p>

      {/* ---------- 1. Nhìn lại ---------- */}
      <Step n={1} title="Nhìn lại tuần này">
        <div className="grid grid-cols-1 gap-2 @xs/content:grid-cols-2">
          <Tile label="Khung 9:30" value={`${look.anchorDays}/7`} hint={`đích ≥ ${ANCHOR_TARGET_DAYS}/7`} />
          <Tile
            label={look.light ? "Giờ IELTS · tuần nhẹ" : "Giờ IELTS"}
            value={`${(look.minutes / 60).toFixed(1)}h`}
            hint={`/ ${(look.targetMinutes / 60).toFixed(1)}h mục tiêu`}
          />
          <Tile label="Lỗi nhiều nhất" value={errorText(look.topListening, look.topReading)} small />
          <Tile label="Dời khung" value={`${look.delays} lần`} />
        </div>
        {look.plan && (
          <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-2">
            Kế hoạch tuần này: Listening{" "}
            <span className="font-num font-semibold text-ink">
              {look.plan.doneListening}/{look.plan.listening}
            </span>{" "}
            section · Reading{" "}
            <span className="font-num font-semibold text-ink">
              {look.plan.doneReading}/{look.plan.reading}
            </span>{" "}
            passage
          </p>
        )}
        {/* Follow up: vòng lặp chỉ khép lại khi nhìn lại điều đã chọn tuần trước. */}
        {previousChange && (
          <div className="mt-3">
            <p className="mb-2 text-sm text-ink-2">
              Tuần trước bạn định thử: <span className="text-ink">{previousChange}</span>
            </p>
            <ChipGroup
              options={CHANGE_RESULTS.map((r) => r.id)}
              value={result}
              onChange={setResult}
              format={(id) => changeResultLabel(id) ?? id}
            />
          </div>
        )}
      </Step>

      {/* ---------- 2. Một điều chỉnh ---------- */}
      <Step n={2} title="Một điều chỉnh cho tuần tới">
        {suggestions.length > 0 && (
          <div className="mb-2 flex flex-col gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={change === s}
                onClick={() => setChange(s)}
                className={
                  "tap-target rounded-xl px-3 py-2 text-left text-sm " +
                  (change === s ? "bg-accent/15 font-medium text-ink ring-1 ring-accent" : "bg-surface-2 text-ink-2 active:bg-line")
                }
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <TextArea
          value={change}
          onChange={setChange}
          rows={2}
          placeholder={suggestions.length > 0 ? "Hoặc tự viết — MỘT điều thôi." : "MỘT điều thôi, vd: ra khỏi nhà 9:15."}
        />
      </Step>

      {/* ---------- 3. Chốt tuần tới ---------- */}
      <Step n={3} title={`Chốt tuần tới · ${weekRange(nextWeek)}`}>
        <Toggle
          label="Tuần nhẹ nhịp"
          checked={plan.light}
          onChange={setLight}
          description={
            autoLight
              ? `${autoLight.label} ${ddmm(autoLight.date)} — chỉ giữ sàn 30 phút Listening`
              : "Bật khi tuần tới dồn việc có hạn — chỉ giữ sàn 30 phút Listening"
          }
        />
        <div className="mt-2 divide-y divide-line/70">
          <PlanRow
            skill="Listening"
            count={plan.listening}
            from={plan.listeningFrom}
            onChange={(listening) => setPlan({ ...plan, listening })}
          />
          <PlanRow
            skill="Reading"
            count={plan.reading}
            from={plan.readingFrom}
            onChange={(reading) => setPlan({ ...plan, reading })}
          />
        </div>

        <DeadlineList from={nextWeek} today={today} />
      </Step>

      {hadOldText && (
        <Disclosure title="Tổng kết cũ của tuần này">
          <p className="text-xs font-semibold text-ink-2">Học được gì không cần tài liệu</p>
          <p className="mb-2 text-sm whitespace-pre-wrap text-ink">{existing?.learnedWithoutNotes || "—"}</p>
          <p className="text-xs font-semibold text-ink-2">Dữ liệu cho thấy gì</p>
          <p className="text-sm whitespace-pre-wrap text-ink">{existing?.dataInsight || "—"}</p>
        </Disclosure>
      )}

      <Disclosure title="Ghi chú" right="tuỳ chọn" defaultOpen={note.trim() !== ""}>
        <TextArea value={note} onChange={setNote} rows={3} placeholder="Điều muốn nhớ khi nhìn lại tuần này." />
      </Disclosure>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Đóng
        </Button>
        <Button onClick={handleSave} disabled={submit.busy} className="flex-1">
          {submit.busy ? "Đang lưu..." : existing?.plan ? "Lưu" : "Chốt tuần"}
        </Button>
      </div>
      <FieldError message={submit.error} />
    </div>
  );
}

function errorText(l: TopError | null, r: TopError | null): string {
  const parts = [l && `${l.mark} ${l.label} · ${l.count}`, r && `${r.mark} ${r.label} · ${r.count}`].filter(Boolean);
  return parts.length > 0 ? parts.join("\n") : "Chưa có câu sai";
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-ink">
        <span className="font-num text-accent">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Tile({ label, value, hint, small = false }: { label: string; value: string; hint?: string; small?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <div className="text-xs text-ink-2">{label}</div>
      <div
        className={
          "mt-1 whitespace-pre-line text-ink " + (small ? "text-sm font-medium" : "font-num text-xl font-semibold")
        }
      >
        {value}
      </div>
      {hint && <div className="text-xs text-ink-3">{hint}</div>}
    </div>
  );
}

/** Một dòng khối lượng: tên kỹ năng, +/-, và "từ … tới …". */
function PlanRow({
  skill,
  count,
  from,
  onChange,
}: {
  skill: ScoredSkill;
  count: number;
  from?: TestPosition;
  onChange: (n: number) => void;
}) {
  const unit = partName(skill).toLowerCase();
  const range =
    count > 0 && from
      ? `${formatTestRef(skill, { ...from, parts: [from.part] })} → ${formatTestRef(skill, {
          ...lastPartOf(skill, from, count),
          parts: [lastPartOf(skill, from, count).part],
        })}`
      : count === 0
        ? "Không làm tuần này"
        : "Hết đề Cam 10–19";
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink">
          {skill} · <span className="font-num">{count}</span> {unit}
        </div>
        <div className="text-xs text-ink-3">{range}</div>
      </div>
      <Counter value={count} onChange={(n) => onChange(Math.min(28, n))} compact />
    </div>
  );
}

/* ==================== Deadline 7 ngày tới ==================== */

/**
 * Mốc cố định (schedule.ts) + deadline tự thêm, trong 7 ngày kể từ `from`.
 * Thêm ngay tại đây (tên + ngày). Xoá qua ConfirmDialog (luật số 4).
 */
export function DeadlineList({ from, today }: { from: string; today: string }) {
  const deadlines = useLiveQuery(() => db.deadlines.toArray(), [], [] as Deadline[]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(addDays(from, 4));
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Deadline | null>(null);

  const list = upcomingDeadlines(deadlines, from, 7);

  async function handleAdd() {
    const problem = checkDeadline(title, date, today);
    if (problem) {
      setError(problem);
      return;
    }
    try {
      await db.deadlines.add({ id: newId(), date, title: title.trim() });
    } catch {
      // Ghi lỗi thì giữ nguyên form và chữ đã gõ, báo rõ — không bao giờ im lặng.
      setError("Chưa lưu được deadline, thử lại.");
      return;
    }
    setTitle("");
    setError(null);
    setAdding(false);
  }

  return (
    <div className="mt-4">
      <p className="mb-1 text-sm font-medium text-ink">Deadline 7 ngày tới</p>
      {list.length === 0 ? (
        <p className="text-sm text-ink-3">Không có hạn chót nào.</p>
      ) : (
        <ul className="divide-y divide-line/70">
          {list.map((d) => (
            <li key={`${d.from}-${d.id ?? d.label}-${d.date}`} className="flex min-h-11 items-center justify-between gap-2 py-1">
              <span className="min-w-0 text-sm text-ink">
                {d.label}
                <span className="ml-2 font-num text-xs text-ink-3">{ddmm(d.date)}</span>
              </span>
              {d.from === "custom" && (
                <button
                  type="button"
                  onClick={() => setToDelete(deadlines.find((x) => x.id === d.id) ?? null)}
                  className="tap-target shrink-0 rounded-lg px-3 text-sm font-semibold text-bad-ink active:bg-bad/15"
                  aria-label={`Xoá deadline ${d.label}`}
                >
                  Xoá
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="mt-2 rounded-xl border border-line p-3">
          <Field label="Tên">
            <TextInput value={title} onChange={setTitle} placeholder="vd: Báo cáo tuần công ty" />
          </Field>
          <Field label="Ngày">
            <DateInput value={date} onChange={setDate} />
          </Field>
          <FieldError message={error} />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setAdding(false)} className="flex-1">
              Huỷ
            </Button>
            <Button variant="secondary" onClick={() => void handleAdd()} className="flex-1 text-accent">
              Thêm
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="tap-target mt-1 rounded-lg px-1 text-sm font-semibold text-accent active:bg-surface-2"
        >
          + Thêm deadline
        </button>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Xoá deadline này?"
        detail={
          toDelete && (
            <>
              <strong>{toDelete.title}</strong> · {formatShortDate(toDelete.date)}
            </>
          )
        }
        onConfirm={async () => {
          if (toDelete) await db.deadlines.delete(toDelete.id);
          setToDelete(null);
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

/* ==================== Nhắc điều chỉnh tuần này ==================== */

/** Một dòng gọn ở Hôm nay: điều chỉnh đã chọn trong buổi chốt tuần trước. */
export function ThisWeekChange({ change }: { change: string }) {
  return (
    <div className="mb-4 rounded-2xl border border-line/70 bg-surface px-4 py-3">
      <p className="text-xs font-medium text-ink-3">Điều chỉnh tuần này</p>
      <p className="mt-0.5 text-sm text-ink">{change}</p>
    </div>
  );
}
