"use client"

import { useEffect, useRef, useState } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { sendMessage, getChatHistory } from "@/lib/agent"

interface Message {
  role: "user" | "assistant"
  content: string
  playbook?: string
}

const INITIAL: Message[] = [
  {
    role: "assistant",
    content:
      "Hola, soy Kairós. Estoy aquí para ayudarte a entender tus patrones digitales y acompañarte en tu bienestar. ¿En qué te puedo ayudar hoy?",
  },
]

const SUGGESTED_QUESTIONS = [
  "¿Cómo estoy usando mi tiempo digital?",
  "¿Qué hábito debería empezar?",
  "¿Cómo han estado mis niveles de ansiedad?",
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getChatHistory().then(({ messages: history }) => {
      if (!history || history.length === 0) return
      const mapped: Message[] = history
        .slice(-20)
        .map((h: { role: string; content: string; playbook_activated?: string }) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
          playbook: h.playbook_activated,
        }))
      setMessages(mapped)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  async function handleSend(text?: string) {
    const msg = text || input
    if (!msg.trim() || loading) return

    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: msg }])
    setLoading(true)

    try {
      const response = await sendMessage(msg)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.reply,
          playbook: response.playbook_activated,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Ocurrió un error. Intenta de nuevo." },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Nav />
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 flex flex-col gap-4">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto min-h-0">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-sm rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white shadow-sm text-gray-800 rounded-bl-none"
                }`}
              >
                {m.content}
                {m.playbook && (
                  <div className="mt-2 text-xs opacity-70">Playbook activado: {m.playbook}</div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl px-4 py-3 text-sm shadow-sm text-gray-400">
                Kairós está pensando...
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="text-xs bg-white border rounded-full px-3 py-1 hover:bg-blue-50 text-gray-600"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Escribe tu mensaje..."
            disabled={loading}
          />
          <Button onClick={() => handleSend()} disabled={loading || !input.trim()}>
            Enviar
          </Button>
        </div>
      </main>
    </div>
  )
}
