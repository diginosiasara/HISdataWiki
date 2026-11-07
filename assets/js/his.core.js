/*!
 * HISdata Wiki · core/dom.js
 * Responsabilidad ÚNICA: utilidades mínimas de DOM (crear nodos, consultar, eventos).
 * Expone: HIS.dom  -> h, qs, qsa, on, ready, uid, clear
 */
(function (root) {
  'use strict';
  var HIS = (root.HIS = root.HIS || {});
  var D = (HIS.dom = {});
  var n = 0;

  D.qs = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  D.qsa = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  D.uid = function (p) { n += 1; return (p || 'his') + '-' + n; };
  D.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };
  D.ready = function (fn) {
    if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn);
  };
  D.on = function (el, ev, fn, opts) { el.addEventListener(ev, fn, opts); return function () { el.removeEventListener(ev, fn, opts); }; };

  /**
   * h('div.card#id', {class:'x', 'aria-label':'..', onclick:fn, dataset:{a:1}}, child, 'texto', [más hijos])
   * Sólo texto seguro: los strings se insertan con createTextNode (nunca innerHTML).
   */
  D.h = function (tag, attrs) {
    var m = /^([a-z0-9-]+)?(#[\w-]+)?((?:\.[\w-]+)*)$/i.exec(tag) || [];
    var el = document.createElement(m[1] || 'div');
    if (m[2]) el.id = m[2].slice(1);
    if (m[3]) el.className = m[3].slice(1).replace(/\./g, ' ');
    var start = 1;
    if (attrs && typeof attrs === 'object' && !attrs.nodeType && !Array.isArray(attrs)) {
      start = 2;
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = (el.className ? el.className + ' ' : '') + v;
        else if (k === 'dataset') Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
        else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (s) { el.style.setProperty(s, v[s]); });
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'text') el.textContent = v;
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    function add(c) {
      if (c == null || c === false) return;
      if (Array.isArray(c)) return c.forEach(add);
      el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
    }
    for (var i = start; i < arguments.length; i++) add(arguments[i]);
    return el;
  };
})(window);

;
/*!
 * HISdata Wiki · core/format.js
 * Responsabilidad ÚNICA: formato de números en español (coma decimal) y texto hablado.
 * Expone: HIS.fmt -> num, pct, sig, spoken
 */
(function (root) {
  'use strict';
  var HIS = (root.HIS = root.HIS || {});
  var F = (HIS.fmt = {});
  var cache = {};
  function nf(d, grouping) {
    var k = d + (grouping ? 'g' : 'n');
    return cache[k] || (cache[k] = new Intl.NumberFormat('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: !!grouping }));
  }
  /** Número con d decimales y coma decimal. */
  F.num = function (x, d, grouping) {
    if (x == null || !isFinite(x)) return x === Infinity ? '∞' : x === -Infinity ? '−∞' : '—';
    d = d == null ? 2 : d;
    var s = nf(d, grouping).format(Math.abs(x) < Math.pow(10, -d) / 2 ? 0 : x);
    return s.replace('-', '−');
  };
  /** Probabilidad 0..1 → "39,35 %" */
  F.pct = function (p, d) { return isFinite(p) ? F.num(p * 100, d == null ? 1 : d) + ' %' : '—'; };
  /** Redondeo a cifras significativas (para valores muy pequeños). */
  F.sig = function (x, s) { return isFinite(x) ? F.num(Number(x.toPrecision(s || 3)), Math.max(0, (s || 3) - 1 - Math.floor(Math.log10(Math.abs(x) || 1)))) : '—'; };
  /** Versión “para leer en voz alta”: signos y símbolos → palabras. */
  F.spoken = function (t) {
    return String(t)
      .replace(/−|-(?=\d)/g, 'menos ')
      .replace(/≤/g, ' menor o igual que ').replace(/≥/g, ' mayor o igual que ')
      .replace(/</g, ' menor que ').replace(/>/g, ' mayor que ')
      .replace(/%/g, ' por ciento').replace(/±/g, ' más o menos ')
      .replace(/σ/g, ' sigma ').replace(/μ/g, ' mu ').replace(/λ/g, ' lambda ')
      .replace(/χ²/g, ' ji cuadrado ').replace(/x̄/g, ' x barra ')
      .replace(/√/g, ' raíz cuadrada de ').replace(/∩/g, ' intersección ').replace(/∪/g, ' unión ')
      .replace(/\s+/g, ' ').trim();
  };
})(window);

;
/*!
 * HISdata Wiki · core/prefs.js
 * Responsabilidad ÚNICA: preferencias de usuario (tema, tamaño de texto, alto contraste,
 * reducir movimiento) con localStorage protegido por try/catch.
 * Expone: HIS.prefs -> get, set, apply, store
 */
(function (root) {
  'use strict';
  var HIS = (root.HIS = root.HIS || {});
  var P = (HIS.prefs = {});
  var KEY = 'hisdata:prefs:v1';
  var defaults = { theme: 'auto', fontScale: 100, contrast: false, motion: 'auto', dyslexia: false };
  var state = Object.assign({}, defaults);

  P.store = {
    read: function (k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } },
    write: function (k, v) { try { root.localStorage.setItem(k, v); } catch (e) { /* modo privado */ } }
  };
  try { var saved = JSON.parse(P.store.read(KEY) || '{}'); state = Object.assign(state, saved); } catch (e) { /* ignorar */ }

  P.get = function (k) { return k ? state[k] : Object.assign({}, state); };
  P.set = function (k, v) {
    state[k] = v; P.store.write(KEY, JSON.stringify(state)); P.apply();
    document.dispatchEvent(new CustomEvent('his:prefs', { detail: { key: k, value: v } }));
  };
  P.reducedMotion = function () {
    return state.motion === 'reduce' || (state.motion === 'auto' && root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };
  P.apply = function () {
    var r = document.documentElement;
    if (state.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', state.theme);
    r.style.setProperty('--font-scale', String(state.fontScale / 100));
    r.toggleAttribute('data-contrast', !!state.contrast);
    r.toggleAttribute('data-dyslexia', !!state.dyslexia);
    r.toggleAttribute('data-reduce-motion', P.reducedMotion());
  };
  P.apply();
})(window);

;
/*!
 * HISdata Wiki · core/a11y.js
 * Responsabilidad ÚNICA: ayudas de accesibilidad compartidas (anuncios aria-live, foco).
 * Expone: HIS.a11y -> announce, focus, trapFocus
 */
(function (root) {
  'use strict';
  var HIS = (root.HIS = root.HIS || {});
  var A = (HIS.a11y = {});
  var polite, assertive, timer;

  function region(kind) {
    var el = document.getElementById('his-live-' + kind);
    if (!el) {
      el = document.createElement('div');
      el.id = 'his-live-' + kind;
      el.className = 'sr-only';
      el.setAttribute('role', kind === 'assertive' ? 'alert' : 'status');
      el.setAttribute('aria-live', kind);
      el.setAttribute('aria-atomic', 'true');
      document.body.appendChild(el);
    }
    return el;
  }
  /** Anuncia un mensaje a lectores de pantalla (con “debounce” para no saturar mientras se arrastra un control). */
  A.announce = function (msg, opts) {
    opts = opts || {};
    var el = opts.assertive ? (assertive = assertive || region('assertive')) : (polite = polite || region('polite'));
    clearTimeout(timer);
    timer = setTimeout(function () { el.textContent = ''; setTimeout(function () { el.textContent = msg; }, 30); }, opts.delay == null ? 500 : opts.delay);
  };
  A.focus = function (el) { if (!el) return; if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: false }); };
  /** Atrapa el foco dentro de `container` (diálogos). Devuelve función para liberar. */
  A.trapFocus = function (container) {
    var sel = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
    function onKey(e) {
      if (e.key !== 'Tab') return;
      var f = Array.prototype.slice.call(container.querySelectorAll(sel)).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    container.addEventListener('keydown', onKey);
    return function () { container.removeEventListener('keydown', onKey); };
  };
})(window);

;
/*!
 * HISdata Wiki · core/widgets.js
 * Responsabilidad ÚNICA: registro y arranque (progressive enhancement) de widgets.
 * Un widget se declara en el HTML con  <div data-widget="nombre" data-...>  y se registra con
 *   HIS.widgets.register('nombre', function (el, cfg) { ... });
 * Expone: HIS.widgets -> register, init, initAll
 */
(function (root) {
  'use strict';
  var HIS = (root.HIS = root.HIS || {});
  var W = (HIS.widgets = {});
  var reg = {};

  W.register = function (name, fn) { reg[name] = fn; };
  W.init = function (el) {
    if (el.dataset.widgetReady) return;
    var name = el.dataset.widget, fn = reg[name];
    if (!fn) { if (root.console) console.warn('[HISdata] widget sin registrar:', name); return; }
    el.dataset.widgetReady = '1';
    var cfg = {};
    Object.keys(el.dataset).forEach(function (k) {
      var v = el.dataset[k];
      if (v === 'true') v = true; else if (v === 'false') v = false;
      else if (v !== '' && !isNaN(Number(v))) v = Number(v);
      cfg[k] = v;
    });
    try { fn(el, cfg); } catch (err) {
      if (root.console) console.error('[HISdata] error en widget', name, err);
      el.insertAdjacentHTML('beforeend', '<p class="callout callout--warn" role="alert">Este recurso interactivo no se pudo cargar. El contenido de la página sigue siendo válido.</p>');
    }
  };
  /** Los widgets pesados se inicializan al acercarse al viewport. */
  W.initAll = function () {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-widget]'));
    if (!('IntersectionObserver' in root)) return els.forEach(W.init);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); W.init(e.target); } });
    }, { rootMargin: '300px 0px' });
    els.forEach(function (el) { io.observe(el); });
    // los enlaces de ancla a un widget aún no iniciado deben iniciarlo ya
    root.addEventListener('hashchange', function () { var t = document.getElementById(location.hash.slice(1)); if (t) t.querySelectorAll('[data-widget]').forEach(W.init); });
  };
  HIS.dom.ready(W.initAll);
})(window);

