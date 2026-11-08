/*!
 * HISdata Wiki · widgets/grafico.js
 * Widget «grafico»: gráficos de ejemplo (barras, histograma, polígono, ojiva, sectores) con elementos pulsables.
 * Atributo: data-kind = bars | hist | poly | ojiva | donut
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h;
  function f(x) { return Number(x).toLocaleString('es-ES', { maximumFractionDigits: 2 }); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  var VAC = [['Playa', 37], ['Montaña', 34], ['Pueblo', 17], ['Casa', 12]];
  var COL = [['[183, 190)', 186.5, 5], ['[190, 197)', 193.5, 5], ['[197, 204)', 200.5, 6], ['[204, 211)', 207.5, 6], ['[211, 218]', 214.5, 3]];
  var INFO = {
    bars: { t: 'Diagrama de barras', k: 'Vacaciones · personas', o: 'entre barra y barra hay aire: nada se toca.' },
    hist: { t: 'Histograma', k: 'Colesterol · intervalos', o: 'si los intervalos se tocan, las barras también.' },
    poly: { t: 'Polígono de frecuencias', k: 'Marcas de clase', o: 'cada punto está sobre su marca de clase.' },
    ojiva: { t: 'Curva acumulativa', k: 'Frecuencias acumuladas Fᵢ', o: 'siempre sube y acaba en n = 25.' },
    donut: { t: 'Diagrama de sectores', k: 'Reparto del total', o: 'el círculo completo son 360°.' }
  };
  function vals(k) { var s = 0; return k === 'bars' || k === 'donut' ? VAC.map(function (d) { return d[1]; }) : k === 'ojiva' ? COL.map(function (d) { return (s += d[2]); }) : COL.map(function (d) { return d[2]; }); }
  function items(k) {
    return vals(k).map(function (x, i) {
      var d = k === 'bars' || k === 'donut' ? VAC[i] : COL[i];
      if (k === 'bars') return { l: d[0] + ' · ' + x, r: d[0] + ': ' + x + ' personas eligieron este destino.' + (x === 37 ? ' Es la barra más alta.' : '') };
      if (k === 'donut') return { l: d[0] + ' · ' + x + ' %', r: d[0] + ': ' + x + ' % del total. Ángulo: ' + f(x * 3.6) + '°.' };
      if (k === 'hist') return { l: d[0] + ' · ' + x, r: d[0] + ': ' + x + ' personas · marca de clase ' + f(d[1]) + '.' };
      if (k === 'poly') return { l: f(d[1]) + ' · f = ' + x, r: 'Punto (' + f(d[1]) + ', ' + x + ') · intervalo ' + d[0] + '.' };
      return { l: f(d[1]) + ' · F = ' + x, r: 'Hasta ' + d[0] + ': ' + x + ' personas acumuladas (' + f(x * 4) + ' %).' };
    });
  }
  function svg(k) {
    var x0 = 36, x1 = 388, y0 = 214, yT = 22, hh0 = y0 - yT, o = '<svg viewBox="0 0 400 250" role="img" aria-label="' + esc(INFO[k].t) + ' de ejemplo" class="gf__svg">';
    if (k === 'donut') {
      var C = 2 * Math.PI * 70, s = 0; o += '<g transform="rotate(-90 200 125)">';
      VAC.forEach(function (d, i) { var L = C * d[1] / 100; o += '<circle class="shp k' + i + '" data-i="' + i + '" cx="200" cy="125" r="70" fill="none" stroke-width="40" stroke-dasharray="' + L + ' ' + (C - L) + '" stroke-dashoffset="' + (-s) + '"/>'; s += L; });
      return o + '</g><text x="200" y="124" class="gf__ct" text-anchor="middle">100</text><text x="200" y="144" class="gf__cs" text-anchor="middle">personas</text></svg>';
    }
    var V = vals(k), N = V.length, bw = (x1 - x0) / N, mx = k === 'bars' ? 40 : k === 'ojiva' ? 25 : 7, pts = [];
    for (var g = 0; g <= 4; g++) o += '<line class="gf__gl" x1="' + x0 + '" x2="' + x1 + '" y1="' + (y0 - hh0 * g / 4) + '" y2="' + (y0 - hh0 * g / 4) + '"/>';
    V.forEach(function (v, i) {
      var hh = v / mx * hh0, cx = x0 + i * bw + bw / 2, lb = k === 'bars' ? VAC[i][0] : k === 'hist' ? COL[i][0].replace(', ', ',') : f(COL[i][1]);
      if (k === 'bars' || k === 'hist') {
        var w = k === 'bars' ? bw * 0.6 : bw, x = k === 'bars' ? x0 + i * bw + bw * 0.2 : x0 + i * bw;
        o += '<rect class="shp k' + (k === 'hist' ? 0 : i % 4) + '" style="--i:' + i + '" data-i="' + i + '" x="' + x + '" y="' + (y0 - hh) + '" width="' + w + '" height="' + hh + '" rx="' + (k === 'bars' ? 5 : 0) + '"/><text class="gf__vl" x="' + cx + '" y="' + (y0 - hh - 6) + '" text-anchor="middle">' + v + '</text>';
      } else pts.push([cx, y0 - hh, i, v]);
      o += '<text class="gf__xl" x="' + cx + '" y="' + (y0 + 17) + '" text-anchor="middle">' + lb + '</text>';
    });
    if (pts.length) {
      o += '<polyline class="gf__ln" pathLength="1" fill="none" points="' + pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' ') + '"/>';
      pts.forEach(function (p) { o += '<circle class="shp k' + (p[2] % 4) + '" data-i="' + p[2] + '" cx="' + p[0] + '" cy="' + p[1] + '" r="8"/><text class="gf__vl" x="' + p[0] + '" y="' + (p[1] - 13) + '" text-anchor="middle">' + p[3] + '</text>'; });
    }
    return o + '<line class="gf__bl" x1="' + x0 + '" x2="' + x1 + '" y1="' + y0 + '" y2="' + y0 + '"/></svg>';
  }
  HIS.widgets.register('grafico', function (el, cfg) {
    var k = INFO[cfg.kind] ? cfg.kind : 'bars', it = items(k), box = h('div.gf__plot'), out = h('p.result-line', { role: 'status' }, 'Elige un elemento para ver su dato explicado.');
    box.innerHTML = svg(k);
    var chips = h('div.chip-row', { role: 'group', 'aria-label': 'Elegir un elemento del gráfico' }, it.map(function (x, i) {
      return h('button.chipb.k' + (i % 4), { type: 'button', 'aria-pressed': 'false', 'data-i': String(i) }, x.l);
    }));
    function sel(i) {
      [].forEach.call(chips.children, function (b, j) { b.setAttribute('aria-pressed', String(j === i)); });
      [].forEach.call(box.querySelectorAll('.shp'), function (s) { s.classList.toggle('sel', Number(s.getAttribute('data-i')) === i); });
      out.textContent = it[i].r; HIS.a11y.announce(it[i].r);
    }
    chips.addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (b) sel(Number(b.getAttribute('data-i'))); });
    box.addEventListener('click', function (ev) { var s = ev.target.closest('.shp'); if (s) sel(Number(s.getAttribute('data-i'))); });
    var rows = it.map(function (x) { return h('tr', null, h('td', null, x.l), h('td', null, x.r)); });
    el.append(h('div.gf', null, h('p.gf__k', null, INFO[k].k), box, h('p.muted', null, h('b', null, 'Observa: '), INFO[k].o), chips, out,
      h('details.fold', null, h('summary', null, 'Ver los datos del gráfico en una tabla'), h('div.table-wrap', { tabindex: '0', role: 'region', 'aria-label': 'Tabla (desplazable)' }, h('table.table', null, h('caption', null, INFO[k].t), h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Elemento'), h('th', { scope: 'col' }, 'Explicación'))), h('tbody', null, rows))))));
  });
})(window);
