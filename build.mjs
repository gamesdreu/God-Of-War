// Empaqueta el juego en un único HTML (dist/index.html) listo para PC y móvil.
// Uso: node build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const ORDER = ['util', 'audio', 'input', 'data', 'fx', 'hero', 'enemies', 'chars', 'render', 'ui', 'game'];
const js = ORDER.map(f => `/* ---- ${f}.js ---- */\n` + readFileSync(join(root, 'src', f + '.js'), 'utf8')).join('\n');
if (js.includes('</script')) throw new Error('El código contiene </script>');

const TITLE = 'Furia de Esparta';
const MEANDER = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='10'%3E%3Cpath d='M0 9.5H19.5V.5H4.5V6.5H14.5V3.5H9.5' fill='none' stroke='%23b48a45'/%3E%3C/svg%3E\")";

const style = `<style>
/* Lienzo a pantalla completa; menús como paneles de bronce sobre la escena */
:root {
  --ink: #0c0706; --panel: rgba(16, 8, 6, 0.94); --bone: #efe2c8; --bone-dim: #b9a68a;
  --blood: #a3150f; --blood-hi: #c8261a; --ember: #ff7a22; --bronze: #b48a45; --bronze-dim: #6d5230;
  --display: "Cinzel Decorative", "Cinzel", "Trajan Pro", Georgia, serif;
  --head: "Cinzel", "Trajan Pro", Georgia, serif;
  --body: "Marcellus", "Palatino Linotype", Palatino, Georgia, serif;
  color-scheme: dark;
}
html, body { margin: 0; height: 100%; background: var(--ink); color: var(--bone); overflow: hidden;
  overscroll-behavior: none; -webkit-tap-highlight-color: transparent; -webkit-text-size-adjust: 100%; }
#game { position: fixed; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; outline: none;
  -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
#safe { position: fixed; left: 0; top: 0; visibility: hidden; pointer-events: none;
  padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px); }
#ui { position: fixed; inset: 0; z-index: 2; pointer-events: none; font: 16px/1.45 var(--body);
  -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
[hidden] { display: none !important; }
button { font: inherit; color: inherit; touch-action: manipulation; }
.scr { position: absolute; inset: 0; display: none; pointer-events: auto; overflow-y: auto; touch-action: pan-y;
  box-sizing: border-box; -webkit-overflow-scrolling: touch;
  padding-block: max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-bottom, 0px));
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.scr.on { display: flex; }
.scr.center { align-items: flex-start; justify-content: center;
  background: radial-gradient(ellipse at 50% 40%, rgba(22, 10, 7, 0.8), rgba(4, 2, 2, 0.95)); }

#s-menu { justify-content: flex-end;
  background: linear-gradient(90deg, rgba(6, 3, 2, 0) 22%, rgba(6, 3, 2, 0.6) 50%, rgba(6, 3, 2, 0.94) 78%); }
#s-menu .panel { width: min(400px, 100%); margin-block: auto; display: flex; flex-direction: column; gap: 16px; }
.logo { margin: 0 0 4px; font-family: var(--display); font-weight: 900; line-height: 0.9; position: relative;
  display: flex; flex-direction: column; isolation: isolate; align-self: flex-start; }
.logo .l1 { font-size: clamp(48px, 9vw, 82px); letter-spacing: 0.02em; color: var(--bone);
  text-shadow: 0 3px 0 #000, 0 0 30px rgba(255, 90, 30, 0.25); }
.logo .l2 { font-family: var(--head); font-weight: 700; font-size: clamp(15px, 2.4vw, 21px); letter-spacing: 0.44em;
  color: var(--bronze); margin-top: 8px; }
.logo::before { content: ""; position: absolute; z-index: -1; left: -10%; right: -6%; top: 0.62em; height: 0.3em;
  font-size: clamp(48px, 9vw, 82px); transform: rotate(-7deg); opacity: 0.92;
  background: linear-gradient(90deg, transparent, var(--blood) 10%, var(--blood) 86%, transparent); }
.tag { margin: 0; color: var(--bone-dim); font-size: 15px; max-width: 34ch; text-wrap: balance; }
.stack { display: flex; flex-direction: column; gap: 8px; }

.btn { appearance: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%;
  min-height: 50px; padding: 12px 18px; box-sizing: border-box; cursor: pointer; text-align: left;
  font: 700 15px/1.1 var(--head); letter-spacing: 0.12em; text-transform: uppercase; color: var(--bone);
  background: linear-gradient(180deg, #23120d, #130907); border: 1px solid var(--bronze-dim); border-radius: 2px;
  box-shadow: inset 0 1px 0 rgba(255, 220, 170, 0.08), 0 2px 0 rgba(0, 0, 0, 0.5);
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.08s; }
.btn small { font: 400 13px/1.2 var(--body); letter-spacing: 0.02em; text-transform: none; color: var(--bone-dim); text-align: right; }
.btn:hover { border-color: var(--bronze); }
.btn:active { transform: translateY(1px); }
.btn:focus-visible { outline: none; border-color: var(--ember); box-shadow: 0 0 0 2px rgba(255, 122, 34, 0.35), 0 0 22px rgba(255, 90, 20, 0.25); }
.btn.primary { background: linear-gradient(180deg, var(--blood-hi), #6e0d09); border-color: #d9a85a; }
.btn.primary small { color: #f6cdb0; }
.btn.ghost { background: transparent; box-shadow: none; }
.btn[disabled] { opacity: 0.45; cursor: default; }
.btn.small { min-height: 44px; font-size: 12px; padding: 10px 14px; }

.field { display: flex; flex-direction: column; gap: 6px; }
.label, .eyebrow { margin: 0; font: 700 11px/1.2 var(--head); letter-spacing: 0.24em; text-transform: uppercase; color: var(--bronze); }
.seg { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--bronze-dim); }
.chip { appearance: none; background: transparent; border: 0; border-left: 1px solid var(--bronze-dim); padding: 10px 6px;
  min-height: 42px; cursor: pointer; font: 700 12px var(--head); letter-spacing: 0.08em; color: var(--bone-dim); }
.chip:first-child { border-left: 0; }
.chip.on { background: rgba(163, 21, 15, 0.6); color: var(--bone); }
.chip:focus-visible, .tog:focus-visible { outline: 2px solid var(--ember); outline-offset: -2px; }
.toggles { display: flex; flex-wrap: wrap; gap: 6px; }
.tog { appearance: none; background: rgba(12, 6, 5, 0.5); border: 1px solid rgba(109, 82, 48, 0.7); color: var(--bone-dim);
  padding: 7px 12px; min-height: 36px; border-radius: 999px; cursor: pointer; font: 400 13px var(--body); }
.tog[aria-pressed]::before { content: ""; display: inline-block; width: 7px; height: 7px; border-radius: 50%;
  margin-right: 7px; background: #4a3a2a; vertical-align: 1px; }
.tog.on { color: var(--bone); border-color: var(--bronze); }
.tog.on::before { background: var(--ember); box-shadow: 0 0 8px var(--ember); }

.card { margin: auto; width: 100%; max-width: 440px; box-sizing: border-box; position: relative;
  display: flex; flex-direction: column; gap: 16px; padding: 30px 24px 24px;
  background: var(--panel); border: 1px solid var(--bronze-dim); outline: 1px solid rgba(109, 82, 48, 0.35); outline-offset: 5px; }
.card::before { content: ""; position: absolute; left: 6px; right: 6px; top: 6px; height: 10px; background: ${MEANDER} repeat-x; opacity: 0.75; }
.card.wide { max-width: 880px; }
.card.mid { max-width: 640px; }
.card h2 { margin: 0; font: 900 clamp(26px, 5vw, 38px)/1.05 var(--display); text-wrap: balance; }
.card h2.blood { color: var(--blood-hi); text-shadow: 0 0 22px rgba(200, 30, 20, 0.4); }
.card h2.gold { color: #f0c66a; text-shadow: 0 0 22px rgba(240, 160, 60, 0.3); }
.sub { margin: 0; color: var(--bone-dim); max-width: 60ch; }

.altar-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.orbs { display: flex; align-items: center; gap: 9px; font: 700 24px var(--head); color: #f6d3c0; font-variant-numeric: tabular-nums; }
.orb { width: 16px; height: 16px; border-radius: 50%; box-shadow: 0 0 14px rgba(255, 50, 30, 0.75);
  background: radial-gradient(circle at 40% 35%, #fff 0 12%, #ff4a3a 32%, #8a0a06 76%); }
.ups { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.up { min-width: 0; display: flex; flex-direction: column; gap: 10px; padding: 16px;
  border: 1px solid rgba(109, 82, 48, 0.7); background: rgba(30, 15, 11, 0.75); }
.up-top { display: flex; gap: 12px; align-items: flex-start; }
.ico { flex: none; width: 42px; height: 42px; display: grid; place-items: center; color: var(--ember);
  border: 1px solid var(--bronze-dim); background: #120806; }
.ico svg { width: 26px; height: 26px; }
.up h3 { margin: 0 0 3px; font: 700 15px/1.2 var(--head); letter-spacing: 0.05em; }
.up p { margin: 0; font-size: 14px; color: var(--bone-dim); }
.up .btn { margin-top: auto; }
.pips { display: flex; gap: 5px; }
.pips i { flex: 1; height: 6px; background: #2a1712; border: 1px solid #4a3220; }
.pips i.full { background: linear-gradient(90deg, #c8261a, #ff7a22); border-color: #e09a50; }
.up p.stat { font: 700 13px var(--head); color: var(--bone); letter-spacing: 0.04em; font-variant-numeric: tabular-nums; }
.stat span { color: #ffb070; }
.stats { margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
.stats div { border-top: 1px solid var(--bronze-dim); padding-top: 6px; }
.stats dt { font: 700 10px var(--head); letter-spacing: 0.18em; text-transform: uppercase; color: var(--bronze); }
.stats dd { margin: 2px 0 0; font: 700 22px var(--head); font-variant-numeric: tabular-nums; }

.help .cols { display: grid; grid-template-columns: 1.15fr 1fr; gap: 24px; }
.help .cols > div { min-width: 0; overflow-x: auto; }
.help h3 { margin: 0 0 8px; font: 700 13px var(--head); letter-spacing: 0.2em; text-transform: uppercase; color: var(--bronze); }
.help table { border-collapse: collapse; width: 100%; font-size: 14px; }
.help th { text-align: left; font: 700 10px var(--head); letter-spacing: 0.14em; text-transform: uppercase; color: var(--bone-dim); padding: 0 8px 6px 0; }
.help td { padding: 7px 8px 7px 0; border-top: 1px solid rgba(109, 82, 48, 0.45); vertical-align: top; }
.help ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px; font-size: 14.5px; color: var(--bone-dim); }
.help em { color: var(--bone); font-style: normal; }
.k { font-weight: 700; font-family: system-ui, sans-serif; }
.k.sq { color: #f08fb0; } .k.tr { color: #6fd6b0; } .k.cr { color: #78aef0; } .k.ci { color: #f0644e; }

@media (orientation: portrait) {
  #s-menu { justify-content: center; background: linear-gradient(180deg, rgba(6, 3, 2, 0) 20%, rgba(6, 3, 2, 0.88) 46%, rgba(6, 3, 2, 0.97) 70%); }
  #s-menu .panel { margin-top: auto; margin-bottom: 0; }
}
@media (orientation: landscape) and (max-height: 520px) {
  #s-menu .panel { width: min(560px, 62vw); gap: 10px; }
  #s-menu .stack { display: grid; grid-template-columns: 1fr 1fr; }
  #s-menu .stack .btn { min-height: 44px; padding: 8px 12px; font-size: 13px; }
  #s-menu .stack .btn small { display: none; }
  .logo .l1 { font-size: 46px; }
  .logo::before { font-size: 46px; }
  .tag { display: none; }
  .card { padding: 24px 18px 18px; gap: 12px; }
}
@media (max-width: 720px) { .help .cols { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .btn { transition: none; } }
</style>`;

