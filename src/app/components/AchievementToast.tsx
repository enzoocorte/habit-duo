import { useEffect, useState } from "react";
import { Achievement } from "../types";

interface Props {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export default function AchievementToast({ achievement, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onDismiss]);

  if (!achievement) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 transition-all duration-300" style={{ transform: visible ? "translateY(0)" : "translateY(-100px)", opacity: visible ? 1 : 0 }}>
      <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #6c5ce7, #a29bfe)", boxShadow: "0 4px 20px rgba(108,92,231,0.5)" }}>
        <span className="text-4xl achievement-pop">{achievement.emoji}</span>
        <div className="flex-1">
          <div className="text-xs font-bold" style={{ color: "#fdcb6e" }}>LOGRO DESBLOQUEADO!</div>
          <div className="text-sm font-bold text-white">{achievement.name}</div>
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>{achievement.description}</div>
        </div>
        <button onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }} className="text-white text-lg">×</button>
      </div>
    </div>
  );
}
