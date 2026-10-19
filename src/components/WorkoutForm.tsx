/**
 * Form ghi một buổi tập Glow-up (PRODUCT.md mục 10).
 *
 * Mục tiêu < 30 giây: loại buổi chọn sẵn theo lịch hôm nay, số phút là chip,
 * giờ bắt đầu tự lùi theo số phút. Buổi gym điền sẵn MỌI hiệp từ buổi trước
 * cùng bài (kg + số lần), hoặc mức tạ mới khi buổi trước đạt đỉnh cả 3 hiệp
 * (src/lib/glowUp.ts: prefillSets / suggestLoad). Thường chỉ cần bấm Lưu.
 *
 * Số lần 0 = bỏ qua hiệp đó: không lưu.
 */
import { useState } from "react";
import { GYM, SESSION_LABELS, type GymSessionId } from "../config/glowUp";
import { WORKOUT_SESSIONS, type Rating, type Workout, type WorkoutSession, type WorkoutSet } from "../db/types";
import { newId, nowHHmm, subtractMinutesFromHHmm } from "../lib/dates";
import { formatKg, lastSetsFor, parseDecimal, planFor, prefillSets, suggestLoad } from "../lib/glowUp";
import { useSubmit } from "../lib/useSubmit";
import { MAX_BLOCK_MINUTES, checkBlockMinutes, checkTime } from "../lib/validation";
import { Button, ChipGroup, Counter, Field, FieldError, RatingRow, Tag, TextInput, TimeInput } from "./ui";

const QUICK_MINUTES = [30, 45, 60, 75, 90] as const;

const isGym = (s: WorkoutSession): s is GymSessionId => s === "gym_A" || s === "gym_B" || s === "gym_C";
const isRun = (s: WorkoutSession) => s.startsWith("run_");


/** Hiệp trong form: kg giữ dạng chữ để gõ được "42,5". */
type DraftSet = { exercise: string; kgText: string; reps: number };

const toDraft = (sets: WorkoutSet[]): DraftSet[] =>
  sets.map((s) => ({ exercise: s.exercise, kgText: s.kg === null ? "" : formatKg(s.kg), reps: s.reps }));

