"use client";

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

const PHQ_HISTORY = [12, 11, 13, 10, 9, 8, 9];
const GAD_HISTORY = [10, 9, 11, 8, 7, 6, 6];
const LABELS = ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Hoy"];

export default function ProfilePage() {
  return (
    <AppShell>
      {/* Avatar header */}
      <header className="flex items-center gap-4 animate-fade-up">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-bg-deep shadow-glow-green"
          style={{
            background:
              "linear-gradient(135deg, #4FFFB0 0%, #7B6FF0 100%)",
          }}
        >
          <span className="font-mono text-xl font-bold">A</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            Alejandro Pérez
          </h1>
          <p className="text-sm text-text-secondary">
            alejandro@kairos.app · Bogotá
          </p>
        </div>
      </header>

      {/* Stats */}
      <section
        className="mt-6 grid grid-cols-3 gap-3 animate-fade-up"
        style={{ animationDelay: "100ms" }}
      >
        <Stat
          icon={<Zap size={18} />}
          value="4"
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

      {/* Wellbeing chart */}
      <section
        className="mt-6 rounded-lg border border-border-subtle bg-bg-surface p-5 animate-fade-up"
        style={{ animationDelay: "200ms" }}
      >
        <header className="mb-1 flex items-baseline justify-between">
          <h2 className="text-md font-bold text-text-primary">
            Historial de bienestar
          </h2>
          <span className="text-xs text-text-secondary">Últimas 7 semanas</span>
        </header>
        <p className="text-sm text-text-secondary">
          Tu PHQ-9 y GAD-7 en el tiempo
        </p>

        <div className="mt-5 flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-accent-secondary">
            <span className="h-2 w-2 rounded-full bg-accent-secondary" />
            PHQ-9
          </span>
          <span className="inline-flex items-center gap-1.5 text-accent-info">
            <span className="h-2 w-2 rounded-full bg-accent-info" />
            GAD-7
          </span>
        </div>

        <WellbeingChart phq={PHQ_HISTORY} gad={GAD_HISTORY} labels={LABELS} />
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
        <h2 className="mb-3 text-md font-bold text-text-primary">
          Configuración
        </h2>
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-surface">
          <Setting
            icon={<Bell size={18} />}
            label="Notificaciones"
            value="Activadas · suaves"
          />
          <Setting
            icon={<Globe size={18} />}
            label="Zona horaria"
            value="GMT-5 · Bogotá"
          />
          <Setting icon={<Moon size={18} />} label="Tema" value="Oscuro" last />
        </div>
      </section>

      {/* Logout */}
      <section
        className="mt-6 animate-fade-up"
        style={{ animationDelay: "500ms" }}
      >
        <button className="group flex w-full items-center justify-center gap-2 rounded-md border border-accent-danger/40 bg-[rgba(255,77,106,0.04)] px-5 py-3.5 text-sm font-bold text-accent-danger transition-colors hover:bg-[rgba(255,77,106,0.1)]">
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
      <span className="mt-0.5 text-xs leading-tight text-text-secondary">
        {label}
      </span>
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
      <span className="flex-1 text-sm font-medium text-text-primary">
        {label}
      </span>
      <span className="text-xs text-text-secondary">{value}</span>
      <ChevronRight size={16} className="text-text-muted" />
    </button>
  );
}

function WellbeingChart({
  phq,
  gad,
  labels,
}: {
  phq: number[];
  gad: number[];
  labels: string[];
}) {
  const W = 320;
  const H = 140;
  const PADX = 8;
  const PADY = 14;
  const max = 21;
  const n = phq.length;

  const xAt = (i: number) => PADX + (i * (W - 2 * PADX)) / (n - 1);
  const yAt = (v: number) => H - PADY - (v / max) * (H - 2 * PADY);

  const buildPath = (data: number[]) => {
    return data.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`).join(" ");
  };
  const buildArea = (data: number[]) => {
    const top = data
      .map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`)
      .join(" ");
    return `${top} L ${xAt(n - 1)} ${H - PADY} L ${xAt(0)} ${H - PADY} Z`;
  };

  return (
    <div className="mt-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-44 w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="phq-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7B6FF0" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7B6FF0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gad-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#5AC8FF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#5AC8FF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1={PADX}
            x2={W - PADX}
            y1={PADY + p * (H - 2 * PADY)}
            y2={PADY + p * (H - 2 * PADY)}
            stroke="#1E2D52"
            strokeWidth="1"
            strokeDasharray={p === 0 || p === 1 ? "" : "2,4"}
          />
        ))}

        {/* Areas */}
        <path d={buildArea(phq)} fill="url(#phq-area)" />
        <path d={buildArea(gad)} fill="url(#gad-area)" />

        {/* Lines */}
        <path
          d={buildPath(phq)}
          fill="none"
          stroke="#7B6FF0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={buildPath(gad)}
          fill="none"
          stroke="#5AC8FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {phq.map((v, i) => (
          <circle
            key={`p${i}`}
            cx={xAt(i)}
            cy={yAt(v)}
            r="3"
            fill="#7B6FF0"
            stroke="#0D1424"
            strokeWidth="1.5"
          />
        ))}
        {gad.map((v, i) => (
          <circle
            key={`g${i}`}
            cx={xAt(i)}
            cy={yAt(v)}
            r="3"
            fill="#5AC8FF"
            stroke="#0D1424"
            strokeWidth="1.5"
          />
        ))}
      </svg>

      <div className="mt-2 flex justify-between text-[11px] text-text-muted">
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}
