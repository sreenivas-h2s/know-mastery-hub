export function RingProgress({
  value,
  size = 132,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  label: string;
  sublabel?: string;
}) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, value)));

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          className="fill-none stroke-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="fill-none stroke-primary transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-2xl font-semibold">{label}</div>
        {sublabel ? <div className="text-xs text-muted-foreground">{sublabel}</div> : null}
      </div>
    </div>
  );
}