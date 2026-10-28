# Furia de Esparta

Fan-game de hack and slash en 2D inspirado en *God of War* (Santa Monica Studio). Eres el Fantasma de
Esparta: encadena combos con las hojas de cadena, lanza a los enemigos al aire, remátalos y desata la
Ira de Esparta. **El arte y el sonido son originales y se generan por código.** Es un único archivo HTML
sin dependencias que funciona en Android, iPhone y PC.

## Jugar

| Dónde | Cómo |
| --- | --- |
| **PC** | Abre `dist/index.html` con doble clic (Chrome, Edge, Firefox o Safari). |
| **Móvil (misma Wi‑Fi)** | En el PC ejecuta `node serve.mjs` y abre en el móvil la dirección `http://192.168.x.x:8080` que aparece. |
| **Móvil (cualquier sitio)** | Sube la carpeta `dist/` a GitHub Pages, Netlify o Cloudflare Pages. Desde el navegador del móvil usa *Añadir a pantalla de inicio* y se instala como app a pantalla completa (funciona sin conexión). |

Se juega mejor con el móvil en horizontal; en vertical el escenario queda arriba y los mandos abajo.
En iPhone, si no suena nada, desactiva el modo silencio.

## Controles

| Acción | Móvil | Teclado | Mando |
| --- | --- | --- | --- |
| Moverse | Joystick (mitad izquierda) | A D / ← → | Stick izquierdo / cruceta |
| Ataque rápido (mantener = combo) | □ | J / Z | X / □ |
| Ataque fuerte (en el aire: golpe al suelo) | △ | K / X | Y / △ |
| Saltar (doble salto) | ✕ | Espacio / W / ↑ | A / ✕ |
| Esquivar · Rematar | ○ | L / C / Shift | B / ○ |
| Ira de Esparta | Botón de fuego | E / I | RB / R3 |
| Pausa | Botón II | P / Esc | Start |
| Silencio | En la pausa | M | — |

## Contenido

- **3 capítulos**: La Costa de los Muertos, El Templo Profanado y La Ira del Cíclope, cada uno con su
  escenario (lluvia y relámpagos, braseros y brasas, volcán y ceniza) y arenas cerradas por oleadas.
- **Combate**: combo de 4 golpes que acaba en torbellino, lanzador, combo aéreo de 3 golpes, golpe al
  suelo con onda, doble salto, esquiva con invulnerabilidad y *esquiva perfecta* a cámara lenta,
  desvío de flechas, remates con ○ y la Ira de Esparta (más daño, roba vida y aguanta golpes).
- **5 enemigos y un jefe**: legionarios no muertos, hoplitas con escudo (bloquean de frente), arpías
  que se lanzan en picado, arqueros esqueleto, el minotauro con su hacha doble (carga y onda de choque)
  y **Polifemo, el Cíclope Titán**, con tres fases, punto débil en el ojo y remate final pulsando ○.
- Los enemigos se enfurecen y contraatacan si los machacas sin parar: hay que esquivar.
- **Altar de los Dioses**: gasta los orbes rojos en Hojas del Caos (daño), Ojos de Gorgona (vida) y
  Cuernos del Minotauro (Ira). Los orbes y las mejoras se guardan en el navegador.
- **Arena de los Dioses**: supervivencia por oleadas infinitas, con Polifemo cada 10 oleadas y récord.
- 3 dificultades (Mortal, Espartano y Titán), música procedural de tambores de guerra, vibración en
  Android, soporte de mando y pantalla completa.

## Desarrollo

El código está en `src/` (JavaScript sin dependencias). Tras editarlo, vuelve a generar el HTML:

```bash
node build.mjs
```

Esto crea `dist/index.html` (juego completo en un archivo), `manifest.webmanifest`, `sw.js` e
`icon.svg` para instalarlo como app, y `dist/artifact.html` (la misma página sin `<html>`/`<head>`
para publicarla como Artifact de Claude).

## Estructura

- `src/data.js`: ataques, enemigos, capítulos, dificultades y mejoras (para equilibrar el juego).
- `src/hero.js`: movimiento, combos, esquiva, remates e Ira.
- `src/enemies.js`: IA de los enemigos y de Polifemo, proyectiles y orbes.
- `src/chars.js`: dibujo de los personajes con un esqueleto e IK de dos huesos.
- `src/render.js`: escenarios con paralaje, clima, HUD y controles táctiles.
- `src/fx.js`: partículas, estelas, temblor de cámara, congelado de impacto y cámara lenta.
- `src/audio.js`: efectos sintetizados y música procedural con Web Audio.
- `src/input.js`: teclado, táctil, mando y disposición de la pantalla.
- `src/ui.js` y `src/game.js`: menús, guardado, oleadas y bucle principal.
