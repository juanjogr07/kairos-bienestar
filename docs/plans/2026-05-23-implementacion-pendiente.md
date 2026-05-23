# Kairós — Plan de Implementación Pendiente

> **Fecha:** 2026-05-23 | **Última actualización:** 2026-05-23 (post-merge audit)  
> **Base:** Gap analysis contra spec `docs/superpowers/specs/2026-05-23-kairos-bienestar-design.md` y planes individuales `docs/superpowers/plans/`  
> **Estado actual:** ~65% — `dev` sincronizado con todas las ramas (main + ML + web). API, extension y streak engine completos. Falta: 3 playbooks, RAG data, reports page, modelos ML reales.

---

## Porcentaje de completitud por área

| Área | Stories | Completadas | % | Notas |
|---|---|---|---|---|
| Agent-service (AI + rate limit) | 5 | 5 | **100%** | ✅ US-AI-001/002/003/004 + US-API-003 en `dev` |
| API-service (endpoints + streak) | 4 | 4 | **100%** | ✅ weekly-usage + streak engine en `dev` |
| Extension Chrome | 3 | 3 | **100%** | ✅ manifest, popup, retry — todo en `dev` |
| Web Frontend (`kairos-nextjs`) | 4 | 3 | **75%** | ✅ dashboard/chat/habits/onboarding — ❌ reports page |
| Backend-2 Data | 3 | 1 | **33%** | ✅ US-DATA-001 (streak); US-DATA-002/003 pendientes |
| Playbooks/RAG | 8 playbooks | 5 | **40%** | ❌ 3 playbooks faltantes, `playbook_chunks` vacía |
| ML Worker | 2 | 0 | **5%** | ⚠️ Solo scaffolding — sin modelos reales |
| Infra/DB | — | — | **70%** | ✅ migrations + seeds; SQL function no ejecutada |
| **TOTAL** | | | **~65%** | |

---

## Mapa de estado actual (post-merge, rama `dev`)

| Componente | Archivo clave | Estado |
|---|---|---|
| agent-service orchestrator | `agent-service/agent/orchestrator.py` | ✅ Completo — suggested_habit + crisis guardrail |
| agent-service triage tree | `agent-service/triage/tree.py` | ✅ Completo + improving level (US-AI-001) |
| agent-service 4 tools | `agent-service/agent/tools/` | ✅ Completo |
| agent-service RAG código | `agent-service/rag/embedder.py` + `retriever.py` | ✅ Código listo — datos vacíos |
| agent-service routers | `agent-service/routers/chat.py` | ✅ Completo + rate limiting |
| agent-service weekly report | `agent-service/agent/orchestrator.py` | ✅ Completo — gate 3 días (US-AI-003) |
| agent-service crisis guardrail | `agent-service/agent/orchestrator.py` | ✅ Pre-LLM, Línea 106 (US-AI-004) |
| agent-service rate limiting | `agent-service/rate_limit.py` | ✅ 20 req/hora por user_id (US-API-003) |
| agent-service tests | `agent-service/tests/` | ✅ 5 suites: triage, orchestrator, weekly_report, crisis_guardrail, rate_limit |
| api-service auth + JWT | `api-service/auth.py` | ✅ Completo |
| api-service events batch | `api-service/routers/events.py` | ✅ Completo |
| api-service surveys | `api-service/routers/surveys.py` | ✅ Completo |
| api-service dashboard + weekly-usage | `api-service/routers/dashboard.py` | ✅ Completo + GET /weekly-usage (US-API-001) |
| api-service habits | `api-service/routers/habits.py` | ✅ Completo |
| api-service streak engine | `api-service/services/streak_engine.py` | ✅ Con grace days (US-DATA-001) |
| api-service tests | `api-service/tests/` | ✅ 6 suites |
| api-service ML placeholder | `api-service/services/ml/__init__.py` | ⚠️ Placeholder — sin modelos |
| extension manifest.json | `extension/manifest.json` | ✅ Completo |
| extension popup | `extension/src/popup/` | ✅ Popup.tsx + html + index.tsx |
| extension tab tracker | `extension/src/background/tab-tracker.ts` | ✅ Completo |
| extension scroll detector | `extension/src/content-scripts/scroll-detector.ts` | ✅ Completo |
| extension buffer | `extension/src/storage/buffer.ts` | ✅ Completo |
| extension retry backoff | `extension/src/background/sync.ts` | ✅ 3 reintentos, 401 no reintenta (US-API-002) |
| web app (kairos-nextjs) | `web/kairos-nextjs/` | ✅ dashboard, chat, habits, onboarding, profile, extension page |
| web componentes UI | `web/kairos-nextjs/components/` | ✅ AppShell, Badges, BottomNav, Logo |
| **web reports page** | `web/kairos-nextjs/app/report/` | ❌ No existe — pendiente US-FE-004 |
| infra migrations | `infra/supabase/migrations/001_initial_schema.sql` | ✅ Completo |
| infra seeds | `infra/supabase/seeds/` | ✅ 2 seeds: playbooks + demo_user |
| **match_playbook_chunks SQL** | Supabase function | ❌ No ejecutada — ver Tarea 0.3 |
| **playbook_chunks poblado** | Supabase table | ❌ VACÍO — RAG roto — ver Tarea 0.4 |
| **momentum-builder playbook** | `playbooks/processed/momentum-builder.md` | ❌ No existe — ver Tarea 0.1 |
| **anxiety-indicators playbook** | `playbooks/processed/anxiety-indicators.md` | ❌ No existe — ver Tarea 0.2 |
| **focus-session-intro playbook** | `playbooks/processed/focus-session-intro.md` | ❌ No existe — ver Tarea 0.2 |
| **ml-worker modelos** | `ml-worker/` | ⚠️ Solo scaffolding — sin Isolation Forest ni XGBoost |
| **ml seed datos** | `data/synthetic/mood_training.csv` | ❌ No generado — ejecutar `generate_seed.py` |
| **ml_results demo seed** | Supabase `ml_results` table | ❌ Vacío → scores 0.0 — ver Tarea 0.5 |
| **match_playbook_chunks SQL** | Supabase function | ❌ No ejecutada — ver Tarea 0.3 |
| **momentum-builder playbook** | `playbooks/processed/momentum-builder.md` | ❌ No existe — ver Tarea 0.1 |
| **anxiety-indicators playbook** | `playbooks/processed/anxiety-indicators.md` | ❌ No existe — ver Tarea 0.2 |
| **focus-session-intro playbook** | `playbooks/processed/focus-session-intro.md` | ❌ No existe — ver Tarea 0.2 |
| **extension intervention overlay** | `extension/src/content-scripts/intervention.ts` | ❌ No existe |
| **ml-worker servicio** | `ml-worker/` | ❌ Directorio inexistente — pendiente US-ML-001/002 |
| **ml seed para demo** | Supabase `ml_results` table | ❌ Vacío → scores 0.0 — ver Tarea 0.5 |
| **infra migrations** | `infra/supabase/migrations/` | ❌ No versionadas |

