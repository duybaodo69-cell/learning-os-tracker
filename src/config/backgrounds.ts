/**
 * Các cảnh nền có sẵn cho màn "Phiên tập trung".
 *
 * Mọi video đều lấy từ Wikimedia Commons, với giấy phép cho phép dùng trên
 * website công khai (CC0 hoặc CC BY / CC BY-SA). Đã được:
 *   - cắt thành đoạn 11-19 giây, hoà cuối vào đầu để lặp không bị giật
 *   - thu về 1280x720, 30 khung hình/giây, H.264 (MP4 chạy được trên mọi máy)
 *   - GỠ HẲN TIẾNG — nền luôn im lặng, và không kéo theo nhạc có bản quyền
 * Thumbnail và ảnh tĩnh dự phòng (poster) là khung hình đầu của chính video,
 * nên ô bạn chọn luôn đúng cảnh sẽ hiện ra.
 *
 * Giấy phép CC BY / CC BY-SA bắt buộc ghi tên tác giả: phần "Nguồn & giấy phép"
 * trong hộp chọn nền hiện đủ các dòng `credit` dưới đây, và
 * public/backgrounds/CREDITS.md ghi lại đầy đủ.
 *
 * Thêm cảnh mới: đặt file vào public/backgrounds/ rồi thêm một dòng ở đây.
 */

export type BackgroundGroup = "morning" | "night" | "study";

export const GROUP_LABELS: Record<BackgroundGroup, string> = {
  morning: "Thành phố buổi sáng",
  night: "Thành phố về đêm",
  study: "Study with me",
};

export type BackgroundSource = {
  /** Tên file gốc trên Wikimedia Commons. */
  title: string;
  author: string;
  license: "CC0" | "CC BY 3.0" | "CC BY-SA 3.0" | "CC BY-SA 4.0";
  licenseUrl: string;
  /** Trang của file trên Wikimedia Commons. */
  page: string;
};

export type BackgroundPreset = {
  id: string;
  group: BackgroundGroup;
  label: string;
  video: string;
  poster: string;
  thumb: string;
  source: BackgroundSource;
};

const CC0 = "https://creativecommons.org/publicdomain/zero/1.0/";
const BY3 = "https://creativecommons.org/licenses/by/3.0/";
const BYSA3 = "https://creativecommons.org/licenses/by-sa/3.0/";
const BYSA4 = "https://creativecommons.org/licenses/by-sa/4.0/";

const commons = (file: string) =>
  `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, "_"))}`;

function preset(
  id: string,
  group: BackgroundGroup,
  label: string,
  source: Omit<BackgroundSource, "page">
): BackgroundPreset {
  return {
    id,
    group,
    label,
    video: `/backgrounds/${id}.mp4`,
    poster: `/backgrounds/${id}.jpg`,
    thumb: `/backgrounds/${id}-thumb.jpg`,
    source: { ...source, page: commons(source.title) },
  };
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  /* ---------- Thành phố buổi sáng ---------- */
  preset("city-day-sanfrancisco", "morning", "San Francisco nhìn từ cửa sổ", {
    title: "San Francisco Skyline Timelapse July 1st, 2014.webm",
    author: "Todd Anderson",
    license: "CC BY 3.0",
    licenseUrl: BY3,
  }),
  preset("city-day-shanghai", "morning", "Thượng Hải ban ngày", {
    title: "Shanghai Bund, Lujiazui Skyline Timelapse.webm",
    author: "Yigang Yu",
    license: "CC0",
    licenseUrl: CC0,
  }),
  preset("city-day-tokyo", "morning", "Tokyo trong sương sớm", {
    title: "Timelapse of high-rise buildings in Tokyo.webm",
    author: "The Nature Box",
    license: "CC BY-SA 4.0",
    licenseUrl: BYSA4,
  }),

  /* ---------- Thành phố về đêm ---------- */
  preset("city-night-shanghai", "night", "Thượng Hải lên đèn", {
    title: "Shanghai Bund, Lujiazui Skyline Timelapse.webm",
    author: "Yigang Yu",
    license: "CC0",
    licenseUrl: CC0,
  }),
  preset("city-night-singapore", "night", "Singapore về đêm", {
    title: "Singapore Skyline - Earth Hour, 2011.webm",
    author: "Richard Bradbury",
    license: "CC BY 3.0",
    licenseUrl: BY3,
  }),
  preset("city-night-aerial", "night", "San Francisco từ trên cao", {
    title: "City at night.webm",
    author: "Editor (YouTube, qua Wikimedia Commons)",
    license: "CC BY 3.0",
    licenseUrl: BY3,
  }),

  /* ---------- Study with me: nhìn qua cửa sổ ---------- */
  preset("window-rain-night", "study", "Mưa trên kính, phố đêm", {
    title: "Raindrops against the window in the night city, Las Palmas.webm",
    author: "Vjatseslav Robtsenkov (slavikfi)",
    license: "CC0",
    licenseUrl: CC0,
  }),
  preset("window-rain-day", "study", "Mưa trên kính", {
    title: "Radevormwald - Raindrops on a window 02 (oT) ies.ogv",
    author: "Frank Vincentz",
    license: "CC BY-SA 3.0",
    licenseUrl: BYSA3,
  }),
  preset("window-view-funchal", "study", "Cửa sổ nhìn ra phố", {
    title: "Funchal, Madeira amazing view from the window in 4K - No Copyright.webm",
    author: "NoCopyrightNature (YouTube, qua Wikimedia Commons)",
    license: "CC BY 3.0",
    licenseUrl: BY3,
  }),
];

export function findPreset(id: string): BackgroundPreset | undefined {
  return BACKGROUND_PRESETS.find((p) => p.id === id);
}
