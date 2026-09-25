/**
 * ComingSoon — ô giữ chỗ cho các màn hình chưa làm.
 *
 * Phase 1 chỉ dựng khung điều hướng, nên 4/5 màn hình còn trống.
 * Ô này cho biết tính năng đó sẽ xuất hiện ở phase nào.
 */

type ComingSoonProps = {
  phase: number;        // số phase sẽ làm màn hình này
  description: string;  // mô tả ngắn màn hình sẽ có gì
};

export default function ComingSoon({ phase, description }: ComingSoonProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
      <p className="text-sm font-semibold text-slate-400">Phase {phase}</p>
      <p className="mt-2 text-base text-slate-600">{description}</p>
      <p className="mt-4 text-sm text-slate-400">Màn hình này sẽ được xây ở Phase {phase}.</p>
    </div>
  );
}
