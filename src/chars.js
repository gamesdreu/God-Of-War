'use strict';
/* =========================================================
   Personajes dibujados por código con un esqueleto sencillo
   (IK de dos huesos para brazos y piernas)
   ========================================================= */
let TINT = null;                       // color de destello al recibir un golpe
const K = col => TINT || col;

function pose(S, o) {
  const lean = o.lean || 0, cr = o.crouch || 0;
  const hip = { x: (o.hx || 0) * S, y: (-28 + cr * 5 + (o.bob || 0)) * S };
  const tl = (o.torso || 22) * S;
  const neck = { x: hip.x + Math.sin(lean) * tl, y: hip.y - Math.cos(lean) * tl };
  const hl = lean + (o.headTilt || 0);
  const head = { x: neck.x + Math.sin(hl) * 7.5 * S, y: neck.y - Math.cos(hl) * 7.5 * S };
  const sh = { x: neck.x - Math.sin(lean) * 2.5 * S, y: neck.y + Math.cos(lean) * 2.5 * S };
  const fR = { x: (o.fR ? o.fR[0] : 7) * S, y: (o.fR ? o.fR[1] : 0) * S };
  const fL = { x: (o.fL ? o.fL[0] : -6) * S, y: (o.fL ? o.fL[1] : 0) * S };
  const lg = o.leg || [15, 14], ar = o.arm || [11, 11];
  const kR = ik(hip.x, hip.y, fR.x, fR.y, lg[0] * S, lg[1] * S, -1);
  const kL = ik(hip.x, hip.y, fL.x, fL.y, lg[0] * S, lg[1] * S, -1);
  const dR = (o.dR == null ? 16 : o.dR) * S, dL = (o.dL == null ? 16 : o.dL) * S;
  const hR = { x: sh.x + Math.cos(o.aR) * dR, y: sh.y + Math.sin(o.aR) * dR };
  const hL = { x: sh.x + Math.cos(o.aL) * dL, y: sh.y + Math.sin(o.aL) * dL };
  const eR = ik(sh.x, sh.y, hR.x, hR.y, ar[0] * S, ar[1] * S, o.bendR || 1);
  const eL = ik(sh.x, sh.y, hL.x, hL.y, ar[0] * S, ar[1] * S, o.bendL || 1);
  return { hip, neck, head, sh, fR, fL, kR, kL, hR, hL, eR, eL, S, lean };
}
function walkFeet(ph, stride, lift, base = [7, -6]) {
  return {
    fR: [base[0] * 0.3 + Math.sin(ph) * stride, -Math.max(0, Math.cos(ph)) * lift],
    fL: [base[1] * 0.3 + Math.sin(ph + Math.PI) * stride, -Math.max(0, Math.cos(ph + Math.PI)) * lift],
  };
}

