interface TimerDisplayProps {
  seconds: number;
  label?: string;
  urgent?: boolean;
}

export function TimerDisplay({ seconds, label, urgent }: TimerDisplayProps) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = mins > 0
    ? `${mins}:${secs.toString().padStart(2, '0')}`
    : `${secs}`;

  return (
    <div style={{ textAlign: 'center' }}>
      {label && <p style={{ margin: '0 0 4px', fontSize: '0.875rem', opacity: 0.7 }}>{label}</p>}
      <span
        style={{
          fontSize: '3rem',
          fontVariantNumeric: 'tabular-nums',
          color: urgent ? '#e53935' : 'inherit',
        }}
      >
        {display}
      </span>
    </div>
  );
}
