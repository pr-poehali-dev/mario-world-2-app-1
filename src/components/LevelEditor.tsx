import { useState, useCallback, useRef, useEffect } from "react";

const API_URL = "https://functions.poehali.dev/9ccee5c5-ff7e-4c80-b5cb-b9386e031d17";

// Tiles
const TILES = [
  { id: 0,  emoji: "⬛", label: "Пусто",     color: "#0d0d1a" },
  { id: 1,  emoji: "🟫", label: "Земля",     color: "#8B4513" },
  { id: 2,  emoji: "🟩", label: "Трава",     color: "#27ae60" },
  { id: 3,  emoji: "🧱", label: "Кирпич",    color: "#c0392b" },
  { id: 4,  emoji: "❓", label: "?-блок",    color: "#f39c12" },
  { id: 5,  emoji: "🪨", label: "Камень",    color: "#7f8c8d" },
  { id: 6,  emoji: "🌵", label: "Кактус",    color: "#2ecc71" },
  { id: 7,  emoji: "🍄", label: "Гумба",     color: "#e74c3c" },
  { id: 8,  emoji: "🐢", label: "Черепаха",  color: "#16a085" },
  { id: 9,  emoji: "🌺", label: "Пиранья",   color: "#8e44ad" },
  { id: 10, emoji: "⭐", label: "Звезда",    color: "#ffd700" },
  { id: 11, emoji: "🏁", label: "Финиш",     color: "#ecf0f1" },
  { id: 12, emoji: "🚀", label: "Старт",     color: "#3498db" },
  { id: 13, emoji: "💰", label: "Монета",    color: "#f1c40f" },
  { id: 14, emoji: "🌊", label: "Вода",      color: "#2980b9" },
  { id: 15, emoji: "🔥", label: "Лава",      color: "#e67e22" },
  { id: 16, emoji: "🏰", label: "Замок",     color: "#9b59b6" },
  { id: 17, emoji: "🌸", label: "Цветок",    color: "#e91e63" },
  { id: 18, emoji: "💣", label: "Боб-омб",   color: "#2c3e50" },
  { id: 19, emoji: "🌈", label: "Радуга",    color: "#ff6b6b" },
] as const;

type TileId = typeof TILES[number]["id"];

const W = 20;
const H = 12;

function emptyGrid(): TileId[][] {
  return Array.from({ length: H }, () => Array(W).fill(0) as TileId[]);
}

