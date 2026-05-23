"use client";

interface WellbeingChartProps {
  phq: number[];
  gad: number[];
  labels: string[];
}

/**
 * Gráfico SVG inline (PHQ-9 + GAD-7) — sin libs externas para no aumentar
 * el bundle del MVP. Si crecemos a charts más complejos consideramos recharts
 * o nivo en una iteración posterior.
 */
export function WellbeingChart({ phq, gad, labels }: WellbeingChartProps) {
  const W = 320;
  const H = 140;
  const PADX = 8;
  const PADY = 14;
  const max = 21;
  const n = phq.length;

  const xAt = (i: number) => PADX + (i * (W - 2 * PADX)) / (n - 1);
  const yAt = (v: number) => H - PADY - (v / max) * (H - 2 * PADY);

  const buildPath = (data: number[]) =>
    data.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`).join(" ");

  const buildArea = (data: number[]) => {
    const top = data
      .map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`)
      .join(" ");
    return `${top} L ${xAt(n - 1)} ${H - PADY} L ${xAt(0)} ${H - PADY} Z`;
  };

  return (
    <div className="mt-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-44 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Gráfico de evolución PHQ-9 y GAD-7"
      >
        <defs>
          <linearGradient id="phq-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7B6FF0" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7B6FF0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gad-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#5AC8FF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#5AC8FF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1={PADX}
            x2={W - PADX}
            y1={PADY + p * (H - 2 * PADY)}
            y2={PADY + p * (H - 2 * PADY)}
            stroke="#1E2D52"
            strokeWidth="1"
            strokeDasharray={p === 0 || p === 1 ? "" : "2,4"}
          />
        ))}

        <path d={buildArea(phq)} fill="url(#phq-area)" />
        <path d={buildArea(gad)} fill="url(#gad-area)" />

        <path
          d={buildPath(phq)}
          fill="none"
          stroke="#7B6FF0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={buildPath(gad)}
          fill="none"
          stroke="#5AC8FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {phq.map((v, i) => (
          <circle
            key={`p${i}`}
            cx={xAt(i)}
            cy={yAt(v)}
            r="3"
            fill="#7B6FF0"
            stroke="#0D1424"
            strokeWidth="1.5"
          />
        ))}
        {gad.map((v, i) => (
          <circle
            key={`g${i}`}
            cx={xAt(i)}
            cy={yAt(v)}
            r="3"
            fill="#5AC8FF"
            stroke="#0D1424"
            strokeWidth="1.5"
          />
        ))}
      </svg>

      <div className="mt-2 flex justify-between text-[11px] text-text-muted">
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}
