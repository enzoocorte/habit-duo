"use client";
import { JournalEntry } from "../types";
import { MOOD_EMOJIS, MOOD_LABELS } from "../types";

interface JournalScreenProps {
  journal: JournalEntry[];
  todayMood: number;
  todayNote: string;
  onSetMood: (m: number) => void;
  onSetNote: (n: string) => void;
  onSave: () => void;
}

export default function JournalScreen({ journal, todayMood, todayNote, onSetMood, onSetNote, onSave }: JournalScreenProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800">Como te sentis hoy?</h3>
          <span className="text-xs bg-[#58CC02]/10 text-[#58CC02] font-bold px-2 py-1 rounded-lg">+15 XP</span>
        </div>
        <div className="flex justify-between mb-3">
          {MOOD_EMOJIS.map((emoji, i) => (
            <button key={i} onClick={() => onSetMood(i + 1)} className={"text-3xl transition-all " + (todayMood === i + 1 ? "scale-125 drop-shadow-lg" : "opacity-40 hover:opacity-70")}>{emoji}</button>
          ))}
        </div>
        {todayMood > 0 && <p className="text-center text-sm text-gray-500 mb-3">{MOOD_LABELS[todayMood - 1]}</p>}
        <textarea value={todayNote} onChange={(e) => onSetNote(e.target.value)} placeholder="Escribi algo sobre tu dia..." className="w-full bg-gray-50 rounded-xl p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-[#58CC02]" />
        <button onClick={onSave} disabled={todayMood === 0} className="mt-3 w-full bg-[#58CC02] text-white font-bold py-2.5 rounded-xl disabled:opacity-40 hover:bg-[#4fb002] transition">Guardar entrada</button>
      </div>
      <div className="space-y-2">
        {journal.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).map((entry) => (
          <div key={entry.date} className="bg-white rounded-2xl shadow-md p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{MOOD_EMOJIS[entry.mood - 1]}</span>
              <span className="font-bold text-gray-700">{entry.date}</span>
              <span className="text-xs text-[#58CC02] font-bold">+15 XP</span>
            </div>
            {entry.note && <p className="text-sm text-gray-500 ml-9">{entry.note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
