"use client";

import { ArrowRight, CheckCircle2, PauseCircle } from "lucide-react";
import { Button } from "@heroui/react";

import { Logo } from "@/components/shared/Logo";

import type { BlockMeta } from "./questions";

interface OnboardingTransitionProps {
  justCompleted: BlockMeta;
  nextBlock: BlockMeta;
  onContinue: () => void;
  onPause: () => void;
}

/**
 * Pantalla intermedia entre dos bloques del onboarding.
 *
 * Sustituye el avance automático (que existía antes entre PHQ-9 y GAD-7) por
 * una pausa explícita: confirma que el bloque anterior quedó guardado y
 * presenta el siguiente con un CTA continuar o pausar para retomar más tarde.
 */
export function OnboardingTransition({
  justCompleted,
  nextBlock,
  onContinue,
  onPause,
}: OnboardingTransitionProps) {
  return (
    <main className="relative flex min-h-screen flex-col bg-bg-deep">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-40"
        style={{
          background:
            "linear-gradient(180deg, rgba(79,255,176,0.12) 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <header className="relative z-10 flex items-center justify-between px-5 pt-6 md:px-8">
        <Logo size={28} />
        <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          Transición
        </span>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-12 page-enter md:px-8">
        <div
          className="flex items-center gap-2 rounded-md border border-accent-primary/30 bg-accent-primary/5 px-4 py-3"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2
            size={18}
            className="text-accent-primary"
            strokeWidth={2.5}
          />
          <p className="text-sm font-medium text-text-primary">
            {justCompleted.title} completado
          </p>
        </div>

        <p className="mt-8 text-xs font-medium uppercase tracking-wider text-accent-secondary">
          A continuación
        </p>
        <h1 className="mt-2 text-xl font-bold leading-tight text-text-primary md:text-2xl">
          {nextBlock.title} — {nextBlock.subtitle}
        </h1>
        <p className="mt-2 font-mono text-xs text-text-secondary">
          {nextBlock.questionsCount} preguntas · {nextBlock.estimatedMinutes}
        </p>
        <p className="mt-4 text-base leading-relaxed text-text-secondary">
          {nextBlock.description}
        </p>

        <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            onPress={onPause}
            variant="light"
            radius="md"
            size="md"
            startContent={<PauseCircle size={16} strokeWidth={2.2} />}
            className="text-text-secondary data-[hover=true]:text-text-primary"
          >
            Pausar y continuar después
          </Button>
          <Button
            onPress={onContinue}
            radius="md"
            size="lg"
            endContent={<ArrowRight size={18} strokeWidth={2.5} />}
            className="bg-gradient-cta px-8 font-bold text-bg-deep shadow-glow-green data-[hover=true]:scale-[1.02]"
          >
            Continuar
          </Button>
        </div>
      </section>
    </main>
  );
}
