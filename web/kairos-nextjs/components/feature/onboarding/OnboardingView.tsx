"use client";

import { useState } from "react";
import { Logo } from "@/components/shared/Logo";

import { OnboardingProgress } from "./OnboardingProgress";
import { QuestionCard } from "./QuestionCard";
import { OnboardingNav } from "./OnboardingNav";
import { OnboardingComplete } from "./OnboardingComplete";
import { GAD7, PHQ9, SURVEY_OPTIONS } from "./questions";

type Phase = "phq9" | "gad7" | "complete";

export function OnboardingView() {
  const [phase, setPhase] = useState<Phase>("phq9");
  const [step, setStep] = useState(0);
  const [phqAnswers, setPhqAnswers] = useState<(number | null)[]>(
    Array(9).fill(null)
  );
  const [gadAnswers, setGadAnswers] = useState<(number | null)[]>(
    Array(7).fill(null)
  );

  if (phase === "complete") {
    const phqScore = phqAnswers.reduce<number>((s, v) => s + (v ?? 0), 0);
    const gadScore = gadAnswers.reduce<number>((s, v) => s + (v ?? 0), 0);
    return <OnboardingComplete phqScore={phqScore} gadScore={gadScore} />;
  }

  const questions = phase === "phq9" ? PHQ9 : GAD7;
  const answers = phase === "phq9" ? phqAnswers : gadAnswers;
  const setAnswers = phase === "phq9" ? setPhqAnswers : setGadAnswers;
  const total = questions.length;
  const current = answers[step];
  const intro =
    "En las últimas 2 semanas, ¿con qué frecuencia te has sentido afectado/a por…";

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

      <OnboardingProgress
        current={step + 1}
        total={total}
        value={progress}
      />

      <QuestionCard
        intro={intro}
        question={questions[step]}
        options={SURVEY_OPTIONS}
        value={current}
        onChange={(value) => {
          const next = [...answers];
          next[step] = value;
          setAnswers(next);
        }}
        phaseKey={phase}
        step={step}
      />

      <OnboardingNav
        isFirst={step === 0 && phase === "phq9"}
        isFinal={step === total - 1 && phase === "gad7"}
        canContinue={current !== null}
        onBack={handleBack}
        onNext={handleNext}
      />
    </main>
  );
}
