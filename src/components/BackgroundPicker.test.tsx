/**
 * @vitest-environment happy-dom
 *
 * Test hộp chọn hình nền và việc đổi nền không làm sai phiên học.
 */
import "fake-indexeddb/auto";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PlayerStatus } from "./YouTubePlayer";

// Player YouTube thật cần mạng + thư viện của YouTube. Ở đây thay bằng bản giả
// để test tự điều khiển trạng thái: đang tải / bị chặn tự phát / đang phát / lỗi.
const player = vi.hoisted(() => ({
  report: null as null | ((s: PlayerStatus) => void),
  reports: {} as Record<string, (s: PlayerStatus) => void>,
  mounted: [] as string[],
}));
vi.mock("./YouTubePlayer", () => ({
  default: (props: { videoId: string; variant?: string; onStatus?: (s: PlayerStatus) => void }) => {
    player.report = props.onStatus ?? null;
    if (props.onStatus) player.reports[props.variant ?? "interactive"] = props.onStatus;
    player.mounted.push(props.videoId);
    return <div data-testid={`yt-${props.variant ?? "interactive"}`} data-video={props.videoId} />;
  },
}));

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
  it("có nhóm YouTube, ba nhóm cảnh có sẵn và ba nút như bố cục reference", () => {
    setup();
    for (const g of [
      "YouTube · Study with me",
      "Cảnh có sẵn · Thành phố buổi sáng",
      "Cảnh có sẵn · Thành phố về đêm",
      "Cảnh có sẵn · Study with me",
    ]) {
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

  it("dán link YouTube -> xem trước TRONG hộp (player có nút bấm), phía sau giữ nền cũ", () => {
    const { props } = setup();
    fireEvent.change(screen.getByLabelText(/Link YouTube/), {
      target: { value: "https://youtu.be/HFM-EHduRrQ?si=abc" },
    });
    expect(screen.getByText(/Link YouTube: video YouTube làm cảnh nền/)).toBeTruthy();
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByTestId("yt-interactive").getAttribute("data-video")).toBe("HFM-EHduRrQ");
    // Phía sau hộp giữ nguyên nền đã lưu cho tới khi Áp dụng.
    expect(props.onPreview).toHaveBeenLastCalledWith(null);
  });

  it("YouTube: Áp dụng bị khoá tới khi video THẬT SỰ phát", () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole("button", { name: "London dưới trăng" }));
    expect((applyButton() as HTMLButtonElement).disabled).toBe(true);

    act(() => player.report!({ state: "blocked", message: "Trình duyệt chưa cho tự phát — bấm ▶ trên video để phát." }));
    expect(screen.getByText(/chưa cho tự phát/)).toBeTruthy();
    expect((applyButton() as HTMLButtonElement).disabled).toBe(true);

    act(() => player.report!({ state: "playing" }));
    expect(screen.getByText(/Video đang phát/)).toBeTruthy();
    fireEvent.click(applyButton());
    expect(props.onApply).toHaveBeenCalledWith({ kind: "youtube", videoId: "AdV-Gt6KjzI" });
  });

  it("sửa link sang video khác: trạng thái 'đang phát' của video cũ không mở khoá Áp dụng", () => {
    const { props } = setup();
    const input = screen.getByLabelText(/Link YouTube/);
    fireEvent.change(input, { target: { value: "https://youtu.be/HFM-EHduRrQ" } });
    act(() => vi.advanceTimersByTime(500));
    act(() => player.report!({ state: "playing" }));
    expect((applyButton() as HTMLButtonElement).disabled).toBe(false);

    fireEvent.change(input, { target: { value: "https://youtu.be/AdV-Gt6KjzI" } });
    // Chưa hết nhịp chờ: vẫn là video cũ đang phát, nhưng Áp dụng phải khoá.
    expect((applyButton() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText(/Video đang phát/)).toBeNull();
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByTestId("yt-interactive").getAttribute("data-video")).toBe("AdV-Gt6KjzI");
    expect((applyButton() as HTMLButtonElement).disabled).toBe(true);
    act(() => player.report!({ state: "playing" }));
    fireEvent.click(applyButton());
    expect(props.onApply).toHaveBeenCalledWith({ kind: "youtube", videoId: "AdV-Gt6KjzI" });
  });

  it("YouTube: chủ video tắt nhúng -> báo lý do, không cho Áp dụng", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Mưa đêm New York" }));
    act(() => player.report!({ state: "error", message: "YouTube không cho phát video này trong app: chủ video tắt nhúng, hoặc video không còn / không công khai." }));
    expect(screen.getByText(/Không phát được: YouTube không cho phát video này/)).toBeTruthy();
    expect((applyButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it("link YouTube không có video (kênh) -> báo rõ", () => {
    setup();
    fireEvent.change(screen.getByLabelText(/Link YouTube/), { target: { value: "https://www.youtube.com/@SeanStudy" } });
    expect(screen.getByText(/không trỏ tới một video/)).toBeTruthy();
    expect((applyButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it("link file trực tiếp -> nhãn ảnh / video làm cảnh nền", () => {
    setup();
    fireEvent.change(screen.getByLabelText(/Link YouTube/), { target: { value: "https://example.com/canh.webm" } });
    expect(screen.getByText(/Link trực tiếp: ảnh \/ video làm cảnh nền/)).toBeTruthy();
  });

  it("tuỳ chọn hiển thị đổi NGAY, không cần Áp dụng", () => {
    const onVideoOn = vi.fn();
    const onDim = vi.fn();
    setup({ display: { videoOn: true, onVideoOn, dim: "normal", onDim } });
    fireEvent.click(screen.getByRole("switch"));
    expect(onVideoOn).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByRole("radio", { name: "Đậm" }));
    expect(onDim).toHaveBeenCalledWith("strong");
  });

  it("link video: Áp dụng bị khoá tới khi tải được thật", () => {
    const { props, rerender } = setup();
    fireEvent.change(screen.getByLabelText(/Link YouTube/), { target: { value: "https://example.com/canh.mp4" } });
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

    fireEvent.click(screen.getByRole("button", { name: "Cài đặt phiên" }));
    fireEvent.click(screen.getByRole("button", { name: "Singapore về đêm" }));
    act(() => vi.advanceTimersByTime(10_000));
    fireEvent.click(applyButton());

    // 10 giây trôi qua trong lúc chọn nền -> 01:15, không reset về 00:00.
    expect(screen.getByText("01:15")).toBeTruthy();
    expect(localStorage.getItem("learning-os:timer-started-at")).toBe(String(startedAt));
    expect(localStorage.getItem("learning-os:timer-distractions")).toBe("2");
    expect(JSON.parse(localStorage.getItem(BACKGROUND_KEY)!)).toEqual({ kind: "preset", id: "city-night-singapore" });
  });

  it("YouTube làm cảnh nền phủ kín, KHÔNG nhận chạm; đồng hồ và nút nằm ngoài lớp nền", () => {
    localStorage.setItem(BACKGROUND_KEY, JSON.stringify({ kind: "youtube", videoId: "HFM-EHduRrQ" }));
    render(<FocusSession startedAt={Date.now() - 5000} onExit={() => {}} />);
    const bg = screen.getByTestId("yt-background");
    const layer = bg.closest("[aria-hidden=true]") as HTMLElement;
    expect(layer.className).toContain("pointer-events-none");
    expect(layer.className).toContain("fixed");
    for (const el of [screen.getByText("00:05"), screen.getByRole("button", { name: "Hoàn thành phiên" })]) {
      expect(layer.contains(el)).toBe(false);
    }
  });

  it("bật/tắt video nền: tắt thì gỡ video (gradient tĩnh), bật lại dùng đúng video; đồng hồ không reset", () => {
    vi.setSystemTime(new Date("2026-09-26T09:00:00"));
    const startedAt = Date.now() - 30_000;
    localStorage.setItem("learning-os:timer-started-at", String(startedAt));
    localStorage.setItem(BACKGROUND_KEY, JSON.stringify({ kind: "youtube", videoId: "AdV-Gt6KjzI" }));
    render(<FocusSession startedAt={startedAt} onExit={() => {}} />);
    expect(screen.getByTestId("yt-background")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Tắt video nền" }));
    expect(screen.queryByTestId("yt-background")).toBeNull();
    expect(localStorage.getItem("learning-os:focus-video")).toBe("off");
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText("00:35")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Bật video nền" }));
    expect(screen.getByTestId("yt-background").getAttribute("data-video")).toBe("AdV-Gt6KjzI");
    expect(localStorage.getItem("learning-os:timer-started-at")).toBe(String(startedAt));
  });

  it("tự phát bị chặn: nút Phát video của app, không phải nút trong player", () => {
    localStorage.setItem(BACKGROUND_KEY, JSON.stringify({ kind: "youtube", videoId: "HFM-EHduRrQ" }));
    render(<FocusSession startedAt={Date.now()} onExit={() => {}} />);
    act(() => player.reports.background!({ state: "blocked", message: "x" }));
    expect(screen.getByRole("button", { name: "Phát video" })).toBeTruthy();
  });

  it("video YouTube lỗi giữa phiên: nền tĩnh + thông báo, đồng hồ vẫn chạy", () => {
    vi.setSystemTime(new Date("2026-09-26T09:00:00"));
    const startedAt = Date.now() - 60_000;
    localStorage.setItem(BACKGROUND_KEY, JSON.stringify({ kind: "youtube", videoId: "HFM-EHduRrQ" }));
    render(<FocusSession startedAt={startedAt} onExit={() => {}} />);
    act(() => player.reports.background!({ state: "error", message: "Video không tồn tại hoặc đã chuyển sang riêng tư." }));
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText(/Video nền không phát được: Video không tồn tại/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Đổi nền" })).toBeTruthy();
    expect(screen.getByText("01:03")).toBeTruthy();
  });

  it("Huỷ trong hộp chọn giữ nguyên nền đã lưu", () => {
    localStorage.setItem(BACKGROUND_KEY, JSON.stringify({ kind: "preset", id: "city-day-tokyo" }));
    render(<FocusSession startedAt={Date.now()} onExit={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Cài đặt phiên" }));
    fireEvent.click(screen.getByRole("button", { name: "Singapore về đêm" }));
    fireEvent.click(screen.getByRole("button", { name: "Huỷ" }));
    expect(JSON.parse(localStorage.getItem(BACKGROUND_KEY)!)).toEqual({ kind: "preset", id: "city-day-tokyo" });
  });
});
