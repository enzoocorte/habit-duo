import { AppSettings, Habit } from "../types";
import { calcAutoGoal, getMaxPossibleXp } from "../utils";

interface Props {
  settings: AppSettings;
  habits: Habit[];
  onUpdateSettings: (s: AppSettings) => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
}

export default function SettingsScreen({ settings, habits, onUpdateSettings, onExport, onImport, onReset }: Props) {
  const autoGoal = calcAutoGoal(habits);
  const maxXp = getMaxPossibleXp(habits);

  return (
    <div className="px-4 pb-20">
      <div className="rounded-xl p-4 mb-4" style={{ background: "#1e2a4a" }}>
        <h3 className="text-sm font-bold mb-3">Notificaciones</h3>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm">Notificaciones inteligentes</span>
          <button
            onClick={() => onUpdateSettings({ ...settings, notifications: !settings.notifications, smartNotifications: !settings.notifications })}
            className="w-12 h-6 rounded-full"
            style={{ background: settings.notifications ? "#00b894" : "#2d3436" }}
          >
            <div className="w-5 h-5 rounded-full bg-white" style={{ transform: settings.notifications ? "translateX(26px)" : "translateX(2px)" }} />
          </button>
        </div>
        {settings.notifications && (
          <div className="mt-2 p-3 rounded-lg text-xs" style={{ background: "#2d3436", color: "#b2bec3" }}>
            <div className="mb-1">Notificaciones inteligentes:</div>
            <div>· 18:00 — Racha en riesgo</div>
            <div>· 21:00 — Ultimo aviso</div>
            <div>· 17:00 — Habito pendiente</div>
            <div>· Al llegar al goal — Celebracion</div>
          </div>
        )}
      </div>
      <div className="rounded-xl p-4 mb-4" style={{ background: "#1e2a4a" }}>
        <h3 className="text-sm font-bold mb-3">Meta Diaria</h3>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm">Meta automatica (75%)</span>
          <button
            onClick={() => onUpdateSettings({ ...settings, autoGoal: !settings.autoGoal })}
            className="w-12 h-6 rounded-full"
            style={{ background: settings.autoGoal ? "#00b894" : "#2d3436" }}
          >
            <div className="w-5 h-5 rounded-full bg-white" style={{ transform: settings.autoGoal ? "translateX(26px)" : "translateX(2px)" }} />
          </button>
        </div>
        {!settings.autoGoal && (
          <input
            type="number"
            value={settings.dailyGoal}
            onChange={(e) => onUpdateSettings({ ...settings, dailyGoal: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-full px-3 py-2 rounded-lg text-sm text-black mt-2"
          />
        )}
        <div className="text-xs mt-2" style={{ color: "#b2bec3" }}>Auto: {autoGoal} XP · Maximo: {maxXp} XP</div>
      </div>
      <div className="rounded-xl p-4 mb-4" style={{ background: "#1e2a4a" }}>
        <h3 className="text-sm font-bold mb-3">Datos</h3>
        <div className="flex flex-col gap-2">
          <button onClick={onExport} className="w-full py-2 rounded-lg text-sm font-bold" style={{ background: "#2d3436", color: "#dfe6e9" }}>Exportar datos</button>
          <button onClick={onImport} className="w-full py-2 rounded-lg text-sm font-bold" style={{ background: "#2d3436", color: "#dfe6e9" }}>Importar datos</button>
          <button onClick={() => { if (confirm("Resetear todos los datos?")) onReset(); }} className="w-full py-2 rounded-lg text-sm font-bold" style={{ background: "#3a1a1a", color: "#e17055" }}>Resetear todo</button>
        </div>
      </div>
    </div>
  );
}
