import React, { useState, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

// ─── Window size hook ─────────────────────────────────────────────────────────
function useWindowWidth() {
  const subscribe = (cb) => {
    window.addEventListener('resize', cb);
    return () => window.removeEventListener('resize', cb);
  };
  const getSnapshot = () => window.innerWidth;
  const getServerSnapshot = () => 1024;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ─── Chess Logic ──────────────────────────────────────────────────────────────
const INIT_BOARD = () => {
  const b = Array(8).fill(null).map(() => Array(8).fill(null));
  const order = ['R','N','B','Q','K','B','N','R'];
  order.forEach((p, c) => {
    b[0][c] = { type: p, color: 'b' };
    b[7][c] = { type: p, color: 'w' };
  });
  for (let c = 0; c < 8; c++) {
    b[1][c] = { type: 'P', color: 'b' };
    b[6][c] = { type: 'P', color: 'w' };
  }
  return b;
};

const PIECE_UNICODE = {
  wK:'♔', wQ:'♕', wR:'♖', wB:'♗', wN:'♘', wP:'♙',
  bK:'♚', bQ:'♛', bR:'♜', bB:'♝', bN:'♞', bP:'♟',
};

// Material values
const PIECE_VALUE = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

// Positional bonus tables (for black; mirror for white)
const PST = {
  P: [
    [0,0,0,0,0,0,0,0],
    [50,50,50,50,50,50,50,50],
    [10,10,20,30,30,20,10,10],
    [5,5,10,25,25,10,5,5],
    [0,0,0,20,20,0,0,0],
    [5,-5,-10,0,0,-10,-5,5],
    [5,10,10,-20,-20,10,10,5],
    [0,0,0,0,0,0,0,0],
  ],
  N: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,0,0,0,0,-20,-40],
    [-30,0,10,15,15,10,0,-30],
    [-30,5,15,20,20,15,5,-30],
    [-30,0,15,20,20,15,0,-30],
    [-30,5,10,15,15,10,5,-30],
    [-40,-20,0,5,5,0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50],
  ],
  B: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,0,0,0,0,0,0,-10],
    [-10,0,5,10,10,5,0,-10],
    [-10,5,5,10,10,5,5,-10],
    [-10,0,10,10,10,10,0,-10],
    [-10,10,10,10,10,10,10,-10],
    [-10,5,0,0,0,0,5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20],
  ],
  R: [
    [0,0,0,0,0,0,0,0],
    [5,10,10,10,10,10,10,5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [0,0,0,5,5,0,0,0],
  ],
  Q: [
    [-20,-10,-10,-5,-5,-10,-10,-20],
    [-10,0,0,0,0,0,0,-10],
    [-10,0,5,5,5,5,0,-10],
    [-5,0,5,5,5,5,0,-5],
    [0,0,5,5,5,5,0,-5],
    [-10,5,5,5,5,5,0,-10],
    [-10,0,5,0,0,0,0,-10],
    [-20,-10,-10,-5,-5,-10,-10,-20],
  ],
  K: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20,20,0,0,0,0,20,20],
    [20,30,10,0,0,10,30,20],
  ],
};

function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function getMoves(board, r, c, enPassant) {
  const piece = board[r][c];
  if (!piece) return [];
  const { type, color } = piece;
  const opp = color === 'w' ? 'b' : 'w';
  const moves = [];

  const add = (nr, nc) => {
    if (!inBounds(nr, nc)) return false;
    if (board[nr][nc]?.color === color) return false;
    moves.push([nr, nc]);
    return !board[nr][nc];
  };
  const slide = (dr, dc) => {
    let r2 = r+dr, c2 = c+dc;
    while (inBounds(r2,c2) && board[r2][c2]?.color !== color) {
      moves.push([r2,c2]);
      if (board[r2][c2]) break;
      r2+=dr; c2+=dc;
    }
  };

  if (type === 'P') {
    const dir = color === 'w' ? -1 : 1;
    const start = color === 'w' ? 6 : 1;
    if (inBounds(r+dir,c) && !board[r+dir][c]) {
      moves.push([r+dir,c]);
      if (r===start && !board[r+2*dir]?.[c]) moves.push([r+2*dir,c]);
    }
    [-1,1].forEach(dc => {
      if (inBounds(r+dir, c+dc)) {
        if (board[r+dir][c+dc]?.color === opp) moves.push([r+dir,c+dc]);
        if (enPassant && enPassant[0]===r+dir && enPassant[1]===c+dc) moves.push([r+dir,c+dc]);
      }
    });
  }
  if (type==='R'||type==='Q') [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>slide(dr,dc));
  if (type==='B'||type==='Q') [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>slide(dr,dc));
  if (type==='N') [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>add(r+dr,c+dc));
  if (type==='K') [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>add(r+dr,c+dc));
  return moves;
}

