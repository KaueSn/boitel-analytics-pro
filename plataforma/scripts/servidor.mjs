// Servidor estático local, sem dependências. Serve a raiz do repositório do simulador
// para que /plataforma/ encontre ../assets como no GitHub Pages.
// Uso: node plataforma/scripts/servidor.mjs [porta]  →  http://127.0.0.1:5180/plataforma/
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const PORTA = Number(process.argv[2] || process.env.PORT || 5180);
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8' };

createServer(async (req, res) => {
  try {
    const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let arquivo = normalize(join(RAIZ, caminho));
    if (arquivo !== RAIZ && !arquivo.startsWith(RAIZ + sep)) { res.writeHead(403).end(); return; }
    if ((await stat(arquivo).catch(() => null))?.isDirectory()) arquivo = join(arquivo, 'index.html');
    const corpo = await readFile(arquivo);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(corpo);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Não encontrado');
  }
}).listen(PORTA, '127.0.0.1', () => console.log(`Plataforma: http://127.0.0.1:${PORTA}/plataforma/`));
