"use client";
import { useState, useEffect, useCallback } from "react";

interface Habit {
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

interface JournalEntry {
  date: string;
  mood: number;
  note: string;
}

interface AppSettings {
  notificationsEnabled: boolean;
  nudgeIntervalHours: number;
  dailyXpGoal: number;
  autoGoal: boolean;
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
    const completed = h.completions.includes(date);
    if (h.habitType === "build" && completed) {
      xp += h.xpReward;
    } else if (h.habitType === "avoid" && completed) {
      xp -= Math.abs(h.xpReward);
    } else if (h.habitType === "avoid" && !completed && h.frequency === "daily") {
      xp += Math.abs(h.xpReward);
    }
  }
  if (journal.find((e) => e.date === date)) xp += 15;
  return xp;
}

function calcAutoGoal(habits: Habit[]): number {
  let maxDaily = 0;
  const active = habits.filter((h) => !h.archived);
  for (const h of active) {
    if (h.habitType === "build") {
      if (h.frequency === "daily") maxDaily += h.xpReward;
      else maxDaily += Math.round(h.xpReward * (h.weeklyGoal || 3) / 7);
    } else {
      maxDaily += Math.abs(h.xpReward);
    }
  }
  maxDaily += 15;
  return Math.max(20, Math.round(maxDaily * 0.75 / 5) * 5);
}

function getOverallStreak(habits: Habit[], journal: JournalEntry[], dailyXpGoal: number): number {
  const today = getTodayStr();
  const todayXp = getDayXp(habits, journal, today);
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const yesterdayXp = getDayXp(habits, journal, yesterday);
  if (todayXp < dailyXpGoal && yesterdayXp < dailyXpGoal) return 0;
  let streak = 0;
  const startOffset = todayXp >= dailyXpGoal ? 0 : 1;
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (getDayXp(habits, journal, d.toISOString().split("T")[0]) >= dailyXpGoal) streak++; else break;
  }
  return streak;
}

