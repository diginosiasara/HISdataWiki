/*!
 * HISdata Wiki · widgets/calculadora.js
 * Widget «calculadora»: estadísticos descriptivos con datos del usuario.
 * data-mode = central | cuart | frec | interv · data-data = datos iniciales (opcional)
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h;
  function f(x) { return Number(x).toLocaleString('es-ES', { maximumFractionDigits: 2 }); }
  var DEF = { central: '92 105 110 92 99 95 92 108 110 92 97 103 92 94 100 105 112 103 99 90 93 105 105 100 96', frec: '0 3 2 0 2 1 4 0 3 0 1 2 4 0 3 2 0 1 3 2 2 2 3 4 0 2 3 2 1 0', interv: '190 202 185 210 198 205 192 200 188 215 195 207 183 203 211 189 197 204 206 193 208 187 199 212 194' };
  DEF.cuart = DEF.central;
  function stat(label, val, sub, tone) { return h('div.stat.stat--' + tone, null, h('span.stat__label', null, label), h('span.stat__value', null, val), h('span.stat__sub', null, sub)); }
  function strip(a, m) { return h('div.strip', { 'aria-hidden': 'true' }, a.map(function (v, i) { var c = m && m[i]; return h('span.chp' + (c ? '.' + c[0] : ''), null, f(v), c && c[1] ? h('small', null, c[1]) : null); })); }
  function table(cap, head, rows) {
    return h('div.table-wrap', { tabindex: '0', role: 'region', 'aria-label': 'Tabla (desplazable)' }, h('table.table', null, h('caption', null, cap), h('thead', null, h('tr', null, head.map(function (x) { return h('th', { scope: 'col' }, x); }))),
      h('tbody', null, rows.map(function (r) { return h('tr' + (/^total/i.test(r[0]) ? '.is-total' : ''), null, r.map(function (c, i) { return i ? h('td', null, c) : h('th', { scope: 'row' }, c); })); }))));
  }
  HIS.widgets.register('calculadora', function (el, cfg) {
    var mode = DEF[cfg.mode] ? cfg.mode : 'central', id = HIS.dom.uid('calc');
    var ta = h('textarea', { id: id, rows: '3', spellcheck: 'false' }); ta.value = cfg.data ? String(cfg.data) : DEF[mode];
    var out = h('div', { 'aria-live': 'polite' });
    el.append(h('div.cw', null, h('label', { for: id }, 'Tus datos ', h('small', null, '(sepáralos con espacios o punto y coma; coma = decimal)')), ta, out));
    function run() {
      var a = ta.value.split(/[\s;]+/).map(function (x) { return parseFloat(x.replace(',', '.')); }).filter(isFinite).sort(function (x, y) { return x - y; }), n = a.length;
      HIS.dom.clear(out);
      if (n < 2) { out.append(h('p.callout.callout--note', null, 'Escribe al menos dos números.')); return; }
      var sum = a.reduce(function (s, x) { return s + x; }, 0), mean = sum / n, med = n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2, cn = {};
      a.forEach(function (x) { cn[x] = (cn[x] || 0) + 1; });
      var mc = Math.max.apply(null, Object.keys(cn).map(function (k) { return cn[k]; })), mo = Object.keys(cn).filter(function (k) { return cn[k] === mc; }).map(Number);
      function q(k) { var p = Math.ceil(k * n / 4); return [p, a[p - 1]]; }
      var node = null, msg = '';
      if (mode === 'central') {
        var m = a.map(function (x) { var c = []; if (x === med) c.push('med'); if (mc > 1 && mo.indexOf(x) > -1) c.push('mo'); return c.length ? [c.join('.')] : null; });
        node = h('div', null, h('div.stats', null,
          stat('Media x̄', f(mean), 'Suma = ' + f(sum) + ' → ' + f(sum) + ' ÷ ' + n, 'violet'),
          stat('Mediana Me', f(med), n % 2 ? 'n = ' + n + ' es impar: dato de la posición ' + (n + 1) / 2 : 'n par: media de las posiciones ' + n / 2 + ' y ' + (n / 2 + 1), 'orange'),
          stat('Moda Mo', mc > 1 ? mo.map(f).join(' y ') : '—', mc > 1 ? 'Se repite ' + mc + ' veces' : 'Ningún valor se repite', 'teal')),
          h('p.muted', null, 'Datos ordenados (n = ' + n + '): la mediana en naranja y la moda en verde.'), strip(a, m));
        msg = 'Media ' + f(mean) + ', mediana ' + f(med) + (mc > 1 ? ', moda ' + mo.map(f).join(' y ') : ', sin moda');
      } else if (mode === 'cuart') {
        var Q = [q(1), q(2), q(3)]; Q[1] = [Q[1][0], med];
        var m2 = a.map(function (x, i) { var t = -1; Q.forEach(function (z, j) { if (z[0] === i + 1) t = j; }); return t > -1 ? ['qq', 'Q' + (t + 1)] : null; });
        node = h('div', null, h('div.stats', null,
          stat('Q1 · 25 %', f(Q[0][1]), 'n/4 = ' + f(n / 4) + ' → posición ' + Q[0][0], 'violet'),
          stat('Q2 · mediana', f(med), 'Q2 = P50 = mediana', 'orange'),
          stat('Q3 · 75 %', f(Q[2][1]), '3n/4 = ' + f(3 * n / 4) + ' → posición ' + Q[2][0], 'teal'),
          stat('IQR = Q3 − Q1', f(Q[2][1] - Q[0][1]), 'Rango = ' + f(a[n - 1] - a[0]), 'blue')),
          h('p.muted', null, 'Del 1.º al ' + n + '.º dato. Si la posición no es entera se redondea al alza.'), strip(a, m2));
        msg = 'Q1 ' + f(Q[0][1]) + ', mediana ' + f(med) + ', Q3 ' + f(Q[2][1]);
      } else if (mode === 'frec') {
        var ks = Object.keys(cn).map(Number).sort(function (x, y) { return x - y; });
        if (ks.length > 15) { out.append(h('p.callout.callout--note', null, 'Hay ' + ks.length + ' valores distintos: agrúpalos en intervalos (ficha «Datos agrupados en intervalos»).')); return; }
        var F = 0, rows = ks.map(function (k) { F += cn[k]; return [f(k), String(cn[k]), f(cn[k] / n), String(F), f(F / n)]; }); rows.push(['Total', String(n), '1', '—', '—']);
        node = h('div', null, table('Tabla de frecuencias · n = ' + n, ['xᵢ', 'fᵢ', 'hᵢ', 'Fᵢ', 'Hᵢ'], rows), h('p', null, 'Comprobación: Σfᵢ = ' + n + ' = n ✓ · Σhᵢ = 1 ✓ · última Fᵢ = n ✓'));
        msg = 'Tabla con ' + ks.length + ' valores distintos y n igual a ' + n;
      } else {
        var mn = a[0], mx = a[n - 1], R = mx - mn, K = Math.max(1, Math.floor(1 + 3.322 * Math.log10(n))), A = Math.ceil(R / K), s0 = Math.floor(mn);
        while (s0 + K * A < mx) A++;
        var F2 = 0, rows2 = [];
        for (var i = 0; i < K; i++) { var lo = s0 + i * A, hi = lo + A, c = a.filter(function (x) { return x >= lo && (x < hi || (i === K - 1 && x <= hi)); }).length; F2 += c; rows2.push([(i === K - 1 ? '[' + f(lo) + ', ' + f(hi) + ']' : '[' + f(lo) + ', ' + f(hi) + ')'), f((lo + hi) / 2), String(c), f(c / n), String(F2), f(F2 / n)]); }
        node = h('div', null, h('div.stats', null, stat('Rango R', f(R), f(mx) + ' − ' + f(mn), 'violet'), stat('Sturges K', String(K), '1 + 3,322 · log ' + n + ' = ' + f(1 + 3.322 * Math.log10(n)), 'orange'), stat('Amplitud A', String(A), 'R/K = ' + f(R / K) + ' → se sube al entero', 'teal')),
          table('Intervalos · n = ' + n, ['Intervalo', 'c', 'fᵢ', 'hᵢ', 'Fᵢ', 'Hᵢ'], rows2), K % 2 === 0 ? h('p.muted', null, 'Con el criterio de número impar de intervalos se usarían ' + (K + 1) + '.') : null);
        msg = 'Rango ' + f(R) + ', ' + K + ' intervalos de amplitud ' + A;
      }
      out.append(node); HIS.a11y.announce(msg);
    }
    ta.addEventListener('input', run); run();
  });
})(window);
