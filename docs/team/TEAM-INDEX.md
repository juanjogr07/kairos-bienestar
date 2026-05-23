# Kairós — Índice de historias de usuario por persona

## Estrategia de ramas (todos)

```
main          ← producción, solo PR aprobados por lead
dev           ← integración, base de todo
feat/<rol>/<id>  ← feature
fix/<rol>/<id>   ← bugfix
mig/<id>         ← migraciones SQL (solo Backend-2)
exp/<id>         ← experimentos ML (solo Backend-1)
```

**Regla de oro:** `git pull origin dev` antes de crear cualquier rama. Nadie pushea a `main` directamente.

---

## 🤖 AI Engineer — `agent-service/agent/` · `agent-service/triage/` · `agent-service/rag/`

| ID | Historia | Prioridad | Estado | Rama |
|---|---|---|---|---|
| US-AI-001 | [Triage con contexto temporal](ai-engineer/US-AI-001-mejora-triage.md) | Alta | ✅ DONE | `feat/ai/US-AI-001-triage-temporal` |
| US-AI-002 | [Hábito sugerido en respuesta](ai-engineer/US-AI-002-suggested-habit.md) | Alta | ✅ DONE | `feat/ai/US-AI-002-suggested-habit` |
| US-AI-003 | [Reporte semanal generado por el agente](ai-engineer/US-AI-003-reporte-semanal.md) | Media | ✅ DONE | `feat/ai/US-AI-003-reporte-semanal` |
| US-AI-004 | [Protocolo de crisis no bypasseable](ai-engineer/US-AI-004-crisis-protocol.md) | **Crítica** | ✅ DONE | `feat/ai/US-AI-004-crisis-protocol` |
| US-AI-005 | [Integración chat frontend ↔ agent-service](ai-engineer/US-AI-005-chat-frontend-integration.md) | Alta | ✅ DONE | `feat/ai/US-AI-005-chat-integration` |
| US-AI-006 | [Onboarding: submit PHQ-9/GAD-7 a API real](ai-engineer/US-AI-006-onboarding-survey-submit.md) | Alta | ✅ DONE | `feat/agent/feature/US-AI-006-onboarding-survey-submit` |
| US-AI-007 | [Auth protection en páginas protegidas](ai-engineer/US-AI-007-auth-protection.md) | Alta | ✅ DONE | `feat/agent/feature/US-AI-007-auth-protection` |
| US-AI-008 | [Profile: datos reales de usuario + logout](ai-engineer/US-AI-008-profile-real-api.md) | Media | ✅ DONE | `feat/agent/feature/US-AI-008-profile-real-api` |
| US-AI-009 | [Chat: cargar historial de conversación](ai-engineer/US-AI-009-agent-history.md) | Media | ✅ DONE | `feat/agent/feature/US-AI-009-agent-history` |

---

## 🎨 Frontend — `web/app/` · `web/components/` · `web/lib/`

| ID | Historia | Prioridad | Estado | Rama |
|---|---|---|---|---|
| US-FE-001 | [Dashboard con gráfico semanal](frontend/US-FE-001-dashboard-charts.md) | Alta | ❌ PENDIENTE | `feat/fe/US-FE-001-dashboard-charts` |
| US-FE-002 | [Mejoras UX del chat](frontend/US-FE-002-chat-mejoras-ux.md) | Alta | ✅ DONE | `feat/fe/US-FE-002-chat-ux` |
| US-FE-003 | [Completado de hábito con feedback](frontend/US-FE-003-habit-completion-flow.md) | Media | ✅ DONE | `feat/fe/US-FE-003-habit-completion` |
| US-FE-004 | [Vista del reporte semanal](frontend/US-FE-004-vista-reporte-semanal.md) | Media | ✅ DONE | `feat/fe/US-FE-004-reporte-semanal` |

---

## 🔌 API & Connections — `api-service/routers/` · `extension/src/` · `web/middleware.ts`

| ID | Historia | Prioridad | Estado | Rama |
|---|---|---|---|---|
| US-API-001 | [Endpoint de uso semanal](api-connections/US-API-001-weekly-usage-endpoint.md) | Alta | ✅ DONE | `feat/api/US-API-001-weekly-usage` |
| US-API-002 | [Retry con backoff en extensión](api-connections/US-API-002-extension-retry.md) | Alta | ✅ DONE | `feat/api/US-API-002-extension-retry` |
| US-API-003 | [Rate limiting en el agente](api-connections/US-API-003-rate-limiting.md) | Media | ✅ DONE | `feat/api/US-API-003-rate-limiting` |
| US-API-004 | [Wiring frontend → API real](api-connections/US-API-004-frontend-wiring.md) | **Alta** | ✅ DONE | `feat/api/US-API-004-frontend-wiring` |

---

## ⚙️ Backend 1 (ML) — `api-service/services/ml/` · `ml-worker/` · `data/`

| ID | Historia | Prioridad | Estado | Rama |
|---|---|---|---|---|
| US-ML-001 | [Pipeline Isolation Forest](backend-1-ml/US-ML-001-isolation-forest.md) | Alta | ❌ PENDIENTE | `feat/ml/US-ML-001-isolation-forest` |
| US-ML-002 | [XGBoost predictor de ánimo](backend-1-ml/US-ML-002-xgboost-mood.md) | Media | ❌ BLOQUEADO por ML-001 | `feat/ml/US-ML-002-xgboost-mood` |

---

## 🗄️ Backend 2 (Data) — `api-service/services/` · `infra/supabase/`

| ID | Historia | Prioridad | Estado | Rama |
|---|---|---|---|---|
| US-DATA-001 | [Streaks con grace days](backend-2-data/US-DATA-001-streak-logic.md) | Alta | ✅ DONE | `feat/data/US-DATA-001-streak-logic` |
| US-DATA-002 | [Índices de performance](backend-2-data/US-DATA-002-indices-performance.md) | Media | ❌ PENDIENTE | `mig/002-performance-indices` |
| US-DATA-003 | [Tabla de notificaciones](backend-2-data/US-DATA-003-notifications-table.md) | Baja | ❌ PENDIENTE | `feat/data/US-DATA-003-notifications` |

---

## Dependencias entre historias

```
── COMPLETADAS (Frontend + AI Engineer) ──
US-AI-001..005 ✅  US-API-001..004 ✅  US-FE-002..004 ✅
US-AI-006 ✅ (onboarding → submitSurvey)
US-AI-007 ✅ (useRequireAuth en 5 páginas)
US-AI-008 ✅ (profile con user real + logout)
US-AI-009 ✅ (getAgentHistory en chat)
US-DATA-001 ✅

── BLOQUEADAS / PENDIENTES ──
US-ML-001 ❌ → US-ML-002 ❌ (ML-002 bloqueado)
US-FE-001 ❌ → recharts chart (puede arrancar con endpoint US-API-001 ✅)
US-DATA-002 ❌ → migración índices
US-DATA-003 ❌ → tabla notificaciones
```

---

## Proceso de PR

1. PR hacia `dev` (nunca hacia `main`)
2. Título: `[US-XX-NNN] Descripción corta`
3. Descripción: qué cambia, cómo testear, capturas si es frontend
4. Requiere 1 aprobación antes de mergear
5. Squash merge para mantener historial limpio
6. Borrar la rama después del merge
