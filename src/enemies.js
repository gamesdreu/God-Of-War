'use strict';
/* =========================================================
   Enemigos: legionarios, hoplitas, arpías, arqueros, el
   minotauro y Polifemo. También proyectiles y orbes.
   ========================================================= */
let enemyUid = 0;

function makeEnemy(type, x, opts = {}) {
  const T = ENEMIES[type];
  const hp = T.hp * Game.diff.hp * (opts.hpMul || 1);
  const e = {
    type, T, x, y: GY, vx: 0, vy: 0, face: -1, hp, hpMax: hp, w: T.w, h: T.h,
    state: 'spawn', t: 0, onGround: true, flash: 0, alive: true, dead: false,
    finishable: 0, cool: rand(0.7, 1.6), anim: rand(0, 10), poiseDmg: 0, guard: 0,
    id: ++enemyUid, hitHero: false, turnT: 0, side: chance(0.5) ? 1 : -1, phase: 1, spawnDur: 0.9,
  };
  if (T.fly) { e.y = -30; e.onGround = false; e.spawnDur = 0.9; }
  if (T.boss) { e.state = 'intro'; e.y = GY - 420; e.onGround = false; }
  return e;
}

function enemyBox(e) {
  if (e.type === 'ciclope') {
    const hh = e.state === 'kneel' || e.state === 'qte' ? 150 : 196;
    return { x: e.x - 38, y: e.y - hh, w: 76, h: hh };
  }
  if (e.state === 'down' || e.state === 'dazed') return { x: e.x - e.w / 2 - 6, y: e.y - e.h * 0.55, w: e.w + 12, h: e.h * 0.55 };
  return { x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h };
}
// El ojo se calcula con la misma pose que se dibuja
function cyclopsEye(e) {
  const P = cyclopsPoseOf(e), S = P.S;
  const x = e.x + (P.head.x + 4.2 * S) * e.face, y = e.y + P.head.y - 1 * S;
  return { x: x - 17, y: y - 14, w: 34, h: 28 };
}
function canHit(e) {
  if (!e.alive || e.state === 'spawn' || e.state === 'grabbed' || e.state === 'intro') return false;
  if (e.T.boss && (e.state === 'qte' || e.state === 'dying')) return false;
  return true;
}

