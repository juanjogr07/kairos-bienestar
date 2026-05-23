"""Exercise streak_service edge cases for debug session a5f2d0."""
from datetime import date, timedelta
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.streak_service import calculate_streak_update


def base_streak(**overrides):
    streak = {
        "current_streak": 5,
        "longest_streak": 10,
        "last_completion": date(2026, 5, 20),
        "grace_days_used": 0,
        "grace_days_allowed": 1,
    }
    streak.update(overrides)
    return streak


SCENARIOS = [
    ("first_completion", {"last_completion": None}, date(2026, 5, 23)),
    ("normal_gap_1", {}, date(2026, 5, 21)),
    ("grace_gap_2", {}, date(2026, 5, 22)),
    ("grace_exhausted_gap_2", {"grace_days_used": 1}, date(2026, 5, 22)),
    ("broken_gap_3", {"grace_days_used": 1}, date(2026, 5, 23)),
    ("same_day_gap_0", {}, date(2026, 5, 20)),
    ("future_gap_negative", {}, date(2026, 5, 19)),
]


def main() -> None:
    for name, overrides, completion_date in SCENARIOS:
        streak = base_streak(**overrides)
        result = calculate_streak_update(streak, completion_date)
        print(
            f"{name}: gap={(completion_date - streak['last_completion']).days if streak['last_completion'] else 'N/A'} "
            f"streak={result['current_streak']} broken={result['broken']} "
            f"grace_used={result['grace_days_used']} used_grace_day={result['used_grace_day']} "
            f"last_completion={result.get('last_completion')}"
        )


if __name__ == "__main__":
    main()
