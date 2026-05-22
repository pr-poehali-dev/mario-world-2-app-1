import { useState, useEffect } from "react";
import LevelEditor, { type ObjProps } from "@/components/LevelEditor";
import GameEngine from "@/components/GameEngine";
import GameLobby from "@/components/GameLobby";

type Tab = "home" | "levels" | "leaderboard" | "shop";

// ── Procedural level gen (mirrors LevelEditor's generateLevel) ────────────────
type TileId = 0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19;
const W = 20, H = 12;
function emptyGrid(): TileId[][] { return Array.from({length: H}, () => Array(W).fill(0) as TileId[]); }
function genLevel(preset: string): TileId[][] {
  const g = emptyGrid();
  const fill = (r: number, c: number, t: TileId) => { if (r>=0&&r<H&&c>=0&&c<W) g[r][c]=t; };
  if (preset === "plains") {
    for (let c=0;c<W;c++) { g[H-1][c]=1; g[H-2][c]=2; }
    [[2,5,4],[2,10,4],[4,7,3],[4,13,3]].forEach(([r,c,l])=>{for(let i=0;i<l;i++)fill(r,c+i,3);});
    fill(3,6,4);fill(3,11,4);fill(1,9,4);
    fill(H-3,7,7);fill(H-3,12,8);fill(H-3,16,7);
    [9,10,11].forEach(c=>fill(2,c,13));
    fill(H-3,0,12);fill(H-3,W-1,11);
  } else if (preset === "cave") {
    for (let r=0;r<H;r++){fill(r,0,5);fill(r,W-1,5);}
    for (let c=0;c<W;c++){fill(0,c,5);fill(H-1,c,5);}
    for (let c=1;c<W-1;c++) fill(H-2,c,1);
    for (const c of [2,5,9,13,17]){fill(1,c,5);fill(2,c,5);}
    for (let c=6;c<=9;c++) fill(H-2,c,15);
    for (let c=13;c<=15;c++) fill(H-2,c,15);
    [[3,3,3],[3,10,3],[5,6,4],[7,2,3],[7,13,3]].forEach(([r,c,l])=>{for(let i=0;i<l;i++)fill(r,c+i,1);});
    fill(H-3,4,9);fill(H-3,11,18);[3,4,10,11].forEach(c=>fill(4,c,13));
    fill(H-3,0,12);fill(H-3,W-2,11);
  } else if (preset === "volcano") {
    for (let c=0;c<W;c++){fill(H-1,c,15);fill(H-2,c,1);}
    for (const c of [5,6,12,13]) fill(H-2,c,15);
    for (let r=H-6;r<H-2;r++) for(let c=W-4;c<W;c++) fill(r,c,3);
    fill(H-7,W-3,16);[4,8,15].forEach(c=>{fill(H-3,c,15);fill(H-4,c,15);});
    [[4,2,3],[4,8,3],[6,5,3],[6,11,3],[2,7,4]].forEach(([r,c,l])=>{for(let i=0;i<l;i++)fill(r,c+i,5);});
    fill(H-3,3,18);fill(H-3,10,18);fill(5,6,7);[7,8,9,10].forEach(c=>fill(3,c,13));
    fill(H-3,0,12);fill(H-7,W-3,11);
  } else if (preset === "sky") {
    [[1,2,4],[1,9,4],[1,16,3],[3,0,3],[3,6,5],[3,13,4],[5,3,3],[5,10,4],[5,17,2],[7,1,4],[7,8,3],[7,14,4],[9,4,4],[9,11,3]].forEach(([r,c,l])=>{for(let i=0;i<l;i++)fill(r,c+i,5);});
    for (let c=3;c<10;c++) fill(0,c,19);fill(2,4,4);fill(2,11,4);fill(6,12,4);
    [1,6,14,18].forEach(c=>fill(0,c,10));fill(4,7,9);fill(8,9,7);[3,4,5,12,13].forEach(c=>fill(6,c,13));
    fill(2,3,12);fill(8,W-2,11);
  } else {
    for (let c=0;c<W;c++) fill(H-1,c,3);
    for (let r=0;r<H;r++){fill(r,0,16);fill(r,W-1,16);}
    for (let c=1;c<W-1;c++){fill(0,c,3);fill(4,c,3);fill(8,c,3);}
    [5,6,13,14].forEach(c=>{g[4][c]=0;g[8][c]=0;});
    for (let c=3;c<17;c++) fill(H-2,c,15);
    fill(3,8,18);fill(3,11,18);fill(7,5,9);fill(7,14,9);[4,5,10,15,16].forEach(c=>fill(3,c,13));
    fill(H-2,1,12);fill(1,W-2,11);
  }
  return g;
}

