"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { AuthSpinner } from "@/components/AuthSpinner";

const AGENTS_ACTIVE = [
  {
    id: "mood",
    name: "Ánimo",
    color: "#fb7185",
    type: "RECOPILACIÓN DIARIA",
    pct: 0,
    conversations: 2,
    data: [
      { done: true,  text: "Ánimo de ayer · 4/5" },
      { done: true,  text: "Tendencia semanal · subiendo" },
      { done: true,  text: "Mejor día · viernes" },
      { done: false, text: "Para empezar — ¿cómo te sientes ahora?" },
      { done: false, text: "Algo que esté rondando tu cabeza hoy" },
    ],
  },
  {
    id: "sleep",
    name: "Sueño",
    color: "#60a5fa",
    type: "RECOPILACIÓN DIARIA",
    pct: 0,
    conversations: 1,
    data: [
      { done: true,  text: "Horas anoche · 7.4h" },
      { done: true,  text: "Despertar · 7:12" },
      { done: false, text: "Cómo sentiste el sueño" },
    ],
  },
  {
    id: "focus",
    name: "Foco",
    color: "#a78bfa",
    type: "RECOPILACIÓN DIARIA",
    pct: 0,
    conversations: 1,
    data: [
      { done: true,  text: "Sesiones esta semana · 3" },
      { done: true,  text: "Récord · 95 min ininterrumpidos" },
      { done: false, text: "Qué te importa hoy" },
    ],
  },
  {
    id: "fuel",
    name: "Energía",
    color: "#84cc16",
    type: "RECOPILACIÓN DIARIA",
    pct: 0,
    conversations: 1,
    data: [
      { done: true,  text: "Pasos hoy · 4.2k" },
      { done: true,  text: "Hidratación · 1.2L" },
      { done: false, text: "Para cerrar — ¿desayunaste hoy?" },
    ],
  },
];

const AGENTS_PASSIVE = [
  {
    id: "screen",
    name: "Pantalla",
    color: "#6366f1",
    type: "PASIVO · SENSOR",
    pct: 100,
    data: [
      { text: "Tiempo hoy · 1h 42m" },
      { text: "App top · YouTube 45m" },
      { text: "Pico · 18–19h" },
    ],
  },
  {
    id: "streak",
    name: "Racha",
    color: "#f59e0b",
    type: "PASIVO · CÁLCULO",
    pct: 100,
    data: [
      { text: "Racha actual · 12 días" },
      { text: "Récord · 14 días" },
    ],
  },
];

const CORE_DATA = [
  "Ánimo · 3 datos",
  "Sueño · 2 datos",
  "Foco · 2 datos",
  "Energía · 2 datos",
  "Pantalla · 3 datos",
];

