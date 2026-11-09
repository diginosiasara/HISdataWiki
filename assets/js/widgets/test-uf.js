/*! HISdata Wiki · widgets/test-uf.js — test de autoevaluación con filtros, corrección por pregunta y puntuación */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h, L = 'abcd';
  HIS.widgets.register('test-uf', function (el, cfg) {
    var tag = el.querySelector('script[type="application/json"]'), data = JSON.parse(tag.textContent); tag.remove();
    var Q = data.questions, blocks = data.blocks, uid = HIS.dom.uid('tt');
    var st = { block: 'all', dif: 'all', ans: {}, done: {} };
    var bar = h('div.tt-bar'), list = h('div.tt-list'), live = h('p.sr-only-live', { role: 'status', 'aria-live': 'polite' });
    var score = h('div.tt-score'), filt = h('div.tt-filters');
    el.append(h('div.tt', null, filt, score, bar, list, live));

    function pill(group, value, text, on) {
      return h('button.tt-f', { type: 'button', 'aria-pressed': on ? 'true' : 'false', onclick: function () { st[group] = value; build(); live.textContent = 'Filtro: ' + text + '. ' + visible().length + ' preguntas.'; } }, text);
    }
    function visible() { return Q.filter(function (q) { return (st.block === 'all' || q.block === +st.block) && (st.dif === 'all' || q.dif === st.dif); }); }
    function key(q) { return q.id; }
    function stats() {
      var v = visible(), a = 0, ok = 0; v.forEach(function (q) { if (st.done[key(q)]) { a++; if (st.ans[key(q)] === q.ans) ok++; } });
      return { total: v.length, a: a, ok: ok };
    }
    function paintScore() {
      var s = stats(), pct = s.total ? Math.round(s.ok / s.total * 100) : 0;
      score.textContent = '';
      score.append(h('p.tt-score__t', null, h('b', null, s.ok + ' aciertos'), ' · ' + s.a + ' de ' + s.total + ' corregidas'),
        h('div.tt-prog', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': s.total, 'aria-valuenow': s.a, 'aria-label': 'Preguntas corregidas' }, h('span.tt-prog__ok', { style: 'width:' + (s.total ? s.ok / s.total * 100 : 0) + '%' }), h('span.tt-prog__ko', { style: 'width:' + (s.total ? (s.a - s.ok) / s.total * 100 : 0) + '%' })));
      if (s.total && s.a === s.total) score.append(h('p.tt-final', { role: 'status' }, 'Test terminado: ' + s.ok + ' de ' + s.total + ' (' + pct + ' %). ' + (pct >= 80 ? 'Muy bien: dominas este bloque.' : pct >= 50 ? 'Vas bien; repasa las explicaciones de las falladas.' : 'Repasa la teoría con los enlaces «Dónde repasarlo» y vuelve a intentarlo.')));
    }
    function check(q, card) {
      var k = key(q); if (st.ans[k] == null) { live.textContent = 'Elige una opción antes de comprobar.'; return; }
      st.done[k] = true; paintCard(q, card); paintScore();
      live.textContent = (st.ans[k] === q.ans ? 'Correcto. ' : 'Incorrecto. La respuesta correcta es ' + L[q.ans] + ', ' + q.opts[q.ans] + '. ') + q.exp;
    }
    function paintCard(q, card) {
      var k = key(q), done = st.done[k]; card.classList.toggle('is-done', !!done);
      card.querySelectorAll('.tt-opt').forEach(function (o, i) {
        var inp = o.querySelector('input'); inp.disabled = !!done; o.classList.remove('is-ok', 'is-ko');
        var m = o.querySelector('.tt-mark'); m.textContent = '';
        if (done && i === q.ans) { o.classList.add('is-ok'); m.textContent = ' ✔ Correcta'; }
        else if (done && i === st.ans[k]) { o.classList.add('is-ko'); m.textContent = ' ✘ Tu respuesta'; }
      });
      var fb = card.querySelector('.tt-fb'); fb.textContent = '';
      if (done) {
        var ok = st.ans[k] === q.ans; fb.className = 'tt-fb ' + (ok ? 'is-ok' : 'is-ko');
        fb.append(h('p.tt-fb__h', null, ok ? '✔ ¡Correcto!' : '✘ No es esa. Correcta: ' + L[q.ans] + ') ' + q.opts[q.ans]), h('p', null, q.exp), q.rev ? h('p.tt-rev', null, h('span', null, 'Dónde repasarlo: '), q.rev) : null);
      } else fb.className = 'tt-fb';
      card.querySelector('.tt-check').hidden = !!done;
    }
    function build() {
      filt.textContent = ''; list.textContent = '';
      var g1 = h('div.tt-fg', { role: 'group', 'aria-label': 'Filtrar por bloque' }, h('span.tt-fl', null, 'Bloque'), pill('block', 'all', 'Todos', st.block === 'all'));
      blocks.forEach(function (b, i) { g1.append(pill('block', String(i + 1), b.short, st.block === String(i + 1))); });
      var difs = []; Q.forEach(function (q) { if (difs.indexOf(q.dif) < 0) difs.push(q.dif); });
      var g2 = h('div.tt-fg', { role: 'group', 'aria-label': 'Filtrar por dificultad' }, h('span.tt-fl', null, 'Dificultad'), pill('dif', 'all', 'Todas', st.dif === 'all'));
      difs.forEach(function (d) { g2.append(pill('dif', d, d, st.dif === d)); });
      filt.append(g1, g2, h('button.btn.btn--ghost', { type: 'button', onclick: function () { st.ans = {}; st.done = {}; build(); live.textContent = 'Test reiniciado.'; } }, 'Reiniciar test'),
        h('button.btn.btn--primary', { type: 'button', onclick: function () { visible().forEach(function (q) { if (st.ans[key(q)] != null) st.done[key(q)] = true; }); build(); live.textContent = 'Corregidas las preguntas contestadas.'; } }, 'Corregir todo lo contestado'));
      var v = visible(), lastB = -1;
      if (!v.length) list.append(h('p', { role: 'status' }, 'No hay preguntas con ese filtro.'));
      v.forEach(function (q, idx) {
        if (q.block !== lastB) { lastB = q.block; list.append(h('h3.tt-bh', null, blocks[q.block - 1].title)); }
        var name = uid + '-' + key(q), card = h('fieldset.tt-q');
        card.append(h('legend', null, h('span.tt-n', null, String(q.n)), h('span', null, q.q), h('span.tt-dif', null, q.dif)));
        q.opts.forEach(function (o, i) {
          var inp = h('input', { type: 'radio', name: name, value: i, onchange: function () { st.ans[key(q)] = i; } });
          if (st.ans[key(q)] === i) inp.checked = true;
          card.append(h('label.tt-opt', null, inp, h('span.tt-l', { 'aria-hidden': 'true' }, L[i]), h('span.tt-t', null, o, h('span.tt-mark'))));
        });
        card.append(h('button.btn.tt-check', { type: 'button', onclick: function () { check(q, card); } }, 'Comprobar'), h('div.tt-fb'));
        paintCard(q, card); list.append(card);
      });
      paintScore();
    }
    build();
  });
})(window);