function seg(c, a, b, w, col) { c.strokeStyle = K(col); c.lineWidth = w; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
function limb(c, a, b, d, w1, w2, col) { seg(c, a, b, w1, col); seg(c, b, d, w2, col); }
function dot(c, p, r, col) { c.fillStyle = K(col); c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.fill(); }
const mix = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
function torsoPts(P, wTop, wBot, ext = 0) {
  const ux = P.neck.x - P.hip.x, uy = P.neck.y - P.hip.y, l = Math.hypot(ux, uy) || 1;
  const u = { x: ux / l, y: uy / l }, n = { x: -u.y, y: u.x };
  const S = P.S;
  return {
    u, n,
    nf: { x: P.neck.x + n.x * wTop / 2 * S + u.x * ext * S, y: P.neck.y + n.y * wTop / 2 * S + u.y * ext * S },
    nb: { x: P.neck.x - n.x * wTop / 2 * S + u.x * ext * S, y: P.neck.y - n.y * wTop / 2 * S + u.y * ext * S },
    hb: { x: P.hip.x - n.x * wBot / 2 * S, y: P.hip.y - n.y * wBot / 2 * S },
    hf: { x: P.hip.x + n.x * wBot / 2 * S, y: P.hip.y + n.y * wBot / 2 * S },
  };
}
function poly(c, pts, col) {
  c.fillStyle = K(col); c.beginPath(); c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
  c.closePath(); c.fill();
}

/* ---------- El Fantasma de Esparta ---------- */
const HC = { skin: '#e2dccf', shade: '#b5ad9f', tattoo: '#b3121a', beard: '#2a2320', skirt: '#6d1c15', skirtD: '#4a120d', gold: '#caa04a', bronze: '#9b7337', leather: '#4a3122' };

function heroPoseOf(h, bs) {
  const o = { aR: bs.R.a, aL: bs.L.a, dR: 15, dL: 15 };
  const reachArm = b => (b.reach > 20 ? 19 : 15);
  o.dR = reachArm(bs.R); o.dL = reachArm(bs.L);
  switch (h.state) {
    case 'idle': o.crouch = 0.6; o.lean = 0.08; o.bob = Math.sin(h.anim * 2.4) * 0.5; o.fR = [8, 0]; o.fL = [-7, 0]; break;
    case 'run': { const f = walkFeet(h.runPhase, 11, 7); Object.assign(o, f); o.lean = 0.24; o.bob = -Math.abs(Math.sin(h.runPhase)) * 1.6; break; }
    case 'air': o.fR = h.vy < 0 ? [6, -9] : [5, -2]; o.fL = h.vy < 0 ? [-4, -5] : [-6, -1]; o.lean = 0.1; break;
    case 'dodge': o.crouch = 2; o.fR = [5, -6]; o.fL = [-3, -4]; o.lean = 0.7; break;
    case 'hurt': o.lean = -0.35; o.fR = [11, 0]; o.fL = [-4, 0]; o.headTilt = -0.2; break;
    case 'dead': o.lean = -0.2; o.fR = [8, 0]; o.fL = [-5, 0]; break;
    case 'finisher': o.lean = 0.25; o.fR = [12, 0]; o.fL = [-8, 0]; o.crouch = 0.6; if (h.fin && h.fin.big && h.t < 1.2) { o.crouch = 1.6; o.fR = [6, -2]; o.fL = [-6, -2]; } break;
    case 'attack': {
      const A = ATTACKS[h.atk];
      if (h.atk === 'slam') { if (h.slamPhase < 2) { o.fR = [5, -9]; o.fL = [-4, -6]; o.lean = 0.2; } else { o.crouch = 2; o.lean = 0.55; o.fR = [12, 0]; o.fL = [-9, 0]; } break; }
      const p = clamp(h.t / A.dur, 0, 1);
      if (A.air) { o.fR = [6, -7]; o.fL = [-5, -4]; o.lean = A.multi ? 0 : 0.15; }
      else if (h.atk === 'h1') { o.crouch = h.t < A.act[0] ? 1.4 : 0.2; o.lean = h.t < A.act[0] ? 0.35 : -0.12; o.fR = [11, 0]; o.fL = [-8, 0]; }
      else if (A.multi) { o.lean = 0.05; o.crouch = 0.6; o.fR = [10, 0]; o.fL = [-9, 0]; }
      else { o.lean = 0.12 + Math.sin(p * Math.PI) * 0.2; o.crouch = 0.8; o.fR = [13, 0]; o.fL = [-9, 0]; }
      break;
    }
  }
  return pose(1, o);
}

function drawBlade(c, sh, hand, b, rage, far) {
  const dx = Math.cos(b.a), dy = Math.sin(b.a);
  let bx = hand.x, by = hand.y;
  if (b.reach > 20) {
    bx = sh.x + dx * (b.reach - 6); by = sh.y + dy * (b.reach - 6);
    c.strokeStyle = K(far ? '#4f4640' : '#71665d'); c.lineWidth = 1.5;
    c.setLineDash([2.2, 1.6]);
    c.beginPath(); c.moveTo(hand.x, hand.y); c.lineTo(bx, by); c.stroke();
    c.setLineDash([]);
  }
  c.save(); c.translate(bx, by); c.rotate(b.a);
  c.fillStyle = K('#35261c'); c.fillRect(-4, -1.2, 4.5, 2.4);
  c.beginPath(); c.moveTo(0, -2.3); c.quadraticCurveTo(8, -4.6, 16.5, -0.6); c.quadraticCurveTo(9, 0.9, 0, 2.2); c.closePath();
  c.fillStyle = K(rage ? '#ffe7b0' : far ? '#a59d92' : '#d2cabe'); c.fill();
  c.strokeStyle = K(rage ? '#ffb32e' : '#ff7a22'); c.lineWidth = 0.9; c.stroke();
  c.restore();
  if (b.act || rage) {
    c.globalCompositeOperation = 'lighter';
    FX.drawGlow(c, rage ? 'gold' : 'orange', bx + dx * 8, by + dy * 8, rage ? 16 : 11, rage ? 0.8 : 0.55);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
}

function drawHero(c, h) {
  const bs = bladeState(h);
  const P = heroPoseOf(h, bs);
  const rage = h.rageT > 0;
  if (h.inv > 0 && h.inv < 0.75 && h.state !== 'dodge' && h.state !== 'finisher' && h.inv < 50 && Math.floor(h.inv * 14) % 2 === 0) c.globalAlpha = 0.55;
  TINT = h.flash > 0 ? '#ffffff' : null;
  c.save();
  c.translate(h.x, h.y);
  c.scale(h.face, 1);
  if (h.state === 'dodge') { c.translate(0, -16); c.rotate((h.t / 0.38) * TAU); c.translate(0, 16); }
  if (h.state === 'air' && h.jumps === 2 && h.vy < 0) { const k = 1 - (-h.vy / HERO.djumpV); c.translate(0, -30); c.rotate(k * TAU); c.translate(0, 30); }
  if (h.state === 'dead') { c.rotate(-Math.min(1, h.t / 0.45) * Math.PI / 2); }
  if (rage) {
    c.globalCompositeOperation = 'lighter';
    FX.drawGlow(c, 'orange', 0, -30, 46 + Math.sin(h.anim * 20) * 4, 0.45);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  }
  c.lineCap = 'round'; c.lineJoin = 'round';
  // brazo y hoja lejanos
  drawBlade(c, P.sh, P.hL, bs.L, rage, true);
  limb(c, P.sh, P.eL, P.hL, 5.2, 4.8, HC.shade);
  seg(c, mix(P.eL, P.hL, 0.35), P.hL, 5.6, '#5a4026');
  // pierna lejana
  limb(c, P.hip, P.kL, P.fL, 6.2, 5.4, HC.shade);
  seg(c, mix(P.kL, P.fL, 0.25), mix(P.kL, P.fL, 0.85), 6, '#6e5229');
  seg(c, P.fL, { x: P.fL.x + 4, y: P.fL.y }, 3, HC.leather);
  // torso
  const T = torsoPts(P, 14.5, 10.5, 0.5);
  poly(c, [T.nf, T.nb, T.hb, T.hf], HC.skin);
  // músculo pectoral sombreado
  c.strokeStyle = K('rgba(120,110,100,0.5)'); c.lineWidth = 1;
  c.beginPath(); c.moveTo(T.nf.x - T.n.x * 2, T.nf.y + 7); c.quadraticCurveTo(P.neck.x + T.n.x * 6, P.neck.y + 10, P.neck.x, P.neck.y + 9); c.stroke();
  // tatuaje rojo en diagonal
  seg(c, { x: P.neck.x - T.n.x * 4.5, y: P.neck.y - T.n.y * 4.5 + 1 }, { x: P.hip.x + T.n.x * 3.5 + T.u.x * 3, y: P.hip.y + T.n.y * 3.5 + T.u.y * 3 }, 3.2, HC.tattoo);
  // falda y cinturón
  const d = { x: -T.u.x, y: -T.u.y }, fl = h.state === 'run' ? Math.sin(h.runPhase * 2) * 1.5 : 0;
  poly(c, [
    { x: P.hip.x - T.n.x * 6, y: P.hip.y - T.n.y * 6 },
    { x: P.hip.x + T.n.x * 6, y: P.hip.y + T.n.y * 6 },
    { x: P.hip.x + T.n.x * 8 + d.x * 11 + fl, y: P.hip.y + d.y * 11 },
    { x: P.hip.x - T.n.x * 8 + d.x * 12 - fl, y: P.hip.y + d.y * 12 },
  ], HC.skirt);
  seg(c, { x: P.hip.x + T.n.x * 8 + d.x * 11 + fl, y: P.hip.y + d.y * 11 }, { x: P.hip.x - T.n.x * 8 + d.x * 12 - fl, y: P.hip.y + d.y * 12 }, 1.4, HC.gold);
  seg(c, { x: P.hip.x + T.n.x * 2, y: P.hip.y + 1 }, { x: P.hip.x + T.n.x * 3 + d.x * 10, y: P.hip.y + d.y * 10 }, 3, HC.skirtD);
  seg(c, { x: P.hip.x - T.n.x * 6, y: P.hip.y - T.n.y * 6 - 1 }, { x: P.hip.x + T.n.x * 6, y: P.hip.y + T.n.y * 6 - 1 }, 3, HC.leather);
  dot(c, { x: P.hip.x + T.n.x * 5, y: P.hip.y - 1 }, 1.6, HC.gold);
  // pierna cercana
  limb(c, P.hip, P.kR, P.fR, 6.6, 5.6, HC.skin);
  seg(c, mix(P.kR, P.fR, 0.25), mix(P.kR, P.fR, 0.85), 6.2, HC.bronze);
  seg(c, P.fR, { x: P.fR.x + 4.5, y: P.fR.y }, 3, HC.leather);
  // cabeza
  const hd = P.head;
  seg(c, P.neck, hd, 5, HC.skin);
  dot(c, hd, 6.3, HC.skin);
  c.fillStyle = K(HC.beard);
  c.beginPath(); c.moveTo(hd.x + 1, hd.y + 2.2); c.lineTo(hd.x + 6.6, hd.y + 2.6); c.lineTo(hd.x + 5.6, hd.y + 8.4); c.lineTo(hd.x + 2, hd.y + 7.2); c.closePath(); c.fill();
  c.strokeStyle = K(HC.tattoo); c.lineWidth = 2.5;
  c.beginPath(); c.arc(hd.x, hd.y, 5, -0.35, -2.9, true); c.stroke();
  seg(c, { x: hd.x + 4.4, y: hd.y - 3.2 }, { x: hd.x + 3.9, y: hd.y + 2.4 }, 1.8, HC.tattoo);
  c.fillStyle = K(rage ? '#ffcf4a' : '#170c09'); c.fillRect(hd.x + 2.6, hd.y - 1.2, 2.6, 1.4);
  // hombrera
  dot(c, { x: P.sh.x - 1, y: P.sh.y + 0.5 }, 4, '#7f5a2a');
  // brazo y hoja cercanos
  limb(c, P.sh, P.eR, P.hR, 5.6, 5.2, HC.skin);
  seg(c, mix(P.eR, P.hR, 0.35), P.hR, 6, '#6e4f2c');
  dot(c, P.hR, 2.6, HC.skin);
  drawBlade(c, P.sh, P.hR, bs.R, rage, false);
  c.restore();
  TINT = null; c.globalAlpha = 1;
}

/* ---------- Enemigos ---------- */
function enemyGround(c, e) {
  // sombra
  const hgt = Math.max(0, GY - e.y);
  const s = Math.max(0.25, 1 - hgt / 220);
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.ellipse(e.x, GY + 1, e.w * 0.7 * s, 3.2 * s, 0, 0, TAU); c.fill();
}

function drawEnemy(c, e) {
  c.save();
  if (e.state === 'spawn' && !e.T.fly) {
    const p = easeOut(clamp(e.t / e.spawnDur, 0, 1));
    c.beginPath(); c.rect(e.x - 80, -400, 160, GY + 400); c.clip();
    c.translate(0, (1 - p) * e.h * 1.05);
  }
  if (e.state === 'dead' && e.t > 0.8) c.globalAlpha = clamp(1 - (e.t - 0.8) / 0.6, 0, 1);
  TINT = e.flash > 0 ? '#fff4ea' : null;
  c.translate(e.x, e.y);
  c.scale(e.face, 1);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const lying = e.state === 'down' || (e.state === 'dead' && !e.T.fly);
  if (lying) { const p = clamp(e.t / 0.3, 0, 1); c.rotate(-p * Math.PI / 2 * 0.95); }
  if (e.state === 'air') c.rotate(-clamp(e.t * 4, 0, 1) * 0.9);
  if (e.rageT > 0 && e.alive) {
    c.globalCompositeOperation = 'lighter';
    FX.drawGlow(c, 'red', 0, -e.h * 0.55, e.h * 0.75, 0.35 + Math.sin(e.anim * 30) * 0.15);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  }
  DRAW[e.type](c, e);
  c.restore();
  TINT = null; c.globalAlpha = 1;
  if (e.finishable > 0 && e.alive && e.state !== 'grabbed') drawFinishMark(c, e);
}

function drawFinishMark(c, e) {
  const y = e.y - e.h - 16 - Math.sin(performance.now() / 150) * 2;
  const r = 6.5 + Math.sin(performance.now() / 90) * 0.8;
  c.globalCompositeOperation = 'lighter';
  FX.drawGlow(c, 'red', e.x, y, 16, 0.6);
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  c.strokeStyle = '#ff5544'; c.lineWidth = 2.4;
  c.beginPath(); c.arc(e.x, y, r, 0, TAU); c.stroke();
}

function legionPose(e, S) {
  const o = { aR: 1.2, aL: 1.9, dR: 16, dL: 15, crouch: 0.4, lean: 0.12 };
  const moving = Math.abs(e.vx) > 8 && e.onGround;
  if (moving) { Object.assign(o, walkFeet(e.anim * 9, 8, 5)); o.lean = 0.18; o.aR = 1.1 + Math.sin(e.anim * 9) * 0.4; o.aL = 1.9 - Math.sin(e.anim * 9) * 0.4; }
  switch (e.state) {
    case 'windup': o.aR = -2.4; o.dR = 17; o.lean = -0.12; o.fR = [10, 0]; o.fL = [-7, 0]; break;
    case 'strike': o.aR = 0.5; o.dR = 21; o.lean = 0.3; o.fR = [13, 0]; o.fL = [-8, 0]; break;
    case 'recover': o.aR = 0.9; o.dR = 19; o.lean = 0.2; o.fR = [12, 0]; o.fL = [-8, 0]; break;
    case 'hurt': o.lean = -0.4; o.aR = -1.8; o.aL = 2.6; o.headTilt = -0.3; break;
    case 'air': case 'down': case 'dead': o.aR = -2; o.aL = 2.6; o.fR = [8, -3]; o.fL = [-4, -1]; break;
    case 'grabbed': o.aR = -1.2; o.aL = -1.5; o.fR = [4, -4]; o.fL = [-3, -2]; o.lean = -0.2; break;
    case 'bashWind': o.aL = 0.2; o.dL = 12; o.lean = -0.1; break;
    case 'bash': o.aL = 0; o.dL = 18; o.lean = 0.35; o.fR = [12, 0]; o.fL = [-8, 0]; break;
  }
  return o;
}

const DRAW = {
  legion(c, e) {
    const S = 0.86, o = legionPose(e, S), P = pose(S, o);
    const skin = '#7d896a', dark = '#5a644e';
    limb(c, P.sh, P.eL, P.hL, 4.2, 3.8, dark);
    limb(c, P.hip, P.kL, P.fL, 5, 4.4, dark);
    const T = torsoPts(P, 13, 10, 0.5);
    poly(c, [T.nf, T.nb, T.hb, T.hf], skin);
    poly(c, [mix(T.nf, T.hf, 0.15), mix(T.nb, T.hb, 0.15), T.hb, T.hf], '#5d4330');
    seg(c, mix(T.nf, T.hf, 0.35), mix(T.nb, T.hb, 0.35), 1.2, '#3a2a1e');
    seg(c, mix(T.nf, T.hf, 0.6), mix(T.nb, T.hb, 0.6), 1.2, '#3a2a1e');
    poly(c, [T.hb, T.hf, { x: T.hf.x + 2, y: T.hf.y + 10 * S }, { x: T.hb.x - 1, y: T.hb.y + 11 * S }], '#4a2620');
    limb(c, P.hip, P.kR, P.fR, 5.4, 4.6, skin);
    seg(c, P.neck, P.head, 4, skin);
    dot(c, P.head, 5.4 * S + 0.6, skin);
    // casco con penacho
    c.fillStyle = K('#8b6a34');
    c.beginPath(); c.arc(P.head.x, P.head.y, 5.8 * S + 0.8, Math.PI * 1.05, Math.PI * 2.05); c.closePath(); c.fill();
    c.fillRect(P.head.x - 5, P.head.y - 1, 2.4, 6);
    c.fillStyle = K('#9c1b17');
    c.beginPath(); c.ellipse(P.head.x - 1, P.head.y - 6.2, 6.5, 2.6, -0.1, Math.PI, TAU); c.fill();
    c.fillStyle = K('#ffd06a'); c.fillRect(P.head.x + 2.2, P.head.y - 0.6, 2, 1.4);
    // brazo con espada
    limb(c, P.sh, P.eR, P.hR, 4.6, 4.2, skin);
    const ang = Math.atan2(P.hR.y - P.eR.y, P.hR.x - P.eR.x);
    c.save(); c.translate(P.hR.x, P.hR.y); c.rotate(ang);
    c.fillStyle = K('#4a3a2a'); c.fillRect(-2, -2.5, 2.2, 5);
    c.fillStyle = K(e.state === 'windup' && e.t > 0.15 ? '#ffe2a0' : '#a7a69c');
    c.beginPath(); c.moveTo(0, -1.6); c.lineTo(16, -1.2); c.lineTo(19, 0); c.lineTo(16, 1.2); c.lineTo(0, 1.6); c.fill();
    c.restore();
    if (e.state === 'windup' && e.t < 0.3) telegraph(c, P.hR, e.t, e.rageT > 0);
  },
  hoplita(c, e) {
    const S = 0.9, o = legionPose(e, S);
    if (e.state === 'walk' || e.state === 'recover' || e.state === 'hurt') { o.aL = 0.15; o.dL = 11; }
    if (e.state === 'windup') { o.aR = 3.0; o.dR = 14; o.aL = 0.15; o.dL = 11; }
    if (e.state === 'strike') { o.aR = -0.05; o.dR = 21; o.aL = 0.25; o.dL = 11; }
    const P = pose(S, o);
    const skin = '#9aa08a', dark = '#737866';
    limb(c, P.hip, P.kL, P.fL, 5.2, 4.6, dark);
    const T = torsoPts(P, 14, 11, 0.5);
    poly(c, [T.nf, T.nb, T.hb, T.hf], '#a7803d');
    seg(c, mix(T.nf, T.hf, 0.45), mix(T.nb, T.hb, 0.45), 1.2, '#6e5226');
    poly(c, [T.hb, T.hf, { x: T.hf.x + 2, y: T.hf.y + 10 }, { x: T.hb.x - 1, y: T.hb.y + 11 }], '#3a2a5a');
    limb(c, P.hip, P.kR, P.fR, 5.6, 4.8, skin);
    seg(c, mix(P.kR, P.fR, 0.2), mix(P.kR, P.fR, 0.8), 5.6, '#9b7536');
    // casco corintio
    seg(c, P.neck, P.head, 4, skin);
    c.fillStyle = K('#b08940');
    c.beginPath(); c.arc(P.head.x, P.head.y, 6.6, 0, TAU); c.fill();
    c.fillRect(P.head.x - 1, P.head.y, 7.2, 5.5);
    c.fillStyle = K('#120a08'); c.fillRect(P.head.x + 1.8, P.head.y - 1.2, 5, 1.8);
    c.fillStyle = K('#ffcf6a'); c.fillRect(P.head.x + 3.4, P.head.y - 0.8, 1.6, 1);
    c.fillStyle = K('#1d1a2e');
    c.beginPath(); c.ellipse(P.head.x - 1.5, P.head.y - 7, 8.5, 3.6, 0, Math.PI, TAU); c.fill();
    // lanza
    limb(c, P.sh, P.eR, P.hR, 4.8, 4.4, skin);
    const ang = e.state === 'windup' ? -0.05 : e.state === 'strike' ? 0 : -0.25;
    c.save(); c.translate(P.hR.x, P.hR.y); c.rotate(ang);
    seg(c, { x: -22, y: 0 }, { x: 32, y: 0 }, 1.8, '#5a3d24');
    c.fillStyle = K(e.state === 'windup' && e.t > 0.2 ? '#ffe2a0' : '#bdb7a8');
    c.beginPath(); c.moveTo(31, -2.2); c.lineTo(40, 0); c.lineTo(31, 2.2); c.fill();
    c.restore();
    // escudo redondo delante
    const sx = P.hL.x + 3, sy = P.hL.y - 2;
    c.fillStyle = K(e.blockT > 0 ? '#ffe9b0' : '#b48a3e');
    c.beginPath(); c.ellipse(sx, sy, 6, 15, 0, 0, TAU); c.fill();
    c.strokeStyle = K('#6c4f20'); c.lineWidth = 1.6; c.stroke();
    c.fillStyle = K('#8f1a14');
    c.beginPath(); c.moveTo(sx + 1, sy - 6); c.lineTo(sx + 3.5, sy + 5); c.lineTo(sx - 1.2, sy + 5); c.closePath(); c.fill();
    if (e.state === 'windup' && e.t < 0.3) telegraph(c, { x: P.hR.x + 38, y: P.hR.y }, e.t);
    if (e.state === 'bashWind') telegraph(c, { x: sx + 4, y: sy }, e.t);
  },
  arpia(c, e) {
    const t = e.anim;
    const dive = e.state === 'dive' || e.state === 'screech';
    const down = e.state === 'down' || e.state === 'dead' || e.state === 'air';
    const flap = down ? 0.3 : dive ? -0.9 : Math.sin(t * 13) * 0.9;
    const by = -14;
    // alas
    const wing = (dir, col) => {
      c.save(); c.translate(-2, by - 4); c.rotate(flap * dir * 0.6 - (dive ? 0.8 : 0));
      c.fillStyle = K(col);
      c.beginPath(); c.moveTo(0, 0);
      c.quadraticCurveTo(-14, -18 - flap * 8, -30, -10 - flap * 14);
      c.lineTo(-24, -6 - flap * 10); c.lineTo(-27, -1 - flap * 8); c.lineTo(-20, 0 - flap * 5); c.lineTo(-21, 5 - flap * 3); c.lineTo(-12, 4);
      c.closePath(); c.fill();
      c.restore();
    };
    wing(1, '#2e2733');
    // cuerpo
    c.fillStyle = K('#8f7d84');
    c.beginPath(); c.ellipse(0, by, 6, 10, 0.25, 0, TAU); c.fill();
    // patas con garras
    c.lineCap = 'round';
    seg(c, { x: -1, y: by + 8 }, { x: 2, y: by + 16 }, 2.2, '#b8984e');
    seg(c, { x: 2, y: by + 16 }, { x: 5, y: by + 17 }, 1.4, '#e8d7a0');
    seg(c, { x: -3, y: by + 7 }, { x: -3, y: by + 15 }, 2.2, '#9c7f40');
    // cabeza y melena
    const hx = 4, hy = by - 11;
    c.fillStyle = K('#14100f');
    c.beginPath(); c.moveTo(hx - 3, hy - 4); c.quadraticCurveTo(hx - 16, hy - 2 + Math.sin(t * 8) * 2, hx - 20, hy + 8); c.lineTo(hx - 2, hy + 3); c.closePath(); c.fill();
    dot(c, { x: hx, y: hy }, 4.6, '#a08f95');
    c.fillStyle = K('#ffe066'); c.fillRect(hx + 1.5, hy - 1.5, 2, 1.3);
    if (e.state === 'screech') { c.fillStyle = K('#3a0808'); c.fillRect(hx + 1, hy + 1.5, 3, 2.5); telegraph(c, { x: hx + 4, y: hy }, e.t); }
    wing(-1, '#4a3f50');
  },
  arquero(c, e) {
    const S = 0.84;
    const o = { aR: 0.1, aL: 1.7, dR: 18, dL: 12, crouch: 0.3, lean: 0.05 };
    if (Math.abs(e.vx) > 8 && e.onGround) { Object.assign(o, walkFeet(e.anim * 9, 8, 5)); }
    if (e.state === 'aim') { o.aR = -0.12; o.dR = 20; o.aL = -0.1; o.dL = lerp(16, 6, clamp(e.t / 0.8, 0, 1)); o.lean = -0.05; }
    if (e.state === 'hurt') { o.lean = -0.4; o.aR = -1.6; }
    if (e.state === 'air' || e.state === 'down' || e.state === 'dead') { o.aR = -2; o.aL = 2.4; }
    if (e.state === 'grabbed') { o.aR = -1.3; o.aL = -1.6; o.fR = [4, -4]; o.fL = [-3, -2]; }
    const P = pose(S, o);
    const bone = '#d6cdb8', boneD = '#a39b88';
    limb(c, P.hip, P.kL, P.fL, 2.6, 2.2, boneD);
    // carcaj
    seg(c, { x: P.neck.x - 5, y: P.neck.y - 3 }, { x: P.hip.x - 6, y: P.hip.y - 4 }, 4, '#4a3122');
    seg(c, { x: P.neck.x - 6, y: P.neck.y - 6 }, { x: P.neck.x - 4, y: P.neck.y - 2 }, 1, '#c9b48a');
    // columna y costillas
    seg(c, P.hip, P.neck, 2.4, bone);
    for (let i = 0; i < 4; i++) {
      const p = mix(P.neck, P.hip, 0.15 + i * 0.15);
      c.strokeStyle = K(bone); c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(p.x - 1, p.y); c.quadraticCurveTo(p.x + 6, p.y - 1, p.x + 5, p.y + 3); c.stroke();
    }
    c.strokeStyle = K(bone); c.lineWidth = 2;
    c.beginPath(); c.ellipse(P.hip.x, P.hip.y, 5, 2.4, 0, 0, TAU); c.stroke();
    limb(c, P.hip, P.kR, P.fR, 2.8, 2.4, bone);
    // calavera
    dot(c, P.head, 5.2, bone);
    c.fillRect(P.head.x + 0.5, P.head.y + 2, 4.5, 3.4);
    c.fillStyle = K('#120806'); c.fillRect(P.head.x + 1.6, P.head.y - 1.6, 2.6, 2.4);
    c.fillStyle = K('#ff4a2a'); c.fillRect(P.head.x + 2.3, P.head.y - 1, 1.2, 1.2);
    // arco
    limb(c, P.sh, P.eL, P.hL, 2.4, 2.2, boneD);
    limb(c, P.sh, P.eR, P.hR, 2.6, 2.4, bone);
    c.strokeStyle = K('#5c3b22'); c.lineWidth = 2;
    c.beginPath(); c.arc(P.hR.x - 6, P.hR.y, 13, -1.1, 1.1); c.stroke();
    const tx = P.hR.x - 6 + Math.cos(1.1) * 13;
    c.strokeStyle = K('#d8d0c0'); c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(tx, P.hR.y - 11.6); c.lineTo(P.hL.x, P.hL.y); c.lineTo(tx, P.hR.y + 11.6); c.stroke();
    if (e.state === 'aim') {
      seg(c, P.hL, { x: P.hR.x + 6, y: P.hR.y }, 1.2, '#8a6a40');
      if (e.t > 0.5) telegraph(c, { x: P.hR.x + 6, y: P.hR.y }, e.t - 0.5);
    }
  },
  minotauro(c, e) {
    const S = 1.42;
    const o = { aR: 0.4, aL: 0.6, dR: 18, dL: 16, crouch: 0.5, lean: 0.2, torso: 21, arm: [12, 11] };
    if (Math.abs(e.vx) > 8 && e.onGround) { Object.assign(o, walkFeet(e.anim * 6, 8, 5)); }
    switch (e.state) {
      case 'swingWind': o.aR = -2.5; o.aL = -2.3; o.lean = -0.15; break;
      case 'swing': o.aR = 0.7; o.aL = 0.8; o.dR = 21; o.lean = 0.4; o.fR = [12, 0]; o.fL = [-9, 0]; break;
      case 'slamWind': o.aR = -1.7; o.aL = -1.6; o.dR = 20; o.lean = -0.2; break;
      case 'slam': o.aR = 0.95; o.aL = 1.0; o.dR = 20; o.lean = 0.5; o.crouch = 1.4; o.fR = [12, 0]; o.fL = [-9, 0]; break;
      case 'chargeWind': o.lean = 0.45; o.crouch = 1.2; o.aR = 2.3; o.aL = 2.1; o.fR = [8, 0]; o.fL = [-12, 0]; o.headTilt = 0.6; break;
      case 'charge': { Object.assign(o, walkFeet(e.anim * 16, 11, 7)); o.lean = 0.6; o.aR = 2.4; o.aL = 2.3; o.headTilt = 0.7; break; }
      case 'recover': o.lean = 0.3; o.aR = 1.3; o.aL = 1.4; break;
      case 'stagger': o.lean = -0.35; o.aR = -1.9; o.aL = 2.3; o.fR = [10, 0]; o.fL = [-6, 0]; break;
      case 'dazed': case 'grabbed': o.crouch = 3.2; o.lean = 0.35; o.aR = 1.5; o.aL = 1.6; o.fR = [9, -0]; o.fL = [-9, -1]; o.headTilt = 0.4 + Math.sin(e.t * 3) * 0.1; break;
      case 'dead': o.aR = -2; o.aL = 2.4; break;
    }
    const P = pose(S, o);
    const fur = '#4b3226', furD = '#33221a', chest = '#5f4130';
    limb(c, P.sh, P.eL, P.hL, 7.5, 7, furD);
    limb(c, P.hip, P.kL, P.fL, 9.5, 8, furD);
    c.fillStyle = K('#1a120e'); c.fillRect(P.fL.x - 2, P.fL.y - 3, 7, 3);
    const T = torsoPts(P, 24, 15, 1);
    poly(c, [T.nf, T.nb, T.hb, T.hf], fur);
    poly(c, [mix(T.nf, T.nb, 0.1), mix(T.nf, T.nb, 0.55), mix(T.hf, T.hb, 0.5), mix(T.hf, T.hb, 0.05)], chest);
    poly(c, [T.hb, T.hf, { x: T.hf.x + 3, y: T.hf.y + 15 }, { x: T.hb.x - 2, y: T.hb.y + 16 }], '#2a1b13');
    seg(c, mix(T.hb, T.hf, -0.05), mix(T.hb, T.hf, 1.05), 3.5, '#8c6a2e');
    limb(c, P.hip, P.kR, P.fR, 10, 8.5, fur);
    c.fillStyle = K('#1a120e'); c.fillRect(P.fR.x - 2, P.fR.y - 3, 8, 3);
    // cabeza de toro
    const hd = P.head, ht = (o.headTilt || 0) + P.lean;
    c.save(); c.translate(hd.x, hd.y); c.rotate(ht * 0.6);
    c.fillStyle = K(furD); c.beginPath(); c.ellipse(-2, 2, 9, 8, 0, 0, TAU); c.fill();
    c.fillStyle = K(fur); c.beginPath(); c.ellipse(4, 3, 9, 6.5, 0.3, 0, TAU); c.fill();
    c.fillStyle = K('#3a2a22'); c.beginPath(); c.ellipse(11, 6, 4.5, 4, 0.2, 0, TAU); c.fill();
    c.strokeStyle = K('#c9a046'); c.lineWidth = 1.3; c.beginPath(); c.arc(12.5, 9, 2.4, 0, TAU); c.stroke();
    c.strokeStyle = K('#e6dcc4'); c.lineWidth = 3.4;
    c.beginPath(); c.moveTo(-2, -4); c.quadraticCurveTo(-4, -16, 8, -19); c.stroke();
    c.strokeStyle = K('#cfc3a8'); c.lineWidth = 3;
    c.beginPath(); c.moveTo(-6, -3); c.quadraticCurveTo(-14, -12, -10, -20); c.stroke();
    c.fillStyle = K(e.state === 'chargeWind' || e.state === 'charge' ? '#ff2a1a' : '#ff6a3a'); c.fillRect(4, -1, 3, 2);
    c.restore();
    // hacha doble (labrys)
    limb(c, P.sh, P.eR, P.hR, 8, 7.4, fur);
    const ang = Math.atan2(P.hR.y - P.sh.y, P.hR.x - P.sh.x);
    c.save(); c.translate(P.hR.x, P.hR.y); c.rotate(ang);
    seg(c, { x: -14, y: 0 }, { x: 34, y: 0 }, 3, '#4a311f');
    c.fillStyle = K(/Wind/.test(e.state) && e.t > 0.3 ? '#ffe0a0' : '#9d978c');
    c.beginPath(); c.moveTo(28, -1); c.quadraticCurveTo(24, -16, 36, -20); c.quadraticCurveTo(33, -9, 38, -1); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(28, 1); c.quadraticCurveTo(24, 16, 36, 20); c.quadraticCurveTo(33, 9, 38, 1); c.closePath(); c.fill();
    c.restore();
    if (/Wind/.test(e.state) && e.t < 0.3) telegraph(c, { x: P.hR.x, y: P.hR.y - 10 }, e.t, true);
    if (e.state === 'dazed') {
      for (let i = 0; i < 3; i++) {
        const a = e.t * 4 + i * TAU / 3;
        dot(c, { x: hd.x + Math.cos(a) * 12, y: hd.y - 18 + Math.sin(a) * 3 }, 1.6, '#ffe28a');
      }
    }
  },
  ciclope(c, e) { drawCyclops(c, e); },
};

function telegraph(c, p, t, red) {
  const k = clamp(t / 0.3, 0, 1);
  c.globalCompositeOperation = 'lighter';
  FX.drawGlow(c, red ? 'red' : 'gold', p.x, p.y, 10 + (1 - k) * 14, 1 - k * 0.6);
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
}

/* ---------- Polifemo ---------- */
function cyclopsPoseOf(e) {
  const S = 3.25;
  const o = { aR: -1.1, aL: 1.2, dR: 15, dL: 15, crouch: 0.3, lean: 0.1, torso: 22, arm: [11, 11] };
  const walking = Math.abs(e.vx) > 5;
  if (walking) { Object.assign(o, walkFeet(e.anim * 4.4, 5, 4, [7, -6])); o.bob = -Math.abs(Math.sin(e.anim * 4.4)) * 1; }
  const p = k => clamp(e.t / k, 0, 1);
  switch (e.state) {
    case 'intro': if (!e.onGround) { o.fR = [6, -6]; o.fL = [-6, -4]; } else if (e.t > 0.5) { o.lean = -0.25; o.headTilt = -0.3; o.aR = -1.9; o.aL = -2.2; } break;
    case 'smashWind': o.aR = lerp(-1.6, -2.6, p(0.9)); o.dR = 17; o.lean = -0.15; o.aL = -2.4; break;
    case 'smash': case 'smashRec': o.aR = 0.75; o.dR = 18; o.aL = 0.9; o.lean = 0.42; o.crouch = 1.6; o.fR = [11, 0]; o.fL = [-8, 0]; break;
    case 'sweepWind': o.aR = lerp(1.4, 2.8, p(0.8)); o.lean = -0.1; o.aL = 0.5; o.fR = [10, 0]; o.fL = [-8, 0]; break;
    case 'sweep': o.aR = lerp(2.8, -0.2, easeOut(p(0.26))); o.dR = 18; o.lean = 0.2; o.fR = [10, 0]; o.fL = [-8, 0]; break;
    case 'sweepRec': o.aR = -0.3; o.dR = 18; o.lean = 0.15; break;
    case 'stompWind': o.fR = [9, -lerp(0, 9, p(0.4))]; o.aR = -0.6; o.aL = -2.6; o.lean = -0.1; break;
    case 'stomp': o.fR = [10, 0]; o.crouch = 0.8; o.aR = -0.4; o.aL = 2.6; o.lean = 0.2; break;
    case 'rockWind': if (e.t < 0.45) { o.aL = 1.1; o.dL = 20; o.lean = 0.5; o.crouch = 1.2; } else { o.aL = -2.2; o.dL = 17; o.lean = -0.2; } break;
    case 'rockRec': o.aL = 0.2; o.dL = 20; o.lean = 0.25; break;
    case 'roar': o.lean = -0.28; o.headTilt = -0.35; o.aR = -1.9; o.aL = -2.4; o.dR = 17; o.dL = 17; break;
    case 'kneel': case 'qte': o.crouch = 2.6; o.lean = 0.42; o.fR = [10, -1]; o.fL = [-9, 0]; o.aR = 1.2; o.aL = 1.5; o.dR = 17; o.headTilt = 0.15; break;
    case 'dying': o.lean = -0.3; o.headTilt = -0.4; o.aR = -2.2; o.aL = 2.4; break;
  }
  return pose(S, o);
}

function drawCyclops(c, e) {
  const P = cyclopsPoseOf(e), S = P.S;
  if (e.state === 'dying') { const k = easeIn(clamp(e.t / 1.6, 0, 1)); c.rotate(-k * Math.PI / 2 * 0.92); }
  const skin = '#8d7b67', dark = '#6a5b4b', belly = '#a08c76';
  // brazo lejano (roca)
  limb(c, P.sh, P.eL, P.hL, 7.4 * S, 6.8 * S, dark);
  dot(c, P.hL, 3.4 * S, dark);
  if (e.state === 'rockWind') {
    c.fillStyle = K('#4a3b30'); c.beginPath(); c.arc(P.hL.x, P.hL.y - 4 * S, 5 * S, 0, TAU); c.fill();
  }
  // grillete con cadena rota
  seg(c, mix(P.eL, P.hL, 0.75), mix(P.eL, P.hL, 0.92), 8 * S, '#3a3532');
  limb(c, P.hip, P.kL, P.fL, 8.4 * S, 7.6 * S, dark);
  // torso
  const T = torsoPts(P, 24, 21, 1.5);
  poly(c, [T.nf, T.nb, T.hb, T.hf], skin);
  c.fillStyle = K(belly);
  c.beginPath(); c.ellipse(lerp(P.neck.x, P.hip.x, 0.62) + T.n.x * 4 * S, lerp(P.neck.y, P.hip.y, 0.62), 9 * S, 8 * S, P.lean, 0, TAU); c.fill();
  c.strokeStyle = K('rgba(60,40,30,0.5)'); c.lineWidth = 1.6;
  c.beginPath(); c.arc(P.neck.x + T.n.x * 3 * S, P.neck.y + 8 * S, 6 * S, 0.3, 2.2); c.stroke();
  // taparrabos
  poly(c, [T.hb, T.hf, { x: T.hf.x + 4 * S, y: T.hf.y + 12 * S }, { x: T.hb.x - 2 * S, y: T.hb.y + 13 * S }], '#3b2a1d');
  seg(c, mix(T.hb, T.hf, -0.05), mix(T.hb, T.hf, 1.05), 2.6 * S, '#2a1d14');
  limb(c, P.hip, P.kR, P.fR, 9 * S, 8 * S, skin);
  c.fillStyle = K('#4a3b30'); c.fillRect(P.fR.x - 3 * S, P.fR.y - 2 * S, 9 * S, 2.4 * S);
  // cabeza
  const hd = P.head;
  seg(c, P.neck, hd, 9 * S, skin);
  dot(c, hd, 9.5 * S, skin);
  c.fillStyle = K('#2c221b');
  c.beginPath(); c.ellipse(hd.x - 4 * S, hd.y - 6 * S, 7 * S, 4 * S, -0.3, 0, TAU); c.fill();
  // cuerno
  c.fillStyle = K('#d8ccb0');
  c.beginPath(); c.moveTo(hd.x - 1 * S, hd.y - 8.5 * S); c.quadraticCurveTo(hd.x + 1 * S, hd.y - 17 * S, hd.x + 6 * S, hd.y - 18 * S); c.quadraticCurveTo(hd.x + 3 * S, hd.y - 12 * S, hd.x + 3.5 * S, hd.y - 7.5 * S); c.closePath(); c.fill();
  // boca
  const roar = e.state === 'roar' || (e.state === 'intro' && e.t > 0.5) || e.state === 'qte';
  c.fillStyle = K('#2a0a08');
  c.beginPath(); c.ellipse(hd.x + 5 * S, hd.y + 5.5 * S, 3.6 * S, (roar ? 2.8 : 1) * S, 0, 0, TAU); c.fill();
  if (roar) { c.fillStyle = K('#e8e0cc'); for (let i = 0; i < 3; i++) c.fillRect(hd.x + (2.5 + i * 2) * S, hd.y + 3.4 * S, 1 * S, 1.2 * S); }
  // el ojo (punto débil)
  const ex = hd.x + 4.2 * S, ey = hd.y - 1 * S;
  if (e.blind) {
    c.fillStyle = K('#5a0606'); c.beginPath(); c.ellipse(ex, ey, 4.4 * S, 3.6 * S, 0, 0, TAU); c.fill();
  } else {
    c.fillStyle = K('#efe6d2'); c.beginPath(); c.ellipse(ex, ey, 4.6 * S, 3.8 * S, 0, 0, TAU); c.fill();
    c.strokeStyle = K('rgba(170,30,20,0.7)'); c.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) { const a = i * 1.6 + 0.4; c.beginPath(); c.moveTo(ex + Math.cos(a) * 4.4 * S, ey + Math.sin(a) * 3.6 * S); c.lineTo(ex + Math.cos(a) * 2.6 * S, ey + Math.sin(a) * 2 * S); c.stroke(); }
    const hx = Game.world ? Game.world.hero.x : e.x, hy = Game.world ? Game.world.hero.y - 30 : GY;
    const lx = clamp(((hx - e.x) * e.face) / 200, -1, 1) * 1.6 * S, ly = clamp((hy - (e.y - 180)) / 200, -1, 1) * 1.2 * S;
    dot(c, { x: ex + lx, y: ey + ly }, 2.4 * S, e.state === 'kneel' || e.state === 'qte' ? '#ffd24a' : '#e09a18');
    dot(c, { x: ex + lx * 1.2, y: ey + ly * 1.2 }, 1.1 * S, '#120804');
    c.strokeStyle = K('#4a3a2e'); c.lineWidth = 2;
    c.beginPath(); c.ellipse(ex, ey, 4.6 * S, 3.8 * S, 0, 0, TAU); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.moveTo(ex - 5 * S, ey - 4.5 * S); c.lineTo(ex + 4 * S, ey - 5.4 * S); c.stroke();
  }
  // brazo cercano con la maza
  limb(c, P.sh, P.eR, P.hR, 8 * S, 7.2 * S, skin);
  dot(c, P.hR, 3.6 * S, skin);
  let ang = Math.atan2(P.hR.y - P.eR.y, P.hR.x - P.eR.x);
  if (e.state === 'idle' || e.state === 'intro' || e.state === 'roar') ang = -2.3;
  c.save(); c.translate(P.hR.x, P.hR.y); c.rotate(ang);
  c.fillStyle = K('#4a3322');
  c.beginPath(); c.moveTo(-6, -3); c.lineTo(84, -9); c.quadraticCurveTo(98, 0, 90, 10); c.lineTo(-6, 4); c.closePath(); c.fill();
  c.fillStyle = K('#c8bfae');
  for (let i = 0; i < 5; i++) { const x = 40 + i * 11; c.beginPath(); c.moveTo(x, -7 - i); c.lineTo(x + 3, -14 - i * 1.2); c.lineTo(x + 6, -7 - i); c.fill(); c.beginPath(); c.moveTo(x + 2, 6 + i * 0.6); c.lineTo(x + 5, 12 + i); c.lineTo(x + 8, 6 + i * 0.6); c.fill(); }
  c.restore();
  if (/Wind/.test(e.state) && e.t < 0.35) telegraph(c, { x: P.hR.x, y: P.hR.y - 20 }, e.t, true);
  if (e.state === 'kneel' || e.state === 'qte') {
    for (let i = 0; i < 4; i++) { const a = e.t * 3 + i * TAU / 4; dot(c, { x: hd.x + Math.cos(a) * 30, y: hd.y - 40 + Math.sin(a) * 6 }, 2.4, '#ffe28a'); }
  }
}
