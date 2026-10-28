'use strict';
/* =========================================================
   Dibujo del mundo: cielo, capas con paralaje, suelo, clima,
   HUD, rótulos de capítulo, QTE y controles táctiles
   ========================================================= */
const R = { cv: null, c: null, layers: null, key: '', weather: [], wTheme: '', bolt: 0, boltX: 0, nextBolt: 6 };

const THEMES = {
  costa: { sky: ['#0a121c', '#1c2734', '#4d3530', '#8a4a33'], sun: [0.72, 214, '255,140,80'], weather: 'rain', fog: '30,40,52' },
  templo: { sky: ['#120706', '#3e140d', '#8e3517', '#d6742e'], sun: [0.3, 196, '255,170,90'], weather: 'embers', fog: '90,35,18' },
  volcan: { sky: ['#060303', '#250806', '#6e170a', '#bd3a0f'], sun: [0.5, 240, '255,80,20'], weather: 'ash', fog: '70,14,8' },
};

function initRender(cv) { R.cv = cv; R.c = cv.getContext('2d', { alpha: false }); }
function resizeCanvas() {
  R.cv.width = Math.round(Layout.W * Layout.dpr);
  R.cv.height = Math.round(Layout.H * Layout.dpr);
  R.key = '';
}

function makeLayer(w, h, rs, fn) {
  const cv = document.createElement('canvas');
  const k = Math.min(rs, 4096 / w);
  cv.width = Math.ceil(w * k); cv.height = Math.ceil(h * k);
  const c = cv.getContext('2d');
  c.scale(k, k);
  fn(c, w, h);
  return { cv, w, h };
}
// dibuja algo que puede cruzar el borde del mosaico en ambos lados
const wrapX = (w, x, half, fn) => { fn(x); if (x - half < 0) fn(x + w); if (x + half > w) fn(x - w); };

function glowBlob(c, x, y, r, col, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}

