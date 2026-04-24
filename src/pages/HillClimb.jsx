import React, { useEffect, useRef, useCallback, useState } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const GRAVITY    = 0.5;
const FRICTION   = 0.985;
const MAX_SPEED  = 8;
const TILE_W     = 6;
const TERRAIN_LEN = 2800;
const FUEL_MAX   = 100;
const FUEL_DRAIN = 0.014;
const WHEEL_R    = 16;
const CHASSIS_HW = 36;  // half-width
const CHASSIS_HH = 18;  // half-height
const WHEEL_OFFSET_X = 26;
const WHEEL_OFFSET_Y = 14;

// ─── Terrain generation ───────────────────────────────────────────────────────
function generateTerrain(len, baseY) {
  const h = [];
  for (let i = 0; i < len; i++) {
    const x = i / len;
    const v =
      Math.sin(x * 15)   * 0.14 +
      Math.sin(x * 30)   * 0.07 +
      Math.sin(x * 60)   * 0.035 +
      Math.sin(x * 5   + 1) * 0.22 +
      Math.sin(x * 2.2 + 0.5) * 0.30;
    h.push(baseY + v * baseY * 0.55);
  }
  // Flat start
  for (let i = 0; i < 25; i++) h[i] = baseY + (h[25] - baseY) * (i / 25);
  return h;
}

function terrainY(heights, worldX) {
  const idx = worldX / TILE_W;
  const i = Math.floor(idx);
  const t = idx - i;
  const a = heights[Math.max(0, Math.min(i,   heights.length - 1))];
  const b = heights[Math.max(0, Math.min(i+1, heights.length - 1))];
  return a + (b - a) * t;
}

function terrainAngle(heights, worldX) {
  const y1 = terrainY(heights, worldX - TILE_W);
  const y2 = terrainY(heights, worldX + TILE_W);
  return Math.atan2(y2 - y1, TILE_W * 2);
}