const ENEMIES = [
  { id: 1, name: "Гумба", emoji: "🍄", hp: 10, atk: 5, color: "#c0392b", desc: "Базовый враг. Медленный, но стойкий." },
  { id: 2, name: "Кустик", emoji: "🌵", hp: 20, atk: 10, color: "#27ae60", desc: "Шипастый. Касание — урон." },
  { id: 3, name: "Черепаха", emoji: "🐢", hp: 30, atk: 15, color: "#2980b9", desc: "Прячется в панцирь. Трудно победить." },
  { id: 4, name: "Пиранья", emoji: "🌺", hp: 25, atk: 20, color: "#8e44ad", desc: "Выпрыгивает из труб. Опасна!" },
  { id: 5, name: "Боб-омб", emoji: "💣", hp: 15, atk: 30, color: "#2c3e50", desc: "Взрывается при подходе." },
  { id: 6, name: "Король Боузер", emoji: "🐲", hp: 200, atk: 50, color: "#e67e22", desc: "ФИНАЛЬНЫЙ БОСС. Огонь и ярость.", isBoss: true },
];

const LEVELS = [
  { id: 1, name: "Грибное Королевство", world: "1-1", stars: 3, unlocked: true, color: "#27ae60", icon: "🌿" },
  { id: 2, name: "Пещера Теней", world: "1-2", stars: 2, unlocked: true, color: "#7f8c8d", icon: "🦇" },
  { id: 3, name: "Ледяной Замок", world: "2-1", stars: 1, unlocked: true, color: "#3498db", icon: "❄️" },
  { id: 4, name: "Вулканические Горы", world: "2-2", stars: 0, unlocked: false, color: "#e74c3c", icon: "🌋" },
  { id: 5, name: "Небесный Остров", world: "3-1", stars: 0, unlocked: false, color: "#f39c12", icon: "☁️" },
  { id: 6, name: "Замок Боузера", world: "3-2", stars: 0, unlocked: false, color: "#8e44ad", icon: "🏰" },
];

const LEADERBOARD = [
  { rank: 1, name: "SuperMario64", score: 999999, coins: 9999, crown: "👑" },
  { rank: 2, name: "KingKoopa", score: 875420, coins: 8100, crown: "🥈" },
  { rank: 3, name: "PrincessPower", score: 742100, coins: 7200, crown: "🥉" },
  { rank: 4, name: "WaluigiWins", score: 611000, coins: 5800, crown: "🎮" },
  { rank: 5, name: "ToadRunner", score: 489000, coins: 4200, crown: "🍄" },
  { rank: 6, name: "YoshiFan99", score: 321500, coins: 3100, crown: "🦕" },
  { rank: 7, name: "PixelKnight", score: 210000, coins: 2000, crown: "⚔️" },
  { rank: 8, name: "ТвойНик", score: 150000, coins: 1337, crown: "🌟", isYou: true },
];

