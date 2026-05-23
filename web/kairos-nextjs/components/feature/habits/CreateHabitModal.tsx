"use client";

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tab,
  Tabs,
} from "@heroui/react";

import type { HabitFrequency } from "./types";

interface CreateHabitModalProps {
  open: boolean;
  name: string;
  freq: HabitFrequency;
  onNameChange: (name: string) => void;
  onFreqChange: (freq: HabitFrequency) => void;
  onClose: () => void;
  onCreate: () => void;
}

/**
 * Modal/Bottom-sheet para crear un nuevo hábito.
 *
 * Reemplaza el overlay manual con backdrop blur por `Modal` de HeroUI, que ya
 * trae:
 *   - Backdrop "blur"
 *   - Focus trap + cierre con Esc
 *   - Animación slide-up en mobile y centrado en desktop
 *   - `placement="bottom"` mobile-friendly
 */
export function CreateHabitModal({
  open,
  name,
  freq,
  onNameChange,
  onFreqChange,
  onClose,
  onCreate,
}: CreateHabitModalProps) {
  const canCreate = name.trim().length > 0;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      backdrop="blur"
      placement="bottom-center"
      radius="lg"
      size="md"
      classNames={{
        base: "bg-bg-elevated border border-border-subtle md:max-w-md",
        header: "border-b-0 pb-0",
        body: "py-4",
        footer: "border-t-0 pt-0",
        closeButton:
          "text-text-secondary hover:bg-bg-surface hover:text-text-primary",
      }}
    >
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-lg font-bold text-text-primary">
                Nuevo hábito
              </h2>
              <p className="text-xs text-text-secondary">
                Pequeño y específico funciona mejor que ambicioso.
              </p>
            </ModalHeader>

            <ModalBody>
              <Input
                label="Nombre del hábito"
                labelPlacement="outside"
                placeholder="Ej: 10 min de lectura sin pantalla"
                value={name}
                onValueChange={onNameChange}
                autoFocus
                variant="bordered"
                radius="md"
                classNames={{
                  label: "text-xs font-medium text-text-secondary",
                  input:
                    "text-base text-text-primary placeholder:text-text-muted",
                  inputWrapper:
                    "bg-bg-input border-border-subtle data-[hover=true]:border-border-active data-[focus=true]:border-accent-secondary data-[focus=true]:shadow-glow-purple",
                }}
              />

              <div>
                <span className="mb-2 block text-xs font-medium text-text-secondary">
                  Frecuencia
                </span>
                <Tabs
                  aria-label="Frecuencia del hábito"
                  selectedKey={freq}
                  onSelectionChange={(key) =>
                    onFreqChange(key as HabitFrequency)
                  }
                  fullWidth
                  radius="full"
                  size="md"
                  classNames={{
                    tabList: "bg-bg-input p-1",
                    cursor: "bg-bg-elevated shadow-sm",
                    tabContent:
                      "text-text-secondary group-data-[selected=true]:text-text-primary font-medium",
                  }}
                >
                  <Tab key="daily" title="Diario" />
                  <Tab key="weekly" title="Semanal" />
                </Tabs>
              </div>
            </ModalBody>

            <ModalFooter>
              <Button
                onPress={() => {
                  onCreate();
                  close();
                }}
                isDisabled={!canCreate}
                size="lg"
                radius="md"
                fullWidth
                className={
                  canCreate
                    ? "bg-gradient-cta font-bold text-bg-deep shadow-glow-green data-[hover=true]:scale-[1.01]"
                    : "cursor-not-allowed bg-bg-input font-bold text-text-muted"
                }
              >
                Crear hábito
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
