/*!
 * Widget «dado»: laboratorio de la ley de los grandes números. Lanza un dado y compara frecuencias con la teoría (1/6).
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h, F = HIS.fmt, U = HIS.ui;
  HIS.widgets.register('dado', function (el) {
    var counts = [0, 0, 0, 0, 0, 0], n = 0, last = null;
    var face = h('div.dado__face', { 'aria-hidden': 'true' }, '⚀');
    var box = h('div'), line = h('p.result-line', { role: 'status' }, 'Pulsa «Lanzar» para empezar.');
    var btns = h('div.btn-row', null, [1, 10, 100, 1000].map(function (k) { return U.button('Lanzar ' + (k === 1 ? '1 vez' : k + ' veces'), function () { roll(k); }, k === 1 ? 'primary' : 'ghost'); }), U.button('Reiniciar', function () { counts = [0, 0, 0, 0, 0, 0]; n = 0; last = null; draw(); }, 'ghost'));
    el.append(btns, face, line, box);
    var plot = null;
    function roll(k) { for (var i = 0; i < k; i++) { var r = Math.floor(Math.random() * 6); counts[r]++; n++; last = r; } draw(); }
    function draw() {
      face.textContent = last == null ? '🎲' : String.fromCharCode(0x2680 + last);
      var data = counts.map(function (c, i) { return { label: String(i + 1), value: n ? c / n : 0, color: 'violet' }; });
      var msg = n ? 'Tras ' + n + ' lanzamientos, la frecuencia del 1 es ' + F.pct(counts[0] / n, 1) + ' y la teórica es ' + F.pct(1 / 6, 1) + '. Con más lanzamientos las barras se acercan a la línea.' : 'Aún no hay lanzamientos. La probabilidad teórica de cada cara es 1/6 = 16,7 %.';
      line.textContent = msg;
      var o = { title: 'Frecuencia relativa de cada cara del dado', desc: msg + ' Frecuencias: ' + counts.map(function (c, i) { return 'cara ' + (i + 1) + ': ' + (n ? F.pct(c / n, 1) : '0 %'); }).join('; ') + '.', x: { type: 'band', categories: ['1', '2', '3', '4', '5', '6'], label: 'Cara' }, y: { min: 0, max: 0.4, label: 'frecuencia relativa', format: function (v) { return F.num(v * 100, 0) + ' %'; } }, table: true,
        layers: [{ type: 'bars', data: data }, { type: 'hline', y: 1 / 6, color: 'orange', dash: '6 4', label: 'Teoría 1/6' }] };
      if (!plot) plot = HIS.plot(box, o); else plot.update(o);
      if (n) HIS.a11y.announce(msg);
    }
    draw();
  });
})(window);
