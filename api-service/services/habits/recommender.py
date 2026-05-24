"""
Habit recommender — maps active playbook → concrete habit suggestions.

Uses the latest ml_results to determine the active playbook, then returns
habits not yet active for the user from the playbook's suggestion list.
"""
from typing import List

PLAYBOOK_HABIT_MAP: dict[str, list[dict]] = {
    "attention-fragmentation": [
        {"name": "Sin teléfono la primera hora", "playbook_slug": "attention-fragmentation"},
        {"name": "Modo No Molestar durante trabajo", "playbook_slug": "attention-fragmentation"},
        {"name": "Revisar notificaciones 3 veces al día", "playbook_slug": "attention-fragmentation"},
    ],
    "nocturnal-use-pattern": [
        {"name": "Sin pantallas 30 min antes de dormir", "playbook_slug": "nocturnal-use-pattern"},
        {"name": "Teléfono fuera del cuarto al dormir", "playbook_slug": "nocturnal-use-pattern"},
        {"name": "Alarma en reloj físico, no celular", "playbook_slug": "nocturnal-use-pattern"},
    ],
    "doomscrolling": [
        {"name": "Límite de 20 min de redes sociales/día", "playbook_slug": "doomscrolling"},
        {"name": "Grayscale activado en Instagram/TikTok", "playbook_slug": "doomscrolling"},
        {"name": "Leer 10 min en papel antes de dormir", "playbook_slug": "doomscrolling"},
    ],
    "low-mood-indicators": [
        {"name": "Diario de gratitud (1 cosa al día)", "playbook_slug": "low-mood-indicators"},
        {"name": "Caminata de 15 minutos al aire libre", "playbook_slug": "low-mood-indicators"},
        {"name": "Llamar a un amigo esta semana", "playbook_slug": "low-mood-indicators"},
    ],
    "anxiety-indicators": [
        {"name": "Respiración 4-7-8 al despertar", "playbook_slug": "anxiety-indicators"},
        {"name": "Límite de 10 min de noticias/día", "playbook_slug": "anxiety-indicators"},
        {"name": "Movimiento físico corto (15 min)", "playbook_slug": "anxiety-indicators"},
    ],
    "momentum-builder": [
        {"name": "Registro de logros del día", "playbook_slug": "momentum-builder"},
        {"name": "Mantener rutina que está funcionando", "playbook_slug": "momentum-builder"},
        {"name": "Reducción gradual de estímulos negativos", "playbook_slug": "momentum-builder"},
    ],
    "habit-relapse-risk": [
        {"name": "Revisar hábitos activos cada mañana", "playbook_slug": "habit-relapse-risk"},
        {"name": "Confiar en alguien sobre el hábito", "playbook_slug": "habit-relapse-risk"},
    ],
    "crisis-escalation": [],
    "focus-session-intro": [
        {"name": "Primera Focus Session de 25 minutos", "playbook_slug": "focus-session-intro"},
        {"name": "Ritual de inicio de trabajo concentrado", "playbook_slug": "focus-session-intro"},
    ],
}


def get_habit_recommendations(
    user_id: str,
    active_habit_slugs: list[str],
    playbook_slug: str | None,
    limit: int = 3,
) -> List[dict]:
    """
    Return habits the user doesn't already have active, from the active playbook.
    Falls back to attention-fragmentation suggestions if no playbook is active.
    """
    slug = playbook_slug or "attention-fragmentation"
    suggestions = PLAYBOOK_HABIT_MAP.get(slug, [])

    # Exclude habits the user already has by name match (case-insensitive)
    active_lower = {s.lower() for s in active_habit_slugs}
    filtered = [
        h for h in suggestions
        if h["playbook_slug"] not in active_lower
    ]

    return filtered[:limit]
