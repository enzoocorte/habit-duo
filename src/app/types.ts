export interface Habit {
  id: string;
  name: string;
  emoji: string;
  frequency: "daily" | "weekly";
  weeklyGoal?: number;
  xpReward: number;
  habitType: "build" | "avoid";
  progressive: boolean;
  unit?: string;
  minAmount?: number;
  barrierBonus?: number;
  amounts?: Record<string, number>;
  createdAt: string;
  completions: string[];
  skips: string[];
  archived: boolean;
}

export interface JournalEntry {
  date: string;
  mood: number;
  note: string;
}

export interface AppSettings {
  notificationsEnabled: boolean;
  nudgeIntervalHours: number;
  dailyXpGoal: number;
  autoGoal: boolean;
}

export const MOOD_EMOJIS = ["😢", "😟", "😐", "😊", "🤩"] as const;
export const MOOD_LABELS = ["Muy mal", "Mal", "Normal", "Bien", "Genial"] as const;
