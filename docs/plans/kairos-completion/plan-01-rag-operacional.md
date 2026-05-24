# PLAN-01 — RAG Operacional: SQL + Embeddings + Seed Demo

**Área:** RAG / Supabase / Datos  
**Branch:** `feat/ai/plan-01-rag-operacional`  
**Tiempo estimado:** 30 minutos  
**Criticidad:** 🔴 BLOQUEANTE — sin esto el agente responde sin contexto real  
**Owner:** AI Engineer (Juan Gomez)

---

## Goal

Activar el sistema RAG que ya está implementado en código pero sin datos. La tabla
`playbook_chunks` está vacía y la función SQL `match_playbook_chunks` no existe.
El agente recupera `[]` en cada búsqueda semántica y no puede citar evidencia.

---

## Contexto técnico

- `agent-service/rag/retriever.py` llama a `supabase.rpc("match_playbook_chunks", ...)` — la función no existe
- `playbooks/scripts/embed_playbooks.py` ya está escrito y listo para ejecutar
- Los 9 playbooks en `playbooks/processed/` están completos
- `agent-service/rag/embedder.py` usa `all-MiniLM-L6-v2` (384 dims)

---

## Pasos de implementación

### Paso 1 — Crear la función SQL en Supabase (5 min)

Ejecutar en **Supabase Dashboard → SQL Editor**:

```sql
-- Función de búsqueda semántica de playbooks
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

**Verificación Paso 1:**
```sql
-- Debe aparecer en la lista de funciones
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'match_playbook_chunks';
-- Resultado esperado: 1 fila con 'match_playbook_chunks'
```

---

### Paso 2 — Instalar dependencias y ejecutar embed_playbooks.py (15 min)

```bash
# Desde la raíz del repo
cd agent-service
pip install sentence-transformers  # descarga modelo ~90MB primera vez

# Configurar variables de entorno si no están
# SUPABASE_URL y SUPABASE_ANON_KEY deben estar en .env o exportadas

# Ejecutar desde la raíz del repo (el script resuelve paths relativos)
cd ..
python playbooks/scripts/embed_playbooks.py
```

**Salida esperada:**
```
Searching for playbooks...
Found: 9 files

Processing: anxiety-indicators
  3 chunks embedded

Processing: attention-fragmentation
  4 chunks embedded

Processing: crisis-escalation
  2 chunks embedded

Processing: doomscrolling
  3 chunks embedded

Processing: focus-session-intro
  2 chunks embedded

Processing: habit-relapse-risk
  3 chunks embedded

Processing: low-mood-indicators
  3 chunks embedded

Processing: momentum-builder
  3 chunks embedded

Processing: nocturnal-use-pattern
  3 chunks embedded

All playbooks embedded successfully.
```

**Verificación Paso 2:**
```sql
-- En Supabase SQL Editor:
SELECT count(*) FROM playbook_chunks;
-- Esperado: entre 25 y 35 chunks

SELECT p.slug, count(pc.id) as chunks
FROM playbooks p
JOIN playbook_chunks pc ON pc.playbook_id = p.id
GROUP BY p.slug
ORDER BY p.slug;
-- Esperado: 9 filas, cada una con ≥2 chunks
```

---

### Paso 3 — Seed ml_results para demo (5 min)

Sin este seed, el triaje devuelve todos los scores en 0.0 y el agente no activa
ningún playbook. Insertar scores realistas para el usuario demo.

Primero obtener el user_id del usuario demo:
```sql
-- En Supabase → Authentication → Users, copiar el UUID
-- O desde SQL:
SELECT id, email FROM auth.users LIMIT 5;
```

Luego insertar con el UUID real (reemplazar `USER_UUID_AQUI`):
```sql
-- Scores que activan attention-fragmentation (score > 0.60)
INSERT INTO ml_results (user_id, model_type, result) VALUES
(
  'USER_UUID_AQUI',
  'xgboost_mood',
  '{
    "attention_fragmentation_score": 0.72,
    "nocturnal_pattern_score": 0.48,
    "doomscrolling_score": 0.65,
    "low_mood_indicator_score": 0.0,
    "anxiety_indicator_score": 0.0,
    "predicted_phq9_change": -0.8,
    "direction": "decrease",
    "confidence": 0.71,
    "risk_window_days": 7
  }'
),
(
  'USER_UUID_AQUI',
  'isolation_forest',
  '{
    "anomaly_score": -0.12,
    "is_anomaly": false,
    "risk_level": "low",
    "flagged_features": []
  }'
);

