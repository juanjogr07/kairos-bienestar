"use client";

import { Bell, ChevronRight, Globe, Moon } from "lucide-react";
import { Card, Listbox, ListboxItem } from "@heroui/react";

interface SettingItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}

const SETTINGS: SettingItem[] = [
  {
    key: "notifications",
    icon: <Bell size={18} />,
    label: "Notificaciones",
    value: "Activadas · suaves",
  },
  {
    key: "timezone",
    icon: <Globe size={18} />,
    label: "Zona horaria",
    value: "GMT-5 · Bogotá",
  },
  {
    key: "theme",
    icon: <Moon size={18} />,
    label: "Tema",
    value: "Oscuro",
  },
];

/**
 * Lista de configuraciones del perfil.
 *
 * Sustituye los `<button>` apilados manualmente por `Listbox` de HeroUI:
 * obtienes navegación con teclado, separadores, selección y `aria-*` listos.
 */
export function SettingsList() {
  return (
    <Card
      shadow="none"
      radius="lg"
      className="overflow-hidden border border-border-subtle bg-bg-surface"
    >
      <Listbox
        aria-label="Configuración del perfil"
        variant="flat"
        classNames={{
          base: "p-0",
          list: "gap-0",
        }}
        itemClasses={{
          base: [
            "rounded-none py-4 px-5",
            "data-[hover=true]:bg-bg-elevated",
            "border-b border-border-subtle last:border-b-0",
          ].join(" "),
          title: "text-sm font-medium text-text-primary",
          description: "text-xs text-text-secondary",
        }}
      >
        {SETTINGS.map((s) => (
          <ListboxItem
            key={s.key}
            startContent={<span className="text-text-secondary">{s.icon}</span>}
            endContent={
              <span className="flex items-center gap-3">
                <span className="text-xs text-text-secondary">{s.value}</span>
                <ChevronRight size={16} className="text-text-muted" />
              </span>
            }
          >
            {s.label}
          </ListboxItem>
        ))}
      </Listbox>
    </Card>
  );
}
