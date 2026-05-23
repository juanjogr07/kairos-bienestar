export const mockDashboard = {
  today_usage_min: 142,
  top_domains: [
    { domain: "youtube.com", minutes: 45 },
    { domain: "instagram.com", minutes: 32 },
    { domain: "twitter.com", minutes: 18 },
  ],
  active_habits: 2,
  total_habit_completions_today: 1,
  last_phq9_score: 9,
  last_gad7_score: 8,
  last_survey_date: "2026-05-23",
  onboarding_completed: true,
}

export const mockHabits = [
  {
    id: "mock-habit-1",
    name: "Sin teléfono la primera hora",
    playbook_slug: "nocturnal-use-pattern",
    frequency: "daily",
    active: true,
    current_streak: 3,
    completed_today: false,
  },
]

export const mockAgentReply = {
  reply:
    "Basándome en tus datos de hoy, veo que pasaste 45 minutos en YouTube y 32 en Instagram. Noto un patrón de uso fragmentado por la tarde — ¿has sentido dificultad para concentrarte después de revisar redes sociales?",
  playbook_activated: "doomscrolling",
  suggested_habit: "Limitar YouTube a 30 minutos por día",
}
