'use strict';
/* =========================================================
   Datos del juego: ataques, enemigos, capítulos y mejoras
   ========================================================= */
const GY = 300;            // altura del suelo (coordenadas lógicas, la vista mide 360 de alto)
const ARENA_W = 640;       // ancho de una arena cerrada

// Ángulos en el espacio del personaje mirando a la derecha: 0 = al frente, negativo = hacia arriba.
// act = ventana activa [inicio, fin]; reach = alcance de la cadena; kb = empuje [x, y]
const ATTACKS = {
  l1: { dur: 0.36, act: [0.09, 0.19], a0: -2.2, a1: 0.75, reach: 88, dmg: 10, kb: [150, -40], arm: 'R', next: 'l2', lunge: 70, sfx: 'swing' },
  l2: { dur: 0.36, act: [0.08, 0.18], a0: 0.95, a1: -1.6, reach: 88, dmg: 10, kb: [150, -60], arm: 'L', next: 'l3', lunge: 70, sfx: 'swing' },
  l3: { dur: 0.44, act: [0.1, 0.22], a0: -2.6, a1: 1.1, reach: 100, dmg: 13, kb: [230, -70], arm: 'B', next: 'l4', lunge: 90, sfx: 'swingHeavy', stop: 0.06 },
  l4: { dur: 0.72, act: [0.1, 0.6], a0: -1.6, a1: -1.6 + TAU * 2, reach: 104, dmg: 7, kb: [120, -90], arm: 'S', multi: 0.1, lunge: 50, sfx: 'swingHeavy', breaks: true, endKb: [300, -160] },
  h1: { dur: 0.6, act: [0.22, 0.34], a0: 1.35, a1: -1.95, reach: 94, dmg: 20, kb: [60, -430], arm: 'B', launch: true, heavy: true, stop: 0.09, shake: 4, sfx: 'swingHeavy', breaks: true },
  a1: { dur: 0.3, act: [0.05, 0.16], a0: -2.0, a1: 0.9, reach: 82, dmg: 9, kb: [70, -170], arm: 'R', next: 'a2', air: true, sfx: 'swing' },
  a2: { dur: 0.3, act: [0.05, 0.16], a0: 0.9, a1: -1.8, reach: 82, dmg: 9, kb: [70, -170], arm: 'L', next: 'a3', air: true, sfx: 'swing' },
  a3: { dur: 0.46, act: [0.06, 0.36], a0: -1.6, a1: -1.6 + TAU, reach: 92, dmg: 6, kb: [160, -60], arm: 'S', multi: 0.09, air: true, sfx: 'swingHeavy', endKb: [260, 120] },
  slam: { dur: 9, act: [0, 9], a0: -1.9, a1: 1.2, reach: 60, dmg: 22, arm: 'B', heavy: true, air: true, breaks: true },
};

const ENEMIES = {
  legion: { name: 'Legionario', hp: 46, w: 22, h: 52, speed: 62, dmg: 11, orbs: 10, mass: 1 },
  hoplita: { name: 'Hoplita', hp: 72, w: 26, h: 54, speed: 46, dmg: 14, orbs: 16, mass: 1.25, shield: true },
  arpia: { name: 'Arpía', hp: 24, w: 28, h: 26, speed: 130, dmg: 8, orbs: 9, mass: 0.7, fly: true },
  arquero: { name: 'Arquero', hp: 28, w: 20, h: 50, speed: 72, dmg: 9, orbs: 12, mass: 0.9 },
  minotauro: { name: 'Minotauro', hp: 360, w: 44, h: 90, speed: 74, dmg: 20, orbs: 70, mass: 3, big: true, poise: 80 },
  ciclope: { name: 'Polifemo', hp: 2600, w: 96, h: 206, speed: 46, dmg: 24, orbs: 400, mass: 99, big: true, boss: true, poise: 240 },
};

const DIFFS = [
  { name: 'Mortal', desc: 'Para disfrutar de la historia', dmg: 0.6, hp: 0.8 },
  { name: 'Espartano', desc: 'El reto equilibrado', dmg: 1, hp: 1 },
  { name: 'Titán', desc: 'Solo para dioses', dmg: 1.5, hp: 1.35 },
];

// Cada encuentro cierra una arena; cada oleada es una lista de [tipo, cantidad]
const CHAPTERS = [
  {
    name: 'La Costa de los Muertos', theme: 'costa', length: 2700,
    intro: 'Los barcos arden y los muertos salen del mar.',
    encounters: [
      { x: 560, waves: [[['legion', 3]], [['legion', 4]]], tutorial: true },
      { x: 1400, waves: [[['legion', 2], ['arpia', 2]], [['legion', 3], ['arpia', 2]]] },
      { x: 2200, waves: [[['hoplita', 2], ['legion', 2]], [['hoplita', 1], ['legion', 3], ['arpia', 2]]] },
    ],
  },
  {
    name: 'El Templo Profanado', theme: 'templo', length: 2800,
    intro: 'Los dioses guardan silencio. Sus guardianes, no.',
    encounters: [
      { x: 560, waves: [[['hoplita', 2], ['arquero', 2]], [['legion', 3], ['arquero', 2]]] },
      { x: 1400, waves: [[['arpia', 5]], [['arpia', 3], ['hoplita', 2], ['arquero', 1]]] },
      { x: 2250, waves: [[['legion', 4]], [['minotauro', 1]], [['minotauro', 1], ['legion', 2], ['arquero', 2]]] },
    ],
  },
  {
    name: 'La Ira del Cíclope', theme: 'volcan', length: 2100,
    intro: 'En la boca del volcán despierta Polifemo.',
    encounters: [
      { x: 560, waves: [[['legion', 3], ['arpia', 2]], [['hoplita', 2], ['arquero', 2], ['arpia', 1]]] },
      { x: 1500, boss: 'ciclope', width: 760 },
    ],
  },
];

const UPGRADES = [
  { id: 'blades', name: 'Hojas del Caos', icon: 'blade', max: 5, cost: [0, 400, 900, 1600, 2600], desc: 'Más daño con todos los ataques', stat: l => 'Daño ×' + (1 + 0.22 * (l - 1)).toFixed(2) },
  { id: 'health', name: 'Ojos de Gorgona', icon: 'eye', max: 5, cost: [0, 300, 700, 1200, 2000], desc: 'Aumenta la vida máxima', stat: l => 'Vida ' + (100 + 25 * (l - 1)) },
  { id: 'rage', name: 'Cuernos del Minotauro', icon: 'horn', max: 5, cost: [0, 350, 800, 1400, 2200], desc: 'La Ira dura más y se llena antes', stat: l => 'Ira ' + (8 + 2 * (l - 1)) + ' s' },
];

function arenaWave(n) {
  // Oleadas crecientes para la Arena de los Dioses
  const list = [];
  if (n % 10 === 0) { list.push(['ciclope', 1]); return list; }
  let budget = 3 + n * 1.6;
  const pool = [['legion', 1]];
  if (n >= 2) pool.push(['arpia', 1.2]);
  if (n >= 3) pool.push(['hoplita', 2]);
  if (n >= 4) pool.push(['arquero', 1.6]);
  if (n % 5 === 0 || (n > 6 && chance(0.35))) { list.push(['minotauro', 1]); budget -= 7; }
  const count = {};
  while (budget > 0.9) {
    const [t, c] = pick(pool);
    count[t] = (count[t] || 0) + 1; budget -= c;
  }
  for (const t in count) list.push([t, count[t]]);
  return list;
}
