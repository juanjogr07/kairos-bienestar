"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { Button, Card, CardBody, Input } from "@heroui/react";

import { Logo } from "@/components/shared/Logo";
import { createClient } from "@/lib/supabase";
import {
  AUTH_VALIDATION_RULES,
  humanizeAuthError,
  validateLoginInput,
} from "@/config/auth-errors";

import { AuthModeTabs, type AuthMode } from "./AuthModeTabs";
import { AuthErrorAlert } from "./AuthErrorAlert";
import { AuthParticles } from "./AuthParticles";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

type FieldName = "email" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

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

  function switchMode(next: AuthMode) {
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
        router.push(mode === "register" ? "/onboarding" : "/dashboard");
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
        router.push("/onboarding");
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
      <AuthParticles />

      <div className="relative z-10 w-full max-w-md page-enter">
        <div className="mb-8 flex flex-col items-center">
          <Logo size={48} />
          <p className="mt-4 text-center text-md text-text-secondary">
            Tu copiloto de bienestar digital
          </p>
        </div>

        <Card
          shadow="lg"
          radius="lg"
          className="border border-border-subtle bg-bg-surface"
        >
          <CardBody className="p-7">
            <AuthModeTabs mode={mode} onChange={switchMode} disabled={loading} />

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <Input
                type="email"
                name="email"
                label="Email"
                labelPlacement="outside"
                placeholder="tu@email.com"
                autoComplete="email"
                value={email}
                onValueChange={(value) => {
                  setEmail(value);
                  clearFieldError("email");
                }}
                isDisabled={loading}
                isRequired
                isInvalid={Boolean(fieldErrors.email)}
                errorMessage={fieldErrors.email}
                startContent={
                  <Mail
                    size={18}
                    className="shrink-0 text-text-muted"
                    aria-hidden
                  />
                }
                variant="bordered"
                radius="md"
                classNames={{
                  label: "text-xs font-medium text-text-secondary",
                  input: "text-base text-text-primary placeholder:text-text-muted",
                  inputWrapper:
                    "bg-bg-input border-border-subtle data-[hover=true]:border-border-active data-[focus=true]:border-accent-secondary data-[focus=true]:shadow-glow-purple group-data-[invalid=true]:border-accent-danger",
                }}
              />

              <Input
                type="password"
                name="password"
                label="Contraseña"
                labelPlacement="outside"
                placeholder={`Mínimo ${AUTH_VALIDATION_RULES.password.minLength} caracteres`}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onValueChange={(value) => {
                  setPassword(value);
                  clearFieldError("password");
                }}
                isDisabled={loading}
                isRequired
                isInvalid={Boolean(fieldErrors.password)}
                errorMessage={fieldErrors.password}
                startContent={
                  <Lock
                    size={18}
                    className="shrink-0 text-text-muted"
                    aria-hidden
                  />
                }
                variant="bordered"
                radius="md"
                classNames={{
                  label: "text-xs font-medium text-text-secondary",
                  input: "text-base text-text-primary placeholder:text-text-muted",
                  inputWrapper:
                    "bg-bg-input border-border-subtle data-[hover=true]:border-border-active data-[focus=true]:border-accent-secondary data-[focus=true]:shadow-glow-purple group-data-[invalid=true]:border-accent-danger",
                }}
              />

              {error && <AuthErrorAlert message={error} />}

              <Button
                type="submit"
                isDisabled={loading}
                isLoading={loading}
                spinner={<Loader2 size={18} className="animate-spin" />}
                endContent={
                  !loading && (
                    <ArrowRight
                      size={18}
                      strokeWidth={2.5}
                      className="transition-transform group-data-[hover=true]:translate-x-0.5"
                    />
                  )
                }
                size="lg"
                radius="md"
                fullWidth
                className="bg-gradient-cta font-bold text-bg-deep shadow-glow-green data-[hover=true]:scale-[1.02] data-[pressed=true]:scale-[0.99]"
              >
                {loading
                  ? mode === "login"
                    ? "Entrando..."
                    : "Creando cuenta..."
                  : mode === "login"
                    ? "Entrar"
                    : "Crear cuenta"}
              </Button>

              {USE_MOCK && (
                <p className="text-center text-xs text-text-muted">
                  Modo mock activo · cualquier email válido y contraseña ≥{" "}
                  {AUTH_VALIDATION_RULES.password.minLength} caracteres entra.
                </p>
              )}
            </form>
          </CardBody>
        </Card>

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
