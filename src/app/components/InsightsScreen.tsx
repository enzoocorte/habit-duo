import { useState } from "react";
import { Habit, JournalEntry, AppSettings, Achievement } from "../types";
import { getWeekDates, getDayXp, getHabitStreak, getCompletionRate, getRateColor, getRateLabel, getLocalDate, getXpLevel, getTotalXp, getOverallStreak, ACHIEVEMENT_DEFS } from "../utils";

interface Props {
  habits: Habit[];
  settings: AppSettings;
  journalEntries: Record<string, JournalEntry>;
  achievements: Achievement[];
}

export default function InsightsScreen({ habits, settings, journalEntries, achievements }: Props) {
  const [tab, setTab] = useState<"overview" | "strategy" | "achievements">("overview");
  const today = getLocalDate();
  const dates = getWeekDates();
  const activeHabits = habits.filter((h) => !h.archived);
  const totalXp = getTotalXp(habits, journalEntries);
  const { level, name, emoji } = getXpLevel(totalXp);
  const streak = getOverallStreak(habits, settings);

  return (
    <div className="px-4 pb-20">
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: "#16213e" }}>
        {(["overview", "strategy", "achievements"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-xs font-bold"
            style={{ background: tab === t ? "#6c5ce7" : "transparent", color: tab === t ? "white" : "#b2bec3" }}
          >
            {t === "overview" ? "Resumen" : t === "strategy" ? "Estrategia" : "Logros"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          <div className="rounded-xl p-4 mb-4" style={{ background: "#1e2a4a" }}>
            <h3 className="text-sm font-bold mb-3">XP Semanal</h3>
            <div className="flex items-end gap-2" style={{ height: 120 }}>
              {dates.map((d) => {
                const dayXp = getDayXp(habits, d, journalEntries[d]);
                const maxDayXp = Math.max(...dates.map((dd) => getDayXp(habits, dd, journalEntries[dd])), 1);
                const h = Math.max((dayXp / maxDayXp) * 100, 4);
                const isToday = d === today;
                const dayName = new Date(d + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short" });
                return (
                  <div key={d} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px]" style={{ color: "#b2bec3" }}>{dayXp}</span>
                    <div className="w-full rounded-t" style={{ height: `${h}%`, background: isToday ? "#6c5ce7" : dayXp > 0 ? "#00b894" : "#2d3436" }} />
                    <span className="text-[10px]" style={{ color: isToday ? "#6c5ce7" : "#b2bec3", fontWeight: isToday ? "bold" : "normal" }}>{dayName}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl p-3" style={{ background: "#1e2a4a" }}>
              <div className="text-xs" style={{ color: "#b2bec3" }}>XP Total</div>
              <div className="text-xl font-bold" style={{ color: "#6c5ce7" }}>{totalXp.toLocaleString()}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: "#1e2a4a" }}>
              <div className="text-xs" style={{ color: "#b2bec3" }}>Nivel</div>
              <div className="text-xl font-bold" style={{ color: "#fdcb6e" }}>{emoji} {level}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: "#1e2a4a" }}>
              <div className="text-xs" style={{ color: "#b2bec3" }}>Racha</div>
              <div className="text-xl font-bold" style={{ color: "#fdcb6e" }}>🔥 {streak}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: "#1e2a4a" }}>
              <div className="text-xs" style={{ color: "#b2bec3" }}>Habitos Activos</div>
              <div className="text-xl font-bold">{activeHabits.length}</div>
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: "#1e2a4a" }}>
            <h3 className="text-sm font-bold mb-3">Por Habito</h3>
            {activeHabits.map((h) => {
              const rate = getCompletionRate(h);
              const hStreak = getHabitStreak(h);
              return (
                <div key={h.id} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-2"><span>{h.emoji}</span><span className="text-sm">{h.name}</span></div>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-1.5 rounded-full" style={{ background: "#2d3436" }}>
                      <div className="h-full rounded-full" style={{ width: `${rate * 100}%`, background: getRateColor(rate) }} />
                    </div>
                    <span className="text-xs" style={{ color: "#b2bec3" }}>{Math.round(rate * 100)}%</span>
                    {hStreak > 1 && <span className="text-xs" style={{ color: "#fdcb6e" }}>🔥{hStreak}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "strategy" && (
        <div>
          <div className="rounded-xl p-4 mb-4" style={{ background: "#1e2a4a" }}>
            <h3 className="text-sm font-bold mb-3">Consejos Personalizados</h3>
            {(() => {
              const tips: string[] = [];
              if (activeHabits.length === 0) return <p className="text-sm" style={{ color: "#b2bec3" }}>Agrega habitos para ver consejos.</p>;
              const easiest = activeHabits.reduce((best, h) => getCompletionRate(h) > getCompletionRate(best) ? h : best, activeHabits[0]);
              const hardest = activeHabits.reduce((worst, h) => getCompletionRate(h) < getCompletionRate(worst) ? h : worst, activeHabits[0]);
              if (hardest) tips.push(`${hardest.emoji} ${hardest.name} es tu habito mas dificil (${Math.round(getCompletionRate(hardest) * 100)}%). Intenta reducir la barrera de inicio.`);
              if (easiest) tips.push(`${easiest.emoji} ${easiest.name} es tu habito mas fuerte (${Math.round(getCompletionRate(easiest) * 100)}%). Segui asi!`);
              if (streak < 3) tips.push("Hace el habito mas facil primero. La clave es arrancar, no la cantidad.");
              if (streak >= 7) tips.push("Ya pasaste la primera semana. Tu cerebro esta creando autopista.");
              if (streak >= 30) tips.push("Un mes completo. Este habito ya es parte de tu identidad.");
              return tips.map((tip, i) => <p key={i} className="text-sm mb-2" style={{ color: "#dfe6e9" }}>{tip}</p>);
            })()}
          </div>
          <div className="rounded-xl p-4 mb-4" style={{ background: "#1e2a4a" }}>
            <h3 className="text-sm font-bold mb-3">Ranking de Consistencia</h3>
            {[...activeHabits].sort((a, b) => getCompletionRate(b) - getCompletionRate(a)).map((h, i) => {
              const rate = getCompletionRate(h);
              return (
                <div key={h.id} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: i === 0 ? "#fdcb6e" : "#b2bec3" }}>#{i + 1}</span>
                    <span>{h.emoji}</span>
                    <span className="text-sm">{h.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: getRateColor(rate) }}>{getRateLabel(rate)}</span>
                    <span className="text-xs font-bold" style={{ color: getRateColor(rate) }}>{Math.round(rate * 100)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "achievements" && (
        <div>
          <div className="text-center mb-4">
            <div className="text-3xl mb-1">{emoji}</div>
            <div className="text-sm font-bold" style={{ color: "#6c5ce7" }}>
              {achievements.filter(a => a.unlockedAt).length}/{ACHIEVEMENT_DEFS.length} Desbloqueados
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {ACHIEVEMENT_DEFS.map((def) => {
              const unlocked = achievements.find(a => a.id === def.id)?.unlockedAt;
              return (
                <div key={def.id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: unlocked ? "#1a3a2a" : "#1e2a4a", opacity: unlocked ? 1 : 0.5, border: unlocked ? "1px solid rgba(0,184,148,0.3)" : "1px solid rgba(255,255,255,0.05)" }}>
                  <span className="text-2xl">{unlocked ? def.emoji : "🔒"}</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{def.name}</div>
                    <div className="text-xs" style={{ color: "#b2bec3" }}>{def.description}</div>
                  </div>
                  {unlocked && <span className="text-xs" style={{ color: "#00b894" }}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
