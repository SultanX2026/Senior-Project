import React from "react";

type Props = {
  values: number[];
  times?: number[];                 // unix seconds aligned with values
  width?: number;
  height?: number;
  resolution?: "60" | "D";          // pass what you used to fetch
};

export default function BigChart({
  values,
  times = [],
  width = 980,
  height = 340,
  resolution = "D",
}: Props) {
  const pad = { top: 16, right: 16, bottom: 28, left: 44 };

  const w = Math.max(200, width);
  const h = Math.max(160, height);

  const n = values.length;
  const xs = n ? values : [0];
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const yMin = min === max ? min - 1 : min;
  const yMax = min === max ? max + 1 : max;

  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const xOf = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const yOf = (v: number) =>
    innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const pts = values.map((v, i) => `${pad.left + xOf(i)},${pad.top + yOf(v)}`).join(" ");

  const ticks = 6;
  const yTicks = Array.from({ length: ticks }, (_, i) => {
    const v = yMin + ((yMax - yMin) * i) / (ticks - 1);
    return { y: pad.top + yOf(v), label: v.toFixed(2) };
  });

  // choose ~6 x-ticks
  const k = Math.max(1, Math.floor(n / 6));
  const xIdxs = Array.from({ length: Math.min(6, n) }, (_, i) => Math.min(n - 1, i * k));

  const fmtTime = (t: number) => {
    const d = new Date(t * 1000);
    if (resolution === "60") {
      // intraday: show HH:mm
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    // multi-day: show MM/DD
    return d.toLocaleDateString([], { month: "numeric", day: "numeric" });
  };

  return (
    <svg width={w} height={h} style={{ display: "block", border: "1px solid #eee", borderRadius: 8 }}>
      {/* axes */}
      <line x1={pad.left} y1={pad.top + innerH} x2={pad.left + innerW} y2={pad.top + innerH} stroke="#ddd" />
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="#ddd" />

      {/* y grid + labels */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={pad.left} x2={pad.left + innerW} y1={t.y} y2={t.y} stroke="#f3f3f3" />
          <text x={pad.left - 6} y={t.y + 4} fontSize={10} textAnchor="end" fill="#666">{t.label}</text>
        </g>
      ))}

      {/* x ticks */}
      {xIdxs.map((idx, i) => {
        const x = pad.left + xOf(idx);
        const label = times[idx] ? fmtTime(times[idx]) : "";
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={pad.top + innerH} y2={pad.top + innerH + 4} stroke="#aaa" />
            <text x={x} y={pad.top + innerH + 18} fontSize={10} textAnchor="middle" fill="#666">
              {label}
            </text>
          </g>
        );
      })}

      {/* line */}
      <polyline fill="none" stroke="#62a36a" strokeWidth={2} points={pts} />
    </svg>
  );
}
