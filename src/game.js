'use strict';
/* =========================================================
   Flujo del juego: capítulos, arenas y oleadas, el jefe,
   la Arena de los Dioses, guardado y bucle principal
   ========================================================= */
const DEFAULT_SAVE = { orbs: 0, up: { blades: 1, health: 1, rage: 1 }, chapter: 0, best: 0, beaten: false };

function makeWorld(mode, chapterIdx = 0) {
  const ch = mode === 'story' ? CHAPTERS[chapterIdx] : null;
  const W = {
    mode, chapterIdx, theme: ch ? ch.theme : mode === 'arena' ? 'costa' : 'templo',
    length: ch ? ch.length : 720, bounds: { l: 0, r: ch ? ch.length : 720 }, cam: { x: 0 }, zoom: 1, zoomCur: 1,
    hero: makeHero(Game.save.up), enemies: [], projs: [], orbs: [], spawnQ: [],
    encounters: ch ? ch.encounters : [], encIdx: 0, locked: false, waves: null, waveIdx: 0, waveDelay: 0,
    boss: null, title: null, toast: null, qte: null, finale: null, cinematic: false, time: 0, arenaN: 0,
    exitT: 0, done: false, attackers: 0,
  };
  if (mode === 'arena') { W.hero.x = 360; W.locked = true; W.bounds = { l: 20, r: 700 }; }
  if (mode === 'menu') { W.hero.x = 300; W.cam.x = 300 - Layout.VW * 0.3; }
  else W.cam.x = Math.max(-20, W.hero.x - Layout.VW * 0.42);
  return W;
}

