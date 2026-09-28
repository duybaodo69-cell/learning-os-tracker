/**
 * Ghi kết quả thi thử IELTS (docs/PRODUCT.md mục 5 và 8, Đợt 1).
 *
 * Nằm ở tab IELTS → "Thi thử" (Đợt 2; Đợt 1 tạm đặt trong Ôn tập).
 *
 *   - Listening / Reading: nhập ĐIỂM THÔ /40, app tự quy ra band ≈
 *   - Writing / Speaking: chọn band
 *   - Overall tự tính khi đủ 4 kỹ năng (làm tròn theo PRODUCT.md mục 3)
 * Mọi kỹ năng đều tuỳ chọn — thi thử AI có thể chỉ chấm Writing.
 * Band L/R và overall KHÔNG lưu, luôn tính lại từ điểm thô (src/lib/ielts.ts).
 *
 * Máy tính: form bên trái, lịch sử bên phải. Điện thoại: lịch sử dưới form.
 */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../db/db";
import type { MockSource, MockTest } from "../db/types";
import { MOCK_SOURCES } from "../db/types";
import {
  BAND_CHOICES,
  MOCK_SOURCE_LABELS,
  checkMockTest,
  formatBand,
  mockBands,
  rawToBand,
  type ScoredSkill,
} from "../lib/ielts";
import { formatShortDate, newId } from "../lib/dates";
import { useToday } from "../lib/useToday";
import { useSubmit } from "../lib/useSubmit";
import { checkDate } from "../lib/validation";
import ConfirmDialog from "./ConfirmDialog";
import { Button, Card, ChipGroup, DateInput, EmptyState, Field, FieldError, SectionLabel, Tag, TextInput } from "./ui";

const NO_BAND = "—";

