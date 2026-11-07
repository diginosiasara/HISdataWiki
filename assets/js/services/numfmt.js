/*!
 * HISdata Wiki · services/numfmt.js
 * Responsabilidad ÚNICA: formatos numéricos de Excel (General, 0, 0.00, #,##0, 0%, 0.0%, hh:mm …)
 * con separadores de España (coma decimal, punto de millares) o de Excel en inglés (para verificar).
 * UMD: funciona en el navegador (HIS.numfmt) y en Node (require).
 *
 *   numfmt.format(valor, '0.00%', {locale:'es'})  ->  "39,35%"
 *   numfmt.general(0.1666666666666667, {locale:'es'}) -> "0,166666667"
 *   numfmt.toText(0.5, 'es')   // conversión número -> texto como hace Excel al concatenar con &
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.HIS = root.HIS || {}; root.HIS.numfmt = api; }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  /** Separadores según configuración regional. */
  function seps(locale) { return locale === 'es' ? { dec: ',', grp: '.' } : { dec: '.', grp: ',' }; }

  /** Redondeo “de Excel” (mitad hacia fuera de cero) con d decimales, sin errores binarios típicos. */
  function roundHalfAway(x, d) {
    var s = Math.abs(x).toString();
    if (s.indexOf('e') >= 0) return Number((x < 0 ? -1 : 1) * Number(Math.abs(x).toFixed(d)));
    var r = Math.round(Number(s + 'e' + d));
    return (x < 0 ? -1 : 1) * Number(r + 'e-' + d);
  }

  /** Cadena decimal con exactamente d decimales (sin notación científica). */
  function fixed(abs, d) {
    var r = roundHalfAway(abs, d);
    if (Math.abs(r) >= 1e21) return r.toString();
    return r.toFixed(d);
  }

  function group(intStr, g) { return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, g); }

  /** Número en formato “General”: hasta `sig` cifras significativas, sin ceros sobrantes. */
  function general(x, opts) {
    opts = opts || {};
    if (typeof x !== 'number') return String(x);
    if (!isFinite(x)) return x > 0 ? '∞' : '−∞';
    var sig = opts.sig || 10, s = seps(opts.locale), t;
    if (x === 0) return '0';
    var ax = Math.abs(x);
    if (ax >= 1e11 || ax < 1e-9) {
      t = x.toExponential(Math.max(0, sig - 5)).replace(/\.?0+e/, 'E').replace('e', 'E');
      t = t.replace(/E([+-])(\d)$/, 'E$10$2');
    } else {
      t = String(Number(x.toPrecision(sig)));
      if (t.indexOf('e') >= 0) t = Number(x.toPrecision(sig)).toFixed(Math.min(20, sig + 8)).replace(/\.?0+$/, '');
    }
    t = t.replace('.', s.dec);
    return opts.minus && t.charAt(0) === '-' ? opts.minus + t.slice(1) : t;
  }

  /** Conversión número → texto como lo hace Excel al concatenar (15 cifras significativas). */
  function toText(x, locale) {
    if (typeof x === 'boolean') return x ? 'VERDADERO' : 'FALSO';
    if (typeof x !== 'number') return String(x);
    return general(x, { sig: 15, locale: locale });
  }

  /** Trocea un formato en tokens: literales (entre comillas o escapados) y símbolos. */
  function tokenize(fmt) {
    var out = [], i = 0, c, j;
    while (i < fmt.length) {
      c = fmt.charAt(i);
      if (c === '"') { j = fmt.indexOf('"', i + 1); if (j < 0) j = fmt.length; out.push({ lit: fmt.slice(i + 1, j) }); i = j + 1; }
      else if (c === '\\' || c === '_' || c === '*') { out.push({ lit: c === '_' ? ' ' : (fmt.charAt(i + 1) || '') }); i += c === '*' ? 2 : 2; }
      else if (c === '[') { j = fmt.indexOf(']', i); i = j < 0 ? fmt.length : j + 1; }          // [Red], [$-es-ES] …
      else { out.push({ ch: c }); i++; }
    }
    return out;
  }

  function isTimeFormat(fmt) {
    return /(^|[^\\"])([hs]|AM\/PM)/i.test(String(fmt).replace(/"[^"]*"/g, '')) && !/[#0]/.test(String(fmt).replace(/"[^"]*"/g, '').replace(/[hms:.\sAPM\/]/gi, ''));
  }

  /** Formatos de hora: h, hh, m, mm, s, ss, AM/PM. */
  function formatTime(x, fmt) {
    var total = Math.round((x - Math.floor(x)) * 86400), hh = Math.floor(total / 3600) % 24, mm = Math.floor(total / 60) % 60, ss = total % 60;
    var toks = tokenize(fmt), ampm = /AM\/PM/i.test(fmt), out = '', i, t, run, n, prevH = false;
    function pad(v, w) { return (v < 10 && w > 1 ? '0' : '') + v; }
    for (i = 0; i < toks.length; i++) {
      t = toks[i];
      if (t.lit != null) { out += t.lit; continue; }
      var c = t.ch.toLowerCase();
      if (c === 'h' || c === 'm' || c === 's') {
        run = 1; while (toks[i + 1] && toks[i + 1].ch && toks[i + 1].ch.toLowerCase() === c) { run++; i++; }
        n = run >= 2 ? 2 : 1;
        if (c === 'h') { out += pad(ampm ? (hh % 12 || 12) : hh, n); prevH = true; }
        else if (c === 'm') { out += pad(mm, n); prevH = false; }
        else { out += pad(ss, n); prevH = false; }
      } else if (/^a$/i.test(t.ch) && /^AM\/PM/i.test(fmt.slice(fmt.toLowerCase().indexOf('am/pm')))) {
        out += hh < 12 ? 'AM' : 'PM'; i += 4;
      } else out += t.ch;
    }
    return out;
  }

  /**
   * Da formato a un valor.
   * @param v    número | texto | booleano | null
   * @param fmt  código de formato de Excel (por defecto General)
   * @param opts {locale:'es'|'en', minus:'−'}
   */
  function format(v, fmt, opts) {
    opts = opts || {};
    if (v == null) return '';
    if (typeof v === 'boolean') return v ? 'VERDADERO' : 'FALSO';
    if (typeof v !== 'number') return String(v);
    if (!fmt || fmt === 'General') return general(v, opts);
    var s = seps(opts.locale);
    var sections = fmt.split(';'), f = sections[0];
    if (v < 0 && sections[1]) f = sections[1];
    if (isTimeFormat(f)) return formatTime(v, f);
    var toks = tokenize(f), i, t, out = '', percent = 0, decimals = 0, seenDot = false, minInt = 0, useGrp = false, started = false, pre = '', post = '';
    // 1.er paso: analizar el patrón numérico
    toks.forEach(function (tk) {
      if (tk.ch === '%') percent++;
      if (tk.ch === '.') seenDot = true;
      else if (tk.ch === '0' || tk.ch === '#' || tk.ch === '?') { if (seenDot) decimals++; else if (tk.ch === '0') minInt++; }
      else if (tk.ch === ',' && started) useGrp = true;
      if (tk.ch === '0' || tk.ch === '#' || tk.ch === '?') started = true;
    });
    if (!started) return f.replace(/"/g, '');                    // sin dígitos: texto literal
    var x = v * Math.pow(100, percent > 0 ? 1 : 0) * (percent > 1 ? 100 : 1);
    var neg = x < 0, body = fixed(Math.abs(x), decimals), parts = body.split('.'), ip = parts[0], fp = parts[1] || '';
    if (Number(body) === 0) neg = false;
    if (ip === '0' && minInt === 0 && decimals > 0) ip = '';
    while (ip.length < minInt) ip = '0' + ip;
    if (useGrp) ip = group(ip, s.grp);
    // 2.º paso: emitir (literales antes/después del patrón y %)
    var emitted = false;
    for (i = 0; i < toks.length; i++) {
      t = toks[i];
      if (t.lit != null) { if (emitted) post += t.lit; else pre += t.lit; }
      else if ('0#?.,'.indexOf(t.ch) >= 0) emitted = true;
      else if (emitted) post += t.ch; else pre += t.ch;       // incluye el símbolo %
    }
    out = pre + ip + (decimals ? s.dec + fp : '') + post;
    if (neg && !sections[1]) out = (opts.minus || '-') + out;
    return out;
  }

  return { format: format, general: general, toText: toText, roundHalfAway: roundHalfAway, isTimeFormat: isTimeFormat, seps: seps };
});
