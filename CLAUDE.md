# CLAUDE.md — Kairós Bienestar

Guía de contexto para Claude Code en este proyecto. Lee este archivo completo antes de hacer cualquier cambio.

---

## Regla fundamental

**Docs-first. Siempre.**

Antes de escribir una sola línea de código, debe existir documentación en `docs/` que lo respalde. Si algo que necesitas implementar no está documentado, el flujo es:

1. Modificar o crear el documento en `docs/` correspondiente
2. Obtener aprobación del lead (Luisangel)
3. Recién entonces implementar

**Nunca hagas cambios que no estén en `docs/`.** Si detectas que falta documentación para algo que quieres construir, dilo explícitamente antes de proceder.

---

## El proyecto

**Kairós** es un copiloto de bienestar digital: detecta patrones de comportamiento digital, aplica modelos ML, y acompaña al usuario con hábitos e intervenciones basadas en evidencia.

**Posicionamiento legal crítico:** herramienta de bienestar + triaje. Nunca "diagnóstico". Nunca "tratamiento". Palabras aprobadas en el producto: señales, screening, indicadores, triaje.

**Stack:** Next.js 14 + FastAPI + Chrome Extension MV3 + Claude Sonnet 4.6 + Supabase (PostgreSQL + pgvector)

---

## Documentación de referencia

Toda la información del proyecto vive en `docs/`. Antes de cualquier tarea, lee los documentos relevantes:

| Documento | Qué contiene |
|-----------|-------------|
| `docs/superpowers/specs/2026-05-23-kairos-bienestar-design.md` | Arquitectura completa, stack, módulos, schema de DB, roadmap |
| `docs/superpowers/plans/2026-05-23-mvp-24h-master.md` | Contratos de API, timeline, reglas de integración, flujo demo E2E |
| `docs/superpowers/plans/2026-05-23-mvp-dev1-backend.md` | Plan detallado — Backend (API & Connections) |
| `docs/superpowers/plans/2026-05-23-mvp-dev2-frontend.md` | Plan detallado — Frontend |
| `docs/superpowers/plans/2026-05-23-mvp-dev3-extension.md` | Plan detallado — Chrome Extension |
| `docs/superpowers/plans/2026-05-23-mvp-dev4-agent-ml.md` | Plan detallado — Agent + ML + RAG |
| `docs/team/TEAM-INDEX.md` | Índice de user stories y estrategia de ramas |
| `docs/team/<rol>/GUIDELINES.md` | Lineamientos específicos por rol |
| `docs/team/<rol>/US-*.md` | User stories con criterios de aceptación y Definition of Done |
| `docs/UI-DESIGN-SPEC.md` | Sistema de diseño, paleta, componentes, animaciones |
| `docs/DATA-RESOURCES-GUIDE.md` | Datasets, playbooks, modelos ML, seeds |

---

## Equipo y ownership de directorios

Cada desarrollador tiene **dominio exclusivo** sobre su directorio. Nunca modifiques archivos fuera de tu área sin coordinar primero.

| Rol | Lead | Directorio(s) exclusivo(s) |
|-----|------|---------------------------|
| Frontend | Juan Camilo | `web/app/`, `web/components/`, `web/lib/api.ts` |
| API & Connections | Salome | `api-service/routers/`, `extension/src/`, `web/middleware.ts`, `web/lib/supabase*` |
| AI Engineer | Juan Gomez | `agent-service/agent/`, `agent-service/rag/`, `agent-service/triage/`, `playbooks/` |
| Backend 1 (ML) | Luisangel | `ml-worker/`, `api-service/services/ml/`, `agent-service/ml/`, `data/` |
| Backend 2 (Data) | Emanuel | `api-service/services/`, `infra/supabase/migrations/`, `infra/supabase/seeds/` |

**Archivos que requieren coordinación antes de tocar:** `.env.example`, `README.md`, `docker-compose.yml`, cualquier archivo en `infra/`.

---

## Estrategia de ramas

El formato de rama incluye la fase de Linear para saber exactamente a qué milestone pertenece cada implementación:

```
<tipo>/<rol>/<fase>/<id>
```

```
main                              ← producción (nunca commit directo)
dev                               ← integración de todos los streams
feat/<rol>/setup/<id>             ← Fase 1: Setup
feat/<rol>/foundation/<id>        ← Fase 2: Foundation
feat/<rol>/core/<id>              ← Fase 3: Core
feat/<rol>/feature/<id>           ← Fase 4: Feature (US-*)
fix/<rol>/<fase>/<id>             ← bugfixes
exp/ml/exp/<id>                   ← experimentos ML (nunca van directo a dev)
mig/<num>                         ← migraciones de DB (Backend 2 Data)
```

**Ejemplos reales:**
```bash
feat/ml/setup/KAI-49-setup-ml-environment
feat/ml/foundation/KAI-50-bootstrap-models
feat/ml/core/US-ML-001-isolation-forest
feat/ml/feature/US-ML-002-xgboost-mood
feat/frontend/foundation/KAI-6-supabase-auth
feat/frontend/core/KAI-10-dashboard-ui
feat/agent/core/KAI-44-triage-tree
feat/api/feature/US-API-001-weekly-usage-endpoint
fix/api/core/KAI-20-events-batch-cors
```

