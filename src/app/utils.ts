import { Habit, JournalEntry, AppSettings, Achievement, ACHIEVEMENT_DEFS } from "./types";

export function getLocalDate(): string {
  try {
    return new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    });
  } catch {
    const now = new Date();
    const utc3 = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    return utc3.toISOString().split("T")[0];
  }
}

export function getWeekDates(): string[] {
  const today = getLocalDate();
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

export function getHabitXp(habit: Habit, date: string): number {
  const isCompleted = habit.completions?.includes(date) ?? false;
  const isSkipped = habit.skips?.includes(date) ?? false;
  const amount = habit.amounts?.[date] ?? 0;

  if (habit.habitType === "avoid") {
    if (isSkipped) return 0;
    if (isCompleted) return -habit.xpReward;
    return habit.xpReward;
  }

  if (habit.progressive) {
    if (isSkipped) return 0;
    const minAmount = habit.minAmount ?? 1;
    const barrierBonus = habit.barrierBonus ?? (minAmount * 2);
    if (amount >= minAmount) {
      const extraUnits = amount - minAmount;
      const totalXp = barrierBonus + extraUnits;
      return Math.min(totalXp, habit.xpReward);
    }
    return 0;
  }

  if (isSkipped) return 0;
  if (isCompleted) return habit.xpReward;
  return 0;
}

export function getDayXp(habits: Habit[], date: string, journal?: JournalEntry): number {
  let total = habits
    .filter((h) => !h.archived)
    .reduce((sum, h) => sum + getHabitXp(h, date), 0);
  if (journal && date === getLocalDate()) {
    total += journal.xp || 0;
  }
  return total;
}

export function getMaxPossibleXp(habits: Habit[]): number {
  return habits.filter((h) => !h.archived).reduce((sum, h) => sum + h.xpReward, 0);
}

export function calcAutoGoal(habits: Habit[]): number {
  return Math.round(getMaxPossibleXp(habits) * 0.75);
}

export function getOverallStreak(habits: Habit[], settings: AppSettings): number {
  let streak = 0;
  const today = getLocalDate();
  let checkDate = new Date(today);
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split("T")[0];
    const dayXp = getDayXp(habits, dateStr);
    const goal = settings.autoGoal ? calcAutoGoal(habits) : settings.dailyGoal;
    if (dateStr === today) {
      if (dayXp >= goal) streak++;
    } else {
      if (dayXp >= goal) streak++;
      else break;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

export function getHabitStreak(habit: Habit): number {
  let streak = 0;
  const today = getLocalDate();
  let checkDate = new Date(today);
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split("T")[0];
    const isCompleted = habit.completions?.includes(dateStr) ?? false;
    const isSkipped = habit.skips?.includes(dateStr) ?? false;
    const amount = habit.amounts?.[dateStr] ?? 0;
    let done = false;
    if (habit.habitType === "avoid") {
      done = !isCompleted && !isSkipped;
    } else if (habit.progressive) {
      done = amount >= (habit.minAmount ?? 1);
    } else {
      done = isCompleted;
    }
    if (done) streak++;
    else if (dateStr !== today) break;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

export function isWeekComplete(habits: Habit[], settings: AppSettings): boolean {
  const dates = getWeekDates();
  const goal = settings.autoGoal ? calcAutoGoal(habits) : settings.dailyGoal;
  return dates.every((d) => getDayXp(habits, d) >= goal);
}

export function getCompletionRate(habit: Habit, days: number = 7): number {
  const today = getLocalDate();
  let completed = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const isCompleted = habit.completions?.includes(dateStr) ?? false;
    const isSkipped = habit.skips?.includes(dateStr) ?? false;
    const amount = habit.amounts?.[dateStr] ?? 0;
    if (habit.habitType === "avoid") {
      if (!isCompleted && !isSkipped) completed++;
    } else if (habit.progressive) {
      if (amount >= (habit.minAmount ?? 1)) completed++;
    } else {
      if (isCompleted) completed++;
    }
  }
  return days > 0 ? completed / days : 0;
}

export function getRateColor(rate: number): string {
  if (rate >= 0.8) return "#00b894";
  if (rate >= 0.5) return "#fdcb6e";
  return "#e17055";
}

export function getBarColor(pct: number): string {
  if (pct >= 100) return "#00b894";
  if (pct >= 75) return "#74b9ff";
  if (pct >= 50) return "#fdcb6e";
  return "#e17055";
}

export function getRateLabel(rate: number): string {
  if (rate >= 0.9) return "Excelente";
  if (rate >= 0.7) return "Bueno";
  if (rate >= 0.5) return "Regular";
  return "Necesita mejora";
}

export function getXpLevel(totalXp: number): { level: number; name: string; emoji: string; progress: number } {
  const level = Math.floor(totalXp / 500) + 1;
  const xpInLevel = totalXp % 500;
  const progress = xpInLevel / 500;
  let name = "Principiante";
  let emoji = "🌱";
  if (level >= 50) { name = "Gran Maestro"; emoji = "💎"; }
  else if (level >= 25) { name = "Maestro"; emoji = "🏅"; }
  else if (level >= 15) { name = "Experto"; emoji = "⚡"; }
  else if (level >= 10) { name = "Avanzado"; emoji = "🔥"; }
  else if (level >= 7) { name = "Dedicado"; emoji = "💪"; }
  else if (level >= 5) { name = "Consistente"; emoji = "🎯"; }
  else if (level >= 3) { name = "Aprendiz"; emoji = "📖"; }
  return { level, name, emoji, progress };
}

export function getTotalXp(habits: Habit[], journalEntries: Record<string, JournalEntry>): number {
  let total = 0;
  const allDates = new Set<string>();
  habits.forEach(h => {
    h.completions?.forEach(d => allDates.add(d));
    h.skips?.forEach(d => allDates.add(d));
    Object.keys(h.amounts ?? {}).forEach(d => allDates.add(d));
  });
  Object.keys(journalEntries).forEach(d => allDates.add(d));
  allDates.forEach(date => {
    total += getDayXp(habits, date, journalEntries[date]);
  });
  return Math.max(0, total);
}

export function checkAchievements(
  habits: Habit[],
  settings: AppSettings,
  journalEntries: Record<string, JournalEntry>,
  currentAchievements: Achievement[]
): Achievement[] {
  const unlocked = [...currentAchievements];
  const streak = getOverallStreak(habits, settings);
  const totalXp = getTotalXp(habits, journalEntries);
  const { level } = getXpLevel(totalXp);
  const today = getLocalDate();
  const journalCount = Object.keys(journalEntries).length;

  const checks: Record<string, () => boolean> = {
    streak_3: () => streak >= 3,
    streak_7: () => streak >= 7,
    streak_14: () => streak >= 14,
    streak_30: () => streak >= 30,
    streak_60: () => streak >= 60,
    streak_100: () => streak >= 100,
    level_5: () => level >= 5,
    level_10: () => level >= 10,
    level_25: () => level >= 25,
    level_50: () => level >= 50,
    total_xp_500: () => totalXp >= 500,
    total_xp_2000: () => totalXp >= 2000,
    total_xp_5000: () => totalXp >= 5000,
    total_xp_10000: () => totalXp >= 10000,
    perfect_week: () => isWeekComplete(habits, settings),
    all_habits_day: () => {
      const active = habits.filter(h => !h.archived);
      return active.length > 0 && active.every(h => {
        if (h.habitType === "avoid") return !h.completions?.includes(today);
        if (h.progressive) return (h.amounts?.[today] ?? 0) >= (h.minAmount ?? 1);
        return h.completions?.includes(today);
      });
    },
    journal_7: () => journalCount >= 7,
    journal_30: () => journalCount >= 30,
    avoid_7: () => habits.some(h => h.habitType === "avoid" && getHabitStreak(h) >= 7),
    avoid_30: () => habits.some(h => h.habitType === "avoid" && getHabitStreak(h) >= 30),
  };

  ACHIEVEMENT_DEFS.forEach(def => {
    const existing = unlocked.find(a => a.id === def.id);
    if (!existing) {
      if (checks[def.id]?.()) {
        unlocked.push({ ...def, unlockedAt: today });
      }
    } else if (!existing.unlockedAt && checks[def.id]?.()) {
      existing.unlockedAt = today;
    }
  });

  return unlocked;
}

export function getNewlyUnlocked(prev: Achievement[], next: Achievement[]): Achievement | null {
  for (const a of next) {
    if (a.unlockedAt) {
      const prevA = prev.find(p => p.id === a.id);
      if (!prevA?.unlockedAt) return a;
    }
  }
  return null;
}

export const DEFAULT_HABITS: Habit[] = [
  { id: "h1", name: "Ejercicio", emoji: "🏃", habitType: "build", xpReward: 30, progressive: true, unit: "min", minAmount: 10, barrierBonus: 20, amounts: {}, completions: [], skips: [] },
  { id: "h2", name: "Leer", emoji: "📖", habitType: "build", xpReward: 30, progressive: true, unit: "min", minAmount: 5, barrierBonus: 10, amounts: {}, completions: [], skips: [] },
  { id: "h3", name: "Meditar", emoji: "🧘", habitType: "build", xpReward: 20, progressive: true, unit: "min", minAmount: 5, barrierBonus: 10, amounts: {}, completions: [], skips: [] },
  { id: "h4", name: "Comer bien", emoji: "🥗", habitType: "build", xpReward: 25, progressive: false, amounts: {}, completions: [], skips: [] },
  { id: "h5", name: "Comer mal", emoji: "🍔", habitType: "avoid", xpReward: 20, progressive: false, amounts: {}, completions: [], skips: [] },
  { id: "h6", name: "Celular de mas", emoji: "📱", habitType: "avoid", xpReward: 15, progressive: false, amounts: {}, completions: [], skips: [] },
];

export const DEFAULT_SETTINGS: AppSettings = {
  dailyGoal: 50,
  autoGoal: true,
  notifications: false,
  notificationInterval: 180,
  smartNotifications: true,
};
