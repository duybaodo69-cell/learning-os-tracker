/**
 * @vitest-environment happy-dom
 *
 * Test cho chế độ tối / sáng.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { THEME_KEY, THEME_STATUS_COLOR, applyTheme, getTheme, setTheme } from "./theme";

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.head.innerHTML = '<meta name="theme-color" content="#000000" />';
});

describe("getTheme", () => {
  it("mặc định là tối", () => {
    expect(getTheme()).toBe("dark");
  });

  it("đọc lựa chọn đã lưu", () => {
    localStorage.setItem(THEME_KEY, "light");
    expect(getTheme()).toBe("light");
  });

  it("giá trị lạ thì quay về tối, không làm vỡ app", () => {
    localStorage.setItem(THEME_KEY, "tím");
    expect(getTheme()).toBe("dark");
  });
});

describe("setTheme / applyTheme", () => {
  it("đặt data-theme trên thẻ html và lưu lại", () => {
    setTheme("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
    expect(getTheme()).toBe("light");
  });

  it("đổi màu thanh trạng thái điện thoại theo theme", () => {
    applyTheme("light");
    expect(document.querySelector('meta[name="theme-color"]')!.getAttribute("content")).toBe(
      THEME_STATUS_COLOR.light
    );
    applyTheme("dark");
    expect(document.querySelector('meta[name="theme-color"]')!.getAttribute("content")).toBe(
      THEME_STATUS_COLOR.dark
    );
  });

  it("đổi qua đổi lại được", () => {
    setTheme("light");
    setTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(getTheme()).toBe("dark");
  });
});
