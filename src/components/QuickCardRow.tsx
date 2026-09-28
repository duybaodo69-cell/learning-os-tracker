/**
 * Tạo nhanh thẻ ôn ngay trong màn kết thúc buổi IELTS (Đợt 3).
 *
 * Mặc định gập: một dòng "+ Thẻ ôn từ buổi này". Mở ra: chọn nguồn (theo kỹ
 * năng), gõ mặt trước, mặt sau tuỳ chọn, bấm "Tạo thẻ". Thẻ được lưu NGAY
 * (không đợi lưu phiên) để huỷ phiên cũng không mất thẻ đã viết. Mặt sau
 * trống = thẻ nháp, điền sau ở Ôn tập → Thẻ (giống thẻ từ brain dump).
 */
import { useState } from "react";
import { db } from "../db/db";
import type { CardSource, IeltsSkill } from "../db/types";
import { newId, todayISO } from "../lib/dates";
import { CARD_SOURCE_LABELS, buildSourcedCard, sourcesForSkill } from "../lib/cardSources";
import { useSubmit } from "../lib/useSubmit";
import { Button, ChipGroup, Field, FieldError, TextInput } from "./ui";

export default function QuickCardRow({ skill }: { skill: IeltsSkill }) {
  const sources = sourcesForSkill(skill);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<CardSource>(sources[0]);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [made, setMade] = useState(0);
  const submit = useSubmit();

  // Đổi kỹ năng mà nguồn đang chọn không còn hợp: về nguồn đầu tiên.
  const current = sources.includes(source) ? source : sources[0];

  function handleCreate() {
    if (front.trim() === "") return;
    void submit.run(async () => {
      await db.cards.add(buildSourcedCard({ id: newId(), front, back, source: current, today: todayISO() }));
      setFront("");
      setBack("");
      setMade((n) => n + 1);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-target mt-1 flex w-full items-center justify-between rounded-lg text-sm font-semibold text-accent active:bg-surface-2"
      >
        <span>+ Thẻ ôn từ buổi này</span>
        {made > 0 && <span className="text-xs font-normal text-ink-2">đã tạo {made} thẻ</span>}
      </button>
    );
  }

  // Viền, không tô surface-2: chip và nút bên trong đã là surface-2 (quy tắc Calm).
  return (
    <div className="mt-2 rounded-xl border border-line p-3" aria-label="Thẻ ôn từ buổi này" role="group">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Thẻ ôn từ buổi này</p>
        {made > 0 && <p className="text-xs text-good">✓ đã tạo {made} thẻ</p>}
      </div>
      {sources.length > 1 && (
        <div className="mb-3">
          <ChipGroup options={sources} value={current} onChange={setSource} format={(s) => CARD_SOURCE_LABELS[s]} />
        </div>
      )}
      <Field label="Mặt trước">
        <TextInput
          value={front}
          onChange={setFront}
          placeholder={current === "ielts-listening" ? "vd: nghe nhầm 'fifteen' / 'fifty'" : "vd: 'mitigate' nghĩa là?"}
        />
      </Field>
      <Field label="Mặt sau" hint="để trống = điền sau">
        <TextInput value={back} onChange={setBack} placeholder="Đáp án bằng lời của bạn" />
      </Field>
      <FieldError message={submit.error} />
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">
          Xong
        </Button>
        <Button
          variant="secondary"
          onClick={handleCreate}
          disabled={front.trim() === "" || submit.busy}
          className="flex-1 text-accent"
        >
          Tạo thẻ
        </Button>
      </div>
    </div>
  );
}