---

## Fases de implementación

Las fases están ordenadas por impacto en la demo. Completar Fase 0 y Fase 1 da un demo funcional completo.

---

## FASE 0 — Destrabar la demo (35 min) 🔴 CRÍTICO

Sin esto el agente responde sin contexto real. El RAG está implementado pero vacío.

### Tarea 0.1 — Crear playbook momentum-builder (10 min)

El nivel `improving` del triage (US-AI-001) activa este playbook. Sin él el agente no tiene qué recuperar.

**Archivo:** `playbooks/processed/momentum-builder.md`

```markdown
---
slug: momentum-builder
signal_type: improving_trend
activates_when: phq9_prev - phq9 >= 3 OR gad7_prev - gad7 >= 3
crisis_escalation: false
---

## Señales que activan este playbook
- PHQ-9 bajó 3 o más puntos respecto a la evaluación anterior
- GAD-7 bajó 3 o más puntos respecto a la evaluación anterior
- El usuario está en rango de síntomas leves a moderados (5–14) y mejorando

## Qué dice la evidencia
La detección temprana de tendencias de mejora y el refuerzo positivo son componentes centrales
de la terapia cognitivo-conductual (CBT). Destacar el progreso del propio usuario —comparado
contra su historial, no contra otros— activa el sistema de recompensa intrínseca y aumenta
la adherencia al tratamiento (Bandura, 1997). Los pequeños cambios son precursores confiables
de mejora sostenida (Lutz et al., 2009, Journal of Consulting and Clinical Psychology).

## Hábitos recomendados (por esfuerzo/impacto)
1. **Registro de logros** (bajo esfuerzo): anotar 1 cosa pequeña que salió bien al final del día.
   El "journaling" positivo consolida patrones cognitivos adaptativos.
2. **Mantener la rutina que está funcionando** (medio esfuerzo): identificar qué cambió en las
   últimas semanas y proteger esas condiciones (sueño, actividad física, tiempo social).
3. **Reducción gradual de estímulos negativos** (bajo esfuerzo): si el uso digital bajó,
   mantener ese límite como norma nueva, no como esfuerzo extra.

## Intervenciones en el momento
- Reconocer el progreso explícitamente antes de sugerir cualquier acción.
- Preguntar qué cree el usuario que contribuyó a la mejora — activa la agencia personal.

## Cuándo recomendar ayuda profesional
Si la mejora se detiene o revierte durante 2 semanas consecutivas, es buen momento para
buscar acompañamiento profesional para consolidar los avances.

## Lenguaje aprobado
✅ "Noto que tus indicadores de ánimo han mejorado desde la última evaluación. Eso es
   significativo. ¿Qué crees que contribuyó a ese cambio?"
✅ "Estás en una tendencia positiva. El objetivo ahora es mantener lo que está funcionando."
❌ "Ya estás bien, no necesitas ayuda."
❌ "Mejoraste X puntos" (no dar números crudos al usuario — narrar en lenguaje natural).
```

