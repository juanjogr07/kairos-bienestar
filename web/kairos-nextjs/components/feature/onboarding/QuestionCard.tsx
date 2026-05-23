"use client";

import { Check } from "lucide-react";
import { Radio, RadioGroup } from "@heroui/react";

import type { SurveyOption } from "./questions";

interface QuestionCardProps {
  intro: string;
  question: string;
  options: SurveyOption[];
  value: number | null;
  onChange: (value: number) => void;
  phaseKey: string;
  step: number;
}

/**
 * Card con la pregunta + opciones del onboarding clínico (PHQ-9/GAD-7).
 *
 * Reemplaza la lista de `<button>` por `RadioGroup` de HeroUI: un grupo
 * semánticamente correcto (rol radiogroup, aria-checked, navegación con
 * flechas) que renderiza cada opción como `Radio` con contenido custom.
 */
export function QuestionCard({
  intro,
  question,
  options,
  value,
  onChange,
  phaseKey,
  step,
}: QuestionCardProps) {
  return (
    <div
      key={`${phaseKey}-${step}`}
      className="relative z-10 mx-auto mt-12 flex w-full max-w-2xl flex-1 flex-col px-5 page-enter md:px-8"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-accent-secondary">
        {intro}
      </p>
      <h2 className="mt-3 text-xl font-bold leading-snug text-text-primary md:text-2xl">
        {question}
      </h2>

      <RadioGroup
        aria-label={question}
        value={value === null ? "" : String(value)}
        onValueChange={(v) => onChange(Number(v))}
        className="mt-8 gap-3"
        classNames={{ wrapper: "gap-3" }}
      >
        {options.map((opt) => (
          <Radio
            key={opt.value}
            value={String(opt.value)}
            classNames={{
              base: [
                "max-w-full m-0",
                "inline-flex items-center w-full justify-start",
                "rounded-md border px-5 py-4 text-left transition-all",
                "border-border-subtle bg-bg-surface",
                "data-[hover=true]:border-border-active",
                "data-[selected=true]:border-accent-primary data-[selected=true]:bg-accent-primary/10 data-[selected=true]:shadow-glow-green",
              ].join(" "),
              wrapper: "hidden",
              labelWrapper: "ml-0 w-full",
              label: "w-full",
            }}
          >
            <span className="flex w-full items-center gap-4">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono font-bold transition-colors ${
                  value === opt.value
                    ? "bg-accent-primary text-bg-deep"
                    : "bg-bg-input text-text-secondary"
                }`}
              >
                {opt.value}
              </span>
              <span
                className={`flex-1 text-base ${
                  value === opt.value ? "text-text-primary" : "text-text-secondary"
                }`}
              >
                {opt.label}
              </span>
              {value === opt.value && (
                <Check
                  size={20}
                  className="text-accent-primary animate-bounce-soft"
                  strokeWidth={3}
                />
              )}
            </span>
          </Radio>
        ))}
      </RadioGroup>
    </div>
  );
}
