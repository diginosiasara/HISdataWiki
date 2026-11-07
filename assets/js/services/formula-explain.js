/*!
 * HISdata Wiki · services/formula-explain.js
 * Responsabilidad ÚNICA: explicar en español llano la fórmula de una celda (no toca el DOM).
 * UMD: navegador (HIS.formulaExplain) y Node (require). Lo usa Book.prototype.explain de formula.js.
 *
 *   explain(book, hoja, 'C11') -> {
 *     kind: 'formula'|'input'|'number'|'text'|'empty',
 *     formula: '=1-EXP(-B5*B6)',            // texto original
 *     tokens: [{text, cls:'fn'|'ref'|'num'|'str'|'op'|'paren'|'sep'|'ws', color:0..5, ref?:{sheet,ref}}],
 *     what: 'Calcula 1 menos ...',          // «Qué hace», en lenguaje llano
 *     subst: '=1-EXP(-0,1666667*3)',        // la fórmula con los valores actuales (separador «;»)
 *     value, valueText,                     // resultado actual (con el formato de la celda)
 *     refs: [{sheet, ref, first, cells, label, valueText, input, color}],   // precedentes
 *     functions: [{name, es, sig, desc}]    // glosario de las funciones que aparecen
 *   }
 */
(function (root, factory) {
  var api = factory(function () {
    if (typeof module === 'object' && module.exports) return { F: require('./formula.js'), N: require('./numfmt.js') };
    return { F: root.HIS && root.HIS.formula, N: root.HIS && root.HIS.numfmt };
  });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.HIS = root.HIS || {}; root.HIS.formulaExplain = api; }
})(typeof window !== 'undefined' ? window : this, function (deps) {
  'use strict';

  /** Glosario: nombre canónico -> nombre en Excel en español, sintaxis y descripción llana. */
  var GLOSSARY = {
    NORMDIST: { es: 'DISTR.NORM.N', sig: 'NORMDIST(x; media; desviación; acumulada)', desc: 'Distribución normal. Con «acumulada» VERDADERO da la probabilidad de obtener un valor menor o igual que x; con FALSO, la altura de la campana en x.' },
    NORMSDIST: { es: 'DISTR.NORM.ESTAND.N', sig: 'NORMSDIST(z)', desc: 'Probabilidad acumulada de la normal estándar N(0, 1): la proporción de valores menores o iguales que la puntuación z.' },
    EXPONDIST: { es: 'DISTR.EXP.N', sig: 'EXPONDIST(x; λ; acumulada)', desc: 'Distribución exponencial. Con «acumulada» VERDADERO da P(X ≤ x) = 1 − e^(−λ·x); con FALSO, la densidad λ·e^(−λ·x).' },
    EXP: { es: 'EXP', sig: 'EXP(x)', desc: 'Eleva el número e (≈ 2,71828) a la potencia x.' },
    LN: { es: 'LN', sig: 'LN(x)', desc: 'Logaritmo natural (en base e) de x.' },
    LOG: { es: 'LOG', sig: 'LOG(x; base)', desc: 'Logaritmo de x en la base indicada (10 si se omite).' },
    LOG10: { es: 'LOG10', sig: 'LOG10(x)', desc: 'Logaritmo decimal de x.' },
    SQRT: { es: 'RAIZ', sig: 'SQRT(x)', desc: 'Raíz cuadrada de x.' },
    POWER: { es: 'POTENCIA', sig: 'POWER(base; exponente)', desc: 'Eleva la base al exponente.' },
    PI: { es: 'PI', sig: 'PI()', desc: 'El número π (≈ 3,14159).' },
    ABS: { es: 'ABS', sig: 'ABS(x)', desc: 'Valor absoluto: quita el signo negativo.' },
    ROUND: { es: 'REDONDEAR', sig: 'ROUND(número; decimales)', desc: 'Redondea el número al nº de decimales indicado.' },
    MAX: { es: 'MAX', sig: 'MAX(rango)', desc: 'El valor más grande de los números indicados.' },
    MIN: { es: 'MIN', sig: 'MIN(rango)', desc: 'El valor más pequeño de los números indicados.' },
    SUM: { es: 'SUMA', sig: 'SUM(rango)', desc: 'Suma todos los números del rango.' },
    AVERAGE: { es: 'PROMEDIO', sig: 'AVERAGE(rango)', desc: 'Media aritmética: suma de los valores dividida entre cuántos son.' },
    COUNT: { es: 'CONTAR', sig: 'COUNT(rango)', desc: 'Cuenta cuántas celdas del rango contienen números.' },
    SUMPRODUCT: { es: 'SUMAPRODUCTO', sig: 'SUMPRODUCT(rango1; rango2)', desc: 'Multiplica celda a celda los rangos y suma los productos.' },
    STDEV: { es: 'DESVEST.M', sig: 'STDEV(rango)', desc: 'Desviación estándar de una muestra (divide entre n − 1).' },
    STDEVP: { es: 'DESVEST.P', sig: 'STDEVP(rango)', desc: 'Desviación estándar de toda la población (divide entre n).' },
    VAR: { es: 'VAR.S', sig: 'VAR(rango)', desc: 'Varianza de una muestra (divide entre n − 1).' },
    VARP: { es: 'VAR.P', sig: 'VARP(rango)', desc: 'Varianza de toda la población (divide entre n).' },
    COUNTIF: { es: 'CONTAR.SI', sig: 'COUNTIF(rango; criterio)', desc: 'Cuenta las celdas del rango que cumplen el criterio.' },
    COUNTIFS: { es: 'CONTAR.SI.CONJUNTO', sig: 'COUNTIFS(rango1; criterio1; …)', desc: 'Cuenta las filas que cumplen a la vez todos los criterios indicados (cada criterio sobre su rango).' },
    IF: { es: 'SI', sig: 'IF(condición; si_cierto; si_falso)', desc: 'Si la condición se cumple devuelve el primer valor; si no, el segundo.' },
    IFERROR: { es: 'SI.ERROR', sig: 'IFERROR(valor; alternativa)', desc: 'Devuelve el valor; si éste es un error, devuelve la alternativa.' },
    AND: { es: 'Y', sig: 'AND(condición1; condición2; …)', desc: 'Es VERDADERO solo si todas las condiciones se cumplen.' },
    OR: { es: 'O', sig: 'OR(condición1; condición2; …)', desc: 'Es VERDADERO si se cumple al menos una condición.' },
    NOT: { es: 'NO', sig: 'NOT(condición)', desc: 'Invierte una condición: de VERDADERO a FALSO y al revés.' },
    TRUE: { es: 'VERDADERO', sig: 'TRUE()', desc: 'El valor lógico VERDADERO.' },
    FALSE: { es: 'FALSO', sig: 'FALSE()', desc: 'El valor lógico FALSO.' },
    TEXT: { es: 'TEXTO', sig: 'TEXT(valor; formato)', desc: 'Convierte un número en texto con el formato indicado (por ejemplo «0,0%» para mostrarlo como porcentaje).' },
    N: { es: 'N', sig: 'N(valor)', desc: 'Convierte el valor en número (0 si no lo es).' },
    TIME: { es: 'NSHORA', sig: 'TIME(horas; minutos; segundos)', desc: 'Construye una hora del día a partir de horas, minutos y segundos.' }
  };

  var OPNAME = { '+': 'más', '-': 'menos', '*': 'multiplicado por', '/': 'dividido entre', '^': 'elevado a', '&': 'unido a', '=': 'es igual a', '<>': 'es distinto de', '<': 'es menor que', '>': 'es mayor que', '<=': 'es menor o igual que', '>=': 'es mayor o igual que' };
  var COLORS = 6;

  function lib() { return deps(); }
  function numText(v) {
    var N = lib().N;
    if (typeof v !== 'number') return String(v);
    var r = Number(v.toPrecision(7));
    return N.general(r, { locale: 'es' });
  }
  function valText(v, quote, dq) {
    var F = lib().F;
    if (F.isErr(v)) return v.err;
    if (v == null) return '(vacía)';
    if (typeof v === 'number') return numText(v);
    if (typeof v === 'boolean') return v ? 'VERDADERO' : 'FALSO';
    return quote ? (dq ? '"' + v + '"' : '«' + v + '»') : String(v);
  }
  function short(s, n) { s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  /** Etiqueta humana de una celda: texto a su izquierda en la misma fila o, si no, el encabezado de su columna. */
  function labelOf(book, sheet, col, row) {
    var F = lib().F, cells = book.sheets[sheet] && book.sheets[sheet].cells, c, r, k, cell;
    if (!cells) return '';
    function txt(cc, rr) { cell = cells[F.numToCol(cc) + rr]; return cell && cell.f == null && typeof cell.raw === 'string' && cell.raw.trim() ? cell.raw : null; }
    for (c = col - 1; c >= 1 && c >= col - 3; c--) { k = txt(c, row); if (k) return short(k, 48); if (cells[F.numToCol(c) + row]) break; }
    for (r = row - 1; r >= 1 && r >= row - 80; r--) { k = txt(col, r); if (k) return short(k, 48); }
    return '';
  }

  /** Reconstruye el texto de un AST; `sub(refNode)` puede sustituir las referencias por su valor. */
  function unparse(n, sub) {
    var u = function (x) { return unparse(x, sub); };
    switch (n.t) {
      case 'num': return numText(n.v);
      case 'str': return '"' + n.v.replace(/"/g, '""') + '"';
      case 'bool': return n.v ? 'VERDADERO' : 'FALSO';
      case 'empty': return '';
      case 'name': return String(n.v);
      case 'ref': case 'range': return sub ? sub(n) : n.raw;
      case 'paren': return '(' + u(n.x) + ')';
      case 'un': return '-' + u(n.x);
      case 'pct': return u(n.x) + '%';
      case 'bin': return u(n.l) + n.op + u(n.r);
      case 'fn': return n.name + '(' + n.args.map(u).join(sub ? '; ' : ',') + ')';
    }
    return '?';
  }

  function explain(book, sheet, ref) {
    var F = lib().F, N = lib().N;
    var sn = book.sheetName(sheet) || sheet, key = String(ref).replace(/\$/g, '').toUpperCase();
    var cell = book.cell(sn, key);
    var out = { sheet: sn, ref: key, kind: 'empty', formula: '', tokens: [], what: '', subst: '', value: null, valueText: '', refs: [], functions: [] };
    if (!cell) { out.what = 'Celda vacía: no contiene ningún dato ni fórmula.'; return out; }
    var v = book.get(sn, key);
    out.value = v; out.valueText = book.display(sn, key);
    if (cell.f == null) {
      if (typeof cell.raw === 'string') { out.kind = 'text'; out.what = 'Texto: rótulo o explicación; no se calcula nada.'; }
      else if (cell.input) { out.kind = 'input'; out.what = 'Dato de entrada: es un número que tú puedes cambiar. Todas las fórmulas que dependen de esta celda se recalculan al instante.'; }
      else if (cell.raw == null) out.what = 'Celda vacía: no contiene ningún dato ni fórmula.';
      else { out.kind = 'number'; out.what = 'Número fijo que forma parte del enunciado; no se usa como entrada de ninguna fórmula.'; }
      return out;
    }
    out.kind = 'formula'; out.formula = '=' + cell.f;

    /* --- Fórmula coloreada por tokens (cada referencia distinta recibe su color, como en Excel) --- */
    var colorOf = {}, nColor = 0;
    F.tokenize(cell.f).forEach(function (t) {
      var cls = { ws: 'ws', num: 'num', str: 'str', ref: 'ref', range: 'ref', fn: 'fn', bool: 'fn', name: 'fn', op: 'op', lp: 'paren', rp: 'paren', sep: 'sep' }[t.t] || 'op';
      var item = { text: t.raw, cls: cls };
      if (cls === 'ref') {
        var rk = (t.sheet || '') + '!' + t.raw;
        if (!(rk in colorOf)) colorOf[rk] = nColor++ % COLORS;
        item.color = colorOf[rk];
        var first = String(t.a).replace(/\$/g, '').toUpperCase();
        item.ref = { sheet: book.sheetName(t.sheet || sn) || sn, ref: first, range: t.b ? String(t.a + ':' + t.b).replace(/\$/g, '').toUpperCase() : null };
      }
      out.tokens.push(item);
    });

    /* --- Precedentes --- */
    var seen = {};
    (cell.deps || []).forEach(function (d) {
      var disp = F.keyOf(d.c1, d.r1) + (d.c1 !== d.c2 || d.r1 !== d.r2 ? ':' + F.keyOf(d.c2, d.r2) : '');
      var id = d.sheet + '!' + disp; if (seen[id]) return; seen[id] = 1;
      var single = d.c1 === d.c2 && d.r1 === d.r2, tc = book.cell(d.sheet, F.keyOf(d.c1, d.r1));
      var rk = (d.node.sheet || '') + '!' + d.node.raw;
      out.refs.push({
        sheet: d.sheet, ref: disp, first: F.keyOf(d.c1, d.r1), cells: (d.c2 - d.c1 + 1) * (d.r2 - d.r1 + 1),
        label: labelOf(book, d.sheet, d.c1, d.r1),
        valueText: single ? valText(book.get(d.sheet, F.keyOf(d.c1, d.r1)), true) : '',
        input: !!(tc && tc.input), color: colorOf[rk] != null ? colorOf[rk] : 0
      });
    });

    /* --- Sustitución con los valores actuales --- */
    if (cell.ast) {
      out.subst = '=' + unparse(cell.ast, function (n) {
        if (n.t === 'range') return n.raw;
        var val = book.evalAst(n, sn), s = valText(val, true, true);
        return typeof val === 'number' && val < 0 ? '(' + s + ')' : s;
      });
      out.what = sentence(book, sn, cell.ast);
    } else { out.what = 'Fórmula que este visor no sabe interpretar: se muestra el texto original.'; }

    /* --- Glosario de funciones usadas --- */
    var fs = {};
    F.tokenize(cell.f).forEach(function (t) {
      if (t.t !== 'fn') return;
      var c = F.canonical(t.v.toUpperCase());
      if (fs[c]) return; fs[c] = 1;
      var g = GLOSSARY[c] || { es: c, sig: c + '(…)', desc: 'Función de la hoja de cálculo.' };
      out.functions.push({ name: t.v.toUpperCase(), es: g.es, sig: g.sig, desc: g.desc });
    });
    return out;
  }

  /* ---------- «Qué hace» en lenguaje llano ---------- */
  function sentence(book, home, ast) {
    var s = describe(book, home, ast, true);
    s = s.charAt(0).toUpperCase() + s.slice(1);
    return (/[.?!]$/.test(s) ? s : s + '.');
  }

  function refPhrase(book, home, n) {
    var F = lib().F, sh = book.sheetName(n.sheet || home) || home;
    if (n.t === 'ref') {
      var lab = labelOf(book, sh, n.col, n.row), where = (n.sheet ? sh + '!' : '') + F.keyOf(n.col, n.row);
      return lab ? '«' + short(lab, 30) + '» (' + where + ')' : where;
    }
    var a = F.keyOf(n.c1, n.r1), b = F.keyOf(n.c2, n.r2), nn = (n.c2 - n.c1 + 1) * (n.r2 - n.r1 + 1);
    return 'las ' + nn + ' celdas del rango ' + (n.sheet ? sh + '!' : '') + a + ':' + b;
  }

  function describe(book, home, n, top) {
    var d = function (x) { return describe(book, home, x); };
    switch (n.t) {
      case 'num': return numText(n.v);
      case 'str': return '«' + n.v + '»';
      case 'bool': return n.v ? 'VERDADERO' : 'FALSO';
      case 'empty': return 'nada (argumento vacío)';
      case 'name': return 'el nombre «' + n.v + '»';
      case 'ref': case 'range': return refPhrase(book, home, n);
      case 'paren': return n.x.t === 'bin' ? '(' + d(n.x) + ')' : d(n.x);
      case 'un': return 'el opuesto de ' + d(n.x);
      case 'pct': return d(n.x) + ' por ciento (÷ 100)';
      case 'bin': return binPhrase(n, d, top);
      case 'fn': return fnPhrase(book, home, n, d, top);
    }
    return '?';
  }

  function binPhrase(n, d, top) {
    var l = d(n.l), r = d(n.r);
    if (n.op === '-' && n.l.t === 'num' && n.l.v === 1 && !top) return '1 menos ' + r;
    if (n.op === '-' && top) return 'calcula ' + l + ' menos ' + r;
    if (n.op === '+' && top) return 'suma ' + l + ' y ' + r;
    if (n.op === '*' && top) return 'multiplica ' + l + ' por ' + r;
    if (n.op === '/' && top) return 'divide ' + l + ' entre ' + r;
    if (n.op === '^' && top) return 'eleva ' + l + ' a ' + r;
    if (n.op === '&') {
      var parts = []; (function fl(x) { if (x.t === 'bin' && x.op === '&') { fl(x.l); fl(x.r); } else parts.push(x); })(n);
      return (top ? 'construye un texto uniendo, por este orden: ' : 'el texto formado por ') + parts.map(d).join(' + ');
    }
    if (['=', '<>', '<', '>', '<=', '>='].indexOf(n.op) >= 0) return (top ? 'comprueba si ' : '') + l + ' ' + OPNAME[n.op] + ' ' + r;
    return l + ' ' + (OPNAME[n.op] || n.op) + ' ' + r;
  }

  function fnPhrase(book, home, n, d, top) {
    var F = lib().F, name = F.canonical(n.name.toUpperCase()), a = n.args, p = a.map(d);
    var pre = top ? 'calcula ' : '';
    switch (name) {
      case 'EXP': return pre + 'e elevado a (' + p[0] + ')';
      case 'LN': return pre + 'el logaritmo natural de ' + p[0];
      case 'LOG': return pre + 'el logaritmo de ' + p[0] + (a[1] ? ' en base ' + p[1] : ' en base 10');
      case 'LOG10': return pre + 'el logaritmo decimal de ' + p[0];
      case 'SQRT': return pre + 'la raíz cuadrada de ' + p[0];
      case 'POWER': return pre + p[0] + ' elevado a ' + p[1];
      case 'PI': return 'el número π';
      case 'ABS': return pre + 'el valor absoluto de ' + p[0] + ' (sin signo)';
      case 'ROUND': return pre + p[0] + ' redondeado a ' + p[1] + ' decimales';
      case 'MAX': return pre + 'el mayor valor entre ' + p.join(' y ');
      case 'MIN': return pre + 'el menor valor entre ' + p.join(' y ');
      case 'SUM': return pre + 'la suma de ' + p.join(' más ');
      case 'AVERAGE': return pre + 'la media de ' + p.join(' y ');
      case 'COUNT': return pre + 'cuántas celdas con número hay en ' + p[0];
      case 'SUMPRODUCT': return pre + 'la suma de los productos celda a celda de ' + p.join(' y ');
      case 'STDEV': return pre + 'la desviación estándar muestral de ' + p[0];
      case 'STDEVP': return pre + 'la desviación estándar poblacional de ' + p[0];
      case 'VAR': return pre + 'la varianza muestral de ' + p[0];
      case 'VARP': return pre + 'la varianza poblacional de ' + p[0];
      case 'COUNTIF': return pre + 'cuántas celdas de ' + p[0] + ' cumplen el criterio ' + p[1];
      case 'COUNTIFS': return pre + 'cuántas filas cumplen a la vez todos los criterios (' + p.join(', ') + ')';
      case 'NORMSDIST': return pre + 'la probabilidad de que una normal estándar N(0, 1) valga como máximo ' + p[0];
      case 'NORMDIST': return pre + (a[3] && a[3].t === 'fn' && F.canonical(a[3].name.toUpperCase()) === 'FALSE' ? 'la altura de la campana normal en ' + p[0] : 'la probabilidad de que una normal valga como máximo ' + p[0]) + ', con media ' + p[1] + ' y desviación ' + p[2];
      case 'EXPONDIST': return pre + (a[2] && a[2].t === 'fn' && F.canonical(a[2].name.toUpperCase()) === 'FALSE' ? 'la densidad exponencial en ' + p[0] : 'la probabilidad exponencial acumulada P(X ≤ ' + p[0] + ')') + ' con tasa λ = ' + p[1];
      case 'IF': return (top ? 'comprueba si ' : 'si ') + p[0] + '; si se cumple, ' + p[1] + (a[2] ? '; si no, ' + p[2] : '');
      case 'IFERROR': return pre + p[0] + ', y si diera error, ' + p[1];
      case 'AND': return (top ? 'comprueba que ' : '') + p.join(' y a la vez ');
      case 'OR': return (top ? 'comprueba que ' : '') + p.join(' o bien ');
      case 'NOT': return 'lo contrario de (' + p[0] + ')';
      case 'TRUE': return 'VERDADERO';
      case 'FALSE': return 'FALSO';
      case 'TEXT': return pre + p[0] + ' escrito como texto con el formato ' + p[1];
      case 'N': return pre + p[0] + ' como número';
      case 'TIME': return pre + 'la hora ' + p.join(':');
    }
    return pre + 'la función ' + n.name + ' aplicada a ' + (p.join(', ') || 'nada');
  }

  return { explain: explain, glossary: GLOSSARY, unparse: unparse, labelOf: labelOf, valText: valText };
});
