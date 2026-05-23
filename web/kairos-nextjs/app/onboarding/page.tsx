"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Sparkles, Check } from "lucide-react";
import { Logo } from "@/components/Logo";

const PHQ9: string[] = [
  "Poco interés o placer en hacer las cosas",
  "Sentirte decaído/a, deprimido/a o sin esperanza",
  "Problemas para dormir o dormir demasiado",
  "Sentirte cansado/a o con poca energía",
  "Falta de apetito o comer en exceso",
  "Sentirte mal contigo mismo/a o que eres un fracaso",
  "Dificultad para concentrarte en cosas como leer o ver TV",
  "Moverte o hablar tan lento que otros lo notan, o lo opuesto: estar inquieto/a",
  "Pensar que estarías mejor muerto/a o lastimarte de alguna manera",
];

const GAD7: string[] = [
  "Sentirte nervioso/a, ansioso/a o muy tenso/a",
  "No poder parar o controlar tu preocupación",
  "Preocuparte demasiado por diferentes cosas",
  "Tener dificultad para relajarte",
  "Estar tan inquieto/a que es difícil quedarte sentado/a",
  "Irritarte o enojarte con facilidad",
  "Sentir miedo, como si algo terrible fuera a pasar",
];

const OPTIONS = [
  { value: 0, label: "Para nada" },
  { value: 1, label: "Varios días" },
  { value: 2, label: "Más de la mitad de los días" },
  { value: 3, label: "Casi todos los días" },
];

type Phase = "phq9" | "gad7" | "complete";

