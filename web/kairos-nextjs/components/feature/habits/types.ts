export type HabitFrequency = "daily" | "weekly";

export interface Habit {
  id: string;
  name: string;
  streak: number;
  best: number;
  done: boolean;
  recommended?: boolean;
  freq: HabitFrequency;
}