// Aplica un golpe del héroe. Devuelve 'block', 'crit', 'hit', 'kill' o null.
function damageEnemy(e, hit, W) {
  if (!canHit(e)) return null;
  const fromSide = hit.src ? Math.sign(hit.src.x - e.x) : -hit.dir;
  if (e.T.shield && !hit.breaks && e.onGround && fromSide === e.face &&
      !['hurt', 'air', 'down', 'stagger', 'bash', 'bashWind'].includes(e.state)) {
    e.guard++; e.vx = hit.dir * 50; e.blockT = 0.15;
    if (e.guard >= 3) { e.state = 'bashWind'; e.t = 0; e.guard = 0; }
    return 'block';
  }
  let dmg = hit.dmg, res = 'hit';
  if (e.type === 'ciclope' && hit.y != null && inRect(hit.x, hit.y, cyclopsEye(e), 8)) { dmg *= 1.7; res = 'crit'; }
  if (['dazed', 'kneel', 'stagger', 'smashRec'].includes(e.state)) dmg *= 1.25;
  e.hp -= dmg; e.flash = 0.1;
  if (e.T.big) {
    e.poiseDmg += dmg * (hit.heavy ? 1.6 : 1);
    if (e.T.boss) {
      if (e.hp <= 0) { e.hp = 0; bossQTE(e, W); return res; }
      const ph = e.hp > e.hpMax * 0.66 ? 1 : e.hp > e.hpMax * 0.33 ? 2 : 3;
      if (ph > e.phase) { e.phase = ph; e.state = 'roar'; e.t = 0; e.poiseDmg = 0; return res; }
      if (e.poiseDmg >= e.T.poise && e.state !== 'kneel' && e.state !== 'roar') {
        e.poiseDmg = 0; e.state = 'kneel'; e.t = 0; FX.shake(8, 0.4); Sfx.play('stomp');
        FX.dust(e.x, GY, 14, 50);
      }
      return res;
    }
    if (e.hp <= 0) {
      if (e.state !== 'dazed') {
        e.state = 'dazed'; e.t = 0; e.finishable = 5; e.vx = hit.dir * 60;
        Game.hint('finish');
      } else if (e.hp < -e.hpMax * 0.15) killEnemy(e, W, hit);
      return res;
    }
    if (e.poiseDmg >= e.T.poise && e.state !== 'stagger') {
      e.poiseDmg = 0; e.state = 'stagger'; e.t = 0; e.vx = hit.dir * 120;
    }
    return res;
  }
  if (e.hp <= 0) { killEnemy(e, W, hit); return 'kill'; }
  // un ataque ya lanzado no se interrumpe con golpes ligeros: hay que esquivarlo
  const armored = (e.state === 'windup' && e.t > 0.18) || e.state === 'strike' || e.state === 'bash' || e.rageT > 0;
  if (armored && !hit.heavy && !hit.launch) return res;
  e.vx = hit.kbx / e.T.mass;
  if (e.T.fly && !hit.launch && !hit.heavy) {
    e.state = 'hurt'; e.t = 0; e.vy = hit.kby * 0.35;
  } else if (hit.launch || !e.onGround) {
    e.state = 'air'; e.t = 0; e.onGround = false;
    e.vy = hit.launch ? hit.kby / Math.sqrt(e.T.mass) : Math.min(e.vy * 0.3, hit.kby < -100 ? hit.kby : -170);
  } else {
    e.state = 'hurt'; e.t = 0;
    // tras varios golpes seguidos en el suelo, el enemigo se enfurece y contraataca
    e.hurtN = W.time - (e.lastHurt || -9) < 1.6 ? (e.hurtN || 0) + 1 : 1;
    e.lastHurt = W.time;
    if (e.hurtN >= 4 - Game.diffIdx && (e.type === 'legion' || e.type === 'hoplita')) {
      e.hurtN = 0; e.rageT = 1.1; e.vx *= 0.3;
      e.face = Math.sign(hit.src ? hit.src.x - e.x : -hit.dir) || e.face;
      go(e, 'windup'); e.t = 0.1;
    }
  }
  if (e.hp < e.hpMax * 0.35 && e.finishable <= 0 && (hit.heavy || chance(0.4))) { e.finishable = 2.4; Game.hint('finish'); }
  return res;
}

function killEnemy(e, W, hit, fin) {
  if (!e.alive) return;
  e.alive = false; e.dead = true; e.state = 'dead'; e.t = 0; e.finishable = 0;
  e.vx = ((hit && hit.kbx) || 0) / Math.min(e.T.mass, 3) * 0.8;
  e.vy = e.onGround ? -140 : Math.min(e.vy, -80);
  if (e.T.fly) e.vy = 40;
  e.onGround = false;
  Sfx.play('enemyDie');
  FX.blood(e.x, e.y - e.h / 2, fin ? 22 : 12);
  spawnOrbs(W, e.x, e.y - e.h / 2, 'red', e.T.orbs * (fin ? 2 : 1));
  if (fin || chance(0.22)) spawnOrbs(W, e.x, e.y - e.h / 2, 'green', fin ? (e.T.big ? 30 : 15) : 8);
  if (fin) spawnOrbs(W, e.x, e.y - e.h / 2, 'gold', e.T.big ? 30 : 12);
  Game.stats.kills++;
}

function spawnOrbs(W, x, y, kind, total) {
  const per = kind === 'red' ? 5 : kind === 'green' ? 5 : 6;
  const n = clamp(Math.round(total / per), 1, 14);
  for (let i = 0; i < n; i++) {
    const a = rand(-Math.PI * 0.9, -Math.PI * 0.1), sp = rand(80, 240);
    W.orbs.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, k: kind, v: total / n, t: 0 });
  }
}

