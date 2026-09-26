/** Test chữ hiển thị cho trạng thái đồng bộ và thông báo đăng nhập. */
import { describe, expect, it } from "vitest";
import { describeSync, evalWarning, translateLoginAlert } from "./sync";

describe("describeSync", () => {
  it("đồng bộ xong -> Đã đồng bộ, màu tốt", () => {
    expect(describeSync({ status: "connected", phase: "in-sync" }, true)).toMatchObject({
      label: "Đã đồng bộ",
      tone: "good",
    });
  });

  it("đang đẩy / kéo / mới bắt đầu -> Đang đồng bộ", () => {
    for (const phase of ["initial", "not-in-sync", "pushing", "pulling"] as const) {
      expect(describeSync({ status: "connected", phase }, true).label).toBe("Đang đồng bộ");
    }
    expect(describeSync(undefined, true).label).toBe("Đang đồng bộ");
  });

  it("trình duyệt báo mất mạng thì là Offline, dù addon chưa kịp biết", () => {
    expect(describeSync({ status: "connected", phase: "in-sync" }, false).label).toBe("Offline");
  });

  it("addon báo offline -> Offline", () => {
    expect(describeSync({ status: "offline", phase: "offline" }, true).label).toBe("Offline");
  });

  it("lỗi -> Lỗi đồng bộ, kèm chi tiết", () => {
    const d = describeSync({ status: "error", phase: "error", error: new Error("timeout") }, true);
    expect(d.label).toBe("Lỗi đồng bộ");
    expect(d.tone).toBe("bad");
    expect(d.detail).toContain("timeout");
  });

  it("hết hạn dùng thử thắng mọi trạng thái khác", () => {
    const d = describeSync({ status: "connected", phase: "in-sync", license: "expired" }, true);
    expect(d.label).toBe("Đồng bộ đã dừng");
    expect(d.detail).toContain("production");
  });
});

describe("evalWarning", () => {
  it("tài khoản dùng thử -> cảnh báo kèm số ngày còn lại", () => {
    expect(evalWarning({ type: "eval", status: "ok", evalDaysLeft: 12 })).toContain("còn 12 ngày");
  });
  it("tài khoản production hoặc chưa biết -> không cảnh báo", () => {
    expect(evalWarning({ type: "prod", status: "ok" })).toBeNull();
    expect(evalWarning(undefined)).toBeNull();
  });
});

describe("translateLoginAlert", () => {
  it("dịch thông báo đã gửi mã, có chèn email", () => {
    const t = translateLoginAlert({
      type: "info",
      messageCode: "OTP_SENT",
      message: "A One-Time password has been sent to {email}",
      messageParams: { email: "test@example.com" },
    });
    expect(t).toContain("test@example.com");
    expect(t).toContain("Đã gửi mã");
  });

  it("cảnh báo đăng xuất có số thay đổi chưa đồng bộ", () => {
    const t = translateLoginAlert({
      type: "warning",
      messageCode: "LOGOUT_CONFIRMATION",
      message: "{numUnsyncedChanges} unsynced changes will get lost!",
      messageParams: { numUnsyncedChanges: "3" },
    });
    expect(t).toContain("3 thay đổi");
  });

  it("mã lạ thì giữ câu gốc và thay tham số", () => {
    const t = translateLoginAlert({
      type: "error",
      messageCode: "SOMETHING_NEW",
      message: "Hello {name}",
      messageParams: { name: "An" },
    });
    expect(t).toBe("Hello An");
  });
});
