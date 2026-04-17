"use client";

import { useState, useEffect, useCallback } from "react";

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  frequency: "daily" | "weekly";
  weeklyGoal?: number;
  xpReward: number;
  habitType: "build" | "avoid";
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

export function useHabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    notificationsEnabled: false,
    nudgeIntervalHours: 3,
    dailyXpGoal: 100,
    autoGoal: true,
  });
  const [todayMood, setTodayMood] = useState(0);
  const [todayNote, setTodayNote] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];

  // Cargar datos desde localStorage
  useEffect(() => {
    const savedHabits = localStorage.getItem("habitduo-habits");
    if (savedHabits) {
      setHabits(JSON.parse(savedHabits));
    } else {
      // Hábitos por defecto
      const defaultHabits: Habit[] = [
        { id: "1", name: "Ejercicio", emoji: "🏃", frequency: "daily", xpReward: 25, habitType: "build", createdAt: todayStr, completions: [], skips: [], archived: false },
        { id: "2", name: "Leer", emoji: "📖", frequency: "daily", xpReward: 20, habitType: "build", createdAt: todayStr, completions: [], skips: [], archived: false },
        { id: "3", name: "Meditar", emoji: "🧘", frequency: "daily", xpReward: 15, habitType: "build", createdAt: todayStr, completions: [], skips: [], archived: false },
        { id: "4", name: "Dormir temprano", emoji: "🌙", frequency: "daily", xpReward: 20, habitType: "build", createdAt: todayStr, completions: [], skips: [], archived: false },
        { id: "5", name: "Redes sociales excesivas", emoji: "📱", frequency: "daily", xpReward: 30, habitType: "avoid", createdAt: todayStr, completions: [], skips: [], archived: false },
      ];
      setHabits(defaultHabits);
    }

    const savedJournal = localStorage.getItem("habitduo-journal");
    if (savedJournal) setJournal(JSON.parse(savedJournal));

    const savedSettings = localStorage.getItem("habitduo-settings");
    if (savedSettings) setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));

    const savedMood = localStorage.getItem("habitduo-todaymood");
    if (savedMood) setTodayMood(parseInt(savedMood));

    const savedNote = localStorage.getItem("habitduo-todaynote");
    if (savedNote) setTodayNote(savedNote);
  }, []);

  // Guardar en localStorage
  useEffect(() => { localStorage.setItem("habitduo-habits", JSON.stringify(habits)); }, [habits]);
  useEffect(() => { localStorage.setItem("habitduo-journal", JSON.stringify(journal)); }, [journal]);
  useEffect(() => { localStorage.setItem("habitduo-settings", JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem("habitduo-todaymood", todayMood.toString()); }, [todayMood]);
  useEffect(() => { localStorage.setItem("habitduo-todaynote", todayNote); }, [todayNote]);

  const getDayXp = useCallback((date: string = todayStr): number => {
    let xp = 0;
    habits.forEach(h => {
      if (h.archived) return;
      const completed = h.completions.includes(date);
      if (h.habitType === "build" && completed) xp += h.xpReward;
      if (h.habitType === "avoid" && completed) xp -= Math.floor(h.xpReward * 0.6); // Solo quita el 60% (tu pedido)
      if (h.habitType === "avoid" && !completed && h.frequency === "daily") xp += h.xpReward;
    });
    if (journal.some(e => e.date === date)) xp += 15;
    return xp;
  }, [habits, journal]);

  const getOverallStreak = useCallback((): number => {
    const effectiveGoal = settings.autoGoal ? Math.max(60, Math.floor(getDayXp() * 1.3)) : settings.dailyXpGoal;
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (getDayXp(d.toISOString().split("T")[0]) >= effectiveGoal) streak++;
      else break;
    }
    return streak;
  }, [getDayXp, settings]);

  const getHabitStreak = (habit: Habit): number => {
    if (habit.completions.length === 0) return 0;
    const sorted = [...habit.completions].sort().reverse();
    let streak = 0;
    let expectedDate = new Date(sorted[0] + "T12:00:00");

    for (const comp of sorted) {
      const compDate = new Date(comp + "T12:00:00");
      const diff = Math.round((expectedDate.getTime() - compDate.getTime()) / 86400000);
      if (diff === streak) {
        streak++;
        expectedDate = compDate;
      } else break;
    }
    return streak;
  };

  const toggleComplete = (id: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h;
      const isCompleted = h.completions.includes(todayStr);
      return isCompleted 
        ? { ...h, completions: h.completions.filter(c => c !== todayStr) }
        : { ...h, completions: [...h.completions, todayStr] };
    }));
  };

  const skipHabit = (id: string) => {
    setHabits(prev => prev.map(h => 
      h.id === id ? { ...h, skips: [...h.skips, todayStr] } : h
    ));
  };

  const addHabit = (newHabit: Omit<Habit, "id" | "createdAt" | "completions" | "skips" | "archived">) => {
    const habit: Habit = {
      ...newHabit,
      id: Date.now().toString(),
      createdAt: todayStr,
      completions: [],
      skips: [],
      archived: false,
    };
    setHabits(prev => [...prev, habit]);
  };

  const deleteHabit = (id: string) => setHabits(prev => prev.filter(h => h.id !== id));
  const archiveHabit = (id: string) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, archived: !h.archived } : h));
  };

  const saveJournal = () => {
    if (todayMood === 0) return;
    setJournal(prev => [...prev.filter(e => e.date !== todayStr), {
      date: todayStr,
      mood: todayMood,
      note: todayNote
    }]);
  };

  const exportData = () => {
    const data = { habits, journal, settings, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `habitduo-backup-${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.habits) setHabits(data.habits);
        if (data.journal) setJournal(data.journal);
        if (data.settings) setSettings({ ...settings, ...data.settings });
        alert("✅ Datos importados correctamente");
      } catch {
        alert("❌ Error al importar");
      }
    };
    reader.readAsText(file);
  };

  return {
    habits,
    journal,
    settings,
    todayMood,
    todayNote,
    todayStr,
    setTodayMood,
    setTodayNote,
    setSettings,
    toggleComplete,
    skipHabit,
    addHabit,
    deleteHabit,
    archiveHabit,
    saveJournal,
    exportData,
    importData,
    getDayXp,
    getOverallStreak,
    getHabitStreak,
  };
}
