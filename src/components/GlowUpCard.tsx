/**
 * Thẻ "Glow-up" trên màn Hôm nay (PRODUCT.md mục 10).
 *
 *   - Tuần mấy, giai đoạn (bấm để mở màn "Glow-up 12 tuần"); buổi tập theo lịch
 *     hôm nay + các buổi đã ghi
 *   - Checklist: mỗi mục MỘT chạm, lưu ngay (không có nút Lưu)
 *       ngủ: tự lấy từ check-in sáng · nước / protein / xơ: nút − + ·
 *       bước chân: một ô số · 3 mục đánh dấu · buổi tập: tự tích khi đã ghi
 *   - Cân sáng (tuỳ chọn, KHÔNG tính vào 9 mục): check-in Chủ nhật lấy trung bình (G3)
 *   - "Đạt Glow-up: x/7 tuần này" + 7 chấm (đếm ngày, không đếm chuỗi)
 *
 * Không có nút tô màu đầy: nút chính của Hôm nay vẫn là "Bắt đầu IELTS".
 * Ngoài 12 tuần thì thẻ không hiện.
 */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CHECKLIST_STEPS, DAILY_TARGETS, DAY_MET_MIN, SESSION_LABELS, WEIGHT_RANGE_KG } from "../config/glowUp";
import { db } from "../db/db";
import type { DailyCheckin, GlowDay, Workout } from "../db/types";
import { formatMinutes } from "../lib/dates";
import { patchGlowDay } from "../lib/glowUpDb";
import {
  adapaleneTonight,
  dayChecklist,
  formatKg,
  glowWeek,
  parseDecimal,
  planFor,
  programWeek,
  sleepCheck,
  stepValue,
  waterTarget,
  weekTitle,
  weekWeighIns,
  type ChecklistId,
} from "../lib/glowUp";
import { mondayOf } from "../lib/metrics";
import { Button, Card } from "./ui";

const WEEKDAY_SHORT = ["2", "3", "4", "5", "6", "7", "CN"];
const WEEKDAY_LONG = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

