// Servidor local para jugar desde el móvil en la misma red Wi-Fi.
// Uso: node serve.mjs   (opcional: node serve.mjs <carpeta> <puerto>)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { join, extname, resolve, sep } from 'node:path';

const dir = resolve(process.argv[2] || 'dist');
const port = Number(process.argv[3] || process.env.PORT || 8080);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = resolve(join(dir, path));
    if (file !== dir && !file.startsWith(dir + sep)) { res.writeHead(403); return res.end(); }
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('No encontrado');
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`Sirviendo ${dir}`);
  console.log(`  En este PC:  http://localhost:${port}`);
  for (const list of Object.values(networkInterfaces())) for (const n of list || []) {
    if (n.family === 'IPv4' && !n.internal) console.log(`  En el móvil: http://${n.address}:${port}`);
  }
});
