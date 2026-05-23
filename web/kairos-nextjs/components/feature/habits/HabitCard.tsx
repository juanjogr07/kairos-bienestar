"use client";

import { Flame, Sparkles } from "lucide-react";
import { Card, CardBody, Chip } from "@heroui/react";

import { CompleteButton } from "./CompleteButton";
import type { Habit } from "./types";

interface HabitCardProps {
  habit: Habit;
  index: number;
  onComplete: (id: string, anchor: HTMLButtonElement | null) => void;
}

export function HabitCard({ habit, index, onComplete }: HabitCardProps) {
  return (
    <li>
      <Card
        shadow="none"
        radius="lg"
        className={`animate-fade-up border transition-all ${
          habit.done
            ? "border-accent-primary/40 bg-accent-primary/5"
            : "border-border-subtle bg-bg-surface data-[hover=true]:border-border-active"
        }`}
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <CardBody className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3
                className={`text-md font-bold leading-snug ${
                  habit.done ? "text-text-secondary" : "text-text-primary"
                }`}
              >
                {habit.name}
              </h3>

              {habit.recommended && (
                <Chip
                  size="sm"
                  startContent={<Sparkles size={10} />}
                  classNames={{
                    base: "mt-2 bg-accent-secondary/15 text-accent-secondary",
                    content: "text-[11px] font-medium",
                  }}
                >
                  Recomendado por Kairós
                </Chip>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                <Chip
                  size="sm"
                  startContent={<Flame size={12} strokeWidth={2.5} />}
                  classNames={{
                    base: "bg-gradient-streak text-bg-deep shadow-sm",
                    content: "font-mono text-xs font-bold",
                  }}
                >
                  {habit.streak} días
                </Chip>
                <span className="text-xs text-text-muted">
                  Récord:{" "}
                  <span className="font-mono text-text-secondary">
                    {habit.best} días
                  </span>
                </span>
                <span className="text-xs text-text-muted">
                  {habit.freq === "daily" ? "Diario" : "Semanal"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <CompleteButton
              done={habit.done}
              onComplete={(anchor) => onComplete(habit.id, anchor)}
            />
          </div>

          {habit.done && (
            <p className="mt-3 animate-fade-up text-xs text-accent-primary">
              ¡{habit.streak} días seguidos! Sigue así.
            </p>
          )}
        </CardBody>
      </Card>
    </li>
  );
}
