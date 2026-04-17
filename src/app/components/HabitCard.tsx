"use client";
import { useState } from "react";
import { Habit } from "../types";
import { getLocalDate, getWeekDates, getHabitStreak, isWeekComplete, getHabitXp, getBarrierBonus, calcProgressiveXp } from "../utils";

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

  // Progressive build habit WITH BARRIER BONUS
  if (isProgressive && !isAvoid) {
    const minAmt = habit.minAmount ?? 5;
    const barrier = getBarrierBonus(habit);
    const currentXp = calcProgressiveXp(habit, amount);
    const reached = amount >= minAmt;
    const started = amount > 0 && amount < minAmt;
    const progressPct = Math.min(100, (currentXp / habit.xpReward) * 100);
    const barrierPct = Math.min(100, (barrier / habit.xpReward) * 100);

    return (
      <div className={"bg-white rounded-2xl shadow-md p-4 transition-all " + (reached ? "ring-2 ring-[#58CC02]" : started ? "ring-2 ring-amber-400" : "")}>
        <div className="flex items-center gap-3">
          <div className={"w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black transition-all " + (reached ? "bg-[#58CC02] text-white shadow-lg shadow-green-200" : started ? "bg-amber-100 text-amber-500" : "bg-gray-100 text-gray-400")}>
            {reached ? "🔥" : started ? "⚡" : habit.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800">{habit.name}</span>
              <span className="text-[10px] bg-green-50 text-green-600 rounded-full px-1.5 py-0.5 font-bold">+{currentXp} XP</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden relative">
                {barrierPct < 100 && (
                  <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10" style={{ left: barrierPct + "%" }} />
                )}
                <div className={"h-full rounded-full transition-all " + (reached ? "bg-[#58CC02]" : started ? "bg-amber-400" : "bg-gray-300")} style={{ width: progressPct + "%" }} />
              </div>
              <span className={"text-xs font-bold " + (reached ? "text-[#58CC02]" : "text-gray-400")}>{currentXp}/{habit.xpReward}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {started && <span className="text-[10px] text-amber-500 font-bold">⚡ Empezaste! +{currentXp} XP</span>}
              {reached && <span className="text-[10px] text-[#58CC02] font-bold">🔥 Barrera rota! +{barrier} XP</span>}
              {reached && amount > minAmt && <span className="text-[10px] text-blue-500">+{currentXp - barrier} extra</span>}
              {!started && !reached && <span className="text-[10px] text-gray-400">{amount} {habit.unit || "min"}</span>}
              {streak > 0 && <span className="text-xs font-bold text-orange-500">🔥 {streak}</span>}
              {habit.frequency === "weekly" && <span className="text-[10px] text-gray-400">{weekComps}/{habit.weeklyGoal || 3}/sem</span>}
            </div>
          </div>
          <button onClick={() => setEditing(!editing)} className="text-gray-300 hover:text-gray-500 transition p-1">⋮</button>
        </div>
        <div className="mt-2 bg-gray-50 rounded-xl px-3 py-1.5 flex items-center justify-between">
          <span className="text-[10px] text-gray-500">🔥 Barrera: {minAmt} {habit.unit || "min"} = +{barrier} XP</span>
          <span className="text-[10px] text-gray-400">Despues: 1 {habit.unit || "min"} = 1 XP</span>
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
          <button onClick={() => onUpdateAmount(habit.id, today, 0)} className="bg-green-50 hover:bg-green-100 rounded-lg px-3 py-1.5 text-xs font-bold text-green-600 transition">No lo hice ✓</button>
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
    const completed = didIt || weekDone;
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
