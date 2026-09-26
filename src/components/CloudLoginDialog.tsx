/**
 * Hộp đăng nhập Dexie Cloud bằng tiếng Việt.
 *
 * Addon Dexie Cloud không tự vẽ giao diện (vì `customLoginGui: true` trong
 * db.ts). Mỗi khi nó cần hỏi người dùng — nhập email, nhập mã, xác nhận
 * đăng xuất — nó phát một "userInteraction". Component này nghe và vẽ hộp
 * tương ứng, rồi trả câu trả lời lại qua `onSubmit` / `onCancel`.
 *
 * Chỉ được gắn vào App khi đang mở kho cloud (`activeStore === "cloud"`).
 *
 * Huỷ ở bước email hoặc mã = không muốn đồng bộ nữa: tắt công tắc đồng bộ
 * và tải lại trang, app quay về kho trên máy y như trước.
 */
import { useState } from "react";
import { useObservable } from "dexie-react-hooks";
import type { DXCUserInteraction } from "dexie-cloud-addon";

import { db, setSyncEnabled } from "../db/db";
import { translateLoginAlert } from "../lib/sync";
import { Button } from "./ui";

export default function CloudLoginDialog() {
  const interaction = useObservable(db.cloud.userInteraction);
  if (!interaction) return null;
  // key: mỗi lần addon hỏi câu mới thì ô nhập được làm trống lại.
  return <LoginPrompt key={`${interaction.type}-${interaction.alerts.length}`} interaction={interaction} />;
}

/** Tiêu đề tiếng Việt cho từng loại câu hỏi (bỏ qua tiêu đề tiếng Anh của addon). */
const TITLES: Record<string, string> = {
  email: "Đăng nhập để đồng bộ",
  otp: "Nhập mã đăng nhập",
  "logout-confirmation": "Đăng xuất?",
  "message-alert": "Thông báo",
};

function LoginPrompt({ interaction }: { interaction: DXCUserInteraction }) {
  const [value, setValue] = useState("");
  const [sent, setSent] = useState(false);

  const isEmail = interaction.type === "email";
  const isOtp = interaction.type === "otp";
  const hasInput = isEmail || isOtp;

  function submit() {
    if (hasInput && value.trim() === "") return;
    setSent(true);
    if (isEmail) interaction.onSubmit({ email: value.trim() });
    else if (isOtp) interaction.onSubmit({ otp: value.trim() });
    else interaction.onSubmit({});
  }

  function cancel() {
    interaction.onCancel();
    // Huỷ đăng nhập = quay về kho trên máy. Huỷ đăng xuất thì giữ nguyên.
    if (hasInput) {
      setSyncEnabled(false);
      window.location.reload();
    }
  }

  const submitLabel = isEmail
    ? "Gửi mã"
    : isOtp
      ? "Đăng nhập"
      : interaction.type === "logout-confirmation"
        ? "Vẫn đăng xuất"
        : "OK";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4">
      <div
        className="w-full max-w-md rounded-lg border border-accent/60 bg-surface-2 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.65)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-login-title"
      >
        <h2 id="cloud-login-title" className="text-lg font-bold text-ink">
          {TITLES[interaction.type] ?? interaction.title}
        </h2>

        {isEmail && (
          <p className="mt-2 text-sm text-ink-2">
            Nhập email. Dexie Cloud sẽ gửi một mã dùng một lần — không cần mật khẩu.
          </p>
        )}

        {interaction.alerts.map((a, i) => (
          <p
            key={i}
            className={`mt-3 rounded-lg border p-3 text-sm ${
              a.type === "error"
                ? "border-bad/40 bg-bad/10 text-bad-ink"
                : a.type === "warning"
                  ? "border-warn/40 bg-warn/10 text-warn"
                  : "border-line bg-surface text-ink"
            }`}
          >
            {translateLoginAlert(a)}
          </p>
        ))}

        {hasInput && (
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              type={isEmail ? "email" : "text"}
              inputMode={isEmail ? "email" : "text"}
              autoComplete={isEmail ? "email" : "one-time-code"}
              autoCapitalize="off"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={isEmail ? "ban@vidu.com" : "Mã trong email"}
              className="tap-target w-full rounded-lg border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-3 focus:border-accent focus:outline focus:outline-1 focus:outline-accent"
            />
          </form>
        )}

        <div className="mt-4 flex gap-2">
          {interaction.type !== "message-alert" && (
            <Button variant="secondary" onClick={cancel} className="flex-1">
              Huỷ
            </Button>
          )}
          <Button
            variant={interaction.type === "logout-confirmation" ? "danger" : "primary"}
            onClick={submit}
            disabled={sent || (hasInput && value.trim() === "")}
            className="flex-1"
          >
            {sent ? "Đang gửi..." : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
