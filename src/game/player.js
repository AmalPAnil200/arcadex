// ============================================================
//  PLAYER — handles movement, on-foot and in-car states
// ============================================================
import { TILE_SIZE, WORLD_MAP, WALKABLE_TILES } from './world.js';

export const PLAYER_SPEED      = 2.4;   // px per frame on foot
export const PLAYER_RUN_SPEED  = 4.0;
export const CAR_MAX_SPEED     = 5.5;
export const CAR_ACCEL         = 0.18;
export const CAR_FRICTION      = 0.88;
export const CAR_TURN_SPEED    = 0.055;

export function createPlayer(x, y) {
  return {
    x, y,
    angle: 0,         // radians
    speed: 0,
    inCar: false,
    car: null,        // reference to car entity
    health: 100,
    cash: 0,
    wanted: 0,        // 0-5 stars
    wantedTimer: 0,
    spriteFrame: 0,
    animTimer: 0,
  };
}

// Is world tile at pixel (x,y) walkable?
function isTileWalkable(x, y) {
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);
  if (row < 0 || col < 0 || row >= WORLD_MAP.length || col >= (WORLD_MAP[0]?.length ?? 0)) return false;
  const tile = WORLD_MAP[row]?.[col] ?? -1;
  return WALKABLE_TILES.has(tile);
}

// Resolve axis-aligned movement with collision
function moveWithCollision(entity, dx, dy, radius) {
  const nx = entity.x + dx;
  const ny = entity.y + dy;
  const pts = [
    [nx - radius, ny - radius],
    [nx + radius, ny - radius],
    [nx + radius, ny + radius],
    [nx - radius, ny + radius],
  ];
  const xOk = pts.every(([px, py]) => isTileWalkable(px, entity.y));
  const yOk = pts.every(([px, py]) => isTileWalkable(entity.x, py));
  if (xOk) entity.x = nx;
  if (yOk) entity.y = ny;
}

export function updatePlayer(player, input, dt) {
  player.animTimer += dt;

  if (player.inCar) {
    updateCarDriving(player, input, dt);
  } else {
    updateOnFoot(player, input, dt);
  }

  // Wanted decay when not shooting
  if (player.wantedTimer > 0) {
    player.wantedTimer -= dt;
    if (player.wantedTimer <= 0) {
      player.wanted = Math.max(0, player.wanted - 1);
      if (player.wanted > 0) player.wantedTimer = 600;
    }
  }
}

function updateOnFoot(player, input, dt) {
  const spd = input.sprint ? PLAYER_RUN_SPEED : PLAYER_SPEED;
  let dx = 0, dy = 0;

  if (input.up)    dy -= spd;
  if (input.down)  dy += spd;
  if (input.left)  dx -= spd;
  if (input.right) dx += spd;

  if (dx && dy) { dx *= 0.707; dy *= 0.707; }

  if (dx || dy) {
    player.angle = Math.atan2(dy, dx);
    moveWithCollision(player, dx, dy, 10);
    // animate walk
    if (player.animTimer > 8) {
      player.spriteFrame = (player.spriteFrame + 1) % 4;
      player.animTimer = 0;
    }
  }
}

function updateCarDriving(player, input, dt) {
  const car = player.car;
  if (!car) { player.inCar = false; return; }

  // Accelerate / brake
  if (input.up)   car.speed = Math.min(CAR_MAX_SPEED, car.speed + CAR_ACCEL);
  if (input.down) car.speed = Math.max(-CAR_MAX_SPEED * 0.5, car.speed - CAR_ACCEL * 1.5);

  // Turn (only when moving)
  if (Math.abs(car.speed) > 0.1) {
    const dir = car.speed > 0 ? 1 : -1;
    if (input.left)  car.angle -= CAR_TURN_SPEED * dir;
    if (input.right) car.angle += CAR_TURN_SPEED * dir;
  }

  // Friction
  car.speed *= CAR_FRICTION;
  if (Math.abs(car.speed) < 0.05) car.speed = 0;

  // Move car
  const vx = Math.cos(car.angle) * car.speed;
  const vy = Math.sin(car.angle) * car.speed;
  moveWithCollision(car, vx, vy, 18);

  // Sync player to car center
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
}

// Draw player sprite (top-down, simple geometric)
export function drawPlayer(ctx, player, camera, tick) {
  const sx = player.x - camera.x;
  const sy = player.y - camera.y;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(player.angle + Math.PI / 2);

  if (player.inCar) {
    // Draw car
    const car = player.car;
    drawCar(ctx, car, tick);
  } else {
    drawCharacter(ctx, player, tick);
  }

  ctx.restore();

  // Shadow
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(sx, sy + (player.inCar ? 4 : 8), player.inCar ? 18 : 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCharacter(ctx, player, tick) {
  const bob = Math.sin(tick * 0.25) * 1.5;

  // Body
  ctx.fillStyle = '#ff6b35';
  ctx.fillRect(-5, -10 + bob, 10, 14);

  // Head
  ctx.fillStyle = '#f8c94a';
  ctx.beginPath();
  ctx.arc(0, -14 + bob, 6, 0, Math.PI * 2);
  ctx.fill();

  // Legs (animated)
  ctx.fillStyle = '#3a3a5c';
  const legPhase = Math.sin(tick * 0.3) * 4;
  ctx.fillRect(-4, 4 + bob, 4, 6 + legPhase);
  ctx.fillRect(0,  4 + bob, 4, 6 - legPhase);

  // Arms
  ctx.fillStyle = '#f8c94a';
  ctx.fillRect(-8, -8 + bob, 3, 8);
  ctx.fillRect(5,  -8 + bob, 3, 8);
}

export function drawCar(ctx, car, tick) {
  const colors = car?.color ?? ['#e0304a', '#ff6080'];
  const [bodyColor, roofColor] = colors;

  // Car body
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-18, -10, 36, 20, 4);
  ctx.fill();

  // Roof / cabin
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.roundRect(-11, -8, 22, 16, 3);
  ctx.fill();

  // Windshields
  ctx.fillStyle = 'rgba(100,200,255,0.5)';
  ctx.fillRect(-9, -7, 18, 5);
  ctx.fillRect(-9, 2, 18, 5);

  // Headlights
  const hlGlow = 0.8 + 0.2 * Math.sin(tick * 0.1);
  ctx.fillStyle = `rgba(255,240,150,${hlGlow})`;
  ctx.fillRect(-16, -9, 6, 4);
  ctx.fillRect(10, -9, 6, 4);

  // Tail lights
  ctx.fillStyle = 'rgba(255,50,50,0.9)';
  ctx.fillRect(-16, 5, 6, 4);
  ctx.fillRect(10, 5, 6, 4);

  // Wheels
  ctx.fillStyle = '#1a1a2a';
  [[-14, -10], [14, -10], [-14, 10], [14, 10]].forEach(([wx, wy]) => {
    ctx.fillRect(wx - 3, wy - 4, 6, 8);
  });
}
