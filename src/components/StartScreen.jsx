import React from 'react';

export default function StartScreen({ onStart }) {
  return (
    <div id="start-screen" style={{
      position: 'absolute', inset: 0,
      background: 'radial-gradient(ellipse at 50% 30%, #1a0530 0%, #080810 70%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 200,
      overflow: 'hidden',
    }}>
      {/* Animated neon grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(180,75,255,0.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(180,75,255,0.07) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        perspective: '600px',
        transform: 'rotateX(60deg) translateY(-30%) scale(1.8)',
        transformOrigin: '50% 100%',
        animation: 'gridMove 8s linear infinite',
      }} />

      {/* Sun/Horizon */}
      <div style={{
        position: 'absolute', bottom: '30%', left: '50%',
        transform: 'translateX(-50%)',
        width: 260, height: 130,
        borderRadius: '130px 130px 0 0',
        background: 'linear-gradient(180deg, #ff2d78 0%, #ff8c00 50%, #ffe01b 100%)',
        boxShadow: '0 0 80px #ff2d7888, 0 0 160px #ff2d7844',
        overflow: 'hidden',
      }}>
        {/* Horizontal stripes */}
        {[30, 50, 65, 76, 84, 90, 95, 100].map((top, i) => (
          <div key={i} style={{
            position: 'absolute', top: `${top}%`, left: 0, right: 0,
            height: 3, background: '#1a0530', opacity: 0.6,
          }} />
        ))}
      </div>

      {/* Ocean reflection */}
      <div style={{
        position: 'absolute', bottom: '28%', left: '20%', right: '20%',
        height: 2, background: 'linear-gradient(90deg, transparent, #ff8c0066, transparent)',
      }} />

      {/* City skyline silhouette */}
      <div style={{
        position: 'absolute', bottom: '30%', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 2, alignItems: 'flex-end',
      }}>
        {[50,80,40,100,60,90,35,70,55,85,45].map((h, i) => (
          <div key={i} style={{
            width: 18 + (i % 3) * 8, height: h,
            background: '#0a0a18',
            position: 'relative', overflow: 'hidden',
            borderTop: `2px solid ${i % 2 === 0 ? '#ff2d7822' : '#b44bff22'}`,
          }}>
            {/* Building windows */}
            {Array.from({ length: Math.floor(h / 14) }, (_, r) => (
              <div key={r} style={{ display: 'flex', gap: 3, padding: '3px 3px 0' }}>
                {Array.from({ length: 2 }, (_, c) => (
                  <div key={c} style={{
                    width: 5, height: 7,
                    background: Math.random() > 0.4 ? '#ffe08a55' : '#00000000',
                  }} />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Logo */}
      <div style={{ position: 'relative', textAlign: 'center', marginTop: -120, zIndex: 10 }}>
        <div style={{
          fontFamily: 'Orbitron', fontSize: 'clamp(48px, 10vw, 88px)', fontWeight: 900,
          color: '#fff',
          textShadow: '0 0 30px #ff2d78, 0 0 70px #ff2d78, 0 0 120px #b44bff',
          letterSpacing: 8,
          lineHeight: 1,
        }}>
          MINI
        </div>
        <div style={{
          fontFamily: 'Orbitron', fontSize: 'clamp(64px, 14vw, 120px)', fontWeight: 900,
          color: '#ff2d78',
          textShadow: '0 0 20px #ff2d78, 0 0 60px #ff2d78, 0 0 100px #ff6b35',
          letterSpacing: 12,
          lineHeight: 1,
          marginTop: -8,
        }}>
          VICE
        </div>
        <div style={{
          fontFamily: 'Orbitron', fontSize: 'clamp(11px, 2vw, 16px)',
          color: '#00f5ff',
          textShadow: '0 0 10px #00f5ff',
          letterSpacing: 6,
          marginTop: 12,
        }}>
          THE CITY NEVER SLEEPS · 1986
        </div>
      </div>

      {/* Start button */}
      <button
        id="btn-start-game"
        onClick={onStart}
        style={{
          marginTop: 48,
          padding: '16px 52px',
          fontFamily: 'Orbitron', fontWeight: 900,
          fontSize: 18, letterSpacing: 4,
          color: '#fff',
          background: 'linear-gradient(135deg, #ff2d78, #b44bff)',
          border: 'none', borderRadius: 6,
          cursor: 'pointer',
          boxShadow: '0 0 30px #ff2d7888, 0 0 60px #b44bff44',
          transition: 'transform 0.1s, box-shadow 0.2s',
          animation: 'pulse 2s ease-in-out infinite',
          zIndex: 10,
          position: 'relative',
        }}
        onMouseEnter={e => {
          e.target.style.transform = 'scale(1.07)';
          e.target.style.boxShadow = '0 0 50px #ff2d7899, 0 0 100px #b44bff66';
        }}
        onMouseLeave={e => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 0 30px #ff2d7888, 0 0 60px #b44bff44';
        }}
      >
        PLAY NOW
      </button>

      {/* Feature blurbs */}
      <div style={{
        display: 'flex', gap: 24, marginTop: 32, zIndex: 10, position: 'relative',
        flexWrap: 'wrap', justifyContent: 'center',
      }}>
        {['🚗 Steal Cars', '👮 Evade Police', '💰 Collect Cash', '🗺 Open World'].map(txt => (
          <div key={txt} style={{
            fontFamily: 'Inter', fontSize: 12, color: 'rgba(255,255,255,0.5)',
            lettering: 1,
          }}>{txt}</div>
        ))}
      </div>

      <style>{`
        @keyframes gridMove {
          from { backgroundPositionY: 0; }
          to   { backgroundPositionY: 48px; }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 30px #ff2d7888, 0 0 60px #b44bff44; }
          50%       { box-shadow: 0 0 50px #ff2d78cc, 0 0 100px #b44bff88; }
        }
      `}</style>
    </div>
  );
}
