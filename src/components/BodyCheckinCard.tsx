/**
 * Check-in Glow-up Chủ nhật (PRODUCT.md mục 10, G3).
 *
 * Hiện trên Hôm nay vào Chủ nhật (và Thứ Hai nếu tuần trước còn thiếu —
 * `checkinWeekToAsk`). Mặc định thu gọn như thẻ chốt kế hoạch tuần; nút mở là
 * nút phụ, vì nút chính của Hôm nay vẫn là "Bắt đầu IELTS".
 *
 * Trong form:
 *   - số buổi gym / chạy của tuần: tự đếm, không hỏi
 *   - cân trung bình: điền sẵn từ các lần "Cân sáng" trong tuần, sửa được
 *   - vòng bụng (ngang rốn), "đã chụp ảnh" (chỉ tuần 1 · 4 · 8 · 12), ghi chú
 *   - so với tuần 1 + mốc của tuần (nếu có) + gợi ý điều chỉnh, tính ngay khi gõ
 */
import { useState } from "react";
import { WAIST_RANGE_CM, WEIGHT_RANGE_KG } from "../config/glowUp";
import { bodyCheckinId } from "../db/keys";
import type { BodyCheckin, GlowDay, Workout } from "../db/types";
import { formatShortDate } from "../lib/dates";
import {
  adjustHints,
  averageWeight,
  formatKg,
  isPhotoWeek,
  parseDecimal,
  programWeek,
  startComparison,
  weekSessionCounts,
  weekWeighIns,
} from "../lib/glowUp";
import { addDays } from "../lib/scheduling";
import { useSubmit } from "../lib/useSubmit";
import { Button, Card, Field, FieldError, TextInput, Toggle } from "./ui";

const ddmm = (iso: string) => formatShortDate(iso).slice(0, 5);

/** -1.8 -> "−1,8" · 0.4 -> "+0,4" (dấu trừ thật, dễ đọc hơn gạch nối). */
function signed(n: number): string {
  return `${n > 0 ? "+" : n < 0 ? "−" : "±"}${formatKg(Math.abs(n))}`;
}

/** Ô nhập số trong form: trống = null, sai hoặc ngoài khoảng = lỗi. */
function readMeasure(text: string, range: { min: number; max: number }, example: string) {
  const n = parseDecimal(text);
  if (n === null) return { value: null, error: null };
  if (Number.isNaN(n) || n < range.min || n > range.max) return { value: null, error: `Nhập số, ví dụ ${example}.` };
  return { value: n, error: null };
}

