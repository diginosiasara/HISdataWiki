/*!
 * HISdata Wiki · widgets/empirica.js
 * Widget «empirica»: regla 68-95-99,7. Atributos: data-mu data-sigma data-unit data-var
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h, F = HIS.fmt, S = HIS.stats, U = HIS.ui;
  var BANDS = [[3, 'orange', 0.12], [2, 'blue', 0.2], [1, 'violet', 0.32]];
  HIS.widgets.register('empirica', function (el, cfg) {
    var mu0 = cfg.mu != null ? cfg.mu : 100, s0 = cfg.sigma != null ? cfg.sigma : 15, unit = cfg.unit ? ' ' + cfg.unit : '';
    var step = s0 >= 5 ? 1 : 0.1;
    var mu = U.slider({ label: 'Media (μ)', min: mu0 * 0.5, max: mu0 * 1.5, step: step, value: mu0, decimals: step === 1 ? 0 : 1, unit: cfg.unit });
    var sg = U.slider({ label: 'Desviación típica (σ)', min: Math.max(s0 * 0.3, 0.1), max: s0 * 2.5, step: step, value: s0, decimals: step === 1 ? 0 : 1, unit: cfg.unit });
    var tbody = h('tbody'), plot = h('div');
    var table = h('div.table-wrap', null, h('table.table.table--compact', null, h('caption', null, 'Rangos esperados según la regla empírica'),
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Intervalo'), h('th.num', { scope: 'col' }, '% de datos'), h('th', { scope: 'col' }, 'Rango'))), tbody));
    el.append(h('div.widget__grid.widget__grid--2', null, h('div.controls', null, mu.el, sg.el), h('div', null, plot, table)));
    var p = null;
    function draw() {
      var m = mu.get(), s = sg.get(); D(tbody);
      var summary = [];
      [1, 2, 3].forEach(function (k) {
        var pr = S.zCdf(k) - S.zCdf(-k), lo = m - k * s, hi = m + k * s;
        tbody.appendChild(h('tr', null, h('th', { scope: 'row' }, 'μ ± ' + k + 'σ'), h('td.num', null, F.pct(pr, 2)), h('td', null, F.num(lo, 1) + ' – ' + F.num(hi, 1) + unit)));
        summary.push('±' + k + ' sigma: ' + F.num(lo, 1) + ' a ' + F.num(hi, 1) + ', ' + F.num(pr * 100, 1) + ' por ciento');
      });
      var layers = BANDS.map(function (b) { return { type: 'band', from: m - b[0] * s, to: m + b[0] * s, color: b[1], opacity: b[2] }; });
      layers.push({ type: 'line', fn: function (t) { return S.normPdf(t, m, s); }, color: 'ink', width: 2.5 });
      layers.push({ type: 'vline', x: m, color: 'muted', dash: '4 4', label: 'μ', labelAt: 'bottom' });
      var o = { title: 'Regla empírica en N(' + F.num(m, 0) + ', ' + F.num(s, 0) + ')', desc: 'Campana con bandas a 1, 2 y 3 desviaciones típicas. ' + summary.join('. '), x: { min: m - 4 * s, max: m + 4 * s, label: cfg.var || 'x' }, y: { min: 0, max: 'auto', label: 'f(x)' }, legend: false, aspect: 0.42, layers: layers };
      if (!p) p = HIS.plot(plot, o); else p.update(o);
      HIS.a11y.announce(summary.join('. '));
    }
    function D(n) { HIS.dom.clear(n); }
    mu.onChange(draw); sg.onChange(draw); draw();
  });
})(window);
