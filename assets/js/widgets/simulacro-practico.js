/*! HISdata Wiki · widgets/simulacro-practico.js — simulador de examen práctico (Prácticas 0 a 4 del cuaderno):
    datos nuevos con semilla, respuestas numéricas, cronómetro, nota sobre 10 y solución paso a paso. */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h;
  HIS.widgets.register('simulacro-practico', function (el) {
    var S = root.HISSimP, uid = HIS.dom.uid('sp');
    var cfg = { src: 'random', timer: true, seed: '', ps: { P0: true, P1: true, P2: true, P3: true, P4: true } };
    var ex = null, timerId = null;
    var box = h('div.sim.sp'), live = h('p.sr-only-live', { role: 'status', 'aria-live': 'polite' });
    el.append(box, live);

    function stop() { if (timerId) { clearInterval(timerId); timerId = null; } }
    function fmtT(s) { var m = Math.floor(s / 60), r = s % 60; return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r; }
    function ids() { return S.PRACTICES.map(function (p) { return p[0]; }).filter(function (i) { return cfg.ps[i]; }); }
    function say(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }
    function pill(label, on, fn) { return h('button.tt-f', { type: 'button', 'aria-pressed': String(!!on), onclick: fn }, label); }

    /* ---------- configuración ---------- */
    function setup() {
      stop(); ex = null; box.textContent = '';
      var sel = ids(), mins = 0; S.PRACTICES.forEach(function (p) { if (cfg.ps[p[0]]) mins += { P0: 20, P1: 12, P2: 12, P3: 12, P4: 6 }[p[0]]; });
      var g0 = h('div.tt-fg', { role: 'group', 'aria-label': 'Prácticas incluidas' }, h('span.tt-fl', null, 'Prácticas'));
      S.PRACTICES.forEach(function (p) { g0.append(pill(p[1], cfg.ps[p[0]], function () { cfg.ps[p[0]] = !cfg.ps[p[0]]; if (!ids().length) cfg.ps[p[0]] = true; setup(); })); });
      var g1 = h('div.tt-fg', { role: 'group', 'aria-label': 'Origen de los datos' }, h('span.tt-fl', null, 'Datos'),
        pill('Nuevos (aleatorios)', cfg.src === 'random', function () { cfg.src = 'random'; setup(); }),
        pill('Los del cuaderno', cfg.src === 'cuaderno', function () { cfg.src = 'cuaderno'; setup(); }));
      var g2 = h('div.tt-fg', { role: 'group', 'aria-label': 'Cronómetro' }, h('span.tt-fl', null, 'Tiempo'),
        pill('Con cronómetro', cfg.timer, function () { cfg.timer = true; setup(); }), pill('Sin límite', !cfg.timer, function () { cfg.timer = false; setup(); }));
      var seedId = uid + '-seed', seedIn = h('input.sp-in.sp-in--seed', { id: seedId, type: 'text', maxlength: '8', autocomplete: 'off', placeholder: 'automático', value: cfg.seed, 'aria-describedby': seedId + '-h',
        oninput: function () { cfg.seed = seedIn.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); } });
      box.append(h('div.sim-setup', null,
        h('p', null, 'Es un examen de verdad: sin pistas ni corrección mientras respondes. Los datos son nuevos cada vez, así que no sirve memorizar resultados. Puedes usar calculadora y hoja de cálculo. Al entregar verás tu nota y la solución paso a paso: fórmula → cálculo → resultado → interpretación.'),
        g0, g1, g2,
        h('div.tt-fg', null, h('label.tt-fl', { for: seedId }, 'Código del examen'), seedIn, h('span.sp-hint', { id: seedId + '-h' }, 'Opcional. Con el mismo código y las mismas prácticas se repiten los mismos datos.')),
        h('p.sim-hint', null, cfg.timer ? 'Tiempo: ' + mins + ' minutos. Al acabarse se entrega solo.' : 'Sin límite de tiempo.'),
        h('button.btn.btn--primary', { type: 'button', onclick: function () { start(cfg.seed || S.newSeed(), sel); } }, 'Empezar el examen (' + sel.length + (sel.length === 1 ? ' práctica' : ' prácticas') + ')')));
    }

    function start(seed, sel) {
      stop(); ex = S.build(seed, sel, cfg.src === 'cuaderno'); ex.ans = {}; ex.done = false; ex.warned = false;
      var mins = 0; ex.ps.forEach(function (p) { mins += p.min; }); ex.left = cfg.timer ? mins * 60 : null;
      paintExam();
      if (ex.left != null) timerId = setInterval(tick, 1000);
      say('Examen iniciado. Código ' + seed + '.');
      root.scrollTo({ top: Math.max(el.getBoundingClientRect().top + root.scrollY - 80, 0) });
    }
    function tick() {
      ex.left -= 1; var t = box.querySelector('.sim-time'); if (t) { t.textContent = fmtT(Math.max(ex.left, 0)); t.classList.toggle('is-low', ex.left <= 300); }
      if (ex.left === 300) say('Quedan cinco minutos.');
      if (ex.left <= 0) { say('Tiempo agotado: examen entregado.'); submit(true); }
    }
    function total() { var n = 0; ex.ps.forEach(function (p) { n += p.items.length; }); return n; }
    function answered() { return Object.keys(ex.ans).filter(function (k) { return ex.ans[k] !== '' && ex.ans[k] != null; }).length; }

    /* ---------- tablas de datos ---------- */
    function dataTable(t) {
      var head = t.head ? h('thead', null, h('tr', null, t.head.map(function (c) { return h('th', { scope: 'col' }, c); }))) : null;
      var body = h('tbody', null, t.rows.map(function (r) { return h('tr', null, r.map(function (c) { return h('td', null, String(c)); })); }));
      return h('div.table-wrap', { tabindex: '0', role: 'region', 'aria-label': t.caption + ' (desplazable)' }, h('table.table.table--compact.sp-data', null, h('caption', null, t.caption), head, body));
    }
    function copyBtn(p) {
      return h('button.btn.btn--ghost.sp-copy', { type: 'button', onclick: function () {
        var done = function () { say('Datos de ' + p.name + ' copiados. Pégalos en Excel.'); };
        if (root.navigator && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(p.copy).then(done, function () { say('No se pudo copiar.'); }); else say('Tu navegador no permite copiar automáticamente.');
      } }, 'Copiar datos (para Excel)');
    }

    /* ---------- examen ---------- */
    function paintExam() {
      box.textContent = '';
      var count = h('span.sim-count', null, 'Contestadas: 0 de ' + total());
      var bar = h('div.sim-bar', null, count, h('span.sp-seed', null, 'Código ', h('b', null, ex.seed)),
        ex.left != null ? h('span.sim-clock', null, '⏱ ', h('span.sim-time', null, fmtT(ex.left))) : null,
        h('button.btn.btn--primary', { type: 'button', onclick: function () { submit(false); } }, 'Entregar examen'));
      var msg = h('p.sim-msg', { role: 'alert' });
      box.append(bar, msg);
      ex.ps.forEach(function (p) {
        var sec = h('section.sp-pr', { 'aria-labelledby': uid + '-' + p.id }, h('h3.sp-h', { id: uid + '-' + p.id }, p.name));
        p.intro.forEach(function (t) { sec.append(h('p', null, t)); });
        p.tables.forEach(function (t) { sec.append(dataTable(t)); });
        sec.append(copyBtn(p));
        var fs = h('fieldset.sp-qs', null, h('legend', null, 'Cuestiones'));
        p.items.forEach(function (it, i) {
          var id = uid + '-' + it.id, ctl;
          if (it.kind === 'sel') {
            ctl = h('select.sp-in', { id: id, onchange: function () { ex.ans[it.id] = ctl.value; upd(); } }, h('option', { value: '' }, '— elige —'), it.opts.map(function (o, k) { return h('option', { value: String(k) }, o); }));
          } else {
            ctl = h('input.sp-in', { id: id, type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', oninput: function () { ex.ans[it.id] = ctl.value.trim(); upd(); } });
          }
          if (ex.ans[it.id] != null) ctl.value = ex.ans[it.id];
          fs.append(h('div.sp-q', null, h('span.tt-n', null, String(i + 1)), h('label.sp-lbl', { for: id }, it.label), h('span.sp-ctl', null, ctl, it.unit ? h('span.sp-unit', null, it.unit) : null)));
        });
        sec.append(fs); box.append(sec);
      });
      function upd() { count.textContent = 'Contestadas: ' + answered() + ' de ' + total(); msg.textContent = ''; }
      upd();
      box.append(h('div.sim-end', null, h('button.btn.btn--primary', { type: 'button', onclick: function () { submit(false); } }, 'Entregar examen'),
        h('button.btn.btn--ghost', { type: 'button', onclick: function () { if (root.confirm('¿Abandonar el examen? Se perderán las respuestas.')) setup(); } }, 'Abandonar')));
      box._msg = msg;
    }

    function submit(force) {
      var blank = total() - answered();
      if (!force && blank > 0 && !ex.warned) { ex.warned = true; box._msg.textContent = 'Te quedan ' + blank + ' sin contestar. Pulsa «Entregar examen» otra vez para entregarlo así (cuentan como fallo, no restan).'; say(box._msg.textContent); return; }
      stop(); ex.done = true; results('all');
    }

    /* ---------- resultados ---------- */
    function score() {
      var tot = 0, ok = 0, pr = ex.ps.map(function (p) {
        var o = 0; p.items.forEach(function (it) { var g = S.grade(it, ex.ans[it.id]); it._g = g; if (g.ok) o++; });
        tot += p.items.length; ok += o; return { p: p, ok: o, n: p.items.length };
      });
      var nota = pr.reduce(function (a, x) { return a + x.ok / x.n; }, 0) / pr.length * 10;
      return { pr: pr, ok: ok, tot: tot, nota: Math.round(nota * 10) / 10 };
    }
    function hist(hs) {
      var mx = Math.max.apply(0, hs.f);
      return h('figure.sp-hist', { role: 'img', 'aria-label': hs.caption + ': ' + hs.labels.map(function (l, i) { return l + ' ' + hs.f[i]; }).join(', ') },
        h('div.sp-bars', null, hs.f.map(function (v, i) { return h('div.sp-col', null, h('span.sp-fv', null, String(v)), h('span.sp-bar', { style: { height: (v / mx * 100) + '%' } })); })),
        h('div.sp-xl', null, hs.labels.map(function (l) { return h('span', null, l); })), h('figcaption', null, hs.caption + ' · eje X: estatura (cm) · eje Y: frecuencia absoluta'));
    }
    function results(filter) {
      box.textContent = ''; var s = score(), d = s.nota;
      var verdict = d >= 8.5 ? 'Sobresaliente: dominas las cinco prácticas.' : d >= 7 ? 'Notable: repasa los fallos y estás listo.' : d >= 5 ? 'Aprobado justo: refuerza las prácticas con peor porcentaje.' : 'Todavía no: estudia el procedimiento de cada práctica y repite con datos nuevos.';
      var trs = s.pr.map(function (x) { return h('tr', null, h('th', { scope: 'row' }, x.p.name), h('td', null, x.ok + ' / ' + x.n), h('td', null, Math.round(x.ok / x.n * 100) + ' %')); });
      box.append(h('div.sim-result', { tabindex: '-1' },
        h('p.sim-nota', null, h('b', null, d.toFixed(1).replace('.', ',')), ' / 10'),
        h('p.sim-sub', null, s.ok + ' aciertos de ' + s.tot + ' cuestiones · código ' + ex.seed + ' · cada práctica pesa lo mismo'),
        h('p.tt-final', { role: 'status' }, verdict),
        h('div.sim-tables', null, h('div.table-wrap', { tabindex: '0', role: 'region', 'aria-label': 'Resultado por práctica (desplazable)' }, h('table.table.table--compact', null, h('caption', null, 'Por práctica'), h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Práctica'), h('th', { scope: 'col' }, 'Aciertos'), h('th', { scope: 'col' }, '%'))), h('tbody', null, trs)))),
        h('div.sim-end', null,
          h('button.btn.btn--primary', { type: 'button', onclick: function () { cfg.seed = ''; start(S.newSeed(), ex.ps.map(function (p) { return p.id; })); } }, 'Otro examen con datos nuevos'),
          h('button.btn.btn--ghost', { type: 'button', onclick: function () { start(ex.seed, ex.ps.map(function (p) { return p.id; })); } }, 'Repetir este mismo examen'),
          h('button.btn.btn--ghost', { type: 'button', onclick: setup }, 'Cambiar ajustes'))));
      var bad = s.ok === s.tot ? 0 : s.tot - s.ok;
      box.append(h('div.tt-filters', null, h('div.tt-fg', { role: 'group', 'aria-label': 'Qué cuestiones revisar' }, h('span.tt-fl', null, 'Revisar'),
        pill('Todas (' + s.tot + ')', filter === 'all', function () { results('all'); }), pill('Solo falladas (' + bad + ')', filter === 'bad', function () { results('bad'); }))));
      s.pr.forEach(function (x) {
        var p = x.p, sec = h('section.sp-pr', null, h('h3.sp-h', null, p.name, h('span.tt-dif', null, x.ok + ' / ' + x.n)));
        var how = h('details.sp-how', { open: '' }, h('summary', null, 'Procedimiento'), h('ul', null, p.steps.map(function (t) { return h('li', null, t); })));
        sec.append(how);
        if (p.hist) sec.append(hist(p.hist));
        var list = h('div.tt-list');
        p.items.forEach(function (it, i) {
          var g = it._g; if (filter === 'bad' && g.ok) return;
          var card = h('div.tt-q.is-done.sp-res'); card.style.setProperty('border-left-color', g.ok ? 'var(--c-green)' : 'var(--c-red)');
          card.append(h('p.sp-rq', null, h('span.tt-n', null, String(i + 1)), h('span', null, it.label)));
          card.append(h('p.sp-ans', null, h('span', null, 'Tu respuesta: '), h('b', null, g.blank ? '(en blanco)' : (g.given || '—')), '  ', h('span.tt-mark', null, g.ok ? '✔' : '✘')));
          card.append(h('div.tt-fb.' + (g.ok ? 'is-ok' : 'is-ko'), null, h('p.tt-fb__h', null, g.ok ? '✔ ¡Correcto!' : '✘ Correcta: ' + S.correct(it)), h('p', null, it.expl)));
          list.append(card);
        });
        if (!list.children.length) list.append(h('p.sim-hint', null, 'Sin fallos en esta práctica.'));
        sec.append(list); box.append(sec);
      });
      var r = box.querySelector('.sim-result'); if (r) r.focus({ preventScroll: false });
      say('Resultado: ' + d.toFixed(1) + ' sobre 10.');
      root.scrollTo({ top: Math.max(el.getBoundingClientRect().top + root.scrollY - 80, 0) });
    }
    setup();
  });
})(window);
