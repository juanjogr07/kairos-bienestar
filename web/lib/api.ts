import { createClient } from "@/lib/supabase"
import * as mock from "@/lib/mock-data"

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("No autenticado")
  return { Authorization: `Bearer ${session.access_token}` }
}

export async function getDashboard() {
  if (USE_MOCK) return mock.mockDashboard
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/v1/dashboard`, { headers })
  if (!res.ok) throw new Error("Error al obtener dashboard")
  return res.json()
}

export async function submitSurvey(
  type: "phq9" | "gad7",
  responses: Record<string, number>,
  totalScore: number
) {
  if (USE_MOCK) return { id: "mock-id", created_at: new Date().toISOString() }
  const headers = { ...(await getAuthHeader()), "Content-Type": "application/json" }
  const res = await fetch(`${API_URL}/api/v1/surveys/${type}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ responses, total_score: totalScore }),
  })
  if (!res.ok) throw new Error("Error al guardar encuesta")
  return res.json()
}

export async function getHabits() {
  if (USE_MOCK) return mock.mockHabits
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/v1/habits`, { headers })
  if (!res.ok) throw new Error("Error al obtener hábitos")
  return res.json()
}

export async function createHabit(name: string, playbookSlug?: string) {
  if (USE_MOCK) return { ...mock.mockHabits[0], id: "new-mock", name }
  const headers = { ...(await getAuthHeader()), "Content-Type": "application/json" }
  const res = await fetch(`${API_URL}/api/v1/habits`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, playbook_slug: playbookSlug, frequency: "daily" }),
  })
  if (!res.ok) throw new Error("Error al crear hábito")
  return res.json()
}

export async function completeHabit(habitId: string) {
  if (USE_MOCK) return { streak: 4, message: "¡4 días seguidos! 💪" }
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/v1/habits/${habitId}/complete`, {
    method: "POST",
    headers,
  })
  if (!res.ok) throw new Error("Error al completar hábito")
  return res.json()
}
