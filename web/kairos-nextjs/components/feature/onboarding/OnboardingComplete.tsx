"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button, Card, CardBody } from "@heroui/react";

import { severityFromScore } from "@/components/shared/ScoreBadge";

const SEVERITY_LABEL: Record<ReturnType<typeof severityFromScore>, string> = {
  minimo: "Mínimo",
  leve: "Leve",
  moderado: "Moderado",
  severo: "Severo",
};

interface OnboardingCompleteProps {
  phqScore: number;
  gadScore: number;
}

export function OnboardingComplete({
  phqScore,
  gadScore,
}: OnboardingCompleteProps) {
  const router = useRouter();
  const phqSev = severityFromScore(phqScore);
  const gadSev = severityFromScore(gadScore);

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
          Gracias por compartir tu momento actual. Voy a estar acompañándote con
          datos vivos y sugerencias suaves. Sin juicios.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <Card
            shadow="none"
            radius="lg"
            className="border border-border-subtle bg-bg-surface"
          >
            <CardBody className="p-4 text-left">
              <span className="text-xs font-medium text-text-secondary">
                PHQ-9
              </span>
              <p className="mt-1 font-mono text-2xl font-bold text-accent-primary">
                {phqScore}
              </p>
              <p className="text-xs text-text-secondary">
                {SEVERITY_LABEL[phqSev]}
              </p>
            </CardBody>
          </Card>
          <Card
            shadow="none"
            radius="lg"
            className="border border-border-subtle bg-bg-surface"
          >
            <CardBody className="p-4 text-left">
              <span className="text-xs font-medium text-text-secondary">
                GAD-7
              </span>
              <p className="mt-1 font-mono text-2xl font-bold text-accent-secondary">
                {gadScore}
              </p>
              <p className="text-xs text-text-secondary">
                {SEVERITY_LABEL[gadSev]}
              </p>
            </CardBody>
          </Card>
        </div>

        <Button
          onPress={() => router.push("/dashboard")}
          size="lg"
          radius="md"
          endContent={<ArrowRight size={18} strokeWidth={2.5} />}
          className="mt-8 bg-gradient-cta px-8 font-bold text-bg-deep shadow-glow-green data-[hover=true]:scale-[1.02]"
        >
          Ir a tu Dashboard
        </Button>
      </div>
    </main>
  );
}
