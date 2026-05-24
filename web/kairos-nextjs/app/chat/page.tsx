"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Send, ArrowLeft, MoreHorizontal, Phone, AlertTriangle, Sparkles, Plus, Check } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { sendAgentMessage, addSuggestedHabit, getAgentHistory } from "@/lib/agent";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { AuthSpinner } from "@/components/AuthSpinner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Msg {
  id: string;
  from: "me" | "kairos";
  text: string;
  agentName?: string;
  agentColor?: string;
  showSuggestion?: boolean;
  suggestedHabit?: string;
}

// ── Agent metadata ─────────────────────────────────────────────────────────────

const AGENT_META: Record<string, { name: string; color: string }> = {
  mood:   { name: "Ánimo",    color: "#fb7185" },
  sleep:  { name: "Sueño",    color: "#60a5fa" },
  focus:  { name: "Foco",     color: "#a78bfa" },
  fuel:   { name: "Energía",  color: "#84cc16" },
  screen: { name: "Pantalla", color: "#6366f1" },
  streak: { name: "Racha",    color: "#f59e0b" },
};

// ── Checkin script ─────────────────────────────────────────────────────────────

const CHECKIN_AGENTS = [
  {
    id: "mood", name: "Ánimo", color: "#fb7185",
    questions: [
      "¿Cómo te sientes ahora mismo, del 1 al 5?",
      "¿Algo que esté rondando tu cabeza hoy? Si no, escribe 'nada' y seguimos.",
    ],
    handoff: "Ánimo tiene todo. Pasamos a Sueño.",
  },
  {
    id: "sleep", name: "Sueño", color: "#60a5fa",
    questions: [
      "¿Cuántas horas dormiste anoche? (Aprox. está bien)",
      "¿Cómo fue despertar? (Bien / Regular / Mal)",
    ],
    handoff: "Perfecto. Ahora Foco.",
  },
  {
    id: "focus", name: "Foco", color: "#a78bfa",
    questions: [
      "¿Cuántas sesiones de trabajo enfocado tuviste hoy?",
      "¿Qué te importa lograr esta tarde?",
    ],
    handoff: "Último agente. Energía.",
  },
  {
    id: "fuel", name: "Energía", color: "#84cc16",
    questions: [
      "¿Cuántos pasos llevas hoy? (Aprox. está bien)",
      "¿Ya desayunaste hoy?",
    ],
    handoff: "",
  },
];

const CHECKIN_INTRO: Msg = {
  id: "intro",
  from: "kairos",
  agentName: "Kairós Core",
  agentColor: "#8b5cf6",
  text: "Arrancamos tu check-in de hoy. Cuatro agentes te harán un par de preguntas cada uno. ≈ 4 min. Responde lo que quieras — sin presión. Empezamos con Ánimo.",
};

const QUICK_REPLIES = [
  "Cuéntame del uso nocturno",
  "Sugiéreme un hábito",
  "¿Cómo estoy esta semana?",
  "Activar modo enfocado",
];

const INITIAL_CORE: Msg[] = [
  { id: "1", from: "kairos", agentName: "Kairós Core", agentColor: "#8b5cf6", text: "Hola, Alejandro. Vi que llevas 142 min en pantalla hoy. ¿Cómo te sientes ahora mismo?" },
  { id: "2", from: "me", text: "Algo cansado, dormí mal de nuevo." },
  { id: "3", from: "kairos", agentName: "Kairós Core", agentColor: "#8b5cf6", text: "Tiene sentido. Los últimos 3 días usaste el teléfono después de las 23:00 por más de 45 min, y eso suele empujar el sueño hacia atrás. ¿Te gustaría que probemos juntos un pequeño ritual nocturno esta semana?", showSuggestion: true },
];

// ── Export: wrapped in Suspense for useSearchParams ───────────────────────────

export default function ChatPage() {
  return (
    <Suspense fallback={<AuthSpinner />}>
      <ChatContent />
    </Suspense>
  );
}

