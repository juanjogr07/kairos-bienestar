import { createClient } from "@/lib/supabase"
import {
  MOCK_DASHBOARD,
  MOCK_WEEKLY_USAGE,
  MOCK_HABITS,
} from "@/lib/mock-data"

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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardData {
  today_usage_min: number
  top_domains: { domain: string; minutes: number }[]
  active_habits: number
  total_habit_completions_today: number
  last_phq9_score: number | null
  last_gad7_score: number | null
  last_survey_date: string | null
  onboarding_completed: boolean
}

export interface WeeklyDay {
  day: string
  label: string
  minutes: number
}

export interface Habit {
  id: string
  name: string
  playbook_slug: string | null
  frequency: "daily" | "weekly"
  active: boolean
  current_streak: number
  completed_today: boolean
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboard(): Promise<DashboardData> {
  if (USE_MOCK) return MOCK_DASHBOARD
  const res = await fetch(`${API_URL}/api/v1/dashboard`, {
    headers: await authHeaders(),
  })
  if (!res.ok) return MOCK_DASHBOARD
  return res.json()
}

export async function getWeeklyUsage(): Promise<WeeklyDay[]> {
  if (USE_MOCK) return MOCK_WEEKLY_USAGE
  const res = await fetch(`${API_URL}/api/v1/dashboard/weekly-usage`, {
    headers: await authHeaders(),
  })
  if (!res.ok) return MOCK_WEEKLY_USAGE
  return res.json()
}

// ─── Habits ───────────────────────────────────────────────────────────────────

export async function getHabits(): Promise<Habit[]> {
  if (USE_MOCK) return MOCK_HABITS
  const res = await fetch(`${API_URL}/api/v1/habits`, {
    headers: await authHeaders(),
  })
  if (!res.ok) return MOCK_HABITS
  return res.json()
}

export async function completeHabit(habitId: string): Promise<{ streak: number; message: string }> {
  const res = await fetch(`${API_URL}/api/v1/habits/${habitId}/complete`, {
    method: "POST",
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function createHabit(name: string, frequency: "daily" | "weekly" = "daily"): Promise<Habit> {
  const res = await fetch(`${API_URL}/api/v1/habits`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ name, frequency }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ─── Surveys ──────────────────────────────────────────────────────────────────

export async function submitSurvey(type: "phq9" | "gad7", answers: number[]): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/surveys/${type}`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ answers }),
  })
  if (!res.ok) throw new Error(`Survey submit failed: ${res.status}`)
}
