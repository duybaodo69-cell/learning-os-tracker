/**
 * Màn hình "Cài đặt".
 *
 * Bố cục "Calm" (Stitch 2026-09), theo thứ tự:
 *   1. Sao lưu — trạng thái + nút Xuất (việc quan trọng nhất, lên đầu)
 *   2. Dữ liệu — mức bảo vệ của trình duyệt, số bản ghi (bấm để mở)
 *   3. Đồng bộ (Dexie Cloud, src/components/SyncSection.tsx)
 *   4. Giao diện, Thử nghiệm cá nhân, Dữ liệu mẫu
 * Cuối cùng là một dòng phiên bản.
 */
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { activeStore, db, isDemoMode, setDemoMode } from "../db/db";
import { clearDemoData, loadDemoData } from "../db/demoData";
import { todayISO } from "../lib/dates";
import { checkPersistence, describePersistence } from "../lib/persistence";
import { getTheme, setTheme } from "../lib/theme";
import type { Theme } from "../lib/theme";
import type { PersistenceStatus } from "../lib/persistence";

import ScreenShell from "../components/ScreenShell";
import ConfirmDialog from "../components/ConfirmDialog";
import { Button, ListGroup, ListRow } from "../components/ui";
import type { ReactNode } from "react";
import BackupSection from "../components/BackupSection";
import ExperimentsManager from "../components/ExperimentsManager";
import SyncSection from "../components/SyncSection";

export default function SettingsScreen() {
  const demo = isDemoMode();

  // Đếm số bản ghi để bạn biết đang có bao nhiêu dữ liệu.
  const checkinCount = useLiveQuery(() => db.dailyCheckins.count(), [], 0);
  const blockCount = useLiveQuery(() => db.focusBlocks.count(), [], 0);
  const dumpCount = useLiveQuery(() => db.brainDumps.count(), [], 0);
  const cardCount = useLiveQuery(() => db.cards.count(), [], 0);
  const logCount = useLiveQuery(() => db.reviewLogs.count(), [], 0);
  const predictionCount = useLiveQuery(() => db.predictions.count(), [], 0);
  const reviewCount = useLiveQuery(() => db.weekReviews.count(), [], 0);
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

  // Chế độ tối / sáng — đổi ngay, không cần tải lại trang.
  const [theme, setThemeState] = useState<Theme>(getTheme);
  function toggleTheme(dark: boolean) {
    const next: Theme = dark ? "dark" : "light";
    setTheme(next);
    setThemeState(next);
  }

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

  // Hai dòng mở/gập trong nhóm "Dữ liệu".
  const [showPersist, setShowPersist] = useState(false);
  const [showCounts, setShowCounts] = useState(false);
  const persist = describePersistence(persistence);
  const storeLabel = demo ? "Kho dữ liệu mẫu" : activeStore === "cloud" ? "Kho · tài khoản" : "Kho · trên máy";

  return (
    <ScreenShell title="Cài đặt">
      {/* ================= Sao lưu — việc quan trọng nhất, lên đầu ================= */}
      <BackupSection />

      {/* ================= Dữ liệu ================= */}
      <ListGroup label="Dữ liệu">
        <ListRow
          label="Bảo vệ dữ liệu"
          value={persist.title}
          valueTone={persist.tone === "good" ? "good" : persist.tone === "warn" ? "warn" : "muted"}
          onClick={() => setShowPersist(!showPersist)}
          open={showPersist}
        />
        {showPersist && persist.detail && (
          <p className="px-4 py-3 text-sm text-ink-2">{persist.detail}</p>
        )}
        <ListRow
          label={storeLabel}
          value={
            <>
              <span className="font-num">{totalCount}</span> bản ghi
            </>
          }
          onClick={() => setShowCounts(!showCounts)}
          open={showCounts}
        />
        {showCounts && (
          <p className="px-4 py-3 text-sm leading-relaxed text-ink-2">
            <Count n={checkinCount} /> check-in · <Count n={blockCount} /> block ·{" "}
            <Count n={dumpCount} /> brain dump · <Count n={cardCount} /> thẻ ·{" "}
            <Count n={logCount} /> lượt ôn · <Count n={predictionCount} /> dự đoán ·{" "}
            <Count n={reviewCount} /> tổng kết tuần · <Count n={tagCount} /> nhãn thí nghiệm
          </p>
        )}
      </ListGroup>

      {/* ================= Đồng bộ ================= */}
      <GroupHeading>Đồng bộ</GroupHeading>
      <SyncSection />

      {/* ================= Giao diện ================= */}
      <ListGroup label="Giao diện">
        <ListRow
          label="Chế độ tối"
          description={theme === "dark" ? "Đang dùng giao diện tối" : "Đang dùng giao diện sáng"}
          checked={theme === "dark"}
          onClick={() => toggleTheme(theme !== "dark")}
        />
      </ListGroup>

      {/* ================= Thử nghiệm cá nhân ================= */}
      <GroupHeading>Thử nghiệm cá nhân</GroupHeading>
      <ExperimentsManager />

      {/* ================= Dữ liệu mẫu ================= */}
      <ListGroup label="Dữ liệu mẫu">
        <ListRow
          label="Chế độ dữ liệu mẫu"
          description="Kho riêng; bật/tắt sẽ tải lại app, dữ liệu thật không bị động tới."
          checked={demo}
          onClick={() => toggleDemo(!demo)}
        />
        {demo && (
          <div className="flex flex-wrap gap-2 px-4 py-3">
            <Button variant="secondary" onClick={handleLoadDemo} disabled={busy} className="text-sm">
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
        )}
      </ListGroup>

      {/* ================= Phiên bản ================= */}
      <p className="mt-2 text-center text-sm text-ink-2">
        Phiên bản · ngày build <span className="font-num font-semibold text-ink">{__BUILD_DATE__}</span>
      </p>
      <p className="mx-auto mt-1 mb-4 max-w-xs text-center text-xs text-ink-3">
        App tự cập nhật khi có bản mới. Nếu ngày này cũ hơn lần deploy gần nhất, đóng hẳn app rồi mở lại.
      </p>

      {/* ---------- Xác nhận xoá (luật số 4) ---------- */}
      <ConfirmDialog
        open={confirmClear}
        title="Xoá toàn bộ dữ liệu mẫu?"
        detail={
          <>
            <strong>
              {checkinCount} check-in, {blockCount} focus block, {dumpCount} brain dump,{" "}
              {cardCount} thẻ, {logCount} lượt ôn, {predictionCount} dự đoán, {reviewCount} tổng kết
              tuần và {tagCount} nhãn thí nghiệm
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

/** Tiêu đề một nhóm cài đặt. */
function GroupHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 px-1 text-sm font-medium text-ink-2">{children}</h2>
  );
}

/** Con số trong dòng thống kê kho. */
function Count({ n }: { n: number }) {
  return <span className="font-num font-semibold text-ink">{n}</span>;
}
