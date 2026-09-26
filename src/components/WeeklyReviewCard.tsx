/**
 * Thẻ tổng kết tuần — chỉ hiện vào CHỦ NHẬT ở màn hình Hôm nay.
 *
 * Ba câu hỏi được điền sẵn số liệu của tuần, vì câu "dữ liệu cho thấy gì"
 * mà phải tự đi tra thì sẽ không ai trả lời.
 */
import { useState } from "react";

import type { WeeklyReview } from "../db/types";
import { formatMinutes } from "../lib/dates";
import type { MetricSet } from "../lib/metrics";

import { Button, Card, Field, TextArea } from "./ui";

export default function WeeklyReviewCard({
  weekStart,
  metrics,
  existing,
  onSave,
}: {
  weekStart: string;
  metrics: MetricSet;
  existing?: WeeklyReview;
  onSave: (r: WeeklyReview) => void;
}) {
  // Mặc định thu gọn: Chủ Nhật mở app để log như mọi ngày, không phải lúc nào
  // cũng sẵn sàng ngồi viết tổng kết.
  const [open, setOpen] = useState(false);
  const [learned, setLearned] = useState(existing?.learnedWithoutNotes ?? "");
  const [insight, setInsight] = useState(existing?.dataInsight ?? "");
  const [change, setChange] = useState(existing?.oneChange ?? "");

  const done = existing !== undefined;

  /** Các con số của tuần, để dán vào câu hỏi thứ hai. */
  const facts = [
    metrics.avgSleepHours !== null && `ngủ TB ${metrics.avgSleepHours.toFixed(1)}h`,
    metrics.wakeTimeSdMinutes !== null && `giờ dậy lệch ±${Math.round(metrics.wakeTimeSdMinutes)}p`,
    `deep work ${formatMinutes(metrics.deepWorkMinutes)}`,
    metrics.avgDistractionsPerBlock !== null &&
      `phân tâm ${metrics.avgDistractionsPerBlock.toFixed(1)}/block`,
    metrics.cardsReviewed > 0 && `${metrics.cardsReviewed} lượt ôn`,
    metrics.retentionRate !== null && `nhớ ${Math.round(metrics.retentionRate)}%`,
    metrics.brier30 !== null && `Brier ${metrics.brier30.toFixed(3)}`,
  ].filter(Boolean) as string[];

  if (!open) {
    return (
      <Card className={"mb-4 " + (done ? "" : "border-accent/40 bg-accent/10")}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-ink">
              {done ? "Đã tổng kết tuần này" : "Chủ Nhật — tổng kết tuần"}
            </div>
            <div className="mt-0.5 text-xs text-ink-2">
              {done ? "Bấm để xem lại hoặc sửa" : "3 câu hỏi, khoảng 5 phút"}
            </div>
          </div>
          <Button variant={done ? "secondary" : "primary"} onClick={() => setOpen(true)}>
            {done ? "Xem" : "Bắt đầu"}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <h2 className="mb-1 text-base font-bold text-ink">Tổng kết tuần</h2>
      <p className="mb-3 text-xs text-ink-3">Tuần bắt đầu {weekStart}</p>

      {/* Số liệu điền sẵn — bối cảnh cho câu hỏi thứ hai. */}
      <div className="mb-4 rounded-lg bg-surface-2 p-3">
        <div className="mb-1 text-xs font-semibold text-ink-2">Số liệu tuần này</div>
        <p className="text-sm leading-relaxed text-ink">
          {facts.length > 0 ? facts.join(" · ") : "Chưa có số liệu nào trong tuần."}
        </p>
      </div>

      <Field label="1. Tuần này học được gì mà làm lại được không cần tài liệu?">
        <TextArea value={learned} onChange={setLearned} rows={4} placeholder="Viết cụ thể, không viết chung chung." />
      </Field>

      <Field label="2. Dữ liệu cho thấy gì?">
        <TextArea value={insight} onChange={setInsight} rows={3} placeholder="Nhìn số liệu ở trên và ở tab Thống kê." />
      </Field>

      <Field label="3. Một điều chỉnh duy nhất cho tuần tới">
        <TextArea value={change} onChange={setChange} rows={2} placeholder="MỘT thôi. Nhiều thứ cùng lúc thì không biết cái nào có tác dụng." />
      </Field>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">
          Đóng
        </Button>
        <Button
          onClick={() => {
            onSave({
              weekStart,
              learnedWithoutNotes: learned.trim(),
              dataInsight: insight.trim(),
              oneChange: change.trim(),
            });
            setOpen(false);
          }}
          disabled={learned.trim() === "" && insight.trim() === "" && change.trim() === ""}
          className="flex-1"
        >
          Lưu
        </Button>
      </div>
    </Card>
  );
}