// ── Procedural generation algorithms ────────────────────────────────────────
function generateLevel(preset: string): TileId[][] {
  const g = emptyGrid();

  const fill = (r: number, c: number, t: TileId) => {
    if (r >= 0 && r < H && c >= 0 && c < W) g[r][c] = t;
  };

  if (preset === "plains") {
    // Flat green world
    for (let c = 0; c < W; c++) {
      g[H - 1][c] = 1;
      g[H - 2][c] = 2;
    }
    // Hills
    for (const bump of [3, 8, 14]) {
      for (let r = H - 4; r < H - 2; r++) fill(r, bump, 5);
      fill(H - 4, bump, 2);
    }
    // Platforms
    [[2, 5, 4], [2, 10, 4], [4, 7, 3], [4, 13, 3]].forEach(([r, c, len]) => {
      for (let i = 0; i < len; i++) fill(r, c + i, 3);
    });
    // Q-blocks
    fill(3, 6, 4); fill(3, 11, 4); fill(1, 9, 4);
    // Enemies
    fill(H - 3, 7, 7); fill(H - 3, 12, 8); fill(H - 3, 16, 7);
    // Coins
    [9, 10, 11].forEach(c => fill(2, c, 13));
    // Start / Finish
    fill(H - 3, 0, 12); fill(H - 3, W - 1, 11);
  }

  else if (preset === "cave") {
    // Cave walls
    for (let r = 0; r < H; r++) { fill(r, 0, 5); fill(r, W - 1, 5); }
    for (let c = 0; c < W; c++) { fill(0, c, 5); fill(H - 1, c, 5); }
    // Inner ground
    for (let c = 1; c < W - 1; c++) fill(H - 2, c, 1);
    // Stalactites
    for (const c of [2, 5, 9, 13, 17]) {
      fill(1, c, 5); fill(2, c, 5);
    }
    // Lava pools
    for (let c = 6; c <= 9; c++) fill(H - 2, c, 15);
    for (let c = 13; c <= 15; c++) fill(H - 2, c, 15);
    // Platforms
    [[3, 3, 3], [3, 10, 3], [5, 6, 4], [7, 2, 3], [7, 13, 3]].forEach(([r, c, len]) => {
      for (let i = 0; i < len; i++) fill(r, c + i, 1);
    });
    // Enemies
    fill(H - 3, 4, 9); fill(H - 3, 11, 18);
    // Coins
    [3, 4, 10, 11].forEach(c => fill(4, c, 13));
    fill(H - 3, 0, 12); fill(H - 3, W - 2, 11);
  }

  else if (preset === "volcano") {
    for (let c = 0; c < W; c++) fill(H - 1, c, 15);
    for (let c = 0; c < W; c++) fill(H - 2, c, 1);
    // Lava rivers
    for (const c of [5, 6, 12, 13]) fill(H - 2, c, 15);
    // Castle BG
    for (let r = H - 6; r < H - 2; r++) for (let c = W - 4; c < W; c++) fill(r, c, 3);
    fill(H - 7, W - 3, 16);
    // Fire
    [4, 8, 15].forEach(c => { fill(H - 3, c, 15); fill(H - 4, c, 15); });
    // Platforms (rock)
    [[4, 2, 3], [4, 8, 3], [6, 5, 3], [6, 11, 3], [2, 7, 4]].forEach(([r, c, len]) => {
      for (let i = 0; i < len; i++) fill(r, c + i, 5);
    });
    // Enemies
    fill(H - 3, 3, 18); fill(H - 3, 10, 18); fill(5, 6, 7);
    // Coins
    [7, 8, 9, 10].forEach(c => fill(3, c, 13));
    fill(H - 3, 0, 12); fill(H - 7, W - 3, 11);
  }

  else if (preset === "sky") {
    // Clouds / platforms
    [[1, 2, 4], [1, 9, 4], [1, 16, 3],
     [3, 0, 3], [3, 6, 5], [3, 13, 4],
     [5, 3, 3], [5, 10, 4], [5, 17, 2],
     [7, 1, 4], [7, 8, 3], [7, 14, 4],
     [9, 4, 4], [9, 11, 3]
    ].forEach(([r, c, len]) => {
      for (let i = 0; i < len; i++) fill(r, c + i, 5);
    });
    // Rainbow
    for (let c = 3; c < 10; c++) fill(0, c, 19);
    // Q-blocks
    fill(2, 4, 4); fill(2, 11, 4); fill(6, 12, 4);
    // Stars
    [1, 6, 14, 18].forEach(c => fill(0, c, 10));
    // Enemies
    fill(4, 7, 9); fill(8, 9, 7);
    // Coins
    [3, 4, 5, 12, 13].forEach(c => fill(6, c, 13));
    fill(2, 3, 12); fill(8, W - 2, 11);
  }

  else if (preset === "castle") {
    // Floor
    for (let c = 0; c < W; c++) fill(H - 1, c, 3);
    // Walls
    for (let r = 0; r < H; r++) { fill(r, 0, 16); fill(r, W - 1, 16); }
    // Ceiling
    for (let c = 1; c < W - 1; c++) fill(0, c, 3);
    // Floors
    for (let c = 2; c < W - 2; c++) fill(4, c, 3);
    for (let c = 2; c < W - 2; c++) fill(8, c, 3);
    // Holes
    [5, 6, 13, 14].forEach(c => { g[4][c] = 0; g[8][c] = 0; });
    // Lava
    for (let c = 3; c < 17; c++) fill(H - 2, c, 15);
    // Enemies (bosses)
    fill(3, 8, 18); fill(3, 11, 18); fill(7, 5, 9); fill(7, 14, 9);
    // Coins
    [4, 5, 10, 15, 16].forEach(c => fill(3, c, 13));
    fill(H - 2, 1, 12); fill(1, W - 2, 11);
  }

  return g;
}

// ── SavedLevel type ───────────────────────────────────────────────────────────
interface SavedLevel {
  id: string;
  name: string;
  author: string;
  width: number;
  height: number;
  plays: number;
  likes: number;
  created_at: string;
  grid?: TileId[][];
}

