import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── Config ───────────────────────────────────────────────────────────────────
const COLS = 8, ROWS = 8;
const CANDY_TYPES = 6;
const LEVEL_TARGETS = [1000, 1800, 2800, 4000, 5500, 7500, 9500, 12000, 15000, 20000,
                        24000,29000,35000,42000,50000,59000,69000,80000,93000,108000,
                        125000,145000,168000,195000,225000,260000,300000,345000,400000,460000];
const LEVEL_MOVES   = [25, 25, 28, 28, 30, 30, 32, 32, 35, 35,
                        35, 38, 38, 40, 40, 42, 42, 45, 45, 48,
                        48, 50, 50, 52, 52, 55, 55, 58, 58, 60];

const CANDY_EMOJIS = ['🍓','🍊','🍋','🍇','🫐','🍬'];
const CANDY_COLORS = ['#ff4d6d','#ff9500','#ffd740','#c77dff','#5e60ce','#e040fb'];
const CANDY_BGTINT = ['rgba(255,77,109,0.25)','rgba(255,149,0,0.25)','rgba(255,215,64,0.25)','rgba(199,125,255,0.25)','rgba(94,96,206,0.25)','rgba(224,64,251,0.25)'];

const STRIPE_H = 'stripe_h';
const STRIPE_V = 'stripe_v';
const WRAPPED  = 'wrapped';
const COLOUR_B = 'colour_bomb';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rand = () => Math.floor(Math.random() * CANDY_TYPES);

function makeGrid() {
  const g = Array(ROWS).fill(null).map(() =>
    Array(COLS).fill(null).map(() => ({ type: rand(), special: null }))
  );
  // Remove initial matches
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    while (
      (c >= 2 && g[r][c].type === g[r][c-1].type && g[r][c].type === g[r][c-2].type) ||
      (r >= 2 && g[r][c].type === g[r-1][c].type && g[r][c].type === g[r-2][c].type)
    ) g[r][c].type = rand();
  }
  return g;
}

function findMatches(grid) {
  const matched = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
  // Horizontal
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS-2;c++) {
    const t=grid[r][c]?.type;
    if(t!=null && t===grid[r][c+1]?.type && t===grid[r][c+2]?.type) {
      let len=3; while(c+len<COLS && grid[r][c+len]?.type===t) len++;
      for(let i=0;i<len;i++) matched[r][c+i]=true;
    }
  }
  // Vertical
  for (let r=0;r<ROWS-2;r++) for (let c=0;c<COLS;c++) {
    const t=grid[r][c]?.type;
    if(t!=null && t===grid[r+1][c]?.type && t===grid[r+2][c]?.type) {
      let len=3; while(r+len<ROWS && grid[r+len][c]?.type===t) len++;
      for(let i=0;i<len;i++) matched[r+i][c]=true;
    }
  }
  return matched;
}

function countMatchLen(grid, r, c) {
  const t = grid[r][c]?.type;
  if (t == null) return { h:1, v:1 };
  let h=1, v=1;
  let cc=c+1; while(cc<COLS&&grid[r][cc]?.type===t){h++;cc++;}
  cc=c-1; while(cc>=0&&grid[r][cc]?.type===t){h++;cc--;}
  let rr=r+1; while(rr<ROWS&&grid[rr][c]?.type===t){v++;rr++;}
  rr=r-1; while(rr>=0&&grid[rr][c]?.type===t){v++;rr--;}
  return { h, v };
}

function applyGravity(grid) {
  const g = grid.map(r => r.map(c => c ? { ...c } : null));
  for (let c=0; c<COLS; c++) {
    let empty = ROWS - 1;
    for (let r=ROWS-1; r>=0; r--) {
      if (g[r][c]) { g[empty][c]=g[r][c]; if(empty!==r)g[r][c]=null; empty--; }
    }
    while (empty>=0) { g[empty][c]={ type:rand(), special:null }; empty--; }
  }
  return g;
}

