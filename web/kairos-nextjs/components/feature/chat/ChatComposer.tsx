"use client";

import { FormEvent } from "react";
import { Send } from "lucide-react";
import { Button, Input } from "@heroui/react";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

/**
 * Caja de composición del chat (input + botón enviar).
 *
 * - `Input` de HeroUI maneja focus glow vía `data-[focus=true]` y permite
 *   asociar fácilmente label/placeholder.
 * - El botón es un `Button` redondeado con gradiente CTA.
 */
export function ChatComposer({ value, onChange, onSend }: ChatComposerProps) {
  const isEmpty = !value.trim();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isEmpty) onSend();
  };

  return (
    <form
      className="mx-auto flex max-w-2xl items-center gap-2 pb-3"
      onSubmit={handleSubmit}
    >
      <Input
        value={value}
        onValueChange={onChange}
        placeholder="Escribe un mensaje a Kairós…"
        aria-label="Mensaje para Kairós"
        radius="full"
        variant="bordered"
        classNames={{
          base: "flex-1",
          input:
            "text-base text-text-primary placeholder:text-text-muted",
          inputWrapper:
            "bg-bg-input border-border-subtle data-[hover=true]:border-border-active data-[focus=true]:border-accent-secondary data-[focus=true]:shadow-glow-purple",
        }}
      />
      <Button
        type="submit"
        isIconOnly
        isDisabled={isEmpty}
        radius="full"
        size="lg"
        aria-label="Enviar"
        className="h-12 w-12 shrink-0 bg-gradient-cta text-bg-deep shadow-glow-green data-[hover=true]:scale-105 data-[disabled=true]:opacity-50"
      >
        <Send size={18} strokeWidth={2.5} />
      </Button>
    </form>
  );
}
