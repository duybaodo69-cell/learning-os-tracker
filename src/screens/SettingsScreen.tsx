/**
 * Màn hình "Cài đặt".
 *
 * Phase 1 mới có: công tắc "Dữ liệu mẫu".
 * Xuất / nhập dữ liệu sẽ làm ở Phase 4.
 */
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db, isDemoMode, setDemoMode } from "../db/db";
import { clearDemoData, loadDemoData } from "../db/demoData";
import { todayISO } from "../lib/dates";
import { checkPersistence, describePersistence } from "../lib/persistence";
import type { PersistenceStatus } from "../lib/persistence";

import ScreenShell from "../components/ScreenShell";
import ConfirmDialog from "../components/ConfirmDialog";
import { Button, Card, Toggle } from "../components/ui";
import BackupSection from "../components/BackupSection";
import ExperimentsManager from "../components/ExperimentsManager";

export default function SettingsScreen() {
  const demo = isDemoMode();

  // Đếm số bản ghi để bạn biết đang có bao nhiêu dữ liệu.
  const checkinCount = useLiveQuery(() => db.checkins.count(), [], 0);
  const blockCount = useLiveQuery(() => db.focusBlocks.count(), [], 0);
  const dumpCount = useLiveQuery(() => db.brainDumps.count(), [], 0);
  const cardCount = useLiveQuery(() => db.cards.count(), [], 0);
  const logCount = useLiveQuery(() => db.reviewLogs.count(), [], 0);
  const predictionCount = useLiveQuery(() => db.predictions.count(), [], 0);
  const reviewCount = useLiveQuery(() => db.weeklyReviews.count(), [], 0);
  const tagCount = useLiveQuery(() => db.experimentTags.count(), [], 0);

  // Tổng mọi bản ghi — dùng để biết kho có trống hay không.
  const totalCount =
    checkinCount + blockCount + dumpCount + cardCount + logCount + predictionCount + reviewCount + tagCount;

  const [confirmClear, setConfirmClear] = useState(false);

  // Mức bảo vệ dữ liệu của trình duyệt — chỉ đọc, không xin lại ở đây.
  const [persistence, setPersistence] = useState<PersistenceStatus>("checking");
  useEffect(() => {
    void checkPersistence().then(setPersistence);
  }, []);
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

        <p className="mt-3 text-sm text-ink-2">
          Dữ liệu mẫu nằm trong một kho <strong>hoàn toàn tách biệt</strong>. Bật hay tắt công tắc
          này <strong>không bao giờ</strong> đụng tới dữ liệu thật của bạn — app chỉ đổi sang đọc
          kho kia. Trang sẽ tự tải lại khi bạn gạt công tắc.
        </p>

        {demo && (
          <div className="mt-4 rounded-lg bg-warn/10 p-3">
            <p className="mb-3 text-sm font-semibold text-warn">
              Đang ở chế độ dữ liệu mẫu
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleLoadDemo} disabled={busy} className="text-sm">
                {busy ? "Đang nạp..." : "Nạp 14 ngày dữ liệu mẫu"}
              </Button>
              <Button
                variant="danger"
                onClick={() => setConfirmClear(true)}
                disabled={busy || totalCount === 0}
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
        <div className="text-xs font-semibold tracking-wide text-ink-3 uppercase">
          {demo ? "Kho dữ liệu mẫu" : "Kho dữ liệu thật"}
        </div>
        <ul className="mt-2 space-y-1 text-sm">
          <li className="flex justify-between">
            <span className="text-ink-2">Check-in</span>
            <span className="font-semibold tabular-nums">{checkinCount}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-ink-2">Focus block</span>
            <span className="font-semibold tabular-nums">{blockCount}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-ink-2">Brain dump</span>
            <span className="font-semibold tabular-nums">{dumpCount}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-ink-2">Thẻ ôn tập</span>
            <span className="font-semibold tabular-nums">{cardCount}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-ink-2">Lượt ôn đã ghi</span>
            <span className="font-semibold tabular-nums">{logCount}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-ink-2">Dự đoán</span>
            <span className="font-semibold tabular-nums">{predictionCount}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-ink-2">Tổng kết tuần</span>
            <span className="font-semibold tabular-nums">{reviewCount}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-ink-2">Nhãn thí nghiệm</span>
            <span className="font-semibold tabular-nums">{tagCount}</span>
          </li>
        </ul>
      </Card>

      {/* ---------- Sao lưu (luật số 7) ---------- */}
      <BackupSection />

      {/* ---------- Thí nghiệm ---------- */}
      <ExperimentsManager />

      {/* ---------- Mức bảo vệ dữ liệu ---------- */}
      <PersistenceCard status={persistence} />

      {/* ---------- Phiên bản ---------- */}
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-2">Phiên bản</span>
          <span className="font-semibold text-ink tabular-nums">{__BUILD_DATE__}</span>
        </div>
        <p className="mt-1 text-xs text-ink-3">
          Ngày đóng gói bản đang chạy. App tự cập nhật khi có bản mới — nếu số này cũ hơn ngày mình
          vừa deploy, đóng hẳn app rồi mở lại.
        </p>
      </Card>

      <div className="pb-4" />

      {/* ---------- Xác nhận xoá (luật số 4) ---------- */}
      <ConfirmDialog
        open={confirmClear}
        title="Xoá toàn bộ dữ liệu mẫu?"
        detail={
          <>
            <strong>
              {checkinCount} check-in, {blockCount} focus block, {dumpCount} brain dump,{" "}
              {cardCount} thẻ, {logCount} lượt ôn, {predictionCount} dự đoán, {reviewCount} tổng kết tuần và {tagCount} nhãn thí nghiệm
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

/** Ô hiện trình duyệt có cam kết giữ dữ liệu hay không. */
function PersistenceCard({ status }: { status: PersistenceStatus }) {
  const d = describePersistence(status);
  const style =
    d.tone === "good"
      ? "border-good/30 bg-good/10"
      : d.tone === "warn"
        ? "border-warn/30 bg-warn/10"
        : "";

  return (
    <Card className={`mb-4 ${style}`}>
      <div className="text-xs font-semibold tracking-wide text-ink-3 uppercase">
        Bảo vệ dữ liệu
      </div>
      <div className="mt-1 text-sm font-bold text-ink">{d.title}</div>
      {d.detail && <p className="mt-1 text-sm text-ink-2">{d.detail}</p>}
    </Card>
  );
}
