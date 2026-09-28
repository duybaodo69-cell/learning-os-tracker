/**
 * @vitest-environment happy-dom
 *
 * Thẻ đếm ngược (Hôm nay + tab IELTS): số ngày, trạng thái đang thi, tuần nhẹ
 * nhịp, hết lịch. Logic ngày nằm ở plan.test.ts; ở đây kiểm tra thẻ vẽ đúng.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import CountdownCard from "./CountdownCard";

afterEach(() => cleanup());

describe("CountdownCard", () => {
  it("28/9: thi thử 0, 5 ngày, ≈ 5 khung 9:30, 6 mốc trên đường tới 7.5", () => {
    render(<CountdownCard date="2026-09-28" />);
    expect(screen.getByText("Thi thử 0 · baseline, ở nhà")).toBeTruthy();
    expect(screen.getAllByText("5")).toHaveLength(2); // số lớn + "≈ 5 khung"
    expect(screen.getByText(/khung 9:30 nữa/)).toBeTruthy();
    expect(screen.getByText("T7 · 03/10")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
    expect(screen.getByText(/dưới 6.5 thì dời thi thật/)).toBeTruthy();
  });

  it("2/10: 'mai là ngày thi' thay cho số khung", () => {
    render(<CountdownCard date="2026-10-02" />);
    expect(screen.getByText(/Mai là ngày thi/)).toBeTruthy();
  });

  it("ngày thứ hai của thi thử 0: 'Hôm nay', thanh đầy", () => {
    render(<CountdownCard date="2026-10-04" />);
    expect(screen.getByText("Hôm nay")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100");
  });

  it("6/10: đếm tới thi thử 1 và nhắc tuần nhẹ nhịp", () => {
    render(<CountdownCard date="2026-10-06" />);
    expect(screen.getByText("Thi thử 1 · ở nhà")).toBeTruthy();
    expect(screen.getAllByText("40")).toHaveLength(2);
    expect(screen.getByText(/Tuần nhẹ nhịp/)).toBeTruthy();
  });

  it("sau thi thật: không vẽ gì", () => {
    const { container } = render(<CountdownCard date="2027-03-22" />);
    expect(container.textContent).toBe("");
  });
});