;
/*!
 * HISdata Wiki · core/ui.js
 * Responsabilidad ÚNICA: componentes de interfaz reutilizables y accesibles para los widgets.
 * Expone: HIS.ui -> slider, number, select, toggle, stat, panel, tabs, steps
 * Todos devuelven un objeto { el, get(), set(v), onChange(fn) } salvo stat/panel/tabs.
 */
(function (root) {
  'use strict';
  var HIS = (root.HIS = root.HIS || {});
  var h = HIS.dom.h, F = HIS.fmt;
  var U = (HIS.ui = {});

  function emitter(api) {
    var subs = [];
    api.onChange = function (fn) { subs.push(fn); return api; };
    api._emit = function () { var v = api.get(); subs.forEach(function (f) { f(v, api); }); };
    return api;
  }

  /**
   * Slider accesible: <label> + <input type=range> + <output>.
   * opts: {label, min, max, step, value, unit, decimals, help, format(v), speak(v)}
   */
  U.slider = function (o) {
    var id = HIS.dom.uid('sl');
    var dec = o.decimals != null ? o.decimals : (String(o.step || 1).split('.')[1] || '').length;
    var fmt = o.format || function (v) { return F.num(v, dec) + (o.unit ? ' ' + o.unit : ''); };
    var out = h('output.slider__out', { for: id });
    var input = h('input', { type: 'range', id: id, min: o.min, max: o.max, step: o.step || 1, value: o.value });
    if (o.help) input.setAttribute('aria-describedby', id + '-h');
    var wrap = h('div.slider', null,
      h('div.slider__head', null, h('label.slider__label', { for: id }, o.label), out),
      input,
      h('div.slider__scale', { 'aria-hidden': 'true' }, h('span', null, F.num(o.min, dec)), h('span', null, F.num(o.max, dec))),
      o.help ? h('p.slider__help', { id: id + '-h' }, o.help) : null
    );
    var api = emitter({ el: wrap, input: input });
    function sync() {
      var v = Number(input.value);
      out.textContent = fmt(v);
      input.setAttribute('aria-valuetext', (o.speak ? o.speak(v) : F.spoken(fmt(v))));
      var pct = (v - o.min) / (o.max - o.min) * 100;
      input.style.setProperty('--fill', pct + '%');
    }
    input.addEventListener('input', function () { sync(); api._emit(); });
    api.get = function () { return Number(input.value); };
    api.set = function (v, silent) { input.value = v; sync(); if (!silent) api._emit(); };
    api.setRange = function (min, max) { input.min = min; input.max = max; o.min = min; o.max = max; sync(); };
    sync();
    return api;
  };

  /** Campo numérico con etiqueta (inputmode decimal). opts: {label,min,max,step,value,unit,help} */
  U.number = function (o) {
    var id = HIS.dom.uid('nf');
    var input = h('input', { type: 'number', id: id, inputmode: 'decimal', min: o.min, max: o.max, step: o.step || 'any', value: o.value });
    if (o.help) input.setAttribute('aria-describedby', id + '-h');
    var wrap = h('div.field', null,
      h('label.field__label', { for: id }, o.label, o.unit ? h('span.field__unit', null, ' (' + o.unit + ')') : null),
      input,
      o.help ? h('p.field__help', { id: id + '-h' }, o.help) : null
    );
    var api = emitter({ el: wrap, input: input });
    api.get = function () { var v = parseFloat(input.value); return isNaN(v) ? null : v; };
    api.set = function (v, silent) { input.value = v; if (!silent) api._emit(); };
    input.addEventListener('input', function () { api._emit(); });
    return api;
  };

  /** Selector. opts: {label, options:[{value,label}], value} */
  U.select = function (o) {
    var id = HIS.dom.uid('se');
    var sel = h('select', { id: id }, o.options.map(function (op) { return h('option', { value: op.value }, op.label); }));
    sel.value = o.value != null ? o.value : o.options[0].value;
    var wrap = h('div.field', null, h('label.field__label', { for: id }, o.label), sel);
    var api = emitter({ el: wrap, input: sel });
    api.get = function () { return sel.value; };
    api.set = function (v, silent) { sel.value = v; if (!silent) api._emit(); };
    sel.addEventListener('change', function () { api._emit(); });
    return api;
  };

  /** Interruptor (checkbox). opts: {label, checked} */
  U.toggle = function (o) {
    var id = HIS.dom.uid('tg');
    var cb = h('input', { type: 'checkbox', id: id }); cb.checked = !!o.checked;
    var wrap = h('div.toggle', null, cb, h('label', { for: id }, o.label));
    var api = emitter({ el: wrap, input: cb });
    api.get = function () { return cb.checked; };
    api.set = function (v, silent) { cb.checked = !!v; if (!silent) api._emit(); };
    cb.addEventListener('change', function () { api._emit(); });
    return api;
  };

  /** Botón. opts: {label, variant:'primary'|'ghost', onClick} */
  U.button = function (label, onClick, variant) {
    return h('button.btn' + (variant ? '.btn--' + variant : ''), { type: 'button', onclick: onClick }, label);
  };

  /**
   * Tarjeta de resultado: etiqueta + valor grande + nota.
   * Devuelve {el, set(value, note)}.
   */
  U.stat = function (o) {
    var v = h('div.stat__value', null, o.value == null ? '—' : o.value);
    var n = h('div.stat__note', null, o.note || '');
    var el = h('div.stat' + (o.tone ? '.stat--' + o.tone : ''), null, h('div.stat__label', null, o.label), v, n);
    return {
      el: el,
      set: function (val, note) { v.textContent = val; if (note != null) n.textContent = note; }
    };
  };

  /** Contenedor de controles + salida: <div class="panel"> */
  U.panel = function (title) {
    return h('div.panel', null, title ? h('h4.panel__title', null, title) : null);
  };

  /**
   * Pestañas ARIA (patrón WAI-ARIA Tabs, flechas/Home/End).
   * items: [{id,label,content(Node)}]. Devuelve {el, select(id)}.
   */
  U.tabs = function (items, o) {
    o = o || {};
    var base = HIS.dom.uid('tabs');
    var list = h('div.tabs__list', { role: 'tablist', 'aria-label': o.label || 'Secciones' });
    var panels = [], buttons = [];
    items.forEach(function (it, i) {
      var b = h('button.tabs__tab', { role: 'tab', type: 'button', id: base + '-t' + i, 'aria-controls': base + '-p' + i, 'aria-selected': 'false', tabindex: '-1' }, it.label);
      var p = h('div.tabs__panel', { role: 'tabpanel', id: base + '-p' + i, 'aria-labelledby': base + '-t' + i, tabindex: '0', hidden: '' }, it.content);
      buttons.push(b); panels.push(p); list.appendChild(b);
      b.addEventListener('click', function () { select(i); });
    });
    function select(i, focus) {
      buttons.forEach(function (b, j) {
        var on = i === j;
        b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1;
        if (on) panels[j].removeAttribute('hidden'); else panels[j].setAttribute('hidden', '');
      });
      if (focus) buttons[i].focus();
      if (o.onSelect) o.onSelect(i, items[i]);
    }
    list.addEventListener('keydown', function (e) {
      var i = buttons.indexOf(document.activeElement); if (i < 0) return;
      var k = e.key, n = buttons.length, t = null;
      if (k === 'ArrowRight') t = (i + 1) % n; else if (k === 'ArrowLeft') t = (i - 1 + n) % n;
      else if (k === 'Home') t = 0; else if (k === 'End') t = n - 1;
      if (t != null) { e.preventDefault(); select(t, true); }
    });
    var el = h('div.tabs', null, list, panels);
    select(o.selected || 0);
    return { el: el, select: function (idOrIndex) { var i = typeof idOrIndex === 'number' ? idOrIndex : items.findIndex(function (x) { return x.id === idOrIndex; }); if (i >= 0) select(i); } };
  };

  /** Paso a paso con “Anterior / Siguiente”. steps:[{title, body(Node|string)}] */
  U.steps = function (steps, o) {
    o = o || {};
    var i = 0, status = h('p.steps__status', { 'aria-live': 'polite' });
    var body = h('div.steps__body');
    var prev = U.button('Anterior', function () { go(i - 1); }, 'ghost');
    var next = U.button('Siguiente', function () { go(i + 1); }, 'primary');
    var el = h('div.steps', null, status, body, h('div.steps__nav', null, prev, next));
    function go(n) {
      i = Math.max(0, Math.min(steps.length - 1, n));
      HIS.dom.clear(body);
      body.appendChild(h('h4.steps__title', null, steps[i].title));
      body.appendChild(typeof steps[i].body === 'string' ? h('p', null, steps[i].body) : steps[i].body);
      status.textContent = 'Paso ' + (i + 1) + ' de ' + steps.length;
      prev.disabled = i === 0; next.disabled = i === steps.length - 1;
      if (o.onStep) o.onStep(i);
    }
    go(0);
    return { el: el, go: go };
  };
})(window);

;
/*!
 * HISdata Wiki · math/stats.js
 * Responsabilidad ÚNICA: funciones estadísticas puras (sin DOM).
 * Expone: HIS.stats
 *  - Normal: normPdf, normCdf, normInv (y versiones estándar zCdf, zInv)
 *  - Exponencial: expPdf, expCdf, expSurv, expInv
 *  - Uniforme: unifPdf, unifCdf
 *  - Chi cuadrado: chi2Pdf, chi2Cdf, chi2Inv
 *  - t de Student: tPdf, tCdf, tInv
 *  - F de Snedecor: fPdf, fCdf, fInv
 *  - Descriptiva: mean, varPop, sdPop, varSample, sdSample, sum, quantile
 *  - Utilidades: lgamma, betaInc, gammaP, linspace
 */
