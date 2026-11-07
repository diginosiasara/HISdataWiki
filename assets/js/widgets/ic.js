/*!
 * HISdata Wiki · widgets/ic.js
 * Widget «ic»: calculadora de intervalo de confianza para la media (z o t).
 * Atributos: data-mean data-sd data-n data-level (90|95|99) data-modo (z|t) data-unit
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h, F = HIS.fmt, S = HIS.stats, U = HIS.ui;
  HIS.widgets.register('ic', function (el, cfg) {
    var unit = cfg.unit ? ' ' + cfg.unit : '';
    var mean = U.number({ label: 'Media muestral (x̄)', value: cfg.mean != null ? cfg.mean : 100, step: 'any' });
    var sd = U.number({ label: cfg.modo === 't' ? 'Desviación típica muestral (s)' : 'Desviación típica (σ)', value: cfg.sd != null ? cfg.sd : 10, min: 0.0001, step: 'any' });
    var n = U.number({ label: 'Tamaño de la muestra (n)', value: cfg.n != null ? cfg.n : 30, min: 2, step: 1 });
    var lvl = U.select({ label: 'Nivel de confianza', options: [{ value: '90', label: '90 %' }, { value: '95', label: '95 %' }, { value: '99', label: '99 %' }], value: String(cfg.level || 95) });
    var mode = U.select({ label: 'Valor crítico', options: [{ value: 'z', label: 'z (σ conocida o n grande)' }, { value: 't', label: 't de Student (σ desconocida, n pequeña)' }], value: cfg.modo || 'z' });
    var sLo = U.stat({ label: 'Límite inferior', value: '', tone: 'violet' }), sHi = U.stat({ label: 'Límite superior', value: '', tone: 'violet' }), sM = U.stat({ label: 'Margen de error', value: '', tone: 'orange' });
    var steps = h('ol.flow'), line = h('p.result-line', { role: 'status' }), box = h('div');
    el.append(h('div.widget__grid.widget__grid--2', null, h('div.controls', null, mean.el, sd.el, n.el, lvl.el, mode.el), h('div', null, h('div.stats', null, sLo.el, sM.el, sHi.el), line, box, steps)));
    var p = null;
    function calc() {
      var m = mean.get(), s = sd.get(), nn = Math.round(n.get()), conf = Number(lvl.get()) / 100, md = mode.get();
      if (!(s > 0) || !(nn >= 2) || !isFinite(m)) { line.textContent = 'Introduce una media, una desviación típica positiva y n ≥ 2.'; return; }
      var crit = md === 'z' ? S.zInv(1 - (1 - conf) / 2) : S.tInv(1 - (1 - conf) / 2, nn - 1);
      var se = s / Math.sqrt(nn), marg = crit * se, lo = m - marg, hi = m + marg;
      sLo.set(F.num(lo, 2)); sHi.set(F.num(hi, 2)); sM.set('± ' + F.num(marg, 2), 'crítico × error típico');
      HIS.dom.clear(steps);
      [['Error típico', 'σ/√n = ' + F.num(s, 2) + '/√' + nn + ' = ' + F.num(se, 3)], ['Valor crítico', (md === 'z' ? 'z' : 't (' + (nn - 1) + ' gl)') + ' = ' + F.num(crit, 3)], ['Margen', F.num(crit, 3) + ' × ' + F.num(se, 3) + ' = ' + F.num(marg, 2)], ['Intervalo', F.num(m, 2) + ' ± ' + F.num(marg, 2)]].forEach(function (r) { steps.appendChild(h('li', null, h('b', null, r[0]), r[1])); });
      var msg = 'Intervalo de confianza al ' + (conf * 100) + ' %: de ' + F.num(lo, 2) + ' a ' + F.num(hi, 2) + unit + '.';
      line.textContent = msg;
      var pad = Math.max(marg * 3, s / Math.sqrt(nn) * 4);
      var o = { title: 'Intervalo de confianza', desc: msg + ' La media muestral es ' + F.num(m, 2) + '.', x: { min: m - pad, max: m + pad, label: 'valor' }, y: { min: 0, max: 1, label: '', ticks: 0 }, legend: false, aspect: 0.22,
        layers: [{ type: 'band', from: lo, to: hi, color: 'violet', opacity: 0.3 }, { type: 'vline', x: lo, color: 'violet' }, { type: 'vline', x: hi, color: 'violet' }, { type: 'vline', x: m, color: 'orange', label: 'x̄', labelAt: 'top' }] };
      if (!p) p = HIS.plot(box, o); else p.update(o);
      HIS.a11y.announce(msg);
    }
    [mean, sd, n, lvl, mode].forEach(function (c) { c.onChange(calc); }); calc();
  });
})(window);
