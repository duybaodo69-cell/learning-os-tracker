/**
 * Chữ tiếng Việt cho trạng thái đồng bộ và thông báo đăng nhập.
 *
 * Hàm thuần, không đụng tới Dexie Cloud — nhận vào đúng kiểu dữ liệu addon
 * đưa ra, trả về câu chữ để hiện. Có test trong sync.test.ts.
 */
import type { SyncState } from "dexie-cloud-addon";

export type SyncTone = "good" | "warn" | "bad" | "neutral";

export type SyncDescription = {
  /** Một trong: Đã đồng bộ / Đang đồng bộ / Offline / Lỗi đồng bộ / Đồng bộ đã dừng */
  label: string;
  tone: SyncTone;
  detail?: string;
};

/**
 * Trạng thái đồng bộ hiện tại.
 * `online` = navigator.onLine — trình duyệt biết mất mạng sớm hơn addon.
 */
export function describeSync(state: SyncState | undefined, online: boolean): SyncDescription {
  if (state?.license === "expired" || state?.license === "deactivated") {
    return {
      label: "Đồng bộ đã dừng",
      tone: "bad",
      detail:
        "Tài khoản hết hạn dùng thử. Vào trang quản lý Dexie Cloud, chuyển tài khoản sang production (miễn phí cho tối đa 3 người). Dữ liệu trên máy vẫn còn.",
    };
  }
  if (!online || state?.phase === "offline" || state?.status === "offline") {
    return {
      label: "Offline",
      tone: "warn",
      detail: "Vẫn ghi bình thường. Có mạng lại là tự đồng bộ.",
    };
  }
  if (state?.phase === "error" || state?.status === "error") {
    return {
      label: "Lỗi đồng bộ",
      tone: "bad",
      detail: state.error?.message
        ? `Sẽ tự thử lại. Chi tiết: ${state.error.message}`
        : "Sẽ tự thử lại.",
    };
  }
  if (state?.phase === "in-sync") {
    return { label: "Đã đồng bộ", tone: "good" };
  }
  // initial / not-in-sync / pushing / pulling, hoặc chưa có thông tin.
  return { label: "Đang đồng bộ", tone: "neutral" };
}

/** Thông tin giấy phép của người dùng, đúng dạng addon đưa ra (UserLogin.license). */
export type UserLicense = {
  type: "demo" | "eval" | "prod" | "client";
  status: "ok" | "expired" | "deactivated";
  evalDaysLeft?: number;
};

/**
 * Cảnh báo khi tài khoản còn ở chế độ dùng thử ("evaluation").
 * Sau 30 ngày dùng thử, Dexie Cloud NGỪNG đồng bộ cho tới khi tài khoản
 * được chuyển sang production. null = không cần cảnh báo.
 */
export function evalWarning(license: UserLicense | undefined): string | null {
  if (!license || license.type !== "eval") return null;
  const days =
    typeof license.evalDaysLeft === "number" ? `còn ${license.evalDaysLeft} ngày` : "có hạn 30 ngày";
  return `Tài khoản đang ở chế độ dùng thử (${days}). Hết hạn là ngừng đồng bộ — hãy chuyển sang production trong trang quản lý Dexie Cloud (miễn phí).`;
}

/** Một thông báo trong hộp đăng nhập, đúng dạng addon đưa ra (DXCAlert). */
export type LoginAlert = {
  type: "error" | "warning" | "info";
  messageCode: string;
  message: string;
  messageParams: { [name: string]: string };
};

/**
 * Dịch thông báo của hộp đăng nhập sang tiếng Việt theo mã thông báo.
 * Mã lạ thì giữ câu tiếng Anh gốc — thà hiện tiếng Anh còn hơn giấu lỗi.
 */
export function translateLoginAlert(alert: LoginAlert): string {
  const p = alert.messageParams;
  switch (alert.messageCode) {
    case "OTP_SENT":
      return `Đã gửi mã tới ${p.email ?? "email của bạn"}. Mở hộp thư (xem cả mục Spam) và nhập mã vào đây.`;
    case "INVALID_OTP":
      return "Mã không đúng hoặc đã hết hạn. Kiểm tra lại, hoặc bấm Huỷ rồi đăng nhập lại để nhận mã mới.";
    case "INVALID_EMAIL":
      return "Email không hợp lệ.";
    case "LICENSE_LIMIT_REACHED":
    case "NO_SEATS_AVAILABLE":
      return "Database đã hết chỗ cho người dùng mới.";
    case "USER_NOT_REGISTERED":
    case "USER_NOT_ACCEPTED":
      return "Email này chưa được phép dùng database này.";
    case "USER_DEACTIVATED":
      return "Tài khoản này đã bị vô hiệu hoá.";
    case "LOGOUT_CONFIRMATION":
      return `Còn ${p.numUnsyncedChanges ?? "một số"} thay đổi chưa kịp đồng bộ. Đăng xuất bây giờ thì các thay đổi đó sẽ MẤT. Nên bấm Huỷ, chờ có mạng cho đồng bộ xong rồi hẵng đăng xuất.`;
    default:
      // Thay {tên} trong câu gốc bằng giá trị thật.
      return alert.message.replace(/\{(\w+)\}/g, (_, k: string) => p[k] ?? "");
  }
}
