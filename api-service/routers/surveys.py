from fastapi import APIRouter, Depends, HTTPException, Path
from models.surveys import SurveySubmission, SurveyResponse
from auth import get_current_user
from database import supabase

router = APIRouter(prefix="/api/v1", tags=["surveys"])

VALID_SURVEY_TYPES = ["phq9", "gad7", "ema"]


@router.post("/surveys/{survey_type}", response_model=SurveyResponse)
async def submit_survey(
    survey_type: str = Path(...),
    submission: SurveySubmission = ...,
    user_id: str = Depends(get_current_user),
):
    if survey_type not in VALID_SURVEY_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de encuesta inválido: {survey_type}",
        )

    result = (
        supabase.table("survey_responses")
        .insert(
            {
                "user_id": user_id,
                "survey_type": survey_type,
                "responses": submission.responses,
                "total_score": submission.total_score,
            }
        )
        .execute()
    )

    row = result.data[0]
    return SurveyResponse(id=row["id"], created_at=str(row["created_at"]))