export default function WorkoutForm({
  date,
  existing,
  workouts,
  onSave,
  onCancel,
}: {
  /** Ngày của buổi (buổi mới: hôm nay; màn cha đóng dấu lại lúc lưu). */
  date: string;
  existing?: Workout;
  /** Mọi buổi tập đã ghi — để điền sẵn từ buổi trước. */
  workouts: Workout[];
  onSave: (w: Workout) => Promise<void> | void;
  onCancel: () => void;
}) {
  // Buổi mới: chọn sẵn buổi theo lịch hôm nay; Chủ nhật (nghỉ) thì "Buổi khác".
  const planned = planFor(date)?.session;
  const initialSession: WorkoutSession =
    existing?.session ?? (planned && planned !== "rest" ? planned : "other");

  const [session, setSession] = useState<WorkoutSession>(initialSession);
  const [minutes, setMinutes] = useState<number>(existing?.minutes ?? (isGym(initialSession) ? 60 : 45));
  const [customMinutes, setCustomMinutes] = useState(
    existing ? !(QUICK_MINUTES as readonly number[]).includes(existing.minutes) : false
  );
  const [startTime, setStartTime] = useState(
    existing?.startTime ?? subtractMinutesFromHHmm(nowHHmm(), existing?.minutes ?? (isGym(initialSession) ? 60 : 45))
  );
  const [startTouched, setStartTouched] = useState(false);
  const [sets, setSets] = useState<DraftSet[]>(() =>
    existing?.sets
      ? toDraft(existing.sets)
      : isGym(initialSession)
        ? toDraft(prefillSets(initialSession, date, workouts))
        : []
  );
  const [kmText, setKmText] = useState(existing?.km !== undefined ? formatKg(existing.km) : "");
  const [effort, setEffort] = useState<Rating | null>(existing?.effort ?? null);
  const [note, setNote] = useState(existing?.note ?? "");

  /** Đổi loại buổi: điền lại các hiệp của buổi gym mới (hoặc bỏ hiệp nếu không phải gym). */
  function changeSession(s: WorkoutSession) {
    setSession(s);
    setSets(isGym(s) ? toDraft(prefillSets(s, date, workouts, existing?.id)) : []);
  }

  /** Đổi số phút: tính lại giờ bắt đầu, trừ khi đang sửa buổi cũ hoặc đã tự sửa giờ. */
  function changeMinutes(m: number) {
    setMinutes(m);
    if (!existing && !startTouched) setStartTime(subtractMinutesFromHHmm(nowHHmm(), m));
  }

  function updateSet(index: number, patch: Partial<DraftSet>) {
    setSets((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  // Kiểm tra lúc lưu (luật: HTML min/max không chặn nút Lưu).
  const minutesError = checkBlockMinutes(minutes);
  const timeError = checkTime(startTime, "Giờ bắt đầu");
  const kgError = sets.some((s) => Number.isNaN(parseDecimal(s.kgText))) ? "Số kg phải là số, ví dụ 42,5." : null;
  const km = parseDecimal(kmText);
  const kmError = Number.isNaN(km) ? "Số km phải là số, ví dụ 6,5." : null;
  const canSave = minutesError === null && timeError === null && kgError === null && kmError === null;
  const submit = useSubmit();

  function handleSave() {
    if (!canSave) return;
    const savedSets: WorkoutSet[] = sets
      .filter((s) => s.reps > 0)
      .map((s) => ({ exercise: s.exercise, kg: parseDecimal(s.kgText), reps: s.reps }));
    void submit.run(() =>
      onSave({
        id: existing?.id ?? newId(),
        date: existing?.date ?? date,
        startTime,
        session,
        minutes,
        // Trường trống thì bỏ đi cho dữ liệu gọn.
        sets: isGym(session) && savedSets.length > 0 ? savedSets : undefined,
        km: isRun(session) && km !== null && !Number.isNaN(km) ? km : undefined,
        effort: effort ?? undefined,
        note: note.trim() === "" ? undefined : note.trim(),
      })
    );
  }

  const plan = planFor(existing?.date ?? date);

  return (
    <div>
      <Field label="Buổi">
        <ChipGroup
          scroll
          options={WORKOUT_SESSIONS}
          value={session}
          onChange={changeSession}
          format={(s) => SESSION_LABELS[s]}
        />
        {plan?.detail && plan.session === session && <p className="mt-2 text-sm text-ink-2">{plan.detail}</p>}
      </Field>

      <Field label="Số phút">
        <ChipGroup
          options={QUICK_MINUTES}
          value={customMinutes ? null : minutes}
          onChange={(m) => {
            changeMinutes(m);
            setCustomMinutes(false);
          }}
          format={(m) => `${m}p`}
        />
        <div className="mt-2">
          {customMinutes ? (
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_BLOCK_MINUTES}
              value={Number.isFinite(minutes) && minutes > 0 ? minutes : ""}
              onChange={(e) => changeMinutes(Number(e.target.value))}
              aria-label="Số phút"
              aria-invalid={minutesError !== null}
              className="tap-target w-full rounded-xl border border-line bg-surface-2 px-3 text-base font-semibold text-ink"
              placeholder="Số phút"
            />
          ) : (
            <Button variant="ghost" onClick={() => setCustomMinutes(true)} className="text-sm">
              Nhập số khác
            </Button>
          )}
        </div>
        <FieldError message={minutesError} />
      </Field>

      <Field label="Bắt đầu lúc" hint={!existing ? "tự tính lùi theo số phút" : undefined}>
        <TimeInput
          value={startTime}
          onChange={(v) => {
            setStartTime(v);
            setStartTouched(true);
          }}
        />
        <FieldError message={timeError} />
      </Field>

      {isGym(session) && (
        <Field label="Các hiệp" hint="điền sẵn từ buổi trước · 0 lần = bỏ qua">
          {GYM[session].exercises.map((ex) => {
            const rows = sets.map((s, i) => ({ s, i })).filter(({ s }) => s.exercise === ex.id);
            if (rows.length === 0) return null;
            const last = lastSetsFor(workouts, ex.id, existing?.id);
            const suggestion = existing ? null : suggestLoad(ex, last);
            return (
              <div key={ex.id} className="mb-2 rounded-xl border border-line/70 p-3">
                <p className="text-sm font-semibold text-ink">{ex.name}</p>
                <p className="text-xs text-ink-3">
                  {ex.sets} × {ex.reps} · nghỉ {ex.restS >= 120 ? `${ex.restS / 60} phút` : `${ex.restS} giây`}
                  {last.length > 0 && (
                    <>
                      {" · buổi trước "}
                      <span className="font-num">
                        {last[0].kg !== null && `${formatKg(last[0].kg)} kg × `}
                        {last.map((s) => s.reps).join(" · ")}
                      </span>
                    </>
                  )}
                </p>
                {suggestion?.increase && (
                  <div className="mt-1">
                    <Tag tone="good">Đạt đỉnh cả {ex.sets} hiệp → {formatKg(suggestion.kg)} kg</Tag>
                  </div>
                )}
                <ul className="mt-2 space-y-1.5">
                  {rows.map(({ s, i }, n) => (
                    // flex-wrap: màn hẹp (điện thoại ở cỡ 150%) thì bộ đếm xuống dòng
                    // thay vì bóp ô kg còn vài pixel.
                    <li key={i} className="flex flex-wrap items-center gap-2">
                      <span className="w-6 shrink-0 font-num text-xs text-ink-3">H{n + 1}</span>
                      {ex.load === "bodyweight" ? (
                        <span className="min-w-0 flex-1 text-xs text-ink-3">tạ người</span>
                      ) : (
                        <label className="flex min-w-[6rem] flex-1 items-center gap-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={s.kgText}
                            onChange={(e) => updateSet(i, { kgText: e.target.value })}
                            placeholder="kg"
                            aria-label={`${ex.name} hiệp ${n + 1}: kg`}
                            className="tap-target w-full min-w-0 rounded-xl border border-line bg-surface-2 px-2 text-center font-num text-ink"
                          />
                          <span className="text-xs text-ink-3">kg</span>
                        </label>
                      )}
                      <Counter compact value={s.reps} onChange={(r) => updateSet(i, { reps: r })} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <FieldError message={kgError} />
        </Field>
      )}

      {isRun(session) && (
        <Field label="Quãng đường (km)" hint="không bắt buộc">
          <input
            type="text"
            inputMode="decimal"
            value={kmText}
            onChange={(e) => setKmText(e.target.value)}
            placeholder="vd 6,5"
            aria-label="Quãng đường (km)"
            className="tap-target w-full rounded-xl border border-line bg-surface-2 px-3 font-num text-ink"
          />
          <FieldError message={kmError} />
        </Field>
      )}

      <Field label="Mức mệt" hint="không bắt buộc">
        <RatingRow value={effort} onChange={setEffort} lowLabel="1 · nhẹ" highLabel="5 · kiệt sức" />
      </Field>

      <Field label="Ghi chú" hint="không bắt buộc">
        <TextInput value={note} onChange={setNote} placeholder="vd: vai hơi đau ở bài đẩy" />
      </Field>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          Huỷ
        </Button>
        <Button onClick={handleSave} disabled={!canSave || submit.busy} className="flex-1">
          {submit.busy ? "Đang lưu..." : existing ? "Cập nhật" : "Lưu buổi tập"}
        </Button>
      </div>
      <FieldError message={submit.error} />
    </div>
  );
}
