from fastapi import APIRouter, Depends
from auth import get_current_user
from database import supabase
from services.streak_engine import calculate_streak_after_completion
from models.habits import HabitCreate, HabitOut
from typing import List
from datetime import date

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


@router.post("/habits/{habit_id}/complete")
async def complete_habit(habit_id: str, user_id: str = Depends(get_current_user)):
    supabase.table("habit_completions").insert(
        {"habit_id": habit_id, "user_id": user_id}
    ).execute()

    return calculate_streak_after_completion(user_id, habit_id)