/** Số kiểu Việt Nam: 2.75 -> "2,75", 8000 -> "8.000". */
function vn(n: number): string {
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

/** Vòng tròn ✓ (đạt) hoặc vòng rỗng (chưa). */
function Mark({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={
        "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs " +
        (done ? "bg-good/15 font-bold text-good" : "border-2 border-line")
      }
    >
      {done ? "✓" : ""}
    </span>
  );
}

/** Một dòng có nút − + (nước, protein, xơ). */
function StepRow({
  label,
  value,
  target,
  unit,
  step,
  done,
  onStep,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  step: number;
  done: boolean;
  onStep: (sign: 1 | -1) => void;
}) {
  const btn = "tap-target w-11 shrink-0 rounded-xl bg-surface-2 text-xl font-bold text-ink-2 active:bg-line";
  return (
    <li className="flex min-h-[52px] items-center gap-3 py-1.5">
      <Mark done={done} />
      <span className="min-w-0 flex-1 text-sm text-ink">
        {label}
        <span className="block text-xs text-ink-2">
          <span className="font-num font-semibold text-ink">{vn(value)}</span> / {vn(target)} {unit}
        </span>
      </span>
      <button type="button" onClick={() => onStep(-1)} className={btn} aria-label={`${label}: bớt ${vn(step)} ${unit}`}>
        −
      </button>
      <button type="button" onClick={() => onStep(1)} className={btn} aria-label={`${label}: thêm ${vn(step)} ${unit}`}>
        +
      </button>
    </li>
  );
}

/** Một dòng đánh dấu (cả dòng là nút). */
function TickRow({
  label,
  hint,
  done,
  onToggle,
}: {
  label: string;
  hint?: string;
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        className="flex min-h-[52px] w-full items-center gap-3 py-1.5 text-left active:bg-surface-2"
      >
        <Mark done={done} />
        <span className="min-w-0 flex-1 text-sm text-ink">
          {label}
          {hint && <span className="block text-xs text-ink-3">{hint}</span>}
        </span>
      </button>
    </li>
  );
}

/**
 * Ô bước chân: gõ một lần buổi tối (xem app Sức khoẻ), lưu khi rời ô hoặc bấm Enter.
 * Màn cha đặt `key` theo ngày + giá trị đã lưu, nên dữ liệu đổi từ nơi khác
 * (máy khác, sang ngày mới) thì ô tự làm mới.
 */
function StepsRow({ date, value, done }: { date: string; value: number | undefined; done: boolean }) {
  const [text, setText] = useState(value === undefined ? "" : String(value));

  function save() {
    const digits = text.replace(/\D/g, "");
    const steps = digits === "" ? undefined : Number(digits);
    if (steps === value) return;
    void patchGlowDay(date, () => ({ steps }));
  }

  return (
    <li className="flex min-h-[52px] items-center gap-3 py-1.5">
      <Mark done={done} />
      <label htmlFor={`steps-${date}`} className="min-w-0 flex-1 text-sm text-ink">
        Bước chân
        <span className="block text-xs text-ink-3">đích {vn(DAILY_TARGETS.steps)}</span>
      </label>
      <input
        id={`steps-${date}`}
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder="0"
        className="tap-target w-28 shrink-0 rounded-xl border border-line bg-surface-2 px-3 text-right font-num text-ink"
      />
    </li>
  );
}

/**
 * Cân sáng (tuỳ chọn): sau khi đi vệ sinh, trước khi ăn, 3 sáng mỗi tuần.
 * Lưu khi rời ô; số ngoài 30–250 kg (gõ nhầm) thì không lưu và báo ngay dưới ô.
 * Xoá trống ô = bỏ lần cân của ngày này. `key` như ô bước chân.
 */
function WeightRow({ date, value, weekCount }: { date: string; value: number | undefined; weekCount: number }) {
  const [text, setText] = useState(value === undefined ? "" : formatKg(value));
  const [error, setError] = useState<string | null>(null);

  function save() {
    const kg = parseDecimal(text);
    if (kg !== null && (Number.isNaN(kg) || kg < WEIGHT_RANGE_KG.min || kg > WEIGHT_RANGE_KG.max)) {
      setError("Nhập số kg, ví dụ 70,4.");
      return;
    }
    setError(null);
    if ((kg ?? undefined) === value) return;
    void patchGlowDay(date, () => ({ weightKg: kg ?? undefined }));
  }

  return (
    <div className="border-t border-line/70 py-1.5">
      <div className="flex min-h-[52px] items-center gap-3">
        {/* Không có vòng ✓: cân không phải một mục của checklist. */}
        <span aria-hidden="true" className="w-6 shrink-0 text-center text-xs text-ink-3">
          kg
        </span>
        <label htmlFor={`weight-${date}`} className="min-w-0 flex-1 text-sm text-ink">
          Cân sáng <span className="text-ink-3">(tuỳ chọn)</span>
          <span className="block text-xs text-ink-3">
            3 sáng/tuần · tuần này <span className="font-num">{weekCount}</span> lần
          </span>
        </label>
        <input
          id={`weight-${date}`}
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder="—"
          aria-invalid={error !== null}
          className="tap-target w-28 shrink-0 rounded-xl border border-line bg-surface-2 px-3 text-right font-num text-ink"
        />
      </div>
      {error && (
        <p role="alert" className="text-right text-sm text-bad-ink">
          {error}
        </p>
      )}
    </div>
  );
}

export default function GlowUpCard({
  today,
  checkins,
  workouts,
  onLogWorkout,
  onEditWorkout,
  onOpenSchedule,
}: {
  today: string;
  /** Mọi check-in (mục ngủ của từng ngày trong tuần). */
  checkins: DailyCheckin[];
  /** Mọi buổi tập đã ghi. */
  workouts: Workout[];
  onLogWorkout: () => void;
  onEditWorkout: (w: Workout) => void;
  /** Mở màn "Glow-up 12 tuần". */
  onOpenSchedule: () => void;
}) {
  const week = programWeek(today);
  const days = useLiveQuery(() => db.glowDays.toArray(), [], [] as GlowDay[]);
  if (!week) return null;

  const day = days.find((d) => d.date === today);
  const checkin = checkins.find((c) => c.date === today);
  const plan = planFor(today);
  const list = dayChecklist(today, day, checkin, workouts);
  const done = (id: ChecklistId) => list.items.find((i) => i.id === id)?.done ?? false;
  const sleep = sleepCheck(checkin, today);
  const todays = workouts.filter((w) => w.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const weekDays = glowWeek(today, days, checkins, workouts);
  const metCount = weekDays.filter((d) => d.met).length;
  const adapalene = adapaleneTonight(today);
  const water = waterTarget(workouts, today);

  const step = (field: "waterL" | "proteinG" | "fiberG", size: number) => (sign: 1 | -1) =>
    void patchGlowDay(today, (cur) => ({ [field]: stepValue(cur[field], size, sign) }));
  const toggle = (field: "noSugaryDrinks" | "skincareAm" | "skincarePm") => () =>
    void patchGlowDay(today, (cur) => ({ [field]: !cur[field] }));

  return (
    <Card className="mb-3">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <span className="h-2 w-2 shrink-0 rounded-full bg-good" aria-hidden="true" />
          Glow-up
        </h2>
        {/* Tuần + giai đoạn cũng là lối vào màn lịch 12 tuần / số đo (G4). */}
        <button
          type="button"
          onClick={onOpenSchedule}
          className="tap-target -mr-2 flex shrink-0 items-center rounded-lg px-2 text-xs font-semibold text-accent active:bg-surface-2"
        >
          {weekTitle(week)} ›
        </button>
      </div>
      <p className="text-xs text-ink-3">{week.focus}</p>

      {/* ----- Buổi tập hôm nay ----- */}
      <div className="mt-3 rounded-xl border border-line/70 p-3">
        {plan && plan.session !== "rest" ? (
          <p className="text-sm text-ink">
            Hôm nay: <span className="font-semibold">{plan.label}</span>
            <span className="text-ink-2">
              {" "}
              · <span className="font-num">{plan.time}</span> · {plan.minutes}
            </span>
            {plan.detail && <span className="block text-xs text-ink-2">{plan.detail}</span>}
          </p>
        ) : (
          <p className="text-sm text-ink">
            Hôm nay nghỉ <span className="text-ink-2">· check-in Chủ nhật, chuẩn bị đồ ăn</span>
          </p>
        )}
        {todays.length > 0 && (
          <ul className="mt-2 space-y-1">
            {todays.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => onEditWorkout(w)}
                  className="flex min-h-[44px] w-full items-center gap-2 rounded-lg text-left text-sm active:bg-surface-2"
                  aria-label={`Sửa buổi ${SESSION_LABELS[w.session]} ${w.startTime}`}
                >
                  <Mark done />
                  <span className="min-w-0 flex-1 text-ink">
                    {SESSION_LABELS[w.session]} · <span className="font-num">{formatMinutes(w.minutes)}</span>
                    {w.sets && <span className="text-ink-2"> · {w.sets.length} hiệp</span>}
                    {w.km !== undefined && <span className="text-ink-2"> · {vn(w.km)} km</span>}
                  </span>
                  <span className="text-sm font-semibold text-accent">Sửa</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <Button variant="secondary" onClick={onLogWorkout} className="mt-2 w-full text-sm">
          + Ghi buổi tập
        </Button>
      </div>

      {/* ----- Checklist ----- */}
      <ul className="mt-2 divide-y divide-line/70">
        <li className="flex min-h-[52px] items-center gap-3 py-1.5">
          <Mark done={done("sleep")} />
          <span className="min-w-0 flex-1 text-sm text-ink">
            Ngủ đúng giờ
            <span className="block text-xs text-ink-3">
              {sleep ? (
                <>
                  Đêm qua <span className="font-num">{sleep.bedTime}</span> · mốc{" "}
                  <span className="font-num">{sleep.target}</span>
                </>
              ) : (
                "Lấy từ check-in sáng (chưa có)"
              )}
            </span>
          </span>
        </li>
        <StepRow
          label="Nước"
          value={day?.waterL ?? 0}
          target={water}
          unit="lít"
          step={CHECKLIST_STEPS.waterL}
          done={done("water")}
          onStep={step("waterL", CHECKLIST_STEPS.waterL)}
        />
        <StepRow
          label="Protein"
          value={day?.proteinG ?? 0}
          target={DAILY_TARGETS.proteinG}
          unit="g"
          step={CHECKLIST_STEPS.proteinG}
          done={done("protein")}
          onStep={step("proteinG", CHECKLIST_STEPS.proteinG)}
        />
        <StepRow
          label="Chất xơ"
          value={day?.fiberG ?? 0}
          target={DAILY_TARGETS.fiberG}
          unit="g"
          step={CHECKLIST_STEPS.fiberG}
          done={done("fiber")}
          onStep={step("fiberG", CHECKLIST_STEPS.fiberG)}
        />
        <StepsRow key={`${today}:${day?.steps ?? ""}`} date={today} value={day?.steps} done={done("steps")} />
        <TickRow label="Không nước ngọt / trà sữa" done={done("noSugaryDrinks")} onToggle={toggle("noSugaryDrinks")} />
        <TickRow
          label="Skincare sáng"
          hint="rửa mặt · dưỡng ẩm · SPF 50"
          done={done("skincareAm")}
          onToggle={toggle("skincareAm")}
        />
        <TickRow
          label="Skincare tối"
          hint={adapalene ? "rửa mặt · adapalene · dưỡng ẩm" : "rửa mặt · dưỡng ẩm (tối nay nghỉ adapalene)"}
          done={done("skincarePm")}
          onToggle={toggle("skincarePm")}
        />
      </ul>
      <WeightRow
        key={`${today}:${day?.weightKg ?? ""}`}
        date={today}
        value={day?.weightKg}
        weekCount={weekWeighIns(days, mondayOf(today)).length}
      />

      {/* ----- Đếm ngày đạt trong tuần ----- */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line/70 pt-3">
        <p className="text-sm text-ink">
          Đạt Glow-up: <span className="font-num font-semibold">{metCount}/7</span> tuần này
          <span className="block text-xs text-ink-3">
            Hôm nay <span className="font-num">{list.done}/{list.total}</span> mục · đạt khi ≥ {DAY_MET_MIN}
          </span>
        </p>
        <ol className="flex gap-1" aria-label="Các ngày đạt Glow-up tuần này">
          {weekDays.map((d, i) => (
            <li
              key={d.date}
              className={
                "grid h-7 w-7 place-items-center rounded-full text-xs " +
                (d.met ? "bg-good font-semibold text-canvas" : "bg-surface-2 text-ink-3") +
                (d.date === today ? " ring-2 ring-accent ring-offset-1 ring-offset-surface" : "")
              }
            >
              <span aria-hidden="true">{WEEKDAY_SHORT[i]}</span>
              <span className="sr-only">
                {WEEKDAY_LONG[i]}: {d.met ? "đạt" : "chưa"}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}