const Game = {
  state: 'menu', world: null, save: null, settings: null, diffIdx: 1, diff: DIFFS[1],
  stats: { kills: 0, maxCombo: 0, orbs: 0, time: 0 }, hints: {}, wakeLock: null,

  init() {
    this.save = Object.assign({}, DEFAULT_SAVE, Store.get('save', {}));
    this.save.up = Object.assign({}, DEFAULT_SAVE.up, this.save.up || {});
    this.settings = Object.assign({ music: true, sfx: true, vib: true, diff: 1 }, Store.get('settings', {}));
    this.hints = Store.get('hints', {});
    this.setDiff(this.settings.diff);
    Sfx.setMusic(this.settings.music); Sfx.setSfx(this.settings.sfx);
    this.toMenu();
  },
  persist() { Store.set('save', this.save); },
  saveSettings() { Store.set('settings', this.settings); },
  setDiff(i) { this.diffIdx = clamp(i | 0, 0, 2); this.diff = DIFFS[this.diffIdx]; this.settings.diff = this.diffIdx; this.saveSettings(); },
  addOrbs(v) { this.save.orbs += v; this.stats.orbs += v; },
  resetStats() { this.stats = { kills: 0, maxCombo: 0, orbs: 0, time: 0 }; },

  hint(key) {
    if (this.hints[key] || !this.world) return;
    const t = Input.touchMode;
    const text = {
      controls: t ? '□ Ataque   △ Fuerte   ✕ Salto   ○ Esquivar\nMantén □ para encadenar el combo' : 'J Ataque   K Fuerte   Espacio Salto   L Esquivar\nMantén J para encadenar el combo',
      launch: '△ lanza a los enemigos al aire.\nSalta y sigue golpeando en el aire',
      finish: t ? 'Enemigo aturdido: pulsa ○ a su lado\npara rematarlo' : 'Enemigo aturdido: pulsa L a su lado\npara rematarlo',
      rage: t ? '¡Ira de Esparta lista!\nPulsa el botón de fuego' : '¡Ira de Esparta lista! Pulsa E',
      shield: 'Los hoplitas bloquean de frente.\nUsa △, salta o rueda a su espalda',
      boss: 'Golpea el ojo para hacer daño crítico.\nSalta las ondas de choque',
    }[key];
    if (!text) return;
    this.hints[key] = true; Store.set('hints', this.hints);
    this.toast(text, key === 'controls' ? 6 : 4.5);
  },
  toast(text, dur = 2.5) { if (this.world) this.world.toast = { text, t: 0, dur }; },

  /* ---------- Transiciones ---------- */
  toMenu() {
    this.state = 'menu';
    FX.clear();
    this.world = makeWorld('menu');
    Music.set('menu');
    this.releaseWake();
    UI.show('menu');
  },
  newGame() {
    this.save.chapter = 0; this.persist();
    this.resetStats();
    this.startChapter(0);
  },
  continueGame() { this.resetStats(); this.startChapter(clamp(this.save.chapter, 0, CHAPTERS.length - 1)); },
  startChapter(i, encIdx = 0, retry = false) {
    FX.clear();
    const W = this.world = makeWorld('story', i);
    if (encIdx > 0) {
      const prev = W.encounters[encIdx - 1];
      W.encIdx = encIdx; W.hero.x = prev.x + 120;
      W.cam.x = W.hero.x - Layout.VW * 0.42;
    }
    if (!retry) {
      const ch = CHAPTERS[i];
      W.title = { small: 'CAPÍTULO ' + ROMAN[i + 1], big: ch.name, sub: ch.intro, t: 0, dur: 4.2 };
      Sfx.play('gong');
    }
    this.play();
    Music.set('explore');
  },
  startArena() {
    FX.clear();
    this.resetStats();
    this.world = makeWorld('arena');
    this.world.title = { small: 'MODO DE SUPERVIVENCIA', big: 'Arena de los Dioses', sub: 'Resiste tantas oleadas como puedas', t: 0, dur: 3.4 };
    Sfx.play('gong');
    this.play();
    Music.set('combat');
  },
  play() {
    this.state = 'playing';
    Input.reset();
    UI.hide();
    this.requestWake();
  },
  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    Input.reset();
    UI.show('pause');
  },
  resume() { if (this.state === 'paused') { this.play(); } },
  restartEncounter() {
    const W = this.world;
    if (W.mode === 'arena') { this.startArena(); return; }
    this.startChapter(W.chapterIdx, W.encIdx, true);
  },
  over() {
    if (this.state !== 'playing') return;
    this.state = 'over';
    this.persist();
    const W = this.world;
    if (W.mode === 'arena') {
      const n = Math.max(0, W.arenaN - 1);
      if (n > this.save.best) { this.save.best = n; this.persist(); }
    }
    Music.set(null);
    UI.show('over');
  },
  chapterComplete() {
    const W = this.world;
    this.save.chapter = W.chapterIdx + 1;
    this.persist();
    W.exitT = 0.001;
  },
  victory() {
    this.state = 'win';
    this.save.beaten = true; this.save.chapter = CHAPTERS.length;
    this.persist();
    Music.set('menu');
    UI.show('win');
  },
  summon(list) { if (this.world) queueWave(this.world, list); },

  requestWake() {
    try { if (navigator.wakeLock && !this.wakeLock) navigator.wakeLock.request('screen').then(l => { this.wakeLock = l; l.addEventListener('release', () => { this.wakeLock = null; }); }).catch(() => {}); } catch (e) { /* sin wake lock */ }
  },
  releaseWake() { try { if (this.wakeLock) this.wakeLock.release(); } catch (e) { /* nada */ } this.wakeLock = null; },

  /* ---------- Simulación ---------- */
  tick(step) {
    const W = this.world, h = W.hero;
    if (Input.pressed.has('pause')) { Input.pressed.delete('pause'); this.pause(); return; }
    if (Input.pressed.has('mute')) {
      Input.pressed.delete('mute');
      const on = !(this.settings.music || this.settings.sfx);
      this.settings.music = this.settings.sfx = on; Sfx.setMusic(on); Sfx.setSfx(on); this.saveSettings();
      this.toast(on ? 'Sonido activado' : 'Sonido desactivado', 1.4);
    }
    if (FX.hitstop > 0) { FX.hitstop -= step; return; }
    const dt = step * (FX.slowT > 0 ? FX.slowScale : 1);
    W.time += dt; this.stats.time += step;

    if (W.qte) { this.updateQTE(W, dt); }
    else {
      if (W.finale) this.updateFinale(W, dt);
      else heroUpdate(h, dt, W);
      updateEnemies(W, dt);
      updateProjs(W, h, dt);
      updateOrbs(W, h, dt);
      updateEncounters(W, dt);
    }
    FX.update(dt);
    updateCamera(W, dt);
    if (h.state === 'dead' && h.t > 1.9) this.over();
    if (W.exitT > 0) {
      W.exitT += step;
      if (W.exitT > 1.2) { UI.show('upgrade', { next: W.chapterIdx + 1 }); this.state = 'upgrade'; Music.set('menu'); }
    }
    Input.pressed.clear();
  },
  menuTick(dt) {
    const W = this.world;
    W.hero.anim += dt; W.time += dt;
    W.cam.x = W.hero.x - Layout.VW * (Layout.portrait ? 0.5 : 0.3) + Math.sin(W.time * 0.15) * 24;
    W.hero.face = 1;
    if (chance(0.3)) FX.embers(W.hero.x + rand(-120, 200), GY - rand(0, 80), 1, 'orange', 6);
    FX.update(dt); FX.updateReal(dt);
  },

  updateQTE(W, dt) {
    const q = W.qte;
    q.t += dt;
    q.prog = Math.max(0, q.prog - dt * 0.22);
    if (Input.pressed.has('dodge')) {
      q.prog = Math.min(1, q.prog + 0.085);
      Sfx.play('qte', q.prog); FX.shake(2, 0.08); vibrate(12);
      FX.blood(q.e.x + q.e.face * 14, q.e.y - 135, 3);
    }
    if (q.prog >= 1) {
      W.qte = null;
      W.finale = { t: 0, e: q.e, stabs: 0, sx: W.hero.x, sy: W.hero.y };
      W.cinematic = true;
      const h = W.hero;
      h.state = 'finisher'; h.t = 0; h.fin = { big: true, e: q.e }; h.face = Math.sign(q.e.x - h.x) || 1;
      FX.slow(0.6, 1.2);
    } else if (q.t >= q.dur) {
      W.qte = null; W.zoom = 1;
      const e = q.e;
      e.hp = e.hpMax * 0.12; e.phase = 3; go(e, 'roar'); e.roarDone = true;
      Sfx.play('roar'); FX.shake(8, 0.6);
      this.toast('¡Polifemo se resiste!', 2);
    }
  },
  updateFinale(W, dt) {
    const F = W.finale, h = W.hero, e = F.e;
    F.t += dt; h.t += dt; h.anim += dt;
    const eyeR = cyclopsEye(e), ex = eyeR.x + eyeR.w / 2, ey = eyeR.y + eyeR.h / 2;
    if (F.t < 1.4) {
      const p = easeOut(clamp(F.t / 0.4, 0, 1));
      h.x = lerp(F.sx, ex + e.face * 20, p); h.y = lerp(F.sy, ey + 40, p) - Math.sin(p * Math.PI) * 40;
      h.face = -e.face || 1;
      const stabs = [0.5, 0.8, 1.1];
      while (F.stabs < 3 && F.t >= stabs[F.stabs]) {
        F.stabs++;
        const last = F.stabs === 3;
        FX.blood(ex, ey, last ? 40 : 16, h.face); FX.spark(ex, ey, 10, h.face);
        FX.shake(last ? 12 : 6, 0.3); FX.stop(last ? 0.18 : 0.08);
        Sfx.play('hitHeavy'); vibrate(last ? 150 : 40);
        if (last) { e.blind = true; FX.flashScreen('255,240,220', 0.8); Sfx.play('roar'); FX.text(ex, ey - 30, '¡CEGADO!', '#ff4a3a', 18, 1.6); }
      }
    } else {
      if (!F.jumped) { F.jumped = true; F.jx = h.x; F.jy = h.y; go(e, 'dying'); FX.slow(0.5, 1.4); }
      const q = clamp((F.t - 1.4) / 0.5, 0, 1);
      h.x = lerp(F.jx, F.jx - h.face * 110, q); h.y = lerp(F.jy, GY, easeIn(q)) - Math.sin(q * Math.PI) * 50;
      if (q >= 1) { h.state = 'idle'; h.y = GY; }
      if (F.t > 3.9 && !F.done) {
        F.done = true;
        killEnemy(e, W, { kbx: 0 }, true);
        W.boss = null; W.cinematic = false; W.finale = null; W.zoom = 1;
        h.state = 'idle'; h.inv = 0.5; h.fin = null;
        if (W.mode === 'story') { W.locked = false; W.bounds = { l: 0, r: W.length }; W.encIdx++; setTimeout(() => this.state === 'playing' && this.victory(), 2200); }
        else { W.waveDelay = 0; }
        Sfx.play('cleared');
      }
    }
  },
};