const head = hosted => [
  `<title>${TITLE}</title>`,
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">',
  '<meta name="description" content="Fan-game de hack and slash espartano: cadenas, dioses y venganza. Juega en el móvil o en el PC.">',
  '<meta name="theme-color" content="#0c0706">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<meta name="apple-mobile-web-app-title" content="Furia">',
  hosted ? '<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icon.svg" type="image/svg+xml">' : '',
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@400;600;700;900&family=Marcellus&display=swap">',
  style,
].filter(Boolean).join('\n');

const boot = hosted => `<script>
(function () {
  // Icono para "Añadir a pantalla de inicio" en iPhone/iPad, dibujado al vuelo
  try {
    var cv = document.createElement('canvas'); cv.width = cv.height = 180;
    var c = cv.getContext('2d');
    var g = c.createRadialGradient(90, 80, 10, 90, 90, 120);
    g.addColorStop(0, '#3a1510'); g.addColorStop(1, '#0c0706');
    c.fillStyle = g; c.fillRect(0, 0, 180, 180);
    c.fillStyle = '#a3150f'; c.beginPath(); c.moveTo(20, 135); c.lineTo(160, 52); c.lineTo(160, 72); c.lineTo(20, 155); c.fill();
    c.fillStyle = '#e8e0d0'; c.strokeStyle = '#ff7a22'; c.lineWidth = 3; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(46, 146); c.bezierCurveTo(70, 100, 105, 62, 148, 40); c.bezierCurveTo(126, 75, 92, 113, 56, 152); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(134, 146); c.bezierCurveTo(110, 100, 75, 62, 32, 40); c.bezierCurveTo(54, 75, 88, 113, 124, 152); c.closePath(); c.fill(); c.stroke();
    var l = document.createElement('link'); l.rel = 'apple-touch-icon'; l.href = cv.toDataURL('image/png');
    document.head.appendChild(l);
  } catch (e) {}
  ${hosted ? `try {
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && window.top === window.self)
      navigator.serviceWorker.register('sw.js').catch(function () {});
  } catch (e) {}` : ''}
  boot();
})();
</script>`;

