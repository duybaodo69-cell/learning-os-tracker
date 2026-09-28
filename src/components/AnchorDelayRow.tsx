/**
 * Dòng "dời khung 9:30" trên màn Hôm nay (Đợt 2, PRODUCT.md mục 6).
 *
 * Luật: task gấp (người khác đặt hạn, trong 48 giờ) được DỜI khung IELTS,
 * không xoá. App hỏi "dời sang lúc nào?" và đếm số lần dời mỗi tuần.
 *
 *   - Chỉ hỏi SAU 10:30, khi hôm nay chưa có phiên IELTS nào (src/lib/plan.ts)
 *   - Hai chạm: chọn lúc dời -> chọn lý do (chạm lý do là lưu luôn)
 *   - Đã dời: một dòng trung tính + "Sửa". Không có nút xoá, không lời trách.
 *   - App không có máy chủ nên KHÔNG tự nhắc lại lúc đã dời — chỉ ghi và đếm.
 */
import { useState } from "react";

import { db } from "../db/db";
import { anchorDelayId } from "../db/keys";
import type { AnchorDelay, DelayTarget } from "../db/types";
import { DELAY_REASONS, DELAY_TARGETS } from "../db/types";
import { nowHHmm, todayISO } from "../lib/dates";
import { DELAY_REASON_LABELS, DELAY_TARGET_LABELS } from "../lib/plan";
import { useSubmit } from "../lib/useSubmit";
import { ChipGroup, FieldError } from "./ui";

export default function AnchorDelayRow({
  ask,
  delayToday,
  weekCount,
}: {
  /** true = hiện câu hỏi (đã qua 10:30, chưa có phiên IELTS, chưa dời). */
  ask: boolean;
  /** Lần dời hôm nay, nếu đã dời. */
  delayToday: AnchorDelay | null;
  /** Số lần dời tuần này (tính cả hôm nay). */
  weekCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState<DelayTarget | null>(delayToday?.target ?? null);
  const submit = useSubmit();

  const open = ask || editing;

  if (!open && !delayToday) return null;

  // ----- Đã dời: một dòng -----
  if (!open && delayToday) {
    return (
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/70 pt-3">
        <p className="min-w-0 text-sm text-ink-2">
          Đã dời sang <span className="font-medium text-ink">{DELAY_TARGET_LABELS[delayToday.target]}</span> ·{" "}
          {DELAY_REASON_LABELS[delayToday.reason].toLowerCase()}
          <span className="block text-xs text-ink-3">
            Dời <span className="font-num">{weekCount}</span> lần tuần này
          </span>
        </p>
        <button
          type="button"
          onClick={() => {
            setTarget(delayToday.target);
            setEditing(true);
          }}
          className="tap-target shrink-0 rounded-xl px-3 text-sm font-semibold text-accent active:bg-surface-2"
        >
          Sửa
        </button>
      </div>
    );
  }

  // ----- Đang hỏi / đang sửa -----
  function save(reason: AnchorDelay["reason"]) {
    if (!target) return;
    void submit.run(async () => {
      // Ngày và giờ lấy NGAY LÚC BẤM (useToday / useNowHHmm chỉ để hiển thị).
      // Đang sửa thì giữ ngày của lần dời cũ.
      const date = delayToday?.date ?? todayISO();
      await db.anchorDelays.put({ id: anchorDelayId(date), date, target, reason, at: delayToday?.at ?? nowHHmm() });
      setEditing(false);
    });
  }

  return (
    <div className="mt-3 border-t border-line/70 pt-3" aria-live="polite">
      <p className="mb-2 text-sm font-medium text-ink">
        {editing ? "Sửa lần dời hôm nay" : "Khung 9:30 chưa bắt đầu — dời sang lúc nào?"}
      </p>
      <ChipGroup
        options={DELAY_TARGETS}
        value={target}
        onChange={setTarget}
        format={(t) => DELAY_TARGET_LABELS[t]}
      />
      {target && (
        <>
          <p className="mt-3 mb-2 text-sm text-ink-2">Lý do (chạm là lưu)</p>
          <ChipGroup
            options={DELAY_REASONS}
            value={editing ? (delayToday?.reason ?? null) : null}
            onChange={save}
            format={(r) => DELAY_REASON_LABELS[r]}
          />
        </>
      )}
      {editing && (
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="tap-target mt-2 rounded-xl px-3 text-sm text-ink-2 active:bg-surface-2"
        >
          Giữ như cũ
        </button>
      )}
      <FieldError message={submit.error} />
    </div>
  );
}
