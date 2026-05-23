import { Card, CardBody } from "@heroui/react";

export type Severity = "minimo" | "leve" | "moderado" | "severo";

const severityColor: Record<Severity, string> = {
  minimo: "text-accent-primary",
  leve: "text-accent-warm",
  moderado: "text-accent-moderate",
  severo: "text-accent-danger",
};

const severityLabel: Record<Severity, string> = {
  minimo: "Mínimo",
  leve: "Leve",
  moderado: "Moderado",
  severo: "Severo",
};

interface ScoreBadgeProps {
  test: "PHQ-9" | "GAD-7";
  score: number;
  severity: Severity;
}

/**
 * Badge clínico para mostrar el resultado de PHQ-9 / GAD-7.
 *
 * Recordatorio: estos son indicadores de *triaje*, NO diagnóstico.
 */
export function ScoreBadge({ test, score, severity }: ScoreBadgeProps) {
  return (
    <Card
      shadow="none"
      className="border border-border-subtle bg-bg-surface"
      radius="lg"
    >
      <CardBody className="flex flex-col items-center justify-center px-5 py-4">
        <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          {test}
        </span>
        <span
          className={`font-mono text-2xl font-bold leading-tight ${severityColor[severity]}`}
        >
          {score}
        </span>
        <span className="text-xs text-text-secondary">
          {severityLabel[severity]}
        </span>
      </CardBody>
    </Card>
  );
}

export function severityFromScore(score: number): Severity {
  if (score < 5) return "minimo";
  if (score < 10) return "leve";
  if (score < 15) return "moderado";
  return "severo";
}
