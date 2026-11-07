// Radar chart for 3+ subjects, horizontal bars for fewer.
export default function Radar({ data }) {
  const n = data.length;

  if (n < 3) {
    return (
      <div className="bars">
        {data.map((d) => (
          <div key={d.label} className="barrow">
            <span>{d.label}</span>
            <div className="bar"><i style={{ width: `${Math.max(2, d.value)}%` }} /></div>
            <b>{Math.round(d.value)}%</b>
          </div>
        ))}
      </div>
    );
  }

  const size = 300, cx = 150, cy = 150, R = 95;
  const pt = (i, frac) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * R * frac, cy + Math.sin(a) * R * frac];
  };
  const ring = (f) => data.map((_, i) => pt(i, f).join(",")).join(" ");
  const shape = data.map((d, i) => pt(i, Math.max(0.04, d.value / 100)).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="radar">
      <defs>
        <linearGradient id="radarfill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c5cff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke="rgba(255,255,255,.1)" />
      ))}
      {data.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.1)" />;
      })}
      <polygon points={shape} fill="url(#radarfill)" stroke="#22d3ee" strokeWidth="2" />
      {data.map((d, i) => {
        const [x, y] = pt(i, Math.max(0.04, d.value / 100));
        const [lx, ly] = pt(i, 1.28);
        return (
          <g key={d.label}>
            <circle cx={x} cy={y} r="4" fill="#22d3ee" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="#cbd2f0" fontSize="12">
              {d.label}
            </text>
            <text x={lx} y={ly + 14} textAnchor="middle" dominantBaseline="middle" fill="#8b93b3" fontSize="11">
              {Math.round(d.value)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}
