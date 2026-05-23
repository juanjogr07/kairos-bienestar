># Kairós — Guía de Recursos de Datos

> Documento de referencia: **qué cargar, dónde conseguirlo, dónde colocarlo y cómo nombrarlo.**  
> Cada recurso tiene un campo **Quién lo usa** para saber qué Dev es responsable de cargarlo.

---

## Índice

1. [Estructura de carpetas de datos](#1-estructura-de-carpetas-de-datos)
2. [Datasets públicos para entrenamiento ML](#2-datasets-públicos-para-entrenamiento-ml)
3. [Playbooks — Base de conocimiento RAG](#3-playbooks--base-de-conocimiento-rag)
4. [Datos semilla (seed) para demo](#4-datos-semilla-seed-para-demo)
5. [Artefactos de modelos ML entrenados](#5-artefactos-de-modelos-ml-entrenados)
6. [Archivos de configuración del agente](#6-archivos-de-configuración-del-agente)
7. [Datos de literatura científica (raw)](#7-datos-de-literatura-científica-raw)
8. [Assets de la extensión Chrome](#8-assets-de-la-extensión-chrome)
9. [Variables de entorno por servicio](#9-variables-de-entorno-por-servicio)
10. [Checklist de carga antes del demo](#10-checklist-de-carga-antes-del-demo)

---

## 1. Estructura de carpetas de datos

Árbol completo de carpetas que **deben existir** para que el proyecto funcione:

```
kairos/
│
├── data/                              ← NO committed a git (en .gitignore)
│   ├── raw/                           ← Datasets originales sin procesar
│   │   ├── studentlife/               ← Dataset Dartmouth (ver §2.1)
│   │   │   ├── sensing/
│   │   │   └── survey/
│   │   ├── tiles2018/                 ← Dataset USC TILES (ver §2.2)
│   │   │   ├── fitbit/
│   │   │   └── surveys/
│   │   └── synthetic/                 ← Datos generados localmente (ver §2.4)
│   │       └── usage_events_synthetic.csv
│   │
│   ├── processed/                     ← CSVs procesados, listos para entrenamiento
│   │   ├── features_daily.csv         ← Features diarias (output de feature_extraction.py)
│   │   ├── labels_phq9.csv            ← Etiquetas PHQ-9 alineadas por user/fecha
│   │   ├── labels_gad7.csv            ← Etiquetas GAD-7 alineadas por user/fecha
│   │   └── bootstrap_train.csv        ← Dataset consolidado para cold-start
│   │
│   └── seeds/                         ← Scripts y CSVs para poblar la demo
│       ├── demo_user_events.csv        ← Eventos de uso del demo user (ver §4.1)
│       ├── demo_ml_results.csv         ← Resultados ML pre-calculados (ver §4.2)
│       └── seed_playbooks.sql          ← INSERT de playbooks en Supabase (ver §4.3)
│
├── playbooks/
│   ├── raw/                           ← PDFs / abstracts de papers (no committed)
│   │   └── *.pdf
│   └── processed/                     ← Archivos MD listos para RAG (committed)
│       ├── attention-fragmentation.md
│       ├── doomscrolling.md
│       ├── nocturnal-use-pattern.md
│       ├── low-mood-indicators.md
│       ├── anxiety-indicators.md
│       ├── habit-relapse-risk.md
│       ├── focus-session-intro.md
│       └── crisis-escalation.md
│
├── agent-service/
│   └── ml/
│       └── models/                    ← Artefactos de modelos serializados
│           ├── isolation_forest_global.joblib
│           ├── xgboost_mood_global.joblib
│           └── kmeans_profiles_global.joblib
│
└── infra/
    └── supabase/
        ├── migrations/
        │   └── 001_initial_schema.sql  ← Ya creado por Dev 1
        └── seeds/
            ├── 001_seed_playbooks.sql
            └── 002_seed_demo_user.sql
```

**Agregar a `.gitignore`:**
```
data/raw/
data/processed/
data/seeds/*.csv
agent-service/ml/models/*.joblib
agent-service/ml/models/*.pkl
playbooks/raw/
```

---

## 2. Datasets públicos para entrenamiento ML

### 2.1 StudentLife Dataset (Dartmouth College)

| Campo | Detalle |
|---|---|
| **Nombre en disco** | `data/raw/studentlife/` |
| **Quién lo usa** | Dev 4 (agent-service/ml/) |
| **Modelos que entrena** | Modelo 1 (K-Means), Modelo 2 (Isolation Forest), Modelo 5 (XGBoost) |
| **Licencia** | Creative Commons — uso académico y de investigación |
| **Tamaño** | ~4 GB descomprimido |

**Cómo descargarlo:**
1. Ir a: `http://studentlife.cs.dartmouth.edu/`
2. Registrarse con email académico o laboral
3. Descargar el ZIP completo: `StudentLifeDataset.zip`
4. Descomprimir en `data/raw/studentlife/`

**Archivos clave que necesitas:**

| Archivo original | Renombrar a | Carpeta destino | Descripción |
|---|---|---|---|
| `sensing/gps/*.csv` | mantener nombres | `data/raw/studentlife/sensing/gps/` | Ubicación por estudiante |
| `sensing/phonecharge/*.csv` | mantener | `data/raw/studentlife/sensing/phonecharge/` | Cargas del teléfono (proxy de uso nocturno) |
| `sensing/activity/*.csv` | mantener | `data/raw/studentlife/sensing/activity/` | Actividad física detectada |
| `sensing/audio/*.csv` | mantener | `data/raw/studentlife/sensing/audio/` | Ambientes de audio (proxy socialización) |
| `survey/PHQ-9/*.csv` | mantener | `data/raw/studentlife/survey/` | Scores PHQ-9 reales de estudiantes |
| `survey/flourishing_scale/*.csv` | mantener | `data/raw/studentlife/survey/` | Bienestar subjetivo |

**Variables relevantes para features:**
```
student_id, timestamp, activity_level, phone_lock_duration,
phone_usage_total_min, conversation_count, sleep_onset_hour
```

---

### 2.2 TILES-2018 Dataset (USC)

| Campo | Detalle |
|---|---|
| **Nombre en disco** | `data/raw/tiles2018/` |
| **Quién lo usa** | Dev 4 (agent-service/ml/) |
| **Modelos que entrena** | Modelo 4 (Prophet), Modelo 6 (correlaciones), Modelo 5 (XGBoost) |
| **Licencia** | Requiere Data Use Agreement — ver instrucciones abajo |
| **Tamaño** | ~2 GB |

**Cómo descargarlo:**
1. Ir a: `https://isi.edu/projects/tiles/tiles-data-release`
2. Completar el Data Use Agreement (DUA) en línea
3. Recibirás un link de descarga por email (1–3 días hábiles)
4. Descargar y descomprimir en `data/raw/tiles2018/`

**Si no llega a tiempo (hackathon):** usar el dataset sintético del §2.4.

**Archivos clave:**

| Archivo | Carpeta destino | Descripción |
|---|---|---|
| `fitbit/heartrate_*.csv` | `data/raw/tiles2018/fitbit/` | Frecuencia cardíaca por trabajador |
| `fitbit/steps_*.csv` | `data/raw/tiles2018/fitbit/` | Pasos diarios |
| `surveys/PHQ-9_*.csv` | `data/raw/tiles2018/surveys/` | PHQ-9 de trabajadores de hospital |
| `surveys/GAD-7_*.csv` | `data/raw/tiles2018/surveys/` | GAD-7 de trabajadores |
| `surveys/STAI_*.csv` | `data/raw/tiles2018/surveys/` | Escala de ansiedad estado-rasgo |

---

### 2.3 GLOBEM Dataset (Universidad de Washington)

| Campo | Detalle |
|---|---|
| **Nombre en disco** | `data/raw/globem/` |
| **Quién lo usa** | Dev 4 — opcional, mejora generalización |
| **Modelos que entrena** | Modelo 5 (XGBoost — predicción PHQ-9), Modelo 2 (Isolation Forest) |
| **Licencia** | MIT |
| **Tamaño** | ~800 MB |

**Cómo descargarlo:**
```
https://github.com/UW-EXP/GLOBEM
```
O via Kaggle: buscar "GLOBEM passive sensing depression"

**Archivos clave:**

| Archivo | Carpeta destino |
|---|---|
| `INS-W_1/passive_data.csv` | `data/raw/globem/` |
| `INS-W_1/survey_data.csv` | `data/raw/globem/` |
| `INS-W_2/passive_data.csv` | `data/raw/globem/` |
| `INS-W_2/survey_data.csv` | `data/raw/globem/` |

---

### 2.4 Dataset Sintético (generado localmente — NO requiere descarga)

**Para cuando no hay tiempo de descargar datasets reales.** Script incluido en el repo.

| Campo | Detalle |
|---|---|
| **Nombre en disco** | `data/raw/synthetic/usage_events_synthetic.csv` |
| **Quién lo genera** | Dev 4 ejecutando `ml-worker/scripts/generate_synthetic.py` |
| **Quién lo usa** | Dev 4 (entrenamiento bootstrap) |

**Cómo generarlo:**
```bash
cd agent-service
python ml/scripts/generate_synthetic.py --n_users 200 --days 30 \
  --output ../data/raw/synthetic/usage_events_synthetic.csv
```

**Estructura del CSV generado:**
```
user_id, date, total_usage_min, peak_hour, session_count,
nocturnal_ratio, scroll_speed_avg, app_switches_per_hour,
bounce_rate, phq9_score, gad7_score
```

---

### 2.5 Datos de PHQ-9 / GAD-7 para validación

| Campo | Detalle |
|---|---|
| **Fuente** | NIMH Open Data Archive |
| **URL** | `https://nda.nih.gov/` (requiere cuenta gratuita) |
| **Nombre en disco** | `data/raw/nimh/phq9_validation.csv` |
| **Uso** | Calibración de umbrales del árbol de triaje (no entrenamiento) |

**Columnas esperadas:**
```
participant_id, assessment_date, q1, q2, q3, q4, q5, q6, q7, q8, q9, total_score, severity
```

**Mapeo de severity:**
```
0–4:  Mínimo
5–9:  Leve
10–14: Moderado
15–19: Moderadamente severo
20–27: Severo  ← umbral de crisis en Kairós
```

---

## 3. Playbooks — Base de conocimiento RAG

Estos archivos son **críticos** — son el conocimiento que el agente usa para responder. Deben estar en `playbooks/processed/` con exactamente estos nombres.

### 3.1 Playbooks del MVP (deben estar antes de demo)

#### `playbooks/processed/doomscrolling.md`

```markdown
---
slug: doomscrolling
title: Patrón de Doomscrolling
signal_type: behavioral
activates_when: "scroll_speed_avg > 800 OR session_duration > 60min en redes sociales"
crisis_escalation: false
sources:
  - "Ryff, C.D. (2014). Psychological Well-Being Revisited"
  - "Twenge, J.M. et al. (2018). Social Media Use and Depression in Adolescents"
---

## ¿Qué es el doomscrolling?

El doomscrolling es el patrón de consumo compulsivo de contenido negativo en redes sociales...

## Señales detectadas
- Velocidad de scroll superior a 800 px/s mantenida por más de 5 minutos
- Sesiones de más de 60 minutos en dominios de redes sociales
- Aumento de uso nocturno (después de las 22:00)

## Intervenciones basadas en evidencia
1. **Pausa consciente de 3 minutos** antes de abrir la app (evidencia: reducción del 23%)
2. **Límite de sesión visible** — notificación a los 20 minutos
3. **Curación activa** — seguir solo cuentas positivas

## Hábito sugerido
"Límite de 30 minutos en redes sociales antes de las 20:00"

## Qué NO decir al usuario
- Nunca: "Estás deprimido/a porque usas redes sociales"
- Nunca: "Necesitas ayuda profesional" (a menos que PHQ-9 ≥ 15)
- Sí: "Detecté un patrón de uso intensivo que puede estar afectando tu energía"
```

#### `playbooks/processed/attention-fragmentation.md`

```markdown
---
slug: attention-fragmentation
title: Fragmentación de Atención
signal_type: behavioral
activates_when: "app_switches_per_hour > 20 OR average_session_duration < 3min"
crisis_escalation: false
sources:
  - "Mark, G. et al. (2016). Focused, Aroused, but so Distractible"
  - "Leroy, S. (2009). Why Is It So Hard to Do My Work?"
---

## ¿Qué es la fragmentación de atención?

Cambiar entre aplicaciones más de 20 veces por hora fragmenta el estado de flujo...

## Señales detectadas
- Más de 20 cambios de aplicación por hora
- Duración promedio de sesión menor a 3 minutos
- Patrón de "rebote" entre redes sociales y apps de trabajo

## Intervenciones basadas en evidencia
1. **Bloques de trabajo enfocado** — 25 minutos sin cambiar de app (Pomodoro)
2. **Silencio de notificaciones** durante bloques de trabajo
3. **Tiempo de transición** — 2 minutos entre tareas para limpiar el contexto mental

## Hábito sugerido
"Un bloque de trabajo enfocado de 25 minutos al día"
```

#### `playbooks/processed/nocturnal-use-pattern.md`

```markdown
---
slug: nocturnal-use-pattern
title: Uso Nocturno del Teléfono
signal_type: behavioral
activates_when: "nocturnal_ratio > 0.3 OR usage_after_22h > 45min"
crisis_escalation: false
sources:
  - "Chang, A.M. et al. (2015). Evening use of light-emitting eReaders negatively affects sleep"
  - "Hysing, M. et al. (2015). Sleep and use of electronic devices in adolescence"
---

## ¿Qué es el patrón de uso nocturno?

El uso del teléfono después de las 22:00 retrasa la producción de melatonina...

## Señales detectadas
- Más del 30% del uso diario ocurre después de las 22:00
- Sesiones activas después de las 23:00

## Intervenciones basadas en evidencia
1. **Zona libre de pantallas** — sin teléfono 1 hora antes de dormir
2. **Modo nocturno automático** — filtro de luz azul desde las 20:00
3. **Alarma de desconexión** — recordatorio a las 21:30

## Hábito sugerido
"Sin teléfono la primera hora de la mañana y la última hora de la noche"
```

#### `playbooks/processed/low-mood-indicators.md`

```markdown
---
slug: low-mood-indicators
title: Indicadores de Estado de Ánimo Bajo
signal_type: survey_behavioral
activates_when: "phq9_score >= 5 AND phq9_score < 15"
crisis_escalation: false
sources:
  - "Kroenke, K. et al. (2001). The PHQ-9: Validity of a Brief Depression Severity Measure"
  - "Mohr, D.C. et al. (2017). Personal Sensing: Understanding Mental Health Using Ubiquitous Sensors"
---

## Contexto

Scores PHQ-9 entre 5 y 14 indican síntomas leves a moderados que responden bien
a intervenciones conductuales de bajo umbral...

## Señales detectadas
- PHQ-9 entre 5 y 14
- Reducción del uso diario (posible apatía)
- Aumento de uso nocturno en las últimas 2 semanas

## Intervenciones basadas en evidencia
1. **Activación conductual** — una actividad placentera pequeña cada día
2. **Rutina de sueño estable** — misma hora de acostarse 5 días por semana
3. **Conexión social breve** — un mensaje a alguien de confianza por día

## Hábito sugerido
"Una actividad que disfrutes por 15 minutos al día"

## ⚠️ Nota de triaje
Si en la próxima evaluación (7 días) el score aumenta a ≥ 15, activar crisis-escalation.
```

#### `playbooks/processed/crisis-escalation.md`

```markdown
---
slug: crisis-escalation
title: Escalación a Recursos Profesionales
signal_type: survey
activates_when: "phq9_score >= 15 OR gad7_score >= 15 OR q9_phq9 >= 1"
crisis_escalation: true
sources:
  - "PHQ-9 clinical guidelines (Spitzer et al., 1999)"
  - "Colombian Ministry of Health — Mental Health Line 106"
---

## ⚠️ PROTOCOLO DE CRISIS — NO MODIFICAR SIN REVISIÓN CLÍNICA

Este playbook se activa automáticamente. El agente **no puede ignorarlo**.

## Cuándo se activa
- PHQ-9 total ≥ 15 (síntomas moderadamente severos o severos)
- GAD-7 total ≥ 15 (ansiedad severa)
- Respuesta q9 del PHQ-9 ≥ 1 (pensamientos de daño)

## Mensaje al usuario (texto exacto — no parafrasear)

> "He notado que tus respuestas indican que puedes estar pasando por un momento
> difícil. Kairós es una herramienta de bienestar, no un servicio de salud mental.
> Te recomendamos hablar con un profesional.
>
> 📞 **Línea de Salud Mental Colombia: 106** (gratuita, 24 horas)
> 🌐 **Crisis Text Line:** Envía 'HOLA' al 741741
>
> ¿Tienes a alguien de confianza con quien puedas hablar hoy?"

## Qué NO hace el agente en este estado
- No da consejos de salud mental
- No continúa la conversación normal hasta reconocimiento del usuario
- No puede ser "omitido" por el usuario con prompts

## Acciones del sistema
1. Mostrar mensaje de crisis — no omitible
2. Deshabilitar sugerencia de hábitos hasta próxima evaluación
3. Registrar en `intervention_log` con `trigger_type = 'crisis'`
4. Enviar notificación al usuario en 24h para check-in
```

---

### 3.2 Playbooks adicionales (cargar antes del Fase 2)

| Archivo | Señal de activación |
|---|---|
| `anxiety-indicators.md` | `gad7_score >= 5 AND gad7_score < 15` |
| `habit-relapse-risk.md` | `streak_broken_count >= 3 en 30 días` |
| `focus-session-intro.md` | `app_switches_per_hour > 15 AND first_focus_session = false` |

---

### 3.3 Cómo cargar los playbooks a Supabase (pgvector)

**Responsable:** Dev 4  
**Script:** `playbooks/scripts/embed_playbooks.py`

```bash
cd agent-service
python ../playbooks/scripts/embed_playbooks.py \
  --dir ../playbooks/processed \
  --supabase-url $SUPABASE_URL \
  --supabase-key $SUPABASE_SERVICE_KEY
```

**El script hace:**
1. Lee cada `.md` de `playbooks/processed/`
2. Divide en chunks de ~300 tokens con overlap de 50
3. Genera embeddings con `all-MiniLM-L6-v2` (384 dims)
4. Hace INSERT en `playbooks` y `playbook_chunks`

**Verificar en Supabase SQL Editor:**
```sql
SELECT p.slug, COUNT(pc.id) as chunks
FROM playbooks p
LEFT JOIN playbook_chunks pc ON pc.playbook_id = p.id
GROUP BY p.slug;
-- Esperado: 5 filas, entre 3-8 chunks cada una
```

---

## 4. Datos semilla (seed) para demo

Estos archivos se usan para poblar la demo con un usuario de ejemplo que ya tiene historial.

### 4.1 `data/seeds/demo_user_events.csv`

**Quién lo crea:** Dev 4 (o se genera con el script sintético)  
**Estructura:**

```csv
user_id,domain,duration_seconds,event_type,scroll_speed,timestamp
DEMO_USER_UUID,youtube.com,2700,tab_active,450.5,2026-05-16T20:30:00Z
DEMO_USER_UUID,instagram.com,1800,tab_active,920.3,2026-05-16T21:15:00Z
DEMO_USER_UUID,twitter.com,900,tab_active,755.1,2026-05-17T22:45:00Z
DEMO_USER_UUID,youtube.com,3600,tab_active,320.0,2026-05-18T14:00:00Z
...
```

**Reglas del demo:**
- El `DEMO_USER_UUID` debe ser el UUID real del usuario demo en Supabase
- Incluir datos de los últimos 7 días
- Total de uso: ~140 min/día (refleja los datos del dashboard)
- Incluir uso nocturno en 3+ días (activa playbook nocturnal)

**Cómo cargarlo:**
```bash
# Desde el SQL Editor de Supabase, ejecutar:
# infra/supabase/seeds/002_seed_demo_user.sql
# (generado a partir de este CSV)
```

---

### 4.2 `data/seeds/demo_ml_results.csv`

**Quién lo usa:** Dev 4 — para pre-cargar resultados ML sin necesidad de correr el worker  
**Estructura:**

```csv
user_id,model_type,result,computed_at
DEMO_USER_UUID,isolation_forest,"{""anomaly_score"": -0.23, ""is_anomaly"": false, ""risk_level"": ""low""}",2026-05-23T08:00:00Z
DEMO_USER_UUID,xgboost_mood,"{""predicted_phq9_change"": 1.2, ""direction"": ""stable"", ""confidence"": 0.71}",2026-05-23T08:00:00Z
DEMO_USER_UUID,kmeans_cluster,"{""cluster"": 1, ""profile"": ""nocturnal_heavy_user"", ""confidence"": 0.84}",2026-05-23T08:00:00Z
```

---

### 4.3 `infra/supabase/seeds/001_seed_playbooks.sql`

**Quién lo ejecuta:** Dev 4 (o cualquiera antes de la demo)  
**Cuándo:** Después de ejecutar `001_initial_schema.sql`

```sql
-- infra/supabase/seeds/001_seed_playbooks.sql
-- Insertar playbooks base (sin embeddings aún — embed_playbooks.py los agrega)

INSERT INTO playbooks (slug, title, signal_type, content, activates_when, crisis_escalation)
VALUES
  (
    'doomscrolling',
    'Patrón de Doomscrolling',
    'behavioral',
    '## Doomscrolling\nPatrón de consumo compulsivo de contenido negativo...',
    'scroll_speed_avg > 800 OR session_duration > 60min',
    false
  ),
  (
    'attention-fragmentation',
    'Fragmentación de Atención',
    'behavioral',
    '## Fragmentación de Atención\nCambios frecuentes entre apps...',
    'app_switches_per_hour > 20',
    false
  ),
  (
    'nocturnal-use-pattern',
    'Uso Nocturno del Teléfono',
    'behavioral',
    '## Uso Nocturno\nUso del teléfono después de las 22:00...',
    'nocturnal_ratio > 0.3',
    false
  ),
  (
    'low-mood-indicators',
    'Indicadores de Estado de Ánimo Bajo',
    'survey_behavioral',
    '## Estado de Ánimo Bajo\nScores PHQ-9 entre 5 y 14...',
    'phq9_score >= 5 AND phq9_score < 15',
    false
  ),
  (
    'crisis-escalation',
    'Escalación a Recursos Profesionales',
    'survey',
    '## PROTOCOLO DE CRISIS\nActivado cuando PHQ-9 >= 15...',
    'phq9_score >= 15 OR gad7_score >= 15',
    true
  )
ON CONFLICT (slug) DO NOTHING;
```

---

### 4.4 `infra/supabase/seeds/002_seed_demo_user.sql`

**Quién lo ejecuta:** Dev 4  
**Nota:** reemplazar `DEMO_USER_UUID` con el UUID real del usuario demo

```sql
-- infra/supabase/seeds/002_seed_demo_user.sql
-- Sustituir DEMO_USER_UUID con el UUID real del usuario demo en Supabase Auth

-- Encuestas
INSERT INTO survey_responses (user_id, survey_type, responses, total_score, created_at)
VALUES
  ('DEMO_USER_UUID', 'phq9',
   '{"q1":2,"q2":1,"q3":2,"q4":2,"q5":1,"q6":0,"q7":1,"q8":0,"q9":0}',
   9, NOW() - INTERVAL '7 days'),
  ('DEMO_USER_UUID', 'gad7',
   '{"q1":2,"q2":1,"q3":1,"q4":2,"q5":0,"q6":1,"q7":1}',
   8, NOW() - INTERVAL '7 days');

-- Resultados ML pre-calculados
INSERT INTO ml_results (user_id, model_type, result, computed_at)
VALUES
  ('DEMO_USER_UUID', 'isolation_forest',
   '{"anomaly_score": -0.23, "is_anomaly": false, "risk_level": "low"}',
   NOW()),
  ('DEMO_USER_UUID', 'xgboost_mood',
   '{"predicted_phq9_change": 1.2, "direction": "stable", "confidence": 0.71}',
   NOW()),
  ('DEMO_USER_UUID', 'kmeans_cluster',
   '{"cluster": 1, "profile": "nocturnal_heavy_user", "confidence": 0.84}',
   NOW());

-- Hábito de ejemplo
INSERT INTO habits (user_id, name, playbook_slug, frequency)
VALUES
  ('DEMO_USER_UUID', 'Sin teléfono la primera hora del día', 'nocturnal-use-pattern', 'daily');

-- Racha del hábito
INSERT INTO streaks (habit_id, user_id, current_streak, longest_streak, last_completion, grace_days_used)
SELECT id, user_id, 3, 5, CURRENT_DATE - 1, 0
FROM habits WHERE user_id = 'DEMO_USER_UUID' LIMIT 1;
```

---

## 5. Artefactos de modelos ML entrenados

Estos archivos `.joblib` son modelos ya entrenados que el agente carga en runtime.

### 5.1 Modelos del MVP (Dev 4 los genera)

| Archivo | Carpeta | Cómo generarlo | Modelo |
|---|---|---|---|
| `isolation_forest_global.joblib` | `agent-service/ml/models/` | `python ml/bootstrap.py --model isolation_forest` | Modelo 2 — anomalías |
| `xgboost_mood_global.joblib` | `agent-service/ml/models/` | `python ml/bootstrap.py --model xgboost` | Modelo 5 — predicción mood |
| `kmeans_profiles_global.joblib` | `agent-service/ml/models/` | Fase 2 (no MVP) | Modelo 1 — clustering |

**Script de bootstrap (Dev 4 lo ejecuta una sola vez):**
```bash
cd agent-service
python ml/bootstrap.py \
  --data ../data/processed/bootstrap_train.csv \
  --output ml/models/ \
  --models isolation_forest xgboost
```

**Si no hay datos reales disponibles:**
```bash
# Primero generar datos sintéticos, luego entrenar
python ml/scripts/generate_synthetic.py --output ../data/processed/bootstrap_train.csv
python ml/bootstrap.py --data ../data/processed/bootstrap_train.csv --output ml/models/
```

### 5.2 Modelo de embeddings (se descarga automáticamente)

| Recurso | Carpeta cache | Cómo se descarga |
|---|---|---|
| `all-MiniLM-L6-v2` (~90 MB) | `~/.cache/huggingface/hub/` | Automático al primer uso de `sentence-transformers` |

**Forzar descarga antes de la demo (evitar lag):**
```bash
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
```

---

## 6. Archivos de configuración del agente

### 6.1 System prompt del agente

| Archivo | Carpeta | Quién lo usa |
|---|---|---|
| `kairos_system_prompt.txt` | `agent-service/agent/prompts/` | Dev 4 — cargado por `orchestrator.py` |

**Contenido base:**
```
Eres Kairós, un copiloto de bienestar digital.
Tu rol es acompañar al usuario con insights basados en sus datos de comportamiento.

REGLAS ABSOLUTAS:
1. NUNCA uses palabras: diagnóstico, tratamiento, depresión clínica, trastorno.
2. SIEMPRE usa: señales, indicadores, patrones, screening.
3. Si PHQ-9 >= 15 o GAD-7 >= 15: SOLO ejecutar crisis-escalation tool. No otra respuesta.
4. NUNCA inventes información médica. Solo usa playbooks recuperados via RAG.
5. Tono: cálido, directo, sin condescendencia, sin sobreprotección.

HERRAMIENTAS DISPONIBLES:
- get_usage_summary: resumen del uso digital del usuario hoy/semana
- get_survey_scores: scores PHQ-9 y GAD-7 más recientes
- get_ml_scores: resultados de modelos ML (anomalías, clusters)
- search_playbooks: buscar en la base de conocimiento RAG

Siempre llama al menos una herramienta antes de responder sobre el estado del usuario.
```

### 6.2 Triage rules (JSON)

| Archivo | Carpeta | Quién lo usa |
|---|---|---|
| `triage_rules.json` | `agent-service/triage/` | Dev 4 — cargado por `tree.py` |

```json
{
  "rules": [
    {
      "priority": 1,
      "name": "crisis_phq9",
      "condition": "phq9_score >= 15 OR phq9_q9 >= 1",
      "playbook": "crisis-escalation",
      "override_all": true
    },
    {
      "priority": 2,
      "name": "crisis_gad7",
      "condition": "gad7_score >= 15",
      "playbook": "crisis-escalation",
      "override_all": true
    },
    {
      "priority": 3,
      "name": "nocturnal",
      "condition": "nocturnal_ratio > 0.3 AND last_phq9 < 15",
      "playbook": "nocturnal-use-pattern"
    },
    {
      "priority": 4,
      "name": "doomscrolling",
      "condition": "scroll_speed_avg > 800 OR social_media_min > 90",
      "playbook": "doomscrolling"
    },
    {
      "priority": 5,
      "name": "attention",
      "condition": "app_switches_per_hour > 20",
      "playbook": "attention-fragmentation"
    },
    {
      "priority": 6,
      "name": "low_mood",
      "condition": "phq9_score >= 5 AND phq9_score < 15",
      "playbook": "low-mood-indicators"
    }
  ],
  "default_playbook": "attention-fragmentation"
}
```

---

## 7. Datos de literatura científica (raw)

Solo para Dev 4. Los papers no se suben al repo (son PDFs grandes). Se procesan localmente para generar los playbooks.

### 7.1 Papers base de los playbooks MVP

| Paper | Dónde conseguirlo | Para playbook |
|---|---|---|
| Twenge et al. (2018) — "Increases in Depressive Symptoms" | Google Scholar / PubMed ID: 30185519 | doomscrolling |
| Mark et al. (2016) — "Focused, Aroused, but so Distractible" | ACM Digital Library | attention-fragmentation |
| Chang et al. (2015) — "Evening use of light-emitting eReaders" | PNAS — acceso libre | nocturnal-use-pattern |
| Kroenke et al. (2001) — "The PHQ-9" | PMID: 11556941 — PubMed libre | low-mood-indicators |
| Hysing et al. (2015) — "Sleep and electronic devices" | PMID: 25637471 | nocturnal-use-pattern |

**Dónde guardarlos:**
```
playbooks/raw/
├── twenge2018_social_media_depression.pdf
├── mark2016_focused_aroused_distractible.pdf
├── chang2015_evening_light_emitting_ereaders.pdf
├── kroenke2001_phq9.pdf
└── hysing2015_sleep_electronic_devices.pdf
```

**Script de extracción (opcional, usa el LLM):**
```bash
python playbooks/scripts/extract_interventions.py \
  --input playbooks/raw/ \
  --output playbooks/processed/ \
  --anthropic-key $ANTHROPIC_API_KEY
```

---

## 8. Assets de la extensión Chrome

**Responsable:** Dev 3

### 8.1 Iconos de la extensión

| Archivo | Carpeta | Resolución | Descripción |
|---|---|---|---|
| `icon-16.png` | `extension/public/icons/` | 16×16 px | Favicon barra de título Chrome |
| `icon-32.png` | `extension/public/icons/` | 32×32 px | Toolbar pequeño |
| `icon-48.png` | `extension/public/icons/` | 48×48 px | Página de extensiones |
| `icon-128.png` | `extension/public/icons/` | 128×128 px | Chrome Web Store |

**Fuentes gratuitas para iconos:**
- SVG original: Figma Community → buscar "mindfulness icon" (filtrar CC0)
- Convertir a PNG: `https://svgtopng.com/`
- Alternativa rápida: `https://iconify.design/` → buscar "leaf" o "zen"

**Nombre del ícono elegido para Kairós:** símbolo de infinito o reloj arena (refleja el concepto de tiempo + bienestar).

### 8.2 Imágenes del popup

| Archivo | Carpeta | Uso |
|---|---|---|
| `kairos-logo.svg` | `extension/public/` | Header del popup |
| `empty-state.svg` | `extension/public/` | Cuando no hay datos aún |

**Herramienta recomendada para crear SVGs rápido:** Figma (free tier) o `https://svgrepo.com/`

---

## 9. Variables de entorno por servicio

Resumen de qué env var usa cada servicio y dónde va:

### `api-service/.env` (o heredado del `.env` raíz)
```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...  # nunca exponerlo al frontend
```

### `agent-service/.env`
```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Cómo conseguir `ANTHROPIC_API_KEY`:**
1. Ir a `https://console.anthropic.com/`
2. Settings → API Keys → Create Key
3. Nombre: `kairos-mvp`
4. Copiar inmediatamente (no se vuelve a mostrar)

### `web/.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AGENT_URL=http://localhost:8001
NEXT_PUBLIC_USE_MOCK=false  # cambiar a true si backend no está listo
```

### `extension/` (via `manifest.json` host permissions)
```
No env vars — la extensión usa la SUPABASE_ANON_KEY hardcodeada en el bundle.
Para producción: inyectar via build step.
Para MVP: hardcodear en extension/storage/config.ts
```

### Cómo conseguir las claves de Supabase:
1. Ir a `https://supabase.com/dashboard`
2. Seleccionar el proyecto `kairos-mvp`
3. Settings → API
4. Copiar: `Project URL`, `anon public`, `service_role secret`

---

## 10. Checklist de carga antes del demo

Ejecutar en orden. Responsable entre paréntesis.

### Preparación de infraestructura (Dev 1)
- [ ] Crear proyecto en Supabase → copiar credenciales al `.env` compartido
- [ ] Ejecutar `infra/supabase/migrations/001_initial_schema.sql` en SQL Editor
- [ ] Verificar que pgvector está activo: `SELECT * FROM pg_extension WHERE extname = 'vector';`
- [ ] Compartir `.env` con valores reales con el equipo (Slack/WhatsApp)

### Playbooks y RAG (Dev 4)
- [ ] Crear los 5 archivos `.md` en `playbooks/processed/` (textos de §3.1)
- [ ] Ejecutar `infra/supabase/seeds/001_seed_playbooks.sql`
- [ ] Ejecutar `python playbooks/scripts/embed_playbooks.py`
- [ ] Verificar embeddings: `SELECT slug, COUNT(*) FROM playbooks p JOIN playbook_chunks pc ON pc.playbook_id = p.id GROUP BY slug;`

### Modelos ML (Dev 4)
- [ ] Generar dataset sintético: `python ml/scripts/generate_synthetic.py`
- [ ] Entrenar modelos bootstrap: `python ml/bootstrap.py`
- [ ] Verificar que existen: `ls agent-service/ml/models/*.joblib`
- [ ] Pre-descargar sentence-transformers: `python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"`

### Datos demo (Dev 4 + Dev 1)
- [ ] Crear usuario demo en Supabase Auth → copiar UUID
- [ ] Reemplazar `DEMO_USER_UUID` en `002_seed_demo_user.sql`
- [ ] Ejecutar `002_seed_demo_user.sql` en SQL Editor
- [ ] Verificar: `SELECT COUNT(*) FROM usage_events WHERE user_id = 'DEMO_USER_UUID';` → debe ser > 50

### Verificación final de servicios
- [ ] `curl http://localhost:8000/health` → `{"status":"ok","service":"api-service"}`
- [ ] `curl http://localhost:8001/health` → `{"status":"ok","service":"agent-service"}`
- [ ] `curl http://localhost:3000` → página de login visible
- [ ] Extensión cargada en Chrome → `chrome://extensions` → Developer mode → Load unpacked → `extension/dist/`

---

## Apéndice: Nomenclatura de archivos

| Tipo de archivo | Convención | Ejemplo |
|---|---|---|
| Datasets CSV | `snake_case_descripcion.csv` | `features_daily.csv` |
| Modelos ML | `modelo_scope.joblib` | `isolation_forest_global.joblib` |
| Playbooks | `kebab-case.md` | `nocturnal-use-pattern.md` |
| Seeds SQL | `NNN_descripcion.sql` | `001_seed_playbooks.sql` |
| Migraciones SQL | `NNN_descripcion.sql` | `001_initial_schema.sql` |
| Seeds demo CSV | `demo_entidad.csv` | `demo_user_events.csv` |
| Prompts del agente | `kairos_proposito.txt` | `kairos_system_prompt.txt` |
| Reglas de triaje | `triage_nombre.json` | `triage_rules.json` |
| Iconos extensión | `icon-SIZE.png` | `icon-128.png` |