(function (root) {
  'use strict';
  var HIS = (root.HIS = root.HIS || {});
  var S = (HIS.stats = {});

  var SQRT2PI = Math.sqrt(2 * Math.PI);

  /* ---------- Normal ---------- */
  S.normPdf = function (x, mu, sigma) {
    mu = mu == null ? 0 : mu; sigma = sigma == null ? 1 : sigma;
    var z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z) / (sigma * SQRT2PI);
  };

  // Hart (1968) / West (2005): precisión ~1e-15
  S.zCdf = function (x) {
    var ax = Math.abs(x), c;
    if (ax > 37) { c = 0; }
    else {
      var e = Math.exp(-ax * ax / 2), b;
      if (ax < 7.07106781186547) {
        b = 3.52624965998911e-02 * ax + 0.700383064443688;
        b = b * ax + 6.37396220353165;
        b = b * ax + 33.912866078383;
        b = b * ax + 112.079291497871;
        b = b * ax + 221.213596169931;
        b = b * ax + 220.206867912376;
        c = e * b;
        b = 8.83883476483184e-02 * ax + 1.75566716318264;
        b = b * ax + 16.064177579207;
        b = b * ax + 86.7807322029461;
        b = b * ax + 296.564248779674;
        b = b * ax + 637.333633378831;
        b = b * ax + 793.826512519948;
        b = b * ax + 440.413735824752;
        c = c / b;
      } else {
        b = ax + 0.65; b = ax + 4 / b; b = ax + 3 / b; b = ax + 2 / b; b = ax + 1 / b;
        c = e / b / 2.506628274631;
      }
    }
    return x > 0 ? 1 - c : c;
  };
  S.normCdf = function (x, mu, sigma) {
    mu = mu == null ? 0 : mu; sigma = sigma == null ? 1 : sigma;
    return S.zCdf((x - mu) / sigma);
  };

  // Acklam + un paso de Halley
  S.zInv = function (p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    var pl = 0.02425, q, r, x;
    if (p < pl) {
      q = Math.sqrt(-2 * Math.log(p));
      x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= 1 - pl) {
      q = p - 0.5; r = q * q;
      x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    var e = S.zCdf(x) - p, u = e * SQRT2PI * Math.exp(x * x / 2);
    return x - u / (1 + x * u / 2);
  };
  S.normInv = function (p, mu, sigma) {
    mu = mu == null ? 0 : mu; sigma = sigma == null ? 1 : sigma;
    return mu + sigma * S.zInv(p);
  };

  /* ---------- Exponencial (media = mu, tasa lambda = 1/mu) ---------- */
  S.expPdf = function (x, lambda) { return x < 0 ? 0 : lambda * Math.exp(-lambda * x); };
  S.expCdf = function (x, lambda) { return x < 0 ? 0 : 1 - Math.exp(-lambda * x); };
  S.expSurv = function (x, lambda) { return x < 0 ? 1 : Math.exp(-lambda * x); };
  S.expInv = function (p, lambda) { return -Math.log(1 - p) / lambda; };

  /* ---------- Uniforme continua U(a,b) ---------- */
  S.unifPdf = function (x, a, b) { return x >= a && x <= b ? 1 / (b - a) : 0; };
  S.unifCdf = function (x, a, b) { return x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a); };

  /* ---------- Funciones especiales ---------- */
  var LG = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  S.lgamma = function (xx) {
    // Lanczos (g=5) – suficiente para gl razonables; usamos reflexión si x<0.5
    if (xx < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * xx))) - S.lgamma(1 - xx);
    var g = 7, coef = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    xx -= 1;
    var x = coef[0], t = xx + g + 0.5;
    for (var i = 1; i < g + 2; i++) x += coef[i] / (xx + i);
    return 0.5 * Math.log(2 * Math.PI) + (xx + 0.5) * Math.log(t) - t + Math.log(x);
  };

  // Gamma incompleta regularizada P(a,x)
  S.gammaP = function (a, x) {
    if (x <= 0) return 0;
    var gln = S.lgamma(a), i;
    if (x < a + 1) {
      var ap = a, sum = 1 / a, del = sum;
      for (i = 0; i < 500; i++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-15) break; }
      return sum * Math.exp(-x + a * Math.log(x) - gln);
    }
    var b = x + 1 - a, c = 1 / 1e-300, d = 1 / b, h = d, an;
    for (i = 1; i < 500; i++) {
      an = -i * (i - a); b += 2;
      d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; var del2 = d * c; h *= del2;
      if (Math.abs(del2 - 1) < 1e-15) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - gln) * h;
  };

  // Beta incompleta regularizada I_x(a,b)
  function betacf(a, b, x) {
    var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap, m, aa, del, h;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    d = 1 / d; h = d;
    for (m = 1; m <= 500; m++) {
      var m2 = 2 * m;
      aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-15) break;
    }
    return h;
  }
  S.betaInc = function (x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var bt = Math.exp(S.lgamma(a + b) - S.lgamma(a) - S.lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  };

  /* ---------- Chi cuadrado (k = grados de libertad) ---------- */
  S.chi2Pdf = function (x, k) {
    if (x < 0) return 0;
    if (x === 0) return k < 2 ? Infinity : k === 2 ? 0.5 : 0;
    return Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.LN2 - S.lgamma(k / 2));
  };
  S.chi2Cdf = function (x, k) { return x <= 0 ? 0 : S.gammaP(k / 2, x / 2); };

  /* Inversa genérica por bisección + secante, para cdf continua y creciente */
  function invert(cdf, p, lo, hi) {
    var i, mid;
    while (cdf(hi) < p && hi < 1e12) hi *= 2;
    for (i = 0; i < 200; i++) {
      mid = (lo + hi) / 2;
      if (cdf(mid) < p) lo = mid; else hi = mid;
      if (hi - lo < 1e-13 * Math.max(1, Math.abs(mid))) break;
    }
    return (lo + hi) / 2;
  }
  S.chi2Inv = function (p, k) { return invert(function (x) { return S.chi2Cdf(x, k); }, p, 0, Math.max(10, k * 4)); };

  /* ---------- t de Student (v = grados de libertad) ---------- */
  S.tPdf = function (x, v) {
    return Math.exp(S.lgamma((v + 1) / 2) - S.lgamma(v / 2)) / Math.sqrt(v * Math.PI) * Math.pow(1 + x * x / v, -(v + 1) / 2);
  };
  S.tCdf = function (t, v) {
    var x = v / (v + t * t), p = 0.5 * S.betaInc(x, v / 2, 0.5);
    return t > 0 ? 1 - p : p;
  };
  S.tInv = function (p, v) {
    if (p === 0.5) return 0;
    if (p < 0.5) return -S.tInv(1 - p, v);
    return invert(function (x) { return S.tCdf(x, v); }, p, 0, 10);
  };

  /* ---------- F de Snedecor (d1 numerador, d2 denominador) ---------- */
  S.fPdf = function (x, d1, d2) {
    if (x < 0) return 0;
    if (x === 0) return d1 < 2 ? Infinity : d1 === 2 ? 1 : 0;
    var lg = S.lgamma((d1 + d2) / 2) - S.lgamma(d1 / 2) - S.lgamma(d2 / 2) +
      (d1 / 2) * Math.log(d1 / d2) + (d1 / 2 - 1) * Math.log(x) - ((d1 + d2) / 2) * Math.log(1 + d1 * x / d2);
    return Math.exp(lg);
  };
  S.fCdf = function (x, d1, d2) { return x <= 0 ? 0 : S.betaInc(d1 * x / (d1 * x + d2), d1 / 2, d2 / 2); };
  S.fInv = function (p, d1, d2) { return invert(function (x) { return S.fCdf(x, d1, d2); }, p, 0, 10); };

  /* ---------- Estadística descriptiva ---------- */
  S.sum = function (a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; };
  S.mean = function (a) { return a.length ? S.sum(a) / a.length : NaN; };
  S.varPop = function (a) { var m = S.mean(a), s = 0; for (var i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m); return s / a.length; };
  S.sdPop = function (a) { return Math.sqrt(S.varPop(a)); };
  S.varSample = function (a) { var m = S.mean(a), s = 0; for (var i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m); return s / (a.length - 1); };
  S.sdSample = function (a) { return Math.sqrt(S.varSample(a)); };
  S.quantile = function (a, q) {
    var s = a.slice().sort(function (x, y) { return x - y; }), pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return s[lo] + (s[hi] - s[lo]) * (pos - lo);
  };
  S.linspace = function (a, b, n) { var r = [], i; for (i = 0; i < n; i++) r.push(a + (b - a) * i / (n - 1)); return r; };
  S.clamp = function (x, lo, hi) { return Math.min(hi, Math.max(lo, x)); };
})(typeof window !== 'undefined' ? window : globalThis);

;
/*!
 * HISdata Wiki · charts/plot.js
 * Responsabilidad ÚNICA: motor de gráficos SVG responsivos y accesibles (sin dependencias).
 *
 *   var p = HIS.plot(container, {
 *     title: 'Distribución normal N(0,1)',            // → <title> + aria-labelledby
 *     desc:  'Campana simétrica centrada en 0 ...',   // → <desc>: descripción larga para lectores de pantalla
 *     x: {min:-4, max:4, label:'z', ticks:8, format:fn},      // o type:'band', categories:['A','B']
 *     y: {min:0, max:'auto', label:'f(z)', ticks:5, format:fn},
 *     aspect: 0.5,                 // alto = ancho·aspect  (por defecto 0.5)
 *     legend: true,                // leyenda automática con las capas que tengan `label`
 *     table: true,                 // botón “Ver datos en tabla” (alternativa textual)
 *     layers: [ ...capas ]
 *   });
 *   p.update({ layers:[...], desc:'...' });   // re-dibuja fusionando opciones
 *   p.destroy();
 *
 * Capas (colores: 'violet','blue','orange','green','red','yellow','ink','muted' o cualquier color CSS):
 *   {type:'line',  fn:function(x){}, pts:[[x,y]], n:240, color, width, dash:'6 4', label}
 *   {type:'area',  fn | pts, from, to, color, opacity, label}          // sombrea bajo la curva entre from..to
 *   {type:'bars',  data:[{label,value,color,note}], color}              // eje x tipo 'band'
 *   {type:'hist',  bins:[{from,to,count}], color, opacity, label}       // eje x numérico
 *   {type:'points',pts:[[x,y,label?]], color, r, label}
 *   {type:'vline', x, color, dash, label, labelAt:'top'|'bottom'}
 *   {type:'hline', y, color, dash, label}
 *   {type:'text',  x, y, text, color, anchor:'start'|'middle'|'end', size, weight}
 *   {type:'band',  from, to, color, opacity, label}                     // franja vertical (p.ej. ±2σ)
 */
