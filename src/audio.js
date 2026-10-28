'use strict';
/* =========================================================
   Sonido: efectos sintetizados y música procedural
   (tambores de guerra, ostinato de cuerdas, metales y coro)
   ========================================================= */
const Sfx = {
  ctx: null, master: null, sfxBus: null, musicBus: null, noise: null, last: {},
  sfxOn: true, musicOn: true,

  init() {
    if (this.ctx) { this.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = this.ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
      comp.connect(ctx.destination);
      this.master = ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(comp);
      this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = this.sfxOn ? 1 : 0; this.sfxBus.connect(this.master);
      this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.musicOn ? 0.5 : 0; this.musicBus.connect(this.master);
      const len = Math.floor(ctx.sampleRate * 1.5);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      this.resume();
      Music.kick();
    } catch (e) { this.ctx = null; }
  },
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  },
  setSfx(on) { this.sfxOn = on; if (this.sfxBus) this.sfxBus.gain.value = on ? 1 : 0; },
  setMusic(on) { this.musicOn = on; if (this.musicBus) this.musicBus.gain.value = on ? 0.5 : 0; },
  ok(name, ms) {
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < ms) return false;
    this.last[name] = now; return true;
  },

  tone(o) {
    const c = this.ctx; if (!c) return;
    const t = o.at != null ? o.at : c.currentTime + (o.delay || 0);
    const osc = c.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + (o.slide || o.dur));
    if (o.detune) osc.detune.value = o.detune;
    const g = c.createGain();
    const v = o.vol == null ? 0.3 : o.vol, a = o.attack || 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let node = osc;
    if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; node.connect(f); node = f; }
    node.connect(g); g.connect(o.dest || this.sfxBus);
    osc.start(t); osc.stop(t + o.dur + 0.05);
  },
  hiss(o) {
    const c = this.ctx; if (!c || !this.noise) return;
    const t = o.at != null ? o.at : c.currentTime + (o.delay || 0);
    const src = c.createBufferSource();
    src.buffer = this.noise; src.playbackRate.value = o.rate || 1;
    const f = c.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    f.Q.value = o.q == null ? 1 : o.q;
    const g = c.createGain();
    const v = o.vol == null ? 0.3 : o.vol, a = o.attack || 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(o.dest || this.sfxBus);
    src.start(t, Math.random() * 0.8); src.stop(t + o.dur + 0.05);
  },

  play(name, p = 1) {
    if (!this.ctx || !this.sfxOn) return;
    const r = rand(0.92, 1.08);
    switch (name) {
      case 'swing':
        if (!this.ok('swing', 40)) return;
        this.hiss({ f: 500 * r, f2: 2600 * r, dur: 0.17, vol: 0.22, q: 1.4 });
        break;
      case 'swingHeavy':
        this.hiss({ f: 260 * r, f2: 1500, dur: 0.32, vol: 0.32, q: 1.1 });
        this.tone({ type: 'sine', f: 90, f2: 160, dur: 0.25, vol: 0.08 });
        break;
      case 'hit':
        if (!this.ok('hit', 25)) return;
        this.tone({ f: 170 * r, f2: 45, dur: 0.13, vol: 0.45 });
        this.hiss({ f: 2600 * r, dur: 0.05, vol: 0.25, q: 0.8 });
        this.hiss({ filter: 'lowpass', f: 900, dur: 0.1, vol: 0.22 });
        break;
      case 'hitHeavy':
        this.tone({ f: 130 * r, f2: 32, dur: 0.28, vol: 0.7 });
        this.hiss({ filter: 'lowpass', f: 1600, f2: 180, dur: 0.28, vol: 0.45 });
        this.hiss({ f: 3200, dur: 0.05, vol: 0.2 });
        break;
      case 'clang':
        if (!this.ok('clang', 50)) return;
        this.tone({ type: 'square', f: 1240 * r, dur: 0.22, vol: 0.06 });
        this.tone({ type: 'triangle', f: 1870 * r, dur: 0.34, vol: 0.1 });
        this.tone({ type: 'sine', f: 2630 * r, dur: 0.4, vol: 0.07 });
        this.hiss({ filter: 'highpass', f: 3000, dur: 0.05, vol: 0.2 });
        break;
      case 'jump':
        this.hiss({ f: 380, f2: 950, dur: 0.12, vol: 0.12 });
        break;
      case 'dodge':
        this.hiss({ f: 1100, f2: 280, dur: 0.22, vol: 0.2 });
        break;
      case 'land':
        if (!this.ok('land', 80)) return;
        this.tone({ f: 95, f2: 40, dur: 0.09, vol: 0.22 });
        this.hiss({ filter: 'lowpass', f: 500, dur: 0.07, vol: 0.12 });
        break;
      case 'hurt':
        this.tone({ type: 'sawtooth', f: 190, f2: 85, dur: 0.22, vol: 0.22, lp: 900 });
        this.hiss({ filter: 'lowpass', f: 1200, dur: 0.12, vol: 0.25 });
        break;
      case 'enemyDie':
        if (!this.ok('die', 60)) return;
        this.tone({ type: 'sawtooth', f: 150 * r, f2: 38, dur: 0.5, vol: 0.16, lp: 650 });
        this.hiss({ filter: 'lowpass', f: 700, f2: 120, dur: 0.45, vol: 0.2 });
        break;
      case 'orb':
        if (!this.ok('orb', 45)) return;
        this.tone({ f: 880 * Math.pow(2, randi(0, 4) / 12), dur: 0.14, vol: 0.06 });
        this.tone({ f: 1320 * r, dur: 0.1, vol: 0.035, delay: 0.03 });
        break;
      case 'heal':
        if (!this.ok('heal', 80)) return;
        this.tone({ f: 520, f2: 820, dur: 0.22, vol: 0.09 });
        break;
      case 'rage':
        this.hiss({ filter: 'lowpass', f: 350, f2: 1800, dur: 1.1, vol: 0.5, attack: 0.05 });
        this.tone({ type: 'sawtooth', f: 72, f2: 115, dur: 1.1, vol: 0.28, lp: 700, attack: 0.05 });
        this.tone({ type: 'square', f: 55, dur: 1.2, vol: 0.12, lp: 300 });
        this.play('boom');
        break;
      case 'boom':
        this.tone({ f: 75, f2: 24, dur: 0.65, vol: 0.8 * p });
        this.hiss({ filter: 'lowpass', f: 700, f2: 70, dur: 0.7, vol: 0.55 * p });
        break;
      case 'roar':
        this.tone({ type: 'sawtooth', f: 62 * r, f2: 40, dur: 1.7, vol: 0.32, lp: 520, attack: 0.1 });
        this.tone({ type: 'sawtooth', f: 66 * r, f2: 43, dur: 1.7, vol: 0.25, lp: 480, attack: 0.1 });
        this.hiss({ filter: 'lowpass', f: 300, f2: 1100, dur: 1.6, vol: 0.45, attack: 0.15 });
        break;
      case 'bull':
        this.tone({ type: 'sawtooth', f: 110 * r, f2: 70, dur: 0.8, vol: 0.22, lp: 700, attack: 0.05 });
        this.hiss({ filter: 'lowpass', f: 500, f2: 900, dur: 0.7, vol: 0.3, attack: 0.08 });
        break;
      case 'arrow':
        this.hiss({ filter: 'highpass', f: 2200, dur: 0.16, vol: 0.1 });
        this.tone({ f: 1900, f2: 800, dur: 0.12, vol: 0.03 });
        break;
      case 'screech':
        if (!this.ok('screech', 200)) return;
        this.tone({ type: 'sawtooth', f: 900 * r, f2: 1600, dur: 0.38, vol: 0.06, lp: 3200 });
        this.tone({ type: 'square', f: 1400 * r, f2: 1050, dur: 0.32, vol: 0.03, lp: 2500 });
        break;
      case 'spawn':
        if (!this.ok('spawn', 120)) return;
        this.hiss({ filter: 'lowpass', f: 180, f2: 650, dur: 0.6, vol: 0.22, attack: 0.1 });
        break;
      case 'stomp':
        this.tone({ f: 60, f2: 28, dur: 0.3, vol: 0.5 * p });
        this.hiss({ filter: 'lowpass', f: 400, f2: 80, dur: 0.3, vol: 0.3 * p });
        break;
      case 'crit':
        this.tone({ type: 'triangle', f: 1500, f2: 700, dur: 0.18, vol: 0.08 });
        break;
      case 'qte':
        if (!this.ok('qte', 30)) return;
        this.tone({ type: 'triangle', f: 300 + p * 500, dur: 0.08, vol: 0.12 });
        break;
      case 'ui':
        this.tone({ type: 'triangle', f: 660, dur: 0.07, vol: 0.1 });
        break;
      case 'uiOk':
        this.tone({ type: 'triangle', f: 523, dur: 0.1, vol: 0.12 });
        this.tone({ type: 'triangle', f: 784, dur: 0.18, vol: 0.12, delay: 0.08 });
        break;
      case 'upgrade':
        [392, 523, 659, 784].forEach((f, i) => this.tone({ type: 'triangle', f, dur: 0.35, vol: 0.1, delay: i * 0.07 }));
        this.hiss({ filter: 'highpass', f: 5000, dur: 0.5, vol: 0.05, delay: 0.2 });
        break;
      case 'gong':
        [110, 164.8, 220, 277].forEach((f, i) => this.tone({ f, dur: 2.6, vol: 0.22 / (i + 1), attack: 0.01 }));
        this.hiss({ filter: 'lowpass', f: 900, f2: 100, dur: 1.2, vol: 0.25 });
        this.tone({ f: 70, f2: 35, dur: 0.6, vol: 0.6 });
        break;
      case 'cleared':
        [293.7, 349.2, 440].forEach(f => this.tone({ type: 'sawtooth', f, dur: 0.9, vol: 0.05, lp: 1500, attack: 0.04 }));
        this.tone({ f: 73.4, f2: 40, dur: 0.5, vol: 0.5 });
        break;
      case 'death':
        this.tone({ type: 'sawtooth', f: 146, f2: 36, dur: 2.2, vol: 0.2, lp: 600 });
        this.tone({ f: 55, dur: 2.5, vol: 0.3, attack: 0.05 });
        break;
    }
  },
};

