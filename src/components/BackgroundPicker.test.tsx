/**
 * @vitest-environment happy-dom
 *
 * Test hộp chọn hình nền và việc đổi nền không làm sai phiên học.
 */
import "fake-indexeddb/auto";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BackgroundPicker from "./BackgroundPicker";
import FocusSession from "../screens/FocusSession";
import { BACKGROUND_KEY } from "../lib/background";
import type { FocusBackground } from "../lib/background";

const NONE: FocusBackground = { kind: "none" };

function setup(overrides: Partial<Parameters<typeof BackgroundPicker>[0]> = {}) {
  const props = {
    saved: NONE,
    previewStatus: "none" as const,
    stillNote: null,
    onPreview: vi.fn(),
    onApply: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  const utils = render(<BackgroundPicker {...props} />);
  return { ...utils, props };
}

const applyButton = () => screen.getByRole("button", { name: /Áp dụng|Giữ nền này/ });

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("BackgroundPicker", () => {
  it("có đủ ba nhóm gợi ý và ba nút như bố cục reference", () => {
    setup();
    for (const g of ["Thành phố buổi sáng", "Thành phố về đêm", "Study with me"]) {
      expect(screen.getByText(g)).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: /Xoá nền/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Huỷ" })).toBeTruthy();
    expect(applyButton()).toBeTruthy();
  });

  it("chọn thumbnail -> xem trước, CHƯA lưu", () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Thượng Hải lên đèn" }));
    expect(props.onPreview).toHaveBeenLastCalledWith({ kind: "preset", id: "city-night-shanghai" });
    expect(props.onApply).not.toHaveBeenCalled();
  });

  it("Huỷ -> trả về nền cũ, không lưu gì", () => {
    const { props } = setup({ saved: { kind: "preset", id: "city-day-tokyo" } });
    fireEvent.click(screen.getByRole("button", { name: "Thượng Hải lên đèn" }));
    fireEvent.click(screen.getByRole("button", { name: "Huỷ" }));
    expect(props.onPreview).toHaveBeenLastCalledWith(null);
    expect(props.onClose).toHaveBeenCalled();
    expect(props.onApply).not.toHaveBeenCalled();
  });

  it("Áp dụng -> lưu đúng cảnh đã chọn", () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Mưa trên kính, phố đêm" }));
    fireEvent.click(applyButton());
    expect(props.onApply).toHaveBeenCalledWith({ kind: "preset", id: "window-rain-night" });
  });

  it("dán link YouTube -> báo rõ không dùng được, khoá Áp dụng, không xem trước", () => {
    const { props } = setup();
    fireEvent.change(screen.getByLabelText(/Link ảnh/), {
      target: { value: "https://www.youtube.com/watch?v=HFM-EHduRrQ" },
    });
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText(/Link YouTube không dùng làm nền được/)).toBeTruthy();
    expect((applyButton() as HTMLButtonElement).disabled).toBe(true);
    expect(props.onPreview).not.toHaveBeenCalled();
  });

  it("link video: Áp dụng bị khoá tới khi tải được thật", () => {
    const { props, rerender } = setup();
    fireEvent.change(screen.getByLabelText(/Link ảnh/), { target: { value: "https://example.com/canh.mp4" } });
    act(() => vi.advanceTimersByTime(500));
    expect(props.onPreview).toHaveBeenLastCalledWith({ kind: "url", url: "https://example.com/canh.mp4", media: "video" });

    rerender(<BackgroundPicker {...props} previewStatus="loading" />);
    expect((applyButton() as HTMLButtonElement).disabled).toBe(true);

    rerender(<BackgroundPicker {...props} previewStatus="error" />);
    expect(screen.getByText(/Không tải được link này/)).toBeTruthy();
    expect((applyButton() as HTMLButtonElement).disabled).toBe(true);

    rerender(<BackgroundPicker {...props} previewStatus="ready" />);
    expect((applyButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it("có ghi công tác giả và giấy phép cho video mẫu", () => {
    setup();
    expect(screen.getByText("Nguồn & giấy phép video")).toBeTruthy();
    expect(screen.getAllByText("CC0").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CC BY 3.0").length).toBeGreaterThan(0);
  });
});

describe("FocusSession — đổi nền không làm sai phiên học", () => {
  it("mở hộp chọn, xem trước, áp dụng: đồng hồ vẫn chạy từ đúng mốc bắt đầu", () => {
    vi.setSystemTime(new Date("2026-09-26T09:00:00"));
    const startedAt = Date.now() - 65_000; // đã chạy 1 phút 5 giây
    localStorage.setItem("learning-os:timer-started-at", String(startedAt));
    localStorage.setItem("learning-os:timer-distractions", "2");

    render(<FocusSession startedAt={startedAt} onExit={() => {}} />);
    expect(screen.getByText("01:05")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Hình nền/ }));
    fireEvent.click(screen.getByRole("button", { name: "Singapore về đêm" }));
    act(() => vi.advanceTimersByTime(10_000));
    fireEvent.click(applyButton());

    // 10 giây trôi qua trong lúc chọn nền -> 01:15, không reset về 00:00.
    expect(screen.getByText("01:15")).toBeTruthy();
    expect(localStorage.getItem("learning-os:timer-started-at")).toBe(String(startedAt));
    expect(localStorage.getItem("learning-os:timer-distractions")).toBe("2");
    expect(JSON.parse(localStorage.getItem(BACKGROUND_KEY)!)).toEqual({ kind: "preset", id: "city-night-singapore" });
  });

  it("Huỷ trong hộp chọn giữ nguyên nền đã lưu", () => {
    localStorage.setItem(BACKGROUND_KEY, JSON.stringify({ kind: "preset", id: "city-day-tokyo" }));
    render(<FocusSession startedAt={Date.now()} onExit={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Hình nền/ }));
    fireEvent.click(screen.getByRole("button", { name: "Singapore về đêm" }));
    fireEvent.click(screen.getByRole("button", { name: "Huỷ" }));
    expect(JSON.parse(localStorage.getItem(BACKGROUND_KEY)!)).toEqual({ kind: "preset", id: "city-day-tokyo" });
  });
});
