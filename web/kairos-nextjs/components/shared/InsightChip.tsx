import { StarMark } from "./Logo";

export function InsightChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="insight-border-left inline-flex items-center gap-2 rounded-md bg-bg-elevated px-4 py-2 pl-5 text-sm">
      <StarMark size={14} className="text-accent-secondary" />
      <span className="text-text-primary">{children}</span>
    </span>
  );
}
