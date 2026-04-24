// ============================================================
//  GAME LOOP — orchestrates all systems
// ============================================================
import { TILE_SIZE, PLAYER_SPAWN, LOCATIONS } from './world.js';
import { createPlayer, updatePlayer, drawPlayer } from './player.js';
import { renderWorld } from './renderer.js';
import {
  initEntities,
  updateNPC, drawNPC,
  updateTrafficCar, drawTrafficCar,
  updatePoliceCar, drawPoliceCar,
  drawPickup,
  createPoliceCar, createExplosion,
  updateAndDrawExplosion,
} from './entities.js';
import { createInputManager } from './input.js';
import {
  playCashSound, playHealthSound, playCarEnterSound,
  playHonkSound, playWantedSound, playExplosionSound,
  startAmbience, stopAmbience,
} from './audio.js';

const PICKUP_RADIUS   = 20;
const CAR_ENTER_DIST  = 38;
const POLICE_SPAWN_DELAY = 300; // frames between cop spawns

export function startGame(canvas, onHudUpdate) {
  const ctx = canvas.getContext('2d');
  const inputMgr = createInputManager();
  const { state: input, consumeEnterPress } = inputMgr;

  // Game state
  const player = createPlayer(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
  const entities = initEntities(PLAYER_SPAWN);
  let tick = 0;
  let running = true;
  let policeSpawnTimer = 0;
  let currentLocation = '';
  let locationTimer = 0;
  let lastHudData = {};

  // Camera (viewport tracks player)
  const camera = { x: 0, y: 0, w: canvas.width, h: canvas.height };

  function updateCamera() {
    camera.w = canvas.width;
    camera.h = canvas.height;
    camera.x = player.x - camera.w / 2;
    camera.y = player.y - camera.h / 2;
    // Clamp camera to world bounds
    const worldW = 32 * TILE_SIZE;
    const worldH = 32 * TILE_SIZE;
    camera.x = Math.max(0, Math.min(worldW - camera.w, camera.x));
    camera.y = Math.max(0, Math.min(worldH - camera.h, camera.y));
  }

  // ── Update ────────────────────────────────────────────────
  function update() {
    tick++;

    // Enter/exit car
    if (consumeEnterPress()) {
      if (player.inCar) {
        // Exit car
        player.inCar = false;
        player.car.occupied = false;
        player.car = null;
        playCarEnterSound();
      } else {
        // Find nearest car
        let nearest = null, nearDist = CAR_ENTER_DIST;
        for (const car of entities.cars) {
          const d = Math.hypot(car.x - player.x, car.y - player.y);
          if (d < nearDist) { nearest = car; nearDist = d; }
        }
        if (nearest) {
          player.inCar = true;
          player.car = nearest;
          nearest.occupied = true;
          playCarEnterSound();
        }
      }
    }

    // Honk
    if (input.honk && player.inCar && Math.random() < 0.02) playHonkSound();

    // Update player
    updatePlayer(player, input, 1);

    // Update camera
    updateCamera();

    // Update NPCs
    for (const npc of entities.npcs) {
      if (npc.alive) updateNPC(npc, player.x, player.y, player.wanted);
    }

    // Update traffic cars (AI only if not occupied)
    for (const car of entities.cars) {
      if (!car.occupied) updateTrafficCar(car);
    }

    // Police spawning
    if (player.wanted > 0) {
      policeSpawnTimer++;
      if (policeSpawnTimer >= POLICE_SPAWN_DELAY / player.wanted) {
        policeSpawnTimer = 0;
        if (entities.police.length < player.wanted * 2) {
          // Spawn off-screen
          const angle = Math.random() * Math.PI * 2;
          const dist  = Math.max(camera.w, camera.h) * 0.6;
          const sx = Math.max(TILE_SIZE, Math.min(31 * TILE_SIZE, player.x + Math.cos(angle) * dist));
          const sy = Math.max(TILE_SIZE, Math.min(31 * TILE_SIZE, player.y + Math.sin(angle) * dist));
          entities.police.push(createPoliceCar(sx, sy, entities.police.length));
          if (player.wanted >= 2) playWantedSound();
        }
      }
    } else {
      // Despawn police when wanted clears
      entities.police = entities.police.filter(c => {
        const dist = Math.hypot(c.x - player.x, c.y - player.y);
        return dist > 80;
      });
    }

    // Update police
    for (const cop of entities.police) {
      updatePoliceCar(cop, player);
      // Caught?
      const dist = Math.hypot(cop.x - player.x, cop.y - player.y);
      if (dist < 28) {
        player.health = Math.max(0, player.health - 0.3);
      }
    }

    // Pickups collection
    for (const pu of entities.pickups) {
      if (!pu.alive) continue;
      const dist = Math.hypot(pu.x - player.x, pu.y - player.y);
      if (dist < PICKUP_RADIUS) {
        pu.alive = false;
        if (pu.type === 'cash') {
          player.cash += 500 + Math.floor(Math.random() * 500);
          playCashSound();
        } else if (pu.type === 'health') {
          player.health = Math.min(100, player.health + 40);
          playHealthSound();
        } else if (pu.type === 'wanted') {
          player.wanted = Math.min(5, player.wanted + 1);
          player.wantedTimer = 600;
          playWantedSound();
        }
        // Respawn pickups after delay
        setTimeout(() => { pu.alive = true; }, 15000);
      }
    }

    // Location detection
    locationTimer = Math.max(0, locationTimer - 1);
    for (const loc of LOCATIONS) {
      const d = Math.hypot(loc.x - player.x, loc.y - player.y);
      if (d < TILE_SIZE * 3 && currentLocation !== loc.name) {
        currentLocation = loc.name;
        locationTimer = 200;
      }
    }
    if (locationTimer === 0) currentLocation = '';

    // Remove dead explosions
    entities.explosions = entities.explosions.filter(e => !e._done);

    // HUD data (only update when changed to reduce React re-renders)
    const hudData = {
      health: Math.round(player.health),
      cash: player.cash,
      wanted: player.wanted,
      inCar: player.inCar,
      speed: player.inCar ? Math.round(Math.abs(player.car?.speed ?? 0) * 20) : 0,
      location: currentLocation,
    };
    if (JSON.stringify(hudData) !== JSON.stringify(lastHudData)) {
      lastHudData = hudData;
      onHudUpdate(hudData);
    }
  }

  // ── Draw ──────────────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // World tiles
    renderWorld(ctx, camera, tick);

    // Pickups
    for (const pu of entities.pickups) {
      if (pu.alive) drawPickup(ctx, pu, camera, tick);
    }

    // Traffic cars (not occupied)
    for (const car of entities.cars) {
      if (!car.occupied) drawTrafficCar(ctx, car, camera, tick);
    }

    // Player
    drawPlayer(ctx, player, camera, tick);

    // NPCs
    for (const npc of entities.npcs) {
      if (npc.alive) drawNPC(ctx, npc, camera, tick);
    }

    // Police
    for (const cop of entities.police) {
      drawPoliceCar(ctx, cop, camera, tick);
    }

    // Explosions
    for (const exp of entities.explosions) {
      const done = updateAndDrawExplosion(ctx, exp, camera);
      if (done) exp._done = true;
    }

    // Interaction prompt
    if (!player.inCar) {
      for (const car of entities.cars) {
        const d = Math.hypot(car.x - player.x, car.y - player.y);
        if (d < CAR_ENTER_DIST) {
          const sx = car.x - camera.x;
          const sy = car.y - camera.y - 28;
          ctx.save();
          ctx.font = 'bold 11px Orbitron, monospace';
          ctx.fillStyle = '#ffe01b';
          ctx.shadowColor = '#ffe01b';
          ctx.shadowBlur = 8;
          ctx.textAlign = 'center';
          ctx.fillText('[F] Enter Car', sx, sy);
          ctx.restore();
          break;
        }
      }
    } else {
      const sx = player.x - camera.x;
      const sy = player.y - camera.y - 36;
      ctx.save();
      ctx.font = 'bold 11px Orbitron, monospace';
      ctx.fillStyle = '#ffe01b';
      ctx.shadowColor = '#ffe01b';
      ctx.shadowBlur = 8;
      ctx.textAlign = 'center';
      ctx.fillText('[F] Exit Car', sx, sy);
      ctx.restore();
    }

    // Touch joystick visualisation
    if (input.joystickActive) {
      const ox = input.joystickOrigin.x;
      const oy = input.joystickOrigin.y;
      const dx = input.joystickDelta.x;
      const dy = input.joystickDelta.y;
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ox, oy, 46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,45,120,0.5)';
      ctx.beginPath();
      ctx.arc(ox + dx, oy + dy, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Loop ─────────────────────────────────────────────────
  let rafId;
  function loop() {
    if (!running) return;
    update();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  startAmbience();
  loop();

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(rafId);
      inputMgr.destroy();
      stopAmbience();
    },
    addExplosion(x, y) {
      entities.explosions.push(createExplosion(x, y));
      playExplosionSound();
    },
    getPlayer: () => player,
  };
}