(function (root) {
  'use strict';
  var HIS = (root.HIS = root.HIS || {});
  var h = HIS.dom.h, F = HIS.fmt;
  var NS = 'http://www.w3.org/2000/svg';

  var COLORS = { violet: 'var(--c-violet)', blue: 'var(--c-blue)', orange: 'var(--c-orange)', green: 'var(--c-green)', red: 'var(--c-red)', yellow: 'var(--c-yellow)', ink: 'var(--ink)', muted: 'var(--muted)', teal: 'var(--c-teal)', pink: 'var(--c-pink)' };
  function col(c, d) { return COLORS[c] || c || COLORS[d] || COLORS.violet; }

  function el(tag, attrs, kids) {
    var e = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function tx(t, attrs) { var e = el('text', attrs); e.textContent = t; return e; }

  /** Marcas “bonitas” (1, 2, 5 × 10^n) */
  function niceTicks(min, max, n) {
    var span = max - min; if (!(span > 0)) return [min];
    var raw = span / Math.max(1, n), mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
    var step = (r < 1.5 ? 1 : r < 3.5 ? 2 : r < 7.5 ? 5 : 10) * mag, out = [], v = Math.ceil(min / step - 1e-9) * step;
    for (; v <= max + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : Number(v.toPrecision(12)));
    return out;
  }
  function sampleFn(fn, a, b, n) {
    var pts = [], i, x, y;
    for (i = 0; i <= n; i++) { x = a + (b - a) * i / n; y = fn(x); if (isFinite(y)) pts.push([x, y]); }
    return pts;
  }
  function layerPts(L, dom) {
    if (L.pts) return L.pts;
    return sampleFn(L.fn, dom[0], dom[1], L.n || 240);
  }

  function Plot(container, opts) {
    this.c = container; this.o = opts; this.uid = HIS.dom.uid('plot');
    this._render = this._render.bind(this);
    var self = this, t;
    if ('ResizeObserver' in root) {
      this.ro = new ResizeObserver(function () { clearTimeout(t); t = setTimeout(function () { if (Math.abs(self.c.clientWidth - (self._w || 0)) > 2) self._render(); }, 60); });
      this.ro.observe(container);
    }
    this._render();
  }
  Plot.prototype.update = function (patch) {
    var o = this.o;
    Object.keys(patch || {}).forEach(function (k) {
      if (k === 'x' || k === 'y') o[k] = Object.assign({}, o[k], patch[k]); else o[k] = patch[k];
    });
    this._render();
  };
  Plot.prototype.destroy = function () { if (this.ro) this.ro.disconnect(); HIS.dom.clear(this.c); };

  Plot.prototype._render = function () {
    var o = this.o, c = this.c, uid = this.uid;
    var W = Math.max(260, Math.min(c.clientWidth || 640, 980));
    this._w = c.clientWidth;
    var narrow = W < 460;
    var H = Math.round(W * (o.aspect || (narrow ? 0.72 : 0.5)));
    var m = Object.assign({ t: o.title ? 10 : 14, r: narrow ? 10 : 18, b: o.x && o.x.label ? 46 : 32, l: o.y && o.y.label ? 70 : 44 }, o.margin || {});
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var xo = o.x || {}, yo = o.y || {}, layers = o.layers || [];
    var band = xo.type === 'band';

    /* ----- dominios ----- */
    var xmin = xo.min, xmax = xo.max, cats = xo.categories;
    if (band) {
      var bars = layers.filter(function (l) { return l.type === 'bars'; })[0];
      cats = cats || (bars ? bars.data.map(function (d) { return d.label; }) : []);
    }
    var ymax = yo.max, ymin = yo.min == null ? 0 : yo.min;
    var wantAutoY = ymax == null || ymax === 'auto';
    var ptsCache = layers.map(function (L) {
      if ((L.type === 'line' || L.type === 'area') && (L.fn || L.pts)) return layerPts(L, [xmin, xmax]);
      return null;
    });
    if (wantAutoY) {
      var mx = 0;
      layers.forEach(function (L, i) {
        if (ptsCache[i]) ptsCache[i].forEach(function (p) { if (p[1] > mx) mx = p[1]; });
        if (L.type === 'bars') L.data.forEach(function (d) { if (d.value > mx) mx = d.value; });
        if (L.type === 'hist') L.bins.forEach(function (b) { var dens = L.density ? b.count / ((b.to - b.from) || 1) : b.count; if (dens > mx) mx = dens; });
        if (L.type === 'points') L.pts.forEach(function (p) { if (p[1] > mx) mx = p[1]; });
      });
      ymax = (mx || 1) * 1.08;
      if (yo.nice !== false) { var tk = niceTicks(ymin, ymax, yo.ticks || 5); ymax = tk[tk.length - 1] >= ymax ? tk[tk.length - 1] : tk[tk.length - 1] + (tk[1] - tk[0]); }
    }
    function X(v) { return m.l + (v - xmin) / (xmax - xmin) * iw; }
    function Y(v) { return m.t + ih - (v - ymin) / (ymax - ymin) * ih; }
    function XB(i) { return m.l + iw * (i + 0.5) / cats.length; }

    var svg = el('svg', { xmlns: NS, viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-labelledby': uid + '-t ' + uid + '-d', class: 'plot__svg', focusable: 'false' });
    svg.appendChild(el('title', { id: uid + '-t' }, [o.title || 'Gráfico']));
    svg.appendChild(el('desc', { id: uid + '-d' }, [o.desc || '']));
    var gGrid = el('g', { class: 'plot__grid', 'aria-hidden': 'true' }), gAx = el('g', { class: 'plot__axis', 'aria-hidden': 'true' }), gData = el('g', { class: 'plot__data' }), gTop = el('g', { class: 'plot__top', 'aria-hidden': 'true' });
    svg.appendChild(gGrid); svg.appendChild(gData); svg.appendChild(gAx); svg.appendChild(gTop);

    /* ----- ejes y rejilla ----- */
    var yt = yo.tickValues || niceTicks(ymin, ymax, yo.ticks || (narrow ? 4 : 5));
    var yf = yo.format || function (v) { return F.num(v, Math.abs(v) < 1 && v !== 0 ? (Math.abs(v) < 0.1 ? 3 : 2) : (v % 1 ? 1 : 0)); };
    yt.forEach(function (v) {
      gGrid.appendChild(el('line', { x1: m.l, x2: m.l + iw, y1: Y(v), y2: Y(v) }));
      gAx.appendChild(tx(yf(v), { x: m.l - 8, y: Y(v) + 4, 'text-anchor': 'end' }));
    });
    if (band) {
      cats.forEach(function (cname, i) {
        var lab = String(cname), maxc = Math.floor(iw / cats.length / 6.5);
        if (lab.length > maxc && maxc > 3) lab = lab.slice(0, maxc - 1) + '…';
        gAx.appendChild(tx(lab, { x: XB(i), y: m.t + ih + 18, 'text-anchor': 'middle' }));
      });
    } else {
      var xt = xo.tickValues || niceTicks(xmin, xmax, xo.ticks || (narrow ? 5 : 8));
      var xf = xo.format || function (v) { return F.num(v, v % 1 ? (Math.abs(v) < 10 ? 1 : 0) : 0); };
      xt.forEach(function (v) {
        gGrid.appendChild(el('line', { x1: X(v), x2: X(v), y1: m.t, y2: m.t + ih, class: 'plot__grid-v' }));
        gAx.appendChild(tx(xf(v), { x: X(v), y: m.t + ih + 18, 'text-anchor': 'middle' }));
      });
    }
    gAx.appendChild(el('line', { class: 'plot__baseline', x1: m.l, x2: m.l + iw, y1: Y(Math.max(ymin, 0)), y2: Y(Math.max(ymin, 0)) }));
    if (xo.label) gAx.appendChild(tx(xo.label, { x: m.l + iw / 2, y: H - 6, 'text-anchor': 'middle', class: 'plot__axis-label' }));
    if (yo.label) gAx.appendChild(tx(yo.label, { transform: 'translate(16,' + (m.t + ih / 2) + ') rotate(-90)', 'text-anchor': 'middle', class: 'plot__axis-label' }));

    /* ----- capas ----- */
    var legend = [], tableCols = [];
    layers.forEach(function (L, i) {
      var color = col(L.color, 'violet'), pts = ptsCache[i], d, g;
      if (L.label && L.type !== 'text') legend.push({ label: L.label, color: color, type: L.type, dash: L.dash });
      switch (L.type) {
        case 'band': {
          gData.insertBefore(el('rect', { x: X(L.from), y: m.t, width: Math.max(0, X(L.to) - X(L.from)), height: ih, fill: color, opacity: L.opacity == null ? 0.14 : L.opacity }), gData.firstChild);
          break;
        }
        case 'area': {
          var a = L.from == null ? xmin : Math.max(xmin, L.from), b = L.to == null ? xmax : Math.min(xmax, L.to);
          if (b <= a) break;
          var ap = L.fn ? sampleFn(L.fn, a, b, Math.max(40, Math.round((L.n || 240) * (b - a) / (xmax - xmin)))) : pts.filter(function (p) { return p[0] >= a && p[0] <= b; });
          if (!ap.length) break;
          d = 'M' + X(ap[0][0]).toFixed(1) + ',' + Y(0).toFixed(1) + ' ' + ap.map(function (p) { return 'L' + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ') + ' L' + X(ap[ap.length - 1][0]).toFixed(1) + ',' + Y(0).toFixed(1) + 'Z';
          gData.appendChild(el('path', { d: d, fill: color, 'fill-opacity': L.opacity == null ? 0.35 : L.opacity, stroke: L.stroke ? color : 'none', 'stroke-width': 1.5 }));
          break;
        }
        case 'line': {
          if (!pts || !pts.length) break;
          d = pts.map(function (p, k) { return (k ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ');
          gData.appendChild(el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': L.width || 2.5, 'stroke-dasharray': L.dash || null, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', class: 'plot__line' }));
          tableCols.push({ label: L.label || ('Serie ' + (tableCols.length + 1)), fn: L.fn, pts: pts });
          break;
        }
        case 'bars': {
          var bw = Math.min(64, iw / cats.length * 0.64);
          L.data.forEach(function (dd, k) {
            var idx = cats.indexOf(dd.label); if (idx < 0) idx = k;
            var cx = XB(idx), top = Y(dd.value);
            gData.appendChild(el('rect', { x: cx - bw / 2, y: top, width: bw, height: Math.max(0, Y(0) - top), rx: 4, fill: col(dd.color || L.color, 'violet'), class: 'plot__bar' }, [el('title', null, [dd.label + ': ' + (dd.text || F.num(dd.value, 2))])]));
            if (L.values !== false) gTop.appendChild(tx(dd.text || F.num(dd.value, L.decimals == null ? (dd.value % 1 ? 2 : 0) : L.decimals), { x: cx, y: top - 6, 'text-anchor': 'middle', class: 'plot__value' }));
          });
          tableCols.push({ label: L.label || 'Valor', bars: L.data });
          break;
        }
        case 'hist': {
          L.bins.forEach(function (bin) {
            var v = L.density ? bin.count / ((bin.to - bin.from) || 1) : bin.count;
            gData.appendChild(el('rect', { x: X(bin.from) + 1, y: Y(v), width: Math.max(0, X(bin.to) - X(bin.from) - 2), height: Math.max(0, Y(0) - Y(v)), fill: color, 'fill-opacity': L.opacity == null ? 0.55 : L.opacity, stroke: color, 'stroke-width': 1 }, [el('title', null, [F.num(bin.from, 0) + '–' + F.num(bin.to, 0) + ': ' + bin.count])]));
            if (L.values !== false && bin.count > 0) gTop.appendChild(tx(String(bin.count), { x: (X(bin.from) + X(bin.to)) / 2, y: Y(v) - 5, 'text-anchor': 'middle', class: 'plot__value' }));
          });
          tableCols.push({ label: L.label || 'Frecuencia', bins: L.bins });
          break;
        }
        case 'points': {
          L.pts.forEach(function (p) {
            gData.appendChild(el('circle', { cx: X(p[0]), cy: Y(p[1]), r: L.r || 4.5, fill: color, stroke: 'var(--surface)', 'stroke-width': 1.5 }, p[2] ? [el('title', null, [p[2]])] : null));
          });
          break;
        }
        case 'vline': {
          if (L.x < xmin || L.x > xmax) break;
          gTop.appendChild(el('line', { x1: X(L.x), x2: X(L.x), y1: m.t, y2: m.t + ih, stroke: color, 'stroke-width': L.width || 2, 'stroke-dasharray': L.dash || '6 4' }));
          if (L.text) {
            var right = X(L.x) > m.l + iw * 0.82;
            gTop.appendChild(tx(L.text, { x: X(L.x) + (right ? -6 : 6), y: L.labelAt === 'bottom' ? m.t + ih - 8 : m.t + 13, 'text-anchor': right ? 'end' : 'start', class: 'plot__note', fill: color }));
          }
          break;
        }
        case 'hline': {
          gTop.appendChild(el('line', { x1: m.l, x2: m.l + iw, y1: Y(L.y), y2: Y(L.y), stroke: color, 'stroke-width': L.width || 1.5, 'stroke-dasharray': L.dash || '6 4' }));
          if (L.text) gTop.appendChild(tx(L.text, { x: m.l + iw - 4, y: Y(L.y) - 5, 'text-anchor': 'end', class: 'plot__note', fill: color }));
          break;
        }
        case 'text': {
          gTop.appendChild(tx(L.text, { x: X(L.x), y: Y(L.y), 'text-anchor': L.anchor || 'middle', fill: col(L.color, 'ink'), 'font-size': L.size || null, 'font-weight': L.weight || 600, class: 'plot__note' }));
          break;
        }
      }
    });

    /* ----- cursor/lectura al pasar el ratón o tocar (solo curvas) ----- */
    var lineLayers = layers.map(function (L, i) { return L.type === 'line' && ptsCache[i] && L.fn ? { L: L, i: i } : null; }).filter(Boolean);
    if (lineLayers.length && !band && o.hover !== false) {
      var cur = el('line', { y1: m.t, y2: m.t + ih, class: 'plot__cursor', visibility: 'hidden' });
      var dots = lineLayers.map(function (ll) { return el('circle', { r: 4.5, fill: col(ll.L.color, 'violet'), stroke: 'var(--surface)', 'stroke-width': 1.5, visibility: 'hidden' }); });
      var tip = h('div.plot__tip', { 'aria-hidden': 'true', hidden: '' });
      gTop.appendChild(cur); dots.forEach(function (d0) { gTop.appendChild(d0); });
      var move = function (ev) {
        var r = svg.getBoundingClientRect(), px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left, vx = xmin + (px / r.width * W - m.l) / iw * (xmax - xmin);
        if (vx < xmin || vx > xmax) return leave();
        cur.setAttribute('x1', X(vx)); cur.setAttribute('x2', X(vx)); cur.setAttribute('visibility', 'visible');
        var lines = [(xo.label ? xo.label + ' = ' : 'x = ') + F.num(vx, 2)];
        lineLayers.forEach(function (ll, k) { var yy = ll.L.fn(vx); dots[k].setAttribute('cx', X(vx)); dots[k].setAttribute('cy', Y(yy)); dots[k].setAttribute('visibility', 'visible'); lines.push((ll.L.label || 'y') + ': ' + F.num(yy, 4)); });
        tip.textContent = lines.join(' · '); tip.hidden = false;
      };
      var leave = function () { cur.setAttribute('visibility', 'hidden'); dots.forEach(function (d0) { d0.setAttribute('visibility', 'hidden'); }); tip.hidden = true; };
      svg.addEventListener('pointermove', move); svg.addEventListener('pointerleave', leave); svg.addEventListener('touchmove', move, { passive: true }); svg.addEventListener('touchend', leave);
      this._tip = tip;
    } else this._tip = null;

    /* ----- ensamblado ----- */
    HIS.dom.clear(this.c);
    this.c.classList.add('plot');
    var wrap = h('div.plot__wrap', null, svg, this._tip);
    this.c.appendChild(wrap);

    if (o.legend !== false && legend.length > 1 || (o.legend === true && legend.length)) {
      var seen = {}, items = legend.filter(function (l) { if (seen[l.label]) return false; seen[l.label] = 1; return true; });
      var lg = h('ul.plot__legend', { 'aria-label': 'Leyenda' }, items.map(function (l) {
        var sw = h('span.plot__swatch', { style: { '--sw': l.color }, 'aria-hidden': 'true', class: l.dash ? 'is-dash' : (l.type === 'line' ? 'is-line' : '') });
        return h('li', null, sw, l.label);
      }));
      this.c.appendChild(lg);
    }
    if (o.table !== false && (tableCols.length || o.tableData)) this.c.appendChild(this._table(tableCols, xmin, xmax, band, cats));
  };

  /** Alternativa textual: tabla con los datos del gráfico (accesible para lectores de pantalla). */
  Plot.prototype._table = function (cols, xmin, xmax, band, cats) {
    var o = this.o, rows, head, body;
    if (o.tableData) { head = o.tableData.head; body = o.tableData.rows; }
    else if (cols[0] && cols[0].bars) {
      head = ['Categoría'].concat(cols.map(function (c) { return c.label; }));
      body = cols[0].bars.map(function (b, i) { return [b.label].concat(cols.map(function (c) { return F.num(c.bars[i] ? c.bars[i].value : NaN, 2); })); });
    } else if (cols[0] && cols[0].bins) {
      head = ['Intervalo', cols[0].label];
      body = cols[0].bins.map(function (b) { return [F.num(b.from, 0) + ' – ' + F.num(b.to, 0), String(b.count)]; });
    } else {
      var n = 11, xs = HIS.stats.linspace(xmin, xmax, n), xl = (o.x && o.x.label) || 'x';
      head = [xl].concat(cols.map(function (c) { return c.label; }));
      body = xs.map(function (x) { return [F.num(x, 2)].concat(cols.map(function (c) { return c.fn ? F.num(c.fn(x), 4) : '—'; })); });
    }
    var tbl = h('table.table', null, h('caption', null, 'Datos del gráfico: ' + (o.title || '')), h('thead', null, h('tr', null, head.map(function (t) { return h('th', { scope: 'col' }, t); }))),
      h('tbody', null, body.map(function (r) { return h('tr', null, r.map(function (cell, i) { return i ? h('td', null, cell) : h('th', { scope: 'row' }, cell); })); })));
    return h('details.plot__table', null, h('summary', null, 'Ver los datos del gráfico en una tabla'), h('div.table-wrap', null, tbl));
  };

  HIS.plot = function (container, opts) { return new Plot(container, opts); };
  HIS.plot.niceTicks = niceTicks;
  HIS.plot.sample = sampleFn;
  HIS.plot.svg = { el: el, text: tx, NS: NS };
})(window);

;
/*!
 * HISdata Wiki · modules/nav.js
 * Responsabilidad ÚNICA: navegación lateral móvil, índice “En esta página” (scrollspy) y enlaces de ancla.
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, D = HIS.dom;

  D.ready(function () {
    var btn = D.qs('[data-nav-toggle]'), side = D.qs('#sidebar'), scrim;
    if (btn && side) {
      var close = function () { side.dataset.open = 'false'; btn.setAttribute('aria-expanded', 'false'); if (scrim) { scrim.remove(); scrim = null; } };
      var open = function () {
        side.dataset.open = 'true'; btn.setAttribute('aria-expanded', 'true');
        scrim = D.h('div.scrim', { onclick: close, 'aria-hidden': 'true' }); document.body.appendChild(scrim);
        var cur = D.qs('[aria-current="page"]', side); (cur || D.qs('a', side)).focus();
      };
      btn.addEventListener('click', function () { side.dataset.open === 'true' ? close() : open(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && side.dataset.open === 'true' && root.innerWidth < 1100) { close(); btn.focus(); } });
      root.addEventListener('resize', function () { if (root.innerWidth >= 1100) close(); });
      // el atributo inert evita tabular dentro del menú oculto en móvil
      var sync = function () { var hide = root.innerWidth < 1100 && side.dataset.open !== 'true'; if (hide) side.setAttribute('inert', ''); else side.removeAttribute('inert'); };
      sync(); root.addEventListener('resize', sync); new MutationObserver(sync).observe(side, { attributes: true, attributeFilter: ['data-open'] });
      var cur0 = D.qs('[aria-current="page"]', side); if (cur0 && cur0.scrollIntoView) cur0.scrollIntoView({ block: 'center' });
    }

    // Scrollspy del índice
    var links = D.qsa('.toc a[href^="#"]');
    if (links.length && 'IntersectionObserver' in root) {
      var map = {}; links.forEach(function (a) { map[a.hash.slice(1)] = a; });
      var heads = Object.keys(map).map(function (id) { return document.getElementById(id); }).filter(Boolean);
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { links.forEach(function (a) { a.removeAttribute('aria-current'); }); map[en.target.id].setAttribute('aria-current', 'true'); }
        });
      }, { rootMargin: '-80px 0px -70% 0px' });
      heads.forEach(function (hd) { io.observe(hd); });
    }

    // Copiar enlace a sección
    D.qsa('.anchor').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var url = location.href.split('#')[0] + a.getAttribute('href');
        if (navigator.clipboard) { navigator.clipboard.writeText(url).then(function () { HIS.a11y.announce('Enlace a la sección copiado', { delay: 0 }); }); }
      });
    });
  });
})(window);

;
/*!
 * HISdata Wiki · modules/prefs-panel.js
 * Responsabilidad ÚNICA: panel de accesibilidad y preferencias (tema, tamaño, contraste, fuente, movimiento).
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, D = HIS.dom, h = D.h, P = HIS.prefs;

  D.ready(function () {
    var btn = D.qs('[data-prefs-toggle]'); if (!btn) return;
    var panel = null;
    function build() {
      var body = h('div.prefs__body');
      var themeSel = HIS.ui.select({ label: 'Tema de color', options: [{ value: 'auto', label: 'Automático (según tu dispositivo)' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }], value: P.get('theme') });
      themeSel.onChange(function (v) { P.set('theme', v); });
      var size = HIS.ui.slider({ label: 'Tamaño del texto', min: 85, max: 160, step: 5, value: P.get('fontScale'), unit: '%', decimals: 0 });
      size.onChange(function (v) { P.set('fontScale', v); });
      var contrast = HIS.ui.toggle({ label: 'Alto contraste', checked: P.get('contrast') }); contrast.onChange(function (v) { P.set('contrast', v); });
      var dys = HIS.ui.toggle({ label: 'Fuente de lectura fácil (dislexia)', checked: P.get('dyslexia') }); dys.onChange(function (v) { P.set('dyslexia', v); });
      var mot = HIS.ui.toggle({ label: 'Reducir animaciones', checked: P.get('motion') === 'reduce' }); mot.onChange(function (v) { P.set('motion', v ? 'reduce' : 'auto'); });
      var reset = HIS.ui.button('Restablecer', function () {
        ['theme', 'fontScale', 'contrast', 'dyslexia', 'motion'].forEach(function (k) { P.set(k, { theme: 'auto', fontScale: 100, contrast: false, dyslexia: false, motion: 'auto' }[k]); });
        close(); open();
      }, 'ghost');
      body.append(themeSel.el, size.el, contrast.el, dys.el, mot.el, reset);
      var title = h('h2#prefs-title', null, 'Accesibilidad y lectura');
      var closeBtn = h('button.icon-btn', { type: 'button', 'aria-label': 'Cerrar panel de accesibilidad', onclick: function () { close(); } }, '✕');
      return h('div.prefs', { role: 'dialog', 'aria-labelledby': 'prefs-title', id: 'prefs-panel' }, h('div.prefs__head', null, title, closeBtn), body,
        h('p.prefs__note', null, 'Tus preferencias se guardan solo en este navegador.'));
    }
    function open() {
      panel = build(); document.body.appendChild(panel); btn.setAttribute('aria-expanded', 'true');
      panel.querySelector('select').focus(); D.on(document, 'keydown', onKey); D.on(document, 'mousedown', onOutside);
    }
    function close() { if (!panel) return; panel.remove(); panel = null; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onOutside); }
    function onKey(e) { if (e.key === 'Escape') { close(); btn.focus(); } }
    function onOutside(e) { if (panel && !panel.contains(e.target) && !btn.contains(e.target)) close(); }
    btn.addEventListener('click', function () { panel ? close() : open(); });
  });
})(window);

;
/*!
 * HISdata Wiki · modules/reader.js
 * Responsabilidad ÚNICA: lector de pantalla integrado (síntesis de voz) optimizado para esta wiki.
 *  - Lee el contenido principal bloque a bloque (títulos, párrafos, listas, tablas por filas, fórmulas, figuras).
 *  - Fórmulas: usa data-speak / aria-label (lectura matemática en español); gráficos: <title> + <desc>.
 *  - Controles: reproducir/pausar, anterior/siguiente, detener, velocidad, voz, “desde la sección actual”.
 *  - Resalta y desplaza al bloque que se está leyendo. Atajo: Alt+L.
 *  - No sustituye a NVDA/JAWS/VoiceOver: la maquetación semántica y ARIA del sitio está pensada para ellos.
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, D = HIS.dom, h = D.h, F = HIS.fmt;
  var synth = root.speechSynthesis;

  var SEL = 'h1,h2,h3,h4,p,li,dt,dd,blockquote,figcaption,caption,.formula,.callout__title,[data-speak-block]';
  var SKIP = '[aria-hidden="true"],[hidden],[data-reader="skip"],.sr-only,.plot__legend,.toc,.pager,script,style,nav,.anchor,.widget__grid,button,select,input';

  function speakable(el) {
    if (el.matches('.formula') || el.hasAttribute('data-speak')) {
      var m = el.querySelector('math');
      return el.getAttribute('data-speak') || el.getAttribute('aria-label') || (m && (m.getAttribute('aria-label') || m.getAttribute('data-speak'))) || F.spoken(el.textContent);
    }
    var c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('math'), function (m) { m.replaceWith(document.createTextNode(' ' + (m.getAttribute('aria-label') || m.getAttribute('data-speak') || F.spoken(m.textContent)) + ' ')); });
    Array.prototype.forEach.call(c.querySelectorAll('abbr[title]'), function (a) { a.replaceWith(document.createTextNode(a.textContent + ' (' + a.getAttribute('title') + ')')); });
    Array.prototype.forEach.call(c.querySelectorAll('sup'), function (s) { s.replaceWith(document.createTextNode(' elevado a ' + s.textContent + ' ')); });
    Array.prototype.forEach.call(c.querySelectorAll('.anchor,.sr-only'), function (s) { s.remove(); });
    return F.spoken(c.textContent);
  }

  function collect() {
    var root0 = D.qs('#main-content') || document.body, out = [];
    D.qsa(SEL, root0).forEach(function (el) {
      if (el.closest(SKIP) && !el.matches('.callout__title')) return;
      // evitar duplicar: un <li> con <p> dentro, o un bloque dentro de otro seleccionado
      if (el.parentElement && el.parentElement.closest(SEL) && !el.matches('li,.callout__title,dd') && el.parentElement.closest('.formula,figcaption')) return;
      if (el.tagName === 'LI' && el.querySelector('p')) return;
      var t = speakable(el);
      if (t && t.length > 1) out.push({ el: el, text: (/^H[1-4]$/.test(el.tagName) ? t + '.' : t) });
    });
    // figuras SVG: título + descripción
    D.qsa('svg.plot__svg', root0).forEach(function (svg) {
      var t = svg.querySelector('title'), d = svg.querySelector('desc'); if (!t) return;
      var txt = 'Gráfico: ' + t.textContent + '. ' + (d ? d.textContent : '');
      var host = svg.closest('figure') || svg.closest('.plot') || svg;
      out.push({ el: host, text: F.spoken(txt), fig: true });
    });
    // orden de documento
    out.sort(function (a, b) { var p = a.el.compareDocumentPosition(b.el); return p & 4 ? -1 : p & 2 ? 1 : 0; });
    // quitar bloques cuyo texto ya está incluido en un ancestro leído (p. ej. figcaption en figure con gráfico)
    return out.filter(function (x, i, arr) { return arr.findIndex(function (y) { return y.el === x.el && y.text === x.text; }) === i; });
  }

  function chunk(text) {
    var parts = text.match(/[^.!?;:]+[.!?;:]*\s*/g) || [text], out = [], cur = '';
    parts.forEach(function (p) { if ((cur + p).length > 190 && cur) { out.push(cur); cur = p; } else cur += p; });
    if (cur) out.push(cur);
    return out;
  }

  var bar, blocks = [], idx = 0, playing = false, rate = 1, voice = null, hl = null, token = 0;
  var ui = {};

  function voices() {
    var all = synth.getVoices() || [];
    var es = all.filter(function (v) { return /^es/i.test(v.lang); });
    return es.length ? es : all;
  }
  function pickVoice(sel) {
    var vs = voices(), saved = HIS.prefs.store.read('hisdata:voice');
    voice = vs.filter(function (v) { return v.voiceURI === (sel || saved); })[0] || vs.filter(function (v) { return /es-ES/i.test(v.lang); })[0] || vs[0] || null;
    return vs;
  }
  function highlight(el) {
    if (hl) hl.classList.remove('is-reading');
    hl = el; if (!el) return;
    el.classList.add('is-reading');
    var r = el.getBoundingClientRect();
    if (r.top < 80 || r.bottom > root.innerHeight - 120) el.scrollIntoView({ block: 'center', behavior: HIS.prefs.reducedMotion() ? 'auto' : 'smooth' });
  }
  function setState(p) {
    playing = p;
    ui.play.textContent = p ? '⏸ Pausar' : '▶ Leer';
    ui.play.setAttribute('aria-label', p ? 'Pausar lectura' : 'Iniciar o reanudar lectura');
    document.querySelectorAll('[data-reader-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', bar && bar.isConnected ? 'true' : 'false'); });
  }
  function speakBlock(i) {
    token += 1; var my = token;
    synth.cancel();
    if (i >= blocks.length) { setState(false); ui.status.textContent = 'Lectura terminada.'; highlight(null); idx = 0; return; }
    idx = i; var b = blocks[i]; highlight(b.el);
    ui.status.textContent = 'Bloque ' + (i + 1) + ' de ' + blocks.length;
    var parts = chunk(b.text), k = 0;
    (function next() {
      if (my !== token) return;
      if (k >= parts.length) return speakBlock(i + 1);
      var u = new SpeechSynthesisUtterance(parts[k++]);
      u.lang = (voice && voice.lang) || 'es-ES'; if (voice) u.voice = voice; u.rate = rate;
      u.onend = function () { if (my === token && playing) next(); };
      u.onerror = function (e) { if (e.error !== 'canceled' && e.error !== 'interrupted') { ui.status.textContent = 'No se pudo reproducir la voz.'; setState(false); } };
      synth.speak(u);
    })();
  }
  function play(from) {
    if (!blocks.length) blocks = collect();
    setState(true);
    speakBlock(from == null ? idx : from);
  }
  function pause() { token += 1; synth.cancel(); setState(false); ui.status.textContent = 'En pausa en el bloque ' + (idx + 1) + ' de ' + blocks.length + '.'; }
  function stop() { token += 1; synth.cancel(); setState(false); idx = 0; highlight(null); ui.status.textContent = 'Detenido.'; }
  function fromViewport() {
    blocks = collect();
    for (var i = 0; i < blocks.length; i++) { if (blocks[i].el.getBoundingClientRect().top > 70) return i; }
    return 0;
  }
  function closeBar() { stop(); if (bar) { bar.remove(); bar = null; } document.documentElement.classList.remove('has-reader'); document.querySelectorAll('[data-reader-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); }

  function openBar() {
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      HIS.a11y.announce('Tu navegador no incluye síntesis de voz. Puedes usar el lector de pantalla de tu sistema: esta página está preparada para NVDA, JAWS, VoiceOver y TalkBack.', { assertive: true, delay: 0 });
      alert('Tu navegador no incluye síntesis de voz. Puedes usar el lector de pantalla de tu sistema (NVDA, JAWS, VoiceOver, TalkBack): la página está maquetada para ellos.');
      return;
    }
    if (bar) { closeBar(); return; }
    var vs = pickVoice();
    ui.play = h('button.btn.btn--primary', { type: 'button', onclick: function () { playing ? pause() : play(); } }, '▶ Leer');
    ui.prev = h('button.btn', { type: 'button', 'aria-label': 'Bloque anterior', onclick: function () { play(Math.max(0, idx - 1)); } }, '⏮');
    ui.next = h('button.btn', { type: 'button', 'aria-label': 'Bloque siguiente', onclick: function () { play(idx + 1); } }, '⏭');
    ui.stop = h('button.btn', { type: 'button', onclick: stop }, '⏹ Detener');
    ui.here = h('button.btn.btn--ghost', { type: 'button', onclick: function () { play(fromViewport()); } }, 'Leer desde aquí');
    ui.speed = h('select', { 'aria-label': 'Velocidad de lectura', onchange: function (e) { rate = parseFloat(e.target.value); if (playing) play(idx); } },
      [0.7, 0.85, 1, 1.15, 1.3, 1.6].map(function (v) { var o = h('option', { value: v }, '×' + String(v).replace('.', ',')); if (v === 1) o.selected = true; return o; }));
    ui.voice = h('select', { 'aria-label': 'Voz', onchange: function (e) { HIS.prefs.store.write('hisdata:voice', e.target.value); pickVoice(e.target.value); if (playing) play(idx); } });
    function fillVoices() { D.clear(ui.voice); pickVoice().forEach(function (v) { var o = h('option', { value: v.voiceURI }, v.name + ' (' + v.lang + ')'); if (voice && v.voiceURI === voice.voiceURI) o.selected = true; ui.voice.appendChild(o); }); if (!ui.voice.children.length) ui.voice.appendChild(h('option', null, 'Voz del sistema')); }
    fillVoices(); if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = fillVoices;
    ui.status = h('p.reader__status', { role: 'status', 'aria-live': 'polite' }, 'Lector listo. Pulsa “Leer” para escuchar esta página.');
    bar = h('section.reader', { role: 'region', 'aria-label': 'Lector de pantalla de la wiki' },
      h('div.reader__row', null, ui.play, ui.prev, ui.next, ui.stop, ui.here,
        h('label.reader__sel', null, h('span', null, 'Velocidad'), ui.speed), h('label.reader__sel', null, h('span', null, 'Voz'), ui.voice),
        h('button.icon-btn', { type: 'button', 'aria-label': 'Cerrar lector', onclick: function () { closeBar(); var t = D.qs('[data-reader-toggle]'); if (t) t.focus(); } }, '✕')),
      ui.status);
    document.body.appendChild(bar); document.documentElement.classList.add('has-reader');
    document.querySelectorAll('[data-reader-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', 'true'); });
    blocks = []; idx = 0; ui.play.focus();
  }

  D.ready(function () {
    D.qsa('[data-reader-toggle]').forEach(function (b) { b.addEventListener('click', openBar); });
    document.addEventListener('keydown', function (e) {
      if (e.altKey && e.key.toLowerCase() === 'l') { e.preventDefault(); if (!bar) openBar(); else (playing ? pause() : play()); }
      if (e.key === 'Escape' && bar && playing && !document.documentElement.classList.contains('is-searching')) stop();
    });
    root.addEventListener('pagehide', function () { if (synth) synth.cancel(); });
  });
  HIS.reader = { open: openBar, close: closeBar };
})(window);

