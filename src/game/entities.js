// ============================================================
//  ENTITIES — NPCs, police cruisers, ambient traffic, pickups
// ============================================================
import { TILE_SIZE, WORLD_MAP, WALKABLE_TILES, CAR_SPAWNS } from './world.js';
import { drawCar } from './player.js';

// ─── NPC Pedestrian ─────────────────────────────────────────
const NPC_COLORS = ['#4fc3f7','#81c784','#ffb74d','#f06292','#ce93d8'];

export function createNPC(x, y, id) {
  return {
    id, x, y,
    angle: Math.random() * Math.PI * 2,
    speed: 1.0 + Math.random() * 0.8,
    color: NPC_COLORS[id % NPC_COLORS.length],
    changeTimer: Math.random() * 120,
    fleeing: false,
    fleeTimer: 0,
    alive: true,
  };
}

function isTileWalkable(x, y) {
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);
  if (row < 0 || col < 0 || row >= WORLD_MAP.length || col >= (WORLD_MAP[0]?.length ?? 0)) return false;
  return WALKABLE_TILES.has(WORLD_MAP[row]?.[col] ?? -1);
}

export function updateNPC(npc, playerX, playerY, wantedLevel) {
  npc.changeTimer--;
  if (npc.changeTimer <= 0) {
    npc.angle = Math.random() * Math.PI * 2;
    npc.changeTimer = 80 + Math.random() * 120;
  }

  // Flee if player has wanted level
  const dist = Math.hypot(npc.x - playerX, npc.y - playerY);
  if (wantedLevel > 0 && dist < 180) {
    npc.fleeing = true;
    npc.fleeTimer = 120;
    npc.angle = Math.atan2(npc.y - playerY, npc.x - playerX);
  }
  if (npc.fleeing) {
    npc.fleeTimer--;
    if (npc.fleeTimer <= 0) npc.fleeing = false;
  }

  const spd = npc.fleeing ? npc.speed * 2.2 : npc.speed;
  const dx = Math.cos(npc.angle) * spd;
  const dy = Math.sin(npc.angle) * spd;

  const nx = npc.x + dx;
  const ny = npc.y + dy;
  if (isTileWalkable(nx, npc.y)) npc.x = nx;
  else npc.angle += Math.PI / 2;
  if (isTileWalkable(npc.x, ny)) npc.y = ny;
  else npc.angle += Math.PI / 2;
}

export function drawNPC(ctx, npc, camera, tick) {
  const sx = npc.x - camera.x;
  const sy = npc.y - camera.y;
  if (sx < -32 || sx > camera.w + 32 || sy < -32 || sy > camera.h + 32) return;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(npc.angle + Math.PI / 2);

  const bob = Math.sin(tick * 0.2 + npc.id) * 1.5;

  // Body
  ctx.fillStyle = npc.color;
  ctx.fillRect(-4, -8 + bob, 8, 12);
  // Head
  ctx.fillStyle = '#f8c94a';
  ctx.beginPath();
  ctx.arc(0, -12 + bob, 5, 0, Math.PI * 2);
  ctx.fill();
  // Legs
  ctx.fillStyle = '#333';
  const lp = Math.sin(tick * 0.25 + npc.id) * 3;
  ctx.fillRect(-3, 4 + bob, 3, 5 + lp);
  ctx.fillRect(0, 4 + bob, 3, 5 - lp);

  // Exclamation if fleeing
  if (npc.fleeing) {
    ctx.restore();
    ctx.save();
    ctx.translate(sx, sy - 20);
    ctx.font = 'bold 12px Orbitron';
    ctx.fillStyle = '#ffe01b';
    ctx.textAlign = 'center';
    ctx.fillText('!', 0, 0);
  }

  ctx.restore();
}

// ─── Traffic Car ─────────────────────────────────────────────
const CAR_PALETTE = [
  ['#e0304a','#ff6080'],
  ['#1a6ee0','#4090ff'],
  ['#e0a020','#ffd050'],
  ['#20a060','#50e090'],
  ['#8020c0','#b050f0'],
  ['#e05010','#ff8040'],
];

export function createTrafficCar(col, row, id) {
  const palette = CAR_PALETTE[id % CAR_PALETTE.length];
  return {
    id, type: 'traffic',
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
    angle: [0, Math.PI/2, Math.PI, -Math.PI/2][id % 4],
    speed: 1.5 + Math.random(),
    color: palette,
    occupied: false,  // true when player is inside
    alive: true,
    honkTimer: 0,
  };
}

export function updateTrafficCar(car) {
  if (car.occupied) return; // AI disabled when player drives

  const vx = Math.cos(car.angle) * car.speed;
  const vy = Math.sin(car.angle) * car.speed;
  const nx = car.x + vx;
  const ny = car.y + vy;

  if (isTileWalkable(nx, car.y)) car.x = nx;
  else { car.angle += Math.PI / 2; car.honkTimer = 30; }
  if (isTileWalkable(car.x, ny)) car.y = ny;
  else { car.angle += Math.PI / 2; car.honkTimer = 30; }
}

