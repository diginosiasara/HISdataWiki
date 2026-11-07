/*!
 * HISdata Wiki · widgets/muestreo.js
 * Widget «muestreo»: nube de 40 individuos y sorteo de muestras. data-mode = pob | tipos
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h;
  var M = {
    simple: ['Aleatorio simple', 'Todos tienen la misma probabilidad: se sortea sobre el listado.'],
    sistematico: ['Sistemático', 'Un inicio aleatorio y después uno de cada cinco.'],
    conglomerados: ['Por conglomerados', 'Se sortea un grupo natural completo (por ejemplo, un municipio).'],
    estratificado: ['Estratificado', 'Se sortea dentro de cada grupo, en proporción a su tamaño.'],
    bola: ['Bola de nieve', 'Un afectado lleva al siguiente, y este a otro: la red se amplía.'],
    cuotas: ['Por cuotas', 'Se eligen a mano individuos de cada grupo respetando su peso.'],
    intencional: ['Intencional', 'Solo entran quienes cumplen un perfil fijado de antemano.']
  };
  function pick(n, a) { var r = a.slice(), i, j, t; for (i = r.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = r[i]; r[i] = r[j]; r[j] = t; } return r.slice(0, n); }
  function range(a, b) { var r = []; for (; a < b; a++) r.push(a); return r; }
  HIS.widgets.register('muestreo', function (el, cfg) {
    var mode = cfg.mode === 'pob' ? 'pob' : 'tipos', cur = 'simple';
    var dots = range(0, 40).map(function (i) { return h('span.dot.g' + (i < 20 ? 0 : i < 32 ? 1 : 2), { 'data-i': String(i) }); });
    var grid = h('div.dw__g', { 'aria-hidden': 'true' }, dots);
    var txt = h('p.result-line', { role: 'status' });
    var tabs = null;
    function sel() {
      var s = [], ord = false, a;
      if (mode === 'pob') s = pick(10, range(0, 40));
      else if (cur === 'simple') s = pick(8, range(0, 40));
      else if (cur === 'sistematico') { for (a = Math.floor(Math.random() * 5); a < 40; a += 5) s.push(a); }
      else if (cur === 'conglomerados') { var g = Math.floor(Math.random() * 3); s = range(0, 40).filter(function (i) { return (i < 20 ? 0 : i < 32 ? 1 : 2) === g; }); }
      else if (cur === 'estratificado') s = pick(5, range(0, 20)).concat(pick(3, range(20, 32)), pick(2, range(32, 40)));
      else if (cur === 'bola') { var p = Math.floor(Math.random() * 40); s = [p]; ord = true; while (s.length < 8) { p = (p + 1 + Math.floor(Math.random() * 5)) % 40; if (s.indexOf(p) < 0) s.push(p); } }
      else if (cur === 'cuotas') s = range(0, 5).concat(range(20, 23), range(32, 34));
      else s = range(0, 40).filter(function (i) { return i % 5 === 0; });
      dots.forEach(function (d, i) { var k = s.indexOf(i); d.classList.toggle('on', k > -1); d.textContent = ord && k > -1 ? String(k + 1) : ''; });
      var msg = mode === 'pob' ? 'Toda la nube es la población; los puntos resaltados forman la muestra (' + s.length + ' de 40). Cada punto es un individuo.' : M[cur][0] + ': ' + M[cur][1] + ' Entran ' + s.length + ' de 40 individuos.';
      txt.textContent = msg; HIS.a11y.announce(msg);
    }
    if (mode === 'tipos') {
      tabs = h('div.chip-row', { role: 'group', 'aria-label': 'Tipo de muestreo' }, Object.keys(M).map(function (k, i) {
        return h('button.chipb', { type: 'button', 'aria-pressed': String(i === 0), 'data-m': k }, M[k][0]);
      }));
      tabs.addEventListener('click', function (ev) { var b = ev.target.closest('[data-m]'); if (!b) return; cur = b.getAttribute('data-m'); [].forEach.call(tabs.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); sel(); });
    }
    var roll = h('button.btn', { type: 'button' }, '↻ Repetir sorteo'); roll.addEventListener('click', sel);
    el.append(h('div.dw', null, tabs, h('p.muted', null, 'Tres grupos de colores = tres estratos o conglomerados (20, 12 y 8 individuos).'), grid, txt, roll));
    sel();
  });
})(window);
