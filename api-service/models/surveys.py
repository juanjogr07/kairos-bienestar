from pydantic import BaseModel, field_validator
from typing import Dict


class SurveySubmission(BaseModel):
    responses: Dict[str, int]
    total_score: float

    @field_validator("responses")
    @classmethod
    def validate_response_values(cls, v: Dict[str, int]) -> Dict[str, int]:
        for key, val in v.items():
            if not (0 <= val <= 3):
                raise ValueError(f"Respuesta {key} debe estar entre 0 y 3")
        return v


class SurveyResponse(BaseModel):
    id: str
    created_at: str


PHQ9_QUESTIONS = {
    "q1": "Poco interés o placer en hacer cosas",
    "q2": "Sentirse decaído/a, deprimido/a o sin esperanzas",
    "q3": "Problemas para dormir",
    "q4": "Sentirse cansado/a",
    "q5": "Poco apetito o comer en exceso",
    "q6": "Sentirse mal consigo mismo/a",
    "q7": "Dificultad para concentrarse",
    "q8": "Moverse o hablar lento / estar inquieto/a",
    "q9": "Pensamientos de hacerse daño",
}

GAD7_QUESTIONS = {
    "q1": "Sentirse nervioso/a o ansioso/a",
    "q2": "No poder dejar de preocuparse",
    "q3": "Preocuparse demasiado por cosas diferentes",
    "q4": "Dificultad para relajarse",
    "q5": "Estar tan inquieto/a que es difícil estarse quieto/a",
    "q6": "Irritarse o enojarse fácilmente",
    "q7": "Sentir miedo de que algo terrible puede pasar",
}

SURVEY_QUESTIONS = {"phq9": PHQ9_QUESTIONS, "gad7": GAD7_QUESTIONS}
