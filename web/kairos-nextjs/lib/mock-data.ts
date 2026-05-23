export const MOCK_DASHBOARD = {
  today_usage_min: 142,
  top_domains: [
    { domain: "youtube.com", minutes: 45 },
    { domain: "instagram.com", minutes: 32 },
    { domain: "tiktok.com", minutes: 28 },
    { domain: "twitter.com", minutes: 18 },
    { domain: "reddit.com", minutes: 19 },
  ],
  active_habits: 4,
  total_habit_completions_today: 2,
  last_phq9_score: 9,
  last_gad7_score: 6,
  last_survey_date: "2026-05-23",
  onboarding_completed: true,
}

export const MOCK_WEEKLY_USAGE = [
  { day: "2026-05-17", label: "Sáb", minutes: 0 },
  { day: "2026-05-18", label: "Dom", minutes: 0 },
  { day: "2026-05-19", label: "Lun", minutes: 0 },
  { day: "2026-05-20", label: "Mar", minutes: 20 },
  { day: "2026-05-21", label: "Mié", minutes: 15 },
  { day: "2026-05-22", label: "Jue", minutes: 75 },
  { day: "2026-05-23", label: "Vie", minutes: 125 },
]

export const MOCK_HABITS = [
  { id: "1", name: "Sin teléfono la primera hora del día", frequency: "daily" as const, active: true, current_streak: 3, completed_today: false, playbook_slug: "attention-fragmentation" },
  { id: "2", name: "10 min de respiración consciente", frequency: "daily" as const, active: true, current_streak: 5, completed_today: true, playbook_slug: null },
  { id: "3", name: "Caminar al sol 15 min", frequency: "daily" as const, active: true, current_streak: 1, completed_today: false, playbook_slug: null },
  { id: "4", name: "Lectura sin pantallas antes de dormir", frequency: "daily" as const, active: true, current_streak: 2, completed_today: true, playbook_slug: null },
]

export const MOCK_AGENT_REPLY = {
  reply: "Entiendo. Los últimos 3 días usaste el teléfono después de las 23:00 más de 45 min. Eso suele empujar el sueño hacia atrás. ¿Te parece si esta noche dejas el teléfono fuera del cuarto a partir de las 22:30?",
  playbook_activated: "nocturnal-use-pattern" as string | null,
  suggested_habit: null as string | null,
}

export const MOCK_WEEKLY_REPORT = `## Resumen de la semana
Semana con uso digital moderado, con patrones nocturnos que afectan el descanso.

## Uso Digital
- **Total:** 235 min (3.9h en 7 días)
- **Top dominio:** youtube.com (45 min hoy)
- **Tendencia:** Aumento los últimos 2 días

## Estado de Ánimo
- PHQ-9: 9 → Leve, estable respecto a semana anterior
- GAD-7: 6 → Leve, sin cambios significativos

## Hábitos
- 2/4 completados hoy
- Mejor racha: "10 min de respiración" con 5 días seguidos ✨

## Para la próxima semana
Considera poner el teléfono en modo silencio desde las 22:00. Tu uso nocturno es el patrón con más impacto en tu calidad de sueño.`
