# US-AI-006 — Onboarding: Submit PHQ-9 / GAD-7 to Real API

**Owner:** Juan Gomez (AI Engineer)  
**Branch:** `feat/agent/feature/US-AI-006-onboarding-survey-submit`  
**Parallelizable with:** US-AI-007, US-AI-008, US-AI-009  
**Depends on:** US-AI-005 (lib/agent.ts exists), US-API-004 (lib/api.ts exists)  
**Priority:** High — sin esto los scores PHQ/GAD no llegan a la DB y el triage no tiene baseline

---

## Historia

Como usuario que acaba de registrarse, quiero que mis respuestas del PHQ-9 y GAD-7 iniciales se guarden en el backend al completar el onboarding, para que Kairós tenga una línea de base de bienestar y el dashboard muestre mis scores reales.

---

## Situación actual

`web/kairos-nextjs/app/onboarding/page.tsx` (si existe) o cualquier pantalla de onboarding navega directamente a `/dashboard` sin llamar a `POST /api/v1/surveys/{type}`. El dashboard muestra `last_phq9_score: 0` y `last_gad7_score: 0` porque nunca se cargaron datos.

---

## Criterios de aceptación

1. Al finalizar el flujo de onboarding, se llama `submitSurvey("phq9", answers)` (ya existe en `lib/api.ts`)
2. Si la llamada falla, el usuario igual avanza al dashboard (no bloqueante) y se muestra un toast/banner de error
3. Al cargar el dashboard después del onboarding, los ScoreBadge muestran los scores reales (no 0)
4. Si `NEXT_PUBLIC_USE_MOCK=true`, el submit no hace llamada real (mock silencioso)

---

## Implementación

### Archivo a modificar
- `web/kairos-nextjs/app/onboarding/page.tsx` — agregar llamada a `submitSurvey` antes de `router.push("/dashboard")`

### Patrón a seguir
```typescript
import { submitSurvey } from "@/lib/api";

// En handleFinishOnboarding (o como se llame la función de submit):
try {
  await submitSurvey("phq9", phq9Answers);  // phq9Answers: Record<string, number>
  await submitSurvey("gad7", gad7Answers);  // gad7Answers: Record<string, number>
} catch {
  // no bloquear — mostrar banner pero continuar
}
router.push("/dashboard");
```

### `submitSurvey` signature (ya en lib/api.ts)
```typescript
export async function submitSurvey(
  type: "phq9" | "gad7",
  answers: Record<string, number>
): Promise<void>
```

### Si onboarding/page.tsx no existe aún
Crear una versión mínima para el demo:
- Paso 1: PHQ-9 (9 preguntas, opciones 0-3)
- Paso 2: GAD-7 (7 preguntas, opciones 0-3)
- Paso 3: Submit + redirect

---

## Definition of Done

- [ ] `submitSurvey` se llama al finalizar onboarding (PHQ-9 y GAD-7)
- [ ] Error no bloquea navegación a dashboard
- [ ] Dashboard muestra scores ≠ 0 después de onboarding (con datos reales o mock)
- [ ] Sin errores de TypeScript (`npx tsc --noEmit`)
