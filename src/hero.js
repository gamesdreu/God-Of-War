'use strict';
/* =========================================================
   El Fantasma de Esparta: movimiento, combos con las cadenas,
   esquiva, remates y la Ira de Esparta
   ========================================================= */
const HERO = { speed: 180, accel: 1700, airAccel: 1250, friction: 2000, jumpV: 480, djumpV: 430, grav: 1500, maxFall: 950 };

function makeHero(up) {
  const hpMax = 100 + 25 * (up.health - 1);
  return {
    x: 150, y: GY, vx: 0, vy: 0, face: 1, onGround: true, jumps: 0, airAtk: 0, airDodged: false,
    state: 'idle', t: 0, atk: null, prevA: 0, hitSet: new Set(), multiT: 0, swung: false,
    slamPhase: 0, dodgeDir: 1, fin: null,
    hp: hpMax, hpMax, hpLag: hpMax, rage: 0, rageT: 0,
    rageMax: 8 + 2 * (up.rage - 1), rageFill: 1 + 0.15 * (up.rage - 1), dmgMult: 1 + 0.22 * (up.blades - 1),
    inv: 0, flash: 0, anim: 0, runPhase: 0, buf: {}, combo: 0, comboT: 0, perfectT: 0,
  };
}

const heroOrigin = h => ({ x: h.x + h.face * 2, y: h.y - 44 });
function heroBox(h) {
  if (h.state === 'dodge') return { x: h.x - 9, y: h.y - 30, w: 18, h: 30 };
  return { x: h.x - 9, y: h.y - 58, w: 18, h: 58 };
}

function attackAngle(A, t) {
  const [s, e] = A.act;
  const dir = Math.sign(A.a1 - A.a0);
  if (t < s) return lerp(A.a0 - 0.35 * dir, A.a0, easeOut(t / s));
  if (t <= e) { const p = (t - s) / (e - s); return lerp(A.a0, A.a1, A.multi ? p : easeInOut(p)); }
  return A.a1 + 0.15 * dir * easeOut(clamp((t - e) / (A.dur - e), 0, 1));
}
function attackReach(A, t) {
  const [s, e] = A.act;
  if (t < s - 0.06) return 10;
  if (t < s) return lerp(10, A.reach, (t - (s - 0.06)) / 0.06);
  if (t <= e) return A.reach;
  return lerp(A.reach, 10, easeOut(clamp(((t - e) / (A.dur - e)) * 1.5, 0, 1)));
}

// Estado de las dos hojas (R = mano cercana, L = mano lejana) para la lógica y el dibujo
function bladeState(h) {
  const br = Math.sin(h.anim * 2.4) * 0.05;
  let R = { a: 1.25 + br, reach: 0 }, L = { a: 1.85 - br, reach: 0 };
  switch (h.state) {
    case 'run': { const s = Math.sin(h.runPhase); R = { a: 1.45 - s * 0.75, reach: 0 }; L = { a: 1.7 + s * 0.75, reach: 0 }; break; }
    case 'air': R = { a: h.vy < 0 ? 0.2 : 0.7, reach: 0 }; L = { a: h.vy < 0 ? 2.7 : 2.3, reach: 0 }; break;
    case 'dodge': R = { a: 0.9, reach: 0 }; L = { a: 1.2, reach: 0 }; break;
    case 'hurt': R = { a: -2.3, reach: 0 }; L = { a: 2.5, reach: 0 }; break;
    case 'dead': R = { a: 1.6, reach: 0 }; L = { a: 1.6, reach: 0 }; break;
    case 'finisher': {
      const k = (h.t * (h.fin && h.fin.big ? 3.2 : 3.6)) % 1;
      R = { a: lerp(-1.9, 1.0, easeIn(k)), reach: 22 }; L = { a: 0.2, reach: 16 };
      break;
    }
    case 'attack': {
      const A = ATTACKS[h.atk];
      if (h.atk === 'slam') {
        const a = h.slamPhase < 2 ? -2.4 : 1.15;
        R = { a, reach: 26, act: h.slamPhase === 2 }; L = { a: a + 0.2, reach: 24, act: h.slamPhase === 2 };
        break;
      }
      const a = attackAngle(A, h.t), r = attackReach(A, h.t), act = h.t >= A.act[0] - 0.02 && h.t <= A.act[1] + 0.05;
      if (A.arm === 'R') R = { a, reach: r, act };
      else if (A.arm === 'L') L = { a, reach: r, act };
      else if (A.arm === 'B') { R = { a, reach: r, act }; L = { a: a + 0.22, reach: r * 0.96, act }; }
      else { R = { a, reach: r, act }; L = { a: a + Math.PI, reach: r, act }; }
      break;
    }
  }
  return { R, L };
}

