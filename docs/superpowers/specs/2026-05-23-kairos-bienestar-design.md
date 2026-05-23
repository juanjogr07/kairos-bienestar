# Kairós — Inventario Técnico y Arquitectura de Sistema
**Fecha:** 2026-05-23  
**Estado:** Aprobado — listo para plan de desarrollo  
**Versión:** 1.0  

---

## 1. Resumen Ejecutivo

Kairós es un copiloto de bienestar digital y físico: un asistente de IA que detecta el estado real del usuario a partir de señales de comportamiento (uso del teléfono, navegador, sesiones con cámara, autorreporte y datos de salud), identifica patrones con modelos de machine learning, y lo acompaña con hábitos, intervenciones y métricas.

**Posicionamiento legal crítico:** herramienta de bienestar + triaje. Nunca "diagnóstico". Nunca "tratamiento". Palabras aprobadas: señales, screening, indicadores, triaje.

**Modelo de negocio:** B2C — usuario individual, suscripción.  
**Plataforma de arranque:** Web App + Chrome Extension.  
**Olas de desarrollo:** MVP → Fase 2 (Android) → Fase 3 (visión por computadora).

---

## 2. Stack Tecnológico Confirmado

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend web | Next.js 14 + Tailwind + shadcn/ui | Vercel deploy, SSR/RSC, iteración rápida |
| Extensión Chrome | Manifest V3 + React + TypeScript | chrome.tabs, chrome.idle, content scripts |
| Backend API | FastAPI (Python) | Integración nativa con ML stack, async, tipado |
| Agente LLM | Anthropic SDK — Claude Sonnet 4.6 | Orquestador con tool_use; sin fine-tuning del LLM |
| RAG / Playbooks | LangChain + pgvector | pgvector ya en Supabase, sin infra extra |
| ML Conductual | scikit-learn + Prophet + XGBoost + PyTorch | Ligeros, tabular/series de tiempo |
| Visión (Fase 3) | MediaPipe + YOLOv8n + TFLite / ONNX | On-device; sin video al servidor |
| Base de datos | Supabase (PostgreSQL + pgvector + Auth) | Auth incluida, pgvector nativo, free tier viable |
| Deploy | Vercel (web) + Railway (API/ML/Agent) | Gratis en proto; escala económico |
| Mobile (Fase 2) | React Native (Expo) | Reutiliza lógica web; Android companion |

---

## 3. Arquitectura de Sistema

### 3.1 Decisiones arquitectónicas clave

**Arquitectura elegida:** Capas separadas con worker asíncrono (Opción B).  
**Razón:** el modelo de personalización progresiva (global → personal) requiere re-entrenamiento continuo que no puede bloquear la API. Tres servicios máximo para evitar sobre-ingeniería.

**Patrón ML:** LLM como orquestador + modelos ML como herramientas (tools).  
El LLM no hace cálculos numéricos — invoca los modelos ML vía tool_use, interpreta resultados y los narra en lenguaje humano.

**Personalización progresiva:**  
- Cold start (0–29 días): modelos globales entrenados en datos públicos.  
- Personal (≥ 30 días): fine-tune sobre historial propio del usuario.  
- El componente `ml-worker/registry/model_store.py` decide en runtime qué modelo usar.

### 3.2 Mapa del sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        SENSING LAYER                            │
│  Chrome Extension  │  Web EMA/Surveys  │  Android (F2)  │ HealthKit (F2)│
└──────────┬─────────────────┬──────────────────┬──────────────────┘
           │  batched events │  survey answers  │  health metrics
           ▼                 ▼                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                      api-service  (FastAPI)                      │
│  /auth  /events  /surveys  /habits  /interventions  /reports     │
└──────────────────────┬───────────────────────┬───────────────────┘
                       │ enqueue tasks          │ read ML results
                       ▼                        │
              ┌────────────────┐                │
              │  Redis Queue   │                │
              └───────┬────────┘                │
                      │ consume                 │
                      ▼                         │
         ┌────────────────────────┐             │
         │    ml-worker (Celery)  │─────────────┘
         │  feature_extraction    │  write results
         │  model_inference       │
         │  model_training        │
         └────────────┬───────────┘
                      │ read/write
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL + pgvector)              │
│  users │ events │ ml_results │ habits │ playbook_chunks          │
└──────────────────────────────────────┬──────────────────────────┘
                                       │ RAG + ML context
                                       ▼
                         ┌─────────────────────────┐
                         │  agent-service (FastAPI) │
                         │  Claude Sonnet 4.6       │
                         │  Triage Tree             │
                         │  RAG retriever           │
                         │  Tool definitions (ML)   │
                         └────────────┬────────────┘
                                      │ insights + recommendations
                                      ▼
                         ┌────────────────────────┐
                         │   web (Next.js 14)      │
                         │   Dashboard / Chat      │
                         │   Habits / Reports      │
                         └────────────────────────┘
