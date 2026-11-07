/*!
 * Widget «laplace»: P(A) = casos favorables / casos posibles con ejemplos predefinidos y cuadrícula visual.
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h, F = HIS.fmt, U = HIS.ui;
  var EX = [{ v: 'dado', l: 'Dado: sacar un número par', f: 3, p: 6 }, { v: 'baraja', l: 'Baraja española: sacar un oro', f: 10, p: 40 }, { v: 'paciente', l: 'Hospital: paciente con alergia (12 de 200)', f: 12, p: 200 }, { v: 'moneda', l: 'Moneda: cara', f: 1, p: 2 }];
  HIS.widgets.register('laplace', function (el) {
    var sel = U.select({ label: 'Elige un ejemplo', options: EX.map(function (e) { return { value: e.v, label: e.l }; }) });
    var fav = U.number({ label: 'Casos favorables', min: 0, max: 400, step: 1, value: 3 }), pos = U.number({ label: 'Casos posibles', min: 1, max: 400, step: 1, value: 6 });
    var line = h('p.result-line', { role: 'status' }), grid = h('div.laplace__grid', { role: 'img' });
    el.append(h('div.widget__grid.widget__grid--eq', null, h('div.controls', null, sel.el, fav.el, pos.el), h('div', null, line, grid)));
    function draw() {
      var f = Math.max(0, Math.min(+fav.input.value || 0, +pos.input.value || 1)), p = Math.max(1, +pos.input.value || 1), pr = f / p;
      line.textContent = 'P(A) = ' + f + ' / ' + p + ' = ' + F.num(pr, 4) + ' = ' + F.pct(pr, 1);
      grid.setAttribute('aria-label', f + ' casos favorables de ' + p + ' posibles: ' + F.pct(pr, 1));
      HIS.dom.clear(grid); var show = Math.min(p, 200);
      for (var i = 0; i < show; i++) grid.appendChild(h('span.laplace__dot' + (i < Math.round(f * show / p) ? '.is-fav' : ''), { 'aria-hidden': 'true' }));
      HIS.a11y.announce(line.textContent);
    }
    sel.onChange(function (v) { var e = EX.filter(function (x) { return x.v === v; })[0]; fav.input.value = e.f; pos.input.value = e.p; draw(); });
    [fav.input, pos.input].forEach(function (i) { i.addEventListener('input', draw); });
    draw();
  });
})(window);
