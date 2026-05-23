"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");

  const particles = Array.from({ length: 24 }).map((_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 12,
    duration: 12 + Math.random() * 10,
    size: 2 + Math.random() * 4,
  }));

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-brand px-5 py-10">
      {/* Floating particles */}
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

      {/* Soft glow blobs */}
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
          {/* Pill toggle */}
          <div
            className="mb-6 grid grid-cols-2 rounded-full bg-bg-input p-1"
            role="tablist"
          >
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  mode === m
                    ? "bg-bg-elevated text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {m === "login" ? "Iniciar sesión" : "Registrarse"}
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <Field
              icon={<Mail size={18} />}
              type="email"
              placeholder="tu@email.com"
              label="Email"
            />
            <Field
              icon={<Lock size={18} />}
              type="password"
              placeholder="••••••••"
              label="Contraseña"
            />

            <Link
              href="/onboarding"
              className="group flex w-full items-center justify-center gap-2 rounded-md bg-gradient-cta px-6 py-3.5 font-bold text-bg-deep shadow-glow-green transition-transform hover:scale-[1.02] active:scale-[0.99]"
            >
              {mode === "login" ? "Entrar" : "Crear cuenta"}
              <ArrowRight
                size={18}
                strokeWidth={2.5}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
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

function Field({
  icon,
  type,
  placeholder,
  label,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-text-secondary">
        {label}
      </span>
      <div className="group relative flex items-center rounded-md border border-border-subtle bg-bg-input transition-colors focus-within:border-accent-secondary focus-within:shadow-glow-purple">
        <span className="pl-3 text-text-muted group-focus-within:text-accent-secondary">
          {icon}
        </span>
        <input
          type={type}
          placeholder={placeholder}
          className="w-full bg-transparent px-3 py-3 text-base text-text-primary placeholder:text-text-muted focus:outline-none"
        />
      </div>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.13 4.13 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.87 2.69-6.61z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.34A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A8.94 8.94 0 0 0 9 0 9 9 0 0 0 .96 4.96L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}