function getHabitStreak(habit: Habit): number {
  if (habit.completions.length === 0) return 0;
  const sorted = [...habit.completions].sort().reverse();
  const today = getTodayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (habit.habitType === "avoid") {
    if (habit.frequency === "daily") {
      let streak = 0;
      for (let i = 0; i < 365; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = d.toISOString().split("T")[0];
        if (!habit.completions.includes(ds)) streak++;
        else break;
      }
      return streak;
    }
    return 0;
  }

  if (habit.frequency === "daily") {
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
    let streak = 0, checkDate = new Date(sorted[0] + "T12:00:00");
    for (const comp of sorted) {
      const compDate = new Date(comp + "T12:00:00");
      const diff = Math.round((checkDate.getTime() - compDate.getTime()) / 86400000);
      if (diff === streak) { streak++; checkDate = compDate; } else break;
    }
    return streak;
  } else {
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
}

function isWeekComplete(habit: Habit): boolean {
  if (habit.frequency !== "weekly") return false;
  const wd = getWeekDates().slice(-7);
  return habit.completions.filter((c) => wd.includes(c)).length >= (habit.weeklyGoal || 3);
}

function getCompletionRate(habit: Habit): number {
  const created = new Date(habit.createdAt + "T12:00:00");
  const daysSince = Math.max(1, Math.round((Date.now() - created.getTime()) / 86400000));
  if (habit.habitType === "avoid" && habit.frequency === "daily") {
    const daysAvoided = daysSince - habit.completions.filter((c) => c >= habit.createdAt).length;
    return Math.round((daysAvoided / daysSince) * 100);
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

function getRateColor(rate: number): string {
  if (rate >= 80) return "text-[#58CC02]"; if (rate >= 60) return "text-blue-500";
  if (rate >= 40) return "text-amber-500"; return "text-red-500";
}
function getRateBarColor(rate: number): string {
  if (rate >= 80) return "bg-[#58CC02]"; if (rate >= 60) return "bg-blue-500";
  if (rate >= 40) return "bg-amber-500"; return "bg-red-500";
}
function getRateLabel(rate: number): string {
  if (rate >= 80) return "Excelente"; if (rate >= 60) return "Bueno";
  if (rate >= 40) return "Mejorable"; return "Te cuesta";
}
function getXpLevel(xp: number, goal: number): { name: string; emoji: string } {
  if (xp >= goal * 1.5) return { name: "Dia epico!", emoji: "⚡" };
  if (xp >= goal) return { name: "Dia de racha!", emoji: "🔥" };
  if (xp >= goal * 0.5) return { name: "Buen ritmo", emoji: "💪" };
  if (xp < 0) return { name: "Dia negativo", emoji: "😵" };
  return { name: "Recien empezando", emoji: "🌱" };
}

const todayStr = getTodayStr();
const defaultHabits: Habit[] = [
  { id: "1", name: "Ejercicio", emoji: "🏃", frequency: "daily", xpReward: 20, habitType: "build", createdAt: todayStr, completions: [], skips: [], archived: false },
  { id: "2", name: "Leer", emoji: "📖", frequency: "daily", xpReward: 20, habitType: "build", createdAt: todayStr, completions: [], skips: [], archived: false },
  { id: "3", name: "Meditar", emoji: "🧘", frequency: "weekly", weeklyGoal: 3, xpReward: 30, habitType: "build", createdAt: todayStr, completions: [], skips: [], archived: false },
  { id: "4", name: "Comer bien", emoji: "🥗", frequency: "daily", xpReward: 15, habitType: "build", createdAt: todayStr, completions: [], skips: [], archived: false },
  { id: "5", name: "Comer mal", emoji: "🍔", frequency: "daily", xpReward: 25, habitType: "avoid", createdAt: todayStr, completions: [], skips: [], archived: false },
  { id: "6", name: "Celular de mas", emoji: "📱", frequency: "daily", xpReward: 20, habitType: "avoid", createdAt: todayStr, completions: [], skips: [], archived: false },
];

const defaultSettings: AppSettings = { notificationsEnabled: false, nudgeIntervalHours: 3, dailyXpGoal: 100, autoGoal: true };
const moodEmojis = ["😢", "😟", "😐", "😊", "🤩"];
const moodLabels = ["Muy mal", "Mal", "Normal", "Bien", "Genial"];

export default function HabitDuo() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [screen, setScreen] = useState<"home" | "insights" | "journal" | "settings">("home");
  const [insightsTab, setInsightsTab] = useState<"overview" | "strategy">("overview");
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitEmoji, setNewHabitEmoji] = useState("✨");
  const [newHabitFreq, setNewHabitFreq] = useState<"daily" | "weekly">("daily");
  const [newHabitWeeklyGoal, setNewHabitWeeklyGoal] = useState(3);
  const [newHabitXp, setNewHabitXp] = useState(20);
  const [newHabitType, setNewHabitType] = useState<"build" | "avoid">("build");
  const [todayMood, setTodayMood] = useState(0);
  const [todayNote, setTodayNote] = useState("");
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [prevXp, setPrevXp] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("habitduo-habits");
    if (saved) {
      const parsed = JSON.parse(saved);
      const migrated = parsed.map((h: any) => ({
        ...h,
        xpReward: h.xpReward || (h.frequency === "weekly" ? 30 : 20),
        habitType: h.habitType || "build",
      }));
      setHabits(migrated);
    } else setHabits(defaultHabits);
    const sj = localStorage.getItem("habitduo-journal");
    if (sj) setJournal(JSON.parse(sj));
    const ss = localStorage.getItem("habitduo-settings");
    if (ss) setSettings({ ...defaultSettings, ...JSON.parse(ss) });
    const sm = localStorage.getItem("habitduo-todaymood");
    if (sm) setTodayMood(parseInt(sm));
    const sn = localStorage.getItem("habitduo-todaynote");
    if (sn) setTodayNote(sn);
  }, []);

  useEffect(() => { if (habits.length > 0) localStorage.setItem("habitduo-habits", JSON.stringify(habits)); }, [habits]);
  useEffect(() => { localStorage.setItem("habitduo-journal", JSON.stringify(journal)); }, [journal]);
  useEffect(() => { localStorage.setItem("habitduo-settings", JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem("habitduo-todaymood", todayMood.toString()); }, [todayMood]);
  useEffect(() => { localStorage.setItem("habitduo-todaynote", todayNote); }, [todayNote]);

  const today = getTodayStr();
  const activeHabits = habits.filter((h) => !h.archived);
  const autoGoal = calcAutoGoal(habits);
  const effectiveGoal = settings.autoGoal ? autoGoal : settings.dailyXpGoal;
  const todayXp = getDayXp(habits, journal, today);
  const overallStreak = getOverallStreak(habits, journal, effectiveGoal);
  const xpPct = effectiveGoal > 0 ? Math.min(150, Math.round((todayXp / effectiveGoal) * 100)) : 0;
  const barPct = Math.min(100, Math.max(0, (todayXp / effectiveGoal) * 100));
  const xpLevel = getXpLevel(todayXp, effectiveGoal);
  const weekDates = getWeekDates();
  const weekData = weekDates.map((date) => ({ date, xp: getDayXp(habits, journal, date) }));
  const totalXpAllTime = habits.reduce((acc, h) => {
    if (h.habitType === "build") return acc + h.completions.length * h.xpReward;
    return acc - h.completions.length * Math.abs(h.xpReward);
  }, 0) + journal.length * 15;

  const habitRates = activeHabits.map((h) => ({ habit: h, rate: getCompletionRate(h) })).sort((a, b) => a.rate - b.rate);
  const hardestHabits = habitRates.filter((h) => h.rate < 60);
  const easiestHabits = habitRates.filter((h) => h.rate >= 80);
  const averageRate = habitRates.length > 0 ? Math.round(habitRates.reduce((s, h) => s + h.rate, 0) / habitRates.length) : 0;

  // Max possible XP today
  const maxPossibleXp = activeHabits.reduce((acc, h) => {
    if (h.habitType === "build") {
      if (h.frequency === "daily") return acc + h.xpReward;
      return acc + h.xpReward;
    }
    return acc + Math.abs(h.xpReward);
  }, 0) + 15;

  const requestNotifications = useCallback(async () => {
    if (!("Notification" in window)) return false;
    return (await Notification.requestPermission()) === "granted";
  }, []);

  const scheduleNudge = useCallback(() => {
    if (!settings.notificationsEnabled) return;
    const interval = settings.nudgeIntervalHours * 60 * 60 * 1000;
    const existingTimer = (window as any).__nudgeTimer;
    if (existingTimer) clearInterval(existingTimer);
    const timer = setInterval(() => {
      const txp = getDayXp(habits, journal, getTodayStr());
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

  useEffect(() => {
    if (todayXp >= effectiveGoal && prevXp < effectiveGoal) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
    setPrevXp(todayXp);
  }, [todayXp, effectiveGoal]);

  const toggleComplete = (id: string) => {
    setHabits((prev) => prev.map((h) => {
      if (h.id !== id) return h;
      if (h.completions.includes(today)) return { ...h, completions: h.completions.filter((c) => c !== today) };
      return { ...h, completions: [...h.completions, today] };
    }));
  };

  const skipHabit = (id: string) => {
    setHabits((prev) => prev.map((h) => h.id !== id ? h : { ...h, skips: [...h.skips, today] }));
  };

  const addHabit = () => {
    if (!newHabitName.trim()) return;
    const newHabit: Habit = {
      id: Date.now().toString(), name: newHabitName.trim(), emoji: newHabitEmoji,
      frequency: newHabitFreq, weeklyGoal: newHabitFreq === "weekly" ? newHabitWeeklyGoal : undefined,
      xpReward: newHabitType === "avoid" ? Math.abs(newHabitXp) : newHabitXp,
      habitType: newHabitType, createdAt: getTodayStr(), completions: [], skips: [], archived: false,
    };
    setHabits((prev) => [...prev, newHabit]);
    setNewHabitName(""); setNewHabitEmoji("✨"); setNewHabitFreq("daily"); setNewHabitWeeklyGoal(3);
    setNewHabitXp(newHabitType === "avoid" ? 20 : 20); setNewHabitType("build"); setShowAddHabit(false);
  };

  const deleteHabit = (id: string) => setHabits((prev) => prev.filter((h) => h.id !== id));
  const archiveHabit = (id: string) => setHabits((prev) => prev.map((h) => h.id === id ? { ...h, archived: !h.archived } : h));

  const toggleNotifications = async () => {
    if (settings.notificationsEnabled) setSettings((p) => ({ ...p, notificationsEnabled: false }));
    else { const g = await requestNotifications(); if (g) setSettings((p) => ({ ...p, notificationsEnabled: true })); }
  };

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
    setJournal((prev) => [...prev.filter((e) => e.date !== today), { date: today, mood: todayMood, note: todayNote }]);
  };

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

      <div className="bg-[#58CC02] px-4 pt-4 pb-8 text-white">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-black tracking-tight">🔥 HabitDuo</h1>
            <div className="flex items-center gap-2">
              {overallStreak > 0 && <span className="bg-white/20 rounded-xl px-3 py-1.5 text-sm font-bold">🔥 {overallStreak}</span>}
              <button onClick={() => setScreen("settings")} className="bg-white/20 rounded-xl px-3 py-1.5 text-sm font-bold hover:bg-white/30 transition">⚙️</button>
            </div>
          </div>
          <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-lg">{xpLevel.emoji} {xpLevel.name}</span>
              <span className="font-black text-2xl">{todayXp} XP</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-5 bg-white/30 rounded-full overflow-hidden relative">
                <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden" style={{
                  width: Math.min(100, barPct) + "%",
                  background: todayXp < 0 ? "#ef4444" : todayXp >= effectiveGoal * 1.5 ? "linear-gradient(90deg, #58CC02, #FFD700)" : todayXp >= effectiveGoal ? "#FFD700" : "#58CC02"
                }}>
                  {barPct > 15 && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow">{xpPct}%</span>}
                </div>
                {todayXp < 0 && <div className="absolute inset-0 bg-red-500 rounded-full" style={{ width: Math.min(100, Math.abs(barPct)) + "%" }} />}
              </div>
            </div>
            <div className="flex justify-between text-xs opacity-80">
              <span>Meta: {effectiveGoal} XP {settings.autoGoal ? "(auto)" : ""}</span>
              {todayXp >= effectiveGoal * 1.5 && <span className="text-yellow-200 font-bold">⚡ Epico!</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-4 space-y-4">
        <div className="flex bg-white rounded-2xl shadow-lg overflow-hidden">
          {(["home", "insights", "journal"] as const).map((key) => (
            <button key={key} onClick={() => setScreen(key)} className={"flex-1 py-3 text-sm font-bold transition " + (screen === key ? "bg-[#58CC02] text-white" : "text-gray-500 hover:bg-gray-50")}>
              {key === "home" ? "🏠 Inicio" : key === "insights" ? "📊 Insights" : "📝 Diario"}
            </button>
          ))}
        </div>

        {screen === "home" && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl shadow-md p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-800 text-sm">XP de hoy</h3>
                <span className={"font-black " + (todayXp >= effectiveGoal ? "text-[#58CC02]" : todayXp < 0 ? "text-red-500" : "text-gray-400")}>{todayXp}/{effectiveGoal}</span>
              </div>
              <div className="space-y-1">
                {activeHabits.map((h) => {
                  const completed = h.completions.includes(today);
                  if (h.habitType === "build" && completed) {
                    return <div key={h.id} className="flex justify-between text-xs text-gray-500"><span>{h.emoji} {h.name}</span><span className="text-[#58CC02] font-bold">+{h.xpReward} XP</span></div>;
                  }
                  if (h.habitType === "avoid" && completed) {
                    return <div key={h.id} className="flex justify-between text-xs text-gray-500"><span>{h.emoji} {h.name}</span><span className="text-red-500 font-bold">-{h.xpReward} XP</span></div>;
                  }
                  if (h.habitType === "avoid" && !completed && h.frequency === "daily") {
                    return <div key={h.id} className="flex justify-between text-xs text-gray-500"><span>{h.emoji} Evitado ✓</span><span className="text-[#58CC02] font-bold">+{h.xpReward} XP</span></div>;
                  }
                  return null;
                })}
                {journal.find((e) => e.date === today) && <div className="flex justify-between text-xs text-gray-500"><span>📝 Diario</span><span className="text-[#58CC02] font-bold">+15 XP</span></div>}
                {todayXp === 0 && <p className="text-xs text-gray-400 text-center py-1">Completa habitos para ganar XP</p>}
              </div>
            </div>

            {/* Build habits section */}
            {activeHabits.filter((h) => h.habitType === "build").length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">🟢 Construir</h3>
                {activeHabits.filter((h) => h.habitType === "build").map((habit) => {
                  const streak = getHabitStreak(habit);
                  const isCompleted = habit.completions.includes(today);
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
                          {!isCompleted && habit.frequency === "weekly" && !isSkipped && <button onClick={() => skipHabit(habit.id)} className="text-xs bg-amber-50 text-amber-600 rounded-lg px-2 py-1 font-medium hover:bg-amber-100 transition">⏭</button>}
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
              </div>
            )}

            {/* Avoid habits section */}
            {activeHabits.filter((h) => h.habitType === "avoid").length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">🔴 Evitar</h3>
                {activeHabits.filter((h) => h.habitType === "avoid").map((habit) => {
                  const streak = getHabitStreak(habit);
                  const didIt = habit.completions.includes(today);
                  const isDailyAvoid = habit.frequency === "daily";
                  return (
                    <div key={habit.id} className={"bg-white rounded-2xl shadow-md p-4 transition-all " + (didIt ? "ring-2 ring-red-400 bg-red-50/50" : isDailyAvoid && !didIt ? "ring-2 ring-[#58CC02]" : "")}>
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleComplete(habit.id)} className={"w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black transition-all " + (didIt ? "bg-red-500 text-white shadow-lg shadow-red-200 scale-105" : "bg-green-50 text-green-500")}>
                          {didIt ? "✗" : "✓"}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={"font-bold " + (didIt ? "text-red-600" : "text-gray-800")}>{habit.name}</span>
                            {didIt ? (
                              <span className="text-[10px] bg-red-50 text-red-500 rounded-full px-1.5 py-0.5 font-bold">-{habit.xpReward} XP</span>
                            ) : isDailyAvoid ? (
                              <span className="text-[10px] bg-green-50 text-green-600 rounded-full px-1.5 py-0.5 font-bold">+{habit.xpReward} XP</span>
                            ) : (
                              <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 font-bold">{habit.xpReward} XP</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-400">{habit.frequency === "daily" ? "Diario" : "Semanal"}</span>
                            {streak > 0 && !didIt && <span className="text-xs font-bold text-orange-500">🔥 {streak} sin caer</span>}
                            {didIt && <span className="text-xs text-red-400 font-medium">Lo hiciste hoy</span>}
                            {!didIt && isDailyAvoid && <span className="text-xs text-green-500 font-medium">Evitado hoy ✓</span>}
                          </div>
                        </div>
                        <button onClick={() => setEditingHabitId(editingHabitId === habit.id ? null : habit.id)} className="text-gray-300 hover:text-gray-500 transition p-1">⋮</button>
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
              </div>
            )}

            <button onClick={() => setShowAddHabit(true)} className="w-full bg-white border-2 border-dashed border-[#58CC02] rounded-2xl p-4 text-[#58CC02] font-bold hover:bg-green-50 transition">+ Agregar habito</button>
          </div>
        )}

        {screen === "insights" && (
          <div className="space-y-4">
            <div className="flex bg-white rounded-2xl shadow-md overflow-hidden">
              <button onClick={() => setInsightsTab("overview")} className={"flex-1 py-2.5 text-sm font-bold transition " + (insightsTab === "overview" ? "bg-[#58CC02] text-white" : "text-gray-500 hover:bg-gray-50")}>📊 Resumen</button>
              <button onClick={() => setInsightsTab("strategy")} className={"flex-1 py-2.5 text-sm font-bold transition " + (insightsTab === "strategy" ? "bg-[#58CC02] text-white" : "text-gray-500 hover:bg-gray-50")}>🎯 Estrategia</button>
            </div>

            {insightsTab === "overview" && (
              <>
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
                      const absH = Math.max(Math.abs(d.xp) / maxXP * 100, 3);
                      const isToday = d.date === today;
                      const hitGoal = d.xp >= effectiveGoal;
                      const isNeg = d.xp < 0;
                      return (
                        <div key={i} className="flex flex-col items-center gap-1 flex-1">
                          <span className={"text-[9px] font-bold " + (isNeg ? "text-red-400" : "text-gray-400")}>{d.xp}</span>
                          <div className="w-full max-w-[28px] relative" style={{ height: absH + "%" }}>
                            <div className={"w-full h-full rounded-lg " + (hitGoal ? "bg-[#58CC02]" : isNeg ? "bg-red-400" : isToday ? "bg-blue-300" : "bg-gray-200")} />
                          </div>
                          <span className={"text-[10px] font-bold " + (isToday ? "text-[#58CC02]" : "text-gray-400")}>{dayName}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#58CC02] rounded" /> Meta</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-200 rounded" /> En progreso</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-400 rounded" /> Negativo</div>
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
              </>
            )}

            {insightsTab === "strategy" && (
              <>
                <div className="bg-white rounded-2xl shadow-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-800">🎯 Tu rendimiento</h3>
                    <span className={"font-black text-lg " + getRateColor(averageRate)}>{averageRate}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className={"h-full rounded-full " + getRateBarColor(averageRate)} style={{ width: averageRate + "%" }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{getRateLabel(averageRate)} en promedio</p>
                </div>

                {hardestHabits.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-md p-4">
                    <h3 className="font-bold text-red-500 mb-1">💪 Los que mas te cuestan</h3>
                    <p className="text-xs text-gray-400 mb-3">Enfocate en estos para mejorar</p>
                    <div className="space-y-3">
                      {hardestHabits.map(({ habit, rate }) => (
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
                          <div className="flex items-center justify-between text-[10px] text-gray-400">
                            <span>{habit.completions.length} veces{habit.habitType === "avoid" ? " que lo hiciste" : " completado"}</span>
                            <span className={getRateColor(rate)}>{getRateLabel(rate)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {easiestHabits.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-md p-4">
                    <h3 className="font-bold text-[#58CC02] mb-1">⭐ Los que te salen facil</h3>
                    <p className="text-xs text-gray-400 mb-3">Segui asi!</p>
                    <div className="space-y-3">
                      {easiestHabits.map(({ habit, rate }) => (
                        <div key={habit.id} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><span className="text-lg">{habit.emoji}</span><span className="font-medium text-gray-800 text-sm">{habit.name}</span></div>
                            <span className="font-black text-sm text-[#58CC02]">{rate}%</span>
                          </div>
                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#58CC02]" style={{ width: rate + "%" }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-md p-4">
                  <h3 className="font-bold text-gray-800 mb-3">📊 Ranking completo</h3>
                  <div className="space-y-2">
                    {habitRates.map(({ habit, rate }, index) => (
                      <div key={habit.id} className="flex items-center gap-3">
                        <span className={"w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white " + (index === 0 ? "bg-red-400" : index === habitRates.length - 1 ? "bg-[#58CC02]" : "bg-gray-300")}>{index + 1}</span>
                        <span className="text-sm">{habit.emoji}</span>
                        <span className="flex-1 font-medium text-gray-700 text-sm">{habit.name}</span>
                        <span className={"text-[10px] font-bold " + (habit.habitType === "avoid" ? "text-red-400" : "text-green-500")}>{habit.habitType === "avoid" ? "EVITAR" : "BUILD"}</span>
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden"><div className={"h-full rounded-full " + getRateBarColor(rate)} style={{ width: rate + "%" }} /></div>
                        <span className={"font-bold text-sm w-10 text-right " + getRateColor(rate)}>{rate}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {hardestHabits.length > 0 && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl shadow-md p-4 border border-amber-100">
                    <h3 className="font-bold text-amber-700 mb-1">💡 Consejo</h3>
                    <p className="text-sm text-amber-600">
                      Tu habito mas dificil es <strong>{hardestHabits[0].habit.emoji} {hardestHabits[0].habit.name}</strong> con {hardestHabits[0].rate}%.
                      {hardestHabits[0].habit.habitType === "avoid"
                        ? " Intenta identificar que dispara este habito y busca un reemplazo."
                        : hardestHabits[0].rate < 30 ? " Reduci la dificultad o cambialo a semanal." : " Vas por buen camino, un poco mas de constancia!"}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

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
                  <div className="flex items-center gap-2 mb-1"><span className="text-2xl">{moodEmojis[entry.mood - 1]}</span><span className="font-bold text-gray-700">{entry.date}</span><span className="text-xs text-[#58CC02] font-bold">+15 XP</span></div>
                  {entry.note && <p className="text-sm text-gray-500 ml-9">{entry.note}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {screen === "settings" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-md p-4">
              <h3 className="font-bold text-gray-800 mb-4">⚙️ Configuracion</h3>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div><div className="font-medium text-gray-800">🔔 Notificaciones</div><div className="text-xs text-gray-400">Recordatorios para tus habitos</div></div>
                <button onClick={toggleNotifications} className={"w-14 h-8 rounded-full transition-all relative " + (settings.notificationsEnabled ? "bg-[#58CC02]" : "bg-gray-300")}>
                  <div className={"w-6 h-6 bg-white rounded-full absolute top-1 transition-all shadow " + (settings.notificationsEnabled ? "left-7" : "left-1")} />
                </button>
              </div>
              <div className="py-3 border-b border-gray-100">
                <div className="font-medium text-gray-800 mb-1">⏰ Intervalo</div>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3, 6, 12].map((h) => (
                    <button key={h} onClick={() => setSettings((p) => ({ ...p, nudgeIntervalHours: h }))} className={"px-3 py-1.5 rounded-lg text-sm font-bold transition " + (settings.nudgeIntervalHours === h ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>{h}h</button>
                  ))}
                </div>
              </div>
              <div className="py-3 border-b border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-gray-800">🎯 Meta diaria</div>
                  <button onClick={() => setSettings((p) => ({ ...p, autoGoal: !p.autoGoal }))} className={"text-xs font-bold px-2 py-1 rounded-lg " + (settings.autoGoal ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>{settings.autoGoal ? "AUTO" : "MANUAL"}</button>
                </div>
                <div className="text-xs text-gray-400 mb-2">{settings.autoGoal ? "Calculada automaticamente: " + autoGoal + " XP (75% del maximo posible)" : "Elegida manualmente"}</div>
                {!settings.autoGoal && (
                  <div className="flex gap-2">
                    {[50, 75, 100, 150, 200].map((xp) => (
                      <button key={xp} onClick={() => setSettings((p) => ({ ...p, dailyXpGoal: xp }))} className={"px-3 py-1.5 rounded-lg text-sm font-bold transition " + (settings.dailyXpGoal === xp ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>{xp}</button>
                    ))}
                  </div>
                )}
                {settings.autoGoal && (
                  <div className="bg-gray-50 rounded-xl p-3 mt-1">
                    <div className="text-xs text-gray-500">Max posible: {maxPossibleXp} XP/dia</div>
                    <div className="text-xs text-[#58CC02] font-bold">Meta auto: {autoGoal} XP/dia</div>
                  </div>
                )}
              </div>
              <div className="py-3 border-b border-gray-100">
                <div className="font-medium text-gray-800 mb-1">💾 Datos</div>
                <div className="flex gap-2 mt-1">
                  <button onClick={exportData} className="flex-1 bg-blue-50 text-blue-600 font-bold py-2 rounded-xl text-sm hover:bg-blue-100 transition">📤 Exportar</button>
                  <button onClick={importData} className="flex-1 bg-purple-50 text-purple-600 font-bold py-2 rounded-xl text-sm hover:bg-purple-100 transition">📥 Importar</button>
                </div>
              </div>
              <div className="py-3">
                <button onClick={() => { if (confirm("Borrar todos los datos?")) { localStorage.clear(); window.location.reload(); } }} className="w-full bg-red-50 text-red-600 font-bold py-2 rounded-xl text-sm hover:bg-red-100 transition">🗑 Reiniciar</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddHabit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowAddHabit(false)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-md space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-xl text-gray-800">Nuevo habito</h3>
            <div>
              <label className="text-sm font-medium text-gray-600">Tipo</label>
              <div className="flex gap-2 mt-1">
                <button onClick={() => { setNewHabitType("build"); setNewHabitXp(20); }} className={"flex-1 py-3 rounded-xl font-bold text-sm transition " + (newHabitType === "build" ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>🟢 Construir (+XP)</button>
                <button onClick={() => { setNewHabitType("avoid"); setNewHabitXp(20); }} className={"flex-1 py-3 rounded-xl font-bold text-sm transition " + (newHabitType === "avoid" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500")}>🔴 Evitar (-XP)</button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Emoji</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {newHabitType === "avoid"
                  ? ["🍔", "📱", "🛋️", "🚬", "🍺", "🍿", "🎮", "😴", "💸", "🤬"].map((e) => (
                    <button key={e} onClick={() => setNewHabitEmoji(e)} className={"text-2xl p-1.5 rounded-lg transition " + (newHabitEmoji === e ? "bg-red-100 ring-2 ring-red-400" : "hover:bg-gray-100")}>{e}</button>
                  ))
                  : ["🏃", "📖", "🧘", "💧", "🎵", "✍️", "🥗", "💤", "💊", "🧹", "🎯", "💪", "🎨", "🌿", "📱", "✨"].map((e) => (
                    <button key={e} onClick={() => setNewHabitEmoji(e)} className={"text-2xl p-1.5 rounded-lg transition " + (newHabitEmoji === e ? "bg-[#58CC02]/20 ring-2 ring-[#58CC02]" : "hover:bg-gray-100")}>{e}</button>
                  ))
                }
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Nombre</label>
              <input value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} placeholder={newHabitType === "avoid" ? "Ej: Comer chatarra" : "Ej: Correr 30 min"} className="w-full mt-1 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#58CC02]" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Frecuencia</label>
              <div className="flex gap-2 mt-1">
                <button onClick={() => setNewHabitFreq("daily")} className={"flex-1 py-2.5 rounded-xl font-bold text-sm transition " + (newHabitFreq === "daily" ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>📅 Diario</button>
                <button onClick={() => setNewHabitFreq("weekly")} className={"flex-1 py-2.5 rounded-xl font-bold text-sm transition " + (newHabitFreq === "weekly" ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>📆 Semanal</button>
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
              <label className="text-sm font-medium text-gray-600">{newHabitType === "avoid" ? "Penalidad XP (se resta si lo haces)" : "Recompensa XP"}</label>
              <div className="flex gap-2 mt-1">
                {newHabitType === "avoid"
                  ? [10, 20, 25, 30, 50].map((xp) => (
                    <button key={xp} onClick={() => setNewHabitXp(xp)} className={"px-4 py-2 rounded-xl font-bold text-sm transition " + (newHabitXp === xp ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500")}>-{xp}</button>
                  ))
                  : [10, 15, 20, 30, 50].map((xp) => (
                    <button key={xp} onClick={() => setNewHabitXp(xp)} className={"px-4 py-2 rounded-xl font-bold text-sm transition " + (newHabitXp === xp ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>+{xp}</button>
                  ))
                }
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAddHabit(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition">Cancelar</button>
              <button onClick={addHabit} className={"flex-1 py-3 rounded-xl font-bold text-white transition " + (newHabitType === "avoid" ? "bg-red-500 hover:bg-red-600" : "bg-[#58CC02] hover:bg-[#4fb002]")}>
                {newHabitType === "avoid" ? "Crear habito a evitar" : "Crear habito"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