function heroUpdate(h, dt, W) {
  h.t += dt; h.anim += dt;
  for (const k in h.buf) h.buf[k] -= dt;
  for (const a of Input.pressed) if (a !== 'pause' && a !== 'mute') h.buf[a] = 0.25;
  if (h.inv > 0) h.inv -= dt;
  if (h.flash > 0) h.flash -= dt;
  if (h.perfectT > 0) h.perfectT -= dt;
  if (h.hpLag > h.hp) h.hpLag = Math.max(h.hp, h.hpLag - dt * 45); else h.hpLag = h.hp;
  if (h.comboT > 0) { h.comboT -= dt; if (h.comboT <= 0) h.combo = 0; }
  if (h.rageT > 0) {
    h.rageT -= dt;
    h.rage = 100 * Math.max(0, h.rageT) / h.rageMax;
    if (h.rageT <= 0) { h.rageT = 0; h.rage = 0; }
    if (chance(0.5)) FX.fire(h.x + rand(-10, 10), h.y - rand(10, 50), 1, 'orange');
  }
  if (h.state === 'dead') { heroPhysics(h, dt, W); h.vx = approach(h.vx, 0, 600 * dt); return; }
  if (want(h, 'rage') && h.rage >= 100 && h.rageT <= 0 && h.state !== 'finisher') activateRage(h, W);

  const ax = Input.axisX();
  switch (h.state) {
    case 'idle': case 'run': case 'air': freeMove(h, dt, ax, W); break;
    case 'attack': attackUpdate(h, dt, ax, W); break;
    case 'dodge': {
      const p = h.t / 0.38;
      h.vx = h.dodgeDir * 340 * (1 - p * p * 0.85);
      if (h.t > 0.26 && want(h, 'light')) { use(h, 'light'); startAttack(h, h.onGround ? 'l1' : 'a1', ax); break; }
      if (h.t >= 0.38) h.state = h.onGround ? 'idle' : 'air';
      break;
    }
    case 'hurt':
      h.vx = approach(h.vx, 0, 900 * dt);
      if (h.t > 0.32) h.state = h.onGround ? 'idle' : 'air';
      break;
    case 'finisher': finisherUpdate(h, dt, W); break;
  }
  if (h.state !== 'finisher') heroPhysics(h, dt, W);
}

function want(h, a) { return h.buf[a] > 0 || (a === 'light' && Input.isDown('light')); }
function use(h, a) { h.buf[a] = 0; }

function heroPhysics(h, dt, W) {
  const g = h.state === 'dodge' && !h.onGround ? HERO.grav * 0.3 : HERO.grav;
  h.vy = Math.min(h.vy + g * dt, HERO.maxFall);
  h.x += h.vx * dt; h.y += h.vy * dt;
  if (h.y >= GY) {
    if (!h.onGround) {
      h.onGround = true; h.jumps = 0; h.airAtk = 0; h.airDodged = false;
      if (h.vy > 350) { FX.dust(h.x, GY, 5, 10); Sfx.play('land'); }
      if (h.state === 'air') h.state = 'idle';
      if (h.state === 'attack' && h.atk === 'slam' && h.slamPhase === 1) slamImpact(h, W);
    }
    h.y = GY; h.vy = 0;
  } else h.onGround = false;
  h.x = clamp(h.x, W.bounds.l + 12, W.bounds.r - 12);
}