// ── Object properties ─────────────────────────────────────────────────────────
// Тайлы, у которых есть настраиваемые свойства
const PROP_TILES: Record<number, { label: string; fields: { key: string; label: string; min: number; max: number; step: number; unit: string; default: number }[] }> = {
  7:  { label: "Гумба 🍄",    fields: [{ key: "speed", label: "Скорость", min: 0.5, max: 4, step: 0.5, unit: "×", default: 1 }] },
  8:  { label: "Черепаха 🐢", fields: [{ key: "speed", label: "Скорость", min: 0.5, max: 4, step: 0.5, unit: "×", default: 1.5 }] },
  18: { label: "Боб-омб 💣",  fields: [{ key: "speed", label: "Скорость", min: 0.5, max: 4, step: 0.5, unit: "×", default: 1 }] },
  10: { label: "Звезда ⭐",   fields: [{ key: "value", label: "Ценность", min: 1, max: 10, step: 1, unit: "монет", default: 1 }] },
  13: { label: "Монета 💰",   fields: [{ key: "value", label: "Ценность", min: 1, max: 10, step: 1, unit: "монет", default: 1 }] },
  4:  { label: "?-блок ❓",   fields: [{ key: "value", label: "Монет внутри", min: 1, max: 10, step: 1, unit: "шт", default: 1 }] },
};

// Тайлы, которые должны быть уникальными (только один на карте)
const UNIQUE_TILES = new Set([11, 12]);

// ── ObjectProps: key = "row_col", value = { speed, value, … } ────────────────
type ObjProps = Record<string, Record<string, number>>;