function updateOrbs(W, h, dt) {
  for (let i = W.orbs.length - 1; i >= 0; i--) {
    const o = W.orbs[i];
    o.t += dt;
    if (o.t > 0.45 && h.state !== 'dead') {
      const dx = h.x - o.x, dy = (h.y - 30) - o.y, d = Math.hypot(dx, dy) || 1;
      const sp = 260 + o.t * 500;
      o.vx = lerp(o.vx, dx / d * sp, 0.15); o.vy = lerp(o.vy, dy / d * sp, 0.15);
      if (d < 16) {
        W.orbs.splice(i, 1);
        if (o.k === 'red') { Game.addOrbs(o.v); Sfx.play('orb'); }
        else if (o.k === 'green') { h.hp = Math.min(h.hpMax, h.hp + o.v); Sfx.play('heal'); }
        else { if (h.rageT <= 0) h.rage = Math.min(100, h.rage + o.v); Sfx.play('orb'); }
        continue;
      }
    } else {
      o.vy += 600 * dt; o.vx *= 0.98;
      if (o.y > GY - 4) { o.y = GY - 4; o.vy *= -0.5; }
    }
    o.x += o.vx * dt; o.y += o.vy * dt;
  }
}

/* ---------- Proyectiles ---------- */
function updateProjs(W, h, dt) {
  for (let i = W.projs.length - 1; i >= 0; i--) {
    const p = W.projs[i];
    p.t = (p.t || 0) + dt;
    if (p.dead) { W.projs.splice(i, 1); continue; }
    if (p.k === 'arrow') {
      p.vy += 200 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (inRect(p.x, p.y, heroBox(h), 3)) {
        if (heroTakeHit(h, p.dmg, Math.sign(p.vx) * 120, -80, W)) p.dead = true;
      }
      if (p.y > GY || p.t > 3) { p.dead = true; FX.spark(p.x, GY, 3, 0, 'white'); }
    } else if (p.k === 'rock') {
      p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot = (p.rot || 0) + dt * 6;
      if (Math.hypot(h.x - p.x, h.y - 30 - p.y) < 22) { heroTakeHit(h, p.dmg, Math.sign(p.vx) * 220, -200, W, true); p.dead = true; }
      if (p.y >= GY - 10) {
        p.dead = true;
        FX.debris(p.x, GY, 14, '#4a3b30'); FX.dust(p.x, GY, 10, 24); FX.shake(5, 0.2); Sfx.play('stomp', 0.8);
        if (Math.abs(h.x - p.x) < 44 && h.y > GY - 40) heroTakeHit(h, p.dmg * 0.6, Math.sign(h.x - p.x) * 200, -180, W);
      }
    } else if (p.k === 'wave') {
      const step = p.vx * dt;
      p.x += step; p.dist += Math.abs(step);
      if (chance(0.7)) FX.dust(p.x, GY, 1, 6, '140,110,80');
      if (chance(0.5)) FX.embers(p.x, GY - 4, 1, 'orange', 6);
      if (!p.hit && Math.abs(h.x - p.x) < 16 && h.y > GY - p.hgt) {
        if (heroTakeHit(h, p.dmg, Math.sign(p.vx) * 200, -240, W)) p.hit = true;
      }
      if (p.dist > p.max || p.x < W.bounds.l || p.x > W.bounds.r) p.dead = true;
    }
  }
}

/* ---------- IA ---------- */
function attackBox(e, x0, x1, y0, y1) {
  return e.face > 0 ? { x: e.x + x0, y: e.y + y0, w: x1 - x0, h: y1 - y0 } : { x: e.x - x1, y: e.y + y0, w: x1 - x0, h: y1 - y0 };
}
function tryHitHero(e, box, dmg, kbx, kby, W, big) {
  if (e.hitHero) return;
  const h = W.hero;
  if (overlap(box, heroBox(h))) { if (heroTakeHit(h, dmg, kbx, kby, W, big)) e.hitHero = true; }
}
function go(e, state) { e.state = state; e.t = 0; e.hitHero = false; }

function updateEnemies(W, dt) {
  const h = W.hero;
  let attackers = 0;
  for (const e of W.enemies) if (e.alive && /Wind|strike|swing|dive|screech|charge|bash|aim/.test(e.state)) attackers++;
  W.attackers = attackers;
  for (const e of W.enemies) updateEnemy(e, W, dt, h);
  // separación entre enemigos de suelo
  const g = W.enemies.filter(e => e.alive && !e.T.fly && !e.T.boss && e.state !== 'grabbed');
  for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
    const a = g[i], b = g[j], dx = b.x - a.x, min = (a.w + b.w) * 0.42;
    if (Math.abs(dx) < min && Math.abs(a.y - b.y) < 40) {
      const push = (min - Math.abs(dx)) * 0.5 * Math.min(1, dt * 10) * (dx >= 0 ? 1 : -1);
      a.x -= push; b.x += push;
    }
  }
  for (let i = W.enemies.length - 1; i >= 0; i--) if (W.enemies[i].remove) W.enemies.splice(i, 1);
}

