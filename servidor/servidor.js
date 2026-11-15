#!/usr/bin/env node
/* Servidor local de HISdata Wiki (sin dependencias, Node 18+).
   1) Sirve la wiki por http, necesario para el dictado integrado, el Service Worker y los modelos.
   2) Opcional: proxy seguro /api/chat hacia la API de Anthropic con la clave en el SERVIDOR (variable de entorno),
      de modo que la clave nunca pasa por el navegador.
   Uso:  node servidor/servidor.js                      (wiki en http://localhost:8787)
         ANTHROPIC_API_KEY=sk-ant-... node servidor/servidor.js
   Variables: PORT, HOST (127.0.0.1), HIS_ALLOWED_ORIGINS (separados por comas), HIS_MODELOS, ANTHROPIC_BASE_URL */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const PORT = +process.env.PORT || 8787, HOST = process.env.HOST || '127.0.0.1';
const KEY = process.env.ANTHROPIC_API_KEY || '';
const BASE = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '');
const MODELOS = (process.env.HIS_MODELOS || 'claude-haiku-5-5,claude-sonnet-5-5,claude-opus-5-5').split(',').map((s) => s.trim());
const ORIGENES = (process.env.HIS_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.gz': 'application/gzip', '.onnx': 'application/octet-stream', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8' };
const BLOQUEADAS = ['servidor', 'tests', '.git', 'node_modules'];
const SEG = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'microphone=(self), camera=()' };
const visitas = new Map();
function limite(ip) { const ahora = Date.now(), v = (visitas.get(ip) || []).filter((t) => ahora - t < 60000); v.push(ahora); visitas.set(ip, v); return v.length > 20; }
function pii(txt) { const r = []; if (/\b\d{8}[-\s]?[A-Za-z]\b/.test(txt)) r.push('DNI'); if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(txt)) r.push('correo'); if (/(?:\+34|0034)?[\s-]?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/.test(txt)) r.push('teléfono'); return r; }
function json(res, code, obj, extra = {}) { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', ...SEG, ...extra }); res.end(JSON.stringify(obj)); }
function origenOk(req) { const o = req.headers.origin; if (!o) return true; if (ORIGENES.includes(o)) return true; try { return new URL(o).host === req.headers.host; } catch { return false; } }
async function chat(req, res) {
  const cors = req.headers.origin && origenOk(req) ? { 'access-control-allow-origin': req.headers.origin, vary: 'Origin' } : {};
  if (!origenOk(req)) return json(res, 403, { error: { message: 'Origen no permitido' } });
  if (req.method === 'OPTIONS') { res.writeHead(204, { ...cors, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type' }); return res.end(); }
  if (req.method !== 'POST') return json(res, 405, { error: { message: 'Usa POST' } }, cors);
  if (!KEY) return json(res, 503, { error: { message: 'El servidor no tiene ANTHROPIC_API_KEY configurada' } }, cors);
  if (limite(req.socket.remoteAddress)) return json(res, 429, { error: { message: 'Demasiadas peticiones: espera un minuto' } }, cors);
  let cuerpo = '';
  for await (const c of req) { cuerpo += c; if (cuerpo.length > 65536) return json(res, 413, { error: { message: 'Mensaje demasiado largo' } }, cors); }
  let d; try { d = JSON.parse(cuerpo); } catch { return json(res, 400, { error: { message: 'JSON no válido' } }, cors); }
  if (!MODELOS.includes(d.model)) return json(res, 400, { error: { message: 'Modelo no permitido' } }, cors);
  if (!Array.isArray(d.messages) || !d.messages.length || d.messages.length > 20) return json(res, 400, { error: { message: 'Mensajes no válidos' } }, cors);
  const texto = JSON.stringify(d.messages) + (d.system || '');
  const datos = pii(JSON.stringify(d.messages));
  if (datos.length) return json(res, 422, { error: { message: 'No se envían datos personales (' + datos.join(', ') + ')' } }, cors);
  const body = { model: d.model, max_tokens: Math.min(+d.max_tokens || 900, 1000), system: String(d.system || '').slice(0, 20000), messages: d.messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 4000) })) };
  try {
    const r = await fetch(BASE + '/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
    const t = await r.text(); res.writeHead(r.status, { 'content-type': 'application/json; charset=utf-8', ...SEG, ...cors }); res.end(t);
  } catch (e) { json(res, 502, { error: { message: 'No se pudo contactar con el proveedor: ' + e.message } }, cors); }
}
function estatico(req, res) {
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); return res.end(); }
  if (p.endsWith('/')) p += 'index.html';
  const f = path.normalize(path.join(RAIZ, p));
  if (!f.startsWith(RAIZ + path.sep) && f !== RAIZ) { res.writeHead(403); return res.end('Prohibido'); }
  const primero = path.relative(RAIZ, f).split(path.sep)[0];
  if (BLOQUEADAS.includes(primero) || path.basename(f).startsWith('.')) { res.writeHead(404); return res.end('No encontrado'); }
  fs.stat(f, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, SEG); return res.end('No encontrado'); }
    const tipo = MIME[path.extname(f).toLowerCase()] || 'application/octet-stream';
    const h = { 'content-type': tipo, 'accept-ranges': 'bytes', 'cache-control': /\/modelos-ia\//.test(p) ? 'public, max-age=31536000, immutable' : 'no-cache', ...SEG };
    const rg = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (rg && (rg[1] || rg[2])) { const a = rg[1] ? +rg[1] : st.size - +rg[2], b = rg[2] && rg[1] ? Math.min(+rg[2], st.size - 1) : st.size - 1; if (a > b || a >= st.size) { res.writeHead(416, { 'content-range': 'bytes */' + st.size }); return res.end(); } res.writeHead(206, { ...h, 'content-range': `bytes ${a}-${b}/${st.size}`, 'content-length': b - a + 1 }); return req.method === 'HEAD' ? res.end() : fs.createReadStream(f, { start: a, end: b }).pipe(res); }
    res.writeHead(200, { ...h, 'content-length': st.size });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(f).pipe(res);
  });
}
http.createServer((req, res) => {
  const u = (req.url || '').split('?')[0];
  if (u === '/api/chat') return chat(req, res).catch((e) => json(res, 500, { error: { message: e.message } }));
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  estatico(req, res);
}).listen(PORT, HOST, () => console.log(`HISdata Wiki en http://${HOST === '127.0.0.1' ? 'localhost' : HOST}:${PORT}  ·  IA en la nube: ${KEY ? 'proxy activo en /api/chat' : 'sin clave (modo local)'}`));
