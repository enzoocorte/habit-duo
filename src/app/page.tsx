"use client";
import { useState, useEffect, useCallback } from "react";

interface Habit {
  id: string;
  name: string;
  emoji: string;
  frequency: "daily" | "weekly";
  weeklyGoal?: number;
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

function getStreak(habit: Habit): number {
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

const defaultHabits: Habit[] = [
  { id: "1", name: "Ejercicio", emoji: "🏃", frequency: "daily", createdAt: getTodayStr(), completions: [], skips: [], archived: false },
  { id: "2", name: "Leer", emoji: "📖", frequency: "daily", createdAt: getTodayStr(), completions: [], skips: [], archived: false },
  { id: "3", name: "Meditar", emoji: "🧘", frequency: "weekly", weeklyGoal: 3, createdAt: getTodayStr(), completions: [], skips: [], archived: false },
];

const defaultSettings: AppSettings = { notificationsEnabled: false, nudgeIntervalHours: 3 };
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
  const [todayMood, setTodayMood] = useState(0);
  const [todayNote, setTodayNote] = useState("");
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("habitduo-habits");
    if (saved) setHabits(JSON.parse(saved));
    else setHabits(defaultHabits);
    const savedJournal = localStorage.getItem("habitduo-journal");
    if (savedJournal) setJournal(JSON.parse(savedJournal));
    const savedSettings = localStorage.getItem("habitduo-settings");
    if (savedSettings) setSettings(JSON.parse(savedSettings));
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
      const today = getTodayStr();
      const incomplete = habits.filter((h) => {
        if (h.archived) return false;
        if (h.frequency === "daily") return !h.completions.includes(today);
        return !isWeekComplete(h);
      });
      if (incomplete.length > 0) {
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "SHOW_NOTIFICATION",
            title: "HabitDuo",
            body: "Tienes " + incomplete.length + " habito" + (incomplete.length > 1 ? "s" : "") + " pendiente" + (incomplete.length > 1 ? "s" : "") + "!",
          });
        } else if ("Notification" in window && Notification.permission === "granted") {
          new Notification("HabitDuo", {
            body: "Tienes " + incomplete.length + " habito" + (incomplete.length > 1 ? "s" : "") + " pendiente" + (incomplete.length > 1 ? "s" : "") + "!",
            icon: "/habit-duo/icons/icon-192.png",
          });
        }
      }
    }, interval);
    (window as any).__nudgeTimer = timer;
  }, [settings.notificationsEnabled, settings.nudgeIntervalHours, habits]);

  useEffect(() => {
    scheduleNudge();
    return () => {
      const timer = (window as any).__nudgeTimer;
      if (timer) clearInterval(timer);
    };
  }, [scheduleNudge]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SHOW_NOTIFICATION") {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(event.data.title, {
              body: event.data.body,
              icon: "/habit-duo/icons/icon-192.png",
              badge: "/habit-duo/icons/icon-192.png",
              vibrate: [100, 50, 100],
            });
          });
        }
      });
    }
  }, []);

  const toggleComplete = (id: string) => {
    const today = getTodayStr();
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        if (h.completions.includes(today)) {
          return { ...h, completions: h.completions.filter((c) => c !== today) };
        }
        return { ...h, completions: [...h.completions, today] };
      })
    );
  };

  const skipHabit = (id: string) => {
    const today = getTodayStr();
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        return { ...h, skips: [...h.skips, today] };
      })
    );
  };

  const addHabit = () => {
    if (!newHabitName.trim()) return;
    const newHabit: Habit = {
      id: Date.now().toString(),
      name: newHabitName.trim(),
      emoji: newHabitEmoji,
      frequency: newHabitFreq,
      weeklyGoal: newHabitFreq === "weekly" ? newHabitWeeklyGoal : undefined,
      createdAt: getTodayStr(),
      completions: [],
      skips: [],
      archived: false,
    };
    setHabits((prev) => [...prev, newHabit]);
    setNewHabitName("");
    setNewHabitEmoji("✨");
    setNewHabitFreq("daily");
    setNewHabitWeeklyGoal(3);
    setShowAddHabit(false);
  };

  const deleteHabit = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  const archiveHabit = (id: string) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, archived: !h.archived } : h))
    );
  };

  const toggleNotifications = async () => {
    if (settings.notificationsEnabled) {
      setSettings((prev) => ({ ...prev, notificationsEnabled: false }));
    } else {
      const granted = await requestNotifications();
      if (granted) {
        setSettings((prev) => ({ ...prev, notificationsEnabled: true }));
      }
    }
  };

  const exportData = () => {
    const data = { habits, journal, settings, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "habitduo-backup-" + getTodayStr() + ".json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.habits) setHabits(data.habits);
          if (data.journal) setJournal(data.journal);
          if (data.settings) setSettings(data.settings);
          alert("Datos importados correctamente");
        } catch {
          alert("Error al importar datos");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const saveJournalEntry = () => {
    if (todayMood === 0) return;
    const today = getTodayStr();
    setJournal((prev) => {
      const filtered = prev.filter((e) => e.date !== today);
      return [...filtered, { date: today, mood: todayMood, note: todayNote }];
    });
  };

  const today = getTodayStr();
  const activeHabits = habits.filter((h) => !h.archived);
  const todayCompleted = activeHabits.filter((h) => {
    if (h.frequency === "daily") return h.completions.includes(today);
    return isWeekComplete(h);
  }).length;
  const totalActive = activeHabits.length;
  const progressPct = totalActive > 0 ? Math.round((todayCompleted / totalActive) * 100) : 0;
  const weekDates = getWeekDates();
  const weekData = weekDates.map((date) => ({
    date,
    count: activeHabits.filter((h) => h.completions.includes(date)).length,
  }));
  const longestStreak = Math.max(0, ...activeHabits.map(getStreak));
  const totalCompletions = habits.reduce((acc, h) => acc + h.completions.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#58CC02] to-[#46a302] pb-20">
      <div className="bg-[#58CC02] px-4 pt-4 pb-8 text-white">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-black tracking-tight">🔥 HabitDuo</h1>
            <button onClick={() => setScreen("settings")} className="bg-white/20 rounded-xl px-3 py-1.5 text-sm font-bold hover:bg-white/30 transition">⚙️</button>
          </div>
          <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg">Hoy</span>
              <span className="font-black text-2xl">{progressPct}%</span>
            </div>
            <div className="h-4 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-300 rounded-full transition-all duration-500" style={{ width: progressPct + "%" }} />
            </div>
            <p className="text-sm mt-2 opacity-90">{todayCompleted}/{totalActive} hábitos completados</p>
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
            {activeHabits.map((habit) => {
              const streak = getStreak(habit);
              const isCompleted = habit.frequency === "daily" ? habit.completions.includes(today) : isWeekComplete(habit);
              const isSkipped = habit.skips.includes(today);
              const weekComps = habit.frequency === "weekly" ? habit.completions.filter((c) => weekDates.includes(c)).length : 0;
              return (
                <div key={habit.id} className={"bg-white rounded-2xl shadow-md p-4 transition-all " + (isCompleted ? "ring-2 ring-[#58CC02] " : "") + (isSkipped ? "opacity-60" : "")}>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleComplete(habit.id)} className={"w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black transition-all " + (isCompleted ? "bg-[#58CC02] text-white shadow-lg shadow-green-200 scale-105" : "bg-gray-100 text-gray-400 hover:bg-gray-200")}>
                      {isCompleted ? "✓" : habit.emoji}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={"font-bold " + (isCompleted ? "line-through text-gray-400" : "text-gray-800")}>{habit.name}</span>
                        <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5 font-medium text-gray-500">{habit.frequency === "daily" ? "Diario" : "Semanal"}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {streak > 0 && <span className="text-sm font-bold text-orange-500">🔥 {streak} día{streak > 1 ? "s" : ""}</span>}
                        {habit.frequency === "weekly" && <span className="text-xs text-gray-400">{weekComps}/{habit.weeklyGoal || 3} esta semana</span>}
                        {isSkipped && <span className="text-xs text-amber-500 font-medium">⏭ Saltado</span>}
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
            <button onClick={() => setShowAddHabit(true)} className="w-full bg-white border-2 border-dashed border-[#58CC02] rounded-2xl p-4 text-[#58CC02] font-bold hover:bg-green-50 transition">+ Agregar hábito</button>
          </div>
        )}

        {screen === "insights" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl shadow-md p-4 text-center"><div className="text-3xl font-black text-[#58CC02]">{longestStreak}</div><div className="text-xs text-gray-500 font-medium">Racha más larga 🔥</div></div>
              <div className="bg-white rounded-2xl shadow-md p-4 text-center"><div className="text-3xl font-black text-blue-500">{totalCompletions}</div><div className="text-xs text-gray-500 font-medium">Completados totales ✅</div></div>
              <div className="bg-white rounded-2xl shadow-md p-4 text-center"><div className="text-3xl font-black text-purple-500">{activeHabits.length}</div><div className="text-xs text-gray-500 font-medium">Hábitos activos 💪</div></div>
              <div className="bg-white rounded-2xl shadow-md p-4 text-center"><div className="text-3xl font-black text-orange-500">{journal.length}</div><div className="text-xs text-gray-500 font-medium">Entradas de diario 📝</div></div>
            </div>
            <div className="bg-white rounded-2xl shadow-md p-4">
              <h3 className="font-bold text-gray-800 mb-3">📊 Semana</h3>
              <div className="flex justify-between items-end h-24">
                {weekData.map((d, i) => {
                  const dayName = new Date(d.date + "T12:00:00").toLocaleDateString("es", { weekday: "short" });
                  const maxH = Math.max(...weekData.map((w) => w.count), 1);
                  const h = Math.max((d.count / maxH) * 100, 4);
                  const isToday = d.date === today;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1">
                      <div className={"w-6 rounded-lg transition-all " + (isToday ? "bg-[#58CC02]" : "bg-gray-200")} style={{ height: h + "%" }} />
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
                  <span className="text-sm">{h.emoji} {h.name}</span>
                  <span className="font-bold text-orange-500">{getStreak(h)} días</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {screen === "journal" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-md p-4">
              <h3 className="font-bold text-gray-800 mb-3">¿Cómo te sentís hoy?</h3>
              <div className="flex justify-between mb-3">
                {moodEmojis.map((emoji, i) => (
                  <button key={i} onClick={() => setTodayMood(i + 1)} className={"text-3xl transition-all " + (todayMood === i + 1 ? "scale-125 drop-shadow-lg" : "opacity-40 hover:opacity-70")}>{emoji}</button>
                ))}
              </div>
              {todayMood > 0 && <p className="text-center text-sm text-gray-500 mb-3">{moodLabels[todayMood - 1]}</p>}
              <textarea value={todayNote} onChange={(e) => setTodayNote(e.target.value)} placeholder="Escribí algo sobre tu día..." className="w-full bg-gray-50 rounded-xl p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-[#58CC02]" />
              <button onClick={saveJournalEntry} disabled={todayMood === 0} className="mt-3 w-full bg-[#58CC02] text-white font-bold py-2.5 rounded-xl disabled:opacity-40 hover:bg-[#4fb002] transition">Guardar entrada</button>
            </div>
            <div className="space-y-2">
              {journal.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).map((entry) => (
                <div key={entry.date} className="bg-white rounded-2xl shadow-md p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{moodEmojis[entry.mood - 1]}</span>
                    <span className="font-bold text-gray-700">{entry.date}</span>
                  </div>
                  {entry.note && <p className="text-sm text-gray-500 ml-9">{entry.note}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {screen === "settings" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-md p-4">
              <h3 className="font-bold text-gray-800 mb-4">⚙️ Configuración</h3>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <div className="font-medium text-gray-800">🔔 Notificaciones</div>
                  <div className="text-xs text-gray-400">Recibir recordatorios para tus hábitos</div>
                </div>
                <button onClick={toggleNotifications} className={"w-14 h-8 rounded-full transition-all relative " + (settings.notificationsEnabled ? "bg-[#58CC02]" : "bg-gray-300")}>
                  <div className={"w-6 h-6 bg-white rounded-full absolute top-1 transition-all shadow " + (settings.notificationsEnabled ? "left-7" : "left-1")} />
                </button>
              </div>
              <div className="py-3 border-b border-gray-100">
                <div className="font-medium text-gray-800 mb-1">⏰ Intervalo de recordatorio</div>
                <div className="text-xs text-gray-400 mb-2">Cada cuánto recibir notificaciones</div>
                <div className="flex gap-2">
                  {[1, 2, 3, 6, 12].map((h) => (
                    <button key={h} onClick={() => setSettings((prev) => ({ ...prev, nudgeIntervalHours: h }))} className={"px-3 py-1.5 rounded-lg text-sm font-bold transition " + (settings.nudgeIntervalHours === h ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>{h}h</button>
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
                <button onClick={() => { if (confirm("¿Borrar todos los datos? Esta acción no se puede deshacer.")) { localStorage.clear(); window.location.reload(); } }} className="w-full bg-red-50 text-red-600 font-bold py-2 rounded-xl text-sm hover:bg-red-100 transition">🗑 Reiniciar datos</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddHabit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowAddHabit(false)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-xl text-gray-800">Nuevo hábito</h3>
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
            <div className="flex gap-3">
              <button onClick={() => setShowAddHabit(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition">Cancelar</button>
              <button onClick={addHabit} className="flex-1 py-3 rounded-xl font-bold text-white bg-[#58CC02] hover:bg-[#4fb002] transition">Crear hábito</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
