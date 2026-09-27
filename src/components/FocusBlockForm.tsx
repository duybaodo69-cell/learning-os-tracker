/**
 * Form ghi một khối deep work.
 *
 * Mọi thứ đều bấm được, gần như không phải gõ:
 *   - area: chip, nhớ lựa chọn lần trước
 *   - số phút: chip nhanh 25/45/60/90, hoặc tự nhập
 *   - độ tập trung: 5 nút
 *   - phân tâm: bộ đếm −/+
 *
 * Area "IELTS" thêm phần "Buổi IELTS" (IeltsSessionFields): kỹ năng, đề, số
 * câu đúng, 4 loại lỗi, chép chính tả. Lưu vào `block.ielts` cùng một lần ghi.
 */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import type { Area, FocusBlock, Rating } from "../db/types";
import { AREAS } from "../db/types";
import { draftError, draftFromSession, draftToSession, newDraft, type IeltsDraft } from "../lib/ielts";
import IeltsSessionFields from "./IeltsSessionFields";
import { newId, nowHHmm, subtractMinutesFromHHmm } from "../lib/dates";
import { getLastArea, setLastArea } from "../lib/prefs";
import { useSubmit } from "../lib/useSubmit";
import { MAX_BLOCK_MINUTES, checkBlockMinutes, checkTime } from "../lib/validation";
import { Button, ChipGroup, Counter, Field, FieldError, RatingRow, TextInput, TimeInput, Toggle } from "./ui";

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
  /** Việc chen ngang ghi trong lúc chạy bộ đếm. */
  initialCapturedNotes?: string[];
  /** Có thể trả Promise: form chờ lưu xong, lỗi thì giữ form và báo. */
  onSave: (block: FocusBlock) => void | Promise<void>;
  onCancel: () => void;
};

export default function FocusBlockForm({
  date,
  existing,
  initialMinutes,
  initialStartTime,
  initialDistractions,
  initialCapturedNotes,
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

  /* ----- Phần IELTS -----
     Các buổi IELTS đã lưu, để điền sẵn "đề tiếp theo". Khi SỬA thì bỏ chính
     block này ra, nếu không đề gợi ý sẽ là phần ngay sau chính nó.
     undefined = đang đọc database. */
  const ieltsHistory = useLiveQuery(
    async () => (await db.focusBlocks.where("area").equals("IELTS").toArray()).filter((b) => b.id !== existing?.id),
    [existing?.id]
  );
  // null = chưa chạm vào: dùng bản điền sẵn (tính từ lịch sử khi đã đọc xong).
  const [editedIelts, setIeltsDraft] = useState<IeltsDraft | null>(
    existing?.ielts ? draftFromSession(existing.ielts) : null
  );
  const ieltsDraft = editedIelts ?? (ieltsHistory ? newDraft("Listening", ieltsHistory) : null);
  const isIelts = area === "IELTS";
  const ieltsError = isIelts ? (ieltsDraft ? draftError(ieltsDraft) : "Đang tải đề tiếp theo...") : null;

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

  // Kiểm tra thật lúc lưu — `min`/`max` của ô nhập không chặn được nút Lưu.
  const minutesError = checkBlockMinutes(minutes);
  const timeError = checkTime(startTime, "Giờ bắt đầu");
  const canSave = focusRating !== null && minutesError === null && timeError === null && ieltsError === null;
  const submit = useSubmit();

  function handleSave() {
    if (!canSave || focusRating === null) return;

    // Nhớ area cho lần sau — một mẹo nhỏ tiết kiệm vài giây mỗi lần log.
    setLastArea(area);

    void submit.run(() => onSave({
      id: existing?.id ?? newId(),
      date,
      startTime,
      minutes,
      area,
      focusRating,
      distractions,
      phoneAway,
      resumeNote: resumeNote.trim() === "" ? undefined : resumeNote.trim(),
      // Giữ nguyên ghi chú khi SỬA block cũ; block mới lấy từ phiên vừa chạy.
      // Không có gì thì bỏ trường đi cho dữ liệu gọn.
      capturedNotes: (() => {
        const notes = existing?.capturedNotes ?? initialCapturedNotes ?? [];
        return notes.length > 0 ? notes : undefined;
      })(),
      // Phần IELTS chỉ đi cùng area IELTS.
      ielts: isIelts && ieltsDraft ? draftToSession(ieltsDraft) : undefined,
    }));
  }

  return (
    <div>
      <Field label="Area">
        {/* Một hàng vuốt ngang (luật "Calm"): 10 area xếp nhiều hàng đẩy phần IELTS xuống quá xa. */}
        <ChipGroup scroll options={AREAS} value={area} onChange={setArea} />
        {/* Sửa một buổi IELTS rồi đổi area: báo trước, không bỏ điểm âm thầm (luật số 4). */}
        {existing?.ielts && !isIelts && (
          <p className="mt-2 text-sm text-warn">Lưu với area khác sẽ bỏ phần IELTS (đề, điểm, lỗi) của block này.</p>
        )}
      </Field>

      {isIelts &&
        (ieltsDraft ? (
          <IeltsSessionFields draft={ieltsDraft} onChange={setIeltsDraft} history={ieltsHistory ?? []} />
        ) : (
          <p className="mb-4 text-sm text-ink-3">Đang tải đề tiếp theo...</p>
        ))}

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
              max={MAX_BLOCK_MINUTES}
              value={Number.isFinite(minutes) && minutes > 0 ? minutes : ""}
              onChange={(e) => changeMinutes(Number(e.target.value))}
              aria-invalid={minutesError !== null}
              className="tap-target w-full rounded-xl border border-line bg-surface-2 px-3 text-base font-semibold text-ink"
              placeholder="Số phút"
            />
          ) : (
            <Button variant="ghost" onClick={() => setCustomOpen(true)} className="text-sm">
              Nhập số khác
            </Button>
          )}
        </div>
        <FieldError message={minutesError} />
      </Field>

      <Field
        label="Bắt đầu lúc"
        hint={!existing && !initialStartTime ? "tự tính lùi theo số phút" : undefined}
      >
        <TimeInput
          value={startTime}
          onChange={(v) => {
            setStartTime(v);
            setStartTimeTouched(true);
          }}
        />
        <FieldError message={timeError} />
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

      {/* Cho thấy việc chen ngang sẽ được lưu kèm block — không lưu ngầm. */}
      {(existing?.capturedNotes ?? initialCapturedNotes ?? []).length > 0 && (
        <Field label="Việc chen ngang" hint="lưu kèm block">
          <ul className="space-y-1 border-l-2 border-line pl-3">
            {(existing?.capturedNotes ?? initialCapturedNotes ?? []).map((n, i) => (
              <li key={i} className="text-sm text-ink-2">
                {n}
              </li>
            ))}
          </ul>
        </Field>
      )}

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
        <Button onClick={handleSave} disabled={!canSave || submit.busy} className="flex-1">
          {submit.busy ? "Đang lưu..." : existing ? "Cập nhật" : "Lưu block"}
        </Button>
      </div>

      <FieldError message={submit.error} />

      {focusRating === null && (
        <p className="mt-2 text-center text-xs text-ink-3">Chọn độ tập trung để lưu</p>
      )}
      {/* Lý do phần IELTS chưa lưu được — thường là "Đã phân loại x/y câu sai". */}
      {ieltsError && ieltsDraft && <p className="mt-2 text-center text-xs text-warn">{ieltsError}</p>}
    </div>
  );
}
