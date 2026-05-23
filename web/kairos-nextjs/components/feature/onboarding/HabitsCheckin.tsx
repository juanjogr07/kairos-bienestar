"use client";

import { ChoiceFlow, type ChoiceAnswers } from "./ChoiceFlow";
import { HABITS_QUESTIONS } from "./questions";

interface HabitsCheckinProps {
  initialAnswers?: ChoiceAnswers;
  onBackOutOfBlock: () => void;
  onComplete: (answers: ChoiceAnswers) => void;
  onSkip?: () => void;
}

/**
 * Bloque "Hábitos digitales" — check-in inicial sobre sueño, energía,
 * concentración y rutinas alimentarias. 5 preguntas de opción única.
 *
 * Es un wrapper fino sobre `ChoiceFlow` con el copy específico del bloque.
 */
export function HabitsCheckin({
  initialAnswers,
  onBackOutOfBlock,
  onComplete,
  onSkip,
}: HabitsCheckinProps) {
  return (
    <ChoiceFlow
      headerEyebrow="Hábitos digitales · Check-in"
      intro="Cuéntanos cómo está tu día a día"
      questions={HABITS_QUESTIONS}
      initialAnswers={initialAnswers}
      onBackOutOfBlock={onBackOutOfBlock}
      onComplete={onComplete}
      onSkip={onSkip}
    />
  );
}
