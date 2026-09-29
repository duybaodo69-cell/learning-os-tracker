/**
 * @vitest-environment happy-dom
 *
 * Hồi quy 2026-09-29: hàng chip cuộn ngang gọi scrollIntoView mỗi lần vẽ lại,
 * kéo cả trang về hàng chip — form kết thúc phiên (vẽ lại mỗi giây vì đồng hồ)
 * không vuốt xuống được tới nút Lưu.
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChipGroup } from "./ui";

afterEach(() => cleanup());

describe("ChipGroup scroll", () => {
  it("vẽ lại (vd mỗi giây) không bao giờ cuộn trang: không gọi scrollIntoView", () => {
    const spy = vi.fn();
    Element.prototype.scrollIntoView = spy;
    const props = { options: ["A", "B", "C"] as const, onChange: () => {}, scroll: true };
    const { rerender } = render(<ChipGroup {...props} value="C" />);
    for (let i = 0; i < 5; i++) rerender(<ChipGroup {...props} value="C" />);
    rerender(<ChipGroup {...props} value="B" />);
    expect(spy).not.toHaveBeenCalled();
  });
});
