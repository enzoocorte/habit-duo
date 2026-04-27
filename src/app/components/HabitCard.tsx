import { Habit } from "../types";
import { getHabitXp, getHabitStreak, getCompletionRate, getRateColor, getLocalDate } from "../utils";

interface Props {
  habit: Habit;
  onToggle: (id: string) => void;
  onSkip: (id: string) => void;
  onUpdateAmount: (id: string, amount: number) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}

const FREQ_LABELS: Record<string, string> = {
  daily: "Diario",
  "3x": "3x/semana",
  "2x": "2x/semana",
  "1x": "1x/semana",
};

export default function HabitCard({ habit, onToggle, onSkip, onUpdateAmount, onDelete, onArchive }: Props) {
  const today = getLocalDate();
  const isCompleted = habit.completions?.includes(today) ?? false;
  const isSkipped = habit.skips?.includes(today) ?? false;
  const amount = habit.amounts?.[today] ?? 0;
  const xp = getHabitXp(habit, today);
  const streak = getHabitStreak(habit);
  const rate = getCompletionRate(habit);
  const rateColor = getRateColor(rate);
  const isBuild = habit.habitType === "build";
  const isProgressive = habit.progressive;
  const minAmount = habit.minAmount ?? 1;
  const barrierBonus = habit.barrierBonus ?? (minAmount * 2);
  const unit = habit.unit || "unidades";
  const reachedMin = isProgressive && amount >= minAmount;
  const quickAmounts = [5, 10, 15, 30];
  const freqLabel = FREQ_LABELS[habit.frequency] || "Diario";
  const isDaily = habit.frequency === "daily";

  // Para avoid: 3 estados
  const avoidFell = !isBuild && isCompleted;      // caí
  const avoidAvoided = !isBuild && isSkipped && !isCompleted;  // lo evité (confirmado)
  const avoidPending = !isBuild && !isCompleted && !isSkipped; // todavía no confirmé

  let bgColor = "#1e2a4a";
  if (isBuild && isProgressive && reachedMin) bgColor = "#1a3a2a";
  else if (isBuild && !isProgressive && isCompleted) bgColor = "#1a3a2a";
  else if (avoidAvoided) bgColor = "#1a3a2a";
  else if (avoidFell) bgColor = "#3a1a1a";
  else if (isSkipped && isBuild) bgColor = "#2d2d3a";

  return (
    <div className="habit-card rounded-xl p-4 mb-3" style={{ background: bgColor, border: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{habit.emoji}</span>
          <div>
            <div className="font-semibold text-sm">{habit.name}</div>
            <div className="text-xs" style={{ color: "#b2bec3" }}>
              {isBuild ? "Construir" : "Evitar"} · {habit.xpReward} XP · <span style={{ color: isDaily ? "#b2bec3" : "#fdcb6e" }}>{freqLabel}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {streak > 1 && <span className="text-xs" style={{ color: "#fdcb6e" }}>🔥{streak}</span>}
          <span className="text-sm font-bold" style={{ color: xp > 0 ? "#00b894" : xp < 0 ? "#e17055" : "#b2bec3" }}>
            {xp > 0 ? `+${xp}` : xp < 0 ? `${xp}` : "0"} XP
          </span>
        </div>
      </div>

      {!isDaily && (
        <div className="text-xs mb-2 px-1" style={{ color: "#fdcb6e" }}>
          No cuenta para la meta diaria automatica
        </div>
      )}

      <div className="w-full h-1.5 rounded-full mb-2" style={{ background: "#2d3436" }}>
        <div className="h-full rounded-full" style={{ width: `${rate * 100}%`, background: rateColor }} />
      </div>

      {/* ====== HÁBITO DE EVITAR - 3 ESTADOS ====== */}
      {!isBuild && (
        <div>
          {avoidPending && (
            <div>
              <button
                onClick={() => onSkip(habit.id)}
                className="w-full py-2.5 rounded-lg font-bold text-sm mb-2"
                style={{ background: "#00b894", color: "white" }}
              >
                🛡 Lo evité (+{habit.xpReward} XP)
              </button>
              <button
                onClick={() => onToggle(habit.id)}
                className="w-full py-2.5 rounded-lg font-bold text-sm"
                style={{ background: "#2d3436", color: "#e17055", border: "1px solid #e17055" }}
              >
                😔 Caí (-{habit.xpReward} XP)
              </button>
            </div>
          )}
          {avoidAvoided && (
            <div>
              <div className="w-full py-2.5 rounded-lg font-bold text-sm text-center mb-2" style={{ background: "#00b894", color: "white" }}>
                ✅ Evitado (+{habit.xpReward} XP)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onSkip(habit.id)}
                  className="flex-1 py-2 rounded-lg text-xs"
                  style={{ background: "#2d3436", color: "#b2bec3" }}
                >
                  Deshacer
                </button>
                <button
                  onClick={() => onToggle(habit.id)}
                  className="flex-1 py-2 rounded-lg text-xs"
                  style={{ background: "#3a1a1a", color: "#e17055" }}
                >
                  En realidad caí
                </button>
              </div>
            </div>
          )}
          {avoidFell && (
            <div>
              <div className="w-full py-2.5 rounded-lg font-bold text-sm text-center mb-2" style={{ background: "#e17055", color: "white" }}>
                😔 Caíste (-{habit.xpReward} XP)
              </div>
              <button
                onClick={() => onToggle(habit.id)}
                className="w-full py-2 rounded-lg text-xs"
                style={{ background: "#2d3436", color: "#b2bec3" }}
              >
                Deshacer
              </button>
            </div>
          )}
        </div>
      )}

      {/* ====== HÁBITO PROGRESIVO DE CONSTRUIR ====== */}
      {isBuild && isProgressive && (
        <div>
          <div className="text-xs mb-2 px-1" style={{ color: "#b2bec3" }}>
            <span style={{ color: "#fdcb6e" }}>⚡ Bonus barrera:</span>{" "}
            {minAmount} {unit} = {barrierBonus} XP, luego +1 XP/{unit}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg font-bold" style={{ color: reachedMin ? "#00b894" : "#e17055" }}>{amount}</span>
            <span className="text-xs" style={{ color: "#b2bec3" }}>/ {minAmount} {unit} minimo</span>
            {reachedMin && <span className="text-xs">✅</span>}
            {!reachedMin && amount > 0 && (
              <span className="text-xs" style={{ color: "#fdcb6e" }}>Faltan {minAmount - amount} {unit}</span>
            )}
          </div>
          <div className="flex gap-2 mb-2">
            {quickAmounts.map((qa) => (
              <button
                key={qa}
                onClick={() => onUpdateAmount(habit.id, amount + qa)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: reachedMin ? "#00b894" : "#6c5ce7", color: "white" }}
              >
                +{qa} {unit}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => onUpdateAmount(habit.id, Math.max(0, parseInt(e.target.value) || 0))}
              className="w-20 px-2 py-1 rounded text-sm text-black"
            />
            <span className="text-xs" style={{ color: "#b2bec3" }}>{unit}</span>
            {amount > 0 && (
              <button onClick={() => onUpdateAmount(habit.id, 0)} className="text-xs px-2 py-1 rounded" style={{ background: "#e17055", color: "white" }}>Reset</button>
            )}
          </div>
          {amount > 0 && (
            <div className="text-xs px-1" style={{ color: "#b2bec3" }}>
              {reachedMin ? (
                <>
                  Barrera ({minAmount} {unit}): <span style={{ color: "#00b894" }}>+{barrierBonus} XP</span>
                  {amount > minAmount && (
                    <> · Extra ({amount - minAmount} {unit}): <span style={{ color: "#74b9ff" }}>+{amount - minAmount} XP</span></>
                  )}
                  <> · Total: <span style={{ color: "#fdcb6e" }}>{xp} XP</span></>
                </>
              ) : (
                <>Aun no rompiste la barrera ({amount}/{minAmount} {unit}). Faltan {minAmount - amount} {unit} para {barrierBonus} XP!</>
              )}
            </div>
          )}
        </div>
      )}

      {/* ====== HÁBITO SIMPLE DE CONSTRUIR ====== */}
      {isBuild && !isProgressive && (
        <button
          onClick={() => onToggle(habit.id)}
          className="w-full py-2.5 rounded-lg font-bold text-sm"
          style={{ background: isCompleted ? "#00b894" : "#6c5ce7", color: "white" }}
        >
          {isCompleted ? "✓ Completado" : `Completar (+${habit.xpReward} XP)`}
        </button>
      )}

      {/* Acciones */}
      <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex gap-2">
          {!isSkipped && !isCompleted && isBuild && !isProgressive && (
            <button onClick={() => onSkip(habit.id)} className="text-xs px-2 py-1 rounded" style={{ background: "#2d3436", color: "#b2bec3" }}>Saltar</button>
          )}
          {!isSkipped && !reachedMin && isBuild && isProgressive && (
            <button onClick={() => onSkip(habit.id)} className="text-xs px-2 py-1 rounded" style={{ background: "#2d3436", color: "#b2bec3" }}>Saltar</button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => onArchive(habit.id)} className="text-xs px-2 py-1 rounded" style={{ background: "#2d3436", color: "#b2bec3" }}>Archivar</button>
          <button onClick={() => { if (confirm("Eliminar este habito?")) onDelete(habit.id); }} className="text-xs px-2 py-1 rounded" style={{ background: "#2d3436", color: "#e17055" }}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}