// ── Component ─────────────────────────────────────────────────────────────────
export type { ObjProps };
export default function LevelEditor({ onClose, onPlay }: { onClose: () => void; onPlay?: (grid: TileId[][], props: ObjProps) => void }) {
  const [grid, setGrid] = useState<TileId[][]>(emptyGrid);
  const [selectedTile, setSelectedTile] = useState<TileId>(2);
  const [isPainting, setIsPainting] = useState(false);
  const [levelName, setLevelName] = useState("Мой уровень");
  const [author, setAuthor] = useState("Игрок");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [onlineLevels, setOnlineLevels] = useState<SavedLevel[]>([]);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const [view, setView] = useState<"edit" | "online">("edit");
  const [previewLevel, setPreviewLevel] = useState<SavedLevel | null>(null);
  const [previewGrid, setPreviewGrid] = useState<TileId[][] | null>(null);
  const [objectProps, setObjectProps] = useState<ObjProps>({});
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);

  const tileRef = useRef(selectedTile);
  tileRef.current = selectedTile;

  const getProps = (r: number, c: number, tileId: number): Record<string, number> => {
    const key = `${r}_${c}`;
    const saved = objectProps[key];
    const def = PROP_TILES[tileId]?.fields.reduce((acc, f) => ({ ...acc, [f.key]: f.default }), {} as Record<string, number>);
    return saved ?? def ?? {};
  };

  const setProps = (r: number, c: number, props: Record<string, number>) => {
    setObjectProps(prev => ({ ...prev, [`${r}_${c}`]: props }));
  };

  const paint = useCallback((r: number, c: number) => {
    const tileId = tileRef.current;
    setGrid(g => {
      const ng = g.map(row => [...row]);
      // Уникальные тайлы (старт/финиш) — очищаем предыдущее место
      if (UNIQUE_TILES.has(tileId)) {
        for (let rr = 0; rr < ng.length; rr++) {
          for (let cc = 0; cc < ng[rr].length; cc++) {
            if (ng[rr][cc] === tileId) ng[rr][cc] = 0;
          }
        }
      }
      ng[r][c] = tileId;
      return ng;
    });
    // Выделяем ячейку если у тайла есть свойства
    if (PROP_TILES[tileId]) {
      setSelectedCell({ r, c });
    } else {
      setSelectedCell(null);
    }
  }, []);

  const loadOnline = async () => {
    setLoadingOnline(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setOnlineLevels(data.levels || []);
    } catch {
      setOnlineLevels([]);
    }
    setLoadingOnline(false);
  };

  useEffect(() => {
    if (view === "online") loadOnline();
  }, [view]);

  const saveLevel = async () => {
    setSaving(true);
    setSavedMsg("");
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: levelName, author, grid, width: W, height: H, objectProps }),
      });
      const data = await res.json();
      setSavedMsg(data.message || `ID: ${data.id}`);
      setTimeout(() => setSavedMsg(""), 4000);
    } catch {
      setSavedMsg("Ошибка сохранения");
    }
    setSaving(false);
  };

  const loadLevel = async (level: SavedLevel) => {
    setPreviewLevel(level);
    try {
      const res = await fetch(`${API_URL}?id=${level.id}`);
      const data = await res.json();
      if (data.grid) setPreviewGrid(data.grid);
      // increment plays
      fetch(`${API_URL}/play`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: level.id }) });
    } catch (e) {
      console.error(e);
    }
  };

  const importToEditor = () => {
    if (previewGrid) {
      setGrid(previewGrid);
      setLevelName(previewLevel?.name || "");
      setView("edit");
      setPreviewLevel(null);
      setPreviewGrid(null);
    }
  };

  const likeLevel = async (id: string) => {
    await fetch(`${API_URL}/like`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadOnline();
  };

  const tileEmoji = (t: TileId) => TILES.find(x => x.id === t)?.emoji ?? "⬛";

  const px = (s: React.CSSProperties) => s;

  return (
    <div style={px({ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.93)", overflow: "auto", fontFamily: "'Press Start 2P',monospace", color: "#fff" })}>
      {/* Header */}
      <div style={px({ background: "#0d0d1a", borderBottom: "4px solid #e74c3c", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" })}>
        <div style={px({ color: "#ffd700", fontSize: "12px", textShadow: "2px 2px 0 #c0392b" })}>🏗️ РЕДАКТОР УРОВНЕЙ</div>
        <div style={px({ display: "flex", gap: "8px" })}>
          <button onClick={() => setView("edit")} style={px({ background: view === "edit" ? "#e74c3c" : "#16213e", border: `2px solid ${view === "edit" ? "#ffd700" : "#e74c3c"}`, color: view === "edit" ? "#ffd700" : "#fff", padding: "6px 12px", fontSize: "7px", cursor: "pointer", fontFamily: "'Press Start 2P',monospace" })}>✏️ РЕДАКТОР</button>
          <button onClick={() => setView("online")} style={px({ background: view === "online" ? "#e74c3c" : "#16213e", border: `2px solid ${view === "online" ? "#ffd700" : "#e74c3c"}`, color: view === "online" ? "#ffd700" : "#fff", padding: "6px 12px", fontSize: "7px", cursor: "pointer", fontFamily: "'Press Start 2P',monospace" })}>🌐 ОНЛАЙН</button>
          {onPlay && <button onClick={() => onPlay(grid, objectProps)} style={px({ background: "#27ae60", border: "2px solid #2ecc71", color: "#fff", padding: "6px 12px", fontSize: "7px", cursor: "pointer", fontFamily: "'Press Start 2P',monospace", boxShadow: "2px 2px 0 #000" })}>▶ ИГРАТЬ</button>}
          <button onClick={onClose} style={px({ background: "#2c3e50", border: "2px solid #7f8c8d", color: "#aaa", padding: "6px 12px", fontSize: "7px", cursor: "pointer", fontFamily: "'Press Start 2P',monospace" })}>✕ ЗАКРЫТЬ</button>
        </div>
      </div>

      {/* EDITOR VIEW */}
      {view === "edit" && (
        <div style={px({ maxWidth: "1100px", margin: "0 auto", padding: "16px" })}>

          {/* Top controls */}
          <div style={px({ display: "flex", gap: "10px", marginBottom: "12px", flexWrap: "wrap", alignItems: "center" })}>
            <input value={levelName} onChange={e => setLevelName(e.target.value)} placeholder="Название уровня" style={px({ background: "#16213e", border: "2px solid #e74c3c", color: "#fff", padding: "6px 10px", fontSize: "8px", fontFamily: "'Press Start 2P',monospace", width: "180px" })} />
            <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Ник" style={px({ background: "#16213e", border: "2px solid #555", color: "#fff", padding: "6px 10px", fontSize: "8px", fontFamily: "'Press Start 2P',monospace", width: "110px" })} />
            <button onClick={() => setGrid(emptyGrid())} style={px({ background: "#2c3e50", border: "2px solid #7f8c8d", color: "#aaa", padding: "6px 10px", fontSize: "7px", cursor: "pointer", fontFamily: "'Press Start 2P',monospace" })}>🗑️ ОЧИСТИТЬ</button>
            <button onClick={saveLevel} disabled={saving} style={px({ background: saving ? "#2c3e50" : "#27ae60", border: "2px solid #2ecc71", color: "#fff", padding: "6px 12px", fontSize: "7px", cursor: "pointer", fontFamily: "'Press Start 2P',monospace", boxShadow: "2px 2px 0 #000" })}>
              {saving ? "⏳ СОХР..." : "💾 СОХРАНИТЬ"}
            </button>
            {savedMsg && <span style={px({ color: "#2ecc71", fontSize: "7px", animation: "fadeInUp 0.3s ease" })}>{savedMsg}</span>}
          </div>

          {/* Generate presets */}
          <div style={px({ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" })}>
            <span style={px({ fontSize: "7px", color: "#aaa", alignSelf: "center", marginRight: "4px" })}>СГЕНЕРИРОВАТЬ:</span>
            {[
              { id: "plains",  label: "🌿 ПОЛЯНА" },
              { id: "cave",    label: "🦇 ПЕЩЕРА" },
              { id: "volcano", label: "🌋 ВУЛКАН" },
              { id: "sky",     label: "☁️ НЕБО" },
              { id: "castle",  label: "🏰 ЗАМОК" },
            ].map(p => (
              <button key={p.id} onClick={() => setGrid(generateLevel(p.id))} style={px({ background: "#16213e", border: "2px solid #e74c3c", color: "#ffd700", padding: "5px 10px", fontSize: "7px", cursor: "pointer", fontFamily: "'Press Start 2P',monospace", boxShadow: "2px 2px 0 #000" })}>
                {p.label}
              </button>
            ))}
          </div>

          <div style={px({ display: "flex", gap: "16px", flexWrap: "wrap" })}>
            {/* Grid */}
            <div style={px({ flex: "1 1 auto", minWidth: 0 })}>
              <div
                style={px({ display: "grid", gridTemplateColumns: `repeat(${W}, 1fr)`, gap: "1px", background: "#000", border: "3px solid #e74c3c", boxShadow: "4px 4px 0 #000", userSelect: "none", cursor: "crosshair", maxWidth: "100%", overflow: "auto" })}
                onMouseLeave={() => setIsPainting(false)}
              >
                {grid.map((row, r) =>
                  row.map((cell, c) => (
                    <div
                      key={`${r}-${c}`}
                      onMouseDown={() => {
                        setIsPainting(true);
                        // Правая кнопка мыши или уже стоит объект — просто выделяем
                        if (PROP_TILES[cell] && selectedTile === cell) {
                          setSelectedCell({ r, c });
                        } else {
                          paint(r, c);
                        }
                      }}
                      onMouseEnter={() => { if (isPainting) paint(r, c); }}
                      onMouseUp={() => setIsPainting(false)}
                      onTouchStart={() => { setIsPainting(true); paint(r, c); }}
                      onTouchMove={e => {
                        e.preventDefault();
                        const touch = e.touches[0];
                        const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
                        if (el?.dataset.row && el?.dataset.col) paint(+el.dataset.row, +el.dataset.col);
                      }}
                      onTouchEnd={() => setIsPainting(false)}
                      data-row={r}
                      data-col={c}
                      style={px({
                        width: "28px",
                        height: "28px",
                        background: TILES.find(t => t.id === cell)?.color ?? "#0d0d1a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        transition: "transform 0.05s",
                        border: (selectedCell?.r === r && selectedCell?.c === c)
                          ? "2px solid #2ecc71"
                          : cell === 0 ? "1px solid #111" : "none",
                        outline: (selectedCell?.r === r && selectedCell?.c === c)
                          ? "2px solid #ffd700" : "none",
                        lineHeight: 1,
                        boxSizing: "border-box",
                      })}
                    >
                      {cell !== 0 ? tileEmoji(cell) : ""}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Palette */}
            <div style={px({ width: "160px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" })}>
              <div>
                <div style={px({ fontSize: "7px", color: "#aaa", marginBottom: "8px" })}>ПАЛИТРА ТАЙЛОВ</div>
                <div style={px({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" })}>
                  {TILES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTile(t.id)}
                      style={px({
                        background: selectedTile === t.id ? `${t.color}88` : "#16213e",
                        border: `2px solid ${selectedTile === t.id ? "#ffd700" : t.color}`,
                        color: "#fff",
                        padding: "5px 3px",
                        cursor: "pointer",
                        fontSize: "8px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "2px",
                        boxShadow: selectedTile === t.id ? "0 0 8px rgba(255,215,0,0.4)" : "none",
                        position: "relative",
                      })}
                    >
                      <span style={{ fontSize: "16px" }}>{t.emoji}</span>
                      <span style={{ fontSize: "5px", color: "#aaa", lineHeight: 1.2, textAlign: "center" }}>{t.label}</span>
                      {UNIQUE_TILES.has(t.id) && (
                        <span style={{ position: "absolute", top: 2, right: 2, fontSize: "5px", color: "#ffd700" }}>×1</span>
                      )}
                      {PROP_TILES[t.id] && (
                        <span style={{ position: "absolute", top: 2, left: 2, fontSize: "5px", color: "#2ecc71" }}>⚙</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Object properties panel */}
              {selectedCell && (() => {
                const { r, c } = selectedCell;
                const tileId = grid[r]?.[c];
                const meta = tileId !== undefined ? PROP_TILES[tileId] : null;
                if (!meta) return null;
                const props = getProps(r, c, tileId);
                return (
                  <div style={px({ background: "#0d0d1a", border: "2px solid #2ecc71", padding: "10px" })}>
                    <div style={px({ fontSize: "6px", color: "#2ecc71", marginBottom: "8px" })}>⚙ {meta.label}</div>
                    <div style={px({ fontSize: "6px", color: "#555", marginBottom: "8px" })}>ряд {r+1}, кол {c+1}</div>
                    {meta.fields.map(f => (
                      <div key={f.key} style={px({ marginBottom: "8px" })}>
                        <div style={px({ fontSize: "6px", color: "#aaa", marginBottom: "4px" })}>{f.label}</div>
                        <div style={px({ display: "flex", alignItems: "center", gap: "6px" })}>
                          <input
                            type="range"
                            min={f.min} max={f.max} step={f.step}
                            value={props[f.key] ?? f.default}
                            onChange={e => setProps(r, c, { ...props, [f.key]: +e.target.value })}
                            style={{ flex: 1, accentColor: "#2ecc71" }}
                          />
                          <span style={{ fontSize: "8px", color: "#ffd700", minWidth: "36px", textAlign: "right" }}>
                            {props[f.key] ?? f.default}{f.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => setSelectedCell(null)}
                      style={px({ background: "transparent", border: "1px solid #333", color: "#555", fontSize: "6px", cursor: "pointer", padding: "3px 6px", fontFamily: "'Press Start 2P',monospace" })}
                    >✕ закрыть</button>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Legend */}
          <div style={px({ marginTop: "10px", display: "flex", gap: "16px", flexWrap: "wrap" })}>
            <span style={px({ fontSize: "6px", color: "#555" })}>💡 Выбери тайл → кликни / тяни по сетке</span>
            <span style={px({ fontSize: "6px", color: "#555" })}>📱 Поддержка тача</span>
            <span style={px({ fontSize: "6px", color: "#555" })}>🌐 Сохранение онлайн → вкладка ОНЛАЙН</span>
          </div>
        </div>
      )}

      {/* ONLINE VIEW */}
      {view === "online" && (
        <div style={px({ maxWidth: "900px", margin: "0 auto", padding: "16px" })}>
          <div style={px({ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" })}>
            <div style={px({ fontSize: "9px", color: "#e74c3c" })}>— УРОВНИ СООБЩЕСТВА —</div>
            <button onClick={loadOnline} style={px({ background: "#16213e", border: "2px solid #e74c3c", color: "#ffd700", padding: "6px 10px", fontSize: "7px", cursor: "pointer", fontFamily: "'Press Start 2P',monospace" })}>
              🔄 ОБНОВИТЬ
            </button>
          </div>

          {loadingOnline && (
            <div style={px({ textAlign: "center", padding: "40px", color: "#aaa", fontSize: "8px" })}>
              ⏳ ЗАГРУЗКА...
            </div>
          )}

          {!loadingOnline && onlineLevels.length === 0 && (
            <div style={px({ textAlign: "center", padding: "40px", background: "#16213e", border: "3px solid #e74c3c" })}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📭</div>
              <div style={{ fontSize: "8px", color: "#aaa" }}>Уровней пока нет.<br /><br />Создай первый в редакторе!</div>
            </div>
          )}

          {!loadingOnline && onlineLevels.length > 0 && (
            <div style={px({ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "12px" })}>
              {onlineLevels.map((lvl, i) => (
                <div key={lvl.id} style={px({ background: "#16213e", border: `3px solid ${previewLevel?.id === lvl.id ? "#ffd700" : "#e74c3c"}`, boxShadow: "3px 3px 0 #000", padding: "14px", animation: `fadeInUp 0.3s ease ${i * 0.05}s both` })}>
                  <div style={px({ fontSize: "9px", color: "#ffd700", marginBottom: "4px" })}>{lvl.name}</div>
                  <div style={px({ fontSize: "6px", color: "#aaa", marginBottom: "8px" })}>автор: {lvl.author}</div>
                  <div style={px({ display: "flex", gap: "8px", marginBottom: "10px" })}>
                    <span style={px({ fontSize: "6px", color: "#27ae60" })}>▶ {lvl.plays} игр</span>
                    <span style={px({ fontSize: "6px", color: "#e74c3c" })}>♥ {lvl.likes}</span>
                    <span style={px({ fontSize: "6px", color: "#555" })}>#{lvl.id}</span>
                  </div>
                  <div style={px({ display: "flex", gap: "6px" })}>
                    <button onClick={() => loadLevel(lvl)} style={px({ background: "#e74c3c", border: "2px solid #ffd700", color: "#ffd700", padding: "4px 8px", fontSize: "6px", cursor: "pointer", fontFamily: "'Press Start 2P',monospace", flex: 1, boxShadow: "2px 2px 0 #000" })}>
                      👁 СМОТРЕТЬ
                    </button>
                    <button onClick={() => likeLevel(lvl.id)} style={px({ background: "#16213e", border: "2px solid #e74c3c", color: "#e74c3c", padding: "4px 8px", fontSize: "10px", cursor: "pointer" })}>♥</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Preview panel */}
          {previewLevel && (
            <div style={px({ marginTop: "20px", border: "3px solid #ffd700", boxShadow: "4px 4px 0 #000", background: "#0d0d1a", padding: "16px" })}>
              <div style={px({ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" })}>
                <div style={px({ fontSize: "9px", color: "#ffd700" })}>👁 {previewLevel.name}</div>
                <div style={px({ display: "flex", gap: "8px" })}>
                  <button onClick={importToEditor} disabled={!previewGrid} style={px({ background: "#27ae60", border: "2px solid #2ecc71", color: "#fff", padding: "5px 10px", fontSize: "6px", cursor: "pointer", fontFamily: "'Press Start 2P',monospace" })}>
                    ✏️ РЕДАКТИРОВАТЬ
                  </button>
                  <button onClick={() => { setPreviewLevel(null); setPreviewGrid(null); }} style={px({ background: "#2c3e50", border: "2px solid #555", color: "#aaa", padding: "5px 8px", fontSize: "6px", cursor: "pointer" })}>✕</button>
                </div>
              </div>
              {previewGrid ? (
                <div style={px({ display: "grid", gridTemplateColumns: `repeat(${previewLevel.width}, 1fr)`, gap: "1px", background: "#000", maxWidth: "100%", overflow: "auto" })}>
                  {previewGrid.map((row, r) =>
                    row.map((cell, c) => (
                      <div key={`p${r}-${c}`} style={px({ width: "22px", height: "22px", background: TILES.find(t => t.id === cell)?.color ?? "#0d0d1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px" })}>
                        {cell !== 0 ? tileEmoji(cell as TileId) : ""}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div style={px({ textAlign: "center", padding: "20px", color: "#aaa", fontSize: "7px" })}>⏳ Загрузка уровня...</div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}