```

---

## 4. Estructura del Monorepo

```
kairos/
├── web/                          # Next.js 14 + Tailwind + shadcn/ui
│   ├── app/
│   │   ├── dashboard/            # métricas + insights narrados
│   │   ├── habits/               # gestión de hábitos y rachas
│   │   ├── sessions/             # Focus Sessions (Fase 3)
│   │   ├── reports/              # reportes semanales
│   │   ├── chat/                 # interfaz de chat con el agente
│   │   └── onboarding/           # setup inicial + EMA config
│   └── components/
│
├── extension/                    # Chrome Manifest V3
│   ├── background/
│   │   └── collector.ts          # service worker — captura tabs, idle, tiempo
│   ├── content-scripts/
│   │   ├── scroll-detector.ts    # velocidad de scroll (px/s)
│   │   └── intervention.ts       # overlay antes de app de riesgo
│   ├── popup/                    # mini-dashboard de la extensión
│   └── storage/
│       └── buffer.ts             # buffer local antes de sync al backend
│
├── api-service/                  # FastAPI — API principal
│   ├── routers/
│   │   ├── auth.py
│   │   ├── events.py             # POST /events/batch — ingesta de comportamiento
│   │   ├── surveys.py            # POST /surveys/{type} — PHQ-9, GAD-7, EMA
│   │   ├── habits.py
│   │   ├── interventions.py
│   │   └── reports.py
│   ├── services/
│   │   ├── sensing/
│   │   │   ├── aggregator.py     # eventos crudos → features diarias
│   │   │   └── validator.py      # sanitización; nunca almacena URLs completas
│   │   └── habits/
│   │       ├── streak_engine.py  # rachas + días de gracia + tono compasivo
│   │       └── recommender.py    # sugiere hábitos del playbook activo
│   └── tasks/
│       └── dispatcher.py         # encola tareas ML en Redis
│
├── ml-worker/                    # Celery async ML
│   ├── tasks/
│   │   ├── feature_extraction.py # daily_features computation
│   │   ├── inference.py          # predicción con modelos cargados
│   │   └── training.py           # re-entrenamiento global + personal
│   ├── models/
│   │   ├── clustering.py         # Modelo 1: K-Means
│   │   ├── anomaly.py            # Modelo 2: Isolation Forest + Modelo 3: LSTM AE
│   │   ├── timeseries.py         # Modelo 4: Prophet
│   │   ├── scoring.py            # Modelo 5: XGBoost
│   │   └── correlation.py        # Modelo 6: Pearson/Spearman
│   ├── pipelines/
│   │   ├── cold_start.py         # usuario nuevo → modelo global
│   │   └── personalization.py    # ≥30 días → fine-tune personal
│   ├── registry/
│   │   └── model_store.py        # ⚠️ componente crítico: decide global vs personal
│   └── scripts/
│       └── generate_synthetic.py # datos sintéticos para testing
│
├── agent-service/                # FastAPI — agente Claude + RAG
│   ├── agent/
│   │   ├── orchestrator.py       # Claude Sonnet 4.6 con tool_use
│   │   ├── tools/
│   │   │   ├── get_ml_scores.py
│   │   │   ├── get_user_cluster.py
│   │   │   ├── get_anomaly_flags.py
│   │   │   ├── get_forecast.py
│   │   │   └── get_survey_scores.py
│   │   └── memory.py             # historial de conversación por usuario
│   ├── rag/
│   │   ├── retriever.py          # búsqueda semántica pgvector
│   │   ├── embedder.py           # Modelo 10: all-MiniLM-L6-v2 → vector(384)
│   │   └── playbook_loader.py    # carga playbooks al índice pgvector
│   └── triage/
│       ├── tree.py               # árbol de triaje — reglas explícitas y auditables
│       ├── playbooks.py          # selección + personalización del playbook
│       └── crisis_escalation.py  # PHQ-9 ≥ 15 o GAD-7 ≥ 15 → derivación inmediata
│
├── playbooks/                    # Base de conocimiento RAG
│   ├── raw/                      # literatura científica descargada
│   ├── processed/                # playbooks estructurados (Markdown)
│   │   ├── attention-fragmentation.md
│   │   ├── nocturnal-use-pattern.md
│   │   ├── doomscrolling.md
│   │   ├── low-mood-indicators.md
│   │   ├── anxiety-indicators.md
│   │   ├── habit-relapse-risk.md
│   │   ├── focus-session-intro.md
│   │   └── crisis-escalation.md  # ⚠️ nunca modificar sin revisión clínica
│   └── scripts/
│       ├── fetch_pubmed.py
│       ├── fetch_semantic_scholar.py
│       ├── extract_interventions.py   # LLM extrae intervenciones de papers
│       └── embed_playbooks.py         # genera embeddings → pgvector
│
├── mobile/                       # React Native Expo (Fase 2)
│
├── ml-cv/                        # Modelos on-device (Fase 3)
│   ├── mediapipe/                # Modelo 7: atención, postura, eye AR
│   ├── yolo/                     # Modelo 8: detección objetos + fine-tuning
│   │   └── fine_tune.py          # YOLOv8n → ONNX export
│   ├── sam2/                     # Modelo 9: segmentación (Fase 3+)
│   └── deployment/
│       ├── tflite/               # Android
│       ├── coreml/               # iOS
│       └── onnx/                 # web/desktop
│
└── infra/
    ├── docker-compose.yml
    ├── railway.toml
    └── supabase/
        ├── migrations/
        └── seed/
            └── embed_initial_playbooks.sql
