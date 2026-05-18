import { useState } from "react";
import { SKINS } from "./GameEngine";

interface Props {
  onStart: (opts: { lbpMode: boolean; roomId: string; skin: string; name: string; levelPreset: string }) => void;
  onClose: () => void;
}

const PRESETS = [
  { id: "plains",  label: "🌿 ПОЛЯНА",  desc: "Классика. Прыжки и монеты." },
  { id: "cave",    label: "🦇 ПЕЩЕРА",  desc: "Темно и опасно." },
  { id: "volcano", label: "🌋 ВУЛКАН",  desc: "Лава везде. Осторожно!" },
  { id: "sky",     label: "☁️ НЕБО",    desc: "Платформы в облаках." },
  { id: "castle",  label: "🏰 ЗАМОК",   desc: "Финальная битва." },
];

export default function GameLobby({ onStart, onClose }: Props) {
  const [mode, setMode]         = useState<"mario" | "lbp">("mario");
  const [skin, setSkin]         = useState("🍄");
  const [name, setName]         = useState("Игрок");
  const [room, setRoom]         = useState("world-1");
  const [preset, setPreset]     = useState("plains");
  const [coopMode, setCoopMode] = useState(false);

  const skins = mode === "lbp" ? SKINS.filter(s => s.lbp) : SKINS.filter(s => !s.lbp);

  const start = () => {
    onStart({
      lbpMode: mode === "lbp",
      roomId:  coopMode ? room : "",
      skin, name,
      levelPreset: preset,
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 150,
      background: "rgba(0,0,0,0.95)",
      fontFamily: "'Press Start 2P', monospace",
      color: "#fff", overflow: "auto",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ maxWidth: 600, width: "100%", padding: "16px" }}>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: "clamp(14px,3vw,22px)", color: "#ffd700", textShadow: "3px 3px 0 #c0392b", marginBottom: 6 }}>
            ▶ ВЫБОР РЕЖИМА
          </div>
          <div style={{ fontSize: 9, color: "#aaa" }}>настрой игру и вперёд!</div>
        </div>

        {/* Mode tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[
            { id: "mario", label: "🍄 MARIO MODE" },
            { id: "lbp",   label: "🧶 LBP2 EXTRAS" },
          ].map(m => (
            <button key={m.id} onClick={() => { setMode(m.id as "mario" | "lbp"); setSkin(m.id === "lbp" ? "🧶" : "🍄"); }}
              style={{
                flex: 1, padding: "10px 4px",
                background: mode === m.id ? (m.id === "lbp" ? "#8B6914" : "#e74c3c") : "#16213e",
                border: `3px solid ${mode === m.id ? "#ffd700" : "#555"}`,
                color: mode === m.id ? "#ffd700" : "#aaa",
                fontSize: 8, cursor: "pointer",
                fontFamily: "'Press Start 2P',monospace",
                boxShadow: mode === m.id ? "3px 3px 0 #000" : "none",
              }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* LBP2 description */}
        {mode === "lbp" && (
          <div style={{
            background: "rgba(139,105,20,0.2)", border: "2px solid #8B6914",
            padding: 10, marginBottom: 14, fontSize: 7, color: "#d4a574", lineHeight: 2,
          }}>
            🧶 Little Big Planet 2 Extras Edition<br />
            Тканевая физика · Сакбой · Стежки и текстуры<br />
            Создавай уровни в стиле LBP2!
          </div>
        )}

        {/* Player name */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 7, color: "#aaa", marginBottom: 6 }}>ИМЯ ИГРОКА</div>
          <input value={name} onChange={e => setName(e.target.value.slice(0, 12))}
            style={{
              width: "100%", background: "#16213e", border: "2px solid #e74c3c",
              color: "#fff", padding: "8px 10px", fontSize: 9,
              fontFamily: "'Press Start 2P',monospace", boxSizing: "border-box",
            }} />
        </div>

        {/* Skin select */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 7, color: "#aaa", marginBottom: 6 }}>СКИН</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {skins.map(s => (
              <button key={s.id} onClick={() => setSkin(s.emoji)}
                style={{
                  width: 52, height: 52, fontSize: 22,
                  background: skin === s.emoji ? "rgba(255,215,0,0.2)" : "#16213e",
                  border: `2px solid ${skin === s.emoji ? "#ffd700" : "#555"}`,
                  cursor: "pointer", borderRadius: 4,
                  boxShadow: skin === s.emoji ? "0 0 8px rgba(255,215,0,0.5)" : "none",
                }}>
                {s.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Level preset */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 7, color: "#aaa", marginBottom: 6 }}>УРОВЕНЬ</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {PRESETS.map(p => (
              <button key={p.id} onClick={() => setPreset(p.id)}
                style={{
                  background: preset === p.id ? "rgba(231,76,60,0.3)" : "#16213e",
                  border: `2px solid ${preset === p.id ? "#ffd700" : "#333"}`,
                  color: preset === p.id ? "#ffd700" : "#aaa",
                  padding: "8px 12px", fontSize: 8, cursor: "pointer",
                  fontFamily: "'Press Start 2P',monospace",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                <span>{p.label}</span>
                <span style={{ fontSize: 6, color: "#666" }}>{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Coop toggle */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <button onClick={() => setCoopMode(c => !c)}
              style={{
                background: coopMode ? "#27ae60" : "#16213e",
                border: `2px solid ${coopMode ? "#2ecc71" : "#555"}`,
                color: coopMode ? "#fff" : "#aaa",
                padding: "6px 12px", fontSize: 7, cursor: "pointer",
                fontFamily: "'Press Start 2P',monospace",
              }}>
              🌐 ОНЛАЙН КО-ОП: {coopMode ? "ВКЛ" : "ВЫКЛ"}
            </button>
          </div>
          {coopMode && (
            <div>
              <div style={{ fontSize: 6, color: "#aaa", marginBottom: 4 }}>КОМНАТА (поделись ником с другом):</div>
              <input value={room} onChange={e => setRoom(e.target.value.slice(0, 20).replace(/\s/g, "-"))}
                style={{
                  width: "100%", background: "#16213e", border: "2px solid #27ae60",
                  color: "#2ecc71", padding: "6px 10px", fontSize: 8,
                  fontFamily: "'Press Start 2P',monospace", boxSizing: "border-box",
                }} />
              <div style={{ fontSize: 6, color: "#555", marginTop: 4 }}>другой игрок вводит то же имя комнаты</div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={start} style={{
            flex: 2, background: mode === "lbp" ? "#8B6914" : "#e74c3c",
            border: "3px solid #ffd700", color: "#ffd700",
            padding: "12px", fontSize: 10, cursor: "pointer",
            fontFamily: "'Press Start 2P',monospace",
            boxShadow: "4px 4px 0 #000",
          }}>
            ▶ СТАРТ {skin}
          </button>
          <button onClick={onClose} style={{
            flex: 1, background: "#2c3e50",
            border: "3px solid #555", color: "#aaa",
            padding: "12px", fontSize: 9, cursor: "pointer",
            fontFamily: "'Press Start 2P',monospace",
            boxShadow: "3px 3px 0 #000",
          }}>
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
