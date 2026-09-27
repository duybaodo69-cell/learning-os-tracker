import { describe, expect, it } from "vitest";
import { keyboardInset, overlayPadding } from "./viewport";

describe("keyboardInset", () => {
  it("không có visualViewport (trình duyệt cũ) thì 0", () => {
    expect(keyboardInset(800, null)).toBe(0);
    expect(keyboardInset(800, undefined)).toBe(0);
  });

  it("bàn phím đóng: vùng nhìn thấy = cả trang", () => {
    expect(keyboardInset(800, { height: 800, offsetTop: 0 })).toBe(0);
  });

  it("bàn phím mở: phần bị che ở đáy", () => {
    expect(keyboardInset(844, { height: 504, offsetTop: 0 })).toBe(340);
  });

  it("trang bị cuộn lên theo ô nhập (iPhone): trừ phần đã cuộn", () => {
    expect(keyboardInset(844, { height: 504, offsetTop: 100 })).toBe(240);
  });

  it("chênh lệch dưới 1px do làm tròn khi zoom thì bỏ qua", () => {
    expect(keyboardInset(800, { height: 799.4, offsetTop: 0 })).toBe(0);
  });

  it("đang zoom bằng hai ngón (vùng nhìn thấy nhỏ, cuộn giữa trang): không âm", () => {
    expect(keyboardInset(800, { height: 400, offsetTop: 500 })).toBe(0);
  });

  it("đang zoom bằng hai ngón ở đầu trang: không nhầm là bàn phím", () => {
    expect(keyboardInset(800, { height: 400, offsetTop: 0, scale: 2 })).toBe(0);
    expect(keyboardInset(800, { height: 460, offsetTop: 0, scale: 1 })).toBe(340);
  });
});

describe("overlayPadding", () => {
  it("không có bàn phím: tránh thanh home", () => {
    expect(overlayPadding(0).paddingBottom).toBe("max(1rem, env(safe-area-inset-bottom))");
  });

  it("có bàn phím: đẩy hộp thoại lên trên bàn phím", () => {
    expect(overlayPadding(300).paddingBottom).toBe("calc(1rem + 300px)");
  });

  it("luôn tránh tai thỏ ở trên và hai bên", () => {
    const p = overlayPadding(0, "0px");
    expect(p.paddingTop).toBe("max(0px, env(safe-area-inset-top))");
    expect(p.paddingLeft).toBe("max(0px, env(safe-area-inset-left))");
    expect(p.paddingRight).toBe("max(0px, env(safe-area-inset-right))");
  });
});
