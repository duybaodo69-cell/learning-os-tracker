/**
 * Đọc header "Range: bytes=..." của trình duyệt.
 *
 * Safari trên iPhone CHỈ phát video khi server trả được từng đoạn file
 * (mã 206). Kho file tĩnh của Cloudflare Workers luôn trả cả file (200),
 * nên worker/index.js dùng hàm này để tự cắt đoạn.
 *
 * Trả về { start, end } (end tính cả byte cuối), null nếu không có /
 * không hiểu Range (trả cả file), hoặc "unsatisfiable" nếu đoạn nằm ngoài file.
 *
 * @param {string | null} header
 * @param {number} size tổng số byte của file
 * @returns {{ start: number, end: number } | null | "unsatisfiable"}
 */
export function parseRange(header, size) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  // Nhiều đoạn một lúc ("bytes=0-1,5-9") hoặc đơn vị lạ: trả cả file, vẫn đúng chuẩn.
  if (!m) return null;
  const [, a, b] = m;
  if (a === "" && b === "") return null;

  let start;
  let end;
  if (a === "") {
    // "bytes=-500" = 500 byte cuối
    const n = Number(b);
    if (n === 0) return "unsatisfiable";
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(a);
    end = b === "" ? size - 1 : Math.min(Number(b), size - 1);
  }
  if (start >= size || start > end) return "unsatisfiable";
  return { start, end };
}
