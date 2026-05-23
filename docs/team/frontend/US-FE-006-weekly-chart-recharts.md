# US-FE-006 — Gráfica de Uso Semanal Interactiva (recharts)

**Owner:** Juan Camilo  
**Rama:** `feat/frontend/feature/US-FE-006-weekly-chart`  
**Prioridad:** Alta  
**Estimado:** 3h

---

## Historia

Como usuario, quiero ver una gráfica de barras interactiva con mi uso diario de las últimas 2 semanas, para identificar visualmente qué días tuve uso excesivo o patrones nocturnos.

---

## Criterios de Aceptación

- [ ] Gráfica recharts `BarChart` con 14 barras (últimos 14 días)
- [ ] Eje Y: minutos de uso total
- [ ] Tooltip al hover: `{fecha, total_min, nocturnal_min, cluster_name}`
- [ ] Días con `anomaly_score > 0.75` → barra color naranja/rojo con ícono ⚠
- [ ] Días nocturnos (nocturnal_ratio > 0.4) → barra con patrón rayado o color diferente
- [ ] Loading skeleton mientras carga datos
- [ ] Datos de `GET /api/v1/usage/weekly` (implementado por Salome en US-API-005)

## Datos mock para desarrollar sin API

```typescript
const MOCK_WEEKLY = Array.from({length: 14}, (_, i) => ({
  date: new Date(Date.now() - (13-i) * 86400000).toLocaleDateString('es-CO', {weekday:'short', day:'numeric'}),
  total_min: Math.round(120 + Math.random() * 300),
  nocturnal_min: Math.round(Math.random() * 80),
  anomaly_score: Math.random() * 0.6,
}))
```

## Definition of Done

- Gráfica visible en `/dashboard` debajo de triage scores
- Responsive: scroll horizontal en mobile si las barras no caben
- Transición de entrada animada (framer-motion o CSS)

## Archivos

- `web/kairos-nextjs/components/WeeklyUsageChart.tsx` — nuevo componente
- `web/kairos-nextjs/app/dashboard/page.tsx` — integrarlo
