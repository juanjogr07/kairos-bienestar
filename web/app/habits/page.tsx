"use client"

import { useEffect, useState } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { getHabits, createHabit, completeHabit } from "@/lib/api"

interface Habit {
  id: string
  name: string
  current_streak: number
  completed_today: boolean
  frequency: string
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [newHabitName, setNewHabitName] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    getHabits().then(setHabits).catch(console.error)
  }, [])

  async function handleCreate() {
    if (!newHabitName.trim()) return
    const habit = await createHabit(newHabitName)
    setHabits((prev) => [...prev, habit])
    setNewHabitName("")
  }

  async function handleComplete(habitId: string) {
    setLoading(true)
    try {
      const result = await completeHabit(habitId)
      setMessage(result.message)
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habitId
            ? { ...h, completed_today: true, current_streak: result.streak }
            : h
        )
      )
      setTimeout(() => setMessage(""), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Mis hábitos</h1>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded p-3 text-sm">
            {message}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            placeholder="Nuevo hábito (ej: Sin teléfono la primera hora)"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={!newHabitName.trim()}>
            Agregar
          </Button>
        </div>

        <div className="space-y-3">
          {habits.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">
              No tienes hábitos todavía. Agrega uno o pregúntale a Kairós cuál comenzar.
            </p>
          )}
          {habits.map((h) => (
            <Card key={h.id} className={h.completed_today ? "opacity-60" : ""}>
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{h.name}</p>
                  <p className="text-sm text-gray-500">🔥 {h.current_streak} días seguidos</p>
                </div>
                <Button
                  size="sm"
                  variant={h.completed_today ? "outline" : "default"}
                  disabled={h.completed_today || loading}
                  onClick={() => handleComplete(h.id)}
                >
                  {h.completed_today ? "✓ Completado" : "Marcar hecho"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
