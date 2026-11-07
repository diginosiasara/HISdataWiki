/*!
 * Widget «tabla-z»: tabla interactiva de la normal estándar Φ(z) = P(Z ≤ z), con campana sombreada y búsqueda inversa.
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h, F = HIS.fmt, S = HIS.stats, U = HIS.ui;
  HIS.widgets.register('tabla-z', function (el, cfg) {
    var z0 = cfg.z != null ? cfg.z : 1.96, zin = U.number({ label: 'Valor z', min: -4, max: 4, step: 0.01, value: z0 });
    var pin = U.number({ label: 'o probabilidad acumulada (0–1) → z', min: 0.0001, max: 0.9999, step: 0.001, value: S.zCdf(z0) });
    var line = h('p.result-line', { role: 'status' }), box = h('div'), plot = null, tbl = h('table.ztable'), sel = null;
    var cap = h('caption.sr-only', null, 'Tabla de la distribución normal estándar: filas z con un decimal, columnas segunda cifra decimal'); tbl.appendChild(cap);
    var head = h('tr', null, h('th', { scope: 'col' }, 'z')); for (var c = 0; c < 10; c++) head.appendChild(h('th', { scope: 'col' }, '0,0' + c)); tbl.appendChild(h('thead', null, head));
    var tb = h('tbody'); tbl.appendChild(tb);
    for (var r = 0; r <= 39; r++) {
      var tr = h('tr', null, h('th', { scope: 'row' }, F.num(r / 10, 1)));
      for (c = 0; c < 10; c++) (function (z) { var td = h('td', { dataset: { z: z.toFixed(2) } }, h('button', { type: 'button', 'aria-label': 'z = ' + F.num(z, 2) + ', probabilidad ' + F.num(S.zCdf(z), 4) }, F.num(S.zCdf(z), 4))); td.firstChild.addEventListener('click', function () { zin.input.value = z.toFixed(2); pin.input.value = S.zCdf(z).toFixed(4); draw(z, td); }); tr.appendChild(td); })(r / 10 + c / 100);
      tb.appendChild(tr);
    }
    var wrap = h('div.table-wrap.is-scroll', { tabindex: '0', role: 'region', 'aria-label': 'Tabla z, desplázate para ver más valores' }, tbl);
    el.append(h('div.widget__grid.widget__grid--eq', null, h('div.controls', null, zin.el, pin.el, h('p.widget__sub', null, 'Para z negativos usa la simetría: Φ(−z) = 1 − Φ(z).'), line, box), wrap));
    function draw(z, td) {
      if (sel) sel.classList.remove('is-sel'); sel = td || tb.querySelector('td[data-z="' + Math.abs(z).toFixed(2) + '"]'); if (sel && z >= 0) sel.classList.add('is-sel');
      var p = S.zCdf(z);
      var msg = 'P(Z ≤ ' + F.num(z, 2) + ') = ' + F.num(p, 4) + ' (' + F.pct(p, 2) + '). P(Z ≥ ' + F.num(z, 2) + ') = ' + F.num(1 - p, 4) + '. P(−|z| ≤ Z ≤ |z|) = ' + F.pct(2 * S.zCdf(Math.abs(z)) - 1, 2) + '.';
      line.textContent = msg;
      var o = { title: 'Normal estándar N(0,1)', desc: msg, x: { min: -4, max: 4, label: 'z' }, y: { min: 0, max: 0.45, label: 'f(z)' }, legend: false, layers: [{ type: 'area', fn: function (x) { return S.normPdf(x, 0, 1); }, from: -4, to: z, color: 'violet', opacity: 0.4 }, { type: 'line', fn: function (x) { return S.normPdf(x, 0, 1); }, color: 'violet', width: 2.5 }, { type: 'vline', x: z, color: 'orange' }] };
      if (!plot) plot = HIS.plot(box, o); else plot.update(o);
      HIS.a11y.announce(msg);
    }
    zin.input.addEventListener('input', function () { var z = Math.max(-4, Math.min(4, +zin.input.value || 0)); pin.input.value = S.zCdf(z).toFixed(4); draw(z); });
    pin.input.addEventListener('input', function () { var p = +pin.input.value; if (p > 0 && p < 1) { var z = S.zInv(p); zin.input.value = z.toFixed(2); draw(z); } });
    draw(z0);
  });
})(window);
