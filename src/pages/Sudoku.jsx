import React, { useState, useCallback, useEffect, useRef } from 'react';

// ─── Sudoku Generator ─────────────────────────────────────────────────────────
function isSafe(grid, r, c, num) {
  if (grid[r].includes(num)) return false;
  if (grid.some(row => row[c] === num)) return false;
  const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
  for (let i=0;i<3;i++) for (let j=0;j<3;j++) if (grid[br+i][bc+j]===num) return false;
  return true;
}

function solve(grid) {
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
    if (grid[r][c]===0) {
      const nums=[1,2,3,4,5,6,7,8,9].sort(()=>Math.random()-0.5);
      for (const n of nums) {
        if (isSafe(grid,r,c,n)) {
          grid[r][c]=n;
          if (solve(grid)) return true;
          grid[r][c]=0;
        }
      }
      return false;
    }
  }
  return true;
}

const CLUES = { easy: 46, medium: 32, hard: 22 };

function generatePuzzle(difficulty) {
  const full = Array(9).fill(null).map(()=>Array(9).fill(0));
  solve(full);
  const puzzle = full.map(r=>[...r]);
  let toRemove = 81 - CLUES[difficulty];
  const cells = Array.from({length:81},(_,i)=>[Math.floor(i/9),i%9]).sort(()=>Math.random()-0.5);
  for (const [r,c] of cells) {
    if (toRemove<=0) break;
    puzzle[r][c]=0;
    toRemove--;
  }
  return { puzzle, solution: full };
}

function isComplete(grid, solution) {
  return grid.every((row,r)=>row.every((v,c)=>v===solution[r][c]));
}

