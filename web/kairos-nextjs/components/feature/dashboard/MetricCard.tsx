"use client";

import { Card, CardBody } from "@heroui/react";
import { LucideIcon } from "lucide-react";
import { useCountUp } from "./useCountUp";

interface MetricCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  /** Token Tailwind del color del valor + icono (ej: "text-accent-primary"). */
  accent: string;
  /** Color base del fondo del icono en formato rgba. */
  iconBg: string;
  animate?: boolean;
}

/**
 * Card métrica del dashboard (minutos de uso, hábitos completados, etc).
 *
 * Antes era un `<div>` con borde manual; ahora usa `Card` de HeroUI por
 * accesibilidad y consistencia (estados hover/press desde el design system).
 */
export function MetricCard({
  icon: Icon,
  value,
  label,
  accent,
  iconBg,
  animate = true,
}: MetricCardProps) {
  const animated = useCountUp(value, animate ? 800 : 0);
  const display = animate ? animated : value;

  return (
    <Card
      shadow="none"
      radius="lg"
      className="border border-border-subtle bg-bg-surface"
    >
      <CardBody className="flex flex-row items-start gap-3 p-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
          style={{ background: iconBg }}
        >
          <Icon size={20} className={accent} />
        </div>
        <div>
          <p className={`font-mono text-2xl font-bold ${accent}`}>{display}</p>
          <p className="text-sm text-text-secondary">{label}</p>
        </div>
      </CardBody>
    </Card>
  );
}
