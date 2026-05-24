from datetime import date, timedelta

from database import supabase


def check_habit_reminders(user_id: str) -> None:
    habits = (
        supabase.table("habits")
        .select("*")
        .eq("user_id", user_id)
        .eq("active", True)
        .execute()
    )

    for habit in habits.data:
        streak = (
            supabase.table("streaks")
            .select("last_completion")
            .eq("habit_id", habit["id"])
            .execute()
        )
        if not streak.data:
            continue

        last = date.fromisoformat(streak.data[0]["last_completion"])
        days_since = (date.today() - last).days

        if days_since >= 2:
            existing = (
                supabase.table("notifications")
                .select("id")
                .eq("user_id", user_id)
                .eq("type", "habit_reminder")
                .gte("created_at", (date.today() - timedelta(days=1)).isoformat())
                .execute()
            )

            if not existing.data:
                try:
                    supabase.table("notifications").insert(
                        {
                            "user_id": user_id,
                            "type": "habit_reminder",
                            "title": "¿Cómo va tu hábito?",
                            "body": f"Llevas {days_since} días sin completar '{habit['name']}'",
                        }
                    ).execute()
                except Exception:
                    # unique constraint violation — already inserted by a concurrent task
                    pass
