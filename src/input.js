'use strict';
/* =========================================================
   Entrada: teclado, pantalla táctil (joystick + botones) y mando.
   También calcula la disposición de la pantalla (Layout).
   ========================================================= */
const KEYMAP = {
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  KeyW: 'jump', ArrowUp: 'jump', Space: 'jump', KeyS: 'down', ArrowDown: 'down',
  KeyJ: 'light', KeyZ: 'light', KeyK: 'heavy', KeyX: 'heavy',
  KeyL: 'dodge', KeyC: 'dodge', ShiftLeft: 'dodge', ShiftRight: 'dodge',
  KeyE: 'rage', KeyI: 'rage', KeyP: 'pause', Escape: 'pause', KeyM: 'mute',
};
// Botones del mando estándar (Xbox/PlayStation)
const PADMAP = { 0: 'jump', 1: 'dodge', 2: 'light', 3: 'heavy', 4: 'dodge', 5: 'rage', 7: 'rage', 10: 'rage', 11: 'rage', 9: 'pause' };

const Layout = {
  W: 0, H: 0, dpr: 1, portrait: false, VW: 640, VH: 360,
  safe: { l: 0, r: 0, t: 0, b: 0 },
  game: { x: 0, y: 0, w: 0, h: 0, s: 1 },
  ui: 1, stickR: 50, stickHome: { x: 0, y: 0 },

  update() {
    const W = this.W = window.innerWidth, H = this.H = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const el = document.getElementById('safe');
    if (el) {
      const cs = getComputedStyle(el);
      this.safe = { l: parseFloat(cs.paddingLeft) || 0, r: parseFloat(cs.paddingRight) || 0, t: parseFloat(cs.paddingTop) || 0, b: parseFloat(cs.paddingBottom) || 0 };
    }
    const sf = this.safe;
    this.portrait = H > W * 1.05;
    const g = this.game;
    if (this.portrait) {
      this.VW = 420;
      g.s = W / 420; g.w = W; g.h = 360 * g.s; g.x = 0;
      g.y = sf.t + Math.max(0, Math.min(40, (H - g.h) * 0.08));
    } else {
      let s = H / 360;
      let vw = W / s;
      if (vw > 800) { vw = 800; s = W / 800; }
      if (vw < 480) { vw = 480; s = W / 480; }
      this.VW = vw; g.s = s; g.w = W; g.h = 360 * s; g.x = 0; g.y = (H - g.h) / 2;
    }
    this.VH = 360;

    // Controles táctiles
    const btn = [];
    let u, r, gap, cx, cy;
    if (this.portrait) {
      const top = g.y + g.h;
      u = clamp(W / 380, 0.85, 1.35);
      r = 34 * u; gap = 66 * u;
      cx = W - sf.r - 18 - r - gap;
      cy = Math.min(H - sf.b - 18 - r - gap, top + (H - top) * 0.52);
      this.stickHome = { x: sf.l + 24 + 62 * u, y: cy };
    } else {
      u = clamp(Math.min(W, H) / 380, 0.8, 1.4);
      r = 30 * u; gap = 58 * u;
      cx = W - sf.r - 14 - r - gap;
      cy = H - sf.b - 14 - r - gap;
      this.stickHome = { x: sf.l + 30 * u + 55 * u, y: H - sf.b - 30 * u - 50 * u };
    }
    this.ui = u; this.stickR = 50 * u;
    btn.push({ id: 'light', x: cx - gap, y: cy, r, label: 'Ataque' });
    btn.push({ id: 'heavy', x: cx, y: cy - gap, r, label: 'Fuerte' });
    btn.push({ id: 'dodge', x: cx + gap, y: cy, r, label: 'Esquivar' });
    btn.push({ id: 'jump', x: cx, y: cy + gap, r, label: 'Salto' });
    btn.push({ id: 'rage', x: cx - gap * 1.85, y: cy - gap * 1.15, r: r * 0.85, label: 'Ira' });
    btn.push({ id: 'pause', x: W - sf.r - 26 * u, y: (this.portrait ? g.y : 0) + sf.t * (this.portrait ? 0 : 1) + 24 * u, r: 18 * u, label: '' });
    Input.buttons = btn;
  },
  inStickZone(x, y) {
    if (this.portrait) return y > this.game.y + this.game.h && x < this.W * 0.5;
    return x < this.W * 0.45 && y > this.H * 0.22;
  },
};

