"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
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
        strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: "/habits",
    label: "Hábitos",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  {
    href: "/agents",
    label: "Agentes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
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
        strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
  },
];

const BOTTOM_ITEMS = [
  {
    href: "/report",
    label: "Reporte",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Ajustes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

export function AgentSidebar() {
  const pathname = usePathname();

  return (
    <nav className="agent-sidebar" aria-label="Navegación principal">
      {/* Logo */}
      <Link href="/dashboard" className="sidebar-logo" aria-label="Kairós">
        <span style={{ fontFamily: "'Outfit','Inter',sans-serif", fontWeight: 700, fontSize: 20, lineHeight: 1 }}>K</span>
      </Link>

      {/* Main nav */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 24, flex: 1 }}>
        {NAV_ITEMS.map(({ href, label, icon, dot }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`agent-sidebar-nav${active ? " active" : ""}`}
              style={{ justifyContent: "center", padding: "10px 0" }}
            >
              <span style={{ opacity: active ? 1 : 0.45, position: "relative" }}>
                {icon}
                {dot && (
                  <span style={{
                    position: "absolute", top: -1, right: -1,
                    width: 6, height: 6, borderRadius: "50%",
                    background: "var(--teal-500, #8b5cf6)",
                    border: "1.5px solid var(--surface, #fff)",
                  }} />
                )}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--line)", margin: "8px 12px" }} />

      {/* Bottom nav */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
        {BOTTOM_ITEMS.map(({ href, label, icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`agent-sidebar-nav${active ? " active" : ""}`}
              style={{ justifyContent: "center", padding: "10px 0" }}
            >
              <span style={{ opacity: active ? 1 : 0.4 }}>{icon}</span>
            </Link>
          );
        })}
      </div>

      {/* User avatar */}
      <Link href="/profile" aria-label="Perfil" style={{ display: "flex", justifyContent: "center", textDecoration: "none", paddingBottom: 4 }}>
        <div className="sidebar-avatar" style={{ width: 34, height: 34, fontSize: 13 }}>A</div>
      </Link>
    </nav>
  );
}
