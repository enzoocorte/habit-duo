"use client";
import { getXpLevel } from "../utils";

interface XPHeaderProps {
  todayXp: number;
  effectiveGoal: number;
  overallStreak: number;
  autoGoal: boolean;
  onSettings: () => void;
}

export default function XPHeader({ todayXp, effectiveGoal, overallStreak, autoGoal, onSettings }: XPHeaderProps) {
  const barPct = effectiveGoal > 0 ? Math.min(100, Math.max(0, (todayXp / effectiveGoal) * 100)) : 0;
  const xpPct = effectiveGoal > 0 ? Math.min(150, Math.round((todayXp / effectiveGoal) * 100)) : 0;
  const level = getXpLevel(todayXp, effectiveGoal);
  const barBg = todayXp < 0 ? "#ef4444" : todayXp >= effectiveGoal * 1.5 ? "linear-gradient(90deg, #58CC02, #FFD700)" : todayXp >= effectiveGoal ? "#FFD700" : "#58CC02";

  return (
    <div className="bg-[#58CC02] px-4 pt-4 pb-8 text-white">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black tracking-tight">🔥 HabitDuo</h1>
          <div className="flex items-center gap-2">
            {overallStreak > 0 && <span className="bg-white/20 rounded-xl px-3 py-1.5 text-sm font-bold">🔥 {overallStreak}</span>}
            <button onClick={onSettings} className="bg-white/20 rounded-xl px-3 py-1.5 text-sm font-bold hover:bg-white/30 transition">⚙️</button>
          </div>
        </div>
        <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-lg">{level.emoji} {level.name}</span>
            <span className="font-black text-2xl">{todayXp} XP</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-5 bg-white/30 rounded-full overflow-hidden relative">
              {todayXp < 0 ? (
                <div className="h-full bg-red-500 rounded-full" style={{ width: Math.min(100, Math.abs(barPct)) + "%" }} />
              ) : (
                <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden" style={{ width: barPct + "%", background: barBg }}>
                  {barPct > 15 && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow">{xpPct}%</span>}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between text-xs opacity-80">
            <span>Meta: {effectiveGoal} XP {autoGoal ? "(auto)" : ""}</span>
            {todayXp >= effectiveGoal * 1.5 && <span className="text-yellow-200 font-bold">⚡ Epico!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