export default function MockTestView() {
  const mocks = useLiveQuery(() => db.mockTests.orderBy("date").reverse().toArray(), []);
  // Đang sửa lần nào (null = đang nhập lần mới). Đổi `formKey` để form vẽ lại từ đầu.
  const [editing, setEditing] = useState<MockTest | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [toDelete, setToDelete] = useState<MockTest | null>(null);
  // Dòng "Đã lưu" nằm ở đây vì form được dựng lại (trống) ngay sau khi lưu.
  const [savedNote, setSavedNote] = useState<string | null>(null);

  function openForm(m: MockTest | null) {
    setEditing(m);
    setFormKey((k) => k + 1);
    setSavedNote(null);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    await db.mockTests.delete(toDelete.id);
    setToDelete(null);
    openForm(null);
  }

  return (
    <div className="grid items-start gap-x-4 pb-4 @3xl/content:grid-cols-2">
      <Card className="mb-4 min-w-0">
        <SectionLabel>{editing ? "Sửa lần thi thử" : "Ghi kết quả thi thử"}</SectionLabel>
        <MockTestForm
          key={formKey}
          existing={editing ?? undefined}
          onSaved={(m) => {
            openForm(null);
            setSavedNote(`Đã lưu thi thử ngày ${formatShortDate(m.date)}.`);
          }}
          onCancel={editing ? () => openForm(null) : undefined}
          onDelete={editing ? () => setToDelete(editing) : undefined}
        />
        {savedNote && <p className="mt-2 text-center text-sm font-semibold text-good">{savedNote}</p>}
      </Card>

      <section className="min-w-0">
        <SectionLabel className="px-1" right={mocks && mocks.length > 0 ? "bấm để sửa" : undefined}>
          Các lần thi thử
        </SectionLabel>
        {mocks === undefined ? null : mocks.length === 0 ? (
          <EmptyState title="Chưa có lần thi thử nào" hint="Thi thử 0 (baseline): 3–4/10, ở nhà, bấm giờ chuẩn." />
        ) : (
          <ul className="divide-y divide-line/70 overflow-hidden rounded-2xl border border-line/70 bg-surface">
            {mocks.map((m) => (
              <li key={m.id}>
                <MockRow mock={m} onClick={() => openForm(m)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={toDelete !== null}
        title="Xoá lần thi thử này?"
        detail={
          toDelete && (
            <>
              <strong>
                {formatShortDate(toDelete.date)} · {MOCK_SOURCE_LABELS[toDelete.source]}
              </strong>
              <br />
              <MockScores mock={toDelete} />
            </>
          )
        }
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

/* ---------------------------------------------------------- Form */

/** Chuỗi trong ô nhập -> số, hoặc undefined nếu để trống. */
function parseOptional(text: string): number | undefined {
  return text.trim() === "" ? undefined : Number(text);
}

function MockTestForm({
  existing,
  onSaved,
  onCancel,
  onDelete,
}: {
  existing?: MockTest;
  onSaved: (m: MockTest) => void;
  onCancel?: () => void;
  onDelete?: () => void;
}) {
  const today = useToday();
  const [date, setDate] = useState(existing?.date ?? today);
  const [source, setSource] = useState<MockSource>(existing?.source ?? "home");
  const [listening, setListening] = useState(existing?.listeningRaw?.toString() ?? "");
  const [reading, setReading] = useState(existing?.readingRaw?.toString() ?? "");
  const [writing, setWriting] = useState<number | null>(existing?.writingBand ?? null);
  const [speaking, setSpeaking] = useState<number | null>(existing?.speakingBand ?? null);
  const [note, setNote] = useState(existing?.note ?? "");
  const submit = useSubmit();

  const value: MockTest = {
    id: existing?.id ?? "",
    date,
    source,
    listeningRaw: parseOptional(listening),
    readingRaw: parseOptional(reading),
    writingBand: writing ?? undefined,
    speakingBand: speaking ?? undefined,
    note: note.trim() === "" ? undefined : note.trim(),
  };
  const error = checkDate(date, "Ngày thi") ?? checkMockTest(value);
  const overall = error === null ? mockBands(value).overall : null;

  function handleSave() {
    if (error !== null) return;
    void submit.run(async () => {
      // Bỏ các trường trống cho dữ liệu gọn (IndexedDB giữ nguyên `undefined`).
      const row = Object.fromEntries(
        Object.entries({ ...value, id: existing?.id ?? newId() }).filter(([, v]) => v !== undefined)
      ) as MockTest;
      await db.mockTests.put(row);
      onSaved(row);
    });
  }

  return (
    <div>
      <div className="grid gap-x-3 @xs/content:grid-cols-2">
        <Field label="Ngày thi">
          <DateInput value={date} onChange={setDate} />
        </Field>
        <Field label="Nơi thi">
          <ChipGroup
            options={MOCK_SOURCES}
            value={source}
            onChange={setSource}
            format={(s) => MOCK_SOURCE_LABELS[s]}
          />
        </Field>
      </div>

      <div className="grid gap-x-3 @xs/content:grid-cols-2">
        <RawField skill="Listening" value={listening} onChange={setListening} />
        <RawField skill="Reading" value={reading} onChange={setReading} />
      </div>

      <BandField label="Writing" value={writing} onChange={setWriting} />
      <BandField label="Speaking" value={speaking} onChange={setSpeaking} />

      <div className="mb-4 flex items-baseline justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
        <span className="text-sm text-ink-2">Overall</span>
        {overall !== null ? (
          <span className="font-num text-2xl font-semibold text-ink">≈ {formatBand(overall)}</span>
        ) : (
          <span className="text-sm text-ink-3">cần đủ 4 kỹ năng</span>
        )}
      </div>

      <Field label="Ghi chú" hint="không bắt buộc">
        <TextInput value={note} onChange={setNote} placeholder="vd: thi thử 0, Cam 15 Test 1" />
      </Field>

      <div className="flex gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Huỷ
          </Button>
        )}
        <Button onClick={handleSave} disabled={error !== null || submit.busy} className="flex-1">
          {submit.busy ? "Đang lưu..." : existing ? "Cập nhật" : "Lưu kết quả"}
        </Button>
      </div>
      {/* Chưa nhập gì thì không cần báo đỏ — chỉ báo khi đã nhập mà sai. */}
      {error !== null && error !== "Nhập ít nhất một kỹ năng." && <FieldError message={error} />}
      <FieldError message={submit.error} />

      {onDelete && (
        <Button variant="danger" onClick={onDelete} className="mt-3 w-full text-sm">
          Xoá lần thi thử này
        </Button>
      )}
    </div>
  );
}

/** Ô điểm thô /40 kèm band ≈ tự quy đổi. */
function RawField({
  skill,
  value,
  onChange,
}: {
  skill: ScoredSkill;
  value: string;
  onChange: (v: string) => void;
}) {
  const raw = parseOptional(value);
  const band = raw === undefined ? null : rawToBand(skill, raw);
  return (
    <Field label={skill} hint="điểm thô /40">
      <div className="flex items-center gap-3">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={40}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${skill} điểm thô trên 40`}
          placeholder="—"
          className="tap-target w-20 rounded-xl border border-line bg-surface-2 px-3 text-center font-num text-lg font-semibold text-ink placeholder:text-ink-3 focus:border-accent focus:outline focus:outline-1 focus:outline-accent"
        />
        <span className="text-sm text-ink-2">
          {raw === undefined ? (
            "để trống nếu không thi"
          ) : band !== null ? (
            <>
              band <span className="font-num font-semibold text-ink">≈ {formatBand(band)}</span>
            </>
          ) : raw >= 0 && raw < 10 && Number.isInteger(raw) ? (
            "dưới 4.0 (ngoài bảng)"
          ) : (
            "0–40"
          )}
        </span>
      </div>
    </Field>
  );
}

function BandField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <Field label={label} hint="band">
      <ChipGroup
        scroll
        options={[NO_BAND, ...BAND_CHOICES.map(formatBand)]}
        value={value === null ? NO_BAND : formatBand(value)}
        onChange={(v) => onChange(v === NO_BAND ? null : Number(v))}
      />
    </Field>
  );
}

/* ---------------------------------------------------------- Lịch sử */

function MockRow({ mock, onClick }: { mock: MockTest; onClick: () => void }) {
  const b = mockBands(mock);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Sửa thi thử ngày ${formatShortDate(mock.date)}`}
      className="min-h-[52px] w-full px-4 py-3 text-left active:bg-surface-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="font-num text-sm text-ink-2">{formatShortDate(mock.date)}</span>
          <Tag tone="indigo">{MOCK_SOURCE_LABELS[mock.source]}</Tag>
        </span>
        <span className="text-sm text-ink-2">
          Overall{" "}
          <span className="font-num text-base font-semibold text-ink">
            {b.overall !== null ? `≈ ${formatBand(b.overall)}` : "—"}
          </span>
        </span>
      </div>
      <p className="mt-1.5 font-num text-xs text-ink-2">
        <MockScores mock={mock} />
      </p>
      {mock.note && <p className="mt-1 text-xs text-ink-3">{mock.note}</p>}
    </button>
  );
}

/** "L 21/40 (≈ 5.5) · R 30/40 (≈ 7.0) · W 6.0 · S 6.0" — dùng cả trong hộp xác nhận xoá. */
function MockScores({ mock }: { mock: MockTest }) {
  const b = mockBands(mock);
  const bits: string[] = [];
  if (mock.listeningRaw !== undefined)
    bits.push(`L ${mock.listeningRaw}/40${b.listening !== null ? ` (≈ ${formatBand(b.listening)})` : ""}`);
  if (mock.readingRaw !== undefined)
    bits.push(`R ${mock.readingRaw}/40${b.reading !== null ? ` (≈ ${formatBand(b.reading)})` : ""}`);
  if (b.writing !== null) bits.push(`W ${formatBand(b.writing)}`);
  if (b.speaking !== null) bits.push(`S ${formatBand(b.speaking)}`);
  return <>{bits.join(" · ")}</>;
}
