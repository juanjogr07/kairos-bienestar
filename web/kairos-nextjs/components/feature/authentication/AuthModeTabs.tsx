"use client";

import { Tabs, Tab } from "@heroui/react";

export type AuthMode = "login" | "register";

interface AuthModeTabsProps {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
  disabled?: boolean;
}

/**
 * Tabs para alternar entre inicio de sesión y registro.
 *
 * Antes era un grid 2-cols con `<button>` nativos manejando `role="tab"`.
 * Ahora usa el componente `Tabs/Tab` de HeroUI que entrega accesibilidad,
 * navegación por teclado y animación del cursor sin código extra.
 */
export function AuthModeTabs({ mode, onChange, disabled }: AuthModeTabsProps) {
  return (
    <Tabs
      aria-label="Cambiar entre iniciar sesión y registrarse"
      selectedKey={mode}
      onSelectionChange={(key) => onChange(key as AuthMode)}
      isDisabled={disabled}
      fullWidth
      size="md"
      radius="full"
      classNames={{
        base: "mb-6",
        tabList: "bg-bg-input p-1",
        cursor: "bg-bg-elevated shadow-sm",
        tab: "data-[hover-unselected=true]:opacity-100",
        tabContent:
          "text-text-secondary group-data-[selected=true]:text-text-primary font-medium",
      }}
    >
      <Tab key="login" title="Iniciar sesión" />
      <Tab key="register" title="Registrarse" />
    </Tabs>
  );
}
