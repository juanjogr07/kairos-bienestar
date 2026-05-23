"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Particles are fixed values to avoid SSR/hydration mismatch
  const particles = [
    { left: 21.9, delay: 5.08, duration: 13.6, size: 5.85 },
    { left: 45.6, delay: 0.59, duration: 16.6, size: 5.60 },
    { left: 67.3, delay: 3.20, duration: 14.2, size: 3.40 },
    { left: 12.5, delay: 8.10, duration: 15.8, size: 4.20 },
    { left: 80.1, delay: 1.70, duration: 18.3, size: 2.90 },
    { left: 55.4, delay: 6.30, duration: 12.9, size: 6.10 },
    { left: 33.7, delay: 9.50, duration: 17.1, size: 3.70 },
    { left: 91.2, delay: 2.40, duration: 13.4, size: 4.80 },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Completa todos los campos.");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    try {
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      } else {
        const { error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error de autenticación";
      if (msg.includes("Invalid login")) {
        setError("Email o contraseña incorrectos.");
      } else if (msg.includes("already registered")) {
        setError("Este email ya tiene una cuenta. Inicia sesión.");
      } else {
        setError(msg);
      }
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
          >
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => { setMode(m); setError(""); }}
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

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field
              icon={<Mail size={18} />}
              type="email"
              placeholder="tu@email.com"
              label="Email"
              value={email}
              onChange={setEmail}
            />
            <Field
              icon={<Lock size={18} />}
              type="password"
              placeholder="••••••••"
              label="Contraseña"
              value={password}
              onChange={setPassword}
            />

            {error && (
              <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-md bg-gradient-cta px-6 py-3.5 font-bold text-bg-deep shadow-glow-green transition-transform hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-bg-deep border-t-transparent" />
              ) : (
                <>
                  {mode === "login" ? "Entrar" : "Crear cuenta"}
                  <ArrowRight size={18} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          <a href="#" className="hover:text-text-secondary">Privacidad</a>
          {" · "}
          <a href="#" className="hover:text-text-secondary">Términos</a>
        </p>
      </div>
    </main>
  );
}

function Field({
  icon, type, placeholder, label, value, onChange,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-text-secondary">{label}</span>
      <div className="group relative flex items-center rounded-md border border-border-subtle bg-bg-input transition-colors focus-within:border-accent-secondary focus-within:shadow-glow-purple">
        <span className="pl-3 text-text-muted group-focus-within:text-accent-secondary">{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-3 py-3 text-base text-text-primary placeholder:text-text-muted focus:outline-none"
        />
      </div>
    </label>
  );
}