function buildLayers(theme, rs) {
  const r = rng(theme.length * 7919 + 17);
  const L = {};
  if (theme === 'costa') {
    L.far = makeLayer(960, 160, rs, (c, w) => {
      const hz = 92;
      for (let i = 0; i < 5; i++) {
        const x = r() * w, cw = 60 + r() * 120, ch = 18 + r() * 46;
        wrapX(w, x, cw, xx => { c.fillStyle = '#141b24'; c.beginPath(); c.moveTo(xx - cw, hz); c.lineTo(xx - cw * 0.4, hz - ch); c.lineTo(xx + cw * 0.2, hz - ch * 0.8); c.lineTo(xx + cw, hz); c.fill(); });
      }
      const g = c.createLinearGradient(0, hz, 0, 160);
      g.addColorStop(0, '#2a2f38'); g.addColorStop(0.15, '#18222d'); g.addColorStop(1, '#0c1319');
      c.fillStyle = g; c.fillRect(0, hz, w, 160 - hz);
      c.fillStyle = 'rgba(190,100,60,0.55)'; c.fillRect(0, hz, w, 1);
      for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(90,110,125,${0.15 + r() * 0.3})`; c.fillRect(r() * w, hz + 4 + r() * 60, 6 + r() * 18, 1); }
      for (let i = 0; i < 3; i++) {
        const x = 120 + i * 320 + r() * 80, sw = 26 + r() * 16;
        c.fillStyle = '#0a0d11';
        c.beginPath(); c.moveTo(x - sw, hz - 2); c.lineTo(x + sw, hz - 2); c.lineTo(x + sw * 0.7, hz + 4); c.lineTo(x - sw * 0.8, hz + 4); c.fill();
        c.fillRect(x - 1, hz - 34, 2, 32); c.fillRect(x - sw * 0.6, hz - 22, 1.5, 20);
        c.globalCompositeOperation = 'lighter';
        glowBlob(c, x, hz - 6, 30, '255,120,40', 0.55); glowBlob(c, x, hz - 14, 12, '255,210,120', 0.6);
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = 'rgba(20,18,20,0.5)';
        for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(x - k * 7, hz - 36 - k * 9, 6 + k * 2, 0, TAU); c.fill(); }
      }
    });
    L.farY = 140;
    L.mid = makeLayer(1200, 240, rs, (c, w, h) => {
      c.fillStyle = '#0d1217';
      for (let i = 0; i < 9; i++) {
        const x = r() * w, rw = 30 + r() * 70, rh = 12 + r() * 40;
        wrapX(w, x, rw, xx => { c.beginPath(); c.moveTo(xx - rw, h); c.lineTo(xx - rw * 0.5, h - rh); c.lineTo(xx + rw * 0.3, h - rh * 1.1); c.lineTo(xx + rw, h); c.fill(); });
      }
      // casco de barco naufragado
      const sx = 320;
      c.strokeStyle = '#0b0f13'; c.lineWidth = 5;
      for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(sx + i * 22, h - 8); c.quadraticCurveTo(sx + i * 22 - 30, h - 70, sx + i * 22 + 10, h - 110 + i * 6); c.stroke(); }
      c.fillStyle = '#0b0f13'; c.fillRect(sx - 10, h - 14, 170, 14);
      c.fillRect(sx + 70, h - 200, 5, 190); c.fillRect(sx + 40, h - 170, 70, 3);
      c.strokeStyle = 'rgba(60,70,80,0.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(sx + 72, h - 200); c.lineTo(sx + 160, h - 20); c.stroke();
      // columnas rotas
      for (const cx of [860, 1010]) {
        const ch = 90 + r() * 70;
        c.fillStyle = '#121820'; c.fillRect(cx, h - ch, 24, ch);
        c.fillStyle = '#1c242e'; c.fillRect(cx, h - ch, 4, ch);
        c.fillStyle = '#121820'; c.beginPath(); c.moveTo(cx, h - ch); c.lineTo(cx + 8, h - ch - 12); c.lineTo(cx + 15, h - ch - 4); c.lineTo(cx + 24, h - ch - 14); c.lineTo(cx + 24, h - ch); c.fill();
      }
    });
    L.midY = 60;
    L.ground = makeLayer(512, 66, rs, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#3e362f'); g.addColorStop(0.1, '#29231e'); g.addColorStop(1, '#14100d');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(170,190,200,0.28)';
      for (let x = 0; x < w; x += 4) c.fillRect(x, 1 + Math.sin(x * 0.05) * 1.2, 4, 1);
      for (let i = 0; i < 90; i++) { c.fillStyle = r() < 0.5 ? '#1a1512' : '#4a4038'; c.beginPath(); c.ellipse(r() * w, 6 + r() * (h - 8), 1 + r() * 2.5, 0.6 + r(), 0, 0, TAU); c.fill(); }
      c.strokeStyle = '#1d2a1c'; c.lineWidth = 1.2;
      for (let i = 0; i < 8; i++) { const x = r() * w; c.beginPath(); c.moveTo(x, 4); c.quadraticCurveTo(x + 6, 10, x + 12, 6); c.stroke(); }
    });
  } else if (theme === 'templo') {
    L.far = makeLayer(1000, 180, rs, (c, w, h) => {
      const ridge = (col, base, amp, seed) => {
        c.fillStyle = col; c.beginPath(); c.moveTo(0, h);
        for (let x = 0; x <= w; x += 20) c.lineTo(x, base - Math.abs(Math.sin((x / w) * TAU * 2 + seed)) * amp - Math.sin((x / w) * TAU * 5 + seed) * amp * 0.25);
        c.lineTo(w, h); c.fill();
      };
      ridge('#3a1a12', 120, 50, 1.3);
      ridge('#2a120d', 150, 34, 0.2);
      // templo en la cima
      const tx = 640, ty = 72;
      c.fillStyle = '#240e0a';
      c.beginPath(); c.moveTo(tx - 70, ty + 50); c.lineTo(tx - 20, ty + 10); c.lineTo(tx + 30, ty + 8); c.lineTo(tx + 90, ty + 52); c.fill();
      c.fillStyle = '#1c0b08';
      c.fillRect(tx - 32, ty - 6, 72, 4); c.fillRect(tx - 34, ty + 10, 76, 3);
      for (let i = 0; i < 7; i++) c.fillRect(tx - 28 + i * 11, ty - 2, 3.5, 12);
      c.beginPath(); c.moveTo(tx - 34, ty - 6); c.lineTo(tx + 4, ty - 20); c.lineTo(tx + 42, ty - 6); c.fill();
      c.fillStyle = 'rgba(30,14,10,0.55)';
      for (let k = 0; k < 8; k++) { c.beginPath(); c.arc(tx + 60 + k * 5, ty - 10 - k * 13, 6 + k * 2.4, 0, TAU); c.fill(); }
    });
    L.farY = 120;
    L.mid = makeLayer(1100, 280, rs, (c, w, h) => {
      // estatua colosal con lanza y escudo
      const sx = 640;
      c.fillStyle = '#26130e';
      c.fillRect(sx - 40, h - 26, 80, 26);
      c.beginPath(); c.moveTo(sx - 18, h - 26); c.lineTo(sx - 26, h - 120); c.lineTo(sx - 14, h - 180); c.lineTo(sx + 14, h - 180); c.lineTo(sx + 24, h - 120); c.lineTo(sx + 18, h - 26); c.fill();
      c.beginPath(); c.arc(sx, h - 196, 15, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(sx - 6, h - 214, 20, 8, 0, Math.PI, TAU); c.fill();
      c.beginPath(); c.ellipse(sx + 30, h - 140, 22, 30, 0, 0, TAU); c.fill();
      c.fillRect(sx - 44, h - 260, 5, 240);
      c.beginPath(); c.moveTo(sx - 47, h - 260); c.lineTo(sx - 41.5, h - 284); c.lineTo(sx - 36, h - 260); c.fill();
      // columnas estriadas
      for (const cx of [120, 380, 900]) {
        const broken = r() < 0.5, ch = broken ? 120 + r() * 60 : h - 18;
        c.fillStyle = '#3a1f17'; c.fillRect(cx, h - ch, 40, ch);
        c.fillStyle = '#7a3b22'; c.fillRect(cx, h - ch, 5, ch);
        c.fillStyle = '#26130e'; c.fillRect(cx + 34, h - ch, 6, ch);
        c.strokeStyle = 'rgba(20,8,5,0.5)'; c.lineWidth = 1;
        for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(cx + k * 8, h - ch + 4); c.lineTo(cx + k * 8, h); c.stroke(); }
        c.fillStyle = '#4a271c';
        c.fillRect(cx - 6, h - 12, 52, 12);
        if (!broken) { c.fillRect(cx - 8, h - ch - 2, 56, 10); c.fillRect(cx - 4, h - ch + 8, 48, 5); }
        else { c.fillStyle = '#3a1f17'; c.beginPath(); c.moveTo(cx, h - ch); c.lineTo(cx + 12, h - ch - 16); c.lineTo(cx + 22, h - ch - 6); c.lineTo(cx + 40, h - ch - 18); c.lineTo(cx + 40, h - ch); c.fill(); }
      }
      // estandartes
      for (const bx of [250, 1020]) {
        c.fillStyle = '#5e0f0c'; c.fillRect(bx, 40, 22, 120);
        c.beginPath(); c.moveTo(bx, 160); c.lineTo(bx + 11, 176); c.lineTo(bx + 22, 160); c.fill();
        c.fillStyle = '#b8902e'; c.fillRect(bx - 4, 38, 30, 3);
        c.strokeStyle = '#b8902e'; c.lineWidth = 1.5; c.strokeRect(bx + 5, 70, 12, 12);
      }
    });
    L.midY = 20;
    L.ground = makeLayer(512, 66, rs, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#8b7464'); g.addColorStop(0.07, '#5d4c42'); g.addColorStop(1, '#2a201b');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(30,20,15,0.55)';
      for (let x = 0; x < w; x += 64) c.fillRect(x, 3, 1.5, h);
      c.fillRect(0, 22, w, 1.5); c.fillRect(0, 44, w, 1.5);
      c.strokeStyle = 'rgba(25,15,10,0.6)'; c.lineWidth = 0.8;
      for (let i = 0; i < 10; i++) { let x = r() * w, y = 4 + r() * 50; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += 4 + r() * 8; y += r() * 6 - 3; c.lineTo(x, y); } c.stroke(); }
      for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(70,10,8,0.35)'; c.beginPath(); c.ellipse(r() * w, 6 + r() * 20, 6 + r() * 10, 1.5 + r() * 2, 0, 0, TAU); c.fill(); }
    });
  } else {
    L.far = makeLayer(1000, 210, rs, (c, w, h) => {
      c.fillStyle = '#120605';
      c.beginPath(); c.moveTo(0, h);
      for (let x = 0; x <= w; x += 25) c.lineTo(x, 150 - Math.abs(Math.sin(x * 0.013)) * 50);
      c.lineTo(w, h); c.fill();
      const vx = 500;
      c.fillStyle = '#1a0806';
      c.beginPath(); c.moveTo(vx - 320, h); c.lineTo(vx - 46, 44); c.lineTo(vx + 46, 44); c.lineTo(vx + 320, h); c.fill();
      c.globalCompositeOperation = 'lighter';
      glowBlob(c, vx, 40, 70, '255,90,20', 0.6);
      c.strokeStyle = 'rgba(255,110,30,0.7)'; c.lineWidth = 2;
      for (let i = 0; i < 4; i++) { c.beginPath(); let x = vx - 30 + i * 20, y = 46; c.moveTo(x, y); while (y < h) { x += (r() - 0.5) * 14 + (i - 1.5) * 4; y += 12; c.lineTo(x, y); } c.stroke(); }
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = 'rgba(22,10,8,0.85)';
      for (let k = 0; k < 10; k++) { c.beginPath(); c.arc(vx + Math.sin(k) * 20 + k * 6, 30 - k * 8, 14 + k * 4, 0, TAU); c.fill(); }
    });
    L.farY = 90;
    L.mid = makeLayer(1100, 260, rs, (c, w, h) => {
      const spires = [];
      for (let i = 0; i < 7; i++) {
        const x = 60 + i * 160 + r() * 60, sh = 80 + r() * 150, sw = 20 + r() * 26;
        spires.push([x, sh]);
        wrapX(w, x, sw, xx => {
          c.fillStyle = '#120807';
          c.beginPath(); c.moveTo(xx - sw, h); c.lineTo(xx - sw * 0.3, h - sh); c.lineTo(xx + sw * 0.1, h - sh * 1.08); c.lineTo(xx + sw * 0.4, h - sh * 0.7); c.lineTo(xx + sw, h); c.fill();
          c.strokeStyle = 'rgba(160,40,14,0.6)'; c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(xx - sw, h); c.lineTo(xx - sw * 0.3, h - sh); c.stroke();
        });
      }
      c.strokeStyle = '#231512'; c.lineWidth = 2; c.setLineDash([4, 2]);
      for (let i = 0; i < spires.length - 1; i++) {
        const [x1, h1] = spires[i], [x2, h2] = spires[i + 1];
        c.beginPath(); c.moveTo(x1, h - h1 * 0.6); c.quadraticCurveTo((x1 + x2) / 2, h - Math.min(h1, h2) * 0.3, x2, h - h2 * 0.6); c.stroke();
      }
      c.setLineDash([]);
      for (let i = 0; i < 12; i++) { c.fillStyle = '#3a302a'; const x = r() * w; c.beginPath(); c.arc(x, h - 4, 3.5, 0, TAU); c.fill(); c.fillStyle = '#0a0505'; c.fillRect(x - 2, h - 5, 1.5, 1.5); c.fillRect(x + 0.5, h - 5, 1.5, 1.5); }
    });
    L.midY = 40;
    L.ground = makeLayer(512, 66, rs, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#3d241a'); g.addColorStop(0.08, '#1d1311'); g.addColorStop(1, '#0c0706');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { c.fillStyle = r() < 0.5 ? '#2a1a16' : '#120a08'; c.beginPath(); c.ellipse(r() * w, 5 + r() * (h - 6), 2 + r() * 6, 1 + r() * 2, 0, 0, TAU); c.fill(); }
    });
    L.cracks = makeLayer(512, 66, rs, (c, w, h) => {
      c.strokeStyle = '#ff6a1a'; c.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        let x = r() * w, y = 3 + r() * 30;
        c.lineWidth = 1 + r() * 1.5;
        c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 6; k++) { x += 6 + r() * 12; y += (r() - 0.4) * 8; c.lineTo(x, Math.max(2, y)); }
        c.stroke();
      }
      c.globalCompositeOperation = 'lighter';
      c.filter = 'blur(3px)'; c.globalAlpha = 0.8;
      c.drawImage(c.canvas, 0, 0, c.canvas.width, c.canvas.height, 0, 0, w, h);
      c.filter = 'none'; c.globalAlpha = 1;
    });
  }
  return L;
}

function ensureLayers(theme) {
  const rs = Layout.dpr * Layout.game.s;
  const key = theme + '|' + rs.toFixed(2);
  if (R.key !== key) { R.layers = buildLayers(theme, rs); R.key = key; }
  if (R.wTheme !== theme) initWeather(theme);
}

function drawTiled(c, L, camX, par, y, alpha) {
  if (!L) return;
  const off = -(((camX * par) % L.w) + L.w) % L.w;
  if (alpha != null) c.globalAlpha = alpha;
  for (let x = off; x < Layout.VW + 1; x += L.w) c.drawImage(L.cv, x, y, L.w + 0.5, L.h);
  c.globalAlpha = 1;
}

/* ---------- Clima ---------- */
function initWeather(theme) {
  R.wTheme = theme; R.weather = [];
  const kind = THEMES[theme].weather, n = kind === 'rain' ? 90 : kind === 'ash' ? 70 : 45;
  for (let i = 0; i < n; i++) R.weather.push({ x: rand(0, 820), y: rand(0, 360), s: rand(0.5, 1), p: rand(0, TAU) });
}
function drawWeather(c, theme, dt) {
  const kind = THEMES[theme].weather, VW = Layout.VW;
  if (kind === 'rain') {
    c.strokeStyle = 'rgba(170,190,210,0.28)'; c.lineWidth = 1;
    c.beginPath();
    for (const p of R.weather) {
      p.y += 560 * p.s * dt; p.x -= 150 * p.s * dt;
      if (p.y > 360) { p.y = -10; p.x = rand(0, VW + 100); }
      if (p.x < -20) p.x += VW + 60;
      c.moveTo(p.x, p.y); c.lineTo(p.x + 4 * p.s, p.y - 15 * p.s);
    }
    c.stroke();
  } else if (kind === 'embers') {
    c.globalCompositeOperation = 'lighter';
    for (const p of R.weather) {
      p.y -= 26 * p.s * dt; p.p += dt * 2; p.x += Math.sin(p.p) * 12 * dt;
      if (p.y < -10) { p.y = 370; p.x = rand(0, VW); }
      FX.drawGlow(c, 'orange', p.x, p.y, 4 * p.s, 0.5 + Math.sin(p.p * 3) * 0.3);
    }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  } else {
    for (const p of R.weather) {
      p.y += 22 * p.s * dt; p.p += dt * 1.5; p.x += Math.sin(p.p) * 14 * dt - 6 * dt;
      if (p.y > 365) { p.y = -5; p.x = rand(0, VW); }
      if (p.x < -5) p.x = VW + 5;
      c.fillStyle = p.s > 0.9 ? 'rgba(255,120,40,0.8)' : 'rgba(110,100,95,0.55)';
      c.fillRect(p.x, p.y, 1.6 * p.s + 0.4, 1.6 * p.s + 0.4);
    }
  }
}

/* ---------- Cielo y escenario ---------- */
function drawSky(c, W, dt) {
  const T = THEMES[W.theme], VW = Layout.VW;
  const g = c.createLinearGradient(0, 0, 0, GY);
  g.addColorStop(0, T.sky[0]); g.addColorStop(0.5, T.sky[1]); g.addColorStop(0.76, T.sky[2]); g.addColorStop(0.86, T.sky[3]);
  c.fillStyle = g; c.fillRect(0, 0, VW, 360);
  const sx = VW * T.sun[0] - W.cam.x * 0.02;
  c.globalCompositeOperation = 'lighter';
  glowBlob(c, sx, T.sun[1], 150, T.sun[2], 0.35);
  if (W.theme === 'templo') { c.fillStyle = 'rgba(255,200,140,0.25)'; c.beginPath(); c.arc(sx, T.sun[1], 26, 0, TAU); c.fill(); }
  c.globalCompositeOperation = 'source-over';
  // relámpagos en la costa
  if (W.theme === 'costa') {
    R.nextBolt -= dt;
    if (R.nextBolt <= 0) { R.bolt = 0.22; R.boltX = rand(40, VW - 40); R.nextBolt = rand(5, 11); setTimeout(() => Sfx.play('boom', 0.35), 350); }
    if (R.bolt > 0) {
      R.bolt -= dt;
      c.fillStyle = `rgba(200,215,255,${R.bolt * 1.4})`; c.fillRect(0, 0, VW, 360);
      c.strokeStyle = 'rgba(235,240,255,0.9)'; c.lineWidth = 1.6;
      const r = rng(Math.floor(R.boltX));
      c.beginPath(); let x = R.boltX, y = 0; c.moveTo(x, y);
      while (y < 210) { x += (r() - 0.5) * 30; y += 14 + r() * 14; c.lineTo(x, y); }
      c.stroke();
    }
  }
  const L = R.layers;
  drawTiled(c, L.far, W.cam.x, 0.12, L.farY);
  // brillo del mar
  if (W.theme === 'costa') {
    c.fillStyle = 'rgba(200,120,80,0.18)';
    const t = performance.now() / 1000;
    for (let i = 0; i < 12; i++) { const x = ((i * 97 + t * 8 - W.cam.x * 0.12) % (VW + 40) + VW + 40) % (VW + 40) - 20; c.fillRect(x, 238 + (i % 5) * 9, 14 + (i % 3) * 6, 1); }
  }
  // niebla entre capas
  const fg = c.createLinearGradient(0, 200, 0, GY);
  fg.addColorStop(0, `rgba(${T.fog},0)`); fg.addColorStop(1, `rgba(${T.fog},0.45)`);
  c.fillStyle = fg; c.fillRect(0, 200, VW, GY - 200);
  drawTiled(c, L.mid, W.cam.x, 0.42, L.midY);
  if (W.theme === 'volcan') {
    c.globalCompositeOperation = 'lighter';
    const p = 0.25 + Math.sin(performance.now() / 600) * 0.08;
    const lg = c.createLinearGradient(0, 230, 0, GY);
    lg.addColorStop(0, 'rgba(255,70,10,0)'); lg.addColorStop(1, `rgba(255,70,10,${p})`);
    c.fillStyle = lg; c.fillRect(0, 230, VW, GY - 230);
    c.globalCompositeOperation = 'source-over';
  }
}

function drawGround(c, W) {
  const L = R.layers;
  drawTiled(c, L.ground, W.cam.x, 1, GY - 6);
  if (L.cracks) {
    c.globalCompositeOperation = 'lighter';
    drawTiled(c, L.cracks, W.cam.x, 1, GY - 6, 0.55 + Math.sin(performance.now() / 500) * 0.25);
    c.globalCompositeOperation = 'source-over';
  }
}

function drawProps(c, W) {
  if (W.theme !== 'templo') return;
  const t = performance.now() / 1000;
  const x0 = Math.floor((W.cam.x - 100) / 420) * 420 + 260;
  for (let x = x0; x < W.cam.x + Layout.VW + 100; x += 420) {
    c.strokeStyle = '#3a2614'; c.lineWidth = 2.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - 9, GY - 2); c.lineTo(x, GY - 36); c.lineTo(x + 9, GY - 2); c.moveTo(x, GY - 36); c.lineTo(x, GY - 4); c.stroke();
    c.fillStyle = '#7a5428'; c.beginPath(); c.moveTo(x - 13, GY - 40); c.lineTo(x + 13, GY - 40); c.lineTo(x + 8, GY - 33); c.lineTo(x - 8, GY - 33); c.fill();
    c.globalCompositeOperation = 'lighter';
    FX.drawGlow(c, 'orange', x, GY - 44, 46, 0.45 + Math.sin(t * 9 + x) * 0.08);
    for (let k = 0; k < 4; k++) FX.drawGlow(c, k < 2 ? 'orange' : 'gold', x + Math.sin(t * 7 + k * 2 + x) * 3, GY - 46 - k * 4 - Math.abs(Math.sin(t * 5 + k)) * 4, 9 - k, 0.85);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    if (chance(0.06)) FX.embers(x, GY - 52, 1, 'orange', 4);
  }
}

function drawBarrier(c, W) {
  if (!W.locked) return;
  const t = performance.now() / 1000;
  for (const [x, dir] of [[W.bounds.l, 1], [W.bounds.r, -1]]) {
    c.fillStyle = 'rgba(0,0,0,0.45)';
    if (dir > 0) c.fillRect(x - 900, 0, 900, 360); else c.fillRect(x, 0, 900, 360);
    const g = c.createLinearGradient(x - 10, 0, x + 10, 0);
    const a = 0.45 + Math.sin(t * 6) * 0.15;
    g.addColorStop(0, 'rgba(255,60,20,0)'); g.addColorStop(0.5, `rgba(255,90,30,${a})`); g.addColorStop(1, 'rgba(255,60,20,0)');
    c.fillStyle = g; c.fillRect(x - 10, GY - 190, 20, 190);
    c.fillStyle = `rgba(255,190,120,${a})`;
    for (let i = 0; i < 6; i++) {
      const y = GY - 20 - ((t * 30 + i * 32) % 180);
      c.fillRect(x - 2, y, 4, 7); c.fillRect(x - 4, y + 2, 8, 1.5);
    }
  }
}

function drawOrbs(c, W) {
  c.globalCompositeOperation = 'lighter';
  for (const o of W.orbs) {
    const col = o.k === 'red' ? 'red' : o.k === 'green' ? 'green' : 'gold';
    FX.drawGlow(c, col, o.x, o.y, 9, 0.9);
    FX.drawGlow(c, 'white', o.x, o.y, 3, 0.9);
  }
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
}

function drawProjs(c, W) {
  for (const p of W.projs) {
    if (p.k === 'arrow') {
      const a = Math.atan2(p.vy, p.vx);
      c.save(); c.translate(p.x, p.y); c.rotate(a);
      c.strokeStyle = '#6a4a2a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-12, 0); c.lineTo(4, 0); c.stroke();
      c.fillStyle = '#c8c0b0'; c.beginPath(); c.moveTo(4, -2); c.lineTo(8, 0); c.lineTo(4, 2); c.fill();
      c.fillStyle = '#9c1b17'; c.fillRect(-12, -2, 3, 4);
      c.restore();
    } else if (p.k === 'rock') {
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot || 0);
      c.fillStyle = '#4a3b30'; c.beginPath();
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, rr = 15 + (i % 3) * 3; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.fill(); c.fillStyle = '#5e4c3e'; c.beginPath(); c.arc(-4, -4, 6, 0, TAU); c.fill();
      c.restore();
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(p.x, GY + 1, 14, 3, 0, 0, TAU); c.fill();
    } else if (p.k === 'wave') {
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) FX.drawGlow(c, 'orange', p.x - Math.sign(p.vx) * i * 8, GY - 8 - i * 3, 16 - i * 3, 0.7);
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      c.strokeStyle = 'rgba(255,200,140,0.8)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(p.x - 10, GY); c.quadraticCurveTo(p.x + Math.sign(p.vx) * 4, GY - p.hgt, p.x + Math.sign(p.vx) * 10, GY); c.stroke();
    }
  }
}

function drawWorld(c, W, dt) {
  const VW = Layout.VW;
  drawSky(c, W, dt);
  drawGround(c, W);
  const [sx, sy] = FX.shakeOffset();
  c.save();
  const z = W.zoomCur;
  if (z !== 1) {
    const fx = clamp(W.hero.x - W.cam.x, VW * 0.2, VW * 0.8), fy = W.hero.y - 40;
    c.translate(fx, fy); c.scale(z, z); c.translate(-fx, -fy);
  }
  c.translate(-W.cam.x + sx, sy);
  drawProps(c, W);
  FX.drawDecals(c);
  drawBarrier(c, W);
  // sombras
  c.fillStyle = 'rgba(0,0,0,0.35)';
  const hh = W.hero, hs = Math.max(0.3, 1 - (GY - hh.y) / 200);
  c.beginPath(); c.ellipse(hh.x, GY + 1, 13 * hs, 3 * hs, 0, 0, TAU); c.fill();
  for (const e of W.enemies) if (e.state !== 'spawn') enemyGround(c, e);
  drawOrbs(c, W);
  const list = W.enemies.slice().sort((a, b) => (b.T.boss ? 1 : 0) - (a.T.boss ? 1 : 0) || (a.dead ? 0 : 1) - (b.dead ? 0 : 1));
  for (const e of list) drawEnemy(c, e);
  if (!W.hideHero) drawHero(c, W.hero);
  drawProjs(c, W);
  FX.drawTrails(c);
  FX.draw(c);
  c.restore();
  drawWeather(c, W.theme, dt);
  // viñeta y tintes
  const h = W.hero;
  const vg = c.createRadialGradient(VW / 2, 190, 120, VW / 2, 190, VW * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
  c.fillStyle = vg; c.fillRect(0, 0, VW, 360);
  if (W.mode !== 'menu') {
    if (h.rageT > 0) { c.fillStyle = `rgba(255,70,10,${0.08 + Math.sin(performance.now() / 120) * 0.03})`; c.fillRect(0, 0, VW, 360); }
    if (h.hp > 0 && h.hp < h.hpMax * 0.25) {
      const lg = c.createRadialGradient(VW / 2, 180, 100, VW / 2, 180, VW * 0.65);
      lg.addColorStop(0, 'rgba(120,0,0,0)'); lg.addColorStop(1, `rgba(150,0,0,${0.35 + Math.sin(performance.now() / 180) * 0.15})`);
      c.fillStyle = lg; c.fillRect(0, 0, VW, 360);
    }
  }
  if (FX.flash > 0) { c.fillStyle = `rgba(${FX.flashCol},${FX.flash * 0.6})`; c.fillRect(0, 0, VW, 360); }
}

/* ---------- HUD ---------- */
const FONT = (w, s) => `${w} ${s}px Cinzel, "Trajan Pro", Georgia, serif`;
function txt(c, s, x, y, size, col, align = 'left', w = 700, stroke = true) {
  c.font = FONT(w, size); c.textAlign = align; c.textBaseline = 'middle';
  if (stroke) { c.lineWidth = 3; c.strokeStyle = 'rgba(8,3,2,0.85)'; c.lineJoin = 'round'; c.strokeText(s, x, y); }
  c.fillStyle = col; c.fillText(s, x, y);
}
function frameBar(c, x, y, w, h) {
  c.fillStyle = 'rgba(10,5,4,0.75)'; c.fillRect(x - 2, y - 2, w + 4, h + 4);
  c.strokeStyle = '#9b7a3c'; c.lineWidth = 1; c.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
  c.fillStyle = '#9b7a3c'; c.fillRect(x - 4, y + h / 2 - 1.5, 3, 3); c.fillRect(x + w + 1, y + h / 2 - 1.5, 3, 3);
}

function drawHUD(c, W, dt) {
  const L = Layout, h = W.hero, s = L.game.s, VW = L.VW;
  const sl = (L.portrait ? 0 : L.safe.l / s) + 12, sr = (L.portrait ? 0 : L.safe.r / s) + 12;
  const st = (L.portrait ? 0 : L.safe.t / s) + 10;
  // vida
  const bw = 110 + (h.hpMax - 100) * 0.45, bh = 8;
  frameBar(c, sl, st, bw, bh);
  c.fillStyle = '#e9d48a'; c.fillRect(sl, st, bw * h.hpLag / h.hpMax, bh);
  const hg = c.createLinearGradient(0, st, 0, st + bh);
  hg.addColorStop(0, '#6fd36a'); hg.addColorStop(1, '#22792c');
  c.fillStyle = hg; c.fillRect(sl, st, bw * h.hp / h.hpMax, bh);
  // ira
  const rw = 92 + (h.rageMax - 8) * 2.5, ry = st + 13;
  frameBar(c, sl, ry, rw, 5);
  const full = h.rage >= 100 && h.rageT <= 0;
  const rg = c.createLinearGradient(sl, 0, sl + rw, 0);
  rg.addColorStop(0, '#8e1a0c'); rg.addColorStop(1, h.rageT > 0 ? '#ffe08a' : '#ff7a22');
  c.fillStyle = rg; c.fillRect(sl, ry, rw * h.rage / 100, 5);
  if (full) {
    c.globalCompositeOperation = 'lighter';
    FX.drawGlow(c, 'orange', sl + rw, ry + 2.5, 14 + Math.sin(performance.now() / 120) * 3, 0.8);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    txt(c, 'IRA LISTA', sl + rw + 10, ry + 2.5, 7, '#ffcf6a');
  }
  // orbes rojos
  c.globalCompositeOperation = 'lighter';
  FX.drawGlow(c, 'red', sl + 4, st + 31, 9, 1); FX.drawGlow(c, 'white', sl + 4, st + 31, 3, 0.9);
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  txt(c, String(Math.floor(Game.save.orbs)), sl + 13, st + 31.5, 10, '#f2d9c4');
  // oleadas
  if (W.mode === 'arena') txt(c, `OLEADA ${W.arenaN}`, VW / 2, st + 4, 9, '#e8d3a6', 'center');
  else if (W.locked && W.waves && !W.boss) txt(c, `OLEADA ${Math.min(W.waveIdx + 1, W.waves.length)} / ${W.waves.length}`, VW / 2, st + 4, 9, '#e8d3a6', 'center');
  // combo
  if (h.combo >= 3) {
    const k = clamp(h.comboT / 2.4, 0, 1);
    c.globalAlpha = clamp(k * 3, 0, 1);
    const pop = 1 + Math.max(0, (h.comboT - 2.25)) * 3;
    txt(c, String(h.combo), VW - sr - 8, st + 44, Math.round(22 * pop), h.combo >= 30 ? '#ffcf4a' : '#f2e4c8', 'right');
    txt(c, 'GOLPES', VW - sr - 8, st + 62, 8, '#c9a46a', 'right');
    c.globalAlpha = 1;
  }
  // avanzar
  if (!W.locked && W.mode === 'story' && !W.boss && W.encIdx < W.encounters.length && h.state !== 'dead') {
    const a = 0.5 + Math.sin(performance.now() / 200) * 0.4;
    c.globalAlpha = a;
    txt(c, '›››', VW - sr - 4, 190, 22, '#ffcf8a', 'right');
    c.globalAlpha = 1;
  }
  // barra del jefe
  const b = W.boss;
  if (b && b.alive && b.state !== 'intro') {
    const w = Math.min(380, VW * 0.6), x = VW / 2 - w / 2, y = 340;
    frameBar(c, x, y, w, 7);
    c.fillStyle = '#7a0d0a'; c.fillRect(x, y, w * Math.max(0, b.hp) / b.hpMax, 7);
    c.fillStyle = '#d43a22'; c.fillRect(x, y, w * Math.max(0, b.hp) / b.hpMax, 3);
    txt(c, 'POLIFEMO', VW / 2, y - 9, 9, '#f0d9b0', 'center');
  }
  if (b && b.state === 'intro' && b.onGround && b.t > 0.6) {
    const a = clamp((b.t - 0.6) * 3, 0, 1) * clamp((2.3 - b.t) * 3, 0, 1);
    c.globalAlpha = a;
    txt(c, 'POLIFEMO', VW / 2, 120, 34, '#f4e2bf', 'center', 900);
    txt(c, 'EL CÍCLOPE TITÁN', VW / 2, 148, 11, '#d49a5a', 'center');
    c.globalAlpha = 1;
  }
  // aviso
  if (W.toast) {
    const tt = W.toast;
    tt.t += dt;
    const a = clamp(tt.t * 4, 0, 1) * clamp((tt.dur - tt.t) * 3, 0, 1);
    if (a > 0) {
      c.globalAlpha = a;
      c.font = FONT(700, 9);
      const lines = tt.text.split('\n');
      const tw = Math.max(...lines.map(l => c.measureText(l).width)) + 24, th = lines.length * 13 + 10;
      const x = VW / 2 - tw / 2, y = st + 16;
      c.fillStyle = 'rgba(14,7,5,0.82)'; c.fillRect(x, y, tw, th);
      c.strokeStyle = 'rgba(200,160,90,0.6)'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, tw - 1, th - 1);
      lines.forEach((l, i) => txt(c, l, VW / 2, y + 11 + i * 13, 9, '#f2e4c8', 'center', 700, false));
      c.globalAlpha = 1;
    }
    if (tt.t > tt.dur) W.toast = null;
  }
  // rótulo de capítulo
  if (W.title && W.title.t < W.title.dur) {
    const T = W.title; T.t += dt;
    const a = clamp(T.t * 2, 0, 1) * clamp((T.dur - T.t) * 1.5, 0, 1);
    c.globalAlpha = a;
    const g = c.createLinearGradient(0, 120, 0, 230);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.3, 'rgba(0,0,0,0.65)'); g.addColorStop(0.7, 'rgba(0,0,0,0.65)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 120, VW, 110);
    txt(c, T.small, VW / 2, 146, 10, '#c9a46a', 'center');
    txt(c, T.big, VW / 2, 172, 24, '#f4e6c8', 'center', 900);
    if (T.sub) txt(c, T.sub, VW / 2, 198, 9, '#bfae95', 'center', 400);
    c.globalAlpha = 1;
  }
  // QTE contra Polifemo
  if (W.qte) {
    const q = W.qte, pulse = 1 + Math.sin(performance.now() / 70) * 0.08;
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, 0, VW, 360);
    const cx = VW / 2, cy = 150;
    c.globalCompositeOperation = 'lighter';
    FX.drawGlow(c, 'red', cx, cy, 50 * pulse, 0.8);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.strokeStyle = 'rgba(60,10,8,0.9)'; c.lineWidth = 7; c.beginPath(); c.arc(cx, cy, 30, 0, TAU); c.stroke();
    c.strokeStyle = '#ffcf6a'; c.lineWidth = 7; c.beginPath(); c.arc(cx, cy, 30, -Math.PI / 2, -Math.PI / 2 + TAU * q.prog); c.stroke();
    c.strokeStyle = '#ff5544'; c.lineWidth = 4; c.beginPath(); c.arc(cx, cy, 15 * pulse, 0, TAU); c.stroke();
    txt(c, Input.touchMode ? '¡PULSA ○ SIN PARAR!' : '¡PULSA L / ○ SIN PARAR!', cx, cy + 50, 13, '#fff0d0', 'center', 900);
    c.fillStyle = 'rgba(255,220,160,0.8)'; c.fillRect(cx - 60, cy + 64, 120 * clamp(1 - q.t / q.dur, 0, 1), 2);
  }
}

/* ---------- Controles táctiles ---------- */
const BTN_COL = { light: '#f08fb0', heavy: '#6fd6b0', dodge: '#f0644e', jump: '#78aef0', rage: '#ff8a2a', pause: '#e8d3a6' };

function drawSymbol(c, id, x, y, r, col) {
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = Math.max(2, r * 0.13); c.lineJoin = 'round'; c.lineCap = 'round';
  const k = r * 0.42;
  c.beginPath();
  if (id === 'light') c.rect(x - k * 0.8, y - k * 0.8, k * 1.6, k * 1.6);
  else if (id === 'heavy') { c.moveTo(x, y - k); c.lineTo(x + k * 0.95, y + k * 0.7); c.lineTo(x - k * 0.95, y + k * 0.7); c.closePath(); }
  else if (id === 'dodge') c.arc(x, y, k * 0.9, 0, TAU);
  else if (id === 'jump') { c.moveTo(x - k * 0.8, y - k * 0.8); c.lineTo(x + k * 0.8, y + k * 0.8); c.moveTo(x + k * 0.8, y - k * 0.8); c.lineTo(x - k * 0.8, y + k * 0.8); }
  else if (id === 'pause') { c.fillRect(x - k * 0.55, y - k * 0.7, k * 0.38, k * 1.4); c.fillRect(x + k * 0.17, y - k * 0.7, k * 0.38, k * 1.4); return; }
  else if (id === 'rage') {
    c.moveTo(x, y - k * 1.1);
    c.quadraticCurveTo(x + k * 1.1, y - k * 0.1, x + k * 0.5, y + k * 0.9);
    c.quadraticCurveTo(x, y + k * 1.1, x - k * 0.5, y + k * 0.9);
    c.quadraticCurveTo(x - k * 1.1, y - k * 0.1, x, y - k * 1.1);
    c.fill(); return;
  }
  c.stroke();
}

function drawControls(c, W) {
  const L = Layout, u = L.ui;
  const h = W.hero;
  if (L.portrait && Input.touchMode) {
    const top = L.game.y + L.game.h;
    const g = c.createLinearGradient(0, top, 0, L.H);
    g.addColorStop(0, '#1a0d09'); g.addColorStop(1, '#0b0605');
    c.fillStyle = g; c.fillRect(0, top, L.W, L.H - top);
    // greca (meandro griego)
    c.strokeStyle = 'rgba(176,132,60,0.55)'; c.lineWidth = 1.5;
    c.beginPath();
    for (let x = 0; x < L.W; x += 16) { const y = top + 6; c.moveTo(x, y + 6); c.lineTo(x, y); c.lineTo(x + 12, y); c.lineTo(x + 12, y + 6); c.lineTo(x + 5, y + 6); c.lineTo(x + 5, y + 3); }
    c.stroke();
  }
  const finishReady = W.qte || (h && h.state !== 'dead' && findFinishTarget(h, W));
  for (const b of Input.buttons) {
    if (!Input.visibleButton(b)) continue;
    const down = Input.isDown(b.id);
    const col = BTN_COL[b.id];
    let r = b.r * (down ? 0.92 : 1);
    if (b.id === 'rage') {
      const ready = h.rage >= 100 && h.rageT <= 0;
      c.fillStyle = 'rgba(16,8,6,0.5)'; c.beginPath(); c.arc(b.x, b.y, r, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,140,60,0.25)'; c.lineWidth = 3; c.beginPath(); c.arc(b.x, b.y, r - 2, 0, TAU); c.stroke();
      c.strokeStyle = h.rageT > 0 ? '#ffe08a' : '#ff7a22'; c.lineWidth = 3;
      c.beginPath(); c.arc(b.x, b.y, r - 2, -Math.PI / 2, -Math.PI / 2 + TAU * h.rage / 100); c.stroke();
      if (ready) { c.globalCompositeOperation = 'lighter'; FX.drawGlow(c, 'orange', b.x, b.y, r * 1.8 + Math.sin(performance.now() / 110) * 4, 0.7); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
      drawSymbol(c, 'rage', b.x, b.y, r, ready || h.rageT > 0 ? '#ffb347' : 'rgba(255,160,90,0.35)');
      continue;
    }
    if (b.id === 'dodge' && finishReady) {
      c.globalCompositeOperation = 'lighter';
      FX.drawGlow(c, 'red', b.x, b.y, r * 1.9 + Math.sin(performance.now() / 80) * 5, 0.8);
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    }
    c.fillStyle = down ? 'rgba(60,30,20,0.55)' : 'rgba(16,8,6,0.3)';
    c.beginPath(); c.arc(b.x, b.y, r, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(232,211,166,0.25)'; c.lineWidth = 1.5; c.stroke();
    c.globalAlpha = down ? 1 : 0.85;
    drawSymbol(c, b.id, b.x, b.y, r, down ? '#fff' : col);
    c.globalAlpha = 1;
    if (b.label && L.ui > 0.85) {
      c.font = `600 ${Math.round(9 * u)}px Cinzel, Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'top';
      c.fillStyle = 'rgba(232,211,166,0.45)';
      c.fillText(b.id === 'dodge' && finishReady ? 'Rematar' : b.label, b.x, b.y + r + 2);
    }
  }
  if (Input.touchMode) {
    const s = Input.stick, home = L.stickHome, R0 = L.stickR;
    const ox = s ? s.ox : home.x, oy = s ? s.oy : home.y;
    c.fillStyle = 'rgba(16,8,6,0.35)'; c.beginPath(); c.arc(ox, oy, R0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(232,211,166,0.25)'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = 'rgba(232,211,166,0.3)';
    c.beginPath(); c.moveTo(ox - R0 + 8, oy); c.lineTo(ox - R0 + 16, oy - 6); c.lineTo(ox - R0 + 16, oy + 6); c.fill();
    c.beginPath(); c.moveTo(ox + R0 - 8, oy); c.lineTo(ox + R0 - 16, oy - 6); c.lineTo(ox + R0 - 16, oy + 6); c.fill();
    let kx = ox, ky = oy;
    if (s) { const dx = s.x - s.ox, dy = s.y - s.oy, d = Math.hypot(dx, dy), m = Math.min(d, R0); if (d > 0) { kx = ox + dx / d * m; ky = oy + dy / d * m; } }
    c.fillStyle = s ? 'rgba(232,211,166,0.45)' : 'rgba(232,211,166,0.22)';
    c.beginPath(); c.arc(kx, ky, R0 * 0.42, 0, TAU); c.fill();
  }
}

/* ---------- Fotograma ---------- */
function render(dt) {
  const L = Layout, c = R.c, W = Game.world;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#0b0605'; c.fillRect(0, 0, R.cv.width, R.cv.height);
  if (!W) return;
  ensureLayers(W.theme);
  const s = L.game.s * L.dpr;
  c.setTransform(s, 0, 0, s, L.game.x * L.dpr, L.game.y * L.dpr);
  c.save();
  c.beginPath(); c.rect(0, 0, L.VW, 360); c.clip();
  drawWorld(c, W, dt);
  if (W.mode !== 'menu') drawHUD(c, W, dt);
  c.restore();
  if (W.mode !== 'menu' && Game.state === 'playing') {
    c.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    drawControls(c, W);
  }
}
