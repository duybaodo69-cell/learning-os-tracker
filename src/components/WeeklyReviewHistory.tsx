/**
 * Lịch sử tổng kết tuần (ở tab Thống kê) — audit F08.
 *
 * Trước đây chỉ viết được tổng kết vào đúng Chủ Nhật, và sang tuần sau thì
 * không còn chỗ nào đọc lại "một điều chỉnh" đã chọn. Ở đây:
 *   - 8 tuần gần nhất, tuần nào đã viết / chưa viết
 *   - bấm một tuần để xem, sửa, hoặc VIẾT BÙ nếu lỡ Chủ Nhật
 *   - thấy điều chỉnh tuần trước có làm được không
 */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../db/db";
import type { WeeklyReview } from "../db/types";
import { recentWeekStarts } from "../lib/metrics";
import { addDays } from "../lib/scheduling";
import { formatShortDate } from "../lib/dates";
import { Card, ListGroup, ListRow } from "./ui";
import { changeResultLabel } from "../lib/weeklyReview";
import { WeeklyReviewForm } from "./WeeklyReviewCard";

/** Số tuần hiện trong lịch sử. */
export const HISTORY_WEEKS = 8;

/** "21/09 – 27/09" */
function weekLabel(monday: string): string {
  return `${formatShortDate(monday).slice(0, 5)} – ${formatShortDate(addDays(monday, 6)).slice(0, 5)}`;
}

export default function WeeklyReviewHistory({ today }: { today: string }) {
  const reviews = useLiveQuery(() => db.weekReviews.toArray(), [], [] as WeeklyReview[]);
  const [openWeek, setOpenWeek] = useState<string | null>(null);

  const byWeek = new Map(reviews.map((r) => [r.weekStart, r]));
  const weeks = recentWeekStarts(today, HISTORY_WEEKS);

  if (openWeek) {
    return (
      <Card className="mb-5">
      <WeeklyReviewForm
        key={openWeek}
        weekStart={openWeek}
        existing={byWeek.get(openWeek)}
        previousChange={byWeek.get(addDays(openWeek, -7))?.oneChange.trim() || undefined}
        onSave={async (r) => {
          await db.weekReviews.put(r);
        }}
        onClose={() => setOpenWeek(null)}
      />
      </Card>
    );
  }

  return (
    <ListGroup label="Kế hoạch tuần">
      {weeks.map((monday, i) => {
        const r = byWeek.get(monday);
        const result = changeResultLabel(r?.lastChangeResult);
        return (
          <ListRow
            key={monday}
            label={i === 0 ? `Tuần này · ${weekLabel(monday)}` : weekLabel(monday)}
            description={
              r
                ? [
                    r.plan && `Tuần sau: L ${r.plan.listening} · R ${r.plan.reading}${r.plan.light ? " · nhẹ" : ""}`,
                    r.oneChange && `Điều chỉnh: ${r.oneChange}`,
                    result && `Tuần trước: ${result}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Đã viết"
                : "Chưa chốt"
            }
            value={r ? "Xem" : i === 0 ? "Chốt" : "Chốt bù"}
            valueTone={r ? "muted" : "accent"}
            onClick={() => setOpenWeek(monday)}
          />
        );
      })}
    </ListGroup>
  );
}
