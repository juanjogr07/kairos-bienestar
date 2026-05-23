"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/shared/Logo";

import { OnboardingProgress } from "./OnboardingProgress";
import { QuestionCard } from "./QuestionCard";
import { OnboardingNav } from "./OnboardingNav";
import { OnboardingComplete } from "./OnboardingComplete";
import { OnboardingIntro } from "./OnboardingIntro";
import { OnboardingMap } from "./OnboardingMap";
import { OnboardingTransition } from "./OnboardingTransition";
import { OnboardingSkipModal } from "./OnboardingSkipModal";
import { HabitsCheckin } from "./HabitsCheckin";
import {
  ScreenTimeBlock,
  type ScreenBlockPayload,
} from "./ScreenTimeBlock";
import type { ChoiceAnswers } from "./ChoiceFlow";
import {
  GAD7,
  ONBOARDING_BLOCKS,
  PHQ9,
  SURVEY_OPTIONS,
  type BlockKey,
} from "./questions";
import { submitScreenCapture, submitSurvey } from "@/lib/api";

const STORAGE_KEY = "kairos:onboarding:v1";
const SKIPPED_KEY = "kairos:onboarding:skipped";

type Phase =
  | { kind: "intro" }
  | { kind: "map" }
  | { kind: "phq9"; step: number }
  | { kind: "gad7"; step: number }
  | { kind: "habits" }
  | { kind: "screen" }
  | { kind: "transition"; fromKey: BlockKey; toKey: BlockKey }
  | { kind: "complete" };

interface PersistedState {
  schemaVersion: 1;
  phase: Phase;
  phqAnswers: (number | null)[];
  gadAnswers: (number | null)[];
  habitsAnswers: ChoiceAnswers;
  screenAnswers: ChoiceAnswers;
  completed: Record<BlockKey, boolean>;
}

const INITIAL_STATE: PersistedState = {
  schemaVersion: 1,
  phase: { kind: "intro" },
  phqAnswers: Array(PHQ9.length).fill(null),
  gadAnswers: Array(GAD7.length).fill(null),
  habitsAnswers: {},
  screenAnswers: {},
  completed: { phq9: false, gad7: false, habits: false, screen: false },
};

function readPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed?.schemaVersion !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersisted(state: PersistedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage puede estar lleno o deshabilitado; ignorar.
  }
}

function clearSkipped() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SKIPPED_KEY);
  } catch {
    /* noop */
  }
}

function markSkipped() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SKIPPED_KEY, "1");
  } catch {
    /* noop */
  }
}

/**
 * Determina el siguiente bloque pendiente. Si todos están completos, retorna
 * `null` y la fase "complete" debería activarse.
 */
function nextPendingBlock(
  completed: Record<BlockKey, boolean>
): BlockKey | null {
  for (const block of ONBOARDING_BLOCKS) {
    if (!completed[block.key]) return block.key;
  }
  return null;
}

/**
 * Vista principal del onboarding. Orquesta:
 *   intro → mapa → bloque (×4 con transiciones intermedias) → complete.
 *
 * Persiste el progreso en `localStorage` para que el usuario pueda salir y
 * retomar exactamente donde lo dejó. Cada bloque envía sus respuestas a
 * `POST /api/v1/surveys/{type}` en el momento en que se completa, sin
 * esperar al final.
 */
