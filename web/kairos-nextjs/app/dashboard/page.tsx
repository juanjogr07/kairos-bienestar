"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Sun,
  ArrowRight,
  BarChart3,
  Zap,
  Flame,
  Sparkles,
  Check,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StreakBadge, ScoreBadge } from "@/components/Badges";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const SITES = [
  { name: "YouTube", min: 45, color: "#FF4D6A" },
  { name: "Instagram", min: 32, color: "#7B6FF0" },
  { name: "Twitter", min: 18, color: "#5AC8FF" },
  { name: "TikTok", min: 28, color: "#FF9F5A" },
  { name: "Reddit", min: 19, color: "#4FFFB0" },
];

const HABITS_TODAY = [
  { id: "h1", text: "Sin teléfono la primera hora del día", streak: 3, done: true },
  { id: "h2", text: "10 min de respiración consciente", streak: 5, done: true },
  { id: "h3", text: "Caminar al sol 15 min", streak: 1, done: false },
];

export default function DashboardPage() {
  const { checking } = useRequireAuth();
  const [count, setCount] = useState(0);
  const target = 142;

  // Animated count-up
  useEffect(() => {
    const duration = 800;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const maxMin = Math.max(...SITES.map((s) => s.min));

  if (checking) return <div className="flex h-screen items-center justify-center"><span className="h-6 w-6 animate-spin rounded-full border-2 border-accent-secondary border-t-transparent" /></div>;

  return (
    <AppShell>
      {/* Section 1 — Greeting */}
      <section
        className="animate-fade-up"
        style={{ animationDelay: "0ms" }}
      >
        <div className="flex items-center gap-2 text-text-secondary">
          <span className="text-sm font-medium">Buenos días, Alejandro</span>
          <Sun size={16} className="text-accent-warm-2" />
        </div>
        <h1 className="mt-1 text-xl font-bold text-text-primary md:text-2xl">
          Hoy llevo{" "}
          <span className="font-mono text-accent-primary">1h 42min</span> en
          pantalla
        </h1>
      </section>

      {/* Metric cards */}
      <section
        className="mt-5 grid grid-cols-2 gap-3 animate-fade-up"
        style={{ animationDelay: "100ms" }}
      >
        <div className="flex items-start gap-3 rounded-lg border border-border-subtle bg-bg-surface p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[rgba(79,255,176,0.1)]">
            <BarChart3 size={20} className="text-accent-primary" />
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-accent-primary">
              {count}
            </p>
            <p className="text-sm text-text-secondary">min hoy</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-border-subtle bg-bg-surface p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[rgba(255,159,90,0.12)]">
            <Zap size={20} className="text-accent-warm" />
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-accent-warm">2</p>
            <p className="text-sm text-text-secondary">hábitos</p>
          </div>
        </div>
      </section>

      {/* Insight card */}
      <section
        className="mt-6 animate-fade-up"
        style={{ animationDelay: "200ms" }}
      >
        <div className="insight-border-left relative overflow-hidden rounded-lg bg-gradient-card-alive p-5 pl-6">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent-secondary" />
            <span className="text-xs font-bold uppercase tracking-wider text-accent-secondary">
              Insight de hoy
            </span>
          </div>

          <p className="mt-3 text-base leading-relaxed text-text-primary">
            Los últimos 3 días usaste el teléfono después de las{" "}
            <span className="font-mono text-accent-secondary">23:00</span> por
            más de{" "}
            <span className="font-mono text-accent-secondary">45 min</span>.
            Esto puede estar afectando tu sueño.
          </p>

          <div className="mt-4 flex items-center gap-2 text-xs text-text-secondary">
            <span className="flex h-1.5 w-1.5 rounded-full bg-accent-secondary" />
            Playbook activado:{" "}
            <span className="font-medium text-text-primary">Uso nocturno</span>
          </div>

          <Link
            href="/chat"
            className="group mt-5 inline-flex items-center gap-2 rounded-md border border-accent-secondary bg-[rgba(123,111,240,0.12)] px-4 py-2.5 text-sm font-bold text-accent-secondary transition-all hover:bg-[rgba(123,111,240,0.2)]"
          >
            Habla con Kairós
            <ArrowRight
              size={16}
              strokeWidth={2.5}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </section>

      {/* Top sites bar chart */}
      <section
        className="mt-7 animate-fade-up"
        style={{ animationDelay: "300ms" }}
      >
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-md font-bold text-text-primary">
            Top sitios hoy
          </h2>
          <span className="text-xs text-text-secondary">
            142 min totales
          </span>
        </div>

        <div className="space-y-3">
          {SITES.map((s, i) => {
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

      {/* Habits today */}
      <section
        className="mt-7 animate-fade-up"
        style={{ animationDelay: "400ms" }}
      >
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-md font-bold text-text-primary">
            Hábitos de hoy
          </h2>
          <Link
            href="/habits"
            className="text-xs font-medium text-accent-primary hover:underline"
          >
            Ver todos
          </Link>
        </div>

        <ul className="space-y-3">
          {HABITS_TODAY.map((h) => (
            <li
              key={h.id}
              className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface p-4"
            >
              <button
                aria-label={h.done ? "Completado" : "Marcar como completado"}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  h.done
                    ? "border-accent-primary bg-accent-primary text-bg-deep shadow-glow-green"
                    : "border-border-subtle hover:border-accent-primary"
                }`}
              >
                {h.done && <Check size={14} strokeWidth={3} />}
              </button>
              <span
                className={`flex-1 text-sm ${
                  h.done
                    ? "text-text-secondary line-through decoration-accent-primary/50"
                    : "text-text-primary"
                }`}
              >
                {h.text}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(255,159,90,0.15)] px-2.5 py-1 text-accent-warm">
                <Flame size={12} strokeWidth={2.5} />
                <span className="font-mono text-xs font-bold">{h.streak}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Score badges */}
      <section
        className="mt-7 animate-fade-up"
        style={{ animationDelay: "500ms" }}
      >
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-md font-bold text-text-primary">
            Tu bienestar reciente
          </h2>
          <Link
            href="/profile"
            className="text-xs font-medium text-text-secondary hover:text-accent-primary"
          >
            Historial
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ScoreBadge test="PHQ-9" score={9} severity="leve" />
          <ScoreBadge test="GAD-7" score={6} severity="leve" />
        </div>
      </section>
    </AppShell>
  );
}
