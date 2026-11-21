/*! HISdata Wiki · widgets/simulacro.js — simulacro de examen: configuración, examen sin pistas, corrección final y repaso */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h, L = 'ABCD';
  HIS.widgets.register('simulacro', function (el) {
    var tag = el.querySelector('script[type="application/json"]'), data = JSON.parse(tag.textContent); tag.remove();
    var ALL = data.questions, uid = HIS.dom.uid('sim');
    var cfg = { size: 'all', shuffle: true, timer: true, units: {} }, UFS = ['UF1','UF2','UF3','UF4','UF5','UF6'].filter(function (u) { return ALL.some(function (q) { return q.uf === u; }); });
    UFS.forEach(function (u) { cfg.units[u] = true; });
    function pool() { return ALL.filter(function (q) { return cfg.units[q.uf]; }); }
    var ex = null, timerId = null;
    var box = h('div.sim'), live = h('p.sr-only-live', { role: 'status', 'aria-live': 'polite' });
    el.append(box, live);

    function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function fmt(s) { var m = Math.floor(s / 60), r = s % 60; return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r; }
    function stop() { if (timerId) { clearInterval(timerId); timerId = null; } }
    function pill(group, value, text) {
      return h('button.tt-f', { type: 'button', 'aria-pressed': String(cfg[group] === value), onclick: function () { cfg[group] = value; setup(); } }, text);
    }

    function setup() {
      stop(); ex = null; box.textContent = '';
      var P = pool(), tot = P.length;
      var sizes = [['all', 'Completo (' + tot + ')'], ['50', '50 al azar'], ['20', '20 al azar'], ['10', '10 al azar']];
      var g0 = h('div.tt-fg', { role: 'group', 'aria-label': 'Unidades incluidas' }, h('span.tt-fl', null, 'Unidades'));
      UFS.forEach(function (u) { g0.append(h('button.tt-f', { type: 'button', 'aria-pressed': String(!!cfg.units[u]), onclick: function () { cfg.units[u] = !cfg.units[u]; if (!pool().length) cfg.units[u] = true; setup(); } }, u)); });
      var g1 = h('div.tt-fg', { role: 'group', 'aria-label': 'Número de preguntas' }, h('span.tt-fl', null, 'Preguntas'));
      sizes.forEach(function (z) { if (z[0] === 'all' || +z[0] < tot) g1.append(pill('size', z[0], z[1])); });
      if (cfg.size !== 'all' && +cfg.size >= tot) cfg.size = 'all';
      var g2 = h('div.tt-fg', { role: 'group', 'aria-label': 'Orden de las preguntas' }, h('span.tt-fl', null, 'Orden'), pill('shuffle', true, 'Aleatorio'), pill('shuffle', false, 'El del banco'));
      var g3 = h('div.tt-fg', { role: 'group', 'aria-label': 'Cronómetro' }, h('span.tt-fl', null, 'Tiempo'), pill('timer', true, 'Con cronómetro'), pill('timer', false, 'Sin límite'));
      var n = cfg.size === 'all' ? tot : +cfg.size;
      box.append(h('div.sim-setup', null,
        h('p', null, 'Es un examen de verdad: no hay pistas ni corrección mientras respondes. Al entregar verás tu nota, el desglose por unidad y la explicación de cada pregunta con dónde repasarla.'),
        g0, g1, g2, g3,
        h('p.sim-hint', null, cfg.timer ? 'Tiempo: ' + n + ' minutos (1 por pregunta). Al acabarse se entrega solo.' : 'Sin límite de tiempo.'),
        h('button.btn.btn--primary', { type: 'button', onclick: function () { start(); } }, 'Empezar el simulacro (' + n + ' preguntas)')));
    }

    function start(given) {
      var qs;
      if (Array.isArray(given)) qs = given;
      else {
        qs = pool();
        if (cfg.shuffle || cfg.size !== 'all') qs = shuffle(qs);
        if (cfg.size !== 'all') qs = qs.slice(0, +cfg.size);
        if (!cfg.shuffle) qs.sort(function (x, y) { return x.ord - y.ord; });
      }
      ex = { qs: qs, ans: {}, left: cfg.timer ? qs.length * 60 : null, done: false };
      paintExam();
      if (ex.left != null) timerId = setInterval(tick, 1000);
      live.textContent = 'Simulacro iniciado con ' + qs.length + ' preguntas.';
    }
    function tick() {
      ex.left -= 1; var t = box.querySelector('.sim-time'); if (t) { t.textContent = fmt(Math.max(ex.left, 0)); t.classList.toggle('is-low', ex.left <= 60); }
      if (ex.left === 60) live.textContent = 'Queda un minuto.';
      if (ex.left <= 0) { live.textContent = 'Tiempo agotado: examen entregado.'; submit(true); }
    }
    function answeredCount() { return Object.keys(ex.ans).length; }

    function paintExam() {
      box.textContent = '';
      var bar = h('div.sim-bar', null,
        h('span.sim-count', null, 'Contestadas: ' + answeredCount() + ' de ' + ex.qs.length),
        ex.left != null ? h('span.sim-clock', null, '⏱ ', h('span.sim-time', null, fmt(ex.left))) : null,
        h('button.btn.btn--primary', { type: 'button', onclick: function () { submit(false); } }, 'Entregar examen'));
      var msg = h('p.sim-msg', { role: 'alert' });
      var list = h('div.tt-list');
      ex.qs.forEach(function (q, idx) {
        var name = uid + '-' + q.id, card = h('fieldset.tt-q');
        card.append(h('legend', null, h('span.tt-n', null, String(idx + 1)), h('span', null, q.q)));
        q.opts.forEach(function (o, i) {
          var inp = h('input', { type: 'radio', name: name, value: i, onchange: function () { ex.ans[q.id] = i; bar.querySelector('.sim-count').textContent = 'Contestadas: ' + answeredCount() + ' de ' + ex.qs.length; msg.textContent = ''; } });
          if (ex.ans[q.id] === i) inp.checked = true;
          card.append(h('label.tt-opt', null, inp, h('span.tt-l', { 'aria-hidden': 'true' }, L[i]), h('span.tt-t', null, o)));
        });
        list.append(card);
      });
      box.append(bar, msg, list, h('div.sim-end', null, h('button.btn.btn--primary', { type: 'button', onclick: function () { submit(false); } }, 'Entregar examen'), h('button.btn.btn--ghost', { type: 'button', onclick: function () { if (root.confirm('¿Abandonar el simulacro? Se perderán las respuestas.')) setup(); } }, 'Abandonar')));
      box._msg = msg;
    }

    function submit(force) {
      var blank = ex.qs.length - answeredCount();
      if (!force && blank > 0 && !ex.warned) { ex.warned = true; box._msg.textContent = 'Te quedan ' + blank + ' sin contestar. Pulsa «Entregar examen» otra vez para entregarlo así (cuentan como fallo en blanco, no restan).'; live.textContent = box._msg.textContent; return; }
      stop(); ex.done = true; results('all');
    }

    function score() {
      var ok = 0, by = {}, dif = {};
      ex.qs.forEach(function (q) {
        var good = ex.ans[q.id] === q.ans; if (good) ok++;
        [[by, q.uf], [dif, q.dif]].forEach(function (p) { var o = p[0][p[1]] || (p[0][p[1]] = { ok: 0, n: 0 }); o.n++; if (good) o.ok++; });
      });
      return { ok: ok, by: by, dif: dif };
    }

    function results(filter) {
      box.textContent = ''; var s = score(), n = ex.qs.length, nota = n ? Math.round(s.ok / n * 100) / 10 : 0;
      var bad = ex.qs.filter(function (q) { return ex.ans[q.id] !== q.ans; });
      var verdict = nota >= 8.5 ? 'Sobresaliente: lo tienes muy controlado.' : nota >= 7 ? 'Notable: repasa las falladas y estás listo.' : nota >= 5 ? 'Aprobado justo: refuerza las unidades con peor porcentaje.' : 'Todavía no: repasa la teoría con los enlaces «Dónde consultarlo» y repite.';
      function rows(o, order) { return order.filter(function (k) { return o[k]; }).map(function (k) { var v = o[k], p = Math.round(v.ok / v.n * 100); return h('tr', null, h('th', { scope: 'row' }, k), h('td', null, v.ok + ' / ' + v.n), h('td', null, p + ' %')); }); }
      function tbl(cap, first, o, order) { return h('div.table-wrap', { tabindex: '0', role: 'region', 'aria-label': cap + ' (desplazable)' }, h('table.table.table--compact', null, h('caption', null, cap), h('thead', null, h('tr', null, h('th', { scope: 'col' }, first), h('th', { scope: 'col' }, 'Aciertos'), h('th', { scope: 'col' }, '%'))), h('tbody', null, rows(o, order)))); }
      box.append(h('div.sim-result', { tabindex: '-1' },
        h('p.sim-nota', null, h('b', null, nota.toFixed(1).replace('.', ',')), ' / 10'),
        h('p.sim-sub', null, s.ok + ' aciertos de ' + n + ' · ' + bad.length + ' fallos o en blanco'),
        h('p.tt-final', { role: 'status' }, verdict),
        h('div.sim-tables', null, tbl('Por unidad', 'Unidad', s.by, ['UF1', 'UF2', 'UF3', 'UF4', 'UF5', 'UF6']), tbl('Por dificultad', 'Nivel', s.dif, ['Fácil', 'Media', 'Difícil', 'Suprema'])),
        h('div.sim-end', null,
          bad.length ? h('button.btn.btn--primary', { type: 'button', onclick: function () { start(shuffle(bad)); } }, 'Repetir solo las ' + bad.length + ' falladas') : null,
          h('button.btn.btn--ghost', { type: 'button', onclick: setup }, 'Nuevo simulacro'))));
      var f = h('div.tt-filters', null, h('div.tt-fg', { role: 'group', 'aria-label': 'Qué preguntas revisar' }, h('span.tt-fl', null, 'Revisar'),
        h('button.tt-f', { type: 'button', 'aria-pressed': String(filter === 'all'), onclick: function () { results('all'); } }, 'Todas (' + n + ')'),
        h('button.tt-f', { type: 'button', 'aria-pressed': String(filter === 'bad'), onclick: function () { results('bad'); } }, 'Solo falladas (' + bad.length + ')')));
      var list = h('div.tt-list');
      ex.qs.forEach(function (q, idx) {
        var got = ex.ans[q.id], good = got === q.ans; if (filter === 'bad' && good) return;
        var card = h('fieldset.tt-q.is-done'); card.style.setProperty('border-left-color', good ? 'var(--c-green)' : 'var(--c-red)');
        card.append(h('legend', null, h('span.tt-n', null, String(idx + 1)), h('span', null, q.q), h('span.tt-dif', null, q.uf + ' · ' + q.dif)));
        q.opts.forEach(function (o, i) {
          var cls = 'div.tt-opt' + (i === q.ans ? '.is-ok' : i === got ? '.is-ko' : '');
          card.append(h(cls, null, h('span.tt-l', { 'aria-hidden': 'true' }, L[i]), h('span.tt-t', null, o, i === q.ans ? h('span.tt-mark', null, ' ✔ Correcta') : i === got ? h('span.tt-mark', null, ' ✘ Tu respuesta') : null)));
        });
        card.append(h('div.tt-fb.' + (good ? 'is-ok' : 'is-ko'), null,
          h('p.tt-fb__h', null, good ? '✔ ¡Correcto!' : got == null ? '✘ En blanco. Correcta: ' + L[q.ans] + ') ' + q.opts[q.ans] : '✘ Correcta: ' + L[q.ans] + ') ' + q.opts[q.ans]),
          (q.exp ? h('p', null, q.exp) : null), (q.notes ? h('p', null, h('b', null, 'Nota: '), q.notes) : null), h('p.tt-rev', null, h('span', null, 'Dónde consultarlo: '), q.unit + ' · ' + q.title + (q.page ? ' · pág. ' + q.page : ''))));
        list.append(card);
      });
      box.append(f, list);
      var r = box.querySelector('.sim-result'); if (r) r.focus({ preventScroll: false });
      live.textContent = 'Resultado: ' + nota.toFixed(1) + ' sobre 10, ' + s.ok + ' aciertos de ' + n + '.';
      root.scrollTo({ top: Math.max(el.getBoundingClientRect().top + root.scrollY - 80, 0) });
    }
    setup();
  });
})(window);
