"use client";

import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { Button, Card, CardBody } from "@heroui/react";

import { Logo } from "@/components/shared/Logo";

import type { BlockKey, BlockMeta } from "./questions";

interface OnboardingMapProps {
  blocks: BlockMeta[];
  completed: Record<BlockKey, boolean>;
  nextBlockKey: BlockKey | null;
  onStartNext: () => void;
  onSkip: () => void;
}

/**
 * Mapa de tests del onboarding (paso 1 del flujo, después de la intro).
 *
 * Muestra los 4 bloques en una cuadrícula 2x2, con su estado (pendiente o
 * completado). El CTA principal apunta al siguiente bloque pendiente — si
 * todos están hechos, se considera "todo listo" (no debería pasar en el
 * flujo normal, pero es defensivo).
 */
export function OnboardingMap({
  blocks,
  completed,
  nextBlockKey,
  onStartNext,
  onSkip,
}: OnboardingMapProps) {
  const nextBlock = nextBlockKey
    ? blocks.find((b) => b.key === nextBlockKey)
    : null;
  const allDone = blocks.every((b) => completed[b.key]);

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
          Mapa de tests
        </span>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-10 page-enter md:px-8">
        <h1 className="text-xl font-bold leading-tight text-text-primary md:text-2xl">
          Estos son los 4 bloques de tu onboarding
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary md:text-base">
          Cada uno es corto. Puedes pausar entre bloques cuando quieras y
          retomar más tarde — guardamos tu progreso automáticamente.
        </p>

        <ul
          className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2"
          role="list"
          aria-label="Bloques del onboarding"
        >
          {blocks.map((block, index) => {
            const isDone = completed[block.key];
            const isNext = block.key === nextBlockKey;

            return (
              <li key={block.key}>
                <Card
                  shadow="none"
                  radius="lg"
                  className={[
                    "border bg-bg-surface transition-all",
                    isDone
                      ? "border-accent-primary/40 bg-accent-primary/5"
                      : isNext
                        ? "border-accent-secondary/40 shadow-glow-purple"
                        : "border-border-subtle",
                  ].join(" ")}
                >
                  <CardBody className="flex flex-col gap-3 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-text-secondary">
                          0{index + 1}
                        </span>
                        <h2 className="text-md font-bold text-text-primary">
                          {block.title}
                        </h2>
                      </div>
                      {isDone ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs font-medium text-accent-primary"
                          aria-label="Completado"
                        >
                          <CheckCircle2 size={12} strokeWidth={2.5} />
                          Completado
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-bg-input px-2 py-0.5 text-xs font-medium text-text-secondary"
                          aria-label="Pendiente"
                        >
                          <Circle size={10} strokeWidth={2.5} />
                          Pendiente
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-text-primary">
                      {block.subtitle}
                    </p>

                    <p className="font-mono text-xs text-text-secondary">
                      {block.questionsCount} preguntas · {block.estimatedMinutes}
                    </p>

                    <p className="text-sm leading-snug text-text-secondary">
                      {block.description}
                    </p>
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            onPress={onStartNext}
            isDisabled={allDone}
            radius="md"
            size="lg"
            endContent={<ArrowRight size={18} strokeWidth={2.5} />}
            className="bg-gradient-cta px-8 font-bold text-bg-deep shadow-glow-green data-[hover=true]:scale-[1.02]"
          >
            {allDone
              ? "Ya completaste todos los bloques"
              : nextBlock
                ? `Comenzar con ${nextBlock.title}`
                : "Comenzar"}
          </Button>
        </div>
      </section>
    </main>
  );
}
