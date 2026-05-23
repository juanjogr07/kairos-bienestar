from datetime import date, timedelta
from database import supabase

GRACE_DAYS_ALLOWED = 1


def calculate_streak_after_completion(user_id: str, habit_id: str) -> dict:
    today = date.today()

    streak_res = (
        supabase.table("streaks").select("*").eq("habit_id", habit_id).execute()
    )

    if not streak_res.data:
        supabase.table("streaks").insert(
            {
                "habit_id": habit_id,
                "user_id": user_id,
                "current_streak": 1,
                "longest_streak": 1,
                "last_completion": today.isoformat(),
                "grace_days_used": 0,
            }
        ).execute()
        return {"streak": 1, "message": "¡Primer día! El camino empieza aquí."}

    streak = streak_res.data[0]
    last = date.fromisoformat(streak["last_completion"]) if streak["last_completion"] else None

    if last == today:
        return {"streak": streak["current_streak"], "message": "Ya registraste este hábito hoy."}

    days_diff = (today - last).days if last else 999

    if days_diff == 1:
        new_streak = streak["current_streak"] + 1
        msg = f"¡{new_streak} días seguidos! Sigue así 💪"
    elif days_diff <= (GRACE_DAYS_ALLOWED + 1) and streak["grace_days_used"] < GRACE_DAYS_ALLOWED:
        new_streak = streak["current_streak"] + 1
        msg = f"Usaste un día de gracia. Racha: {new_streak} días."
        supabase.table("streaks").update(
            {"grace_days_used": streak["grace_days_used"] + 1}
        ).eq("habit_id", habit_id).execute()
    else:
        new_streak = 1
        msg = "Nuevo comienzo. Cada día es una oportunidad 🌱"
        supabase.table("streaks").update({"grace_days_used": 0}).eq(
            "habit_id", habit_id
        ).execute()

    longest = max(new_streak, streak["longest_streak"])
    supabase.table("streaks").update(
        {
            "current_streak": new_streak,
            "longest_streak": longest,
            "last_completion": today.isoformat(),
        }
    ).eq("habit_id", habit_id).execute()

    return {"streak": new_streak, "message": msg}
