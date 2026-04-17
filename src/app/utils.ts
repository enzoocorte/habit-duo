import { Habit, JournalEntry, AppSettings } from "./types";

// === TIMEZONE: Argentina UTC-3 ===
export function getLocalDate(): string {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  } catch {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ar = new Date(utc - 3 * 3600000);
    return ar.toISOString().split("T")[0];
  }
}

export function getWeekDates(): string[] {
  const today = new Date(getLocalDate() + "T12:00:00");
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

// === BARRIER BONUS ===
// Premia fuertemente ROMPER LA BARRERA de empezar
// Ej: Leer xpReward=30, minAmount=5, barrierBonus=10
//   0 min = 0 XP
//   1 min = 5 XP (empezaste!)
//   5 min = 10 XP (barrera rota!)
//   10 min = 15 XP (10 barrera + 5 extra)
//   25 min = 30 XP (cap)
export function getBarrierBonus(habit: Habit): number {
  if (habit.barrierBonus && habit.barrierBonus > 0) return habit.barrierBonus;
  return Math.max(5, Math.round(habit.xpReward / 3));
}

export function calcProgressiveXp(habit: Habit, amount: number): number {
  if (amount === 0) return 0;
  const barrier = getBarrierBonus(habit);
  const minAmt = habit.minAmount ?? 5;

  if (amount < minAmt) {
    return Math.min(5, barrier);
  }

  const additionalXp = amount - minAmt;
  return Math.min(barrier + additionalXp, habit.xpReward);
}

// === XP CALCULATIONS ===
export function getHabitXp(habit: Habit, date: string): number {
  if (habit.archived) return 0;
  const completed = habit.completions.includes(date);
  const amount = habit.amounts?.[date] || 0;

  if (habit.habitType === "build") {
    if (habit.progressive) {
      return calcProgressiveXp(habit, amount);
    }
    return completed ? habit.xpReward : 0;
  }

  // avoid
  if (habit.progressive) {
    if (amount > 0) return -Math.min(amount, habit.xpReward);
    if (habit.frequency === "daily") return habit.xpReward;
    return 0;
  }

  if (completed) return -habit.xpReward;
  if (habit.frequency === "daily") return habit.xpReward;
  return 0;
}

export function getDayXp(habits: Habit[], journal: JournalEntry[], date: string): number {
  let xp = 0;
  for (const h of habits) xp += getHabitXp(h, date);
  if (journal.find((e) => e.date === date)) xp += 15;
  return xp;
}

export function calcAutoGoal(habits: Habit[]): number {
  let maxDaily = 0;
  for (const h of habits) {
    if (h.archived) continue;
    if (h.habitType === "build") {
      maxDaily += h.frequency === "daily" ? h.xpReward : Math.round(h.xpReward * (h.weeklyGoal || 3) / 7);
    } else {
      maxDaily += h.xpReward;
    }
  }
  maxDaily += 15;
  return Math.max(20, Math.round(maxDaily * 0.75 / 5) * 5);
}

export function getMaxPossibleXp(habits: Habit[]): number {
  let max = 0;
  for (const h of habits) {
    if (h.archived) continue;
    if (h.habitType === "build") max += h.xpReward;
    else max += h.xpReward;
  }
  return max + 15;
}

// === STREAKS ===
export function getOverallStreak(habits: Habit[], journal: JournalEntry[], goal: number): number {
  const today = getLocalDate();
  const todayXp = getDayXp(habits, journal, today);
  const yesterday = dateOffset(today, -1);
  const yesterdayXp = getDayXp(habits, journal, yesterday);
  if (todayXp < goal && yesterdayXp < goal) return 0;
  let streak = 0;
  const start = todayXp >= goal ? 0 : 1;
  for (let i = start; i < 365; i++) {
    if (getDayXp(habits, journal, dateOffset(today, -i)) >= goal) streak++;
    else break;
  }
  return streak;
}

export function getHabitStreak(habit: Habit): number {
  if (habit.habitType === "avoid" && habit.frequency === "daily") {
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = dateOffset(getLocalDate(), -i);
      if (!habit.completions.includes(d)) streak++;
      else break;
    }
    return streak;
  }

  if (habit.completions.length === 0) return 0;
  const sorted = [...new Set(habit.completions)].sort().reverse();
  const today = getLocalDate();
  const yesterday = dateOffset(today, -1);

  if (habit.frequency === "daily") {
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
    let streak = 0, check = new Date(sorted[0] + "T12:00:00");
    for (const c of sorted) {
      const cd = new Date(c + "T12:00:00");
      if (Math.round((check.getTime() - cd.getTime()) / 86400000) === streak) { streak++; check = cd; }
      else break;
    }
    return streak;
  }

  let streak = 0;
  const ws0 = new Date(); ws0.setDate(ws0.getDate() - ws0.getDay()); ws0.setHours(0, 0, 0, 0);
  for (let w = 0; w < 52; w++) {
    const ws = new Date(ws0); ws.setDate(ws.getDate() - w * 7);
    const we = new Date(ws); we.setDate(we.getDate() + 7);
    const wc = habit.completions.filter((c) => { const d = new Date(c + "T12:00:00"); return d >= ws && d < we; });
    if (wc.length >= (habit.weeklyGoal || 3)) streak++; else if (w > 0) break;
  }
  return streak;
}

