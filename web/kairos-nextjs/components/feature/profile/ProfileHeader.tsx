"use client";

import { Avatar } from "@heroui/react";

interface ProfileHeaderProps {
  name: string;
  subtitle: string;
  initial?: string;
}

/**
 * Cabecera del perfil con avatar.
 *
 * Reemplaza el `<div>` con gradiente manual por `Avatar` de HeroUI: maneja
 * fallback de inicial, accesibilidad alt y consistencia visual.
 */
export function ProfileHeader({ name, subtitle, initial }: ProfileHeaderProps) {
  const fallback = initial ?? (name.trim().charAt(0).toUpperCase() || "?");

  return (
    <header className="flex items-center gap-4 animate-fade-up">
      <Avatar
        name={fallback}
        size="lg"
        radius="full"
        classNames={{
          base: "h-16 w-16 text-bg-deep shadow-glow-green",
          name: "font-mono text-xl font-bold",
          img: "",
        }}
        style={{
          background: "linear-gradient(135deg, #4FFFB0 0%, #7B6FF0 100%)",
        }}
      />
      <div>
        <h1 className="text-xl font-bold text-text-primary">{name}</h1>
        <p className="text-sm text-text-secondary">{subtitle}</p>
      </div>
    </header>
  );
}
