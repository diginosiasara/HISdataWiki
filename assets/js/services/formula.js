/*!
 * HISdata Wiki · services/formula.js
 * Responsabilidad ÚNICA: motor de fórmulas tipo Excel (tokenizador + analizador + evaluador + libro con
 * dependencias y recálculo). No toca el DOM. UMD: navegador (HIS.formula) y Node (require).
 *
 *   var book = HIS.formula.createBook(HIS_BOOKS.ambulancia, {locale:'es'});
 *   book.get('Ejercicio', 'C11');            // valor actual (número | texto | booleano | {err:'#DIV/0!'})
 *   book.set('Ejercicio', 'B4', 8);          // cambia una constante; devuelve [{sheet,ref}] de celdas que cambiaron
 *   book.reset();                            // vuelve a los valores originales
 *   book.explain('Ejercicio', 'C11');        // explicación en español (lo aporta services/formula-explain.js)
 *
 * Funciones: NORMDIST, NORM.DIST, NORMSDIST, NORM.S.DIST, EXPONDIST, EXPON.DIST, EXP, LN, LOG, LOG10, SQRT, POWER, PI,
 * ABS, ROUND, MAX, MIN, SUM, AVERAGE, COUNT, SUMPRODUCT, STDEV, STDEV.S, STDEVP, STDEV.P, VAR.S, VAR.P, COUNTIF, COUNTIFS,
 * IF, IFERROR, AND, OR, NOT, TRUE, FALSE, TEXT, N, TIME. Operadores: + - * / ^ & % = <> < > <= >=.
 * Referencias: A1, $A$1, A1:B5, Hoja!A1, 'Mi hoja'!A1:B5.
 */
