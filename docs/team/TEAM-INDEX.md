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

| ID | Historia | Prioridad | Rama |
|---|---|---|---|
| US-AI-001 | [Triage con contexto temporal](ai-engineer/US-AI-001-mejora-triage.md) | Alta | `feat/ai/US-AI-001-triage-temporal` |
| US-AI-002 | [Hábito sugerido en respuesta](ai-engineer/US-AI-002-suggested-habit.md) | Alta | `feat/ai/US-AI-002-suggested-habit` |
| US-AI-003 | [Reporte semanal generado por el agente](ai-engineer/US-AI-003-reporte-semanal.md) | Media | `feat/ai/US-AI-003-reporte-semanal` |
| US-AI-004 | [Protocolo de crisis no bypasseable](ai-engineer/US-AI-004-crisis-protocol.md) | **Crítica** | `feat/ai/US-AI-004-crisis-protocol` |

---

## 🎨 Frontend — `web/app/` · `web/components/` · `web/lib/`

| ID | Historia | Prioridad | Rama |
|---|---|---|---|
| US-FE-001 | [Dashboard con gráfico semanal](frontend/US-FE-001-dashboard-charts.md) | Alta | `feat/fe/US-FE-001-dashboard-charts` |
| US-FE-002 | [Mejoras UX del chat](frontend/US-FE-002-chat-mejoras-ux.md) | Alta | `feat/fe/US-FE-002-chat-ux` |
| US-FE-003 | [Completado de hábito con feedback](frontend/US-FE-003-habit-completion-flow.md) | Media | `feat/fe/US-FE-003-habit-completion` |
| US-FE-004 | [Vista del reporte semanal](frontend/US-FE-004-vista-reporte-semanal.md) | Media | `feat/fe/US-FE-004-reporte-semanal` |

---

## 🔌 API & Connections — `api-service/routers/` · `extension/src/` · `web/middleware.ts`

| ID | Historia | Prioridad | Rama |
|---|---|---|---|
| US-API-001 | [Endpoint de uso semanal](api-connections/US-API-001-weekly-usage-endpoint.md) | Alta | `feat/api/US-API-001-weekly-usage` |
| US-API-002 | [Retry con backoff en extensión](api-connections/US-API-002-extension-retry.md) | Alta | `feat/api/US-API-002-extension-retry` |
| US-API-003 | [Rate limiting en el agente](api-connections/US-API-003-rate-limiting.md) | Media | `feat/api/US-API-003-rate-limiting` |

---

## ⚙️ Backend 1 (ML) — `api-service/services/ml/` · `ml-worker/` · `data/`

| ID | Historia | Prioridad | Rama |
|---|---|---|---|
| US-ML-001 | [Pipeline Isolation Forest](backend-1-ml/US-ML-001-isolation-forest.md) | Alta | `feat/ml/US-ML-001-isolation-forest` |
| US-ML-002 | [XGBoost predictor de ánimo](backend-1-ml/US-ML-002-xgboost-mood.md) | Media | `feat/ml/US-ML-002-xgboost-mood` |

---

## 🗄️ Backend 2 (Data) — `api-service/services/` · `infra/supabase/`

| ID | Historia | Prioridad | Rama |
|---|---|---|---|
| US-DATA-001 | [Streaks con grace days](backend-2-data/US-DATA-001-streak-logic.md) | Alta | `feat/data/US-DATA-001-streak-logic` |
| US-DATA-002 | [Índices de performance](backend-2-data/US-DATA-002-indices-performance.md) | Media | `mig/002-performance-indices` |
| US-DATA-003 | [Tabla de notificaciones](backend-2-data/US-DATA-003-notifications-table.md) | Baja | `feat/data/US-DATA-003-notifications` |

---

## Dependencias entre historias

```
US-AI-004 (crisis) → independiente, hacer primero
US-ML-001 → US-ML-002 (ML-002 necesita features.py de ML-001)
US-AI-003 → US-FE-004 (FE-004 espera que el endpoint del reporte esté en dev)
US-API-001 → US-FE-001 (FE-001 puede usar mock mientras API-001 no esté listo)
US-DATA-001 → US-FE-003 (FE-003 puede usar mock mientras DATA-001 no esté listo)
```

---

## Proceso de PR

1. PR hacia `dev` (nunca hacia `main`)
2. Título: `[US-XX-NNN] Descripción corta`
3. Descripción: qué cambia, cómo testear, capturas si es frontend
4. Requiere 1 aprobación antes de mergear
5. Squash merge para mantener historial limpio
6. Borrar la rama después del merge