function freeMove(h, dt, ax, W) {
  h.vx = approach(h.vx, ax * HERO.speed, (h.onGround ? HERO.accel : HERO.airAccel) * dt);
  if (Math.abs(ax) > 0.2) h.face = Math.sign(ax);
  if (h.onGround) h.state = Math.abs(h.vx) > 20 ? 'run' : 'idle';
  else h.state = 'air';
  if (h.state === 'run') h.runPhase += dt * Math.abs(h.vx) / 13;
  if (want(h, 'jump')) { use(h, 'jump'); tryJump(h); }
  if (want(h, 'dodge')) {
    use(h, 'dodge');
    const f = findFinishTarget(h, W);
    if (f) { startFinisher(h, f, W); return; }
    if (h.onGround || !h.airDodged) startDodge(h, ax);
    return;
  }
  if (want(h, 'light')) {
    const id = h.onGround ? 'l1' : (h.airAtk < 2 ? 'a1' : null);
    if (id) { use(h, 'light'); startAttack(h, id, ax); return; }
  }
  if (want(h, 'heavy')) { use(h, 'heavy'); startAttack(h, h.onGround ? 'h1' : 'slam', ax); }
}

function tryJump(h) {
  if (h.onGround) {
    h.vy = -HERO.jumpV; h.onGround = false; h.jumps = 1; h.state = 'air';
    Sfx.play('jump'); FX.dust(h.x, GY, 3, 6);
  } else if (h.jumps < 2) {
    h.vy = -HERO.djumpV; h.jumps = 2; h.state = 'air';
    Sfx.play('jump'); FX.ring(h.x, h.y, 4, 26, 0.3, '255,200,140', 2);
  }
}

function startDodge(h, ax) {
  const dir = Math.abs(ax) > 0.2 ? Math.sign(ax) : h.face;
  h.state = 'dodge'; h.t = 0; h.dodgeDir = dir; h.face = dir;
  h.inv = Math.max(h.inv, 0.34);
  if (!h.onGround) { h.vy = Math.min(h.vy, -60); h.airDodged = true; }
  Sfx.play('dodge'); FX.dust(h.x, GY, 4, 8);
}

function startAttack(h, id, ax) {
  const A = ATTACKS[id];
  if (Math.abs(ax) > 0.3) h.face = Math.sign(ax);
  h.state = 'attack'; h.atk = id; h.t = 0; h.hitSet = new Set(); h.multiT = 0; h.prevA = A.a0; h.swung = false;
  if (id === 'a1') h.airAtk++;
  if (id === 'slam') { h.vy = -170; h.vx = 0; h.slamPhase = 0; }
  else if (A.air) h.vy = Math.min(h.vy, -70);
}

function attackUpdate(h, dt, ax, W) {
  const A = ATTACKS[h.atk];
  if (h.atk === 'slam') { slamUpdate(h, dt, W); return; }
  if (h.onGround && !A.air) {
    if (A.lunge && h.t < A.act[1]) {
      // no atravesar al enemigo que tenemos delante
      const blocked = W.enemies.some(e => e.alive && !e.T.fly && Math.abs(e.y - h.y) < 30 && (e.x - h.x) * h.face > 0 && Math.abs(e.x - h.x) < 26 + e.w / 2);
      h.vx = blocked ? 0 : h.face * A.lunge * (1 - h.t / A.act[1]);
    } else h.vx = approach(h.vx, 0, HERO.friction * dt);
  } else {
    h.vx = approach(h.vx, ax * 70, 700 * dt);
    if (A.air) h.vy = Math.min(h.vy, 45);
  }
  if (!h.swung && h.t >= A.act[0] - 0.03) { h.swung = true; Sfx.play(A.sfx); }
  const cur = attackAngle(A, h.t);
  if (h.t >= A.act[0] && h.t <= A.act[1] + dt) {
    if (A.multi) { h.multiT -= dt; if (h.multiT <= 0) { h.multiT = A.multi; h.hitSet.clear(); } }
    bladeHits(h, A, h.prevA, cur, W);
  }
  h.prevA = cur;
  pushTrails(h);
  if (h.t >= A.act[1]) {
    if (want(h, 'dodge')) {
      use(h, 'dodge');
      const f = findFinishTarget(h, W);
      if (f) { startFinisher(h, f, W); return; }
      if (h.onGround || !h.airDodged) { startDodge(h, ax); return; }
    }
    if (want(h, 'heavy')) { use(h, 'heavy'); startAttack(h, h.onGround ? 'h1' : 'slam', ax); return; }
    if (want(h, 'light')) {
      let nx = A.next;
      if (!h.onGround && !A.air) nx = h.airAtk < 2 ? 'a1' : null;
      if (h.onGround && A.air) nx = 'l1';
      if (nx && h.t >= A.act[1] + 0.04) { use(h, 'light'); startAttack(h, nx, ax); return; }
    }
    if (want(h, 'jump') && (h.onGround || h.jumps < 2)) { use(h, 'jump'); tryJump(h); return; }
  }
  if (h.t >= A.dur) h.state = h.onGround ? 'idle' : 'air';
}

