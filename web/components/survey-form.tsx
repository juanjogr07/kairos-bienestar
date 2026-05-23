"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const SCORE_LABELS = [
  "Para nada",
  "Varios días",
  "Más de la mitad de los días",
  "Casi todos los días",
]

interface SurveyFormProps {
  title: string
  description: string
  questions: Record<string, string>
  onComplete: (responses: Record<string, number>, total: number) => void
}

export function SurveyForm({ title, description, questions, onComplete }: SurveyFormProps) {
  const [responses, setResponses] = useState<Record<string, number>>({})

  const keys = Object.keys(questions)
  const allAnswered = keys.every((k) => responses[k] !== undefined)
  const total = Object.values(responses).reduce((a, b) => a + b, 0)

  function handleSelect(key: string, value: number) {
    setResponses((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-gray-500 mt-1">{description}</p>
      </div>

      {keys.map((key, i) => (
        <Card key={key} className={responses[key] !== undefined ? "border-blue-200" : ""}>
          <CardContent className="pt-4">
            <p className="font-medium mb-3">
              {i + 1}. {questions[key]}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SCORE_LABELS.map((label, val) => (
                <button
                  key={val}
                  onClick={() => handleSelect(key, val)}
                  className={`p-2 text-sm rounded border transition-colors ${
                    responses[key] === val
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div className="font-bold">{val}</div>
                  <div className="text-xs">{label}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        className="w-full"
        disabled={!allAnswered}
        onClick={() => onComplete(responses, total)}
      >
        Continuar ({Object.keys(responses).length}/{keys.length} respondidas)
      </Button>
    </div>
  )
}
