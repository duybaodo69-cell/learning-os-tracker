/**
 * Chạy một thao tác lưu, chống bấm hai lần và báo lỗi khi ghi thất bại.
 *
 *   const submit = useSubmit();
 *   <Button onClick={() => submit.run(() => onSave(x))} disabled={submit.busy}>
 *   {submit.error && <p>{submit.error}</p>}
 *
 * - Khoá bằng ref nên có hiệu lực NGAY trong cùng lượt bấm (state của React
 *   chỉ đổi ở lần vẽ sau — quá chậm với một cú chạm đúp).
 * - Lưu thất bại thì form KHÔNG đóng và nội dung vẫn còn: thử lại được.
 */
import { useRef, useState } from "react";

export const SAVE_ERROR = "Chưa lưu được. Nội dung trong form vẫn còn, hãy thử lại.";

export function useSubmit() {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => void | Promise<void>): Promise<void> {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch {
      setError(SAVE_ERROR);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return { busy, error, run };
}