(function (root, factory) {
  var api = factory(function () {
    if (typeof module === 'object' && module.exports) return require('./numfmt.js');
    return root.HIS && root.HIS.numfmt;
  });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.HIS = root.HIS || {}; root.HIS.formula = api; }
})(typeof window !== 'undefined' ? window : this, function (getNumfmt) {
  'use strict';

  /* ======================================================================
   * 1. Utilidades de direcciones y errores
   * ==================================================================== */
  function colToNum(s) { var n = 0, i; s = s.toUpperCase(); for (i = 0; i < s.length; i++) n = n * 26 + s.charCodeAt(i) - 64; return n; }
  function numToCol(n) { var s = ''; while (n > 0) { s = String.fromCharCode(65 + (n - 1) % 26) + s; n = Math.floor((n - 1) / 26); } return s; }
  function parseRef(ref) {
    var m = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/.exec(ref);
    if (!m) return null;
    return { col: colToNum(m[2]), row: Number(m[4]), absCol: !!m[1], absRow: !!m[3], key: m[2].toUpperCase() + m[4] };
  }
  function keyOf(col, row) { return numToCol(col) + row; }

  /** Error de hoja de cálculo (#DIV/0!, #VALUE!…). Se propaga como valor. */
  function XlErr(code) { this.err = code; }
  XlErr.prototype.toString = function () { return this.err; };
  function isErr(v) { return v instanceof XlErr; }
  var E = { DIV0: new XlErr('#DIV/0!'), VALUE: new XlErr('#VALUE!'), REF: new XlErr('#REF!'), NAME: new XlErr('#NAME?'), NUM: new XlErr('#NUM!'), NA: new XlErr('#N/A'), CIRC: new XlErr('#CIRC!') };

  /* ======================================================================
   * 2. Tokenizador
   * ==================================================================== */
  var REF_RE = /^(?:(?:'((?:[^']|'')+)'|([A-Za-z_][A-Za-z0-9_.]*))!)?(\$?[A-Za-z]{1,3}\$?\d+)(?::(\$?[A-Za-z]{1,3}\$?\d+))?(?![A-Za-z0-9_(])/;
  var NUM_RE = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
  var ID_RE = /^[A-Za-z_][A-Za-z0-9_.]*/;
  var OPS = ['<>', '<=', '>=', '=', '<', '>', '+', '-', '*', '/', '^', '&', '%'];

  /** Devuelve [{t, v, raw, s, e}] con t: num|str|ref|range|fn|bool|name|op|lp|rp|sep|ws */
  function tokenize(src) {
    var out = [], i = 0, m, c, rest, j;
    while (i < src.length) {
      c = src.charAt(i); rest = src.slice(i);
      if (/\s/.test(c)) { m = /^\s+/.exec(rest); out.push({ t: 'ws', raw: m[0], s: i, e: i + m[0].length }); i += m[0].length; continue; }
      if (c === '"') {
        j = i + 1; var str = '';
        while (j < src.length) { if (src.charAt(j) === '"') { if (src.charAt(j + 1) === '"') { str += '"'; j += 2; continue; } break; } str += src.charAt(j++); }
        out.push({ t: 'str', v: str, raw: src.slice(i, j + 1), s: i, e: j + 1 }); i = j + 1; continue;
      }
      if ((m = REF_RE.exec(rest))) {
        out.push({ t: m[4] ? 'range' : 'ref', sheet: m[1] ? m[1].replace(/''/g, "'") : (m[2] || null), a: m[3], b: m[4] || null, raw: m[0], s: i, e: i + m[0].length });
        i += m[0].length; continue;
      }
      if ((m = NUM_RE.exec(rest))) { out.push({ t: 'num', v: Number(m[0]), raw: m[0], s: i, e: i + m[0].length }); i += m[0].length; continue; }
      if ((m = ID_RE.exec(rest))) {
        var after = rest.charAt(m[0].length), up = m[0].toUpperCase();
        if (after === '(') out.push({ t: 'fn', v: up, raw: m[0], s: i, e: i + m[0].length });
        else if (up === 'TRUE' || up === 'FALSE') out.push({ t: 'bool', v: up === 'TRUE', raw: m[0], s: i, e: i + m[0].length });
        else out.push({ t: 'name', v: m[0], raw: m[0], s: i, e: i + m[0].length });
        i += m[0].length; continue;
      }
      if (c === '(') { out.push({ t: 'lp', raw: c, s: i, e: i + 1 }); i++; continue; }
      if (c === ')') { out.push({ t: 'rp', raw: c, s: i, e: i + 1 }); i++; continue; }
      if (c === ',' || c === ';') { out.push({ t: 'sep', raw: c, s: i, e: i + 1 }); i++; continue; }
      var op = OPS.filter(function (o) { return rest.indexOf(o) === 0; }).sort(function (a, b) { return b.length - a.length; })[0];
      if (op) { out.push({ t: 'op', v: op, raw: op, s: i, e: i + op.length }); i += op.length; continue; }
      throw new Error('Carácter no válido «' + c + '» en la posición ' + (i + 1));
    }
    return out;
  }

  /* ======================================================================
   * 3. Analizador (precedencia de Excel: comparación < & < +- < producto/división < ^ ; el menos unario liga más que ^)
   * ==================================================================== */
  function refNode(tok) {
    var a = parseRef(tok.a);
    if (tok.t === 'ref') return { t: 'ref', sheet: tok.sheet, col: a.col, row: a.row, absCol: a.absCol, absRow: a.absRow, raw: tok.raw };
    var b = parseRef(tok.b);
    return { t: 'range', sheet: tok.sheet, c1: Math.min(a.col, b.col), r1: Math.min(a.row, b.row), c2: Math.max(a.col, b.col), r2: Math.max(a.row, b.row), raw: tok.raw };
  }

  function parse(src) {
    var toks = tokenize(src).filter(function (t) { return t.t !== 'ws'; }), p = 0;
    function peek() { return toks[p]; }
    function isOp(v) { var t = toks[p]; return t && t.t === 'op' && t.v === v; }
    function expect(type, what) { var t = toks[p]; if (!t || t.t !== type) throw new Error('Se esperaba ' + what); p++; return t; }

    function cmp() {
      var l = concat(), t;
      while ((t = peek()) && t.t === 'op' && ['=', '<>', '<', '>', '<=', '>='].indexOf(t.v) >= 0) { p++; l = { t: 'bin', op: t.v, l: l, r: concat() }; }
      return l;
    }
    function concat() { var l = add(); while (isOp('&')) { p++; l = { t: 'bin', op: '&', l: l, r: add() }; } return l; }
    function add() { var l = mul(), t; while ((t = peek()) && t.t === 'op' && (t.v === '+' || t.v === '-')) { p++; l = { t: 'bin', op: t.v, l: l, r: mul() }; } return l; }
    function mul() { var l = pow(), t; while ((t = peek()) && t.t === 'op' && (t.v === '*' || t.v === '/')) { p++; l = { t: 'bin', op: t.v, l: l, r: pow() }; } return l; }
    function pow() { var l = unary(); while (isOp('^')) { p++; l = { t: 'bin', op: '^', l: l, r: unary() }; } return l; }
    function unary() {
      var t = peek();
      if (t && t.t === 'op' && (t.v === '-' || t.v === '+')) { p++; var x = unary(); return t.v === '-' ? { t: 'un', op: '-', x: x } : x; }
      return postfix();
    }
    function postfix() { var x = primary(); while (isOp('%')) { p++; x = { t: 'pct', x: x }; } return x; }
    function primary() {
      var t = toks[p++];
      if (!t) throw new Error('La fórmula termina de forma inesperada');
      switch (t.t) {
        case 'num': return { t: 'num', v: t.v };
        case 'str': return { t: 'str', v: t.v };
        case 'bool': return { t: 'bool', v: t.v };
        case 'ref': case 'range': return refNode(t);
        case 'name': return { t: 'name', v: t.v };
        case 'lp': { var e = cmp(); expect('rp', '«)»'); return { t: 'paren', x: e }; }
        case 'fn': {
          expect('lp', '«(»');
          var args = [];
          if (toks[p] && toks[p].t === 'rp') { p++; return { t: 'fn', name: t.v, args: args }; }
          for (;;) {
            var nx = toks[p];
            if (nx && (nx.t === 'sep' || nx.t === 'rp')) args.push({ t: 'empty' }); else args.push(cmp());
            nx = toks[p++];
            if (!nx) throw new Error('Falta «)»');
            if (nx.t === 'rp') break;
            if (nx.t !== 'sep') throw new Error('Se esperaba «,» o «)»');
          }
          return { t: 'fn', name: t.v, args: args };
        }
        default: throw new Error('Símbolo inesperado «' + (t.raw || '') + '»');
      }
    }
    var ast = cmp();
    if (p < toks.length) throw new Error('Sobra «' + toks[p].raw + '» al final de la fórmula');
    return ast;
  }

  /* ======================================================================
   * 4. Conversión de tipos
   * ==================================================================== */
  function toNum(v) {
    if (isErr(v)) return v;
    if (typeof v === 'number') return v;
    if (v == null) return 0;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'string') { var s = v.trim(); if (s !== '' && isFinite(Number(s))) return Number(s); return E.VALUE; }
    return E.VALUE;
  }
  function toText(v, locale) { if (isErr(v)) return v; if (v == null) return ''; return getNumfmt().toText(v, locale); }
  function toBool(v) {
    if (isErr(v)) return v;
    if (typeof v === 'boolean') return v;
    if (v == null) return false;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') { var u = v.toUpperCase(); if (u === 'TRUE' || u === 'VERDADERO') return true; if (u === 'FALSE' || u === 'FALSO') return false; }
    return E.VALUE;
  }
  function firstErr(list) { for (var i = 0; i < list.length; i++) if (isErr(list[i])) return list[i]; return null; }
  function isRange(v) { return v && v.rows && v.nr != null; }

  /** Comparación estilo Excel: número < texto < lógico; texto sin distinguir mayúsculas. */
  function compare(a, b) {
    function rank(v) { return typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : typeof v === 'boolean' ? 2 : -1; }
    if (a == null) a = typeof b === 'string' ? '' : (typeof b === 'boolean' ? false : 0);
    if (b == null) b = typeof a === 'string' ? '' : (typeof a === 'boolean' ? false : 0);
    var ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra < rb ? -1 : 1;
    if (ra === 1) { a = a.toLowerCase(); b = b.toLowerCase(); }
    return a < b ? -1 : a > b ? 1 : 0;
  }

  /* ======================================================================
   * 5. Matemática estadística (precisión de doble)
   * ==================================================================== */
  var SQRT2 = Math.SQRT2, SQRTPI = Math.sqrt(Math.PI);
  /** erfc(x) para x ≥ 0: serie sin cancelación (x < 2,5) o fracción continua (x ≥ 2,5). */
  function erfcPos(x) {
    if (x < 2.5) {
      var term = x, sum = x, n = 0;
      while (term > 1e-17 * sum && n < 400) { n++; term *= 2 * x * x / (2 * n + 1); sum += term; }
      return 1 - 2 / SQRTPI * Math.exp(-x * x) * sum;
    }
    var f = x, k;
    for (k = 120; k >= 1; k--) f = x + (k / 2) / f;
    return Math.exp(-x * x) / (SQRTPI * f);
  }
  /** Función de distribución normal estándar Φ(z). */
  function phi(z) { return z >= 0 ? 1 - 0.5 * erfcPos(z / SQRT2) : 0.5 * erfcPos(-z / SQRT2); }
  function normPdf(z) { return Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI); }

  /* ======================================================================
   * 6. Funciones (tabla nombre → implementación)
   *    f(args, ctx) recibe valores ya evaluados; las «lazy» reciben nodos.
   * ==================================================================== */
  var FN = {}, ALIAS = { 'NORM.DIST': 'NORMDIST', 'NORM.S.DIST': 'NORMSDIST', 'EXPON.DIST': 'EXPONDIST', 'STDEV.S': 'STDEV', 'STDEV.P': 'STDEVP', 'VAR.S': 'VAR', 'VAR.P': 'VARP', 'LOG10': 'LOG10' };

  /** Aplana argumentos a lista de números. En rangos solo cuentan los números; los argumentos directos se convierten. */
  function numbers(args) {
    var out = [], i, j, k, v, r;
    for (i = 0; i < args.length; i++) {
      v = args[i];
      if (isRange(v)) {
        for (j = 0; j < v.rows.length; j++) for (k = 0; k < v.rows[j].length; k++) {
          r = v.rows[j][k];
          if (isErr(r)) return r;
          if (typeof r === 'number') out.push(r);
        }
      } else if (isErr(v)) return v;
      else if (v != null) { r = toNum(v); if (isErr(r)) return r; out.push(r); }
    }
    return out;
  }
  function agg(name, fn) { FN[name] = function (args) { var n = numbers(args); return isErr(n) ? n : fn(n); }; }
  agg('SUM', function (n) { return n.reduce(function (a, b) { return a + b; }, 0); });
  agg('AVERAGE', function (n) { return n.length ? n.reduce(function (a, b) { return a + b; }, 0) / n.length : E.DIV0; });
  agg('MAX', function (n) { return n.length ? Math.max.apply(null, n) : 0; });
  agg('MIN', function (n) { return n.length ? Math.min.apply(null, n) : 0; });
  agg('COUNT', function (n) { return n.length; });
  function variance(n, pop) {
    var m = n.reduce(function (a, b) { return a + b; }, 0) / n.length;
    var ss = n.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0);
    var d = pop ? n.length : n.length - 1;
    return d > 0 ? ss / d : E.DIV0;
  }
  agg('VAR', function (n) { return variance(n, false); });
  agg('VARP', function (n) { return variance(n, true); });
  agg('STDEV', function (n) { var v = variance(n, false); return isErr(v) ? v : Math.sqrt(v); });
  agg('STDEVP', function (n) { var v = variance(n, true); return isErr(v) ? v : Math.sqrt(v); });

  function unary(name, fn) {
    FN[name] = function (a) { var x = toNum(a[0]); if (isErr(x)) return x; var r = fn(x); return typeof r === 'number' && !isFinite(r) ? E.NUM : r; };
  }
  unary('ABS', Math.abs);
  unary('EXP', Math.exp);
  unary('SQRT', function (x) { return x < 0 ? E.NUM : Math.sqrt(x); });
  unary('LN', function (x) { return x <= 0 ? E.NUM : Math.log(x); });
  unary('LOG10', function (x) { return x <= 0 ? E.NUM : Math.log10(x); });
  unary('NOT', null); FN.NOT = function (a) { var b = toBool(a[0]); return isErr(b) ? b : !b; };
  FN.LOG = function (a) { var x = toNum(a[0]), b = a.length > 1 ? toNum(a[1]) : 10; if (isErr(x)) return x; if (isErr(b)) return b; return x <= 0 || b <= 0 || b === 1 ? E.NUM : Math.log(x) / Math.log(b); };
  FN.POWER = function (a) { var x = toNum(a[0]), y = toNum(a[1]); if (isErr(x)) return x; if (isErr(y)) return y; var r = Math.pow(x, y); return isFinite(r) ? r : (x === 0 && y < 0 ? E.DIV0 : E.NUM); };
  FN.PI = function () { return Math.PI; };
  FN.TRUE = function () { return true; };
  FN.FALSE = function () { return false; };
  FN.N = function (a) { var v = a[0]; return isErr(v) ? v : typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : 0; };
  FN.ROUND = function (a) {
    var x = toNum(a[0]), d = toNum(a[1]);
    if (isErr(x)) return x; if (isErr(d)) return d;
    d = Math.trunc(d);
    if (d >= 0) return getNumfmt().roundHalfAway(x, d);
    var m = Math.pow(10, -d); return (x < 0 ? -1 : 1) * Math.round(Math.abs(x) / m) * m;
  };
  FN.TIME = function (a) {
    var h = toNum(a[0]), m = toNum(a[1]), s = toNum(a[2]);
    if (isErr(h)) return h; if (isErr(m)) return m; if (isErr(s)) return s;
    var t = (Math.trunc(h) * 3600 + Math.trunc(m) * 60 + Math.trunc(s)) / 86400;
    return t < 0 ? E.NUM : t - Math.floor(t);
  };
  FN.NORMSDIST = function (a) { var z = toNum(a[0]); if (isErr(z)) return z; if (a.length > 1) { var c = toBool(a[1]); if (isErr(c)) return c; return c ? phi(z) : normPdf(z); } return phi(z); };
  FN.NORMDIST = function (a) {
    var x = toNum(a[0]), mu = toNum(a[1]), sd = toNum(a[2]), cum = toBool(a[3]);
    var e = firstErr([x, mu, sd, cum]); if (e) return e;
    if (sd <= 0) return E.NUM;
    var z = (x - mu) / sd;
    return cum ? phi(z) : normPdf(z) / sd;
  };
  FN.EXPONDIST = function (a) {
    var x = toNum(a[0]), lam = toNum(a[1]), cum = toBool(a[2]);
    var e = firstErr([x, lam, cum]); if (e) return e;
    if (x < 0 || lam <= 0) return E.NUM;
    return cum ? 1 - Math.exp(-lam * x) : lam * Math.exp(-lam * x);
  };
  FN.SUMPRODUCT = function (a) {
    var i, j, k, rows = a.map(function (r) { return isRange(r) ? r.rows : [[r]]; }), total = 0, prod, v;
    for (i = 1; i < rows.length; i++) if (rows[i].length !== rows[0].length || rows[i][0].length !== rows[0][0].length) return E.VALUE;
    for (j = 0; j < rows[0].length; j++) for (k = 0; k < rows[0][j].length; k++) {
      prod = 1;
      for (i = 0; i < rows.length; i++) { v = rows[i][j][k]; if (isErr(v)) return v; prod *= typeof v === 'number' ? v : 0; }
      total += prod;
    }
    return total;
  };
  /** Texto con formato: TEXT(valor; "0.00%") */
  FN.TEXT = function (a, ctx) {
    var v = a[0], f = a[1];
    if (isErr(v)) return v; if (isErr(f)) return f;
    if (typeof v === 'string') { var n = Number(v); if (v.trim() === '' || !isFinite(n)) return v; v = n; }
    if (typeof v === 'boolean') return v ? 'VERDADERO' : 'FALSO';
    return getNumfmt().format(v == null ? 0 : v, String(f), { locale: ctx.book.locale });
  };

  /* ---- criterios de COUNTIF/COUNTIFS ---- */
  function wildcard(pat) { return new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i'); }
  /** Convierte el criterio en un predicado sobre un valor de celda. */
  function criterion(c) {
    var op = '=', rhs = c;
    if (typeof c === 'string') {
      var m = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(c);
      op = m[1] || '='; rhs = m[2];
      if (rhs.trim() !== '' && isFinite(Number(rhs))) rhs = Number(rhs);
    }
    return function (v) {
      if (isErr(v)) return false;
      if (typeof rhs === 'number') {
        if (typeof v !== 'number') return op === '<>';
        return op === '=' ? v === rhs : op === '<>' ? v !== rhs : op === '<' ? v < rhs : op === '>' ? v > rhs : op === '<=' ? v <= rhs : v >= rhs;
      }
      if (typeof rhs === 'boolean') return op === '<>' ? v !== rhs : v === rhs;
      var s = v == null ? '' : String(v);
      if (op === '=') return wildcard(String(rhs)).test(s);
      if (op === '<>') return !wildcard(String(rhs)).test(s);
      if (typeof v !== 'string') return false;
      var cm = compare(s, String(rhs));
      return op === '<' ? cm < 0 : op === '>' ? cm > 0 : op === '<=' ? cm <= 0 : cm >= 0;
    };
  }
  FN.COUNTIFS = function (a) {
    if (a.length < 2 || a.length % 2) return E.VALUE;
    var preds = [], ranges = [], i, j, k;
    for (i = 0; i < a.length; i += 2) {
      if (!isRange(a[i])) return E.VALUE;
      if (isErr(a[i + 1])) return a[i + 1];
      ranges.push(a[i]); preds.push(criterion(a[i + 1]));
      if (a[i].nr !== ranges[0].nr || a[i].nc !== ranges[0].nc) return E.VALUE;
    }
    var count = 0, ok;
    for (j = 0; j < ranges[0].nr; j++) for (k = 0; k < ranges[0].nc; k++) {
      ok = true;
      for (i = 0; i < ranges.length && ok; i++) ok = preds[i](ranges[i].rows[j][k]);
      if (ok) count++;
    }
    return count;
  };
  FN.COUNTIF = function (a) { return a.length === 2 ? FN.COUNTIFS(a) : E.VALUE; };

  /* ---- funciones «perezosas» (solo evalúan la rama necesaria) ---- */
  var LAZY = {
    IF: function (args, ev) {
      var c = toBool(ev(args[0]));
      if (isErr(c)) return c;
      var branch = c ? args[1] : args[2];
      if (!branch) return c ? true : false;
      var v = ev(branch);
      return isRange(v) ? E.VALUE : (v == null ? 0 : v);
    },
    IFERROR: function (args, ev) { var v = ev(args[0]); return isErr(v) ? ev(args[1]) : v; },
    AND: function (args, ev) { return logical(args, ev, true); },
    OR: function (args, ev) { return logical(args, ev, false); }
  };
  function logical(args, ev, isAnd) {
    var res = isAnd, seen = false, i, v, j, k, b;
    function one(x) { if (typeof x === 'string' || x == null) return; var bb = toBool(x); if (isErr(bb)) return bb; seen = true; res = isAnd ? res && bb : res || bb; }
    for (i = 0; i < args.length; i++) {
      v = ev(args[i]);
      if (isRange(v)) { for (j = 0; j < v.rows.length; j++) for (k = 0; k < v.rows[j].length; k++) { b = one(v.rows[j][k]); if (b) return b; } }
      else { if (typeof v === 'string') { var bs = toBool(v); if (isErr(bs)) return bs; seen = true; res = isAnd ? res && bs : res || bs; continue; } b = one(v); if (b) return b; }
    }
    return seen ? res : E.VALUE;
  }

  function canonical(name) { return ALIAS[name] || name; }
  function isKnownFunction(name) { name = canonical(name); return !!(FN[name] || LAZY[name]); }

  /* ======================================================================
   * 7. Libro: celdas, dependencias, evaluación y recálculo
   * ==================================================================== */
  function Book(def, opts) {
    opts = opts || {};
    this.id = def.id; this.def = def; this.locale = opts.locale === 'es' ? 'es' : 'en';
    this.sheets = {}; this.order = []; this.dependents = {}; this.nameIndex = {};
    var self = this;
    def.sheets.forEach(function (sd) {
      var sh = { name: sd.name, cells: {} };
      Object.keys(sd.cells).forEach(function (key) {
        var rec = sd.cells[key], pr = parseRef(key);
        var cell = { sheet: sd.name, key: key, col: pr.col, row: pr.row, f: rec.f != null ? rec.f : null, raw: rec.v, orig: rec.v, cache: rec.c, fmt: rec.n || null, input: !!rec.input, rec: rec, v: null, dirty: false, computing: false, ast: null, error: null, deps: [] };
        if (cell.f != null) {
          try { cell.ast = parse(cell.f); } catch (err) { cell.error = err.message; }
          cell.dirty = true;
        } else cell.v = cell.raw == null ? null : cell.raw;
        sh.cells[key] = cell;
      });
      self.sheets[sd.name] = sh; self.order.push(sd.name); self.nameIndex[sd.name.toLowerCase()] = sd.name;
    });
    this._indexDeps();
    this.recalcAll();
  }

  /** Resuelve el nombre real de una hoja (sin distinguir mayúsculas). */
  Book.prototype.sheetName = function (name) { return name == null ? null : this.nameIndex[String(name).toLowerCase()] || null; };

  /** Recorre un AST y devuelve las referencias {sheet,c1,r1,c2,r2,node} que usa (hoja resuelta con `home`). */
  Book.prototype.refsOf = function (ast, home) {
    var out = [], self = this;
    (function walk(n) {
      if (!n) return;
      if (n.t === 'ref') out.push({ sheet: self.sheetName(n.sheet || home) || (n.sheet || home), c1: n.col, r1: n.row, c2: n.col, r2: n.row, node: n });
      else if (n.t === 'range') out.push({ sheet: self.sheetName(n.sheet || home) || (n.sheet || home), c1: n.c1, r1: n.r1, c2: n.c2, r2: n.r2, node: n });
      else if (n.t === 'bin') { walk(n.l); walk(n.r); }
      else if (n.t === 'un' || n.t === 'pct' || n.t === 'paren') walk(n.x);
      else if (n.t === 'fn') n.args.forEach(walk);
    })(ast);
    return out;
  };

  /** Índice inverso: celda → fórmulas que la usan (para recalcular solo lo afectado). */
  Book.prototype._indexDeps = function () {
    var self = this;
    this.order.forEach(function (sn) {
      var cells = self.sheets[sn].cells;
      Object.keys(cells).forEach(function (key) {
        var cell = cells[key]; if (!cell.ast) return;
        cell.deps = self.refsOf(cell.ast, sn);
        cell.deps.forEach(function (d) {
          var c, r;
          for (c = d.c1; c <= d.c2; c++) for (r = d.r1; r <= d.r2; r++) {
            var k = d.sheet + '!' + keyOf(c, r);
            (self.dependents[k] = self.dependents[k] || []).push(cells[key]);
          }
        });
      });
    });
  };

  Book.prototype.cell = function (sheet, ref) { var sn = this.sheetName(sheet); return sn ? this.sheets[sn].cells[String(ref).replace(/\$/g, '').toUpperCase()] || null : null; };

  /** Valor de una celda (calcula si hace falta). */
  Book.prototype.valueAt = function (sheet, col, row) {
    var sn = this.sheetName(sheet);
    if (!sn) return E.REF;
    var cell = this.sheets[sn].cells[numToCol(col) + row];
    if (!cell) return null;
    if (cell.f == null) return cell.v;
    if (cell.dirty) this._compute(cell);
    return cell.v;
  };
  Book.prototype.get = function (sheet, ref) {
    var p = parseRef(ref); if (!p) return E.REF;
    return this.valueAt(sheet, p.col, p.row);
  };

  Book.prototype._compute = function (cell) {
    if (cell.computing) { cell.v = E.CIRC; return; }
    if (cell.error || !cell.ast) { cell.v = E.NAME; cell.dirty = false; return; }
    cell.computing = true;
    var v;
    try { v = this.evalAst(cell.ast, cell.sheet); } catch (err) { v = E.VALUE; }
    cell.computing = false;
    if (isRange(v)) v = v.rows.length && v.rows[0].length ? E.VALUE : E.VALUE;
    cell.v = v == null ? 0 : v;
    cell.dirty = false;
  };

  /** Evalúa un AST (o sub-AST) en el contexto de una hoja. Público: lo usa la explicación paso a paso. */
  Book.prototype.evalAst = function (ast, sheet) {
    var self = this, ctx = { book: this, sheet: sheet };
    function ev(n) { return evalNode(n, self, sheet, ctx, ev); }
    return ev(ast);
  };

  function evalNode(n, book, sheet, ctx, ev) {
    switch (n.t) {
      case 'num': case 'str': case 'bool': return n.v;
      case 'empty': return null;
      case 'paren': return ev(n.x);
      case 'name': return E.NAME;
      case 'ref': { var sn = n.sheet ? book.sheetName(n.sheet) : sheet; if (!sn) return E.REF; return book.valueAt(sn, n.col, n.row); }
      case 'range': {
        var rs = n.sheet ? book.sheetName(n.sheet) : sheet; if (!rs) return E.REF;
        var rows = [], c, r, line;
        for (r = n.r1; r <= n.r2; r++) { line = []; for (c = n.c1; c <= n.c2; c++) line.push(book.valueAt(rs, c, r)); rows.push(line); }
        return { rows: rows, nr: rows.length, nc: rows[0].length, sheet: rs };
      }
      case 'un': { var x = scalar(ev(n.x)); var nx = toNum(x); return isErr(nx) ? nx : -nx; }
      case 'pct': { var px = toNum(scalar(ev(n.x))); return isErr(px) ? px : px / 100; }
      case 'bin': return binary(n.op, scalar(ev(n.l)), scalar(ev(n.r)), book);
      case 'fn': {
        var name = canonical(n.name);
        if (LAZY[name]) return LAZY[name](n.args, ev);
        if (!FN[name]) return E.NAME;
        var vals = n.args.map(ev), e = null;
        // Los errores de argumentos escalares se propagan (los rangos con error se tratan dentro de cada función)
        if (name !== 'ISERROR') for (var i = 0; i < vals.length && !e; i++) if (isErr(vals[i])) e = vals[i];
        if (e) return e;
        return FN[name](vals, ctx);
      }
    }
    return E.VALUE;
  }
  function scalar(v) { return isRange(v) ? (v.nr === 1 && v.nc === 1 ? v.rows[0][0] : E.VALUE) : v; }
  function binary(op, a, b, book) {
    var e = firstErr([a, b]); if (e) return e;
    if (op === '&') return toText(a, book.locale) + toText(b, book.locale);
    if (['=', '<>', '<', '>', '<=', '>='].indexOf(op) >= 0) {
      var c = compare(a, b);
      return op === '=' ? c === 0 : op === '<>' ? c !== 0 : op === '<' ? c < 0 : op === '>' ? c > 0 : op === '<=' ? c <= 0 : c >= 0;
    }
    var x = toNum(a), y = toNum(b);
    if (isErr(x)) return x; if (isErr(y)) return y;
    switch (op) {
      case '+': return x + y;
      case '-': return x - y;
      case '*': return x * y;
      case '/': return y === 0 ? E.DIV0 : x / y;
      case '^': { if (x === 0 && y <= 0) return y === 0 ? E.NUM : E.DIV0; var r = Math.pow(x, y); return isFinite(r) ? r : E.NUM; }
    }
    return E.VALUE;
  }

  /** Recalcula todas las fórmulas. */
  Book.prototype.recalcAll = function () {
    var self = this;
    this.order.forEach(function (sn) { var cs = self.sheets[sn].cells; Object.keys(cs).forEach(function (k) { if (cs[k].f != null) cs[k].dirty = true; }); });
    this.order.forEach(function (sn) { var cs = self.sheets[sn].cells; Object.keys(cs).forEach(function (k) { if (cs[k].f != null && cs[k].dirty) self._compute(cs[k]); }); });
  };

  function sameValue(a, b) {
    if (isErr(a) || isErr(b)) return isErr(a) && isErr(b) && a.err === b.err;
    return a === b;
  }

  /** Interpreta texto escrito por una persona («1,5», «1.5», «-3») → número o null. */
  function parseNumber(text) {
    if (typeof text === 'number') return isFinite(text) ? text : null;
    var s = String(text).trim().replace(/\s/g, '').replace('−', '-');
    if (/^[+-]?\d+(?:[.,]\d+)?(?:[eE][+-]?\d+)?%?$/.test(s)) {
      var pct = s.slice(-1) === '%'; if (pct) s = s.slice(0, -1);
      var n = Number(s.replace(',', '.')); return pct ? n / 100 : n;
    }
    return null;
  }

  /** Cambia una constante y recalcula solo las celdas afectadas. Devuelve [{sheet, ref}] de las que han cambiado. */
  Book.prototype.set = function (sheet, ref, value) {
    var cell = this.cell(sheet, ref);
    if (!cell || cell.f != null) return [];
    var seen = {}, queue = [cell], list = [], self = this, i, deps, old = {};
    // 1) todas las fórmulas que dependen (directa o indirectamente)
    while (queue.length) {
      var cur = queue.pop();
      deps = self.dependents[cur.sheet + '!' + cur.key] || [];
      deps.forEach(function (d) { var k = d.sheet + '!' + d.key; if (!seen[k]) { seen[k] = d; list.push(d); queue.push(d); } });
    }
    list.forEach(function (d) { old[d.sheet + '!' + d.key] = d.v; d.dirty = true; });
    var before = cell.v;
    cell.raw = value; cell.v = value == null ? null : value;
    var changed = [];
    if (!sameValue(before, cell.v)) changed.push({ sheet: cell.sheet, ref: cell.key });
    list.forEach(function (d) { if (d.dirty) self._compute(d); });
    list.forEach(function (d) { if (!sameValue(old[d.sheet + '!' + d.key], d.v)) changed.push({ sheet: d.sheet, ref: d.key }); });
    return changed;
  };

  /** Restaura los valores originales de todas las constantes y recalcula. Devuelve true si algo cambió. */
  Book.prototype.reset = function () {
    var self = this, any = false;
    this.order.forEach(function (sn) {
      var cs = self.sheets[sn].cells;
      Object.keys(cs).forEach(function (k) { var c = cs[k]; if (c.f == null && c.raw !== c.orig) { c.raw = c.orig; c.v = c.orig == null ? null : c.orig; any = true; } });
    });
    if (any) this.recalcAll();
    return any;
  };

  /** ¿Hay alguna entrada distinta de la original? */
  Book.prototype.isModified = function () {
    var self = this;
    return this.order.some(function (sn) { var cs = self.sheets[sn].cells; return Object.keys(cs).some(function (k) { return cs[k].f == null && cs[k].raw !== cs[k].orig; }); });
  };

  /** Valor con el formato de la celda, ya como texto (coma decimal si locale 'es'). */
  Book.prototype.display = function (sheet, ref, opts) {
    var cell = this.cell(sheet, ref); if (!cell) return '';
    var v = this.get(sheet, ref);
    return formatValue(v, cell.fmt, Object.assign({ locale: this.locale }, opts || {}));
  };

  function formatValue(v, fmt, opts) {
    if (isErr(v)) return v.err;
    if (v == null) return '';
    return getNumfmt().format(v, fmt, opts);
  }

  /** Explicación en español (la aporta services/formula-explain.js, cargado aparte). */
  Book.prototype.explain = function (sheet, ref) {
    var X = typeof module === 'object' && module.exports ? require('./formula-explain.js') : (root_HIS() && root_HIS().formulaExplain);
    if (!X) throw new Error('Falta services/formula-explain.js');
    return X.explain(this, sheet, ref);
  };
  function root_HIS() { return typeof window !== 'undefined' ? window.HIS : null; }

  function listFunctions() { return Object.keys(FN).concat(Object.keys(LAZY)).concat(Object.keys(ALIAS)).sort(); }

  return {
    version: '1.0',
    createBook: function (def, opts) { return new Book(def, opts); },
    parse: parse, tokenize: tokenize, parseNumber: parseNumber, formatValue: formatValue,
    colToNum: colToNum, numToCol: numToCol, parseRef: parseRef, keyOf: keyOf,
    isErr: isErr, isRange: isRange, canonical: canonical, isKnownFunction: isKnownFunction, listFunctions: listFunctions,
    phi: phi, normPdf: normPdf
  };
});
