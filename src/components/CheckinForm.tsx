/**
 * Form check-in buổi sáng.
 *
 * Mục tiêu: xong trong dưới 30 giây.
 *   - Giờ ngủ / giờ dậy điền sẵn theo hôm qua → thường chỉ cần xác nhận
 *   - Năng lượng: 5 nút to, bấm 1 lần
 *   - Ghi chú: không bắt buộc, để cuối
 */
import { useState } from "react";
import type { DailyCheckin, Rating } from "../db/types";
import { checkinId } from "../db/keys";
import { computeSleepHours } from "../lib/dates";
import { Button, Field, RatingRow, TextInput, TimeInput } from "./ui";

type CheckinFormProps = {
  date: string;
  /** Check-in hôm qua — dùng làm giá trị điền sẵn. */
  previous?: DailyCheckin;
  /** Nếu đang sửa check-in đã có thì truyền vào đây. */
  existing?: DailyCheckin;
  onSave: (checkin: DailyCheckin) => void;
  onCancel?: () => void;
};

export default function CheckinForm({ date, previous, existing, onSave, onCancel }: CheckinFormProps) {
  // Thứ tự ưu tiên điền sẵn: bản đang sửa > hôm qua > giá trị mặc định hợp lý.
  const [bedTime, setBedTime] = useState(existing?.bedTime ?? previous?.bedTime ?? "23:30");
  const [wakeTime, setWakeTime] = useState(existing?.wakeTime ?? previous?.wakeTime ?? "06:30");
  const [energy, setEnergy] = useState<Rating | null>(existing?.energy ?? null);
  const [note, setNote] = useState(existing?.note ?? "");

  // Tính lại mỗi khi đổi giờ, để bạn thấy ngay kết quả.
  const sleepHours = computeSleepHours(bedTime, wakeTime);

  function handleSave() {
    if (energy === null) return; // nút Lưu đã bị khoá, đây chỉ là lớp bảo vệ thứ hai
    onSave({
      id: checkinId(date),
      date,
      bedTime,
      wakeTime,
      sleepHours,
      energy,
      // Ghi chú rỗng thì không lưu, để dữ liệu sạch.
      note: note.trim() === "" ? undefined : note.trim(),
    });
  }

  return (
    <div>
      {/* Hai ô giờ nằm cạnh nhau cho gọn màn hình điện thoại. */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Field label="Đi ngủ">
          <TimeInput value={bedTime} onChange={setBedTime} />
        </Field>
        <Field label="Thức dậy">
          <TimeInput value={wakeTime} onChange={setWakeTime} />
        </Field>
      </div>

      {/* Kết quả tính tự động — để bạn phát hiện ngay nếu bấm nhầm giờ. */}
      <div className="mb-4 flex items-baseline justify-between rounded-lg border border-line bg-canvas px-4 py-3">
        <span className="text-sm text-ink-2">Ngủ được</span>
        <span>
          <span className="font-num text-3xl font-semibold text-accent">{sleepHours}h</span>
        </span>
      </div>

      <Field label="Năng lượng sáng nay" hint="bắt buộc">
        <RatingRow
          value={energy}
          onChange={setEnergy}
          labels={["Kiệt sức", "Mệt", "Bình thường", "Sung sức", "Đỉnh cao"]}
        />
      </Field>

      <Field label="Ghi chú" hint="không bắt buộc">
        <TextInput value={note} onChange={setNote} placeholder="vd: thức khuya đọc memo" />
      </Field>

      <div className="flex gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Huỷ
          </Button>
        )}
        <Button onClick={handleSave} disabled={energy === null} className="flex-1">
          {existing ? "Cập nhật" : "Lưu check-in"}
        </Button>
      </div>

      {energy === null && (
        <p className="mt-2 text-center text-xs text-ink-3">Chọn mức năng lượng để lưu</p>
      )}
    </div>
  );
}
