"use client";

import { ArrowLeft, AlertTriangle } from "lucide-react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";

interface OnboardingSkipModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Modal de confirmación cuando el usuario quiere omitir el onboarding.
 *
 * Aparece desde cualquier punto del flujo (intro, mapa, dentro de un bloque,
 * transición). Si confirma, se le lleva al dashboard en modo preview; si
 * cancela, el modal se cierra y el flujo continúa donde estaba.
 */
export function OnboardingSkipModal({
  open,
  onCancel,
  onConfirm,
}: OnboardingSkipModalProps) {
  return (
    <Modal
      isOpen={open}
      onClose={onCancel}
      backdrop="blur"
      placement="center"
      size="md"
      hideCloseButton
      classNames={{
        base: "border border-accent-warm/30 bg-bg-surface",
        body: "px-6",
      }}
    >
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader className="flex flex-col items-center gap-4 pt-8">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  background: "rgba(255,159,90,0.12)",
                  boxShadow: "0 0 32px rgba(255,159,90,0.35)",
                }}
                aria-hidden
              >
                <AlertTriangle
                  size={32}
                  className="text-accent-warm"
                  strokeWidth={2}
                />
              </div>
              <h2 className="text-xl font-bold text-text-primary">
                ¿Seguro que quieres omitir?
              </h2>
            </ModalHeader>

            <ModalBody className="space-y-4">
              <p className="text-base leading-relaxed text-text-secondary">
                Sin completar el onboarding, los agentes de Kairós no tendrán
                el contexto necesario para acompañarte. Podrás ver la
                plataforma en modo preview, pero las recomendaciones
                personalizadas, los hábitos y el chat con los agentes estarán
                bloqueados hasta que lo completes.
              </p>
            </ModalBody>

            <ModalFooter className="flex-col gap-3 pb-6 sm:flex-row">
              <Button
                onPress={() => {
                  close();
                  onCancel();
                }}
                variant="bordered"
                radius="md"
                size="lg"
                fullWidth
                startContent={<ArrowLeft size={16} strokeWidth={2.5} />}
                className="border-border-active bg-bg-elevated font-bold text-text-primary data-[hover=true]:border-text-secondary"
              >
                Volver al onboarding
              </Button>
              <Button
                onPress={() => {
                  close();
                  onConfirm();
                }}
                radius="md"
                size="lg"
                fullWidth
                className="bg-accent-warm font-bold text-bg-deep data-[hover=true]:scale-[1.02]"
              >
                Sí, omitir por ahora
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
