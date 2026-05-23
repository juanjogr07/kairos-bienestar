"use client";

import { AlertCircle } from "lucide-react";

interface AuthErrorAlertProps {
  message: string;
}

/**
 * Alerta inline para errores de autenticación.
 * Aislada del LoginForm para reutilizar en otras pantallas auth (reset password, etc).
 */
export function AuthErrorAlert({ message }: AuthErrorAlertProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-2 rounded-md border border-accent-danger/40 bg-accent-danger/10 px-3 py-2.5 text-sm text-accent-danger"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
