# US-FE-003 — Flujo de completado de hábito con feedback visual

**Asignado a:** Frontend  
**Prioridad:** Media  
**Estimación:** 2 puntos  
**Rama:** `feat/fe/US-FE-003-habit-completion`

---

## Historia de usuario

> Como usuario, quiero que al marcar un hábito como completado vea una animación de celebración y la racha se actualice visualmente, para sentir motivación y refuerzo positivo.

---

## Archivos a modificar

| Archivo | Acción |
|---|---|
| `web/app/habits/page.tsx` | Mejorar estado de completado |
| `web/components/habit-card.tsx` | Crear componente nuevo |

---

## Criterios de aceptación

- [ ] Al hacer clic en "Marcar hecho": el botón cambia a ✅ "Completado hoy" (deshabilitado)
- [ ] La racha sube en 1 con animación de número (de 3 a 4 con un bounce)
- [ ] Si es múltiplo de 7 días: aparece banner "🎉 ¡Una semana seguida!"
- [ ] Estado persistido en sesión (no se resetea al recargar con mock)
- [ ] Error handling: si falla la API, mostrar toast "No se pudo registrar, intenta de nuevo"

---

## Librería para toast

```bash
# Ya disponible en shadcn/ui
npx shadcn@latest add toast
```

---

## Estructura sugerida del HabitCard

```tsx
// web/components/habit-card.tsx
interface HabitCardProps {
  habit: { id: string; name: string; streak: number; completed_today: boolean }
  onComplete: (id: string) => Promise<void>
}

export function HabitCard({ habit, onComplete }: HabitCardProps) {
  const [loading, setLoading] = useState(false)
  const [localStreak, setLocalStreak] = useState(habit.streak)
  const [completedToday, setCompletedToday] = useState(habit.completed_today)

  async function handleComplete() {
    setLoading(true)
    try {
      await onComplete(habit.id)
      setLocalStreak(s => s + 1)
      setCompletedToday(true)
    } catch {
      // mostrar toast de error
    } finally {
      setLoading(false)
    }
  }
  // ...
}
```

---

## Definition of Done

- [ ] Botón cambia de estado al completar
- [ ] Racha actualizada visualmente
- [ ] Toast de error si falla
- [ ] PR → `dev`