/* ---------- Encuentros y oleadas ---------- */
function queueWave(W, list) {
  const q = [];
  for (const [type, n] of list) for (let i = 0; i < n; i++) q.push(type);
  for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
  q.forEach((type, i) => W.spawnQ.push({ type, delay: 0.3 + i * 0.4 + rand(0, 0.2) }));
}

function spawnEnemy(W, type) {
  const h = W.hero, b = W.bounds;
  let x = (b.l + b.r) / 2;
  if (type === 'arquero') x = h.x < (b.l + b.r) / 2 ? b.r - rand(30, 90) : b.l + rand(30, 90);
  else for (let i = 0; i < 12; i++) { x = rand(b.l + 40, b.r - 40); if (Math.abs(x - h.x) > 120) break; }
  const e = makeEnemy(type, x);
  e.face = Math.sign(h.x - x) || -1;
  W.enemies.push(e);
  if (type === 'hoplita') Game.hint('shield');
  if (type === 'minotauro') { Sfx.play('bull'); FX.shake(4, 0.4); }
  return e;
}

function spawnBoss(W, x, hpMul = 1) {
  const e = makeEnemy('ciclope', x, { hpMul });
  e.face = Math.sign(W.hero.x - x) || -1;
  W.boss = e; W.enemies.push(e); W.cinematic = true;
  Music.set('boss');
  setTimeout(() => Game.hint('boss'), 2600);
  return e;
}

