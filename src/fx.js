'use strict';
/* =========================================================
   Efectos: partículas, estelas de las cadenas, ondas, textos,
   temblor de cámara, congelado de impacto y cámara lenta
   ========================================================= */
const GLOW_COLORS = {
  orange: '255,130,30', red: '255,40,30', green: '90,255,120', white: '255,250,235',
  gold: '255,205,90', blue: '120,190,255', purple: '200,110,255',
};

const FX = {
  parts: [], decals: [], rings: [], texts: [], trails: {},
  shakeT: 0, shakeMag: 0, flash: 0, flashCol: '255,255,255',
  hitstop: 0, slowT: 0, slowScale: 1, glow: {},

  initGlow() {
    for (const k in GLOW_COLORS) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      const c = cv.getContext('2d');
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, `rgba(${GLOW_COLORS[k]},1)`);
      g.addColorStop(0.25, `rgba(${GLOW_COLORS[k]},0.55)`);
      g.addColorStop(1, `rgba(${GLOW_COLORS[k]},0)`);
      c.fillStyle = g; c.fillRect(0, 0, 64, 64);
      this.glow[k] = cv;
    }
  },
  clear() { this.parts.length = 0; this.decals.length = 0; this.rings.length = 0; this.texts.length = 0; this.trails = {}; this.slowT = 0; this.hitstop = 0; this.flash = 0; },

  add(p) { if (this.parts.length < 520) this.parts.push(p); },
  spark(x, y, n, dir = 0, col = 'orange') {
    for (let i = 0; i < n; i++) {
      const a = dir ? (dir > 0 ? 0 : Math.PI) + rand(-1, 1) : rand(0, TAU), sp = rand(120, 420);
      this.add({ k: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: rand(0.18, 0.42), max: 0.42, g: 500, col, size: rand(1, 2.2) });
    }
  },
  blood(x, y, n, dir = 0) {
    for (let i = 0; i < n; i++) {
      const sp = rand(60, 300);
      const a = dir ? (dir > 0 ? rand(-1.2, 0.3) : Math.PI + rand(-0.3, 1.2)) : rand(-Math.PI, 0);
      this.add({ k: 'blood', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, life: rand(0.5, 1), max: 1, g: 900, size: rand(1.2, 3), col: pick(['#7a0a0a', '#9c1010', '#5c0606']) });
    }
  },
  dust(x, y, n, spread = 20, col = '120,105,90') {
    for (let i = 0; i < n; i++) {
      this.add({ k: 'dust', x: x + rand(-spread, spread), y: y - rand(0, 6), vx: rand(-60, 60), vy: rand(-40, -5), life: rand(0.4, 0.9), max: 0.9, size: rand(4, 9), grow: 14, col });
    }
  },
  ash(x, y, w, h, n) {
    for (let i = 0; i < n; i++) {
      this.add({ k: 'ash', x: x + rand(-w / 2, w / 2), y: y - rand(0, h), vx: rand(-20, 20), vy: rand(-70, -20), life: rand(0.6, 1.4), max: 1.4, size: rand(1.5, 3.5), col: pick(['#2b2420', '#3d332c', '#14100e']) });
    }
  },
  embers(x, y, n, col = 'orange', spread = 10) {
    for (let i = 0; i < n; i++) {
      this.add({ k: 'ember', x: x + rand(-spread, spread), y: y + rand(-spread, spread), vx: rand(-40, 40), vy: rand(-120, -30), life: rand(0.3, 0.8), max: 0.8, size: rand(1, 2.4), col });
    }
  },
  fire(x, y, n, col = 'orange') {
    for (let i = 0; i < n; i++) {
      this.add({ k: 'fire', x: x + rand(-3, 3), y: y + rand(-3, 3), vx: rand(-25, 25), vy: rand(-90, -30), life: rand(0.2, 0.45), max: 0.45, size: rand(4, 8), col });
    }
  },
  debris(x, y, n, col = '#3a302a') {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI * 0.95, -Math.PI * 0.05), sp = rand(100, 380);
      this.add({ k: 'debris', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.7, 1.3), max: 1.3, g: 1000, size: rand(2, 4.5), col, rot: rand(0, TAU), vr: rand(-12, 12) });
    }
  },
  ring(x, y, r0, r1, dur, col = '255,170,80', w = 4) { this.rings.push({ x, y, r0, r1, t: 0, dur, col, w }); },
  text(x, y, str, col = '#ffd27a', size = 16, dur = 1) { this.texts.push({ x, y, str, col, size, t: 0, dur }); },
  shake(mag, t = 0.25) { if (mag >= this.shakeMag * (this.shakeT > 0 ? 1 : 0)) { this.shakeMag = mag; this.shakeT = t; } },
  stop(t) { this.hitstop = Math.max(this.hitstop, t); },
  slow(scale, t) { this.slowScale = scale; this.slowT = t; },
  flashScreen(col, a) { this.flashCol = col; this.flash = Math.max(this.flash, a); },
  trail(key, ix, iy, tx, ty, fire) {
    const arr = this.trails[key] || (this.trails[key] = []);
    arr.push({ ix, iy, tx, ty, life: 0.14, fire });
    if (arr.length > 14) arr.shift();
  },

  update(dt) {
    const ps = this.parts;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) { ps.splice(i, 1); continue; }
      if (p.g) p.vy += p.g * dt;
      if (p.k === 'dust' || p.k === 'smoke') { p.vx *= 0.92; p.vy *= 0.94; p.size += p.grow * dt; }
      if (p.k === 'spark') { p.vx *= 0.9; p.vy *= 0.9; }
      if (p.vr) p.rot += p.vr * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if ((p.k === 'blood' || p.k === 'debris') && p.y > GY) {
        if (p.k === 'blood') {
          if (this.decals.length > 70) this.decals.shift();
          this.decals.push({ x: p.x, y: GY + rand(0, 4), w: rand(3, 8), life: 7 });
          ps.splice(i, 1); continue;
        }
        p.y = GY; p.vy *= -0.35; p.vx *= 0.6; p.vr *= 0.5;
      }
    }
    for (let i = this.decals.length - 1; i >= 0; i--) { const d = this.decals[i]; d.life -= dt; if (d.life <= 0) this.decals.splice(i, 1); }
    for (let i = this.rings.length - 1; i >= 0; i--) { const r = this.rings[i]; r.t += dt; if (r.t >= r.dur) this.rings.splice(i, 1); }
    for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.t += dt; if (t.t >= t.dur) this.texts.splice(i, 1); }
    for (const k in this.trails) {
      const arr = this.trails[k];
      for (let i = arr.length - 1; i >= 0; i--) { arr[i].life -= dt; if (arr[i].life <= 0) arr.splice(i, 1); }
    }
  },
  // Tiempo real (no se congela con el hitstop)
  updateReal(dt) {
    if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) this.shakeMag = 0; }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.2);
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slowScale = 1; }
  },
  shakeOffset() {
    if (this.shakeT <= 0) return [0, 0];
    const m = this.shakeMag * Math.min(1, this.shakeT * 5);
    return [rand(-m, m), rand(-m, m)];
  },

  drawGlow(c, col, x, y, r, a = 1) {
    const g = this.glow[col]; if (!g) return;
    c.globalAlpha = a;
    c.drawImage(g, x - r, y - r, r * 2, r * 2);
  },
  drawDecals(c) {
    for (const d of this.decals) {
      c.globalAlpha = Math.min(1, d.life / 2) * 0.7;
      c.fillStyle = '#4a0606';
      c.beginPath(); c.ellipse(d.x, d.y, d.w, 1.6, 0, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  },
  drawTrails(c) {
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';
    for (const k in this.trails) {
      const arr = this.trails[k];
      for (let i = 1; i < arr.length; i++) {
        const a = arr[i - 1], b = arr[i];
        const al = Math.min(a.life, b.life) / 0.14;
        // cinta suave entre la mitad exterior de la cadena y la punta
        c.globalAlpha = al * 0.4;
        c.fillStyle = b.fire ? '#ffb83a' : '#e0480f';
        c.beginPath();
        c.moveTo(a.ix, a.iy); c.lineTo(a.tx, a.ty); c.lineTo(b.tx, b.ty); c.lineTo(b.ix, b.iy);
        c.closePath(); c.fill();
        // filo brillante por donde pasa la hoja
        c.globalAlpha = al * 0.9;
        c.strokeStyle = b.fire ? '#fff0b8' : '#ffc27a';
        c.lineWidth = 1 + al * 2;
        c.beginPath(); c.moveTo(a.tx, a.ty); c.lineTo(b.tx, b.ty); c.stroke();
      }
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  },
  draw(c) {
    // partículas normales
    for (const p of this.parts) {
      const a = clamp(p.life / p.max, 0, 1);
      if (p.k === 'blood' || p.k === 'ash' || p.k === 'debris') {
        c.globalAlpha = p.k === 'ash' ? a : 1;
        c.fillStyle = p.col;
        if (p.k === 'debris') {
          c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.8); c.restore();
        } else c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else if (p.k === 'dust') {
        c.globalAlpha = a * 0.35;
        c.fillStyle = `rgb(${p.col})`;
        c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.fill();
      }
    }
    for (const r of this.rings) {
      const p = r.t / r.dur;
      c.globalAlpha = (1 - p) * 0.9;
      c.strokeStyle = `rgb(${r.col})`;
      c.lineWidth = r.w * (1 - p) + 0.5;
      c.beginPath(); c.ellipse(r.x, r.y, lerp(r.r0, r.r1, easeOut(p)), lerp(r.r0, r.r1, easeOut(p)) * 0.35, 0, 0, TAU); c.stroke();
    }
    // partículas luminosas
    c.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      const a = clamp(p.life / p.max, 0, 1);
      if (p.k === 'spark') {
        c.globalAlpha = a;
        c.strokeStyle = p.col === 'orange' ? '#ffb347' : p.col === 'white' ? '#fff6dd' : p.col === 'blue' ? '#a8d8ff' : '#ff6b4a';
        c.lineWidth = p.size;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); c.stroke();
      } else if (p.k === 'ember') {
        this.drawGlow(c, p.col, p.x, p.y, p.size * 3, a);
      } else if (p.k === 'fire') {
        this.drawGlow(c, p.col, p.x, p.y, p.size * (0.5 + a), a * 0.9);
      }
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    // textos flotantes
    for (const t of this.texts) {
      const p = t.t / t.dur;
      const s = p < 0.15 ? lerp(1.6, 1, p / 0.15) : 1;
      c.globalAlpha = p > 0.7 ? (1 - p) / 0.3 : 1;
      c.font = `700 ${Math.round(t.size * s)}px Cinzel, Georgia, serif`;
      c.textAlign = 'center';
      c.lineWidth = 3; c.strokeStyle = 'rgba(10,4,2,0.85)';
      const y = t.y - p * 18;
      c.strokeText(t.str, t.x, y);
      c.fillStyle = t.col; c.fillText(t.str, t.x, y);
    }
    c.globalAlpha = 1;
  },
};
