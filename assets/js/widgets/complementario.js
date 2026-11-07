/*!
 * Widget «complementario»: P(Ā) = 1 − P(A) con barra apilada.
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h, F = HIS.fmt, U = HIS.ui;
  HIS.widgets.register('complementario', function (el, cfg) {
    var s = U.slider({ label: cfg.label || 'P(A): probabilidad de que ocurra A', min: 0, max: 1, step: 0.01, value: cfg.p != null ? cfg.p : 0.3, decimals: 2 });
    var a = h('div.stackbar__a'), b = h('div.stackbar__b'), bar = h('div.stackbar', { role: 'img' }, a, b), line = h('p.result-line', { role: 'status' });
    el.append(s.el, bar, line);
    function draw() {
      var p = s.get();
      a.style.width = (p * 100) + '%'; b.style.width = ((1 - p) * 100) + '%'; a.textContent = p > 0.08 ? 'A ' + F.num(p * 100, 0) + ' %' : ''; b.textContent = p < 0.92 ? 'No A ' + F.num((1 - p) * 100, 0) + ' %' : '';
      line.textContent = 'P(A) + P(no A) = ' + F.num(p, 2) + ' + ' + F.num(1 - p, 2) + ' = 1. Por tanto P(no A) = 1 − ' + F.num(p, 2) + ' = ' + F.num(1 - p, 2) + '.';
      bar.setAttribute('aria-label', 'A ocupa ' + F.num(p * 100, 0) + ' por ciento y no A ' + F.num((1 - p) * 100, 0) + ' por ciento');
      HIS.a11y.announce(line.textContent);
    }
    s.onChange(draw); draw();
  });
})(window);
