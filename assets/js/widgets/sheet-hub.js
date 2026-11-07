/*!
 * HISdata Wiki · widgets/sheet-hub.js
 * Responsabilidad ÚNICA: selector de los libros de Excel. Al elegir uno, monta el visor (widgets/sheet.js) debajo.
 *   <div class="widget widget--wide" data-widget="sheet-hub"> … </div>
 * Opcional: data-book="ambulancia" abre ese libro al cargar. Usa HIS_BOOKS y HIS.sheetMount.
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, h = HIS.dom.h;

  function mount(el, cfg) {
    var books = root.HIS_BOOKS || {}, ids = Object.keys(books);
    var head = el.querySelector('.widget__head');
    Array.prototype.slice.call(el.children).forEach(function (c) { if (c !== head) el.removeChild(c); });
    if (!ids.length) { el.appendChild(h('p.callout.callout--warn', { role: 'alert' }, 'No se pudo cargar la colección de hojas de cálculo.')); return; }

    var btns = {}, stage = h('div.sheet-hub__stage', { 'aria-live': 'polite' }), current = null;
    var list = h('ul.sheet-hub__list', { 'aria-label': 'Libros de Excel disponibles' });
    ids.forEach(function (id) {
      var b = books[id];
      var btn = h('button.sheet-hub__btn', { type: 'button', 'aria-pressed': 'false', onclick: function () { open(id, true); } },
        h('strong', null, b.title), h('small', null, b.sheets.length + (b.sheets.length === 1 ? ' hoja' : ' hojas') + ': ' + b.sheets.map(function (s) { return s.name; }).join(', ')));
      btns[id] = btn; list.appendChild(h('li', null, btn));
    });
    el.appendChild(list); el.appendChild(stage);

    function open(id, announce) {
      if (id === current) return;
      if (current) btns[current].setAttribute('aria-pressed', 'false');
      current = id; btns[id].setAttribute('aria-pressed', 'true');
      HIS.dom.clear(stage);
      var b = books[id];
      var host = h('div.widget.widget--wide', { dataset: { widget: 'sheet', book: id, widgetReady: '1' } },
        h('div.widget__head', null, h('h3.widget__title', null, 'Hoja de cálculo'), h('p.widget__sub', null, b.title + '. ' + b.desc)));
      stage.appendChild(host);
      HIS.sheetMount(host, { book: id });
      if (announce) HIS.a11y.announce('Libro abierto: ' + b.title + '. ' + b.sheets.length + (b.sheets.length === 1 ? ' hoja.' : ' hojas.'), { delay: 100 });
    }

    if (cfg.book && books[cfg.book]) open(cfg.book, false);
  }

  HIS.widgets.register('sheet-hub', mount);
})(window);
