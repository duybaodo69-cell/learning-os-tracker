/**
 * Mục "Đồng bộ" trong Cài đặt.
 *
 * Bốn trường hợp, theo kho đang mở (src/db/store.ts):
 *   - chưa cấu hình database   -> chỉ một dòng giải thích
 *   - kho demo                 -> dữ liệu mẫu không bao giờ đồng bộ
 *   - kho trên máy             -> nút "Đăng nhập để đồng bộ"
 *   - kho cloud                -> email, trạng thái đồng bộ, đăng xuất,
 *                                 và thẻ đưa dữ liệu cũ lên tài khoản
 */
import { useEffect, useState } from "react";
import { useObservable } from "dexie-react-hooks";

import { activeStore, cloudConfigured, db, setSyncEnabled } from "../db/db";
import { describeSync, evalWarning } from "../lib/sync";
import type { SyncTone } from "../lib/sync";
import { TABLE_LABELS } from "../lib/backup";
import {
  isUploadDone,
  localStoreTotal,
  markUploadDone,
  previewUpload,
  runUpload,
} from "../lib/cloudUpload";
import type { UploadPlan } from "../lib/upload";

import ConfirmDialog from "./ConfirmDialog";
import { Button, Card } from "./ui";

export default function SyncSection() {
  if (!cloudConfigured) {
    return (
      <Card className="mb-6">
        <p className="text-sm text-ink-2">
          Đồng bộ chưa được cấu hình (chưa tạo database Dexie Cloud). App vẫn chạy bình thường, dữ liệu
          chỉ nằm trên máy này.
        </p>
      </Card>
    );
  }
  if (activeStore === "demo") {
    return (
      <Card className="mb-6">
        <p className="text-sm text-ink-2">
          Đang ở chế độ dữ liệu mẫu. Dữ liệu mẫu <strong className="text-ink">không bao giờ</strong> được
          đồng bộ. Tắt dữ liệu mẫu để đăng nhập hoặc xem trạng thái đồng bộ.
        </p>
      </Card>
    );
  }
  if (activeStore === "local") return <SignInCard />;
  return <CloudAccount />;
}

/* ------------------------------------------------------------ Chưa đăng nhập */

function SignInCard() {
  const [confirm, setConfirm] = useState(false);

  function start() {
    // Bật công tắc rồi tải lại: app mở kho cloud và hỏi email ngay.
    setSyncEnabled(true);
    window.location.reload();
  }

  return (
    <Card className="mb-6">
      <p className="mb-3 text-sm text-ink-2">
        Đăng nhập bằng email để có cùng dữ liệu trên điện thoại và laptop. Chưa đăng nhập thì mọi thứ
        chỉ nằm trên máy này, như hiện tại.
      </p>
      <Button onClick={() => setConfirm(true)} className="w-full">
        Đăng nhập để đồng bộ
      </Button>

      <ConfirmDialog
        open={confirm}
        destructive={false}
        title="Bật đồng bộ?"
        detail={
          <>
            App sẽ tải lại và hỏi email của bạn. Dexie Cloud gửi một mã dùng một lần, không cần mật khẩu.
            <br />
            <br />
            Dữ liệu đang có trên máy này <strong>vẫn giữ nguyên</strong> và chưa được gửi đi. Sau khi đăng
            nhập, bạn tự chọn có đưa nó lên tài khoản hay không.
          </>
        }
        confirmLabel="Tiếp tục"
        onConfirm={start}
        onCancel={() => setConfirm(false)}
      />
    </Card>
  );
}

/* ------------------------------------------------------------ Đã đăng nhập */

const TONE_CLASS: Record<SyncTone, string> = {
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad-ink",
  neutral: "text-ink",
};

/** navigator.onLine, cập nhật khi mất / có mạng. */
function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

function CloudAccount() {
  const user = useObservable(db.cloud.currentUser);
  const syncState = useObservable(db.cloud.syncState);
  const online = useOnline();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const status = describeSync(syncState, online);
  const warning = evalWarning(user?.license);

  async function logout() {
    setConfirmLogout(false);
    setLogoutError(null);
    try {
      // Còn thay đổi chưa đồng bộ thì addon tự hỏi lại (CloudLoginDialog).
      await db.cloud.logout();
    } catch {
      setLogoutError("Chưa đăng xuất. Chờ có mạng cho đồng bộ xong rồi thử lại.");
      return;
    }
    setSyncEnabled(false);
    window.location.reload();
  }

  return (
    <>
      <Card className="mb-4">
        <div className="text-xs font-semibold tracking-wider text-ink-2 uppercase">Tài khoản</div>
        <div className="mt-1 text-sm font-semibold break-all text-ink">
          {user?.isLoggedIn ? user.email : "Chưa đăng nhập"}
        </div>

        <div className="mt-3 text-xs font-semibold tracking-wider text-ink-2 uppercase">Trạng thái</div>
        <div className={`mt-1 text-sm font-bold ${TONE_CLASS[status.tone]}`} aria-live="polite">
          {status.label}
        </div>
        {status.detail && <p className="mt-1 text-sm text-ink-2">{status.detail}</p>}

        {warning && (
          <p className="mt-3 rounded-lg border border-warn/30 bg-warn/10 p-3 text-sm text-warn">{warning}</p>
        )}

        {logoutError && <p className="mt-3 text-sm text-bad-ink">{logoutError}</p>}

        {user?.isLoggedIn && (
          <Button variant="secondary" onClick={() => setConfirmLogout(true)} className="mt-4 w-full">
            Đăng xuất
          </Button>
        )}
      </Card>

      <UploadCard ready={syncState?.phase === "in-sync"} />

      <ConfirmDialog
        open={confirmLogout}
        destructive={false}
        title="Đăng xuất khỏi đồng bộ?"
        detail={
          <>
            Bản sao dữ liệu tài khoản trên <strong>máy này</strong> sẽ được gỡ. Dữ liệu trên tài khoản và trên
            các máy khác <strong>không bị ảnh hưởng</strong>; đăng nhập lại là có đủ.
            <br />
            <br />
            Sau khi đăng xuất, app quay về kho trên máy — tức dữ liệu như lúc trước khi bạn đăng nhập.
          </>
        }
        confirmLabel="Đăng xuất"
        onConfirm={() => void logout()}
        onCancel={() => setConfirmLogout(false)}
      />
    </>
  );
}

