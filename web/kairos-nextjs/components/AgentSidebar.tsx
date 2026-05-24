"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getProgressSummary, type ProgressSummary } from "@/lib/agent";

// ── Specialist definitions ────────────────────────────────────────────────────
const SPECIALISTS = [
  { id: "mood",    label: "Ánimo",    color: "#fb7185", icon: "◐" },
  { id: "morning", label: "Mañana",   color: "#f59e0b", icon: "☀" },
  { id: "sleep",   label: "Sueño",    color: "#60a5fa", icon: "◑" },
  { id: "fuel",    label: "Energía",  color: "#84cc16", icon: "⚡" },
  { id: "focus",   label: "Foco",     color: "#a78bfa", icon: "◎" },
  { id: "screen",  label: "Pantalla", color: "#6366f1", icon: "▣" },
  { id: "insight", label: "Insights", color: "#10b981", icon: "✦" },
];

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <rect x="3" y="3" width="7" height="9" rx="1.5"/>
        <rect x="14" y="3" width="7" height="5" rx="1.5"/>
        <rect x="14" y="12" width="7" height="9" rx="1.5"/>
        <rect x="3" y="16" width="7" height="5" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: "/chat",
    label: "Kairós IA",
    dot: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: "/habits",
    label: "Hábitos",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  {
    href: "/report",
    label: "Reporte",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <path d="M3 3v18h18"/><path d="m7 14 4-4 4 4 5-5"/>
      </svg>
    ),
  },
  {
    href: "/cv",
    label: "Visión IA",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
  },
];

// Derive which specialists are "active" from progress data + time of day
function deriveAgentStatus(progress: ProgressSummary | null): Record<string, string> {
  const hour = new Date().getHours();
  const log = progress?.today_log ?? {};
  const status: Record<string, string> = {};

  const morningDone = !!log.morning_mood;
  const moodScore = (log.morning_mood as number) ?? null;
  const sleepHours = (log.sleep_hours as number) ?? null;
  const screenHours = (log.screen_hours as number) ?? null;
  const hoursSinceMeal = (log.hours_since_meal as number) ?? null;

  // Morning agent
  if (!morningDone && hour < 11) {
    status["morning"] = "activo";
  } else if (morningDone) {
    status["morning"] = "completado";
  } else {
    status["morning"] = "en espera";
  }

  // Mood
  if (moodScore !== null && moodScore <= 2) {
    status["mood"] = "activo";
  } else if (moodScore !== null) {
    status["mood"] = `ánimo ${moodScore}/5`;
  } else {
    status["mood"] = "sin datos";
  }

  // Sleep
  if (sleepHours !== null && sleepHours < 5) {
    status["sleep"] = "activo · alerta";
  } else if (sleepHours !== null) {
    status["sleep"] = `${sleepHours}h anoche`;
  } else if (hour >= 21) {
    status["sleep"] = "activo";
  } else {
    status["sleep"] = "en espera";
  }

  // Fuel
  if (hoursSinceMeal !== null && hoursSinceMeal > 8) {
    status["fuel"] = "activo · alerta";
  } else if (hoursSinceMeal !== null) {
    status["fuel"] = "ok";
  } else {
    status["fuel"] = "sin datos";
  }

  // Screen
  if (screenHours !== null && screenHours > 3) {
    status["screen"] = `activo · ${screenHours}h`;
  } else {
    const todayMin = progress?.usage_14d?.today_minutes ?? 0;
    if (todayMin > 180) {
      status["screen"] = `${Math.round(todayMin)}min hoy`;
    } else {
      status["screen"] = "monitoreando";
    }
  }

  // Focus
  const hasFocusSessions = !!(log.focus_sessions);
  status["focus"] = hasFocusSessions ? "completado" : "en espera";

  // Insight
  const daysActive = progress?.days_active ?? 0;
  status["insight"] = daysActive >= 7 ? "disponible" : `${7 - daysActive}d restantes`;

  return status;
}

function isLive(statusText: string): boolean {
  return statusText.startsWith("activo");
}

export function AgentSidebar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState<ProgressSummary | null>(null);

  useEffect(() => {
    getProgressSummary().then(setProgress).catch(() => {});
  }, []);

  const agentStatus = deriveAgentStatus(progress);
  const activeAgents = SPECIALISTS.filter((s) => isLive(agentStatus[s.id] ?? ""));

  const streakDays = progress?.current_streak ?? 0;
  const phase = progress?.phase_label ?? "Fase 1";

  return (
    <nav className="agent-sidebar" aria-label="Sistema de agentes">
      {/* Logo + title */}
      <div className="agent-sidebar-header">
        <Link href="/dashboard" className="sidebar-logo" aria-label="Kairós" style={{ width: 36, height: 36, borderRadius: 10, marginBottom: 0 }}>
          <span style={{ fontFamily: "'Outfit','Inter',sans-serif", fontWeight: 700, fontSize: 18, lineHeight: 1 }}>K</span>
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.1, letterSpacing: "-0.02em" }}>Kairós</p>
          <p style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>{phase} · {streakDays}d racha</p>
        </div>
        {activeAgents.length > 0 && (
          <span style={{
            background: "rgba(79,255,176,0.15)",
            color: "var(--teal-600, #0d9488)",
            borderRadius: 99,
            padding: "2px 7px",
            fontSize: 10,
            fontWeight: 700,
            border: "1px solid rgba(79,255,176,0.3)",
            flexShrink: 0,
          }}>
            {activeAgents.length} activo{activeAgents.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Agents section */}
      <div className="agent-sidebar-section">
        <p className="agent-sidebar-label">SISTEMA DE AGENTES</p>
        {SPECIALISTS.map((sp) => {
          const st = agentStatus[sp.id] ?? "en espera";
          const live = isLive(st);
          return (
            <Link
              key={sp.id}
              href="/chat"
              className={`agent-sidebar-row${live ? " live" : ""}`}
              title={`Abrir chat con agente ${sp.label}`}
            >
              <span
                className="agent-sidebar-dot"
                style={{
                  background: sp.color,
                  // @ts-expect-error css var
                  "--pulse": sp.color + "80",
                }}
              />
              <span className="agent-sidebar-icon" style={{ color: sp.color }}>{sp.icon}</span>
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {sp.label}
              </span>
              <span style={{
                fontSize: 10.5,
                color: live ? "var(--teal-600, #0d9488)" : "var(--muted, #9ca3af)",
                fontWeight: live ? 600 : 400,
                flexShrink: 0,
              }}>
                {st}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="agent-sidebar-section" style={{ borderBottom: "none", paddingBottom: 0, flexShrink: 0 }}>
        <p className="agent-sidebar-label">NAVEGACIÓN</p>
        {NAV_ITEMS.map(({ href, label, icon, dot }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`agent-sidebar-nav${active ? " active" : ""}`}
            >
              <span style={{ flexShrink: 0, opacity: active ? 1 : 0.5 }}>{icon}</span>
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: active ? 600 : 400 }}>{label}</span>
              {dot && (
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal-500, #14b8a6)", flexShrink: 0 }} />
              )}
            </Link>
          );
        })}
      </div>

      {/* User avatar at bottom */}
      <div style={{ marginTop: "auto", paddingTop: 12 }}>
        <Link href="/profile" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", opacity: 0.7, padding: "8px 0" }}>
          <div className="sidebar-avatar" style={{ width: 30, height: 30, fontSize: 12, flexShrink: 0 }}>A</div>
          <span style={{ fontSize: 12.5, fontWeight: 500 }}>Perfil y ajustes</span>
        </Link>
      </div>
    </nav>
  );
}
