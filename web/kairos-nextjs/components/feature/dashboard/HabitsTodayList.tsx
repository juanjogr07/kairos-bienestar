"use client";

import Link from "next/link";
import { Check, Flame } from "lucide-react";
import { Card, CardBody, Checkbox, Chip } from "@heroui/react";

export interface HabitToday {
  id: string;
  text: string;
  streak: number;
  done: boolean;
}

interface HabitsTodayListProps {
  habits: HabitToday[];
  onToggle?: (id: string, done: boolean) => void;
}

/**
 * Lista de hábitos del día (versión compacta del dashboard).
 *
 * Usa `Checkbox` de HeroUI con render custom (`icon`) para preservar el look
 * con glow verde. La accesibilidad queda a cargo del componente (rol checkbox,
 * estado aria-checked, manejo de teclado).
 */
export function HabitsTodayList({ habits, onToggle }: HabitsTodayListProps) {
  return (
    <section
      className="mt-7 animate-fade-up"
      style={{ animationDelay: "400ms" }}
    >
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-md font-bold text-text-primary">Hábitos de hoy</h2>
        <Link
          href="/habits"
          className="text-xs font-medium text-accent-primary hover:underline"
        >
          Ver todos
        </Link>
      </div>

      <ul className="space-y-3">
        {habits.map((h) => (
          <li key={h.id}>
            <Card
              shadow="none"
              radius="lg"
              className="border border-border-subtle bg-bg-surface"
            >
              <CardBody className="flex flex-row items-center gap-3 p-4">
                <Checkbox
                  isSelected={h.done}
                  onValueChange={(value) => onToggle?.(h.id, value)}
                  aria-label={
                    h.done
                      ? `Marcar "${h.text}" como pendiente`
                      : `Marcar "${h.text}" como completado`
                  }
                  size="lg"
                  radius="full"
                  classNames={{
                    base: "items-center p-0 m-0",
                    wrapper:
                      "h-7 w-7 border-2 border-border-subtle group-data-[selected=true]:border-accent-primary group-data-[selected=true]:bg-accent-primary group-data-[selected=true]:shadow-glow-green",
                    icon: "text-bg-deep",
                  }}
                  icon={<Check size={14} strokeWidth={3} />}
                />
                <span
                  className={`flex-1 text-sm ${
                    h.done
                      ? "text-text-secondary line-through decoration-accent-primary/50"
                      : "text-text-primary"
                  }`}
                >
                  {h.text}
                </span>
                <Chip
                  size="sm"
                  startContent={<Flame size={12} strokeWidth={2.5} />}
                  classNames={{
                    base: "bg-accent-warm/15 text-accent-warm",
                    content: "font-mono font-bold",
                  }}
                >
                  {h.streak}
                </Chip>
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
