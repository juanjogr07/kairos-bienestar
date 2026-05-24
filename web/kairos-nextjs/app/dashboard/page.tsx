"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp, Zap, Check, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CVWidget } from "@/components/CVWidget";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const WAVE_HEIGHTS = [22, 35, 48, 38, 55, 72, 68, 80, 90, 76, 85, 92, 96, 88, 72, 60, 54, 48, 40, 34, 28, 22, 18, 14];

const PROGRESS_RINGS = [
  { name: "Sueño", value: "6/7", target: "≥ 7h", pct: 86, color: "#60a5fa" },
  { name: "Pantalla", value: "4/7", target: "≤ 4h", pct: 57, color: "#6366f1" },
  { name: "Movimiento", value: "5/7", target: "8k pasos", pct: 71, color: "#8b5cf6" },
  { name: "Foco", value: "3/7", target: "2 sesiones", pct: 43, color: "#a78bfa" },
];

const HABITS_TODAY = [
  {
    id: "h1",
    name: "10 min de meditación",
    sub: "Racha · 7 días · justo después del café",
    icon: { bg: "#dcfce7", color: "#15803d" },
    done: true,
    week: ["done", "done", "miss", "done", "done", "done", "done"],
  },
  {
    id: "h2",
    name: "Sin pantalla en la cama",
    sub: "Racha · 5 días · agente sueño protege",
    icon: { bg: "#fef3c7", color: "#b45309" },
    done: true,
    week: ["done", "miss", "done", "done", "done", "done", "done"],
  },
  {
    id: "h3",
    name: "Escribir a alguien que quieres",
    sub: "Hoy · pendiente · sugerido por Ánimo",
    icon: { bg: "#fce7f3", color: "#be185d" },
    done: false,
    week: ["done", "done", "miss", "done", "done", "miss", "today"],
  },
];

const WEEK_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

