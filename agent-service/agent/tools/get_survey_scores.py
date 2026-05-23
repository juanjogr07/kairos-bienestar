from database import supabase
from typing import Optional


def get_survey_scores(user_id: str) -> dict:
    def latest_two_scores(survey_type: str) -> tuple[Optional[float], Optional[float]]:
        """Returns (current_score, previous_score) — most recent first."""
        res = (
            supabase.table("survey_responses")
            .select("total_score")
            .eq("user_id", user_id)
            .eq("survey_type", survey_type)
            .order("created_at", desc=True)
            .limit(2)
            .execute()
        )
        current = res.data[0]["total_score"] if len(res.data) > 0 else None
        previous = res.data[1]["total_score"] if len(res.data) > 1 else None
        return current, previous

    phq9, phq9_prev = latest_two_scores("phq9")
    gad7, gad7_prev = latest_two_scores("gad7")

    def interpret_phq9(score: Optional[float]) -> str:
        if score is None:
            return "sin datos"
        if score < 5:
            return "mínimo"
        if score < 10:
            return "leve"
        if score < 15:
            return "moderado"
        if score < 20:
            return "moderadamente severo"
        return "severo"

    def interpret_gad7(score: Optional[float]) -> str:
        if score is None:
            return "sin datos"
        if score < 5:
            return "mínimo"
        if score < 10:
            return "leve"
        if score < 15:
            return "moderado"
        return "severo"

    return {
        "phq9_score": phq9,
        "phq9_prev_score": phq9_prev,
        "phq9_interpretation": interpret_phq9(phq9),
        "gad7_score": gad7,
        "gad7_prev_score": gad7_prev,
        "gad7_interpretation": interpret_gad7(gad7),
        "crisis_flag": (phq9 is not None and phq9 >= 15) or (gad7 is not None and gad7 >= 15),
    }