```

---

## 5. Los Cinco Módulos del Sistema

### Módulo 1 — Sensing (Sensado)
**Responsabilidad:** recolectar señales de comportamiento desde múltiples fuentes, validarlas y almacenarlas sin datos sensibles.

**Fuentes por fase:**
- MVP: Chrome Extension (tabs, idle, scroll speed) + Web (EMA surveys)
- Fase 2: Android companion (UsageStatsManager, NotificationListenerService) + Health Connect
- Fase 3: Cámara on-device (Focus Sessions)

**Regla de privacidad:** nunca almacenar URLs completas, contenido de notificaciones ni video. Solo dominio + duración + métricas agregadas.

**Archivos clave:** `extension/background/collector.ts`, `extension/content-scripts/scroll-detector.ts`, `api-service/services/sensing/aggregator.py`

---

### Módulo 2 — Intelligence (Agente + ML)
**Responsabilidad:** convertir señales crudas en insights accionables mediante modelos ML y el agente LLM.

**Flujo:**
```
Eventos diarios
  → feature_extraction.py (daily_features)
  → inference.py (10 modelos)
  → ml_results en Supabase
  → agent/orchestrator.py (Claude tool_use)
  → triage/tree.py (routing a playbook)
  → respuesta narrada al usuario
```

**Archivos clave:** `ml-worker/models/`, `agent-service/agent/orchestrator.py`, `agent-service/triage/tree.py`

---

### Módulo 3 — Habits & Streaks (Hábitos y Rachas)
**Responsabilidad:** sugerir hábitos del playbook activo, mantener rachas con días de gracia y tono compasivo, nunca generar culpa.

**Regla de diseño:** las rachas nunca se comparan contra otros usuarios. Siempre contra el propio histórico. El tono cuando se rompe una racha es compasivo, no punitivo.

**Archivos clave:** `api-service/services/habits/streak_engine.py`, `web/app/habits/`

---

### Módulo 4 — Intervention (Intervención)
**Responsabilidad:** actuar en el momento — no solo informar. Pausa consciente antes de abrir app de riesgo, overlay de doomscrolling, recordatorios contextuales.

**Mecánica MVP:** overlay en extensión cuando el usuario intenta abrir un dominio marcado como "de riesgo" por el árbol de triaje.

**Archivos clave:** `extension/content-scripts/intervention.ts`, `api-service/routers/interventions.py`

---

### Módulo 5 — Insights & Reports (Insights y Reportes)
**Responsabilidad:** reportes semanales narrados por el LLM, métricas personales (nunca comparación social), vista de tendencias.

**Regla de narración:** el LLM convierte números en historia útil. RAG estricto sobre playbooks — sin generación libre en temas de salud mental.

**Archivos clave:** `agent-service/agent/orchestrator.py` (trigger weekly_report), `web/app/reports/`, `web/app/dashboard/`

---

## 6. Catálogo de Modelos ML (10 modelos)

### 6.1 Modelos Conductuales — `ml-worker/models/`

#### Modelo 1 — K-Means (`clustering.py`)
| | |
|---|---|
| **Propósito** | Segmentar usuarios en perfiles conductuales (nocturno / fragmentado / binge fin de semana / enfocado) |
| **Framework** | scikit-learn `KMeans(n_clusters=4)` |
| **Input** (ventana 7d) | `avg_daily_usage_min`, `peak_usage_hour`, `session_count_day`, `nocturnal_ratio`, `bounce_rate`, `scroll_speed_avg`, `app_switches_per_hour`, `weekend_vs_weekday_ratio` |
| **Output** | `cluster_label` (0–3), `profile_name`, `confidence` (0–1) |
| **Entrenamiento** | Global — re-entrenado semanalmente con datos opt-in agregados |
| **Cold start** | Asignación al centroide más cercano con ≥ 7 días de datos |
| **Fase** | Fase 2 |
| **Bootstrap data** | StudentLife Dataset (Dartmouth) |

#### Modelo 2 — Isolation Forest (`anomaly.py`)
| | |
|---|---|
| **Propósito** | Detectar días atípicos de uso — posibles correlatos de eventos vitales o recaídas |
| **Framework** | scikit-learn `IsolationForest(contamination=0.05)` |
| **Input** (snapshot diario) | `total_usage_min`, `nocturnal_min`, `session_count`, `app_switches`, `scroll_distance`, `notification_count` |
| **Output** | `anomaly_score` (float), `anomaly_flag` (bool), `severity` (0–1) |
| **Cold start** | Modelo global desde día 1 |
| **Personalización** | ≥ 30 días → re-entrena sobre historial propio |
| **Fase** | **MVP** |

#### Modelo 3 — LSTM Autoencoder (`anomaly.py`)
| | |
|---|---|
| **Propósito** | Detectar patrones temporales complejos: escalada de uso en semana, secuencias horarias atípicas |
| **Framework** | PyTorch — encoder LSTM(64) → bottleneck(16) → decoder LSTM(64) |
| **Input** | Matriz `(14, 24)` — 14 días × 24 horas de uso por hora |
| **Output** | `reconstruction_error` (float), `temporal_anomaly_flag` (bool) |
| **Cold start** | Modelo global |
| **Personalización** | ≥ 60 días → fine-tune personal |
| **Fase** | Fase 2 |

#### Modelo 4 — Prophet (`timeseries.py`)
| | |
|---|---|
| **Propósito** | Modelar patrones semanales, predecir 7 días, detectar riesgo de recaída de hábito |
| **Framework** | `prophet` (Meta) |
| **Input** | Serie temporal diaria `total_usage_min` + regresores: `is_weekend`, `has_focus_session` |
| **Output** | `forecast_7d` (array), `trend_direction`, `relapse_risk_score` (0–1) |
| **Cold start** | Sin forecast hasta ≥ 30 días. UI: *"Construyendo tu línea base — disponible en N días"* |
| **Personalización** | 100% per-user. No existe modelo global. |
| **Fase** | Fase 2 |

#### Modelo 5 — XGBoost (`scoring.py`) ⭐ Modelo más importante del MVP
| | |
|---|---|
| **Propósito** | Puntuar la confianza de cada señal del árbol de triaje |
| **Framework** | `xgboost.XGBClassifier` |
| **Input** | Todos los features conductuales + `phq9_score`, `gad7_score`, `anomaly_flags`, `days_since_focus_session`, `streak_adherence_rate` |
| **Output** | `attention_fragmentation` (0–1), `nocturnal_pattern` (0–1), `doomscrolling` (0–1), `low_mood_indicator` (0–1), `anxiety_indicator` (0–1) |
| **Labels** | PHQ-9 y GAD-7 recolectados en onboarding y periódicamente |
| **Cold start** | Modelo global desde día 1 |
| **Personalización** | ≥ 30 días + ≥ 4 encuestas → fine-tune personal |
| **Fase** | **MVP** |
| **Nota** | Único modelo supervisado del stack conductual. Alimenta directamente el árbol de triaje. |

#### Modelo 6 — Pearson / Spearman (`correlation.py`)
| | |
|---|---|
| **Propósito** | Descubrir correlaciones individuales entre comportamientos digitales y scores de salud mental |
| **Tipo** | Análisis estadístico — no requiere entrenamiento |
| **Framework** | `scipy.stats`, `pandas` |
| **Input** | Series semanales de features + historial de scores PHQ-9/GAD-7 |
| **Output** | Matriz de correlación, top-3 features correlacionadas |
| **Mínimo** | 4 semanas + 4 encuestas |
| **Fase** | Fase 2 |

---

### 6.2 Modelos de Visión — `ml-cv/` · Fase 3

#### Modelo 7 — MediaPipe (`ml-cv/mediapipe/`)
| | |
|---|---|
| **Propósito** | Atención, postura, fatiga ocular, teléfono en mano — durante Focus Sessions, on-device |
| **Framework** | MediaPipe (Google): Face Mesh (468 landmarks), Pose (33), Hands (21) |
| **Input** | Frame de video — on-device, nunca al servidor |
| **Output** | `attention_score` (0–1), `posture_score` (0–1), `drowsiness_flag`, `phone_in_hand_flag` |
| **Entrenamiento** | Pre-entrenado por Google. Sin fine-tuning. |
| **Deploy** | TFLite (Android) / Core ML (iOS) / WASM (web) |

#### Modelo 8 — YOLOv8n (`ml-cv/yolo/`)
| | |
|---|---|
| **Propósito** | Detectar teléfono en escritorio, presencia del usuario, estado del entorno |
| **Framework** | Ultralytics YOLOv8n pre-entrenado en COCO + fine-tuning ligero |
| **Clases fine-tuning** | `phone_on_desk`, `phone_in_hand`, `organized_desk`, `empty_desk` |
| **Fine-tuning data** | 200–500 imágenes etiquetadas (Open Images V7 + colección propia) |
| **Output** | `phone_visible` (bool), `person_present` (bool), `environment_score` (0–1) |
| **Pipeline** | `ml-cv/yolo/fine_tune.py` → exporta ONNX → deploy ONNX Runtime |
| **Etiquetado** | Roboflow (free tier: 1K imágenes/mes) |

#### Modelo 9 — SAM 2 (`ml-cv/sam2/`)
| | |
|---|---|
| **Propósito** | Segmentación fina del entorno de trabajo |
| **Estado** | Fase 3+ avanzada — alto cómputo |
| **Alternativa** | YOLOv8n-seg si SAM 2 resulta demasiado pesado on-device |

---

### 6.3 Modelo de Embedding — `agent-service/rag/`

#### Modelo 10 — Sentence Transformer (`embedder.py`) ⭐ Primer modelo en implementarse
| | |
|---|---|
| **Propósito** | Convertir texto de playbooks y queries del usuario en vectores para RAG |
| **Modelo** | `all-MiniLM-L6-v2` — 22M params, 384 dims, rápido |
| **Framework** | `sentence-transformers` |
| **Input** | Texto (chunk de playbook o mensaje de usuario) |
| **Output** | `vector(384)` almacenado en pgvector (Supabase) |
| **Entrenamiento** | Pre-entrenado. Sin fine-tuning. |
| **Fase** | **MVP** |

---

### 6.4 Resumen del Catálogo

| # | Modelo | Fase | Tipo entrenamiento | Framework |
|---|---|---|---|---|
| 1 | K-Means | Fase 2 | Global semanal | scikit-learn |
| 2 | Isolation Forest | **MVP** | Global → personal (30d) | scikit-learn |
| 3 | LSTM Autoencoder | Fase 2 | Global → personal (60d) | PyTorch |
| 4 | Prophet | Fase 2 | Per-user exclusivo (30d min) | Prophet |
| 5 | XGBoost | **MVP** | Global → personal (30d + 4 enc.) | XGBoost |
| 6 | Pearson/Spearman | Fase 2 | Analítico — no entrena | scipy |
| 7 | MediaPipe | Fase 3 | Pre-entrenado, sin FT | MediaPipe |
| 8 | YOLOv8n | Fase 3 | Pre-entrenado + fine-tune ligero | Ultralytics |
| 9 | SAM 2 | Fase 3+ | Pre-entrenado | Meta |
| 10 | Sentence Transformer | **MVP** | Pre-entrenado, sin FT | sentence-transformers |

**MVP activa: modelos 2, 5, 10**  
**Fase 2 activa: modelos 1, 3, 4, 6**  
**Fase 3 activa: modelos 7, 8, 9**

---

## 7. Inventario de Datos

### 7.1 Datos para Modelos Conductuales (Modelos 1–6)

#### Dataset principal de bootstrap

| Dataset | Fuente | Contenido | Acceso | Alimenta |
|---|---|---|---|---|
| **StudentLife** | Dartmouth | 48 estudiantes, 10 semanas — app usage, sensores, mood, estrés, PHQ | http://studentlife.cs.dartmouth.edu/ (registro gratuito) | K-Means, IF, LSTM AE |
| **TILES-2018** | USC | 212 trabajadores, 10 semanas — PHQ-9 + GAD-7 + comportamiento | https://tiles-data.isi.edu/ (solicitud gratuita) | **XGBoost** (único con labels PHQ/GAD) |
| **AWARE datasets** | OSF.io | App usage Android + sensores — buscar "AWARE smartphone" | OSF.io (libre) | K-Means, IF |
| **Kaggle — Smartphone Usage** | Kaggle | Screen time + encuestas de ánimo | kaggle.com (libre) | XGBoost bootstrap |
| **Datos sintéticos** | `generate_synthetic.py` | Perfiles ficticios para testing de pipeline | Generado localmente | Todos los modelos |

#### Instrumentos de encuesta (dominio público)

| Instrumento | Ítems | Rango | Fuente | Uso |
|---|---|---|---|---|
| **PHQ-9** | 9 | 0–27 | phqscreeners.com | Label XGBoost, triaje mood |
| **GAD-7** | 7 | 0–21 | adaa.org | Label XGBoost, triaje ansiedad |
| **PSQI** | 19 | 0–21 | Buysse et al. 1989 | Features de sueño |
| **EMA micro-encuesta** | 3–5 | Custom | Diseño propio | Señal diaria de mood/estrés |

**Umbral de crisis (inamovible):**
```python
if phq9_score >= 15 or gad7_score >= 15:
    return crisis_escalation_playbook()  # derivación inmediata
