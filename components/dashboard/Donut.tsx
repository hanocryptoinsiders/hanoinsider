interface Slice { label: string; value: number; }

export function Donut({ slices, size = 180 }: { slices: Slice[]; size?: number }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const r = size / 2 - 14;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const shades = ["oklch(0.95 0 0)", "oklch(0.7 0 0)", "oklch(0.55 0 0)", "oklch(0.4 0 0)", "oklch(0.28 0 0)"];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="oklch(0.18 0 0)" strokeWidth={10} />
      {slices.map((s, i) => {
        const len = (s.value / total) * circ;
        const el = (
          <circle
            key={s.label}
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={shades[i % shades.length]}
            strokeWidth={10}
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${c} ${c})`}
            strokeLinecap="butt"
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}
