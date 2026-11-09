/*! HISdata Wiki · widgets/lab-posicion.js — laboratorio visual: centro, cuartiles, percentil y cajas con unos mismos datos */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h;
  var DEF = '92 105 110 92 99 95 92 108 110 92 97 103 92 94 100 105 103 90 93 105 105 100 96 99 112';
  var S = { a: [], raw: [], subs: [] };
  function f(x, d) { return Number(x).toLocaleString('es-ES', { maximumFractionDigits: d == null ? 2 : d }); }
  function parse(t) { return String(t).split(/[\s;]+/).map(function (s) { return s.trim().replace(',', '.'); }).filter(Boolean).map(Number).filter(isFinite); }
  function pos(n, k) { return Math.min(n, Math.max(1, Math.ceil(n * k))); }
  function set(txt) { S.raw = parse(txt); S.a = S.raw.slice().sort(function (x, y) { return x - y; }); S.subs.forEach(function (fn) { fn(); }); }
  function sub(fn) { S.subs.push(fn); if (!S.a.length) set(DEF); else fn(); }
  function stats() {
    var a = S.a, n = a.length, sum = a.reduce(function (s, v) { return s + v; }, 0), cnt = {}, mx = 0, modes = [];
    a.forEach(function (v) { cnt[v] = (cnt[v] || 0) + 1; mx = Math.max(mx, cnt[v]); });
    Object.keys(cnt).forEach(function (k) { if (cnt[k] === mx && mx > 1) modes.push(Number(k)); });
    var med = n % 2 ? a[(n + 1) / 2 - 1] : (a[n / 2 - 1] + a[n / 2]) / 2;
    return { n: n, sum: sum, mean: sum / n, med: med, mp: (n + 1) / 2, cnt: cnt, mx: mx, modes: modes };
  }
  function cls(base, on) { return base + (on ? ' ' + on : ''); }
  function head(el, title, sub) { return h('div.widget__head', null, h('h3.widget__title', null, title), sub ? h('p.widget__sub', null, sub) : null); }

  /* ---------- 1. Datos: calculadora + fichas + suma + frecuencias ---------- */
  HIS.widgets.register('lab-datos', function (el) {
    var id = HIS.dom.uid('lb'), ta = h('textarea', { id: id, rows: 3, 'aria-describedby': id + '-d' });
    ta.value = DEF;
    var go = h('button.btn.btn--primary', { type: 'button' }, 'Calcular'), ex = h('button.btn.btn--ghost', { type: 'button' }, 'Usar datos de ejemplo');
    var msg = h('p.lb-msg', { id: id + '-d', role: 'status', 'aria-live': 'polite' });
    var trio = h('ul.lb-trio'), chips = h('ol.lb-chips'), sumbar = h('div.lb-sum'), freq = h('div.lb-freq'), note = h('p.lb-note');
    el.append(h('div.lb', null,
      h('label', { for: id }, 'Tus datos (sepáralos con espacios o punto y coma; coma = decimal)'), ta, h('div.lb__btns', null, go, ex), msg,
      trio,
      h('h4.lb-h', null, 'Datos ordenados, con su posición'), h('ul.lb-legend', { 'aria-label': 'Leyenda' }, h('li.is-med', null, 'Mediana'), h('li.is-mode', null, 'Moda'), h('li.is-both', null, 'Mediana y moda a la vez'), h('li', null, 'Otro dato')), chips,
      h('h4.lb-h', null, 'La suma, vista como un total'), sumbar,
      h('h4.lb-h', null, '¿Cuántas veces aparece cada valor?'), freq, note));
    function run() { set(ta.value); }
    go.addEventListener('click', run);
    ex.addEventListener('click', function () { ta.value = DEF; run(); msg.textContent = 'Datos de ejemplo cargados.'; });
    sub(function () {
      var a = S.a, n = a.length; chips.textContent = ''; trio.textContent = ''; sumbar.textContent = ''; freq.textContent = '';
      msg.textContent = n ? n + ' números válidos.' : 'No hay números válidos.';
      if (n < 1) return;
      var st = stats(), modeTxt = st.modes.length ? st.modes.map(function (v) { return f(v); }).join(' y ') : 'no hay';
      [['Media', 'x̄', f(st.mean), 'Suma ÷ n = ' + f(st.sum) + ' ÷ ' + n, 'blue'], ['Mediana', 'Me', f(st.med), n % 2 ? 'n impar: dato de la posición ' + f(st.mp, 0) : 'n par: media de los dos centrales', 'orange'], ['Moda', 'Mo', modeTxt, st.modes.length ? 'Se repite ' + st.mx + ' veces' : 'Ningún valor se repite', 'green']].forEach(function (c) {
        trio.append(h('li.lb-stat.lb-stat--' + c[4], null, h('span.lb-stat__k', null, c[0] + ' · ' + c[1]), h('strong.lb-stat__v', null, c[2]), h('span.lb-stat__s', null, c[3])));
      });
      var mi = [Math.ceil(st.mp) - 1, Math.floor(st.mp) - 1];
      a.forEach(function (v, i) {
        var isM = i === mi[0] || i === mi[1], isMo = st.modes.indexOf(v) >= 0, c = isM && isMo ? 'is-both' : isM ? 'is-med' : isMo ? 'is-mode' : '';
        var tag = isM && isMo ? 'Mediana y moda' : isM ? 'Mediana' : isMo ? 'Moda' : '';
        chips.append(h('li.lb-chip' + (c ? '.' + c : ''), { style: '--i:' + i }, h('span.lb-chip__p', null, 'Pos. ' + (i + 1)), h('b.lb-chip__v', null, f(v)), h('span.lb-chip__t', null, tag)));
      });
      var tot = st.sum, colors = ['blue', 'violet', 'teal', 'orange', 'pink'];
      var bar = h('div.lb-sum__bar', { role: 'img', 'aria-label': 'La suma ' + f(tot) + ' se compone de ' + n + ' tramos, uno por dato' });
      a.slice().sort(function (x, y) { return y - x; }).length; S.raw.forEach(function (v, i) { bar.append(h('span.lb-seg.lb-seg--' + colors[i % 5], { style: 'flex:' + Math.max(v, 0.0001) + ' 1 0', title: f(v) }, n <= 25 ? f(v, 0) : '')); });
      sumbar.append(bar, h('p.lb-sum__t', null, 'Suma = ' + f(tot) + ' · cada tramo es un dato; ' + f(tot) + ' ÷ ' + n + ' = ' + f(st.mean)));
      var keys = Object.keys(st.cnt).map(Number).sort(function (x, y) { return x - y; });
      var cols = h('ul.lb-freq__cols', { style: '--k:' + keys.length });
      keys.forEach(function (k, i) {
        var c = st.cnt[k], isMo = st.modes.indexOf(k) >= 0, isMe = k === st.med || k === a[Math.ceil(st.mp) - 1];
        cols.append(h('li.lb-fcol' + (isMo ? '.is-mode' : isMe ? '.is-med' : ''), { style: '--i:' + i }, h('span.lb-fcol__n', null, String(c)), h('span.lb-fcol__bar', { style: 'height:' + Math.round(c / st.mx * 100) + '%' }), h('span.lb-fcol__v', null, f(k))));
      });
      freq.append(h('p.sr-only', null, 'Frecuencias: ' + keys.map(function (k) { return f(k) + ' aparece ' + st.cnt[k] + ' veces'; }).join('; ') + '.'), h('div', { 'aria-hidden': 'true' }, cols));
      note.textContent = 'Datos originales en orden de llegada: ' + S.raw.map(function (v) { return f(v); }).join(', ') + '.';
    });
  });

  /* ---------- 2. Cuartiles en cuatro grupos + IQR ---------- */
  HIS.widgets.register('lab-cuartiles', function (el) {
    var body = h('div.lb');
    el.append(body);
    sub(function () {
      var a = S.a, n = a.length; body.textContent = '';
      if (n < 4) { body.append(h('p', { role: 'alert' }, 'Necesitas al menos 4 datos en la calculadora.')); return; }
      var p1 = pos(n, .25), p2 = pos(n, .5), p3 = pos(n, .75), Q1 = a[p1 - 1], Q2 = a[p2 - 1], Q3 = a[p3 - 1], iqr = Q3 - Q1;
      var groups = [['Grupo 1', 1, p1 - 1, 'g1'], ['Q1 · primer cuartil', p1, p1, 'q1'], ['Grupo 2', p1 + 1, p2 - 1, 'g2'], ['Q2 · mediana', p2, p2, 'q2'], ['Grupo 3', p2 + 1, p3 - 1, 'g3'], ['Q3 · tercer cuartil', p3, p3, 'q3'], ['Grupo 4', p3 + 1, n, 'g4']];
      var wrap = h('ul.lb-q4', { style: '--n:' + n });
      groups.forEach(function (g) {
        if (g[1] > g[2] && g[3][0] === 'g') return;
        var li = h('li.lb-qg.lb-qg--' + g[3]), items = h('ol.lb-qg__list');
        for (var i = g[1]; i <= g[2]; i++) items.append(h('li.lb-qc', null, h('span', null, 'Pos. ' + i), h('b', null, f(a[i - 1]))));
        li.append(h('p.lb-qg__t', null, g[0]), h('p.lb-qg__r', null, g[1] === g[2] ? 'Pos. ' + g[1] : 'Pos. ' + g[1] + '–' + g[2]), items);
        wrap.append(li);
      });
      var cards = h('ul.lb-trio');
      [['Q1 · primer cuartil', Q1, p1, 'n ÷ 4 = ' + f(n / 4) + ' → ' + p1 + '.º dato', 'blue'], ['Q2 · mediana', Q2, p2, 'n ÷ 2 = ' + f(n / 2) + ' → ' + p2 + '.º dato', 'orange'], ['Q3 · tercer cuartil', Q3, p3, '3n ÷ 4 = ' + f(3 * n / 4) + ' → ' + p3 + '.º dato', 'green']].forEach(function (c) {
        cards.append(h('li.lb-stat.lb-stat--' + c[4], null, h('span.lb-stat__k', null, c[0]), h('strong.lb-stat__v', null, f(c[1])), h('span.lb-stat__s', null, 'Posición ' + c[2] + ' de ' + n), h('span.lb-stat__s', null, c[3])));
      });
      var lo = a[0], hi = a[n - 1], span = (hi - lo) || 1, X = function (v) { return ((v - lo) / span * 100).toFixed(2) + '%'; };
      var band = h('div.lb-iqr', null,
        h('p.lb-iqr__f', null, 'IQR = Q3 − Q1 = ' + f(Q3) + ' − ' + f(Q1) + ' = ', h('b', null, f(iqr))),
        h('div.lb-iqr__bar', { role: 'img', 'aria-label': 'Rango de ' + f(lo) + ' a ' + f(hi) + '; la caja del IQR va de ' + f(Q1) + ' a ' + f(Q3) },
          h('span.lb-iqr__box', { style: 'left:' + X(Q1) + ';width:calc(' + X(Q3) + ' - ' + X(Q1) + ')' }, h('em', null, 'IQR ' + f(iqr))),
          h('span.lb-iqr__m', { style: 'left:' + X(Q2) }), h('span.lb-iqr__lo', null, f(lo)), h('span.lb-iqr__hi', null, f(hi))),
        h('p.lb-iqr__s', null, 'El 50 % central de los datos vive dentro de ' + f(iqr) + ' unidades. Rango = ' + f(hi) + ' − ' + f(lo) + ' = ' + f(hi - lo) + '.'));
      body.append(h('p.lb-note', null, 'La posición dice qué dato coger, no su valor: se calcula, se redondea al alza y se busca en la lista ordenada.'), wrap, cards, band);
    });
  });

  /* ---------- 3. Percentil ---------- */
  HIS.widgets.register('lab-percentil', function (el) {
    var id = HIS.dom.uid('lp');
    var kIn = h('input', { id: id + 'k', type: 'range', min: 1, max: 99, value: 90 }), kNum = h('input', { id: id + 'kn', type: 'number', min: 0, max: 100, value: 90, 'aria-label': 'Percentil k, número' });
    var out = h('p.lb-pct__o', { role: 'status', 'aria-live': 'polite' }), strip = h('ol.lb-pct__strip'), expl = h('p.lb-note');
    el.append(h('div.lb', null, h('div.lb-pct__ctl', null, h('label', { for: id + 'k' }, 'Percentil (k)'), kIn, kNum), out, strip, expl));
    function draw() {
      var a = S.a, n = a.length, k = Math.min(100, Math.max(0, Number(kNum.value) || 0)); strip.textContent = '';
      if (!n) return;
      var raw = k * n / 100, p = Math.min(n, Math.max(1, Math.ceil(raw))), v = a[p - 1];
      out.textContent = 'P' + f(k) + ': ' + f(k) + ' · ' + n + ' ÷ 100 = ' + f(raw) + ' → posición ' + p + ' de ' + n + ' → ' + f(v);
      a.forEach(function (x, i) { strip.append(h('li.lb-pc' + (i + 1 === p ? '.is-on' : i + 1 < p ? '.is-below' : ''), null, h('span', null, (i + 1) + '.º'), h('b', null, f(x)))); });
      expl.textContent = 'El ' + f(k) + ' % de los datos queda por debajo del dato en posición ' + p + ' (' + f(v) + ') y el ' + f(100 - k) + ' % por encima. Las fichas azules son los datos que quedan por debajo.';
    }
    kIn.addEventListener('input', function () { kNum.value = kIn.value; draw(); });
    kNum.addEventListener('input', function () { kIn.value = kNum.value; draw(); });
    sub(draw);
  });

  /* ---------- 4. Diagrama de cajas con los mismos datos ---------- */
  HIS.widgets.register('lab-caja', function (el) {
    var add = h('button.btn.btn--ghost', { type: 'button' }, 'Añadir un valor atípico (140)'), reset = h('button.btn.btn--ghost', { type: 'button' }, 'Quitar el atípico');
    var out = h('div.lb-box'), live = h('p.sr-only-live', { role: 'status', 'aria-live': 'polite' }), extra = null;
    el.append(h('div.lb', null, h('div.lb__btns', null, add, reset), out, live));
    add.addEventListener('click', function () { if (!extra) { extra = 140; draw(); } });
    reset.addEventListener('click', function () { extra = null; draw(); });
    function draw() {
      var a = S.a.slice(); if (extra != null) { a.push(extra); a.sort(function (x, y) { return x - y; }); }
      var n = a.length; out.textContent = '';
      if (n < 4) { out.append(h('p', { role: 'alert' }, 'Necesitas al menos 4 datos.')); return; }
      var Q1 = a[pos(n, .25) - 1], Q2 = a[pos(n, .5) - 1], Q3 = a[pos(n, .75) - 1], R = Q3 - Q1, lf = Q1 - 1.5 * R, uf = Q3 + 1.5 * R;
      var inn = a.filter(function (v) { return v >= lf && v <= uf; }), wl = inn[0], wu = inn[inn.length - 1], outl = a.filter(function (v) { return v < lf || v > uf; });
      var lo = Math.min(a[0], wl) - 3, hi = Math.max(a[n - 1], wu) + 4, X = function (v) { return 30 + (v - lo) / (hi - lo) * 540; };
      var s = '<svg viewBox="0 0 600 150" role="img" aria-label="Diagrama de cajas: bigote inferior ' + f(wl) + ', Q1 ' + f(Q1) + ', mediana ' + f(Q2) + ', Q3 ' + f(Q3) + ', bigote superior ' + f(wu) + (outl.length ? ', atípicos ' + outl.map(function (v) { return f(v); }).join(', ') : ', sin atípicos') + '" focusable="false">';
      s += '<line class="wh" x1="' + X(wl) + '" y1="62" x2="' + X(Q1) + '" y2="62"/><line class="wh" x1="' + X(Q3) + '" y1="62" x2="' + X(wu) + '" y2="62"/><line class="wh" x1="' + X(wl) + '" y1="48" x2="' + X(wl) + '" y2="76"/><line class="wh" x1="' + X(wu) + '" y1="48" x2="' + X(wu) + '" y2="76"/>';
      s += '<rect class="box" x="' + X(Q1) + '" y="38" width="' + (X(Q3) - X(Q1)) + '" height="48" rx="6"/><line class="med" x1="' + X(Q2) + '" y1="38" x2="' + X(Q2) + '" y2="86"/>';
      outl.forEach(function (v) { s += '<circle class="out" cx="' + X(v) + '" cy="62" r="6"/><text class="v" x="' + X(v) + '" y="30" text-anchor="middle">atípico ' + f(v) + '</text>'; });
      [[wl, 'mín'], [Q1, 'Q1'], [Q2, 'Q2'], [Q3, 'Q3'], [wu, 'máx']].forEach(function (p) { s += '<text x="' + X(p[0]) + '" y="112" text-anchor="middle">' + p[1] + '</text><text class="v" x="' + X(p[0]) + '" y="130" text-anchor="middle">' + f(p[0]) + '</text>'; });
      s += '</svg>';
      out.innerHTML = '<figure class="lb-fig">' + s + '<figcaption>Caja: de Q1 a Q3 con la mediana. Bigotes: hasta el dato más lejano dentro de 1,5 · RIC. Puntos: atípicos.</figcaption></figure>' +
        '<ul class="lb-trio lb-trio--4"><li class="lb-stat lb-stat--blue"><span class="lb-stat__k">Q1 · Q2 · Q3</span><strong class="lb-stat__v">' + f(Q1) + ' · ' + f(Q2) + ' · ' + f(Q3) + '</strong></li>' +
        '<li class="lb-stat lb-stat--violet"><span class="lb-stat__k">RIC = Q3 − Q1</span><strong class="lb-stat__v">' + f(R) + '</strong><span class="lb-stat__s">' + f(Q3) + ' − ' + f(Q1) + '</span></li>' +
        '<li class="lb-stat lb-stat--teal"><span class="lb-stat__k">Límites (1,5 · RIC)</span><strong class="lb-stat__v">' + f(lf) + ' a ' + f(uf) + '</strong></li>' +
        '<li class="lb-stat ' + (outl.length ? 'lb-stat--red' : 'lb-stat--green') + '"><span class="lb-stat__k">Valores atípicos</span><strong class="lb-stat__v">' + (outl.length ? outl.map(function (v) { return f(v); }).join(', ') : 'ninguno') + '</strong></li></ul>';
      live.textContent = 'Q1 ' + f(Q1) + ', mediana ' + f(Q2) + ', Q3 ' + f(Q3) + '. ' + (outl.length ? 'Atípicos: ' + outl.map(function (v) { return f(v); }).join(', ') + '.' : 'Sin valores atípicos.');
    }
    sub(draw);
  });
})(window);