```

---

### 7.2 Datos para RAG / Playbooks (Modelo 10)

Pipeline semi-automatizado: scripts extraen de fuentes científicas → equipo + profesional de salud mental revisa → aprueba para producción.

| Fuente | API / Acceso | Rate limit | Script |
|---|---|---|---|
| **PubMed** | NCBI E-utilities (sin key) | 10 req/s | `fetch_pubmed.py` |
| **Semantic Scholar** | api.semanticscholar.org | 100 req/min | `fetch_semantic_scholar.py` |
| **Cochrane Reviews** | Web | Manual | `fetch_cochrane.py` |
| **SAMHSA** | samhsa.gov | Manual | `fetch_samhsa.py` |

**Queries de arranque para PubMed:**
```python
queries = [
    "digital phenotyping intervention",
    "smartphone screen time mental health intervention",
    "CBT mobile app depression",
    "mindfulness digital wellbeing",
    "doomscrolling anxiety intervention",
    "nocturnal smartphone use sleep intervention"
]
```

**8 playbooks mínimos para MVP:**

| Slug | Señal activadora |
|---|---|
| `attention-fragmentation` | `attention_fragmentation_score` > 0.6 |
| `nocturnal-use-pattern` | `nocturnal_pattern_score` > 0.65 |
| `doomscrolling` | `doomscrolling_score` > 0.7 |
| `low-mood-indicators` | PHQ-9 ≥ 5 |
| `anxiety-indicators` | GAD-7 ≥ 5 |
| `habit-relapse-risk` | Prophet `relapse_risk_score` > 0.7 (Fase 2) |
| `focus-session-intro` | Usuario nunca ha hecho Focus Session |
| `crisis-escalation` | PHQ-9 ≥ 15 o GAD-7 ≥ 15 — ⚠️ revisión clínica obligatoria |

**Estructura de cada playbook:**
```markdown
---
slug: nocturnal-use-pattern
signal_type: nocturnal_pattern
activates_when: nocturnal_pattern_score > 0.65
crisis_escalation: false
---
## Señales que activan este playbook
## Qué dice la evidencia (DOI/PMID)
## Hábitos recomendados (ordenados por esfuerzo/impacto)
## Intervenciones en el momento
## Cuándo recomendar ayuda profesional
## Lenguaje aprobado para comunicarlo
```

---

### 7.3 Datos para YOLOv8n Fine-tuning (Modelo 8)

| Fuente | Contenido | Costo | Acceso |
|---|---|---|---|
| **Open Images V7** (Google) | 9M imágenes — clase "Mobile phone" incluida | Gratis | `pip install fiftyone` |
| **Roboflow Universe** | Datasets "phone detection", "workspace" pre-etiquetados | Gratis (cuenta) | universe.roboflow.com |
| **Colección propia** | 200–300 fotos: teléfono en escritorio/mano, escritorio ordenado | $0 | Fotos del equipo |

**Clases a etiquetar:** `phone_on_desk`, `phone_in_hand`, `organized_desk`, `empty_desk`  
**Herramienta de etiquetado:** Roboflow (free tier: 1K imágenes/mes)  
**Pipeline:** `ml-cv/yolo/fine_tune.py` → YOLOv8n → exporta ONNX

---

## 8. Schema de Base de Datos (Supabase)

```sql
-- USUARIOS
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  onboarding_completed bool DEFAULT false,
  settings jsonb DEFAULT '{}'
);

