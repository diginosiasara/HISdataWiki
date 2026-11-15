#!/usr/bin/env node
/* Prepara el dictado por voz INTEGRADO (sin conexión) dentro del paquete.
   Ejecútalo UNA vez, con Internet, antes de distribuir la wiki. Los usuarios finales no descargan nada.
   Uso:  node modelos-ia/preparar-voz.mjs            (instala el motor y el modelo en español)
         node modelos-ia/preparar-voz.mjs --comprobar (solo comprueba lo que ya está instalado)
   Requiere Node 18+ y npm. Deja:
     modelos-ia/speech-to-text/vosk/vosk.js         (motor Vosk en WebAssembly, paquete npm vosk-browser)
     modelos-ia/speech-to-text/vosk/model-es.tar.gz (modelo pequeño en español, ≈ 39 MB) */
import { mkdir, writeFile, copyFile, stat, readdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'modelos-ia/speech-to-text/vosk');
const MODELO_URL = 'https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.tar.gz';
const existe = async (p) => { try { return (await stat(p)).size; } catch { return 0; } };
const mb = (n) => (n / 1048576).toFixed(1) + ' MB';
if (process.argv.includes('--comprobar')) {
  for (const f of ['vosk.js', 'model-es.tar.gz']) { const s = await existe(join(destino, f)); console.log((s ? '✔ ' : '✘ ') + f + (s ? '  ' + mb(s) : '  (falta)')); }
  process.exit(0);
}
await mkdir(destino, { recursive: true });
/* 1) motor: se descarga el paquete npm vosk-browser y se extrae su dist/vosk.js */
if (!(await existe(join(destino, 'vosk.js')))) {
  const tmp = join(tmpdir(), 'hisdata-vosk-' + Date.now());
  await mkdir(tmp, { recursive: true });
  console.log('▶ Descargando el motor (npm pack vosk-browser)…');
  const nombre = execFileSync('npm', ['pack', 'vosk-browser', '--silent'], { cwd: tmp, shell: process.platform === 'win32' }).toString().trim().split('\n').pop();
  execFileSync('tar', ['-xzf', nombre], { cwd: tmp });
  const dist = join(tmp, 'package', 'dist');
  const archivos = await readdir(dist).catch(() => []);
  const js = archivos.find((f) => f === 'vosk.js') || archivos.find((f) => /vosk.*\.js$/.test(f) && !/map/.test(f));
  if (!js) { console.error('✘ No encuentro vosk.js en el paquete. Contenido de dist:', archivos.join(', ')); process.exit(1); }
  await copyFile(join(dist, js), join(destino, 'vosk.js'));
  await rm(tmp, { recursive: true, force: true });
  console.log('  ✔ vosk.js');
} else console.log('· vosk.js ya existe');
/* 2) modelo en español */
if (!(await existe(join(destino, 'model-es.tar.gz')))) {
  console.log('▶ Descargando el modelo en español (≈ 39 MB)…');
  const r = await fetch(MODELO_URL);
  if (!r.ok) { console.error('✘ HTTP ' + r.status + ' al descargar ' + MODELO_URL + '. Descarga el modelo a mano y guárdalo como model-es.tar.gz'); process.exit(1); }
  await writeFile(join(destino, 'model-es.tar.gz'), Buffer.from(await r.arrayBuffer()));
  console.log('  ✔ model-es.tar.gz');
} else console.log('· model-es.tar.gz ya existe');
console.log('\nListo. Licencias: revisa las de vosk-browser y del modelo antes de redistribuir.');
console.log('Para que funcione sin conexión, sirve la wiki por http(s) (por ejemplo: node servidor/servidor.js) y ejecuta node servidor/generar-sw.mjs.');