-- Seed usage_events para el dashboard (últimos 7 días)
INSERT INTO usage_events (user_id, domain, duration_seconds, event_type, scroll_speed, source, timestamp) VALUES
('USER_UUID_AQUI', 'youtube.com',   2700, 'tab_active', 120.0, 'extension', NOW() - INTERVAL '1 day'),
('USER_UUID_AQUI', 'instagram.com', 1800, 'tab_active', 580.0, 'extension', NOW() - INTERVAL '1 day'),
('USER_UUID_AQUI', 'twitter.com',   1200, 'tab_active', 620.0, 'extension', NOW() - INTERVAL '2 days'),
('USER_UUID_AQUI', 'youtube.com',   3600, 'tab_active',  90.0, 'extension', NOW() - INTERVAL '2 days'),
('USER_UUID_AQUI', 'reddit.com',     900, 'tab_active', 450.0, 'extension', NOW() - INTERVAL '3 days'),
('USER_UUID_AQUI', 'instagram.com', 2400, 'tab_active', 600.0, 'extension', NOW() - INTERVAL '3 days');
```

**Verificación Paso 3:**
```sql
SELECT model_type, result->>'attention_fragmentation_score' as af_score
FROM ml_results
WHERE user_id = 'USER_UUID_AQUI'
ORDER BY computed_at DESC
LIMIT 5;
-- Debe mostrar xgboost_mood con af_score = '0.72'
```

---

### Paso 4 — Verificar que el agente recupera playbooks (5 min)

Con los servicios corriendo (`uvicorn main:app --port 8001`):

```bash
curl -X POST http://localhost:8001/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_REAL" \
  -d '{"message": "¿Cómo estoy usando mi tiempo digital?"}'
```

**Respuesta esperada contiene:**
- Mención de "fragmentación de atención" o "attention" (activado por score 0.72)
- Cita de evidencia de los playbooks (no texto genérico)
- NO incluye "diagnóstico" ni "tratamiento"

---

## Tests a ejecutar

```bash
# Test del retriever (ya existe, verifica la búsqueda semántica)
cd agent-service
python -m pytest tests/test_triage.py -v

# Test manual de búsqueda semántica desde Python:
python -c "
from rag.retriever import search_playbooks
results = search_playbooks('fragmentación de atención y uso excesivo de redes sociales', limit=3)
assert len(results) > 0, 'RAG vacío — ejecutar embed_playbooks.py primero'
print(f'OK: {len(results)} chunks recuperados')
for r in results:
    print(f'  [{r[\"similarity\"]:.3f}] {r[\"chunk_text\"][:80]}...')
"
```

---

## Definition of Done

- [ ] `match_playbook_chunks` existe en Supabase Functions
- [ ] `SELECT count(*) FROM playbook_chunks` retorna ≥ 25
- [ ] `SELECT count(*) FROM playbooks` retorna 9
- [ ] Búsqueda semántica retorna resultados relevantes para "doomscrolling"
- [ ] ml_results tiene filas para el usuario demo
- [ ] Chat con el agente activa el playbook `attention-fragmentation`
- [ ] `python -m pytest tests/test_triage.py` pasa sin errores

---

## Rollback

Si el embedding falla (modelo no descarga):
```bash
# Verificar conexión
curl -I https://huggingface.co
# Si hay proxy, configurar:
export HF_HUB_DISABLE_TELEMETRY=1
```

Si la función SQL ya existe con schema diferente:
```sql
DROP FUNCTION IF EXISTS match_playbook_chunks;
-- Luego recrear con el script del Paso 1
```