function isInCheck(board, color) {
  let kr=-1, kc=-1;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++)
    if(board[r][c]?.type==='K'&&board[r][c]?.color===color) { kr=r; kc=c; }
  const opp = color==='w'?'b':'w';
  for(let r=0;r<8;r++) for(let c=0;c<8;c++)
    if(board[r][c]?.color===opp)
      if(getMoves(board,r,c,null).some(([mr,mc])=>mr===kr&&mc===kc)) return true;
  return false;
}

function getLegalMoves(board, r, c, enPassant) {
  return getMoves(board, r, c, enPassant).filter(([nr,nc]) => {
    const nb = board.map(row=>[...row]);
    nb[nr][nc] = nb[r][c];
    nb[r][c] = null;
    return !isInCheck(nb, board[r][c].color);
  });
}

function getAllLegalMoves(board, color, enPassant) {
  const all = [];
  for(let r=0;r<8;r++) for(let c=0;c<8;c++)
    if(board[r][c]?.color===color)
      for(const [nr,nc] of getLegalMoves(board,r,c,enPassant))
        all.push({ from:[r,c], to:[nr,nc] });
  return all;
}

// ─── AI Evaluation ────────────────────────────────────────────────────────────
function evaluateBoard(board) {
  let score = 0;
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const p = board[r][c];
    if (!p) continue;
    const val = PIECE_VALUE[p.type];
    const pstRow = p.color === 'b' ? r : 7-r;
    const pst = PST[p.type]?.[pstRow]?.[c] ?? 0;
    score += p.color === 'b' ? (val + pst) : -(val + pst);
  }
  return score;
}

function applyMove(board, from, to, enPassant) {
  const nb = board.map(row=>[...row]);
  const piece = nb[from[0]][from[1]];
  nb[to[0]][to[1]] = piece;
  nb[from[0]][from[1]] = null;
  // En passant capture
  if (piece.type==='P' && enPassant && to[0]===enPassant[0] && to[1]===enPassant[1]) {
    nb[from[0]][to[1]] = null;
  }
  // Pawn auto-promote to Queen
  if (piece.type==='P' && (to[0]===0 || to[0]===7)) {
    nb[to[0]][to[1]] = { type: 'Q', color: piece.color };
  }
  let ep = null;
  if (piece.type==='P' && Math.abs(to[0]-from[0])===2) ep = [(from[0]+to[0])/2, to[1]];
  return { board: nb, ep };
}

// Minimax with alpha-beta pruning
function minimax(board, depth, alpha, beta, maximizing, enPassant) {
  if (depth === 0) return { score: evaluateBoard(board) };

  const color = maximizing ? 'b' : 'w';
  const moves = getAllLegalMoves(board, color, enPassant);

  if (moves.length === 0) {
    if (isInCheck(board, color)) return { score: maximizing ? -99999 : 99999 };
    return { score: 0 }; // stalemate
  }

  // Move ordering: captures first
  moves.sort((a, b) => {
    const ca = board[a.to[0]][a.to[1]] ? PIECE_VALUE[board[a.to[0]][a.to[1]].type] : 0;
    const cb = board[b.to[0]][b.to[1]] ? PIECE_VALUE[board[b.to[0]][b.to[1]].type] : 0;
    return cb - ca;
  });

  let bestMove = null;
  let bestScore = maximizing ? -Infinity : Infinity;

  for (const move of moves) {
    const { board: nb, ep } = applyMove(board, move.from, move.to, enPassant);
    const result = minimax(nb, depth-1, alpha, beta, !maximizing, ep);
    if (maximizing ? result.score > bestScore : result.score < bestScore) {
      bestScore = result.score;
      bestMove = move;
    }
    if (maximizing) alpha = Math.max(alpha, bestScore);
    else            beta  = Math.min(beta,  bestScore);
    if (beta <= alpha) break;
  }
  return { score: bestScore, move: bestMove };
}