**Flujo obligatorio:** rama propia → PR a `dev` → merge con al menos un review.

**Prefijos de commit por stream:**
```
feat(backend):  feat(web):  feat(ext):  feat(agent):  feat(ml):  feat(data):
fix(backend):   fix(web):   fix(ext):   fix(agent):   fix(ml):   fix(data):
test(ml):       docs(...):  chore(...):
```

---

## Linear CLI

Usa Linear CLI para consultar issues, cambiar estados y vincular PRs sin salir de la terminal.

```bash
# Instalación
npm install -g @linear/sdk   # SDK (si se usa desde scripts)
# o usar la API directamente con curl/gh (ver abajo)

# API Key del workspace Kairós (pídela a Luisangel — no va en git)
# export LINEAR_API_KEY=lin_api_...

# Consultar un issue
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ issue(id: \"KAI-XX\") { title state { name } } }"}'

# Cambiar estado de un issue
# Estados del equipo Kairós:
#   Todo:        4595a209-3b6b-4765-a5d8-4f0af1b10347
#   In Progress: 1dd0c219-0639-42b8-a8f7-18723dfa19f4
#   Done:        e7d5d02d-2e4a-4286-a26c-8434cce30afd
```

---

## Flujo de revisión de PR

Cuando asistas en la revisión o creación de Pull Requests (PR), debes seguir estrictamente este flujo:
1. **Aprobación requerida:** Nunca subas una PR sin que antes los cambios hayan sido aprobados explícitamente.
2. **Revisión contra la documentación:** Realiza una revisión exhaustiva del código propuesto comparándolo SIEMPRE con los documentos del directorio `docs/`, haciendo especial énfasis en el proyecto en específico (`docs/superpowers/plans/`) y los roles (`docs/team/`).
3. **Validación estricta:** SIEMPRE revisa y asegúrate de que los cambios cumplan rigurosamente con las especificaciones y contratos definidos en estos documentos. No apruebes ni generes PRs que violen la arquitectura o los lineamientos del equipo.

## Reglas para crear PRs

Al crear cualquier Pull Request, es **obligatorio**:

1. **Issue en el título:** El título debe incluir el ID del issue de Linear.
   ```
   feat(ml): Isolation Forest anomaly detection — KAI-51
   fix(api): corregir CORS en eventos batch — KAI-20
   ```

2. **Link al issue:** El body de la PR debe incluir el link directo al issue:
   ```
   🔗 Linear: https://linear.app/kairos-ia/issue/KAI-XX
   ```

3. **Variables de entorno:** Si el cambio agrega variables de entorno nuevas, listarlas explícitamente con su descripción y valor de ejemplo.

4. **PRs dependientes:** Si esta PR depende de otra que aún no fue mergeada, listarla explícitamente indicando que debe mergearse primero.

Usa el template en `.github/pull_request_template.md` — todos estos campos están incluidos.


---

## Contratos de API — fuente de verdad

Los contratos están en `docs/superpowers/plans/2026-05-23-mvp-24h-master.md`. Son inmutables sin aprobación del equipo. Los principales:

| Endpoint | Implementa | Consume |
|----------|-----------|---------|
| `POST /api/v1/events/batch` | API & Connections | Chrome Extension |
| `POST /api/v1/surveys/{type}` | API & Connections | Frontend (onboarding) |
| `GET /api/v1/dashboard` | API & Connections | Frontend |
| `GET/POST /api/v1/habits` | API & Connections | Frontend |
| `POST /api/v1/agent/chat` | AI Engineer | Frontend |
| `GET /api/v1/agent/history` | AI Engineer | Frontend |

**Contrato de salida ML** (tabla `ml_results`, columna `result` JSONB):
```python
# isolation_forest
{"anomaly_score": float, "is_anomaly": bool, "risk_level": "low"|"medium"|"high", "flagged_features": list[str]}

# xgboost_mood
{"predicted_phq9_change": float, "direction": "increase"|"decrease"|"stable", "confidence": float, "risk_window_days": int}
```

---

## Reglas de seguridad y privacidad

- **Nunca** almacenar URLs completas, contenido de notificaciones ni video
- **Nunca** diagnosticar: usar palabras como "señales", "indicadores", "patrones"
- **Siempre** que PHQ-9 ≥ 15 o GAD-7 ≥ 15: derivar a Línea 106 sin excepción, sin llamar al LLM
- Los modelos `.joblib`/`.pkl` van en `.gitignore`; solo sube el script de entrenamiento

---

## URLs locales de desarrollo

```
web:           http://localhost:3000
api-service:   http://localhost:8000
agent-service: http://localhost:8001
```

---

## Workflow para proponer cambios

Si durante el desarrollo encuentras que algo falta, está mal documentado, o hay una decisión técnica nueva:

1. **Parar** — no implementar aún
2. **Notificar** al lead (Luisangel) con el problema específico
3. **Actualizar `docs/`** con la decisión tomada
4. **Implementar** basándose en la documentación actualizada

Esto aplica para todos: Claude Code y desarrolladores humanos por igual.
