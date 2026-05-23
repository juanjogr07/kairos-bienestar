"use client";

import { ArrowRight, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@heroui/react";

import { Logo } from "@/components/shared/Logo";

interface OnboardingIntroProps {
  onStart: () => void;
  onSkip: () => void;
}

/**
 * Pantalla de bienvenida al onboarding.
 *
 * Es la primera vista que ve el usuario antes de cualquier pregunta. Explica
 * por qué necesitamos esta información y deja explícito que puede omitirla a
 * cambio de una experiencia limitada (modo preview).
 */
export function OnboardingIntro({ onStart, onSkip }: OnboardingIntroProps) {
  return (
    <main className="relative flex min-h-screen flex-col bg-bg-deep">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-50"
        style={{
          background:
            "linear-gradient(180deg, rgba(123,111,240,0.15) 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <header className="relative z-10 flex items-center justify-between px-5 pt-6 md:px-8">
        <Logo size={28} />
        <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          Onboarding · Paso 0 de 4
        </span>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-12 page-enter md:px-8">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-cta shadow-glow-green animate-float">
          <Sparkles size={26} className="text-bg-deep" strokeWidth={2.5} />
        </div>

        <h1 className="text-xl font-bold leading-tight text-text-primary md:text-2xl">
          Antes de empezar, cuéntanos un poco sobre ti
        </h1>

        <p className="mt-4 text-base leading-relaxed text-text-secondary">
          Kairós necesita entender tu situación actual para que los agentes
          puedan acompañarte de forma personalizada. Te haremos algunas
          preguntas cortas — no hay respuestas correctas ni incorrectas. Toda
          la información es privada y solo se usa para darte mejores
          recomendaciones.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-md border border-border-subtle bg-bg-surface px-4 py-3">
            <ShieldCheck
              size={18}
              className="mt-0.5 shrink-0 text-accent-primary"
              strokeWidth={2.2}
            />
            <p className="text-sm text-text-secondary">
              Solo señales y triaje. Esto no es un diagnóstico.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-md border border-border-subtle bg-bg-surface px-4 py-3">
            <Lock
              size={18}
              className="mt-0.5 shrink-0 text-accent-secondary"
              strokeWidth={2.2}
            />
            <p className="text-sm text-text-secondary">
              Información privada. No se comparte con terceros.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-md border border-accent-warm/30 bg-accent-warm/5 px-4 py-3">
          <p className="text-sm leading-relaxed text-text-secondary">
            <span className="font-medium text-accent-warm">Heads up —</span>{" "}
            puedes omitir este proceso, pero hasta que lo completes solo
            podrás ver un preview de la plataforma. Podrás completarlo
            cuando quieras desde tu perfil.
          </p>
        </div>

        <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            onPress={onSkip}
            variant="light"
            radius="md"
            size="md"
            className="text-text-secondary data-[hover=true]:text-text-primary"
          >
            Omitir por ahora
          </Button>
          <Button
            onPress={onStart}
            radius="md"
            size="lg"
            endContent={<ArrowRight size={18} strokeWidth={2.5} />}
            className="bg-gradient-cta px-8 font-bold text-bg-deep shadow-glow-green data-[hover=true]:scale-[1.02]"
          >
            Empezar
          </Button>
        </div>
      </section>
    </main>
  );
}
