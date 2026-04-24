// ============================================================
//  RENDERER — draws tiles, entities, and VFX onto canvas
// ============================================================
import { TILE_SIZE, WORLD_MAP, MAP_COLS, MAP_ROWS } from './world.js';

// Palette
const COLORS = {
  grass:      '#1a3a1a',
  road:       '#2c2c3a',
  road_mark:  '#ffec6e',
  intersection:'#252535',
  building_sm:'#1e2a5e',
  building_lg:'#12193d',
  beach:      '#c8a97a',
  sidewalk:   '#3a3a4a',
  parking:    '#28283a',
  building_win:'#ffe08a',
  building_win_off:'#1a2050',
  roof_sm:    '#ff2d78',
  roof_lg:    '#b44bff',
  palm_trunk: '#7a5c2a',
  palm_leaf:  '#2e6e1e',
  neon_pink:  '#ff2d78',
  neon_cyan:  '#00f5ff',
  neon_purple:'#b44bff',
};

// Pre-computed building windows pattern per tile (seeded by tile index)
function seededRand(seed) {
  let x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// Draw one tile
function drawTile(ctx, tileType, px, py, tick) {
  const T = TILE_SIZE;

  switch (tileType) {
    case 0: // grass
      ctx.fillStyle = COLORS.grass;
      ctx.fillRect(px, py, T, T);
      break;

    case 1: // road horizontal
      ctx.fillStyle = COLORS.road;
      ctx.fillRect(px, py, T, T);
      // center dashes
      ctx.fillStyle = COLORS.road_mark;
      ctx.fillRect(px, py + T/2 - 1, T * 0.4, 2);
      ctx.fillRect(px + T * 0.6, py + T/2 - 1, T * 0.4, 2);
      break;

    case 2: // road vertical
      ctx.fillStyle = COLORS.road;
      ctx.fillRect(px, py, T, T);
      ctx.fillStyle = COLORS.road_mark;
      ctx.fillRect(px + T/2 - 1, py, 2, T * 0.4);
      ctx.fillRect(px + T/2 - 1, py + T * 0.6, 2, T * 0.4);
      break;

    case 3: // intersection
      ctx.fillStyle = COLORS.intersection;
      ctx.fillRect(px, py, T, T);
      // corner accents
      ctx.fillStyle = 'rgba(255,45,120,0.25)';
      ctx.fillRect(px, py, 4, 4);
      ctx.fillRect(px + T - 4, py, 4, 4);
      ctx.fillRect(px, py + T - 4, 4, 4);
      ctx.fillRect(px + T - 4, py + T - 4, 4, 4);
      break;

    case 4: { // small building
      ctx.fillStyle = COLORS.building_sm;
      ctx.fillRect(px + 4, py + 4, T - 8, T - 8);
      // roof
      ctx.fillStyle = COLORS.roof_sm;
      ctx.fillRect(px + 4, py + 4, T - 8, 6);
      // windows grid 2x2
      const wc = COLORS.building_win;
      const wo = COLORS.building_win_off;
      for (let wy = 0; wy < 2; wy++) {
        for (let wx = 0; wx < 2; wx++) {
          const seed = px * 3 + py * 7 + wx * 13 + wy * 17;
          const lit = seededRand(seed + Math.floor(tick / 180)) > 0.35;
          ctx.fillStyle = lit ? wc : wo;
          ctx.fillRect(px + 10 + wx * 14, py + 16 + wy * 12, 8, 8);
        }
      }
      break;
    }

    case 5: { // large building
      ctx.fillStyle = COLORS.building_lg;
      ctx.fillRect(px + 2, py + 2, T - 4, T - 4);
      // glowing roof
      ctx.fillStyle = COLORS.roof_lg;
      ctx.fillRect(px + 2, py + 2, T - 4, 8);
      // windows 3x3
      for (let wy = 0; wy < 3; wy++) {
        for (let wx = 0; wx < 3; wx++) {
          const seed = px * 5 + py * 11 + wx * 17 + wy * 23;
          const lit = seededRand(seed + Math.floor(tick / 200)) > 0.3;
          ctx.fillStyle = lit ? COLORS.building_win : COLORS.building_win_off;
          ctx.fillRect(px + 8 + wx * 11, py + 16 + wy * 9, 7, 6);
        }
      }
      break;
    }

    case 6: // beach
      ctx.fillStyle = COLORS.beach;
      ctx.fillRect(px, py, T, T);
      // subtle wave shimmer
      ctx.fillStyle = `rgba(0,245,255,${0.05 + 0.03 * Math.sin(tick * 0.05 + px * 0.01)})`;
      ctx.fillRect(px, py, T, 6);
      break;

    case 7: // sidewalk
      ctx.fillStyle = COLORS.sidewalk;
      ctx.fillRect(px, py, T, T);
      break;

    case 8: // parking lot
      ctx.fillStyle = COLORS.parking;
      ctx.fillRect(px, py, T, T);
      // parking lines
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(px + 6 + i * 14, py + 4, 2, T - 8);
      }
      break;

    default:
      ctx.fillStyle = '#111';
      ctx.fillRect(px, py, T, T);
  }
}

