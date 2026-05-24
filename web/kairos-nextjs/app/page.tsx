"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

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
    <>
      <div className="ambient" aria-hidden="true" />
      <main
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
        }}
      >
        <div
          className="fade-up delay-1"
          style={{ width: "100%", maxWidth: 420 }}
        >
          {/* Logo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: "linear-gradient(135deg, #0ea5a5 0%, #2563eb 100%)",
                display: "grid",
                placeItems: "center",
                color: "#fff",
                boxShadow: "0 8px 20px -10px rgba(14,165,165,.6), inset 0 0 0 1px rgba(255,255,255,.2)",
                marginBottom: 14,
              }}
            >
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: 30, lineHeight: 1, letterSpacing: "-0.02em" }}>
                K
              </span>
            </div>
            <h1 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400, fontSize: 32, letterSpacing: "-0.02em", margin: "0 0 6px", color: "var(--ink)", textAlign: "center" }}>
              Kairós
            </h1>
            <p style={{ fontSize: 14, color: "var(--muted)", margin: 0, textAlign: "center" }}>
              Tu copiloto de bienestar digital
            </p>
          </div>

          {/* Card */}
          <div
            style={{
              background: "var(--surface)",
              borderRadius: 24,
              border: "1px solid var(--line)",
              padding: "28px 28px 24px",
              boxShadow: "0 30px 60px -30px rgba(8,145,178,.15)",
            }}
          >
            {/* Tab switcher */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                background: "rgba(11,31,28,.05)",
                borderRadius: 10,
                padding: 4,
                marginBottom: 22,
                gap: 4,
              }}
            >
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(""); }}
                  style={{
                    background: mode === m ? "var(--surface)" : "transparent",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontFamily: "inherit",
                    fontSize: "13px",
                    fontWeight: mode === m ? 600 : 500,
                    color: mode === m ? "var(--ink)" : "var(--muted)",
                    cursor: "pointer",
                    transition: "all .15s ease",
                    boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                  }}
                >
                  {m === "login" ? "Iniciar sesión" : "Registrarse"}
                </button>
              ))}
            </div>

            <form style={{ display: "flex", flexDirection: "column", gap: 16 }} onSubmit={handleSubmit}>
              <LoginField
                icon={<Mail size={16} />}
                type="email"
                placeholder="tu@email.com"
                label="Email"
                value={email}
                onChange={setEmail}
              />
              <LoginField
                icon={<Lock size={16} />}
                type="password"
                placeholder="••••••••"
                label="Contraseña"
                value={password}
                onChange={setPassword}
              />

              {error && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(244,63,94,.08)",
                    border: "1px solid rgba(244,63,94,.2)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "#be123c",
                  }}
                >
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-cta"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  borderRadius: 12,
                  padding: "13px 16px",
                  fontSize: 14,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? (
                  <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                ) : (
                  <>
                    {mode === "login" ? "Entrar" : "Crear cuenta"}
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>
          </div>

          <p style={{ marginTop: 20, textAlign: "center", fontSize: "11.5px", color: "var(--muted)" }}>
            <a href="#" style={{ color: "var(--muted)", textDecoration: "none" }}>Privacidad</a>
            {" · "}
            <a href="#" style={{ color: "var(--muted)", textDecoration: "none" }}>Términos</a>
          </p>
        </div>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

function LoginField({
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
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>{label}</span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(11,31,28,.03)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          transition: "all .15s ease",
        }}
        onFocus={() => {}}
      >
        <span style={{ paddingLeft: 12, color: "var(--muted)", display: "flex", alignItems: "center" }}>{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            padding: "10px 12px",
            fontSize: "13.5px",
            color: "var(--ink)",
            fontFamily: "inherit",
          }}
        />
      </div>
    </label>
  );
}
