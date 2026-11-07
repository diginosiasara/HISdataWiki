/*!
 * HISdata Wiki · widgets/forma.js
 * Widget «forma»: galería de formas (simétrica, asimetrías, lepto/platicúrtica) frente a la normal de referencia.
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h, S = HIS.stats, U = HIS.ui;
  function beta(x, a, b) { if (x <= 0 || x >= 1) return 0; return Math.exp(S.lgamma(a + b) - S.lgamma(a) - S.lgamma(b) + (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x)); }
  // cada forma se estandariza visualmente en el eje -4..4 con media aprox. 0
  var SHAPES = [
    { v: 'sim', l: 'Simétrica (normal)', d: 'Dos mitades espejo. Media = mediana = moda.', f: function (x) { return S.normPdf(x, 0, 1); } },
    { v: 'pos', l: 'Asimetría positiva (cola a la derecha)', d: 'Datos concentrados en valores bajos y cola larga hacia los altos. Media > mediana. Ej.: estancias hospitalarias.', f: function (x) { var k = 3, s = Math.sqrt(2 * k); return s * S.chi2Pdf(k + x * s, k); } },
    { v: 'neg', l: 'Asimetría negativa (cola a la izquierda)', d: 'Concentrada en valores altos y cola hacia los bajos. Media < mediana.', f: function (x) { var k = 3, s = Math.sqrt(2 * k); return s * S.chi2Pdf(k - x * s, k); } },
    { v: 'lep', l: 'Leptocúrtica (más apuntada)', d: 'Pico alto y colas pesadas: muchos datos muy cerca de la media y algunos extremos.', f: function (x) { var v = 4, s = Math.sqrt(v / (v - 2)); return s * S.tPdf(x * s, v); } },
    { v: 'pla', l: 'Platicúrtica (más plana)', d: 'Más dispersa y aplanada, sin pico marcado.', f: function (x) { var sd = Math.sqrt(1 / 20); return beta(x * sd + 0.5, 2, 2) * sd; } }
  ];
  HIS.widgets.register('forma', function (el) {
    var sel = U.select({ label: 'Forma de la distribución', options: SHAPES.map(function (s) { return { value: s.v, label: s.l }; }) });
    var txt = h('p.result-line', { role: 'status' }), box = h('div');
    el.append(h('div.widget__grid.widget__grid--2', null, h('div.controls', null, sel.el, txt), box));
    var p = null;
    function draw() {
      var s = SHAPES.filter(function (q) { return q.v === sel.get(); })[0];
      txt.textContent = s.d;
      var o = { title: s.l, desc: s.d + ' Se compara con la campana normal punteada.', x: { min: -4, max: 4, label: 'valor estandarizado' }, y: { min: 0, max: 0.8, label: 'densidad' }, legend: true, aspect: 0.5,
        layers: [{ type: 'area', fn: s.f, from: -4, to: 4, color: 'violet', opacity: 0.25 }, { type: 'line', fn: s.f, color: 'violet', width: 3, label: s.l }, { type: 'line', fn: function (x) { return S.normPdf(x, 0, 1); }, color: 'muted', dash: '5 4', width: 2, label: 'Normal de referencia' }] };
      if (!p) p = HIS.plot(box, o); else p.update(o);
      HIS.a11y.announce(s.l + '. ' + s.d);
    }
    sel.onChange(draw); draw();
  });
})(window);
