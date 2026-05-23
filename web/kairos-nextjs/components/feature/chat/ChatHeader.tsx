"use client";

import Link from "next/link";
import { ArrowLeft, MoreHorizontal, Sparkles } from "lucide-react";
import { Button } from "@heroui/react";

interface ChatHeaderProps {
  onOpenOptions: () => void;
}

export function ChatHeader({ onOpenOptions }: ChatHeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b border-border-subtle px-5 py-4 md:px-8">
      <Button
        as={Link}
        href="/dashboard"
        isIconOnly
        variant="light"
        radius="full"
        size="md"
        aria-label="Volver"
        className="text-text-secondary data-[hover=true]:bg-bg-surface data-[hover=true]:text-text-primary md:hidden"
      >
        <ArrowLeft size={20} />
      </Button>

      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-cta shadow-glow-green">
        <Sparkles size={18} className="text-bg-deep" strokeWidth={2.5} />
      </div>

      <div className="flex-1">
        <p className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
          Kairós <span className="text-accent-secondary">✦</span>
        </p>
        <p className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="dot-active inline-block h-1.5 w-1.5 rounded-full bg-accent-primary" />
          Activo ahora
        </p>
      </div>

      <Button
        isIconOnly
        variant="light"
        radius="full"
        size="md"
        onPress={onOpenOptions}
        aria-label="Más opciones"
        title="Demo: simular alerta de crisis"
        className="text-text-secondary data-[hover=true]:bg-bg-surface data-[hover=true]:text-text-primary"
      >
        <MoreHorizontal size={20} />
      </Button>
    </header>
  );
}
