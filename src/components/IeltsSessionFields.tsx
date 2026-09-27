/**
 * Phần IELTS trong form kết thúc phiên (và form sửa block) — chỉ hiện khi
 * area là "IELTS". Mục tiêu: nhập xong dưới 30 giây.
 *
 * Đã điền sẵn gần hết:
 *   - kỹ năng: Listening
 *   - đề: phần TIẾP THEO của kỹ năng đó (src/lib/ielts.ts `nextTest`), 1 phần
 *   - số câu: tự cộng từ các phần đã chọn (10 mỗi section; 13/13/14 mỗi passage)
 * Còn lại chỉ phải: gõ số câu đúng, bấm 4 bộ đếm lỗi, chạm một chip chép chính tả.
 *
 * Luật (PRODUCT.md mục 7/7b): tổng 4 loại lỗi PHẢI bằng số câu sai thì mới lưu
 * được. Dòng "Đã phân loại x/y" cho thấy còn thiếu bao nhiêu.
 *
 * Component "có điều khiển": dữ liệu nằm ở FocusBlockForm (`draft`), ở đây chỉ
 * vẽ và báo thay đổi. Đổi kỹ năng thì điền lại đề tiếp theo CỦA KỸ NĂNG MỚI.
 */
import type { FocusBlock, IeltsSkill } from "../db/types";
import { IELTS_SKILLS } from "../db/types";
import {
  BAND_CHOICES,
  DICTATION_CHOICES,
  FIRST_BOOK,
  FULL_TEST_QUESTIONS,
  LAST_BOOK,
  TESTS_PER_BOOK,
  errorTotal,
  errorTypes,
  formatBand,
  isScoredSkill,
  newDraft,
  partCount,
  partName,
  partShort,
  rawToBand,
  toggleDraftPart,
  wrongCount,
  type IeltsDraft,
} from "../lib/ielts";
import { ChipGroup, Counter, Field } from "./ui";

const SELECT =
  "tap-target w-full rounded-xl border border-line bg-surface-2 px-3 text-base font-medium text-ink focus:border-accent focus:outline focus:outline-1 focus:outline-accent";

const NO_BAND = "Chưa chấm";

const BOOKS = Array.from({ length: LAST_BOOK - FIRST_BOOK + 1 }, (_, i) => FIRST_BOOK + i);
const TESTS = Array.from({ length: TESTS_PER_BOOK }, (_, i) => i + 1);