function getBestMove(board, enPassant, depth = 3) {
  const result = minimax(board, depth, -Infinity, Infinity, true, enPassant);
  return result.move;
}

// ─── Game status helpers ──────────────────────────────────────────────────────
function evalStatus(board, color, ep) {
  const moves = getAllLegalMoves(board, color, ep);
  if (moves.length === 0) return isInCheck(board, color) ? 'checkmate' : 'stalemate';
  if (isInCheck(board, color)) return 'check';
  return '';
}

// ─── Component ────────────────────────────────────────────────────────────────
const DIFF_DEPTH = { easy: 1, medium: 3, hard: 4 };

export default function ChessGame({ onBack }) {
  const winW = useWindowWidth();
  const [mode, setMode] = useState('select');       // 'select' | 'vs_ai' | 'vs_human'
  const [difficulty, setDifficulty] = useState('medium');
  const [board, setBoard] = useState(INIT_BOARD());
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [turn, setTurn] = useState('w');
  const [enPassant, setEnPassant] = useState(null);
  const [status, setStatus] = useState('');
  const [captured, setCaptured] = useState({ w: [], b: [] });
  const [promotion, setPromotion] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [thinking, setThinking] = useState(false);
  const thinkingRef = useRef(false);

  // ── AI move trigger ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'vs_ai' || turn !== 'b' || status === 'checkmate' || status === 'stalemate' || promotion) return;
    if (thinkingRef.current) return;

    thinkingRef.current = true;
    setThinking(true);

    const depth = DIFF_DEPTH[difficulty];

    // Run in macro-task so the UI shows "thinking" first
    setTimeout(() => {
      const best = getBestMove(board, enPassant, depth);
      if (!best) { setThinking(false); thinkingRef.current = false; return; }

      const { from, to } = best;
      const nb = board.map(r=>[...r]);
      const moved = nb[from[0]][from[1]];
      const cap   = nb[to[0]][to[1]];

      if (cap) setCaptured(prev => ({ ...prev, [moved.color]: [...prev[moved.color], cap.type] }));

      // En passant capture
      let ep = null;
      if (moved.type==='P' && moved.color==='b' && enPassant && to[0]===enPassant[0] && to[1]===enPassant[1]) {
        nb[from[0]][to[1]] = null;
        setCaptured(prev => ({ ...prev, b: [...prev.b, 'P'] }));
      }
      if (moved.type==='P' && Math.abs(to[0]-from[0])===2) ep = [(from[0]+to[0])/2, to[1]];

      nb[to[0]][to[1]] = moved;
      nb[from[0]][from[1]] = null;

      // Auto-promote to queen
      if (moved.type==='P' && to[0]===7) nb[to[0]][to[1]] = { type:'Q', color:'b' };

      const cols = 'abcdefgh';
      setMoveHistory(prev=>[...prev, `♟ ${cols[from[1]]}${8-from[0]}→${cols[to[1]]}${8-to[0]}`]);
      setLastMove([from, to]);

      const s = evalStatus(nb, 'w', ep);
      setBoard(nb);
      setEnPassant(ep);
      setTurn('w');
      setStatus(s);
      setThinking(false);
      thinkingRef.current = false;
    }, 50);
  }, [turn, mode, board, enPassant, status, promotion, difficulty]);

  // ── Player click ────────────────────────────────────────────────────────────
  const handleClick = useCallback((r, c) => {
    if (status==='checkmate'||status==='stalemate') return;
    if (promotion) return;
    if (mode==='vs_ai' && turn==='b') return; // AI's turn
    if (thinking) return;

    const piece = board[r][c];

    if (selected) {
      const [sr, sc] = selected;
      const isLegal = legalMoves.some(([lr,lc])=>lr===r&&lc===c);

      if (isLegal) {
        const nb = board.map(row=>[...row]);
        const moved = nb[sr][sc];
        const cap   = nb[r][c];

        if (cap) setCaptured(prev=>({ ...prev, [moved.color]: [...prev[moved.color], cap.type] }));

        let ep = null;
        if (moved.type==='P' && Math.abs(r-sr)===2) ep = [(sr+r)/2, c];
        if (moved.type==='P' && enPassant && r===enPassant[0] && c===enPassant[1]) {
          nb[sr][c] = null;
          setCaptured(prev=>({ ...prev, [moved.color]: [...prev[moved.color], 'P'] }));
        }

        nb[r][c] = moved;
        nb[sr][sc] = null;

        const cols = 'abcdefgh';
        setMoveHistory(prev=>[...prev, `${moved.color==='w'?'♙':'♟'} ${cols[sc]}${8-sr}→${cols[c]}${8-r}`]);
        setLastMove([[sr,sc],[r,c]]);

        if (moved.type==='P' && (r===0||r===7)) {
          setBoard(nb); setPromotion({ r, c, color: moved.color });
          setSelected(null); setLegalMoves([]);
          return;
        }

        const nextTurn = turn==='w'?'b':'w';
        const s = evalStatus(nb, nextTurn, ep);
        setBoard(nb); setEnPassant(ep); setTurn(nextTurn); setStatus(s);
        setSelected(null); setLegalMoves([]);
      } else if (piece?.color===turn) {
        setSelected([r,c]);
        setLegalMoves(getLegalMoves(board,r,c,enPassant));
      } else {
        setSelected(null); setLegalMoves([]);
      }
    } else {
      if (piece?.color===turn) {
        setSelected([r,c]);
        setLegalMoves(getLegalMoves(board,r,c,enPassant));
      }
    }
  }, [board, selected, legalMoves, turn, enPassant, status, promotion, mode, thinking]);

  const handlePromotion = (type) => {
    if (!promotion) return;
    const nb = board.map(r=>[...r]);
    nb[promotion.r][promotion.c] = { type, color: promotion.color };
    const nextTurn = promotion.color==='w'?'b':'w';
    const s = evalStatus(nb, nextTurn, enPassant);
    setBoard(nb); setPromotion(null); setTurn(nextTurn); setStatus(s);
  };

  const reset = (newMode, newDiff) => {
    const m = newMode ?? mode;
    const d = newDiff ?? difficulty;
    thinkingRef.current = false;
    setBoard(INIT_BOARD()); setSelected(null); setLegalMoves([]);
    setTurn('w'); setEnPassant(null); setStatus('');
    setCaptured({ w:[], b:[] }); setPromotion(null);
    setMoveHistory([]); setLastMove(null); setThinking(false);
    setMode(m);
    setDifficulty(d);
  };

  // ── Mode selection screen ───────────────────────────────────────────────────
  if (mode === 'select') {
    return (
      <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, padding:'18px 28px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)' }}>
          <button id="chess-back" onClick={onBack} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', borderRadius:8, padding:'8px 16px', fontSize:14 }}>← Back</button>
          <span style={{ fontSize:22 }}>♟️</span>
          <h1 style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:900, color:'#00e5ff' }}>Chess</h1>
        </div>

        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px', gap:28 }}>
          <h2 style={{ fontFamily:'var(--font-head)', fontSize:32, color:'#fff', textAlign:'center' }}>Choose Your Mode</h2>

          {/* Mode cards */}
          <div style={{ display:'flex', gap:20, flexWrap:'wrap', justifyContent:'center' }}>
            {[
              { id:'vs_ai', icon:'🤖', title:'vs Computer', sub:'Play against AI', color:'#00e5ff' },
              { id:'vs_human', icon:'👥', title:'vs Human', sub:'Pass & play locally', color:'#ffd740' },
            ].map(opt => (
              <div key={opt.id} id={`mode-${opt.id}`}
                onClick={() => { if (opt.id==='vs_ai') setMode('diff_select'); else reset('vs_human'); }}
                style={{
                  background:`linear-gradient(135deg, ${opt.color}11, ${opt.color}06)`,
                  border:`1px solid ${opt.color}44`, borderRadius:20,
                  padding:'36px 44px', cursor:'pointer', textAlign:'center',
                  transition:'all 0.25s', width:220,
                }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-6px)'; e.currentTarget.style.boxShadow=`0 20px 50px ${opt.color}33`;}}
                onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none';}}
              >
                <div style={{ fontSize:52, marginBottom:16 }}>{opt.icon}</div>
                <div style={{ fontFamily:'var(--font-head)', fontSize:18, color:opt.color, marginBottom:8 }}>{opt.title}</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.45)' }}>{opt.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Difficulty selection ────────────────────────────────────────────────────
  if (mode === 'diff_select') {
    return (
      <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, padding:'18px 28px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)' }}>
          <button onClick={() => setMode('select')} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', borderRadius:8, padding:'8px 16px', fontSize:14 }}>← Back</button>
          <span style={{ fontSize:22 }}>🤖</span>
          <h1 style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:900, color:'#00e5ff' }}>vs Computer</h1>
        </div>

        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40, gap:28 }}>
          <h2 style={{ fontFamily:'var(--font-head)', fontSize:28, color:'#fff' }}>Select Difficulty</h2>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap', justifyContent:'center' }}>
            {[
              { id:'easy',   icon:'😊', label:'Easy',   sub:'Beginner friendly', color:'#69f0ae', depth:1 },
              { id:'medium', icon:'🎯', label:'Medium',  sub:'A fair challenge',  color:'#ffd740', depth:3 },
              { id:'hard',   icon:'🔥', label:'Hard',    sub:'Think carefully!',  color:'#ff5252', depth:4 },
            ].map(d => (
              <div key={d.id} id={`diff-${d.id}`}
                onClick={() => reset('vs_ai', d.id)}
                style={{
                  background:`linear-gradient(135deg, ${d.color}11, ${d.color}05)`,
                  border:`1px solid ${d.color}44`, borderRadius:18,
                  padding:'30px 36px', cursor:'pointer', textAlign:'center', width:180,
                  transition:'all 0.25s',
                }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-5px)';e.currentTarget.style.boxShadow=`0 16px 40px ${d.color}33`;}}
                onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}
              >
                <div style={{ fontSize:40, marginBottom:12 }}>{d.icon}</div>
                <div style={{ fontFamily:'var(--font-head)', fontSize:16, color:d.color, marginBottom:6 }}>{d.label}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{d.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Game board ──────────────────────────────────────────────────────────────
  // On mobile (< 640px) use nearly full width minus padding; on desktop cap at 520 with sidebar offset
  const isMobile = winW < 640;
  const boardMaxPx = isMobile ? winW - 32 : Math.min(winW - 300, 520);
  const CELL = Math.min(isMobile ? 52 : 60, Math.floor(boardMaxPx / 8));
  const LIGHT = '#e8d5b7', DARK = '#b58863';
  const isKingInCheck = (r, c) => {
    const p = board[r][c];
    return status==='check' && p?.type==='K' && p?.color===turn;
  };
  const isLastMove = (r, c) => lastMove?.some(([lr,lc])=>lr===r&&lc===c);

  const diffColors = { easy:'#69f0ae', medium:'#ffd740', hard:'#ff5252' };
  const diffColor  = diffColors[difficulty] ?? '#00e5ff';

  const statusLabel = () => {
    if (status === 'checkmate') {
      const winner = turn === 'w' ? (mode === 'vs_ai' ? 'Computer' : 'Black') : (mode === 'vs_ai' ? 'You' : 'White');
      return `${winner} win${winner==='You'?'':'s'}! 🏆`;
    }
    if (status === 'stalemate') return 'Stalemate — Draw 🤝';
    if (thinking) return '🤖 Computer is thinking...';
    if (status === 'check') return `${turn==='w'?'White':'Black'} is in Check! ⚠️`;
    if (mode === 'vs_ai') return turn === 'w' ? 'Your turn (White)' : "Computer's turn (Black)";
    return `${turn==='w'?'White':'Black'}'s turn`;
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding: isMobile ? '10px 12px' : '14px 24px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)', flexWrap:'wrap', rowGap:8 }}>
        <button id="chess-back" onClick={onBack} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', borderRadius:8, padding: isMobile ? '6px 10px' : '8px 14px', fontSize: isMobile ? 12 : 13, whiteSpace:'nowrap' }}>← Lobby</button>
        <button id="chess-mode" onClick={() => setMode('select')} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)', borderRadius:8, padding: isMobile ? '6px 10px' : '8px 14px', fontSize: isMobile ? 12 : 13, whiteSpace:'nowrap' }}>⚙ Mode</button>
        <span style={{ fontSize: isMobile ? 16 : 20 }}>♟️</span>
        <h1 style={{ fontFamily:'var(--font-head)', fontSize: isMobile ? 16 : 20, fontWeight:900, color:'#00e5ff' }}>Chess</h1>

        {mode === 'vs_ai' && (
          <div style={{ display:'flex', gap:4 }}>
            {['easy','medium','hard'].map(d => (
              <button key={d} id={`chess-diff-${d}`}
                onClick={() => reset('vs_ai', d)}
                style={{ padding: isMobile ? '4px 8px' : '5px 12px', borderRadius:8, fontSize: isMobile ? 10 : 11, fontWeight:600, cursor:'pointer',
                  background: difficulty===d ? `${diffColors[d]}22` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${difficulty===d ? diffColors[d] : 'rgba(255,255,255,0.1)'}`,
                  color: difficulty===d ? diffColors[d] : 'rgba(255,255,255,0.4)', textTransform:'capitalize',
                }}
              >{d}</button>
            ))}
          </div>
        )}

        <div style={{ flex:1 }} />
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {mode === 'vs_ai' && !isMobile && (
            <div style={{ padding:'6px 14px', borderRadius:8, background:'rgba(0,229,255,0.08)', border:'1px solid rgba(0,229,255,0.25)', fontSize:12, color:'#00e5ff', fontWeight:600, whiteSpace:'nowrap' }}>
              🤖 {difficulty.charAt(0).toUpperCase()+difficulty.slice(1)}
            </div>
          )}
          <button id="chess-reset" onClick={()=>reset()} style={{ background:`${diffColor}15`, border:`1px solid ${diffColor}44`, color:diffColor, borderRadius:8, padding: isMobile ? '6px 10px' : '8px 16px', fontSize: isMobile ? 12 : 13, fontWeight:600, whiteSpace:'nowrap' }}>New Game</button>
        </div>
      </div>

      <div style={{ flex:1, display:'flex', gap: isMobile ? 12 : 20, padding: isMobile ? '12px 16px' : '20px 24px', flexDirection: isMobile ? 'column' : 'row', flexWrap: isMobile ? 'nowrap' : 'wrap', justifyContent:'center', alignItems: isMobile ? 'center' : 'flex-start' }}>
        {/* Board column */}
        <div>
          {/* Turn + status */}
          <div style={{
            display:'flex', alignItems:'center', gap:10, marginBottom:12,
            padding:'10px 16px', background:'rgba(255,255,255,0.04)',
            border:`1px solid ${thinking ? '#ffd740' : status==='check'||status==='checkmate' ? '#ff5252' : 'rgba(255,255,255,0.08)'}`,
            borderRadius:10, transition:'border-color 0.3s',
            animation: thinking ? 'pulse 1s ease-in-out infinite' : 'none',
          }}>
            <div style={{
              width:14, height:14, borderRadius:'50%',
              background: turn==='w' ? '#fff' : '#222',
              border:'2px solid rgba(255,255,255,0.4)',
              boxShadow: thinking ? '0 0 10px #ffd740' : turn==='w' ? '0 0 8px rgba(255,255,255,0.5)' : 'none',
              flexShrink:0,
            }} />
            <span style={{ fontFamily:'var(--font-head)', fontSize:12, color: thinking ? '#ffd740' : '#fff' }}>
              {statusLabel()}
            </span>
            {thinking && <div style={{ width:14, height:14, border:'2px solid #ffd740', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite', flexShrink:0 }} />}
          </div>

          {/* Captured by white */}
          <div style={{ minHeight:26, marginBottom:6, fontSize:16, letterSpacing:1 }}>
            {captured.b.map((t,i)=><span key={i}>{PIECE_UNICODE['b'+t]}</span>)}
          </div>

          {/* Board */}
          <div style={{ border:'3px solid #5c3d1e', borderRadius:4, overflow:'hidden', boxShadow:'0 16px 50px rgba(0,0,0,0.8)', display:'inline-block' }}>
            {board.map((row, r) => (
              <div key={r} style={{ display:'flex' }}>
                {row.map((piece, c) => {
                  const isLight   = (r+c)%2===0;
                  const isSel     = selected?.[0]===r && selected?.[1]===c;
                  const isHint    = legalMoves.some(([lr,lc])=>lr===r&&lc===c);
                  const isLast    = isLastMove(r,c);
                  const isCheck   = isKingInCheck(r,c);

                  let bg = isLight ? LIGHT : DARK;
                  if (isLast)  bg = isLight ? '#cdd16f' : '#aaa23a';
                  if (isSel)   bg = '#f6f669';
                  if (isCheck) bg = '#ff6b6b';

                  return (
                    <div key={c} id={`sq-${r}-${c}`}
                      onClick={() => handleClick(r,c)}
                      style={{
                        width:CELL, height:CELL, background:bg,
                        position:'relative', cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        transition:'background 0.1s',
                        userSelect:'none',
                      }}
                    >
                      {isHint && !piece && (
                        <div style={{ width:CELL*0.3, height:CELL*0.3, borderRadius:'50%', background:'rgba(0,0,0,0.22)', pointerEvents:'none' }} />
                      )}
                      {isHint && piece && (
                        <div style={{ position:'absolute', inset:0, border:`${CELL*0.08}px solid rgba(0,0,0,0.22)`, borderRadius:'50%', pointerEvents:'none' }} />
                      )}
                      {piece && (
                        <span style={{
                          fontSize:CELL*0.7, lineHeight:1, zIndex:1,
                          filter: isSel ? 'drop-shadow(0 0 6px rgba(255,255,0,0.9))' : 'drop-shadow(1px 2px 2px rgba(0,0,0,0.3))',
                          color: piece.color==='w' ? '#fff' : '#1a1a1a',
                          WebkitTextStroke: piece.color==='w' ? '1px #8b6914' : '1px transparent',
                          transition:'filter 0.12s',
                          // Dim AI pieces to show they're not clickable
                          opacity: mode==='vs_ai' && piece.color==='b' && turn==='w' ? 1 : 1,
                        }}>
                          {PIECE_UNICODE[piece.color+piece.type]}
                        </span>
                      )}
                      {c===0 && <div style={{ position:'absolute', top:2, left:3, fontSize:9, fontWeight:700, color:isLight?DARK:LIGHT, lineHeight:1 }}>{8-r}</div>}
                      {r===7 && <div style={{ position:'absolute', bottom:2, right:3, fontSize:9, fontWeight:700, color:isLight?DARK:LIGHT, lineHeight:1 }}>{'abcdefgh'[c]}</div>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Captured by black */}
          <div style={{ minHeight:26, marginTop:6, fontSize:16, letterSpacing:1 }}>
            {captured.w.map((t,i)=><span key={i}>{PIECE_UNICODE['w'+t]}</span>)}
          </div>

          {/* Player labels */}
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:10 }}>
            <div style={{ fontFamily:'var(--font-head)', fontSize:11, color: turn==='w'?'#fff':'rgba(255,255,255,0.3)', transition:'color 0.3s' }}>
              {mode==='vs_ai' ? '👤 You (White)' : '⬜ White'}
            </div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:11, color: turn==='b'?'#fff':'rgba(255,255,255,0.3)', transition:'color 0.3s' }}>
              {mode==='vs_ai' ? '🤖 Computer (Black)' : '⬛ Black'}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width: isMobile ? '100%' : 210, maxWidth: isMobile ? CELL * 8 + 6 : 'none', display:'flex', flexDirection: isMobile ? 'row' : 'column', gap: isMobile ? 10 : 14 }}>
          {/* Move history */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding: isMobile ? '10px 12px' : 16, maxHeight: isMobile ? 120 : 400, overflowY:'auto', flex:1 }}>
            <div style={{ fontFamily:'var(--font-head)', fontSize:11, color:'#00e5ff', marginBottom: isMobile ? 6 : 12, letterSpacing:1 }}>MOVE HISTORY</div>
            {moveHistory.length===0
              ? <div style={{ color:'rgba(255,255,255,0.2)', fontSize:12 }}>No moves yet</div>
              : moveHistory.map((m,i)=>(
                  <div key={i} style={{ padding:'4px 6px', borderRadius:6, background:i%2===0?'rgba(255,255,255,0.04)':'transparent', fontSize: isMobile ? 11 : 12, color:'rgba(255,255,255,0.65)', display:'flex', gap:8 }}>
                    <span style={{ color:'rgba(255,255,255,0.2)', fontSize:10 }}>{i+1}.</span>{m}
                  </div>
                ))}
          </div>

          {/* How to play */}
          <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding: isMobile ? '10px 12px' : 14, fontSize:11, color:'rgba(255,255,255,0.35)', lineHeight:1.9, flex: isMobile ? '0 0 auto' : undefined }}>
            <div style={{ color:'rgba(255,255,255,0.45)', fontWeight:600, marginBottom:6 }}>Controls</div>
            {isMobile ? 'Tap piece → tap destination' : 'Click a piece → click destination'}<br />
            {!isMobile && <>Green dots = legal moves<br /></>}
            {mode==='vs_ai' && <>You play <b style={{color:'#fff'}}>White</b>.</>}
          </div>
        </div>
      </div>

      {/* Promotion modal */}
      {promotion && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div style={{ background:'#1a1a2e', border:'1px solid rgba(255,255,255,0.15)', borderRadius:20, padding:'32px 40px', textAlign:'center', animation:'pop 0.3s ease' }}>
            <div style={{ fontFamily:'var(--font-head)', fontSize:15, color:'#ffd740', marginBottom:20 }}>♟ Promote Pawn</div>
            <div style={{ display:'flex', gap:14, justifyContent:'center' }}>
              {['Q','R','B','N'].map(t=>(
                <button key={t} id={`promote-${t}`} onClick={()=>handlePromotion(t)}
                  style={{ fontSize:44, background:'rgba(255,255,255,0.07)', border:'2px solid rgba(255,255,255,0.2)', borderRadius:12, width:68, height:68, cursor:'pointer',
                    color:promotion.color==='w'?'#fff':'#222', transition:'all 0.2s',
                    WebkitTextStroke:promotion.color==='w'?'1px #8b6914':'1px transparent',
                  }}
                  onMouseEnter={e=>{e.target.style.background='rgba(255,215,64,0.2)';e.target.style.transform='scale(1.1)';}}
                  onMouseLeave={e=>{e.target.style.background='rgba(255,255,255,0.07)';e.target.style.transform='scale(1)';}}
                >{PIECE_UNICODE[promotion.color+t]}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Game over modal */}
      {(status==='checkmate'||status==='stalemate') && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300 }}>
          <div style={{ background:'#0d1a2e', border:'1px solid rgba(0,229,255,0.35)', borderRadius:24, padding:'44px 52px', textAlign:'center', animation:'pop 0.4s ease', maxWidth:360 }}>
            <div style={{ fontSize:52, marginBottom:14 }}>{status==='checkmate' ? (turn==='b'||(mode==='vs_ai'&&turn==='b') ? '🏆':'💔') : '🤝'}</div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:26, color: status==='checkmate'&&turn!=='w'?'#69f0ae':'#00e5ff', marginBottom:10 }}>
              {status==='stalemate' ? 'Stalemate!' : statusLabel()}
            </div>
            <div style={{ color:'rgba(255,255,255,0.4)', fontSize:13, marginBottom:28 }}>
              {moveHistory.length} moves played
            </div>
            <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
              <button id="gameover-new" onClick={()=>setMode('select')} style={{ padding:'12px 26px', borderRadius:10, background:'linear-gradient(135deg,#00e5ff,#448aff)', border:'none', color:'#000', fontFamily:'var(--font-head)', fontSize:13, fontWeight:700, cursor:'pointer' }}>Play Again</button>
              <button id="gameover-lobby" onClick={onBack} style={{ padding:'12px 26px', borderRadius:10, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', color:'#fff', fontSize:13, cursor:'pointer' }}>← Lobby</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
