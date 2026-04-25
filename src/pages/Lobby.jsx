import React from 'react';

const GAMES = [
  {
    id: 'chess',
    emoji: '♟️',
    title: 'Chess',
    tagline: 'Classic strategy. Play vs AI or a friend.',
    accent: '#00e5ff',
    shadow: 'rgba(0,229,255,0.35)',
    badge: 'vs AI / vs Human',
    gradient: 'linear-gradient(135deg, #001a2e 0%, #00384a 100%)',
    stars: 5,
    plays: '2.4M',
  },
  {
    id: 'sudoku',
    emoji: '🔢',
    title: 'Sudoku',
    tagline: 'Train your mind. Fill the grid.',
    accent: '#ffd740',
    shadow: 'rgba(255,215,64,0.35)',
    badge: '3 Difficulties',
    gradient: 'linear-gradient(135deg, #1a1200 0%, #3a2e00 100%)',
    stars: 4,
    plays: '1.8M',
  },
  {
    id: 'candy',
    emoji: '🍬',
    title: 'Candy Crush',
    tagline: 'Sweet combos. Explosive cascades.',
    accent: '#e040fb',
    shadow: 'rgba(224,64,251,0.35)',
    badge: '30 Levels',
    gradient: 'linear-gradient(135deg, #1a002e 0%, #2e0050 100%)',
    stars: 5,
    plays: '5.1M',
  },
];

function StarRating({ count, color }) {
  return <span style={{ color, fontSize: 13 }}>{'★'.repeat(count)}{'☆'.repeat(5 - count)}</span>;
}

function GameCard({ game, onPlay }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      id={`card-${game.id}`}
      onClick={() => onPlay(game.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: game.gradient,
        border: `1px solid ${hovered ? game.accent : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 20, padding: '32px 28px', cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
        transition: 'transform 0.25s cubic-bezier(.22,.68,0,1.35), box-shadow 0.25s',
        transform: hovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: hovered
          ? `0 24px 60px ${game.shadow}, 0 0 0 1px ${game.accent}44`
          : '0 8px 24px rgba(0,0,0,0.4)',
        animation: 'slideUp 0.5s ease both',
        flex: '1 1 280px', maxWidth: 380, minWidth: 260,
      }}
    >
      {/* Glow blob */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 160, height: 160, borderRadius: '50%',
        background: game.accent, opacity: hovered ? 0.15 : 0.06,
        filter: 'blur(40px)', transition: 'opacity 0.3s', pointerEvents: 'none',
      }} />

      {/* Badge */}
      <div style={{
        display: 'inline-block',
        background: `${game.accent}22`, border: `1px solid ${game.accent}55`,
        borderRadius: 20, padding: '3px 12px',
        fontSize: 11, fontWeight: 600, color: game.accent, letterSpacing: 1, marginBottom: 20,
      }}>{game.badge}</div>

      {/* Emoji */}
      <div style={{
        fontSize: 64, lineHeight: 1, marginBottom: 16,
        filter: hovered ? `drop-shadow(0 0 16px ${game.accent})` : 'none',
        transition: 'filter 0.3s',
        animation: hovered ? 'float 2s ease-in-out infinite' : 'none',
      }}>{game.emoji}</div>

      {/* Title */}
      <h2 style={{
        fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 8,
        textShadow: hovered ? `0 0 20px ${game.accent}` : 'none', transition: 'text-shadow 0.3s',
      }}>{game.title}</h2>

      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
        {game.tagline}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <StarRating count={game.stars} color={game.accent} />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>🎮 {game.plays} plays</span>
      </div>

      <button style={{
        width: '100%', padding: '14px 0',
        background: hovered
          ? `linear-gradient(135deg, ${game.accent}, ${game.accent}aa)`
          : `${game.accent}22`,
        border: `1px solid ${game.accent}66`, borderRadius: 10,
        color: '#fff', fontFamily: 'var(--font-head)', fontSize: 13, fontWeight: 700, letterSpacing: 2,
        transition: 'all 0.25s',
        boxShadow: hovered ? `0 0 20px ${game.accent}66` : 'none',
      }}>PLAY NOW →</button>
    </div>
  );
}

export default function Lobby({ onPlay }) {
  return (
    <div style={{ minHeight: '100vh', padding: '0 0 60px' }}>
      {/* Header */}
      <header style={{
        padding: '28px 40px',
        background: 'rgba(13,13,26,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #e040fb, #448aff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>🎮</div>
          <span style={{
            fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 900,
            background: 'linear-gradient(90deg, #e040fb, #00e5ff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: 2,
          }}>ArcadeX</span>
        </div>
        <nav style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center', marginTop: 18 }}>
          {[['chess', '♟ Chess'], ['sudoku', '🔢 Sudoku'], ['candy', '🍬 Candy']].map(([id, label]) => (
            <button key={id} id={`nav-${id}`} onClick={() => onPlay(id)} style={{
              padding: '8px 18px', borderRadius: 8,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.12)'; e.target.style.color = '#fff'; }}
              onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = 'rgba(255,255,255,0.7)'; }}
            >{label}</button>
          ))}
        </nav>
      </header>

      {/* Hero */}
      <div style={{
        textAlign: 'center', padding: '72px 20px 56px',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,77,255,0.18) 0%, transparent 70%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {['#e040fb', '#00e5ff', '#ffd740'].map((c, i) => (
          <div key={i} style={{
            position: 'absolute', top: `${20 + i * 25}%`, left: `${5 + i * 40}%`,
            width: 200 + i * 80, height: 200 + i * 80, borderRadius: '50%',
            background: c, opacity: 0.04, filter: 'blur(60px)',
            animation: `float ${4 + i}s ease-in-out infinite`,
            animationDelay: `${i * 1.2}s`, pointerEvents: 'none',
          }} />
        ))}

        <div style={{
          display: 'inline-block',
          background: 'rgba(124,77,255,0.15)', border: '1px solid rgba(124,77,255,0.3)',
          borderRadius: 20, padding: '5px 18px',
          fontSize: 12, color: '#b39ddb', letterSpacing: 2, marginBottom: 24, fontWeight: 600,
        }}>✦ PREMIUM BROWSER GAMING PLATFORM</div>

        <h1 style={{
          fontFamily: 'var(--font-head)',
          fontSize: 'clamp(36px, 8vw, 76px)', fontWeight: 900, lineHeight: 1.05,
          background: 'linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.6))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 16,
        }}>
          Play. Compete.<br />
          <span style={{
            background: 'linear-gradient(90deg, #e040fb, #00e5ff, #ffd740)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Win.</span>
        </h1>

        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.45)', maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.6 }}>
          Three legendary games. One premium platform. No downloads needed.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
          {[['🎮', '3 Games'], ['⚡', 'Instant Play'], ['🏆', 'Score Tracking'], ['🤖', 'AI Opponents']].map(([icon, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Game cards */}
      <div style={{
        display: 'flex', gap: 24, flexWrap: 'wrap',
        justifyContent: 'center', padding: '0 24px',
        maxWidth: 1200, margin: '0 auto',
      }}>
        {GAMES.map(game => <GameCard key={game.id} game={game} onPlay={onPlay} />)}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 64, color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
        ArcadeX · 3 Games · No Ads · No Downloads · Built with ♥
      </div>
    </div>
  );
}
