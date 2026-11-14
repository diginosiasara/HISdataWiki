#!/usr/bin/env node
/* Servidor MCP de HISdata Wiki (transporte STDIO, solo lectura).
   Expone la búsqueda en la wiki y los cálculos estadísticos para Google Antigravity u otros clientes MCP.
   Uso: node servidor/mcp/server.js   (Node 18 o superior, sin dependencias) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), readline = require('readline');
const RAIZ = path.resolve(__dirname, '..', '..');
function cargar(rel) { const ctx = { window: {}, console }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(RAIZ, rel), 'utf8'), ctx); return ctx.window; }
const M = cargar('assets/js/his.math.js').HISMath;
let KB = [];
try { KB = cargar('assets/js/kb.js').HIS_KB || []; } catch (e) { process.stderr.write('Aviso: no se pudo cargar kb.js: ' + e.message + '\n'); }
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const STOP = new Set('el la los las un una de del al y o en a por para con sin que es se su lo como mas muy si no'.split(' '));
const toks = (s) => norm(s).replace(/[^a-z0-9ñ ]+/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w)).map((w) => w.slice(0, 6));
const DF = {}; const IDX = KB.map((c) => { const tf = {}; [[c.p, 3], [c.h, 2.5], [c.t, 1]].forEach(([t, w]) => toks(t).forEach((k) => { tf[k] = (tf[k] || 0) + w; })); Object.keys(tf).forEach((k) => { DF[k] = (DF[k] || 0) + 1; }); return { c, tf }; });
function buscar(q, max = 5) {
  const qt = toks(q);
  return IDX.map((x) => ({ c: x.c, s: qt.reduce((a, t) => a + (x.tf[t] ? Math.log(1 + IDX.length / (DF[t] || 1)) * (1 + Math.log(1 + x.tf[t])) : 0), 0) }))
    .filter((r) => r.s > 0).sort((a, b) => b.s - a.s).slice(0, Math.min(max, 10))
    .map((r) => ({ pagina: r.c.p, seccion: r.c.h, ruta: r.c.u, puntuacion: +r.s.toFixed(2), texto: r.c.t }));
}
const CONJUNTOS = {
  glucosa: [92,105,110,92,99,95,92,108,110,92,97,103,92,94,100,105,112,103,99,90,93,105,105,100,96],
  presion: [120.5,125.3,118.2,132.8,128.4,124.6,121.7,130.2,115.9,129.1,122.4,127.5,119.8,126.3,131.7,117.5,123.4,128.9,125.6,120.2],
  colesterol: [190,202,185,210,198,205,192,200,188,215,195,207,183,203,211,189,197,204,206,193,208,187,199,212,194],
  estaturas: [121,115,120,109,125,124,109,113,109,116,111,115,123,116,124,119,100,124,116,120,116,109],
  consultas: [0,3,2,0,2,1,4,0,3,0,1,2,4,0,3,2,0,1,3,2,2,2,3,4,0,2,3,2,1,0]
};
function estadisticos(datos, ddof) {
  const d = M.describe(datos, { ddof: ddof ? 1 : 0 });
  return { n: d.n, suma: d.sum, media: d.mean, mediana: d.median, moda: d.mode.values, minimo: d.min, maximo: d.max, rango: d.range, q1: d.q1, q3: d.q3, iqr: d.iqr, varianza: d.variance, desviacion_tipica: d.sd, divisor: ddof ? 'n-1' : 'n (criterio del curso)' };
}
function probabilidad(a) {
  const p = a.parametros || {}, t = a.tipo || 'menor';
  let r;
  switch (a.distribucion) {
    case 'normal': { const z = (x) => (x - p.mu) / p.sigma; r = t === 'mayor' ? 1 - M.normCdf(z(p.x)) : t === 'entre' ? M.normCdf(z(p.b)) - M.normCdf(z(p.a)) : M.normCdf(z(p.x)); break; }
    case 'exponencial': { const l = 1 / p.media; r = t === 'mayor' ? Math.exp(-l * p.x) : t === 'entre' ? Math.exp(-l * p.a) - Math.exp(-l * p.b) : 1 - Math.exp(-l * p.x); break; }
    case 'uniforme': { const lo = Math.max(p.a0, p.a), hi = Math.min(p.b0, p.b); r = Math.max(0, hi - lo) / (p.b0 - p.a0); break; }
    case 't': r = t === 'mayor' ? 1 - M.tCdf(p.x, p.gl) : M.tCdf(p.x, p.gl); break;
    case 'chi2': r = t === 'mayor' ? 1 - M.chi2Cdf(p.x, p.gl) : M.chi2Cdf(p.x, p.gl); break;
    default: throw new Error('Distribución no soportada: ' + a.distribucion);
  }
  return { probabilidad: r, porcentaje: r * 100 };
}
const TOOLS = [
  { name: 'buscar_en_wiki', description: 'Busca fragmentos relevantes en la wiki HISdata (estadística, SIS, CMBD, GRD, calidad).', inputSchema: { type: 'object', properties: { consulta: { type: 'string' }, max: { type: 'integer', minimum: 1, maximum: 10 } }, required: ['consulta'] }, run: (a) => buscar(a.consulta, a.max) },
  { name: 'calcular_estadisticos', description: 'Calcula media, mediana, moda, cuartiles, varianza y desviación típica. Por defecto divide entre n (criterio del curso).', inputSchema: { type: 'object', properties: { datos: { type: 'array', items: { type: 'number' }, minItems: 2 }, muestral: { type: 'boolean', description: 'true para dividir entre n-1' } }, required: ['datos'] }, run: (a) => estadisticos(a.datos, a.muestral) },
  { name: 'calcular_probabilidad', description: 'Probabilidades normal, exponencial, uniforme, t y chi cuadrado. parametros: normal {mu,sigma,x|a,b}; exponencial {media,x|a,b}; uniforme {a0,b0,a,b}; t/chi2 {gl,x}.', inputSchema: { type: 'object', properties: { distribucion: { type: 'string', enum: ['normal', 'exponencial', 'uniforme', 't', 'chi2'] }, tipo: { type: 'string', enum: ['menor', 'mayor', 'entre'] }, parametros: { type: 'object' } }, required: ['distribucion', 'parametros'] }, run: probabilidad },
  { name: 'listar_conjuntos', description: 'Lista los conjuntos de datos didácticos (sintéticos) del curso.', inputSchema: { type: 'object', properties: {} }, run: () => CONJUNTOS }
];
function responder(id, result) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n'); }
function error(id, code, message) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n'); }
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  if (!line.trim()) return;
  let m; try { m = JSON.parse(line); } catch { return error(null, -32700, 'JSON no válido'); }
  const { id, method, params } = m;
  if (method === 'initialize') return responder(id, { protocolVersion: (params && params.protocolVersion) || '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'hisdata-wiki', version: '1.0.0' } });
  if (method && method.startsWith('notifications/')) return;
  if (method === 'ping') return responder(id, {});
  if (method === 'tools/list') return responder(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
  if (method === 'tools/call') {
    const t = TOOLS.find((x) => x.name === (params || {}).name);
    if (!t) return error(id, -32602, 'Herramienta desconocida');
    try { return responder(id, { content: [{ type: 'text', text: JSON.stringify(t.run((params || {}).arguments || {}), null, 2) }] }); }
    catch (e) { return responder(id, { isError: true, content: [{ type: 'text', text: 'Error: ' + e.message }] }); }
  }
  if (id !== undefined) error(id, -32601, 'Método no soportado: ' + method);
});
