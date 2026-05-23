import Link from "next/link";
import { ScoreBadge, type Severity } from "@/components/shared/ScoreBadge";

interface WellbeingScoresProps {
  phq9: { score: number; severity: Severity };
  gad7: { score: number; severity: Severity };
}

export function WellbeingScores({ phq9, gad7 }: WellbeingScoresProps) {
  return (
    <section
      className="mt-7 animate-fade-up"
      style={{ animationDelay: "500ms" }}
    >
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-md font-bold text-text-primary">
          Tu bienestar reciente
        </h2>
        <Link
          href="/profile"
          className="text-xs font-medium text-text-secondary hover:text-accent-primary"
        >
          Historial
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ScoreBadge test="PHQ-9" score={phq9.score} severity={phq9.severity} />
        <ScoreBadge test="GAD-7" score={gad7.score} severity={gad7.severity} />
      </div>
    </section>
  );
}