-- SENSADO
-- Regla: nunca almacenar URLs completas, solo dominio
CREATE TABLE usage_events (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users ON DELETE CASCADE,
  domain text,
  duration_seconds int,
  event_type text CHECK (event_type IN ('tab_active','tab_idle','scroll','notification')),
  scroll_speed float,
  source text CHECK (source IN ('extension','android','survey')),
  timestamp timestamptz NOT NULL
);
CREATE INDEX ON usage_events (user_id, timestamp DESC);

-- PIPELINE ML
CREATE TABLE daily_features (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users ON DELETE CASCADE,
  date date NOT NULL,
  features jsonb NOT NULL,
  computed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE ml_results (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users ON DELETE CASCADE,
  model_type text NOT NULL,
  result jsonb NOT NULL,
  computed_at timestamptz DEFAULT now()
);
CREATE INDEX ON ml_results (user_id, model_type, computed_at DESC);

-- ENCUESTAS
CREATE TABLE survey_responses (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users ON DELETE CASCADE,
  survey_type text CHECK (survey_type IN ('phq9','gad7','psqi','ema')),
  responses jsonb NOT NULL,
  total_score float,
  created_at timestamptz DEFAULT now()
);

-- HÁBITOS Y RACHAS
CREATE TABLE habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users ON DELETE CASCADE,
  name text NOT NULL,
  playbook_slug text,
  frequency text DEFAULT 'daily',
  active bool DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE habit_completions (
  id bigserial PRIMARY KEY,
  habit_id uuid REFERENCES habits ON DELETE CASCADE,
  user_id uuid REFERENCES users ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  notes text
);

CREATE TABLE streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid REFERENCES habits ON DELETE CASCADE,
  user_id uuid REFERENCES users ON DELETE CASCADE,
  current_streak int DEFAULT 0,
  longest_streak int DEFAULT 0,
  last_completion date,
  grace_days_used int DEFAULT 0
);

