# Plan — US-AI-007: Auth Protection

Branch: `feat/agent/feature/US-AI-007-auth-protection`
Base: `dev`

## Step 1 — Crear el hook useRequireAuth

- [x] Crear `web/kairos-nextjs/hooks/useRequireAuth.ts` con la implementación de Opción A del US

## Step 2 — Proteger dashboard

- [x] Agregar `import { useRequireAuth } from "@/hooks/useRequireAuth"` a `app/dashboard/page.tsx`
- [x] Llamar `const { checking } = useRequireAuth();` al inicio del componente
- [x] Agregar guard spinner: `if (checking) return <spinner/>`

## Step 3 — Proteger chat

- [x] Agregar import a `app/chat/page.tsx`
- [x] Llamar hook y agregar guard spinner

## Step 4 — Proteger habits

- [x] Agregar import a `app/habits/page.tsx`
- [x] Llamar hook y agregar guard spinner

## Step 5 — Proteger profile

- [x] Agregar import a `app/profile/page.tsx`
- [x] Llamar hook y agregar guard spinner

## Step 6 — Proteger report

- [x] N/A — `app/report/page.tsx` no existe en la rama `dev` (fue creado en `main` posterior a este US)

## Step 7 — Verificar TypeScript

- [x] Ejecutar `tsc --noEmit` sin errores — PASSED

STOP & COMMIT
