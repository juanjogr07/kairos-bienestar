"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Sun, ArrowRight, BarChart3, Zap, Flame, Sparkles, Check,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StreakBadge, ScoreBadge } from "@/components/Badges";
import { getDashboard, getWeeklyUsage, type DashboardData, type WeeklyDay } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const SITE_COLORS = [
  "#FF4D6A", "#7B6FF0", "#5AC8FF", "#FF9F5A", "#4FFFB0",
];

function minuteColor(min: number) {
  if (min <= 60) return "#4FFFB0";
  if (min <= 120) return "#FF9F5A";
  return "#FF4D6A";
}

function WeeklyChart({ data }: { data: WeeklyDay[] }) {
  const maxMin = Math.max(...data.map(d => d.minutes), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => {
        const pct = (d.minutes / maxMin) * 100;
        const color = minuteColor(d.minutes);
        return (
          <div key={d.day} className="flex items-center gap-3">
            <span className="w-8 shrink-0 text-right text-xs font-medium text-text-secondary">
              {d.label}
            </span>
            <div className="relative h-5 flex-1 overflow-hidden rounded-sm bg-bg-input">
              {d.minutes > 0 && (
                <div
                  className="h-full rounded-sm transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color}, ${color}99)`,
                    boxShadow: `0 0 8px ${color}44`,
                  }}
                />
              )}
            </div>
            <span className="w-14 shrink-0 text-right font-mono text-xs text-text-secondary">
              {d.minutes > 0 ? `${d.minutes}m` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { checking } = useRequireAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [weekly, setWeekly] = useState<WeeklyDay[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    Promise.all([getDashboard(), getWeeklyUsage()]).then(([dash, wk]) => {
      setDashboard(dash);
      setWeekly(wk);
      // count-up animation
      const target = dash.today_usage_min;
      const duration = 800;
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min((t - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setCount(Math.round(eased * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, []);

  if (checking) return <div className="flex h-screen items-center justify-center"><span className="h-6 w-6 animate-spin rounded-full border-2 border-accent-secondary border-t-transparent" /></div>;

  const totalMin = dashboard?.today_usage_min ?? 0;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  const topDomains = dashboard?.top_domains ?? [];
  const maxSiteMin = Math.max(...topDomains.map(s => s.minutes), 1);

  return (
    <AppShell>
      {/* Greeting */}
      <section className="animate-fade-up" style={{ animationDelay: "0ms" }}>
        <div className="flex items-center gap-2 text-text-secondary">
          <span className="text-sm font-medium">Buenos días</span>
          <Sun size={16} className="text-accent-warm-2" />
        </div>
        <h1 className="mt-1 text-xl font-bold text-text-primary md:text-2xl">
          Hoy llevo{" "}
          {dashboard ? (
            <>
              {hours > 0 && <span className="font-mono text-accent-primary">{hours}h </span>}
              <span className="font-mono text-accent-primary">{mins}min</span>
            </>
          ) : (
            <span className="inline-block h-6 w-24 animate-pulse rounded bg-bg-surface" />
          )}{" "}
          en pantalla
        </h1>
      </section>

      {/* Metric cards */}
      <section className="mt-5 grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: "100ms" }}>
        <div className="flex items-start gap-3 rounded-lg border border-border-subtle bg-bg-surface p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[rgba(79,255,176,0.1)]">
            <BarChart3 size={20} className="text-accent-primary" />
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-accent-primary">{count}</p>
            <p className="text-sm text-text-secondary">min hoy</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-border-subtle bg-bg-surface p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[rgba(255,159,90,0.12)]">
            <Zap size={20} className="text-accent-warm" />
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-accent-warm">
              {dashboard?.active_habits ?? (
                <span className="inline-block h-7 w-6 animate-pulse rounded bg-bg-surface" />
              )}
            </p>
            <p className="text-sm text-text-secondary">hábitos</p>
          </div>
        </div>
      </section>

      {/* Insight card */}
      <section className="mt-6 animate-fade-up" style={{ animationDelay: "200ms" }}>
        <div className="insight-border-left relative overflow-hidden rounded-lg bg-gradient-card-alive p-5 pl-6">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent-secondary" />
            <span className="text-xs font-bold uppercase tracking-wider text-accent-secondary">
              Insight de hoy
            </span>
          </div>
          <p className="mt-3 text-base leading-relaxed text-text-primary">
            Los últimos 3 días usaste el teléfono después de las{" "}
            <span className="font-mono text-accent-secondary">23:00</span> por más de{" "}
            <span className="font-mono text-accent-secondary">45 min</span>. Esto puede estar afectando tu sueño.
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
            <ArrowRight size={16} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* Weekly usage chart */}
      <section className="mt-7 animate-fade-up" style={{ animationDelay: "250ms" }}>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-md font-bold text-text-primary">Uso esta semana</h2>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#4FFFB0]" /> ≤60m</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#FF9F5A]" /> ≤120m</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#FF4D6A]" /> +120m</span>
          </div>
        </div>
        {weekly.length > 0 ? (
          <WeeklyChart data={weekly} />
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-8 h-3 animate-pulse rounded bg-bg-surface" />
                <div className="h-5 flex-1 animate-pulse rounded bg-bg-surface" />
                <span className="w-14 h-3 animate-pulse rounded bg-bg-surface" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Top sites */}
      <section className="mt-7 animate-fade-up" style={{ animationDelay: "300ms" }}>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-md font-bold text-text-primary">Top sitios hoy</h2>
          <span className="text-xs text-text-secondary">{totalMin} min totales</span>
        </div>
        {topDomains.length > 0 ? (
          <div className="space-y-3">
            {topDomains.map((s, i) => {
              const w = (s.minutes / maxSiteMin) * 100;
              const color = SITE_COLORS[i % SITE_COLORS.length]!;
              return (
                <div key={s.domain} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-sm text-text-secondary">
                    {s.domain.replace("www.", "").replace(".com", "")}
                  </span>
                  <div className="relative h-6 flex-1 overflow-hidden rounded-sm bg-bg-input">
                    <div
                      className="h-full rounded-sm animate-bar-grow"
                      style={{
                        background: `linear-gradient(90deg, ${color}, #7B6FF0)`,
                        boxShadow: `0 0 12px ${color}55`,
                        animationDelay: `${400 + i * 80}ms`,
                        ["--bar-w" as string]: `${w}%`,
                        width: `${w}%`,
                      } as React.CSSProperties}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right font-mono text-sm font-bold text-text-primary">
                    {s.minutes}m
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">Sin datos de uso hoy.</p>
        )}
      </section>

      {/* Habits today */}
      <section className="mt-7 animate-fade-up" style={{ animationDelay: "400ms" }}>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-md font-bold text-text-primary">Hábitos de hoy</h2>
          <Link href="/habits" className="text-xs font-medium text-accent-primary hover:underline">
            Ver todos
          </Link>
        </div>
        {dashboard ? (
          <p className="text-sm text-text-secondary">
            {dashboard.total_habit_completions_today} de{" "}
            {dashboard.active_habits} completados hoy
          </p>
        ) : (
          <div className="h-10 animate-pulse rounded bg-bg-surface" />
        )}
      </section>

      {/* Wellness scores */}
      <section className="mt-7 animate-fade-up" style={{ animationDelay: "500ms" }}>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-md font-bold text-text-primary">Tu bienestar reciente</h2>
          <Link href="/profile" className="text-xs font-medium text-text-secondary hover:text-accent-primary">
            Historial
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ScoreBadge
            test="PHQ-9"
            score={dashboard?.last_phq9_score ?? 0}
            severity={dashboard?.last_phq9_score != null && dashboard.last_phq9_score >= 15 ? "severo" : dashboard?.last_phq9_score != null && dashboard.last_phq9_score >= 10 ? "moderado" : "leve"}
          />
          <ScoreBadge
            test="GAD-7"
            score={dashboard?.last_gad7_score ?? 0}
            severity={dashboard?.last_gad7_score != null && dashboard.last_gad7_score >= 15 ? "severo" : dashboard?.last_gad7_score != null && dashboard.last_gad7_score >= 10 ? "moderado" : "leve"}
          />
        </div>
      </section>
    </AppShell>
  );
}
