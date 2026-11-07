/*!
 * Widget «escala-prob»: la probabilidad como escala de 0 (imposible) a 1 (seguro), con equivalencias en % y «1 de cada n».
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h, F = HIS.fmt, U = HIS.ui;
  var steps = [[0, 'Suceso imposible'], [0.05, 'Muy improbable'], [0.25, 'Poco probable'], [0.5, 'Igual de probable que no (cara o cruz)'], [0.75, 'Bastante probable'], [0.95, 'Muy probable'], [1, 'Suceso seguro']];
  HIS.widgets.register('escala-prob', function (el, cfg) {
    var s = U.slider({ label: 'Probabilidad P(A)', min: 0, max: 1, step: 0.01, value: cfg.p != null ? cfg.p : 0.5, decimals: 2 });
    var mark = h('div.prob-bar__mark', { 'aria-hidden': 'true' }), bar = h('div.prob-bar', { role: 'img', 'aria-label': 'Escala de probabilidad de 0, imposible, a 1, seguro' }, mark);
    var line = h('p.result-line', { role: 'status' });
    var ex = h('p', { 'aria-live': 'off' });
    el.append(s.el, bar, h('div.chip-row', { 'aria-hidden': 'true' }, h('span.pill', null, '0 = imposible'), h('span.pill', null, '0,5 = 50 %'), h('span.pill', null, '1 = seguro')), line, ex);
    function draw() {
      var p = s.get(), best = steps[0];
      steps.forEach(function (st) { if (p >= st[0] - 1e-9) best = st; });
      mark.style.left = (p * 100) + '%';
      var uno = p > 0 ? '1 de cada ' + F.num(1 / p, p > 0.5 ? 1 : 0) : '—';
      line.textContent = 'P = ' + F.num(p, 2) + ' = ' + F.num(p * 100, 0) + ' % · ' + (p > 0 ? 'aprox. ' + uno + ' veces · ' : '') + best[1];
      ex.textContent = 'Ejemplo: si P(A) = ' + F.num(p, 2) + ' y repites el experimento 100 veces, A ocurrirá de media unas ' + Math.round(p * 100) + ' veces.';
      HIS.a11y.announce(line.textContent);
    }
    s.onChange(draw); draw();
  });
})(window);
