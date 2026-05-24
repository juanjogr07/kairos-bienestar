"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp, Zap, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const WAVE_HEIGHTS = [22, 35, 48, 38, 55, 72, 68, 80, 90, 76, 85, 92, 96, 88, 72, 60, 54, 48, 40, 34, 28, 22, 18, 14];

const PROGRESS_RINGS = [
  { name: "Pantalla", value: "1h 42m", pct: 57, color: "#10b981" },
  { name: "Sueño", value: "7.4h", pct: 82, color: "#60a5fa" },
  { name: "Foco", value: "3 ses.", pct: 42, color: "#a78bfa" },
  { name: "Ánimo", value: "4.2 / 5", pct: 84, color: "#fb7185" },
];

const HABITS_TODAY = [
  {
    id: "h1",
    name: "10 min de meditación",
    sub: "Racha · 7 días · justo después del café",
    icon: { bg: "#dcfce7", color: "#15803d" },
    done: true,
    week: ["done","done","miss","done","done","done","done"],
  },
  {
    id: "h2",
    name: "Sin pantalla en la cama",
    sub: "Racha · 5 días · agente sueño protege",
    icon: { bg: "#fef3c7", color: "#b45309" },
    done: true,
    week: ["done","miss","done","done","done","done","done"],
  },
  {
    id: "h3",
    name: "Escribir a alguien que quieres",
    sub: "Hoy · pendiente",
    icon: { bg: "#fce7f3", color: "#be185d" },
    done: false,
    week: ["done","done","miss","done","done","miss","today"],
  },
];

const WEEK_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

