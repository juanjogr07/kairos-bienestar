"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@heroui/react";

import { AppShell } from "@/components/shared/AppShell";

import { HabitCard } from "./HabitCard";
import { CreateHabitModal } from "./CreateHabitModal";
import { spawnConfetti } from "./confetti";
import type { Habit, HabitFrequency } from "./types";

const INITIAL: Habit[] = [
  {
    id: "1",
    name: "Sin teléfono la primera hora del día",
    streak: 3,
    best: 5,
    done: false,
    freq: "daily",
  },
  {
    id: "2",
    name: "10 min de respiración consciente",
    streak: 5,
    best: 5,
    done: true,
    freq: "daily",
    recommended: true,
  },
  {
    id: "3",
    name: "Caminar al sol 15 min",
    streak: 1,
    best: 4,
    done: false,
    freq: "daily",
  },
  {
    id: "4",
    name: "Lectura sin pantallas antes de dormir",
    streak: 2,
    best: 7,
    done: true,
    freq: "daily",
  },
];

export function HabitsView() {
  const [habits, setHabits] = useState<Habit[]>(INITIAL);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [freq, setFreq] = useState<HabitFrequency>("daily");

  const completed = habits.filter((h) => h.done).length;

  const handleComplete = (id: string, btn: HTMLButtonElement | null) => {
    setHabits((hs) =>
      hs.map((h) =>
        h.id === id
          ? {
              ...h,
              done: !h.done,
              streak: !h.done ? h.streak + 1 : Math.max(0, h.streak - 1),
            }
          : h
      )
    );
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      spawnConfetti(cx, cy);
    }
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    setHabits((hs) => [
      {
        id: String(Date.now()),
        name: name.trim(),
        streak: 0,
        best: 0,
        done: false,
        freq,
      },
      ...hs,
    ]);
    setName("");
    setFreq("daily");
    setShowModal(false);
  };

  return (
    <AppShell>
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary md:text-2xl">
            Mis hábitos
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {habits.length} activos ·{" "}
            <span className="text-accent-primary">
              {completed} completados hoy
            </span>
          </p>
        </div>
        <Button
          onPress={() => setShowModal(true)}
          startContent={<Plus size={16} strokeWidth={2.5} />}
          radius="md"
          size="md"
          className="bg-gradient-cta font-bold text-bg-deep shadow-glow-green data-[hover=true]:scale-[1.02]"
        >
          Nuevo
        </Button>
      </header>

      <ul className="mt-6 space-y-3">
        {habits.map((h, i) => (
          <HabitCard
            key={h.id}
            habit={h}
            index={i}
            onComplete={handleComplete}
          />
        ))}
      </ul>

      <CreateHabitModal
        open={showModal}
        name={name}
        freq={freq}
        onNameChange={setName}
        onFreqChange={setFreq}
        onClose={() => setShowModal(false)}
        onCreate={handleCreate}
      />
    </AppShell>
  );
}