function getConflicts(grid) {
  const conf = new Set();
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
    const v=grid[r][c]; if(!v) continue;
    // row
    for(let cc=0;cc<9;cc++) if(cc!==c&&grid[r][cc]===v) { conf.add(`${r},${c}`);conf.add(`${r},${cc}`); }
    // col
    for(let rr=0;rr<9;rr++) if(rr!==r&&grid[rr][c]===v) { conf.add(`${r},${c}`);conf.add(`${rr},${c}`); }
    // box
    const br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;
    for(let i=0;i<3;i++) for(let j=0;j<3;j++) { const rr=br+i,cc=bc+j; if((rr!==r||cc!==c)&&grid[rr][cc]===v){conf.add(`${r},${c}`);conf.add(`${rr},${cc}`);} }
  }
  return conf;
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function useTimer(running) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs(s => s+1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  return { secs, fmt, reset: () => setSecs(0) };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SudokuGame({ onBack }) {
  const [difficulty, setDifficulty] = useState('medium');
  const [gameData, setGameData] = useState(null);      // { puzzle, solution }
  const [userGrid, setUserGrid] = useState(null);
  const [selected, setSelected] = useState(null);      // [r,c]
  const [notes, setNotes] = useState(null);            // 9x9 array of Set
  const [noteMode, setNoteMode] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [won, setWon] = useState(false);
  const [started, setStarted] = useState(false);
  const [hint, setHint] = useState(null);              // [r,c] last hint cell

  const { secs, fmt, reset: resetTimer } = useTimer(started && !won);

  const startGame = useCallback((diff = difficulty) => {
    const data = generatePuzzle(diff);
    const emptyNotes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set()));
    setGameData(data);
    setUserGrid(data.puzzle.map(r => [...r]));
    setNotes(emptyNotes);
    setSelected(null);
    setMistakes(0);
    setWon(false);
    setStarted(true);
    setNoteMode(false);
    setHint(null);
    resetTimer();
  }, [difficulty, resetTimer]);

  useEffect(() => { startGame(); }, []); // auto-start

  const conflicts = userGrid ? getConflicts(userGrid) : new Set();

  const handleCellClick = (r, c) => setSelected([r, c]);

  const handleNumber = useCallback((num) => {
    if (!selected || !userGrid || won) return;
    const [r, c] = selected;
    if (gameData.puzzle[r][c] !== 0) return; // original clue, locked

    if (noteMode && num !== 0) {
      const newNotes = notes.map(row => row.map(s => new Set(s)));
      if (newNotes[r][c].has(num)) newNotes[r][c].delete(num);
      else newNotes[r][c].add(num);
      setNotes(newNotes);
      return;
    }

    const ng = userGrid.map(row => [...row]);
    ng[r][c] = num;

    // Track mistakes
    if (num !== 0 && num !== gameData.solution[r][c]) {
      setMistakes(m => m + 1);
    }

    // Clear notes in same row/col/box
    if (num !== 0) {
      const newNotes = notes.map(row => row.map(s => new Set(s)));
      for (let i=0;i<9;i++) { newNotes[r][i].delete(num); newNotes[i][c].delete(num); }
      const br=Math.floor(r/3)*3, bc=Math.floor(c/3)*3;
      for(let i=0;i<3;i++) for(let j=0;j<3;j++) newNotes[br+i][bc+j].delete(num);
      setNotes(newNotes);
    }

    setUserGrid(ng);
    if (num !== 0 && isComplete(ng, gameData.solution)) setWon(true);
  }, [selected, userGrid, gameData, notes, noteMode, won]);

  const handleHint = () => {
    if (!userGrid || !gameData) return;
    const blanks = [];
    for(let r=0;r<9;r++) for(let c=0;c<9;c++) if(userGrid[r][c]===0) blanks.push([r,c]);
    if (!blanks.length) return;
    const [r,c] = blanks[Math.floor(Math.random()*blanks.length)];
    const ng = userGrid.map(row=>[...row]);
    ng[r][c] = gameData.solution[r][c];
    setUserGrid(ng);
    setHint([r,c]);
    setTimeout(()=>setHint(null), 1500);
    if (isComplete(ng, gameData.solution)) setWon(true);
  };

  // Keyboard support
  useEffect(() => {
    const handler = (e) => {
      if (e.key >= '1' && e.key <= '9') handleNumber(parseInt(e.key));
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') handleNumber(0);
      if (!selected) return;
      const [r,c] = selected;
      if (e.key==='ArrowUp')    setSelected([Math.max(0,r-1),c]);
      if (e.key==='ArrowDown')  setSelected([Math.min(8,r+1),c]);
      if (e.key==='ArrowLeft')  setSelected([r,Math.max(0,c-1)]);
      if (e.key==='ArrowRight') setSelected([r,Math.min(8,c+1)]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleNumber, selected]);

  const DIFF_COLORS = { easy: '#69f0ae', medium: '#ffd740', hard: '#ff5252' };
  const accent = DIFF_COLORS[difficulty];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', gap:16, padding:'18px 28px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)' }}>
        <button id="sudoku-back" onClick={onBack} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', borderRadius:8, padding:'8px 16px', fontSize:14 }}>← Back</button>
        <span style={{ fontSize:22 }}>🔢</span>
        <h1 style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:900, color: accent }}>Sudoku</h1>
        <div style={{ flexGrow:1 }} />
        {/* Difficulty */}
        <div style={{ display:'flex', gap:6 }}>
          {['easy','medium','hard'].map(d => (
            <button key={d} id={`diff-${d}`}
              onClick={() => { setDifficulty(d); startGame(d); }}
              style={{
                padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600,
                background: difficulty===d ? `${DIFF_COLORS[d]}22` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${difficulty===d ? DIFF_COLORS[d] : 'rgba(255,255,255,0.1)'}`,
                color: difficulty===d ? DIFF_COLORS[d] : 'rgba(255,255,255,0.5)',
                textTransform:'capitalize', cursor:'pointer',
              }}
            >{d}</button>
          ))}
        </div>
        <button id="sudoku-new" onClick={()=>startGame()} style={{ background:`${accent}22`, border:`1px solid ${accent}55`, color:accent, borderRadius:8, padding:'8px 18px', fontSize:13, fontWeight:600 }}>New Game</button>
      </div>

      <div style={{ flex:1, display:'flex', gap:28, padding:'24px 28px', flexWrap:'wrap', justifyContent:'center', alignItems:'flex-start' }}>
        {/* Board */}
        <div>
          {/* Stats row */}
          <div style={{ display:'flex', gap:16, marginBottom:16, flexWrap:'wrap' }}>
            {[
              { label:'⏱ Time', value: fmt(secs), color:'#00e5ff' },
              { label:'❌ Mistakes', value: mistakes, color:'#ff5252' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 18px', textAlign:'center' }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>{label}</div>
                <div style={{ fontFamily:'var(--font-head)', fontSize:20, color, fontWeight:700 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Grid */}
          {userGrid && (
            <div style={{
              display:'grid', gridTemplateColumns:'repeat(9,1fr)',
              border:'3px solid rgba(255,255,255,0.25)', borderRadius:8,
              overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.7)',
              width: 'min(450px, 95vw)',
            }}>
              {userGrid.map((row, r) => row.map((val, c) => {
                const isOrig = gameData?.puzzle[r][c] !== 0;
                const isSel  = selected?.[0]===r && selected?.[1]===c;
                const sameNum = selected && val && val === userGrid[selected[0]][selected[1]];
                const sameRC  = selected && (selected[0]===r || selected[1]===c || (Math.floor(r/3)===Math.floor(selected[0]/3)&&Math.floor(c/3)===Math.floor(selected[1]/3)));
                const isConflict = conflicts.has(`${r},${c}`);
                const isHinted = hint?.[0]===r && hint?.[1]===c;

                let bg = (r+c)%2===0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)';
                if (sameRC)      bg = 'rgba(255,255,255,0.06)';
                if (sameNum)     bg = `${accent}22`;
                if (isSel)       bg = `${accent}33`;
                if (isConflict)  bg = 'rgba(255,82,82,0.2)';
                if (isHinted)    bg = 'rgba(105,240,174,0.3)';

                const thick = (side) => {
                  if (side==='right')  return c===2||c===5 ? '2px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.08)';
                  if (side==='bottom') return r===2||r===5 ? '2px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.08)';
                  return 'none';
                };

                const noteSet = notes?.[r][c];

                return (
                  <div key={`${r}-${c}`} id={`cell-${r}-${c}`}
                    onClick={() => handleCellClick(r, c)}
                    style={{
                      aspectRatio:'1', background:bg,
                      borderRight: thick('right'),
                      borderBottom: thick('bottom'),
                      display:'flex', alignItems:'center', justifyContent:'center',
                      cursor:'pointer', position:'relative',
                      transition:'background 0.1s',
                    }}
                  >
                    {val !== 0 ? (
                      <span style={{
                        fontFamily:'var(--font-head)', fontSize:'clamp(14px,2.6vw,22px)', fontWeight: isOrig?700:400,
                        color: isConflict ? '#ff5252' : isHinted ? '#69f0ae' : isOrig ? '#fff' : accent,
                        textShadow: isSel ? `0 0 10px ${accent}` : 'none',
                      }}>{val}</span>
                    ) : noteSet?.size > 0 ? (
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', width:'90%', height:'90%', gap:1 }}>
                        {[1,2,3,4,5,6,7,8,9].map(n => (
                          <div key={n} style={{ display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(5px,0.8vw,9px)', color: '#ffd740', opacity: noteSet.has(n)?1:0 }}>{n}</div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              }))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display:'flex', flexDirection:'column', gap:16, minWidth:220 }}>
          {/* Number pad */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:20 }}>
            <div style={{ fontFamily:'var(--font-head)', fontSize:11, color:'rgba(255,255,255,0.3)', letterSpacing:1, marginBottom:14 }}>NUMBER PAD</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <button key={n} id={`num-${n}`} onClick={() => handleNumber(n)} style={{
                  aspectRatio:'1', fontSize:22, fontFamily:'var(--font-head)', fontWeight:700,
                  background:`${accent}15`, border:`1px solid ${accent}33`,
                  color:accent, borderRadius:10, cursor:'pointer',
                  transition:'all 0.15s',
                }}
                  onMouseEnter={e=>{ e.target.style.background=`${accent}35`; e.target.style.transform='scale(1.08)'; }}
                  onMouseLeave={e=>{ e.target.style.background=`${accent}15`; e.target.style.transform='scale(1)'; }}
                >{n}</button>
              ))}
            </div>
            <button id="num-erase" onClick={() => handleNumber(0)} style={{
              width:'100%', marginTop:8, padding:'10px 0', fontSize:13,
              background:'rgba(255,82,82,0.12)', border:'1px solid rgba(255,82,82,0.3)',
              color:'#ff5252', borderRadius:10, fontWeight:600, cursor:'pointer',
            }}>⌫ Erase</button>
          </div>

          {/* Actions */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <button id="toggle-notes"
              onClick={() => setNoteMode(m=>!m)}
              style={{
                padding:'12px', borderRadius:10, fontSize:13, fontWeight:600,
                background: noteMode ? 'rgba(255,215,64,0.18)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${noteMode ? '#ffd740' : 'rgba(255,255,255,0.1)'}`,
                color: noteMode ? '#ffd740' : 'rgba(255,255,255,0.5)',
                cursor:'pointer', transition:'all 0.2s',
              }}
            >✏️ Notes {noteMode ? 'ON' : 'OFF'}</button>

            <button id="use-hint" onClick={handleHint} style={{
              padding:'12px', borderRadius:10, fontSize:13, fontWeight:600,
              background:'rgba(105,240,174,0.1)', border:'1px solid rgba(105,240,174,0.3)',
              color:'#69f0ae', cursor:'pointer',
            }}>💡 Hint</button>
          </div>

          {/* Instructions */}
          <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:16, fontSize:12, color:'rgba(255,255,255,0.35)', lineHeight:1.9 }}>
            <div style={{ color:'rgba(255,255,255,0.5)', fontWeight:600, marginBottom:8 }}>How to Play</div>
            Fill each row, column, and 3×3 box with numbers 1–9.<br />
            No repeats allowed!<br /><br />
            <b style={{color:'rgba(255,255,255,0.4)'}}>Keys:</b> 1-9 fill · 0/Del erase · Arrows navigate
          </div>
        </div>
      </div>

      {/* Win modal */}
      {won && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div style={{ background:'#1a1a2e', border:`1px solid ${accent}55`, borderRadius:24, padding:'48px 52px', textAlign:'center', animation:'pop 0.4s ease', maxWidth:380 }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🏆</div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:28, color:accent, marginBottom:8 }}>Solved!</div>
            <div style={{ color:'rgba(255,255,255,0.55)', marginBottom:8 }}>
              Time: <b style={{color:'#00e5ff'}}>{fmt(secs)}</b> · Mistakes: <b style={{color:'#ff5252'}}>{mistakes}</b>
            </div>
            <div style={{ display:'flex', gap:12, justifyContent:'center', marginTop:28 }}>
              <button id="won-new" onClick={()=>startGame()} style={{ padding:'12px 28px', borderRadius:10, background:`linear-gradient(135deg, ${accent}, ${accent}88)`, border:'none', color:'#000', fontFamily:'var(--font-head)', fontSize:14, fontWeight:700, cursor:'pointer' }}>New Game</button>
              <button id="won-back" onClick={onBack} style={{ padding:'12px 28px', borderRadius:10, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', color:'#fff', fontSize:14, cursor:'pointer' }}>← Lobby</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
