/**
 * Form tạo / sửa một dự đoán.
 *
 * Điểm quan trọng: bạn phải nói ra một CON SỐ trước khi biết kết quả.
 * Có con số thì sau này mới chấm được mình tự tin đúng mức hay quá đà.
 */
import { useState } from "react";

import type { Prediction, PredictionCategory } from "../db/types";
import { PREDICTION_CATEGORIES } from "../db/types";
import { newId, todayISO } from "../lib/dates";
import { addDays } from "../lib/scheduling";

import { Button, ChipGroup, DateInput, Field, Slider, TextArea, TextInput } from "./ui";

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
  onSave: (p: Prediction) => void;
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

  function handleSave() {
    if (statement.trim() === "") return;

    onSave({
      id: existing?.id ?? newId(),
      statement: statement.trim(),
      probability,
      category,
      createdAt: existing?.createdAt ?? today,
      resolveBy,
      outcome: existing?.outcome ?? null,
      resolvedAt: existing?.resolvedAt,
      note: note.trim() === "" ? undefined : note.trim(),
      // Đổi sang category khác thì bỏ pre-mortem đi, tránh dữ liệu mồ côi.
      preMortem: showPreMortem && preMortem.trim() !== "" ? preMortem.trim() : undefined,
    });
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
        <Button onClick={handleSave} disabled={statement.trim() === ""} className="flex-1">
          {existing ? "Cập nhật" : "Lưu dự đoán"}
        </Button>
      </div>
    </div>
  );
}
