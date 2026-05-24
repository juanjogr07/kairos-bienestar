# Kairós — Planes de Completitud (100%)

**Fecha:** 2026-05-23  
**Estado base:** ~72% completado  
**Meta:** 100% — demo E2E funcional + tests

---

## Estado actual confirmado

| Componente | Estado | Notas |
|---|---|---|
| Chrome Extension (TS) | ✅ 90% | Todos los archivos existen |
| api-service endpoints | ✅ 100% | events, surveys, habits, dashboard, interventions |
| api-service ML runner | ✅ 90% | runner.py, features.py, isolation_forest, xgboost |
| agent-service core | ✅ 85% | orchestrator, 6 tools, triage/tree.py, RAG código |
| ml-worker modelos | ✅ 90% | anomaly, clustering, scoring, timeseries, correlation |
| web (kairos-nextjs) | ✅ 85% | dashboard, chat, habits, onboarding, profile, report |
| Playbooks | ✅ 100% | 9 playbooks procesados |
| Supabase migrations | ✅ 85% | 4 migrations aplicadas |
| RAG datos | ❌ 0% | playbook_chunks vacía — BLOQUEANTE |
| SQL function | ❌ 0% | match_playbook_chunks no creada — BLOQUEANTE |
| ml_results demo | ❌ 0% | tabla vacía — triaje devuelve nulls |
| Sensing validator | ❌ 0% | sanitización de dominios no implementada |
| Sensing aggregator | ❌ 0% | eventos → daily_features no existe en api-service |
| ML trigger endpoint | ❌ 0% | no hay forma de llamar al runner desde fuera |
| Reports router | ❌ 0% | GET /api/v1/reports no existe |
| Habits recommender | ❌ 0% | sugerencia de hábitos desde playbooks no existe |
| agent triage/playbooks.py | ❌ 0% | selección de playbook separada no existe |
| agent rag/playbook_loader.py | ❌ 0% | loader desde agent-service no existe |
| ML bootstrap ejecutado | ❌ 0% | modelos .joblib no generados |
| Tests nuevos módulos | ❌ 0% | no hay tests para los módulos faltantes |

---

## Orden de ejecución recomendado

```
PLAN-01 (30 min)  → RAG + SQL + seed demo         [CRÍTICO — desbloquea todo]
PLAN-02 (2h)      → API sensing + sanitización     [bug fix + nuevos módulos]
PLAN-03 (1.5h)    → API reports + recommender      [funcionalidad nueva]
PLAN-04 (1.5h)    → Agent triage refactor          [separación de módulos]
PLAN-05 (1.5h)    → ML bootstrap + E2E integration [cierre + verificación]
```

**Demo mínima funcional:** Solo PLAN-01 es estrictamente necesario.  
**Demo completa:** PLAN-01 + PLAN-02 + PLAN-03.  
**100% spec:** todos los planes.

---

## Planes

| # | Archivo | Área | Tiempo | Criticidad |
|---|---|---|---|---|
| 01 | [plan-01-rag-operacional.md](plan-01-rag-operacional.md) | RAG + SQL + seed | 30 min | 🔴 BLOQUEANTE |
| 02 | [plan-02-api-sensing.md](plan-02-api-sensing.md) | Sensing layer + ML trigger | 2h | 🟠 Alta |
| 03 | [plan-03-api-reports-recommender.md](plan-03-api-reports-recommender.md) | Reports + Recommender | 1.5h | 🟡 Media |
| 04 | [plan-04-agent-triage-refactor.md](plan-04-agent-triage-refactor.md) | Agent triage modules | 1.5h | 🟡 Media |
| 05 | [plan-05-ml-bootstrap-e2e.md](plan-05-ml-bootstrap-e2e.md) | ML bootstrap + E2E | 1.5h | 🟢 Cierre |

---

*Generado con structured-autonomy-plan + análisis de brechas del spec.*