const Input = {
  keys: new Set(), pressed: new Set(), touchMode: false,
  stick: null, buttons: [], held: new Map(),
  gpHeld: new Set(), gpX: 0, gpY: 0, gpPrevNav: new Set(),
  mouseLight: false,

  init(el) {
    try { this.touchMode = window.matchMedia('(pointer: coarse)').matches; } catch (e) { /* sin matchMedia */ }
    window.addEventListener('keydown', e => {
      Sfx.init();
      if (UI.handleKey(e)) return;
      const a = KEYMAP[e.code];
      if (!a) return;
      e.preventDefault();
      this.touchMode = false;
      if (!e.repeat) this.pressed.add(a);
      this.keys.add(a);
    });
    window.addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) this.keys.delete(a); });
    window.addEventListener('blur', () => this.reset());
    const opt = { passive: false };
    el.addEventListener('pointerdown', e => this.down(e), opt);
    el.addEventListener('pointermove', e => this.move(e), opt);
    el.addEventListener('pointerup', e => this.up(e), opt);
    el.addEventListener('pointercancel', e => this.up(e), opt);
    el.addEventListener('contextmenu', e => e.preventDefault());
    // iOS solo desbloquea el audio en touchend
    el.addEventListener('touchend', () => Sfx.init(), { passive: true });
    el.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault(); }, opt);
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => e.preventDefault());
  },
  reset() { this.keys.clear(); this.held.clear(); this.stick = null; this.pressed.clear(); },

  visibleButton(b) {
    if (b.id === 'pause') return true;
    return this.touchMode;
  },
  hitButton(x, y, slack = 1.25) {
    let best = null, bd = 1e9;
    for (const b of this.buttons) {
      if (!this.visibleButton(b)) continue;
      const d = Math.hypot(x - b.x, y - b.y);
      if (d < b.r * slack && d < bd) { best = b; bd = d; }
    }
    return best;
  },
  down(e) {
    e.preventDefault();
    Sfx.init();
    if (e.pointerType !== 'mouse') this.touchMode = true;
    if (Game.state !== 'playing') return;
    const x = e.clientX, y = e.clientY;
    const b = this.hitButton(x, y);
    if (b) { this.held.set(e.pointerId, b.id); this.pressed.add(b.id); return; }
    if (e.pointerType === 'mouse') {
      const a = e.button === 2 ? 'heavy' : 'light';
      this.held.set(e.pointerId, a); this.pressed.add(a);
      return;
    }
    if (Layout.inStickZone(x, y) && !this.stick) this.stick = { id: e.pointerId, ox: x, oy: y, x, y };
  },
  move(e) {
    const x = e.clientX, y = e.clientY;
    const s = this.stick;
    if (s && s.id === e.pointerId) {
      e.preventDefault();
      s.x = x; s.y = y;
      const dx = x - s.ox, dy = y - s.oy, d = Math.hypot(dx, dy), max = Layout.stickR * 1.2;
      if (d > max) { s.ox = x - dx / d * max; s.oy = y - dy / d * max; }   // el joystick sigue al dedo
      return;
    }
    const cur = this.held.get(e.pointerId);
    if (cur && e.pointerType !== 'mouse' && cur !== 'pause') {
      const b = this.hitButton(x, y, 1.05);
      if (b && b.id !== cur && b.id !== 'pause') { this.held.set(e.pointerId, b.id); this.pressed.add(b.id); }
    }
  },
  up(e) {
    if (this.stick && this.stick.id === e.pointerId) this.stick = null;
    this.held.delete(e.pointerId);
  },
  isDown(a) {
    if (this.keys.has(a) || this.gpHeld.has(a)) return true;
    for (const v of this.held.values()) if (v === a) return true;
    return false;
  },
  axisX() {
    let x = 0;
    if (this.keys.has('left')) x -= 1;
    if (this.keys.has('right')) x += 1;
    if (this.stick) {
      const dx = (this.stick.x - this.stick.ox) / Layout.stickR;
      if (Math.abs(dx) > 0.22) x += clamp(dx * 1.25, -1, 1);
    }
    x += this.gpX;
    return clamp(x, -1, 1);
  },
  axisY() {
    let y = 0;
    if (this.keys.has('down')) y += 1;
    if (this.stick) {
      const dy = (this.stick.y - this.stick.oy) / Layout.stickR;
      if (Math.abs(dy) > 0.4) y += clamp(dy, -1, 1);
    }
    y += this.gpY;
    return clamp(y, -1, 1);
  },

  pollGamepad() {
    let gp = null;
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const p of pads) if (p && p.connected) { gp = p; break; }
    } catch (e) { gp = null; }
    if (!gp) { this.gpHeld.clear(); this.gpX = this.gpY = 0; return; }
    const now = new Set();
    for (const i in PADMAP) if (gp.buttons[i] && gp.buttons[i].pressed) now.add(PADMAP[i]);
    let x = Math.abs(gp.axes[0] || 0) > 0.25 ? gp.axes[0] : 0;
    let y = Math.abs(gp.axes[1] || 0) > 0.5 ? gp.axes[1] : 0;
    const bt = i => gp.buttons[i] && gp.buttons[i].pressed;
    if (bt(14)) x = -1;
    if (bt(15)) x = 1;
    if (bt(12)) y = -1;
    if (bt(13)) y = 1;
    if (now.size || x || y) this.touchMode = false;
    // Navegación por menús con el mando
    const nav = new Set();
    if (y < -0.5) nav.add('up');
    if (y > 0.5) nav.add('down');
    if (x < -0.5) nav.add('left');
    if (x > 0.5) nav.add('right');
    if (bt(0)) nav.add('confirm');
    if (bt(1)) nav.add('back');
    if (bt(9)) nav.add('pause');
    if (Game.state !== 'playing') {
      for (const a of nav) if (!this.gpPrevNav.has(a)) UI.gamepadNav(a);
      this.gpPrevNav = nav;
      this.gpHeld = now; this.gpX = this.gpY = 0;
      return;
    }
    this.gpPrevNav = nav;
    for (const a of now) if (!this.gpHeld.has(a)) this.pressed.add(a);
    this.gpHeld = now; this.gpX = x; this.gpY = y;
  },
};
