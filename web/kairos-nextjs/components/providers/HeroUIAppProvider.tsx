"use client";

import { HeroUIProvider } from "@heroui/react";
import { useRouter } from "next/navigation";

/**
 * Provider raíz de HeroUI.
 *
 * - Inyecta el `useRouter` de Next.js para que componentes con `href` (Link,
 *   Tabs, Listbox, etc.) hagan navegación SPA en vez de full reload.
 * - Debe envolver toda la app desde `app/layout.tsx`.
 */
export function HeroUIAppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      {children}
    </HeroUIProvider>
  );
}
