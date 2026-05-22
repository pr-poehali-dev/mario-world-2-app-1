import { useEffect, useRef, useState, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const TILE = 40;          // px per tile
const GRAVITY = 0.55;
const JUMP_FORCE = -13;
const MOVE_SPEED = 4.2;
const MAX_FALL = 18;
const SESSION_URL = "https://functions.poehali.dev/738d3c0c-d723-46dc-a600-b5c34e1bff95";

// ─── Solid tiles (player stands on them) ─────────────────────────────────────
const SOLID = new Set([1, 2, 3, 4, 5, 16]);
const DEADLY = new Set([6, 9, 15]);   // cactus, piranha, lava
const COIN_TILE = new Set([10, 13]);  // star, coin
const WIN_TILE  = 11;
const START_TILE = 12;

// ─── Tile visuals ─────────────────────────────────────────────────────────────
const TILE_BG: Record<number, string> = {
  0:  "transparent",
  1:  "#8B4513",  2:  "#27ae60",  3:  "#c0392b",
  4:  "#f39c12",  5:  "#7f8c8d",  6:  "#2ecc71",
  7:  "#e74c3c",  8:  "#16a085",  9:  "#8e44ad",
  10: "#ffd700",  11: "#ecf0f1",  12: "#3498db",
  13: "#f1c40f",  14: "#2980b9",  15: "#e67e22",
  16: "#9b59b6",  17: "#e91e63",  18: "#2c3e50",
  19: "#ff6b6b",
};
const TILE_EMOJI: Record<number, string> = {
  0:"", 1:"🟫", 2:"🟩", 3:"🧱", 4:"❓", 5:"🪨",
  6:"🌵", 7:"🍄", 8:"🐢", 9:"🌺", 10:"⭐",
  11:"🏁", 12:"🚀", 13:"💰", 14:"🌊", 15:"🔥",
  16:"🏰", 17:"🌸", 18:"💣", 19:"🌈",
};

// ─── LBP2 skins ───────────────────────────────────────────────────────────────
export const SKINS = [
  { id: "sack",    emoji: "🧶", name: "Сакбой",     lbp: true  },
  { id: "mario",   emoji: "🍄", name: "Марио",      lbp: false },
  { id: "frog",    emoji: "🐸", name: "Лягушка",    lbp: false },
  { id: "robot",   emoji: "🤖", name: "Робот",      lbp: true  },
  { id: "cat",     emoji: "🐱", name: "Котик",      lbp: true  },
  { id: "alien",   emoji: "👾", name: "Пришелец",   lbp: true  },
  { id: "ninja",   emoji: "🥷", name: "Ниндзя",     lbp: true  },
  { id: "ghost",   emoji: "👻", name: "Призрак",    lbp: true  },
  { id: "star",    emoji: "⭐", name: "Звезда",     lbp: true  },
  { id: "dino",    emoji: "🦕", name: "Динозавр",   lbp: false },
];

// ─── Types ───────────────────────────────────────────────────────────────────
interface Vec2 { x: number; y: number; }

interface PlayerState {
  pos: Vec2;
  vel: Vec2;
  onGround: boolean;
  facing: 1 | -1;
  anim: "idle" | "run" | "jump" | "fall" | "dead" | "win";
  hp: number;
  coins: number;
  iFrames: number;
}

interface RemotePlayer {
  id: string;
  name: string;
  skin: string;
  x: number;
  y: number;
  vx: number;
  anim: string;
}

interface Enemy {
  id: number;
  tileId: number;
  x: number;
  y: number;
  vx: number;
  alive: boolean;
}

interface Particle {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  emoji: string;
  color: string;
}

type ObjProps = Record<string, Record<string, number>>;

interface Props {
  grid: number[][];
  levelName?: string;
  lbpMode?: boolean;
  roomId?: string;
  playerName?: string;
  playerSkin?: string;
  objectProps?: ObjProps;
  onExit: () => void;
  onWin?: (coins: number) => void;
}

// ─── Game Engine ─────────────────────────────────────────────────────────────
export default function GameEngine({
  grid, levelName = "Уровень", lbpMode = false,
  roomId, playerName = "Игрок", playerSkin = "🍄",
  objectProps = {},
  onExit, onWin,
}: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const stateRef   = useRef<PlayerState>({
    pos: { x: TILE, y: TILE },
    vel: { x: 0, y: 0 },
    onGround: false,
    facing: 1,
    anim: "idle",
    hp: 3,
    coins: 0,
    iFrames: 0,
  });
  const keysRef       = useRef<Set<string>>(new Set());
  const camRef        = useRef<Vec2>({ x: 0, y: 0 });
  const enemiesRef    = useRef<Enemy[]>([]);
  const particlesRef  = useRef<Particle[]>([]);
  const remotesRef    = useRef<RemotePlayer[]>([]);
  const frameRef      = useRef(0);
  const pidRef        = useRef(`p_${Math.random().toString(36).slice(2, 8)}`);
  const animFrameRef  = useRef(0);
  const tickRef       = useRef(0);
  const spawnPosRef   = useRef<Vec2>({ x: TILE, y: TILE });
  const tickFnRef     = useRef<() => void>(() => {});
  const drawFnRef     = useRef<() => void>(() => {});

  const [overlayMsg, setOverlayMsg] = useState<string | null>(null);
  const [hudHp, setHudHp]           = useState(3);
  const [hudCoins, setHudCoins]     = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);

  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  // ── Build enemy list from grid ──────────────────────────────────────────────
  const initEnemies = useCallback(() => {
    const defaultSpeed: Record<number, number> = { 7: 1, 8: 1.5, 9: 1, 18: 1 };
    const list: Enemy[] = [];
    grid.forEach((row, r) => row.forEach((t, c) => {
      if ([7, 8, 9, 18].includes(t)) {
        const props = objectProps[`${r}_${c}`] ?? {};
        const speed = (props.speed ?? defaultSpeed[t]) as number;
        list.push({ id: r * 1000 + c, tileId: t, x: c * TILE, y: r * TILE, vx: speed, alive: true });
      }
    }));
    enemiesRef.current = list;
  }, [grid, objectProps]);

  // ── Find start position ─────────────────────────────────────────────────────
  const findStart = useCallback((): Vec2 => {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (grid[r][c] === START_TILE) return { x: c * TILE, y: (r - 1) * TILE };
    }
    return { x: TILE, y: TILE };
  }, [grid, rows, cols]);

  // ── Collision helpers ───────────────────────────────────────────────────────
  const tileAt = (px: number, py: number) => {
    const c = Math.floor(px / TILE);
    const r = Math.floor(py / TILE);
    if (r < 0 || r >= rows || c < 0 || c >= cols) return 0;
    return grid[r][c];
  };

  const isSolid = (px: number, py: number) => SOLID.has(tileAt(px, py));

  // ── Spawn particle ──────────────────────────────────────────────────────────
  const spawnParticles = (x: number, y: number, emoji: string, color: string, n = 5) => {
    for (let i = 0; i < n; i++) {
      particlesRef.current.push({
        id: Math.random(),
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 7 - 2,
        life: 30 + Math.random() * 20,
        emoji, color,
      });
    }
  };

  // ── Physics tick ────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const s  = stateRef.current;
    const keys = keysRef.current;
    if (s.anim === "dead" || s.anim === "win") return;

    // Horizontal
    let dx = 0;
    if (keys.has("ArrowLeft")  || keys.has("KeyA") || keys.has("_left"))  dx -= MOVE_SPEED;
    if (keys.has("ArrowRight") || keys.has("KeyD") || keys.has("_right")) dx += MOVE_SPEED;
    if (dx !== 0) s.facing = dx > 0 ? 1 : -1;

    s.vel.x = dx;
    s.vel.y = Math.min(s.vel.y + GRAVITY, MAX_FALL);

    // Jump
    if ((keys.has("ArrowUp") || keys.has("KeyW") || keys.has("Space") || keys.has("_jump")) && s.onGround) {
      s.vel.y = JUMP_FORCE;
      s.onGround = false;
    }

    // ── X collision ────────────────────────────────────────────────────────
    const W_HALF = 14, H_BODY = 28;
    let nx = s.pos.x + s.vel.x;
    const blocked_x = () =>
      isSolid(nx - W_HALF, s.pos.y + 2) || isSolid(nx + W_HALF, s.pos.y + 2) ||
      isSolid(nx - W_HALF, s.pos.y + H_BODY) || isSolid(nx + W_HALF, s.pos.y + H_BODY);

    if (blocked_x()) { nx = s.pos.x; s.vel.x = 0; }
    // Clamp to level bounds
    nx = Math.max(W_HALF, Math.min(cols * TILE - W_HALF, nx));
    s.pos.x = nx;

    // ── Y collision ────────────────────────────────────────────────────────
    let ny = s.pos.y + s.vel.y;
    s.onGround = false;

    if (s.vel.y > 0) {
      // Falling — check feet
      if (
        isSolid(s.pos.x - W_HALF + 2, ny + H_BODY) ||
        isSolid(s.pos.x + W_HALF - 2, ny + H_BODY)
      ) {
        ny = Math.floor((ny + H_BODY) / TILE) * TILE - H_BODY;
        s.vel.y = 0;
        s.onGround = true;
      }
    } else if (s.vel.y < 0) {
      // Rising — check head
      if (
        isSolid(s.pos.x - W_HALF + 2, ny) ||
        isSolid(s.pos.x + W_HALF - 2, ny)
      ) {
        ny = Math.ceil(ny / TILE) * TILE;
        // Bonk Q-block?
        const headTile = tileAt(s.pos.x, ny - 2);
        if (headTile === 4) {
          const qr = Math.floor((ny - 2) / TILE);
          const qc = Math.floor(s.pos.x / TILE);
          const qVal = objectProps[`${qr}_${qc}`]?.value ?? 1;
          spawnParticles(s.pos.x, ny, "🪙", "#ffd700", Math.min(qVal + 2, 8));
          s.coins += qVal;
          setHudCoins(s.coins);
        }
        s.vel.y = 0;
      }
    }

    // Fall into void → respawn
    if (ny > rows * TILE + 80) {
      s.hp--;
      setHudHp(s.hp);
      if (s.hp <= 0) { s.anim = "dead"; setOverlayMsg("💀 ГЕМ ОВЕР"); return; }
      const sp = spawnPosRef.current;
      s.pos.x = sp.x; s.pos.y = sp.y; s.vel.x = 0; s.vel.y = 0;
      spawnParticles(sp.x, sp.y, "💔", "#e74c3c", 4);
      return;
    }

    s.pos.y = ny;

    // ── Tile interactions ──────────────────────────────────────────────────
    const cx = Math.floor(s.pos.x / TILE);
    const cy = Math.floor((s.pos.y + H_BODY / 2) / TILE);
    const centerTile = cy >= 0 && cy < rows && cx >= 0 && cx < cols ? grid[cy][cx] : 0;

    if (DEADLY.has(centerTile) && s.iFrames === 0) {
      s.hp--; setHudHp(s.hp); s.iFrames = 80;
      spawnParticles(s.pos.x, s.pos.y, "💔", "#e74c3c", 6);
      if (s.hp <= 0) { s.anim = "dead"; setOverlayMsg("💀 ГЕМ ОВЕР"); return; }
    }

    if (COIN_TILE.has(centerTile)) {
      const coinVal = objectProps[`${cy}_${cx}`]?.value ?? 1;
      s.coins += coinVal; setHudCoins(s.coins);
      spawnParticles(s.pos.x, s.pos.y, "🪙", "#ffd700", Math.min(coinVal + 2, 8));
    }

    if (centerTile === WIN_TILE) {
      s.anim = "win";
      setOverlayMsg("🎉 УРОВЕНЬ ПРОЙДЕН!");
      onWin?.(s.coins);
    }

    // ── iFrames ────────────────────────────────────────────────────────────
    if (s.iFrames > 0) s.iFrames--;

    // ── Animation state ────────────────────────────────────────────────────
    if (!s.onGround)      s.anim = s.vel.y < 0 ? "jump" : "fall";
    else if (dx !== 0)    s.anim = "run";
    else                  s.anim = "idle";

    // ── Enemies ────────────────────────────────────────────────────────────
    enemiesRef.current.forEach(e => {
      if (!e.alive) return;
      e.x += e.vx;
      const er = Math.floor(e.y / TILE), ec = Math.floor(e.x / TILE);
      const ahead_c = Math.floor((e.x + e.vx * 12) / TILE);
      const floorR  = er + 1;
      const floorT  = (floorR < rows && ahead_c >= 0 && ahead_c < cols) ? grid[floorR][ahead_c] : 1;
      const wallT   = (ec >= 0 && ec < cols) ? grid[er][ec] : 0;
      if (!SOLID.has(floorT) || SOLID.has(wallT)) e.vx *= -1;

      // Stomp
      const ex = e.x + TILE / 2, ey = e.y;
      const pdx = Math.abs(s.pos.x - ex), pdy = s.pos.y + H_BODY - ey;
      if (pdx < 22 && pdy > 0 && pdy < 16 && s.vel.y > 0) {
        e.alive = false;
        s.vel.y = JUMP_FORCE * 0.6;
        s.coins++;
        setHudCoins(s.coins);
        spawnParticles(ex, ey, "💥", "#e74c3c", 6);
      } else if (pdx < 20 && Math.abs(s.pos.y + H_BODY / 2 - (ey + TILE / 2)) < 22 && s.iFrames === 0) {
        s.hp--; setHudHp(s.hp); s.iFrames = 80;
        spawnParticles(s.pos.x, s.pos.y, "💔", "#e74c3c", 5);
        if (s.hp <= 0) { s.anim = "dead"; setOverlayMsg("💀 ГЕМ ОВЕР"); }
      }
    });

    // ── Particles ──────────────────────────────────────────────────────────
    particlesRef.current = particlesRef.current
      .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.3, life: p.life - 1 }))
      .filter(p => p.life > 0);

    // ── Camera ────────────────────────────────────────────────────────────
    const canvas = canvasRef.current;
    if (canvas) {
      const cx_ = s.pos.x - canvas.width / 2;
      const cy_ = s.pos.y - canvas.height / 2;
      camRef.current.x += (cx_ - camRef.current.x) * 0.12;
      camRef.current.y += (cy_ - camRef.current.y) * 0.12;
      camRef.current.x = Math.max(0, Math.min(cols * TILE - canvas.width, camRef.current.x));
      camRef.current.y = Math.max(0, Math.min(rows * TILE - canvas.height, camRef.current.y));
    }
  }, [cols, rows, grid, findStart, onWin, objectProps]);

  // keep tickFnRef current so the loop never needs tick as a dependency
  useEffect(() => { tickFnRef.current = tick; });

  // ── Draw ───────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const cam = camRef.current;
    const s   = stateRef.current;
    frameRef.current++;
    const f = frameRef.current;

    // Sky gradient (LBP mode = warm beige)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (lbpMode) {
      skyGrad.addColorStop(0, "#d4a574"); skyGrad.addColorStop(1, "#8B6914");
    } else {
      skyGrad.addColorStop(0, "#0f3460"); skyGrad.addColorStop(1, "#16213e");
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars (non-LBP only)
    if (!lbpMode) {
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      for (let i = 0; i < 20; i++) {
        const sx = ((i * 137 + 11) % canvas.width);
        const sy = ((i * 97  + 7)  % (canvas.height * 0.6));
        const blink = Math.sin(f * 0.05 + i) > 0 ? 1 : 0.3;
        ctx.globalAlpha = blink;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // ── Draw tiles ───────────────────────────────────────────────────────
    const startC = Math.floor(cam.x / TILE);
    const endC   = Math.min(cols, startC + Math.ceil(canvas.width / TILE) + 2);
    const startR = Math.floor(cam.y / TILE);
    const endR   = Math.min(rows, startR + Math.ceil(canvas.height / TILE) + 2);

    for (let r = startR; r < endR; r++) {
      for (let c = startC; c < endC; c++) {
        const t = grid[r][c];
        if (t === 0) continue;
        const tx = c * TILE, ty = r * TILE;

        // LBP fabric texture
        if (lbpMode && SOLID.has(t)) {
          ctx.fillStyle = t === 2 ? "#6d4c41" : t === 1 ? "#5d4037" : TILE_BG[t] || "#555";
          ctx.fillRect(tx, ty, TILE, TILE);
          // Stitch pattern
          ctx.strokeStyle = "rgba(255,255,255,0.15)";
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(tx + 3, ty + 3, TILE - 6, TILE - 6);
          ctx.setLineDash([]);
        } else {
          ctx.fillStyle = TILE_BG[t] || "#555";
          ctx.fillRect(tx, ty, TILE, TILE);
          // Shine
          ctx.fillStyle = "rgba(255,255,255,0.08)";
          ctx.fillRect(tx, ty, TILE, TILE / 3);
        }

        // Q-block wobble
        const emoji = TILE_EMOJI[t] || "";
        if (emoji) {
          ctx.font = t === 4
            ? `${20 + Math.floor(Math.sin(f * 0.08 + c) * 2)}px serif`
            : "18px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          // Water wave
          const wobble = t === 14 ? Math.sin(f * 0.1 + c * 0.5) * 3 : 0;
          ctx.fillText(emoji, tx + TILE / 2, ty + TILE / 2 + wobble);
        }
      }
    }

    // ── Draw enemies ─────────────────────────────────────────────────────
    enemiesRef.current.forEach(e => {
      if (!e.alive) return;
      const bounce = Math.abs(Math.sin(f * 0.12 + e.id)) * 3;
      ctx.font = "26px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.save();
      if (e.vx < 0) { ctx.scale(-1, 1); ctx.fillText(TILE_EMOJI[e.tileId] || "👾", -(e.x + TILE / 2), e.y + TILE - bounce); }
      else           { ctx.fillText(TILE_EMOJI[e.tileId] || "👾", e.x + TILE / 2, e.y + TILE - bounce); }
      ctx.restore();
    });

    // ── Draw remote players (online co-op) ───────────────────────────────
    remotesRef.current.forEach(rp => {
      const bounce = rp.anim === "run" ? Math.sin(f * 0.2) * 3 : 0;
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y + 32, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "28px serif";
      ctx.textAlign = "center";
      ctx.fillText(rp.skin, rp.x, rp.y + 30 + bounce);
      // Name badge
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.fillStyle = "#ffd700";
      ctx.fillText(rp.name.slice(0, 6), rp.x, rp.y - 6);
    });

    // ── Draw player ──────────────────────────────────────────────────────
    const { pos, vel, anim, facing, iFrames } = s;
    const px = pos.x, py = pos.y;

    // i-frame blink
    if (iFrames === 0 || Math.floor(iFrames / 6) % 2 === 0) {
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(px, py + 29, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bob animation
      const runBob = anim === "run" ? Math.sin(f * 0.25) * 4 : 0;
      const jumpStretch = anim === "jump" ? -3 : anim === "fall" ? 3 : 0;

      ctx.save();
      ctx.translate(px, py + 14 + runBob);
      if (facing === -1) ctx.scale(-1, 1);

      // LBP sackboy fabric shading
      if (lbpMode) {
        ctx.fillStyle = "#795548";
        ctx.beginPath();
        ctx.ellipse(0, 0 + jumpStretch, 14, 16 + Math.abs(jumpStretch), 0, 0, Math.PI * 2);
        ctx.fill();
        // Zipper
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -8); ctx.lineTo(0, 8);
        ctx.stroke();
        // Eyes
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.ellipse(-5, -3, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(5, -3, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.ellipse(-4, -2, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(6, -2, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        // Pixel player (emoji style)
        ctx.font = `${30 + Math.abs(jumpStretch)}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(playerSkin, 0, 0);
      }

      ctx.restore();
    }

    // ── Particles ────────────────────────────────────────────────────────
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life / 50;
      ctx.font = "14px serif";
      ctx.textAlign = "center";
      ctx.fillText(p.emoji, p.x, p.y);
    });
    ctx.globalAlpha = 1;

    ctx.restore();
  }, [grid, lbpMode, playerSkin, cols, rows]);

  // keep drawFnRef current
  useEffect(() => { drawFnRef.current = draw; });

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const sp = findStart();
    spawnPosRef.current = { ...sp };
    stateRef.current.pos = { ...sp };
    stateRef.current.vel = { x: 0, y: 0 };
    stateRef.current.hp    = 3;
    stateRef.current.coins = 0;
    stateRef.current.anim  = "idle";
    setHudHp(3);
    setHudCoins(0);
    setOverlayMsg(null);
    initEnemies();

    let running = true;
    const loop = () => {
      if (!running) return;
      tickRef.current++;
      tickFnRef.current();
      drawFnRef.current();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(animFrameRef.current); };
  }, [grid, findStart, initEnemies]); // tick/draw убраны — они обновляются через рефы

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => { e.preventDefault(); keysRef.current.add(e.code); };
    const up   = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup",   up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // ── Canvas resize ──────────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width  = Math.min(window.innerWidth,  860);
      canvas.height = Math.min(window.innerHeight - 180, 480);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── Online multiplayer polling ─────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    const pid = pidRef.current;
    let alive = true;

    const poll = async () => {
      if (!alive) return;
      const s = stateRef.current;
      try {
        const res = await fetch(SESSION_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "state", room_id: roomId,
            player_id: pid, name: playerName, skin: playerSkin,
            x: Math.round(s.pos.x), y: Math.round(s.pos.y),
            vx: Math.round(s.vel.x), anim: s.anim,
          }),
        });
        const data = await res.json();
        if (data.players) {
          remotesRef.current = data.players;
          setOnlineCount(data.players.length + 1);
        }
      } catch (_) { /* offline */ }
      if (alive) setTimeout(poll, 400);
    };
    poll();

    return () => {
      alive = false;
      fetch(SESSION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave", room_id: roomId, player_id: pid }),
      }).catch(() => {});
    };
  }, [roomId, playerName, playerSkin]);

  // ── Mobile button helpers ──────────────────────────────────────────────────
  const pressKey  = (k: string) => keysRef.current.add(k);
  const releaseKey = (k: string) => keysRef.current.delete(k);

  const MobileBtn = ({
    label, keyCode, style = {},
  }: { label: string; keyCode: string; style?: React.CSSProperties }) => (
    <button
      onPointerDown={e => { e.preventDefault(); pressKey(keyCode); }}
      onPointerUp={e => { e.preventDefault(); releaseKey(keyCode); }}
      onPointerLeave={e => { e.preventDefault(); releaseKey(keyCode); }}
      style={{
        width: 56, height: 56,
        background: "rgba(255,255,255,0.12)",
        border: "3px solid rgba(255,255,255,0.3)",
        borderRadius: 8,
        color: "#fff",
        fontSize: 20,
        cursor: "pointer",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 0 rgba(0,0,0,0.4)",
        fontFamily: "serif",
        ...style,
      }}
    >
      {label}
    </button>
  );

  const restartGame = () => {
    const sp = spawnPosRef.current;
    stateRef.current = {
      pos: { ...sp }, vel: { x: 0, y: 0 },
      onGround: false, facing: 1, anim: "idle",
      hp: 3, coins: 0, iFrames: 0,
    };
    setHudHp(3); setHudCoins(0); setOverlayMsg(null);
    initEnemies();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: lbpMode ? "#2c1810" : "#0a0a1a",
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "'Press Start 2P', monospace",
    }}>
      {/* HUD */}
      <div style={{
        width: "100%", maxWidth: 860,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 14px", background: "rgba(0,0,0,0.7)",
        borderBottom: `3px solid ${lbpMode ? "#8B6914" : "#e74c3c"}`,
        gap: 8, flexWrap: "wrap",
      }}>
        <div style={{ fontSize: 9, color: "#ffd700" }}>{levelName}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 9 }}>
            {"❤️".repeat(Math.max(0, hudHp))}{"🖤".repeat(Math.max(0, 3 - hudHp))}
          </span>
          <span style={{ fontSize: 9, color: "#ffd700" }}>🪙 {hudCoins}</span>
          {roomId && <span style={{ fontSize: 7, color: "#27ae60" }}>🌐 {onlineCount} онлайн</span>}
          {lbpMode && <span style={{ fontSize: 7, color: "#ff9800" }}>🧶 LBP2</span>}
        </div>
        <button onClick={onExit} style={{
          background: "#c0392b", border: "2px solid #ffd700",
          color: "#ffd700", padding: "4px 10px", fontSize: 7,
          cursor: "pointer", fontFamily: "'Press Start 2P',monospace",
          boxShadow: "2px 2px 0 #000",
        }}>✕ ВЫХОД</button>
      </div>

      {/* Canvas */}
      <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
        <canvas ref={canvasRef} style={{
          display: "block",
          imageRendering: "pixelated",
          border: `3px solid ${lbpMode ? "#8B6914" : "#e74c3c"}`,
          boxShadow: lbpMode ? "0 0 30px #8B691466" : "0 0 30px #e74c3c33",
        }} />

        {/* Overlay */}
        {overlayMsg && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.75)",
          }}>
            <div style={{ fontSize: "clamp(12px,3vw,22px)", color: "#ffd700", textShadow: "3px 3px 0 #000", marginBottom: 24, textAlign: "center" }}>
              {overlayMsg}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={restartGame} style={{
                background: "#27ae60", border: "3px solid #2ecc71",
                color: "#fff", padding: "10px 20px", fontSize: 9,
                cursor: "pointer", fontFamily: "'Press Start 2P',monospace",
                boxShadow: "3px 3px 0 #000",
              }}>🔄 СНОВА</button>
              <button onClick={onExit} style={{
                background: "#c0392b", border: "3px solid #e74c3c",
                color: "#fff", padding: "10px 20px", fontSize: 9,
                cursor: "pointer", fontFamily: "'Press Start 2P',monospace",
                boxShadow: "3px 3px 0 #000",
              }}>🚪 ВЫХОД</button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div style={{
        width: "100%", maxWidth: 860,
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        padding: "8px 16px 12px",
        background: "rgba(0,0,0,0.6)",
        borderTop: `3px solid ${lbpMode ? "#8B6914" : "#e74c3c"}`,
      }}>
        {/* D-pad */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <MobileBtn label="▲" keyCode="_jump" />
          <div style={{ display: "flex", gap: 4 }}>
            <MobileBtn label="◀" keyCode="_left" />
            <MobileBtn label="▶" keyCode="_right" />
          </div>
        </div>

        {/* Center info */}
        <div style={{ textAlign: "center", fontSize: 6, color: "#555", lineHeight: 1.8 }}>
          <div>⌨️ WASD / Стрелки</div>
          <div>SPACE — прыжок</div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <MobileBtn label="🦘" keyCode="_jump" style={{ background: "rgba(231,76,60,0.4)", borderColor: "#e74c3c", width: 64, height: 64, fontSize: 24 }} />
          <div style={{ display: "flex", gap: 4 }}>
            <MobileBtn label="🔄" keyCode="" style={{ width: 40, height: 40, fontSize: 14 }} />
          </div>
        </div>
      </div>
    </div>
  );
}