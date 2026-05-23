"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
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
          Completaste los 4 bloques. Voy a estar acompañándote con datos
          vivos y sugerencias suaves, basadas en lo que me contaste. Sin
          juicios.
        </p>

        <ul
          className="mt-6 flex flex-wrap justify-center gap-2"
          aria-label="Bloques completados"
        >
          {["PHQ-9", "GAD-7", "Hábitos", "Pantalla"].map((label) => (
            <li
              key={label}
              className="inline-flex items-center gap-1 rounded-full border border-accent-primary/30 bg-accent-primary/10 px-3 py-1 text-xs font-medium text-accent-primary"
            >
              <CheckCircle2 size={12} strokeWidth={2.5} />
              {label}
            </li>
          ))}
        </ul>

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
