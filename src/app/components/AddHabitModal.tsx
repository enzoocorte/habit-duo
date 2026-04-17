import { useState } from "react";
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
    onAdd({
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
    });
  };

  const emojiOptions = ["🏃", "📖", "🧘", "💪", "🎸", "✍️", "🥗", "💧", "🛡️", "📱", "🍔", "🚬", "😴", "✨", "🎯", "⭐"];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-md rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto" style={{ background: "#1a1a2e" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Nuevo Habito</h2>
          <button onClick={onClose} className="text-2xl" style={{ color: "#b2bec3" }}>×</button>
        </div>
        <div className="mb-4">
          <label className="text-xs font-bold block mb-1" style={{ color: "#b2bec3" }}>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm text-black" placeholder="Ej: Leer 20 minutos" />
        </div>
        <div className="mb-4">
          <label className="text-xs font-bold block mb-1" style={{ color: "#b2bec3" }}>Emoji</label>
          <div className="flex flex-wrap gap-2">
            {emojiOptions.map((e) => (
              <button key={e} onClick={() => setEmoji(e)} className="w-10 h-10 rounded-lg text-xl flex items-center justify-center" style={{ background: emoji === e ? "#6c5ce7" : "#2d3436" }}>{e}</button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="text-xs font-bold block mb-1" style={{ color: "#b2bec3" }}>Tipo</label>
          <div className="flex gap-2">
            <button onClick={() => setHabitType("build")} className="flex-1 py-2 rounded-lg text-sm font-bold" style={{ background: habitType === "build" ? "#00b894" : "#2d3436", color: "white" }}>Construir</button>
            <button onClick={() => { setHabitType("avoid"); setProgressive(false); }} className="flex-1 py-2 rounded-lg text-sm font-bold" style={{ background: habitType === "avoid" ? "#e17055" : "#2d3436", color: "white" }}>Evitar</button>
          </div>
        </div>
        {habitType === "build" && (
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold" style={{ color: "#b2bec3" }}>Progresivo (cantidad variable)</label>
              <button onClick={() => setProgressive(!progressive)} className="w-12 h-6 rounded-full" style={{ background: progressive ? "#00b894" : "#2d3436" }}>
                <div className="w-5 h-5 rounded-full bg-white" style={{ transform: progressive ? "translateX(26px)" : "translateX(2px)" }} />
              </button>
            </div>
            {progressive && (
              <div className="mt-3 p-3 rounded-lg" style={{ background: "#2d3436" }}>
                <div className="mb-3">
                  <label className="text-xs block mb-1" style={{ color: "#b2bec3" }}>Unidad</label>
                  <input value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full px-2 py-1 rounded text-sm text-black" placeholder="min, km, paginas..." />
                </div>
                <div className="mb-3">
                  <label className="text-xs block mb-1" style={{ color: "#b2bec3" }}>Cantidad minima (barrera)</label>
                  <input type="number" min={1} value={minAmount} onChange={(e) => setMinAmount(Math.max(1, parseInt(e.target.value) || 1))} className="w-full px-2 py-1 rounded text-sm text-black" />
                  <div className="text-[10px] mt-1" style={{ color: "#fdcb6e" }}>La barrera es lo mas dificil: arrancar. Por eso se premia mas.</div>
                </div>
                <div className="mb-3">
                  <label className="text-xs block mb-1" style={{ color: "#b2bec3" }}>Bonus barrera (XP al romperla)</label>
                  <input type="number" min={1} value={barrierBonus} onChange={(e) => setBarrierBonus(Math.max(1, parseInt(e.target.value) || 1))} className="w-full px-2 py-1 rounded text-sm text-black" />
                  <div className="text-[10px] mt-1" style={{ color: "#b2bec3" }}>Al llegar a {minAmount} {unit} → +{barrierBonus} XP. Luego +1 XP/{unit} extra.</div>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="mb-4">
          <label className="text-xs font-bold block mb-1" style={{ color: "#b2bec3" }}>XP maximo {habitType === "avoid" ? "(perder si caes)" : progressive ? "(tope por dia)" : "(al completar)"}</label>
          <input type="number" min={1} value={xpReward} onChange={(e) => setXpReward(Math.max(1, parseInt(e.target.value) || 1))} className="w-full px-3 py-2 rounded-lg text-sm text-black" />
          {progressive && <div className="text-[10px] mt-1" style={{ color: "#b2bec3" }}>Ejemplo: {minAmount} {unit} = {barrierBonus} XP (barrera), luego +1 XP/{unit}. Maximo {xpReward} XP/dia.</div>}
        </div>
        <button onClick={handleSubmit} disabled={!name.trim()} className="w-full py-3 rounded-xl font-bold text-sm" style={{ background: name.trim() ? "#6c5ce7" : "#2d3436", color: name.trim() ? "white" : "#b2bec3" }}>
          Crear Habito
        </button>
      </div>
    </div>
  );
}
