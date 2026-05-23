"use client"

import { useRouter } from "next/navigation"
import { SurveyForm } from "@/components/survey-form"
import { submitSurvey } from "@/lib/api"

const PHQ9_QUESTIONS = {
  q1: "Poco interés o placer en hacer cosas",
  q2: "Sentirse decaído/a, deprimido/a o sin esperanzas",
  q3: "Dificultad para quedarse dormido/a o dormir demasiado",
  q4: "Sentirse cansado/a o con poca energía",
  q5: "Poco apetito o comer en exceso",
  q6: "Sentirse mal consigo mismo/a — o que es un fracaso",
  q7: "Dificultad para concentrarse en cosas como leer o ver TV",
  q8: "Moverse o hablar tan lento que otros lo notan, o lo contrario",
  q9: "Pensamientos de hacerse daño o estar mejor muerto/a",
}

export default function PHQ9Page() {
  const router = useRouter()

  async function handleComplete(responses: Record<string, number>, total: number) {
    await submitSurvey("phq9", responses, total)
    router.push("/onboarding/gad7")
  }

  return (
    <SurveyForm
      title="¿Cómo te has sentido en las últimas 2 semanas?"
      description="PHQ-9 — cuestionario de salud mental. Tus respuestas son privadas y nos ayudan a personalizar tu experiencia."
      questions={PHQ9_QUESTIONS}
      onComplete={handleComplete}
    />
  )
}
