import { Flame } from "lucide-react";
import { Chip } from "@heroui/react";

interface StreakBadgeProps {
  days: number;
  size?: "sm" | "md";
}

/**
 * Badge de racha (días seguidos cumpliendo un hábito).
 *
 * Usa el componente Chip de HeroUI para tener semántica + accesibilidad,
 * pero conserva el gradiente cálido propio de Kairós vía `classNames.base`.
 */
export function StreakBadge({ days, size = "md" }: StreakBadgeProps) {
  return (
    <Chip
      size={size}
      startContent={<Flame size={size === "sm" ? 12 : 14} strokeWidth={2.5} />}
      classNames={{
        base: "bg-gradient-streak text-bg-deep shadow-sm",
        content: "font-mono font-bold",
      }}
    >
      {days} días
    </Chip>
  );
}
