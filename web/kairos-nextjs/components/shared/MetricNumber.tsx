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
