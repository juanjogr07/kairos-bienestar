# US-FE-005 — Dashboard con Resultados ML Reales

**Owner:** Juan Camilo  
**Rama:** `feat/frontend/feature/US-FE-005-ml-results-dashboard`  
**Prioridad:** Alta — es el output visible del MVP  
**Estimado:** 4h

---

## Historia

Como usuario, quiero ver en el dashboard mis señales de triaje calculadas por ML (fragmentación de atención, doomscrolling, patrón nocturno) representadas visualmente, para entender el impacto de mi comportamiento digital.

---

## Criterios de Aceptación

- [ ] Dashboard consume el endpoint `GET /api/v1/dashboard` y muestra `triage_scores`
- [ ] 5 barras de progreso animadas con colores semáforo:
  - Verde (< umbral): atención, nocturno, doomscrolling, estado de ánimo, ansiedad
  - Amarillo (cerca del umbral ±10%)
  - Rojo (≥ umbral definido en `TRIAGE_THRESHOLDS`)
- [ ] Si `ml_results` vacíos → mostrar skeleton loading por 2s, luego estado "en análisis"
- [ ] `cluster_name` del usuario mostrado como chip: "Perfil: Moderado 📊"
- [ ] `anomaly_score` alto (> 0.75) muestra banner "Día atípico detectado"

## Thresholds de color (de `config.py`)

```
attention_fragmentation: 0.60 → rojo
nocturnal_pattern:        0.65 → rojo
doomscrolling:            0.70 → rojo
low_mood_indicator:       0.40 → rojo (PHQ-9 ≥ 5)
anxiety_indicator:        0.40 → rojo (GAD-7 ≥ 5)
```

## Contrato API

`GET /api/v1/dashboard` responde (campo ya implementado por API & Connections):
```json
{
  "triage_scores": {
    "attention_fragmentation": 0.42,
    "nocturnal_pattern": 0.71,
    "doomscrolling": 0.55,
    "low_mood_indicator": 0.30,
    "anxiety_indicator": 0.28,
    "model": "xgboost_global"
  },
  "cluster": { "cluster_name": "intensive", "cluster_label": 2 },
  "anomaly": { "anomaly_score": 0.33, "risk_level": "low" }
}
```

## Definition of Done

- Dashboard muestra barras animadas con datos mock cuando API no disponible
- Con datos reales: colores correctos según thresholds
- Responsive en mobile (375px)
- No rompe si `triage_scores` es null/undefined

## Archivos a crear/modificar

- `web/kairos-nextjs/app/dashboard/page.tsx` — agregar sección triage scores
- `web/kairos-nextjs/components/TriageScoreBar.tsx` — nuevo componente