export function drawTrafficCar(ctx, car, camera, tick) {
  const sx = car.x - camera.x;
  const sy = car.y - camera.y;
  if (sx < -64 || sx > camera.w + 64 || sy < -64 || sy > camera.h + 64) return;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(car.angle + Math.PI / 2);
  drawCar(ctx, car, tick);
  ctx.restore();

  // Shadow
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 6, 18, 5, car.angle, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ─── Police Cruiser ──────────────────────────────────────────
export function createPoliceCar(x, y, id) {
  return {
    id, type: 'police',
    x, y,
    targetX: x, targetY: y,
    angle: 0,
    speed: 0,
    color: ['#1a3aaa', '#4466dd'],
    alive: true,
    sirenPhase: Math.random() * Math.PI * 2,
  };
}

export function updatePoliceCar(cop, player) {
  // Chase player
  const dx = player.x - cop.x;
  const dy = player.y - cop.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return;

  const targetAngle = Math.atan2(dy, dx);
  let diff = targetAngle - cop.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  cop.angle += diff * 0.08;

  const spd = Math.min(3.5, dist * 0.05 + 1.5);
  const vx = Math.cos(cop.angle) * spd;
  const vy = Math.sin(cop.angle) * spd;
  if (isTileWalkable(cop.x + vx, cop.y)) cop.x += vx;
  if (isTileWalkable(cop.x, cop.y + vy)) cop.y += vy;
}

export function drawPoliceCar(ctx, cop, camera, tick) {
  const sx = cop.x - camera.x;
  const sy = cop.y - camera.y;
  if (sx < -64 || sx > camera.w + 64 || sy < -64 || sy > camera.h + 64) return;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(cop.angle + Math.PI / 2);
  drawCar(ctx, cop, tick);

  // Siren lights
  cop.sirenPhase += 0.2;
  const s1 = Math.sin(cop.sirenPhase) > 0;
  ctx.fillStyle = s1 ? '#ff2d78' : 'rgba(255,45,120,0.2)';
  ctx.beginPath(); ctx.arc(-6, -8, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = !s1 ? '#00f5ff' : 'rgba(0,245,255,0.2)';
  ctx.beginPath(); ctx.arc(6, -8, 4, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// ─── Pickups ─────────────────────────────────────────────────
export function createPickup(x, y, type) {
  return { x, y, type, alive: true, bobTimer: Math.random() * Math.PI * 2 };
}

export function drawPickup(ctx, pickup, camera, tick) {
  const sx = pickup.x - camera.x;
  const sy = pickup.y - camera.y;
  if (sx < -32 || sx > camera.w + 32 || sy < -32 || sy > camera.h + 32) return;

  pickup.bobTimer += 0.05;
  const bob = Math.sin(pickup.bobTimer) * 3;

  ctx.save();
  ctx.translate(sx, sy + bob);

  // Glow
  const glowColor = pickup.type === 'cash' ? '#ffe01b' : pickup.type === 'health' ? '#00e676' : '#ff2d78';
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 14;

  if (pickup.type === 'cash') {
    ctx.fillStyle = '#ffe01b';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('$', 0, 6);
  } else if (pickup.type === 'health') {
    ctx.fillStyle = '#00e676';
    ctx.fillRect(-6, -2, 12, 4);
    ctx.fillRect(-2, -6, 4, 12);
  } else if (pickup.type === 'wanted') {
    ctx.fillStyle = '#ff2d78';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('★', 0, 6);
  }

  ctx.restore();
}

// ─── Explosion VFX ───────────────────────────────────────────
export function createExplosion(x, y) {
  return {
    x, y, timer: 0, maxTimer: 45,
    particles: Array.from({ length: 14 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 2 + Math.random() * 4,
      life: 1,
    })),
  };
}

export function updateAndDrawExplosion(ctx, exp, camera) {
  exp.timer++;
  const t = exp.timer / exp.maxTimer;
  const sx = exp.x - camera.x;
  const sy = exp.y - camera.y;

  // Shockwave
  ctx.save();
  ctx.globalAlpha = (1 - t) * 0.5;
  ctx.strokeStyle = '#ff6b00';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(sx, sy, t * 60, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Core flash
  ctx.save();
  ctx.globalAlpha = (1 - t) * 0.8;
  const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, (1 - t) * 35);
  grad.addColorStop(0, '#fff');
  grad.addColorStop(0.3, '#ffa500');
  grad.addColorStop(1, 'rgba(255,60,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(sx, sy, (1 - t) * 35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  for (const p of exp.particles) {
    p.life -= 0.025;
    p.speed *= 0.95;
    ctx.save();
    ctx.globalAlpha = p.life * (1 - t);
    ctx.fillStyle = p.life > 0.5 ? '#ffa500' : '#ff2d00';
    ctx.beginPath();
    ctx.arc(
      sx + Math.cos(p.angle) * p.speed * exp.timer,
      sy + Math.sin(p.angle) * p.speed * exp.timer,
      3 * p.life, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  return exp.timer >= exp.maxTimer;
}

// Initialize all entities for new game
export function initEntities(playerSpawn) {
  const npcs = Array.from({ length: 20 }, (_, i) =>
    createNPC(
      (7 + (i % 5) * 5) * TILE_SIZE,
      (1 + Math.floor(i / 5) * 5) * TILE_SIZE,
      i
    )
  );

  const cars = CAR_SPAWNS.map((sp, i) =>
    createTrafficCar(sp.x, sp.y, i)
  );

  const pickups = [
    createPickup(8.5 * TILE_SIZE, 9.5 * TILE_SIZE, 'cash'),
    createPickup(13.5 * TILE_SIZE, 4.5 * TILE_SIZE, 'cash'),
    createPickup(19.5 * TILE_SIZE, 19.5 * TILE_SIZE, 'cash'),
    createPickup(11.5 * TILE_SIZE, 6.5 * TILE_SIZE, 'health'),
    createPickup(21.5 * TILE_SIZE, 11.5 * TILE_SIZE, 'health'),
    createPickup(16.5 * TILE_SIZE, 16.5 * TILE_SIZE, 'wanted'),
  ];

  return { npcs, cars, police: [], pickups, explosions: [] };
}
