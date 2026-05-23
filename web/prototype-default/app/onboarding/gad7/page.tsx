"use client"

import { useRouter } from "next/navigation"
import { SurveyForm } from "@/components/survey-form"
import { submitSurvey } from "@/lib/api"

const GAD7_QUESTIONS = {
  q1: "Sentirse nervioso/a, ansioso/a o al límite",
  q2: "No poder dejar de preocuparse o controlar la preocupación",
  q3: "Preocuparse demasiado por cosas diferentes",
  q4: "Dificultad para relajarse",
  q5: "Estar tan inquieto/a que es difícil quedarse quieto/a",
  q6: "Irritarse o enojarse fácilmente",
  q7: "Sentir miedo como si algo terrible pudiera pasar",
}

export default function GAD7Page() {
  const router = useRouter()

  async function handleComplete(responses: Record<string, number>, total: number) {
    await submitSurvey("gad7", responses, total)
    router.push("/dashboard")
  }

  return (
    <SurveyForm
      title="Sobre tu nivel de ansiedad últimamente..."
      description="GAD-7 — evaluación de ansiedad. Casi terminamos el onboarding."
      questions={GAD7_QUESTIONS}
      onComplete={handleComplete}
    />
  )
}
