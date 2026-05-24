"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

const INSIGHTS = [
  { title: "Buen ritmo de mañana", desc: "Llevas 2h sin abrir redes sociales. Sigue así.", meta: "9:42 · agente foco", color: "#10b981" },
  { title: "Café tardío detectado", desc: "Tu última taza fue a las 17:30 — podría afectar el sueño.", meta: "ayer · agente sueño", color: "#f59e0b" },
];

const CONNECTIONS = [
  { name: "Spotify", initial: "S", bg: "#1db954", connected: true },
  { name: "Calendario", initial: "C", bg: "#4285f4", connected: true },
  { name: "Notion", initial: "N", bg: "#0a0a0a", connected: false },
  { name: "Google Fit", initial: "F", bg: "#f59e0b", connected: false },
];

export function RightPanel() {
  return (
    <aside className="right-panel" aria-label="Panel lateral">
      {/* Chat CTA */}
      <Link href="/chat" className="chat-cta fade-up delay-1">
        <div className="av" style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#8b5cf6,#6366f1)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#ede9fe" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div style={{ flex: 1, lineHeight: 1.35 }}>
          <b style={{ display: "block", fontSize: "13.5px", fontWeight: 600 }}>Continuar con Kairós</b>
          <span style={{ fontSize: "11.5px", opacity: 0.75 }}>Última conversación · ayer 22:14</span>
        </div>
        <div style={{ opacity: 0.6 }}>
          <ChevronRight size={16} />
        </div>
      </Link>

      {/* Ver agentes CTA */}
      <div className="panel-section fade-up delay-2">
        <Link href="/agents" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(139,92,246,.08)", border: "1px solid rgba(139,92,246,.2)", textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#8b5cf6,#6366f1)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>K</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#a78bfa" }}>Ver tus agentes</div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: 1 }}>Recopilación · 4 agentes</div>
          </div>
          <ChevronRight size={14} style={{ color: "#a78bfa", opacity: 0.7 }} />
        </Link>
      </div>

      {/* Insights section */}
      <div className="panel-section fade-up delay-3">
        <div className="panel-title">Hoy en tu día</div>
        {INSIGHTS.map((ins) => (
          <div
            key={ins.title}
            className="ins-card"
            // @ts-expect-error css var
            style={{ "--ins-c": ins.color }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: "12.5px",
                marginBottom: 3,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: ins.color, flexShrink: 0, display: "inline-block" }} />
              {ins.title}
            </div>
            <div style={{ color: "var(--ink-2)", fontSize: "12.5px" }}>{ins.desc}</div>
            <div style={{ fontSize: "10.5px", color: "var(--muted)", marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
              {ins.meta}
            </div>
          </div>
        ))}
      </div>

      {/* Connections section */}
      <div className="panel-section fade-up delay-4">
        <div className="panel-title">Conexiones</div>
        <div className="conns-grid">
          {CONNECTIONS.map((conn) => (
            <div key={conn.name} className={`conn-card${conn.connected ? " connected" : ""}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: conn.bg, display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                  {conn.initial}
                </div>
                <span style={{ fontSize: "12.5px", fontWeight: 600 }}>{conn.name}</span>
              </div>
              {conn.connected ? (
                <div style={{ fontSize: "10.5px", color: "var(--teal-600)", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal-500)", display: "inline-block" }} />
                  Conectado
                </div>
              ) : (
                <div style={{ fontSize: "11.5px", color: "var(--blue-600)", fontWeight: 600 }}>+ conectar</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
