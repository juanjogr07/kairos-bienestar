"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageCircle, CheckSquare, Sparkles, User } from "lucide-react";

const TABS = [
  { href: "/dashboard", label: "Inicio", Icon: LayoutDashboard },
  { href: "/chat", label: "Chat", Icon: MessageCircle },
  { href: "/habits", label: "Hábitos", Icon: CheckSquare },
  { href: "/report", label: "Reporte", Icon: Sparkles },
  { href: "/profile", label: "Perfil", Icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="bottom-nav-mobile"
      aria-label="Navegación principal"
    >
      <ul
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          width: "100%",
          margin: 0,
          padding: "0 8px",
          listStyle: "none",
        }}
      >
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 12px",
                  borderRadius: 10,
                  color: active ? "var(--teal-600)" : "var(--muted)",
                  textDecoration: "none",
                  transition: "color 0.15s ease",
                }}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                <span style={{ fontSize: 10, fontWeight: active ? 600 : 500, lineHeight: 1 }}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
