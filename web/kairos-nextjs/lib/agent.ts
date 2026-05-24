import { createClient } from "@/lib/supabase"
import { MOCK_AGENT_REPLY, MOCK_WEEKLY_REPORT } from "@/lib/mock-data"

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8001"
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

export interface AgentResponse {
  reply: string
  playbook_activated: string | null
  suggested_habit: string | null
}

async function getBearerToken(): Promise<string> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("No session")
  return session.access_token
}

export async function sendAgentMessage(message: string): Promise<AgentResponse> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 1400))
    return MOCK_AGENT_REPLY
  }

  const token = await getBearerToken()
  const res = await fetch(`${AGENT_URL}/api/v1/agent/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  })

  if (res.status === 503) throw new Error("SERVICE_UNAVAILABLE")
  if (res.status === 429) throw new Error("RATE_LIMITED")
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getWeeklyReport(): Promise<AgentResponse> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 2000))
    return { reply: MOCK_WEEKLY_REPORT, playbook_activated: null, suggested_habit: null }
  }

  const token = await getBearerToken()
  const res = await fetch(`${AGENT_URL}/api/v1/agent/trigger`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ trigger: "weekly_report" }),
  })

  if (res.status === 503) throw new Error("SERVICE_UNAVAILABLE")
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}


export interface HistoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export async function getAgentHistory(): Promise<HistoryMessage[]> {
  if (USE_MOCK) return [];
  const token = await getBearerToken();
  const res = await fetch(`${AGENT_URL}/api/v1/agent/history?limit=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.messages ?? [];
}

export async function addSuggestedHabit(habitName: string): Promise<void> {
  const token = await getBearerToken()
  if (!token) return
  await fetch(`${API_URL}/api/v1/habits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name: habitName, frequency: "daily" }),
  })
}
