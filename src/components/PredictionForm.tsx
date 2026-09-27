/**
 * Form tạo / sửa một dự đoán.
 *
 * Điểm quan trọng: bạn phải nói ra một CON SỐ trước khi biết kết quả.
 * Có con số thì sau này mới chấm được mình tự tin đúng mức hay quá đà.
 *
 * Dự đoán ĐÃ CHẤM thì bị khoá (audit F06): đổi 10% thành 90% sau khi biết
 * kết quả sẽ biến Brier 0.81 thành 0.01 — điểm số hết trung thực. Lúc đó
 * form chỉ cho sửa ghi chú, và sửa kết quả khi bấm nhầm Đúng/Sai.
 */
import { useState } from "react";

import type { Prediction, PredictionCategory } from "../db/types";
import { PREDICTION_CATEGORIES } from "../db/types";
import { formatShortDate, newId, todayISO } from "../lib/dates";
import { brierScore } from "../lib/calibration";
import { addDays } from "../lib/scheduling";
import { useSubmit } from "../lib/useSubmit";
import { isValidDate } from "../lib/validation";

import ConfirmDialog from "./ConfirmDialog";
import { Button, ChipGroup, DateInput, Field, FieldError, Slider, Tag, TextArea, TextInput } from "./ui";

/** Vài mốc xác suất hay dùng, bấm một phát thay vì kéo thanh trượt. */
const QUICK_PROBABILITIES = [10, 30, 50, 70, 90] as const;

/** Vài mốc hạn chấm, tính từ hôm nay. */
const QUICK_HORIZONS = [
  { label: "1 tuần", days: 7 },
  { label: "1 tháng", days: 30 },
  { label: "3 tháng", days: 90 },
  { label: "6 tháng", days: 180 },
] as const;

export default function PredictionForm({
  existing,
  onSave,
  onCancel,
}: {
  existing?: Prediction;
  /** Có thể trả Promise: form chờ lưu xong, lỗi thì giữ form và báo. */
  onSave: (p: Prediction) => void | Promise<void>;
  onCancel: () => void;
}) {
  if (existing && existing.outcome !== null) {
    return <ResolvedForm existing={existing} onSave={onSave} onCancel={onCancel} />;
  }
  return <OpenForm existing={existing} onSave={onSave} onCancel={onCancel} />;
}

/* ==================== Dự đoán chưa chấm: sửa được hết ==================== */

function OpenForm({
  existing,
  onSave,
  onCancel,
}: {
  existing?: Prediction;
  onSave: (p: Prediction) => void | Promise<void>;
  onCancel: () => void;
}) {
  const today = todayISO();

  const [statement, setStatement] = useState(existing?.statement ?? "");
  const [probability, setProbability] = useState(existing?.probability ?? 50);
  const [category, setCategory] = useState<PredictionCategory>(existing?.category ?? "Deal/VC");
  const [resolveBy, setResolveBy] = useState(existing?.resolveBy ?? addDays(today, 30));
  const [note, setNote] = useState(existing?.note ?? "");
  const [preMortem, setPreMortem] = useState(existing?.preMortem ?? "");

  // Pre-mortem chỉ có ý nghĩa với thương vụ, nên chỉ hiện ở category đó.
  const showPreMortem = category === "Deal/VC";

  // Hạn chấm bị xoá trắng từng vẫn lưu được (audit F05). Hạn cũng không
  // được trước ngày tạo, nếu không dự đoán "cần chấm" ngay khi vừa viết.
  const createdAt = existing?.createdAt ?? today;
  const dateError = !isValidDate(resolveBy)
    ? "Chọn hạn chấm hợp lệ."
    : resolveBy < createdAt
      ? "Hạn chấm không được trước ngày tạo dự đoán."
      : null;
  const canSave = statement.trim() !== "" && dateError === null;
  const submit = useSubmit();

  function handleSave() {
    if (!canSave) return;

    void submit.run(() => onSave({
      id: existing?.id ?? newId(),
      statement: statement.trim(),
      probability,
      category,
      createdAt,
      resolveBy,
      outcome: null,
      note: note.trim() === "" ? undefined : note.trim(),
      // Đổi sang category khác thì bỏ pre-mortem đi, tránh dữ liệu mồ côi.
      preMortem: showPreMortem && preMortem.trim() !== "" ? preMortem.trim() : undefined,
    }));
  }

  return (
    <div>
      <Field label="Dự đoán" hint="viết sao cho sau này chấm đúng/sai được">
        <TextArea
          value={statement}
          onChange={setStatement}
          rows={3}
          placeholder="vd: Startup X gọi được vòng Series A trước 31/12"
        />
      </Field>

      <Field label="Xác suất xảy ra">
        <Slider value={probability} onChange={setProbability} min={1} max={99} suffix="%" />
        <div className="mt-2">
          <ChipGroup
            options={QUICK_PROBABILITIES}
            value={(QUICK_PROBABILITIES as readonly number[]).includes(probability) ? probability : null}
            onChange={setProbability}
            format={(v) => `${v}%`}
          />
        </div>
      </Field>

      <Field label="Nhóm">
        <ChipGroup options={PREDICTION_CATEGORIES} value={category} onChange={setCategory} />
      </Field>

      <Field label="Hạn chấm">
        <DateInput value={resolveBy} onChange={setResolveBy} />
        <FieldError message={dateError} />
        <div className="mt-2">
          <ChipGroup
            options={QUICK_HORIZONS.map((h) => h.label)}
            value={null}
            onChange={(label) => {
              const h = QUICK_HORIZONS.find((x) => x.label === label);
              if (h) setResolveBy(addDays(today, h.days));
            }}
          />
        </div>
      </Field>

      {/* Pre-mortem — chỉ cho Deal/VC */}
      {showPreMortem && (
        <Field label="Pre-mortem" hint="không bắt buộc">
          <p className="mb-1.5 text-sm text-ink-2">
            Giả sử 3 năm sau khoản này thất bại — vì sao?
          </p>
          <TextArea
            value={preMortem}
            onChange={setPreMortem}
            rows={4}
            placeholder="Viết TRƯỚC khi biết kết quả. Ép mình nghĩ mặt trái."
          />
        </Field>
      )}

      <Field label="Ghi chú" hint="không bắt buộc">
        <TextInput
          value={note}
          onChange={setNote}
          placeholder="vd: base rate Series A ~15%, nhưng team này đã có traction"
        />
      </Field>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          Huỷ
        </Button>
        <Button onClick={handleSave} disabled={!canSave || submit.busy} className="flex-1">
          {submit.busy ? "Đang lưu..." : existing ? "Cập nhật" : "Lưu dự đoán"}
        </Button>
      </div>
      <FieldError message={submit.error} />
    </div>
  );
}

