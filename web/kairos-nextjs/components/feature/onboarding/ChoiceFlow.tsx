"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Input, Radio, RadioGroup } from "@heroui/react";

import { Logo } from "@/components/shared/Logo";

import { OnboardingProgress } from "./OnboardingProgress";
import { OnboardingNav } from "./OnboardingNav";
import type { ChoiceQuestion } from "./questions";

export type ChoiceAnswers = Record<string, string>;

interface ChoiceFlowProps {
  headerEyebrow: string;
  intro: string;
  questions: ChoiceQuestion[];
  /** IDs cuyo input no es radio sino texto libre. */
  freeTextIds?: ReadonlySet<string>;
  initialAnswers?: ChoiceAnswers;
  onBackOutOfBlock: () => void;
  onComplete: (answers: ChoiceAnswers) => void;
  /** Si está presente, muestra "Omitir" en el footer. */
  onSkip?: () => void;
}

/**
 * Flujo paginado de preguntas de opción única (o texto libre) para los
 * bloques no clínicos del onboarding: hábitos digitales y tiempo en pantalla
 * (modo preguntas).
 *
 * Cada pregunta se muestra individualmente, con barra de progreso y nav de
 * "Atrás/Siguiente". Si el usuario sale del bloque (back en la primera
 * pregunta) se llama `onBackOutOfBlock` para que el padre decida (regresar
 * al mapa, al bloque anterior, etc).
 */
export function ChoiceFlow({
  headerEyebrow,
  intro,
  questions,
  freeTextIds,
  initialAnswers,
  onBackOutOfBlock,
  onComplete,
  onSkip,
}: ChoiceFlowProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<ChoiceAnswers>(initialAnswers ?? {});

  const total = questions.length;
  const current = questions[step];
  const isFreeText = freeTextIds?.has(current.id) ?? false;
  const value = answers[current.id] ?? "";

  const progress = useMemo(() => {
    const answered = step + (value.trim().length > 0 ? 1 : 0);
    return (answered / total) * 100;
  }, [step, total, value]);

  const canContinue = value.trim().length > 0;

  const handleNext = () => {
    if (step < total - 1) {
      setStep(step + 1);
      return;
    }
    onComplete(answers);
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      return;
    }
    onBackOutOfBlock();
  };

  const setAnswer = (next: string) => {
    setAnswers((prev) => ({ ...prev, [current.id]: next }));
  };

  return (
    <main className="relative flex min-h-screen flex-col bg-bg-deep">
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
          {headerEyebrow}
        </span>
      </header>

      <OnboardingProgress current={step + 1} total={total} value={progress} />

      <div
        key={`${headerEyebrow}-${step}`}
        className="relative z-10 mx-auto mt-12 flex w-full max-w-2xl flex-1 flex-col px-5 page-enter md:px-8"
      >
        <p className="text-xs font-medium uppercase tracking-wider text-accent-secondary">
          {intro}
        </p>
        <h2 className="mt-3 text-xl font-bold leading-snug text-text-primary md:text-2xl">
          {current.text}
        </h2>

        {isFreeText ? (
          <div className="mt-8">
            <Input
              aria-label={current.text}
              value={value}
              onValueChange={setAnswer}
              placeholder="Ej: Instagram, YouTube, WhatsApp"
              variant="bordered"
              radius="md"
              size="lg"
              classNames={{
                inputWrapper: [
                  "border border-border-subtle bg-bg-surface",
                  "data-[hover=true]:border-border-active",
                  "data-[focus=true]:border-accent-primary",
                ].join(" "),
                input: "text-base text-text-primary placeholder:text-text-muted",
              }}
            />
            <p className="mt-2 text-xs text-text-secondary">
              Sepáralas por coma. Si no recuerdas las exactas, escribe las que
              usas más a menudo.
            </p>
          </div>
        ) : (
          <RadioGroup
            aria-label={current.text}
            value={value}
            onValueChange={setAnswer}
            className="mt-8 gap-3"
            classNames={{ wrapper: "gap-3" }}
          >
            {current.options.map((opt) => (
              <Radio
                key={opt}
                value={opt}
                classNames={{
                  base: [
                    "max-w-full m-0",
                    "inline-flex items-center w-full justify-start",
                    "rounded-md border px-5 py-4 text-left transition-all",
                    "border-border-subtle bg-bg-surface",
                    "data-[hover=true]:border-border-active",
                    "data-[selected=true]:border-accent-primary data-[selected=true]:bg-accent-primary/10 data-[selected=true]:shadow-glow-green",
                  ].join(" "),
                  wrapper: "hidden",
                  labelWrapper: "ml-0 w-full",
                  label: "w-full",
                }}
              >
                <span className="flex w-full items-center gap-4">
                  <span
                    className={`flex-1 text-base ${
                      value === opt
                        ? "text-text-primary"
                        : "text-text-secondary"
                    }`}
                  >
                    {opt}
                  </span>
                  {value === opt && (
                    <Check
                      size={20}
                      className="text-accent-primary animate-bounce-soft"
                      strokeWidth={3}
                    />
                  )}
                </span>
              </Radio>
            ))}
          </RadioGroup>
        )}
      </div>

      <OnboardingNav
        isFirst={false}
        isFinal={step === total - 1}
        canContinue={canContinue}
        onBack={handleBack}
        onNext={handleNext}
        onSkip={onSkip}
      />
    </main>
  );
}