// Draw decorative palm trees at specific positions
export function drawPalmTree(ctx, px, py) {
  // trunk
  ctx.fillStyle = COLORS.palm_trunk;
  ctx.fillRect(px + 2, py + 12, 4, 16);
  // leaves
  ctx.fillStyle = COLORS.palm_leaf;
  ctx.beginPath();
  ctx.ellipse(px + 4, py + 8, 10, 5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(px + 4, py + 8, 10, 5, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

// Draw neon sign at world position
export function drawNeonSign(ctx, px, py, text, color, tick) {
  const alpha = 0.7 + 0.3 * Math.sin(tick * 0.05);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 9px Orbitron, monospace';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillText(text, px, py);
  ctx.restore();
}

// Main world renderer
export function renderWorld(ctx, camera, tick) {
  const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE));
  const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE));
  const endCol   = Math.min(MAP_COLS - 1, Math.ceil((camera.x + camera.w) / TILE_SIZE));
  const endRow   = Math.min(MAP_ROWS - 1, Math.ceil((camera.y + camera.h) / TILE_SIZE));

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const tileType = WORLD_MAP[row]?.[col] ?? 0;
      const px = col * TILE_SIZE - camera.x;
      const py = row * TILE_SIZE - camera.y;
      drawTile(ctx, tileType, px, py, tick);
    }
  }

  // Static palm trees at nice spots
  const palms = [
    [6*TILE_SIZE, 2*TILE_SIZE], [6*TILE_SIZE, 4*TILE_SIZE],
    [5*TILE_SIZE, 3*TILE_SIZE], [3*TILE_SIZE, 7*TILE_SIZE],
  ];
  for (const [wx, wy] of palms) {
    const px = wx - camera.x;
    const py = wy - camera.y;
    if (px > -32 && px < camera.w + 32 && py > -32 && py < camera.h + 32) {
      drawPalmTree(ctx, px, py);
    }
  }

  // Neon signs
  const signs = [
    { x: 8*TILE_SIZE + 4, y: 2*TILE_SIZE + 16, text: 'VICE', color: COLORS.neon_pink },
    { x: 13*TILE_SIZE + 4, y: 7*TILE_SIZE + 16, text: 'NITE', color: COLORS.neon_cyan },
    { x: 18*TILE_SIZE + 4, y: 12*TILE_SIZE + 16, text: 'CLUB', color: COLORS.neon_purple },
    { x: 23*TILE_SIZE + 4, y: 17*TILE_SIZE + 16, text: 'DINER', color: COLORS.neon_pink },
  ];
  for (const s of signs) {
    const px = s.x - camera.x;
    const py = s.y - camera.y;
    if (px > -64 && px < camera.w + 64 && py > -32 && py < camera.h + 32) {
      drawNeonSign(ctx, px, py, s.text, s.color, tick);
    }
  }
}
