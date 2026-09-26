/**
 * ConfirmDialog — hộp thoại xác nhận trước khi xoá.
 *
 * LUẬT SỐ 4 CỦA DỰ ÁN: không bao giờ xoá dữ liệu mà không hỏi lại,
 * và câu hỏi phải nói RÕ cái gì sẽ mất.
 *
 * Cố ý KHÔNG dùng window.confirm() vì:
 *   - nó không hiện được tiếng Việt có dấu đẹp trên mọi máy
 *   - trên điện thoại nó trông như cảnh báo của trình duyệt, dễ bấm nhầm
 *   - nó chặn toàn bộ trang, khó kiểm soát
 */
import type { ReactNode } from "react";
import { Button } from "./ui";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  /** Mô tả CHÍNH XÁC thứ sắp bị xoá, ví dụ "Khối 45p · IELTS lúc 09:30". */
  detail: ReactNode;
  confirmLabel?: string;
  /**
   * Thao tác có xoá/mất dữ liệu không. Mặc định CÓ (luật số 4).
   * Đặt false cho câu hỏi xác nhận thường (vd "vẫn dùng số phút này?"):
   * nút chính thành màu cyan và không hiện dòng "Không thể hoàn tác".
   */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  detail,
  confirmLabel = "Xoá",
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    // Lớp nền mờ phủ toàn màn hình. Bấm ra ngoài = huỷ.
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4"
      onClick={onCancel}
    >
      {/* stopPropagation: bấm vào trong hộp thì KHÔNG bị tính là bấm ra ngoài. */}
      <div
        className="w-full max-w-md rounded-lg border border-accent/60 bg-surface-2 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.65)]"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <h2 className="text-lg font-bold text-ink">{title}</h2>

        <div className="mt-2 rounded-lg border border-line bg-surface p-3 text-sm text-ink">{detail}</div>

        {destructive && <p className="mt-3 text-sm text-ink-2">Không thể hoàn tác.</p>}

        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Huỷ
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} className="flex-1">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