**Verificar:**
```bash
ls playbooks/processed/
# debe listar: attention-fragmentation.md crisis-escalation.md doomscrolling.md
#              low-mood-indicators.md momentum-builder.md nocturnal-use-pattern.md
```

---

### Tarea 0.2 — Crear playbooks anxiety-indicators y focus-session-intro (5 min)

**Archivo:** `playbooks/processed/anxiety-indicators.md`

```markdown
---
slug: anxiety-indicators
signal_type: anxiety
activates_when: gad7_score >= 5 AND gad7_score < 15
crisis_escalation: false
---

## Señales que activan este playbook
- GAD-7 score entre 5 y 14 (ansiedad leve a moderada)

## Qué dice la evidencia
Las técnicas de regulación del sistema nervioso autónomo —respiración diafragmática,
activación física breve, reducción de estimulación digital— tienen efecto demostrado
sobre síntomas leves de ansiedad (Hofmann et al., 2010, Cognitive Therapy and Research).

## Hábitos recomendados
1. **Respiración 4-7-8** (bajo esfuerzo): inhalar 4s, retener 7s, exhalar 8s — 3 ciclos.
   Activar el sistema parasimpático en menos de 2 minutos.
2. **Límite de noticias** (bajo esfuerzo): máximo 10 minutos de noticias por día durante 2 semanas.
3. **Movimiento físico corto** (medio esfuerzo): 15 minutos de caminata reduce el cortisol
   de forma measurable (Lancastle & Rodham, 2008).

## Intervenciones en el momento
- Sugerir pausa de respiración cuando se detectan sesiones largas de scroll nocturno.

## Cuándo recomendar ayuda profesional
Con GAD-7 >= 10 o si los síntomas afectan trabajo o relaciones durante más de 2 semanas.

## Lenguaje aprobado
✅ "Noto algunas señales de estrés en tus patrones. Hay técnicas sencillas que pueden ayudar."
❌ "Tienes ansiedad." / "Estás ansioso/a."
```

**Archivo:** `playbooks/processed/focus-session-intro.md`

```markdown
---
slug: focus-session-intro
signal_type: onboarding
activates_when: focus_sessions_count == 0
crisis_escalation: false
---

## Señales que activan este playbook
- El usuario nunca ha iniciado una Focus Session en Kairós

## Qué dice la evidencia
Las sesiones de enfoque con temporizador (técnica Pomodoro y variantes) mejoran
la productividad y reducen la sensación de sobrecarga cognitiva (Cirillo, 2009).
La fricción reducida para iniciar —saber exactamente qué hacer— es el predictor
más fuerte de adherencia al hábito (Fogg, 2020, Tiny Habits).

## Hábitos recomendados
1. **Primera Focus Session de 25 minutos**: elegir una sola tarea, poner el temporizador,
   teléfono fuera del escritorio. Kairós registra el tiempo enfocado.
2. **Ritual de inicio**: mismo lugar, misma bebida, misma música (si aplica) — los rituales
   reducen la resistencia de inicio.

## Intervenciones en el momento
- Explicar qué es una Focus Session y ofrecer iniciar una ahora mismo.
- Celebrar la primera sesión completada con mensaje de refuerzo.

## Lenguaje aprobado
✅ "¿Quieres probar tu primera Focus Session? Son 25 minutos de trabajo sin interrupciones digitales."
❌ "Deberías ser más productivo/a."
```

---

### Tarea 0.3 — Crear función SQL match_playbook_chunks en Supabase (5 min)

Ejecutar en **Supabase Dashboard → SQL Editor**:

