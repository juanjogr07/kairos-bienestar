"use client";

import { AlertTriangle, Phone } from "lucide-react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";

interface CrisisModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal de crisis — derivación a Línea 106 (Colombia).
 *
 * IMPORTANTE (legal/clínico): cuando PHQ-9 ≥ 15 o GAD-7 ≥ 15 este flujo debe
 * mostrarse SIN llamar al LLM. Ver `docs/CLAUDE.md` y el spec de bienestar.
 *
 * Reemplaza el overlay manual full-screen por `Modal` de HeroUI con backdrop
 * blur, focus trap y cierre por Esc.
 */
export function CrisisModal({ open, onClose }: CrisisModalProps) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      backdrop="blur"
      placement="center"
      size="md"
      hideCloseButton
      classNames={{
        base: "bg-gradient-crisis border border-accent-danger/30",
        body: "text-center px-6",
      }}
    >
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader className="flex flex-col items-center gap-4 pt-8">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full"
                style={{
                  background: "rgba(255,77,106,0.12)",
                  boxShadow: "0 0 40px rgba(255,77,106,0.45)",
                }}
                aria-hidden
              >
                <AlertTriangle
                  size={48}
                  className="text-accent-danger"
                  strokeWidth={1.8}
                />
              </div>
              <h2 className="text-xl font-bold text-text-primary">
                He notado señales que merecen atención
              </h2>
            </ModalHeader>

            <ModalBody className="space-y-5">
              <p className="text-base leading-relaxed text-text-secondary">
                No tienes que pasar esto solo/a. Hay personas entrenadas para
                escucharte ahora mismo, sin juzgarte.
              </p>

              <div className="rounded-lg border border-accent-danger/30 bg-accent-danger/5 p-5 text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-danger/20">
                    <Phone size={22} className="text-accent-danger" />
                  </div>
                  <div>
                    <p className="font-bold text-text-primary">
                      Línea 106 — Colombia
                    </p>
                    <p className="text-xs text-text-secondary">
                      Gratuita · 24h · Confidencial
                    </p>
                  </div>
                </div>
              </div>
            </ModalBody>

            <ModalFooter className="flex-col gap-3 sm:flex-row">
              <Button
                onPress={close}
                variant="bordered"
                radius="md"
                size="lg"
                fullWidth
                className="border-border-active bg-bg-elevated font-bold text-text-primary data-[hover=true]:border-text-secondary"
              >
                Tengo apoyo
              </Button>
              <Button
                as="a"
                href="tel:106"
                radius="md"
                size="lg"
                fullWidth
                startContent={<Phone size={16} strokeWidth={2.5} />}
                className="bg-accent-danger font-bold text-text-primary shadow-md data-[hover=true]:scale-[1.02]"
              >
                Llamar ahora
              </Button>
            </ModalFooter>

            <p className="px-6 pb-6 text-center text-xs text-text-muted">
              (Demo · pulsa "Tengo apoyo" para volver al chat)
            </p>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
