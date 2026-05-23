# US-FE-001 — Dashboard con gráfico de uso semanal

> ⚠️ **PARCIAL — pendiente merge a dev** — Dashboard base existe en rama `juancamilovergara55/kai-5-setup-web-app` pero sin el gráfico recharts. El gráfico semanal (`weekly-chart.tsx`) aún no existe. Ver plan maestro: `docs/plans/2026-05-23-implementacion-pendiente.md`

**Asignado a:** Frontend  
**Prioridad:** Alta  
**Estimación:** 3 puntos  
**Rama:** `feat/fe/US-FE-001-dashboard-charts`  
**Estado:** ⚠️ Dashboard base en `juancamilovergara55/kai-5-setup-web-app` — gráfico semanal pendiente

---

## Historia de usuario

> Como usuario, quiero ver un gráfico de barras con mi uso digital de los últimos 7 días en el dashboard, para identificar visualmente qué días usé más el teléfono y si hay patrones nocturnos.

---

## Contexto técnico

El dashboard actual muestra datos del día de hoy únicamente. Esta historia agrega un gráfico de la semana usando los datos que ya existen en Supabase (tabla `usage_events`).

El endpoint `GET /api/v1/dashboard` retorna hoy. Para la semana necesitarás llamar a un endpoint nuevo que API-Connections creará (US-API-001). Mientras tanto, usa datos mock.

---

## Archivos a modificar

| Archivo | Acción |
|---|---|
| `web/app/dashboard/page.tsx` | Agregar sección de gráfico semanal |
| `web/components/weekly-chart.tsx` | Crear componente nuevo |
| `web/lib/api.ts` | Agregar `getWeeklyUsage()` con mock |
| `web/lib/mock-data.ts` | Agregar `mockWeeklyUsage` |

**NO tocar:** `web/middleware.ts`, `web/lib/supabase.ts`, nada fuera de `web/`

---

## Criterios de aceptación

- [ ] Gráfico de barras visible en `/dashboard` debajo de las 4 cards — **PENDIENTE: componente no existe**
- [ ] Muestra 7 días con minutos por día (eje X: lunes-domingo, eje Y: minutos)
- [ ] Barras coloreadas: verde ≤ 60 min, amarillo 61-120 min, rojo > 120 min
- [ ] En mobile (390px): gráfico horizontal scrolleable o reducido legible
- [ ] Loading skeleton mientras carga
- [ ] Con `USE_MOCK=true` usa datos mock (no llama a la API)

---

## Librería recomendada

Usa `recharts` (ya compatible con Next.js, sin SSR issues):

```bash
npm install recharts
```

```tsx
// web/components/weekly-chart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

interface DayUsage { day: string; minutes: number }

export function WeeklyChart({ data }: { data: DayUsage[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip formatter={(v) => [`${v} min`, "Uso"]} />
        <Bar dataKey="minutes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

---

## Mock data a agregar

```typescript
// web/lib/mock-data.ts
export const mockWeeklyUsage = [
  { day: "Lun", minutes: 45 },
  { day: "Mar", minutes: 120 },
  { day: "Mié", minutes: 89 },
  { day: "Jue", minutes: 200 },
  { day: "Vie", minutes: 145 },
  { day: "Sáb", minutes: 310 },
  { day: "Dom", minutes: 275 },
]
```

---

## Definition of Done

- [ ] Gráfico visible en `/dashboard` — **PENDIENTE: instalar recharts y crear weekly-chart.tsx**
- [ ] Responsive en mobile
- [ ] Sin errores en consola
- [ ] PR → `dev` (primero mergear la rama `juancamilovergara55/kai-5-setup-web-app` como base)
