/**
 * Màn hình "Cài đặt".
 *
 * Ba nhóm, theo thứ tự quan trọng:
 *   1. Sao lưu & dữ liệu — mức bảo vệ của trình duyệt, xuất/nhập JSON
 *   2. Dữ liệu mẫu — kho riêng để xem thử
 *   3. Thử nghiệm cá nhân
 * Cuối cùng là một dòng phiên bản.
 */
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db, isDemoMode, setDemoMode } from "../db/db";
import { clearDemoData, loadDemoData } from "../db/demoData";
import { todayISO } from "../lib/dates";
import { checkPersistence, describePersistence } from "../lib/persistence";
import { getTheme, setTheme } from "../lib/theme";
import type { Theme } from "../lib/theme";
import type { PersistenceStatus } from "../lib/persistence";

import ScreenShell from "../components/ScreenShell";
import ConfirmDialog from "../components/ConfirmDialog";
import { Button, Card, Toggle } from "../components/ui";
import type { ReactNode } from "react";
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

  return (
    <ScreenShell title="Cài đặt">
      {/* ================= Giao diện ================= */}
      <GroupHeading>Giao diện</GroupHeading>
      <Card className="mb-6">
        <Toggle
          label="Chế độ tối"
          description={theme === "dark" ? "Đang dùng giao diện tối" : "Đang dùng giao diện sáng (bản trước)"}
          checked={theme === "dark"}
          onChange={toggleTheme}
        />
      </Card>

      {/* ================= 1. Sao lưu & dữ liệu ================= */}
      <GroupHeading>Sao lưu & dữ liệu</GroupHeading>

      <PersistenceCard status={persistence} />

      <BackupSection />

      {/* Đang có bao nhiêu dữ liệu trong kho đang mở — một dòng gọn. */}
      <Card className="mb-6 py-3">
        <div className="mb-1 text-xs font-semibold tracking-wider text-ink-2 uppercase">
          {demo ? "Kho dữ liệu mẫu" : "Kho dữ liệu thật"}
        </div>
        <p className="text-sm leading-relaxed text-ink-2">
          <Count n={checkinCount} /> check-in · <Count n={blockCount} /> block ·{" "}
          <Count n={dumpCount} /> brain dump · <Count n={cardCount} /> thẻ ·{" "}
          <Count n={logCount} /> lượt ôn · <Count n={predictionCount} /> dự đoán ·{" "}
          <Count n={reviewCount} /> tổng kết tuần · <Count n={tagCount} /> nhãn thí nghiệm
        </p>
      </Card>

      {/* ================= 2. Dữ liệu mẫu ================= */}
      <GroupHeading>Dữ liệu mẫu</GroupHeading>
      <Card className="mb-6">
        <Toggle
          label="Chế độ dữ liệu mẫu"
          description="Xem thử app với dữ liệu giả"
          checked={demo}
          onChange={toggleDemo}
        />
        <p className="mt-3 text-sm text-ink-2">
          Dữ liệu mẫu nằm trong kho riêng; bật/tắt sẽ tải lại app, dữ liệu thật không bị động tới.
        </p>

        {demo && (
          <div className="mt-4 rounded-lg border border-warn/30 bg-warn/12 p-3">
            <p className="mb-3 text-sm font-semibold text-warn">Đang ở chế độ dữ liệu mẫu</p>
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

      {/* ================= 3. Thử nghiệm cá nhân ================= */}
      <GroupHeading>Thử nghiệm cá nhân</GroupHeading>
      <ExperimentsManager />

      {/* ================= Phiên bản ================= */}
      <Card className="mb-4 flex items-center justify-between py-3">
        <span className="text-sm text-ink-2">Phiên bản · ngày build</span>
        <span className="font-num text-sm font-semibold text-ink">{__BUILD_DATE__}</span>
      </Card>
      <p className="mb-4 px-1 text-xs text-ink-2">
        App tự cập nhật khi có bản mới. Nếu ngày này cũ hơn lần deploy gần nhất, đóng hẳn app rồi mở
        lại.
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
    <h2 className="mb-2 px-1 text-sm font-semibold tracking-wide text-ink uppercase">{children}</h2>
  );
}

/** Con số trong dòng thống kê kho. */
function Count({ n }: { n: number }) {
  return <span className="font-num font-semibold text-ink">{n}</span>;
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
      <div className="text-xs font-semibold tracking-wider text-ink-2 uppercase">
        Bảo vệ dữ liệu
      </div>
      <div className={`mt-1 text-sm font-bold ${d.tone === "good" ? "text-good" : d.tone === "warn" ? "text-warn" : "text-ink"}`}>
        {d.title}
      </div>
      {d.detail && <p className="mt-1 text-sm text-ink-2">{d.detail}</p>}
    </Card>
  );
}
