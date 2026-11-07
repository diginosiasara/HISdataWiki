/*!
 * Widget «tipificar»: z = (x − μ) / σ. Muestra N(μ,σ) y N(0,1) con la misma área sombreada.
 * data-mu data-sigma data-x data-unit data-var
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h, F = HIS.fmt, S = HIS.stats, U = HIS.ui;
  HIS.widgets.register('tipificar', function (el, cfg) {
    var mu0 = cfg.mu != null ? cfg.mu : 100, s0 = cfg.sigma != null ? cfg.sigma : 15, unit = cfg.unit || '';
    var mu = U.slider({ label: 'Media (μ)', min: mu0 * 0.5, max: mu0 * 1.5, step: s0 >= 5 ? 1 : 0.1, value: mu0, unit: unit, decimals: s0 >= 5 ? 0 : 1 });
    var sg = U.slider({ label: 'Desviación típica (σ)', min: Math.max(s0 * 0.3, 0.1), max: s0 * 2.5, step: s0 >= 5 ? 1 : 0.1, value: s0, unit: unit, decimals: s0 >= 5 ? 0 : 1 });
    var x = U.slider({ label: 'Valor observado (x)', min: mu0 - 4 * s0, max: mu0 + 4 * s0, step: 0.5, value: cfg.x != null ? cfg.x : mu0 + s0, unit: unit, decimals: 1 });
    var sz = U.stat({ label: 'Puntuación z', value: '', tone: 'violet' }), sp = U.stat({ label: 'P(X ≤ x)', value: '' }), sq = U.stat({ label: 'P(X ≥ x)', value: '', tone: 'orange' });
    var line = h('p.result-line', { role: 'status' }), b1 = h('div'), b2 = h('div');
    el.append(h('div.widget__grid.widget__grid--2', null, h('div.controls', null, mu.el, sg.el, x.el), h('div', null, h('div.stats', null, sz.el, sp.el, sq.el), line, h('h4', null, 'Variable original X ~ N(μ, σ)'), b1, h('h4', null, 'Tipificada Z ~ N(0, 1)'), b2)));
    var p1 = null, p2 = null;
    function draw() {
      var m = mu.get(), s = sg.get(); x.setRange(m - 4 * s, m + 4 * s); var xv = x.get(), z = (xv - m) / s, p = S.zCdf(z);
      sz.set(F.num(z, 2), 'z = (x − μ)/σ'); sp.set(F.pct(p, 2), ''); sq.set(F.pct(1 - p, 2), '');
      var rel = Math.abs(z) < 1 ? 'dentro de una desviación típica de la media' : Math.abs(z) < 2 ? 'entre una y dos desviaciones de la media' : 'muy alejado de la media (más de 2 desviaciones)';
      var msg = 'z = (' + F.num(xv, 1) + ' − ' + F.num(m, 1) + ') / ' + F.num(s, 1) + ' = ' + F.num(z, 2) + ': el valor está ' + rel + '. P(X ≤ x) = ' + F.pct(p, 2) + '.';
      line.textContent = msg;
      var o1 = { title: 'Normal original', desc: msg, x: { min: m - 4 * s, max: m + 4 * s, label: cfg.var || 'x' }, y: { min: 0, max: 'auto', label: 'f(x)' }, legend: false, aspect: 0.38, layers: [{ type: 'area', fn: function (t) { return S.normPdf(t, m, s); }, from: m - 4 * s, to: xv, color: 'blue', opacity: 0.4 }, { type: 'line', fn: function (t) { return S.normPdf(t, m, s); }, color: 'blue', width: 2.5 }, { type: 'vline', x: xv, color: 'orange', label: 'x' }, { type: 'vline', x: m, color: 'muted', dash: '4 4', label: 'μ', labelAt: 'bottom' }] };
      var o2 = { title: 'Normal estándar', desc: 'Misma área, z = ' + F.num(z, 2), x: { min: -4, max: 4, label: 'z' }, y: { min: 0, max: 0.45, label: 'f(z)' }, legend: false, aspect: 0.38, layers: [{ type: 'area', fn: function (t) { return S.normPdf(t, 0, 1); }, from: -4, to: Math.max(-4, Math.min(4, z)), color: 'violet', opacity: 0.4 }, { type: 'line', fn: function (t) { return S.normPdf(t, 0, 1); }, color: 'violet', width: 2.5 }, { type: 'vline', x: Math.max(-4, Math.min(4, z)), color: 'orange', label: 'z' }, { type: 'vline', x: 0, color: 'muted', dash: '4 4' }] };
      if (!p1) { p1 = HIS.plot(b1, o1); p2 = HIS.plot(b2, o2); } else { p1.update(o1); p2.update(o2); }
      HIS.a11y.announce(msg);
    }
    [mu, sg, x].forEach(function (c) { c.onChange(draw); }); draw();
  });
})(window);
