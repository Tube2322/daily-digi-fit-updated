import { useEffect, useState } from "react";

export function CalorieRing({
  consumed,
  burned,
  allowance,
  size = 240,
}: {
  consumed: number;
  burned: number;
  allowance: number;
  size?: number;
}) {
  const net = consumed - burned;
  const remaining = Math.max(0, allowance - net);
  const target = Math.min(1, Math.max(0, net / Math.max(1, allowance)));
  const over = net > allowance;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  // animate from 0 -> target on mount + on data change
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setPct(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--muted)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={over ? "var(--destructive)" : "var(--primary)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          fill="none"
          style={{ transition: "stroke-dashoffset 1100ms cubic-bezier(0.22, 1, 0.36, 1), stroke 300ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-medium text-muted-foreground">
          {over ? "เกินไป" : "ที่ควรได้รับ"}
        </span>
        <span className="mt-1 text-5xl font-bold tabular-nums">
          {(over ? net - allowance : remaining).toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">แคลอรี / {allowance.toLocaleString()}</span>
      </div>
    </div>
  );
}
