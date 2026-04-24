// ============================================================
//  INPUT — Keyboard & Touch input manager
// ============================================================

export function createInputManager() {
  const state = {
    up: false, down: false, left: false, right: false,
    sprint: false,
    enter: false,    // enter/exit car
    honk: false,
    // one-shot flags (consumed each frame)
    enterPressed: false,
    // Touch state
    joystickActive: false,
    joystickOrigin: { x: 0, y: 0 },
    joystickDelta: { x: 0, y: 0 },
    touchIds: {},
  };

  const KEY_MAP = {
    ArrowUp: 'up',    w: 'up',    W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right',d: 'right',D: 'right',
    ShiftLeft: 'sprint', ShiftRight: 'sprint',
    ' ': 'honk',
  };

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === 'f' || e.key === 'F') {
      state.enterPressed = true;
    }
    const k = KEY_MAP[e.key];
    if (k) { state[k] = true; e.preventDefault(); }
  }
  function onKeyUp(e) {
    const k = KEY_MAP[e.key];
    if (k) state[k] = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup',   onKeyUp);

  // Touch: virtual joystick on left side, action buttons on right
  function onTouchStart(e) {
    for (const t of e.changedTouches) {
      const x = t.clientX, y = t.clientY;
      if (x < window.innerWidth / 2) {
        state.joystickActive = true;
        state.joystickOrigin = { x, y };
        state.joystickDelta = { x: 0, y: 0 };
        state.touchIds.joystick = t.identifier;
      }
    }
    e.preventDefault();
  }
  function onTouchMove(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === state.touchIds.joystick) {
        const dx = t.clientX - state.joystickOrigin.x;
        const dy = t.clientY - state.joystickOrigin.y;
        const len = Math.hypot(dx, dy);
        const maxR = 50;
        state.joystickDelta = {
          x: len > maxR ? (dx / len) * maxR : dx,
          y: len > maxR ? (dy / len) * maxR : dy,
        };
        // Map to WASD
        const threshold = 18;
        state.up    = dy < -threshold;
        state.down  = dy >  threshold;
        state.left  = dx < -threshold;
        state.right = dx >  threshold;
      }
    }
    e.preventDefault();
  }
  function onTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === state.touchIds.joystick) {
        state.joystickActive = false;
        state.joystickDelta = { x: 0, y: 0 };
        state.up = state.down = state.left = state.right = false;
        delete state.touchIds.joystick;
      }
    }
    e.preventDefault();
  }

  window.addEventListener('touchstart', onTouchStart, { passive: false });
  window.addEventListener('touchmove',  onTouchMove,  { passive: false });
  window.addEventListener('touchend',   onTouchEnd,   { passive: false });

  function consumeEnterPress() {
    const v = state.enterPressed;
    state.enterPressed = false;
    return v;
  }

  function destroy() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup',   onKeyUp);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove',  onTouchMove);
    window.removeEventListener('touchend',   onTouchEnd);
  }

  return { state, consumeEnterPress, destroy };
}
