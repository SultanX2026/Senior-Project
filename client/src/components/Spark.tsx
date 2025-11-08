// Tiny sparkline used in the dashboard cards (pure SVG, no libs)
type Pt = { x: number; y: number };

function scale(values: number[], w: number, h: number): Pt[] {
  if (!values || values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const dx = values.length > 1 ? w / (values.length - 1) : 0;
  return values.map((v, i) => ({ x: i * dx, y: h - ((v - min) / span) * h }));
}

export default function Spark({
  values,
  width = 220,
  height = 70,
  stroke = "#3fbf6f",
  fill = "rgba(63,191,111,0.15)",
}: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
}) {
  const pts = scale(values, width, height);
  if (pts.length < 2) return <div style={{ width, height }} />;

  const line = `M ${pts[0].x} ${pts[0].y}` + pts.map(p => ` L ${p.x} ${p.y}`).join("");
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
