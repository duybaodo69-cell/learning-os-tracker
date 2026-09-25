/**
 * Màn hình 2 — "Ôn tập" (Review).
 *
 * Gồm brain dump (viết lại những gì nhớ được — retrieval practice)
 * và ôn thẻ theo lịch spaced repetition.
 */
import ScreenShell from "../components/ScreenShell";
import ComingSoon from "../components/ComingSoon";

export default function ReviewScreen() {
  return (
    <ScreenShell title="Ôn tập" subtitle="Brain dump và thẻ ôn tập đến hạn">
      <ComingSoon
        phase={2}
        description="Brain dump (retrieval) và bộ thẻ ôn tập theo lịch spaced repetition."
      />
    </ScreenShell>
  );
}