function pushTrails(h) {
  const bs = bladeState(h), o = heroOrigin(h), fire = h.rageT > 0;
  for (const k of ['R', 'L']) {
    const b = bs[k];
    if (!b.act || b.reach < 30) continue;
    const dx = Math.cos(b.a) * h.face, dy = Math.sin(b.a);
    FX.trail(k, o.x + dx * b.reach * 0.68, o.y + dy * b.reach * 0.68, o.x + dx * b.reach, o.y + dy * b.reach, fire);
    if (fire && chance(0.6)) FX.fire(o.x + dx * b.reach, o.y + dy * b.reach, 1, 'gold');
  }
}

function bladeHits(h, A, a0, a1, W) {
  const o = heroOrigin(h);
  const reach = attackReach(A, h.t);
  const offs = A.arm === 'S' ? [0, Math.PI] : A.arm === 'B' ? [0, 0.22] : [0];
  const steps = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 0.2));
  const sample = (fn) => {
    for (const off of offs) for (let s = 0; s <= steps; s++) {
      const a = lerp(a0, a1, s / steps) + off;
      const dx = Math.cos(a) * h.face, dy = Math.sin(a);
      for (let d = 0.2; d <= 1.001; d += 0.2) {
        const px = o.x + dx * reach * d, py = o.y + dy * reach * d;
        if (fn(px, py)) return { x: px, y: py };
      }
    }
    return null;
  };
  for (const e of W.enemies) {
    if (!canHit(e) || h.hitSet.has(e)) continue;
    const r = enemyBox(e);
    const pt = sample((px, py) => inRect(px, py, r, 5));
    if (pt) { h.hitSet.add(e); heroHitEnemy(h, e, A, pt, W); }
  }
  // las hojas desvían flechas y rocas pequeñas
  for (const p of W.projs) {
    if (p.k !== 'arrow' || p.dead) continue;
    if (sample((px, py) => Math.abs(px - p.x) < 10 && Math.abs(py - p.y) < 10)) {
      p.dead = true; FX.spark(p.x, p.y, 6, 0, 'white'); Sfx.play('clang');
    }
  }
}

function heroHitEnemy(h, e, A, pt, W) {
  const rage = h.rageT > 0;
  const late = A.endKb && h.t > A.act[1] - (A.multi || 0) * 1.3;
  const kb = late ? A.endKb : A.kb;
  const res = damageEnemy(e, {
    dmg: A.dmg * h.dmgMult * (rage ? 1.6 : 1), kbx: kb[0] * h.face, kby: kb[1],
    launch: A.launch, heavy: A.heavy || rage || late, breaks: A.breaks || rage, dir: h.face, x: pt.x, y: pt.y, src: h,
  }, W);
  if (!res) return;
  if (res === 'block') {
    FX.spark(pt.x, pt.y, 8, -h.face, 'white'); Sfx.play('clang'); FX.stop(0.04);
    h.vx = -h.face * 90;
    return;
  }
  FX.blood(pt.x, pt.y, A.heavy ? 10 : 5, h.face);
  FX.spark(pt.x, pt.y, A.heavy ? 8 : 4, h.face);
  FX.stop(A.stop || 0.04);
  FX.shake(A.shake || 1.6, 0.12);
  Sfx.play(A.heavy || late ? 'hitHeavy' : 'hit');
  if (res === 'crit') { Sfx.play('crit'); FX.text(pt.x, pt.y - 12, '¡CRÍTICO!', '#ffe08a', 13, 0.8); }
  if (A.launch && !e.T.big) Game.hint('launch');
  h.combo++; h.comboT = 2.4;
  Game.stats.maxCombo = Math.max(Game.stats.maxCombo, h.combo);
  if (!rage) h.rage = Math.min(100, h.rage + 2.4 * h.rageFill);
  else h.hp = Math.min(h.hpMax, h.hp + 0.6);
  if (h.rage >= 100 && !rage) Game.hint('rage');
  vibrate(A.heavy ? 18 : 8);
}