const body = hosted => `<canvas id="game" tabindex="0" aria-label="${TITLE}"></canvas>
<div id="safe"></div>
<div id="ui"></div>
<script>
${js}
</script>
${boot(hosted)}`;

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'index.html'), `<!doctype html>\n<html lang="es">\n<head>\n${head(true)}\n</head>\n<body>\n${body(true)}\n</body>\n</html>\n`);
// Variante sin <html>/<head>/<body> para publicarla como Artifact
writeFileSync(join(root, 'dist', 'artifact.html'), `${head(false)}\n${body(false)}\n`);

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><radialGradient id="g" cx="50%" cy="44%" r="68%"><stop offset="0" stop-color="#3a1510"/><stop offset="1" stop-color="#0c0706"/></radialGradient></defs>
<rect width="512" height="512" rx="96" fill="url(#g)"/>
<path d="M56 384 L456 148 L456 204 L56 440 Z" fill="#a3150f"/>
<g fill="#e8e0d0" stroke="#ff7a22" stroke-width="8" stroke-linejoin="round">
<path d="M130 416 C200 284 300 176 420 112 C360 212 262 322 160 432 Z"/>
<path d="M382 416 C312 284 212 176 92 112 C152 212 250 322 352 432 Z"/>
</g>
<g fill="#35261c"><rect x="112" y="410" width="40" height="18" rx="4" transform="rotate(-52 132 419)"/><rect x="360" y="410" width="40" height="18" rx="4" transform="rotate(52 380 419)"/></g>
</svg>`;
writeFileSync(join(root, 'dist', 'icon.svg'), icon);

writeFileSync(join(root, 'dist', 'manifest.webmanifest'), JSON.stringify({
  name: TITLE, short_name: 'Furia', lang: 'es', start_url: './', scope: './', display: 'fullscreen',
  orientation: 'any', background_color: '#0c0706', theme_color: '#0c0706',
  icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
}, null, 2));

writeFileSync(join(root, 'dist', 'sw.js'), `// Caché sencilla para jugar sin conexión
const CACHE = 'furia-v${Date.now()}';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
`);

console.log('OK  dist/index.html (' + Math.round(readFileSync(join(root, 'dist', 'index.html')).length / 1024) + ' KB)');
