"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Check, Flame, X, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";

interface Habit {
  id: string;
  name: string;
  streak: number;
  best: number;
  done: boolean;
  recommended?: boolean;
  freq: "daily" | "weekly";
}

const INITIAL: Habit[] = [
  {
    id: "1",
    name: "Sin teléfono la primera hora del día",
    streak: 3,
    best: 5,
    done: false,
    freq: "daily",
  },
  {
    id: "2",
    name: "10 min de respiración consciente",
    streak: 5,
    best: 5,
    done: true,
    freq: "daily",
    recommended: true,
  },
  {
    id: "3",
    name: "Caminar al sol 15 min",
    streak: 1,
    best: 4,
    done: false,
    freq: "daily",
  },
  {
    id: "4",
    name: "Lectura sin pantallas antes de dormir",
    streak: 2,
    best: 7,
    done: true,
    freq: "daily",
  },
];

export default function HabitsPage() {
  const { checking } = useRequireAuth();
  const [habits, setHabits] = useState<Habit[]>(INITIAL);
  const [showSheet, setShowSheet] = useState(false);
  const [name, setName] = useState("");
  const [freq, setFreq] = useState<"daily" | "weekly">("daily");

  const completed = habits.filter((h) => h.done).length;

  const handleComplete = (id: string, btn: HTMLButtonElement | null) => {
    setHabits((hs) =>
      hs.map((h) =>
        h.id === id
          ? {
              ...h,
              done: !h.done,
              streak: !h.done ? h.streak + 1 : Math.max(0, h.streak - 1),
            }
          : h
      )
    );
    // Confetti burst
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      spawnConfetti(cx, cy);
    }
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    setHabits((hs) => [
      {
        id: String(Date.now()),
        name: name.trim(),
        streak: 0,
        best: 0,
        done: false,
        freq,
      },
      ...hs,
    ]);
    setName("");
    setFreq("daily");
    setShowSheet(false);
  };

  if (checking) return <div className="flex h-screen items-center justify-center"><span className="h-6 w-6 animate-spin rounded-full border-2 border-accent-secondary border-t-transparent" /></div>;

  return (
    <AppShell>
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary md:text-2xl">
            Mis hábitos
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {habits.length} activos ·{" "}
            <span className="text-accent-primary">
              {completed} completados hoy
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowSheet(true)}
          className="flex items-center gap-2 rounded-md bg-gradient-cta px-4 py-2.5 text-sm font-bold text-bg-deep shadow-glow-green transition-transform hover:scale-[1.02]"
        >
          <Plus size={16} strokeWidth={2.5} />
          Nuevo
        </button>
      </header>

      <ul className="mt-6 space-y-3">
        {habits.map((h, i) => (
          <li
            key={h.id}
            className={`group rounded-lg border p-5 transition-all animate-fade-up ${
              h.done
                ? "border-accent-primary/40 bg-[rgba(79,255,176,0.04)]"
                : "border-border-subtle bg-bg-surface hover:border-border-active"
            }`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3
                  className={`text-md font-bold leading-snug ${
                    h.done ? "text-text-secondary" : "text-text-primary"
                  }`}
                >
                  {h.name}
                </h3>
                {h.recommended && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[rgba(123,111,240,0.15)] px-2.5 py-0.5 text-[11px] font-medium text-accent-secondary">
                    <Sparkles size={10} /> Recomendado por Kairós
                  </span>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-streak px-3 py-1 text-bg-deep shadow-sm">
                    <Flame size={12} strokeWidth={2.5} />
                    <span className="font-mono text-xs font-bold">
                      {h.streak} días
                    </span>
                  </span>
                  <span className="text-xs text-text-muted">
                    Récord:{" "}
                    <span className="font-mono text-text-secondary">
                      {h.best} días
                    </span>
                  </span>
                  <span className="text-xs text-text-muted">
                    {h.freq === "daily" ? "Diario" : "Semanal"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <CompleteButton
                done={h.done}
                onClick={(btn) => handleComplete(h.id, btn)}
              />
            </div>

            {h.done && (
              <p className="mt-3 animate-fade-up text-xs text-accent-primary">
                ¡{h.streak} días seguidos! Sigue así 💪
              </p>
            )}
          </li>
        ))}
      </ul>

      {showSheet && (
        <CreateSheet
          name={name}
          setName={setName}
          freq={freq}
          setFreq={setFreq}
          onClose={() => setShowSheet(false)}
          onCreate={handleCreate}
        />
      )}
    </AppShell>
  );
}

function CompleteButton({
  done,
  onClick,
}: {
  done: boolean;
  onClick: (btn: HTMLButtonElement | null) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      onClick={() => onClick(ref.current)}
      className={`relative flex items-center gap-2 rounded-md border-2 px-4 py-2 text-sm font-bold transition-all ${
        done
          ? "border-accent-primary bg-accent-primary text-bg-deep shadow-glow-green"
          : "border-accent-primary/60 text-accent-primary hover:bg-[rgba(79,255,176,0.08)]"
      }`}
    >
      {done ? (
        <>
          <Check size={16} strokeWidth={3} />
          Completado
        </>
      ) : (
        <>
          <Check size={16} strokeWidth={3} />
          Completar hoy
        </>
      )}
    </button>
  );
}

function CreateSheet({
  name,
  setName,
  freq,
  setFreq,
  onClose,
  onCreate,
}: {
  name: string;
  setName: (s: string) => void;
  freq: "daily" | "weekly";
  setFreq: (f: "daily" | "weekly") => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  return (
    <div
      className="sheet-overlay fixed inset-0 z-40 flex items-end justify-center animate-fade-in md:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-xl bg-bg-elevated p-6 shadow-lg animate-slide-up md:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-subtle md:hidden" />

        <header className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Nuevo hábito</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-surface hover:text-text-primary"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </header>

        <p className="mt-1 text-xs text-text-secondary">
          Pequeño y específico funciona mejor que ambicioso.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-text-secondary">
              Nombre del hábito
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: 10 min de lectura sin pantalla"
              className="w-full rounded-md border border-border-subtle bg-bg-input px-4 py-3 text-base text-text-primary placeholder:text-text-muted focus:border-accent-secondary focus:shadow-glow-purple focus:outline-none"
              autoFocus
            />
          </label>

          <div>
            <span className="mb-2 block text-xs font-medium text-text-secondary">
              Frecuencia
            </span>
            <div className="grid grid-cols-2 gap-2 rounded-full bg-bg-input p-1">
              {(["daily", "weekly"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFreq(f)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    freq === f
                      ? "bg-bg-elevated text-text-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {f === "daily" ? "Diario" : "Semanal"}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onCreate}
            disabled={!name.trim()}
            className={`mt-2 w-full rounded-md px-6 py-3.5 text-sm font-bold transition-all ${
              name.trim()
                ? "bg-gradient-cta text-bg-deep shadow-glow-green hover:scale-[1.01]"
                : "cursor-not-allowed bg-bg-input text-text-muted"
            }`}
          >
            Crear hábito
          </button>
        </div>
      </div>
    </div>
  );
}

function spawnConfetti(cx: number, cy: number) {
  const colors = ["#4FFFB0", "#7B6FF0", "#FFD166", "#5AC8FF"];
  const count = 22;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.className = "confetti go";
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const dist = 60 + Math.random() * 60;
    el.style.left = `${cx}px`;
    el.style.top = `${cy}px`;
    el.style.background = colors[i % colors.length];
    el.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    el.style.setProperty("--dy", `${Math.sin(angle) * dist + 30}px`);
    el.style.position = "fixed";
    el.style.zIndex = "60";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
}
