"use client";
import { useEffect, useState } from "react";

interface ProgressHeaderProps {
  todayXp: number;
  effectiveGoal: number;
  overallStreak: number;
  xpLevel: { name: string; emoji: string };
}

export default function ProgressHeader({ todayXp, effectiveGoal, overallStreak, xpLevel }: ProgressHeaderProps) {
  const [showCelebration, setShowCelebration] = useState(false);
  const percentage = effectiveGoal > 0 ? Math.min(100, Math.round((todayXp / effectiveGoal) * 100)) : 0;

  useEffect(() => {
    if (todayXp >= effectiveGoal) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [todayXp, effectiveGoal]);

  return (
    <>
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-3xl shadow-2xl p-10 text-center animate-bounce">
            <div className="text-7xl mb-4">🔥</div>
            <div className="text-3xl font-black text-[#58CC02]">¡Día de Racha!</div>
            <div className="text-xl text-gray-600 mt-2">{todayXp} XP conseguidos</div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-[#58CC02] to-[#46A302] px-5 pt-8 pb-10 text-white">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🔥</div>
              <div>
                <div className="font-black text-3xl tracking-tighter">HabitDuo</div>
                <div className="text-xs opacity-75 -mt-1">Tu compañero de hábitos</div>
              </div>
            </div>
            {overallStreak > 0 && (
              <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 font-bold">
                <span className="text-xl">🔥</span>
                <span className="text-2xl">{overallStreak}</span>
              </div>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{xpLevel.emoji}</span>
                <span className="font-bold text-lg">{xpLevel.name}</span>
              </div>
              <div className="text-right">
                <span className="text-4xl font-black">{todayXp}</span>
                <span className="text-sm opacity-75">/{effectiveGoal} XP</span>
              </div>
            </div>

            <div className="h-3 bg-white/20 rounded-2xl overflow-hidden">
              <div 
                className="h-full bg-white rounded-2xl transition-all duration-700 shadow-inner"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
