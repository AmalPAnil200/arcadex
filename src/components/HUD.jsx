import React from 'react';

// Animated health bar
function HealthBar({ health }) {
  const pct = Math.max(0, Math.min(100, health));
  const color = pct > 50 ? '#00e676' : pct > 25 ? '#ffb74d' : '#ff1744';
  return (
    <div id="health-bar-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: '#aaa', fontFamily: 'Orbitron', letterSpacing: 1 }}>HP</span>
      <div style={{
        width: 110, height: 10, background: 'rgba(255,255,255,0.08)',
        borderRadius: 5, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)'
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: color,
          borderRadius: 5,
          boxShadow: `0 0 8px ${color}`,
          transition: 'width 0.2s ease, background 0.3s ease',
        }} />
      </div>
      <span style={{ fontSize: 11, color, fontFamily: 'Orbitron', minWidth: 30 }}>{pct}</span>
    </div>
  );
}

// Wanted stars
function WantedStars({ level }) {
  return (
    <div id="wanted-stars" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: '#aaa', fontFamily: 'Orbitron', letterSpacing: 1, marginRight: 4 }}>⚠</span>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{
          fontSize: 16,
          color: n <= level ? '#ffe01b' : 'rgba(255,255,255,0.1)',
          textShadow: n <= level ? '0 0 10px #ffe01b, 0 0 20px #ff8c00' : 'none',
          transition: 'all 0.2s',
        }}>★</span>
      ))}
    </div>
  );
}

// Cash counter
function CashDisplay({ cash }) {
  return (
    <div id="cash-display" style={{
      fontFamily: 'Orbitron', fontSize: 20, fontWeight: 900,
      color: '#ffe01b',
      textShadow: '0 0 12px #ffe01b, 0 0 24px #ff8c00',
      letterSpacing: 2,
    }}>
      ${cash.toLocaleString()}
    </div>
  );
}

// Speedometer (when in car)
function Speedometer({ speed, visible }) {
  return (
    <div id="speedometer" style={{
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <div style={{
        fontFamily: 'Orbitron', fontSize: 28, fontWeight: 900,
        color: '#00f5ff', textShadow: '0 0 12px #00f5ff, 0 0 30px #00f5ff',
      }}>{speed}</div>
      <div style={{ fontFamily: 'Orbitron', fontSize: 9, color: '#007788', letterSpacing: 2 }}>MPH</div>
    </div>
  );
}

// Location badge
function LocationBadge({ location }) {
  if (!location) return null;
  return (
    <div id="location-badge" style={{
      position: 'absolute',
      bottom: 120, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(8,8,20,0.8)',
      border: '1px solid rgba(180,75,255,0.5)',
      borderRadius: 8, padding: '10px 22px',
      textAlign: 'center',
      animation: 'fadeInOut 3s ease',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ fontFamily: 'Orbitron', fontSize: 9, color: '#b44bff', letterSpacing: 3, marginBottom: 4 }}>ENTERING</div>
      <div style={{ fontFamily: 'Orbitron', fontSize: 18, color: '#fff', textShadow: '0 0 10px #b44bff' }}>{location}</div>
    </div>
  );
}

// Mobile action button
function ActionButton({ id, label, onPress, color = '#ff2d78' }) {
  return (
    <button
      id={id}
      onTouchStart={(e) => { e.preventDefault(); onPress(); }}
      onClick={onPress}
      style={{
        width: 56, height: 56,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${color}88, ${color}22)`,
        border: `2px solid ${color}`,
        color: '#fff',
        fontFamily: 'Orbitron',
        fontSize: 10,
        fontWeight: 700,
        cursor: 'pointer',
        letterSpacing: 1,
        boxShadow: `0 0 12px ${color}66`,
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {label}
    </button>
  );
}

// Mini-map
function MiniMap({ playerX, playerY }) {
  const SIZE = 90;
  const WORLD_PX = 32 * 48;

  return (
    <div id="mini-map" style={{
      width: SIZE, height: SIZE,
      background: 'rgba(8,8,20,0.85)',
      border: '1px solid rgba(255,45,120,0.4)',
      borderRadius: 8,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Simple road lines on minimap */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.3 }}>
        {[6,11,16,21,26].map(c => (
          <div key={`cv${c}`} style={{
            position: 'absolute',
            left: `${(c / 32) * 100}%`,
            top: 0, bottom: 0, width: 1,
            background: '#888',
          }} />
        ))}
        {[0,5,10,15,20,25,30].map(r => (
          <div key={`rh${r}`} style={{
            position: 'absolute',
            top: `${(r / 32) * 100}%`,
            left: 0, right: 0, height: 1,
            background: '#888',
          }} />
        ))}
      </div>
      {/* Player dot */}
      <div style={{
        position: 'absolute',
        left: `${(playerX / WORLD_PX) * 100}%`,
        top: `${(playerY / WORLD_PX) * 100}%`,
        width: 6, height: 6,
        background: '#ff2d78',
        borderRadius: '50%',
        boxShadow: '0 0 6px #ff2d78',
        transform: 'translate(-50%, -50%)',
        transition: 'left 0.05s, top 0.05s',
      }} />
    </div>
  );
}

export default function HUD({ hud, onEnterExit, onHonk }) {
  const { health = 100, cash = 0, wanted = 0, inCar = false, speed = 0, location = '', playerX = 0, playerY = 0 } = hud;
  const isMobile = window.innerWidth < 768;

  return (
    <>
      {/* Top-left: Health + Wanted */}
      <div id="hud-top-left" style={{
        position: 'absolute', top: 16, left: 16,
        display: 'flex', flexDirection: 'column', gap: 10,
        zIndex: 100,
      }}>
        <div className="hud-panel">
          <HealthBar health={health} />
        </div>
        <div className="hud-panel">
          <WantedStars level={wanted} />
        </div>
      </div>

      {/* Top-right: Cash + Speed */}
      <div id="hud-top-right" style={{
        position: 'absolute', top: 16, right: 16,
        display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end',
        zIndex: 100,
      }}>
        <div className="hud-panel">
          <CashDisplay cash={cash} />
        </div>
        {inCar && (
          <div className="hud-panel">
            <Speedometer speed={speed} visible={inCar} />
          </div>
        )}
      </div>

      {/* Bottom-right: Mini-map */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16, zIndex: 100,
      }}>
        <MiniMap playerX={playerX} playerY={playerY} />
      </div>

      {/* Location badge */}
      <LocationBadge location={location} />

      {/* Mobile controls */}
      {isMobile && (
        <div id="mobile-controls" style={{
          position: 'absolute', bottom: 20, right: 110,
          display: 'flex', gap: 14, zIndex: 100,
        }}>
          <ActionButton id="btn-enter" label={inCar ? 'EXIT' : 'GET IN'} onPress={onEnterExit} color="#ff2d78" />
          <ActionButton id="btn-honk" label="HONK" onPress={onHonk} color="#00f5ff" />
        </div>
      )}

      {/* Controls help */}
      <div id="controls-hint" style={{
        position: 'absolute', bottom: 16, left: 16, zIndex: 100,
      }}>
        <div className="hud-panel" style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.8, fontFamily: 'Inter' }}>
          {isMobile ? (
            <>🕹 Left: Move &nbsp;|&nbsp; F Enter/Exit car</>
          ) : (
            <>WASD / ↑↓←→ Move &nbsp;|&nbsp; F Enter/Exit car &nbsp;|&nbsp; Shift Run &nbsp;|&nbsp; Space Honk</>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInOut {
          0%   { opacity: 0; transform: translateX(-50%) translateY(10px); }
          15%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          75%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </>
  );
}