-- RAG — pgvector
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  signal_type text,
  content text NOT NULL,
  activates_when text,
  crisis_escalation bool DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE playbook_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id uuid REFERENCES playbooks ON DELETE CASCADE,
  chunk_text text NOT NULL,
  embedding vector(384),
  chunk_index int NOT NULL
);
CREATE INDEX ON playbook_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- REPORTES E INTERVENCIONES
CREATE TABLE weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users ON DELETE CASCADE,
  week_start date NOT NULL,
  narrative text,
  metrics jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE intervention_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users ON DELETE CASCADE,
  trigger_type text,
  playbook_slug text,
  shown_at timestamptz DEFAULT now(),
  acted_upon bool DEFAULT false
);
```

---

## 9. APIs Entre Servicios

### Chrome Extension → api-service
```
POST /api/v1/events/batch
  Body: { events: [{ domain, duration_seconds, event_type, scroll_speed, timestamp }] }
  Cadencia: cada 5 minutos o al cerrar el browser

GET /api/v1/user/mini-summary
  Response: { today_usage_min, streak_active, last_intervention }
```

### Web → api-service
```
GET  /api/v1/dashboard              — métricas + últimos ml_results
POST /api/v1/surveys/{type}         — respuestas PHQ-9/GAD-7/EMA
GET  /api/v1/habits                 — lista de hábitos activos
POST /api/v1/habits/{id}/complete   — registrar completación
```

### Web → agent-service
```
POST /api/v1/agent/chat             — mensaje usuario → respuesta Claude
POST /api/v1/agent/trigger          — { trigger: 'weekly_report' | 'intervention' }
GET  /api/v1/agent/history          — historial paginado
```

### api-service → ml-worker (Celery tasks)
```python
# Nightly scheduler (medianoche)
tasks.feature_extraction.compute_daily_features(user_id, date)

