/**
 * Form ghi một khối deep work.
 *
 * Mọi thứ đều bấm được, gần như không phải gõ:
 *   - area: chip, nhớ lựa chọn lần trước
 *   - số phút: chip nhanh 25/45/60/90, hoặc tự nhập
 *   - độ tập trung: 5 nút
 *   - phân tâm: bộ đếm −/+
 */
import { useState } from "react";
import type { Area, FocusBlock, Rating } from "../db/types";
import { AREAS } from "../db/types";
import { newId, nowHHmm, subtractMinutesFromHHmm } from "../lib/dates";
import { getLastArea, setLastArea } from "../lib/prefs";
import { Button, ChipGroup, Counter, Field, RatingRow, TextInput, TimeInput, Toggle } from "./ui";

/** Các mốc phút hay dùng (Pomodoro 25, tiết 45, 1 tiếng, 1 tiếng rưỡi). */
const QUICK_MINUTES = [25, 45, 60, 90] as const;

type FocusBlockFormProps = {
  date: string;
  /** Sửa khối đã có; để trống nghĩa là tạo mới. */
  existing?: FocusBlock;
  /** Số phút điền sẵn (bộ đếm giờ truyền vào sau khi bấm Dừng). */
  initialMinutes?: number;
  /** Giờ bắt đầu điền sẵn (bộ đếm giờ truyền vào). */
  initialStartTime?: string;
  /** Số lần phân tâm đã bấm trong lúc bộ đếm chạy. */
  initialDistractions?: number;
  onSave: (block: FocusBlock) => void;
  onCancel: () => void;
};

export default function FocusBlockForm({
  date,
  existing,
  initialMinutes,
  initialStartTime,
  initialDistractions,
  onSave,
  onCancel,
}: FocusBlockFormProps) {
  const [area, setArea] = useState<Area>(existing?.area ?? getLastArea());
  const [minutes, setMinutes] = useState<number>(existing?.minutes ?? initialMinutes ?? 45);
  /**
   * Giờ bắt đầu mặc định = BÂY GIỜ TRỪ số phút đã chọn.
   * Bạn bấm "+ Block" sau khi làm xong, nên 45 phút bấm lúc 15:00
   * nghĩa là bắt đầu 14:15.
   *
   * Bộ đếm giờ thì truyền initialStartTime vào — đó là mốc thật, dùng luôn.
   */
  const [startTime, setStartTime] = useState(
    existing?.startTime ??
      initialStartTime ??
      subtractMinutesFromHHmm(nowHHmm(), existing?.minutes ?? initialMinutes ?? 45)
  );
  // Người dùng tự sửa giờ thì thôi không tự tính lại nữa.
  const [startTimeTouched, setStartTimeTouched] = useState(false);
  const [focusRating, setFocusRating] = useState<Rating | null>(existing?.focusRating ?? null);
  const [distractions, setDistractions] = useState(
    existing?.distractions ?? initialDistractions ?? 0
  );
  const [phoneAway, setPhoneAway] = useState(existing?.phoneAway ?? false);
  const [resumeNote, setResumeNote] = useState(existing?.resumeNote ?? "");

  // Số phút có khớp một chip nhanh không? Nếu không thì hiện ô nhập tay.
  const isQuickMinutes = (QUICK_MINUTES as readonly number[]).includes(minutes);
  const [customOpen, setCustomOpen] = useState(!isQuickMinutes);

  /** Đổi số phút: tính lại giờ bắt đầu, trừ khi bạn đã tự sửa giờ. */
  function changeMinutes(m: number) {
    setMinutes(m);
    if (!startTimeTouched && !existing && !initialStartTime) {
      setStartTime(subtractMinutesFromHHmm(nowHHmm(), m));
    }
  }

  function handleSave() {
    if (focusRating === null) return;

    // Nhớ area cho lần sau — một mẹo nhỏ tiết kiệm vài giây mỗi lần log.
    setLastArea(area);

    onSave({
      id: existing?.id ?? newId(),
      date,
      startTime,
      minutes,
      area,
      focusRating,
      distractions,
      phoneAway,
      resumeNote: resumeNote.trim() === "" ? undefined : resumeNote.trim(),
    });
  }

  return (
    <div>
      <Field label="Area">
        <ChipGroup options={AREAS} value={area} onChange={setArea} />
      </Field>

      <Field label="Số phút">
        <ChipGroup
          options={QUICK_MINUTES}
          value={isQuickMinutes && !customOpen ? minutes : null}
          onChange={(m) => {
            changeMinutes(m);
            setCustomOpen(false);
          }}
          format={(m) => `${m}p`}
        />
        <div className="mt-2">
          {customOpen ? (
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={600}
              value={minutes}
              onChange={(e) => changeMinutes(Math.max(1, Number(e.target.value) || 0))}
              className="tap-target w-full rounded-lg border border-line px-3 text-base font-semibold"
              placeholder="Số phút"
            />
          ) : (
            <Button variant="ghost" onClick={() => setCustomOpen(true)} className="text-sm">
              Nhập số khác
            </Button>
          )}
        </div>
      </Field>

      <Field label="Bắt đầu lúc" hint="tự tính lùi theo số phút">
        <TimeInput
          value={startTime}
          onChange={(v) => {
            setStartTime(v);
            setStartTimeTouched(true);
          }}
        />
      </Field>

      <Field label="Độ tập trung" hint="bắt buộc">
        <RatingRow
          value={focusRating}
          onChange={setFocusRating}
          lowLabel="1 · lơ đãng"
          highLabel="5 · rất sâu"
        />
      </Field>

      <Field
        label="Số lần bị phân tâm"
        hint={initialDistractions ? "đã đếm sẵn khi chạy đồng hồ" : undefined}
      >
        <Counter value={distractions} onChange={setDistractions} />
      </Field>

      <div className="mb-4">
        <Toggle
          label="Điện thoại ở phòng khác?"
          checked={phoneAway}
          onChange={setPhoneAway}
          description="Dùng để so sánh ở Phase 4"
        />
      </div>

      <Field label="Làm tiếp từ đâu" hint="không bắt buộc">
        <TextInput
          value={resumeNote}
          onChange={setResumeNote}
          placeholder="vd: dừng ở phần WACC, còn sensitivity"
        />
      </Field>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          Huỷ
        </Button>
        <Button onClick={handleSave} disabled={focusRating === null} className="flex-1">
          {existing ? "Cập nhật" : "Lưu block"}
        </Button>
      </div>

      {focusRating === null && (
        <p className="mt-2 text-center text-xs text-ink-3">Chọn độ tập trung để lưu</p>
      )}
    </div>
  );
}
