"use client";

import { useState } from "react";
import { BarChart3, Zap } from "lucide-react";

import { AppShell } from "@/components/shared/AppShell";
import { OnboardingIncompleteBanner } from "@/components/feature/onboarding";

import { GreetingHeader } from "./GreetingHeader";
import { MetricCard } from "./MetricCard";
import { InsightCard } from "./InsightCard";
import { TopSitesChart, type SiteUsage } from "./TopSitesChart";
import { HabitsTodayList, type HabitToday } from "./HabitsTodayList";
import { WellbeingScores } from "./WellbeingScores";

const SITES: SiteUsage[] = [
  { name: "YouTube", min: 45, color: "#FF4D6A" },
  { name: "Instagram", min: 32, color: "#7B6FF0" },
  { name: "Twitter", min: 18, color: "#5AC8FF" },
  { name: "TikTok", min: 28, color: "#FF9F5A" },
  { name: "Reddit", min: 19, color: "#4FFFB0" },
];

const HABITS_TODAY: HabitToday[] = [
  { id: "h1", text: "Sin teléfono la primera hora del día", streak: 3, done: true },
  { id: "h2", text: "10 min de respiración consciente", streak: 5, done: true },
  { id: "h3", text: "Caminar al sol 15 min", streak: 1, done: false },
];

export function DashboardView() {
  const [habits, setHabits] = useState<HabitToday[]>(HABITS_TODAY);

  const completedCount = habits.filter((h) => h.done).length;

  const handleToggle = (id: string, done: boolean) => {
    setHabits((hs) => hs.map((h) => (h.id === id ? { ...h, done } : h)));
  };

  return (
    <AppShell>
      <OnboardingIncompleteBanner />

      <GreetingHeader name="Alejandro" screenTime="1h 42min" />

      <section
        className="mt-5 grid grid-cols-2 gap-3 animate-fade-up"
        style={{ animationDelay: "100ms" }}
      >
        <MetricCard
          icon={BarChart3}
          value={142}
          label="min hoy"
          accent="text-accent-primary"
          iconBg="rgba(79,255,176,0.1)"
        />
        <MetricCard
          icon={Zap}
          value={completedCount}
          label="hábitos"
          accent="text-accent-warm"
          iconBg="rgba(255,159,90,0.12)"
          animate={false}
        />
      </section>

      <InsightCard playbook="Uso nocturno" ctaHref="/chat">
        Los últimos 3 días usaste el teléfono después de las{" "}
        <span className="font-mono text-accent-secondary">23:00</span> por más
        de <span className="font-mono text-accent-secondary">45 min</span>.
        Esto puede estar afectando tu sueño.
      </InsightCard>

      <TopSitesChart sites={SITES} />

      <HabitsTodayList habits={habits} onToggle={handleToggle} />

      <WellbeingScores
        phq9={{ score: 9, severity: "leve" }}
        gad7={{ score: 6, severity: "leve" }}
      />
    </AppShell>
  );
}