function slamUpdate(h, dt, W) {
  if (h.slamPhase === 0) {
    h.vx = 0; h.vy = Math.min(h.vy, 30);
    if (h.t > 0.16) { h.slamPhase = 1; h.vy = 980; Sfx.play('swingHeavy'); }
  } else if (h.slamPhase === 1) {
    h.vx = 0; h.vy = 980;
    pushTrails(h);
  } else if (h.slamPhase === 2) {
    h.vx = 0;
    if (h.t > 0.34) h.state = 'idle';
    else if (h.t > 0.18) {
      if (want(h, 'light')) { use(h, 'light'); startAttack(h, 'l1', Input.axisX()); }
      else if (want(h, 'dodge')) { use(h, 'dodge'); startDodge(h, Input.axisX()); }
    }
  }
}

function slamImpact(h, W) {
  h.slamPhase = 2; h.t = 0;
  const rage = h.rageT > 0, rad = 110;
  FX.ring(h.x, GY, 8, rad, 0.4, rage ? '255,210,90' : '255,140,50', 6);
  FX.dust(h.x, GY, 12, 40); FX.debris(h.x, GY, 10);
  FX.embers(h.x, GY - 6, 14, 'orange', 30);
  FX.shake(7, 0.3); FX.stop(0.07);
  Sfx.play('boom', 0.8);
  vibrate(30);
  let hits = 0;
  for (const e of W.enemies) {
    if (!canHit(e)) continue;
    const dx = e.x - h.x;
    if (Math.abs(dx) < rad + e.w / 2 && e.y > GY - 80) {
      const res = damageEnemy(e, { dmg: ATTACKS.slam.dmg * h.dmgMult * (rage ? 1.6 : 1), kbx: Math.sign(dx || 1) * 220, kby: -380, launch: true, heavy: true, breaks: true, dir: Math.sign(dx || 1), x: e.x, y: e.y - 10, src: h }, W);
      if (res && res !== 'block') { hits++; FX.blood(e.x, e.y - e.h / 2, 6); }
    }
  }
  if (hits) {
    h.combo += hits; h.comboT = 2.4; Game.stats.maxCombo = Math.max(Game.stats.maxCombo, h.combo);
    if (!rage) h.rage = Math.min(100, h.rage + 3 * hits * h.rageFill);
  }
}

function activateRage(h, W) {
  use(h, 'rage');
  h.rageT = h.rageMax; h.rage = 100;
  Sfx.play('rage');
  FX.ring(h.x, h.y - 30, 10, 170, 0.55, '255,120,40', 9);
  FX.ring(h.x, h.y - 30, 6, 110, 0.4, '255,220,140', 4);
  FX.embers(h.x, h.y - 30, 30, 'orange', 20);
  FX.shake(8, 0.45); FX.flashScreen('255,90,20', 0.55); FX.stop(0.12);
  vibrate(120);
  for (const e of W.enemies) {
    if (!canHit(e)) continue;
    const dx = e.x - h.x;
    if (Math.abs(dx) < 160) damageEnemy(e, { dmg: 12, kbx: Math.sign(dx || 1) * 320, kby: -260, launch: true, heavy: true, breaks: true, dir: Math.sign(dx || 1), src: h }, W);
  }
}

function heroTakeHit(h, dmg, kbx, kby, W, big) {
  if (h.state === 'dead' || W.cinematic) return false;
  if (h.state === 'dodge' && h.t < 0.2 && h.perfectT <= 0) {
    // esquiva perfecta: cámara lenta un instante
    h.perfectT = 3;
    FX.slow(0.35, 0.7); FX.text(h.x, h.y - 70, 'ESQUIVA PERFECTA', '#bfe3ff', 11, 1);
    FX.ring(h.x, h.y - 30, 6, 60, 0.35, '170,210,255', 3);
    return false;
  }
  if (h.inv > 0 || h.state === 'finisher') return false;
  const rage = h.rageT > 0;
  dmg *= Game.diff.dmg * (rage ? 0.5 : 1);
  h.hp -= dmg; h.flash = 0.18; h.combo = 0; h.comboT = 0;
  if (!rage) h.rage = Math.min(100, h.rage + dmg * 0.6 * h.rageFill);
  Sfx.play('hurt');
  FX.blood(h.x, h.y - 34, 8, Math.sign(kbx || 1));
  FX.shake(big ? 8 : 4.5, 0.25); FX.flashScreen('170,0,0', 0.3);
  vibrate(big ? 90 : 45);
  h.inv = 0.75;
  if (h.hp <= 0) {
    h.hp = 0; h.state = 'dead'; h.t = 0; h.rageT = 0;
    h.vx = kbx * 0.8; h.vy = -220; h.onGround = false;
    Sfx.play('death'); FX.slow(0.3, 1.4);
    return true;
  }
  if (!rage || big) {
    h.state = 'hurt'; h.t = 0; h.vx = kbx; h.vy = kby;
    if (kby < 0) h.onGround = false;
  }
  return true;
}

