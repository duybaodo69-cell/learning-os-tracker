/**
 * Tạo và xem kết quả thí nghiệm — nằm trong màn hình Cài đặt.
 *
 * Ý tưởng: thay vì đoán "để điện thoại phòng khác có giúp tập trung không",
 * bạn gắn nhãn A/B cho từng ngày rồi để số liệu trả lời.
 */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../db/db";
import type { Experiment, ExperimentTag, FocusBlock } from "../db/types";
import { formatMinutes, newId, todayISO } from "../lib/dates";
import { EXPERIMENT_MIN_DAYS, buildExperimentResult } from "../lib/metrics";
import type { ConditionResult } from "../lib/metrics";

import ConfirmDialog from "./ConfirmDialog";
import { Button, Card, EmptyState, Field, TextInput, Toggle } from "./ui";

export default function ExperimentsManager() {
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Experiment | null>(null);

  const experiments = useLiveQuery(() => db.experiments.toArray(), [], [] as Experiment[]);
  const tags = useLiveQuery(() => db.experimentTags.toArray(), [], [] as ExperimentTag[]);
  const blocks = useLiveQuery(() => db.focusBlocks.toArray(), [], [] as FocusBlock[]);

  async function handleDelete() {
    if (!toDelete) return;
    // Xoá cả nhãn đi kèm, nếu không sẽ còn lại nhãn mồ côi không thuộc về đâu.
    await db.transaction("rw", db.experiments, db.experimentTags, async () => {
      await db.experiments.delete(toDelete.id);
      await db.experimentTags.where("experimentId").equals(toDelete.id).delete();
    });
    setToDelete(null);
  }

  return (
    <Card className="mb-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
          Thí nghiệm
        </span>
        {!formOpen && (
          <Button variant="secondary" onClick={() => setFormOpen(true)} className="text-sm">
            + Tạo
          </Button>
        )}
      </div>

      {formOpen && <ExperimentForm onDone={() => setFormOpen(false)} />}

      {!formOpen && experiments.length === 0 && (
        <EmptyState
          title="Chưa có thí nghiệm nào"
          hint='vd: "Điện thoại phòng khác" so với "Trên bàn"'
        />
      )}

      <div className="space-y-3">
        {experiments.map((exp) => {
          const result = buildExperimentResult(tags, blocks, exp.id);
          return (
            <div key={exp.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-bold text-slate-900">{exp.name}</span>
                <button
                  type="button"
                  onClick={() => setToDelete(exp)}
                  className="tap-target shrink-0 px-2 text-sm font-semibold text-red-500"
                  aria-label="Xoá thí nghiệm"
                >
                  Xoá
                </button>
              </div>

              <div className="mt-2">
                <Toggle
                  label="Đang chạy"
                  description="Hiện chip gắn nhãn ở màn hình Hôm nay"
                  checked={exp.active}
                  onChange={(v) => db.experiments.update(exp.id, { active: v })}
                />
              </div>

              {/* Bảng so sánh hai nhánh */}
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400">
                    <th className="py-1 text-left font-semibold"> </th>
                    <th className="py-1 text-right font-semibold">{exp.labelA}</th>
                    <th className="py-1 text-right font-semibold">{exp.labelB}</th>
                  </tr>
                </thead>
                <tbody>
                  <Row label="Số ngày" a={String(result.a.days)} b={String(result.b.days)} />
                  <Row label="Tập trung TB" a={focusText(result.a)} b={focusText(result.b)} />
                  <Row
                    label="Phân tâm / block"
                    a={num(result.a.distractionsPerBlock)}
                    b={num(result.b.distractionsPerBlock)}
                  />
                  <Row
                    label="Deep work"
                    a={formatMinutes(result.a.deepWorkMinutes)}
                    b={formatMinutes(result.b.deepWorkMinutes)}
                  />
                </tbody>
              </table>

              {!result.enough && (
                <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-500">
                  Chưa đủ ngày — cần ít nhất {EXPERIMENT_MIN_DAYS} ngày mỗi nhánh (đang có{" "}
                  {result.a.days} và {result.b.days}). Chênh lệch bây giờ chủ yếu là ngẫu nhiên.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Xoá thí nghiệm này?"
        detail={
          toDelete && (
            <>
              <strong>{toDelete.name}</strong>
              <br />
              Xoá cả {tags.filter((t) => t.experimentId === toDelete.id).length} ngày đã gắn nhãn.
              <br />
              Check-in và focus block <strong>không bị ảnh hưởng</strong>.
            </>
          )
        }
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </Card>
  );
}

function focusText(c: ConditionResult): string {
  if (c.focusMean === null) return "—";
  return `${c.focusMean.toFixed(1)} (${c.focusMin}–${c.focusMax})`;
}

function num(v: number | null): string {
  return v === null ? "—" : v.toFixed(1);
}

function Row({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <tr className="border-t border-slate-100">
      <td className="py-1.5 text-slate-600">{label}</td>
      <td className="py-1.5 text-right font-semibold tabular-nums">{a}</td>
      <td className="py-1.5 text-right font-semibold tabular-nums">{b}</td>
    </tr>
  );
}

/* ==================== Form tạo thí nghiệm ==================== */

function ExperimentForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [labelA, setLabelA] = useState("");
  const [labelB, setLabelB] = useState("");

  const valid = name.trim() !== "" && labelA.trim() !== "" && labelB.trim() !== "";

  async function save() {
    if (!valid) return;
    await db.experiments.add({
      id: newId(),
      name: name.trim(),
      labelA: labelA.trim(),
      labelB: labelB.trim(),
      createdAt: todayISO(),
      active: true,
    });
    onDone();
  }

  return (
    <div className="mb-4 rounded-xl bg-slate-50 p-3">
      <Field label="Tên thí nghiệm">
        <TextInput value={name} onChange={setName} placeholder="vd: Vị trí điện thoại" />
      </Field>
      <Field label="Nhánh A">
        <TextInput value={labelA} onChange={setLabelA} placeholder="vd: Điện thoại phòng khác" />
      </Field>
      <Field label="Nhánh B">
        <TextInput value={labelB} onChange={setLabelB} placeholder="vd: Trên bàn" />
      </Field>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onDone} className="flex-1">
          Huỷ
        </Button>
        <Button onClick={save} disabled={!valid} className="flex-1">
          Tạo
        </Button>
      </div>
    </div>
  );
}
