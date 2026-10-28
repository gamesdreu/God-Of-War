'use strict';
/* =========================================================
   Pantallas en HTML: menú, pausa, Altar de mejoras, derrota,
   victoria y ayuda. Navegables con táctil, teclado y mando.
   ========================================================= */
const ICONS = {
  blade: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 26 L9 23 M9 23 C14 12 20 7 28 4 C24 11 18 18 11 25 Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M4 28 L8 24" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  eye: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 16 C9 7 23 7 29 16 C23 25 9 25 3 16 Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="5" fill="currentColor"/><path d="M16 11 V21" stroke="#120806" stroke-width="2"/></svg>',
  horn: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 28 C6 18 10 8 24 3 C18 9 15 16 16 28 Z" fill="currentColor"/><path d="M9 22 H15 M8 17 H15" stroke="#120806" stroke-width="1.5"/></svg>',
};

const UI = {
  root: null, cur: null, data: null,

  build() {
    const r = this.root = document.getElementById('ui');
    r.innerHTML = `
<section class="scr" id="s-menu" aria-label="Menú principal">
  <div class="panel">
    <h1 class="logo"><span class="l1">Furia</span><span class="l2">de Esparta</span></h1>
    <p class="tag">Cadenas, dioses y venganza. Un fan-game de hack and slash.</p>
    <nav class="stack">
      <button class="btn primary" data-act="continue" id="b-continue">Continuar <small id="b-continue-sub"></small></button>
      <button class="btn" data-act="new" id="b-new">Nueva partida <small>Capítulo I</small></button>
      <button class="btn" data-act="arena">Arena de los Dioses <small id="b-arena-sub">Supervivencia</small></button>
      <button class="btn" data-act="altar">Altar de mejoras <small id="b-altar-sub"></small></button>
      <button class="btn ghost" data-act="help">Cómo se juega</button>
    </nav>
    <div class="field">
      <span class="label">Dificultad</span>
      <div class="seg" role="radiogroup" aria-label="Dificultad">
        ${DIFFS.map((d, i) => `<button class="chip" role="radio" data-diff="${i}" title="${d.desc}">${d.name}</button>`).join('')}
      </div>
    </div>
    <div class="toggles">${this.toggles()}<button class="tog" data-act="fullscreen" id="b-fs" hidden>Pantalla completa</button></div>
  </div>
</section>

<section class="scr center" id="s-pause" aria-label="Pausa">
  <div class="card">
    <h2>Pausa</h2>
    <nav class="stack">
      <button class="btn primary" data-act="resume">Continuar</button>
      <button class="btn" data-act="restart" id="b-restart">Reiniciar la arena</button>
      <button class="btn" data-act="menu">Salir al menú</button>
    </nav>
    <div class="toggles">${this.toggles()}</div>
  </div>
</section>

<section class="scr center" id="s-over" aria-label="Derrota">
  <div class="card">
    <p class="eyebrow" id="over-eyebrow">El Hades te reclama</p>
    <h2 class="blood">Has caído</h2>
    <p class="sub" id="over-sub"></p>
    <nav class="stack">
      <button class="btn primary" data-act="retry" id="b-retry">Reintentar</button>
      <button class="btn" data-act="altar-over">Altar de mejoras <small id="b-altar-over-sub"></small></button>
      <button class="btn" data-act="menu">Menú</button>
    </nav>
  </div>
</section>

<section class="scr center" id="s-upgrade" aria-label="Altar de los Dioses">
  <div class="card wide">
    <header class="altar-head">
      <div><p class="eyebrow">Ofrenda de orbes rojos</p><h2>Altar de los Dioses</h2></div>
      <div class="orbs" aria-label="Orbes rojos"><i class="orb"></i><span id="up-orbs">0</span></div>
    </header>
    <div class="ups" id="ups"></div>
    <nav class="stack"><button class="btn primary" data-act="up-continue" id="up-continue">Continuar</button></nav>
  </div>
</section>

<section class="scr center" id="s-win" aria-label="Victoria">
  <div class="card mid">
    <p class="eyebrow">Polifemo ha caído</p>
    <h2 class="gold">Los dioses tiemblan</h2>
    <p class="sub">El Fantasma de Esparta ha cruzado la costa, el templo y el volcán. Ninguna bestia del Olimpo está a salvo.</p>
    <dl class="stats" id="win-stats"></dl>
    <nav class="stack">
      <button class="btn primary" data-act="arena">Arena de los Dioses</button>
      <button class="btn" data-act="menu">Menú</button>
    </nav>
  </div>
</section>

<section class="scr center" id="s-help" aria-label="Cómo se juega">
  <div class="card wide help">
    <h2>Cómo se juega</h2>
    <div class="cols">
      <div>
        <h3>Controles</h3>
        <table>
          <thead><tr><th>Acción</th><th>Móvil</th><th>Teclado</th><th>Mando</th></tr></thead>
          <tbody>
            <tr><td>Moverse</td><td>Joystick izquierdo</td><td>A D / ← →</td><td>Stick izq.</td></tr>
            <tr><td>Ataque rápido</td><td><b class="k sq">□</b></td><td>J / Z</td><td>X / □</td></tr>
            <tr><td>Ataque fuerte</td><td><b class="k tr">△</b></td><td>K / X</td><td>Y / △</td></tr>
            <tr><td>Saltar (doble)</td><td><b class="k cr">✕</b></td><td>Espacio / W</td><td>A / ✕</td></tr>
            <tr><td>Esquivar · Rematar</td><td><b class="k ci">○</b></td><td>L / Shift</td><td>B / ○</td></tr>
            <tr><td>Ira de Esparta</td><td>Botón de fuego</td><td>E</td><td>RB / R3</td></tr>
            <tr><td>Pausa</td><td>Botón II</td><td>P / Esc</td><td>Start</td></tr>
          </tbody>
        </table>
      </div>
      <div>
        <h3>Consejos</h3>
        <ul>
          <li>Mantén <b class="k sq">□</b> para encadenar el combo completo, que termina en un torbellino de cadenas.</li>
          <li><b class="k tr">△</b> en el suelo lanza a los enemigos al aire; salta y sigue el combo arriba. En el aire, <b class="k tr">△</b> golpea el suelo con una onda.</li>
          <li>Esquivar justo antes de un golpe activa la <em>esquiva perfecta</em> y el tiempo se ralentiza.</li>
          <li>Cuando aparece un <b class="k ci">○</b> sobre un enemigo, pulsa <b class="k ci">○</b> a su lado para rematarlo: suelta orbes de vida y de ira.</li>
          <li>Los destellos dorados avisan de un ataque; los rojos, de uno muy fuerte. Las flechas se pueden desviar golpeándolas.</li>
          <li>Gasta los orbes rojos en el Altar entre capítulos o desde el menú.</li>
        </ul>
      </div>
    </div>
    <nav class="stack"><button class="btn primary" data-act="back">Volver</button></nav>
  </div>
</section>`;
    r.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      Sfx.init();
      this.onButton(b);
    });
    const fs = document.getElementById('b-fs');
    if (fs && (document.fullscreenEnabled || document.webkitFullscreenEnabled)) fs.hidden = false;
  },
  toggles() {
    return ['music:Música', 'sfx:Efectos', 'vib:Vibración'].map(s => { const [k, l] = s.split(':'); return `<button class="tog" data-tog="${k}" aria-pressed="true">${l}</button>`; }).join('');
  },

  show(id, data) {
    this.cur = id; this.data = data || null;
    for (const s of this.root.querySelectorAll('.scr')) s.classList.toggle('on', s.id === 's-' + id);
    this.refresh();
    const el = document.getElementById('s-' + id);
    if (el) el.scrollTop = 0;
    if (!Input.touchMode) {
      const first = el && el.querySelector('button.primary:not([hidden]):not([disabled]), button:not([hidden]):not([disabled])');
      if (first) try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); }
    }
  },
  hide() {
    this.cur = null;
    for (const s of this.root.querySelectorAll('.scr')) s.classList.remove('on');
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) { /* nada */ }
  },

  refresh() {
    const S = Game.save;
    for (const b of this.root.querySelectorAll('[data-tog]')) {
      const on = !!Game.settings[b.dataset.tog];
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    for (const b of this.root.querySelectorAll('[data-diff]')) {
      const on = +b.dataset.diff === Game.diffIdx;
      b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false');
    }
    if (this.cur === 'menu') {
      const cont = document.getElementById('b-continue');
      const can = S.chapter > 0 && S.chapter < CHAPTERS.length;
      cont.hidden = !can;
      document.getElementById('b-new').classList.toggle('primary', !can);
      if (can) document.getElementById('b-continue-sub').textContent = 'Capítulo ' + ROMAN[S.chapter + 1];
      document.getElementById('b-arena-sub').textContent = S.best > 0 ? 'Récord: oleada ' + S.best : 'Supervivencia';
      document.getElementById('b-altar-sub').textContent = Math.floor(S.orbs) + ' orbes';
    }
    if (this.cur === 'pause') {
      document.getElementById('b-restart').textContent = Game.world && Game.world.mode === 'arena' ? 'Reiniciar desde la oleada 1' : 'Reiniciar desde el último punto';
    }
    if (this.cur === 'over') {
      const W = Game.world, arena = W && W.mode === 'arena';
      document.getElementById('over-sub').textContent = arena
        ? `Has resistido ${Math.max(0, W.arenaN - 1)} oleadas. Récord: ${S.best}.`
        : pick(['Esparta no perdona la derrota. Levántate.', 'Las Moiras aún no han cortado tu hilo.', 'Caronte tendrá que esperar.']);
      document.getElementById('b-retry').textContent = arena ? 'Otra vez' : 'Reintentar';
      document.getElementById('b-altar-over-sub').textContent = Math.floor(S.orbs) + ' orbes';
    }
    if (this.cur === 'upgrade') this.renderUpgrades();
    if (this.cur === 'win') {
      const st = Game.stats, m = Math.floor(st.time / 60), s = Math.floor(st.time % 60);
      document.getElementById('win-stats').innerHTML =
        `<div><dt>Tiempo</dt><dd>${m}:${String(s).padStart(2, '0')}</dd></div>` +
        `<div><dt>Enemigos abatidos</dt><dd>${st.kills}</dd></div>` +
        `<div><dt>Combo máximo</dt><dd>${st.maxCombo}</dd></div>` +
        `<div><dt>Orbes reunidos</dt><dd>${Math.floor(st.orbs)}</dd></div>` +
        `<div><dt>Dificultad</dt><dd>${Game.diff.name}</dd></div>`;
    }
  },

  renderUpgrades() {
    const S = Game.save;
    document.getElementById('up-orbs').textContent = Math.floor(S.orbs);
    document.getElementById('ups').innerHTML = UPGRADES.map(u => {
      const lvl = S.up[u.id], max = lvl >= u.max, cost = max ? 0 : u.cost[lvl];
      const pips = Array.from({ length: u.max }, (_, i) => `<i class="${i < lvl ? 'full' : ''}"></i>`).join('');
      return `<article class="up">
        <div class="up-top"><span class="ico">${ICONS[u.icon]}</span><div><h3>${u.name}</h3><p>${u.desc}</p></div></div>
        <div class="pips" aria-label="Nivel ${lvl} de ${u.max}">${pips}</div>
        <p class="stat">${u.stat(lvl)}${max ? '' : ' <span>→ ' + u.stat(lvl + 1) + '</span>'}</p>
        <button class="btn small${!max && S.orbs >= cost ? ' primary' : ''}" data-up="${u.id}" ${max || S.orbs < cost ? 'disabled' : ''}>${max ? 'Nivel máximo' : `Mejorar <small>${cost} orbes</small>`}</button>
      </article>`;
    }).join('');
    const btn = document.getElementById('up-continue');
    const d = this.data || {};
    btn.textContent = d.next != null ? (d.next < CHAPTERS.length ? 'Continuar al Capítulo ' + ROMAN[d.next + 1] : 'Continuar') : 'Volver';
  },

  onButton(b) {
    if (b.dataset.tog) {
      const k = b.dataset.tog;
      Game.settings[k] = !Game.settings[k];
      if (k === 'music') Sfx.setMusic(Game.settings.music);
      if (k === 'sfx') Sfx.setSfx(Game.settings.sfx);
      if (k === 'vib' && Game.settings.vib) vibrate(40);
      Game.saveSettings(); Sfx.play('ui'); this.refresh();
      return;
    }
    if (b.dataset.diff) { Game.setDiff(+b.dataset.diff); Sfx.play('ui'); this.refresh(); return; }
    if (b.dataset.up) {
      const u = UPGRADES.find(x => x.id === b.dataset.up), S = Game.save, lvl = S.up[u.id];
      if (lvl >= u.max || S.orbs < u.cost[lvl]) return;
      S.orbs -= u.cost[lvl]; S.up[u.id] = lvl + 1; Game.persist();
      Sfx.play('upgrade'); vibrate(30);
      this.renderUpgrades();
      const nb = this.root.querySelector(`[data-up="${u.id}"]`);
      if (nb && !Input.touchMode) nb.focus();
      return;
    }
    Sfx.play('uiOk');
    switch (b.dataset.act) {
      case 'continue': Game.continueGame(); break;
      case 'new': Game.newGame(); break;
      case 'arena': Game.startArena(); break;
      case 'altar': this.show('upgrade', { from: 'menu' }); break;
      case 'altar-over': this.show('upgrade', { from: 'over' }); break;
      case 'help': this.show('help'); break;
      case 'back': this.show('menu'); break;
      case 'resume': Game.resume(); break;
      case 'restart': Game.restartEncounter(); break;
      case 'retry': Game.restartEncounter(); break;
      case 'menu': Game.toMenu(); break;
      case 'up-continue': {
        const d = this.data || {};
        if (d.next != null) { if (d.next < CHAPTERS.length) { Game.startChapter(d.next); } else Game.toMenu(); }
        else if (d.from === 'over') this.show('over');
        else this.show('menu');
        break;
      }
      case 'fullscreen': this.toggleFullscreen(); break;
    }
  },

  toggleFullscreen() {
    const d = document, el = d.documentElement;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
      const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* sin bloqueo */ } }).catch(() => {});
    } catch (e) { /* no disponible */ }
  },

  focusables() {
    const el = this.cur && document.getElementById('s-' + this.cur);
    if (!el) return [];
    return Array.from(el.querySelectorAll('button')).filter(b => !b.hidden && !b.disabled && b.offsetParent !== null);
  },
  move(dir) {
    const list = this.focusables();
    if (!list.length) return;
    const i = list.indexOf(document.activeElement);
    const n = i < 0 ? 0 : (i + dir + list.length) % list.length;
    list[n].focus();
    Sfx.play('ui');
  },
  back() {
    if (this.cur === 'pause') Game.resume();
    else if (this.cur === 'help') this.show('menu');
    else if (this.cur === 'upgrade') { const b = document.getElementById('up-continue'); if (b) b.click(); }
  },
  handleKey(e) {
    if (Game.state === 'playing') return false;
    if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); this.back(); return true; }
    if (e.code === 'ArrowDown' || e.code === 'ArrowRight') { e.preventDefault(); this.move(1); return true; }
    if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') { e.preventDefault(); this.move(-1); return true; }
    return true;
  },
  gamepadNav(a) {
    if (a === 'down' || a === 'right') this.move(1);
    else if (a === 'up' || a === 'left') this.move(-1);
    else if (a === 'confirm') {
      const el = document.activeElement;
      if (el && el.tagName === 'BUTTON' && this.root.contains(el)) el.click();
      else this.move(0);
    } else if (a === 'back' || a === 'pause') this.back();
  },
};
