/*!
 * Widget «pictograma»: 100 casos, cuántos cumplen P(X ≤ x) para una exponencial (tiempo hasta un suceso).
 * data-mu (media) data-x (umbral) data-unit data-noun (p. ej. «avisos») data-ok («llegan antes») data-ko («tardan más»)
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h, F = HIS.fmt, S = HIS.stats, U = HIS.ui;
  HIS.widgets.register('pictograma', function (el, cfg) {
    var unit = cfg.unit || 'min';
    var mu = U.slider({ label: 'Tiempo medio (μ)', min: 1, max: cfg.mu * 3, step: 1, value: cfg.mu, unit: unit, decimals: 0 });
    var x = U.slider({ label: 'Umbral de tiempo (x)', min: 1, max: cfg.mu * 4, step: 1, value: cfg.x, unit: unit, decimals: 0 });
    var grid = h('div.picto', { role: 'img' }), line = h('p.result-line', { role: 'status' });
    el.append(h('div.widget__grid.widget__grid--eq', null, h('div.controls', null, mu.el, x.el), h('div', null, grid, line, h('p.widget__sub', null, '🟢 = ' + (cfg.ok || 'cumple') + ' · 🔴 = ' + (cfg.ko || 'no cumple') + ' (de cada 100 ' + (cfg.noun || 'casos') + ')'))));
    function draw() {
      var p = S.expCdf(x.get(), 1 / mu.get()), n = Math.round(p * 100);
      HIS.dom.clear(grid);
      for (var i = 0; i < 100; i++) grid.appendChild(h('span.picto__i.' + (i < n ? 'is-on' : 'is-off'), { 'aria-hidden': 'true' }));
      var msg = 'P(X ≤ ' + x.get() + ' ' + unit + ') = 1 − e^(−' + x.get() + '/' + mu.get() + ') = ' + F.pct(p, 1) + ' → unos ' + n + ' de cada 100 ' + (cfg.noun || 'casos') + ' ' + (cfg.ok || 'cumplen') + '.';
      line.textContent = msg; grid.setAttribute('aria-label', n + ' de 100 ' + (cfg.ok || 'cumplen')); HIS.a11y.announce(msg);
    }
    mu.onChange(draw); x.onChange(draw); draw();
  });
})(window);