export default function OnboardingPage() {
  const [phase, setPhase] = useState<Phase>("phq9");
  const [step, setStep] = useState(0);
  const [phqAnswers, setPhqAnswers] = useState<(number | null)[]>(
    Array(9).fill(null)
  );
  const [gadAnswers, setGadAnswers] = useState<(number | null)[]>(
    Array(7).fill(null)
  );
  const router = useRouter();

  const questions = phase === "phq9" ? PHQ9 : GAD7;
  const answers = phase === "phq9" ? phqAnswers : gadAnswers;
  const setAnswers = phase === "phq9" ? setPhqAnswers : setGadAnswers;
  const total = questions.length;
  const current = answers[step];
  const intro =
    phase === "phq9"
      ? "En las últimas 2 semanas, ¿con qué frecuencia te has sentido afectado/a por…"
      : "En las últimas 2 semanas, ¿con qué frecuencia te has sentido afectado/a por…";

  if (phase === "complete") {
    const phqScore = phqAnswers.reduce<number>((s, v) => s + (v ?? 0), 0);
    const gadScore = gadAnswers.reduce<number>((s, v) => s + (v ?? 0), 0);

    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-brand px-5 py-10">
        <div className="w-full max-w-md text-center page-enter">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-cta shadow-glow-green animate-float">
            <Sparkles size={36} className="text-bg-deep" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold text-text-primary">
            Listo, Alejandro.
          </h1>
          <p className="mt-3 text-base leading-relaxed text-text-secondary">
            Gracias por compartir tu momento actual. Voy a estar acompañándote
            con datos vivos y sugerencias suaves. Sin juicios.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border-subtle bg-bg-surface p-4 text-left">
              <span className="text-xs font-medium text-text-secondary">
                PHQ-9
              </span>
              <p className="mt-1 font-mono text-2xl font-bold text-accent-primary">
                {phqScore}
              </p>
              <p className="text-xs text-text-secondary">
                {phqScore < 5
                  ? "Mínimo"
                  : phqScore < 10
                    ? "Leve"
                    : phqScore < 15
                      ? "Moderado"
                      : "Severo"}
              </p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-bg-surface p-4 text-left">
              <span className="text-xs font-medium text-text-secondary">
                GAD-7
              </span>
              <p className="mt-1 font-mono text-2xl font-bold text-accent-secondary">
                {gadScore}
              </p>
              <p className="text-xs text-text-secondary">
                {gadScore < 5
                  ? "Mínimo"
                  : gadScore < 10
                    ? "Leve"
                    : gadScore < 15
                      ? "Moderado"
                      : "Severo"}
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="group mt-8 inline-flex items-center justify-center gap-2 rounded-md bg-gradient-cta px-8 py-3.5 font-bold text-bg-deep shadow-glow-green transition-transform hover:scale-[1.02]"
          >
            Ir a tu Dashboard
            <ArrowRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </main>
    );
  }

  const progress = ((step + (current !== null ? 1 : 0)) / total) * 100;

  const handleNext = () => {
    if (step < total - 1) {
      setStep(step + 1);
    } else if (phase === "phq9") {
      setPhase("gad7");
      setStep(0);
    } else {
      setPhase("complete");
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else if (phase === "gad7") {
      setPhase("phq9");
      setStep(PHQ9.length - 1);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-bg-deep">
      {/* Top gradient overlay */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-40"
        style={{
          background:
            "linear-gradient(180deg, rgba(123,111,240,0.12) 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <header className="relative z-10 flex items-center justify-between px-5 pt-6 md:px-8">
        <Logo size={28} />
        <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          {phase === "phq9" ? "PHQ-9 · Estado de ánimo" : "GAD-7 · Ansiedad"}
        </span>
      </header>

      {/* Progress */}
      <div className="relative z-10 mx-auto mt-6 flex w-full max-w-2xl items-center gap-3 px-5 md:px-8">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-input">
          <div
            className="h-full rounded-full bg-accent-primary shadow-glow-green transition-[width] duration-500 ease-spring"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="font-mono text-xs text-text-secondary">
          {step + 1} / {total}
        </span>
      </div>

      {/* Question */}
      <div
        key={`${phase}-${step}`}
        className="relative z-10 mx-auto mt-12 flex w-full max-w-2xl flex-1 flex-col px-5 page-enter md:px-8"
      >
        <p className="text-xs font-medium uppercase tracking-wider text-accent-secondary">
          {intro}
        </p>
        <h2 className="mt-3 text-xl font-bold leading-snug text-text-primary md:text-2xl">
          {questions[step]}
        </h2>

        <div className="mt-8 space-y-3">
          {OPTIONS.map((opt) => {
            const selected = current === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  const next = [...answers];
                  next[step] = opt.value;
                  setAnswers(next);
                }}
                className={`flex w-full items-center gap-4 rounded-md border px-5 py-4 text-left transition-all ${
                  selected
                    ? "border-accent-primary bg-[rgba(79,255,176,0.08)] shadow-glow-green"
                    : "border-border-subtle bg-bg-surface hover:border-border-active"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono font-bold transition-colors ${
                    selected
                      ? "bg-accent-primary text-bg-deep"
                      : "bg-bg-input text-text-secondary"
                  }`}
                >
                  {opt.value}
                </span>
                <span
                  className={`flex-1 text-base ${
                    selected ? "text-text-primary" : "text-text-secondary"
                  }`}
                >
                  {opt.label}
                </span>
                {selected && (
                  <Check
                    size={20}
                    className="text-accent-primary animate-bounce-soft"
                    strokeWidth={3}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer with nav */}
      <footer className="sticky bottom-0 z-10 border-t border-border-subtle bg-bg-deep/80 px-5 py-4 backdrop-blur-md md:px-8">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
          <button
            onClick={handleBack}
            disabled={step === 0 && phase === "phq9"}
            className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary disabled:opacity-30"
          >
            <ArrowLeft size={16} />
            Atrás
          </button>

          <button
            onClick={handleNext}
            disabled={current === null}
            className={`flex items-center gap-2 rounded-md px-6 py-3 text-sm font-bold transition-all ${
              current === null
                ? "cursor-not-allowed bg-bg-input text-text-muted"
                : "bg-gradient-cta text-bg-deep shadow-glow-green hover:scale-[1.02]"
            }`}
          >
            {step === total - 1 && phase === "gad7" ? "Finalizar" : "Siguiente"}
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </footer>
    </main>
  );
}
