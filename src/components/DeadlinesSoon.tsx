/**
 * Hạn chót trong 72 giờ tới — một khối gọn trên Hôm nay (Đợt 3).
 *
 * PRODUCT.md mục 6, ưu tiên số 2: "việc có hạn chót bên ngoài trong 72 giờ".
 * Gồm mốc cố định (thi môn, AFEP — src/config/schedule.ts) và deadline tự thêm
 * lúc chốt kế hoạch Chủ nhật. Thi thử / thi thật không lặp lại ở đây vì thẻ
 * đếm ngược đã nói. Không có gì thì không vẽ gì.
 */
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import type { Deadline } from "../db/types";
import { formatShortDate } from "../lib/dates";
import { deadlinesSoon } from "../lib/weekPlan";

function whenText(daysLeft: number): string {
  if (daysLeft === 0) return "Hôm nay";
  if (daysLeft === 1) return "Mai";
  return `Còn ${daysLeft} ngày`;
}

export default function DeadlinesSoon({ today }: { today: string }) {
  const deadlines = useLiveQuery(() => db.deadlines.toArray(), [], [] as Deadline[]);
  const list = deadlinesSoon(deadlines, today);
  if (list.length === 0) return null;

  return (
    <section aria-label="Hạn chót 72 giờ tới" className="mb-3 rounded-2xl border border-line/70 bg-surface px-4 py-3">
      <p className="text-xs font-medium text-ink-3">Hạn chót 72 giờ tới</p>
      <ul className="mt-1">
        {list.map((d) => (
          <li key={`${d.from}-${d.id ?? d.label}`} className="flex items-baseline justify-between gap-3 py-0.5">
            <span className="min-w-0 text-sm text-ink">{d.label}</span>
            <span className="shrink-0 text-sm text-ink-2">
              {whenText(d.daysLeft)} · <span className="font-num">{formatShortDate(d.date).slice(0, 5)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
