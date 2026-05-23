# US-AI-007 — Auth Protection: Redirect Unauthenticated Users

**Owner:** Juan Gomez (AI Engineer)  
**Branch:** `feat/agent/feature/US-AI-007-auth-protection`  
**Parallelizable con:** US-AI-006, US-AI-008, US-AI-009  
**Depends on:** `lib/supabase.ts` existe  
**Priority:** High — sin esto cualquiera puede ver el dashboard sin login

---

## Historia

Como producto en demo pública, quiero que las páginas protegidas (`/dashboard`, `/chat`, `/habits`, `/profile`, `/report`, `/onboarding`) redirijan al usuario a `/` si no tiene sesión activa, para que los datos del usuario de prueba no sean accesibles sin autenticación.

---

## Criterios de aceptación

1. Navegar a `/dashboard` sin sesión → redirect inmediato a `/`
2. Navegar a `/chat`, `/habits`, `/profile`, `/report` sin sesión → redirect a `/`
3. Usuario autenticado → sin redirect, página carga normalmente
4. El redirect usa `router.push("/")` del lado del cliente (no middleware de Next.js, para mantener compatibilidad con Vercel Free)
5. Mientras se verifica la sesión, mostrar skeleton/spinner (no flash del contenido)

---

## Implementación

### Opción A — Hook `useRequireAuth` (recomendada, reutilizable)

**Crear:** `web/kairos-nextjs/hooks/useRequireAuth.ts`

```typescript
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export function useRequireAuth() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/");
      else setChecking(false);
    });
  }, [router]);

  return { checking };
}
```

**Usar en cada página protegida:**

```typescript
// En el componente de la página:
const { checking } = useRequireAuth();
if (checking) return <div className="flex h-screen items-center justify-center"><span className="h-6 w-6 animate-spin rounded-full border-2 border-accent-secondary border-t-transparent" /></div>;
```

### Páginas a proteger

| Archivo | Cambio |
|---------|--------|
| `app/dashboard/page.tsx` | Agregar `useRequireAuth()` al inicio |
| `app/chat/page.tsx` | Agregar `useRequireAuth()` |
| `app/habits/page.tsx` | Agregar `useRequireAuth()` |
| `app/profile/page.tsx` | Agregar `useRequireAuth()` |
| `app/report/page.tsx` | Agregar `useRequireAuth()` |

### Opción B — AppShell (alternativa si se prefiere centralizar)

Mover la lógica al `AppShell` component que ya wrappea todas las páginas:
- Pro: un solo punto de cambio
- Con: AppShell se vuelve stateful, más difícil de probar

**Recomendación:** Opción A (hook), más explícito y fácil de auditar.

---

## Definition of Done

- [ ] Hook `useRequireAuth` creado en `hooks/useRequireAuth.ts`
- [ ] Las 5 páginas protegidas usan el hook
- [ ] Sin sesión → redirect a `/` sin flash del contenido
- [ ] Con sesión → páginas cargan normalmente
- [ ] Sin errores TypeScript
