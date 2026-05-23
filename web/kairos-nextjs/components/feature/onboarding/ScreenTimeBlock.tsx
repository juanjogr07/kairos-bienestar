"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  FileImage,
  ListChecks,
  Upload,
  X,
} from "lucide-react";
import { Button, Card, CardBody } from "@heroui/react";

import { Logo } from "@/components/shared/Logo";

import { ChoiceFlow, type ChoiceAnswers } from "./ChoiceFlow";
import { SCREEN_FREE_TEXT_IDS, SCREEN_QUESTIONS } from "./questions";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

export type ScreenBlockPayload =
  | { kind: "answers"; answers: ChoiceAnswers }
  | { kind: "capture"; file: File };

interface ScreenTimeBlockProps {
  initialAnswers?: ChoiceAnswers;
  onBackOutOfBlock: () => void;
  onComplete: (payload: ScreenBlockPayload) => void;
  onSkip?: () => void;
}

type Mode = "select" | "upload" | "questions";

/**
 * Bloque "Tiempo en pantalla" — último bloque del onboarding.
 *
 * Presenta primero una decisión binaria al usuario:
 *  - Opción A (captura): sube screenshot del screen-time del SO.
 *  - Opción B (preguntas): responde 5 preguntas vía `ChoiceFlow`.
 *
 * Emite `onComplete` con un payload discriminado para que el padre sepa qué
 * endpoint usar (`POST /api/v1/surveys/screen` JSON o multipart).
 */
