"use client";

import { Chip } from "@heroui/react";

interface QuickRepliesProps {
  replies: string[];
  onSelect: (reply: string) => void;
}

/**
 * Lista horizontal de respuestas rápidas.
 *
 * Antes eran `<button>` con clases pill manuales; ahora cada reply es un
 * `Chip` clickable de HeroUI (`onClick`), que ya maneja focus visible y
 * accesibilidad como botón.
 */
export function QuickReplies({ replies, onSelect }: QuickRepliesProps) {
  return (
    <div className="mx-auto flex max-w-2xl gap-2 overflow-x-auto pb-2">
      {replies.map((q, i) => (
        <Chip
          key={q}
          onClick={() => onSelect(q)}
          variant="bordered"
          radius="full"
          size="md"
          classNames={{
            base: "shrink-0 animate-fade-up cursor-pointer border-border-active bg-bg-elevated text-text-primary transition-all hover:border-accent-primary hover:text-accent-primary",
            content: "text-xs font-medium",
          }}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {q}
        </Chip>
      ))}
    </div>
  );
}