export default function BodyCheckinCard({
  weekStart,
  existing,
  checkins,
  days,
  workouts,
  onSave,
}: {
  /** Thứ Hai của tuần cần check-in. */
  weekStart: string;
  existing?: BodyCheckin;
  /** Mọi check-in đã lưu (so với tuần 1, luật điều chỉnh). */
  checkins: BodyCheckin[];
  /** Mọi ngày checklist (các lần cân sáng). */
  days: GlowDay[];
  workouts: Workout[];
  onSave: (c: BodyCheckin) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const week = programWeek(weekStart);

  if (!open) {
    return (
      <Card className="mb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-bold text-ink">
              {existing ? "Đã check-in Glow-up" : `Check-in Glow-up · tuần ${week?.week ?? ""}`}
            </div>
            <div className="mt-0.5 text-xs text-ink-2">
              {existing ? (
                <>
                  {existing.avgWeightKg !== undefined && <span className="font-num">{formatKg(existing.avgWeightKg)} kg</span>}
                  {existing.avgWeightKg !== undefined && existing.waistCm !== undefined && " · "}
                  {existing.waistCm !== undefined && <span className="font-num">{formatKg(existing.waistCm)} cm</span>}
                  {" · bấm để sửa"}
                </>
              ) : (
                `${ddmm(weekStart)} – ${ddmm(addDays(weekStart, 6))} · cân, vòng bụng, khoảng 1 phút`
              )}
            </div>
          </div>
          {/* Nút phụ: "Bắt đầu IELTS" mới là hành động chính của Hôm nay. */}
          <Button variant="secondary" onClick={() => setOpen(true)} className={existing ? "" : "text-accent"}>
            {existing ? "Sửa" : "Bắt đầu"}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <BodyCheckinForm
        weekStart={weekStart}
        existing={existing}
        checkins={checkins}
        days={days}
        workouts={workouts}
        onSave={async (c) => {
          await onSave(c);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </Card>
  );
}

function BodyCheckinForm({
  weekStart,
  existing,
  checkins,
  days,
  workouts,
  onSave,
  onClose,
}: {
  weekStart: string;
  existing?: BodyCheckin;
  checkins: BodyCheckin[];
  days: GlowDay[];
  workouts: Workout[];
  onSave: (c: BodyCheckin) => Promise<void>;
  onClose: () => void;
}) {
  const week = programWeek(weekStart);
  const weighIns = weekWeighIns(days, weekStart);
  const autoAvg = averageWeight(weighIns);
  const counts = weekSessionCounts(workouts, weekStart);
  const lastWeek = checkins.find((c) => c.weekStart === addDays(weekStart, -7));

  // Đang sửa: giữ số đã lưu. Mới: điền sẵn trung bình các lần cân.
  const initialAvg = existing?.avgWeightKg ?? autoAvg;
  const [avgText, setAvgText] = useState(initialAvg === null || initialAvg === undefined ? "" : formatKg(initialAvg));
  const [waistText, setWaistText] = useState(existing?.waistCm !== undefined ? formatKg(existing.waistCm) : "");
  const [photo, setPhoto] = useState(existing?.photoTaken ?? false);
  const [note, setNote] = useState(existing?.note ?? "");

  const avg = readMeasure(avgText, WEIGHT_RANGE_KG, "70,4");
  const waist = readMeasure(waistText, WAIST_RANGE_CM, "92,5");
  const photoWeek = isPhotoWeek(weekStart);
  // Tính lại ngay khi gõ, để thấy kết quả trước khi lưu.
  const others = checkins.filter((c) => c.weekStart !== weekStart);
  const hints = adjustHints(others, weekStart, avg.value);
  const vsStart = startComparison(others, weekStart, avg.value, waist.value);
  const submit = useSubmit();

  function handleSave() {
    if (avg.error || waist.error) return;
    void submit.run(() =>
      onSave({
        id: bodyCheckinId(weekStart),
        weekStart,
        // Ô trống thì bỏ trường đi, không lưu 0.
        avgWeightKg: avg.value ?? undefined,
        waistCm: waist.value ?? undefined,
        photoTaken: photoWeek ? photo : existing?.photoTaken,
        note: note.trim() === "" ? undefined : note.trim(),
      })
    );
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-ink">Check-in Glow-up · tuần {week?.week}</h2>
      <p className="mb-3 text-xs text-ink-3">
        {ddmm(weekStart)} – {ddmm(addDays(weekStart, 6))} · đã ghi{" "}
        <span className="font-num text-ink-2">{counts.gym}/3</span> buổi gym ·{" "}
        <span className="font-num text-ink-2">{counts.run}/3</span> buổi chạy
      </p>

      <Field
        label="Cân trung bình (kg)"
        hint={weighIns.length > 0 ? `từ ${weighIns.length} lần cân sáng` : "chưa có lần cân nào, gõ tay"}
      >
        <input
          type="text"
          inputMode="decimal"
          value={avgText}
          onChange={(e) => setAvgText(e.target.value)}
          placeholder="vd 70,4"
          aria-label="Cân trung bình (kg)"
          aria-invalid={avg.error !== null}
          className="tap-target w-full rounded-xl border border-line bg-surface-2 px-3 font-num text-ink"
        />
        {weighIns.length > 0 && (
          <p className="mt-1 text-xs text-ink-3">
            <span className="font-num">{weighIns.map(formatKg).join(" · ")}</span>
            {autoAvg !== null && (
              <>
                {" "}
                → trung bình <span className="font-num">{formatKg(autoAvg)}</span>
              </>
            )}
          </p>
        )}
        <FieldError message={avg.error} />
      </Field>

      <Field label="Vòng bụng (cm)" hint="đo ngang rốn">
        <input
          type="text"
          inputMode="decimal"
          value={waistText}
          onChange={(e) => setWaistText(e.target.value)}
          placeholder={lastWeek?.waistCm !== undefined ? `tuần trước ${formatKg(lastWeek.waistCm)}` : "vd 92,5"}
          aria-label="Vòng bụng (cm)"
          aria-invalid={waist.error !== null}
          className="tap-target w-full rounded-xl border border-line bg-surface-2 px-3 font-num text-ink"
        />
        <FieldError message={waist.error} />
      </Field>

      {/* So với tuần 1 và mốc của tuần. Tuần 1 chính là số gốc. */}
      {week?.week === 1 ? (
        <p className="mb-4 text-sm text-ink-2">Đây là số gốc: các mốc tuần 4 · 8 · 12 tính từ số tuần này.</p>
      ) : (
        vsStart &&
        (vsStart.weightKg !== null || vsStart.waistCm !== null) && (
          <div className="mb-4 rounded-xl border border-line/70 p-3 text-sm text-ink">
            So với tuần 1:{" "}
            {vsStart.weightKg !== null && <span className="font-num font-semibold">{signed(vsStart.weightKg)} kg</span>}
            {vsStart.weightKg !== null && vsStart.waistCm !== null && " · "}
            {vsStart.waistCm !== null && <span className="font-num font-semibold">{signed(vsStart.waistCm)} cm</span>}
            {vsStart.milestone && (
              <span className="mt-1 block text-xs text-ink-2">
                Mốc tuần {week?.week}: <span className="font-num">{signed(vsStart.milestone.weightKg)} kg</span> ·{" "}
                <span className="font-num">{signed(vsStart.milestone.waistCm)} cm</span> (ước tính, không phải lời khuyên y tế)
              </span>
            )}
          </div>
        )
      )}

      {hints.length > 0 && (
        <div className="mb-4 rounded-xl border border-line/70 p-3" role="status">
          <p className="text-xs font-semibold text-ink-2">Gợi ý điều chỉnh theo kế hoạch</p>
          {hints.map((h) => (
            <p key={h} className="mt-1 text-sm text-ink">
              {h}
            </p>
          ))}
        </div>
      )}

      {photoWeek && (
        <div className="mb-4">
          <Toggle
            label="Đã chụp ảnh tiến độ"
            description="Cùng chỗ, ánh sáng, giờ · ảnh để trong app Ảnh"
            checked={photo}
            onChange={setPhoto}
          />
        </div>
      )}

      <Field label="Ghi chú" hint="không bắt buộc">
        <TextInput value={note} onChange={setNote} placeholder="vd: tuần này ăn ngoài 3 bữa" />
      </Field>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Đóng
        </Button>
        <Button onClick={handleSave} disabled={submit.busy || avg.error !== null || waist.error !== null} className="flex-1">
          {submit.busy ? "Đang lưu..." : "Lưu check-in"}
        </Button>
      </div>
      <FieldError message={submit.error} />
    </div>
  );
}
