// ============================================================
//  AUDIO — Procedural retro sounds using Web Audio API
// ============================================================

let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, type, duration, gain = 0.15, detune = 0) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.detune.setValueAtTime(detune, ctx.currentTime);
    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

export function playCashSound() {
  playTone(880, 'sine', 0.08, 0.12);
  setTimeout(() => playTone(1320, 'sine', 0.1, 0.1), 60);
}

export function playHealthSound() {
  playTone(440, 'sine', 0.12, 0.1);
  setTimeout(() => playTone(660, 'sine', 0.18, 0.12), 80);
}

export function playCarEnterSound() {
  playTone(220, 'sawtooth', 0.12, 0.08);
  setTimeout(() => playTone(330, 'sawtooth', 0.1, 0.06), 80);
}

export function playHonkSound() {
  playTone(330, 'square', 0.15, 0.12, -20);
}

export function playWantedSound() {
  [440, 550, 440, 550].forEach((f, i) =>
    setTimeout(() => playTone(f, 'square', 0.1, 0.1), i * 90)
  );
}

export function playExplosionSound() {
  try {
    const ctx = getCtx();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.15));
    }
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buf;
    src.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    src.start();
  } catch (_) {}
}

// Ambient city ambience: low hum
let ambientNode = null;
export function startAmbience() {
  try {
    const ctx = getCtx();
    if (ambientNode) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, ctx.currentTime);
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    ambientNode = { osc, gain };
  } catch (_) {}
}

export function stopAmbience() {
  try {
    ambientNode?.osc.stop();
    ambientNode = null;
  } catch (_) {}
}
