/*!
 * HISdata Wiki · widgets/muestrales.js
 * Widget «muestrales»: explorador de χ², t de Student y F con valor crítico.
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h, F = HIS.fmt, S = HIS.stats, U = HIS.ui;
  HIS.widgets.register('muestrales', function (el) {
    var dist = U.select({ label: 'Distribución', options: [{ value: 'chi', label: 'χ² (ji-cuadrado)' }, { value: 't', label: 't de Student' }, { value: 'f', label: 'F de Snedecor' }] });
    var d1 = U.slider({ label: 'Grados de libertad', min: 1, max: 40, step: 1, value: 4, decimals: 0 });
    var d2 = U.slider({ label: 'Grados de libertad del denominador (gl₂)', min: 1, max: 60, step: 1, value: 10, decimals: 0 });
    var al = U.select({ label: 'Nivel (área a la izquierda del valor crítico)', options: [{ value: '0.90', label: '90 %' }, { value: '0.95', label: '95 %' }, { value: '0.975', label: '97,5 % (t: IC 95 %)' }, { value: '0.99', label: '99 %' }], value: '0.95' });
    var sc = U.stat({ label: 'Valor crítico', value: '', tone: 'violet' }), sm = U.stat({ label: 'Media teórica', value: '' });
    var line = h('p.result-line', { role: 'status' }), box = h('div');
    el.append(h('div.widget__grid.widget__grid--2', null, h('div.controls', null, dist.el, d1.el, d2.el, al.el), h('div', null, h('div.stats', null, sc.el, sm.el), line, box)));
    var p = null;
    function draw() {
      var k = dist.get(), a = d1.get(), b = d2.get(), q = Number(al.get()), f, crit, xmax, ymax = 'auto', mean, name, layers = [];
      d2.el.hidden = k !== 'f';
      if (k === 'chi') { f = function (x) { return S.chi2Pdf(x, a); }; crit = S.chi2Inv(q, a); xmax = Math.max(crit * 1.6, a + 6 * Math.sqrt(2 * a)); mean = a; name = 'χ² con ' + a + ' gl'; }
      else if (k === 't') { f = function (x) { return S.tPdf(x, a); }; crit = S.tInv(q, a); xmax = Math.max(Math.abs(crit) * 1.6, 4.5); mean = a > 1 ? 0 : NaN; name = 't con ' + a + ' gl'; layers.push({ type: 'line', fn: function (x) { return S.normPdf(x, 0, 1); }, color: 'muted', dash: '5 4', width: 2, label: 'Normal N(0,1)' }); }
      else { f = function (x) { return S.fPdf(x, a, b); }; crit = S.fInv(q, a, b); xmax = Math.max(crit * 2, 5); ymax = 1.2; mean = b > 2 ? b / (b - 2) : NaN; name = 'F con ' + a + ' y ' + b + ' gl'; }
      var xmin = k === 't' ? -xmax : 0;
      layers.unshift({ type: 'area', fn: f, from: crit, to: xmax, color: 'orange', opacity: 0.4, label: 'Cola derecha ' + F.num((1 - q) * 100, 1) + ' %' }, { type: 'line', fn: f, color: 'violet', width: 3, label: name }, { type: 'vline', x: crit, color: 'orange', label: F.num(crit, 3) });
      sc.set(F.num(crit, 3), name); sm.set(isFinite(mean) ? F.num(mean, 2) : '—', k === 'chi' ? 'media = gl' : k === 't' ? 'media = 0' : 'media = gl₂/(gl₂−2)');
      var msg = name + ': valor crítico ' + F.num(crit, 3) + ' (deja a su izquierda el ' + F.num(q * 100, 1) + ' % del área).';
      line.textContent = msg;
      var o = { title: name, desc: msg, x: { min: xmin, max: xmax, label: 'x' }, y: { min: 0, max: ymax, label: 'densidad' }, legend: true, aspect: 0.5, layers: layers };
      if (!p) p = HIS.plot(box, o); else p.update(o);
      HIS.a11y.announce(msg);
    }
    [dist, d1, d2, al].forEach(function (c) { c.onChange(draw); }); draw();
  });
})(window);