;
/*!
 * HISdata Wiki · modules/search.js
 * Responsabilidad ÚNICA: buscador de información de toda la wiki (cliente, sin servidor).
 * - Índice por secciones: window.HIS_INDEX = [{u:url, p:título página, h:encabezado, s:sección/bloque, t:texto, k:palabras clave}]
 * - Normaliza tildes y mayúsculas, busca por prefijo, admite sinónimos y pondera título > encabezado > claves > texto.
 * - Patrón ARIA “combobox + listbox”; atajos: “/” o Ctrl/⌘+K para abrir, ↑↓ Enter Esc.
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, D = HIS.dom, h = D.h;

  var SYN = {
    campana: ['normal', 'gauss'], gauss: ['normal', 'campana'], gaussiana: ['normal', 'campana'],
    chi: ['ji', 'cuadrado', 'pearson'], ji: ['chi', 'cuadrado'], pearson: ['chi'],
    student: ['t'], snedecor: ['f', 'anova'], anova: ['f', 'snedecor'],
    promedio: ['media', 'mu'], media: ['promedio'], desviacion: ['sigma', 'tipica', 'estandar'], sigma: ['desviacion'],
    tipificar: ['z', 'estandarizar', 'tipificada'], estandarizar: ['tipificar', 'z'], zeta: ['z', 'tipificada'],
    percentil: ['cuantil'], ic: ['intervalo', 'confianza'], intervalo: ['confianza', 'ic'],
    laplace: ['favorables', 'posibles'], venn: ['diagrama', 'interseccion', 'union'],
    hce: ['historia', 'clinica', 'electronica'], hc: ['historia', 'clinica'], sis: ['sistema', 'informacion', 'sanitaria'],
    rgpd: ['proteccion', 'datos'], lopd: ['proteccion', 'datos'], iso: ['calidad', 'normas'], une: ['calidad', 'normas'],
    excel: ['hoja', 'formula', 'calculo'], formula: ['excel', 'ecuacion'], ambulancia: ['exponencial'], lambda: ['decaimiento', 'tasa'],
    glucosa: ['t', 'student'], farmaco: ['medicamento', 'eficacia'], libertad: ['gl', 'grados'], gl: ['grados', 'libertad']
  };
  function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9α-ωμσλχ²]+/g, ' ').trim(); }
  function stem(w) { return w.length > 4 ? w.replace(/(es|s)$/, '') : w; }

  var docs = null, loading = null;
  function load(cb) {
    if (docs) return cb();
    if (root.HIS_INDEX) { prep(); return cb(); }
    if (loading) { loading.push(cb); return; }
    loading = [cb];
    var s = document.createElement('script'); s.src = root.HIS_BASE + 'assets/search-index.js';
    s.onload = function () { prep(); loading.forEach(function (f) { f(); }); loading = null; };
    s.onerror = function () { docs = []; loading.forEach(function (f) { f(); }); loading = null; };
    document.head.appendChild(s);
  }
  function prep() {
    docs = (root.HIS_INDEX || []).map(function (d) { return { d: d, ph: norm(d.p), hh: norm(d.h), kk: norm(d.k || ''), tt: norm(d.t) }; });
  }
  function terms(q) {
    var out = [], seen = {};
    norm(q).split(' ').filter(Boolean).forEach(function (w) {
      var group = [stem(w)];
      (SYN[w] || []).forEach(function (x) { group.push(stem(x)); });
      out.push(group);
    });
    return out;
  }
  function score(doc, groups) {
    var total = 0;
    for (var i = 0; i < groups.length; i++) {
      var best = 0, g = groups[i];
      for (var j = 0; j < g.length; j++) {
        var t = g[j], w = j === 0 ? 1 : 0.55, sc = 0;
        if (doc.hh.indexOf(t) > -1) sc = Math.max(sc, 7 * w + (doc.hh.indexOf(t) === 0 ? 2 : 0));
        if (doc.ph.indexOf(t) > -1) sc = Math.max(sc, 5 * w);
        if (doc.kk.indexOf(t) > -1) sc = Math.max(sc, 4 * w);
        if (doc.tt.indexOf(t) > -1) sc = Math.max(sc, 1.5 * w);
        best = Math.max(best, sc);
      }
      if (!best) return 0;     // AND: todas las palabras deben aparecer (o un sinónimo)
      total += best;
    }
    return total;
  }
  function snippet(text, groups) {
    var low = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), pos = -1;
    for (var i = 0; i < groups.length && pos < 0; i++) pos = low.indexOf(groups[i][0]);
    var start = Math.max(0, (pos < 0 ? 0 : pos) - 40), s = text.slice(start, start + 170);
    return (start > 0 ? '… ' : '') + s + (start + 170 < text.length ? ' …' : '');
  }
  function mark(text, groups) {
    var frag = document.createDocumentFragment(), words = [];
    groups.forEach(function (g) { words.push(g[0]); });
    var low = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    // `normalize` puede cambiar longitudes; si ocurre, devolvemos texto plano
    if (low.length !== text.length) { frag.appendChild(document.createTextNode(text)); return frag; }
    var ranges = [];
    words.forEach(function (w) { if (!w) return; var p = 0, i; while ((i = low.indexOf(w, p)) > -1) { ranges.push([i, i + w.length]); p = i + w.length; } });
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var cur = 0;
    ranges.forEach(function (r) {
      if (r[0] < cur) return;
      frag.appendChild(document.createTextNode(text.slice(cur, r[0])));
      frag.appendChild(h('mark', null, text.slice(r[0], r[1]))); cur = r[1];
    });
    frag.appendChild(document.createTextNode(text.slice(cur)));
    return frag;
  }

  var dlg, input, list, status, last, results = [], active = -1;
  function build() {
    input = h('input#his-search-input', { type: 'search', role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'his-search-list', 'aria-autocomplete': 'list', placeholder: 'Busca conceptos, fórmulas, ejercicios…', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Buscar en HISdata Wiki' });
    list = h('ul#his-search-list.search__list', { role: 'listbox', 'aria-label': 'Resultados de búsqueda' });
    status = h('p.search__status', { role: 'status', 'aria-live': 'polite' });
    var close = h('button.icon-btn', { type: 'button', 'aria-label': 'Cerrar búsqueda', onclick: hide }, '✕');
    dlg = h('div.search', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Buscador' },
      h('div.search__panel', null, h('div.search__bar', null, h('span.search__ico', { 'aria-hidden': 'true' }, '⌕'), input, close), status, list,
        h('p.search__hint', { 'aria-hidden': 'true' }, h('kbd', null, '↑'), ' ', h('kbd', null, '↓'), ' navegar · ', h('kbd', null, 'Enter'), ' abrir · ', h('kbd', null, 'Esc'), ' cerrar')));
    dlg.addEventListener('mousedown', function (e) { if (e.target === dlg) hide(); });
    input.addEventListener('input', run);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { var r = results[active < 0 ? 0 : active]; if (r) { location.href = r.u; } }
      else if (e.key === 'Escape') { hide(); }
    });
    dlg.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
    HIS._untrap = HIS.a11y.trapFocus(dlg);
  }
  function move(d) {
    if (!results.length) return;
    active = (active + d + results.length) % results.length;
    D.qsa('.search__item', list).forEach(function (li, i) { li.setAttribute('aria-selected', i === active ? 'true' : 'false'); });
    var li = list.children[active]; input.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' });
  }
  function run() {
    var q = input.value.trim(); D.clear(list); results = []; active = -1; input.removeAttribute('aria-activedescendant');
    if (q.length < 2) { status.textContent = 'Escribe al menos dos letras.'; input.setAttribute('aria-expanded', 'false'); return; }
    var g = terms(q);
    var hits = [];
    docs.forEach(function (doc) { var s = score(doc, g); if (s) hits.push({ s: s, d: doc.d }); });
    hits.sort(function (a, b) { return b.s - a.s; });
    results = hits.slice(0, 25).map(function (x) { return x.d; });
    input.setAttribute('aria-expanded', results.length ? 'true' : 'false');
    if (!results.length) { status.textContent = 'Sin resultados para “' + q + '”. Prueba con otra palabra (por ejemplo: normal, media, historia clínica).'; return; }
    status.textContent = hits.length + (hits.length === 1 ? ' resultado' : ' resultados') + (hits.length > 25 ? ' (mostrando los 25 más relevantes)' : '') + '.';
    results.forEach(function (r, i) {
      var li = h('li.search__item', { role: 'option', id: 'his-res-' + i, 'aria-selected': 'false' },
        h('a', { href: root.HIS_BASE + r.u, tabindex: '-1' },
          h('span.search__crumb', null, r.s),
          h('strong', null, mark(r.h && r.h !== r.p ? r.p + ' › ' + r.h : r.p, g)),
          h('span.search__snip', null, mark(snippet(r.t, g), g))));
      list.appendChild(li);
    });
    results = results.map(function (r) { return { u: root.HIS_BASE + r.u }; });
  }
  function show(prefill) {
    last = document.activeElement;
    load(function () {
      if (!dlg) build();
      document.body.appendChild(dlg); document.documentElement.classList.add('is-searching');
      input.value = prefill || ''; run(); input.focus();
      if (prefill) input.select();
    });
  }
  function hide() {
    if (!dlg || !dlg.parentNode) return;
    dlg.remove(); document.documentElement.classList.remove('is-searching');
    if (last && last.focus) last.focus();
  }
  HIS.search = { open: show, close: hide };

  D.ready(function () {
    D.qsa('[data-search-open]').forEach(function (b) { b.addEventListener('click', function () { show(); }); });
    D.qsa('form[data-search-form]').forEach(function (f) { f.addEventListener('submit', function (e) { e.preventDefault(); show(f.querySelector('input').value); }); });
    document.addEventListener('keydown', function (e) {
      var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) { e.preventDefault(); show(); }
    });
    var q = new URLSearchParams(location.search).get('q'); if (q) show(q);
  });
})(window);

;
/*!
 * HISdata Wiki · modules/quiz.js
 * Responsabilidad ÚNICA: widget «quiz» (autoevaluación de opción múltiple, accesible).
 * Datos: <script type="application/json">{"questions":[{"q","options":[..],"answer":idx,"why"}]}</script>
 * Patrón: <fieldset>/<legend> con radios nativos; feedback en región aria-live; resumen final.
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, D = HIS.dom, h = D.h;
  HIS.widgets.register('quiz', function (el) {
    var tag = el.querySelector('script[type="application/json"]');
    var data = JSON.parse(tag.textContent), qs = data.questions, i = 0, score = 0, answered = false;
    var body = h('div.quiz');
    var title = el.querySelector('.widget__title');
    el.appendChild(body);
    function render() {
      D.clear(body);
      if (i >= qs.length) {
        var msg = score === qs.length ? '¡Perfecto! Has acertado todas.' : score >= qs.length / 2 ? 'Buen trabajo. Repasa las que has fallado.' : 'Aún puedes mejorar: vuelve a leer la teoría y prueba otra vez.';
        body.appendChild(h('div.result-line', { role: 'status' }, h('b', null, score + ' de ' + qs.length), ' respuestas correctas. ' + msg));
        body.appendChild(HIS.ui.button('Repetir el test', function () { i = 0; score = 0; render(); HIS.a11y.focus(body.querySelector('fieldset')); }, 'primary'));
        HIS.a11y.announce('Test terminado. ' + score + ' de ' + qs.length + ' correctas.', { delay: 0 });
        return;
      }
      var q = qs[i], name = D.uid('q'), fb = h('p.quiz__fb', { role: 'status', 'aria-live': 'polite' });
      answered = false;
      var fs = h('fieldset.quiz__q', { tabindex: '-1' }, h('legend', null, h('span.pill', null, 'Pregunta ' + (i + 1) + ' de ' + qs.length), h('span.quiz__text', null, ' ' + q.q)));
      var next = HIS.ui.button(i === qs.length - 1 ? 'Ver resultado' : 'Siguiente', function () { i++; render(); HIS.a11y.focus(body.querySelector('fieldset') || body); }, 'primary');
      next.hidden = true;
      q.options.forEach(function (o, k) {
        var inp = h('input', { type: 'radio', name: name, value: k });
        var lab = h('label.quiz__opt', null, inp, h('span', null, o));
        inp.addEventListener('change', function () {
          if (answered) return; answered = true;
          var ok = k === q.answer; if (ok) score++;
          D.qsa('.quiz__opt', fs).forEach(function (l, j) { var r = l.querySelector('input'); r.disabled = true; if (j === q.answer) l.classList.add('is-right'); else if (j === k) l.classList.add('is-wrong'); });
          fb.textContent = (ok ? 'Correcto. ' : 'No es esa. La respuesta correcta es: ' + q.options[q.answer] + '. ') + (q.why || '');
          fb.className = 'quiz__fb ' + (ok ? 'is-right' : 'is-wrong'); next.hidden = false; next.focus();
        });
        fs.appendChild(lab);
      });
      body.append(fs, fb, next);
    }
    render();
  });
})(window);
