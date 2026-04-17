import os

base = os.path.expanduser("~/habit-duo-fix")

def write(path, content):
    full = os.path.join(base, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print(f"  OK {path}")

# ============================================================
# TYPES
# ============================================================
write("src/app/types.ts", r"""
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
""")

# ============================================================
# UTILS
# ============================================================
write("src/app/utils.ts", r"""
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

// === XP CALCULATIONS ===
export function getHabitXp(habit: Habit, date: string): number {
  if (habit.archived) return 0;
  const completed = habit.completions.includes(date);
  const amount = habit.amounts?.[date] || 0;

  if (habit.habitType === "build") {
    if (habit.progressive) {
      if (amount < (habit.minAmount || 5)) return 0;
      return Math.min(amount, habit.xpReward);
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
  { id: "1", name: "Ejercicio", emoji: "🏃", frequency: "daily", xpReward: 30, habitType: "build", progressive: true, unit: "min", minAmount: 5, amounts: {}, createdAt: today, completions: [], skips: [], archived: false },
  { id: "2", name: "Leer", emoji: "📖", frequency: "daily", xpReward: 30, habitType: "build", progressive: true, unit: "min", minAmount: 5, amounts: {}, createdAt: today, completions: [], skips: [], archived: false },
  { id: "3", name: "Meditar", emoji: "🧘", frequency: "weekly", weeklyGoal: 3, xpReward: 20, habitType: "build", progressive: true, unit: "min", minAmount: 5, amounts: {}, createdAt: today, completions: [], skips: [], archived: false },
  { id: "4", name: "Comer bien", emoji: "🥗", frequency: "daily", xpReward: 15, habitType: "build", progressive: false, createdAt: today, completions: [], skips: [], archived: false },
  { id: "5", name: "Comer mal", emoji: "🍔", frequency: "daily", xpReward: 25, habitType: "avoid", progressive: false, createdAt: today, completions: [], skips: [], archived: false },
  { id: "6", name: "Celular de mas", emoji: "📱", frequency: "daily", xpReward: 20, habitType: "avoid", progressive: true, unit: "min", minAmount: 0, amounts: {}, createdAt: today, completions: [], skips: [], archived: false },
];

export const DEFAULT_SETTINGS: AppSettings = { notificationsEnabled: false, nudgeIntervalHours: 3, dailyXpGoal: 100, autoGoal: true };
""")

# ============================================================
# XP HEADER COMPONENT
# ============================================================
write("src/app/components/XPHeader.tsx", r"""
"use client";
import { getXpLevel } from "../utils";

interface XPHeaderProps {
  todayXp: number;
  effectiveGoal: number;
  overallStreak: number;
  autoGoal: boolean;
  onSettings: () => void;
}

export default function XPHeader({ todayXp, effectiveGoal, overallStreak, autoGoal, onSettings }: XPHeaderProps) {
  const barPct = effectiveGoal > 0 ? Math.min(100, Math.max(0, (todayXp / effectiveGoal) * 100)) : 0;
  const xpPct = effectiveGoal > 0 ? Math.min(150, Math.round((todayXp / effectiveGoal) * 100)) : 0;
  const level = getXpLevel(todayXp, effectiveGoal);
  const barBg = todayXp < 0 ? "#ef4444" : todayXp >= effectiveGoal * 1.5 ? "linear-gradient(90deg, #58CC02, #FFD700)" : todayXp >= effectiveGoal ? "#FFD700" : "#58CC02";

  return (
    <div className="bg-[#58CC02] px-4 pt-4 pb-8 text-white">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black tracking-tight">🔥 HabitDuo</h1>
          <div className="flex items-center gap-2">
            {overallStreak > 0 && <span className="bg-white/20 rounded-xl px-3 py-1.5 text-sm font-bold">🔥 {overallStreak}</span>}
            <button onClick={onSettings} className="bg-white/20 rounded-xl px-3 py-1.5 text-sm font-bold hover:bg-white/30 transition">⚙️</button>
          </div>
        </div>
        <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-lg">{level.emoji} {level.name}</span>
            <span className="font-black text-2xl">{todayXp} XP</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-5 bg-white/30 rounded-full overflow-hidden relative">
              {todayXp < 0 ? (
                <div className="h-full bg-red-500 rounded-full" style={{ width: Math.min(100, Math.abs(barPct)) + "%" }} />
              ) : (
                <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden" style={{ width: barPct + "%", background: barBg }}>
                  {barPct > 15 && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow">{xpPct}%</span>}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between text-xs opacity-80">
            <span>Meta: {effectiveGoal} XP {autoGoal ? "(auto)" : ""}</span>
            {todayXp >= effectiveGoal * 1.5 && <span className="text-yellow-200 font-bold">⚡ Epico!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
""")

# ============================================================
# HABIT CARD COMPONENT
# ============================================================
write("src/app/components/HabitCard.tsx", r"""
"use client";
import { useState } from "react";
import { Habit } from "../types";
import { getLocalDate, getWeekDates, getHabitStreak, isWeekComplete, getHabitXp } from "../utils";

interface HabitCardProps {
  habit: Habit;
  onToggle: (id: string) => void;
  onSkip: (id: string) => void;
  onUpdateAmount: (id: string, date: string, amount: number) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function HabitCard({ habit, onToggle, onSkip, onUpdateAmount, onArchive, onDelete }: HabitCardProps) {
  const [editing, setEditing] = useState(false);
  const [showAmountInput, setShowAmountInput] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  const today = getLocalDate();
  const weekDates = getWeekDates();
  const streak = getHabitStreak(habit);
  const didIt = habit.completions.includes(today);
  const isSkipped = habit.skips.includes(today);
  const weekComps = habit.frequency === "weekly" ? habit.completions.filter((c) => weekDates.includes(c)).length : 0;
  const weekDone = habit.frequency === "weekly" && isWeekComplete(habit);
  const todayXp = getHabitXp(habit, today);
  const amount = habit.amounts?.[today] || 0;
  const isProgressive = habit.progressive;
  const isAvoid = habit.habitType === "avoid";

  const completed = isAvoid ? didIt : (didIt || weekDone || (isProgressive && amount >= (habit.minAmount || 5)));

  const handleAddAmount = (add: number) => {
    onUpdateAmount(habit.id, today, amount + add);
  };

  const handleSetAmount = () => {
    const val = parseInt(customAmount);
    if (!isNaN(val) && val >= 0) {
      onUpdateAmount(habit.id, today, val);
    }
    setCustomAmount("");
    setShowAmountInput(false);
  };

  // Progressive build habit
  if (isProgressive && !isAvoid) {
    const minAmt = habit.minAmount || 5;
    const reached = amount >= minAmt;
    const progressPct = Math.min(100, (amount / habit.xpReward) * 100);
    return (
      <div className={"bg-white rounded-2xl shadow-md p-4 transition-all " + (reached ? "ring-2 ring-[#58CC02]" : "")}>
        <div className="flex items-center gap-3">
          <div className={"w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black transition-all " + (reached ? "bg-[#58CC02] text-white shadow-lg shadow-green-200" : "bg-gray-100 text-gray-400")}>
            {habit.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800">{habit.name}</span>
              <span className="text-[10px] bg-green-50 text-green-600 rounded-full px-1.5 py-0.5 font-bold">+{todayXp} XP</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#58CC02] rounded-full transition-all" style={{ width: progressPct + "%" }} />
              </div>
              <span className={"text-xs font-bold " + (reached ? "text-[#58CC02]" : "text-gray-400")}>{amount}/{habit.xpReward} {habit.unit || "min"}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {streak > 0 && <span className="text-xs font-bold text-orange-500">🔥 {streak}</span>}
              {habit.frequency === "weekly" && <span className="text-[10px] text-gray-400">{weekComps}/{habit.weeklyGoal || 3}/sem</span>}
              {!reached && amount > 0 && <span className="text-[10px] text-amber-500">Minimo: {minAmt} {habit.unit || "min"}</span>}
              {reached && <span className="text-[10px] text-[#58CC02]">✓ Completado</span>}
            </div>
          </div>
          <button onClick={() => setEditing(!editing)} className="text-gray-300 hover:text-gray-500 transition p-1">⋮</button>
        </div>
        <div className="flex gap-2 mt-2">
          {[5, 10, 15, 30].map((n) => (
            <button key={n} onClick={() => handleAddAmount(n)} className="flex-1 bg-gray-50 hover:bg-gray-100 rounded-lg py-1.5 text-xs font-bold text-gray-600 transition">+{n}</button>
          ))}
          <button onClick={() => setShowAmountInput(!showAmountInput)} className="bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-600 transition">✏️</button>
        </div>
        {showAmountInput && (
          <div className="flex gap-2 mt-2">
            <input type="number" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder={amount.toString()} className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#58CC02]" min="0" />
            <button onClick={handleSetAmount} className="bg-[#58CC02] text-white font-bold px-4 rounded-lg text-sm">OK</button>
          </div>
        )}
        {editing && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex gap-2">
            <button onClick={() => { onArchive(habit.id); setEditing(false); }} className="text-xs bg-blue-50 text-blue-600 rounded-lg px-3 py-1.5 font-medium hover:bg-blue-100">{habit.archived ? "Restaurar" : "Archivar"}</button>
            <button onClick={() => { onDelete(habit.id); setEditing(false); }} className="text-xs bg-red-50 text-red-600 rounded-lg px-3 py-1.5 font-medium hover:bg-red-100">Eliminar</button>
          </div>
        )}
      </div>
    );
  }

  // Progressive avoid habit
  if (isProgressive && isAvoid) {
    const avoided = amount === 0;
    return (
      <div className={"bg-white rounded-2xl shadow-md p-4 transition-all " + (amount > 0 ? "ring-2 ring-red-400 bg-red-50/50" : "ring-2 ring-[#58CC02]")}>
        <div className="flex items-center gap-3">
          <div className={"w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black transition-all " + (amount > 0 ? "bg-red-500 text-white" : "bg-green-50 text-green-500")}>
            {amount > 0 ? "✗" : "✓"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={"font-bold " + (amount > 0 ? "text-red-600" : "text-gray-800")}>{habit.name}</span>
              <span className={"text-[10px] rounded-full px-1.5 py-0.5 font-bold " + (amount > 0 ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600")}>
                {amount > 0 ? `${todayXp} XP` : `+${habit.xpReward} XP`}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">{amount} {habit.unit || "min"}</span>
              {avoided && <span className="text-xs text-green-500 font-medium">Evitado hoy ✓</span>}
              {amount > 0 && <span className="text-xs text-red-400 font-medium">Lo hiciste hoy</span>}
              {streak > 0 && avoided && <span className="text-xs font-bold text-orange-500">🔥 {streak} sin caer</span>}
            </div>
          </div>
          <button onClick={() => setEditing(!editing)} className="text-gray-300 hover:text-gray-500 transition p-1">⋮</button>
        </div>
        <div className="flex gap-2 mt-2">
          {[15, 30, 60].map((n) => (
            <button key={n} onClick={() => handleAddAmount(n)} className="flex-1 bg-red-50 hover:bg-red-100 rounded-lg py-1.5 text-xs font-bold text-red-500 transition">+{n}</button>
          ))}
          <button onClick={() => { onUpdateAmount(habit.id, today, 0); onToggle(habit.id); }} className="bg-green-50 hover:bg-green-100 rounded-lg px-3 py-1.5 text-xs font-bold text-green-600 transition">No lo hice ✓</button>
        </div>
        {editing && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex gap-2">
            <button onClick={() => { onArchive(habit.id); setEditing(false); }} className="text-xs bg-blue-50 text-blue-600 rounded-lg px-3 py-1.5 font-medium hover:bg-blue-100">{habit.archived ? "Restaurar" : "Archivar"}</button>
            <button onClick={() => { onDelete(habit.id); setEditing(false); }} className="text-xs bg-red-50 text-red-600 rounded-lg px-3 py-1.5 font-medium hover:bg-red-100">Eliminar</button>
          </div>
        )}
      </div>
    );
  }

  // Simple build habit
  if (!isAvoid) {
    return (
      <div className={"bg-white rounded-2xl shadow-md p-4 transition-all " + (completed ? "ring-2 ring-[#58CC02] " : "") + (isSkipped ? "opacity-60" : "")}>
        <div className="flex items-center gap-3">
          <button onClick={() => onToggle(habit.id)} className={"w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black transition-all " + (completed ? "bg-[#58CC02] text-white shadow-lg shadow-green-200 scale-105" : "bg-gray-100 text-gray-400 hover:bg-gray-200")}>
            {completed ? "✓" : habit.emoji}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={"font-bold " + (completed ? "line-through text-gray-400" : "text-gray-800")}>{habit.name}</span>
              <span className="text-[10px] bg-green-50 text-green-600 rounded-full px-1.5 py-0.5 font-bold">+{habit.xpReward}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-gray-400">{habit.frequency === "daily" ? "Diario" : "Semanal"}</span>
              {streak > 0 && <span className="text-xs font-bold text-orange-500">🔥 {streak}</span>}
              {habit.frequency === "weekly" && <span className="text-[10px] text-gray-400">{weekComps}/{habit.weeklyGoal || 3}/sem</span>}
              {isSkipped && <span className="text-xs text-amber-500">⏭</span>}
            </div>
          </div>
          <div className="flex gap-1">
            {!completed && habit.frequency === "weekly" && !isSkipped && <button onClick={() => onSkip(habit.id)} className="text-xs bg-amber-50 text-amber-600 rounded-lg px-2 py-1 font-medium hover:bg-amber-100 transition">⏭</button>}
            <button onClick={() => setEditing(!editing)} className="text-gray-300 hover:text-gray-500 transition p-1">⋮</button>
          </div>
        </div>
        {editing && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
            <button onClick={() => { onArchive(habit.id); setEditing(false); }} className="text-xs bg-blue-50 text-blue-600 rounded-lg px-3 py-1.5 font-medium hover:bg-blue-100">{habit.archived ? "Restaurar" : "Archivar"}</button>
            <button onClick={() => { onDelete(habit.id); setEditing(false); }} className="text-xs bg-red-50 text-red-600 rounded-lg px-3 py-1.5 font-medium hover:bg-red-100">Eliminar</button>
          </div>
        )}
      </div>
    );
  }

  // Simple avoid habit
  return (
    <div className={"bg-white rounded-2xl shadow-md p-4 transition-all " + (didIt ? "ring-2 ring-red-400 bg-red-50/50" : "ring-2 ring-[#58CC02]")}>
      <div className="flex items-center gap-3">
        <button onClick={() => onToggle(habit.id)} className={"w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black transition-all " + (didIt ? "bg-red-500 text-white shadow-lg shadow-red-200 scale-105" : "bg-green-50 text-green-500")}>
          {didIt ? "✗" : "✓"}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={"font-bold " + (didIt ? "text-red-600" : "text-gray-800")}>{habit.name}</span>
            {didIt ? (
              <span className="text-[10px] bg-red-50 text-red-500 rounded-full px-1.5 py-0.5 font-bold">-{habit.xpReward} XP</span>
            ) : (
              <span className="text-[10px] bg-green-50 text-green-600 rounded-full px-1.5 py-0.5 font-bold">+{habit.xpReward} XP</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gray-400">Diario</span>
            {didIt && <span className="text-xs text-red-400">Lo hiciste hoy</span>}
            {!didIt && <span className="text-xs text-green-500">Evitado hoy ✓</span>}
            {streak > 0 && !didIt && <span className="text-xs font-bold text-orange-500">🔥 {streak} sin caer</span>}
          </div>
        </div>
        <button onClick={() => setEditing(!editing)} className="text-gray-300 hover:text-gray-500 transition p-1">⋮</button>
      </div>
      {editing && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
          <button onClick={() => { onArchive(habit.id); setEditing(false); }} className="text-xs bg-blue-50 text-blue-600 rounded-lg px-3 py-1.5 font-medium hover:bg-blue-100">{habit.archived ? "Restaurar" : "Archivar"}</button>
          <button onClick={() => { onDelete(habit.id); setEditing(false); }} className="text-xs bg-red-50 text-red-600 rounded-lg px-3 py-1.5 font-medium hover:bg-red-100">Eliminar</button>
        </div>
      )}
    </div>
  );
}
""")

# ============================================================
# INSIGHTS SCREEN
# ============================================================
write("src/app/components/InsightsScreen.tsx", r"""
"use client";
import { useState } from "react";
import { Habit, JournalEntry, AppSettings } from "../types";
import { getDayXp, getHabitStreak, getCompletionRate, getRateColor, getRateBarColor, getRateLabel, getLocalDate, getWeekDates, calcAutoGoal } from "../utils";

interface InsightsScreenProps {
  habits: Habit[];
  journal: JournalEntry[];
  settings: AppSettings;
  effectiveGoal: number;
}

export default function InsightsScreen({ habits, journal, settings, effectiveGoal }: InsightsScreenProps) {
  const [tab, setTab] = useState<"overview" | "strategy">("overview");
  const today = getLocalDate();
  const activeHabits = habits.filter((h) => !h.archived);
  const weekDates = getWeekDates();
  const weekData = weekDates.map((date) => ({ date, xp: getDayXp(habits, journal, date) }));
  const overallStreak = (() => { let s = 0; for (let i = 0; i < 365; i++) { const d = new Date(today + "T12:00:00"); d.setDate(d.getDate() - i); const ds = d.toISOString().split("T")[0]; if (getDayXp(habits, journal, ds) >= effectiveGoal) s++; else break; } return s; })();
  const totalXpAllTime = habits.reduce((acc, h) => h.habitType === "build" ? acc + h.completions.length * h.xpReward : acc - h.completions.length * h.xpReward, 0) + journal.length * 15;

  const habitRates = activeHabits.map((h) => ({ habit: h, rate: getCompletionRate(h) })).sort((a, b) => a.rate - b.rate);
  const hardest = habitRates.filter((h) => h.rate < 60);
  const easiest = habitRates.filter((h) => h.rate >= 80);
  const avgRate = habitRates.length > 0 ? Math.round(habitRates.reduce((s, h) => s + h.rate, 0) / habitRates.length) : 0;

  return (
    <div className="space-y-4">
      <div className="flex bg-white rounded-2xl shadow-md overflow-hidden">
        <button onClick={() => setTab("overview")} className={"flex-1 py-2.5 text-sm font-bold transition " + (tab === "overview" ? "bg-[#58CC02] text-white" : "text-gray-500 hover:bg-gray-50")}>📊 Resumen</button>
        <button onClick={() => setTab("strategy")} className={"flex-1 py-2.5 text-sm font-bold transition " + (tab === "strategy" ? "bg-[#58CC02] text-white" : "text-gray-500 hover:bg-gray-50")}>🎯 Estrategia</button>
      </div>

      {tab === "overview" && (<>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-md p-4 text-center"><div className="text-3xl font-black text-[#58CC02]">{overallStreak}</div><div className="text-xs text-gray-500 font-medium">Racha actual 🔥</div></div>
          <div className="bg-white rounded-2xl shadow-md p-4 text-center"><div className={"text-3xl font-black " + (totalXpAllTime >= 0 ? "text-blue-500" : "text-red-500")}>{totalXpAllTime}</div><div className="text-xs text-gray-500 font-medium">XP totales ⭐</div></div>
          <div className="bg-white rounded-2xl shadow-md p-4 text-center"><div className="text-3xl font-black text-purple-500">{activeHabits.filter((h) => h.habitType === "build").length}/{activeHabits.filter((h) => h.habitType === "avoid").length}</div><div className="text-xs text-gray-500 font-medium">Construir/Evitar</div></div>
          <div className="bg-white rounded-2xl shadow-md p-4 text-center"><div className="text-3xl font-black text-orange-500">{journal.length}</div><div className="text-xs text-gray-500 font-medium">Entradas diario 📝</div></div>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-4">
          <h3 className="font-bold text-gray-800 mb-3">📊 XP por dia</h3>
          <div className="flex justify-between items-end h-28">
            {weekData.map((d, i) => {
              const dayName = new Date(d.date + "T12:00:00").toLocaleDateString("es", { weekday: "short" });
              const maxXP = Math.max(...weekData.map((w) => Math.abs(w.xp)), effectiveGoal);
              const absH = Math.max((Math.abs(d.xp) / maxXP) * 100, 3);
              const isToday = d.date === today;
              const hitGoal = d.xp >= effectiveGoal;
              const isNeg = d.xp < 0;
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <span className={"text-[9px] font-bold " + (isNeg ? "text-red-400" : "text-gray-400")}>{d.xp}</span>
                  <div className="w-full max-w-[28px]" style={{ height: absH + "%" }}>
                    <div className={"w-full h-full rounded-lg " + (hitGoal ? "bg-[#58CC02]" : isNeg ? "bg-red-400" : isToday ? "bg-blue-300" : "bg-gray-200")} />
                  </div>
                  <span className={"text-[10px] font-bold " + (isToday ? "text-[#58CC02]" : "text-gray-400")}>{dayName}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-4">
          <h3 className="font-bold text-gray-800 mb-3">🔥 Rachas</h3>
          {activeHabits.map((h) => (
            <div key={h.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-sm">{h.emoji} {h.name}</span>
                <span className={"text-[10px] font-bold " + (h.habitType === "avoid" ? "text-red-400" : "text-[#58CC02]")}>{h.habitType === "avoid" ? "-" : "+"}{h.xpReward}</span>
              </div>
              <span className="font-bold text-orange-500">{getHabitStreak(h)} {h.habitType === "avoid" ? "sin caer" : "dias"}</span>
            </div>
          ))}
        </div>
      </>)}

      {tab === "strategy" && (<>
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-gray-800">🎯 Tu rendimiento</h3>
            <span className={"font-black text-lg " + getRateColor(avgRate)}>{avgRate}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className={"h-full rounded-full " + getRateBarColor(avgRate)} style={{ width: avgRate + "%" }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">{getRateLabel(avgRate)} en promedio</p>
        </div>
        {hardest.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-4">
            <h3 className="font-bold text-red-500 mb-1">💪 Los que mas te cuestan</h3>
            <p className="text-xs text-gray-400 mb-3">Enfocate en estos para mejorar</p>
            <div className="space-y-3">
              {hardest.map(({ habit, rate }) => (
                <div key={habit.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{habit.emoji}</span>
                      <span className="font-medium text-gray-800 text-sm">{habit.name}</span>
                      <span className={"text-[10px] rounded-full px-1.5 py-0.5 font-bold " + (habit.habitType === "avoid" ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600")}>{habit.habitType === "avoid" ? "Evitar" : "Construir"}</span>
                    </div>
                    <span className={"font-black text-sm " + getRateColor(rate)}>{rate}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={"h-full rounded-full " + getRateBarColor(rate)} style={{ width: rate + "%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {easiest.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-4">
            <h3 className="font-bold text-[#58CC02] mb-1">⭐ Los que te salen facil</h3>
            <div className="space-y-3">
              {easiest.map(({ habit, rate }) => (
                <div key={habit.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><span className="text-lg">{habit.emoji}</span><span className="font-medium text-gray-800 text-sm">{habit.name}</span></div>
                    <span className="font-black text-sm text-[#58CC02]">{rate}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mt-1"><div className="h-full rounded-full bg-[#58CC02]" style={{ width: rate + "%" }} /></div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <h3 className="font-bold text-gray-800 mb-3">📊 Ranking completo</h3>
          <div className="space-y-2">
            {habitRates.map(({ habit, rate }, i) => (
              <div key={habit.id} className="flex items-center gap-3">
                <span className={"w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white " + (i === 0 ? "bg-red-400" : i === habitRates.length - 1 ? "bg-[#58CC02]" : "bg-gray-300")}>{i + 1}</span>
                <span className="text-sm">{habit.emoji}</span>
                <span className="flex-1 font-medium text-gray-700 text-sm">{habit.name}</span>
                <span className={"text-[10px] font-bold " + (habit.habitType === "avoid" ? "text-red-400" : "text-green-500")}>{habit.habitType === "avoid" ? "EVITAR" : "BUILD"}</span>
                <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden"><div className={"h-full rounded-full " + getRateBarColor(rate)} style={{ width: rate + "%" }} /></div>
                <span className={"font-bold text-sm w-10 text-right " + getRateColor(rate)}>{rate}%</span>
              </div>
            ))}
          </div>
        </div>
        {hardest.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl shadow-md p-4 border border-amber-100">
            <h3 className="font-bold text-amber-700 mb-1">💡 Consejo</h3>
            <p className="text-sm text-amber-600">
              Tu habito mas dificil es <strong>{hardest[0].habit.emoji} {hardest[0].habit.name}</strong> ({hardest[0].rate}%).
              {hardest[0].habit.habitType === "avoid" ? " Identifica que lo dispara y busca un reemplazo." : hardest[0].rate < 30 ? " Reduci la dificultad o cambialo a semanal." : " Vas por buen camino, un poco mas de constancia!"}
            </p>
          </div>
        )}
      </>)}
    </div>
  );
}
""")

# ============================================================
# JOURNAL SCREEN
# ============================================================
write("src/app/components/JournalScreen.tsx", r"""
"use client";
import { JournalEntry } from "../types";
import { MOOD_EMOJIS, MOOD_LABELS } from "../types";

interface JournalScreenProps {
  journal: JournalEntry[];
  todayMood: number;
  todayNote: string;
  onSetMood: (m: number) => void;
  onSetNote: (n: string) => void;
  onSave: () => void;
}

export default function JournalScreen({ journal, todayMood, todayNote, onSetMood, onSetNote, onSave }: JournalScreenProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800">Como te sentis hoy?</h3>
          <span className="text-xs bg-[#58CC02]/10 text-[#58CC02] font-bold px-2 py-1 rounded-lg">+15 XP</span>
        </div>
        <div className="flex justify-between mb-3">
          {MOOD_EMOJIS.map((emoji, i) => (
            <button key={i} onClick={() => onSetMood(i + 1)} className={"text-3xl transition-all " + (todayMood === i + 1 ? "scale-125 drop-shadow-lg" : "opacity-40 hover:opacity-70")}>{emoji}</button>
          ))}
        </div>
        {todayMood > 0 && <p className="text-center text-sm text-gray-500 mb-3">{MOOD_LABELS[todayMood - 1]}</p>}
        <textarea value={todayNote} onChange={(e) => onSetNote(e.target.value)} placeholder="Escribi algo sobre tu dia..." className="w-full bg-gray-50 rounded-xl p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-[#58CC02]" />
        <button onClick={onSave} disabled={todayMood === 0} className="mt-3 w-full bg-[#58CC02] text-white font-bold py-2.5 rounded-xl disabled:opacity-40 hover:bg-[#4fb002] transition">Guardar entrada</button>
      </div>
      <div className="space-y-2">
        {journal.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).map((entry) => (
          <div key={entry.date} className="bg-white rounded-2xl shadow-md p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{MOOD_EMOJIS[entry.mood - 1]}</span>
              <span className="font-bold text-gray-700">{entry.date}</span>
              <span className="text-xs text-[#58CC02] font-bold">+15 XP</span>
            </div>
            {entry.note && <p className="text-sm text-gray-500 ml-9">{entry.note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
""")

# ============================================================
# SETTINGS SCREEN
# ============================================================
write("src/app/components/SettingsScreen.tsx", r"""
"use client";
import { AppSettings, Habit } from "../types";
import { calcAutoGoal, getMaxPossibleXp, DEFAULT_SETTINGS } from "../utils";

interface SettingsScreenProps {
  settings: AppSettings;
  habits: Habit[];
  onUpdateSettings: (s: AppSettings) => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
}

export default function SettingsScreen({ settings, habits, onUpdateSettings, onExport, onImport, onReset }: SettingsScreenProps) {
  const autoGoal = calcAutoGoal(habits);
  const maxPossible = getMaxPossibleXp(habits);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-md p-4">
        <h3 className="font-bold text-gray-800 mb-4">⚙️ Configuracion</h3>
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div><div className="font-medium text-gray-800">🔔 Notificaciones</div><div className="text-xs text-gray-400">Recordatorios para tus habitos</div></div>
          <button onClick={() => onUpdateSettings({ ...settings, notificationsEnabled: !settings.notificationsEnabled })} className={"w-14 h-8 rounded-full transition-all relative " + (settings.notificationsEnabled ? "bg-[#58CC02]" : "bg-gray-300")}>
            <div className={"w-6 h-6 bg-white rounded-full absolute top-1 transition-all shadow " + (settings.notificationsEnabled ? "left-7" : "left-1")} />
          </button>
        </div>
        <div className="py-3 border-b border-gray-100">
          <div className="font-medium text-gray-800 mb-1">⏰ Intervalo</div>
          <div className="flex gap-2 mt-1">
            {[1, 2, 3, 6, 12].map((h) => (
              <button key={h} onClick={() => onUpdateSettings({ ...settings, nudgeIntervalHours: h })} className={"px-3 py-1.5 rounded-lg text-sm font-bold transition " + (settings.nudgeIntervalHours === h ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>{h}h</button>
            ))}
          </div>
        </div>
        <div className="py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <div className="font-medium text-gray-800">🎯 Meta diaria</div>
            <button onClick={() => onUpdateSettings({ ...settings, autoGoal: !settings.autoGoal })} className={"text-xs font-bold px-2 py-1 rounded-lg " + (settings.autoGoal ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>{settings.autoGoal ? "AUTO" : "MANUAL"}</button>
          </div>
          <div className="text-xs text-gray-400 mb-2">{settings.autoGoal ? "Auto: " + autoGoal + " XP (75% del maximo)" : "Manual"}</div>
          {!settings.autoGoal && (
            <div className="flex gap-2">
              {[50, 75, 100, 150, 200].map((xp) => (
                <button key={xp} onClick={() => onUpdateSettings({ ...settings, dailyXpGoal: xp })} className={"px-3 py-1.5 rounded-lg text-sm font-bold transition " + (settings.dailyXpGoal === xp ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>{xp}</button>
              ))}
            </div>
          )}
          {settings.autoGoal && (
            <div className="bg-gray-50 rounded-xl p-3 mt-1">
              <div className="text-xs text-gray-500">Max posible: {maxPossible} XP/dia</div>
              <div className="text-xs text-[#58CC02] font-bold">Meta auto: {autoGoal} XP/dia</div>
            </div>
          )}
        </div>
        <div className="py-3 border-b border-gray-100">
          <div className="font-medium text-gray-800 mb-1">💾 Datos</div>
          <div className="flex gap-2 mt-1">
            <button onClick={onExport} className="flex-1 bg-blue-50 text-blue-600 font-bold py-2 rounded-xl text-sm hover:bg-blue-100 transition">📤 Exportar</button>
            <button onClick={onImport} className="flex-1 bg-purple-50 text-purple-600 font-bold py-2 rounded-xl text-sm hover:bg-purple-100 transition">📥 Importar</button>
          </div>
        </div>
        <div className="py-3">
          <button onClick={onReset} className="w-full bg-red-50 text-red-600 font-bold py-2 rounded-xl text-sm hover:bg-red-100 transition">🗑 Reiniciar</button>
        </div>
      </div>
    </div>
  );
}
""")

# ============================================================
# ADD HABIT MODAL
# ============================================================
write("src/app/components/AddHabitModal.tsx", r"""
"use client";
import { useState } from "react";
import { Habit } from "../types";
import { getLocalDate } from "../utils";

interface AddHabitModalProps {
  onAdd: (habit: Habit) => void;
  onClose: () => void;
}

export default function AddHabitModal({ onAdd, onClose }: AddHabitModalProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [freq, setFreq] = useState<"daily" | "weekly">("daily");
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [xp, setXp] = useState(20);
  const [type, setType] = useState<"build" | "avoid">("build");
  const [progressive, setProgressive] = useState(false);
  const [unit, setUnit] = useState("min");
  const [minAmount, setMinAmount] = useState(5);

  const buildEmojis = ["🏃", "📖", "🧘", "💧", "🎵", "✍️", "🥗", "💤", "💊", "🧹", "🎯", "💪", "🎨", "🌿", "📱", "✨"];
  const avoidEmojis = ["🍔", "📱", "🛋️", "🚬", "🍺", "🍿", "🎮", "😴", "💸", "🤬"];
  const emojis = type === "avoid" ? avoidEmojis : buildEmojis;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({
      id: Date.now().toString(),
      name: name.trim(),
      emoji,
      frequency: freq,
      weeklyGoal: freq === "weekly" ? weeklyGoal : undefined,
      xpReward: xp,
      habitType: type,
      progressive,
      unit: progressive ? unit : undefined,
      minAmount: progressive ? minAmount : undefined,
      amounts: {},
      createdAt: getLocalDate(),
      completions: [],
      skips: [],
      archived: false,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-3xl p-6 w-full max-w-md space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-black text-xl text-gray-800">Nuevo habito</h3>
        <div>
          <label className="text-sm font-medium text-gray-600">Tipo</label>
          <div className="flex gap-2 mt-1">
            <button onClick={() => { setType("build"); setXp(20); setEmoji("✨"); }} className={"flex-1 py-3 rounded-xl font-bold text-sm transition " + (type === "build" ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>🟢 Construir (+XP)</button>
            <button onClick={() => { setType("avoid"); setXp(20); setEmoji("🍔"); }} className={"flex-1 py-3 rounded-xl font-bold text-sm transition " + (type === "avoid" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500")}>🔴 Evitar (-XP)</button>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Emoji</label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {emojis.map((e) => (
              <button key={e} onClick={() => setEmoji(e)} className={"text-2xl p-1.5 rounded-lg transition " + (emoji === e ? (type === "avoid" ? "bg-red-100 ring-2 ring-red-400" : "bg-[#58CC02]/20 ring-2 ring-[#58CC02]") : "hover:bg-gray-100")}>{e}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "avoid" ? "Ej: Comer chatarra" : "Ej: Correr 30 min"} className="w-full mt-1 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#58CC02]" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Frecuencia</label>
          <div className="flex gap-2 mt-1">
            <button onClick={() => setFreq("daily")} className={"flex-1 py-2.5 rounded-xl font-bold text-sm transition " + (freq === "daily" ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>📅 Diario</button>
            <button onClick={() => setFreq("weekly")} className={"flex-1 py-2.5 rounded-xl font-bold text-sm transition " + (freq === "weekly" ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>📆 Semanal</button>
          </div>
        </div>
        {freq === "weekly" && (
          <div>
            <label className="text-sm font-medium text-gray-600">Veces por semana</label>
            <div className="flex gap-2 mt-1">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button key={n} onClick={() => setWeeklyGoal(n)} className={"w-10 h-10 rounded-xl font-bold text-sm transition " + (weeklyGoal === n ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>{n}</button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="text-sm font-medium text-gray-600">{type === "avoid" ? "Penalidad XP" : "Recompensa XP"}</label>
          <div className="flex gap-2 mt-1">
            {(type === "avoid" ? [10, 20, 25, 30, 50] : [10, 15, 20, 30, 50]).map((x) => (
              <button key={x} onClick={() => setXp(x)} className={"px-4 py-2 rounded-xl font-bold text-sm transition " + (xp === x ? (type === "avoid" ? "bg-red-500 text-white" : "bg-[#58CC02] text-white") : "bg-gray-100 text-gray-500")}>{type === "avoid" ? "-" : "+"}{x}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-600">📊 Progresivo (rastrear cantidad)</label>
            <button onClick={() => setProgressive(!progressive)} className={"w-12 h-7 rounded-full transition-all relative " + (progressive ? "bg-[#58CC02]" : "bg-gray-300")}>
              <div className={"w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow " + (progressive ? "left-6" : "left-1")} />
            </button>
          </div>
          {progressive && (
            <div className="mt-2 space-y-2 p-3 bg-gray-50 rounded-xl">
              <div>
                <label className="text-xs font-medium text-gray-500">Unidad (min, km, paginas, rep...)</label>
                <input value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full mt-1 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#58CC02]" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Minimo para contar (ej: 5 min)</label>
                <input type="number" value={minAmount} onChange={(e) => setMinAmount(parseInt(e.target.value) || 0)} min={0} className="w-full mt-1 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#58CC02]" />
              </div>
              <p className="text-[10px] text-gray-400">
                {type === "build" ? "Ej: Leer 1 min = 1 XP. Minimo " + minAmount + " " + unit + " para contar. Maximo: " + xp + " XP." : "Ej: 1 " + unit + " = -1 XP. Si no lo hiciste: +" + xp + " XP."}
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition">Cancelar</button>
          <button onClick={handleSubmit} className={"flex-1 py-3 rounded-xl font-bold text-white transition " + (type === "avoid" ? "bg-red-500 hover:bg-red-600" : "bg-[#58CC02] hover:bg-[#4fb002]")}>
            {type === "avoid" ? "Crear habito a evitar" : "Crear habito"}
          </button>
        </div>
      </div>
    </div>
  );
}
""")

# ============================================================
# MAIN PAGE
# ============================================================
write("src/app/page.tsx", r"""
"use client";
import { useState, useEffect, useCallback } from "react";
import { Habit, JournalEntry, AppSettings } from "./types";
import { MOOD_EMOJIS } from "./types";
import {
  getLocalDate, getDayXp, getHabitXp, calcAutoGoal, getMaxPossibleXp,
  getOverallStreak, getXpLevel, DEFAULT_HABITS, DEFAULT_SETTINGS
} from "./utils";
import XPHeader from "./components/XPHeader";
import HabitCard from "./components/HabitCard";
import InsightsScreen from "./components/InsightsScreen";
import JournalScreen from "./components/JournalScreen";
import SettingsScreen from "./components/SettingsScreen";
import AddHabitModal from "./components/AddHabitModal";

export default function HabitDuo() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [screen, setScreen] = useState<"home" | "insights" | "journal" | "settings">("home");
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [todayMood, setTodayMood] = useState(0);
  const [todayNote, setTodayNote] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [prevXp, setPrevXp] = useState(0);

  // Load
  useEffect(() => {
    const sh = localStorage.getItem("habitduo-habits");
    if (sh) {
      const parsed = JSON.parse(sh);
      const migrated = parsed.map((h: any) => ({
        ...h,
        xpReward: h.xpReward || (h.frequency === "weekly" ? 30 : 20),
        habitType: h.habitType || "build",
        progressive: h.progressive || false,
        unit: h.unit || "min",
        minAmount: h.minAmount || 5,
        amounts: h.amounts || {},
      }));
      setHabits(migrated);
    } else setHabits(DEFAULT_HABITS);
    const sj = localStorage.getItem("habitduo-journal");
    if (sj) setJournal(JSON.parse(sj));
    const ss = localStorage.getItem("habitduo-settings");
    if (ss) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(ss) });
    const sm = localStorage.getItem("habitduo-todaymood");
    if (sm) setTodayMood(parseInt(sm));
    const sn = localStorage.getItem("habitduo-todaynote");
    if (sn) setTodayNote(sn);
  }, []);

  // Save
  useEffect(() => { if (habits.length > 0) localStorage.setItem("habitduo-habits", JSON.stringify(habits)); }, [habits]);
  useEffect(() => { localStorage.setItem("habitduo-journal", JSON.stringify(journal)); }, [journal]);
  useEffect(() => { localStorage.setItem("habitduo-settings", JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem("habitduo-todaymood", todayMood.toString()); }, [todayMood]);
  useEffect(() => { localStorage.setItem("habitduo-todaynote", todayNote); }, [todayNote]);

  // Computed
  const today = getLocalDate();
  const activeHabits = habits.filter((h) => !h.archived);
  const autoGoal = calcAutoGoal(habits);
  const effectiveGoal = settings.autoGoal ? autoGoal : settings.dailyXpGoal;
  const todayXp = getDayXp(habits, journal, today);
  const overallStreak = getOverallStreak(habits, journal, effectiveGoal);

  // Celebration
  useEffect(() => {
    if (todayXp >= effectiveGoal && prevXp < effectiveGoal) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
    setPrevXp(todayXp);
  }, [todayXp, effectiveGoal]);

  // Notifications
  const scheduleNudge = useCallback(() => {
    if (!settings.notificationsEnabled) return;
    const interval = settings.nudgeIntervalHours * 60 * 60 * 1000;
    const existingTimer = (window as any).__nudgeTimer;
    if (existingTimer) clearInterval(existingTimer);
    const timer = setInterval(() => {
      const txp = getDayXp(habits, journal, getLocalDate());
      if (txp < effectiveGoal) {
        const remaining = effectiveGoal - txp;
        const body = "Te faltan " + remaining + " XP para tu dia de racha!";
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "SHOW_NOTIFICATION", title: "HabitDuo", body });
        } else if ("Notification" in window && Notification.permission === "granted") {
          new Notification("HabitDuo", { body, icon: "/habit-duo/icons/icon-192.png" });
        }
      }
    }, interval);
    (window as any).__nudgeTimer = timer;
  }, [settings.notificationsEnabled, settings.nudgeIntervalHours, habits, journal, effectiveGoal]);

  useEffect(() => { scheduleNudge(); return () => { const t = (window as any).__nudgeTimer; if (t) clearInterval(t); }; }, [scheduleNudge]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SHOW_NOTIFICATION") {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(event.data.title, { body: event.data.body, icon: "/habit-duo/icons/icon-192.png", badge: "/habit-duo/icons/icon-192.png", vibrate: [100, 50, 100] });
          });
        }
      });
    }
  }, []);

  // Habit actions
  const toggleComplete = (id: string) => {
    setHabits((prev) => prev.map((h) => {
      if (h.id !== id) return h;
      if (h.completions.includes(today)) return { ...h, completions: [...new Set(h.completions.filter((c) => c !== today))] };
      return { ...h, completions: [...new Set([...h.completions, today])] };
    }));
  };

  const skipHabit = (id: string) => {
    setHabits((prev) => prev.map((h) => h.id !== id ? h : { ...h, skips: [...new Set([...h.skips, today])] }));
  };

  const updateAmount = (id: string, date: string, amount: number) => {
    setHabits((prev) => prev.map((h) => {
      if (h.id !== id) return h;
      const newAmounts = { ...h.amounts, [date]: amount };
      const newCompletions = [...h.completions];
      // For build progressive: auto-mark complete if amount >= minAmount
      if (h.habitType === "build" && h.progressive) {
        if (amount >= (h.minAmount || 5) && !newCompletions.includes(date)) {
          newCompletions.push(date);
        } else if (amount < (h.minAmount || 5)) {
          const idx = newCompletions.indexOf(date);
          if (idx >= 0) newCompletions.splice(idx, 1);
        }
      }
      // For avoid progressive: auto-mark if amount > 0
      if (h.habitType === "avoid" && h.progressive) {
        if (amount > 0 && !newCompletions.includes(date)) {
          newCompletions.push(date);
        } else if (amount === 0) {
          const idx = newCompletions.indexOf(date);
          if (idx >= 0) newCompletions.splice(idx, 1);
        }
      }
      return { ...h, amounts: newAmounts, completions: [...new Set(newCompletions)] };
    }));
  };

  const addHabit = (habit: Habit) => {
    setHabits((prev) => [...prev, habit]);
    setShowAddHabit(false);
  };

  const deleteHabit = (id: string) => setHabits((prev) => prev.filter((h) => h.id !== id));
  const archiveHabit = (id: string) => setHabits((prev) => prev.map((h) => h.id === id ? { ...h, archived: !h.archived } : h));

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ habits, journal, settings, exportDate: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "habitduo-backup-" + today + ".json"; a.click();
    URL.revokeObjectURL(url);
  };

  const importData = () => {
    const input = document.createElement("input"); input.type = "file"; input.accept = ".json";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.habits) setHabits(data.habits);
          if (data.journal) setJournal(data.journal);
          if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
          alert("Datos importados correctamente");
        } catch { alert("Error al importar datos"); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const saveJournalEntry = () => {
    if (todayMood === 0) return;
    setJournal((prev) => [...prev.filter((e) => e.date !== today), { date: today, mood: todayMood, note: todayNote }]);
  };

  // XP breakdown
  const xpBreakdown = activeHabits.map((h) => {
    const xp = getHabitXp(h, today);
    const amount = h.amounts?.[today] || 0;
    const isAvoid = h.habitType === "avoid";
    if (isAvoid && h.progressive && amount === 0) return { id: h.id, label: h.emoji + " " + h.name + " evitado", xp, isAvoid: false };
    if (isAvoid && h.progressive && amount > 0) return { id: h.id, label: h.emoji + " " + h.name, xp, isAvoid: true };
    if (isAvoid && !h.progressive && h.completions.includes(today)) return { id: h.id, label: h.emoji + " " + h.name, xp, isAvoid: true };
    if (isAvoid && !h.progressive && !h.completions.includes(today)) return { id: h.id, label: h.emoji + " " + h.name + " evitado", xp, isAvoid: false };
    if (!isAvoid && xp > 0) return { id: h.id, label: h.emoji + " " + h.name + (h.progressive ? " " + amount + " " + (h.unit || "min") : ""), xp, isAvoid: false };
    return null;
  }).filter(Boolean);

  const buildHabits = activeHabits.filter((h) => h.habitType === "build");
  const avoidHabits = activeHabits.filter((h) => h.habitType === "avoid");

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#58CC02] to-[#46a302] pb-20">
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center animate-bounce">
            <div className="text-6xl mb-3">🔥</div>
            <div className="text-2xl font-black text-[#58CC02]">Dia de racha!</div>
            <div className="text-sm text-gray-500 mt-1">{todayXp} XP</div>
          </div>
        </div>
      )}

      <XPHeader todayXp={todayXp} effectiveGoal={effectiveGoal} overallStreak={overallStreak} autoGoal={settings.autoGoal} onSettings={() => setScreen("settings")} />

      <div className="max-w-md mx-auto px-4 -mt-4 space-y-4">
        {/* Nav */}
        <div className="flex bg-white rounded-2xl shadow-lg overflow-hidden">
          {(["home", "insights", "journal"] as const).map((key) => (
            <button key={key} onClick={() => setScreen(key)} className={"flex-1 py-3 text-sm font-bold transition " + (screen === key ? "bg-[#58CC02] text-white" : "text-gray-500 hover:bg-gray-50")}>
              {key === "home" ? "🏠 Inicio" : key === "insights" ? "📊 Insights" : "📝 Diario"}
            </button>
          ))}
        </div>

        {screen === "home" && (
          <div className="space-y-3">
            {/* XP breakdown */}
            <div className="bg-white rounded-2xl shadow-md p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-800 text-sm">XP de hoy</h3>
                <span className={"font-black " + (todayXp >= effectiveGoal ? "text-[#58CC02]" : todayXp < 0 ? "text-red-500" : "text-gray-400")}>{todayXp}/{effectiveGoal}</span>
              </div>
              <div className="space-y-1">
                {xpBreakdown.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-xs text-gray-500">
                    <span>{item.label}</span>
                    <span className={"font-bold " + (item.isAvoid || item.xp < 0 ? "text-red-500" : "text-[#58CC02]")}>{item.xp > 0 ? "+" : ""}{item.xp} XP</span>
                  </div>
                ))}
                {journal.find((e) => e.date === today) && <div className="flex justify-between text-xs text-gray-500"><span>📝 Diario</span><span className="text-[#58CC02] font-bold">+15 XP</span></div>}
                {todayXp === 0 && <p className="text-xs text-gray-400 text-center py-1">Completa habitos para ganar XP</p>}
              </div>
            </div>

            {/* Build habits */}
            {buildHabits.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">🟢 Construir</h3>
                {buildHabits.map((h) => (
                  <HabitCard key={h.id} habit={h} onToggle={toggleComplete} onSkip={skipHabit} onUpdateAmount={updateAmount} onArchive={archiveHabit} onDelete={deleteHabit} />
                ))}
              </div>
            )}

            {/* Avoid habits */}
            {avoidHabits.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">🔴 Evitar</h3>
                {avoidHabits.map((h) => (
                  <HabitCard key={h.id} habit={h} onToggle={toggleComplete} onSkip={skipHabit} onUpdateAmount={updateAmount} onArchive={archiveHabit} onDelete={deleteHabit} />
                ))}
              </div>
            )}

            <button onClick={() => setShowAddHabit(true)} className="w-full bg-white border-2 border-dashed border-[#58CC02] rounded-2xl p-4 text-[#58CC02] font-bold hover:bg-green-50 transition">+ Agregar habito</button>
          </div>
        )}

        {screen === "insights" && <InsightsScreen habits={habits} journal={journal} settings={settings} effectiveGoal={effectiveGoal} />}
        {screen === "journal" && <JournalScreen journal={journal} todayMood={todayMood} todayNote={todayNote} onSetMood={setTodayMood} onSetNote={setTodayNote} onSave={saveJournalEntry} />}
        {screen === "settings" && <SettingsScreen settings={settings} habits={habits} onUpdateSettings={setSettings} onExport={exportData} onImport={importData} onReset={() => { if (confirm("Borrar todos los datos?")) { localStorage.clear(); window.location.reload(); } }} />}
      </div>

      {showAddHabit && <AddHabitModal onAdd={addHabit} onClose={() => setShowAddHabit(false)} />}
    </div>
  );
}
""")

print("\n✅ Todos los archivos creados!")
print("Ejecuta: cd ~/habit-duo-fix && git add -A && git commit -m 'refactor: modular architecture, timezone fix, progressive habits' && git push origin main")
