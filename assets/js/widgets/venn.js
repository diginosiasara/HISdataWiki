/*!
 * Widget «venn»: diagrama de Venn de dos sucesos con P(A), P(B), P(A∩B) → unión, solo A, solo B, ninguno.
 * Atributos: data-pa data-pb data-pab data-na data-nb (nombres) data-indep=true (fija P(A∩B)=P(A)·P(B))
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h, F = HIS.fmt, U = HIS.ui, NS = 'http://www.w3.org/2000/svg';
  function s(tag, a, kids) { var e = document.createElementNS(NS, tag); Object.keys(a || {}).forEach(function (k) { e.setAttribute(k, a[k]); }); (kids || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }); return e; }
  HIS.widgets.register('venn', function (el, cfg) {
    var na = cfg.na || 'A', nb = cfg.nb || 'B';
    var pa = U.slider({ label: 'P(' + na + ')', min: 0, max: 1, step: 0.01, value: cfg.pa != null ? cfg.pa : 0.5, decimals: 2 });
    var pb = U.slider({ label: 'P(' + nb + ')', min: 0, max: 1, step: 0.01, value: cfg.pb != null ? cfg.pb : 0.4, decimals: 2 });
    var ind = U.toggle({ label: 'Sucesos independientes: P(A∩B) = P(A)·P(B)', checked: !!cfg.indep });
    var pab = U.slider({ label: 'P(' + na + ' ∩ ' + nb + ') · intersección', min: 0, max: 1, step: 0.01, value: cfg.pab != null ? cfg.pab : 0.2, decimals: 2 });
    var svg = s('svg', { viewBox: '0 0 440 260', role: 'img', focusable: 'false' }), tt = s('title', { id: HIS.dom.uid('vt') }), dd = s('desc', { id: HIS.dom.uid('vd') });
    svg.append(tt, dd); svg.setAttribute('aria-labelledby', tt.id + ' ' + dd.id);
    var rect = s('rect', { x: 4, y: 4, width: 432, height: 252, rx: 14, fill: 'var(--surface-2)', stroke: 'var(--line-strong)' });
    var cA = s('circle', { cy: 130, r: 90, fill: 'var(--c-violet)', 'fill-opacity': 0.35, stroke: 'var(--c-violet)', 'stroke-width': 3 });
    var cB = s('circle', { cy: 130, r: 90, fill: 'var(--c-orange)', 'fill-opacity': 0.35, stroke: 'var(--c-orange)', 'stroke-width': 3 });
    var tA = s('text', { y: 28, 'font-weight': 700, fill: 'var(--c-violet-ink)', 'text-anchor': 'middle' }), tB = s('text', { y: 28, 'font-weight': 700, fill: 'var(--c-orange-ink)', 'text-anchor': 'middle' });
    var vA = s('text', { y: 135, 'text-anchor': 'middle', fill: 'var(--ink)', 'font-weight': 700 }), vB = s('text', { y: 135, 'text-anchor': 'middle', fill: 'var(--ink)', 'font-weight': 700 }), vI = s('text', { y: 135, 'text-anchor': 'middle', fill: 'var(--ink)', 'font-weight': 700 }), vN = s('text', { x: 420, y: 246, 'text-anchor': 'end', fill: 'var(--muted)', 'font-size': 13 });
    svg.append(rect, cA, cB, tA, tB, vA, vB, vI, vN);
    var st = h('div.stats', null);
    var sU = U.stat({ label: 'Unión P(A∪B)', value: '', tone: 'violet' }), sA = U.stat({ label: 'Solo A', value: '' }), sB = U.stat({ label: 'Solo B', value: '', tone: 'orange' }), sN = U.stat({ label: 'Ninguno', value: '', tone: 'red' });
    st.append(sU.el, sA.el, sB.el, sN.el);
    var line = h('p.result-line', { role: 'status' });
    el.append(h('div.widget__grid.widget__grid--2', null, h('div.controls', null, pa.el, pb.el, ind.el, pab.el), h('div.venn-box', null, svg, st, line)));
    function draw() {
      var a = pa.get(), b = pb.get(), i;
      var lo = Math.max(0, a + b - 1), hi = Math.min(a, b);
      if (ind.get()) { i = a * b; pab.set(Math.round(i * 100) / 100, true); } else { i = Math.min(Math.max(pab.get(), lo), hi); if (i !== pab.get()) pab.set(Math.round(i * 100) / 100, true); }
      pab.input.disabled = ind.get(); pab.input.min = lo; pab.input.max = hi;
      var u = a + b - i, onlyA = a - i, onlyB = b - i, none = 1 - u;
      var rA = 62 + 28 * a, rB = 62 + 28 * b, d = 200 - (i / Math.max(Math.min(a, b), 0.001)) * 140 * Math.min(a, b) * 1.0;
      var dist = Math.max(40, 150 - 110 * (hi ? i / hi : 0)); var cx = 220;
      cA.setAttribute('r', rA); cB.setAttribute('r', rB); cA.setAttribute('cx', cx - dist / 2); cB.setAttribute('cx', cx + dist / 2);
      tA.setAttribute('x', cx - dist / 2 - rA * 0.4); tA.textContent = na; tB.setAttribute('x', cx + dist / 2 + rB * 0.4); tB.textContent = nb;
      vA.setAttribute('x', cx - dist / 2 - rA * 0.45); vA.textContent = F.pct(onlyA, 0); vB.setAttribute('x', cx + dist / 2 + rB * 0.45); vB.textContent = F.pct(onlyB, 0);
      vI.setAttribute('x', cx + (rA - rB) / 2 * 0.2); vI.textContent = i > 0.005 ? F.pct(i, 0) : ''; vN.textContent = 'Ninguno: ' + F.pct(none, 0);
      sU.set(F.pct(u, 1), 'P(A)+P(B)−P(A∩B)'); sA.set(F.pct(onlyA, 1), 'P(A) − P(A∩B)'); sB.set(F.pct(onlyB, 1), 'P(B) − P(A∩B)'); sN.set(F.pct(none, 1), '1 − P(A∪B)');
      var msg = 'P(' + na + '∪' + nb + ') = ' + F.num(a, 2) + ' + ' + F.num(b, 2) + ' − ' + F.num(i, 2) + ' = ' + F.num(u, 2) + '. Solo ' + na + ': ' + F.pct(onlyA, 1) + '; solo ' + nb + ': ' + F.pct(onlyB, 1) + '; ambos: ' + F.pct(i, 1) + '; ninguno: ' + F.pct(none, 1) + '.';
      line.textContent = msg; tt.textContent = 'Diagrama de Venn de ' + na + ' y ' + nb; dd.textContent = msg; HIS.a11y.announce(msg);
    }
    [pa, pb, ind, pab].forEach(function (c) { c.onChange(draw); }); draw();
  });
})(window);
