interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  return (
    <div
      className="w-full h-1 bg-slate-100 shrink-0"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-slate-800 transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