# Post feature extraction
tasks.inference.run_all_models(user_id)

# Cuando usuario tiene ≥ 30 días de datos
tasks.training.retrain_personal_models(user_id, model_types=['isolation_forest', 'xgboost'])

# Cuando usuario tiene ≥ 60 días
tasks.training.retrain_personal_models(user_id, model_types=['lstm_autoencoder'])
```

### Claude tools en agent-service
```python
tools = [
    {
        "name": "get_ml_scores",
        "description": "Get latest ML inference scores for user (XGBoost triage signals, anomaly flags, cluster)",
        "input_schema": { "user_id": "string", "days": "int" }
    },
    {
        "name": "get_forecast",
        "description": "Get Prophet 7-day forecast and relapse risk. Only available after 30 days of data.",
        "input_schema": { "user_id": "string" }
    },
    {
        "name": "get_survey_scores",
        "description": "Get latest PHQ-9 and GAD-7 scores",
        "input_schema": { "user_id": "string" }
    },
    {
        "name": "get_anomaly_flags",
        "description": "Get recent anomaly flags from Isolation Forest",
        "input_schema": { "user_id": "string", "days": "int" }
    },
    {
        "name": "search_playbooks",
        "description": "Semantic search in evidence-based playbook knowledge base via pgvector",
        "input_schema": { "query": "string", "limit": "int" }
    }
]
```

---

## 10. Infraestructura y Costos

### Deploy

| Servicio | Plataforma | RAM | Costo estimado |
|---|---|---|---|
| web (Next.js) | Vercel | — | $0/mes (free tier) |
| api-service | Railway | 512 MB | $5–10/mes |
| ml-worker (Celery) | Railway | 1 GB | $10–15/mes |
| agent-service | Railway | 512 MB | $5–10/mes |
| Redis (cola Celery) | Railway addon | — | $5/mes |
| Supabase (DB + pgvector) | Supabase | — | $0 → $25/mes |
| Anthropic API | Anthropic | — | $10–30/mes |
| **TOTAL early stage** | | | **$35–65/mes** |

### Variables de entorno requeridas
```env
# api-service + agent-service + ml-worker
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
REDIS_URL=
ANTHROPIC_API_KEY=
RAILWAY_ENVIRONMENT=development|production
```

### Nota sobre ml-worker
El `ml-worker` es el servicio de mayor consumo de RAM porque carga modelos ML en memoria. La estrategia de `model_store.py` de cargar modelos bajo demanda y expulsarlos post-inferencia es crítica para mantener costos bajos en Railway.

---

## 11. Árbol de Triaje — Reglas Explícitas

```
Entradas: XGBoost scores + PHQ-9/GAD-7 + anomaly_flags