export function ScreenTimeBlock({
  initialAnswers,
  onBackOutOfBlock,
  onComplete,
  onSkip,
}: ScreenTimeBlockProps) {
  const [mode, setMode] = useState<Mode>("select");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (mode === "questions") {
    return (
      <ChoiceFlow
        headerEyebrow="Tiempo en pantalla · Preguntas"
        intro="Sobre cómo usas tu teléfono normalmente"
        questions={SCREEN_QUESTIONS}
        freeTextIds={SCREEN_FREE_TEXT_IDS}
        initialAnswers={initialAnswers}
        onBackOutOfBlock={() => setMode("select")}
        onComplete={(answers) => onComplete({ kind: "answers", answers })}
        onSkip={onSkip}
      />
    );
  }

  if (mode === "upload") {
    return (
      <main className="relative flex min-h-screen flex-col bg-bg-deep">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-40"
          style={{
            background:
              "linear-gradient(180deg, rgba(123,111,240,0.12) 0%, transparent 100%)",
          }}
          aria-hidden="true"
        />

        <header className="relative z-10 flex items-center justify-between px-5 pt-6 md:px-8">
          <Logo size={28} />
          <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            Tiempo en pantalla · Captura
          </span>
        </header>

        <section className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-10 page-enter md:px-8">
          <h1 className="text-xl font-bold leading-tight text-text-primary md:text-2xl">
            Sube tu reporte de tiempo en pantalla
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary md:text-base">
            Adjunta una captura del reporte semanal de tu teléfono. Solo nos
            quedamos con la imagen para extraer minutos y apps; no la
            compartimos con nadie.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Card
              shadow="none"
              radius="md"
              className="border border-border-subtle bg-bg-surface"
            >
              <CardBody className="px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wider text-accent-secondary">
                  iOS
                </p>
                <p className="mt-2 text-sm leading-snug text-text-secondary">
                  Ajustes → Tiempo en pantalla → Ver toda la actividad.
                </p>
              </CardBody>
            </Card>
            <Card
              shadow="none"
              radius="md"
              className="border border-border-subtle bg-bg-surface"
            >
              <CardBody className="px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wider text-accent-secondary">
                  Android
                </p>
                <p className="mt-2 text-sm leading-snug text-text-secondary">
                  Bienestar digital → resumen semanal.
                </p>
              </CardBody>
            </Card>
          </div>

          <div className="mt-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0] ?? null;
                if (!selected) return;
                if (!ACCEPTED_TYPES.includes(selected.type)) {
                  setError("Solo se aceptan PNG o JPG.");
                  return;
                }
                if (selected.size > MAX_BYTES) {
                  setError("La imagen supera los 10 MB.");
                  return;
                }
                setError(null);
                setFile(selected);
              }}
            />

            {file ? (
              <Card
                shadow="none"
                radius="md"
                className="border border-accent-primary/40 bg-accent-primary/5"
              >
                <CardBody className="flex flex-row items-center gap-4 px-5 py-4">
                  <FileImage
                    size={32}
                    className="shrink-0 text-accent-primary"
                    strokeWidth={2}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {file.name}
                    </p>
                    <p className="font-mono text-xs text-text-secondary">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    isIconOnly
                    onPress={() => {
                      setFile(null);
                      if (fileInputRef.current)
                        fileInputRef.current.value = "";
                    }}
                    variant="light"
                    size="sm"
                    aria-label="Quitar imagen"
                    className="text-text-secondary data-[hover=true]:text-text-primary"
                  >
                    <X size={16} />
                  </Button>
                </CardBody>
              </Card>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border-active bg-bg-surface px-6 py-12 transition-colors hover:border-accent-primary hover:bg-accent-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-input">
                  <Upload size={22} className="text-accent-secondary" />
                </div>
                <p className="text-sm font-medium text-text-primary">
                  Haz clic para subir tu captura
                </p>
                <p className="text-xs text-text-secondary">
                  PNG o JPG · máximo 10 MB
                </p>
              </button>
            )}

            {error && (
              <p
                role="alert"
                className="mt-3 rounded-md border border-accent-danger/30 bg-accent-danger/10 px-3 py-2 text-sm text-accent-danger"
              >
                {error}
              </p>
            )}
          </div>
        </section>

        <footer className="sticky bottom-0 z-10 border-t border-border-subtle bg-bg-deep/80 px-5 py-4 backdrop-blur-md md:px-8">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
            <Button
              onPress={() => setMode("select")}
              variant="light"
              radius="md"
              size="md"
              startContent={<ArrowLeft size={16} />}
              className="text-text-secondary data-[hover=true]:text-text-primary"
            >
              Atrás
            </Button>
            {onSkip && (
              <Button
                onPress={onSkip}
                variant="light"
                radius="md"
                size="sm"
                className="hidden text-text-muted data-[hover=true]:text-text-secondary md:flex"
              >
                Omitir por ahora
              </Button>
            )}
            <Button
              onPress={() => {
                if (!file) return;
                onComplete({ kind: "capture", file });
              }}
              isDisabled={!file}
              radius="md"
              size="md"
              endContent={<ArrowRight size={16} strokeWidth={2.5} />}
              className={
                file
                  ? "bg-gradient-cta font-bold text-bg-deep shadow-glow-green data-[hover=true]:scale-[1.02]"
                  : "cursor-not-allowed bg-bg-input font-bold text-text-muted"
              }
            >
              Enviar captura
            </Button>
          </div>
          {onSkip && (
            <div className="mt-2 flex justify-center md:hidden">
              <Button
                onPress={onSkip}
                variant="light"
                radius="md"
                size="sm"
                className="text-text-muted data-[hover=true]:text-text-secondary"
              >
                Omitir por ahora
              </Button>
            </div>
          )}
        </footer>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-bg-deep">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-40"
        style={{
          background:
            "linear-gradient(180deg, rgba(123,111,240,0.12) 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <header className="relative z-10 flex items-center justify-between px-5 pt-6 md:px-8">
        <Logo size={28} />
        <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          Tiempo en pantalla · Elige cómo compartir
        </span>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-10 page-enter md:px-8">
        <h1 className="text-xl font-bold leading-tight text-text-primary md:text-2xl">
          ¿Cómo prefieres compartir tu uso de pantalla?
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary md:text-base">
          Elige una opción. Lo que ingreses solo se usa para entender tu
          baseline de uso y nunca se comparte con terceros.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className="group flex flex-col items-start gap-3 rounded-lg border border-border-subtle bg-bg-surface p-5 text-left transition-all hover:border-accent-primary hover:bg-accent-primary/5 hover:shadow-glow-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/10">
              <Camera size={22} className="text-accent-primary" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-accent-primary">
                Opción A · Recomendado
              </p>
              <h2 className="mt-1 text-md font-bold text-text-primary">
                Subir captura
              </h2>
              <p className="mt-2 text-sm leading-snug text-text-secondary">
                Mejor precisión. Sube una screenshot del reporte semanal de
                tu teléfono (iOS o Android).
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode("questions")}
            className="group flex flex-col items-start gap-3 rounded-lg border border-border-subtle bg-bg-surface p-5 text-left transition-all hover:border-accent-secondary hover:bg-accent-secondary/5 hover:shadow-glow-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-secondary/10">
              <ListChecks
                size={22}
                className="text-accent-secondary"
                strokeWidth={2.2}
              />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-accent-secondary">
                Opción B
              </p>
              <h2 className="mt-1 text-md font-bold text-text-primary">
                Responder preguntas
              </h2>
              <p className="mt-2 text-sm leading-snug text-text-secondary">
                5 preguntas rápidas si prefieres no subir una imagen.
              </p>
            </div>
          </button>
        </div>
      </section>

      <footer className="sticky bottom-0 z-10 border-t border-border-subtle bg-bg-deep/80 px-5 py-4 backdrop-blur-md md:px-8">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
          <Button
            onPress={onBackOutOfBlock}
            variant="light"
            radius="md"
            size="md"
            startContent={<ArrowLeft size={16} />}
            className="text-text-secondary data-[hover=true]:text-text-primary"
          >
            Atrás
          </Button>
          <span className="hidden text-xs text-text-muted md:inline">
            Selecciona una opción para continuar
          </span>
          {onSkip ? (
            <Button
              onPress={onSkip}
              variant="light"
              radius="md"
              size="sm"
              className="text-text-muted data-[hover=true]:text-text-secondary"
            >
              Omitir por ahora
            </Button>
          ) : (
            <span aria-hidden className="h-9 w-20" />
          )}
        </div>
      </footer>
    </main>
  );
}
