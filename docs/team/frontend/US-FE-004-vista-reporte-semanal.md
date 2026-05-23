# US-FE-004 — Vista del reporte semanal

> ❌ **NO IMPLEMENTADO** — La página `/report` no existe aún. US-AI-003 ya está en `dev` — puedes comenzar esta historia. Ver plan maestro: `docs/plans/2026-05-23-implementacion-pendiente.md`

**Asignado a:** Frontend  
**Prioridad:** Media  
**Estimación:** 2 puntos  
**Rama:** `feat/fe/US-FE-004-reporte-semanal`  
**Depende de:** US-AI-003 ✅ (ya en `dev`)  
**Estado:** ❌ No iniciada

---

## Historia de usuario

> Como usuario, quiero poder ver mi reporte semanal generado por Kairós en una página dedicada, con el contenido formateado y un botón para generarlo bajo demanda.

---

## Archivos a modificar

| Archivo | Acción |
|---|---|
| `web/app/report/page.tsx` | Crear página nueva |
| `web/components/nav.tsx` | Agregar link "Reporte" en la nav |
| `web/lib/agent.ts` | Agregar `getWeeklyReport()` |

---

## Criterios de aceptación

- [ ] Ruta `/report` accesible desde la nav
- [ ] Botón "Generar reporte" → llama a `POST /api/v1/agent/trigger` con `weekly_report`
- [ ] El Markdown del reporte se renderiza con formato (headers, negritas, listas)
- [ ] Loading skeleton durante la generación (~5-10s)
- [ ] Si ya existe un reporte generado hoy, mostrarlo sin regenerar
- [ ] En mock mode: retorna un reporte de ejemplo

---

## Librería para Markdown

```bash
npm install react-markdown
```

```tsx
import ReactMarkdown from "react-markdown"

<ReactMarkdown className="prose prose-sm max-w-none">
  {reportText}
</ReactMarkdown>
```

---

## Mock report

```typescript
// web/lib/mock-data.ts
export const mockWeeklyReport = `## Resumen de la semana
Fue una semana con uso digital elevado, especialmente en las noches.

## Uso Digital
- **Total:** 847 minutos (14.1h)
- **Top dominio:** instagram.com (210 min)
- **vs semana anterior:** +12%

## Estado de Ánimo
- PHQ-9: 9 → estable respecto a la semana pasada
- GAD-7: 8 → ligera mejora (+1 punto)

## Hábitos
- ✅ Sin teléfono la primera hora: 5/7 días completado

## Para la próxima semana
Considera poner el teléfono en modo "no molestar" desde las 10pm. Tu uso nocturno representa el 38% del total.`
```

---

## Definition of Done

- [ ] Página `/report` creada con nav link
- [ ] Markdown renderizado correctamente
- [ ] Mock funcional
- [ ] PR → `dev` (esperar que US-AI-003 esté en `dev` antes de integrar con el agente real)
