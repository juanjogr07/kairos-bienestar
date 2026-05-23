"use client";

import { usePathname, useRouter } from "next/navigation";
import { BarChart3, MessageCircle, Zap, User } from "lucide-react";
import { Tabs, Tab } from "@heroui/react";

const tabs = [
  { href: "/dashboard", label: "Dashboard", Icon: BarChart3 },
  { href: "/chat", label: "Chat", Icon: MessageCircle },
  { href: "/habits", label: "Hábitos", Icon: Zap },
  { href: "/profile", label: "Perfil", Icon: User },
];

/**
 * Navegación inferior (mobile) / lateral (desktop).
 *
 * Usa el componente Tabs de HeroUI para gestionar selección + accesibilidad
 * (aria-selected, focus trap, navegación por teclado). En desktop se renderiza
 * vertical y en mobile horizontal aprovechando `placement`.
 */
export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const activeKey =
    tabs.find((t) => pathname?.startsWith(t.href))?.href ?? "/dashboard";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border-subtle bg-bg-surface/90 backdrop-blur-xl md:left-0 md:top-0 md:right-auto md:h-screen md:w-20 md:border-r md:border-t-0"
      aria-label="Navegación principal"
    >
      <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-3 md:h-full md:max-w-none md:flex-col md:items-center md:justify-start md:gap-2 md:py-6">
        <div className="hidden md:mb-4 md:block">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-cta shadow-glow-green">
            <span
              className="font-bold text-bg-deep"
              style={{ fontSize: 22, lineHeight: 1 }}
            >
              ✦
            </span>
          </div>
        </div>

        <Tabs
          aria-label="Secciones principales"
          selectedKey={activeKey}
          onSelectionChange={(key) => router.push(String(key))}
          variant="light"
          color="primary"
          classNames={{
            base: "w-full md:w-auto",
            tabList:
              "w-full gap-1 bg-transparent p-0 md:flex-col md:gap-3 md:rounded-none",
            cursor:
              "bg-transparent shadow-glow-green data-[selected=true]:opacity-0",
            tab: "h-auto min-h-[44px] min-w-[64px] flex-col gap-1 px-3 py-2 data-[hover-unselected=true]:opacity-100",
            tabContent:
              "group-data-[selected=true]:text-accent-primary text-text-secondary",
          }}
        >
          {tabs.map(({ href, label, Icon }) => {
            const active = href === activeKey;
            return (
              <Tab
                key={href}
                aria-label={label}
                title={
                  <span className="flex flex-col items-center gap-1">
                    <Icon
                      size={22}
                      strokeWidth={active ? 2.4 : 2}
                      className={
                        active
                          ? "text-accent-primary drop-shadow-[0_0_8px_rgba(79,255,176,0.6)]"
                          : ""
                      }
                    />
                    <span className="text-[11px] font-medium leading-none">
                      {label}
                    </span>
                  </span>
                }
              />
            );
          })}
        </Tabs>
      </div>
    </nav>
  );
}