export function isWeekComplete(habit: Habit): boolean {
  if (habit.frequency !== "weekly") return false;
  const wd = getWeekDates().slice(-7);
  return habit.completions.filter((c) => wd.includes(c)).length >= (habit.weeklyGoal || 3);
}

// === COMPLETION RATES ===
export function getCompletionRate(habit: Habit): number {
  const created = new Date(habit.createdAt + "T12:00:00");
  const daysSince = Math.max(1, Math.round((Date.now() - created.getTime()) / 86400000));

  if (habit.habitType === "avoid" && habit.frequency === "daily") {
    const avoided = daysSince - habit.completions.filter((c) => c >= habit.createdAt).length;
    return Math.round((avoided / daysSince) * 100);
  }

  if (habit.frequency === "daily") {
    return Math.round((habit.completions.filter((c) => c >= habit.createdAt).length / daysSince) * 100);
  }

  const weeksSince = Math.max(1, Math.ceil(daysSince / 7));
  const ws0 = new Date(); ws0.setDate(ws0.getDate() - ws0.getDay()); ws0.setHours(0, 0, 0, 0);
  let weeksHit = 0;
  for (let w = 0; w < weeksSince + 1; w++) {
    const ws = new Date(ws0); ws.setDate(ws.getDate() - w * 7);
    const we = new Date(ws); we.setDate(we.getDate() + 7);
    if (habit.completions.filter((c) => { const d = new Date(c + "T12:00:00"); return d >= ws && d < we; }).length >= (habit.weeklyGoal || 3)) weeksHit++;
  }
  return Math.round((weeksHit / weeksSince) * 100);
}

export function getRateColor(rate: number): string {
  if (rate >= 80) return "text-[#58CC02]"; if (rate >= 60) return "text-blue-500";
  if (rate >= 40) return "text-amber-500"; return "text-red-500";
}
export function getRateBarColor(rate: number): string {
  if (rate >= 80) return "bg-[#58CC02]"; if (rate >= 60) return "bg-blue-500";
  if (rate >= 40) return "bg-amber-500"; return "bg-red-500";
}
export function getRateLabel(rate: number): string {
  if (rate >= 80) return "Excelente"; if (rate >= 60) return "Bueno";
  if (rate >= 40) return "Mejorable"; return "Te cuesta";
}

export function getXpLevel(xp: number, goal: number): { name: string; emoji: string } {
  if (xp >= goal * 1.5) return { name: "Dia epico!", emoji: "⚡" };
  if (xp >= goal) return { name: "Dia de racha!", emoji: "🔥" };
  if (xp >= goal * 0.5) return { name: "Buen ritmo", emoji: "💪" };
  if (xp < 0) return { name: "Dia negativo", emoji: "😵" };
  return { name: "Recien empezando", emoji: "🌱" };
}

function dateOffset(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// === DEFAULTS ===
const today = getLocalDate();

export const DEFAULT_HABITS: Habit[] = [
  { id: "1", name: "Ejercicio", emoji: "🏃", frequency: "daily", xpReward: 30, habitType: "build", progressive: true, unit: "min", minAmount: 5, barrierBonus: 10, amounts: {}, createdAt: today, completions: [], skips: [], archived: false },
  { id: "2", name: "Leer", emoji: "📖", frequency: "daily", xpReward: 30, habitType: "build", progressive: true, unit: "min", minAmount: 5, barrierBonus: 10, amounts: {}, createdAt: today, completions: [], skips: [], archived: false },
  { id: "3", name: "Meditar", emoji: "🧘", frequency: "weekly", weeklyGoal: 3, xpReward: 20, habitType: "build", progressive: true, unit: "min", minAmount: 5, barrierBonus: 7, amounts: {}, createdAt: today, completions: [], skips: [], archived: false },
  { id: "4", name: "Comer bien", emoji: "🥗", frequency: "daily", xpReward: 15, habitType: "build", progressive: false, createdAt: today, completions: [], skips: [], archived: false },
  { id: "5", name: "Comer mal", emoji: "🍔", frequency: "daily", xpReward: 25, habitType: "avoid", progressive: false, createdAt: today, completions: [], skips: [], archived: false },
  { id: "6", name: "Celular de mas", emoji: "📱", frequency: "daily", xpReward: 20, habitType: "avoid", progressive: true, unit: "min", minAmount: 0, amounts: {}, createdAt: today, completions: [], skips: [], archived: false },
];

export const DEFAULT_SETTINGS: AppSettings = { notificationsEnabled: false, nudgeIntervalHours: 3, dailyXpGoal: 100, autoGoal: true };
