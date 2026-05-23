"use client";

import { Progress } from "@heroui/react";

interface OnboardingProgressProps {
  current: number;
  total: number;
  value: number;
}

/**
 * Barra de progreso del onboarding (PHQ-9 / GAD-7).
 *
 * Sustituye el `<div>` con `style.width` por `Progress` de HeroUI, que ya
 * trae rol `progressbar`, `aria-valuenow/max` y animación suave.
 */
export function OnboardingProgress({
  current,
  total,
  value,
}: OnboardingProgressProps) {
  return (
    <div className="relative z-10 mx-auto mt-6 flex w-full max-w-2xl items-center gap-3 px-5 md:px-8">
      <Progress
        aria-label="Progreso del cuestionario"
        value={value}
        size="sm"
        radius="full"
        classNames={{
          base: "flex-1",
          track: "bg-bg-input",
          indicator:
            "bg-accent-primary shadow-glow-green transition-[width] duration-500 ease-spring",
        }}
      />
      <span className="font-mono text-xs text-text-secondary">
        {current} / {total}
      </span>
    </div>
  );
}
