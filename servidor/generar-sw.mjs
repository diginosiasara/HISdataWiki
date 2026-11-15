#!/usr/bin/env node
/* Regenera la lista PRECACHE de sw.js con todas las páginas y recursos de la wiki.
   Uso: node servidor/generar-sw.mjs  (ejecútalo cada vez que añadas o cambies páginas) */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXCLUIR = ['modelos-ia', 'servidor', 'tests', 'node_modules', '.git'];
const OK = /\.(html|css|js|json|webp|png|svg|ico|webmanifest|woff2?)$/i;
async function recorre(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name), rel = relative(raiz, p).split(sep).join('/');
    if (e.isDirectory()) { if (!EXCLUIR.includes(rel.split('/')[0])) await recorre(p, out); }
    else if (OK.test(e.name) && rel !== 'sw.js') out.push('./' + rel);
  }
  return out;
}
const lista = (await recorre(raiz)).sort();
const ruta = join(raiz, 'sw.js');
let sw = await readFile(ruta, 'utf8');
sw = sw.replace(/const PRECACHE = \[[\s\S]*?\];/, 'const PRECACHE = ' + JSON.stringify(lista) + ';');
sw = sw.replace(/const VERSION = '[^']*'/, "const VERSION = '" + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '') + "'");
await writeFile(ruta, sw);
console.log('sw.js actualizado con', lista.length, 'archivos.');
