/*! HISdata Wiki · widgets/dispersion.js — varianza y desviación típica paso a paso */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h;
  function f(x, d) { return Number(x).toLocaleString('es-ES', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }); }
  HIS.widgets.register('dispersion', function (el, cfg) {
    var def = (cfg.data || '92,105,110,92,99,95,92,108,110,92,97,103,92,94,100,105,112,103,99,90,93,105,105,100,96');
    var id = HIS.dom.uid('dp');
    var inp = h('input', { id: id, type: 'text', value: def, inputmode: 'decimal', autocomplete: 'off', 'aria-describedby': id + '-h' });
    var out = h('div.dp__out'), live = h('p.sr-only-live', { role: 'status', 'aria-live': 'polite' });
    var den = 'n1';
    var rb = h('div.dp__den', { role: 'group', 'aria-label': 'Denominador' });
    [['n1', 'Muestra: ÷ (n − 1)'], ['n', 'Población: ÷ n']].forEach(function (o) {
      var b = h('button.chipb', { type: 'button', 'aria-pressed': o[0] === den ? 'true' : 'false' }, o[1]);
      b.addEventListener('click', function () { den = o[0]; Array.prototype.forEach.call(rb.children, function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); }); draw(); });
      rb.append(b);
    });
    el.append(h('div.dp', null,
      h('label', { for: id }, 'Tus datos (separados por comas)'), inp,
      h('p.muted', { id: id + '-h' }, 'Cambia los números y mira cómo se mueven las distancias a la media.'), rb, out, live));
    function draw() {
      var raw = inp.value.replace(/\s+/g, ' ').split(/[,;]\s*|\s+/).map(function (t) { return Number(t.replace(',', '.')); }).filter(function (v) { return isFinite(v); });
      out.textContent = '';
      if (raw.length < 2) { out.append(h('p', { role: 'alert' }, 'Escribe al menos dos números.')); return; }
      var n = raw.length, m = raw.reduce(function (a, b) { return a + b; }, 0) / n;
      var ss = raw.reduce(function (a, x) { return a + (x - m) * (x - m); }, 0), dv = den === 'n1' ? n - 1 : n, v = ss / dv, s = Math.sqrt(v);
      var min = Math.min.apply(null, raw), max = Math.max.apply(null, raw), pad = (max - min) * .08 || 1, lo = min - pad, hi = max + pad;
      var X = function (x) { return 20 + (x - lo) / (hi - lo) * 560; };
      var svg = '<svg viewBox="0 0 600 120" role="img" aria-label="Recta numérica con los datos y la media; los segmentos son las distancias a la media" focusable="false"><line x1="20" y1="70" x2="580" y2="70" class="ax"/>';
      raw.forEach(function (x, i) { svg += '<line class="dist" pathLength="1" style="--k:' + i + '" x1="' + X(m) + '" y1="70" x2="' + X(x) + '" y2="' + (40 - (i % 4) * 7) + '"/><circle class="pt" cx="' + X(x) + '" cy="' + (40 - (i % 4) * 7) + '" r="5"/>'; });
      svg += '<line class="mean" pathLength="1" x1="' + X(m) + '" y1="22" x2="' + X(m) + '" y2="92"/><text x="' + X(m) + '" y="110" text-anchor="middle">media = ' + f(m) + '</text>';
      svg += '<rect class="sd" x="' + X(m - s) + '" y="76" width="' + (X(m + s) - X(m - s)) + '" height="8" rx="4"/></svg>';
      var rows = raw.slice(0, 8).map(function (x) { return '<tr><td>' + f(x, x % 1 ? 2 : 0) + '</td><td>' + f(x - m) + '</td><td>' + f((x - m) * (x - m)) + '</td></tr>'; }).join('');
      var more = n > 8 ? '<tr><td colspan="3">… y ' + (n - 8) + ' filas más</td></tr>' : '';
      out.innerHTML = '<figure class="dp__fig">' + svg + '<figcaption>Cada segmento es la distancia de un dato a la media. La franja morada mide ± 1 desviación típica.</figcaption></figure>' +
        '<div class="table-wrap" tabindex="0" role="region" aria-label="Tabla paso a paso (desplazable)"><table class="table"><caption>Paso a paso (primeras filas)</caption><thead><tr><th scope="col">Dato xᵢ</th><th scope="col">xᵢ − x̄</th><th scope="col">(xᵢ − x̄)²</th></tr></thead><tbody>' + rows + more + '</tbody></table></div>' +
        '<ul class="dp__res"><li><span>n</span><b>' + n + '</b></li><li><span>Media x̄</span><b>' + f(m) + '</b></li><li><span>Σ(xᵢ − x̄)²</span><b>' + f(ss) + '</b></li><li><span>Varianza s²</span><b>' + f(v) + '</b></li><li class="hl"><span>Desviación típica s</span><b>' + f(s) + '</b></li></ul>' +
        '<p class="dp__f">s² = ' + f(ss) + ' ÷ ' + dv + ' = ' + f(v) + ' → s = √' + f(v) + ' = ' + f(s) + '</p>';
      live.textContent = 'Media ' + f(m) + '. Varianza ' + f(v) + '. Desviación típica ' + f(s) + '.';
    }
    inp.addEventListener('input', draw); draw();
  });
})(window);
