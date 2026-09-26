/** Test kiểm tra link nền, đọc/ghi lựa chọn và phương án ảnh tĩnh. */
import { describe, expect, it } from "vitest";
import { checkBackgroundUrl, parseBackground, sameBackground, stillReason } from "./background";

describe("checkBackgroundUrl — YouTube luôn bị từ chối rõ ràng", () => {
  const links = [
    "https://www.youtube.com/watch?v=HFM-EHduRrQ",
    "https://youtube.com/watch?v=abc",
    "https://m.youtube.com/watch?v=abc",
    "https://youtu.be/HFM-EHduRrQ",
    "https://music.youtube.com/watch?v=abc",
    "https://www.youtube-nocookie.com/embed/abc",
    "https://www.youtube.com/shorts/abc",
  ];
  for (const link of links) {
    it(link, () => {
      const r = checkBackgroundUrl(link);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.reason).toBe("youtube");
        expect(r.message).toContain("YouTube");
      }
    });
  }

  it("tên miền chỉ giống YouTube thì không bị nhầm", () => {
    expect(checkBackgroundUrl("https://notyoutube.com/a.mp4").ok).toBe(true);
  });
});

describe("checkBackgroundUrl — loại file", () => {
  it("nhận ra ảnh qua đuôi file, kể cả khi có ?query", () => {
    expect(checkBackgroundUrl("https://x.com/a.JPG")).toMatchObject({ ok: true, media: "image" });
    expect(checkBackgroundUrl("https://x.com/a.gif?w=1200#top")).toMatchObject({ ok: true, media: "image" });
    expect(checkBackgroundUrl("https://x.com/a.webp")).toMatchObject({ ok: true, media: "image" });
  });

  it("nhận ra video mp4 / webm", () => {
    expect(checkBackgroundUrl("https://x.com/v.mp4")).toMatchObject({ ok: true, media: "video" });
    expect(checkBackgroundUrl("https://x.com/v.webm?t=1")).toMatchObject({ ok: true, media: "video" });
  });

  it("không có đuôi file -> chưa rõ loại, sẽ thử khi hiển thị", () => {
    expect(checkBackgroundUrl("https://images.example.com/photo/123")).toMatchObject({ ok: true, media: "unknown" });
  });

  it("bỏ khoảng trắng thừa khi dán", () => {
    expect(checkBackgroundUrl("  https://x.com/a.png  ")).toMatchObject({ ok: true, url: "https://x.com/a.png" });
  });
});

describe("checkBackgroundUrl — link không dùng được", () => {
  it("rỗng", () => {
    expect(checkBackgroundUrl("   ")).toMatchObject({ ok: false, reason: "empty" });
  });
  it("không phải link", () => {
    expect(checkBackgroundUrl("thanh pho ve dem")).toMatchObject({ ok: false, reason: "invalid" });
  });
  it("http thường bị chặn trong app https", () => {
    expect(checkBackgroundUrl("http://x.com/a.jpg")).toMatchObject({ ok: false, reason: "not-https" });
  });
  it("trang xem video (Vimeo, TikTok...) không phải file", () => {
    expect(checkBackgroundUrl("https://vimeo.com/12345")).toMatchObject({ ok: false, reason: "video-page" });
    expect(checkBackgroundUrl("https://www.tiktok.com/@a/video/1")).toMatchObject({ ok: false, reason: "video-page" });
  });
  it("javascript: / data: không được nhận", () => {
    expect(checkBackgroundUrl("javascript:alert(1)").ok).toBe(false);
    expect(checkBackgroundUrl("data:image/png;base64,AAAA").ok).toBe(false);
  });
});

describe("parseBackground — đọc lựa chọn đã lưu", () => {
  it("chưa lưu gì -> không nền", () => {
    expect(parseBackground(null)).toEqual({ kind: "none" });
  });
  it("cảnh có sẵn", () => {
    expect(parseBackground('{"kind":"preset","id":"city-night-shanghai"}')).toEqual({
      kind: "preset",
      id: "city-night-shanghai",
    });
  });
  it("cảnh không còn trong danh sách -> không nền, không làm vỡ app", () => {
    expect(parseBackground('{"kind":"preset","id":"da-bi-xoa"}')).toEqual({ kind: "none" });
  });
  it("link đã lưu được kiểm tra lại (YouTube lọt vào bằng cách nào cũng bị bỏ)", () => {
    expect(parseBackground('{"kind":"url","url":"https://youtu.be/x"}')).toEqual({ kind: "none" });
    expect(parseBackground('{"kind":"url","url":"https://x.com/a.mp4"}')).toEqual({
      kind: "url",
      url: "https://x.com/a.mp4",
      media: "video",
    });
  });
  it("JSON hỏng -> không nền", () => {
    expect(parseBackground("{hong")).toEqual({ kind: "none" });
  });
});

describe("sameBackground", () => {
  it("so đúng từng loại", () => {
    expect(sameBackground({ kind: "none" }, { kind: "none" })).toBe(true);
    expect(sameBackground({ kind: "preset", id: "a" }, { kind: "preset", id: "a" })).toBe(true);
    expect(sameBackground({ kind: "preset", id: "a" }, { kind: "preset", id: "b" })).toBe(false);
    expect(sameBackground({ kind: "none" }, { kind: "preset", id: "a" })).toBe(false);
  });
});

describe("stillReason — khi nào dùng ảnh tĩnh thay video", () => {
  const normal = { reducedMotion: false, saveData: false, deviceMemory: 8, cpuCores: 8 };
  it("máy bình thường -> phát video", () => {
    expect(stillReason(normal)).toBeNull();
  });
  it("giảm chuyển động -> ảnh tĩnh", () => {
    expect(stillReason({ ...normal, reducedMotion: true })).toContain("giảm chuyển động");
  });
  it("tiết kiệm dữ liệu -> ảnh tĩnh", () => {
    expect(stillReason({ ...normal, saveData: true })).toContain("tiết kiệm dữ liệu");
  });
  it("máy yếu (RAM <= 2GB hoặc <= 2 nhân) -> ảnh tĩnh", () => {
    expect(stillReason({ ...normal, deviceMemory: 2 })).toContain("cấu hình thấp");
    expect(stillReason({ ...normal, cpuCores: 2 })).toContain("cấu hình thấp");
  });
  it("trình duyệt không cho biết RAM/CPU -> không đoán bừa là máy yếu", () => {
    expect(stillReason({ reducedMotion: false, saveData: false })).toBeNull();
  });
});
