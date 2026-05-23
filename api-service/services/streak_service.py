from datetime import date


def calculate_streak_update(streak: dict, completion_date: date) -> dict:
    """Calculate streak state after a habit completion.

    streak keys: current_streak, longest_streak, last_completion,
    grace_days_used, grace_days_allowed
    """
    if streak["last_completion"] is None:
        new_streak = 1
        return {
            **streak,
            "current_streak": new_streak,
            "longest_streak": max(new_streak, streak["longest_streak"]),
            "last_completion": completion_date,
            "broken": False,
            "used_grace_day": False,
        }

    gap = (completion_date - streak["last_completion"]).days

    if gap == 1:
        new_streak = streak["current_streak"] + 1
        used_grace = False
        broken = False
        grace_days_used = streak["grace_days_used"]
    elif gap == 2 and streak["grace_days_used"] < streak["grace_days_allowed"]:
        new_streak = streak["current_streak"] + 1
        used_grace = True
        broken = False
        grace_days_used = streak["grace_days_used"] + 1
    else:
        new_streak = 1
        used_grace = False
        broken = True
        grace_days_used = 0 if gap > 2 else streak["grace_days_used"]

    return {
        **streak,
        "current_streak": new_streak,
        "longest_streak": max(new_streak, streak["longest_streak"]),
        "grace_days_used": grace_days_used,
        "last_completion": completion_date,
        "broken": broken,
        "used_grace_day": used_grace,
    }
