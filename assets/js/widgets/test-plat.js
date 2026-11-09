/*! HISdata Wiki · widgets/test-plat.js — test por tipos (única, V/F, relacionar/clasificar) con 3 pistas y corrección */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h, L = 'abcd';
  HIS.widgets.register('test-plat', function (el) {
    var tag = el.querySelector('script[type="application/json"]'), data = JSON.parse(tag.textContent); tag.remove();
    var Q = data.questions, blocks = data.blocks, uid = HIS.dom.uid('tp');
    var st = { block: 'all', dif: 'all', typ: 'all', ans: {}, done: {}, hint: {} };
    var list = h('div.tt-list'), live = h('p.sr-only-live', { role: 'status', 'aria-live': 'polite' }), score = h('div.tt-score'), filt = h('div.tt-filters');
    el.append(h('div.tt', null, filt, score, list, live));
    var TYP = { one: 'Opción única', vf: 'Verdadero / Falso', match: 'Relacionar / clasificar' };
    function vis() { return Q.filter(function (q) { return (st.block === 'all' || q.block === +st.block) && (st.dif === 'all' || q.dif === st.dif) && (st.typ === 'all' || q.t === st.typ); }); }
    function pill(g, v, t, on) { return h('button.tt-f', { type: 'button', 'aria-pressed': on ? 'true' : 'false', onclick: function () { st[g] = v; build(); live.textContent = 'Filtro: ' + t + '. ' + vis().length + ' preguntas.'; } }, t); }
    function res(q) { // {ok, got, of}
      var a = st.ans[q.id] || {};
      if (q.t === 'match') { var g = 0; q.items.forEach(function (it, i) { if (a[i] === it[1]) g++; }); return { ok: g === q.items.length, got: g, of: q.items.length }; }
      return { ok: a.v === q.ans, got: a.v === q.ans ? 1 : 0, of: 1 };
    }
    function answered(q) {
      var a = st.ans[q.id]; if (!a) return false;
      return q.t === 'match' ? q.items.every(function (_, i) { return a[i] != null; }) : a.v != null;
    }
    function paintScore() {
      var v = vis(), d = 0, ok = 0; v.forEach(function (q) { if (st.done[q.id]) { d++; if (res(q).ok) ok++; } });
      score.textContent = '';
      score.append(h('p.tt-score__t', null, h('b', null, ok + ' aciertos'), ' · ' + d + ' de ' + v.length + ' corregidas'),
        h('div.tt-prog', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': v.length, 'aria-valuenow': d, 'aria-label': 'Preguntas corregidas' }, h('span.tt-prog__ok', { style: 'width:' + (v.length ? ok / v.length * 100 : 0) + '%' }), h('span.tt-prog__ko', { style: 'width:' + (v.length ? (d - ok) / v.length * 100 : 0) + '%' })));
      if (v.length && d === v.length) score.append(h('p.tt-final', { role: 'status' }, 'Test terminado: ' + ok + ' de ' + v.length + ' (' + Math.round(ok / v.length * 100) + ' %).'));
    }
    function card(q) {
      var name = uid + '-' + q.id, done = !!st.done[q.id], a = st.ans[q.id] || (st.ans[q.id] = {}), r = done ? res(q) : null;
      var c = h('fieldset.tt-q' + (done ? '.is-done' : ''));
      c.append(h('legend', null, h('span.tt-n', null, String(q.n)), h('span', null, q.q), h('span.tt-dif', null, q.dif), h('span.tt-dif.tp-typ', null, TYP[q.t])));
      if (q.t === 'match') {
        var ul = h('ul.tp-rows');
        q.items.forEach(function (it, i) {
          var sel = h('select', { id: name + '-' + i, 'aria-label': 'Respuesta para: ' + it[0], disabled: done, onchange: function () { a[i] = this.value === '' ? null : +this.value; } }, h('option', { value: '' }, 'Elige…'));
          q.cats.forEach(function (ct, k) { var o = h('option', { value: k }, ct); if (a[i] === k) o.selected = true; sel.appendChild(o); });
          var ok = done && a[i] === it[1];
          ul.append(h('li.tp-row' + (done ? (ok ? '.is-ok' : '.is-ko') : ''), null, h('label.tp-it', { for: name + '-' + i }, it[0]), sel, done ? h('span.tp-m', null, ok ? '✔ Correcto' : '✘ Correcta: ' + q.cats[it[1]]) : null));
        });
        c.append(ul);
      } else {
        q.opts.forEach(function (o, i) {
          var inp = h('input', { type: 'radio', name: name, value: i, disabled: done, onchange: function () { a.v = i; } }); if (a.v === i) inp.checked = true;
          var cls = 'label.tt-opt' + (done && i === q.ans ? '.is-ok' : done && a.v === i ? '.is-ko' : '');
          c.append(h(cls, null, inp, h('span.tt-l', { 'aria-hidden': 'true' }, q.t === 'vf' ? (i ? '✘' : '✔') : L[i]), h('span.tt-t', null, o, done && i === q.ans ? h('span.tt-mark', null, ' ✔ Correcta') : done && a.v === i ? h('span.tt-mark', null, ' ✘ Tu respuesta') : null)));
        });
      }
      var hs = st.hint[q.id] || 0, hb = h('div.tp-hints');
      if (hs) { var ol = h('ol.tp-hl'); q.hints.slice(0, hs).forEach(function (t) { ol.append(h('li', null, t)); }); hb.append(h('p.tp-hh', null, 'Pistas'), ol); }
      var hbtn = h('button.btn.btn--ghost', { type: 'button', hidden: done || hs >= q.hints.length, onclick: function () { st.hint[q.id] = (st.hint[q.id] || 0) + 1; build(); live.textContent = 'Pista ' + st.hint[q.id] + ': ' + q.hints[st.hint[q.id] - 1]; } }, hs ? 'Otra pista (' + hs + '/' + q.hints.length + ')' : 'Ver pista (0/' + q.hints.length + ')');
      var chk = h('button.btn.tt-check', { type: 'button', hidden: done, onclick: function () { if (!answered(q)) { live.textContent = 'Responde todo antes de comprobar.'; return; } st.done[q.id] = true; build(); live.textContent = (res(q).ok ? 'Correcto. ' : 'Incorrecto. ') + q.exp; } }, 'Comprobar');
      c.append(h('div.tp-act', null, hbtn, chk), hb);
      if (done) c.append(h('div.tt-fb.' + (r.ok ? 'is-ok' : 'is-ko'), null, h('p.tt-fb__h', null, r.ok ? '✔ ¡Correcto!' : q.t === 'match' ? '✘ ' + r.got + ' de ' + r.of + ' bien. Revisa las filas marcadas en rojo.' : '✘ Correcta: ' + q.sol), h('p', null, q.exp), h('p.tt-rev', null, h('span.tp-src.tp-src--' + q.src[0], null, q.src[1]))));
      return c;
    }
    function build() {
      var fy = root.scrollY; filt.textContent = ''; list.textContent = '';
      var g1 = h('div.tt-fg', { role: 'group', 'aria-label': 'Filtrar por unidad' }, h('span.tt-fl', null, 'Unidad'), pill('block', 'all', 'Todas', st.block === 'all'));
      blocks.forEach(function (b, i) { g1.append(pill('block', String(i + 1), b, st.block === String(i + 1))); });
      var g2 = h('div.tt-fg', { role: 'group', 'aria-label': 'Filtrar por dificultad' }, h('span.tt-fl', null, 'Dificultad'), pill('dif', 'all', 'Todas', st.dif === 'all'));
      ['Fácil', 'Media', 'Difícil'].forEach(function (d) { g2.append(pill('dif', d, d, st.dif === d)); });
      var g3 = h('div.tt-fg', { role: 'group', 'aria-label': 'Filtrar por tipo' }, h('span.tt-fl', null, 'Tipo'), pill('typ', 'all', 'Todos', st.typ === 'all'));
      Object.keys(TYP).forEach(function (k) { g3.append(pill('typ', k, TYP[k], st.typ === k)); });
      filt.append(g1, g2, g3, h('button.btn.btn--ghost', { type: 'button', onclick: function () { st.ans = {}; st.done = {}; st.hint = {}; build(); live.textContent = 'Test reiniciado.'; } }, 'Reiniciar test'));
      var v = vis(); if (!v.length) list.append(h('p', { role: 'status' }, 'No hay preguntas con ese filtro.'));
      var lb = 0; v.forEach(function (q) { if (q.block !== lb) { lb = q.block; list.append(h('h3.tt-bh', null, blocks[q.block - 1])); } list.append(card(q)); });
      paintScore(); root.scrollTo(0, fy);
    }
    build();
  });
})(window);
