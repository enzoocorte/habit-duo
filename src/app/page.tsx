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
