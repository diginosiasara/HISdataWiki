/*!
 * HISdata Wiki · widgets/contingencia.js
 * Responsabilidad ÚNICA: tabla de contingencia 2×2 interactiva.
 *  - Pestaña «Tabla general»: pulsar a, b, c o d explica la casilla y resalta su fila y su columna.
 *  - Pestañas de ejemplo: se rellena la tabla paso a paso (restas y sumas) y se comparan porcentajes.
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h;
  function N(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function P(x) { return (Math.round(x * 1000) / 10).toFixed(1).replace('.', ',').replace(/,0$/, '') + ' %'; }

  var LET = {
    a: { cell: [0, 0], t: 'a · Primera casilla', s: 'Fila 1 + Columna 1', d: 'Personas que cumplen la primera condición de la fila y la primera condición de la columna.' },
    b: { cell: [0, 1], t: 'b · Segunda casilla', s: 'Fila 1 + Columna 2', d: 'Personas que cumplen la primera condición de la fila y la segunda condición de la columna.' },
    c: { cell: [1, 0], t: 'c · Tercera casilla', s: 'Fila 2 + Columna 1', d: 'Personas que cumplen la segunda condición de la fila y la primera condición de la columna.' },
    d: { cell: [1, 1], t: 'd · Cuarta casilla', s: 'Fila 2 + Columna 2', d: 'Personas que cumplen la segunda condición de la fila y la segunda condición de la columna.' }
  };
  var EX = {
    hilo: {
      tab: 'Hilo dental y caries', title: 'Hilo dental y caries', n: 500,
      lead: '500 estudiantes. Dos grupos, dos preguntas: ¿usan hilo? ¿tienen caries? La tabla ordena las respuestas y la resta revela lo que falta.',
      cols: ['Con caries', 'Sin caries'], rows: ['Grupo A · Sin hilo', 'Grupo B · Con hilo'],
      vals: [[20, 180, 200], [15, 285, 300], [35, 465, 500]], given: [[1, 0, 1], [1, 0, 1], [0, 0, 1]],
      steps: [
        { t: 'Paso 1 · Sin caries · sin hilo', f: '200 − 20 = 180', c: [0, 1] },
        { t: 'Paso 2 · Sin caries · con hilo', f: '300 − 15 = 285', c: [1, 1] },
        { t: 'Paso 3 · Total con caries', f: '20 + 15 = 35', c: [2, 0] },
        { t: 'Paso 4 · Total sin caries', f: '180 + 285 = 465', c: [2, 1] },
        { t: 'Paso 5 · Comprobación final', f: '35 + 465 = 500', check: true }
      ],
      cmpTitle: '¿Qué porcentaje tiene caries?',
      cmp: [['Sin hilo', 20, 200], ['Con hilo', 15, 300]], insight: 'Sin hilo, el porcentaje de caries es el doble (10 % frente a 5 %).'
    },
    infec: {
      tab: 'Infecciones nosocomiales', title: 'Infecciones nosocomiales', n: 2700,
      lead: '2.700 pacientes ingresados. Aquí faltan más datos, así que el orden importa: primero completa los grupos y después los totales.',
      cols: ['Con infección', 'Sin infección'], rows: ['Afección respiratoria', 'Otras causas'],
      vals: [[583, 849, 1432], [314, 954, 1268], [897, 1803, 2700]], given: [[1, 0, 1], [1, 0, 0], [0, 0, 1]],
      steps: [
        { t: 'Paso 1 · Otras causas (total)', f: '2.700 − 1.432 = 1.268', c: [1, 2] },
        { t: 'Paso 2 · Respiratoria, sin infección', f: '1.432 − 583 = 849', c: [0, 1] },
        { t: 'Paso 3 · Otras causas, sin infección', f: '1.268 − 314 = 954', c: [1, 1] },
        { t: 'Paso 4 · Total con infección', f: '583 + 314 = 897', c: [2, 0] },
        { t: 'Paso 5 · Total sin infección', f: '849 + 954 = 1.803', c: [2, 1] },
        { t: 'Paso 6 · Comprobación final', f: '897 + 1.803 = 2.700', check: true }
      ],
      cmpTitle: '¿Qué porcentaje desarrolla infección?',
      cmp: [['Afección respiratoria', 583, 1432], ['Otras causas', 314, 1268], ['Todos los ingresos', 897, 2700]], insight: 'En los ingresos por afección respiratoria la tasa es unas 1,6 veces la del resto (40,7 % frente a 24,8 %).'
    }
  };

  HIS.widgets.register('contingencia', function (el) {
    var tab = 'general', letter = 'a', done = 0;
    var tabs = h('div.tm-filter.ct__tabs', { role: 'group', 'aria-label': 'Elegir tabla' }, [['general', 'Tabla general'], ['hilo', EX.hilo.tab], ['infec', EX.infec.tab]].map(function (t) {
      return h('button.chipb', { type: 'button', 'aria-pressed': String(t[0] === tab), 'data-t': t[0] }, t[1]);
    }));
    var live = h('p.sr-only-live', { role: 'status', 'aria-live': 'polite' });
    var panel = h('div.ct__panel');
    el.append(tabs, panel, live);

    /* ---------- Tabla general ---------- */
    function renderGeneral() {
      var L = LET[letter], hr = L.cell[0], hc = L.cell[1];
      function cell(r, c) {
        var k = r === 0 ? (c === 0 ? 'a' : 'b') : (c === 0 ? 'c' : 'd');
        return h('td' + (r === hr || c === hc ? '.is-hl' : ''), null, h('button.ct__letter', { type: 'button', 'aria-pressed': String(k === letter), 'aria-label': 'Casilla ' + k + ': ' + LET[k].s, 'data-l': k }, k));
      }
      function t(txt, r, c) { return h('td' + ((r === hr && c === 3) || (c === hc && r === 2) ? '.is-hl' : ''), null, txt); }
      var table = h('table.ct__table', null, h('caption', null, 'Tabla general · toca a, b, c o d'),
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, h('span.sr-only', null, 'Concepto')), h('th' + (hc === 0 ? '.is-hl' : ''), { scope: 'col' }, 'Variable 2 · opción 1'), h('th' + (hc === 1 ? '.is-hl' : ''), { scope: 'col' }, 'Variable 2 · opción 2'), h('th', { scope: 'col' }, 'Total'))),
        h('tbody', null,
          h('tr', null, h('th' + (hr === 0 ? '.is-hl' : ''), { scope: 'row' }, 'Variable 1 · opción 1'), cell(0, 0), cell(0, 1), t('a + b', 0, 3)),
          h('tr', null, h('th' + (hr === 1 ? '.is-hl' : ''), { scope: 'row' }, 'Variable 1 · opción 2'), cell(1, 0), cell(1, 1), t('c + d', 1, 3)),
          h('tr.is-total', null, h('th', { scope: 'row' }, 'Total'), t('a + c', 2, 0), t('b + d', 2, 1), h('td', null, 'a + b + c + d'))));
      var info = h('div.ct__info', { 'aria-live': 'polite' }, h('div.k', null, 'Ahora estás viendo'), h('h4', null, L.t), h('p', null, h('b', null, L.s)), h('p', null, L.d),
        h('ul.ct__sum', null, h('li', null, h('b', null, 'a + b'), 'Total de la primera fila'), h('li', null, h('b', null, 'a + c'), 'Total de la primera columna'), h('li', null, h('b', null, 'a + b + c + d'), 'Gran total: debe coincidir por filas y por columnas')));
      HIS.dom.clear(panel);
      panel.append(h('p.ct__lead', null, 'Dos variables, cuatro cruces y unos marginales que siempre deben cuadrar. Cada casilla es el cruce entre una fila y una columna.'),
        h('div.ct__grid', null, h('div', null, h('div.ct__tablewrap', null, table), h('p.ct__rule', null, h('b', null, 'Regla: '), 'el total de una fila o columna es la suma de sus valores.')), info));
      panel.querySelectorAll('.ct__letter').forEach(function (b) { b.addEventListener('click', function () { letter = b.getAttribute('data-l'); renderGeneral(); var nb = panel.querySelector('.ct__letter[data-l="' + letter + '"]'); if (nb) nb.focus(); HIS.a11y.announce('Casilla ' + LET[letter].t + '. ' + LET[letter].s + '.'); }); });
    }

    /* ---------- Ejemplos paso a paso ---------- */
    function renderExample(key) {
      var E = EX[key], total = E.steps.length;
      var filled = {};
      E.steps.slice(0, done).forEach(function (s) { if (s.c) filled[s.c[0] + ',' + s.c[1]] = 1; });
      var last = done > 0 ? E.steps[done - 1] : null, lastKey = last && last.c ? last.c[0] + ',' + last.c[1] : '';
      var isCheck = last && last.check;
      function td(r, c) {
        var shown = E.given[r][c] || filled[r + ',' + c], v = E.vals[r][c], k = r + ',' + c;
        var cls = !shown ? '.is-missing' : (k === lastKey ? '.is-new' : (isCheck && r === 2 ? '.is-check' : ''));
        return h('td' + cls, null, shown ? N(v) : h('span', { 'aria-label': 'dato que falta' }, '?'));
      }
      var table = h('table.ct__table', null, h('caption', null, E.title + ' · n = ' + N(E.n)),
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, h('span.sr-only', null, 'Concepto')), h('th', { scope: 'col' }, E.cols[0]), h('th', { scope: 'col' }, E.cols[1]), h('th', { scope: 'col' }, 'Total'))),
        h('tbody', null, [0, 1].map(function (r) { return h('tr', null, h('th', { scope: 'row' }, E.rows[r]), td(r, 0), td(r, 1), td(r, 2)); }),
          h('tr.is-total', null, h('th', { scope: 'row' }, 'Total'), td(2, 0), td(2, 1), td(2, 2))));
      var next = h('button.btn', { type: 'button' }, done >= total ? 'Tabla completa ✓' : 'Siguiente paso →'); next.disabled = done >= total;
      var all = h('button.btn.btn--ghost', { type: 'button' }, 'Mostrar todo'); all.disabled = done >= total;
      var reset = h('button.btn.btn--ghost', { type: 'button' }, 'Reiniciar'); reset.disabled = done === 0;
      var steps = h('ol.ct__steps', { 'aria-label': 'Pasos del cálculo' }, E.steps.map(function (s, i) {
        var on = i < done, now = i === done - 1;
        return h('li' + (on ? (now ? '.is-now' : '') : '.is-todo'), null, h('span.t', null, s.t), h('span.f', null, on ? s.f : '…'));
      }));
      var cmp = null;
      if (done >= total) {
        cmp = h('div', null, h('h4', null, E.cmpTitle), h('div.ct__bars', null, E.cmp.map(function (c) {
          var p = c[1] / c[2]; return h('div.ct__bar', null, h('b', null, h('span', null, c[0]), h('span', null, c[1] + ' de ' + N(c[2]) + ' · ' + P(p))), h('i', null, h('span', { style: 'width:' + Math.min(100, p * 100 * 2).toFixed(1) + '%' })));
        })), h('p.ct__insight', null, E.insight));
      } else cmp = h('p.ct__lead', null, 'Completa la tabla para comparar porcentajes entre grupos.');
      HIS.dom.clear(panel);
      panel.append(h('p.ct__lead', null, E.lead), h('div.ct__grid', null,
        h('div', null, h('div.ct__tablewrap', null, table), h('div.ct__controls', null, next, all, reset), h('p.ct__rule', null, h('b', null, 'Comprobación: '), 'el gran total debe coincidir sumando filas y sumando columnas.')),
        h('div', null, h('h4', null, 'Pasos, en orden'), steps)), cmp);
      function go(n) { done = n; renderExample(key); }
      next.addEventListener('click', function () { var s = E.steps[done]; go(done + 1); HIS.a11y.announce(s.t + ': ' + s.f + '.'); var nb = panel.querySelector('.ct__controls .btn'); if (nb && !nb.disabled) nb.focus(); });
      all.addEventListener('click', function () { go(total); HIS.a11y.announce('Tabla completa. ' + E.steps[total - 1].f + ': coincide.'); });
      reset.addEventListener('click', function () { go(0); HIS.a11y.announce('Tabla reiniciada.'); });
    }
    function render() { if (tab === 'general') renderGeneral(); else renderExample(tab); }
    tabs.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return; tab = b.getAttribute('data-t'); done = 0;
      [].forEach.call(tabs.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); render();
      HIS.a11y.announce('Mostrando: ' + b.textContent + '.');
    });
    render();
  });
})(window);