export default function AgentsPage() {
  const { checking } = useRequireAuth();
  if (checking) return <AuthSpinner />;

  const allItems = AGENTS_ACTIVE.flatMap((a) => a.data);
  const doneItems = allItems.filter((d) => d.done).length;
  const todayPct = Math.round((doneItems / allItems.length) * 100);

  return (
    <AppShell showRight={false}>
      {/* ── Hero ─────────────────────────────────── */}
      <section style={{ position: "relative", marginBottom: 32, paddingTop: 8 }}>
        {/* Orbital K decoration */}
        <div
          aria-hidden="true"
          style={{ position: "absolute", top: -10, right: -10, width: 180, height: 180, opacity: 0.18, pointerEvents: "none" }}
        >
          <div style={{ position: "relative", width: 180, height: 180 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px dashed rgba(139,92,246,.5)", animation: "kspin 14s linear infinite" }} />
            <div style={{ position: "absolute", inset: 22, borderRadius: "50%", border: "1px dashed rgba(99,102,241,.4)", animation: "kspin 9s linear infinite reverse" }} />
            <div style={{ position: "absolute", top: "50%", left: "50%", width: 80, height: 80, marginLeft: -40, marginTop: -40, borderRadius: "50%", animation: "kspin 14s linear infinite" }}>
              <div style={{ position: "absolute", top: -5, left: "50%", width: 10, height: 10, borderRadius: "50%", background: "#8b5cf6", transform: "translateX(-50%)" }} />
            </div>
            <div style={{ position: "absolute", top: "50%", left: "50%", width: 118, height: 118, marginLeft: -59, marginTop: -59, borderRadius: "50%", animation: "kspin 9s linear infinite reverse" }}>
              <div style={{ position: "absolute", top: -4, left: "50%", width: 8, height: 8, borderRadius: "50%", background: "#fb7185", transform: "translateX(-50%)" }} />
              <div style={{ position: "absolute", bottom: -4, right: "12%", width: 6, height: 6, borderRadius: "50%", background: "#60a5fa" }} />
            </div>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#8b5cf6,#6366f1)", display: "grid", placeItems: "center" }}>
              <span style={{ fontFamily: "'Outfit','Inter',sans-serif", fontWeight: 700, fontSize: 20, color: "#fff" }}>K</span>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 500, position: "relative" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--teal-600)", marginBottom: 10 }}>
            El equipo
          </div>
          <h1 style={{ fontFamily: "'Outfit','Inter',sans-serif", fontWeight: 700, fontSize: "clamp(30px,4vw,42px)", letterSpacing: "-0.03em", lineHeight: 1.05, margin: "0 0 12px", color: "var(--ink)" }}>
            Tus{" "}
            <span style={{ background: "linear-gradient(135deg,#8b5cf6,#6366f1)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              agentes
            </span>
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, margin: 0 }}>
            Seis especialistas trabajando juntos. Cada uno recopila un tipo de información sobre tu día.
            Habla con cualquiera o pídele a <b style={{ color: "var(--ink)" }}>Kairós Core</b> una mirada global.
          </p>
        </div>

        {/* Info cards 01 / 02 / 03 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 22 }}>
          {[
            { n: "01", title: "Cada agente cuida un terreno", desc: "Ánimo, sueño, foco, energía, pantalla y rachas. Solo se entrometen cuando importa." },
            { n: "02", title: "Tú decides cuándo hablar", desc: "Una recopilación diaria de 4 min con los subagentes — o conversación libre con Kairós Core." },
            { n: "03", title: "Kairós Core une los hilos", desc: "El agente principal lee lo que aprendieron los demás y te devuelve patrones, no datos sueltos." },
          ].map((c) => (
            <div key={c.n} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 8, fontFamily: "'JetBrains Mono',monospace" }}>{c.n}</div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", marginBottom: 6, lineHeight: 1.3 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section header ───────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ fontFamily: "'Outfit','Inter',sans-serif", fontWeight: 600, fontSize: 17, color: "var(--ink)", margin: 0 }}>Tus agentes</h2>
        <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
          Recopilación de hoy ·{" "}
          <span style={{ color: todayPct > 0 ? "var(--teal-600)" : "var(--muted)" }}>{todayPct}%</span>
        </span>
      </div>

      {/* ── Action buttons ───────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        <Link
          href="/chat?mode=checkin"
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 18px", borderRadius: 14, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", textDecoration: "none", boxShadow: "0 8px 20px -10px rgba(99,102,241,.5)" }}
        >
          <span style={{ fontSize: 16 }}>▶</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Empezar recopilación del día</div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>4 agentes · ≈ 4 min</div>
          </div>
        </Link>

        <Link
          href="/chat?mode=core"
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 18px", borderRadius: 14, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink)", textDecoration: "none" }}
        >
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#8b5cf6,#6366f1)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>K</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Hablar con Kairós Core</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>conoce todo</div>
          </div>
        </Link>
      </div>

      {/* ── Kairós Core card ─────────────────────── */}
      <div style={{ background: "var(--surface)", border: "1px solid rgba(139,92,246,.2)", borderRadius: 16, padding: "20px", marginBottom: 14, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#8b5cf6,#6366f1,#8b5cf6)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" as const }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#8b5cf6", display: "inline-block", boxShadow: "0 0 8px #8b5cf6" }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>Kairós Core</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", padding: "2px 8px", borderRadius: 99, background: "rgba(139,92,246,.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,.25)" }}>PRINCIPAL</span>
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>SINTETIZADOR PRINCIPAL</span>
          <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "rgba(139,92,246,.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,.2)" }}>100%</div>
        </div>

        <div style={{ height: 2, background: "var(--line)", borderRadius: 99, marginBottom: 16 }}>
          <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg,#8b5cf6,#6366f1)", borderRadius: 99 }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 6, marginBottom: 18 }}>
          {CORE_DATA.map((item) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-2)" }}>
              <span style={{ color: "var(--teal-600)", fontSize: 12, flexShrink: 0 }}>✓</span>
              {item}
            </div>
          ))}
        </div>

        <Link
          href="/chat?mode=core"
          style={{ display: "block", width: "100%", padding: "12px", borderRadius: 12, background: "rgba(139,92,246,.08)", border: "1px solid rgba(139,92,246,.2)", color: "#a78bfa", textAlign: "center" as const, fontWeight: 600, fontSize: 13.5, textDecoration: "none" }}
        >
          Hablar con Kairós →
        </Link>
      </div>

      {/* ── Active agents 2×2 ────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        {AGENTS_ACTIVE.map((agent) => {
          const pending = agent.data.filter((d) => !d.done);
          return (
            <div key={agent.id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px", display: "flex", flexDirection: "column" as const }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: agent.color, display: "inline-block" }} />
                <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)", flex: 1 }}>{agent.name}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: `${agent.color}18`, color: agent.color, border: `1px solid ${agent.color}30` }}>{agent.pct}%</span>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: "var(--muted)", marginBottom: 10, textTransform: "uppercase" as const }}>{agent.type}</div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, gap: 5, marginBottom: 12 }}>
                {agent.data.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 11.5, color: d.done ? "var(--ink-2)" : "var(--muted)" }}>
                    <span style={{ color: d.done ? "var(--teal-600)" : "var(--muted)", fontSize: 11, flexShrink: 0, marginTop: 1 }}>{d.done ? "✓" : "○"}</span>
                    {d.text}
                  </div>
                ))}
              </div>

              {pending.length > 0 && (
                <div style={{ fontSize: 11, color: agent.color, marginBottom: 10, fontFamily: "'JetBrains Mono',monospace" }}>
                  @{agent.name.toLowerCase()} · {pending.length} pendiente{pending.length > 1 ? "s" : ""}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <Link
                  href={`/chat?agent=${agent.id}`}
                  style={{ flex: 1, padding: "9px 10px", borderRadius: 10, background: `${agent.color}12`, border: `1px solid ${agent.color}30`, color: agent.color, textAlign: "center" as const, fontWeight: 600, fontSize: 12, textDecoration: "none" }}
                >
                  Conversar ({agent.conversations}) →
                </Link>
                <button style={{ padding: "9px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--muted)", fontFamily: "inherit", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                  Detalle
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Passive agents ───────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 40 }}>
        {AGENTS_PASSIVE.map((agent) => (
          <div key={agent.id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px", display: "flex", flexDirection: "column" as const }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: agent.color, display: "inline-block" }} />
              <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)", flex: 1 }}>{agent.name}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: `${agent.color}18`, color: agent.color, border: `1px solid ${agent.color}30` }}>{agent.pct}%</span>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: "var(--muted)", marginBottom: 10, textTransform: "uppercase" as const }}>{agent.type}</div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, gap: 5, marginBottom: 14 }}>
              {agent.data.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 11.5, color: "var(--ink-2)" }}>
                  <span style={{ color: "var(--teal-600)", fontSize: 11, flexShrink: 0, marginTop: 1 }}>✓</span>
                  {d.text}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ flex: 1, padding: "9px 10px", borderRadius: 10, background: `${agent.color}10`, border: `1px solid ${agent.color}25`, color: agent.color, fontFamily: "inherit", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                Al día →
              </button>
              <button style={{ padding: "9px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--muted)", fontFamily: "inherit", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                Detalle
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`@keyframes kspin { to { transform: rotate(360deg); } }`}</style>
    </AppShell>
  );
}
