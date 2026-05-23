# US-AI-008 — Profile Page: Wire to Real Survey History API

**Owner:** Juan Gomez (AI Engineer)  
**Branch:** `feat/agent/feature/US-AI-008-profile-real-api`  
**Parallelizable con:** US-AI-006, US-AI-007, US-AI-009  
**Depends on:** US-API-004 (lib/api.ts con `getDashboard`), Supabase schema `survey_responses`  
**Priority:** Medium — completa la narrativa de bienestar para el demo

---

## Historia

Como usuario, quiero ver en mi perfil el historial de mis scores PHQ-9 y GAD-7 con fechas reales, para entender cómo ha evolucionado mi bienestar a lo largo del tiempo.

---

## Situación actual

`app/profile/page.tsx` probablemente muestra datos estáticos o solo del dashboard. No hay llamada a un endpoint de historial de surveys.

---

## Criterios de aceptación

1. La página de perfil muestra nombre/email del usuario autenticado (desde Supabase session)
2. Muestra el último PHQ-9 score con fecha y categoría ("Mínimo", "Leve", "Moderado", "Severo")
3. Muestra el último GAD-7 score con fecha y categoría
4. Si no hay surveys previos → mensaje "Completa tu primer screening en Onboarding"
5. "Cerrar sesión" llama `supabase.auth.signOut()` y redirige a `/`

---

## Implementación

### Endpoint a usar
`getDashboard()` ya retorna `last_phq9_score` y `last_gad7_score`. Usarlo directamente.

Para email/nombre del usuario:
```typescript
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
// user.email, user.user_metadata.full_name
```

### Score → categoría PHQ-9
```typescript
function phq9Category(score: number): string {
  if (score <= 4) return "Mínimo";
  if (score <= 9) return "Leve";
  if (score <= 14) return "Moderado";
  if (score <= 19) return "Moderadamente severo";
  return "Severo";
}
```

### Score → categoría GAD-7
```typescript
function gad7Category(score: number): string {
  if (score <= 4) return "Mínimo";
  if (score <= 9) return "Leve";
  if (score <= 14) return "Moderado";
  return "Severo";
}
```

### Logout
```typescript
async function handleLogout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  router.push("/");
}
```

### UI mínima de perfil
```
Avatar inicial + email del usuario
─────────────────────────────
PHQ-9    [score]  [categoría]  [fecha]
GAD-7    [score]  [categoría]  [fecha]
─────────────────────────────
[Cerrar sesión]
```

Reutilizar `ScoreBadge` de `components/Badges.tsx` si ya existe.

---

## Definition of Done

- [ ] Email/nombre del usuario autenticado visible
- [ ] PHQ-9 y GAD-7 scores con categoría correcta
- [ ] "Cerrar sesión" funciona y redirige a `/`
- [ ] Sin datos → mensaje informativo (no crash)
- [ ] Sin errores TypeScript
