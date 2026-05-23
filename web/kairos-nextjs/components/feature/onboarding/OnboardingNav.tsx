"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@heroui/react";

interface OnboardingNavProps {
  isFirst: boolean;
  isFinal: boolean;
  canContinue: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function OnboardingNav({
  isFirst,
  isFinal,
  canContinue,
  onBack,
  onNext,
}: OnboardingNavProps) {
  return (
    <footer className="sticky bottom-0 z-10 border-t border-border-subtle bg-bg-deep/80 px-5 py-4 backdrop-blur-md md:px-8">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
        <Button
          onPress={onBack}
          isDisabled={isFirst}
          variant="light"
          radius="md"
          size="md"
          startContent={<ArrowLeft size={16} />}
          className="text-text-secondary data-[hover=true]:text-text-primary data-[disabled=true]:opacity-30"
        >
          Atrás
        </Button>

        <Button
          onPress={onNext}
          isDisabled={!canContinue}
          endContent={<ArrowRight size={16} strokeWidth={2.5} />}
          radius="md"
          size="md"
          className={
            canContinue
              ? "bg-gradient-cta font-bold text-bg-deep shadow-glow-green data-[hover=true]:scale-[1.02]"
              : "cursor-not-allowed bg-bg-input font-bold text-text-muted"
          }
        >
          {isFinal ? "Finalizar" : "Siguiente"}
        </Button>
      </div>
    </footer>
  );
}
