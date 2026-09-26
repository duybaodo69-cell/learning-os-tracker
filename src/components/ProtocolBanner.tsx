/**
 * Banner hiện giai đoạn protocol đang ở.
 * Nội dung lấy từ src/config/protocolPhases.ts — sửa lịch thì sửa file đó.
 */
import { PROTOCOL_PHASES, findProtocolPhase, findProtocolPhaseIndex } from "../config/protocolPhases";

export default function ProtocolBanner({ date }: { date: string }) {
  const phase = findProtocolPhase(date);

  // Ngoài lịch 12 tuần thì không hiện gì, tránh làm rối màn hình.
  if (!phase) return null;

  const index = findProtocolPhaseIndex(date);

  return (
    <div className="mb-4 rounded-lg border border-line border-l-2 border-l-accent bg-surface px-4 py-2.5">
      <div className="text-xs font-semibold tracking-wider text-ink-2 uppercase">
        Giai đoạn {index}/{PROTOCOL_PHASES.length}
      </div>
      <div className="mt-0.5 text-sm font-medium text-ink">{phase.label}</div>
    </div>
  );
}
