"use client";

export interface SiteUsage {
  name: string;
  min: number;
  color: string;
}

interface TopSitesChartProps {
  sites: SiteUsage[];
  totalLabel?: string;
}

export function TopSitesChart({ sites, totalLabel }: TopSitesChartProps) {
  const maxMin = Math.max(...sites.map((s) => s.min));
  const total = sites.reduce((sum, s) => sum + s.min, 0);

  return (
    <section
      className="mt-7 animate-fade-up"
      style={{ animationDelay: "300ms" }}
    >
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-md font-bold text-text-primary">Top sitios hoy</h2>
        <span className="text-xs text-text-secondary">
          {totalLabel ?? `${total} min totales`}
        </span>
      </div>

      <div className="space-y-3">
        {sites.map((s, i) => {
          const w = (s.min / maxMin) * 100;
          return (
            <div key={s.name} className="flex items-center gap-3">
              <span className="w-20 shrink-0 truncate text-sm text-text-secondary">
                {s.name}
              </span>
              <div className="relative h-6 flex-1 overflow-hidden rounded-sm bg-bg-input">
                <div
                  className="h-full rounded-sm animate-bar-grow"
                  style={
                    {
                      background: `linear-gradient(90deg, ${s.color}, #7B6FF0)`,
                      boxShadow: `0 0 12px ${s.color}55`,
                      animationDelay: `${400 + i * 80}ms`,
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ["--bar-w" as any]: `${w}%`,
                      width: `${w}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
              <span className="w-14 shrink-0 text-right font-mono text-sm font-bold text-text-primary">
                {s.min}m
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
