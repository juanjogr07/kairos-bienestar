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
    body: JSON.stringify({ answers }),
  })
  if (!res.ok) throw new Error(`Survey submit failed: ${res.status}`)
}
