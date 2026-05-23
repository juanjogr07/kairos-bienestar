import { Flame } from "lucide-react";
import { StarMark } from "./Logo";

export function StreakBadge({ days }: { days: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-streak px-3 py-1 text-bg-deep shadow-sm">
      <Flame size={14} strokeWidth={2.5} />
      <span className="font-mono text-sm font-bold leading-none">
        {days} días
      </span>
    </span>
  );
}

export function InsightChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="insight-border-left inline-flex items-center gap-2 rounded-md bg-bg-elevated px-4 py-2 pl-5 text-sm">
      <StarMark size={14} className="text-accent-secondary" />
      <span className="text-text-primary">{children}</span>
    </span>
  );
}

type Severity = "minimo" | "leve" | "moderado" | "severo";

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

export function ScoreBadge({
  test,
  score,
  severity,
}: {
  test: "PHQ-9" | "GAD-7";
  score: number;
  severity: Severity;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-bg-surface px-5 py-4">
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
    </div>
  );
}

export function MetricNumber({
  value,
  label,
  color = "text-accent-primary",
}: {
  value: string | number;
  label: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className={`font-mono text-3xl font-bold leading-none ${color}`}>
        {value}
      </span>
      <span className="mt-2 text-sm text-text-secondary">{label}</span>
    </div>
  );
}