const SHOP_ITEMS = [
  { id: 1, name: "Супер Гриб", emoji: "🍄", desc: "x2 HP на уровень", price: 50, type: "power" },
  { id: 2, name: "Огненный цветок", emoji: "🌸", desc: "Огненные шары", price: 100, type: "power" },
  { id: 3, name: "Звезда", emoji: "⭐", desc: "Неуязвимость 10 сек", price: 200, type: "power" },
  { id: 4, name: "Скин: Лягушка", emoji: "🐸", desc: "Уникальный облик", price: 300, type: "skin" },
  { id: 5, name: "Скин: Робот", emoji: "🤖", desc: "Будущее уже здесь", price: 500, type: "skin" },
  { id: 6, name: "Двойные монеты", emoji: "💰", desc: "+100% монет 1 час", price: 150, type: "boost" },
  { id: 7, name: "Щит-панцирь", emoji: "🛡️", desc: "Поглощает 1 удар", price: 80, type: "power" },
  { id: 8, name: "Радужный трейл", emoji: "🌈", desc: "Особый эффект движения", price: 400, type: "skin" },
];

const StarRating = ({ stars, max = 3 }: { stars: number; max?: number }) => (
  <div style={{ display: "flex", gap: "3px" }}>
    {Array.from({ length: max }).map((_, i) => (
      <span key={i} style={{ color: i < stars ? "#ffd700" : "#444", fontSize: "10px" }}>★</span>
    ))}
  </div>
);

