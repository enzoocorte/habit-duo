#!/usr/bin/env python3
"""Generate HabitDuo PWA - Full project generator"""

import os

def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  ✓ {path}")

def main():
    base = os.path.dirname(os.path.abspath(__file__))
    
    # ========================
    # package.json
    # ========================
    write(os.path.join(base, "package.json"), '''{
  "name": "habit-duo",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "canvas-confetti": "^1.9.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "@types/canvas-confetti": "^1.6.0"
  }
}''')

    # ========================
    # next.config.js
    # ========================
    write(os.path.join(base, "next.config.js"), '''/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/habit-duo',
  assetPrefix: '/habit-duo/',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

module.exports = nextConfig;
''')

    # ========================
    # tsconfig.json
    # ========================
    write(os.path.join(base, "tsconfig.json"), '''{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
''')

    # ========================
    # tailwind.config.ts
    # ========================
    write(os.path.join(base, "tailwind.config.ts"), '''import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;
''')

    # ========================
    # postcss.config.js
    # ========================
    write(os.path.join(base, "postcss.config.js"), '''module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
''')

    # ========================
    # public/manifest.json
    # ========================
    write(os.path.join(base, "public", "manifest.json"), '''{
  "name": "HabitDuo",
  "short_name": "HabitDuo",
  "description": "Duolingo-style habit tracker PWA",
  "start_url": "/habit-duo/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#6c5ce7",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/habit-duo/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/habit-duo/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}''')

    # ========================
    # public/sw.js
    # ========================
    write(os.path.join(base, "public", "sw.js"), r'''const CACHE_NAME = "habit-duo-v2";
const ASSETS = ["/habit-duo/"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request))
  );
});

// Smart notification scheduling
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SCHEDULE_NOTIFICATIONS") {
    scheduleSmartNotifications(event.data.payload);
  }
  if (event.data && event.data.type === "CANCEL_NOTIFICATIONS") {
    cancelAllNotifications();
  }
});

async function scheduleSmartNotifications(payload) {
  const { todayXp, effectiveGoal, incompleteHabits, streak } = payload;
  
  // Cancel existing scheduled notifications
  await cancelAllNotifications();
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Type 1: Streak at risk - at 18:00
  if (todayXp < effectiveGoal * 0.5) {
    const hour18 = new Date(today);
    hour18.setHours(18, 0, 0, 0);
    if (hour18 > now) {
      const missing = effectiveGoal - todayXp;
      scheduleNotification(
        "streak-risk",
        hour18,
        "\ud83d\udd25 Tu racha est\u00e1 en riesgo",
        `Te faltan ${missing} XP para tu goal. \u00a1Vamos!`
      );
    }
  }
  
  // Type 2: Last chance - at 21:00
  if (todayXp < effectiveGoal) {
    const hour21 = new Date(today);
    hour21.setHours(21, 0, 0, 0);
    if (hour21 > now) {
      const missing = effectiveGoal - todayXp;
      scheduleNotification(
        "last-chance",
        hour21,
        "\u23f3 \u00daltima oportunidad",
        `Te faltan ${missing} XP. \u00a1Salv\u00e1 tu racha!`
      );
    }
  }
  
  // Type 4: Specific habit reminder - at 17:00
  if (incompleteHabits && incompleteHabits.length > 0) {
    const hour17 = new Date(today);
    hour17.setHours(17, 0, 0, 0);
    if (hour17 > now) {
      const habit = incompleteHabits[0];
      scheduleNotification(
        "habit-reminder",
        hour17,
        `\ud83c\udfc3 ${habit.name} te espera`,
        habit.progressive 
          ? `${habit.minAmount || 5} ${habit.unit || "min"} ahora valen ${habit.barrierBonus || 10} XP`
          : `\u00a1Completalo y gan\u00e1 ${habit.xpReward} XP!`
      );
    }
  }
}

function scheduleNotification(id, time, title, body) {
  // Store notification in IndexedDB for reliability
  const dbPromise = openDB();
  dbPromise.then(db => {
    const tx = db.transaction("notifications", "readwrite");
    tx.objectStore("notifications").put({
      id,
      time: time.getTime(),
      title,
      body,
      fired: false
    });
  });
  
  // Use setTimeout as backup (works while app is open)
  const delay = time.getTime() - Date.now();
  if (delay > 0 && delay < 86400000) {
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: "/habit-duo/icon-192.png",
        badge: "/habit-duo/icon-192.png",
        tag: id,
        vibrate: [200, 100, 200],
        data: { type: id }
      });
    }, delay);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("HabitDuoNotifications", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("notifications")) {
        db.createObjectStore("notifications", { keyPath: "id" });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function cancelAllNotifications() {
  self.registration.getNotifications().then(notifications => {
    notifications.forEach(n => n.close());
  });
}

// Periodic background check (every 30 min when app might be in background)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "habit-check") {
    event.waitUntil(checkAndNotify());
  }
});

async function checkAndNotify() {
  // Notify clients to send updated data
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: "REQUEST_UPDATE" });
  });
}
''')

    # ========================
    # src/app/globals.css
    # ========================
    write(os.path.join(base, "src", "app", "globals.css"), '''@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-card: #1e2a4a;
  --accent-purple: #6c5ce7;
  --accent-green: #00b894;
  --accent-red: #e17055;
  --accent-yellow: #fdcb6e;
  --accent-blue: #74b9ff;
  --text-primary: #dfe6e9;
  --text-secondary: #b2bec3;
}

* {
  box-sizing: border-box;
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
}

.xp-bar-fill {
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.habit-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.habit-card:active {
  transform: scale(0.97);
}

@keyframes celebrate {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.celebrate {
  animation: celebrate 0.5s ease-in-out;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.slide-up {
  animation: slideUp 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 5px rgba(108, 92, 231, 0.3); }
  50% { box-shadow: 0 0 20px rgba(108, 92, 231, 0.6); }
}

.pulse-glow {
  animation: pulse-glow 2s infinite;
}

@keyframes achievement-pop {
  0% { transform: scale(0) rotate(-10deg); opacity: 0; }
  60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

.achievement-pop {
  animation: achievement-pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes confetti-fall {
  0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: #2d3436;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent-purple);
  cursor: pointer;
}
''')

    # ========================
    # src/app/types.ts
    # ========================
    write(os.path.join(base, "src", "app", "types.ts"), '''export interface Habit {
  id: string;
  name: string;
  emoji: string;
  habitType: "build" | "avoid";
  xpReward: number;
  progressive: boolean;
  unit?: string;
  minAmount?: number;
  barrierBonus?: number;  // XP bonus for breaking the starting barrier
  amounts?: Record<string, number>;
  completions?: string[];
  skips?: string[];
  archived?: boolean;
  createdAt?: string;
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
  unlockedAt?: string;  // date when unlocked, undefined = locked
}

export interface AppSettings {
  dailyGoal: number;
  autoGoal: boolean;
  notifications: boolean;
  notificationInterval: number;
  smartNotifications: boolean;
}

export const MOOD_EMOJIS = ["😢", "😕", "😐", "🙂", "😄"];
export const MOOD_LABELS = ["Terrible", "Mal", "Normal", "Bien", "Genial"];

export const ACHIEVEMENT_DEFS: Achievement[] = [
  { id: "streak_3", name: "Primeros pasos", emoji: "🔥", description: "3 días seguidos con racha" },
  { id: "streak_7", name: "En racha", emoji: "🔥", description: "7 días seguidos con racha" },
  { id: "streak_14", name: "Imparable", emoji: "💥", description: "14 días seguidos con racha" },
  { id: "streak_30", name: "Leyenda", emoji: "⚡", description: "30 días seguidos con racha" },
  { id: "streak_60", name: "Mítico", emoji: "🌟", description: "60 días seguidos con racha" },
  { id: "streak_100", name: "Dios del hábito", emoji: "👑", description: "100 días seguidos con racha" },
  { id: "level_5", name: "Aprendiz", emoji: "📖", description: "Alcanzar nivel 5" },
  { id: "level_10", name: "Disciplinado", emoji: "🎯", description: "Alcanzar nivel 10" },
  { id: "level_25", name: "Maestro", emoji: "🏅", description: "Alcanzar nivel 25" },
  { id: "level_50", name: "Gran Maestro", emoji: "💎", description: "Alcanzar nivel 50" },
  { id: "total_xp_500", name: "Medio kilo", emoji: "💰", description: "Acumular 500 XP total" },
  { id: "total_xp_2000", name: "Dos kilos", emoji: "💰", description: "Acumular 2.000 XP total" },
  { id: "total_xp_5000", name: "Cinco kilos", emoji: "💰", description: "Acumular 5.000 XP total" },
  { id: "total_xp_10000", name: "Diez kilos", emoji: "💰", description: "Acumular 10.000 XP total" },
  { id: "perfect_week", name: "Semana perfecta", emoji: "🏆", description: "Completar 100% de una semana" },
  { id: "all_habits_day", name: "Día perfecto", emoji: "⭐", description: "Completar todos los hábitos un día" },
  { id: "journal_7", name: "Escritor", emoji: "✍️", description: "Escribir 7 entradas en el diario" },
  { id: "journal_30", name: "Cronista", emoji: "📝", description: "Escribir 30 entradas en el diario" },
  { id: "avoid_7", name: "Resistencia", emoji: "🛡️", description: "7 días evitando un mal hábito" },
  { id: "avoid_30", name: "Inquebrantable", emoji: "🚫", description: "30 días evitando un mal hábito" },
];
''')

    # ========================
    # src/app/utils.ts
    # ========================
    write(os.path.join(base, "src", "app", "utils.ts"), '''import { Habit, JournalEntry, AppSettings, Achievement, ACHIEVEMENT_DEFS } from "./types";

// ===== TIMEZONE =====
export function getLocalDate(): string {
  try {
    return new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    });
  } catch {
    // Fallback: manual UTC-3 offset
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

// ===== XP CALCULATIONS =====
export function getHabitXp(habit: Habit, date: string): number {
  const isCompleted = habit.completions?.includes(date) ?? false;
  const isSkipped = habit.skips?.includes(date) ?? false;
  const amount = habit.amounts?.[date] ?? 0;

  if (habit.habitType === "avoid") {
    if (isSkipped) return 0;
    if (isCompleted) {
      // Did the bad habit → lose XP
      return -habit.xpReward;
    }
    // Avoided it → gain XP
    return habit.xpReward;
  }

  // Build habit
  if (habit.progressive) {
    if (isSkipped) return 0;
    const minAmount = habit.minAmount ?? 1;
    const barrierBonus = habit.barrierBonus ?? (minAmount * 2);
    
    if (amount >= minAmount) {
      // Broke the barrier! Give barrierBonus + 1 XP per extra unit
      const extraUnits = amount - minAmount;
      const totalXp = barrierBonus + extraUnits;
      // Cap at xpReward
      return Math.min(totalXp, habit.xpReward);
    }
    // Didn't reach minimum → 0 XP
    return 0;
  }

  // Simple build habit
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
  return habits
    .filter((h) => !h.archived)
    .reduce((sum, h) => {
      if (h.habitType === "avoid") return sum + h.xpReward;
      if (h.progressive) return sum + h.xpReward; // max = xpReward (capped)
      return sum + h.xpReward;
    }, 0);
}

export function calcAutoGoal(habits: Habit[]): number {
  const max = getMaxPossibleXp(habits);
  return Math.round(max * 0.75);
}

// ===== STREAKS =====
export function getOverallStreak(habits: Habit[], settings: AppSettings): number {
  let streak = 0;
  const today = getLocalDate();
  let checkDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split("T")[0];
    const dayXp = getDayXp(habits, dateStr);
    const goal = settings.autoGoal ? calcAutoGoal(habits) : settings.dailyGoal;

    if (dateStr === today) {
      // Today: don't break streak if still in progress
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
      done = !isCompleted && !isSkipped; // avoided = not done bad thing
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

// ===== COMPLETION =====
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

// ===== VISUAL HELPERS =====
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

// ===== XP LEVEL SYSTEM =====
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
  const today = getLocalDate();
  // Calculate total XP across all days
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

// ===== ACHIEVEMENTS =====
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
  const todayXp = getDayXp(habits, today);

  const goal = settings.autoGoal ? calcAutoGoal(habits) : settings.dailyGoal;

  // Journal count
  const journalCount = Object.keys(journalEntries).length;

  // Check each achievement definition
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
      const activeHabits = habits.filter(h => !h.archived);
      return activeHabits.every(h => {
        if (h.habitType === "avoid") return !h.completions?.includes(today);
        if (h.progressive) return (h.amounts?.[today] ?? 0) >= (h.minAmount ?? 1);
        return h.completions?.includes(today);
      });
    },
    journal_7: () => journalCount >= 7,
    journal_30: () => journalCount >= 30,
    avoid_7: () => {
      return habits.some(h => h.habitType === "avoid" && getHabitStreak(h) >= 7);
    },
    avoid_30: () => {
      return habits.some(h => h.habitType === "avoid" && getHabitStreak(h) >= 30);
    },
  };

  let changed = false;
  ACHIEVEMENT_DEFS.forEach(def => {
    const existing = unlocked.find(a => a.id === def.id);
    if (!existing) {
      // New achievement not in user's list yet
      if (checks[def.id]?.()) {
        unlocked.push({ ...def, unlockedAt: today });
        changed = true;
      }
    } else if (!existing.unlockedAt && checks[def.id]?.()) {
      existing.unlockedAt = today;
      changed = true;
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

// ===== DEFAULTS =====
export const DEFAULT_HABITS: Habit[] = [
  {
    id: "h1",
    name: "Ejercicio",
    emoji: "🏃",
    habitType: "build",
    xpReward: 30,
    progressive: true,
    unit: "min",
    minAmount: 10,
    barrierBonus: 20,
    amounts: {},
    completions: [],
    skips: [],
  },
  {
    id: "h2",
    name: "Leer",
    emoji: "📖",
    habitType: "build",
    xpReward: 30,
    progressive: true,
    unit: "min",
    minAmount: 5,
    barrierBonus: 10,
    amounts: {},
    completions: [],
    skips: [],
  },
  {
    id: "h3",
    name: "Meditar",
    emoji: "🧘",
    habitType: "build",
    xpReward: 20,
    progressive: true,
    unit: "min",
    minAmount: 5,
    barrierBonus: 10,
    amounts: {},
    completions: [],
    skips: [],
  },
  {
    id: "h4",
    name: "Comer bien",
    emoji: "🥗",
    habitType: "build",
    xpReward: 25,
    progressive: false,
    amounts: {},
    completions: [],
    skips: [],
  },
  {
    id: "h5",
    name: "Comer mal",
    emoji: "🍔",
    habitType: "avoid",
    xpReward: 20,
    progressive: false,
    amounts: {},
    completions: [],
    skips: [],
  },
  {
    id: "h6",
    name: "Celular de más",
    emoji: "📱",
    habitType: "avoid",
    xpReward: 15,
    progressive: false,
    amounts: {},
    completions: [],
    skips: [],
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  dailyGoal: 50,
  autoGoal: true,
  notifications: false,
  notificationInterval: 180,
  smartNotifications: true,
};
''')

    # ========================
    # src/app/components/XPHeader.tsx
    # ========================
    write(os.path.join(base, "src", "app", "components", "XPHeader.tsx"), '''import { Habit, JournalEntry, AppSettings } from "../types";
import { getDayXp, getBarColor, getOverallStreak, getXpLevel, getTotalXp, getLocalDate } from "../utils";

interface Props {
  habits: Habit[];
  settings: AppSettings;
  journal: JournalEntry | null;
  effectiveGoal: number;
  streak: number;
  journalEntries: Record<string, JournalEntry>;
}

export default function XPHeader({ habits, settings, journal, effectiveGoal, streak, journalEntries }: Props) {
  const today = getLocalDate();
  const todayXp = getDayXp(habits, today, journal || undefined);
  const pct = effectiveGoal > 0 ? Math.min((todayXp / effectiveGoal) * 100, 100) : 0;
  const barColor = getBarColor(pct);
  const totalXp = getTotalXp(habits, journalEntries);
  const { level, name, emoji, progress: levelProgress } = getXpLevel(totalXp);
  const xpInLevel = totalXp % 500;

  return (
    <div className="px-4 pt-4 pb-2">
      {/* Global Level */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <div>
            <div className="text-sm font-bold" style={{ color: "#6c5ce7" }}>
              Nivel {level} — {name}
            </div>
            <div className="text-xs" style={{ color: "#b2bec3" }}>
              {xpInLevel}/500 XP al siguiente nivel
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: "#b2bec3" }}>XP Total</div>
          <div className="text-lg font-bold" style={{ color: "#6c5ce7" }}>{totalXp.toLocaleString()}</div>
        </div>
      </div>

      {/* Level progress bar */}
      <div className="w-full h-1.5 rounded-full mb-3" style={{ background: "#2d3436" }}>
        <div
          className="h-full rounded-full xp-bar-fill"
          style={{ width: `${levelProgress * 100}%`, background: "linear-gradient(90deg, #6c5ce7, #a29bfe)" }}
        />
      </div>

      {/* Daily XP */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold">Hoy: {todayXp} XP</span>
        <span className="text-xs" style={{ color: "#b2bec3" }}>
          Meta: {effectiveGoal} XP
        </span>
      </div>
      <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "#2d3436" }}>
        <div
          className="h-full rounded-full xp-bar-fill relative"
          style={{ width: `${pct}%`, background: barColor }}
        >
          {pct >= 100 && (
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-black">
              ✓
            </span>
          )}
        </div>
      </div>

      {/* Streak */}
      <div className="flex items-center justify-center gap-1 mt-2">
        <span className="text-lg">🔥</span>
        <span className="text-sm font-bold" style={{ color: "#fdcb6e" }}>
          {streak} {streak === 1 ? "día" : "días"} de racha
        </span>
      </div>
    </div>
  );
}
''')

    # ========================
    # src/app/components/HabitCard.tsx
    # ========================
    write(os.path.join(base, "src", "app", "components", "HabitCard.tsx"), '''import { Habit } from "../types";
import { getHabitXp, getHabitStreak, getCompletionRate, getRateColor, getLocalDate } from "../utils";

interface Props {
  habit: Habit;
  onToggle: (id: string) => void;
  onSkip: (id: string) => void;
  onUpdateAmount: (id: string, amount: number) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}

export default function HabitCard({ habit, onToggle, onSkip, onUpdateAmount, onDelete, onArchive }: Props) {
  const today = getLocalDate();
  const isCompleted = habit.completions?.includes(today) ?? false;
  const isSkipped = habit.skips?.includes(today) ?? false;
  const amount = habit.amounts?.[today] ?? 0;
  const xp = getHabitXp(habit, today);
  const streak = getHabitStreak(habit);
  const rate = getCompletionRate(habit);
  const rateColor = getRateColor(rate);

  const isBuild = habit.habitType === "build";
  const isProgressive = habit.progressive;
  const minAmount = habit.minAmount ?? 1;
  const barrierBonus = habit.barrierBonus ?? (minAmount * 2);
  const unit = habit.unit || "unidades";

  const reachedMin = isProgressive && amount >= minAmount;
  const quickAmounts = [5, 10, 15, 30];

  // Card background based on state
  let bgColor = "#1e2a4a";
  if (isBuild && isProgressive && reachedMin) bgColor = "#1a3a2a";
  else if (isBuild && !isProgressive && isCompleted) bgColor = "#1a3a2a";
  else if (!isBuild && !isCompleted && !isSkipped) bgColor = "#1a3a2a";
  else if (!isBuild && isCompleted) bgColor = "#3a1a1a";
  else if (isSkipped) bgColor = "#2d2d3a";

  return (
    <div
      className="habit-card rounded-xl p-4 mb-3"
      style={{ background: bgColor, border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{habit.emoji}</span>
          <div>
            <div className="font-semibold text-sm">{habit.name}</div>
            <div className="text-xs" style={{ color: "#b2bec3" }}>
              {isBuild ? "Construir" : "Evitar"} · {habit.xpReward} XP max
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Streak */}
          {streak > 1 && (
            <span className="text-xs" style={{ color: "#fdcb6e" }}>
              🔥{streak}
            </span>
          )}
          {/* XP earned today */}
          <span
            className="text-sm font-bold"
            style={{ color: xp > 0 ? "#00b894" : xp < 0 ? "#e17055" : "#b2bec3" }}
          >
            {xp > 0 ? `+${xp}` : xp < 0 ? `${xp}` : "0"} XP
          </span>
        </div>
      </div>

      {/* Completion rate bar */}
      <div className="w-full h-1.5 rounded-full mb-2" style={{ background: "#2d3436" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${rate * 100}%`, background: rateColor }}
        />
      </div>

      {/* Progressive build habit */}
      {isBuild && isProgressive && (
        <div>
          {/* Barrier bonus info */}
          <div className="text-xs mb-2 px-1" style={{ color: "#b2bec3" }}>
            <span style={{ color: "#fdcb6e" }}>⚡ Bonus barrera:</span>{" "}
            {minAmount} {unit} = {barrierBonus} XP, luego +1 XP/{unit}
          </div>

          {/* Current amount display */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg font-bold" style={{ color: reachedMin ? "#00b894" : "#e17055" }}>
              {amount}
            </span>
            <span className="text-xs" style={{ color: "#b2bec3" }}>
              / {minAmount} {unit} mínimo
            </span>
            {reachedMin && <span className="text-xs">✅</span>}
            {!reachedMin && amount > 0 && (
              <span className="text-xs" style={{ color: "#fdcb6e" }}>
                Faltan {minAmount - amount} {unit}
              </span>
            )}
          </div>

          {/* Quick add buttons */}
          <div className="flex gap-2 mb-2">
            {quickAmounts.map((qa) => (
              <button
                key={qa}
                onClick={() => onUpdateAmount(habit.id, amount + qa)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: reachedMin ? "#00b894" : "#6c5ce7",
                  color: "white",
                }}
              >
                +{qa} {unit}
              </button>
            ))}
          </div>

          {/* Custom amount input */}
          <div className="flex items-center gap-2 mb-2">
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => onUpdateAmount(habit.id, Math.max(0, parseInt(e.target.value) || 0))}
              className="w-20 px-2 py-1 rounded text-sm text-black"
              placeholder="0"
            />
            <span className="text-xs" style={{ color: "#b2bec3" }}>{unit}</span>
            {amount > 0 && (
              <button
                onClick={() => onUpdateAmount(habit.id, 0)}
                className="text-xs px-2 py-1 rounded"
                style={{ background: "#e17055", color: "white" }}
              >
                Reset
              </button>
            )}
          </div>

          {/* XP breakdown for progressive */}
          {amount > 0 && (
            <div className="text-xs px-1" style={{ color: "#b2bec3" }}>
              {reachedMin ? (
                <>
                  Barrera ({minAmount} {unit}): <span style={{ color: "#00b894" }}>+{barrierBonus} XP</span>
                  {amount > minAmount && (
                    <> · Extra ({amount - minAmount} {unit}): <span style={{ color: "#74b9ff" }}>+{amount - minAmount} XP</span></>
                  )}
                  <> · Total: <span style={{ color: "#fdcb6e" }}>{xp} XP</span></>
                </>
              ) : (
                <>
                  Aún no rompiste la barrera ({amount}/{minAmount} {unit}). ¡Faltan {minAmount - amount} {unit} para {barrierBonus} XP!
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Simple build habit */}
      {isBuild && !isProgressive && (
        <button
          onClick={() => onToggle(habit.id)}
          className="w-full py-2.5 rounded-lg font-bold text-sm transition-all"
          style={{
            background: isCompleted ? "#00b894" : "#6c5ce7",
            color: "white",
          }}
        >
          {isCompleted ? "✓ Completado" : `Completar (+${habit.xpReward} XP)`}
        </button>
      )}

      {/* Avoid habit */}
      {!isBuild && (
        <div>
          <button
            onClick={() => onToggle(habit.id)}
            className="w-full py-2.5 rounded-lg font-bold text-sm transition-all"
            style={{
              background: isCompleted ? "#e17055" : "#2d3436",
              color: isCompleted ? "white" : "#b2bec3",
              border: isCompleted ? "none" : "1px solid #e17055",
            }}
          >
            {isCompleted
              ? `😔 Caí (-${habit.xpReward} XP)`
              : `🛡 Evitado (+${habit.xpReward} XP)`}
          </button>
          {!isCompleted && (
            <div className="text-xs text-center mt-1" style={{ color: "#00b894" }}>
              ¡Vas bien! No caíste hoy.
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex gap-2">
          {!isSkipped && !isCompleted && isBuild && !isProgressive && (
            <button
              onClick={() => onSkip(habit.id)}
              className="text-xs px-2 py-1 rounded"
              style={{ background: "#2d3436", color: "#b2bec3" }}
            >
              Saltar
            </button>
          )}
          {!isSkipped && !reachedMin && isBuild && isProgressive && (
            <button
              onClick={() => onSkip(habit.id)}
              className="text-xs px-2 py-1 rounded"
              style={{ background: "#2d3436", color: "#b2bec3" }}
            >
              Saltar
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onArchive(habit.id)}
            className="text-xs px-2 py-1 rounded"
            style={{ background: "#2d3436", color: "#b2bec3" }}
          >
            Archivar
          </button>
          <button
            onClick={() => {
              if (confirm("¿Eliminar este hábito?")) onDelete(habit.id);
            }}
            className="text-xs px-2 py-1 rounded"
            style={{ background: "#2d3436", color: "#e17055" }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
''')

    # ========================
    # src/app/components/InsightsScreen.tsx
    # ========================
    write(os.path.join(base, "src", "app", "components", "InsightsScreen.tsx"), '''import { useState } from "react";
import { Habit, JournalEntry, AppSettings, Achievement } from "../types";
import { getWeekDates, getDayXp, getHabitStreak, getCompletionRate, getRateColor, getRateLabel, getLocalDate, getXpLevel, getTotalXp, getOverallStreak, ACHIEVEMENT_DEFS } from "../utils";

interface Props {
  habits: Habit[];
  settings: AppSettings;
  journalEntries: Record<string, JournalEntry>;
  achievements: Achievement[];
}

export default function InsightsScreen({ habits, settings, journalEntries, achievements }: Props) {
  const [tab, setTab] = useState<"overview" | "strategy" | "achievements">("overview");
  const today = getLocalDate();
  const dates = getWeekDates();
  const activeHabits = habits.filter((h) => !h.archived);
  const totalXp = getTotalXp(habits, journalEntries);
  const { level, name, emoji, progress } = getXpLevel(totalXp);
  const streak = getOverallStreak(habits, settings);

  return (
    <div className="px-4 pb-20">
      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: "#16213e" }}>
        {(["overview", "strategy", "achievements"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: tab === t ? "#6c5ce7" : "transparent",
              color: tab === t ? "white" : "#b2bec3",
            }}
          >
            {t === "overview" ? "Resumen" : t === "strategy" ? "Estrategia" : "Logros"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          {/* Weekly XP Chart */}
          <div className="rounded-xl p-4 mb-4" style={{ background: "#1e2a4a" }}>
            <h3 className="text-sm font-bold mb-3">XP Semanal</h3>
            <div className="flex items-end gap-2" style={{ height: 120 }}>
              {dates.map((d) => {
                const dayXp = getDayXp(habits, d, journalEntries[d]);
                const maxDayXp = Math.max(...dates.map((dd) => getDayXp(habits, dd, journalEntries[dd])), 1);
                const h = Math.max((dayXp / maxDayXp) * 100, 4);
                const isToday = d === today;
                const dayName = new Date(d + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short" });
                return (
                  <div key={d} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px]" style={{ color: "#b2bec3" }}>{dayXp}</span>
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: `${h}%`,
                        background: isToday ? "#6c5ce7" : dayXp > 0 ? "#00b894" : "#2d3436",
                      }}
                    />
                    <span className={`text-[10px] ${isToday ? "font-bold" : ""}`} style={{ color: isToday ? "#6c5ce7" : "#b2bec3" }}>
                      {dayName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl p-3" style={{ background: "#1e2a4a" }}>
              <div className="text-xs" style={{ color: "#b2bec3" }}>XP Total</div>
              <div className="text-xl font-bold" style={{ color: "#6c5ce7" }}>{totalXp.toLocaleString()}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: "#1e2a4a" }}>
              <div className="text-xs" style={{ color: "#b2bec3" }}>Nivel</div>
              <div className="text-xl font-bold" style={{ color: "#fdcb6e" }}>{emoji} {level}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: "#1e2a4a" }}>
              <div className="text-xs" style={{ color: "#b2bec3" }}>Racha</div>
              <div className="text-xl font-bold" style={{ color: "#fdcb6e" }}>🔥 {streak}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: "#1e2a4a" }}>
              <div className="text-xs" style={{ color: "#b2bec3" }}>Hábitos Activos</div>
              <div className="text-xl font-bold">{activeHabits.length}</div>
            </div>
          </div>

          {/* Habit breakdown */}
          <div className="rounded-xl p-4" style={{ background: "#1e2a4a" }}>
            <h3 className="text-sm font-bold mb-3">Por Hábito</h3>
            {activeHabits.map((h) => {
              const rate = getCompletionRate(h);
              const hStreak = getHabitStreak(h);
              return (
                <div key={h.id} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-2">
                    <span>{h.emoji}</span>
                    <span className="text-sm">{h.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-1.5 rounded-full" style={{ background: "#2d3436" }}>
                      <div className="h-full rounded-full" style={{ width: `${rate * 100}%`, background: getRateColor(rate) }} />
                    </div>
                    <span className="text-xs" style={{ color: "#b2bec3" }}>
                      {Math.round(rate * 100)}%
                    </span>
                    {hStreak > 1 && (
                      <span className="text-xs" style={{ color: "#fdcb6e" }}>🔥{hStreak}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "strategy" && (
        <div>
          {/* Tips based on data */}
          <div className="rounded-xl p-4 mb-4" style={{ background: "#1e2a4a" }}>
            <h3 className="text-sm font-bold mb-3">Consejos Personalizados</h3>
            {(() => {
              const tips: string[] = [];
              const easiest = activeHabits.reduce((best, h) =>
                getCompletionRate(h) > getCompletionRate(best) ? h : best, activeHabits[0]);
              const hardest = activeHabits.reduce((worst, h) =>
                getCompletionRate(h) < getCompletionRate(worst) ? h : worst, activeHabits[0]);

              if (hardest) tips.push(`${hardest.emoji} ${hardest.name} es tu hábito más difícil (${Math.round(getCompletionRate(hardest) * 100)}%). Intentá reducir la barrera de inicio.`);
              if (easiest) tips.push(`${easiest.emoji} ${easiest.name} es tu hábito más fuerte (${Math.round(getCompletionRate(easiest) * 100)}%). ¡Seguí así!`);
              if (streak < 3) tips.push("💡 Hacé el hábito más fácil primero. La clave es arrancar, no la cantidad.");
              if (streak >= 7) tips.push("💪 Ya pasaste la primera semana. Tu cerebro está creando autopista.");
              if (streak >= 30) tips.push("🏆 Un mes completo. Este hábito ya es parte de tu identidad.");

              return tips.map((tip, i) => (
                <p key={i} className="text-sm mb-2" style={{ color: "#dfe6e9" }}>{tip}</p>
              ));
            })()}
          </div>

          {/* Ranking */}
          <div className="rounded-xl p-4 mb-4" style={{ background: "#1e2a4a" }}>
            <h3 className="text-sm font-bold mb-3">Ranking de Consistencia</h3>
            {[...activeHabits]
              .sort((a, b) => getCompletionRate(b) - getCompletionRate(a))
              .map((h, i) => {
                const rate = getCompletionRate(h);
                return (
                  <div key={h.id} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: i === 0 ? "#fdcb6e" : "#b2bec3" }}>
                        #{i + 1}
                      </span>
                      <span>{h.emoji}</span>
                      <span className="text-sm">{h.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: getRateColor(rate) }}>
                        {getRateLabel(rate)}
                      </span>
                      <span className="text-xs font-bold" style={{ color: getRateColor(rate) }}>
                        {Math.round(rate * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {tab === "achievements" && (
        <div>
          <div className="text-center mb-4">
            <div className="text-3xl mb-1">{emoji}</div>
            <div className="text-sm font-bold" style={{ color: "#6c5ce7" }}>
              {achievements.filter(a => a.unlockedAt).length}/{ACHIEVEMENT_DEFS.length} Desbloqueados
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {ACHIEVEMENT_DEFS.map((def) => {
              const unlocked = achievements.find(a => a.id === def.id)?.unlockedAt;
              return (
                <div
                  key={def.id}
                  className="rounded-xl p-3 flex items-center gap-3"
                  style={{
                    background: unlocked ? "#1a3a2a" : "#1e2a4a",
                    opacity: unlocked ? 1 : 0.5,
                    border: unlocked ? "1px solid rgba(0,184,148,0.3)" : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <span className="text-2xl">{unlocked ? def.emoji : "🔒"}</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{def.name}</div>
                    <div className="text-xs" style={{ color: "#b2bec3" }}>{def.description}</div>
                  </div>
                  {unlocked && (
                    <span className="text-xs" style={{ color: "#00b894" }}>✓</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
''')

    # ========================
    # src/app/components/JournalScreen.tsx
    # ========================
    write(os.path.join(base, "src", "app", "components", "JournalScreen.tsx"), '''import { useState } from "react";
import { JournalEntry, MOOD_EMOJIS, MOOD_LABELS } from "../types";
import { getLocalDate } from "../utils";

interface Props {
  entry: JournalEntry | null;
  onSave: (entry: JournalEntry) => void;
}

export default function JournalScreen({ entry, onSave }: Props) {
  const today = getLocalDate();
  const [mood, setMood] = useState(entry?.mood ?? 2);
  const [text, setText] = useState(entry?.text ?? "");
  const [saved, setSaved] = useState(!!entry);

  const handleSave = () => {
    if (!text.trim()) return;
    onSave({ mood, text: text.trim(), xp: 15 });
    setSaved(true);
  };

  return (
    <div className="px-4 pb-20">
      <div className="rounded-xl p-4 mb-4" style={{ background: "#1e2a4a" }}>
        <h3 className="text-sm font-bold mb-3">¿Cómo estás hoy?</h3>
        <div className="flex gap-2 mb-4">
          {MOOD_EMOJIS.map((e, i) => (
            <button
              key={i}
              onClick={() => { setMood(i); setSaved(false); }}
              className="flex-1 py-2 rounded-lg text-center transition-all"
              style={{
                background: mood === i ? "#6c5ce7" : "#2d3436",
                transform: mood === i ? "scale(1.1)" : "scale(1)",
              }}
            >
              <div className="text-xl">{e}</div>
              <div className="text-[10px]" style={{ color: "#b2bec3" }}>{MOOD_LABELS[i]}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-4 mb-4" style={{ background: "#1e2a4a" }}>
        <h3 className="text-sm font-bold mb-3">Diario (+15 XP)</h3>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setSaved(false); }}
          placeholder="¿Qué pasó hoy? ¿Qué aprendiste?"
          className="w-full h-32 p-3 rounded-lg text-sm resize-none"
          style={{ background: "#2d3436", color: "#dfe6e9", border: "1px solid rgba(255,255,255,0.1)" }}
        />
        <button
          onClick={handleSave}
          disabled={!text.trim() || saved}
          className="w-full mt-3 py-2.5 rounded-lg font-bold text-sm transition-all"
          style={{
            background: saved ? "#2d3436" : "#6c5ce7",
            color: saved ? "#b2bec3" : "white",
          }}
        >
          {saved ? "✓ Guardado (+15 XP)" : "Guardar (+15 XP)"}
        </button>
      </div>
    </div>
  );
}
''')

    # ========================
    # src/app/components/SettingsScreen.tsx
    # ========================
    write(os.path.join(base, "src", "app", "components", "SettingsScreen.tsx"), '''import { AppSettings, Habit } from "../types";
import { calcAutoGoal, getMaxPossibleXp } from "../utils";

interface Props {
  settings: AppSettings;
  habits: Habit[];
  onUpdateSettings: (s: AppSettings) => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
}

export default function SettingsScreen({ settings, habits, onUpdateSettings, onExport, onImport, onReset }: Props) {
  const autoGoal = calcAutoGoal(habits);
  const maxXp = getMaxPossibleXp(habits);

  return (
    <div className="px-4 pb-20">
      {/* Notifications */}
      <div className="rounded-xl p-4 mb-4" style={{ background: "#1e2a4a" }}>
        <h3 className="text-sm font-bold mb-3">Notificaciones</h3>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm">Notificaciones inteligentes</span>
          <button
            onClick={() => onUpdateSettings({ ...settings, notifications: !settings.notifications, smartNotifications: !settings.notifications })}
            className="w-12 h-6 rounded-full transition-all"
            style={{ background: settings.notifications ? "#00b894" : "#2d3436" }}
          >
            <div
              className="w-5 h-5 rounded-full bg-white transition-transform"
              style={{ transform: settings.notifications ? "translateX(26px)" : "translateX(2px)" }}
            />
          </button>
        </div>
        {settings.notifications && (
          <div className="mt-2 p-3 rounded-lg text-xs" style={{ background: "#2d3436", color: "#b2bec3" }}>
            <div className="mb-1">🔔 Notificaciones inteligentes:</div>
            <div>· 18:00 — Racha en riesgo</div>
            <div>· 21:00 — Último aviso</div>
            <div>· 17:00 — Hábito pendiente</div>
            <div>· Al llegar al goal — Celebración</div>
          </div>
        )}
      </div>

      {/* Daily Goal */}
      <div className="rounded-xl p-4 mb-4" style={{ background: "#1e2a4a" }}>
        <h3 className="text-sm font-bold mb-3">Meta Diaria</h3>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm">Meta automática (75%)</span>
          <button
            onClick={() => onUpdateSettings({ ...settings, autoGoal: !settings.autoGoal })}
            className="w-12 h-6 rounded-full transition-all"
            style={{ background: settings.autoGoal ? "#00b894" : "#2d3436" }}
          >
            <div
              className="w-5 h-5 rounded-full bg-white transition-transform"
              style={{ transform: settings.autoGoal ? "translateX(26px)" : "translateX(2px)" }}
            />
          </button>
        </div>
        {!settings.autoGoal && (
          <div className="mt-2">
            <input
              type="number"
              value={settings.dailyGoal}
              onChange={(e) => onUpdateSettings({ ...settings, dailyGoal: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full px-3 py-2 rounded-lg text-sm text-black"
            />
          </div>
        )}
        <div className="text-xs mt-2" style={{ color: "#b2bec3" }}>
          Auto: {autoGoal} XP · Máximo posible: {maxXp} XP
        </div>
      </div>

      {/* Data */}
      <div className="rounded-xl p-4 mb-4" style={{ background: "#1e2a4a" }}>
        <h3 className="text-sm font-bold mb-3">Datos</h3>
        <div className="flex flex-col gap-2">
          <button
            onClick={onExport}
            className="w-full py-2 rounded-lg text-sm font-bold"
            style={{ background: "#2d3436", color: "#dfe6e9" }}
          >
            📤 Exportar datos
          </button>
          <button
            onClick={onImport}
            className="w-full py-2 rounded-lg text-sm font-bold"
            style={{ background: "#2d3436", color: "#dfe6e9" }}
          >
            📥 Importar datos
          </button>
          <button
            onClick={() => {
              if (confirm("¿Resetear todos los datos? Esta acción no se puede deshacer.")) onReset();
            }}
            className="w-full py-2 rounded-lg text-sm font-bold"
            style={{ background: "#3a1a1a", color: "#e17055" }}
          >
            🗑 Resetear todo
          </button>
        </div>
      </div>
    </div>
  );
}
''')

    # ========================
    # src/app/components/AddHabitModal.tsx
    # ========================
    write(os.path.join(base, "src", "app", "components", "AddHabitModal.tsx"), '''import { useState } from "react";
import { Habit } from "../types";

interface Props {
  onClose: () => void;
  onAdd: (habit: Habit) => void;
}

export default function AddHabitModal({ onClose, onAdd }: Props) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [habitType, setHabitType] = useState<"build" | "avoid">("build");
  const [progressive, setProgressive] = useState(false);
  const [xpReward, setXpReward] = useState(20);
  const [unit, setUnit] = useState("min");
  const [minAmount, setMinAmount] = useState(5);
  const [barrierBonus, setBarrierBonus] = useState(10);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const habit: Habit = {
      id: "h" + Date.now(),
      name: name.trim(),
      emoji,
      habitType,
      xpReward,
      progressive,
      unit: progressive ? unit : undefined,
      minAmount: progressive ? minAmount : undefined,
      barrierBonus: progressive ? barrierBonus : undefined,
      amounts: {},
      completions: [],
      skips: [],
    };
    onAdd(habit);
  };

  const emojiOptions = ["🏃", "📖", "🧘", "💪", "🎸", "✍️", "🥗", "💧", "🛡️", "📱", "🍔", "🚬", "😴", "✨", "🎯", "⭐"];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-md rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto" style={{ background: "#1a1a2e" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Nuevo Hábito</h2>
          <button onClick={onClose} className="text-2xl" style={{ color: "#b2bec3" }}>×</button>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="text-xs font-bold block mb-1" style={{ color: "#b2bec3" }}>Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm text-black"
            placeholder="Ej: Leer 20 minutos"
          />
        </div>

        {/* Emoji */}
        <div className="mb-4">
          <label className="text-xs font-bold block mb-1" style={{ color: "#b2bec3" }}>Emoji</label>
          <div className="flex flex-wrap gap-2">
            {emojiOptions.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className="w-10 h-10 rounded-lg text-xl flex items-center justify-center"
                style={{ background: emoji === e ? "#6c5ce7" : "#2d3436" }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div className="mb-4">
          <label className="text-xs font-bold block mb-1" style={{ color: "#b2bec3" }}>Tipo</label>
          <div className="flex gap-2">
            <button
              onClick={() => setHabitType("build")}
              className="flex-1 py-2 rounded-lg text-sm font-bold"
              style={{ background: habitType === "build" ? "#00b894" : "#2d3436", color: "white" }}
            >
              🏗 Construir
            </button>
            <button
              onClick={() => { setHabitType("avoid"); setProgressive(false); }}
              className="flex-1 py-2 rounded-lg text-sm font-bold"
              style={{ background: habitType === "avoid" ? "#e17055" : "#2d3436", color: "white" }}
            >
              🛡 Evitar
            </button>
          </div>
        </div>

        {/* Progressive */}
        {habitType === "build" && (
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold" style={{ color: "#b2bec3" }}>Progresivo (cantidad variable)</label>
              <button
                onClick={() => setProgressive(!progressive)}
                className="w-12 h-6 rounded-full transition-all"
                style={{ background: progressive ? "#00b894" : "#2d3436" }}
              >
                <div
                  className="w-5 h-5 rounded-full bg-white transition-transform"
                  style={{ transform: progressive ? "translateX(26px)" : "translateX(2px)" }}
                />
              </button>
            </div>
            {progressive && (
              <div className="mt-3 p-3 rounded-lg" style={{ background: "#2d3436" }}>
                <div className="mb-3">
                  <label className="text-xs block mb-1" style={{ color: "#b2bec3" }}>Unidad</label>
                  <input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-2 py-1 rounded text-sm text-black"
                    placeholder="min, km, páginas..."
                  />
                </div>
                <div className="mb-3">
                  <label className="text-xs block mb-1" style={{ color: "#b2bec3" }}>Cantidad mínima (barrera)</label>
                  <input
                    type="number"
                    min={1}
                    value={minAmount}
                    onChange={(e) => setMinAmount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-1 rounded text-sm text-black"
                  />
                  <div className="text-[10px] mt-1" style={{ color: "#fdcb6e" }}>
                    ⚡ La barrera es lo más difícil: arrancar. Por eso se premia más.
                  </div>
                </div>
                <div className="mb-3">
                  <label className="text-xs block mb-1" style={{ color: "#b2bec3" }}>Bonus barrera (XP al romperla)</label>
                  <input
                    type="number"
                    min={1}
                    value={barrierBonus}
                    onChange={(e) => setBarrierBonus(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-1 rounded text-sm text-black"
                  />
                  <div className="text-[10px] mt-1" style={{ color: "#b2bec3" }}>
                    Al llegar a {minAmount} {unit} → +{barrierBonus} XP. Luego +1 XP/{unit} extra.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* XP Reward */}
        <div className="mb-4">
          <label className="text-xs font-bold block mb-1" style={{ color: "#b2bec3" }}>
            XP máximo {habitType === "avoid" ? "(perder si caés)" : progressive ? "(tope por día)" : "(al completar)"}
          </label>
          <input
            type="number"
            min={1}
            value={xpReward}
            onChange={(e) => setXpReward(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full px-3 py-2 rounded-lg text-sm text-black"
          />
          {progressive && (
            <div className="text-[10px] mt-1" style={{ color: "#b2bec3" }}>
              Ejemplo: {minAmount} {unit} = {barrierBonus} XP (barrera), luego +1 XP/{unit}. Máximo {xpReward} XP/día.
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="w-full py-3 rounded-xl font-bold text-sm"
          style={{
            background: name.trim() ? "#6c5ce7" : "#2d3436",
            color: name.trim() ? "white" : "#b2bec3",
          }}
        >
          Crear Hábito
        </button>
      </div>
    </div>
  );
}
''')

    # ========================
    # src/app/components/AchievementToast.tsx
    # ========================
    write(os.path.join(base, "src", "app", "components", "AchievementToast.tsx"), '''import { useEffect, useState } from "react";
import { Achievement } from "../types";

interface Props {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export default function AchievementToast({ achievement, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onDismiss]);

  if (!achievement) return null;

  return (
    <div
      className="fixed top-4 left-4 right-4 z-50 transition-all duration-300"
      style={{
        transform: visible ? "translateY(0)" : "translateY(-100px)",
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{
          background: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
          boxShadow: "0 4px 20px rgba(108,92,231,0.5)",
        }}
      >
        <span className="text-4xl achievement-pop">{achievement.emoji}</span>
        <div className="flex-1">
          <div className="text-xs font-bold" style={{ color: "#fdcb6e" }}>¡LOGRO DESBLOQUEADO!</div>
          <div className="text-sm font-bold text-white">{achievement.name}</div>
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>{achievement.description}</div>
        </div>
        <button onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }} className="text-white text-lg">×</button>
      </div>
    </div>
  );
}
''')

    # ========================
    # src/app/layout.tsx
    # ========================
    write(os.path.join(base, "src", "app", "layout.tsx"), '''import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HabitDuo",
  description: "Duolingo-style habit tracker PWA",
  manifest: "/habit-duo/manifest.json",
  icons: {
    icon: "/habit-duo/icon-192.png",
    apple: "/habit-duo/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#6c5ce7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/habit-duo/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
''')

    # ========================
    # src/app/page.tsx
    # ========================
    write(os.path.join(base, "src", "app", "page.tsx"), '''"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Habit, JournalEntry, AppSettings, Achievement, ACHIEVEMENT_DEFS } from "./types";
import {
  getLocalDate, calcAutoGoal, getOverallStreak, getDayXp,
  getMaxPossibleXp, getTotalXp, checkAchievements, getNewlyUnlocked,
  getHabitXp, DEFAULT_HABITS, DEFAULT_SETTINGS,
} from "./utils";
import XPHeader from "./components/XPHeader";
import HabitCard from "./components/HabitCard";
import InsightsScreen from "./components/InsightsScreen";
import JournalScreen from "./components/JournalScreen";
import SettingsScreen from "./components/SettingsScreen";
import AddHabitModal from "./components/AddHabitModal";
import AchievementToast from "./components/AchievementToast";

type Screen = "habits" | "insights" | "journal" | "settings";

export default function Home() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [journalEntries, setJournalEntries] = useState<Record<string, JournalEntry>>({});
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [screen, setScreen] = useState<Screen>("habits");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const prevGoalReached = useRef(false);

  const today = getLocalDate();

  // ===== LOAD FROM LOCALSTORAGE =====
  useEffect(() => {
    try {
      const h = localStorage.getItem("habitduo_habits");
      const s = localStorage.getItem("habitduo_settings");
      const j = localStorage.getItem("habitduo_journal");
      const a = localStorage.getItem("habitduo_achievements");

      if (h) {
        const parsed = JSON.parse(h) as Habit[];
        // Migration: fill missing fields
        const migrated = parsed.map((habit) => ({
          ...habit,
          habitType: habit.habitType || "build",
          progressive: habit.progressive ?? false,
          completions: [...new Set(habit.completions || [])],
          skips: habit.skips || [],
          amounts: habit.amounts || {},
          archived: habit.archived ?? false,
          barrierBonus: habit.barrierBonus ?? (habit.minAmount ? habit.minAmount * 2 : undefined),
        }));
        setHabits(migrated);
      } else {
        setHabits(DEFAULT_HABITS);
      }

      if (s) {
        const parsed = JSON.parse(s) as AppSettings;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed, smartNotifications: parsed.smartNotifications ?? true });
      }
      if (j) setJournalEntries(JSON.parse(j));
      if (a) setAchievements(JSON.parse(a));
    } catch (e) {
      console.error("Error loading data:", e);
      setHabits(DEFAULT_HABITS);
    }
    setLoaded(true);
  }, []);

  // ===== SAVE TO LOCALSTORAGE =====
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("habitduo_habits", JSON.stringify(habits));
  }, [habits, loaded]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("habitduo_settings", JSON.stringify(settings));
  }, [settings, loaded]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("habitduo_journal", JSON.stringify(journalEntries));
  }, [journalEntries, loaded]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("habitduo_achievements", JSON.stringify(achievements));
  }, [achievements, loaded]);

  // ===== COMPUTED VALUES =====
  const effectiveGoal = settings.autoGoal ? calcAutoGoal(habits) : settings.dailyGoal;
  const streak = getOverallStreak(habits, settings);
  const todayXp = getDayXp(habits, today, journalEntries[today] || undefined);
  const maxPossibleXp = getMaxPossibleXp(habits);

  // ===== ACHIEVEMENT CHECKING =====
  useEffect(() => {
    if (!loaded) return;
    const prevAchievements = [...achievements];
    const newAchievements = checkAchievements(habits, settings, journalEntries, prevAchievements);
    const newlyUnlocked = getNewlyUnlocked(prevAchievements, newAchievements);
    
    if (newlyUnlocked) {
      setAchievements(newAchievements);
      setNewAchievement(newlyUnlocked);
      // Trigger confetti
      try {
        const confetti = require("canvas-confetti");
        confetti.default({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } catch {}
    } else if (newAchievements.length !== prevAchievements.length) {
      setAchievements(newAchievements);
    }
  }, [habits, journalEntries, loaded]);

  // ===== CELEBRATION ON GOAL REACHED =====
  useEffect(() => {
    if (!loaded) return;
    const goalReached = todayXp >= effectiveGoal;
    if (goalReached && !prevGoalReached.current) {
      setCelebrating(true);
      try {
        const confetti = require("canvas-confetti");
        confetti.default({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
      } catch {}
      setTimeout(() => setCelebrating(false), 2000);
      
      // Smart notification: celebration
      if (settings.notifications && "Notification" in window && Notification.permission === "granted") {
        new Notification("⚡ Día épico desbloqueado", {
          body: `¡Llegaste a ${todayXp} XP! Meta: ${effectiveGoal} XP`,
          icon: "/habit-duo/icon-192.png",
          tag: "celebration",
        });
      }
    }
    prevGoalReached.current = goalReached;
  }, [todayXp, effectiveGoal, loaded, settings.notifications]);

  // ===== SMART NOTIFICATIONS =====
  useEffect(() => {
    if (!loaded || !settings.notifications || !settings.smartNotifications) return;
    
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        // Get incomplete habits for today
        const incompleteHabits = habits
          .filter(h => !h.archived)
          .filter(h => {
            if (h.habitType === "avoid") return h.completions?.includes(today); // did the bad thing
            if (h.progressive) return (h.amounts?.[today] ?? 0) < (h.minAmount ?? 1);
            return !h.completions?.includes(today);
          })
          .map(h => ({
            name: h.name,
            progressive: h.progressive,
            minAmount: h.minAmount,
            unit: h.unit,
            barrierBonus: h.barrierBonus,
            xpReward: h.xpReward,
          }));

        // Send data to service worker for scheduling
        reg.active?.postMessage({
          type: "SCHEDULE_NOTIFICATIONS",
          payload: {
            todayXp,
            effectiveGoal,
            incompleteHabits,
            streak,
          },
        });
      }).catch(console.error);
    }
  }, [todayXp, effectiveGoal, habits, streak, loaded, settings.notifications, settings.smartNotifications]);

  // ===== HABIT ACTIONS =====
  const toggleComplete = useCallback((id: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        if (h.habitType === "avoid") {
          const isCompleted = h.completions?.includes(today) ?? false;
          if (isCompleted) {
            return { ...h, completions: h.completions?.filter((d) => d !== today) };
          }
          return { ...h, completions: [...new Set([...(h.completions || []), today])] };
        }
        // Build habit - simple
        if (!h.progressive) {
          const isCompleted = h.completions?.includes(today) ?? false;
          if (isCompleted) {
            return { ...h, completions: h.completions?.filter((d) => d !== today) };
          }
          return { ...h, completions: [...new Set([...(h.completions || []), today])] };
        }
        return h;
      })
    );
  }, [today]);

  const skipHabit = useCallback((id: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const isSkipped = h.skips?.includes(today) ?? false;
        if (isSkipped) {
          return { ...h, skips: h.skips?.filter((d) => d !== today) };
        }
        return { ...h, skips: [...new Set([...(h.skips || []), today])] };
      })
    );
  }, [today]);

  const updateAmount = useCallback((id: string, amount: number) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        return {
          ...h,
          amounts: { ...(h.amounts || {}), [today]: amount },
        };
      })
    );
  }, [today]);

  const addHabit = useCallback((habit: Habit) => {
    setHabits((prev) => [...prev, habit]);
    setShowAddModal(false);
  }, []);

  const deleteHabit = useCallback((id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const archiveHabit = useCallback((id: string) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, archived: true } : h))
    );
  }, []);

  const saveJournal = useCallback((entry: JournalEntry) => {
    setJournalEntries((prev) => ({ ...prev, [today]: entry }));
  }, [today]);

  const handleExport = useCallback(() => {
    const data = {
      habits,
      settings,
      journalEntries,
      achievements,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `habitduo-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [habits, settings, journalEntries, achievements, today]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.habits) setHabits(data.habits);
          if (data.settings) setSettings(data.settings);
          if (data.journalEntries) setJournalEntries(data.journalEntries);
          if (data.achievements) setAchievements(data.achievements);
        } catch {
          alert("Error al importar datos");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const handleReset = useCallback(() => {
    setHabits(DEFAULT_HABITS);
    setSettings(DEFAULT_SETTINGS);
    setJournalEntries({});
    setAchievements([]);
    localStorage.removeItem("habitduo_habits");
    localStorage.removeItem("habitduo_settings");
    localStorage.removeItem("habitduo_journal");
    localStorage.removeItem("habitduo_achievements");
  }, []);

  // ===== SCREENS =====
  const screens: Record<Screen, string> = {
    habits: "🏠",
    insights: "📊",
    journal: "📝",
    settings: "⚙️",
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1a2e" }}>
        <div className="text-2xl">⏳</div>
      </div>
    );
  }

  return (
    <div className={`max-w-md mx-auto min-h-screen ${celebrating ? "celebrate" : ""}`} style={{ background: "#1a1a2e" }}>
      {/* Achievement Toast */}
      <AchievementToast achievement={newAchievement} onDismiss={() => setNewAchievement(null)} />

      {/* Header */}
      <XPHeader
        habits={habits}
        settings={settings}
        journal={journalEntries[today] || null}
        effectiveGoal={effectiveGoal}
        streak={streak}
        journalEntries={journalEntries}
      />

      {/* Content */}
      <div className="pb-20">
        {screen === "habits" && (
          <div className="px-4">
            {/* Show archived toggle */}
            {habits.some(h => h.archived) && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: "#b2bec3" }}>
                  {habits.filter(h => !h.archived).length} activos · {habits.filter(h => h.archived).length} archivados
                </span>
              </div>
            )}

            {/* Active habits */}
            {habits
              .filter((h) => !h.archived)
              .map((h) => (
                <HabitCard
                  key={h.id}
                  habit={h}
                  onToggle={toggleComplete}
                  onSkip={skipHabit}
                  onUpdateAmount={updateAmount}
                  onDelete={deleteHabit}
                  onArchive={archiveHabit}
                />
              ))}

            {/* Add button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full py-3 rounded-xl font-bold text-sm mb-4 transition-all"
              style={{
                background: "transparent",
                color: "#6c5ce7",
                border: "2px dashed #6c5ce7",
              }}
            >
              + Agregar Hábito
            </button>
          </div>
        )}

        {screen === "insights" && (
          <InsightsScreen habits={habits} settings={settings} journalEntries={journalEntries} achievements={achievements} />
        )}

        {screen === "journal" && (
          <JournalScreen entry={journalEntries[today] || null} onSave={saveJournal} />
        )}

        {screen === "settings" && (
          <SettingsScreen
            settings={settings}
            habits={habits}
            onUpdateSettings={setSettings}
            onExport={handleExport}
            onImport={handleImport}
            onReset={handleReset}
          />
        )}
      </div>

      {/* Bottom Nav */}
      <div
        className="fixed bottom-0 left-0 right-0 flex justify-center"
        style={{ background: "#16213e", borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="max-w-md w-full flex">
          {(Object.entries(screens) as [Screen, string][]).map(([key, emoji]) => (
            <button
              key={key}
              onClick={() => setScreen(key)}
              className="flex-1 py-3 text-center transition-all"
              style={{ color: screen === key ? "#6c5ce7" : "#b2bec3" }}
            >
              <div className="text-xl">{emoji}</div>
              <div className="text-[10px]">
                {key === "habits" ? "Hoy" : key === "insights" ? "Insights" : key === "journal" ? "Diario" : "Ajustes"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && <AddHabitModal onClose={() => setShowAddModal(false)} onAdd={addHabit} />}
    </div>
  );
}
''')

    # ========================
    # .github/workflows/deploy.yml
    # ========================
    write(os.path.join(base, ".github", "workflows", "deploy.yml"), '''name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
''')

    # ========================
    # .nojekyll
    # ========================
    write(os.path.join(base, "out", ".nojekyll"), "")

    # ========================
    # next-env.d.ts
    # ========================
    write(os.path.join(base, "next-env.d.ts"), '''/// <reference types="next" />
/// <reference types="next/image-types/global" />
''')

    # ========================
    # .gitignore
    # ========================
    write(os.path.join(base, ".gitignore"), '''node_modules/
.next/
out/
*.tsbuildinfo
next-env.d.ts
''')

    print("\n✅ All files generated! Now run:")
    print("  cd " + base)
    print("  npm install")
    print("  npm run build")
    print("  git add -A && git commit -m 'v2.0: barrier bonus + smart notifications + global levels + achievements' && git push")

if __name__ == "__main__":
    main()
''')

---

## Cómo usarlo

1. Copiá todo el código de arriba y guardalo como `generate.py` en tu máquina local
2. Corré:
```bash
python3 generate.py
npm install
npm run build
git add -A && git commit -m "v2.0: barrier bonus + smart notifs + levels + achievements" && git push
