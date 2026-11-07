/*!
 * HISdata Wiki · ui/sheet-charts.js
 * Responsabilidad ÚNICA: reproducir con HIS.plot las gráficas de Excel de un libro (definidas en HIS_BOOKS[..].charts)
 * leyendo los rangos desde el libro vivo (services/formula.js), de modo que se redibujan al cambiar una entrada.
 *
 *   var c = HIS.sheetCharts.create(book, chartDef, contenedor);   // dibuja
 *   c.update();                                                   // vuelve a leer el libro y redibuja
 */
(function (root) {
  'use strict';
  var HIS = (root.HIS = root.HIS || {});
  var C = (HIS.sheetCharts = {});

  function num(v, fmt, general) {
    var N = HIS.numfmt;
    if (v == null || !isFinite(v)) return '';
    if (!fmt || fmt === 'General') return N.general(Number(Number(v).toPrecision(6)), { locale: 'es' });
    return N.format(v, fmt, { locale: 'es' });
  }

  /** Tono de la serie de Excel → nombre de color del sistema (conserva el significado: rojo sigue siendo rojo). */
  function hueName(hex, i) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    var order = ['blue', 'orange', 'green', 'violet', 'red', 'teal'];
    if (!m) return order[i % order.length];
    var r = parseInt(m[1].slice(0, 2), 16) / 255, g = parseInt(m[1].slice(2, 4), 16) / 255, b = parseInt(m[1].slice(4, 6), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, hh;
    if (d < 0.08) return 'ink';
    if (mx === r) hh = ((g - b) / d + 6) % 6; else if (mx === g) hh = (b - r) / d + 2; else hh = (r - g) / d + 4;
    hh *= 60;
    if (hh < 18 || hh >= 335) return 'red';
    if (hh < 70) return 'orange';
    if (hh < 160) return 'green';
    if (hh < 195) return 'teal';
    if (hh < 262) return 'blue';
    if (hh < 335) return 'violet';
    return order[i % order.length];
  }

  function cellsOf(rng) {
    var F = HIS.formula, a = rng.ref.split(':'), p = F.parseRef(a[0]), q = F.parseRef(a[1] || a[0]), out = [], r, c;
    for (r = Math.min(p.row, q.row); r <= Math.max(p.row, q.row); r++) for (c = Math.min(p.col, q.col); c <= Math.max(p.col, q.col); c++) out.push(F.keyOf(c, r));
    return out;
  }
  function numbers(book, rng) {
    return cellsOf(rng).map(function (k) { var v = book.get(rng.sheet, k); return typeof v === 'number' && isFinite(v) ? v : null; });
  }
  function labels(book, rng) { return cellsOf(rng).map(function (k) { return book.display(rng.sheet, k); }); }

  function build(book, def) {
    var F = HIS.formula;
    var isBar = def.plots.some(function (p) { return p.kind === 'bar'; });
    var xf = def.x && def.x.fmt, yf = def.y && def.y.fmt, layers = [], desc, o = { x: {}, y: {} };
    var fy = function (v) { return num(v, yf); }, fx = function (v) { return num(v, xf); };
    var si = 0;
    if (isBar) {
      var s = def.plots[0].series[0], cats = labels(book, s.x), vals = numbers(book, s.y);
      var data = cats.map(function (c, i) { var v = vals[i] == null ? 0 : vals[i]; return { label: c, value: v, text: num(v, yf) }; });
      layers.push({ type: 'bars', data: data, color: hueName(s.color, 0), label: s.name || undefined });
      o.x = { type: 'band', categories: cats, label: def.x && def.x.title || '' };
      desc = 'Gráfico de barras' + (def.title ? ' «' + def.title + '»' : '') + '. ' + data.map(function (d) { return d.label + ': ' + d.text; }).join('; ') + '.';
    } else {
      var xs = [], ysAll = [], parts = [];
      def.plots.forEach(function (pl) {
        pl.series.forEach(function (s) {
          var X = numbers(book, s.x), Y = numbers(book, s.y), pts = [];
          X.forEach(function (x, i) { if (x != null && Y[i] != null) pts.push([x, Y[i]]); });
          if (!pts.length) return;
          pts.forEach(function (p) { xs.push(p[0]); ysAll.push(p[1]); });
          var color = hueName(s.color, si++), name = s.name || undefined, L;
          if (pl.kind === 'area') L = { type: 'area', pts: pts, color: color, opacity: 0.4, stroke: !!s.line, label: name };
          else if (pl.kind === 'scatter' && !s.line) L = { type: 'points', pts: pts, color: color, r: 4.5, label: name };
          else L = { type: 'line', pts: pts, color: color, label: name, width: 2.5 };
          layers.push(L);
          var maxY = Math.max.apply(null, pts.map(function (p) { return p[1]; })), minY = Math.min.apply(null, pts.map(function (p) { return p[1]; }));
          if (pl.kind === 'area' && maxY === 0) parts.push((name || 'Serie') + ': sin área en este momento (todo vale 0)');
          else parts.push((name || 'Serie') + ': ' + pts.length + ' puntos, de x = ' + fx(pts[0][0]) + ' a x = ' + fx(pts[pts.length - 1][0]) + ', con y entre ' + fy(minY) + ' y ' + fy(maxY));
        });
      });
      var x0 = def.x && def.x.min != null ? def.x.min : Math.min.apply(null, xs), x1 = def.x && def.x.max != null ? def.x.max : Math.max.apply(null, xs);
      if (!isFinite(x0) || x0 === x1) { x0 = (isFinite(x0) ? x0 : 0) - 1; x1 = x0 + 2; }
      o.x = { min: x0, max: x1, label: def.x && def.x.title || '', format: fx };
      desc = 'Gráfico' + (def.title ? ' «' + def.title + '»' : '') + '. ' + parts.join('. ') + '.';
    }
    o.y = { label: def.y && def.y.title || '', format: fy };
    if (def.y && def.y.min != null) o.y.min = def.y.min;
    if (def.y && def.y.max != null) o.y.max = def.y.max; else o.y.max = 'auto';
    return { opts: o, layers: layers, desc: desc };
  }

  C.create = function (book, def, container) {
    var b = build(book, def);
    var plot = HIS.plot(container, { title: def.title || 'Gráfica', desc: b.desc, x: b.opts.x, y: b.opts.y, legend: true, table: true, aspect: 0.5, layers: b.layers });
    return {
      plot: plot,
      update: function () { var n = build(book, def); plot.update({ layers: n.layers, desc: n.desc, x: n.opts.x, y: n.opts.y }); }
    };
  };
})(window);
