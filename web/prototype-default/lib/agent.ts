import { createClient } from "@/lib/supabase"
import * as mock from "@/lib/mock-data"

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"
const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8001"

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("No autenticado")
  return { Authorization: `Bearer ${session.access_token}` }
}

export async function sendMessage(message: string) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 800))
    return mock.mockAgentReply
  }
  const headers = { ...(await getAuthHeader()), "Content-Type": "application/json" }
  const res = await fetch(`${AGENT_URL}/api/v1/agent/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message, context: { trigger: "user_message" } }),
  })
  if (!res.ok) throw new Error("Error al contactar al agente")
  return res.json()
}

export async function getChatHistory() {
  if (USE_MOCK) return { messages: [] }
  const headers = await getAuthHeader()
  const res = await fetch(`${AGENT_URL}/api/v1/agent/history`, { headers })
  if (!res.ok) return { messages: [] }
  return res.json()
}