function canStartAttack(W) { return W.attackers < (Game.diffIdx === 2 ? 3 : 2) && W.hero.state !== 'dead'; }

function enemyPhysics(e, W, dt, grav = 1300) {
  if (!e.onGround) e.vy += grav * dt;
  e.x += e.vx * dt; e.y += e.vy * dt;
  if (e.y >= GY) {
    const impact = e.vy;
    e.y = GY; e.vy = 0;
    if (!e.onGround) { e.onGround = true; e.landed = impact; }
  } else if (e.y < GY - 0.5) e.onGround = false;
  // la IA controla la velocidad al caminar; el rozamiento frena el resto (empujones, caídas…)
  if (e.onGround && !/walk|charge|strike|bash/.test(e.state)) e.vx = approach(e.vx, 0, 700 * dt);
  const m = e.w / 2 + 4;
  e.x = clamp(e.x, W.bounds.l + m, W.bounds.r - m);
}

// Estados de reacción comunes a los enemigos pequeños
function reactStates(e, W, dt) {
  switch (e.state) {
    case 'hurt':
      if (e.T.fly) { e.vx *= 0.9; e.vy *= 0.9; e.x += e.vx * dt; e.y += e.vy * dt; e.y = Math.min(e.y, GY - 20); if (e.t > 0.3) go(e, 'hover'); return true; }
      enemyPhysics(e, W, dt);
      if (e.t > 0.32) { go(e, 'walk'); e.cool = Math.max(e.cool, 0.35); }
      return true;
    case 'air':
      e.landed = 0;
      enemyPhysics(e, W, dt, e.vy < 0 ? 1300 : 1050);
      if (e.onGround && e.t > 0.05) {
        if (e.landed > 250) { FX.dust(e.x, GY, 4, 10); Sfx.play('land'); }
        go(e, 'down');
      }
      return true;
    case 'down':
      enemyPhysics(e, W, dt);
      if (e.t > (e.T.fly ? 1.2 : 0.7)) { go(e, e.T.fly ? 'rise' : 'walk'); e.cool = Math.max(e.cool, 0.5); }
      return true;
    case 'grabbed':
      return true;
    case 'dead':
      e.landed = 0;
      enemyPhysics(e, W, dt);
      if (e.onGround && e.t > 0.5) {
        if (!e.ashed) { e.ashed = true; FX.ash(e.x, e.y, e.w * 1.6, e.h * 0.4, e.T.big ? 40 : 18); }
        if (e.t > 1.4) e.remove = true;
      }
      if (e.t > 3) e.remove = true;
      return true;
  }
  return false;
}

function updateEnemy(e, W, dt, h) {
  e.t += dt; e.anim += dt;
  if (e.flash > 0) e.flash -= dt;
  if (e.blockT > 0) e.blockT -= dt;
  if (e.rageT > 0) e.rageT -= dt;
  if (e.finishable > 0 && e.state !== 'dazed') e.finishable -= dt;
  if (e.state === 'spawn') {
    if (e.T.fly) { e.y = lerp(-30, GY - 110, easeOut(clamp(e.t / e.spawnDur, 0, 1))); }
    else if (e.t < 0.05) { FX.dust(e.x, GY, 6, 14, '70,55,45'); Sfx.play('spawn'); }
    else if (chance(0.3)) FX.dust(e.x, GY, 1, 12, '70,55,45');
    if (e.t >= e.spawnDur) go(e, e.T.fly ? 'hover' : 'walk');
    return;
  }
  if (e.state === 'grabbed') return;
  if (e.T.boss) { updateBoss(e, W, dt, h); return; }
  if (reactStates(e, W, dt)) return;
  const dx = h.x - e.x, adx = Math.abs(dx);
  AI[e.type](e, W, dt, h, dx, adx);
}