export function OnboardingView() {
  const router = useRouter();
  const [state, setState] = useState<PersistedState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const [submitting, setSubmitting] = useState<BlockKey | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const lastPersisted = useRef<string>("");

  useEffect(() => {
    const persisted = readPersisted();
    if (persisted) setState(persisted);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const serialized = JSON.stringify(state);
    if (serialized === lastPersisted.current) return;
    lastPersisted.current = serialized;
    writePersisted(state);
  }, [state, hydrated]);

  const blockMetaByKey = useMemo(() => {
    return Object.fromEntries(
      ONBOARDING_BLOCKS.map((b) => [b.key, b])
    ) as Record<BlockKey, (typeof ONBOARDING_BLOCKS)[number]>;
  }, []);

  const openSkip = useCallback(() => setSkipOpen(true), []);
  const closeSkip = useCallback(() => setSkipOpen(false), []);

  const handleConfirmSkip = useCallback(() => {
    markSkipped();
    setSkipOpen(false);
    router.push("/dashboard");
  }, [router]);

  const handlePauseToDashboard = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const advanceAfterBlock = useCallback((finishedKey: BlockKey) => {
    setState((prev) => {
      const nextCompleted = { ...prev.completed, [finishedKey]: true };
      const nextKey = nextPendingBlock(nextCompleted);
      const nextPhase: Phase =
        nextKey === null
          ? { kind: "complete" }
          : { kind: "transition", fromKey: finishedKey, toKey: nextKey };
      return { ...prev, completed: nextCompleted, phase: nextPhase };
    });
    clearSkipped();
  }, []);

  const submitClinical = useCallback(
    async (
      type: "phq9" | "gad7",
      answers: (number | null)[]
    ): Promise<boolean> => {
      const responses = Object.fromEntries(
        answers.map((v, i) => [`q${i + 1}`, v ?? 0])
      );
      const total = answers.reduce<number>((s, v) => s + (v ?? 0), 0);
      setSubmitting(type);
      setSubmitError(null);
      try {
        await submitSurvey(type, responses, total);
        return true;
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : `No se pudo guardar ${type.toUpperCase()}.`
        );
        return false;
      } finally {
        setSubmitting(null);
      }
    },
    []
  );

  const handlePhqComplete = useCallback(async () => {
    const ok = await submitClinical("phq9", state.phqAnswers);
    if (ok) advanceAfterBlock("phq9");
  }, [state.phqAnswers, submitClinical, advanceAfterBlock]);

  const handleGadComplete = useCallback(async () => {
    const ok = await submitClinical("gad7", state.gadAnswers);
    if (ok) advanceAfterBlock("gad7");
  }, [state.gadAnswers, submitClinical, advanceAfterBlock]);

  const handleHabitsComplete = useCallback(
    async (answers: ChoiceAnswers) => {
      setState((prev) => ({ ...prev, habitsAnswers: answers }));
      setSubmitting("habits");
      setSubmitError(null);
      try {
        await submitSurvey("habits", answers, null);
        advanceAfterBlock("habits");
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : "No se pudo guardar el bloque de hábitos."
        );
      } finally {
        setSubmitting(null);
      }
    },
    [advanceAfterBlock]
  );

  const handleScreenComplete = useCallback(
    async (payload: ScreenBlockPayload) => {
      setSubmitting("screen");
      setSubmitError(null);
      try {
        if (payload.kind === "capture") {
          await submitScreenCapture(payload.file);
        } else {
          setState((prev) => ({ ...prev, screenAnswers: payload.answers }));
          await submitSurvey("screen", payload.answers, null);
        }
        advanceAfterBlock("screen");
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : "No se pudo guardar el bloque de tiempo en pantalla."
        );
      } finally {
        setSubmitting(null);
      }
    },
    [advanceAfterBlock]
  );

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg-deep">
        <div className="flex flex-col items-center gap-3" aria-busy="true">
          <Logo size={32} />
          <p className="font-mono text-xs text-text-secondary">Cargando…</p>
        </div>
      </main>
    );
  }

  const { phase } = state;

  if (phase.kind === "intro") {
    return (
      <>
        <OnboardingIntro
          onStart={() =>
            setState((prev) => ({ ...prev, phase: { kind: "map" } }))
          }
          onSkip={openSkip}
        />
        <OnboardingSkipModal
          open={skipOpen}
          onCancel={closeSkip}
          onConfirm={handleConfirmSkip}
        />
      </>
    );
  }

  if (phase.kind === "map") {
    const next = nextPendingBlock(state.completed);
    return (
      <>
        <OnboardingMap
          blocks={ONBOARDING_BLOCKS}
          completed={state.completed}
          nextBlockKey={next}
          onStartNext={() => {
            if (!next) {
              setState((prev) => ({ ...prev, phase: { kind: "complete" } }));
              return;
            }
            setState((prev) => ({
              ...prev,
              phase:
                next === "phq9" || next === "gad7"
                  ? { kind: next, step: 0 }
                  : next === "habits"
                    ? { kind: "habits" }
                    : { kind: "screen" },
            }));
          }}
          onSkip={openSkip}
        />
        <OnboardingSkipModal
          open={skipOpen}
          onCancel={closeSkip}
          onConfirm={handleConfirmSkip}
        />
      </>
    );
  }

  if (phase.kind === "transition") {
    const justCompleted = blockMetaByKey[phase.fromKey];
    const nextBlock = blockMetaByKey[phase.toKey];
    return (
      <>
        <OnboardingTransition
          justCompleted={justCompleted}
          nextBlock={nextBlock}
          onContinue={() => {
            setState((prev) => ({
              ...prev,
              phase:
                phase.toKey === "phq9" || phase.toKey === "gad7"
                  ? { kind: phase.toKey, step: 0 }
                  : phase.toKey === "habits"
                    ? { kind: "habits" }
                    : { kind: "screen" },
            }));
          }}
          onPause={handlePauseToDashboard}
        />
        <OnboardingSkipModal
          open={skipOpen}
          onCancel={closeSkip}
          onConfirm={handleConfirmSkip}
        />
      </>
    );
  }

  if (phase.kind === "complete") {
    clearSkipped();
    const phqScore = state.phqAnswers.reduce<number>(
      (s, v) => s + (v ?? 0),
      0
    );
    const gadScore = state.gadAnswers.reduce<number>(
      (s, v) => s + (v ?? 0),
      0
    );
    return <OnboardingComplete phqScore={phqScore} gadScore={gadScore} />;
  }

  if (phase.kind === "habits") {
    return (
      <>
        <HabitsCheckin
          initialAnswers={state.habitsAnswers}
          onBackOutOfBlock={() =>
            setState((prev) => ({ ...prev, phase: { kind: "map" } }))
          }
          onComplete={handleHabitsComplete}
          onSkip={openSkip}
        />
        {submitting === "habits" && <SubmitOverlay />}
        {submitError && submitting === null && (
          <ErrorToast message={submitError} onClose={() => setSubmitError(null)} />
        )}
        <OnboardingSkipModal
          open={skipOpen}
          onCancel={closeSkip}
          onConfirm={handleConfirmSkip}
        />
      </>
    );
  }

  if (phase.kind === "screen") {
    return (
      <>
        <ScreenTimeBlock
          initialAnswers={state.screenAnswers}
          onBackOutOfBlock={() =>
            setState((prev) => ({ ...prev, phase: { kind: "map" } }))
          }
          onComplete={handleScreenComplete}
          onSkip={openSkip}
        />
        {submitting === "screen" && <SubmitOverlay />}
        {submitError && submitting === null && (
          <ErrorToast message={submitError} onClose={() => setSubmitError(null)} />
        )}
        <OnboardingSkipModal
          open={skipOpen}
          onCancel={closeSkip}
          onConfirm={handleConfirmSkip}
        />
      </>
    );
  }

  // phase es "phq9" o "gad7": flujo clínico paginado pregunta-a-pregunta.
  const isPhq = phase.kind === "phq9";
  const questions = isPhq ? PHQ9 : GAD7;
  const answers = isPhq ? state.phqAnswers : state.gadAnswers;
  const total = questions.length;
  const step = phase.step;
  const current = answers[step];
  const intro =
    "En las últimas 2 semanas, ¿con qué frecuencia te has sentido afectado/a por…";
  const progress = ((step + (current !== null ? 1 : 0)) / total) * 100;
  const headerEyebrow = isPhq
    ? "PHQ-9 · Estado de ánimo"
    : "GAD-7 · Ansiedad";

  const setClinicalAnswer = (value: number) => {
    setState((prev) => {
      const arr = [...(isPhq ? prev.phqAnswers : prev.gadAnswers)];
      arr[step] = value;
      return isPhq
        ? { ...prev, phqAnswers: arr }
        : { ...prev, gadAnswers: arr };
    });
  };

  const goToStep = (next: number) => {
    setState((prev) => ({
      ...prev,
      phase: isPhq
        ? { kind: "phq9", step: next }
        : { kind: "gad7", step: next },
    }));
  };

  const handleNext = () => {
    if (step < total - 1) {
      goToStep(step + 1);
      return;
    }
    if (isPhq) {
      void handlePhqComplete();
    } else {
      void handleGadComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      goToStep(step - 1);
      return;
    }
    setState((prev) => ({ ...prev, phase: { kind: "map" } }));
  };

  return (
    <>
      <main className="flex min-h-screen flex-col bg-bg-deep">
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
            {headerEyebrow}
          </span>
        </header>

        <OnboardingProgress
          current={step + 1}
          total={total}
          value={progress}
        />

        <QuestionCard
          intro={intro}
          question={questions[step]}
          options={SURVEY_OPTIONS}
          value={current}
          onChange={setClinicalAnswer}
          phaseKey={phase.kind}
          step={step}
        />

        <OnboardingNav
          isFirst={false}
          isFinal={step === total - 1}
          canContinue={current !== null && submitting === null}
          onBack={handleBack}
          onNext={handleNext}
          onSkip={openSkip}
        />
      </main>

      {submitting === phase.kind && <SubmitOverlay />}
      {submitError && submitting === null && (
        <ErrorToast
          message={submitError}
          onClose={() => setSubmitError(null)}
        />
      )}
      <OnboardingSkipModal
        open={skipOpen}
        onCancel={closeSkip}
        onConfirm={handleConfirmSkip}
      />
    </>
  );
}

/**
 * Overlay no-bloqueante para feedback visual mientras se envía un bloque.
 */
function SubmitOverlay() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-40 flex items-center justify-center bg-bg-deep/60 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-3 rounded-md border border-border-subtle bg-bg-surface px-6 py-5 shadow-lg">
        <span className="h-3 w-3 animate-pulse-glow rounded-full bg-accent-primary" />
        <p className="font-mono text-xs text-text-secondary">
          Guardando tus respuestas…
        </p>
      </div>
    </div>
  );
}

interface ErrorToastProps {
  message: string;
  onClose: () => void;
}

function ErrorToast({ message, onClose }: ErrorToastProps) {
  return (
    <div
      role="alert"
      className="fixed bottom-24 left-1/2 z-40 w-[min(90vw,420px)] -translate-x-1/2 rounded-md border border-accent-danger/40 bg-accent-danger/10 px-4 py-3 text-sm text-text-primary shadow-md backdrop-blur-md"
    >
      <p className="font-medium">No pudimos guardar el bloque.</p>
      <p className="mt-1 text-text-secondary">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 text-xs font-medium uppercase tracking-wider text-accent-danger hover:underline"
      >
        Entendido
      </button>
    </div>
  );
}
