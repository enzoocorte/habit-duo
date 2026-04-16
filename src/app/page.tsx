"use client";
import { useState, useEffect, useCallback } from "react";

interface Habit {
  id: string;
  name: string;
  emoji: string;
  frequency: "daily" | "weekly";
  weeklyGoal?: number;
  xpReward: number;
  createdAt: string;
  completions: string[];
  skips: string[];
  archived: boolean;
}

interface JournalEntry {
  date: string;
  mood: number;
  note: string;
}

interface AppSettings {
  notificationsEnabled: boolean;
  nudgeIntervalHours: number;
  dailyXpGoal: number;
}

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getWeekDates(): string[] {
  const today = new Date();
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function getDayXp(habits: Habit[], journal: JournalEntry[], date: string): number {
  let xp = 0;
  for (const h of habits) {
    if (h.archived) continue;
    if (h.completions.includes(date)) {
      xp += h.xpReward;
    }
  }
  const entry = journal.find((e) => e.date === date);
  if (entry) xp += 15;
  return xp;
}

function getOverallStreak(habits: Habit[], journal: JournalEntry[], dailyXpGoal: number): number {
  const today = getTodayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  let streak = 0;
  let checkDate = new Date();

  const todayXp = getDayXp(habits, journal, today);
  if (todayXp >= dailyXpGoal) {
    streak = 1;
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    const yesterdayXp = getDayXp(habits, journal, yesterday);
    if (yesterdayXp < dailyXpGoal) return 0;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 1; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const xp = getDayXp(habits, journal, dateStr);
    if (xp >= dailyXpGoal) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getHabitStreak(habit: Habit): number {
  if (habit.completions.length === 0) return 0;
  const sorted = [...habit.completions].sort().reverse();
  const today = getTodayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (habit.frequency === "daily") {
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
    let streak = 0;
    let checkDate = new Date(sorted[0] + "T12:00:00");
    for (const comp of sorted) {
      const compDate = new Date(comp + "T12:00:00");
      const diffDays = Math.round((checkDate.getTime() - compDate.getTime()) / 86400000);
      if (diffDays === streak) {
        streak++;
        checkDate = compDate;
      } else {
        break;
      }
    }
    return streak;
  } else {
    let streak = 0;
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    for (let w = 0; w < 52; w++) {
      const ws = new Date(weekStart);
      ws.setDate(ws.getDate() - w * 7);
      const we = new Date(ws);
      we.setDate(we.getDate() + 7);
      const weekComps = habit.completions.filter((c) => {
        const d = new Date(c + "T12:00:00");
        return d >= ws && d < we;
      });
      if (weekComps.length >= (habit.weeklyGoal || 3)) {
        streak++;
      } else if (w > 0) {
        break;
      }
    }
    return streak;
  }
}

function isWeekComplete(habit: Habit): boolean {
  if (habit.frequency !== "weekly") return false;
  const weekDates = getWeekDates().slice(-7);
  const thisWeekComps = habit.completions.filter((c) => weekDates.includes(c));
  return thisWeekComps.length >= (habit.weeklyGoal || 3);
}

function getXpLevel(xp: number): { name: string; emoji: string; color: string } {
  if (xp >= 150) return { name: "Dia epico!", emoji: "⚡", color: "text-yellow-500" };
  if (xp >= 100) return { name: "Dia de racha!", emoji: "🔥", color: "text-[#58CC02]" };
  if (xp >= 50) return { name: "Buen ritmo", emoji: "💪", color: "text-blue-500" };
  return { name: "Recien empezando", emoji: "🌱", color: "text-gray-400" };
}

const defaultHabits: Habit[] = [
  { id: "1", name: "Ejercicio", emoji: "🏃", frequency: "daily", xpReward: 20, createdAt: getTodayStr(), completions: [], skips: [], archived: false },
  { id: "2", name: "Leer", emoji: "📖", frequency: "daily", xpReward: 20, createdAt: getTodayStr(), completions: [], skips: [], archived: false },
  { id: "3", name: "Meditar", emoji: "🧘", frequency: "weekly", weeklyGoal: 3, xpReward: 30, createdAt: getTodayStr(), completions: [], skips: [], archived: false },
];

const defaultSettings: AppSettings = { notificationsEnabled: false, nudgeIntervalHours: 3, dailyXpGoal: 100 };
const moodEmojis = ["😢", "😟", "😐", "😊", "🤩"];
const moodLabels = ["Muy mal", "Mal", "Normal", "Bien", "Genial"];

export default function HabitDuo() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [screen, setScreen] = useState<"home" | "insights" | "journal" | "settings">("home");
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitEmoji, setNewHabitEmoji] = useState("✨");
  const [newHabitFreq, setNewHabitFreq] = useState<"daily" | "weekly">("daily");
  const [newHabitWeeklyGoal, setNewHabitWeeklyGoal] = useState(3);
  const [newHabitXp, setNewHabitXp] = useState(20);
  const [todayMood, setTodayMood] = useState(0);
  const [todayNote, setTodayNote] = useState("");
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("habitduo-habits");
    if (saved) {
      const parsed = JSON.parse(saved);
      const migrated = parsed.map((h: any) => ({ ...h, xpReward: h.xpReward || (h.frequency === "weekly" ? 30 : 20) }));
      setHabits(migrated);
    } else setHabits(defaultHabits);
    const savedJournal = localStorage.getItem("habitduo-journal");
    if (savedJournal) setJournal(JSON.parse(savedJournal));
    const savedSettings = localStorage.getItem("habitduo-settings");
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings({ ...defaultSettings, ...parsed });
    }
    const savedMood = localStorage.getItem("habitduo-todaymood");
    if (savedMood) setTodayMood(parseInt(savedMood));
    const savedNote = localStorage.getItem("habitduo-todaynote");
    if (savedNote) setTodayNote(savedNote);
  }, []);

  useEffect(() => {
    if (habits.length > 0) localStorage.setItem("habitduo-habits", JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem("habitduo-journal", JSON.stringify(journal));
  }, [journal]);

  useEffect(() => {
    localStorage.setItem("habitduo-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("habitduo-todaymood", todayMood.toString());
  }, [todayMood]);

  useEffect(() => {
    localStorage.setItem("habitduo-todaynote", todayNote);
  }, [todayNote]);

  const today = getTodayStr();
  const todayXp = getDayXp(habits, journal, today);
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const yesterdayXp = getDayXp(habits, journal, yesterday);
  const activeHabits = habits.filter((h) => !h.archived);
  const overallStreak = getOverallStreak(habits, journal, settings.dailyXpGoal);
  const xpPct = Math.min(100, Math.round((todayXp / settings.dailyXpGoal) * 100));
  const xpLevel = getXpLevel(todayXp);
  const weekDates = getWeekDates();
  const weekData = weekDates.map((date) => ({ date, xp: getDayXp(habits, journal, date) }));
  const totalXpAllTime = habits.reduce((acc, h) => acc + h.completions.length * h.xpReward, 0) + journal.length * 15;

  const requestNotifications = useCallback(async () => {
    if (!("Notification" in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }, []);

  const scheduleNudge = useCallback(() => {
    if (!settings.notificationsEnabled) return;
    const interval = settings.nudgeIntervalHours * 60 * 60 * 1000;
    const existingTimer = (window as any).__nudgeTimer;
    if (existingTimer) clearInterval(existingTimer);
    const timer = setInterval(async () => {
      const todayXpNow = getDayXp(habits, journal, getTodayStr());
      if (todayXpNow < settings.dailyXpGoal) {
        const remaining = settings.dailyXpGoal - todayXpNow;
        const body = "Te faltan " + remaining + " XP para tu dia de racha!";
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "SHOW_NOTIFICATION", title: "HabitDuo", body });
        } else if ("Notification" in window && Notification.permission === "granted") {
          new Notification("HabitDuo", { body, icon: "/habit-duo/icons/icon-192.png" });
        }
      }
    }, interval);
    (window as any).__nudgeTimer = timer;
  }, [settings.notificationsEnabled, settings.nudgeIntervalHours, habits, journal, settings.dailyXpGoal]);

  useEffect(() => {
    scheduleNudge();
    return () => { const t = (window as any).__nudgeTimer; if (t) clearInterval(t); };
  }, [scheduleNudge]);

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

  const prevXpRef = useState(todayXp)[0];
  useEffect(() => {
    if (todayXp >= settings.dailyXpGoal && prevXpRef < settings.dailyXpGoal) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [todayXp, settings.dailyXpGoal, prevXpRef]);

  const toggleComplete = (id: string) => {
    const today = getTodayStr();
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        if (h.completions.includes(today)) return { ...h, completions: h.completions.filter((c) => c !== today) };
        return { ...h, completions: [...h.completions, today] };
      })
    );
  };

  const skipHabit = (id: string) => {
    const today = getTodayStr();
    setHabits((prev) => prev.map((h) => h.id !== id ? h : { ...h, skips: [...h.skips, today] }));
  };

  const addHabit = () => {
    if (!newHabitName.trim()) return;
    const newHabit: Habit = {
      id: Date.now().toString(), name: newHabitName.trim(), emoji: newHabitEmoji,
      frequency: newHabitFreq, weeklyGoal: newHabitFreq === "weekly" ? newHabitWeeklyGoal : undefined,
      xpReward: newHabitXp, createdAt: getTodayStr(), completions: [], skips: [], archived: false,
    };
    setHabits((prev) => [...prev, newHabit]);
    setNewHabitName(""); setNewHabitEmoji("✨"); setNewHabitFreq("daily"); setNewHabitWeeklyGoal(3);
    setNewHabitXp(newHabitFreq === "weekly" ? 30 : 20); setShowAddHabit(false);
  };

  const deleteHabit = (id: string) => setHabits((prev) => prev.filter((h) => h.id !== id));
  const archiveHabit = (id: string) => setHabits((prev) => prev.map((h) => h.id === id ? { ...h, archived: !h.archived } : h));

  const toggleNotifications = async () => {
    if (settings.notificationsEnabled) {
      setSettings((prev) => ({ ...prev, notificationsEnabled: false }));
    } else {
      const granted = await requestNotifications();
      if (granted) setSettings((prev) => ({ ...prev, notificationsEnabled: true }));
    }
  };

  const exportData = () => {
    const data = { habits, journal, settings, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
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
          if (data.settings) setSettings({ ...defaultSettings, ...data.settings });
          alert("Datos importados correctamente");
        } catch { alert("Error al importar datos"); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const saveJournalEntry = () => {
    if (todayMood === 0) return;
    setJournal((prev) => {
      const filtered = prev.filter((e) => e.date !== today);
      return [...filtered, { date: today, mood: todayMood, note: todayNote }];
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#58CC02] to-[#46a302] pb-20">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center animate-bounce">
            <div className="text-6xl mb-3">🔥</div>
            <div className="text-2xl font-black text-[#58CC02]">Dia de racha!</div>
            <div className="text-sm text-gray-500 mt-1">{todayXp} XP alcanzados</div>
          </div>
        </div>
      )}

      {/* Header with XP bar */}
      <div className="bg-[#58CC02] px-4 pt-4 pb-8 text-white">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-black tracking-tight">🔥 HabitDuo</h1>
            <div className="flex items-center gap-2">
              {overallStreak > 0 && (
                <span className="bg-white/20 rounded-xl px-3 py-1.5 text-sm font-bold">🔥 {overallStreak}</span>
              )}
              <button onClick={() => setScreen("settings")} className="bg-white/20 rounded-xl px-3 py-1.5 text-sm font-bold hover:bg-white/30 transition">⚙️</button>
            </div>
          </div>

          {/* XP Progress */}
          <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-lg">{xpLevel.emoji} {xpLevel.name}</span>
              <span className="font-black text-2xl">{todayXp} XP</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-5 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden" style={{ width: xpPct + "%", background: todayXp >= 150 ? "linear-gradient(90deg, #58CC02, #FFD700)" : todayXp >= 100 ? "#FFD700" : "#58CC02" }}>
                  {xpPct > 15 && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow">{xpPct}%</span>}
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs opacity-80">
              <span>Meta: {settings.dailyXpGoal} XP para racha</span>
              {todayXp >= 150 && <span className="text-yellow-200 font-bold">⚡ Dia epico!</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 -mt-4 space-y-4">
        {/* Navigation */}
        <div className="flex bg-white rounded-2xl shadow-lg overflow-hidden">
          {(["home", "insights", "journal"] as const).map((key) => (
            <button key={key} onClick={() => setScreen(key)} className={"flex-1 py-3 text-sm font-bold transition " + (screen === key ? "bg-[#58CC02] text-white" : "text-gray-500 hover:bg-gray-50")}>
              {key === "home" ? "🏠 Inicio" : key === "insights" ? "📊 Insights" : "📝 Diario"}
            </button>
          ))}
        </div>

        {/* HOME SCREEN */}
        {screen === "home" && (
          <div className="space-y-3">
            {/* Today XP breakdown */}
            <div className="bg-white rounded-2xl shadow-md p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-800 text-sm">XP de hoy</h3>
                <span className={"font-black " + (todayXp >= settings.dailyXpGoal ? "text-[#58CC02]" : "text-gray-400")}>{todayXp}/{settings.dailyXpGoal}</span>
              </div>
              <div className="space-y-1">
                {activeHabits.filter((h) => h.completions.includes(today)).map((h) => (
                  <div key={h.id} className="flex justify-between text-xs text-gray-500">
                    <span>{h.emoji} {h.name}</span>
                    <span className="text-[#58CC02] font-bold">+{h.xpReward} XP</span>
                  </div>
                ))}
                {journal.find((e) => e.date === today) && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>📝 Diario</span>
                    <span className="text-[#58CC02] font-bold">+15 XP</span>
                  </div>
                )}
                {todayXp === 0 && <p className="text-xs text-gray-400 text-center py-1">Completa habitos para ganar XP</p>}
              </div>
            </div>

            {/* Habit cards */}
            {activeHabits.map((habit) => {
              const streak = getHabitStreak(habit);
              const isCompleted = habit.frequency === "daily" ? habit.completions.includes(today) : habit.completions.includes(today);
              const isSkipped = habit.skips.includes(today);
              const weekComps = habit.frequency === "weekly" ? habit.completions.filter((c) => weekDates.includes(c)).length : 0;
              const weekDone = habit.frequency === "weekly" && isWeekComplete(habit);
              return (
                <div key={habit.id} className={"bg-white rounded-2xl shadow-md p-4 transition-all " + (isCompleted || weekDone ? "ring-2 ring-[#58CC02] " : "") + (isSkipped ? "opacity-60" : "")}>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleComplete(habit.id)} className={"w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black transition-all " + (isCompleted || weekDone ? "bg-[#58CC02] text-white shadow-lg shadow-green-200 scale-105" : "bg-gray-100 text-gray-400 hover:bg-gray-200")}>
                      {isCompleted || weekDone ? "✓" : habit.emoji}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={"font-bold " + (isCompleted || weekDone ? "line-through text-gray-400" : "text-gray-800")}>{habit.name}</span>
                        <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5 font-medium text-gray-500">{habit.frequency === "daily" ? "Diario" : "Semanal"}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-[#58CC02]">+{habit.xpReward} XP</span>
                        {streak > 0 && <span className="text-xs font-bold text-orange-500">🔥 {streak}</span>}
                        {habit.frequency === "weekly" && <span className="text-xs text-gray-400">{weekComps}/{habit.weeklyGoal || 3}/sem</span>}
                        {isSkipped && <span className="text-xs text-amber-500 font-medium">⏭</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!isCompleted && habit.frequency === "weekly" && !isSkipped && (
                        <button onClick={() => skipHabit(habit.id)} className="text-xs bg-amber-50 text-amber-600 rounded-lg px-2 py-1 font-medium hover:bg-amber-100 transition" title="Lo hago mañana">⏭</button>
                      )}
                      <button onClick={() => setEditingHabitId(editingHabitId === habit.id ? null : habit.id)} className="text-gray-300 hover:text-gray-500 transition p-1">⋮</button>
                    </div>
                  </div>
                  {editingHabitId === habit.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                      <button onClick={() => archiveHabit(habit.id)} className="text-xs bg-blue-50 text-blue-600 rounded-lg px-3 py-1.5 font-medium hover:bg-blue-100">{habit.archived ? "Restaurar" : "Archivar"}</button>
                      <button onClick={() => deleteHabit(habit.id)} className="text-xs bg-red-50 text-red-600 rounded-lg px-3 py-1.5 font-medium hover:bg-red-100">Eliminar</button>
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={() => setShowAddHabit(true)} className="w-full bg-white border-2 border-dashed border-[#58CC02] rounded-2xl p-4 text-[#58CC02] font-bold hover:bg-green-50 transition">+ Agregar habito</button>
          </div>
        )}

        {/* INSIGHTS SCREEN */}
        {screen === "insights" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl shadow-md p-4 text-center">
                <div className="text-3xl font-black text-[#58CC02]">{overallStreak}</div>
                <div className="text-xs text-gray-500 font-medium">Racha actual 🔥</div>
              </div>
              <div className="bg-white rounded-2xl shadow-md p-4 text-center">
                <div className="text-3xl font-black text-blue-500">{totalXpAllTime}</div>
                <div className="text-xs text-gray-500 font-medium">XP totales ⭐</div>
              </div>
              <div className="bg-white rounded-2xl shadow-md p-4 text-center">
                <div className="text-3xl font-black text-purple-500">{activeHabits.length}</div>
                <div className="text-xs text-gray-500 font-medium">Habitos activos 💪</div>
              </div>
              <div className="bg-white rounded-2xl shadow-md p-4 text-center">
                <div className="text-3xl font-black text-orange-500">{journal.length}</div>
                <div className="text-xs text-gray-500 font-medium">Entradas diario 📝</div>
              </div>
            </div>

            {/* Weekly XP chart */}
            <div className="bg-white rounded-2xl shadow-md p-4">
              <h3 className="font-bold text-gray-800 mb-3">📊 XP por dia</h3>
              <div className="flex justify-between items-end h-28">
                {weekData.map((d, i) => {
                  const dayName = new Date(d.date + "T12:00:00").toLocaleDateString("es", { weekday: "short" });
                  const maxXP = Math.max(...weekData.map((w) => w.xp), settings.dailyXpGoal);
                  const hPct = Math.max((d.xp / maxXP) * 100, 3);
                  const isToday = d.date === today;
                  const hitGoal = d.xp >= settings.dailyXpGoal;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1">
                      <span className="text-[9px] font-bold text-gray-400">{d.xp}</span>
                      <div className="w-full max-w-[28px] relative" style={{ height: hPct + "%" }}>
                        <div className={"w-full h-full rounded-lg transition-all " + (hitGoal ? "bg-[#58CC02]" : isToday ? "bg-blue-300" : "bg-gray-200")} style={{ height: "100%" }} />
                        {(() => {
                          const goalLine = (settings.dailyXpGoal / maxXP) * 100;
                          return goalLine < 100 ? <div className="absolute left-0 right-0 border-t-2 border-dashed border-red-300" style={{ bottom: goalLine + "%" }} /> : null;
                        })()}
                      </div>
                      <span className={"text-[10px] font-bold " + (isToday ? "text-[#58CC02]" : "text-gray-400")}>{dayName}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#58CC02] rounded" /> Meta alcanzada</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-200 rounded" /> En progreso</div>
              </div>
            </div>

            {/* Per-habit streaks */}
            <div className="bg-white rounded-2xl shadow-md p-4">
              <h3 className="font-bold text-gray-800 mb-3">🔥 Rachas por habito</h3>
              {activeHabits.map((h) => (
                <div key={h.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{h.emoji} {h.name}</span>
                    <span className="text-[10px] text-[#58CC02] font-bold">+{h.xpReward} XP</span>
                  </div>
                  <span className="font-bold text-orange-500">{getHabitStreak(h)} dias</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* JOURNAL SCREEN */}
        {screen === "journal" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-md p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">Como te sentis hoy?</h3>
                <span className="text-xs bg-[#58CC02]/10 text-[#58CC02] font-bold px-2 py-1 rounded-lg">+15 XP</span>
              </div>
              <div className="flex justify-between mb-3">
                {moodEmojis.map((emoji, i) => (
                  <button key={i} onClick={() => setTodayMood(i + 1)} className={"text-3xl transition-all " + (todayMood === i + 1 ? "scale-125 drop-shadow-lg" : "opacity-40 hover:opacity-70")}>{emoji}</button>
                ))}
              </div>
              {todayMood > 0 && <p className="text-center text-sm text-gray-500 mb-3">{moodLabels[todayMood - 1]}</p>}
              <textarea value={todayNote} onChange={(e) => setTodayNote(e.target.value)} placeholder="Escribi algo sobre tu dia..." className="w-full bg-gray-50 rounded-xl p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-[#58CC02]" />
              <button onClick={saveJournalEntry} disabled={todayMood === 0} className="mt-3 w-full bg-[#58CC02] text-white font-bold py-2.5 rounded-xl disabled:opacity-40 hover:bg-[#4fb002] transition">Guardar entrada</button>
            </div>
            <div className="space-y-2">
              {journal.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).map((entry) => (
                <div key={entry.date} className="bg-white rounded-2xl shadow-md p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{moodEmojis[entry.mood - 1]}</span>
                    <span className="font-bold text-gray-700">{entry.date}</span>
                    <span className="text-xs text-[#58CC02] font-bold">+15 XP</span>
                  </div>
                  {entry.note && <p className="text-sm text-gray-500 ml-9">{entry.note}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS SCREEN */}
        {screen === "settings" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-md p-4">
              <h3 className="font-bold text-gray-800 mb-4">⚙️ Configuracion</h3>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <div className="font-medium text-gray-800">🔔 Notificaciones</div>
                  <div className="text-xs text-gray-400">Recibir recordatorios para tus habitos</div>
                </div>
                <button onClick={toggleNotifications} className={"w-14 h-8 rounded-full transition-all relative " + (settings.notificationsEnabled ? "bg-[#58CC02]" : "bg-gray-300")}>
                  <div className={"w-6 h-6 bg-white rounded-full absolute top-1 transition-all shadow " + (settings.notificationsEnabled ? "left-7" : "left-1")} />
                </button>
              </div>
              <div className="py-3 border-b border-gray-100">
                <div className="font-medium text-gray-800 mb-1">⏰ Intervalo de recordatorio</div>
                <div className="text-xs text-gray-400 mb-2">Cada cuanto recibir notificaciones</div>
                <div className="flex gap-2">
                  {[1, 2, 3, 6, 12].map((h) => (
                    <button key={h} onClick={() => setSettings((prev) => ({ ...prev, nudgeIntervalHours: h }))} className={"px-3 py-1.5 rounded-lg text-sm font-bold transition " + (settings.nudgeIntervalHours === h ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>{h}h</button>
                  ))}
                </div>
              </div>
              <div className="py-3 border-b border-gray-100">
                <div className="font-medium text-gray-800 mb-1">🎯 Meta diaria de XP</div>
                <div className="text-xs text-gray-400 mb-2">XP necesarios para un dia de racha</div>
                <div className="flex gap-2">
                  {[50, 75, 100, 150, 200].map((xp) => (
                    <button key={xp} onClick={() => setSettings((prev) => ({ ...prev, dailyXpGoal: xp }))} className={"px-3 py-1.5 rounded-lg text-sm font-bold transition " + (settings.dailyXpGoal === xp ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>{xp}</button>
                  ))}
                </div>
              </div>
              <div className="py-3 border-b border-gray-100">
                <div className="font-medium text-gray-800 mb-1">💾 Datos</div>
                <div className="text-xs text-gray-400 mb-2">Exportar o importar tus datos</div>
                <div className="flex gap-2">
                  <button onClick={exportData} className="flex-1 bg-blue-50 text-blue-600 font-bold py-2 rounded-xl text-sm hover:bg-blue-100 transition">📤 Exportar</button>
                  <button onClick={importData} className="flex-1 bg-purple-50 text-purple-600 font-bold py-2 rounded-xl text-sm hover:bg-purple-100 transition">📥 Importar</button>
                </div>
              </div>
              <div className="py-3">
                <button onClick={() => { if (confirm("Borrar todos los datos? Esta accion no se puede deshacer.")) { localStorage.clear(); window.location.reload(); } }} className="w-full bg-red-50 text-red-600 font-bold py-2 rounded-xl text-sm hover:bg-red-100 transition">🗑 Reiniciar datos</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Habit Modal */}
      {showAddHabit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowAddHabit(false)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-md space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-xl text-gray-800">Nuevo habito</h3>
            <div>
              <label className="text-sm font-medium text-gray-600">Emoji</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {["🏃", "📖", "🧘", "💧", "🎵", "✍️", "🥗", "💤", "💊", "🧹", "🎯", "💪", "🎨", "🌿", "📱", "✨"].map((e) => (
                  <button key={e} onClick={() => setNewHabitEmoji(e)} className={"text-2xl p-1.5 rounded-lg transition " + (newHabitEmoji === e ? "bg-[#58CC02]/20 ring-2 ring-[#58CC02]" : "hover:bg-gray-100")}>{e}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Nombre</label>
              <input value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} placeholder="Ej: Correr 30 minutos" className="w-full mt-1 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#58CC02]" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Frecuencia</label>
              <div className="flex gap-2 mt-1">
                <button onClick={() => { setNewHabitFreq("daily"); setNewHabitXp(20); }} className={"flex-1 py-2.5 rounded-xl font-bold text-sm transition " + (newHabitFreq === "daily" ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>📅 Diario</button>
                <button onClick={() => { setNewHabitFreq("weekly"); setNewHabitXp(30); }} className={"flex-1 py-2.5 rounded-xl font-bold text-sm transition " + (newHabitFreq === "weekly" ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>📆 Semanal</button>
              </div>
            </div>
            {newHabitFreq === "weekly" && (
              <div>
                <label className="text-sm font-medium text-gray-600">Veces por semana</label>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <button key={n} onClick={() => setNewHabitWeeklyGoal(n)} className={"w-10 h-10 rounded-xl font-bold text-sm transition " + (newHabitWeeklyGoal === n ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>{n}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-600">Recompensa XP</label>
              <div className="flex gap-2 mt-1">
                {[10, 20, 30, 50].map((xp) => (
                  <button key={xp} onClick={() => setNewHabitXp(xp)} className={"px-4 py-2 rounded-xl font-bold text-sm transition " + (newHabitXp === xp ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>+{xp}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAddHabit(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition">Cancelar</button>
              <button onClick={addHabit} className="flex-1 py-3 rounded-xl font-bold text-white bg-[#58CC02] hover:bg-[#4fb002] transition">Crear habito</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