// ── Chat content ──────────────────────────────────────────────────────────────

function ChatContent() {
  const { checking } = useRequireAuth();
  const searchParams = useSearchParams();
  const mode = searchParams?.get("mode") ?? "";
  const agentParam = searchParams?.get("agent") ?? "";

  const isCheckin = mode === "checkin";
  const agentMeta = agentParam ? AGENT_META[agentParam] : null;

  const [checkinIdx, setCheckinIdx] = useState({ agent: 0, question: 0 });
  const [checkinDone, setCheckinDone] = useState(false);

  const buildInitial = (): Msg[] => {
    if (isCheckin) {
      const first = CHECKIN_AGENTS[0];
      return [
        CHECKIN_INTRO,
        { id: "q-0-0", from: "kairos", agentName: first.name, agentColor: first.color, text: first.questions[0] },
      ];
    }
    if (agentMeta) {
      return [{
        id: "a-1",
        from: "kairos",
        agentName: agentMeta.name,
        agentColor: agentMeta.color,
        text: `Hola, soy el agente de ${agentMeta.name}. ¿En qué te puedo ayudar hoy?`,
      }];
    }
    return INITIAL_CORE;
  };

  const [messages, setMessages] = useState<Msg[]>(buildInitial);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isCheckin || agentMeta) return;
    getAgentHistory().then((history) => {
      if (history.length === 0) return;
      setMessages(history.map((h) => ({
        id: h.id,
        from: h.role === "user" ? "me" : "kairos",
        text: h.content,
        agentName: "Kairós Core",
        agentColor: "#8b5cf6",
      })));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const advanceCheckin = (userMsgId: string) => {
    const { agent: aIdx, question: qIdx } = checkinIdx;
    const cur = CHECKIN_AGENTS[aIdx];
    const lastQ = qIdx >= cur.questions.length - 1;
    const lastA = aIdx >= CHECKIN_AGENTS.length - 1;

    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      if (!lastQ) {
        setMessages((m) => [...m, { id: `${userMsgId}-q`, from: "kairos", agentName: cur.name, agentColor: cur.color, text: cur.questions[qIdx + 1] }]);
        setCheckinIdx({ agent: aIdx, question: qIdx + 1 });
      } else if (!lastA) {
        const next = CHECKIN_AGENTS[aIdx + 1];
        setMessages((m) => [
          ...m,
          { id: `${userMsgId}-handoff`, from: "kairos", agentName: "Kairós Core", agentColor: "#8b5cf6", text: cur.handoff },
          { id: `${userMsgId}-nq`, from: "kairos", agentName: next.name, agentColor: next.color, text: next.questions[0] },
        ]);
        setCheckinIdx({ agent: aIdx + 1, question: 0 });
      } else {
        setMessages((m) => [...m, {
          id: `${userMsgId}-close`,
          from: "kairos",
          agentName: "Kairós Core",
          agentColor: "#8b5cf6",
          text: "Listo. Ánimo, Sueño, Foco y Energía tienen todo lo que necesitaban. Ahora puedo darte una mirada completa de tu día. ¿Hay algo más en lo que quieras que te ayude?",
        }]);
        setCheckinDone(true);
      }
    }, 900);
  };

  const handleSend = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || typing) return;
    const id = String(Date.now());
    setMessages((m) => [...m, { id, from: "me", text: value }]);
    setInput("");

    if (isCheckin && !checkinDone) {
      advanceCheckin(id);
      return;
    }

    setTyping(true);
    try {
      const res = await sendAgentMessage(value);
      setMessages((m) => [...m, {
        id: id + "-r",
        from: "kairos",
        agentName: agentMeta?.name ?? "Kairós Core",
        agentColor: agentMeta?.color ?? "#8b5cf6",
        text: res.reply,
        showSuggestion: !!res.suggested_habit,
        suggestedHabit: res.suggested_habit ?? undefined,
      }]);
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : "";
      const errorText =
        code === "SERVICE_UNAVAILABLE" ? "El copiloto está temporalmente fuera de servicio. Intenta en unos minutos."
        : code === "RATE_LIMITED" ? "Has alcanzado el límite de conversaciones por hora. Vuelve pronto."
        : "Hubo un error al conectar con Kairós. Verifica tu conexión.";
      setMessages((m) => [...m, { id: id + "-err", from: "kairos", agentName: "Kairós", agentColor: "#8b5cf6", text: errorText }]);
    } finally {
      setTyping(false);
    }
  };

  if (checking) return <AuthSpinner />;

  const headerName = isCheckin ? "Recopilación del día" : agentMeta?.name ?? "Kairós Core";
  const headerColor = isCheckin ? "#8b5cf6" : agentMeta?.color ?? "#8b5cf6";
  const headerSub = isCheckin
    ? checkinDone ? "Completado hoy ✓" : `Agente ${checkinIdx.agent + 1}/4 · ${CHECKIN_AGENTS[checkinIdx.agent]?.name ?? ""}`
    : "Activo ahora";

  return (
    <>
      <AppShell>
        <div className="-mx-5 flex h-[calc(100vh-100px)] flex-col md:-mx-8 md:h-[calc(100vh-48px)]">

          {/* Header */}
          <header className="flex items-center gap-3 border-b border-border-subtle px-5 py-4 md:px-8">
            <Link
              href="/agents"
              className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-surface hover:text-text-primary"
              aria-label="Volver a agentes"
            >
              <ArrowLeft size={20} />
            </Link>

            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: `linear-gradient(135deg, ${headerColor}, ${headerColor}bb)`, boxShadow: `0 0 16px ${headerColor}44` }}
            >
              {isCheckin || !agentMeta ? (
                <Sparkles size={18} className="text-white" strokeWidth={2.5} />
              ) : (
                <span style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{agentMeta.name[0]}</span>
              )}
            </div>

            <div className="flex-1">
              <p className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
                {headerName}
                <span style={{ color: headerColor }}>✦</span>
              </p>
              <p className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: headerColor }} />
                {headerSub}
              </p>
            </div>

            <button
              onClick={() => setCrisis(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-surface hover:text-text-primary"
              aria-label="Más opciones"
            >
              <MoreHorizontal size={20} />
            </button>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 md:px-8">
            <div className="mx-auto flex max-w-2xl flex-col gap-4">
              {messages.map((m) => <Bubble key={m.id} msg={m} />)}
              {typing && <TypingIndicator />}
            </div>
          </div>

          {/* Quick replies — only when not in active checkin */}
          {(!isCheckin || checkinDone) && (
            <div className="border-t border-border-subtle bg-bg-deep/80 px-5 pb-2 pt-3 backdrop-blur-md md:px-8">
              <div className="mx-auto flex max-w-2xl gap-2 overflow-x-auto pb-2">
                {QUICK_REPLIES.map((q, i) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    disabled={typing}
                    className="shrink-0 animate-fade-up rounded-full border border-border-active bg-bg-elevated px-4 py-2 text-xs font-medium text-text-primary transition-all hover:border-accent-primary hover:text-accent-primary disabled:opacity-50"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border-subtle bg-bg-deep/80 px-5 pb-3 pt-3 backdrop-blur-md md:px-8">
            <form
              className="mx-auto flex max-w-2xl items-center gap-2"
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            >
              <div className="flex flex-1 items-center rounded-full border border-border-subtle bg-bg-input px-4 py-2 transition-all focus-within:border-accent-secondary focus-within:shadow-glow-purple">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={typing}
                  placeholder={
                    isCheckin && !checkinDone
                      ? `Responde a ${CHECKIN_AGENTS[checkinIdx.agent]?.name ?? "Kairós"}…`
                      : "Escribe un mensaje…"
                  }
                  className="flex-1 bg-transparent text-base text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || typing}
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

// ── Bubble ────────────────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: Msg }) {
  const isMe = msg.from === "me";
  const [habitAdded, setHabitAdded] = useState(false);

  async function handleAddHabit() {
    if (!msg.suggestedHabit) return;
    setHabitAdded(true);
    await addSuggestedHabit(msg.suggestedHabit);
  }

  return (
    <div className={`flex animate-fade-up ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 text-base leading-relaxed ${
          isMe ? "bg-bg-input text-text-primary" : "bg-bg-elevated pl-5 text-text-primary"
        }`}
        style={{
          borderBottomRightRadius: isMe ? 6 : undefined,
          borderBottomLeftRadius: !isMe ? 6 : undefined,
          borderLeft: !isMe ? `3px solid ${msg.agentColor ?? "#8b5cf6"}` : undefined,
        }}
      >
        {!isMe && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: msg.agentColor ?? "#8b5cf6" }}>
            {msg.agentName ?? "Kairós"}
          </p>
        )}
        <p>{msg.text}</p>

        {msg.showSuggestion && (
          <button
            onClick={handleAddHabit}
            disabled={habitAdded}
            className={`group mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold transition-colors ${
              habitAdded
                ? "border-accent-primary/40 bg-[rgba(79,255,176,0.12)] text-accent-primary cursor-default"
                : "border-accent-primary bg-[rgba(79,255,176,0.08)] text-accent-primary hover:bg-[rgba(79,255,176,0.15)]"
            }`}
          >
            {habitAdded
              ? <><Check size={14} strokeWidth={2.5} /> Hábito agregado</>
              : <><Plus size={14} strokeWidth={2.5} /> Agregar hábito sugerido</>
            }
          </button>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex animate-fade-up justify-start">
      <div className="flex items-center gap-1.5 rounded-lg bg-bg-elevated px-4 py-3 pl-5" style={{ borderLeft: "3px solid #8b5cf6" }}>
        {[0, 160, 320].map((delay) => (
          <span key={delay} className="h-2 w-2 rounded-full bg-accent-secondary animate-bounce-dot" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </div>
    </div>
  );
}

function CrisisModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-crisis px-5 animate-fade-in">
      <div className="w-full max-w-md text-center page-enter">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "rgba(255,77,106,0.12)", boxShadow: "0 0 40px rgba(255,77,106,0.45)" }}>
          <AlertTriangle size={48} className="text-accent-danger" strokeWidth={1.8} />
        </div>
        <h1 className="text-xl font-bold text-text-primary">He notado señales que merecen atención</h1>
        <p className="mt-3 text-base leading-relaxed text-text-secondary">
          No tienes que pasar esto solo/a. Hay personas entrenadas para escucharte ahora mismo, sin juzgarte.
        </p>
        <div className="mt-7 rounded-lg border border-accent-danger/30 bg-[rgba(255,77,106,0.06)] p-5 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-danger/20">
              <Phone size={22} className="text-accent-danger" />
            </div>
            <div>
              <p className="font-bold text-text-primary">Línea 106 — Colombia</p>
              <p className="text-xs text-text-secondary">Gratuita · 24h · Confidencial</p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button onClick={onClose} className="flex-1 rounded-md border border-border-active bg-bg-elevated px-5 py-3.5 text-sm font-bold text-text-primary transition-colors hover:border-text-secondary">
            Tengo apoyo
          </button>
          <a href="tel:106" className="flex flex-1 items-center justify-center gap-2 rounded-md bg-accent-danger px-5 py-3.5 text-sm font-bold text-text-primary shadow-md transition-transform hover:scale-[1.02]">
            <Phone size={16} strokeWidth={2.5} />
            Llamar ahora
          </a>
        </div>
        <p className="mt-5 text-xs text-text-muted">(Demo · pulsa "Tengo apoyo" para volver al chat)</p>
      </div>
    </div>
  );
}
