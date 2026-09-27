/**
 * @vitest-environment happy-dom
 *
 * Test cho cỡ hiển thị 100 / 125 / 150%.
 */
import { beforeEach, describe, expect, it } from "vitest";
// ?raw: Vite nạp file thành chuỗi — để kiểm tra index.html khớp với code.
// (index.css không kiểm được ở đây: vitest thay mọi file CSS bằng chuỗi rỗng.
// Cỡ chữ thật ở 125/150% được đo trong Chrome — xem CLAUDE.md.)
import html from "../../index.html?raw";
import { UI_SCALE_KEY, applyUiScale, getUiScale, parseUiScale, setUiScale, uiScaleFactor } from "./uiScale";

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.scale;
});

describe("parseUiScale", () => {
  it("nhận đúng ba mức", () => {
    expect(parseUiScale("100")).toBe(100);
    expect(parseUiScale("125")).toBe(125);
    expect(parseUiScale("150")).toBe(150);
  });

  it("giá trị lạ / thiếu thì 100, không làm vỡ app", () => {
    for (const raw of [null, undefined, "", "200", "abc", "1.5", "-125"]) {
      expect(parseUiScale(raw)).toBe(100);
    }
  });
});

describe("getUiScale / setUiScale", () => {
  it("mặc định 100%", () => {
    expect(getUiScale()).toBe(100);
    expect(uiScaleFactor()).toBe(1);
  });

  it("lưu trên máy và đặt data-scale lên <html>", () => {
    setUiScale(150);
    expect(localStorage.getItem(UI_SCALE_KEY)).toBe("150");
    expect(getUiScale()).toBe(150);
    expect(uiScaleFactor()).toBe(1.5);
    expect(document.documentElement.dataset.scale).toBe("150");
  });

  it("về 100% thì bỏ thuộc tính (dùng cỡ mặc định)", () => {
    applyUiScale(125);
    applyUiScale(100);
    expect(document.documentElement.dataset.scale).toBeUndefined();
  });
});

describe("index.html khớp với uiScale.ts", () => {
  it("script trước khi vẽ đọc đúng khoá", () => {
    expect(html).toContain(UI_SCALE_KEY);
  });

  it("viewport không chặn chụm ngón tay để zoom", () => {
    const viewport = html.match(/<meta name="viewport"[^>]*>/)?.[0] ?? "";
    expect(viewport).not.toMatch(/user-scalable\s*=\s*no/);
    expect(viewport).not.toMatch(/maximum-scale/);
  });
});
