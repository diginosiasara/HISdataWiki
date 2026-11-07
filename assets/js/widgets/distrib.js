/*!
 * HISdata Wiki · widgets/distrib.js
 * Widget «distrib»: explorador de una distribución continua (normal, uniforme, exponencial) con área sombreada = probabilidad.
 * Atributos: data-dist=normal|uniform|exp  data-p1 data-p2 (normal: μ,σ · uniforme: a,b · exp: μ=media)
 *            data-tipo=entre|menor|mayor  data-x1 data-x2  data-unit  data-var (nombre de la variable)  data-fixed=true (oculta sliders de parámetros)
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h, F = HIS.fmt, S = HIS.stats, U = HIS.ui;
  HIS.widgets.register('distrib', function (el, cfg) {
    var dist = cfg.dist || 'normal', unit = cfg.unit ? ' ' + cfg.unit : '', vname = cfg.var || 'X';
    var p1 = cfg.p1 != null ? cfg.p1 : (dist === 'exp' ? 6 : 0), p2 = cfg.p2 != null ? cfg.p2 : (dist === 'normal' ? 1 : 10);
    var tipo = cfg.tipo || 'entre';
    var span = dist === 'normal' ? 4 * p2 : dist === 'uniform' ? (p2 - p1) : 5 * p1;
    var x1v = cfg.x1 != null ? cfg.x1 : (dist === 'normal' ? p1 - p2 : dist === 'uniform' ? p1 + (p2 - p1) * 0.25 : 0);
    var x2v = cfg.x2 != null ? cfg.x2 : (dist === 'normal' ? p1 + p2 : dist === 'uniform' ? p1 + (p2 - p1) * 0.75 : p1);
    var grid = h('div.widget__grid.widget__grid--2'), ctl = h('div.controls'), out = h('div');
    var P1, P2;
    if (dist === 'normal') {
      P1 = U.slider({ label: 'Media (μ)', min: p1 - Math.max(1, Math.abs(p1)) * 0.6, max: p1 + Math.max(1, Math.abs(p1)) * 0.6, step: p2 >= 5 ? 1 : 0.1, value: p1, unit: cfg.unit, decimals: p2 >= 5 ? 0 : 1 });
      P2 = U.slider({ label: 'Desviación típica (σ)', min: Math.max(p2 * 0.3, 0.1), max: p2 * 2.5, step: p2 >= 5 ? 1 : 0.1, value: p2, unit: cfg.unit, decimals: p2 >= 5 ? 0 : 1 });
    } else if (dist === 'uniform') {
      P1 = U.slider({ label: 'Mínimo (a)', min: p1 - (p2 - p1), max: p2 - 1, step: 1, value: p1, unit: cfg.unit, decimals: 0 });
      P2 = U.slider({ label: 'Máximo (b)', min: p1 + 1, max: p2 + (p2 - p1), step: 1, value: p2, unit: cfg.unit, decimals: 0 });
    } else {
      P1 = U.slider({ label: 'Media (μ) = tiempo medio', min: 1, max: p1 * 3, step: 1, value: p1, unit: cfg.unit, decimals: 0 });
    }
    var T = U.select({ label: 'Probabilidad que quieres calcular', options: [{ value: 'entre', label: 'Entre dos valores: P(a ≤ ' + vname + ' ≤ b)' }, { value: 'menor', label: 'Menor que: P(' + vname + ' ≤ a)' }, { value: 'mayor', label: 'Mayor que: P(' + vname + ' ≥ a)' }], value: tipo });
    var XA = U.slider({ label: 'Valor a', min: 0, max: 1, step: 0.1, value: x1v, unit: cfg.unit });
    var XB = U.slider({ label: 'Valor b', min: 0, max: 1, step: 0.1, value: x2v, unit: cfg.unit });
    if (!cfg.fixed) { ctl.appendChild(P1.el); if (P2) ctl.appendChild(P2.el); }
    ctl.append(T.el, XA.el, XB.el);
    var sP = U.stat({ label: 'Probabilidad', value: '', tone: 'violet' }), sM = U.stat({ label: 'Media', value: '' }), sS = U.stat({ label: 'Desv. típica', value: '' }), sZ = U.stat({ label: 'Puntuación z', value: '' });
    var plotBox = h('div'), line = h('p.result-line', { role: 'status' });
    out.append(h('div.stats', null, sP.el, sM.el, sS.el, dist === 'normal' ? sZ.el : null), line, plotBox);
    grid.append(h('div', null, ctl), out); el.appendChild(grid);

    function params() { return dist === 'normal' ? { mu: P1.get(), s: P2.get() } : dist === 'uniform' ? { a: P1.get(), b: P2.get() } : { m: P1.get() }; }
    function domain(p) { return dist === 'normal' ? [p.mu - 4.2 * p.s, p.mu + 4.2 * p.s] : dist === 'uniform' ? [p.a - (p.b - p.a) * 0.2, p.b + (p.b - p.a) * 0.2] : [0, p.m * 5]; }
    function cdf(x, p) { return dist === 'normal' ? S.normCdf(x, p.mu, p.s) : dist === 'uniform' ? S.unifCdf(x, p.a, p.b) : S.expCdf(x, 1 / p.m); }
    function pdf(x, p) { return dist === 'normal' ? S.normPdf(x, p.mu, p.s) : dist === 'uniform' ? S.unifPdf(x, p.a, p.b) : S.expPdf(x, 1 / p.m); }
    var plot = null, first = true;
    function draw() {
      var p = params(), d = domain(p), t = T.get();
      XA.setRange(d[0], d[1]); XB.setRange(d[0], d[1]);
      var step = (d[1] - d[0]) / 100; XA.input.step = XB.input.step = step >= 1 ? 1 : step >= 0.1 ? 0.1 : 0.01;
      if (first) { XA.set(Math.min(Math.max(x1v, d[0]), d[1]), true); XB.set(Math.min(Math.max(x2v, d[0]), d[1]), true); first = false; }
      XB.el.hidden = t !== 'entre'; XA.el.querySelector('label').textContent = t === 'entre' ? 'Valor a' : 'Valor a';
      var a = XA.get(), b = XB.get(); if (t === 'entre' && b < a) { var tmp = a; a = b; b = tmp; }
      var lo, hi, pr, txt;
      if (t === 'entre') { lo = a; hi = b; pr = cdf(b, p) - cdf(a, p); txt = 'P(' + F.num(a, 2) + ' ≤ ' + vname + ' ≤ ' + F.num(b, 2) + ')'; }
      else if (t === 'menor') { lo = d[0]; hi = a; pr = cdf(a, p); txt = 'P(' + vname + ' ≤ ' + F.num(a, 2) + ')'; }
      else { lo = a; hi = d[1]; pr = 1 - cdf(a, p); txt = 'P(' + vname + ' ≥ ' + F.num(a, 2) + ')'; }
      var mean = dist === 'normal' ? p.mu : dist === 'uniform' ? (p.a + p.b) / 2 : p.m;
      var sd = dist === 'normal' ? p.s : dist === 'uniform' ? (p.b - p.a) / Math.sqrt(12) : p.m;
      sP.set(F.pct(pr, 2), txt); sM.set(F.num(mean, 2) + unit, dist === 'exp' ? 'μ = 1/λ' : ''); sS.set(F.num(sd, 2) + unit, '');
      if (dist === 'normal') { var z = (a - p.mu) / p.s; sZ.set(F.num(z, 2), 'de a = ' + F.num(a, 2)); }
      var msg = txt + ' = ' + F.pct(pr, 2) + '. Es decir, en unas ' + Math.round(pr * 100) + ' de cada 100 casos.';
      line.textContent = msg;
      var pts = dist === 'uniform' ? [[d[0], 0], [p.a, 0], [p.a, pdf(p.a + 1e-9, p)], [p.b, pdf(p.b - 1e-9, p)], [p.b, 0], [d[1], 0]] : null;
      var layers = [{ type: 'area', fn: pts ? null : function (x) { return pdf(x, p); }, pts: pts, from: lo, to: hi, color: 'violet', opacity: 0.35, label: 'Probabilidad = área' },
        { type: 'line', fn: pts ? null : function (x) { return pdf(x, p); }, pts: pts, color: 'violet', width: 2.5 },
        { type: 'vline', x: a, color: 'orange', label: 'a' }];
      if (t === 'entre') layers.push({ type: 'vline', x: b, color: 'blue', label: 'b' });
      if (dist === 'normal') layers.push({ type: 'vline', x: mean, color: 'muted', dash: '4 4', label: 'μ', labelAt: 'bottom' });
      var o = { title: 'Distribución ' + (dist === 'normal' ? 'normal' : dist === 'uniform' ? 'uniforme' : 'exponencial'), desc: msg + ' Media ' + F.num(mean, 2) + ', desviación típica ' + F.num(sd, 2) + '.',
        x: { min: d[0], max: d[1], label: vname + (cfg.unit ? ' (' + cfg.unit + ')' : '') }, y: { min: 0, max: 'auto', label: 'densidad f(x)' }, layers: layers, legend: false };
      if (!plot) plot = HIS.plot(plotBox, o); else plot.update(o);
      HIS.a11y.announce(msg);
    }
    [P1, P2, T, XA, XB].forEach(function (c) { if (c) c.onChange(draw); });
    draw();
  });
})(window);
