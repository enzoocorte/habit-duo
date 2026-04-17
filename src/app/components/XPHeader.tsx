import { Habit, JournalEntry, AppSettings } from "../types";
import { getDayXp, getBarColor, getOverallStreak, getXpLevel, getTotalXp, getLocalDate } from "../utils";

interface Props {
  habits: Habit[];
  settings: AppSettings;
  journal: JournalEntry | null;
  effectiveGoal: number;
  streak: number;
  journalEntries: Record<string, JournalEntry>;
}

export default function XPHeader({ habits, settings, journal, effectiveGoal, streak, journalEntries }: Props) {
  const today = getLocalDate();
  const todayXp = getDayXp(habits, today, journal || undefined);
  const pct = effectiveGoal > 0 ? Math.min((todayXp / effectiveGoal) * 100, 100) : 0;
  const barColor = getBarColor(pct);
  const totalXp = getTotalXp(habits, journalEntries);
  const { level, name, emoji, progress: levelProgress } = getXpLevel(totalXp);
  const xpInLevel = totalXp % 500;

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <div>
            <div className="text-sm font-bold" style={{ color: "#6c5ce7" }}>
              Nivel {level} — {name}
            </div>
            <div className="text-xs" style={{ color: "#b2bec3" }}>
              {xpInLevel}/500 XP al siguiente nivel
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: "#b2bec3" }}>XP Total</div>
          <div className="text-lg font-bold" style={{ color: "#6c5ce7" }}>{totalXp.toLocaleString()}</div>
        </div>
      </div>
      <div className="w-full h-1.5 rounded-full mb-3" style={{ background: "#2d3436" }}>
        <div
          className="h-full rounded-full xp-bar-fill"
          style={{ width: `${levelProgress * 100}%`, background: "linear-gradient(90deg, #6c5ce7, #a29bfe)" }}
        />
      </div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold">Hoy: {todayXp} XP</span>
        <span className="text-xs" style={{ color: "#b2bec3" }}>Meta: {effectiveGoal} XP</span>
      </div>
      <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "#2d3436" }}>
        <div
          className="h-full rounded-full xp-bar-fill relative"
          style={{ width: `${pct}%`, background: barColor }}
        >
          {pct >= 100 && (
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-black">✓</span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-center gap-1 mt-2">
        <span className="text-lg">🔥</span>
        <span className="text-sm font-bold" style={{ color: "#fdcb6e" }}>
          {streak} {streak === 1 ? "dia" : "dias"} de racha
        </span>
      </div>
    </div>
  );
}
