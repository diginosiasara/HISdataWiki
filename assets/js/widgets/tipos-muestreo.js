/*!
 * HISdata Wiki · widgets/tipos-muestreo.js
 * Responsabilidad ÚNICA: filtrar las 7 tarjetas de muestreo por grupo (Todos · Aleatorios · Por grupos · Dirigidos).
 * El contenido de las tarjetas ya está en el HTML (SEO y sin JS); aquí solo se añaden los filtros.
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h;
  var GROUPS = [['all', 'Todos · 7'], ['a', 'Aleatorios · 1–4'], ['g', 'Por grupos · 3–4–6'], ['d', 'Dirigidos · 5–7']];
  HIS.widgets.register('tipos-muestreo', function (el) {
    var cards = [].slice.call(el.querySelectorAll('.tm-card'));
    var count = h('p.tm-count', { role: 'status' });
    var bar = h('div.tm-filter', { role: 'group', 'aria-label': 'Filtrar los tipos de muestreo' }, GROUPS.map(function (g, i) {
      return h('button.chipb', { type: 'button', 'aria-pressed': String(i === 0), 'data-g': g[0] }, g[1]);
    }));
    el.insertBefore(count, el.firstChild); el.insertBefore(bar, el.firstChild);
    function apply(key, say) {
      var n = 0;
      cards.forEach(function (c) { var ok = key === 'all' || (' ' + c.getAttribute('data-g') + ' ').indexOf(' ' + key + ' ') > -1; c.hidden = !ok; if (ok) n++; });
      [].forEach.call(bar.children, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-g') === key)); });
      var msg = 'Mostrando ' + n + ' de 7 tipos de muestreo.'; count.textContent = msg; if (say) HIS.a11y.announce(msg);
    }
    bar.addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (b) apply(b.getAttribute('data-g'), true); });
    /* Los enlaces de la escala llevan a una tarjeta: si estaba oculta, se restablece el filtro. */
    document.addEventListener('click', function (ev) { if (ev.target.closest('.tm-scale a')) apply('all', false); });
    apply('all', false);
  });
})(window);