function updateSpawns(W, dt) {
  for (let i = W.spawnQ.length - 1; i >= 0; i--) {
    const s = W.spawnQ[i];
    s.delay -= dt;
    if (s.delay <= 0) { W.spawnQ.splice(i, 1); spawnEnemy(W, s.type); }
  }
}

function updateEncounters(W, dt) {
  const h = W.hero;
  if (W.mode === 'arena') { updateArena(W, dt); return; }
  if (!W.locked) {
    const enc = W.encounters[W.encIdx];
    if (enc && h.x >= enc.x - 150) startEncounter(W, enc);
    else if (!enc && !W.boss && h.x >= W.length - 70 && !W.done && W.mode === 'story' && W.chapterIdx < CHAPTERS.length - 1) { W.done = true; Game.chapterComplete(); }
    return;
  }
  updateSpawns(W, dt);
  if (W.boss) return;
  const busy = W.spawnQ.length || W.enemies.some(e => e.alive);
  if (busy) { W.waveDelay = 0; return; }
  W.waveDelay += dt;
  if (W.waveDelay < 1) return;
  W.waveDelay = 0;
  W.waveIdx++;
  if (W.waveIdx < W.waves.length) { queueWave(W, W.waves[W.waveIdx]); return; }
  W.locked = false; W.bounds = { l: 0, r: W.length }; W.encIdx++;
  Sfx.play('cleared'); Music.set('explore');
  Game.toast(W.encIdx < W.encounters.length ? 'Arena despejada. Sigue adelante' : 'Camino despejado', 2.2);
  Game.persist();
}

