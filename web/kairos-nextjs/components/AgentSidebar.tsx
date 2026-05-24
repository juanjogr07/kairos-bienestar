"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getProgressSummary } from "@/lib/agent";

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
    href: "/agents",
    label: "Agentes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/>
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

export function AgentSidebar() {
  const pathname = usePathname();
  const [streakDays, setStreakDays] = useState(0);
  const [phase, setPhase] = useState("Fase 1");

  useEffect(() => {
    getProgressSummary().then((p) => {
      setStreakDays(p?.current_streak ?? 0);
      setPhase(p?.phase_label ?? "Fase 1");
    }).catch(() => {});
  }, []);

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
