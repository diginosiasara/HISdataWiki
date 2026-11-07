/*!
 * HISdata Wiki · widgets/percentil.js
 * Widget «percentil»: posición de un percentil k en n datos ordenados.
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h, U = HIS.ui;
  function f(x) { return Number(x).toLocaleString('es-ES', { maximumFractionDigits: 2 }); }
  HIS.widgets.register('percentil', function (el) {
    var n = U.number({ label: 'Número de datos (n)', value: 25, min: 1, max: 1000, step: 1 });
    var k = U.slider({ label: 'Percentil (k)', min: 1, max: 99, step: 1, value: 90, decimals: 0 });
    var out = h('p.result-line', { role: 'status' }), track = h('i'), trk = h('div.trk', { 'aria-hidden': 'true' }, track);
    el.append(h('div.widget__grid.widget__grid--2', null, h('div.controls', null, n.el, k.el), h('div', null, trk, out)));
    function draw() {
      var N = Math.max(1, Math.round(n.get()) || 1), K = k.get(), x = K * N / 100, p = Math.ceil(x);
      var d = K <= 15 ? 'Posición baja: casi todos quedan por delante.' : K >= 85 ? 'Muy por encima de la mayoría: solo un pequeño grupo queda por delante.' : K >= 40 && K <= 60 ? 'En la zona de la media.' : 'Zona intermedia.';
      track.style.left = K + '%';
      var msg = 'P' + K + ': ' + K + ' · ' + N + ' / 100 = ' + f(x) + ' → posición ' + p + ' de ' + N + '. El ' + K + ' % de los datos queda por debajo y el ' + (100 - K) + ' % por encima. ' + d;
      out.textContent = msg; HIS.a11y.announce(msg);
    }
    n.onChange(draw); k.onChange(draw); draw();
  });
})(window);