export default function DashboardPage() {
  const { checking } = useRequireAuth();
  const [mins, setMins] = useState(0);
  const targetMins = 102;

  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setMins(Math.round(eased * targetMins));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (checking) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
        <span style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--teal-500)", borderTopColor: "transparent", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;

  return (
    <AppShell>
      {/* Topbar */}
      <div className="topbar fade-up delay-1">
        <div style={{ fontSize: 14, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
          Buenos días, <b style={{ color: "var(--ink)", fontWeight: 600 }}>Alejandro</b>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--muted)", opacity: 0.5, display: "inline-block" }} />
          <span>Domingo, 25 mayo</span>
        </div>
        <ThemeToggle />
        <Link href="/chat" className="btn-cta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          Hablar con Kairós
        </Link>
      </div>

      {/* 1. Check-in card — first thing user sees */}
      <section className="checkin-card fade-up delay-2" aria-label="Check-in del día">
        <div>
          <div className="cm-badge">Tu check-in del día</div>
          <h2 style={{ fontFamily: "'Outfit', 'Inter', sans-serif", fontWeight: 600, margin: "0 0 10px", fontSize: "clamp(26px, 3.2vw, 36px)", letterSpacing: "-0.02em", lineHeight: 1.1, color: "#ede9fe" }}>
            Tengo <em style={{ background: "linear-gradient(135deg, #c4b5fd 0%, #818cf8 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", fontStyle: "normal" }}>3 preguntas</em><br />
            para entender tu día.
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.55, color: "rgba(237,233,254,.75)", margin: "0 0 18px" }}>
            Soy <b style={{ color: "#ede9fe" }}>Kairós</b>, tu copiloto. Solo te interrumpo una vez al día — cuando termines, los agentes de <b style={{ color: "#ede9fe" }}>ánimo</b>, <b style={{ color: "#ede9fe" }}>sueño</b> y <b style={{ color: "#ede9fe" }}>foco</b> ajustan lo que ves aquí.
          </p>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <Link href="/chat" style={{ flex: 1, padding: "12px 16px", borderRadius: 12, background: "linear-gradient(135deg, #8b5cf6, #6366f1)", color: "#fff", fontWeight: 600, fontSize: 14, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 10px 20px -10px rgba(99,102,241,.55)", letterSpacing: "-0.01em" }}>
              Empezar ahora
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
            </Link>
            <button style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,.08)", color: "#ede9fe", border: "1px solid rgba(255,255,255,.15)", fontFamily: "inherit", fontSize: 14, fontWeight: 500, cursor: "pointer", letterSpacing: "-0.01em" }}>
              Recordar después
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.08)", fontSize: "11.5px", color: "rgba(237,233,254,.5)", alignItems: "center" }}>
            <span style={{ marginRight: 4, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 11 }}>HOY participan</span>
            {[
              { name: "Ánimo", color: "#fb7185" },
              { name: "Sueño", color: "#60a5fa" },
              { name: "Foco", color: "#a78bfa" },
            ].map((a) => (
              <span key={a.name} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 11px 5px 9px", borderRadius: 999, background: "rgba(255,255,255,.06)", fontSize: "12.5px", fontWeight: 500, color: "#ede9fe" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: a.color, display: "inline-block" }} />
                {a.name}
              </span>
            ))}
          </div>
        </div>
        <div className="kairos-orb-wrap">
          <div className="orb-glow" />
          <div className="orb-K">K</div>
        </div>
      </section>

      {/* 2. Hero — screen time */}
      <section className="hero-card fade-up delay-3" aria-label="Pantalla hoy">
        <div className="hero-label">Pantalla hoy</div>
        <div className="hero-number">
          <span>
            <em>{hours}</em>h <em>{String(remainMins).padStart(2, "0")}</em>m
          </span>
          <span className="hero-unit">de 4h objetivo</span>
          <span className="delta-badge" style={{ marginLeft: 8 }}>
            <TrendingDown size={12} />
            −18m vs ayer
          </span>
        </div>

        <div className="wave" role="img" aria-label="Actividad digital de las últimas 24 horas">
          {WAVE_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className="wave-bar"
              style={{
                height: `${h}%`,
                opacity: i >= WAVE_HEIGHTS.length - 6 ? 0.95 : 0.4 + (i / WAVE_HEIGHTS.length) * 0.5,
                background: i >= WAVE_HEIGHTS.length - 6
                  ? "linear-gradient(180deg, #c4b5fd, #6366f1)"
                  : "linear-gradient(180deg, #ddd6fe, #c7d2fe)",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: "10.5px", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
          <span>8:00</span><span>11:00</span><span>14:00</span><span>17:00</span><span>20:00</span><span>ahora</span>
        </div>

        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
          <span className="delta-badge">
            <TrendingUp size={12} />
            Ánimo +0.6
          </span>
          <span className="delta-badge" style={{ background: "rgba(244,63,94,.08)", color: "#be123c" }}>
            <TrendingDown size={12} />
            Sueño −0.3h
          </span>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Vas por buen camino</span>
        </div>
      </section>

      {/* 3. Insight card from Kairós */}
      <div className="insight-card fade-up delay-4">
        <div className="insight-avatar">
          <span style={{ fontFamily: "'Outfit', 'Inter', sans-serif", fontWeight: 700, fontSize: 22, color: "#fff", lineHeight: 1 }}>K</span>
        </div>
        <div>
          <div style={{ marginBottom: 6 }}>
            <span className="insight-pill">Playbook · Uso nocturno</span>
          </div>
          <h3 style={{ fontFamily: "'Outfit', 'Inter', sans-serif", fontWeight: 600, margin: "0 0 8px", fontSize: 20, letterSpacing: "-0.01em", color: "var(--ink)" }}>
            Tus mejores días empiezan con sueño largo.
          </h3>
          <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)", margin: 0 }}>
            Cuando duermes <b>+7h</b> tu ánimo del día siguiente sube un <b style={{ color: "var(--teal-600)" }}>40%</b> en promedio. Esta noche apuntemos a dormir antes de las 23:00.
          </p>
          <div style={{ marginTop: 10, fontSize: "11px", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
            hace 12 min · agente sueño
          </div>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 12, background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "#fff", border: "none", fontFamily: "inherit", fontWeight: 600, fontSize: 13, cursor: "pointer", flexShrink: 0, boxShadow: "0 8px 18px -10px rgba(99,102,241,.5)", letterSpacing: "-0.01em" }}>
          Activar
          <ChevronRight size={14} />
        </button>
      </div>

      {/* 4. Progress rings */}
      <div className="sect-h fade-up delay-5">
        <h3>Progreso esta semana</h3>
        <span className="ln" />
        <span className="sub">22 — 28 mayo</span>
      </div>
      <div className="progress-grid fade-up delay-5">
        {PROGRESS_RINGS.map((ring) => (
          <div key={ring.name} className="pring">
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: "50%",
                background: `conic-gradient(${ring.color} calc(${ring.pct} * 1%), rgba(11,31,28,.07) 0)`,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                position: "relative",
              }}
            >
              <div style={{ position: "absolute", inset: 5, borderRadius: "50%", background: "var(--surface)" }} />
              <span style={{ position: "relative", zIndex: 1, fontSize: "12px", fontWeight: 700, color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>
                {ring.value}
              </span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.1em", fontWeight: 600 }}>{ring.name}</div>
              <div style={{ fontFamily: "'Outfit', 'Inter', sans-serif", fontWeight: 600, fontSize: 20, color: "var(--ink)", lineHeight: 1.1, marginTop: 2 }}>{ring.target}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 5. Habits today */}
      <div className="sect-h fade-up" style={{ animationDelay: "0.45s" }}>
        <h3>Hábitos hoy</h3>
        <span className="ln" />
        <Link href="/habits" style={{ fontSize: "12.5px", color: "var(--muted)", textDecoration: "none", fontWeight: 600 }}>
          ver todos →
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }} className="fade-up">
        {HABITS_TODAY.map((h) => (
          <div key={h.id} className={`hb-row${h.done ? " done" : ""}`}>
            <button className="hb-check" aria-label={h.done ? "Completado" : "Marcar como completado"}>
              {h.done && <Check size={14} strokeWidth={3} />}
            </button>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: h.icon.bg, color: h.icon.color, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Zap size={16} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: "14.5px", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)", textDecoration: h.done ? "line-through" : "none", textDecorationColor: "rgba(11,31,28,.3)" }}>
                {h.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{h.sub}</div>
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {h.week.map((d, i) => (
                <span
                  key={i}
                  className={`hb-week-dot${d === "done" ? " done" : d === "miss" ? " miss" : d === "today" ? " today" : ""}`}
                >
                  {WEEK_LABELS[i]}
                </span>
              ))}
            </div>
          </div>
        ))}
        <button style={{ marginTop: 8, width: "100%", padding: "12px", borderRadius: 12, border: "1.5px dashed var(--line)", background: "transparent", color: "var(--muted)", fontFamily: "inherit", fontSize: 14, fontWeight: 500, cursor: "pointer", letterSpacing: "-0.01em", transition: "all .2s" }}>
          + Añadir un hábito
        </button>

        {/* CV Widget — posture & eye strain */}
        <div style={{ marginTop: 24 }}>
          <CVWidget />
        </div>
      </div>
    </AppShell>
  );
}
