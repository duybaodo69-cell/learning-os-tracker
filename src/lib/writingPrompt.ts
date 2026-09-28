/**
 * Prompt chấm Writing (Đợt 3) — nút "Sao chép prompt chấm Writing".
 *
 * App KHÔNG gửi gì lên mạng (luật số 5): chỉ chép chữ vào clipboard, chủ app tự
 * dán vào AI kèm đề và bài viết. Prompt yêu cầu chấm theo 4 tiêu chí band
 * descriptor của IELTS Writing và liệt kê lỗi LẶP LẠI — những lỗi đó thành thẻ
 * ôn nguồn "Lỗi Writing" (PRODUCT.md mục 7b).
 */

export const WRITING_PROMPT = `You are an experienced IELTS Writing examiner. Grade my essay strictly using the official public IELTS Writing band descriptors (Academic).

Task type: [Task 1 / Task 2]
Question:
[paste the question here]

My essay:
[paste the essay here]

Please answer in this exact structure:
1. Band for each criterion, with 1–2 sentences of evidence quoted from my essay:
   - Task Achievement (Task 1) / Task Response (Task 2)
   - Coherence and Cohesion
   - Lexical Resource
   - Grammatical Range and Accuracy
2. Overall band for this task, based on the four criteria.
3. REPEATED errors: list only mistakes that appear 2 or more times. For each one give: the error type, every place it occurs (quote), the correction, and a one-line rule I can put on a flashcard.
4. The single change that would raise my band the most next time.

Be honest and do not inflate the score. Word count: count it yourself and say if it is under the minimum (150 for Task 1, 250 for Task 2).`;

/**
 * Chép vào clipboard. Trả về false nếu trình duyệt không cho (vd không phải
 * HTTPS, hoặc bị chặn) — màn hình khi đó hiện ô chữ để tự chọn và chép.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
