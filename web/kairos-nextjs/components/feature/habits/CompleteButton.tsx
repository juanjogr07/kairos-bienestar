"use client";

import { useRef } from "react";
import { Check } from "lucide-react";
import { Button } from "@heroui/react";

interface CompleteButtonProps {
  done: boolean;
  onComplete: (anchor: HTMLButtonElement | null) => void;
}

/**
 * Botón principal de "Completar hoy" para una Habit Card.
 *
 * Reemplaza el `<button>` nativo + clases manuales por el `Button` de HeroUI,
 * conservando el comportamiento de animación de confetti al activar.
 */
export function CompleteButton({ done, onComplete }: CompleteButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <Button
      ref={ref}
      onPress={() => onComplete(ref.current)}
      startContent={<Check size={16} strokeWidth={3} />}
      variant={done ? "solid" : "bordered"}
      radius="md"
      size="md"
      className={
        done
          ? "border-2 border-accent-primary bg-accent-primary font-bold text-bg-deep shadow-glow-green"
          : "border-2 border-accent-primary/60 font-bold text-accent-primary data-[hover=true]:bg-accent-primary/10"
      }
    >
      {done ? "Completado" : "Completar hoy"}
    </Button>
  );
}
