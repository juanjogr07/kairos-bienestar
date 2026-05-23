from fastapi import APIRouter, Depends
from auth import get_current_user
from database import supabase
from services.streak_service import calculate_streak_update
from models.habits import HabitCreate, HabitOut
from typing import List
from datetime import date

DEFAULT_GRACE_DAYS_ALLOWED = 1

router = APIRouter(prefix="/api/v1", tags=["habits"])


@router.get("/habits", response_model=List[HabitOut])
async def list_habits(user_id: str = Depends(get_current_user)):
    habits_res = (
        supabase.table("habits")
        .select("id, name, playbook_slug, frequency, active")
        .eq("user_id", user_id)
        .eq("active", True)
        .execute()
    )

    result = []
    for h in habits_res.data:
        streak_res = (
            supabase.table("streaks")
            .select("current_streak, last_completion")
            .eq("habit_id", h["id"])
            .execute()
        )

        streak = streak_res.data[0] if streak_res.data else {"current_streak": 0, "last_completion": None}
        completed_today = streak.get("last_completion") == date.today().isoformat()

        result.append(
            HabitOut(
                id=h["id"],
                name=h["name"],
                playbook_slug=h.get("playbook_slug"),
                frequency=h["frequency"],
                active=h["active"],
                current_streak=streak["current_streak"],
                completed_today=completed_today,
            )
        )

    return result


@router.post("/habits", response_model=HabitOut)
async def create_habit(habit: HabitCreate, user_id: str = Depends(get_current_user)):
    res = (
        supabase.table("habits")
        .insert(
            {
                "user_id": user_id,
                "name": habit.name,
                "playbook_slug": habit.playbook_slug,
                "frequency": habit.frequency,
            }
        )
        .execute()
    )

    h = res.data[0]
    return HabitOut(
        id=h["id"],
        name=h["name"],
        playbook_slug=h.get("playbook_slug"),
        frequency=h["frequency"],
        active=True,
        current_streak=0,
        completed_today=False,
    )


def _streak_row_to_state(row: dict) -> dict:
    last = date.fromisoformat(row["last_completion"]) if row.get("last_completion") else None
    return {
        "current_streak": row["current_streak"],
        "longest_streak": row["longest_streak"],
        "last_completion": last,
        "grace_days_used": row.get("grace_days_used", 0),
        "grace_days_allowed": row.get("grace_days_allowed", DEFAULT_GRACE_DAYS_ALLOWED),
    }


def _persist_streak(habit_id: str, user_id: str, update: dict, *, exists: bool) -> None:
    payload = {
        "current_streak": update["current_streak"],
        "longest_streak": update["longest_streak"],
        "last_completion": update["last_completion"].isoformat(),
        "grace_days_used": update["grace_days_used"],
    }
    if exists:
        supabase.table("streaks").update(payload).eq("habit_id", habit_id).execute()
    else:
        supabase.table("streaks").insert(
            {"habit_id": habit_id, "user_id": user_id, **payload}
        ).execute()


@router.post("/habits/{habit_id}/complete")
async def complete_habit(habit_id: str, user_id: str = Depends(get_current_user)):
    today = date.today()

    supabase.table("habit_completions").insert(
        {"habit_id": habit_id, "user_id": user_id}
    ).execute()

    streak_res = (
        supabase.table("streaks").select("*").eq("habit_id", habit_id).execute()
    )

    if streak_res.data:
        streak_state = _streak_row_to_state(streak_res.data[0])
        if streak_state["last_completion"] == today:
            return {
                "streak": streak_state["current_streak"],
                "used_grace_day": False,
                "broken": False,
            }
    else:
        streak_state = {
            "current_streak": 0,
            "longest_streak": 0,
            "last_completion": None,
            "grace_days_used": 0,
            "grace_days_allowed": DEFAULT_GRACE_DAYS_ALLOWED,
        }

    update = calculate_streak_update(streak_state, today)
    _persist_streak(
        habit_id,
        user_id,
        update,
        exists=bool(streak_res.data),
    )

    return {
        "streak": update["current_streak"],
        "used_grace_day": update["used_grace_day"],
        "broken": update["broken"],
    }