/* ==================== Dự đoán đã chấm: khoá, chỉ sửa ghi chú ==================== */

function ResolvedForm({
  existing,
  onSave,
  onCancel,
}: {
  existing: Prediction;
  onSave: (p: Prediction) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [note, setNote] = useState(existing.note ?? "");
  const [confirmFlip, setConfirmFlip] = useState(false);
  const submit = useSubmit();
  const outcome = existing.outcome as boolean;
  const flipped = !outcome;

  /** Mọi thứ giữ nguyên, trừ những trường được phép đổi. */
  function saveWith(changes: Partial<Pick<Prediction, "note" | "outcome">>) {
    void submit.run(() =>
      onSave({ ...existing, note: note.trim() === "" ? undefined : note.trim(), ...changes })
    );
  }

  return (
    <div>
      <div className="mb-4 rounded-xl bg-surface-2 p-3">
        <p className="text-sm leading-relaxed text-ink">{existing.statement}</p>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-2">
          <span className="font-num text-base font-semibold text-accent">{existing.probability}%</span>
          <span>· {existing.category} · hạn {formatShortDate(existing.resolveBy)}</span>
          <Tag tone={outcome ? "good" : "bad"}>{outcome ? "Đúng" : "Sai"}</Tag>
          <span className="font-num">Brier {brierScore(existing.probability, outcome).toFixed(3)}</span>
        </p>
        <p className="mt-2 text-xs text-ink-3">
          Đã chấm nên nội dung và xác suất được khoá, để điểm Brier luôn trung thực.
        </p>
      </div>

      <Field label="Ghi chú" hint="vd: bài học rút ra">
        <TextInput value={note} onChange={setNote} placeholder="Vì sao đúng / sai?" />
      </Field>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          Huỷ
        </Button>
        <Button onClick={() => saveWith({})} disabled={submit.busy} className="flex-1">
          {submit.busy ? "Đang lưu..." : "Lưu ghi chú"}
        </Button>
      </div>
      <FieldError message={submit.error} />

      <Button variant="ghost" onClick={() => setConfirmFlip(true)} className="mt-2 w-full text-sm">
        Chấm nhầm? Đổi thành {flipped ? "Đúng" : "Sai"}
      </Button>

      <ConfirmDialog
        open={confirmFlip}
        title="Đổi kết quả đã chấm?"
        destructive={false}
        confirmLabel={`Đổi thành ${flipped ? "Đúng" : "Sai"}`}
        detail={
          <>
            <p>{existing.statement}</p>
            <p className="mt-1 text-ink-2">
              {outcome ? "Đúng" : "Sai"} → {flipped ? "Đúng" : "Sai"} · Brier{" "}
              <span className="font-num">{brierScore(existing.probability, outcome).toFixed(3)}</span> →{" "}
              <span className="font-num">{brierScore(existing.probability, flipped).toFixed(3)}</span>
            </p>
            <p className="mt-1 text-ink-2">Chỉ dùng khi bấm nhầm nút. Xác suất {existing.probability}% giữ nguyên.</p>
          </>
        }
        onConfirm={() => {
          setConfirmFlip(false);
          saveWith({ outcome: flipped });
        }}
        onCancel={() => setConfirmFlip(false)}
      />
    </div>
  );
}
