/**
 * Banner đầu màn Hôm nay (Đợt 2) — thay banner "Giai đoạn x/6" của lịch 12 tuần cũ.
 *
 *   - Đếm ngược tới kỳ thi thử kế tiếp (hoặc thi thật khi đã hết thi thử)
 *   - Tuần có thi môn: nhắc "tuần nhẹ nhịp: giữ sàn 30 phút Listening"
 *     (PRODUCT.md mục 5 và luật số 1 ở mục 6)
 *
 * Lịch sửa ở src/config/schedule.ts. Tính toán ở src/lib/plan.ts (có test).
 */
import { formatShortDate } from "../lib/dates";
import { lightWeekExam, nextTestMilestone } from "../lib/plan";

export default function PlanBanner({ date }: { date: string }) {
  const next = nextTestMilestone(date);
  const light = lightWeekExam(date);
  if (!next && !light) return null;

  return (
    <div className="mb-4 rounded-2xl border border-line/70 border-l-2 border-l-accent bg-surface px-4 py-2.5">
      {next && (
        <p className="text-sm text-ink">
          {next.ongoing ? (
            <>
              <span className="font-semibold">Hôm nay:</span> {next.milestone.label}
            </>
          ) : (
            <>
              <span className="font-medium">{next.milestone.label}</span>
              <span className="text-ink-2">
                {" "}
                · {formatShortDate(next.milestone.date).slice(0, 5)} · còn{" "}
              </span>
              <span className="font-num font-semibold">{next.daysLeft}</span>
              <span className="text-ink-2"> ngày</span>
            </>
          )}
        </p>
      )}
      {light && (
        <p className={`text-sm text-ink-2 ${next ? "mt-1 border-t border-line/70 pt-1.5" : ""}`}>
          <span className="font-medium text-ink">Tuần nhẹ nhịp</span> ({light.label}{" "}
          {formatShortDate(light.date).slice(0, 5)}): giữ sàn 30 phút Listening mỗi ngày.
        </p>
      )}
    </div>
  );
}