NIVEL 1 — CRISIS (acción inmediata, sin excepción)
  si phq9_score >= 15 OR gad7_score >= 15
    → crisis_escalation_playbook() — derivación a ayuda profesional

NIVEL 2 — SEÑALES DE ÁNIMO (requiere PHQ/GAD disponibles)
  si phq9_score in [5,14]  → low_mood_indicators_playbook()
  si gad7_score in [5,14]  → anxiety_indicators_playbook()

NIVEL 3 — PATRONES DIGITALES (solo features conductuales)
  si doomscrolling_score > 0.70  → doomscrolling_playbook()
  si nocturnal_pattern_score > 0.65  → nocturnal_use_pattern_playbook()
  si attention_fragmentation_score > 0.60  → attention_fragmentation_playbook()

NIVEL 4 — RIESGO DE RECAÍDA (requiere Prophet, Fase 2)
  si relapse_risk_score > 0.70  → habit_relapse_risk_playbook()

NIVEL 5 — ONBOARDING
  si user.focus_sessions_count == 0  → focus_session_intro_playbook()

DEFAULT — sin señales activas
  → weekly_check_in() — micro-encuesta EMA
```

---

## 12. Roadmap por Fases

### MVP (hackathon / primeras semanas)
- [ ] Chrome Extension: collector.ts, scroll-detector.ts, buffer.ts
- [ ] api-service: /events/batch, /surveys, /habits básico
- [ ] Supabase: schema completo + pgvector
- [ ] Playbooks: 8 playbooks mínimos en Markdown
- [ ] Modelo 10 (Sentence Transformer): embed_playbooks.py
- [ ] Modelo 5 (XGBoost): bootstrap con StudentLife + TILES-2018
- [ ] Modelo 2 (Isolation Forest): bootstrap + cold start
- [ ] agent-service: orchestrator.py + 5 tools + triage/tree.py
- [ ] web: dashboard básico + chat con agente + onboarding (PHQ-9/GAD-7)

### Fase 2 (Android + ML avanzado)
- [ ] React Native Expo: UsageStatsManager companion
- [ ] Modelos 1, 3, 4, 6 (K-Means, LSTM AE, Prophet, Correlación)
- [ ] Pipeline de personalización progresiva (model_store.py)
- [ ] Health Connect integration
- [ ] Reportes semanales narrados completos

### Fase 3 (Visión on-device)
- [ ] Focus Sessions: MediaPipe + YOLOv8n
- [ ] Fine-tuning YOLOv8n con dataset propio
- [ ] Deploy on-device (TFLite / ONNX Runtime)
- [ ] SAM 2 (evaluación de viabilidad de cómputo)

---

## 13. Decisiones Abiertas Pendientes

Estas deben resolverse antes del plan de desarrollo:

1. **Nombre definitivo del producto.** "Kairós" es de trabajo. Alternativas: Foco, Nimbo, Pausa, Aurea, Brújula.
2. **Acceso a profesional de salud mental** para validar playbooks y rama de crisis. Requisito no negociable antes de lanzar el agente con usuarios reales.
3. **Ángulo de marketing principal:** productividad/foco (menos riesgo regulatorio) o bienestar mental (diferenciador más fuerte). Define copy y onboarding.
4. **Estrategia de opt-in para datos agregados** (entrenamiento de modelos globales). Necesita flujo de consentimiento explícito en onboarding.
5. **Umbral de días para personalización progresiva.** Este spec usa 30 días. Validar con datos reales si ese umbral es suficiente para modelos estables.

---

*Spec generado con superpowers:brainstorming via new-project-conductor.*  
*Siguiente paso: superpowers:writing-plans para convertir este inventario en plan de desarrollo.*
