/*!
 * HISdata Wiki · widgets/caso-muestra.js
 * Responsabilidad ÚNICA: comparador de dos casos (estatinas / artrosis) con selector y control de pacientes.
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h;
  var OPTS = [['all', 'Ver ambos'], ['1', 'Solo caso 1'], ['2', 'Solo caso 2']];
  HIS.widgets.register('caso-muestra', function (el) {
    var cards = [].slice.call(el.querySelectorAll('.cs-card')), grid = el.querySelector('.cs-grid');
    var bar = h('div.tm-filter', { role: 'group', 'aria-label': 'Elegir qué caso ver' }, OPTS.map(function (o, i) {
      return h('button.chipb', { type: 'button', 'aria-pressed': String(i === 0), 'data-c': o[0] }, o[1]);
    }));
    el.insertBefore(bar, el.firstChild);
    bar.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return; var k = b.getAttribute('data-c');
      cards.forEach(function (c) { c.hidden = !(k === 'all' || c.getAttribute('data-case') === k); });
      grid.classList.toggle('cs-grid--one', k !== 'all');
      [].forEach.call(bar.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      HIS.a11y.announce(k === 'all' ? 'Se muestran los dos casos.' : 'Se muestra solo el caso ' + k + '.');
    });
    var rng = el.querySelector('input[type="range"]'), ppl = [].slice.call(el.querySelectorAll('.cs-people li')), out = el.querySelector('.cs-pick__out');
    if (rng) {
      var paint = function () {
        var n = Number(rng.value); ppl.forEach(function (p, i) { p.classList.toggle('on', i === n - 1); });
        var t = 'Paciente ' + n + ' de 50'; rng.setAttribute('aria-valuetext', t); if (out) out.textContent = t + ' · cada silueta es un individuo.';
      };
      rng.addEventListener('input', paint); paint();
    }
  });
})(window);