const AI = {
  legion(e, W, dt, h, dx, adx) {
    switch (e.state) {
      case 'walk':
        e.face = Math.sign(dx) || e.face;
        e.cool -= dt;
        if (adx > 38) e.vx = approach(e.vx, e.face * e.T.speed * (e.finishable > 0 ? 0.4 : 1), 500 * dt);
        else e.vx = approach(e.vx, 0, 700 * dt);
        if (adx < 54 && e.cool <= 0 && canStartAttack(W) && e.finishable <= 0 && Math.abs(h.y - e.y) < 50) { go(e, 'windup'); W.attackers++; }
        break;
      case 'windup':
        e.vx = approach(e.vx, 0, 600 * dt);
        if (e.t > 0.5) { go(e, 'strike'); e.vx = e.face * 100; Sfx.play('swing'); }
        break;
      case 'strike':
        if (e.t < 0.14) tryHitHero(e, attackBox(e, 0, 50, -46, -6), e.T.dmg, e.face * 170, -120, W);
        if (e.t > 0.2) go(e, 'recover');
        break;
      case 'recover':
        if (e.t > 0.55) { go(e, 'walk'); e.cool = rand(1.0, 2.2); }
        break;
    }
    enemyPhysics(e, W, dt);
  },
  hoplita(e, W, dt, h, dx, adx) {
    switch (e.state) {
      case 'walk': {
        // gira el escudo con retraso: rodar por detrás funciona
        const want = Math.sign(dx) || e.face;
        if (want !== e.face) { e.turnT += dt; if (e.turnT > 0.4) { e.face = want; e.turnT = 0; } } else e.turnT = 0;
        e.cool -= dt;
        if (adx > 54) e.vx = approach(e.vx, Math.sign(dx) * e.T.speed, 400 * dt);
        else e.vx = approach(e.vx, 0, 700 * dt);
        if (adx < 66 && e.cool <= 0 && canStartAttack(W) && want === e.face && Math.abs(h.y - e.y) < 50) { go(e, 'windup'); W.attackers++; }
        break;
      }
      case 'windup':
        e.vx = approach(e.vx, 0, 600 * dt);
        if (e.t > 0.55) { go(e, 'strike'); e.vx = e.face * 140; Sfx.play('swing'); }
        break;
      case 'strike':
        if (e.t < 0.14) tryHitHero(e, attackBox(e, 8, 70, -42, -24), e.T.dmg, e.face * 200, -100, W);
        if (e.t > 0.22) go(e, 'recover');
        break;
      case 'bashWind':
        e.face = Math.sign(dx) || e.face;
        if (e.t > 0.25) { go(e, 'bash'); e.vx = e.face * 260; Sfx.play('swingHeavy'); }
        break;
      case 'bash':
        tryHitHero(e, attackBox(e, 0, 34, -52, 0), 8, e.face * 330, -160, W);
        if (e.t > 0.22) go(e, 'recover');
        break;
      case 'recover':
        if (e.t > 0.6) { go(e, 'walk'); e.cool = rand(1.1, 2.3); }
        break;
    }
    enemyPhysics(e, W, dt);
  },
  arpia(e, W, dt, h, dx, adx) {
    switch (e.state) {
      case 'hover': {
        e.face = Math.sign(dx) || e.face;
        const tx = h.x - e.side * 95, ty = GY - 112 + Math.sin(e.anim * 2.6) * 10;
        e.vx = lerp(e.vx, clamp((tx - e.x) * 2.2, -e.T.speed, e.T.speed), 0.08);
        e.vy = lerp(e.vy, clamp((ty - e.y) * 2.2, -e.T.speed, e.T.speed), 0.08);
        e.x += e.vx * dt; e.y += e.vy * dt;
        e.cool -= dt;
        if (e.cool <= 0 && canStartAttack(W) && adx < 220) { go(e, 'screech'); W.attackers++; Sfx.play('screech'); }
        break;
      }
      case 'screech':
        e.face = Math.sign(dx) || e.face;
        e.vx *= 0.9; e.vy = Math.sin(e.t * 40) * 30;
        e.x += e.vx * dt; e.y += e.vy * dt;
        if (e.t > 0.5) {
          go(e, 'dive');
          const tx = h.x, ty = h.y - 26, d = Math.hypot(tx - e.x, ty - e.y) || 1;
          e.vx = (tx - e.x) / d * 380; e.vy = (ty - e.y) / d * 380;
        }
        break;
      case 'dive':
        e.x += e.vx * dt; e.y += e.vy * dt;
        tryHitHero(e, { x: e.x - 13, y: e.y - 24, w: 26, h: 24 }, e.T.dmg, Math.sign(e.vx) * 180, -100, W);
        if (e.y >= GY - 4 || e.t > 1.1 || e.hitHero) { e.y = Math.min(e.y, GY - 4); go(e, 'rise'); }
        break;
      case 'rise':
        e.vy = lerp(e.vy, -170, 0.1); e.vx *= 0.96;
        e.x += e.vx * dt; e.y += e.vy * dt;
        if (e.y <= GY - 105 || e.t > 1.6) { go(e, 'hover'); e.cool = rand(1.6, 3.2); e.side = -e.side; }
        break;
    }
    const m = e.w / 2;
    e.x = clamp(e.x, W.bounds.l + m, W.bounds.r - m);
    e.y = clamp(e.y, 20, GY);
    e.onGround = false;
  },
  arquero(e, W, dt, h, dx, adx) {
    switch (e.state) {
      case 'walk': {
        e.face = Math.sign(dx) || e.face;
        e.cool -= dt;
        const nearWall = (e.x - W.bounds.l < 50 && dx > 0) || (W.bounds.r - e.x < 50 && dx < 0);
        let v = 0;
        if (adx < 150 && !nearWall) v = -e.face * e.T.speed;
        else if (adx > 300) v = e.face * e.T.speed;
        e.vx = approach(e.vx, v, 500 * dt);
        if (e.cool <= 0 && adx < 460) { go(e, 'aim'); Sfx.play('ui'); }
        break;
      }
      case 'aim':
        e.face = Math.sign(dx) || e.face;
        if (e.t > 0.8) {
          const sx = e.x + e.face * 14, sy = e.y - 38, tx = h.x, ty = h.y - 30;
          const sp = 390, time = Math.max(0.15, Math.abs(tx - sx) / sp);
          W.projs.push({ k: 'arrow', x: sx, y: sy, vx: Math.sign(tx - sx || e.face) * sp, vy: (ty - sy) / time - 100 * time, dmg: e.T.dmg });
          Sfx.play('arrow');
          go(e, 'recover');
        }
        break;
      case 'recover':
        if (e.t > 0.5) { go(e, 'walk'); e.cool = rand(1.8, 3); }
        break;
    }
    enemyPhysics(e, W, dt);
  },
  minotauro(e, W, dt, h, dx, adx) {
    switch (e.state) {
      case 'walk': {
        const want = Math.sign(dx) || e.face;
        if (want !== e.face) { e.turnT += dt; if (e.turnT > 0.3) { e.face = want; e.turnT = 0; } } else e.turnT = 0;
        if (adx > 72) e.vx = approach(e.vx, want * e.T.speed, 300 * dt);
        else e.vx = approach(e.vx, 0, 700 * dt);
        e.cool -= dt;
        if (e.cool <= 0 && want === e.face && h.state !== 'dead') {
          if (adx > 170 && chance(0.65)) { go(e, 'chargeWind'); Sfx.play('bull'); }
          else if (adx < 100) go(e, chance(0.6) ? 'swingWind' : 'slamWind');
          else if (adx < 260) go(e, 'slamWind');
        }
        break;
      }
      case 'swingWind':
        if (e.t > 0.65) { go(e, 'swing'); Sfx.play('swingHeavy'); e.vx = e.face * 80; }
        break;
      case 'swing':
        if (e.t < 0.2) tryHitHero(e, attackBox(e, 6, 92, -84, -8), e.T.dmg, e.face * 280, -220, W, true);
        if (e.t > 0.25) go(e, 'recover');
        break;
      case 'slamWind':
        if (e.t > 0.8) {
          go(e, 'slam');
          tryHitHero(e, attackBox(e, 20, 92, -44, 0), e.T.dmg, e.face * 220, -260, W, true);
          W.projs.push({ k: 'wave', x: e.x + e.face * 70, vx: e.face * 300, dist: 0, max: 300, dmg: 14, hgt: 22 });
          FX.shake(6, 0.3); FX.dust(e.x + e.face * 60, GY, 10, 20); FX.debris(e.x + e.face * 60, GY, 8); Sfx.play('stomp');
        }
        break;
      case 'slam':
        if (e.t > 0.8) go(e, 'recover');
        break;
      case 'chargeWind':
        e.vx = 0;
        if (chance(0.4)) FX.dust(e.x - e.face * 14, GY, 1, 6);
        if (e.t > 0.85) go(e, 'charge');
        break;
      case 'charge': {
        e.vx = e.face * 350;
        if (chance(0.6)) FX.dust(e.x - e.face * 18, GY, 1, 8);
        tryHitHero(e, { x: e.x - 26, y: e.y - 72, w: 52, h: 72 }, e.T.dmg + 4, e.face * 400, -240, W, true);
        const passed = (h.x - e.x) * e.face < -150;
        const wall = (e.face > 0 && e.x > W.bounds.r - 40) || (e.face < 0 && e.x < W.bounds.l + 40);
        if (e.t > 1.5 || passed || wall) {
          go(e, 'recover'); e.vx = e.face * 120;
          if (wall) { FX.shake(7, 0.3); Sfx.play('stomp'); FX.debris(e.x + e.face * 20, GY - 40, 10); }
        }
        break;
      }
      case 'recover':
        if (e.t > 0.9) { go(e, 'walk'); e.cool = rand(0.6, 1.4); }
        break;
      case 'stagger':
        if (e.t > 1.3) { go(e, 'walk'); e.cool = 0.4; }
        break;
      case 'dazed':
        e.finishable = 5 - e.t;
        if (chance(0.1)) FX.embers(e.x, e.y - e.h, 1, 'gold', 14);
        if (e.t > 5) killEnemy(e, W, { kbx: 0 });
        break;
    }
    enemyPhysics(e, W, dt);
  },
};

