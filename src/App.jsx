import React, { useState } from 'react';
import Lobby from './pages/Lobby.jsx';
import ChessGame from './pages/Chess.jsx';
import SudokuGame from './pages/Sudoku.jsx';
import CandyGame from './pages/Candy.jsx';

export default function App() {
  const [page, setPage] = useState('lobby');
  const go   = (p) => setPage(p);
  const back = () => setPage('lobby');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {page === 'lobby'  && <Lobby      onPlay={go}  />}
      {page === 'chess'  && <ChessGame  onBack={back} />}
      {page === 'sudoku' && <SudokuGame onBack={back} />}
      {page === 'candy'  && <CandyGame  onBack={back} />}
    </div>
  );
}