function isAdjacent([r1,c1],[r2,c2]) {
  return (Math.abs(r1-r2)+Math.abs(c1-c2))===1;
}

function swapCells(grid, [r1,c1], [r2,c2]) {
  const g = grid.map(r => r.map(c => c ? {...c} : null));
  [g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]];
  return g;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CandyGame({ onBack }) {
  const [grid, setGrid] = useState(makeGrid);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [moves, setMoves] = useState(LEVEL_MOVES[0]);
  const [animating, setAnimating] = useState(false);
  const [flashing, setFlashing] = useState([]);   // [[r,c],...] cells to flash
  const [gameOver, setGameOver] = useState(false);
  const [levelUp, setLevelUp] = useState(false);
  const [combo, setCombo] = useState(0);
  const [comboText, setComboText] = useState('');
  const [comboPos, setComboPos] = useState([0,0]);
  const [particles, setParticles] = useState([]);

  const processMatches = useCallback(async (g, currentScore, comboCount) => {
    const matched = findMatches(g);
    const anyMatch = matched.some(r=>r.some(v=>v));
    if (!anyMatch) return { grid: g, score: currentScore };

    // Determine specials to create
    const newGrid = g.map(r => r.map(c => c ? {...c} : null));
    const clearCells = [];

    for (let r=0; r<ROWS; r++) for (let c=0; c<COLS; c++) {
      if (matched[r][c]) clearCells.push([r,c]);
    }

    // Flash
    setFlashing(clearCells);
    await sleep(250);
    setFlashing([]);

    // Score
    const gained = clearCells.length * 50 * (1 + comboCount * 0.5);
    currentScore += Math.round(gained);

    // Combo display
    if (comboCount > 0) {
      setComboText(`${comboCount+1}x COMBO! +${Math.round(gained)}`);
      setComboPos([clearCells[0][0], clearCells[0][1]]);
      setTimeout(() => setComboText(''), 900);
    }

    for (const [r,c] of clearCells) newGrid[r][c] = null;

    await sleep(100);
    const fallen = applyGravity(newGrid);
    setGrid(fallen);
    await sleep(300);

    // Recurse
    return processMatches(fallen, currentScore, comboCount + 1);
  }, []);

  const handleCellClick = useCallback(async (r, c) => {
    if (animating || gameOver || levelUp) return;

    if (!selected) {
      setSelected([r, c]);
      return;
    }

    if (selected[0]===r && selected[1]===c) { setSelected(null); return; }

    if (!isAdjacent(selected, [r,c])) { setSelected([r,c]); return; }

    // Attempt swap
    setSelected(null);
    setAnimating(true);
    const swapped = swapCells(grid, selected, [r,c]);
    const matched = findMatches(swapped);
    const anyMatch = matched.some(row => row.some(v=>v));

    if (!anyMatch) {
      // Invalid swap — animate back
      setGrid(swapped);
      await sleep(200);
      setGrid(grid);
      setAnimating(false);
      return;
    }

    setGrid(swapped);
    const result = await processMatches(swapped, score, 0);
    const newScore = result.score;
    setScore(newScore);
    setGrid(result.grid);

    const newMoves = moves - 1;
    setMoves(newMoves);

    // Check level up
    const target = LEVEL_TARGETS[Math.min(level-1, LEVEL_TARGETS.length-1)];
    if (newScore >= target) {
      const nextLevel = Math.min(level+1, 30);
      setLevel(nextLevel);
      setMoves(LEVEL_MOVES[nextLevel-1]);
      setLevelUp(true);
      setTimeout(() => setLevelUp(false), 2000);
    } else if (newMoves <= 0) {
      setGameOver(true);
    }

    setAnimating(false);
  }, [animating, gameOver, levelUp, selected, grid, score, moves, level, processMatches]);

  const reset = () => {
    setGrid(makeGrid());
    setSelected(null); setScore(0); setLevel(1);
    setMoves(LEVEL_MOVES[0]); setAnimating(false);
    setFlashing([]); setGameOver(false); setLevelUp(false);
    setCombo(0); setComboText('');
  };

  const target = LEVEL_TARGETS[Math.min(level-1, LEVEL_TARGETS.length-1)];
  const progress = Math.min(1, score / target);
  const CELL_SIZE = Math.min(56, Math.floor((Math.min(typeof window!=='undefined'?window.innerWidth:480,480) - 32) / COLS));

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', gap:16, padding:'18px 28px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)' }}>
        <button id="candy-back" onClick={onBack} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', borderRadius:8, padding:'8px 16px', fontSize:14 }}>← Back</button>
        <span style={{ fontSize:22 }}>🍬</span>
        <h1 style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:900, color:'#e040fb' }}>Candy Crush</h1>
        <div style={{ flex:1 }} />
        <button id="candy-reset" onClick={reset} style={{ background:'rgba(224,64,251,0.15)', border:'1px solid rgba(224,64,251,0.4)', color:'#e040fb', borderRadius:8, padding:'8px 18px', fontSize:13, fontWeight:600 }}>New Game</button>
      </div>

      <div style={{ flex:1, display:'flex', gap:24, padding:'20px 24px', flexWrap:'wrap', justifyContent:'center', alignItems:'flex-start' }}>
        {/* Game area */}
        <div>
          {/* HUD */}
          <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
            {[
              { label:'⭐ Score', value: score.toLocaleString(), color:'#ffd740' },
              { label:'🎯 Target', value: target.toLocaleString(), color:'#e040fb' },
              { label:'🎮 Moves', value: moves, color: moves<=5?'#ff5252':'#69f0ae' },
              { label:'🏅 Level', value: level, color:'#00e5ff' },
            ].map(({label,value,color})=>(
              <div key={label} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 16px', textAlign:'center', flex:1, minWidth:78 }}>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginBottom:4, whiteSpace:'nowrap' }}>{label}</div>
                <div style={{ fontFamily:'var(--font-head)', fontSize:18, color, fontWeight:700 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ height:8, background:'rgba(255,255,255,0.07)', borderRadius:4, overflow:'hidden', marginBottom:14, position:'relative' }}>
            <div style={{ height:'100%', width:`${progress*100}%`, background:'linear-gradient(90deg,#e040fb,#ffd740)', borderRadius:4, transition:'width 0.4s ease', boxShadow:'0 0 10px #e040fb88' }} />
          </div>

          {/* Board */}
          <div style={{ position:'relative' }}>
            <div style={{
              display:'grid',
              gridTemplateColumns:`repeat(${COLS},${CELL_SIZE}px)`,
              gap:3,
              background:'rgba(255,255,255,0.05)',
              padding:10, borderRadius:16,
              border:'1px solid rgba(255,255,255,0.1)',
              boxShadow:'0 20px 60px rgba(0,0,0,0.7), inset 0 0 40px rgba(224,64,251,0.05)',
              userSelect:'none',
            }}>
              {grid.map((row,r)=>row.map((cell,c)=>{
                const t = cell?.type ?? 0;
                const isSel = selected?.[0]===r && selected?.[1]===c;
                const isFlash = flashing.some(([fr,fc])=>fr===r&&fc===c);
                return (
                  <div key={`${r}-${c}`} id={`candy-${r}-${c}`}
                    onClick={()=>handleCellClick(r,c)}
                    style={{
                      width: CELL_SIZE, height: CELL_SIZE,
                      borderRadius:10,
                      background: isSel ? `${CANDY_COLORS[t]}66` : CANDY_BGTINT[t],
                      border: `2px solid ${isSel ? CANDY_COLORS[t] : isFlash ? '#fff' : 'rgba(255,255,255,0.08)'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      cursor:'pointer', fontSize: CELL_SIZE * 0.55,
                      boxShadow: isSel ? `0 0 16px ${CANDY_COLORS[t]}, inset 0 0 12px ${CANDY_COLORS[t]}44` : isFlash ? '0 0 20px #fff' : 'none',
                      transform: isSel ? 'scale(1.12)' : isFlash ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.15s cubic-bezier(.22,.68,0,1.2)',
                      lineHeight:1,
                    }}
                  >
                    {CANDY_EMOJIS[t]}
                  </div>
                );
              }))}
            </div>

            {/* Combo text */}
            {comboText && (
              <div style={{
                position:'absolute',
                top: comboPos[0] * (CELL_SIZE+3) + 10,
                left: comboPos[1] * (CELL_SIZE+3) + 10,
                background:'linear-gradient(135deg,#ffd740,#e040fb)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                fontFamily:'var(--font-head)', fontWeight:900, fontSize:18,
                pointerEvents:'none', zIndex:10, whiteSpace:'nowrap',
                animation:'pop 0.3s ease',
                textShadow:'none',
                filter:'drop-shadow(0 0 8px #ffd740)',
              }}>
                {comboText}
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:16, minWidth:200, maxWidth:260 }}>
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:20 }}>
            <div style={{ fontFamily:'var(--font-head)', fontSize:11, color:'rgba(255,255,255,0.3)', letterSpacing:1, marginBottom:14 }}>CANDY KEY</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {CANDY_EMOJIS.map((em,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:CANDY_BGTINT[i], border:`1px solid ${CANDY_COLORS[i]}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{em}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{['Strawberry','Orange','Lemon','Grape','Blueberry','Candy'][i]}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:16, fontSize:12, color:'rgba(255,255,255,0.35)', lineHeight:2 }}>
            <div style={{ color:'rgba(255,255,255,0.5)', fontWeight:600, marginBottom:8 }}>How to Play</div>
            Tap a candy, then tap an adjacent one to swap.<br />
            Match 3+ in a row to clear them!<br />
            Reach the score target before moves run out.
          </div>
        </div>
      </div>

      {/* Game Over modal */}
      {gameOver && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div style={{ background:'#1a0830', border:'1px solid rgba(224,64,251,0.4)', borderRadius:24, padding:'44px 52px', textAlign:'center', animation:'pop 0.4s ease', maxWidth:360 }}>
            <div style={{ fontSize:56, marginBottom:16 }}>💔</div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:26, color:'#ff5252', marginBottom:8 }}>Out of Moves!</div>
            <div style={{ color:'rgba(255,255,255,0.5)', marginBottom:6 }}>Level {level} · Score: <b style={{color:'#ffd740'}}>{score.toLocaleString()}</b></div>
            <div style={{ color:'rgba(255,255,255,0.35)', fontSize:13, marginBottom:28 }}>Target was {target.toLocaleString()}</div>
            <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
              <button id="gameover-retry" onClick={reset} style={{ padding:'12px 28px', borderRadius:10, background:'linear-gradient(135deg,#e040fb,#b44bff)', border:'none', color:'#fff', fontFamily:'var(--font-head)', fontSize:13, fontWeight:700, cursor:'pointer' }}>Try Again</button>
              <button id="gameover-back" onClick={onBack} style={{ padding:'12px 28px', borderRadius:10, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', color:'#fff', fontSize:13, cursor:'pointer' }}>← Lobby</button>
            </div>
          </div>
        </div>
      )}

      {/* Level Up toast */}
      {levelUp && (
        <div style={{
          position:'fixed', top:80, left:'50%', transform:'translateX(-50%)',
          background:'linear-gradient(135deg,#ffd740,#e040fb)',
          borderRadius:16, padding:'16px 40px', zIndex:301,
          animation:'pop 0.4s ease',
          boxShadow:'0 0 40px rgba(224,64,251,0.6)',
        }}>
          <div style={{ fontFamily:'var(--font-head)', fontSize:22, color:'#fff', textAlign:'center', fontWeight:900 }}>
            🎉 LEVEL {level}!
          </div>
        </div>
      )}
    </div>
  );
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
