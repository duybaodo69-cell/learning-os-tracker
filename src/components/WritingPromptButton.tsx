/**
 * "Sao chép prompt chấm Writing" (Đợt 3). Chỉ chép chữ vào clipboard — app
 * không gửi gì lên mạng. Trình duyệt chặn clipboard thì hiện ô chữ để tự chép.
 * Dùng ở tab IELTS (Tổng quan) và trong phần IELTS khi kỹ năng là Writing.
 */
import { useState } from "react";
import { WRITING_PROMPT, copyText } from "../lib/writingPrompt";

export default function WritingPromptButton({ className = "" }: { className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");

  return (
    <div className={className}>
      <button
        type="button"
        onClick={async () => setState((await copyText(WRITING_PROMPT)) ? "copied" : "manual")}
        className="tap-target w-full rounded-xl bg-surface-2 px-4 text-sm font-semibold text-accent active:bg-line"
      >
        {state === "copied" ? "✓ Đã chép — dán vào AI kèm đề và bài" : "Sao chép prompt chấm Writing"}
      </button>
      {state === "manual" && (
        <>
          <p className="mt-2 text-xs text-ink-2">Trình duyệt không cho chép tự động. Giữ vào ô dưới để chọn hết rồi chép.</p>
          <textarea
            readOnly
            value={WRITING_PROMPT}
            rows={6}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Prompt chấm Writing"
            className="mt-1 w-full rounded-xl border border-line bg-surface-2 p-3 text-sm text-ink"
          />
        </>
      )}
    </div>
  );
}
