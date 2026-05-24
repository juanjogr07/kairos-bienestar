"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Globe,
  Moon,
  LogOut,
  ChevronRight,
  RefreshCw,
  Flame,
  Calendar,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getDashboard, type DashboardData } from "@/lib/api";
import { createClient } from "@/lib/supabase";

function phq9Category(score: number): string {
  if (score <= 4) return "Mínimo";
  if (score <= 9) return "Leve";
  if (score <= 14) return "Moderado";
  if (score <= 19) return "Moderadamente severo";
  return "Severo";
}

function gad7Category(score: number): string {
  if (score <= 4) return "Mínimo";
  if (score <= 9) return "Leve";
  if (score <= 14) return "Moderado";
  return "Severo";
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ProfilePage() {
  const { checking } = useRequireAuth();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setEmail(user.email ?? null);
      setName(user.user_metadata?.full_name ?? null);
    });
    getDashboard()
      .then((d) => {
        setDashboard(d);
        // GUARDRAIL — no negotiable: scores de crisis derivan a Línea 106
        if ((d.last_phq9_score ?? 0) >= 15 || (d.last_gad7_score ?? 0) >= 15) {
          router.push("/crisis");
        }
      })
      .catch(() => setDashboard(null))
      .finally(() => setLoadingData(false));
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const initials = name
    ? name
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (email?.[0] ?? "?").toUpperCase();

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent-secondary border-t-transparent" />
      </div>
    );
  }

  return (
    <AppShell>
      {/* Avatar header */}
      <header className="flex items-center gap-4 animate-fade-up">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-bg-deep shadow-glow-green"
          style={{ background: "linear-gradient(135deg, #4FFFB0 0%, #7B6FF0 100%)" }}
        >
          <span className="font-mono text-xl font-bold">{initials}</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            {name ?? email ?? "Usuario"}
          </h1>
          {email && (
            <p className="text-sm text-text-secondary">{email}</p>
          )}
        </div>
      </header>

      {/* Stats */}
      <section
        className="mt-6 grid grid-cols-3 gap-3 animate-fade-up"
        style={{ animationDelay: "100ms" }}
      >
        <Stat
          icon={<Zap size={18} />}
          value={dashboard?.active_habits != null ? String(dashboard.active_habits) : "—"}
          label="Hábitos activos"
          color="text-accent-primary"
          bg="rgba(79,255,176,0.1)"
        />
        <Stat
          icon={<Flame size={18} />}
          value="7"
          label="Racha máxima"
          color="text-accent-warm"
          bg="rgba(255,159,90,0.12)"
        />
        <Stat
          icon={<Calendar size={18} />}
          value="42"
          label="Días de uso"
          color="text-accent-secondary"
          bg="rgba(123,111,240,0.15)"
        />
      </section>

      {/* Screening scores */}
      <section
        className="mt-6 rounded-lg border border-border-subtle bg-bg-surface p-5 animate-fade-up"
        style={{ animationDelay: "200ms" }}
      >
        <header className="mb-4 flex items-baseline justify-between">
          <h2 className="text-md font-bold text-text-primary">Último screening</h2>
          <span className="text-xs text-text-secondary">PHQ-9 · GAD-7</span>
        </header>

        {loadingData ? (
          <div className="flex items-center justify-center py-4">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-secondary border-t-transparent" />
          </div>
        ) : !dashboard?.last_phq9_score && !dashboard?.last_gad7_score ? (
          <p className="text-sm text-text-secondary">
            Completa tu primer screening en{" "}
            <Link href="/onboarding" className="text-accent-primary underline">
              Onboarding
            </Link>
          </p>
        ) : (
          <div className="space-y-3">
            {dashboard?.last_phq9_score != null && (
              <div className="flex items-center justify-between rounded-md bg-bg-elevated px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">PHQ-9</p>
                  <p className="text-xs text-text-muted">{formatDate(dashboard.last_phq9_date)}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-lg font-bold text-accent-secondary">
                    {dashboard.last_phq9_score}
                  </span>
                  <p className="text-xs text-text-secondary">
                    {phq9Category(dashboard.last_phq9_score)}
                  </p>
                </div>
              </div>
            )}
            {dashboard?.last_gad7_score != null && (
              <div className="flex items-center justify-between rounded-md bg-bg-elevated px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">GAD-7</p>
                  <p className="text-xs text-text-muted">{formatDate(dashboard.last_gad7_date)}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-lg font-bold text-accent-info">
                    {dashboard.last_gad7_score}
                  </span>
                  <p className="text-xs text-text-secondary">
                    {gad7Category(dashboard.last_gad7_score)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* New evaluation */}
      <section
        className="mt-6 animate-fade-up"
        style={{ animationDelay: "300ms" }}
      >
        <Link
          href="/onboarding"
          className="group flex items-center justify-between rounded-lg border border-border-subtle bg-bg-surface p-5 transition-colors hover:border-border-active"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[rgba(79,255,176,0.1)] text-accent-primary">
              <RefreshCw size={20} />
            </div>
            <div>
              <p className="text-md font-bold text-text-primary">
                Hacer nueva evaluación
              </p>
              <p className="text-sm text-text-secondary">
                Repite PHQ-9 / GAD-7 cuando quieras
              </p>
            </div>
          </div>
          <ChevronRight
            size={20}
            className="text-text-secondary transition-transform group-hover:translate-x-1"
          />
        </Link>
      </section>

      {/* Settings */}
      <section
        className="mt-6 animate-fade-up"
        style={{ animationDelay: "400ms" }}
      >
        <h2 className="mb-3 text-md font-bold text-text-primary">Configuración</h2>
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-surface">
          <Setting icon={<Bell size={18} />} label="Notificaciones" value="Activadas · suaves" />
          <Setting icon={<Globe size={18} />} label="Zona horaria" value="GMT-5 · Bogotá" />
          <Setting icon={<Moon size={18} />} label="Tema" value="Oscuro" last />
        </div>
      </section>

      {/* Logout */}
      <section
        className="mt-6 animate-fade-up"
        style={{ animationDelay: "500ms" }}
      >
        <button
          onClick={handleLogout}
          className="group flex w-full items-center justify-center gap-2 rounded-md border border-accent-danger/40 bg-[rgba(255,77,106,0.04)] px-5 py-3.5 text-sm font-bold text-accent-danger transition-colors hover:bg-[rgba(255,77,106,0.1)]"
        >
          <LogOut size={16} strokeWidth={2.5} />
          Cerrar sesión
        </button>
      </section>

      <p className="mt-8 text-center text-xs text-text-muted">
        Kairós v0.1 · Bioluminiscencia digital
      </p>
    </AppShell>
  );
}

function Stat({
  icon,
  value,
  label,
  color,
  bg,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border-subtle bg-bg-surface p-4 text-center">
      <div
        className="mb-2 flex h-9 w-9 items-center justify-center rounded-md"
        style={{ background: bg }}
      >
        <span className={color}>{icon}</span>
      </div>
      <span className={`font-mono text-xl font-bold ${color}`}>{value}</span>
      <span className="mt-0.5 text-xs leading-tight text-text-secondary">{label}</span>
    </div>
  );
}

function Setting({
  icon,
  label,
  value,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <button
      className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-bg-elevated ${
        !last ? "border-b border-border-subtle" : ""
      }`}
    >
      <span className="text-text-secondary">{icon}</span>
      <span className="flex-1 text-sm font-medium text-text-primary">{label}</span>
      <span className="text-xs text-text-secondary">{value}</span>
      <ChevronRight size={16} className="text-text-muted" />
    </button>
  );
}
