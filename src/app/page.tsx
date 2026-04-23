"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Habit, JournalEntry, AppSettings, Achievement } from "./types";
import {
  getLocalDate, calcAutoGoal, getOverallStreak, getDayXp,
  getTotalXp, checkAchievements, getNewlyUnlocked,
  DEFAULT_HABITS, DEFAULT_SETTINGS,
} from "./utils";
import XPHeader from "./components/XPHeader";
import HabitCard from "./components/HabitCard";
import InsightsScreen from "./components/InsightsScreen";
import JournalScreen from "./components/JournalScreen";
import SettingsScreen from "./components/SettingsScreen";
import AddHabitModal from "./components/AddHabitModal";
import AchievementToast from "./components/AchievementToast";

type Screen = "habits" | "insights" | "journal" | "settings";

async function fireConfetti(particles: number = 100) {
  try {
    const confetti = (await import("canvas-confetti")).default;
    confetti({ particleCount: particles, spread: 70, origin: { y: 0.6 } });
  } catch {}
}

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
  const achievementsRef = useRef<Achievement[]>([]);
  const today = getLocalDate();

  useEffect(() => {
    try {
      const h = localStorage.getItem("habitduo_habits");
      const s = localStorage.getItem("habitduo_settings");
      const j = localStorage.getItem("habitduo_journal");
      const a = localStorage.getItem("habitduo_achievements");
      if (h) {
        const parsed = JSON.parse(h) as Habit[];
        const migrated = parsed.map((habit) => ({
          ...habit,
          habitType: habit.habitType || "build",
          progressive: habit.progressive ?? false,
          completions: Array.isArray(habit.completions) ? [...new Set(habit.completions)] : [],
          skips: Array.isArray(habit.skips) ? habit.skips : [],
          amounts: habit.amounts || {},
          archived: habit.archived ?? false,
          barrierBonus: habit.barrierBonus ?? (habit.minAmount ? habit.minAmount * 2 : undefined),
          createdAt: habit.createdAt || today,
          frequency: habit.frequency || "daily",
        }));
        setHabits(migrated);
      } else {
        setHabits(DEFAULT_HABITS.map(h => ({ ...h, createdAt: today })));
      }
      if (s) {
        const parsed = JSON.parse(s);
        setSettings({
          dailyGoal: parsed.dailyGoal ?? 50,
          autoGoal: parsed.autoGoal ?? true,
          notifications: parsed.notifications ?? false,
          notificationInterval: parsed.notificationInterval ?? 180,
          smartNotifications: parsed.smartNotifications ?? true,
          goalPercentage: parsed.goalPercentage ?? 75,
        });
      }
      if (j) setJournalEntries(JSON.parse(j));
      if (a) { const ach = JSON.parse(a); setAchievements(ach); achievementsRef.current = ach; }
    } catch (e) {
      console.error("Error loading data:", e);
      setHabits(DEFAULT_HABITS.map(h => ({ ...h, createdAt: today })));
    }
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) localStorage.setItem("habitduo_habits", JSON.stringify(habits)); }, [habits, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem("habitduo_settings", JSON.stringify(settings)); }, [settings, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem("habitduo_journal", JSON.stringify(journalEntries)); }, [journalEntries, loaded]);
  useEffect(() => { if (loaded) { localStorage.setItem("habitduo_achievements", JSON.stringify(achievements)); achievementsRef.current = achievements; } }, [achievements, loaded]);

  const effectiveGoal = settings.autoGoal
    ? calcAutoGoal(habits, settings.goalPercentage ?? 75)
    : settings.dailyGoal;
  const streak = getOverallStreak(habits, settings);
  const todayXp = getDayXp(habits, today, journalEntries[today] || undefined);

  // Achievement check - use ref to avoid infinite loops
  useEffect(() => {
    if (!loaded) return;
    try {
      const prev = achievementsRef.current;
      const next = checkAchievements(habits, settings, journalEntries, prev);
      const newly = getNewlyUnlocked(prev, next);
      if (newly) {
        setAchievements(next);
        setNewAchievement(newly);
        fireConfetti(100);
      } else if (next.length !== prev.length) {
        setAchievements(next);
      }
    } catch (e) {
      console.error("Achievement check error:", e);
    }
  }, [habits, journalEntries, loaded]);

  // Goal reached celebration
  useEffect(() => {
    if (!loaded) return;
    try {
      const reached = todayXp >= effectiveGoal;
      if (reached && !prevGoalReached.current) {
        setCelebrating(true);
        fireConfetti(150);
        setTimeout(() => setCelebrating(false), 2000);
        if (settings.notifications && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          try {
            new Notification("Dia epico desbloqueado!", { body: `Llegaste a ${todayXp} XP!`, icon: "/habit-duo/icon-192.png", tag: "celebration" });
          } catch {}
        }
      }
      prevGoalReached.current = reached;
    } catch (e) {
      console.error("Celebration error:", e);
    }
  }, [todayXp, effectiveGoal, loaded, settings.notifications]);

  // Smart notifications
  useEffect(() => {
    if (!loaded || !settings.notifications || !settings.smartNotifications) return;
    try {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          const incomplete = habits.filter(h => !h.archived).filter(h => {
            if (h.habitType === "avoid") return h.completions?.includes(today);
            if (h.progressive) return (h.amounts?.[today] ?? 0) < (h.minAmount ?? 1);
            return !h.completions?.includes(today);
          }).map(h => ({ name: h.name, progressive: h.progressive, minAmount: h.minAmount, unit: h.unit, barrierBonus: h.barrierBonus, xpReward: h.xpReward }));
          reg.active?.postMessage({ type: "SCHEDULE_NOTIFICATIONS", payload: { todayXp, effectiveGoal, incompleteHabits: incomplete, streak } });
        }).catch(() => {});
      }
    } catch (e) {
      console.error("Notification error:", e);
    }
  }, [todayXp, effectiveGoal, habits, streak, loaded, settings.notifications, settings.smartNotifications]);

  const toggleComplete = useCallback((id: string) => {
    setHabits((prev) => prev.map((h) => {
      if (h.id !== id) return h;
      if (h.habitType === "avoid") {
        const done = h.completions?.includes(today) ?? false;
        return done ? { ...h, completions: h.completions?.filter((d) => d !== today) } : { ...h, completions: [...new Set([...(h.completions || []), today])] };
      }
      if (!h.progressive) {
        const done = h.completions?.includes(today) ?? false;
        return done ? { ...h, completions: h.completions?.filter((d) => d !== today) } : { ...h, completions: [...new Set([...(h.completions || []), today])] };
      }
      return h;
    }));
  }, [today]);

  const skipHabit = useCallback((id: string) => {
    setHabits((prev) => prev.map((h) => {
      if (h.id !== id) return h;
      const skipped = h.skips?.includes(today) ?? false;
      return skipped ? { ...h, skips: h.skips?.filter((d) => d !== today) } : { ...h, skips: [...new Set([...(h.skips || []), today])] };
    }));
  }, [today]);

  const updateAmount = useCallback((id: string, amount: number) => {
    setHabits((prev) => prev.map((h) => h.id !== id ? h : { ...h, amounts: { ...(h.amounts || {}), [today]: amount } }));
  }, [today]);

  const addHabit = useCallback((habit: Habit) => { setHabits((prev) => [...prev, habit]); setShowAddModal(false); }, []);
  const deleteHabit = useCallback((id: string) => { setHabits((prev) => prev.filter((h) => h.id !== id)); }, []);
  const archiveHabit = useCallback((id: string) => { setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, archived: true } : h))); }, []);
  const saveJournal = useCallback((entry: JournalEntry) => { setJournalEntries((prev) => ({ ...prev, [today]: entry })); }, [today]);

  const handleExport = useCallback(() => {
    try {
      const data = { habits, settings, journalEntries, achievements, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `habitduo-backup-${today}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error("Export error:", e); }
  }, [habits, settings, journalEntries, achievements, today]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input"); input.type = "file"; input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const d = JSON.parse(ev.target?.result as string);
          if (d.habits) setHabits(d.habits);
          if (d.settings) setSettings(d.settings);
          if (d.journalEntries) setJournalEntries(d.journalEntries);
          if (d.achievements) setAchievements(d.achievements);
        } catch { alert("Error al importar"); }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const handleReset = useCallback(() => {
    setHabits(DEFAULT_HABITS.map(h => ({ ...h, createdAt: today })));
    setSettings(DEFAULT_SETTINGS);
    setJournalEntries({});
    setAchievements([]);
    localStorage.removeItem("habitduo_habits");
    localStorage.removeItem("habitduo_settings");
    localStorage.removeItem("habitduo_journal");
    localStorage.removeItem("habitduo_achievements");
  }, []);

  const screens: Record<Screen, string> = { habits: "🏠", insights: "📊", journal: "📝", settings: "⚙️" };

  if (!loaded) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1a2e" }}><div className="text-2xl">⏳</div></div>;

  return (
    <div className={`max-w-md mx-auto min-h-screen ${celebrating ? "celebrate" : ""}`} style={{ background: "#1a1a2e" }}>
      <AchievementToast achievement={newAchievement} onDismiss={() => setNewAchievement(null)} />
      <XPHeader habits={habits} settings={settings} journal={journalEntries[today] || null} effectiveGoal={effectiveGoal} streak={streak} journalEntries={journalEntries} />
      <div className="pb-20">
        {screen === "habits" && (
          <div className="px-4">
            {habits.filter(h => !h.archived).map((h) => (
              <HabitCard key={h.id} habit={h} onToggle={toggleComplete} onSkip={skipHabit} onUpdateAmount={updateAmount} onDelete={deleteHabit} onArchive={archiveHabit} />
            ))}
            <button onClick={() => setShowAddModal(true)} className="w-full py-3 rounded-xl font-bold text-sm mb-4" style={{ background: "transparent", color: "#6c5ce7", border: "2px dashed #6c5ce7" }}>+ Agregar Habito</button>
          </div>
        )}
        {screen === "insights" && <InsightsScreen habits={habits} settings={settings} journalEntries={journalEntries} achievements={achievements} />}
        {screen === "journal" && <JournalScreen entry={journalEntries[today] || null} onSave={saveJournal} />}
        {screen === "settings" && <SettingsScreen settings={settings} habits={habits} onUpdateSettings={setSettings} onExport={handleExport} onImport={handleImport} onReset={handleReset} />}
      </div>
      <div className="fixed bottom-0 left-0 right-0 flex justify-center" style={{ background: "#16213e", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-md w-full flex">
          {(Object.entries(screens) as [Screen, string][]).map(([key, emoji]) => (
            <button key={key} onClick={() => setScreen(key)} className="flex-1 py-3 text-center" style={{ color: screen === key ? "#6c5ce7" : "#b2bec3" }}>
              <div className="text-xl">{emoji}</div>
              <div className="text-[10px]">{key === "habits" ? "Hoy" : key === "insights" ? "Insights" : key === "journal" ? "Diario" : "Ajustes"}</div>
            </button>
          ))}
        </div>
      </div>
      {showAddModal && <AddHabitModal onClose={() => setShowAddModal(false)} onAdd={addHabit} />}
    </div>
  );
}