export default function IeltsSessionFields({
  draft,
  onChange,
  history,
}: {
  draft: IeltsDraft;
  onChange: (d: IeltsDraft) => void;
  /** Các block IELTS đã lưu — để tính đề tiếp theo khi đổi kỹ năng. */
  history: FocusBlock[];
}) {
  const skill = draft.skill;
  const set = (patch: Partial<IeltsDraft>) => onChange({ ...draft, ...patch });

  return (
    <section className="mb-4 rounded-xl border border-line p-3" aria-label="Buổi IELTS">
      <p className="mb-2 text-sm font-semibold text-ink">Buổi IELTS</p>

      {/* Chip xuống dòng được — 4 chữ tiếng Anh không bị ép ở màn hẹp / cỡ 150%. */}
      <div className="mb-3">
        <ChipGroup<IeltsSkill> options={IELTS_SKILLS} value={skill} onChange={(s) => onChange(newDraft(s, history))} />
      </div>

      {isScoredSkill(skill) ? (
        <>
          {/* ---------- Đề ---------- */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-ink">Đề</span>
            <button
              type="button"
              onClick={() => set({ noTest: !draft.noTest })}
              aria-pressed={draft.noTest}
              className={
                "tap-target rounded-full px-4 text-sm font-medium " +
                (draft.noTest ? "bg-accent text-on-accent" : "bg-surface-2 text-ink-2 active:bg-line")
              }
            >
              Không làm đề
            </button>
          </div>

          {draft.noTest ? (
            <p className="mb-3 text-xs text-ink-3">
              Buổi này không làm đề — vẫn tính vào giờ IELTS và khung 9:30.
            </p>
          ) : (
            <TestFields draft={draft} onChange={onChange} skill={skill} />
          )}

          {skill === "Listening" && (
            <Field label="Chép chính tả" hint="phút">
              <ChipGroup
                options={DICTATION_CHOICES}
                value={draft.dictationMinutes}
                onChange={(m) => set({ dictationMinutes: m })}
                format={(m) => `${m}p`}
              />
            </Field>
          )}
        </>
      ) : (
        <Field label="Band AI chấm" hint="không bắt buộc">
          <ChipGroup
            scroll
            options={[NO_BAND, ...BAND_CHOICES.map(formatBand)]}
            value={draft.aiBand === null ? NO_BAND : formatBand(draft.aiBand)}
            onChange={(v) => set({ aiBand: v === NO_BAND ? null : Number(v) })}
          />
        </Field>
      )}
    </section>
  );
}

/** Sách / test / phần, số câu, số đúng và 4 bộ đếm lỗi. */
function TestFields({
  draft,
  onChange,
  skill,
}: {
  draft: IeltsDraft;
  onChange: (d: IeltsDraft) => void;
  skill: "Listening" | "Reading";
}) {
  const set = (patch: Partial<IeltsDraft>) => onChange({ ...draft, ...patch });
  const wrong = wrongCount(draft);
  const sorted = errorTotal(draft.errors);
  const types = errorTypes(skill);
  const parts = Array.from({ length: partCount(skill) }, (_, i) => i + 1);

  // Band chỉ khi làm đủ 40 câu (PRODUCT.md mục 3); ít hơn thì % đúng.
  const band =
    draft.correct !== null && draft.questions === FULL_TEST_QUESTIONS ? rawToBand(skill, draft.correct) : null;
  const percent =
    draft.correct !== null && draft.questions > 0 && draft.correct <= draft.questions
      ? Math.round((draft.correct / draft.questions) * 100)
      : null;

  return (
    <>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <select
          aria-label="Cuốn Cambridge"
          value={draft.book}
          onChange={(e) => set({ book: Number(e.target.value) })}
          className={SELECT}
        >
          {BOOKS.map((b) => (
            <option key={b} value={b}>
              Cam {b}
            </option>
          ))}
        </select>
        <select
          aria-label="Test"
          value={draft.test}
          onChange={(e) => set({ test: Number(e.target.value) })}
          className={SELECT}
        >
          {TESTS.map((t) => (
            <option key={t} value={t}>
              Test {t}
            </option>
          ))}
        </select>
      </div>

      {/* Chọn được nhiều phần: chạm để bật/tắt. */}
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label={`${partName(skill)} đã làm`}>
        {parts.map((p) => {
          const on = draft.parts.includes(p);
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange(toggleDraftPart(draft, p))}
              aria-pressed={on}
              aria-label={`${partName(skill)} ${p}`}
              className={
                "tap-target min-w-14 rounded-full px-4 font-num text-sm font-semibold " +
                (on ? "bg-accent text-on-accent" : "bg-surface-2 text-ink-2 active:bg-line")
              }
            >
              {partShort(skill, p)}
            </button>
          );
        })}
      </div>

      {/* ---------- Số câu ---------- */}
      <div className="mb-3 flex flex-wrap items-end gap-x-4 gap-y-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Số câu đúng</span>
          <span className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={draft.questions}
              value={draft.correct ?? ""}
              onChange={(e) => set({ correct: e.target.value === "" ? null : Number(e.target.value) })}
              placeholder="?"
              className="tap-target w-20 rounded-xl border border-line bg-surface-2 px-3 text-center font-num text-lg font-semibold text-ink placeholder:text-ink-3 focus:border-accent focus:outline focus:outline-1 focus:outline-accent"
            />
            <span className="font-num text-base text-ink-2">/ {draft.questions}</span>
          </span>
        </label>
        <div className="pb-2.5 text-sm text-ink-2">
          {percent !== null && (
            <>
              <span className="font-num text-ink">{percent}%</span> đúng
              {band !== null && (
                <>
                  {" · "}band <span className="font-num font-semibold text-ink">≈ {formatBand(band)}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <details className="mb-3 text-sm">
        <summary className="tap-target flex cursor-pointer items-center text-ink-2">
          Số câu đã làm: <span className="ml-1 font-num text-ink">{draft.questions}</span>
          <span className="ml-1 text-ink-3">(tự cộng · sửa)</span>
        </summary>
        <div className="mt-2">
          <Counter value={draft.questions} onChange={(q) => set({ questions: Math.min(40, q) })} />
        </div>
      </details>

      {/* ---------- 4 loại lỗi ---------- */}
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-ink">Phân loại câu sai</span>
        {wrong !== null && wrong >= 0 && (
          <span
            className={"text-sm font-semibold " + (sorted === wrong ? "text-good" : "text-warn")}
            aria-live="polite"
          >
            {sorted === wrong ? "✓ " : ""}
            <span className="font-num">
              {sorted}/{wrong}
            </span>{" "}
            câu sai
          </span>
        )}
      </div>
      <ul className="mb-3 divide-y divide-line/70">
        {types.map((t, i) => (
          <li key={t.mark} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
            {/* basis-36: ở 390px nhãn + bộ đếm vừa một hàng; cỡ 150% thì bộ đếm xuống dòng. */}
            <span className="min-w-0 flex-1 basis-36">
              <span className="block text-sm font-semibold text-ink">
                {t.mark} {t.label}
              </span>
              <span className="block text-xs text-ink-3">{t.hint}</span>
            </span>
            <Counter
              compact
              value={draft.errors[i]}
              onChange={(v) => {
                const errors = [...draft.errors] as IeltsDraft["errors"];
                errors[i] = v;
                set({ errors });
              }}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
