/*!
 * HISdata Wiki · widgets/sheet.js
 * Responsabilidad ÚNICA: mostrar un libro de Excel (todas sus hojas) con cálculo vivo, fórmulas explicadas y gráficas.
 *   <div class="widget widget--wide" data-widget="sheet" data-book="ambulancia"> … </div>
 * Usa: HIS_BOOKS (data/workbooks.js), HIS.formula (motor), HIS.formulaExplain, HIS.numfmt, HIS.sheetCharts, HIS.ui.tabs, HIS.a11y.
 * Teclado: flechas, Inicio/Fin, Re Pág/Av Pág; Intro o F2 edita (solo celdas de entrada); Esc cancela; escribir un número también edita.
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h;

  var KIND = { formula: 'Fórmula', input: 'Entrada editable', text: 'Texto', number: 'Número fijo', empty: 'Celda vacía' };
  var MAXCOL = 26;

  function colW(sd, c) { return Math.max(6, Math.min(c === 1 ? 34 : 22, ((sd.colWidths || [])[c - 1] || 12))); }
  function merges(sd) {
    var F = HIS.formula, span = {}, cover = {};
    (sd.merges || []).forEach(function (m) {
      var a = m.split(':'), p = F.parseRef(a[0]), q = F.parseRef(a[1]);
      if (!p || !q) return;
      span[p.key] = { cs: q.col - p.col + 1, rs: q.row - p.row + 1 };
      for (var r = p.row; r <= q.row; r++) for (var c = p.col; c <= q.col; c++) if (r !== p.row || c !== p.col) cover[F.keyOf(c, r)] = p.key;
    });
    return { span: span, cover: cover };
  }

  function mount(el, cfg) {
    var F = HIS.formula, def = (root.HIS_BOOKS || {})[cfg.book];
    var base = root.HIS_BASE || '';
    if (!def) { el.appendChild(h('p.callout.callout--warn', { role: 'alert' }, 'No se encuentra la hoja de cálculo «' + cfg.book + '».')); return; }
    var book = F.createBook(def, { locale: 'es' }), api = {};
    (HIS.sheets = HIS.sheets || {})[cfg.book] = api;
    var X = HIS.formulaExplain;
    var mode = 'values', panels = [], byName = {}, current = 0, tabsApi = null, lastOpener = null, routeVals = [];

    /* ---------- cabecera ---------- */
    var head = el.querySelector('.widget__head');
    Array.prototype.slice.call(el.children).forEach(function (c) { if (c !== head) el.removeChild(c); });
    if (!head) {
      head = h('div.widget__head', null, h('h3.widget__title', null, def.title), h('p.widget__sub', null, def.desc));
      el.insertBefore(head, el.firstChild);
    }

    /* ---------- barra de herramientas ---------- */
    var fxBtn = h('button.btn.btn--ghost.sheet-mode', { type: 'button', 'aria-pressed': 'false', onclick: function () { setMode(mode === 'values' ? 'formulas' : 'values'); } }, 'Ver fórmulas');
    var resetBtn = h('button.btn.btn--ghost', { type: 'button', disabled: true, onclick: doReset }, 'Restablecer');
    var dl = h('a.btn.btn--ghost', { href: base + 'assets/excel/' + encodeURIComponent(def.file), download: def.file }, 'Descargar el Excel (.xlsx)');
    var legend = h('ul.sheet-legend', { 'aria-label': 'Leyenda de colores' },
      h('li', null, h('span.sheet-key.sheet-key--input', { 'aria-hidden': 'true' }, '12'), ' Entrada: se puede cambiar (Intro o F2)'),
      h('li', null, h('span.sheet-key.sheet-key--formula', { 'aria-hidden': 'true' }, '='), ' Fórmula: se calcula sola'),
      h('li', null, h('span.sheet-key.sheet-key--text', { 'aria-hidden': 'true' }, 'Aa'), ' Texto o rótulo'));
    var bigBtn = h('button.btn.btn--ghost', { type: 'button', 'aria-pressed': 'false', onclick: function () { var on = el.classList.toggle('is-big'); bigBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); bigBtn.textContent = on ? 'Reducir la hoja' : 'Ampliar la hoja'; HIS.a11y.announce(on ? 'Hoja ampliada.' : 'Hoja reducida.', { delay: 50 }); } }, 'Ampliar la hoja');
    var backBtn = h('button.btn.sheet-back', { type: 'button', hidden: true, onclick: function () { var o = lastOpener; backBtn.hidden = true; lastOpener = null; if (o && o.isConnected) { o.scrollIntoView({ block: 'center', behavior: HIS.prefs.reducedMotion() ? 'auto' : 'smooth' }); o.focus({ preventScroll: true }); } } }, '↩ Volver al paso del ejercicio');
    var simple = false;
    var simpleBtn = h('button.btn.btn--ghost', { type: 'button', 'aria-pressed': 'false', onclick: function () { setSimple(!simple); } }, 'Vista de tabla simple');
    var toolbar = h('div.sheet-toolbar', { role: 'group', 'aria-label': 'Opciones de la hoja de cálculo' }, backBtn, fxBtn, simpleBtn, bigBtn, resetBtn, dl);
    el.appendChild(toolbar);
    el.appendChild(legend);

    /* ---------- construcción de cada hoja ---------- */
    def.sheets.forEach(function (sd) {
      var P = buildPanel(sd);
      panels.push(P); byName[sd.name] = P;
    });
    var route = buildRoute(); if (route) el.appendChild(route);
    var tabs = HIS.ui.tabs(panels.map(function (P) { return { id: P.name, label: P.name, content: P.root }; }), {
      label: 'Hojas del libro ' + def.title,
      onSelect: function (i) {
        var first = current === i && !tabsApi; current = i; if (panels[i]) { showCharts(panels[i]); if (simple) renderSimple(panels[i]); }
        if (tabsApi && panels.length > 1) HIS.a11y.announce('Hoja ' + panels[i].name + ', ' + (i + 1) + ' de ' + panels.length + (panels[i].rows ? '. ' + panels[i].rows + ' filas.' : '.'), { delay: 80 });
      }
    });
    tabs.el.classList.add('tabs--sheet'); if (panels.length === 1) tabs.el.classList.add('tabs--single');
    tabsApi = tabs;
    el.appendChild(tabs.el);
    showCharts(panels[0]);

    /* ---------- ruta guiada: salta directo a cada fórmula, agrupada por apartado ---------- */
    function sectionOf(sd, row) {
      var best = null;
      Object.keys(sd.cells).forEach(function (k) {
        var p = F.parseRef(k), c = sd.cells[k];
        if (p.col === 1 && p.row < row && c.b && typeof c.v === 'string' && !c.bg && (!best || p.row > best.row)) best = { row: p.row, text: c.v.replace(/\s*\(.*$/, '') };
      });
      return best ? best.text : '';
    }
    function buildRoute() {
      var wrap = h('details.fold.sheet-route'), body = h('div.sheet-route__body'), total = 0;
      panels.forEach(function (P) {
        if (!P.tds || !Object.keys(P.tds).length) return;
        var cells = P.sd.cells, fk = Object.keys(cells).filter(function (k) { return cells[k].f != null && P.tds[k]; });
        if (!fk.length) return;
        var items = [];
        if (fk.length > 40) {
          var cols = {};
          fk.forEach(function (k) { var p = F.parseRef(k); if (!cols[p.col] || p.row < cols[p.col].row) cols[p.col] = { key: k, row: p.row, col: p.col }; cols[p.col].n = (cols[p.col].n || 0) + 1; });
          Object.keys(cols).forEach(function (c) { var o = cols[c]; items.push({ key: o.key, label: (X.labelOf(book, P.name, o.col, o.row) || 'columna ' + F.numToCol(o.col)) + ' (' + o.n + ' celdas)', sec: 'Columnas calculadas' }); });
        } else {
          fk.sort(function (a, b) { var p = F.parseRef(a), q = F.parseRef(b); return p.row - q.row || p.col - q.col; }).forEach(function (k) {
            var p = F.parseRef(k), v = book.display(P.name, k);
            if (typeof v === 'string' && v.length > 40) return;
            items.push({ key: k, label: X.labelOf(book, P.name, p.col, p.row) || '', sec: sectionOf(P.sd, p.row) });
          });
        }
        var secs = {}, order = [];
        items.forEach(function (it) { var t = it.sec || 'Fórmulas'; if (!secs[t]) { secs[t] = []; order.push(t); } secs[t].push(it); });
        order.forEach(function (t) {
          var ul = h('ul.sheet-route__list');
          secs[t].forEach(function (it) {
            var val = h('span.sheet-route__v');
            routeVals.push({ P: P, key: it.key, el: val });
            ul.appendChild(h('li', null, h('button.sheet-route__b', { type: 'button', onclick: function (e) { jump(P.name, it.key, e.currentTarget); } }, h('b', null, it.key), it.label ? ' ' + it.label : '', ' ', val)));
            total++;
          });
          body.appendChild(h('div.sheet-route__g', null, h('h4.sheet-route__t', null, (panels.length > 1 ? P.name + ' · ' : '') + t), ul));
        });
      });
      if (!total) return null;
      wrap.appendChild(h('summary', null, 'Ir directamente a una fórmula (' + total + ')'));
      wrap.appendChild(body); refreshRoute();
      return wrap;
    }
    function refreshRoute() { routeVals.forEach(function (r) { var t = book.display(r.P.name, r.key); r.el.textContent = t != null && String(t).length <= 30 && !/ celdas\)/.test(r.el.parentNode.textContent) ? '= ' + t : ''; }); }
    function jump(sheet, key, opener) {
      var P = byName[sheet]; if (!P || !P.tds[key]) return;
      el.scrollIntoView({ block: 'start', behavior: HIS.prefs.reducedMotion() ? 'auto' : 'smooth' });
      goTo(sheet, key);
      if (opener) { lastOpener = opener; backBtn.hidden = !!opener.closest('.sheet-route'); }
      var ex = X.explain(book, sheet, key);
      HIS.a11y.announce('Celda ' + key + ' de la hoja ' + sheet + (ex.valueText ? ', valor ' + ex.valueText : '') + '. ' + (ex.what || ''), { delay: 250 });
    }
    api.jump = jump;

    function cellKind(c) {
      if (!c) return 'empty';
      if (c.f != null) return 'formula';
      if (c.input) return 'input';
      if (typeof c.raw === 'string') return 'text';
      return c.raw == null ? 'empty' : 'number';
    }
    function cellText(P, key) {
      var c = book.cell(P.name, key);
      if (!c) return '';
      if (mode === 'formulas' && c.f != null) return '=' + c.f;
      return book.display(P.name, key);
    }
    function paintCell(P, key) {
      var td = P.tds[key]; if (!td || P.editing && P.editing.td === td) return;
      td.textContent = cellText(P, key);
    }

    function buildPanel(sd) {
      var P = { name: sd.name, sd: sd, tds: {}, active: null, hl: [], charts: null, dirty: false, editing: null };
      var mg = merges(sd), cells = sd.cells, keys = Object.keys(cells);
      var chartsOnly = (sd.charts || []).length && keys.length < 6;
      var inspBox = h('div.sheet-insp'); P.insp = inspBox;
      P.root = h('div.sheet-panel');
      if (sd.desc) P.root.appendChild(h('p.sheet-panel__desc', null, sd.desc));

      if (chartsOnly) {
        keys.forEach(function (k) { P.root.appendChild(h('p.sheet-note', null, cells[k].v)); });
      } else {
        var cols = Math.min(sd.cols || 1, MAXCOL), rows = sd.rows || 1, c, r;
        P.cols = cols; P.rows = rows; P.mg = mg;
        var colgroup = h('colgroup', null, h('col.sheet-rh'));
        for (c = 1; c <= cols; c++) colgroup.appendChild(h('col', { style: { width: colW(sd, c) + 'ch' } }));
        var thead = h('tr', { role: 'row' }, h('th.sheet-corner', { scope: 'col', role: 'columnheader' }, h('span.sr-only', null, 'Fila')));
        for (c = 1; c <= cols; c++) thead.appendChild(h('th.sheet-ch', { scope: 'col', role: 'columnheader' }, F.numToCol(c)));
        var tbody = h('tbody');
        for (r = 1; r <= rows; r++) {
          var tr = h('tr', { role: 'row' }, h('th.sheet-rh', { scope: 'row', role: 'rowheader' }, String(r)));
          var skipTo = 0;
          for (c = 1; c <= cols; c++) {
            var key = F.keyOf(c, r);
            if (mg.cover[key] || c <= skipTo) continue;
            var rec = cells[key], cell = book.cell(sd.name, key), kind = cellKind(cell), cls = ['sheet-cell', 'is-' + kind];
            if (rec) {
              if (rec.b) cls.push('is-b'); if (rec.i) cls.push('is-i');
              if (rec.al === 'center') cls.push('is-center'); else if (rec.al === 'right') cls.push('is-right');
              if (rec.bg && rec.fg === '#ffffff') cls.push('is-head');
              if (rec.sz && rec.sz >= 14) cls.push('is-title');
              if (rec.w || (typeof rec.v === 'string' && rec.v.length > 42)) cls.push('is-wrap');
              if (kind !== 'text' && kind !== 'empty' && typeof (cell && book.get(sd.name, key)) === 'number' && !rec.al) cls.push('is-right');
            }
            var td = h('td', { class: cls.join(' '), role: 'gridcell', tabindex: '-1', 'aria-readonly': kind === 'input' ? 'false' : 'true', 'aria-selected': 'false', dataset: { ref: key } });
            var sp = mg.span[key], spill = 0;
            if (!sp && rec && kind === 'text' && !rec.bg && typeof rec.v === 'string') {
              var need = Math.ceil(rec.v.length * (rec.b ? 1.1 : 1) * (rec.sz && rec.sz >= 14 ? 1.5 : 1)), have = colW(sd, c);
              for (var k = c + 1; k <= cols && have < need; k++) {
                var nk = F.keyOf(k, r), nr = cells[nk];
                if (mg.cover[nk] || mg.span[nk] || (nr && (nr.v != null && nr.v !== '' || nr.f != null || nr.bg || nr.input))) break;
                have += colW(sd, k); spill++;
              }
              if (spill) { td.setAttribute('colspan', spill + 1); td.className = td.className.replace(' is-wrap', '') + ' is-spill'; skipTo = c + spill; }
            }
            if (sp) { if (sp.cs > 1) td.setAttribute('colspan', Math.min(sp.cs, cols - c + 1)); if (sp.rs > 1) td.setAttribute('rowspan', sp.rs); }
            P.tds[key] = td; td.textContent = cellText(P, key);
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        }
        P.table = h('table.sheet-grid', { role: 'grid', 'aria-label': 'Hoja «' + sd.name + '» del libro ' + def.title + '. ' + (HIS.sheetHint || 'Usa las flechas para moverte; Intro o F2 edita las celdas de entrada.'), 'aria-rowcount': rows + 1, 'aria-colcount': cols + 1 }, colgroup, h('thead', null, thead), tbody);
        var tw = 0; for (c = 1; c <= cols; c++) tw += colW(sd, c); P.table.style.width = 'calc(3rem + ' + (tw + cols * 1.6) + 'ch)';
        P.scroll = h('div.sheet-scroll', { tabindex: '0', role: 'region', 'aria-label': 'Hoja ' + sd.name + ': cuadrícula desplazable' + (rows > 14 ? ' (' + rows + ' filas)' : '') }, P.table);
        P.root.appendChild(P.scroll);
        P.root.appendChild(inspBox);
        P.table.addEventListener('keydown', function (e) { onKey(P, e); });
        P.table.addEventListener('click', function (e) { var td = e.target.closest && e.target.closest('td'); if (td && td.dataset.ref && !(e.target.tagName === 'INPUT')) select(P, td.dataset.ref, false); });
        P.table.addEventListener('dblclick', function (e) { var td = e.target.closest && e.target.closest('td'); if (td && td.dataset.ref) { select(P, td.dataset.ref, true); startEdit(P, td.dataset.ref); } });
        // celda inicial: primera entrada editable, si no, primera fórmula, si no, la primera con contenido
        var first = keys.filter(function (k) { return cells[k].input; })[0] || keys.filter(function (k) { return cells[k].f != null; })[0] || keys[0];
        if (first && P.tds[first]) { P.active = first; P.tds[first].tabIndex = 0; select(P, first, false, true); }
      }
      (sd.images || []).forEach(function (im) {
        P.root.appendChild(h('figure.sheet-img', null, h('img', { src: base + 'assets/img/' + im.src, alt: im.alt || 'Imagen de la hoja', loading: 'lazy', width: im.w, height: im.h }), h('figcaption', null, im.alt || '')));
      });
      if ((sd.charts || []).length) {
        P.chartBox = h('div.sheet-charts');
        P.root.appendChild(h('h4.sheet-h', null, 'Gráficas de esta hoja'));
        P.root.appendChild(P.chartBox);
      }
      return P;
    }

    /* ---------- gráficas (se crean al ver la pestaña; se redibujan solo si algo cambió) ---------- */
    function showCharts(P) {
      if (!P || !P.chartBox || !HIS.sheetCharts || !HIS.plot) return;
      if (!P.charts) {
        P.charts = [];
        P.sd.charts.slice().sort(function (a, b) { return ((a.anchor || {}).row || 0) - ((b.anchor || {}).row || 0) || ((a.anchor || {}).col || 0) - ((b.anchor || {}).col || 0); }).forEach(function (cd) {
          var box = h('div.sheet-chart'); P.chartBox.appendChild(box);
          try { P.charts.push(HIS.sheetCharts.create(book, cd, box)); } catch (err) { if (root.console) console.error('[HISdata] gráfica', cd.title, err); }
        });
        P.dirty = false;
      } else if (P.dirty) { P.charts.forEach(function (c) { c.update(); }); P.dirty = false; }
    }

    /* ---------- selección e inspector ---------- */
    function select(P, key, focus, silent) {
      var old = P.active && P.tds[P.active];
      if (old) { old.tabIndex = -1; old.setAttribute('aria-selected', 'false'); old.classList.remove('is-sel'); }
      P.hl.forEach(function (n) { n.className = n.className.replace(/\bis-p\d\b/g, '').trim(); });
      P.hl = [];
      var td = P.tds[key]; if (!td) return;
      P.active = key; td.tabIndex = 0; td.setAttribute('aria-selected', 'true'); td.classList.add('is-sel');
      if (focus) td.focus();
      renderInspector(P, key);
      var cell = book.cell(P.name, key);
      (cell && cell.deps || []).forEach(function (d) {
        if (d.sheet !== P.name) return;
        var node = d.node, ex = null;
        var idx = (P.lastExplain && P.lastExplain.refs || []);
        for (var r = d.r1; r <= d.r2 && P.hl.length < 400; r++) for (var c = d.c1; c <= d.c2; c++) {
          var t = P.tds[F.keyOf(c, r)]; if (!t) continue;
          var color = 0; idx.forEach(function (x) { if (x.sheet === d.sheet && x.first === F.keyOf(d.c1, d.r1)) color = x.color; });
          t.className += ' is-p' + color; P.hl.push(t);
        }
      });
    }

    function tokenNode(t) {
      if (t.cls === 'ws') return document.createTextNode(t.text);
      return h('span', { class: 'sheet-tk sheet-tk--' + t.cls + (t.color != null ? ' sheet-tk--c' + t.color : '') }, t.text);
    }

    function renderInspector(P, key) {
      var ex = X.explain(book, P.name, key), box = P.insp;
      P.lastExplain = ex;
      var cell = book.cell(P.name, key), kind = ex.kind, lab = X.labelOf(book, P.name, F.parseRef(key).col, F.parseRef(key).row);
      HIS.dom.clear(box);
      box.setAttribute('role', 'region'); box.setAttribute('tabindex', '0'); box.setAttribute('aria-label', 'Explicación de la celda ' + key + ' (hoja ' + P.name + ', ' + def.title + ')');
      var fx = h('div.sheet-fbar__f');
      if (kind === 'formula') ex.tokens.forEach(function (t) { fx.appendChild(tokenNode(t)); });
      else fx.appendChild(h('span', null, ex.valueText || (kind === 'empty' ? '(vacía)' : '')));
      box.appendChild(h('div.sheet-fbar', null, h('span.sheet-fbar__ref', null, key), h('span.sheet-fbar__fx', { 'aria-hidden': 'true' }, 'fx'), h('code.sheet-fbar__code', { tabindex: '0' }, fx)));
      var dl = h('dl.sheet-insp__dl');
      dl.appendChild(h('dt', null, 'Tipo de celda'));
      dl.appendChild(h('dd', null, h('span.pill', null, KIND[kind]), lab && kind !== 'text' ? h('span.sheet-insp__lab', null, ' ' + lab) : null));
      var what = ex.what;
      if (kind === 'input') {
        var n = (book.dependents[P.name + '!' + key] || []).length;
        what += ' Alimenta ' + n + (n === 1 ? ' fórmula.' : ' fórmulas.') + ' Pulsa Intro o F2 para editarla.';
      }
      dl.appendChild(h('dt', null, kind === 'formula' ? 'Qué hace' : 'Qué es'));
      dl.appendChild(h('dd', null, what));
      if (kind === 'formula') {
        dl.appendChild(h('dt', null, 'Con tus valores'));
        dl.appendChild(h('dd', null, h('code', null, ex.subst), ' → ', h('strong', null, ex.valueText || '(vacío)')));
        if (ex.refs.length) {
          dl.appendChild(h('dt', null, 'Usa estas celdas'));
          var ul = h('ul.sheet-prec');
          ex.refs.slice(0, 14).forEach(function (r) {
            ul.appendChild(h('li', null, h('button.sheet-prec__b', { type: 'button', onclick: function () { goTo(r.sheet, r.first); } },
              h('span', { class: 'sheet-prec__sw sheet-tk--c' + r.color, 'aria-hidden': 'true' }), h('b', null, (r.sheet !== P.name ? r.sheet + '!' : '') + r.ref),
              r.label && r.cells === 1 ? ' ' + r.label : '', r.cells > 1 ? ' (' + r.cells + ' celdas)' : '', r.valueText ? ' = ' + r.valueText : '')));
          });
          if (ex.refs.length > 14) ul.appendChild(h('li.sheet-more', null, '… y ' + (ex.refs.length - 14) + ' más'));
          dl.appendChild(h('dd', null, ul));
        }
        if (ex.functions.length) {
          dl.appendChild(h('dt', null, 'Funciones que aparecen'));
          dl.appendChild(h('dd', null, h('ul.sheet-fns', null, ex.functions.map(function (f) {
            return h('li', null, h('b', null, f.name), f.es && f.es !== f.name ? ' (en Excel en español: ' + f.es + ')' : '', ' — ', f.desc, ' ', h('code', null, f.sig));
          }))));
        }
      }
      box.appendChild(dl);
    }

    function goTo(sheet, key) {
      var P = byName[sheet]; if (!P) return;
      var i = panels.indexOf(P);
      if (i !== current) tabsApi.select(i);
      select(P, key, true);
      var td = P.tds[key], sc = P.scroll;
      if (td && sc) {
        var right = td.offsetLeft + td.offsetWidth;
        sc.scrollTo({ top: Math.max(0, td.offsetTop - sc.clientHeight / 2 + td.offsetHeight / 2), left: right <= sc.clientWidth ? 0 : Math.max(0, right - sc.clientWidth + 24) });
      }
    }

    /* ---------- teclado ---------- */
    function tdAt(P, c, r) {
      var key = F.keyOf(c, r); if (P.mg.cover[key]) key = P.mg.cover[key];
      return P.tds[key] ? key : null;
    }
    function onKey(P, e) {
      if (P.editing || e.target.tagName === 'INPUT') return;
      var td = e.target.closest('td'); if (!td || !td.dataset.ref) return;
      var p = F.parseRef(td.dataset.ref), c = p.col, r = p.row, k = e.key, nc = c, nr = r, found;
      if (k === 'Enter' || k === 'F2') {
        e.preventDefault();
        var cell = book.cell(P.name, p.key);
        if (cell && cell.input) startEdit(P, p.key);
        else HIS.a11y.announce('La celda ' + p.key + ' no se puede editar: ' + (cell && cell.f != null ? 'es una fórmula, se calcula sola.' : 'es un rótulo o un dato fijo.'), { delay: 50 });
        return;
      }
      if (/^[0-9,.\-]$/.test(k) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var cc = book.cell(P.name, p.key);
        if (cc && cc.input) { e.preventDefault(); startEdit(P, p.key, k); }
        return;
      }
      var dc = 0, dr = 0;
      if (k === 'ArrowRight') dc = 1; else if (k === 'ArrowLeft') dc = -1; else if (k === 'ArrowDown') dr = 1; else if (k === 'ArrowUp') dr = -1;
      else if (k === 'PageDown') dr = 10; else if (k === 'PageUp') dr = -10;
      else if (k === 'Home') { if (e.ctrlKey) { nr = 1; } nc = 1; }
      else if (k === 'End') { nc = P.cols; if (e.ctrlKey) nr = P.rows; }
      else return;
      e.preventDefault();
      if (dc || dr) {
        var step = Math.abs(dc || dr) > 1 ? (dr > 0 ? 1 : -1) : (dc || dr), n = Math.abs(dc || dr) > 1 ? 10 : 1, tries = 0;
        for (var i = 0; i < n; i++) {
          var cc2 = nc, rr2 = nr; found = null;
          do { if (dc) cc2 += step; else rr2 += step; tries++; if (cc2 < 1 || cc2 > P.cols || rr2 < 1 || rr2 > P.rows) break; found = tdAt(P, cc2, rr2); } while (!found && tries < 60);
          if (!found) break; nc = cc2; nr = rr2;
        }
        if (nc === c && nr === r) return;
      }
      found = tdAt(P, nc, nr); if (found && found !== p.key) select(P, found, true);
    }

    /* ---------- edición ---------- */
    function startEdit(P, key, initial) {
      var td = P.tds[key], cell = book.cell(P.name, key);
      if (!td || !cell || !cell.input || P.editing) return;
      var raw = typeof cell.raw === 'number' ? String(cell.raw).replace('.', ',') : '';
      var lab = X.labelOf(book, P.name, cell.col, cell.row);
      var inp = h('input.sheet-edit', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': 'Editar ' + key + (lab ? ': ' + lab : '') + '. Intro acepta, Escape cancela', value: initial != null ? initial : raw });
      HIS.dom.clear(td); td.appendChild(inp);
      var E = P.editing = { td: td, inp: inp, key: key, done: false };
      inp.focus();
      if (initial == null) inp.select(); else inp.setSelectionRange(inp.value.length, inp.value.length);
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); commit(P, true); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(P, true); HIS.a11y.announce('Edición cancelada. ' + key + ' conserva su valor.', { delay: 50 }); }
        else if (e.key === 'Tab') commit(P, false);
      });
      inp.addEventListener('blur', function () { if (!E.done) commit(P, false, true); });
    }
    function finish(P, refocus) {
      var E = P.editing; if (!E) return;
      E.done = true; P.editing = null;
      paintCell(P, E.key);
      if (refocus) E.td.focus();
    }
    function commit(P, refocus, fromBlur) {
      var E = P.editing; if (!E || E.done) return;
      var n = F.parseNumber(E.inp.value);
      if (n == null) {
        if (fromBlur) { finish(P, false); HIS.a11y.announce('«' + E.inp.value + '» no es un número; se mantiene el valor anterior.', { delay: 50 }); return; }
        E.inp.setAttribute('aria-invalid', 'true');
        HIS.a11y.announce('Escribe un número, por ejemplo 12 o 0,35.', { assertive: true, delay: 50 });
        return;
      }
      var key = E.key, changed = book.set(P.name, key, n);
      finish(P, refocus);
      afterChange(P, key, changed);
    }

    function afterChange(P, key, changed) {
      changed.forEach(function (c) { var Q = byName[c.sheet]; if (Q) { paintCell(Q, c.ref); if (Q !== panels[current]) Q.dirty = true; } });
      panels.forEach(function (Q) { if (Q.charts && Q !== panels[current]) Q.dirty = true; });
      var cur = panels[current]; cur.dirty = true; showCharts(cur);
      if (cur.active) renderInspector(cur, cur.active);
      resetBtn.disabled = !book.isModified(); refreshRoute(); refreshSimple();
      var n = Math.max(0, changed.length - 1);
      HIS.a11y.announce(key + ' vale ahora ' + book.display(P.name, key) + '. Se ' + (n === 1 ? 'ha recalculado 1 celda.' : 'han recalculado ' + n + ' celdas.') + ' Gráficas actualizadas.', { delay: 150 });
    }

    function doReset() {
      if (!book.reset()) return;
      panels.forEach(function (P) { Object.keys(P.tds).forEach(function (k) { paintCell(P, k); }); P.dirty = true; });
      showCharts(panels[current]);
      var P = panels[current]; if (P.active) renderInspector(P, P.active);
      resetBtn.disabled = true; refreshRoute(); refreshSimple();
      HIS.a11y.announce('Valores originales restablecidos.', { delay: 100 });
    }

    /* Vista de tabla simple: una tabla HTML normal (sin cuadrícula interactiva) para lectores de pantalla y para móviles */
    function renderSimple(P) {
      if (!P || !P.table) return;
      if (!P.simpleBox) { P.simpleBox = h('div.sheet-simple', { tabindex: '0', role: 'region', 'aria-label': 'Hoja ' + P.name + ' como tabla simple' }); P.scroll.parentNode.insertBefore(P.simpleBox, P.scroll); }
      var sd = P.sd, cells = sd.cells, F2 = F, rows = [], used = [], r, c;
      for (r = 1; r <= P.rows; r++) {
        var row = [], any = false;
        for (c = 1; c <= P.cols; c++) {
          var k = F2.keyOf(c, r), t = book.cell(sd.name, k) ? book.display(sd.name, k) : (cells[k] && cells[k].v != null ? String(cells[k].v) : '');
          if (t !== '' && t != null) { any = true; used[c] = true; }
          row.push({ k: k, t: t == null ? '' : String(t), c: cells[k] });
        }
        if (any) rows.push({ r: r, cells: row });
      }
      var cs = []; for (c = 1; c <= P.cols; c++) if (used[c]) cs.push(c);
      var tb = h('tbody'), body, isHead = function (x) { return x.c && x.c.bg && x.c.fg === '#ffffff'; };
      var th = h('tr', null, h('th', { scope: 'col' }, 'Fila')); cs.forEach(function (cc) { th.appendChild(h('th', { scope: 'col' }, 'Col. ' + F2.numToCol(cc))); });
      rows.forEach(function (R) {
        var head = R.cells.some(isHead), tr = h('tr', { class: head ? 'is-head' : '' }, h('th', { scope: 'row' }, String(R.r)));
        cs.forEach(function (cc) {
          var x = R.cells[cc - 1], kind = x.c && x.c.input ? 'is-input' : x.c && x.c.f != null ? 'is-formula' : '';
          tr.appendChild(head && x.t ? h('th', { scope: 'col', class: 'is-h' }, x.t) : h('td', { class: kind }, x.t));
        });
        tb.appendChild(tr);
      });
      HIS.dom.clear(P.simpleBox);
      P.simpleBox.appendChild(h('table.sheet-simple__t', null, h('caption', null, 'Hoja «' + P.name + '» (' + rows.length + ' filas con datos). Verde: fórmula; azul: dato que puedes cambiar en la hoja interactiva.'), h('thead', null, th), tb));
    }
    function setSimple(on) {
      simple = on; simpleBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); simpleBtn.textContent = on ? 'Volver a la hoja interactiva' : 'Vista de tabla simple';
      el.classList.toggle('is-simple', on);
      if (on) panels.forEach(function (P) { renderSimple(P); });
      HIS.a11y.announce(on ? 'Vista de tabla simple activada. Cada hoja es ahora una tabla normal con cabeceras de fila y de columna.' : 'Vuelves a la hoja interactiva.', { delay: 80 });
    }
    function refreshSimple() { if (simple) renderSimple(panels[current]); }

    function setMode(m) {
      mode = m; fxBtn.setAttribute('aria-pressed', m === 'formulas' ? 'true' : 'false');
      el.classList.toggle('is-formulas', m === 'formulas');
      panels.forEach(function (P) { Object.keys(P.tds).forEach(function (k) { paintCell(P, k); }); });
      HIS.a11y.announce(m === 'formulas' ? 'Mostrando las fórmulas de las celdas.' : 'Mostrando los valores calculados.', { delay: 100 });
    }
  }

  HIS.widgets.register('sheet', mount);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-sheet-goto]'); if (!b) return;
    var a = b.getAttribute('data-sheet-goto').split('|'), w = document.querySelector('[data-widget="sheet"][data-book="' + a[0] + '"]');
    if (!w) return;
    HIS.widgets.init(w);
    var go = function () { var api = HIS.sheets && HIS.sheets[a[0]]; if (api && api.jump) api.jump(a[1], a[2], b); };
    go();
  });
  HIS.sheetMount = mount;
})(window);