/* ---------- Polifemo, el Cíclope ---------- */
function bossQTE(e, W) {
  go(e, 'qte');
  e.vx = 0;
  W.qte = { e, prog: 0.15, t: 0, dur: 5.5 };
  W.zoom = 1.12;
  FX.shake(10, 0.6); Sfx.play('roar');
  FX.slow(0.5, 0.6);
}

function updateBoss(e, W, dt, h) {
  const dx = h.x - e.x, adx = Math.abs(dx);
  const speed = e.phase === 3 ? 0.8 : 1;   // fase 3: más rápido
  const wind = s => s * speed;
  switch (e.state) {
    case 'intro':
      if (!e.onGround) {
        e.vy += 1200 * dt; e.y += e.vy * dt;
        if (e.y >= GY) {
          e.y = GY; e.onGround = true; e.t = 0; e.landedIntro = true;
          FX.shake(14, 0.8); FX.dust(e.x, GY, 30, 80); FX.debris(e.x, GY, 22); Sfx.play('boom', 1.2);
          vibrate(150);
          if (Math.abs(h.x - e.x) < 120) heroTakeHit(h, 10, Math.sign(h.x - e.x || -1) * 300, -250, W);
        }
        return;
      }
      if (e.t > 0.5 && !e.roared) { e.roared = true; Sfx.play('roar'); FX.shake(9, 1.4); FX.ring(e.x, e.y - 170, 10, 220, 0.9, '255,200,150', 5); }
      if (e.t > 2.2) { go(e, 'idle'); e.cool = 1; W.cinematic = false; }
      return;
    case 'idle': {
      const want = Math.sign(dx) || e.face;
      if (want !== e.face) { e.turnT += dt; if (e.turnT > 0.55) { e.face = want; e.turnT = 0; } } else e.turnT = 0;
      e.cool -= dt;
      if (adx > 140) {
        e.vx = want * e.T.speed * (e.phase === 3 ? 1.4 : 1);
        if (Math.floor(e.anim * 2.2) !== Math.floor((e.anim - dt) * 2.2)) { Sfx.play('stomp', 0.35); FX.shake(2, 0.12); FX.dust(e.x, GY, 3, 30); }
      } else e.vx = 0;
      if (e.cool <= 0 && h.state !== 'dead') {
        let opts;
        if (adx < 100) opts = ['stompWind', 'sweepWind', 'stompWind'];
        else if (adx < 230) opts = ['smashWind', 'sweepWind', 'smashWind'];
        else opts = e.phase >= 2 ? ['rockWind', 'smashWind', 'rockWind'] : ['smashWind'];
        if (want !== e.face && adx < 100) opts = ['stompWind'];
        if (adx < 420 || e.phase >= 2) { go(e, pick(opts)); e.vx = 0; }
      }
      break;
    }
    case 'smashWind':
      if (e.t > wind(0.95)) {
        go(e, 'smash');
        tryHitHero(e, attackBox(e, 40, 178, -72, 0), e.T.dmg + 2, e.face * 300, -300, W, true);
        W.projs.push({ k: 'wave', x: e.x + e.face * 150, vx: e.face * 330, dist: 0, max: 460, dmg: 16, hgt: 24 });
        FX.shake(11, 0.4); FX.debris(e.x + e.face * 130, GY, 16); FX.dust(e.x + e.face * 130, GY, 16, 40);
        Sfx.play('boom'); vibrate(60);
      }
      break;
    case 'smash':
      if (e.t > 0.1) go(e, 'smashRec');
      break;
    case 'smashRec':
      if (e.t > wind(1.1)) { go(e, 'idle'); e.cool = rand(0.5, 1.1) * speed; }
      break;
    case 'sweepWind':
      if (e.t > wind(0.8)) { go(e, 'sweep'); Sfx.play('swingHeavy'); }
      break;
    case 'sweep':
      tryHitHero(e, attackBox(e, -40, 205, -46, 0), e.T.dmg - 4, e.face * 360, -200, W, true);
      if (e.t > 0.26) go(e, 'sweepRec');
      break;
    case 'sweepRec':
      if (e.t > wind(0.65)) { go(e, 'idle'); e.cool = rand(0.5, 1.1) * speed; }
      break;
    case 'stompWind':
      if (e.t > wind(0.6)) {
        go(e, 'stomp');
        const box = { x: e.x - 105, y: GY - 34, w: 210, h: 34 };
        if (overlap(box, heroBox(h))) heroTakeHit(h, e.T.dmg - 6, Math.sign(dx || 1) * 320, -260, W, true);
        FX.shake(9, 0.35); FX.dust(e.x, GY, 18, 60); FX.ring(e.x, GY, 10, 120, 0.4, '200,160,120', 5);
        Sfx.play('boom', 0.8);
      }
      break;
    case 'stomp':
      if (e.t > wind(0.55)) { go(e, 'idle'); e.cool = rand(0.4, 1) * speed; }
      break;
    case 'rockWind':
      if (e.t > wind(0.9)) {
        go(e, 'rockRec');
        const sx = e.x + e.face * 30, sy = e.y - 196, T = 1.05;
        W.projs.push({ k: 'rock', x: sx, y: sy, vx: (h.x - sx) / T, vy: (GY - 10 - sy) / T - 0.5 * 700 * T, dmg: 20 });
        Sfx.play('swingHeavy');
      }
      break;
    case 'rockRec':
      if (e.t > wind(0.7)) { go(e, 'idle'); e.cool = rand(0.4, 0.9) * speed; }
      break;
    case 'roar':
      if (e.t > 0.35 && !e.roarDone) {
        e.roarDone = true;
        Sfx.play('roar'); FX.shake(10, 1.2); FX.ring(e.x, e.y - 170, 10, 240, 0.9, '255,190,140', 6);
        if (adx < 170) heroTakeHit(h, 0.01, Math.sign(dx || 1) * 380, -200, W);
        Game.summon(e.phase === 2 ? [['legion', 3]] : [['legion', 2], ['arpia', 2]]);
      }
      if (e.t > 1.8) { go(e, 'idle'); e.roarDone = false; e.cool = 1.2; }
      break;
    case 'kneel':
      e.vx = 0;
      if (chance(0.15)) FX.embers(e.x + e.face * 14, e.y - 130, 1, 'gold', 16);
      if (e.t > 2.8) { go(e, 'idle'); e.cool = 0.4; }
      break;
    case 'qte':
      if (chance(0.15)) FX.embers(e.x + e.face * 14, e.y - 132, 1, 'gold', 14);
      break;
    case 'dying':
      if (chance(0.4)) FX.blood(e.x + e.face * 14, e.y - 170 + e.t * 40, 2);
      if (e.t > 1.6 && !e.fell) {
        e.fell = true; FX.shake(16, 1.2); FX.dust(e.x, GY, 40, 120); FX.debris(e.x, GY, 26); Sfx.play('boom', 1.3); vibrate(250);
      }
      break;
  }
  if (e.state !== 'intro') {
    e.x += e.vx * dt;
    const m = 50;
    e.x = clamp(e.x, W.bounds.l + m, W.bounds.r - m);
  }
}
