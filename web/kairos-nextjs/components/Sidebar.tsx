"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    title: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <rect x="3" y="3" width="7" height="9" rx="1.5"/>
        <rect x="14" y="3" width="7" height="5" rx="1.5"/>
        <rect x="14" y="12" width="7" height="9" rx="1.5"/>
        <rect x="3" y="16" width="7" height="5" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: "/chat",
    title: "Chat",
    dot: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: "/habits",
    title: "Hábitos",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  {
    href: "/report",
    title: "Agentes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/>
      </svg>
    ),
  },
  {
    href: "/cv",
    title: "Visión IA",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
  },
];

const NAV_BOTTOM = [
  {
    href: "/profile",
    title: "Analytics",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M3 3v18h18"/><path d="m7 14 4-4 4 4 5-5"/>
      </svg>
    ),
  },
  {
    href: "/profile",
    title: "Ajustes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="sidebar-desktop" aria-label="Navegación principal">
      {/* Logo */}
      <Link href="/dashboard" className="sidebar-logo" aria-label="Kairós">
        <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: 24, lineHeight: 1, letterSpacing: "-0.02em" }}>
          K
        </span>
      </Link>

      {/* Main nav */}
      <div className="nav-items">
        {NAV_ITEMS.map(({ href, title, icon, dot }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`nav-item${active ? " active" : ""}`}
              title={title}
              aria-label={title}
              aria-current={active ? "page" : undefined}
            >
              {icon}
              {dot && <span className="nav-dot" />}
            </Link>
          );
        })}

        <div className="nav-sep" />

        {NAV_BOTTOM.map(({ href, title, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={`${href}-${title}`}
              href={href}
              className={`nav-item${active ? " active" : ""}`}
              title={title}
              aria-label={title}
            >
              {icon}
            </Link>
          );
        })}
      </div>

      {/* Avatar */}
      <div className="sidebar-avatar" title="Perfil">A</div>
    </nav>
  );
}
