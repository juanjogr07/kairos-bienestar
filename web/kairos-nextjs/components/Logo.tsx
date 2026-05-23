import { Sparkles } from "lucide-react";

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
}

export function Logo({ size = 32, showWordmark = true }: LogoProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex items-center justify-center rounded-md bg-gradient-cta shadow-glow-green"
        style={{ width: size, height: size }}
      >
        <Sparkles
          className="text-bg-deep"
          size={size * 0.55}
          strokeWidth={2.5}
        />
      </div>
      {showWordmark && (
        <span
          className="font-bold tracking-tight"
          style={{ fontSize: size * 0.6 }}
        >
          Kairós
        </span>
      )}
    </div>
  );
}

export function StarMark({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-block ${className}`}
      style={{ width: size, height: size, lineHeight: 1, fontSize: size }}
    >
      ✦
    </span>
  );
}