const FloatingCoins = () => (
  <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${10 + i * 12}%`,
          bottom: "-40px",
          fontSize: "20px",
          opacity: 0.15,
          animation: `floatUp ${3 + i * 0.7}s linear infinite`,
          animationDelay: `${i * 0.4}s`,
        }}
      >
        🪙
      </div>
    ))}
  </div>
);

export default function Index() {
  const [tab, setTab] = useState<Tab>("home");
  const [coins, setCoins] = useState(1337);
  const [selectedEnemy, setSelectedEnemy] = useState<number | null>(null);
  const [purchasedItems, setPurchasedItems] = useState<number[]>([]);
  const [blink, setBlink] = useState(true);
  const [shopFilter, setShopFilter] = useState<string>("all");
  const [showEditor, setShowEditor] = useState(false);
  const [showLobby, setShowLobby]   = useState(false);
  const [gameState, setGameState]   = useState<{
    grid: TileId[][];
    lbpMode: boolean;
    roomId: string;
    skin: string;
    name: string;
    preset: string;
    objectProps?: ObjProps;
  } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 600);
    return () => clearInterval(t);
  }, []);

  const handleBuy = (itemId: number, price: number) => {
    if (coins >= price && !purchasedItems.includes(itemId)) {
      setCoins(c => c - price);
      setPurchasedItems(p => [...p, itemId]);
    }
  };

  const filteredShop = shopFilter === "all" ? SHOP_ITEMS : SHOP_ITEMS.filter(i => i.type === shopFilter);

  const handleLobbyStart = (opts: { lbpMode: boolean; roomId: string; skin: string; name: string; levelPreset: string }) => {
    const grid = genLevel(opts.levelPreset);
    setGameState({ grid, lbpMode: opts.lbpMode, roomId: opts.roomId, skin: opts.skin, name: opts.name, preset: opts.levelPreset });
    setShowLobby(false);
  };

  const px = (obj: React.CSSProperties) => obj;

  return (
    <div style={px({ minHeight: "100vh", color: "#fff", position: "relative", overflow: "hidden", background: "linear-gradient(180deg,#1a0a2e 0%,#16213e 40%,#0f3460 100%)", fontFamily: "'Press Start 2P',monospace", imageRendering: "pixelated" })}>
      {showEditor && (
        <LevelEditor
          onClose={() => setShowEditor(false)}
          onPlay={(grid, objectProps) => {
            setGameState({ grid, lbpMode: false, roomId: "", skin: "🍄", name: "Игрок", preset: "custom", objectProps });
            setShowEditor(false);
          }}
        />
      )}
      {showLobby && !gameState && (
        <GameLobby onStart={handleLobbyStart} onClose={() => setShowLobby(false)} />
      )}
      {gameState && (
        <GameEngine
          grid={gameState.grid}
          levelName={gameState.preset === "custom" ? "МОЙ УРОВЕНЬ" : `${gameState.preset.toUpperCase()} — ${gameState.lbpMode ? "LBP2 MODE" : "MARIO MODE"}`}
          lbpMode={gameState.lbpMode}
          roomId={gameState.roomId || undefined}
          playerName={gameState.name}
          playerSkin={gameState.skin}
          objectProps={gameState.objectProps}
          onExit={() => setGameState(null)}
          onWin={(c) => setCoins(prev => prev + c * 10)}
        />
      )}
      <FloatingCoins />

      {/* Scanlines */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 10, opacity: 0.04, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.5) 2px,rgba(0,0,0,0.5) 4px)" }} />

      {/* Stars */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} style={{ position: "absolute", width: "2px", height: "2px", background: "#fff", borderRadius: "50%", left: `${(i * 37 + 5) % 97}%`, top: `${(i * 23 + 7) % 65}%`, animation: `twinkle ${1.5 + (i % 5) * 0.4}s ease-in-out infinite`, animationDelay: `${(i % 7) * 0.3}s`, opacity: 0.6 }} />
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 20, maxWidth: "860px", margin: "0 auto", padding: "0 16px 100px" }}>

        {/* HEADER */}
        <header style={{ textAlign: "center", padding: "32px 0 16px" }}>
          <div style={{ fontSize: "clamp(20px,5vw,42px)", fontWeight: "bold", color: "#ffd700", textShadow: "4px 4px 0 #c0392b,8px 8px 0 #000", letterSpacing: "2px", animation: "titlePulse 2s ease-in-out infinite", display: "inline-block" }}>
            MARIO WORLD 2
          </div>
          <div style={{ fontFamily: "'VT323',monospace", fontSize: "20px", color: "#e74c3c", marginTop: "8px", letterSpacing: "4px" }}>
            ★ SUPER ADVENTURE EDITION ★
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginTop: "12px", background: "#1a1a2e", border: "3px solid #ffd700", boxShadow: "3px 3px 0 #000", padding: "6px 14px", color: "#ffd700", fontSize: "10px" }}>
            🪙 {coins.toLocaleString()} МОНЕТ
          </div>
        </header>

        {/* NAV */}
        <nav style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "28px", flexWrap: "wrap" }}>
          {([ { id: "home", label: "ГЛАВНАЯ", emoji: "🏠" }, { id: "levels", label: "УРОВНИ", emoji: "🗺️" }, { id: "leaderboard", label: "РЕЙТИНГ", emoji: "🏆" }, { id: "shop", label: "МАГАЗИН", emoji: "🛒" } ] as {id: Tab; label: string; emoji: string}[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? "#e74c3c" : "#16213e", border: `3px solid ${tab === t.id ? "#ffd700" : "#e74c3c"}`, boxShadow: tab === t.id ? "3px 3px 0 #ffd700" : "3px 3px 0 #000", color: tab === t.id ? "#ffd700" : "#fff", padding: "8px 12px", cursor: "pointer", fontFamily: "'Press Start 2P',monospace", fontSize: "8px", transform: tab === t.id ? "translateY(-2px)" : "none", transition: "all 0.1s" }}>
              {t.emoji} {t.label}
            </button>
          ))}
          <button onClick={() => setShowEditor(true)} style={{ background: "#1a0a2e", border: "3px solid #ffd700", boxShadow: "3px 3px 0 #ffd700", color: "#ffd700", padding: "8px 12px", cursor: "pointer", fontFamily: "'Press Start 2P',monospace", fontSize: "8px", animation: "bossPulse 2s ease-in-out infinite" }}>
            🏗️ РЕДАКТОР
          </button>
        </nav>

        {/* ═══════════ HOME ═══════════ */}
        {tab === "home" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

            {/* Hero card */}
            <div style={{ border: "4px solid #ffd700", boxShadow: "4px 4px 0 #000,inset 0 0 0 2px rgba(255,255,255,0.05)", background: "rgba(22,33,62,0.97)", padding: "32px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "64px", animation: "bounce 1s ease-in-out infinite", display: "inline-block" }}>🍄</div>
              <div style={{ fontFamily: "'VT323',monospace", fontSize: "24px", color: "#ffd700", margin: "12px 0 8px", letterSpacing: "2px" }}>
                {blink ? "▶ НАЖМИ СТАРТ" : "   НАЖМИ СТАРТ"}
              </div>
              <div style={{ fontSize: "8px", color: "#aaa", lineHeight: "2.2", marginBottom: "20px" }}>
                ПРИНЦЕССА В ОПАСНОСТИ!<br />
                БОУЗЕР ПОХИТИЛ ЕЁ СНОВА...<br />
                ТЫ ЕДИНСТВЕННАЯ НАДЕЖДА!
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => setShowLobby(true)} style={{ background: "#e74c3c", border: "4px solid #ffd700", boxShadow: "4px 4px 0 #000", color: "#ffd700", padding: "12px 24px", cursor: "pointer", fontFamily: "'Press Start 2P',monospace", fontSize: "11px", transition: "transform 0.1s" }}
                  onMouseDown={e => (e.currentTarget.style.transform = "translateY(2px)")}
                  onMouseUp={e => (e.currentTarget.style.transform = "none")}>
                  ▶ ИГРАТЬ
                </button>
                <button onClick={() => { handleLobbyStart({ lbpMode: true, roomId: "", skin: "🧶", name: "Сакбой", levelPreset: "plains" }); }} style={{ background: "#8B6914", border: "4px solid #ffd700", boxShadow: "4px 4px 0 #000", color: "#ffd700", padding: "12px 20px", cursor: "pointer", fontFamily: "'Press Start 2P',monospace", fontSize: "9px" }}>
                  🧶 LBP2
                </button>
              </div>
            </div>

            {/* Enemies */}
            <div>
              <div style={{ textAlign: "center", color: "#e74c3c", fontSize: "9px", marginBottom: "12px", letterSpacing: "3px" }}>— БЕСТИАРИЙ ВРАГОВ —</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: "10px" }}>
                {ENEMIES.map(enemy => (
                  <button key={enemy.id} onClick={() => setSelectedEnemy(selectedEnemy === enemy.id ? null : enemy.id)}
                    style={{ background: selectedEnemy === enemy.id ? `${enemy.color}33` : "#16213e", border: `3px solid ${enemy.isBoss ? "#ffd700" : enemy.color}`, boxShadow: "3px 3px 0 #000", padding: "12px", cursor: "pointer", textAlign: "left", animation: enemy.isBoss ? "bossPulse 1.5s ease-in-out infinite" : "none" }}>
                    <div style={{ fontSize: "28px", marginBottom: "6px" }}>{enemy.emoji}</div>
                    <div style={{ fontSize: "7px", color: enemy.isBoss ? "#ffd700" : "#fff", marginBottom: "2px" }}>
                      {enemy.isBoss && "⚠️ "}{enemy.name}
                    </div>
                    {selectedEnemy === enemy.id && (
                      <div style={{ fontSize: "7px", marginTop: "6px", lineHeight: "1.8" }}>
                        <div style={{ color: "#e74c3c" }}>HP: {enemy.hp}</div>
                        <div style={{ color: "#e67e22" }}>ATK: {enemy.atk}</div>
                        <div style={{ color: "#aaa", marginTop: "4px" }}>{enemy.desc}</div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", textAlign: "center" }}>
              {[{ label: "УРОВНЕЙ", value: "6", icon: "🗺️" }, { label: "ВРАГОВ", value: "5+", icon: "👾" }, { label: "БОССОВ", value: "3", icon: "🐲" }].map(s => (
                <div key={s.label} style={{ background: "#16213e", border: "3px solid #e74c3c", boxShadow: "3px 3px 0 #000", padding: "12px 8px" }}>
                  <div style={{ fontSize: "24px", marginBottom: "4px" }}>{s.icon}</div>
                  <div style={{ fontFamily: "'VT323',monospace", fontSize: "22px", color: "#ffd700" }}>{s.value}</div>
                  <div style={{ fontSize: "6px", color: "#aaa" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════ LEVELS ═══════════ */}
        {tab === "levels" && (
          <div>
            <div style={{ textAlign: "center", color: "#e74c3c", fontSize: "9px", marginBottom: "16px", letterSpacing: "3px" }}>— КАРТА МИРА —</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: "12px" }}>
              {LEVELS.map((level, idx) => (
                <div key={level.id} style={{ background: level.unlocked ? "#16213e" : "#0d0d1a", border: `3px solid ${level.unlocked ? level.color : "#2a2a3a"}`, boxShadow: level.unlocked ? "3px 3px 0 #000" : "none", padding: "16px", opacity: level.unlocked ? 1 : 0.5, animation: `fadeInUp 0.3s ease-out ${idx * 0.08}s both` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "32px" }}>{level.icon}</span>
                      <div>
                        <div style={{ fontSize: "6px", color: level.unlocked ? "#ffd700" : "#555", marginBottom: "4px" }}>МИР {level.world}</div>
                        <div style={{ fontSize: "8px", color: level.unlocked ? "#fff" : "#444" }}>{level.name}</div>
                        <div style={{ marginTop: "6px" }}><StarRating stars={level.stars} /></div>
                      </div>
                    </div>
                    {level.unlocked ? (
                      <button onClick={() => handleLobbyStart({ lbpMode: false, roomId: "", skin: "🍄", name: "Игрок", levelPreset: ["plains","cave","sky","volcano","sky","castle"][level.id - 1] || "plains" })}
                        style={{ background: "#e74c3c", border: "2px solid #ffd700", boxShadow: "2px 2px 0 #000", color: "#ffd700", padding: "6px 10px", fontSize: "7px", cursor: "pointer", fontFamily: "'Press Start 2P',monospace" }}>▶</button>
                    ) : (
                      <span style={{ fontSize: "20px" }}>🔒</span>
                    )}
                  </div>
                  {level.unlocked && (
                    <div style={{ marginTop: "10px", display: "flex", gap: "6px" }}>
                      <span style={{ background: "#0d0d1a", border: "2px solid #2a2a3a", padding: "2px 6px", fontSize: "6px", color: "#aaa" }}>💎 {(level.id * 12500).toLocaleString()}</span>
                      <span style={{ background: "#0d0d1a", border: "2px solid #2a2a3a", padding: "2px 6px", fontSize: "6px", color: "#ffd700" }}>🪙 x{level.id * 10}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Progress */}
            <div style={{ marginTop: "20px", border: "3px solid #e74c3c", boxShadow: "3px 3px 0 #000", padding: "16px", background: "#16213e" }}>
              <div style={{ fontSize: "7px", color: "#aaa", marginBottom: "8px" }}>ПРОГРЕСС КАМПАНИИ</div>
              <div style={{ background: "#0d0d1a", border: "2px solid #2a2a3a", height: "16px", position: "relative" }}>
                <div style={{ width: "50%", height: "100%", background: "linear-gradient(90deg,#e74c3c,#ffd700)", animation: "progressFill 1.5s ease-out" }} />
              </div>
              <div style={{ fontSize: "8px", color: "#ffd700", marginTop: "6px", textAlign: "right" }}>3 / 6 УРОВНЕЙ</div>
            </div>
          </div>
        )}

        {/* ═══════════ LEADERBOARD ═══════════ */}
        {tab === "leaderboard" && (
          <div>
            <div style={{ textAlign: "center", color: "#e74c3c", fontSize: "9px", marginBottom: "16px", letterSpacing: "3px" }}>— ТАБЛИЦА ЧЕМПИОНОВ —</div>
            <div style={{ border: "3px solid #ffd700", boxShadow: "4px 4px 0 #000", overflow: "hidden" }}>
              <div style={{ background: "#e74c3c", padding: "10px 16px", display: "grid", gridTemplateColumns: "44px 1fr 90px 70px", gap: "8px", fontSize: "7px", color: "#ffd700" }}>
                <span>#</span><span>ИГРОК</span><span>ОЧКИ</span><span>🪙</span>
              </div>
              {LEADERBOARD.map((player, i) => (
                <div key={player.rank} style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "44px 1fr 90px 70px", gap: "8px", alignItems: "center", borderBottom: "2px solid #0d0d1a", background: player.isYou ? "rgba(231,76,60,0.25)" : i % 2 === 0 ? "#16213e" : "#1a2744", animation: `fadeInUp 0.3s ease-out ${i * 0.06}s both` }}>
                  <span style={{ fontSize: "16px" }}>{player.crown}</span>
                  <div>
                    <div style={{ fontSize: "8px", color: player.isYou ? "#ffd700" : "#fff" }}>{player.name}</div>
                    {player.isYou && <div style={{ fontSize: "6px", color: "#e74c3c", marginTop: "2px" }}>◀ ЭТО ТЫ</div>}
                  </div>
                  <span style={{ fontFamily: "'VT323',monospace", fontSize: "14px", color: "#27ae60" }}>{player.score.toLocaleString()}</span>
                  <span style={{ fontFamily: "'VT323',monospace", fontSize: "14px", color: "#ffd700" }}>{player.coins.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "12px", background: "#16213e", border: "3px solid #e74c3c", boxShadow: "3px 3px 0 #000", padding: "12px", textAlign: "center", fontSize: "7px", color: "#aaa" }}>
              🔄 ОБНОВЛЕНИЕ КАЖДЫЕ 24 ЧАСА
              <br />
              <span style={{ color: "#ffd700", fontSize: "6px" }}>СЛЕДУЮЩЕЕ: 18:00 МСК</span>
            </div>
          </div>
        )}

        {/* ═══════════ SHOP ═══════════ */}
        {tab === "shop" && (
          <div>
            <div style={{ textAlign: "center", color: "#e74c3c", fontSize: "9px", marginBottom: "12px", letterSpacing: "3px" }}>— МАГАЗИН ПРИКЛЮЧЕНИЙ —</div>

            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
              {[{ id: "all", label: "ВСЁ" }, { id: "power", label: "СИЛА" }, { id: "skin", label: "СКИНЫ" }, { id: "boost", label: "БУСТ" }].map(f => (
                <button key={f.id} onClick={() => setShopFilter(f.id)} style={{ background: shopFilter === f.id ? "#e74c3c" : "#16213e", border: `2px solid ${shopFilter === f.id ? "#ffd700" : "#e74c3c"}`, color: shopFilter === f.id ? "#ffd700" : "#fff", padding: "5px 12px", fontSize: "7px", cursor: "pointer", fontFamily: "'Press Start 2P',monospace", boxShadow: "2px 2px 0 #000" }}>
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ background: "#16213e", border: "3px solid #ffd700", boxShadow: "3px 3px 0 #000", padding: "10px", textAlign: "center", fontSize: "11px", color: "#ffd700", marginBottom: "16px", fontFamily: "'VT323',monospace" }}>
              🪙 БАЛАНС: {coins.toLocaleString()} МОНЕТ
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: "12px" }}>
              {filteredShop.map((item, i) => {
                const bought = purchasedItems.includes(item.id);
                const canAfford = coins >= item.price;
                return (
                  <div key={item.id} style={{ background: bought ? "rgba(39,174,96,0.15)" : "#16213e", border: `3px solid ${bought ? "#27ae60" : canAfford ? "#e74c3c" : "#2a2a3a"}`, boxShadow: "3px 3px 0 #000", padding: "14px", textAlign: "center", animation: `fadeInUp 0.3s ease-out ${i * 0.06}s both` }}>
                    <div style={{ fontSize: "34px", marginBottom: "6px" }}>{item.emoji}</div>
                    <div style={{ fontSize: "7px", color: "#fff", marginBottom: "4px", lineHeight: "1.6" }}>{item.name}</div>
                    <div style={{ fontSize: "6px", color: "#888", marginBottom: "8px", lineHeight: "1.5" }}>{item.desc}</div>
                    <div style={{ fontFamily: "'VT323',monospace", fontSize: "14px", color: "#ffd700", marginBottom: "8px" }}>🪙 {item.price}</div>
                    <button onClick={() => handleBuy(item.id, item.price)} disabled={bought || !canAfford}
                      style={{ background: bought ? "#27ae60" : canAfford ? "#e74c3c" : "#2a2a3a", border: `2px solid ${bought ? "#2ecc71" : canAfford ? "#ffd700" : "#444"}`, color: bought ? "#fff" : canAfford ? "#ffd700" : "#555", padding: "5px 8px", fontSize: "6px", cursor: bought || !canAfford ? "default" : "pointer", fontFamily: "'Press Start 2P',monospace", width: "100%", boxShadow: bought || !canAfford ? "none" : "2px 2px 0 #000" }}>
                      {bought ? "✓ КУПЛЕНО" : canAfford ? "КУПИТЬ" : "МАЛО 🪙"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30, display: "flex", justifyContent: "space-around", alignItems: "center", background: "#0d0d1a", borderTop: "4px solid #e74c3c", boxShadow: "0 -4px 0 #000", padding: "8px 0" }}>
        {([ { id: "home", emoji: "🏠", label: "ГЛАВНАЯ" }, { id: "levels", emoji: "🗺️", label: "УРОВНИ" }, { id: "leaderboard", emoji: "🏆", label: "РЕЙТИНГ" }, { id: "shop", emoji: "🛒", label: "МАГАЗИН" } ] as {id: Tab; emoji: string; label: string}[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", background: "none", border: "none", cursor: "pointer", padding: "4px 10px" }}>
            <span style={{ fontSize: "20px" }}>{t.emoji}</span>
            <span style={{ fontSize: "5px", fontFamily: "'Press Start 2P',monospace", color: tab === t.id ? "#ffd700" : "#555" }}>{t.label}</span>
          </button>
        ))}
        <button onClick={() => setShowLobby(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", background: "none", border: "none", cursor: "pointer", padding: "4px 10px" }}>
          <span style={{ fontSize: "20px" }}>▶️</span>
          <span style={{ fontSize: "5px", fontFamily: "'Press Start 2P',monospace", color: "#e74c3c" }}>ИГРАТЬ</span>
        </button>
        <button onClick={() => setShowEditor(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", background: "none", border: "none", cursor: "pointer", padding: "4px 10px" }}>
          <span style={{ fontSize: "20px" }}>🏗️</span>
          <span style={{ fontSize: "5px", fontFamily: "'Press Start 2P',monospace", color: "#ffd700" }}>РЕДАКТОР</span>
        </button>
      </div>

      <style>{`
        @keyframes floatUp { 0%{transform:translateY(0);opacity:0.15} 100%{transform:translateY(-100vh);opacity:0} }
        @keyframes twinkle { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:1;transform:scale(1.5)} }
        @keyframes titlePulse { 0%,100%{text-shadow:4px 4px 0 #c0392b,8px 8px 0 #000} 50%{text-shadow:4px 4px 0 #e74c3c,8px 8px 0 #000,0 0 24px #ffd700} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes bossPulse { 0%,100%{border-color:#ffd700;box-shadow:3px 3px 0 #000} 50%{border-color:#e74c3c;box-shadow:3px 3px 0 #e74c3c,0 0 18px rgba(231,76,60,0.5)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes progressFill { from{width:0%} to{width:50%} }
      `}</style>
    </div>
  );
}