```sql
-- Función para búsqueda semántica de playbooks via pgvector
CREATE OR REPLACE FUNCTION match_playbook_chunks(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.4,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  playbook_id uuid,
  chunk_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.playbook_id,
    pc.chunk_text,
    1 - (pc.embedding <=> query_embedding) AS similarity
  FROM playbook_chunks pc
  WHERE 1 - (pc.embedding <=> query_embedding) > match_threshold
  ORDER BY pc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**Verificar:** la función aparece en Supabase → Database → Functions.

---

### Tarea 0.4 — Ejecutar embed_playbooks.py (15 min — descarga modelo 90MB primera vez)

```bash
cd C:\Users\Windows\Desktop\proyectos\hackathon_Barranqui-IA

# Instalar sentence-transformers si no está
pip install sentence-transformers

# Ejecutar el script de embedding
python playbooks/scripts/embed_playbooks.py
```

**Esperado:**
```
🔍 Buscando playbooks...
   Encontrados: 8 archivos

📄 Procesando: attention-fragmentation
   ✅ 4 chunks embebidos

📄 Procesando: momentum-builder
   ✅ 3 chunks embebidos
...
✨ Todos los playbooks embebidos exitosamente.
```

**Verificar en Supabase:**
```sql
SELECT count(*) FROM playbook_chunks;
-- Debe ser > 0 (aprox 25-40 chunks totales)

SELECT p.slug, count(pc.id) as chunks
FROM playbooks p
JOIN playbook_chunks pc ON pc.playbook_id = p.id
GROUP BY p.slug;
```

---

### Tarea 0.5 — Seed ml_results para demo (5 min)

Ejecutar en **Supabase SQL Editor** (reemplazar con UUID real del usuario demo):

```sql
-- Ver usuarios disponibles:
-- SELECT id, email FROM auth.users;

INSERT INTO ml_results (user_id, model_type, result) VALUES
(
  '3942cae8-4150-44d8-907e-b6fbfb300c4f',
  'xgboost',
  '{
    "attention_fragmentation_score": 0.72,
    "nocturnal_pattern_score": 0.48,
    "doomscrolling_score": 0.65,
    "low_mood_indicator_score": 0.0,
    "anxiety_indicator_score": 0.0
  }'
),
(
  '3942cae8-4150-44d8-907e-b6fbfb300c4f',
  'isolation_forest',
  '{
    "anomaly_flag": false,
    "severity": 0.15
  }'
);
```

Con `attention_fragmentation_score = 0.72 > 0.60` el triaje activará `attention-fragmentation`
y el agente recuperará el playbook real del RAG.

**Verificar:**
```bash
# Llamar directamente al triage:
curl -X POST http://localhost:8001/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_REAL" \
  -d '{"message": "¿Cómo estoy?"}'
