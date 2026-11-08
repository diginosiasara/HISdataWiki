/*! HISdata Wiki · widgets/caja.js — diagrama de cajas y bigotes interactivo */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h;
  function f(x) { return Number(x).toLocaleString('es-ES', { maximumFractionDigits: 2 }); }
  HIS.widgets.register('caja', function (el, cfg) {
    var def = cfg.data || '92,105,110,92,99,95,92,108,110,92,97,103,92,94,100,105,112,103,99,90,93,105,105,100,96';
    var id = HIS.dom.uid('bx');
    var inp = h('input', { id: id, type: 'text', value: def, autocomplete: 'off' });
    var add = h('button.btn.btn--ghost', { type: 'button' }, 'Añadir un valor atípico (140)');
    var reset = h('button.btn.btn--ghost', { type: 'button' }, 'Restablecer');
    var out = h('div.bx__out'), live = h('p.sr-only-live', { role: 'status', 'aria-live': 'polite' });
    el.append(h('div.bx', null, h('label', { for: id }, 'Tus datos (separados por comas)'), inp, h('div.bx__btns', null, add, reset), out, live));
    add.addEventListener('click', function () { inp.value = inp.value.replace(/\s*,?\s*$/, '') + ', 140'; draw(); });
    reset.addEventListener('click', function () { inp.value = def; draw(); });
    function q(a, k) { return a[Math.min(a.length, Math.ceil(a.length * k)) - 1]; }
    function draw() {
      var a = inp.value.split(/[,;]\s*|\s+/).map(function (t) { return Number(t.replace(',', '.')); }).filter(isFinite).sort(function (x, y) { return x - y; });
      out.textContent = '';
      if (a.length < 4) { out.append(h('p', { role: 'alert' }, 'Escribe al menos cuatro números.')); return; }
      var Q1 = q(a, .25), Q2 = q(a, .5), Q3 = q(a, .75), R = Q3 - Q1, lf = Q1 - 1.5 * R, uf = Q3 + 1.5 * R;
      var inside = a.filter(function (v) { return v >= lf && v <= uf; }), wl = inside[0], wu = inside[inside.length - 1], outl = a.filter(function (v) { return v < lf || v > uf; });
      var lo = Math.min(a[0], lf > a[0] ? a[0] : lf) - 3, hi = Math.max(a[a.length - 1], wu) + 4, X = function (v) { return 30 + (v - lo) / (hi - lo) * 540; };
      var s = '<svg viewBox="0 0 600 150" role="img" aria-label="Diagrama de cajas: mínimo sin atípicos ' + f(wl) + ', Q1 ' + f(Q1) + ', mediana ' + f(Q2) + ', Q3 ' + f(Q3) + ', máximo sin atípicos ' + f(wu) + (outl.length ? ', atípicos: ' + outl.map(f).join(', ') : ', sin atípicos') + '" focusable="false">';
      s += '<line class="wh" pathLength="1" x1="' + X(wl) + '" y1="62" x2="' + X(Q1) + '" y2="62"/><line class="wh" pathLength="1" x1="' + X(Q3) + '" y1="62" x2="' + X(wu) + '" y2="62"/><line class="wh" pathLength="1" x1="' + X(wl) + '" y1="48" x2="' + X(wl) + '" y2="76"/><line class="wh" pathLength="1" x1="' + X(wu) + '" y1="48" x2="' + X(wu) + '" y2="76"/>';
      s += '<rect class="box" x="' + X(Q1) + '" y="38" width="' + (X(Q3) - X(Q1)) + '" height="48" rx="6"/><line class="med" x1="' + X(Q2) + '" y1="38" x2="' + X(Q2) + '" y2="86"/>';
      outl.forEach(function (v) { s += '<circle class="out" cx="' + X(v) + '" cy="62" r="6"/>'; });
      [[wl, 'mín'], [Q1, 'Q1'], [Q2, 'Q2'], [Q3, 'Q3'], [wu, 'máx']].forEach(function (p) { s += '<text x="' + X(p[0]) + '" y="112" text-anchor="middle">' + p[1] + '</text><text class="v" x="' + X(p[0]) + '" y="130" text-anchor="middle">' + f(p[0]) + '</text>'; });
      outl.forEach(function (v) { s += '<text class="v" x="' + X(v) + '" y="30" text-anchor="middle">atípico ' + f(v) + '</text>'; });
      s += '</svg>';
      out.innerHTML = '<figure class="bx__fig">' + s + '<figcaption>Caja: de Q1 a Q3 con la mediana. Bigotes: hasta el dato más lejano dentro de 1,5 · RIC. Puntos: atípicos.</figcaption></figure>' +
        '<ul class="dp__res"><li><span>Q1 · Q2 · Q3</span><b>' + f(Q1) + ' · ' + f(Q2) + ' · ' + f(Q3) + '</b></li><li><span>RIC = Q3 − Q1</span><b>' + f(R) + '</b></li><li><span>Límites (1,5 · RIC)</span><b>' + f(lf) + ' a ' + f(uf) + '</b></li><li class="hl"><span>Valores atípicos</span><b>' + (outl.length ? outl.map(f).join(', ') : 'ninguno') + '</b></li></ul>' +
        '<p class="muted">Cuartiles con el criterio del manual: se calcula la posición (n/4, n/2, 3n/4) y se redondea al alza.</p>';
      live.textContent = 'Q1 ' + f(Q1) + ', mediana ' + f(Q2) + ', Q3 ' + f(Q3) + '. ' + (outl.length ? 'Atípicos: ' + outl.map(f).join(', ') + '.' : 'Sin valores atípicos.');
    }
    inp.addEventListener('input', draw); draw();
  });
})(window);
