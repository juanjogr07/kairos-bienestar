"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, X } from "lucide-react";

import { ONBOARDING_BLOCKS, type BlockKey } from "./questions";

const STORAGE_KEY = "kairos:onboarding:v1";
const SKIPPED_KEY = "kairos:onboarding:skipped";
const DISMISSED_KEY = "kairos:onboarding:banner-dismissed";

interface PersistedState {
  schemaVersion?: number;
  completed?: Record<BlockKey, boolean>;
}

/**
 * Banner persistente que se muestra en el dashboard mientras el onboarding
 * esté incompleto (sea porque el usuario lo omitió o porque lo pausó a la
 * mitad).
 *
 * Lee el estado del onboarding desde `localStorage` (la misma clave que usa
 * `OnboardingView`). Cuando los 4 bloques estén completados desaparece de
 * forma permanente; el usuario también puede minimizarlo temporalmente con
 * la X (vuelve a aparecer en la próxima sesión).
 */
export function OnboardingIncompleteBanner() {
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const computePending = (): number => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          return window.localStorage.getItem(SKIPPED_KEY) !== null
            ? ONBOARDING_BLOCKS.length
            : ONBOARDING_BLOCKS.length;
        }
        const parsed = JSON.parse(raw) as PersistedState;
        const completed: Partial<Record<BlockKey, boolean>> =
          parsed.completed ?? {};
        return ONBOARDING_BLOCKS.filter((b) => !completed[b.key]).length;
      } catch {
        return ONBOARDING_BLOCKS.length;
      }
    };

    setPendingCount(computePending());
    setDismissed(window.sessionStorage.getItem(DISMISSED_KEY) === "1");
  }, []);

  if (pendingCount === null || pendingCount === 0 || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 flex items-start gap-3 rounded-md border border-accent-warm/30 bg-accent-warm/5 px-4 py-3 animate-fade-up"
    >
      <AlertTriangle
        size={18}
        className="mt-0.5 shrink-0 text-accent-warm"
        strokeWidth={2.4}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-text-primary">
          Tu onboarding está incompleto. Los agentes aún no tienen suficiente
          contexto para acompañarte.{" "}
          <span className="font-mono text-xs text-text-secondary">
            ({ONBOARDING_BLOCKS.length - pendingCount}/
            {ONBOARDING_BLOCKS.length} bloques)
          </span>
        </p>
        <Link
          href="/onboarding"
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent-warm hover:underline"
        >
          Completar ahora
          <ArrowRight size={12} strokeWidth={2.5} />
        </Link>
      </div>

      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined") {
            try {
              window.sessionStorage.setItem(DISMISSED_KEY, "1");
            } catch {
              /* noop */
            }
          }
          setDismissed(true);
        }}
        aria-label="Cerrar aviso"
        className="shrink-0 rounded-full p-1 text-text-secondary transition-colors hover:bg-bg-input hover:text-text-primary"
      >
        <X size={14} strokeWidth={2.4} />
      </button>
    </div>
  );
}