export default function DashboardPage() {
  const { checking } = useRequireAuth();
  const [count, setCount] = useState(0);
  const target = 102;

  useEffect(() => {
    const duration = 900;
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

  if (checking) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
        <span style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--teal-500)", borderTopColor: "transparent", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AppShell>
      {/* Topbar */}
      <div className="topbar fade-up delay-1">
        <div style={{ fontSize: 14, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
          </svg>
          Buenos días, <b style={{ color: "var(--ink)", fontWeight: 600 }}>Alejandro</b>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--muted)", opacity: 0.5, display: "inline-block" }} />
          <span>Sábado, 23 mayo</span>
        </div>
        <Link href="/chat" className="btn-cta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          Hablar con Kairós
        </Link>
      </div>

      {/* Hero — screen time counter + waveform */}
      <section className="hero-card fade-up delay-2">
        <div className="hero-label">Tiempo en pantalla · hoy</div>
        <div className="hero-number">
          <em>{count}</em>
          <span className="hero-unit">min hoy</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
            <span className="delta-badge">
              <TrendingDown size={12} />
              −18m vs ayer
            </span>
          </span>
        </div>

        {/* Waveform */}
        <div className="wave" role="img" aria-label="Actividad digital de las últimas 24 horas">
          {WAVE_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className="wave-bar"
              style={{
                height: `${h}%`,
                opacity: i >= WAVE_HEIGHTS.length - 6 ? 0.95 : 0.45 + (i / WAVE_HEIGHTS.length) * 0.5,
                background: i >= WAVE_HEIGHTS.length - 6
                  ? "linear-gradient(180deg, #34d399, #06b6d4)"
                  : "linear-gradient(180deg, #a7f3d0, #bae6fd)",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: "10.5px", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
          <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>ahora</span>
        </div>

        <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 14, color: "var(--ink-2)", fontSize: 14 }}>
          <span className="delta-badge">
            <TrendingUp size={12} />
            Pantalla −18m
          </span>
          <span className="delta-badge" style={{ background: "rgba(244,63,94,.08)", color: "#be123c" }}>
            <TrendingDown size={12} />
            Sueño −0.3h
          </span>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>↑ Ánimo +0.6</span>
        </div>
      </section>

      {/* Check-in card */}
      <section className="checkin-card fade-up delay-3" aria-label="Check-in del día">
        <div>
          <div className="cm-badge">Tu check-in del día</div>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: "italic", margin: "0 0 10px", fontSize: "clamp(28px, 3.5vw, 38px)", letterSpacing: "-0.02em", lineHeight: 1.1, color: "#ecfdf5" }}>
            Tengo <em style={{ background: "linear-gradient(135deg, #34d399 0%, #5eead4 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>3 preguntas</em><br />
            para entender tu día.
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.55, color: "rgba(236,253,245,.75)", margin: "0 0 18px" }}>
            Soy <b style={{ color: "#ecfdf5" }}>Kairós</b>, tu copiloto. Solo te interrumpo una vez al día — cuando termines, los agentes de <b style={{ color: "#ecfdf5" }}>ánimo</b>, <b style={{ color: "#ecfdf5" }}>sueño</b> y <b style={{ color: "#ecfdf5" }}>foco</b> ajustan lo que ves aquí.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.08)", fontSize: "11.5px", color: "rgba(236,253,245,.5)", alignItems: "center" }}>
            <span style={{ marginRight: 4, fontWeight: 500, letterSpacing: "0.04em" }}>Toman el check-in:</span>
            {[
              { name: "Ánimo", color: "#fb7185" },
              { name: "Sueño", color: "#60a5fa" },
              { name: "Foco", color: "#a78bfa" },
            ].map((a) => (
              <span key={a.name} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 11px 5px 9px", borderRadius: 999, background: "rgba(255,255,255,.06)", fontSize: "12.5px", fontWeight: 500, color: "#ecfdf5" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: a.color, display: "inline-block" }} />
                {a.name}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Link href="/chat" style={{ flex: 1, padding: "12px 16px", borderRadius: 12, background: "linear-gradient(135deg, #10b981, #06b6d4)", color: "#fff", fontWeight: 600, fontSize: 14, textAlign: "center", textDecoration: "none", display: "block", boxShadow: "0 10px 20px -10px rgba(16,185,129,.5)", letterSpacing: "-0.01em" }}>
              Empezar check-in →
            </Link>
            <button style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,.08)", color: "#ecfdf5", border: "1px solid rgba(255,255,255,.15)", fontFamily: "inherit", fontSize: 14, fontWeight: 500, cursor: "pointer", letterSpacing: "-0.01em", transition: "all .2s" }}>
              Después
            </button>
          </div>
        </div>

        {/* Kairós orb */}
        <div className="kairos-orb-wrap">
          <div className="orb-glow" />
          <div className="orb-K">K</div>
        </div>
      </section>

      {/* Progress rings */}
      <div className="sect-h fade-up delay-4">
        <h3>Esta semana</h3>
        <span className="ln" />
        <span className="sub">progreso acumulado</span>
      </div>
      <div className="progress-grid fade-up delay-4">
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
              <span style={{ position: "relative", zIndex: 1, fontSize: "12.5px", fontWeight: 700, color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>
                {ring.pct}%
              </span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{ring.name}</div>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: 22, color: "var(--ink)", lineHeight: 1.1, marginTop: 2 }}>{ring.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Habits today */}
      <div className="sect-h fade-up" style={{ animationDelay: "0.45s" }}>
        <h3>Hábitos hoy</h3>
        <span className="ln" />
        <Link href="/habits" style={{ fontSize: "12.5px", color: "var(--muted)", textDecoration: "none", fontWeight: 600 }}>
          ver todos →
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }} className="fade-up" >
        {HABITS_TODAY.map((h) => (
          <div key={h.id} className={`hb-row${h.done ? " done" : ""}`}>
            <button className="hb-check" aria-label={h.done ? "Completado" : "Marcar como completado"}>
              {h.done && <Check size={14} strokeWidth={3} />}
            </button>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: h.icon.bg, color: h.icon.color, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Zap size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
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
        <button
          style={{
            width: "100%",
            background: "transparent",
            border: "1.5px dashed var(--line)",
            borderRadius: 14,
            padding: 16,
            fontFamily: "inherit",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--muted)",
            cursor: "pointer",
            transition: "all .15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--teal-500)";
            e.currentTarget.style.color = "var(--teal-700)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--line)";
            e.currentTarget.style.color = "var(--muted)";
          }}
        >
          + Añadir un hábito
        </button>
      </div>
    </AppShell>
  );
}