// ─── Physics car ─────────────────────────────────────────────────────────────
function createCar(startX, startY) {
  return {
    x: startX, y: startY,
    vx: 0, vy: 0,
    angle: 0, angVel: 0,
    wr: { x: startX - WHEEL_OFFSET_X, y: startY + WHEEL_OFFSET_Y, spin: 0 },
    wf: { x: startX + WHEEL_OFFSET_X, y: startY + WHEEL_OFFSET_Y, spin: 0 },
    fuel: FUEL_MAX,
    dead: false,
    dist: 0,
    maxX: startX,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HillClimb({ onBack }) {
  const canvasRef  = useRef(null);
  const stateRef   = useRef(null);
  const rafRef     = useRef(null);
  const keysRef    = useRef({ gas: false, brake: false, leanFwd: false, leanBack: false });
  const bestRef    = useRef(0);

  const [hud, setHud]       = useState({ fuel: FUEL_MAX, dist: 0, coins: 0, dead: false });
  const [started, setStarted] = useState(false);
  const [bestDist, setBestDist] = useState(0);

  // ── Canvas dimensions ──────────────────────────────────────────────────────
  const getDims = () => {
    const c = canvasRef.current;
    if (!c) return { w: 900, h: 480 };
    return { w: c.width, h: c.height };
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  const initGame = useCallback(() => {
    const { w, h } = getDims();
    const baseY = h * 0.62;  // terrain baseline at 62% of canvas height
    const terrain = generateTerrain(TERRAIN_LEN, baseY);

    // Start position
    const startX = TILE_W * 12;
    const startTerrY = terrainY(terrain, startX);
    const car = createCar(startX, startTerrY - CHASSIS_HH - WHEEL_R - 4);

    // Coins / fuel cans
    const coins = [];
    for (let i = 80; i < TERRAIN_LEN - 20; i += 35 + Math.floor(Math.random() * 55)) {
      coins.push({ xi: i, collected: false });
    }

    stateRef.current = { terrain, car, coins, tick: 0, cameraX: 0, canvasH: h, canvasW: w };
  }, []);

  // ── Physics update ────────────────────────────────────────────────────────
  const update = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    const { car, terrain } = s;
    if (car.dead) return;

    const keys = keysRef.current;

    // Fuel
    if (keys.gas && car.fuel > 0) car.fuel = Math.max(0, car.fuel - FUEL_DRAIN);

    // Gravity
    car.vy += GRAVITY;

    // Acceleration / brake
    if (keys.gas && car.fuel > 0) {
      car.vx = Math.min(car.vx + 0.32, MAX_SPEED);
    } else if (keys.brake) {
      car.vx = Math.max(car.vx - 0.38, -MAX_SPEED * 0.4);
    }

    // Lean
    if (keys.leanFwd)  car.angVel += 0.022;
    if (keys.leanBack) car.angVel -= 0.022;

    // Friction
    car.vx *= FRICTION;

    // Move
    car.x  += car.vx;
    car.y  += car.vy;
    car.angle  += car.angVel;
    car.angVel *= 0.88;

    // Clamp x
    if (car.x < TILE_W * 5) { car.x = TILE_W * 5; car.vx = Math.abs(car.vx) * 0.3; }

    // Compute wheel world positions from chassis + angle
    const cosA = Math.cos(car.angle), sinA = Math.sin(car.angle);
    car.wr.x = car.x - cosA * WHEEL_OFFSET_X + sinA * WHEEL_OFFSET_Y;
    car.wr.y = car.y - sinA * WHEEL_OFFSET_X - cosA * WHEEL_OFFSET_Y;
    car.wf.x = car.x + cosA * WHEEL_OFFSET_X + sinA * WHEEL_OFFSET_Y;
    car.wf.y = car.y + sinA * WHEEL_OFFSET_X - cosA * WHEEL_OFFSET_Y;

    // Ground collision for each wheel
    let rGnd = false, fGnd = false;

    const resolveWheel = (w, isRear) => {
      const gy = terrainY(terrain, w.x);
      if (w.y + WHEEL_R >= gy) {
        const pen = (w.y + WHEEL_R) - gy;
        // Push chassis up proportionally
        car.y  -= pen * 0.65;
        if (car.vy > 0) car.vy *= -0.22;
        car.vy -= 0.5;
        // Align angle to slope
        const slope = terrainAngle(terrain, w.x);
        const delta = slope - car.angle;
        car.angle  += delta * 0.14;
        car.angVel *= 0.45;
        return true;
      }
      return false;
    };

    rGnd = resolveWheel(car.wr, true);
    fGnd = resolveWheel(car.wf, false);

    // Wheel spin
    const spinDelta = car.vx * 0.13;
    car.wr.spin += spinDelta;
    car.wf.spin += spinDelta;

    // Distance tracking
    if (car.x > car.maxX) {
      car.maxX = car.x;
      car.dist = Math.round((car.x - TILE_W * 12) / 5);
    }

    // Camera: keep car at 30% from left
    s.cameraX = car.x - s.canvasW * 0.3;
    if (s.cameraX < 0) s.cameraX = 0;

    // Coin collection
    for (const coin of s.coins) {
      if (coin.collected) continue;
      const cx = coin.xi * TILE_W;
      const cy = terrainY(terrain, cx) - 32;
      const dSq = (car.x - cx) ** 2 + (car.y - cy) ** 2;
      if (dSq < 38 * 38) {
        coin.collected = true;
        car.fuel = Math.min(FUEL_MAX, car.fuel + 22);
      }
    }

    // Death
    if (Math.abs(car.angle) > Math.PI * 0.7) car.dead = true;
    // Fell off bottom
    if (car.y > s.canvasH + 200) car.dead = true;

    s.tick++;
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  const render = useCallback(() => {
    const c = canvasRef.current;
    if (!c || !stateRef.current) return;
    const ctx = c.getContext('2d');
    const { terrain, car, coins, cameraX, tick } = stateRef.current;
    const W = c.width, H = c.height;

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#080820');
    sky.addColorStop(0.55, '#110840');
    sky.addColorStop(1, '#1e0d50');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (let i = 0; i < 70; i++) {
      const sx = ((i * 173.7 - cameraX * 0.03) % W + W) % W;
      const sy = (i * 61.3 + Math.sin(i * 2.1)) % (H * 0.55);
      ctx.globalAlpha = (0.3 + 0.7 * Math.abs(Math.sin(tick * 0.03 + i))) * 0.8;
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1.5, i % 3 === 0 ? 2 : 1.5);
    }
    ctx.globalAlpha = 1;

    // Background mountains
    ctx.fillStyle = 'rgba(25,10,55,0.85)';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + 10; x += 6) {
      const mx = x + cameraX * 0.14;
      const my = H * 0.42 - Math.sin(mx * 0.008) * 70 - Math.sin(mx * 0.02) * 35;
      x === 0 ? ctx.moveTo(x, my) : ctx.lineTo(x, my);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();

    // ── Terrain fill ──────────────────────────────────────────────────────
    const si = Math.max(0, Math.floor(cameraX / TILE_W) - 2);
    const ei = Math.min(terrain.length - 1, si + Math.ceil(W / TILE_W) + 4);

    ctx.beginPath();
    ctx.moveTo(si * TILE_W - cameraX, H + 10);
    for (let i = si; i <= ei; i++) {
      ctx.lineTo(i * TILE_W - cameraX, terrain[i]);
    }
    ctx.lineTo(ei * TILE_W - cameraX, H + 10);
    ctx.closePath();

    const tg = ctx.createLinearGradient(0, H * 0.55, 0, H);
    tg.addColorStop(0, '#3d2080');
    tg.addColorStop(0.2, '#261050');
    tg.addColorStop(1, '#100830');
    ctx.fillStyle = tg;
    ctx.fill();

    // Terrain top neon line
    ctx.beginPath();
    for (let i = si; i <= ei; i++) {
      const px = i * TILE_W - cameraX;
      const py = terrain[i];
      i === si ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#9c27b0';
    ctx.lineWidth   = 3;
    ctx.shadowColor = '#e040fb';
    ctx.shadowBlur  = 14;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Terrain surface texture stripes
    ctx.strokeStyle = 'rgba(180,100,255,0.12)';
    ctx.lineWidth   = 1;
    for (let i = si; i <= ei; i += 5) {
      const px = i * TILE_W - cameraX;
      ctx.beginPath();
      ctx.moveTo(px, terrain[i]);
      ctx.lineTo(px, terrain[i] + 30);
      ctx.stroke();
    }

    // ── Coins / fuel cans ────────────────────────────────────────────────
    for (const coin of coins) {
      if (coin.collected) continue;
      const cx = coin.xi * TILE_W - cameraX;
      if (cx < -40 || cx > W + 40) continue;
      const cy = terrainY(terrain, coin.xi * TILE_W) - 32;
      const bob = Math.sin(tick * 0.08 + coin.xi * 0.3) * 4;

      ctx.save();
      ctx.translate(cx, cy + bob);
      ctx.shadowColor = '#ff9100';
      ctx.shadowBlur  = 16;

      // Can body
      ctx.fillStyle = '#e65100';
      ctx.beginPath();
      ctx.roundRect(-9, -12, 18, 22, 3);
      ctx.fill();

      // Top
      ctx.fillStyle = '#ff6d00';
      ctx.fillRect(-6, -17, 12, 6);

      // Nozzle
      ctx.fillStyle = '#ffab40';
      ctx.fillRect(-2, -20, 4, 4);

      // Text
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 0;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⛽', 0, 8);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // ── Car ───────────────────────────────────────────────────────────────
    const carSX = car.x - cameraX;
    const carSY = car.y;

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle   = '#000';
    ctx.beginPath();
    ctx.ellipse(carSX, terrainY(terrain, car.x), 40, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Chassis
    ctx.save();
    ctx.translate(carSX, carSY);
    ctx.rotate(car.angle);

    // Body
    const bodyGrad = ctx.createLinearGradient(-CHASSIS_HW, -CHASSIS_HH, CHASSIS_HW, CHASSIS_HH);
    bodyGrad.addColorStop(0, '#ce93d8');
    bodyGrad.addColorStop(0.4, '#9c27b0');
    bodyGrad.addColorStop(1, '#6a1b9a');
    ctx.fillStyle   = bodyGrad;
    ctx.shadowColor = '#e040fb';
    ctx.shadowBlur  = 20;
    ctx.beginPath();
    ctx.roundRect(-CHASSIS_HW, -CHASSIS_HH, CHASSIS_HW * 2, CHASSIS_HH * 2, 7);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Cabin
    ctx.fillStyle = '#7b1fa2';
    ctx.beginPath();
    ctx.roundRect(-18, -CHASSIS_HH - 15, 36, 17, [7,7,0,0]);
    ctx.fill();

    // Window
    ctx.fillStyle = 'rgba(120,210,255,0.55)';
    ctx.beginPath();
    ctx.roundRect(-14, -CHASSIS_HH - 13, 28, 13, [6,6,0,0]);
    ctx.fill();

    // Headlight
    ctx.fillStyle   = '#ffe082';
    ctx.shadowColor = '#ffcc02';
    ctx.shadowBlur  = 16;
    ctx.beginPath();
    ctx.ellipse(CHASSIS_HW - 4, -4, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail light
    ctx.fillStyle   = '#ff1744';
    ctx.shadowColor = '#ff1744';
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.ellipse(-CHASSIS_HW + 4, -4, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Exhaust (fires when gassing)
    if (keysRef.current.gas && car.fuel > 0) {
      const fColors = ['#ff6d00','#ff9100','#ffcc02'];
      ctx.fillStyle   = fColors[tick % 3];
      ctx.shadowColor = '#ff6d00';
      ctx.shadowBlur  = 20;
      ctx.beginPath();
      ctx.ellipse(-CHASSIS_HW - 10 - Math.random() * 8, 4, 6 + Math.random() * 5, 4, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    // ── Wheels ────────────────────────────────────────────────────────────
    [car.wr, car.wf].forEach(w => {
      const wx = w.x - cameraX;
      const wy = w.y;
      ctx.save();
      ctx.translate(wx, wy);

      // Tire
      ctx.beginPath();
      ctx.arc(0, 0, WHEEL_R, 0, Math.PI * 2);
      ctx.fillStyle   = '#1a0030';
      ctx.shadowColor = '#7c4dff';
      ctx.shadowBlur  = 10;
      ctx.fill();
      ctx.strokeStyle = '#9c27b0';
      ctx.lineWidth   = 3.5;
      ctx.stroke();
      ctx.shadowBlur  = 0;

      // Tread
      ctx.strokeStyle = 'rgba(180,100,255,0.4)';
      ctx.lineWidth   = 1;
      for (let t = 0; t < 8; t++) {
        ctx.save();
        ctx.rotate(w.spin + (t / 8) * Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(WHEEL_R - 5, 0);
        ctx.lineTo(WHEEL_R + 1, 0);
        ctx.stroke();
        ctx.restore();
      }

      // Hub
      ctx.save();
      ctx.rotate(w.spin);
      // Spokes
      ctx.strokeStyle = '#ce93d8';
      ctx.lineWidth   = 2;
      for (let s = 0; s < 4; s++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, WHEEL_R - 2);
        ctx.stroke();
      }
      ctx.restore();

      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle   = '#e040fb';
      ctx.shadowColor = '#e040fb';
      ctx.shadowBlur  = 8;
      ctx.fill();
      ctx.shadowBlur  = 0;

      ctx.restore();
    });

    // ── Distance markers ─────────────────────────────────────────────────
    for (let m = 200; m < TERRAIN_LEN * TILE_W; m += 400) {
      const mx = m - cameraX;
      if (mx < 0 || mx > W) continue;
      const my = terrainY(terrain, m) - 22;
      ctx.save();
      ctx.font        = 'bold 12px Orbitron, sans-serif';
      ctx.fillStyle   = '#ffd740';
      ctx.shadowColor = '#ffd740';
      ctx.shadowBlur  = 8;
      ctx.textAlign   = 'center';
      ctx.fillText(`${Math.round((m - TILE_W * 12) / 5)}m`, mx, my);
      ctx.shadowBlur  = 0;
      ctx.restore();
    }

    // Dead overlay tint
    if (car.dead) {
      ctx.fillStyle = 'rgba(255,23,68,0.12)';
      ctx.fillRect(0, 0, W, H);
    }
  }, []);

  // ── Game loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!started) return;

    const c = canvasRef.current;
    if (c) {
      c.width  = c.parentElement?.clientWidth  ?? window.innerWidth;
      c.height = Math.min(500, window.innerHeight - 160);
    }
    initGame();

    let hudFrame = 0;
    function loop() {
      update();
      render();
      hudFrame++;
      if (hudFrame >= 6) {
        hudFrame = 0;
        const car = stateRef.current?.car;
        if (car) {
          if (car.dist > bestRef.current) { bestRef.current = car.dist; setBestDist(car.dist); }
          setHud(h => ({
            fuel: car.fuel,
            dist: car.dist,
            coins: stateRef.current.coins.filter(c => c.collected).length,
            dead: car.dead,
          }));
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [started, initGame, update, render]);

  // Canvas resize on window resize
  useEffect(() => {
    const onResize = () => {
      const c = canvasRef.current;
      if (!c || !started) return;
      c.width  = c.parentElement?.clientWidth ?? window.innerWidth;
      c.height = Math.min(500, window.innerHeight - 160);
      if (stateRef.current) {
        stateRef.current.canvasW = c.width;
        stateRef.current.canvasH = c.height;
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [started]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const dn = e => {
      if (e.key==='ArrowRight'||e.key==='d'||e.key==='D') keysRef.current.gas      = true;
      if (e.key==='ArrowLeft' ||e.key==='a'||e.key==='A') keysRef.current.brake    = true;
      if (e.key==='ArrowUp'   ||e.key==='w'||e.key==='W') keysRef.current.leanFwd  = true;
      if (e.key==='ArrowDown' ||e.key==='s'||e.key==='S') keysRef.current.leanBack = true;
    };
    const up = e => {
      if (e.key==='ArrowRight'||e.key==='d'||e.key==='D') keysRef.current.gas      = false;
      if (e.key==='ArrowLeft' ||e.key==='a'||e.key==='A') keysRef.current.brake    = false;
      if (e.key==='ArrowUp'   ||e.key==='w'||e.key==='W') keysRef.current.leanFwd  = false;
      if (e.key==='ArrowDown' ||e.key==='s'||e.key==='S') keysRef.current.leanBack = false;
    };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, []);

  const restart = useCallback(() => {
    const c = canvasRef.current;
    if (c) {
      c.width  = c.parentElement?.clientWidth  ?? window.innerWidth;
      c.height = Math.min(500, window.innerHeight - 160);
    }
    initGame();
    setHud({ fuel: FUEL_MAX, dist: 0, coins: 0, dead: false });
  }, [initGame]);

  const press   = k => () => { keysRef.current[k] = true;  };
  const release = k => () => { keysRef.current[k] = false; };

  const fuelPct   = Math.max(0, (hud.fuel / FUEL_MAX) * 100);
  const fuelColor = fuelPct > 50 ? '#69f0ae' : fuelPct > 25 ? '#ffd740' : '#ff5252';

  return (
    <div style={{ height:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)', flexShrink:0 }}>
        <button id="hill-back" onClick={onBack} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', borderRadius:8, padding:'7px 14px', fontSize:13, cursor:'pointer' }}>← Back</button>
        <span style={{ fontSize:20 }}>🚗</span>
        <h1 style={{ fontFamily:'var(--font-head)', fontSize:19, fontWeight:900, color:'#e040fb' }}>Hill Rider</h1>
        <div style={{ flex:1 }} />
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <Stat icon="📍" label={`${hud.dist}m`} color="#00e5ff" />
          <Stat icon="🏅" label={`${bestDist}m`} color="#ffd740" />
          <Stat icon="⛽" label={`${Math.round(fuelPct)}%`} color={fuelColor} />
          <Stat icon="⛽" label={`${hud.coins} cans`} color="#ff9100" />
        </div>
        <button id="hill-restart" onClick={restart} style={{ background:'rgba(224,64,251,0.15)', border:'1px solid rgba(224,64,251,0.4)', color:'#e040fb', borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:600, cursor:'pointer', marginLeft:4 }}>Restart</button>
      </div>

      {/* Fuel bar */}
      <div style={{ height:5, background:'rgba(255,255,255,0.06)', flexShrink:0 }}>
        <div style={{ height:'100%', width:`${fuelPct}%`, background:fuelColor, transition:'width 0.25s, background 0.4s', boxShadow:`0 0 8px ${fuelColor}66` }} />
      </div>

      {/* Game / Start */}
      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
        {!started ? (
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:22, background:'radial-gradient(ellipse at 50% 40%, rgba(224,64,251,0.14) 0%, transparent 70%)' }}>
            <div style={{ fontSize:68 }}>🚗</div>
            <h2 style={{ fontFamily:'var(--font-head)', fontSize:30, color:'#e040fb', textShadow:'0 0 20px #e040fb', margin:0 }}>Hill Rider</h2>
            <p style={{ color:'rgba(255,255,255,0.45)', fontSize:14, textAlign:'center', maxWidth:380, lineHeight:1.7, margin:'0 10px' }}>
              Drive over hilly terrain. Collect ⛽ fuel cans to keep going. How far can you ride?
            </p>
            <div style={{ display:'flex', gap:20, flexWrap:'wrap', justifyContent:'center', color:'rgba(255,255,255,0.35)', fontSize:13 }}>
              <span>→ / D — Gas</span><span>← / A — Brake</span>
              <span>↑ / W — Lean fwd</span><span>↓ / S — Lean back</span>
            </div>
            <button id="hill-start" onClick={() => setStarted(true)} style={{ padding:'15px 50px', fontFamily:'var(--font-head)', fontSize:17, fontWeight:900, letterSpacing:3, background:'linear-gradient(135deg,#e040fb,#7c4dff)', border:'none', color:'#fff', borderRadius:10, cursor:'pointer', boxShadow:'0 0 30px rgba(224,64,251,0.5)' }}>
              START RIDING
            </button>
          </div>
        ) : (
          <canvas ref={canvasRef} style={{ display:'block', width:'100%', height:'100%' }} />
        )}

        {/* Game over overlay */}
        {started && hud.dead && (
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14 }}>
            <div style={{ fontSize:52 }}>💥</div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:26, color:'#ff5252' }}>Crashed!</div>
            <div style={{ color:'rgba(255,255,255,0.6)', fontSize:15 }}>You rode <b style={{color:'#00e5ff'}}>{hud.dist}m</b></div>
            <div style={{ color:'rgba(255,255,255,0.4)', fontSize:13 }}>Best: <b style={{color:'#ffd740'}}>{bestDist}m</b></div>
            <button id="hill-tryagain" onClick={restart} style={{ marginTop:8, padding:'13px 38px', fontFamily:'var(--font-head)', fontSize:15, fontWeight:700, background:'linear-gradient(135deg,#e040fb,#7c4dff)', border:'none', color:'#fff', borderRadius:10, cursor:'pointer', letterSpacing:2 }}>TRY AGAIN</button>
          </div>
        )}

        {/* Mobile controls */}
        {started && (
          <div style={{ position:'absolute', bottom:12, left:0, right:0, display:'flex', justifyContent:'space-between', padding:'0 16px', pointerEvents:'none' }}>
            <div style={{ display:'flex', gap:8, pointerEvents:'all' }}>
              <MobileBtn id="btn-brake"    color="#00e5ff" label="◀ BRAKE"   onPress={press('brake')}    onRelease={release('brake')} />
              <MobileBtn id="btn-leanback" color="#ffd740" label="↙ BACK"    onPress={press('leanBack')} onRelease={release('leanBack')} />
            </div>
            <div style={{ display:'flex', gap:8, pointerEvents:'all' }}>
              <MobileBtn id="btn-leanfwd" color="#ffd740" label="FWD ↗"    onPress={press('leanFwd')}  onRelease={release('leanFwd')} />
              <MobileBtn id="btn-gas"     color="#e040fb" label="GAS ▶"    onPress={press('gas')}      onRelease={release('gas')} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, color }) {
  return (
    <div style={{ padding:'5px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, fontSize:12, fontFamily:'var(--font-head)', display:'flex', gap:6, alignItems:'center' }}>
      {icon} <span style={{ color }}>{label}</span>
    </div>
  );
}

function MobileBtn({ id, color, label, onPress, onRelease }) {
  return (
    <button id={id}
      onPointerDown={onPress} onPointerUp={onRelease} onPointerLeave={onRelease}
      style={{
        padding:'11px 16px', background:`${color}22`, border:`2px solid ${color}66`,
        borderRadius:10, color:'#fff', fontFamily:'var(--font-head)', fontSize:11,
        fontWeight:700, cursor:'pointer', boxShadow:`0 0 12px ${color}44`,
        userSelect:'none', WebkitUserSelect:'none', touchAction:'none',
      }}
    >{label}</button>
  );
}
