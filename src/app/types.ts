export interface Habit {
  id: string;
  name: string;
  emoji: string;
  habitType: "build" | "avoid";
  xpReward: number;
  progressive: boolean;
  unit?: string;
  minAmount?: number;
  barrierBonus?: number;
  amounts?: Record<string, number>;
  completions?: string[];
  skips?: string[];
  archived?: boolean;
  createdAt?: string;
  frequency: "daily" | "3x" | "2x" | "1x";
}

export interface JournalEntry {
  mood: number;
  text: string;
  xp: number;
}

export interface Achievement {
  id: string;
  name: string;
  emoji: string;
  description: string;
  unlockedAt?: string;
}

export interface AppSettings {
  dailyGoal: number;
  autoGoal: boolean;
  notifications: boolean;
  notificationInterval: number;
  smartNotifications: boolean;
  goalPercentage: number;
}

export const MOOD_EMOJIS = ["😢", "😕", "😐", "🙂", "😄"];
export const MOOD_LABELS = ["Terrible", "Mal", "Normal", "Bien", "Genial"];

export const ACHIEVEMENT_DEFS: Achievement[] = [
  { id: "streak_3", name: "Primeros pasos", emoji: "🔥", description: "3 dias seguidos con racha" },
  { id: "streak_7", name: "En racha", emoji: "🔥", description: "7 dias seguidos con racha" },
  { id: "streak_14", name: "Imparable", emoji: "💥", description: "14 dias seguidos con racha" },
  { id: "streak_30", name: "Leyenda", emoji: "⚡", description: "30 dias seguidos con racha" },
  { id: "streak_60", name: "Mitico", emoji: "🌟", description: "60 dias seguidos con racha" },
  { id: "streak_100", name: "Dios del habito", emoji: "👑", description: "100 dias seguidos con racha" },
  { id: "level_5", name: "Aprendiz", emoji: "📖", description: "Alcanzar nivel 5" },
  { id: "level_10", name: "Disciplinado", emoji: "🎯", description: "Alcanzar nivel 10" },
  { id: "level_25", name: "Maestro", emoji: "🏅", description: "Alcanzar nivel 25" },
  { id: "level_50", name: "Gran Maestro", emoji: "💎", description: "Alcanzar nivel 50" },
  { id: "total_xp_500", name: "Medio kilo", emoji: "💰", description: "Acumular 500 XP total" },
  { id: "total_xp_2000", name: "Dos kilos", emoji: "💰", description: "Acumular 2000 XP total" },
  { id: "total_xp_5000", name: "Cinco kilos", emoji: "💰", description: "Acumular 5000 XP total" },
  { id: "total_xp_10000", name: "Diez kilos", emoji: "💰", description: "Acumular 10000 XP total" },
  { id: "perfect_week", name: "Semana perfecta", emoji: "🏆", description: "Completar 100% de una semana" },
  { id: "all_habits_day", name: "Dia perfecto", emoji: "⭐", description: "Completar todos los habitos un dia" },
  { id: "journal_7", name: "Escritor", emoji: "✍️", description: "Escribir 7 entradas en el diario" },
  { id: "journal_30", name: "Cronista", emoji: "📝", description: "Escribir 30 entradas en el diario" },
  { id: "avoid_7", name: "Resistencia", emoji: "🛡️", description: "7 dias evitando un mal habito" },
  { id: "avoid_30", name: "Inquebrantable", emoji: "🚫", description: "30 dias evitando un mal habito" },
];
