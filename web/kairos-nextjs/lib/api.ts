import { createClient } from "@/lib/supabase"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return {
    "Content-Type": "application/json",
    ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
}

export async function submitSurvey(type: "phq9" | "gad7", answers: number[]): Promise<void> {
  if (USE_MOCK) return
  const res = await fetch(`${API_URL}/api/v1/surveys/${type}`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
    responses: Object.fromEntries(answers.map((v, i) => [`q${i + 1}`, v])),
    total_score: answers.reduce((a, b) => a + b, 0),
  }),
  })
  if (!res.ok) throw new Error(`Survey submit failed: ${res.status}`)
}

export interface DashboardData {
  last_phq9_score: number | null
  last_phq9_date: string | null
  last_gad7_score: number | null
  last_gad7_date: string | null
}

export async function getDashboard(): Promise<DashboardData> {
  if (USE_MOCK) {
    return { last_phq9_score: null, last_phq9_date: null, last_gad7_score: null, last_gad7_date: null }
  }
  const res = await fetch(`${API_URL}/api/v1/dashboard`, { headers: await authHeaders() })
  if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.status}`)
  return res.json()
}
