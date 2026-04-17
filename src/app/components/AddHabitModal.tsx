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
