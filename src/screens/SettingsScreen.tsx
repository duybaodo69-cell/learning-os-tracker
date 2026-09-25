/**
 * Màn hình "Cài đặt".
 *
 * Phase 1 mới có: công tắc "Dữ liệu mẫu".
 * Xuất / nhập dữ liệu sẽ làm ở Phase 4.
 */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db, isDemoMode, setDemoMode } from "../db/db";
import { clearDemoData, loadDemoData } from "../db/demoData";
import { todayISO } from "../lib/dates";

import ScreenShell from "../components/ScreenShell";
import ConfirmDialog from "../components/ConfirmDialog";
import { Button, Card, Toggle } from "../components/ui";

export default function SettingsScreen() {
  const demo = isDemoMode();

  // Đếm số bản ghi để bạn biết đang có bao nhiêu dữ liệu.
  const checkinCount = useLiveQuery(() => db.checkins.count(), [], 0);
  const blockCount = useLiveQuery(() => db.focusBlocks.count(), [], 0);

  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);

  /**
   * Bật/tắt chế độ demo.
   * Phải tải lại trang vì database được chọn một lần lúc app khởi động.
   * KHÔNG có dữ liệu nào bị xoá — hai database nằm riêng.
   */
  function toggleDemo(on: boolean) {
    setDemoMode(on);
    window.location.reload();
  }

  async function handleLoadDemo() {
    setBusy(true);
    await loadDemoData(todayISO());
    setBusy(false);
  }

  async function handleClearDemo() {
    setBusy(true);
    await clearDemoData();
    setConfirmClear(false);
    setBusy(false);
  }

  return (
    <ScreenShell title="Cài đặt" subtitle="Dữ liệu và tuỳ chọn">
      {/* ---------- Chế độ dữ liệu mẫu ---------- */}
      <Card className="mb-4">
        <Toggle
          label="Dữ liệu mẫu"
          description="Xem thử app với dữ liệu giả"
          checked={demo}
          onChange={toggleDemo}
        />

        <p className="mt-3 text-sm text-slate-500">
          Dữ liệu mẫu nằm trong một kho <strong>hoàn toàn tách biệt</strong>. Bật hay tắt công tắc
          này <strong>không bao giờ</strong> đụng tới dữ liệu thật của bạn — app chỉ đổi sang đọc
          kho kia. Trang sẽ tự tải lại khi bạn gạt công tắc.
        </p>

        {demo && (
          <div className="mt-4 rounded-xl bg-amber-50 p-3">
            <p className="mb-3 text-sm font-semibold text-amber-800">
              Đang ở chế độ dữ liệu mẫu
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleLoadDemo} disabled={busy} className="text-sm">
                {busy ? "Đang nạp..." : "Nạp 14 ngày dữ liệu mẫu"}
              </Button>
              <Button
                variant="danger"
                onClick={() => setConfirmClear(true)}
                disabled={busy || (checkinCount === 0 && blockCount === 0)}
                className="text-sm"
              >
                Xoá dữ liệu mẫu
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ---------- Đang có bao nhiêu dữ liệu ---------- */}
      <Card className="mb-4">
        <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
          {demo ? "Kho dữ liệu mẫu" : "Kho dữ liệu thật"}
        </div>
        <ul className="mt-2 space-y-1 text-sm">
          <li className="flex justify-between">
            <span className="text-slate-600">Check-in</span>
            <span className="font-semibold tabular-nums">{checkinCount}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-slate-600">Focus block</span>
            <span className="font-semibold tabular-nums">{blockCount}</span>
          </li>
        </ul>
      </Card>

      {/* ---------- Nhắc sao lưu (luật số 7) ---------- */}
      <Card className="mb-4 border-amber-200 bg-amber-50">
        <div className="text-sm font-bold text-amber-900">Chưa có cách sao lưu</div>
        <p className="mt-1 text-sm text-amber-800">
          Dữ liệu chỉ nằm trong bộ nhớ trình duyệt của <strong>chiếc điện thoại này</strong>. Xoá
          site data, gỡ app hoặc mất máy là mất hết — không có bản nào trên server.
        </p>
        <p className="mt-2 text-sm text-amber-800">
          Nút xuất file JSON sẽ có ở <strong>Phase 4</strong>. Từ lúc đó, hãy xuất một bản sao lưu{" "}
          <strong>mỗi tuần một lần</strong> và cất ra ngoài máy.
        </p>
      </Card>

      <p className="pb-4 text-center text-xs text-slate-400">
        Xuất / nhập dữ liệu và experiments: Phase 4
      </p>

      {/* ---------- Xác nhận xoá (luật số 4) ---------- */}
      <ConfirmDialog
        open={confirmClear}
        title="Xoá toàn bộ dữ liệu mẫu?"
        detail={
          <>
            <strong>
              {checkinCount} check-in và {blockCount} focus block
            </strong>{" "}
            trong kho dữ liệu mẫu sẽ bị xoá.
            <br />
            Dữ liệu thật của bạn nằm ở kho khác và <strong>không bị ảnh hưởng</strong>.
          </>
        }
        confirmLabel="Xoá dữ liệu mẫu"
        onConfirm={handleClearDemo}
        onCancel={() => setConfirmClear(false)}
      />
    </ScreenShell>
  );
}