/* ---------- Música procedural ---------- */
const NOTE = { D2: 73.42, Bb1: 58.27, C2: 65.41, A1: 55, F2: 87.31 };
const Music = {
  mode: null, step: 0, next: 0, timer: null,
  set(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.kick();
  },
  kick() {
    if (!this.mode) { if (this.timer) { clearInterval(this.timer); this.timer = null; } return; }
    if (!Sfx.ctx || this.timer) return;
    this.next = Sfx.ctx.currentTime + 0.1; this.step = 0;
    this.timer = setInterval(() => this.tick(), 25);
  },
  tick() {
    const c = Sfx.ctx;
    if (!c || !this.mode || c.state !== 'running') return;
    const bpm = { menu: 70, explore: 84, combat: 100, boss: 114 }[this.mode] || 90;
    const sp = 60 / bpm / 4;
    if (this.next < c.currentTime - 0.25) this.next = c.currentTime + 0.05;
    while (this.next < c.currentTime + 0.14) {
      this.playStep(this.step, this.next, sp);
      this.next += sp; this.step++;
    }
  },
  taiko(at, vol, f = 1) {
    const dest = Sfx.musicBus;
    Sfx.tone({ at, f: 96 * f, f2: 40 * f, dur: 0.5, vol, dest });
    Sfx.hiss({ at, filter: 'lowpass', f: 420, dur: 0.08, vol: vol * 0.45, dest });
  },
  rim(at, vol) { Sfx.hiss({ at, f: 1900, q: 3, dur: 0.04, vol, dest: Sfx.musicBus }); },
  playStep(s, t, sp) {
    const i = s % 16, bar = Math.floor(s / 16) % 4, dest = Sfx.musicBus, m = this.mode;
    const root = [NOTE.D2, NOTE.D2, NOTE.Bb1, NOTE.C2][bar];
    if (m === 'menu' || m === 'explore') {
      if (i === 0) {
        Sfx.tone({ at: t, type: 'sawtooth', f: root, dur: sp * 16, vol: 0.07, lp: 260, attack: 0.6, dest });
        Sfx.tone({ at: t, f: root / 2, dur: sp * 16, vol: 0.12, attack: 0.5, dest });
      }
      if (m === 'menu' && i === 0) {
        [4, 4.757, 5.993].forEach(k => Sfx.tone({ at: t, type: 'triangle', f: root * k, dur: sp * 15, vol: 0.022, attack: 0.9, dest }));
      }
      if (i === 0 && bar % 2 === 0) this.taiko(t, 0.35);
      if (m === 'explore' && (i === 10 || (i === 12 && bar === 3))) this.taiko(t, 0.2, 1.3);
      if (i % 4 === 2 && Math.random() < 0.3) {
        // aulós: notas sueltas de la escala de re menor
        const scale = [293.7, 349.2, 392, 440, 523.3, 587.3];
        Sfx.tone({ at: t, type: 'triangle', f: pick(scale), dur: sp * 5, vol: 0.03, attack: 0.06, dest });
      }
      return;
    }
    // combate y jefe
    const boss = m === 'boss';
    const bigHits = boss ? [0, 3, 4, 7, 8, 11, 12, 14] : [0, 3, 6, 8, 11, 14];
    if (bigHits.includes(i)) this.taiko(t, i === 0 ? 0.55 : 0.36, i % 8 === 0 ? 1 : 1.25);
    if (bar === 3 && i >= 12) this.taiko(t, 0.3, 1.5);
    if (i === 4 || i === 12) this.rim(t, 0.12);
    else if (Math.random() < 0.25) this.rim(t, 0.05);
    if (i % 2 === 0) {
      const semis = [0, 0, 3, 0, 5, 3, 0, -2][i / 2];
      const f = root * 2 * Math.pow(2, semis / 12);
      Sfx.tone({ at: t, type: 'sawtooth', f, dur: sp * 1.7, vol: 0.06, lp: boss ? 900 : 650, dest });
      Sfx.tone({ at: t, f: f / 2, dur: sp * 1.6, vol: 0.08, dest });
    }
    if (i === 0 && (boss || bar % 2 === 0)) {
      [2, 2.378, 2.997].forEach((k, j) => Sfx.tone({ at: t, type: 'sawtooth', f: root * k, dur: sp * 10, vol: 0.035, lp: 1300, attack: 0.07, detune: (j - 1) * 8, dest }));
    }
    if (boss && i === 0) {
      [4, 4.757, 5.993, 8].forEach(k => Sfx.tone({ at: t, type: 'triangle', f: root * k, dur: sp * 15, vol: 0.02, attack: 0.5, dest }));
    }
  },
};