# La respuesta debe mencionar "fragmentación de atención" o "cambios de pestaña"
```

---

## FASE 1 — Extension funcional en Chrome (2 horas) 🟠 ALTA PRIORIDAD

Sin esto la extensión no puede cargarse en Chrome ni sincronizar datos.

### Tarea 1.1 — manifest.json y package.json

**Archivo:** `extension/manifest.json`

```json
{
  "manifest_version": 3,
  "name": "Kairós — Bienestar Digital",
  "version": "0.1.0",
  "description": "Rastreador de hábitos digitales para Kairós",
  "permissions": [
    "tabs",
    "storage",
    "idle",
    "scripting",
    "activeTab"
  ],
  "host_permissions": [
    "http://localhost:8000/*",
    "<all_urls>"
  ],
  "background": {
    "service_worker": "dist/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["dist/content.js"],
      "run_at": "document_end"
    }
  ],
  "action": {
    "default_popup": "popup/index.html",
    "default_title": "Kairós"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

**Archivo:** `extension/package.json`

```json
{
  "name": "kairos-extension",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development --watch"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.260",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "ts-loader": "^9.5.0",
    "typescript": "^5.4.0",
    "webpack": "^5.91.0",
    "webpack-cli": "^5.1.0"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  }
}
```

**Archivo:** `extension/webpack.config.js`

```javascript
const path = require("path");

module.exports = {
  entry: {
    background: "./src/background/index.ts",
    content: "./src/content-scripts/scroll-detector.ts",
    popup: "./src/popup/index.tsx",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
};
```

**Archivo:** `extension/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "bundler",
    "lib": ["ES2020"],
    "strict": true,
    "outDir": "dist",
    "esModuleInterop": true,
    "jsx": "react"
  },
  "include": ["src/**/*"]
}
```

### Tarea 1.2 — Popup mini-dashboard

**Archivo:** `extension/src/popup/index.html`

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { width: 300px; padding: 16px; font-family: system-ui; background: #0f172a; color: #f1f5f9; }
    h1 { font-size: 18px; margin: 0 0 12px; color: #818cf8; }
    .stat { display: flex; justify-content: space-between; margin: 8px 0; }
    .label { color: #94a3b8; font-size: 13px; }
    .value { font-weight: 600; font-size: 13px; }
    .btn { width: 100%; padding: 8px; background: #6366f1; color: white; border: none;
           border-radius: 6px; cursor: pointer; margin-top: 12px; font-size: 13px; }
    .btn:hover { background: #4f46e5; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="../dist/popup.js"></script>
</body>
</html>
```

**Archivo:** `extension/src/popup/Popup.tsx`

```tsx
import React, { useEffect, useState } from "react";

interface Stats {
  todayMinutes: number;
  topDomain: string;
  syncStatus: string;
}

export function Popup() {
  const [stats, setStats] = useState<Stats>({
    todayMinutes: 0,
    topDomain: "—",
    syncStatus: "Cargando...",
  });

  useEffect(() => {
    chrome.storage.local.get(["kairos_buffer", "kairos_last_sync"], (data) => {
      const buffer: any[] = data.kairos_buffer || [];
      const lastSync: string = data.kairos_last_sync || "";

      const domainMap: Record<string, number> = {};
      let totalSeconds = 0;

      buffer.forEach((ev) => {
        domainMap[ev.domain] = (domainMap[ev.domain] || 0) + ev.duration_seconds;
        totalSeconds += ev.duration_seconds;
      });

      const top = Object.entries(domainMap).sort((a, b) => b[1] - a[1])[0];

      setStats({
        todayMinutes: Math.round(totalSeconds / 60),
        topDomain: top ? top[0] : "—",
        syncStatus: lastSync
          ? `Último sync: ${new Date(lastSync).toLocaleTimeString("es-CO")}`
          : "Sin sincronizar aún",
      });
    });
  }, []);

  const openDashboard = () => {
    chrome.tabs.create({ url: "http://localhost:3000/dashboard" });
  };

  return (
    <div>
      <h1>Kairós</h1>
      <div className="stat">
        <span className="label">Uso hoy</span>
        <span className="value">{stats.todayMinutes} min</span>
      </div>
      <div className="stat">
        <span className="label">Sitio principal</span>
        <span className="value">{stats.topDomain}</span>
      </div>
      <div className="stat">
        <span className="label">Sync</span>
        <span className="value" style={{ fontSize: 11 }}>{stats.syncStatus}</span>
      </div>
      <button className="btn" onClick={openDashboard}>
        Ver dashboard completo →
      </button>
    </div>
  );
}
```

**Archivo:** `extension/src/popup/index.tsx`

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { Popup } from "./Popup";

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<Popup />);
```

### Tarea 1.3 — Build y cargar en Chrome

```bash
cd extension
npm install
npm run build

# Verificar que dist/ tiene: background.js, content.js, popup.js
ls dist/
```

**Cargar en Chrome:**
1. Abrir `chrome://extensions`
2. Activar "Modo desarrollador" (toggle arriba a la derecha)
3. Click "Cargar descomprimida"
4. Seleccionar la carpeta `extension/`
5. Verificar que aparece "Kairós — Bienestar Digital" sin errores

**Verificar que sincroniza:**
1. Navegar por 2-3 sitios web durante 2-3 minutos
2. Click en el icono de la extensión → ver minutos acumulados
3. Después de 5 minutos: verificar en Supabase Table Editor → `usage_events` → debe tener filas nuevas

---

## FASE 2 — Web completo (2 horas) 🟡 MEDIA PRIORIDAD

### Tarea 2.1 — Página de reportes semanales

**Archivo:** `web/app/reports/page.tsx`

```tsx
"use client";
import { useState, useEffect } from "react";
import { agentTrigger } from "@/lib/agent";

export default function ReportsPage() {
  const [report, setReport] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const data = await agentTrigger("weekly_report");
      setReport(data.report);
    } catch (e) {
      setReport("Error al generar el reporte. Verifica que el agente esté corriendo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Reporte semanal</h1>
      <p className="text-muted-foreground mb-6">
        Tu resumen de bienestar digital narrado por Kairós.
      </p>
      <button
        onClick={generateReport}
        disabled={loading}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 mb-6"
      >
        {loading ? "Generando..." : "Generar reporte"}
      </button>
      {report && (
        <div className="prose prose-invert max-w-none bg-slate-800/50 rounded-xl p-6 whitespace-pre-wrap text-sm leading-relaxed">
          {report}
        </div>
      )}
    </div>
  );
}
```

**Agregar al nav** (`web/components/nav.tsx` o equivalente): enlace a `/reports`.

### Tarea 2.2 — Gráfico de uso en dashboard

Agregar a `web/app/dashboard/page.tsx` un gráfico de barras simple con los `top_domains`.
Usar la librería `recharts` (ya popular en proyectos Next.js):

```bash
cd web
npm install recharts
```

```tsx
// Dentro de DashboardPage, después de obtener dashboardData:
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// En el JSX:
<div className="bg-slate-800/50 rounded-xl p-4">
  <h3 className="text-sm font-medium mb-4">Uso por sitio (hoy)</h3>
  <ResponsiveContainer width="100%" height={200}>
    <BarChart data={dashboardData.top_domains}>
      <XAxis dataKey="domain" tick={{ fontSize: 11 }} />
      <YAxis tick={{ fontSize: 11 }} />
      <Tooltip />
      <Bar dataKey="minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
</div>
```

### Tarea 2.3 — Onboarding redirect tras completar GAD-7

Verificar que `web/app/onboarding/gad7/page.tsx` hace `router.push("/dashboard")` después
de enviar el formulario. Si no lo hace, agregar el redirect.

---

## FASE 3 — ML Worker (3 horas) 🔵 NICE TO HAVE para demo avanzada

El cold start devuelve scores 0.0 — suficiente para el demo básico con el seed del Tarea 0.5.
El ml-worker es necesario para scores reales en producción.

### Tarea 3.1 — Estructura del ml-worker

```
ml-worker/
├── requirements.txt
├── main.py                  # Entry: inicializa Celery + schedule
├── tasks/
│   ├── __init__.py
│   ├── feature_extraction.py    # usage_events → daily_features
│   └── inference.py             # daily_features → ml_results
└── models/
    ├── __init__.py
    ├── anomaly.py               # Isolation Forest
    └── scoring.py               # XGBoost simplificado
```

**`ml-worker/requirements.txt`:**
```
celery==5.3.6
redis==5.0.1
scikit-learn==1.5.0
pandas==2.2.0
numpy==1.26.0
supabase==2.9.0
python-dotenv==1.0.0
```

### Tarea 3.2 — Feature extraction

**`ml-worker/tasks/feature_extraction.py`:**

```python
import pandas as pd
from datetime import date, timedelta
from database import supabase

def compute_daily_features(user_id: str, target_date: str = None) -> dict:
    """
    Agrega usage_events de un día en features para los modelos ML.
    Guarda resultado en daily_features table.
    """
    if target_date is None:
        target_date = (date.today() - timedelta(days=1)).isoformat()

    next_day = (date.fromisoformat(target_date) + timedelta(days=1)).isoformat()

    events_res = supabase.table("usage_events") \
        .select("domain, duration_seconds, event_type, scroll_speed, timestamp") \
        .eq("user_id", user_id) \
        .gte("timestamp", target_date) \
        .lt("timestamp", next_day) \
        .execute()

    if not events_res.data:
        return {}

    df = pd.DataFrame(events_res.data)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["hour"] = df["timestamp"].dt.hour

    total_seconds = df["duration_seconds"].sum()
    nocturnal_seconds = df[df["hour"].between(22, 23) | df["hour"].between(0, 6)]["duration_seconds"].sum()
    session_count = len(df[df["event_type"] == "tab_active"])
    avg_scroll_speed = df["scroll_speed"].dropna().mean() or 0.0
    unique_domains = df["domain"].nunique()

    features = {
        "total_usage_min": total_seconds / 60,
        "nocturnal_ratio": nocturnal_seconds / max(total_seconds, 1),
        "session_count": session_count,
        "avg_scroll_speed": float(avg_scroll_speed),
        "unique_domains": unique_domains,
        "app_switches_per_hour": session_count / max(total_seconds / 3600, 1),
    }

    supabase.table("daily_features").upsert({
        "user_id": user_id,
        "date": target_date,
        "features": features,
    }, on_conflict="user_id,date").execute()

    return features
```

### Tarea 3.3 — Isolation Forest + XGBoost simplificado

**`ml-worker/models/anomaly.py`:**

```python
import numpy as np
from sklearn.ensemble import IsolationForest
import json

# Modelo global pre-entrenado con datos sintéticos (cold start)
_GLOBAL_MODEL = None

def _get_global_model() -> IsolationForest:
    global _GLOBAL_MODEL
    if _GLOBAL_MODEL is None:
        rng = np.random.RandomState(42)
        # Datos sintéticos: distribución normal de usuario típico
        X_train = rng.randn(500, 6)
        X_train[:, 0] = X_train[:, 0] * 60 + 120   # total_usage_min ~120
        X_train[:, 1] = np.abs(X_train[:, 1]) * 0.1  # nocturnal_ratio ~0.1
        X_train[:, 2] = np.abs(X_train[:, 2]) * 10 + 20  # session_count ~20
        _GLOBAL_MODEL = IsolationForest(contamination=0.05, random_state=42)
        _GLOBAL_MODEL.fit(X_train)
    return _GLOBAL_MODEL

def run_anomaly_detection(features: dict) -> dict:
    model = _get_global_model()
    X = np.array([[
        features.get("total_usage_min", 0),
        features.get("nocturnal_ratio", 0),
        features.get("session_count", 0),
        features.get("avg_scroll_speed", 0),
        features.get("unique_domains", 0),
        features.get("app_switches_per_hour", 0),
    ]])
    score = model.decision_function(X)[0]
    is_anomaly = model.predict(X)[0] == -1
    severity = max(0.0, min(1.0, -score))

    return {
        "anomaly_flag": bool(is_anomaly),
        "severity": float(severity),
    }
```

**`ml-worker/models/scoring.py`:**

```python
import numpy as np

# Scoring basado en reglas + heurísticas hasta tener datos reales de TILES-2018
# XGBoost real se entrena en Fase 2 con labels PHQ-9/GAD-7 reales

def compute_xgboost_scores(features: dict) -> dict:
    nocturnal = features.get("nocturnal_ratio", 0)
    scroll_speed = features.get("avg_scroll_speed", 0)
    switches = features.get("app_switches_per_hour", 0)
    total_min = features.get("total_usage_min", 0)

    # Doomscrolling: scroll rápido + uso alto
    doomscrolling = min(1.0, (scroll_speed / 600) * 0.6 + (total_min / 240) * 0.4)

    # Nocturnal: ratio de uso nocturno
    nocturnal_score = min(1.0, nocturnal * 2.5)

    # Attention fragmentation: switches por hora
    attention = min(1.0, switches / 40)

    return {
        "attention_fragmentation_score": round(float(attention), 3),
        "nocturnal_pattern_score": round(float(nocturnal_score), 3),
        "doomscrolling_score": round(float(doomscrolling), 3),
        "low_mood_indicator_score": 0.0,   # requiere labels PHQ-9 reales
        "anxiety_indicator_score": 0.0,    # requiere labels GAD-7 reales
    }
```

### Tarea 3.4 — Inference task y wiring

**`ml-worker/tasks/inference.py`:**

```python
from database import supabase
from tasks.feature_extraction import compute_daily_features
from models.anomaly import run_anomaly_detection
from models.scoring import compute_xgboost_scores

def run_all_models(user_id: str, target_date: str = None) -> None:
    features = compute_daily_features(user_id, target_date)
    if not features:
        return

    anomaly = run_anomaly_detection(features)
    xgb_scores = compute_xgboost_scores(features)

    supabase.table("ml_results").insert({
        "user_id": user_id,
        "model_type": "isolation_forest",
        "result": anomaly,
    }).execute()

    supabase.table("ml_results").insert({
        "user_id": user_id,
        "model_type": "xgboost",
        "result": xgb_scores,
    }).execute()
```

**Para correr manualmente (sin Celery, útil para demo):**

```bash
cd ml-worker
pip install -r requirements.txt

python -c "
from tasks.inference import run_all_models
run_all_models('3942cae8-4150-44d8-907e-b6fbfb300c4f')
print('ML scores escritos en Supabase')
"
```

---

## FASE 4 — Demo completa E2E (30 min) 🟢 FINAL

### Tarea 4.1 — Checklist de arranque de servicios

```bash
# Terminal 1 — api-service
cd api-service
uvicorn main:app --reload --port 8000

# Terminal 2 — agent-service
cd agent-service
uvicorn main:app --reload --port 8001

# Terminal 3 — web
cd web
npm run dev

# Verificar health de cada servicio:
curl http://localhost:8000/health  # {"status":"ok","service":"api-service"}
curl http://localhost:8001/health  # {"status":"ok","service":"agent-service"}
# http://localhost:3000 debe cargar
```

### Tarea 4.2 — Flujo E2E del demo

```
1. Abrir http://localhost:3000
2. Login con usuario demo (jgomez@sequal.com.co o el que esté creado)
3. Si redirige a /onboarding:
   - Completar PHQ-9 (respuestas de ejemplo: 2,1,0,1,1,0,1,1,0 → score 7)
   - Completar GAD-7 (respuestas: 1,1,2,1,0,1,1 → score 7)
4. Ver el dashboard → debe mostrar métricas
5. Abrir /chat → escribir "¿Cómo estoy usando mi tiempo digital?"
   - El agente debe responder mencionando fragmentación de atención (del seed ml_results)
   - La respuesta debe citar evidencia real (del RAG)
6. Ir a /habits → crear un hábito nuevo
7. Marcar el hábito como completado → ver racha = 1
8. Ir a /reports → generar reporte semanal
9. Navegar por 3 sitios web → verificar que la extensión captura datos
10. Volver al dashboard → los datos de la extensión deben aparecer en top_domains
```

### Tarea 4.3 — Datos demo pre-cargados

Para una presentación fluida, insertar estos datos de demo antes de presentar:

```sql
-- Datos de uso de los últimos 7 días (para el dashboard)
INSERT INTO usage_events (user_id, domain, duration_seconds, event_type, scroll_speed, timestamp) VALUES
('3942cae8-4150-44d8-907e-b6fbfb300c4f', 'youtube.com', 2700, 'tab_active', 120.0, NOW() - INTERVAL '1 day'),
('3942cae8-4150-44d8-907e-b6fbfb300c4f', 'instagram.com', 1800, 'tab_active', 580.0, NOW() - INTERVAL '1 day'),
('3942cae8-4150-44d8-907e-b6fbfb300c4f', 'twitter.com', 1200, 'tab_active', 620.0, NOW() - INTERVAL '2 days'),
('3942cae8-4150-44d8-907e-b6fbfb300c4f', 'youtube.com', 3600, 'tab_active', 90.0, NOW() - INTERVAL '2 days'),
('3942cae8-4150-44d8-907e-b6fbfb300c4f', 'reddit.com', 900, 'tab_active', 450.0, NOW() - INTERVAL '3 days'),
('3942cae8-4150-44d8-907e-b6fbfb300c4f', 'instagram.com', 2400, 'tab_active', 600.0, NOW() - INTERVAL '3 days');

-- Hábito con racha activa
INSERT INTO habits (user_id, name, playbook_slug, frequency, active)
VALUES ('3942cae8-4150-44d8-907e-b6fbfb300c4f', 'Sin teléfono la primera hora', 'attention-fragmentation', 'daily', true)
RETURNING id;
-- Tomar el id del RETURNING y usarlo abajo:

-- (Reemplazar HABIT_UUID con el id obtenido)
-- INSERT INTO streaks (habit_id, user_id, current_streak, longest_streak, last_completion)
-- VALUES ('HABIT_UUID', '3942cae8-4150-44d8-907e-b6fbfb300c4f', 3, 5, CURRENT_DATE - INTERVAL '1 day');
```

---

## Resumen de prioridades

| Fase | Tiempo estimado | Resultado |
|---|---|---|
| **Fase 0** — RAG + playbooks + seed ML | 35 min | Agente responde con evidencia real |
| **Fase 1** — Extension funcional en Chrome | 2h | Demo con datos reales de navegación |
| **Fase 2** — Web completo (reports + charts) | 2h | Demo visualmente completa |
| **Fase 3** — ML Worker | 3h | Scores calculados automáticamente |
| **Fase 4** — Demo E2E | 30 min | Presentación fluida sin fricción |

**Mínimo viable para demo convincente:** Fase 0 completa + Fase 1 completa + seed datos Fase 4.  
**Demo completa de hackathon:** Fases 0, 1, 2, 4.  
**Producción real:** todas las fases incluida la 3.

---

## Branches recomendadas

```bash
# Fase 0 (RAG + playbooks)
git checkout -b feat/ai/phase-0-rag-playbooks

# Fase 1 (Extension)
git checkout -b feat/ext/phase-1-manifest-popup

# Fase 2 (Web)
git checkout -b feat/web/phase-2-reports-charts

# Fase 3 (ML Worker)
git checkout -b feat/ml/phase-3-worker

# Integración final
# PRs de cada branch → dev → main para demo
```

---

*Plan generado 2026-05-23 — basado en gap analysis del estado actual vs. spec de diseño.*
