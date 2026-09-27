/**
 * Tổng kết tuần.
 *
 *   - WeeklyReviewCard  : thẻ thu gọn, chỉ hiện CHỦ NHẬT ở màn hình Hôm nay
 *   - WeeklyReviewForm  : form 3 câu hỏi (+ câu hỏi follow up tuần trước),
 *                         dùng chung cho Chủ Nhật và cho "viết bù" ở Thống kê
 *   - ThisWeekChange    : nhắc "điều chỉnh tuần này" đã chọn ở tuần trước
 *
 * Ba câu hỏi được điền sẵn số liệu của tuần, vì câu "dữ liệu cho thấy gì"
 * mà phải tự đi tra thì sẽ không ai trả lời.
 */
import { useState } from "react";

import type { WeeklyReview } from "../db/types";
import { weekReviewId } from "../db/keys";
import { formatMinutes, formatShortDate } from "../lib/dates";
import type { MetricSet } from "../lib/metrics";
import { useSubmit } from "../lib/useSubmit";
import { CHANGE_RESULTS, changeResultLabel, type ChangeResult } from "../lib/weeklyReview";

import { Button, Card, ChipGroup, Field, FieldError, TextArea } from "./ui";

/* ==================== Thẻ Chủ Nhật ==================== */

export default function WeeklyReviewCard({
  weekStart,
  metrics,
  existing,
  previousChange,
  onSave,
}: {
  weekStart: string;
  metrics: MetricSet;
  existing?: WeeklyReview;
  /** "Một điều chỉnh" đã chọn ở tổng kết tuần trước (nếu có). */
  previousChange?: string;
  onSave: (r: WeeklyReview) => void | Promise<void>;
}) {
  // Mặc định thu gọn: Chủ Nhật mở app để log như mọi ngày, không phải lúc nào
  // cũng sẵn sàng ngồi viết tổng kết.
  const [open, setOpen] = useState(false);
  const done = existing !== undefined;

  if (open) {
    return (
      <Card className="mb-4">
        <WeeklyReviewForm
          weekStart={weekStart}
          metrics={metrics}
          existing={existing}
          previousChange={previousChange}
          onSave={onSave}
          onClose={() => setOpen(false)}
        />
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-ink">
            {done ? "Đã tổng kết tuần này" : "Chủ Nhật — tổng kết tuần"}
          </div>
          <div className="mt-0.5 text-xs text-ink-2">
            {done ? "Bấm để xem lại hoặc sửa" : "3 câu hỏi, khoảng 5 phút"}
          </div>
        </div>
        {/* Nút phụ (không tô cyan đặc): "Bắt đầu đếm" mới là hành động chính của màn hình. */}
        <Button variant="secondary" onClick={() => setOpen(true)} className={done ? "" : "text-accent"}>
          {done ? "Xem" : "Bắt đầu"}
        </Button>
      </div>
    </Card>
  );
}

/* ==================== Form ==================== */

export function WeeklyReviewForm({
  weekStart,
  metrics,
  existing,
  previousChange,
  onSave,
  onClose,
}: {
  weekStart: string;
  metrics: MetricSet;
  existing?: WeeklyReview;
  previousChange?: string;
  onSave: (r: WeeklyReview) => void | Promise<void>;
  onClose: () => void;
}) {
  const [learned, setLearned] = useState(existing?.learnedWithoutNotes ?? "");
  const [insight, setInsight] = useState(existing?.dataInsight ?? "");
  const [change, setChange] = useState(existing?.oneChange ?? "");
  const [result, setResult] = useState<ChangeResult | null>(existing?.lastChangeResult ?? null);
  const submit = useSubmit();

  const empty = learned.trim() === "" && insight.trim() === "" && change.trim() === "";

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

  function handleSave() {
    if (empty) return;
    // Chỉ đóng form khi đã lưu THÀNH CÔNG; lỗi thì giữ nguyên chữ đã viết.
    void submit.run(async () => {
      await onSave({
        id: weekReviewId(weekStart),
        weekStart,
        learnedWithoutNotes: learned.trim(),
        dataInsight: insight.trim(),
        oneChange: change.trim(),
        lastChangeResult: previousChange && result ? result : undefined,
      });
      onClose();
    });
  }

  return (
    <div>
      <h2 className="mb-1 text-base font-bold text-ink">Tổng kết tuần</h2>
      <p className="mb-3 text-xs text-ink-3">Tuần bắt đầu {formatShortDate(weekStart)}</p>

      {/* Số liệu điền sẵn — bối cảnh cho câu hỏi thứ hai. */}
      <div className="mb-4 rounded-xl bg-surface-2 p-3">
        <div className="mb-1 text-xs font-semibold text-ink-2">Số liệu tuần này</div>
        <p className="text-sm leading-relaxed text-ink">
          {facts.length > 0 ? facts.join(" · ") : "Chưa có số liệu nào trong tuần."}
        </p>
      </div>

      {/* Follow up: vòng lặp chỉ khép lại khi nhìn lại điều đã hứa tuần trước. */}
      {previousChange && (
        <Field label="Tuần trước bạn định thử">
          <p className="mb-2 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink">{previousChange}</p>
          <ChipGroup
            options={CHANGE_RESULTS.map((r) => r.id)}
            value={result}
            onChange={setResult}
            format={(id) => changeResultLabel(id) ?? id}
          />
        </Field>
      )}

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
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Đóng
        </Button>
        <Button onClick={handleSave} disabled={empty || submit.busy} className="flex-1">
          {submit.busy ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
      <FieldError message={submit.error} />
    </div>
  );
}

/* ==================== Nhắc điều chỉnh tuần này ==================== */

/** Một dòng gọn ở Hôm nay: điều chỉnh đã chọn trong tổng kết tuần trước. */
export function ThisWeekChange({ change }: { change: string }) {
  return (
    <div className="mb-4 rounded-2xl border border-line/70 bg-surface px-4 py-3">
      <p className="text-xs font-medium text-ink-3">Điều chỉnh tuần này</p>
      <p className="mt-0.5 text-sm text-ink">{change}</p>
    </div>
  );
}
