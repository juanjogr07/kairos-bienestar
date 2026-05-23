"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/shared/AppShell";

import { ChatHeader } from "./ChatHeader";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { QuickReplies } from "./QuickReplies";
import { ChatComposer } from "./ChatComposer";
import { CrisisModal } from "./CrisisModal";
import type { ChatMessage } from "./types";

const QUICK_REPLIES = [
  "Cuéntame del uso nocturno",
  "Sugiéreme un hábito",
  "¿Cómo estoy esta semana?",
  "Activar modo enfocado",
];

const INITIAL: ChatMessage[] = [
  {
    id: "1",
    from: "kairos",
    text: "Hola, Alejandro. Vi que llevas 142 min en pantalla hoy. ¿Cómo te sientes ahora mismo?",
  },
  {
    id: "2",
    from: "me",
    text: "Algo cansado, dormí mal de nuevo.",
  },
  {
    id: "3",
    from: "kairos",
    text: "Tiene sentido. Los últimos 3 días usaste el teléfono después de las 23:00 por más de 45 min, y eso suele empujar el sueño hacia atrás. ¿Te gustaría que probemos juntos un pequeño ritual nocturno esta semana?",
    showSuggestion: true,
  },
];

export function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typing]);

  const handleSend = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value) return;
    const id = String(Date.now());
    setMessages((m) => [...m, { id, from: "me", text: value }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        {
          id: id + "-r",
          from: "kairos",
          text: "Entiendo. Vamos a ir paso a paso. ¿Te parece si empezamos por dejar el teléfono fuera del cuarto a partir de las 22:30 esta noche?",
        },
      ]);
    }, 1400);
  };

  return (
    <>
      <AppShell>
        <div className="-mx-5 flex h-[calc(100vh-100px)] flex-col md:-mx-8 md:h-[calc(100vh-48px)]">
          <ChatHeader onOpenOptions={() => setCrisis(true)} />

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-5 py-5 md:px-8"
          >
            <div className="mx-auto flex max-w-2xl flex-col gap-4">
              {messages.map((m) => (
                <MessageBubble key={m.id} msg={m} />
              ))}
              {typing && <TypingIndicator />}
            </div>
          </div>

          <div className="border-t border-border-subtle bg-bg-deep/80 px-5 pb-2 pt-3 backdrop-blur-md md:px-8">
            <QuickReplies replies={QUICK_REPLIES} onSelect={handleSend} />
            <ChatComposer
              value={input}
              onChange={setInput}
              onSend={() => handleSend()}
            />
          </div>
        </div>
      </AppShell>

      <CrisisModal open={crisis} onClose={() => setCrisis(false)} />
    </>
  );
}
