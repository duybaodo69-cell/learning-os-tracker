/**
 * Xuất và nhập dữ liệu — nằm trong màn hình Cài đặt.
 *
 * Đây là thứ duy nhất cứu bạn khi mất điện thoại. Xem luật số 7 trong CLAUDE.md.
 *
 * Nhập dữ liệu là thao tác GHI ĐÈ, nên bắt buộc có bước xem trước và xác nhận
 * (luật số 4). Không bao giờ ghi đè chỉ vì người dùng lỡ chọn nhầm file.
 */
import { useRef, useState } from "react";

import { todayISO } from "../lib/dates";
import {
  TABLE_LABELS,
  TABLE_NAMES,
  currentCounts,
  daysSinceLastExport,
  exportBackup,
  getLastExportDate,
  importBackup,
  parseBackup,
} from "../lib/backup";
import type { ParsedBackup } from "../lib/backup";

import ConfirmDialog from "./ConfirmDialog";
import { Button, Card } from "./ui";

export default function BackupSection() {
  const today = todayISO();
  const fileInput = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dữ liệu xem trước sau khi chọn file, TRƯỚC khi ghi đè.
  const [preview, setPreview] = useState<ParsedBackup | null>(null);
  const [existing, setExisting] = useState<Record<string, number> | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Đọc localStorage mỗi lần vẽ là đủ — giá trị chỉ đổi khi chính màn hình này xuất file.
  const lastExport = getLastExportDate();
  const daysSince = daysSinceLastExport(today);

  async function handleExport() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const how = await exportBackup(today);
      setMessage(
        how === "share"
          ? "Đã mở bảng chia sẻ. Lưu file vào Files, iCloud hoặc gửi cho chính mình."
          : "Đã tải file JSON về máy."
      );
    } catch (err) {
      // Người dùng bấm Huỷ trên bảng chia sẻ — không phải lỗi.
      if (err instanceof DOMException && err.name === "AbortError") {
        setMessage("Đã huỷ. Chưa có bản sao lưu nào được tạo.");
      } else {
        setError(err instanceof Error ? err.message : "Không xuất được file.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Xoá giá trị để chọn lại CÙNG file vẫn kích hoạt sự kiện.
    e.target.value = "";
    if (!file) return;

    setError(null);
    setMessage(null);
    try {
      const text = await file.text();
      const parsed = parseBackup(text);
      setPreview(parsed);
      setExisting(await currentCounts());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đọc được file.");
    }
  }

  async function doImport() {
    if (!preview) return;
    setBusy(true);
    try {
      await importBackup(preview.file);
      setMessage("Đã nhập xong. Toàn bộ dữ liệu cũ đã được thay thế.");
      setPreview(null);
      setExisting(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nhập thất bại. Dữ liệu cũ được giữ nguyên.");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  const totalInFile = preview
    ? TABLE_NAMES.reduce((s, n) => s + (preview.counts[n] ?? 0), 0)
    : 0;
  const totalExisting = existing ? TABLE_NAMES.reduce((s, n) => s + (existing[n] ?? 0), 0) : 0;

  return (
    <Card className="mb-4">
      <div className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
        Sao lưu
      </div>

      <p className="mb-3 text-sm text-slate-500">
        Dữ liệu chỉ nằm trong trình duyệt của <strong>máy này</strong>. Xuất một bản{" "}
        <strong>mỗi tuần</strong> và cất ra ngoài máy.
      </p>

      <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
        {lastExport === null ? (
          <span className="font-semibold text-amber-700">Chưa xuất bản sao lưu nào.</span>
        ) : (
          <span className="text-slate-600">
            Lần xuất gần nhất: <strong>{lastExport}</strong>
            {daysSince !== null && daysSince > 0 && ` (${daysSince} ngày trước)`}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleExport} disabled={busy} className="flex-1 text-sm">
          Xuất dữ liệu (JSON)
        </Button>
        <Button
          variant="secondary"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="flex-1 text-sm"
        >
          Nhập dữ liệu
        </Button>
      </div>

      {/* Ô chọn file ẩn đi, nút ở trên bấm hộ — nút mặc định của trình duyệt xấu và nhỏ. */}
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        onChange={handleFileChosen}
        className="hidden"
      />

      {message && (
        <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
      )}
      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {/* ---------- Xem trước trước khi ghi đè ---------- */}
      {preview && existing && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <div className="text-sm font-bold text-amber-900">Xem trước trước khi ghi đè</div>
          <p className="mt-1 text-xs text-amber-800">
            File tạo lúc {preview.file.exportedAt.slice(0, 10)}. Bảng dưới so sánh dữ liệu{" "}
            <strong>đang có</strong> với dữ liệu <strong>trong file</strong>.
          </p>

          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-xs text-amber-700">
                <th className="py-1 text-left font-semibold">Bảng</th>
                <th className="py-1 text-right font-semibold">Đang có</th>
                <th className="py-1 text-right font-semibold">Trong file</th>
              </tr>
            </thead>
            <tbody>
              {TABLE_NAMES.map((n) => (
                <tr key={n} className="border-t border-amber-200">
                  <td className="py-1 text-amber-900">{TABLE_LABELS[n]}</td>
                  <td className="py-1 text-right tabular-nums text-amber-800">{existing[n] ?? 0}</td>
                  <td className="py-1 text-right font-semibold tabular-nums text-amber-900">
                    {preview.counts[n] ?? 0}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-amber-300 font-bold">
                <td className="py-1 text-amber-900">Tổng</td>
                <td className="py-1 text-right tabular-nums text-amber-800">{totalExisting}</td>
                <td className="py-1 text-right tabular-nums text-amber-900">{totalInFile}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setPreview(null);
                setExisting(null);
              }}
              className="flex-1 text-sm"
            >
              Huỷ
            </Button>
            <Button
              variant="danger"
              onClick={() => setConfirmOpen(true)}
              disabled={busy}
              className="flex-1 text-sm"
            >
              Ghi đè
            </Button>
          </div>
        </div>
      )}

      {/* Luật số 4: bước xác nhận cuối cùng, nói rõ mất cái gì. */}
      <ConfirmDialog
        open={confirmOpen}
        title="Ghi đè toàn bộ dữ liệu?"
        detail={
          <>
            <strong>{totalExisting} bản ghi đang có sẽ bị xoá</strong> và thay bằng{" "}
            <strong>{totalInFile} bản ghi</strong> từ file.
            <br />
            Nếu chưa xuất bản sao lưu của dữ liệu hiện tại, hãy bấm Huỷ và xuất trước.
          </>
        }
        confirmLabel="Ghi đè"
        onConfirm={doImport}
        onCancel={() => setConfirmOpen(false)}
      />
    </Card>
  );
}