/* ------------------------------------------------------------ Đưa dữ liệu cũ lên */

/**
 * "Đưa dữ liệu trên máy này lên tài khoản".
 * Chỉ hiện khi kho trên máy có dữ liệu và chưa đưa lên lần nào.
 * `ready` = đồng bộ lần đầu đã xong; trước đó chưa biết tài khoản có gì,
 * nên chưa cho so sánh (tránh tưởng nhầm mọi thứ đều "mới").
 */
function UploadCard({ ready }: { ready: boolean }) {
  const [done, setDone] = useState(isUploadDone);
  const [localTotal, setLocalTotal] = useState<number | null>(null);
  const [plan, setPlan] = useState<UploadPlan | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!done) void localStoreTotal().then(setLocalTotal);
  }, [done]);

  if (result) {
    return (
      <Card className="mb-6 border-good/30 bg-good/10">
        <p className="text-sm font-semibold text-good">{result}</p>
      </Card>
    );
  }
  if (done || localTotal === null || localTotal === 0) return null;

  async function showPreview() {
    setError(null);
    setBusy(true);
    try {
      setPlan(await previewUpload());
    } catch (e) {
      setError(`Không đọc được dữ liệu trên máy: ${(e as Error).message}`);
    }
    setBusy(false);
  }

  async function doUpload() {
    setConfirm(false);
    setBusy(true);
    try {
      const added = await runUpload();
      markUploadDone();
      setDone(true);
      setResult(
        `Đã đưa ${added} bản ghi lên tài khoản. Kho trên máy vẫn giữ nguyên bản cũ để phòng hờ.`
      );
    } catch (e) {
      // Một transaction: lỗi thì không bản ghi nào được thêm.
      setError(`Chưa đưa lên được, không có gì thay đổi. Chi tiết: ${(e as Error).message}`);
    }
    setBusy(false);
  }

  return (
    <Card className="mb-6">
      <div className="text-sm font-bold text-ink">Đưa dữ liệu trên máy này lên tài khoản</div>
      <p className="mt-1 text-sm text-ink-2">
        Máy này có <span className="font-num font-semibold text-ink">{localTotal}</span> bản ghi từ trước khi
        đăng nhập. Chúng chưa được gửi đi. Đưa lên thì chỉ THÊM bản ghi chưa có; không xoá hay ghi đè gì
        trên tài khoản.
      </p>

      {!ready && (
        <p className="mt-3 text-sm text-warn">Chờ đồng bộ lần đầu xong (cần có mạng) rồi mới so sánh được.</p>
      )}

      {plan && (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-2">
              <th className="py-1 font-semibold">Bảng</th>
              <th className="py-1 text-right font-semibold">Thêm</th>
              <th className="py-1 text-right font-semibold">Đã có, bỏ qua</th>
            </tr>
          </thead>
          <tbody>
            {plan.rows
              .filter((r) => r.incoming > 0)
              .map((r) => (
                <tr key={r.table} className="border-t border-line">
                  <td className="py-1.5 text-ink">{TABLE_LABELS[r.table]}</td>
                  <td className="font-num py-1.5 text-right font-semibold text-ink">{r.toAdd}</td>
                  <td className="font-num py-1.5 text-right text-ink-2">{r.skipped}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {error && <p className="mt-3 text-sm text-bad-ink">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {!plan ? (
          <Button onClick={() => void showPreview()} disabled={!ready || busy} className="flex-1">
            {busy ? "Đang đọc..." : "Xem trước"}
          </Button>
        ) : (
          <Button
            onClick={() => setConfirm(true)}
            disabled={!ready || busy || plan.totalToAdd === 0}
            className="flex-1"
          >
            {busy ? "Đang đưa lên..." : plan.totalToAdd === 0 ? "Không có gì mới" : `Đưa ${plan.totalToAdd} bản ghi lên`}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            markUploadDone();
            setDone(true);
          }}
          disabled={busy}
        >
          Không cần
        </Button>
      </div>

      <ConfirmDialog
        open={confirm && plan !== null}
        destructive={false}
        title="Đưa dữ liệu lên tài khoản?"
        detail={
          plan && (
            <>
              <strong>{plan.totalToAdd} bản ghi</strong> từ máy này sẽ được thêm vào tài khoản và hiện trên
              mọi máy đã đăng nhập.
              {plan.totalSkipped > 0 && (
                <>
                  {" "}
                  <strong>{plan.totalSkipped} bản ghi</strong> đã có trên tài khoản sẽ được bỏ qua (giữ bản trên
                  tài khoản).
                </>
              )}
              <br />
              <br />
              Không có gì bị xoá: tài khoản chỉ được thêm, kho trên máy giữ nguyên.
            </>
          )
        }
        confirmLabel="Đưa lên"
        onConfirm={() => void doUpload()}
        onCancel={() => setConfirm(false)}
      />
    </Card>
  );
}
