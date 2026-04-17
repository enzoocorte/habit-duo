import { useState } from "react";
import { JournalEntry, MOOD_EMOJIS, MOOD_LABELS } from "../types";
import { getLocalDate } from "../utils";

interface Props {
  entry: JournalEntry | null;
  onSave: (entry: JournalEntry) => void;
}

export default function JournalScreen({ entry, onSave }: Props) {
  const [mood, setMood] = useState(entry?.mood ?? 2);
  const [text, setText] = useState(entry?.text ?? "");
  const [saved, setSaved] = useState(!!entry);

  const handleSave = () => {
    if (!text.trim()) return;
    onSave({ mood, text: text.trim(), xp: 15 });
    setSaved(true);
  };

  return (
    <div className="px-4 pb-20">
      <div className="rounded-xl p-4 mb-4" style={{ background: "#1e2a4a" }}>
        <h3 className="text-sm font-bold mb-3">Como estas hoy?</h3>
        <div className="flex gap-2 mb-4">
          {MOOD_EMOJIS.map((e, i) => (
            <button
              key={i}
              onClick={() => { setMood(i); setSaved(false); }}
              className="flex-1 py-2 rounded-lg text-center"
              style={{ background: mood === i ? "#6c5ce7" : "#2d3436", transform: mood === i ? "scale(1.1)" : "scale(1)" }}
            >
              <div className="text-xl">{e}</div>
              <div className="text-[10px]" style={{ color: "#b2bec3" }}>{MOOD_LABELS[i]}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl p-4 mb-4" style={{ background: "#1e2a4a" }}>
        <h3 className="text-sm font-bold mb-3">Diario (+15 XP)</h3>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setSaved(false); }}
          placeholder="Que paso hoy? Que aprendiste?"
          className="w-full h-32 p-3 rounded-lg text-sm resize-none"
          style={{ background: "#2d3436", color: "#dfe6e9", border: "1px solid rgba(255,255,255,0.1)" }}
        />
        <button
          onClick={handleSave}
          disabled={!text.trim() || saved}
          className="w-full mt-3 py-2.5 rounded-lg font-bold text-sm"
          style={{ background: saved ? "#2d3436" : "#6c5ce7", color: saved ? "#b2bec3" : "white" }}
        >
          {saved ? "✓ Guardado (+15 XP)" : "Guardar (+15 XP)"}
        </button>
      </div>
    </div>
  );
}
