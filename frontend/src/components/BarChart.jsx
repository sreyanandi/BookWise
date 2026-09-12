// Dependency-free SVG bar chart rendering cleanly in the browser.

export default function BarChart({ data, color = "var(--color-accent)", height = 160, valueSuffix = "" }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barWidth = 100 / data.length;

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {data.map((d, i) => {
          const barHeight = (d.value / max) * (height - 24);
          const x = i * barWidth;
          return (
            <g key={d.label}>
              <rect
                x={x + barWidth * 0.15}
                y={height - 24 - barHeight}
                width={barWidth * 0.7}
                height={Math.max(barHeight, d.value > 0 ? 2 : 0)}
                rx={2}
                fill={color}
              />
              <text
                x={x + barWidth / 2}
                y={height - 24 - barHeight - 4}
                textAnchor="middle"
                fontSize="6"
                fill="var(--color-ink-muted)"
              >
                {d.value > 0 ? `${d.value}${valueSuffix}` : ""}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex mt-1">
        {data.map((d) => (
          <div key={d.label} style={{ width: `${barWidth}%` }} className="text-center">
            <span className="text-[10px] text-ink-muted line-clamp-1">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
