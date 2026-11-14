#!/usr/bin/env node
/* Descarga los modelos del catálogo a esta carpeta. Uso:
     node modelos-ia/descargar-modelos.mjs --perfil A      (solo embeddings)
     node modelos-ia/descargar-modelos.mjs --perfil B      (embeddings + Qwen2.5-0.5B)
     node modelos-ia/descargar-modelos.mjs --modelo qwen2.5-1.5b-instruct
   Requiere Node 18+ e Internet. Los archivos ya descargados se omiten. */
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const val = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const cat = JSON.parse(await readFile(join(raiz, 'modelos-ia/catalogo/modelos.json'), 'utf8'));
let ids = val('--modelo') ? [val('--modelo')] : cat.perfiles[val('--perfil') || 'A'];
if (!ids) { console.error('Perfil desconocido. Usa A, B o C.'); process.exit(1); }
for (const id of ids) {
  const m = cat.modelos.find((x) => x.id === id);
  if (!m) { console.error('No está en el catálogo:', id); continue; }
  console.log(`\n▶ ${m.nombre}  (${m.tamano}, licencia ${m.licencia})\n  Origen: ${m.origen}`);
  for (const a of m.archivos) {
    const destino = join(raiz, m.destino.replace(/^modelos-ia\//, 'modelos-ia/'), a.ruta);
    try { await stat(destino); console.log('  · ya existe', a.ruta); continue; } catch {}
    process.stdout.write(`  · descargando ${a.ruta} … `);
    try {
      const r = await fetch(a.url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      await mkdir(dirname(destino), { recursive: true });
      await writeFile(destino, Buffer.from(await r.arrayBuffer()));
      console.log('ok');
    } catch (e) { console.log('ERROR: ' + e.message + '  (revisa la URL en el catálogo)'); }
  }
}
console.log('\nHecho. Recarga la wiki y pulsa «Buscar proveedores» en la pestaña IA.');
