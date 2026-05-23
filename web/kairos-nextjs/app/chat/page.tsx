"use client";

import { useEffect, useRef, useState } from "react";
import {
  Send,
  ArrowLeft,
  MoreHorizontal,
  Phone,
  AlertTriangle,
  Sparkles,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

interface Msg {
  id: string;
  from: "me" | "kairos";
  text: string;
  showSuggestion?: boolean;
}

const QUICK_REPLIES = [
  "Cuéntame del uso nocturno",
  "Sugiéreme un hábito",
  "¿Cómo estoy esta semana?",
  "Activar modo enfocado",
];

const INITIAL: Msg[] = [
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

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>(INITIAL);
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
          {/* Header */}
          <header className="flex items-center gap-3 border-b border-border-subtle px-5 py-4 md:px-8">
            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-surface hover:text-text-primary md:hidden"
              aria-label="Volver"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-cta shadow-glow-green">
              <Sparkles size={18} className="text-bg-deep" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
                Kairós{" "}
                <span className="text-accent-secondary">✦</span>
              </p>
              <p className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="dot-active inline-block h-1.5 w-1.5 rounded-full bg-accent-primary" />
                Activo ahora
              </p>
            </div>
            <button
              onClick={() => setCrisis(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-surface hover:text-text-primary"
              aria-label="Más opciones"
              title="Demo: simular alerta de crisis"
            >
              <MoreHorizontal size={20} />
            </button>
          </header>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-5 py-5 md:px-8"
          >
            <div className="mx-auto flex max-w-2xl flex-col gap-4">
              {messages.map((m) => (
                <Bubble key={m.id} msg={m} />
              ))}
              {typing && <TypingIndicator />}
            </div>
          </div>

          {/* Quick replies */}
          <div className="border-t border-border-subtle bg-bg-deep/80 px-5 pb-2 pt-3 backdrop-blur-md md:px-8">
            <div className="mx-auto flex max-w-2xl gap-2 overflow-x-auto pb-2">
              {QUICK_REPLIES.map((q, i) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="shrink-0 animate-fade-up rounded-full border border-border-active bg-bg-elevated px-4 py-2 text-xs font-medium text-text-primary transition-all hover:border-accent-primary hover:text-accent-primary"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              className="mx-auto flex max-w-2xl items-center gap-2 pb-3"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <div className="flex flex-1 items-center rounded-full border border-border-subtle bg-bg-input px-4 py-2 transition-all focus-within:border-accent-secondary focus-within:shadow-glow-purple">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe un mensaje a Kairós…"
                  className="flex-1 bg-transparent text-base text-text-primary placeholder:text-text-muted focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-cta text-bg-deep shadow-glow-green transition-transform hover:scale-105 disabled:opacity-50"
                aria-label="Enviar"
              >
                <Send size={18} strokeWidth={2.5} />
              </button>
            </form>
          </div>
        </div>
      </AppShell>

      {crisis && <CrisisModal onClose={() => setCrisis(false)} />}
    </>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isMe = msg.from === "me";
  return (
    <div
      className={`flex animate-fade-up ${
        isMe ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 text-base leading-relaxed ${
          isMe
            ? "bg-bg-input text-text-primary"
            : "insight-border-left bg-bg-elevated pl-5 text-text-primary"
        }`}
        style={{
          borderBottomRightRadius: isMe ? 6 : undefined,
          borderBottomLeftRadius: !isMe ? 6 : undefined,
        }}
      >
        {!isMe && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-accent-secondary">
            Kairós
          </p>
        )}
        <p>{msg.text}</p>

        {msg.showSuggestion && (
          <button className="group mt-3 flex items-center gap-2 rounded-md border border-accent-primary bg-[rgba(79,255,176,0.08)] px-3 py-2 text-xs font-bold text-accent-primary transition-colors hover:bg-[rgba(79,255,176,0.15)]">
            <Plus size={14} strokeWidth={2.5} />
            Agregar hábito sugerido
          </button>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex animate-fade-up justify-start">
      <div className="insight-border-left flex items-center gap-1.5 rounded-lg bg-bg-elevated px-4 py-3 pl-5">
        <span
          className="h-2 w-2 rounded-full bg-accent-secondary animate-bounce-dot"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-2 w-2 rounded-full bg-accent-secondary animate-bounce-dot"
          style={{ animationDelay: "160ms" }}
        />
        <span
          className="h-2 w-2 rounded-full bg-accent-secondary animate-bounce-dot"
          style={{ animationDelay: "320ms" }}
        />
      </div>
    </div>
  );
}

function CrisisModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-crisis px-5 animate-fade-in">
      <div className="w-full max-w-md text-center page-enter">
        <div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
          style={{
            background: "rgba(255,77,106,0.12)",
            boxShadow: "0 0 40px rgba(255,77,106,0.45)",
          }}
        >
          <AlertTriangle
            size={48}
            className="text-accent-danger"
            strokeWidth={1.8}
          />
        </div>

        <h1 className="text-xl font-bold text-text-primary">
          He notado señales que merecen atención
        </h1>
        <p className="mt-3 text-base leading-relaxed text-text-secondary">
          No tienes que pasar esto solo/a. Hay personas entrenadas para
          escucharte ahora mismo, sin juzgarte.
        </p>

        <div className="mt-7 rounded-lg border border-accent-danger/30 bg-[rgba(255,77,106,0.06)] p-5 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-danger/20">
              <Phone size={22} className="text-accent-danger" />
            </div>
            <div>
              <p className="font-bold text-text-primary">Línea 106 — Colombia</p>
              <p className="text-xs text-text-secondary">
                Gratuita · 24h · Confidencial
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-border-active bg-bg-elevated px-5 py-3.5 text-sm font-bold text-text-primary transition-colors hover:border-text-secondary"
          >
            Tengo apoyo
          </button>
          <a
            href="tel:106"
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-accent-danger px-5 py-3.5 text-sm font-bold text-text-primary shadow-md transition-transform hover:scale-[1.02]"
          >
            <Phone size={16} strokeWidth={2.5} />
            Llamar ahora
          </a>
        </div>

        <p className="mt-5 text-xs text-text-muted">
          (Demo · pulsa "Tengo apoyo" para volver al chat)
        </p>
      </div>
    </div>
  );
}
