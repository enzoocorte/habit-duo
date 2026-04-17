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
