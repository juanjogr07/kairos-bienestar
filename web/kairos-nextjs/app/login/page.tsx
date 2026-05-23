"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase";
import {
  AUTH_VALIDATION_RULES,
  humanizeAuthError,
  validateLoginInput } from "@/config/auth-errors";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

type Mode = "login" | "register";
type FieldName = "email" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const particles = useMemo(
    () =>
      Array.from({ length: 24 }).map(() => ({
        left: Math.random() * 100,
        delay: Math.random() * 12,
        duration: 12 + Math.random() * 10,
        size: 2 + Math.random() * 4,
      })),
    []
  );

  function clearErrors() {
    setError(null);
    setFieldErrors({});
  }

  function clearFieldError(field: FieldName) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (error) setError(null);
  }

  function switchMode(next: Mode) {
    if (loading) return;
    setMode(next);
    clearErrors();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    clearErrors();

    const validation = validateLoginInput(email, password);
    if (!validation.valid) {
      setError(validation.message ?? null);
      setFieldErrors(validation.fieldErrors ?? {});
      return;
    }

    setLoading(true);

    try {
      if (USE_MOCK) {
        // Simula latencia de red para que la UX se sienta real durante QA.
        await new Promise((resolve) => setTimeout(resolve, 600));
        router.push(mode === "register" ? "/onboarding/phq9" : "/dashboard");
        router.refresh();
        return;
      }

      const supabase = createClient();

      if (mode === "register") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        router.push("/onboarding/phq9");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push("/dashboard");
      }
      router.refresh();
    } catch (err) {
      setError(humanizeAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-brand px-5 py-10">
      <div className="particles" aria-hidden="true">
        {particles.map((p, i) => (
          <span
            key={i}
            style={{
              left: `${p.left}%`,
              bottom: "-20px",
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #4FFFB0, transparent)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-1/4 h-80 w-80 rounded-full opacity-15 blur-3xl"
        style={{ background: "radial-gradient(circle, #7B6FF0, transparent)" }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md page-enter">
        <div className="mb-8 flex flex-col items-center">
          <Logo size={48} />
          <p className="mt-4 text-center text-md text-text-secondary">
            Tu copiloto de bienestar digital
          </p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-bg-surface p-7 shadow-lg">
          <div
            className="mb-6 grid grid-cols-2 rounded-full bg-bg-input p-1"
            role="tablist"
            aria-label="Cambiar entre iniciar sesión y registrarse"
          >
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                disabled={loading}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                  mode === m
                    ? "bg-bg-elevated text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {m === "login" ? "Iniciar sesión" : "Registrarse"}
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Field
              icon={<Mail size={18} />}
              type="email"
              name="email"
              autoComplete="email"
              placeholder="tu@email.com"
              label="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
              disabled={loading}
              required
              error={fieldErrors.email}
            />
            <Field
              icon={<Lock size={18} />}
              type="password"
              name="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder={`Mínimo ${AUTH_VALIDATION_RULES.password.minLength} caracteres`}
              label="Contraseña"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError("password");
              }}
              disabled={loading}
              required
              error={fieldErrors.password}
            />

            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2 rounded-md border border-[color:var(--accent-danger)]/40 bg-[color:var(--accent-danger)]/10 px-3 py-2.5 text-sm text-text-danger"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-md bg-gradient-cta px-6 py-3.5 font-bold text-bg-deep shadow-glow-green transition-transform hover:scale-[1.02] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {mode === "login" ? "Entrando..." : "Creando cuenta..."}
                </>
              ) : (
                <>
                  {mode === "login" ? "Entrar" : "Crear cuenta"}
                  <ArrowRight
                    size={18}
                    strokeWidth={2.5}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </>
              )}
            </button>

            {USE_MOCK && (
              <p className="text-center text-xs text-text-muted">
                Modo mock activo · cualquier email válido y contraseña ≥{" "}
                {AUTH_VALIDATION_RULES.password.minLength} caracteres entra.
              </p>
            )}
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          <a href="#" className="hover:text-text-secondary">
            Privacidad
          </a>{" "}
          ·{" "}
          <a href="#" className="hover:text-text-secondary">
            Términos
          </a>
        </p>
      </div>
    </main>
  );
}

interface FieldProps {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

function Field({
  icon,
  type,
  placeholder,
  label,
  value,
  onChange,
  name,
  autoComplete,
  disabled,
  required,
  error,
}: FieldProps) {
  const errorId = error ? `${name ?? label}-error` : undefined;

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-text-secondary">
        {label}
      </span>
      <div
        className={`group relative flex items-center rounded-md border bg-bg-input transition-colors ${
          error
            ? "border-[color:var(--accent-danger)]/60 focus-within:border-[color:var(--accent-danger)]"
            : "border-border-subtle focus-within:border-accent-secondary focus-within:shadow-glow-purple"
        }`}
      >
        <span
          className={`pl-3 ${
            error
              ? "text-text-danger"
              : "text-text-muted group-focus-within:text-accent-secondary"
          }`}
        >
          {icon}
        </span>
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className="w-full bg-transparent px-3 py-3 text-base text-text-primary placeholder:text-text-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
      {error && (
        <span
          id={errorId}
          className="mt-1.5 block text-xs text-text-danger"
          role="alert"
        >
          {error}
        </span>
      )}
    </label>
  );
}
