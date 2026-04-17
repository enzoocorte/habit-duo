"use client";
import { AppSettings, Habit } from "../types";
import { calcAutoGoal, getMaxPossibleXp, DEFAULT_SETTINGS } from "../utils";

interface SettingsScreenProps {
  settings: AppSettings;
  habits: Habit[];
  onUpdateSettings: (s: AppSettings) => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
}

export default function SettingsScreen({ settings, habits, onUpdateSettings, onExport, onImport, onReset }: SettingsScreenProps) {
  const autoGoal = calcAutoGoal(habits);
  const maxPossible = getMaxPossibleXp(habits);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-md p-4">
        <h3 className="font-bold text-gray-800 mb-4">⚙️ Configuracion</h3>
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div><div className="font-medium text-gray-800">🔔 Notificaciones</div><div className="text-xs text-gray-400">Recordatorios para tus habitos</div></div>
          <button onClick={() => onUpdateSettings({ ...settings, notificationsEnabled: !settings.notificationsEnabled })} className={"w-14 h-8 rounded-full transition-all relative " + (settings.notificationsEnabled ? "bg-[#58CC02]" : "bg-gray-300")}>
            <div className={"w-6 h-6 bg-white rounded-full absolute top-1 transition-all shadow " + (settings.notificationsEnabled ? "left-7" : "left-1")} />
          </button>
        </div>
        <div className="py-3 border-b border-gray-100">
          <div className="font-medium text-gray-800 mb-1">⏰ Intervalo</div>
          <div className="flex gap-2 mt-1">
            {[1, 2, 3, 6, 12].map((h) => (
              <button key={h} onClick={() => onUpdateSettings({ ...settings, nudgeIntervalHours: h })} className={"px-3 py-1.5 rounded-lg text-sm font-bold transition " + (settings.nudgeIntervalHours === h ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>{h}h</button>
            ))}
          </div>
        </div>
        <div className="py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <div className="font-medium text-gray-800">🎯 Meta diaria</div>
            <button onClick={() => onUpdateSettings({ ...settings, autoGoal: !settings.autoGoal })} className={"text-xs font-bold px-2 py-1 rounded-lg " + (settings.autoGoal ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>{settings.autoGoal ? "AUTO" : "MANUAL"}</button>
          </div>
          <div className="text-xs text-gray-400 mb-2">{settings.autoGoal ? "Auto: " + autoGoal + " XP (75% del maximo)" : "Manual"}</div>
          {!settings.autoGoal && (
            <div className="flex gap-2">
              {[50, 75, 100, 150, 200].map((xp) => (
                <button key={xp} onClick={() => onUpdateSettings({ ...settings, dailyXpGoal: xp })} className={"px-3 py-1.5 rounded-lg text-sm font-bold transition " + (settings.dailyXpGoal === xp ? "bg-[#58CC02] text-white" : "bg-gray-100 text-gray-500")}>{xp}</button>
              ))}
            </div>
          )}
          {settings.autoGoal && (
            <div className="bg-gray-50 rounded-xl p-3 mt-1">
              <div className="text-xs text-gray-500">Max posible: {maxPossible} XP/dia</div>
              <div className="text-xs text-[#58CC02] font-bold">Meta auto: {autoGoal} XP/dia</div>
            </div>
          )}
        </div>
        <div className="py-3 border-b border-gray-100">
          <div className="font-medium text-gray-800 mb-1">💾 Datos</div>
          <div className="flex gap-2 mt-1">
            <button onClick={onExport} className="flex-1 bg-blue-50 text-blue-600 font-bold py-2 rounded-xl text-sm hover:bg-blue-100 transition">📤 Exportar</button>
            <button onClick={onImport} className="flex-1 bg-purple-50 text-purple-600 font-bold py-2 rounded-xl text-sm hover:bg-purple-100 transition">📥 Importar</button>
          </div>
        </div>
        <div className="py-3">
          <button onClick={onReset} className="w-full bg-red-50 text-red-600 font-bold py-2 rounded-xl text-sm hover:bg-red-100 transition">🗑 Reiniciar</button>
        </div>
      </div>
    </div>
  );
}
