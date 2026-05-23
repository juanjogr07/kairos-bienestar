"use client";

import Link from "next/link";
import { Settings, Sparkles, ExternalLink, Pause, Play } from "lucide-react";

const SITES = [
  { name: "YouTube", min: 45, color: "#FF4D6A" },
  { name: "Instagram", min: 32, color: "#7B6FF0" },
  { name: "Twitter", min: 18, color: "#5AC8FF" },
];

export default function ExtensionPreview() {
  const target = 180;
  const used = 84;
  const pct = (used / target) * 100;
  const max = Math.max(...SITES.map((s) => s.min));

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-brand p-6">
      <div className="text-center">
        <p className="mb-4 text-xs font-medium uppercase tracking-wider text-text-secondary">
          Vista previa · Popup de extensión Chrome
        </p>

        <div
          className="mx-auto overflow-hidden rounded-xl border border-border-subtle bg-bg-deep shadow-lg page-enter"
          style={{ width: 360, height: 480 }}
        >
          {/* Header */}
          <header className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-cta shadow-glow-green">
                <Sparkles size={14} className="text-bg-deep" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-text-primary">Kairós</span>
            </div>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-surface hover:text-text-primary"
              aria-label="Configuración"
            >
              <Settings size={16} />
            </button>
          </header>

          {/* Today */}
          <section className="border-b border-border-subtle px-4 py-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-text-secondary">
                Hoy
              </span>
              <span className="font-mono text-md font-bold text-accent-primary">
                1h 24min
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg-input">
              <div
                className="h-full rounded-full bg-gradient-cta shadow-glow-green animate-bar-grow"
                style={
                  {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ["--bar-w" as any]: `${pct}%`,
                    width: `${pct}%`,
                  } as React.CSSProperties
                }
              />
            </div>
            <p className="mt-1.5 text-[11px] text-text-muted">
              Meta diaria:{" "}
              <span className="font-mono text-text-secondary">3h</span>
            </p>
          </section>

          {/* Top sites */}
          <section className="border-b border-border-subtle px-4 py-3">
            <p className="mb-2 text-xs font-medium text-text-secondary">
              Top sitios de hoy
            </p>
            <div className="space-y-2">
              {SITES.map((s, i) => {
                const w = (s.min / max) * 100;
                return (
                  <div key={s.name} className="flex items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: s.color }}
                    />
                    <span className="w-20 truncate text-xs text-text-primary">
                      {s.name}
                    </span>
                    <span className="w-12 font-mono text-[11px] text-text-secondary">
                      {s.min} min
                    </span>
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-bg-input">
                      <div
                        className="h-full rounded-full animate-bar-grow"
                        style={
                          {
                            background: s.color,
                            animationDelay: `${i * 80 + 100}ms`,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            ["--bar-w" as any]: `${w}%`,
                            width: `${w}%`,
                          } as React.CSSProperties
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Insight */}
          <section className="border-b border-border-subtle px-4 py-3">
            <div className="insight-border-left rounded-md bg-bg-elevated p-3 pl-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent-secondary">
                <Sparkles size={12} /> Kairós dice
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-text-primary">
                Llevas 30 min en Instagram. ¿Pausa de 2 min?
              </p>
              <div className="mt-3 flex gap-2">
                <button className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-gradient-cta py-2 text-xs font-bold text-bg-deep shadow-glow-green transition-transform hover:scale-[1.02]">
                  <Pause size={12} strokeWidth={2.5} />
                  Tomar pausa
                </button>
                <button className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border-active bg-bg-elevated py-2 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary">
                  <Play size={12} />
                  Seguir
                </button>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="px-4 py-3">
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:border-border-active"
            >
              Abrir app completa
              <ExternalLink size={12} />
            </Link>
          </footer>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-md border border-border-subtle bg-bg-surface px-4 py-2 text-xs font-medium text-text-primary hover:border-border-active"
          >
            ← Volver al Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
