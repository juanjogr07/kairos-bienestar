"use client";

import { Calendar, Flame, LogOut, Zap } from "lucide-react";
import { Button, Card, CardBody, CardHeader } from "@heroui/react";

import { AppShell } from "@/components/shared/AppShell";

import { ProfileHeader } from "./ProfileHeader";
import { StatCard } from "./StatCard";
import { WellbeingChart } from "./WellbeingChart";
import { SettingsList } from "./SettingsList";
import { NewEvaluationCard } from "./NewEvaluationCard";

const PHQ_HISTORY = [12, 11, 13, 10, 9, 8, 9];
const GAD_HISTORY = [10, 9, 11, 8, 7, 6, 6];
const LABELS = ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Hoy"];

export function ProfileView() {
  return (
    <AppShell>
      <ProfileHeader
        name="Alejandro Pérez"
        subtitle="alejandro@kairos.app · Bogotá"
        initial="A"
      />

      <section
        className="mt-6 grid grid-cols-3 gap-3 animate-fade-up"
        style={{ animationDelay: "100ms" }}
      >
        <StatCard
          icon={<Zap size={18} />}
          value="4"
          label="Hábitos activos"
          color="text-accent-primary"
          bg="rgba(79,255,176,0.1)"
        />
        <StatCard
          icon={<Flame size={18} />}
          value="7"
          label="Racha máxima"
          color="text-accent-warm"
          bg="rgba(255,159,90,0.12)"
        />
        <StatCard
          icon={<Calendar size={18} />}
          value="42"
          label="Días de uso"
          color="text-accent-secondary"
          bg="rgba(123,111,240,0.15)"
        />
      </section>

      <Card
        shadow="none"
        radius="lg"
        className="mt-6 animate-fade-up border border-border-subtle bg-bg-surface"
        style={{ animationDelay: "200ms" }}
      >
        <CardHeader className="flex flex-col items-start gap-1 px-5 pb-1 pt-5">
          <div className="flex w-full items-baseline justify-between">
            <h2 className="text-md font-bold text-text-primary">
              Historial de bienestar
            </h2>
            <span className="text-xs text-text-secondary">
              Últimas 7 semanas
            </span>
          </div>
          <p className="text-sm text-text-secondary">
            Tu PHQ-9 y GAD-7 en el tiempo
          </p>
        </CardHeader>
        <CardBody className="px-5 pb-5">
          <div className="flex items-center gap-4 text-xs">
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
        </CardBody>
      </Card>

      <NewEvaluationCard />

      <section
        className="mt-6 animate-fade-up"
        style={{ animationDelay: "400ms" }}
      >
        <h2 className="mb-3 text-md font-bold text-text-primary">
          Configuración
        </h2>
        <SettingsList />
      </section>

      <section
        className="mt-6 animate-fade-up"
        style={{ animationDelay: "500ms" }}
      >
        <Button
          variant="bordered"
          radius="md"
          size="lg"
          fullWidth
          startContent={<LogOut size={16} strokeWidth={2.5} />}
          className="border-accent-danger/40 bg-accent-danger/5 font-bold text-accent-danger data-[hover=true]:bg-accent-danger/10"
        >
          Cerrar sesión
        </Button>
      </section>

      <p className="mt-8 text-center text-xs text-text-muted">
        Kairós v0.1 · Bioluminiscencia digital
      </p>
    </AppShell>
  );
}