function startEncounter(W, enc) {
  W.locked = true;
  const w = enc.width || ARENA_W;
  W.bounds = { l: enc.x - w / 2, r: enc.x + w / 2 };
  W.waveIdx = 0; W.waveDelay = 0;
  if (enc.boss) { W.waves = null; spawnBoss(W, enc.x + 160); }
  else { W.waves = enc.waves; queueWave(W, enc.waves[0]); Music.set('combat'); }
  if (enc.tutorial) Game.hint('controls');
}

function updateArena(W, dt) {
  updateSpawns(W, dt);
  if (W.boss || W.finale) return;
  const busy = W.spawnQ.length || W.enemies.some(e => e.alive);
  if (busy) { W.waveDelay = 0; return; }
  W.waveDelay += dt;
  if (W.waveDelay < (W.arenaN ? 2 : 0.8)) return;
  W.waveDelay = 0;
  W.arenaN++;
  const n = W.arenaN;
  const theme = ['costa', 'templo', 'volcan'][Math.floor((n - 1) / 5) % 3];
  if (theme !== W.theme) { W.theme = theme; FX.flashScreen('0,0,0', 0.8); }
  if (n > 1) { W.hero.hp = Math.min(W.hero.hpMax, W.hero.hp + W.hero.hpMax * 0.15); Sfx.play('cleared'); }
  if (n - 1 > Game.save.best) { Game.save.best = n - 1; Game.persist(); }
  Game.toast('Oleada ' + n, 1.6);
  const wave = arenaWave(n);
  if (wave[0][0] === 'ciclope') { spawnBoss(W, W.hero.x < 360 ? 560 : 160, 0.5 + 0.15 * (n / 10 - 1)); Game.toast('Oleada ' + n + ': ¡Polifemo!', 2); }
  else { queueWave(W, wave); Music.set('combat'); }
}

function updateCamera(W, dt) {
  const VW = Layout.VW, h = W.hero;
  let target = h.x - VW * 0.42 + h.face * 20;
  if (W.locked) {
    const aw = W.bounds.r - W.bounds.l;
    target = aw <= VW ? (W.bounds.l + W.bounds.r) / 2 - VW / 2 : clamp(target, W.bounds.l - 10, W.bounds.r - VW + 10);
  } else target = clamp(target, -20, W.length - VW + 20);
  W.cam.x = lerp(W.cam.x, target, 1 - Math.pow(0.004, dt));
  W.zoomCur = lerp(W.zoomCur, W.zoom, 1 - Math.pow(0.02, dt));
}

/* ---------- Arranque y bucle ---------- */
let lastT = 0, acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - (lastT || now)) / 1000);
  lastT = now;
  Input.pollGamepad();
  if (Game.state === 'playing') {
    FX.updateReal(dt);
    acc += dt;
    const step = 1 / 60;
    let n = 0;
    while (acc >= step && n < 5) { acc -= step; n++; Game.tick(step); if (Game.state !== 'playing') break; }
    if (n >= 5) acc = 0;
  } else if (Game.state === 'menu') Game.menuTick(dt);
  render(dt);
}

function boot() {
  const cv = document.getElementById('game');
  initRender(cv);
  FX.initGlow();
  const onResize = () => { Layout.update(); resizeCanvas(); };
  onResize();
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 250));
  Input.init(cv);
  UI.build();
  Game.init();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { Game.pause(); try { if (Sfx.ctx) Sfx.ctx.suspend(); } catch (e) { /* nada */ } }
    else Sfx.resume();
  });
  try { if (document.fonts) document.fonts.load('700 16px Cinzel').then(() => { R.key = ''; }).catch(() => {}); } catch (e) { /* sin fuentes */ }
  requestAnimationFrame(frame);
}
