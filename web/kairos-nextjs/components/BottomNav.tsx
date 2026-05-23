"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, MessageCircle, Zap, User, Sparkles } from "lucide-react";

const tabs = [
  { href: "/dashboard", label: "Dashboard", Icon: BarChart3 },
  { href: "/chat", label: "Chat", Icon: MessageCircle },
  { href: "/habits", label: "Hábitos", Icon: Zap },
  { href: "/report", label: "Reporte", Icon: Sparkles },
  { href: "/profile", label: "Perfil", Icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border-subtle bg-bg-surface/90 backdrop-blur-xl md:left-0 md:top-0 md:right-auto md:h-screen md:w-20 md:border-r md:border-t-0"
      aria-label="Navegación principal"
    >
      <ul className="mx-auto flex max-w-2xl items-center justify-around px-2 py-3 md:h-full md:max-w-none md:flex-col md:items-center md:justify-start md:gap-2 md:py-6">
        <li className="hidden md:mb-4 md:block">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-cta shadow-glow-green">
            <span
              className="font-bold text-bg-deep"
              style={{ fontSize: 22, lineHeight: 1 }}
            >
              ✦
            </span>
          </div>
        </li>
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`group relative flex min-h-[44px] min-w-[64px] flex-col items-center justify-center gap-1 rounded-md px-3 py-2 transition-colors ${
                  active
                    ? "text-accent-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
                aria-label={label}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.4 : 2}
                  className={
                    active
                      ? "drop-shadow-[0_0_8px_rgba(79,255,176,0.6)]"
                      : ""
                  }
                />
                <span className="text-[11px] font-medium leading-none">
                  {label}
                </span>
                {active && (
                  <span className="absolute -top-[1px] left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-accent-primary shadow-glow-green md:left-0 md:top-1/2 md:h-8 md:w-[2px] md:-translate-x-0 md:-translate-y-1/2" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