/* ---------- Remates ---------- */
function findFinishTarget(h, W) {
  let best = null, bd = 1e9;
  for (const e of W.enemies) {
    if (!e.alive || e.finishable <= 0) continue;
    const dx = Math.abs(e.x - h.x), reach = e.T.big ? 95 : 64;
    if (dx < reach && Math.abs((e.y - e.h / 2) - (h.y - 30)) < 90 && dx < bd) { best = e; bd = dx; }
  }
  return best;
}

function startFinisher(h, e, W) {
  h.state = 'finisher'; h.t = 0; h.vx = 0; h.vy = 0;
  h.face = Math.sign(e.x - h.x) || h.face;
  h.fin = { e, big: !!e.T.big, dur: e.T.big ? 1.55 : 0.85, hits: 0, sx: h.x, sy: h.y };
  h.inv = 99;
  e.state = 'grabbed'; e.t = 0; e.finishable = 0; e.vx = 0; e.vy = 0;
  W.zoom = 1.18;
  FX.slow(0.55, h.fin.dur * 0.9);
  Sfx.play('swingHeavy');
}

function finisherUpdate(h, dt, W) {
  const F = h.fin, e = F.e, t = h.t;
  const hitAt = F.big ? [0.45, 0.72, 0.98] : [0.3, 0.56];
  if (!F.big) {
    e.x = lerp(e.x, h.x + h.face * 24, 0.35);
    e.y = lerp(e.y, GY - 16, 0.25);
    e.face = -h.face;
  } else {
    // salta sobre la cabeza de la bestia
    const p = clamp(t / 0.32, 0, 1);
    const tx = e.x - h.face * 4, ty = e.y - e.h * 0.86;
    if (t < 1.2) { h.x = lerp(F.sx, tx, easeOut(p)); h.y = lerp(F.sy, ty, easeOut(p)) - Math.sin(p * Math.PI) * 30; }
    else { const q = clamp((t - 1.2) / 0.32, 0, 1); h.x = lerp(tx, tx - h.face * 60, q); h.y = lerp(ty, GY, easeIn(q)) - Math.sin(q * Math.PI) * 40; }
  }
  while (F.hits < hitAt.length && t >= hitAt[F.hits]) {
    F.hits++;
    const last = F.hits === hitAt.length;
    const px = F.big ? e.x + e.face * 14 : e.x, py = F.big ? e.y - e.h * 0.8 : e.y - e.h * 0.55;
    FX.blood(px, py, last ? 26 : 12, h.face); FX.spark(px, py, 6, h.face);
    FX.shake(last ? 9 : 4, 0.25); FX.stop(last ? 0.12 : 0.06);
    Sfx.play(last ? 'hitHeavy' : 'hit');
    vibrate(last ? 80 : 25);
    if (last) {
      killEnemy(e, W, { kbx: h.face * 120 }, true);
      FX.text(px, py - 20, pick(['¡BRUTAL!', '¡DESPIADADO!', '¡SIN PIEDAD!']), '#ff4a3a', 15, 1.1);
      h.combo++; h.comboT = 2.4;
      if (h.rageT <= 0) h.rage = Math.min(100, h.rage + 15 * h.rageFill);
    }
  }
  if (t >= F.dur) {
    h.state = h.y < GY - 1 ? 'air' : 'idle'; h.inv = 0.35; h.fin = null; W.zoom = 1;
    h.vy = 0;
  }
}
