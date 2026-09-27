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
  dismissUpload,
  getLastUpload,
  isDismissed,
  localStoreTotal,
  previewUpload,
  recordUpload,
  runUpload,
  uploadFingerprint,
} from "../lib/cloudUpload";
import { formatShortDate } from "../lib/dates";
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
        <div className="text-sm font-medium text-ink-2">Tài khoản</div>
        <div className="mt-1 text-sm font-semibold break-all text-ink">
          {user?.isLoggedIn ? user.email : "Chưa đăng nhập"}
        </div>

        <div className="mt-3 text-sm font-medium text-ink-2">Trạng thái</div>
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

      <UploadCard ready={syncState?.phase === "in-sync"} userId={user?.userId ?? ""} />

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
 *
 * Mỗi lần mở, thẻ tự so sánh kho trên máy với tài khoản ĐANG đăng nhập và
 * chỉ hiện khi còn bản ghi chưa có trên tài khoản — không còn dựa vào một cờ
 * "đã chuyển" cũ (audit F07). "Để sau" chỉ ẩn đúng bộ dữ liệu đang thấy.
 * `ready` = đồng bộ lần đầu đã xong; trước đó chưa biết tài khoản có gì,
 * nên chưa cho so sánh (tránh tưởng nhầm mọi thứ đều "mới").
 */
function UploadCard({ ready, userId }: { ready: boolean; userId: string }) {
  const [localTotal, setLocalTotal] = useState<number | null>(null);
  const [plan, setPlan] = useState<UploadPlan | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const lastUpload = getLastUpload();

  useEffect(() => {
    let alive = true;
    void localStoreTotal()
      .then(async (total) => {
        if (!alive) return;
        setLocalTotal(total);
        // Đồng bộ lần đầu xong mới so sánh được với tài khoản.
        if (total > 0 && ready) {
          const p = await previewUpload();
          if (alive) setPlan(p);
        }
      })
      .catch((e: Error) => alive && setError(`Không đọc được dữ liệu trên máy: ${e.message}`));
    return () => {
      alive = false;
    };
  }, [ready, userId]);

  if (result) {
    return (
      <Card className="mb-6 border-good/30 bg-good/10">
        <p className="text-sm font-semibold text-good">{result}</p>
      </Card>
    );
  }
  if (localTotal === null || localTotal === 0) return null;
  // Đã so sánh xong và tài khoản có đủ -> không cần thẻ nào.
  if (plan && plan.totalToAdd === 0) return null;
  const fingerprint = plan ? uploadFingerprint(userId, plan) : null;
  if (dismissed || (fingerprint !== null && isDismissed(fingerprint))) return null;

  async function doUpload() {
    setConfirm(false);
    setBusy(true);
    try {
      const added = await runUpload();
      recordUpload();
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
        {plan ? (
          <>
            Kho trên máy có <span className="font-num font-semibold text-ink">{plan.totalToAdd}</span> bản ghi
            chưa có trên tài khoản này.
          </>
        ) : (
          <>
            Kho trên máy có <span className="font-num font-semibold text-ink">{localTotal}</span> bản ghi ghi lúc
            chưa đăng nhập.
          </>
        )}{" "}
        Đưa lên thì chỉ THÊM bản ghi chưa có; không xoá hay ghi đè gì trên tài khoản.
        {lastUpload && (
          <span className="text-ink-3"> Lần đưa lên gần nhất: {formatShortDate(lastUpload.slice(0, 10))}.</span>
        )}
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
        <Button onClick={() => setConfirm(true)} disabled={!ready || !plan || busy} className="flex-1">
          {busy ? "Đang đưa lên..." : plan ? `Đưa ${plan.totalToAdd} bản ghi lên` : "Đang so sánh..."}
        </Button>
        {fingerprint && (
          <Button
            variant="ghost"
            onClick={() => {
              dismissUpload(fingerprint);
              setDismissed(true);
            }}
            disabled={busy}
          >
            Để sau
          </Button>
        )}
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
