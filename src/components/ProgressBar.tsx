interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div style={{ width: '100%', height: 8, background: '#333', borderRadius: 4 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: '#4caf50', borderRadius: 4, transition: 'width 0.3s' }} />
    </div>
  );
}
