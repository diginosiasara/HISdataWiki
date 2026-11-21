/*! HISdata Wiki · widgets/simulacro-practico-core.js — núcleo del simulador de examen práctico (Prácticas 0 a 4):
    generadores de datos con semilla, estadística, test de Shapiro-Wilk (Royston 1995) y corrección. Sin DOM. */
(function (root) {
  'use strict';
  var S = {};

  /* ---------- aleatoriedad con semilla ---------- */
  function hash(str) { var h = 1779033703 ^ str.length; for (var i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return (h >>> 0) || 1; }
  S.rng = function (seed) {
    var a = hash(String(seed));
    var f = function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.int = function (lo, hi) { return lo + Math.floor(f() * (hi - lo + 1)); };
    f.norm = function () { var u = 1 - f(), v = f(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    f.shuffle = function (a2) { a2 = a2.slice(); for (var i = a2.length - 1; i > 0; i--) { var j = Math.floor(f() * (i + 1)), t = a2[i]; a2[i] = a2[j]; a2[j] = t; } return a2; };
    return f;
  };
  S.newSeed = function () { return Math.floor(Math.random() * 36 * 36 * 36 * 36 * 36).toString(36).toUpperCase().padStart(5, '0'); };

  /* ---------- estadística básica ---------- */
  function sum(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; }
  function mean(a) { return sum(a) / a.length; }
  function median(a) { var b = a.slice().sort(function (x, y) { return x - y; }), n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; }
  function ssq(a) { var m = mean(a), s = 0; a.forEach(function (x) { s += (x - m) * (x - m); }); return s; }
  function varS(a) { return ssq(a) / (a.length - 1); }
  function varP(a) { return ssq(a) / a.length; }
  function modes(a) { var c = {}, best = 0; a.forEach(function (x) { c[x] = (c[x] || 0) + 1; if (c[x] > best) best = c[x]; }); return Object.keys(c).filter(function (k) { return c[k] === best; }).map(Number).sort(function (x, y) { return x - y; }); }
  function count(a, fn) { var n = 0; a.forEach(function (x) { if (fn(x)) n++; }); return n; }
  S.stats = { sum: sum, mean: mean, median: median, ssq: ssq, varS: varS, varP: varP, modes: modes };

  function fmt(x, d) { if (d == null) d = 2; var s = (Math.abs(x) < 5 * Math.pow(10, -d - 1) ? 0 : x).toFixed(d).replace('.', ','); return s.replace(/^-/, '−'); }
  S.fmt = fmt;
  function fmtN(x) { return String(Math.round(x * 1e6) / 1e6).replace('.', ',').replace(/^-/, '−'); }

  /* ---------- Shapiro-Wilk (algoritmo AS R94 de Royston) ---------- */
  function poly(c, x) { var r = c[0]; if (c.length > 1) { var p = x * c[c.length - 1]; for (var j = c.length - 2; j > 0; j--) p = (p + c[j]) * x; r += p; } return r; }
  S.shapiro = function (data) {
    var M = root.HISMath, x = data.slice().sort(function (a, b) { return a - b; }), n = x.length, nn2 = Math.floor(n / 2);
    if (n < 4) return null;
    var a = new Array(nn2 + 1), m = [], an25 = n + 0.25, summ2 = 0, i;
    for (i = 1; i <= nn2; i++) { m[i] = M.normInv((i - 0.375) / an25); summ2 += m[i] * m[i]; }
    summ2 *= 2; var ssumm2 = Math.sqrt(summ2), rsn = 1 / Math.sqrt(n), i1, fac;
    var c1 = [0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056], c2 = [0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633];
    var a1 = poly(c1, rsn) - m[1] / ssumm2;
    if (n > 5) { i1 = 3; var a2 = -m[2] / ssumm2 + poly(c2, rsn); fac = Math.sqrt((summ2 - 2 * m[1] * m[1] - 2 * m[2] * m[2]) / (1 - 2 * a1 * a1 - 2 * a2 * a2)); a[2] = a2; }
    else { i1 = 2; fac = Math.sqrt((summ2 - 2 * m[1] * m[1]) / (1 - 2 * a1 * a1)); }
    a[1] = a1; for (i = i1; i <= nn2; i++) a[i] = -m[i] / fac;
    var range = x[n - 1] - x[0]; if (range < 1e-19) return null;
    var sx = 0; for (i = 0; i < n; i++) sx += x[i] / range; sx /= n;
    var sa = 0; for (i = 0; i < n; i++) { var j = n - 1 - i; if (i !== j) sa += (i < j ? -1 : 1) * a[1 + Math.min(i, j)]; } sa /= n;
    var ssa = 0, ssx = 0, sax = 0;
    for (i = 0; i < n; i++) { var jj = n - 1 - i, asa = i !== jj ? (i < jj ? -1 : 1) * a[1 + Math.min(i, jj)] - sa : -sa, xsx = x[i] / range - sx; ssa += asa * asa; ssx += xsx * xsx; sax += asa * xsx; }
    var ssassx = Math.sqrt(ssa * ssx), w1 = (ssassx - sax) * (ssassx + sax) / (ssa * ssx), w = 1 - w1, y = Math.log(w1), mu, sg, p;
    if (n <= 11) {
      var gam = poly([-2.273, 0.459], n);
      if (y >= gam) return { W: w, p: 1e-99 };
      y = -Math.log(gam - y); mu = poly([0.544, -0.39978, 0.025054, -6.714e-4], n); sg = Math.exp(poly([1.3822, -0.77857, 0.062767, -0.0020322], n));
    } else { var xx = Math.log(n); mu = poly([-1.5861, -0.31082, -0.083751, 0.0038915], xx); sg = Math.exp(poly([-0.4803, -0.082676, 0.0030302], xx)); }
    p = 1 - M.normCdf((y - mu) / sg);
    return { W: w, p: p };
  };

  /* ---------- datos del cuaderno ---------- */
  var CUAD = {
    est6: [182, 176, 179, 186, 185, 179],
    est30: [182, 176, 179, 186, 185, 179, 181, 183, 179, 183, 174, 187, 183, 175, 183, 182, 172, 174, 184, 185, 175, 184, 177, 180, 175, 177, 172, 187, 183, 175],
    imc: [30, 30, 32, 29, 25, 25, 23, 28, 24, 30, 26, 23, 24, 28, 27, 31, 30, 29, 29, 28, 29, 30, 31, 26, 32],
    edad: [83, 80, 81, 83, 87, 81, 82, 82, 80, 83, 84, 85, 86, 88, 83, 80],
    sis: [155, 147, 150, 156, 158, 150, 154, 154, 150, 155, 156, 157, 157, 160, 156, 146],
    dia: [95, 91, 93, 95, 100, 93, 94, 94, 92, 95, 95, 97, 100, 100, 95, 91],
    sem: [39, 34, 36, 35, 36, 32, 35, 39, 32, 33, 36, 33, 35, 38, 35, 33, 34, 33, 38, 36, 36, 34, 32, 33, 33],
    grd: { global: 4000, g: [['03', 'Oído, nariz, boca y garganta', 3800], ['07', 'Sistema hepatobiliar y páncreas', 8000], ['11', 'Riñón y vías urinarias', 5500]] }
  };

  var NOMS = ['Menos', 'Igual', 'Más'];
  function num(id, label, ans, tol, unit, expl, kind) { return { id: id, kind: kind || 'num', label: label, ans: ans, tol: tol, unit: unit || '', expl: expl }; }
  function sel(id, label, opts, ans, expl) { return { id: id, kind: 'sel', label: label, opts: opts, ans: ans, expl: expl }; }
  function chunk(a, n) { var r = [], i; for (i = 0; i < a.length; i += n) r.push(a.slice(i, i + n)); return r; }
  function row10(a) { return chunk(a, 10); }
  function row5(a) { return chunk(a, 5); }
  function grid(cap, a, per) { return { caption: cap, rows: chunk(a, per) }; }

  /* ---------- Práctica 0 · Estatura ---------- */
  function genP0(r, cuad) {
    var s6, s30, i;
    if (cuad) { s6 = CUAD.est6.slice(); s30 = CUAD.est30.slice(); }
    else {
      var pool = []; while (pool.length < 5) { var v = r.int(172, 190); if (pool.indexOf(v) < 0) pool.push(v); }
      s6 = r.shuffle(pool.concat([pool[r.int(0, 4)]]));
      do { s30 = []; for (i = 0; i < 30; i++) s30.push(Math.max(168, Math.min(192, Math.round(180 + 4.2 * r.norm())))); var R0 = Math.max.apply(0, s30) - Math.min.apply(0, s30); } while (R0 < 13 || R0 > 20);
    }
    var n = s6.length, mx = Math.max.apply(0, s6), mn = Math.min.apply(0, s6), m = mean(s6), md = median(s6), mo = modes(s6)[0], ss = ssq(s6), v6 = ss / (n - 1), sd = Math.sqrt(v6);
    var srt = s6.slice().sort(function (a, b) { return a - b; });
    var N = s30.length, lo = Math.min.apply(0, s30), hi = Math.max.apply(0, s30), R = hi - lo, Kraw = 1 + 3.322 * Math.log(N) / Math.LN10, K = Math.round(Kraw), A = Math.floor(R / K) + 1;
    var f = [], b; for (b = 0; b < K; b++) f.push(count(s30, function (x) { return x >= lo + b * A && x < lo + (b + 1) * A; }));
    var Fc = [], acc = 0; f.forEach(function (v) { acc += v; Fc.push(acc); });
    var labels = f.map(function (_, k) { return '[' + (lo + k * A) + '–' + (lo + (k + 1) * A) + ')'; });
    var items = [
      sel('p0_tipo', 'Tipo de variable (estatura)', ['Cuantitativa continua', 'Cuantitativa discreta', 'Cualitativa nominal', 'Cualitativa ordinal'], 0, 'La estatura se mide y admite decimales: cuantitativa continua.'),
      sel('p0_mue', 'Muestreo más adecuado', ['Aleatorio simple', 'Estratificado', 'Sistemático', 'Por conglomerados'], 0, 'Se elige al azar del listado y todos los pacientes tienen la misma probabilidad: aleatorio simple.'),
      num('p0_n', 'Tamaño de la muestra inicial n', n, 0, '', 'Se cuentan los datos: n = ' + n + '.'),
      num('p0_rango', 'Rango', mx - mn, 0, 'cm', 'Rango = máx − mín = ' + mx + ' − ' + mn + ' = ' + (mx - mn) + ' cm.'),
      num('p0_media', 'Media', m, 0.05, 'cm', 'x̄ = Σx/n = ' + sum(s6) + '/' + n + ' = ' + fmt(m) + ' cm.'),
      num('p0_mediana', 'Mediana', md, 0.05, 'cm', 'Ordenados: ' + srt.join(', ') + '. Con n par, media de los dos centrales: (' + srt[2] + ' + ' + srt[3] + ')/2 = ' + fmtN(md) + ' cm.'),
      num('p0_moda', 'Moda', mo, 0, 'cm', 'El valor más repetido es ' + mo + ' cm.'),
      num('p0_var', 'Varianza (n − 1)', v6, 0.05, 'cm²', 's² = Σ(xᵢ − x̄)²/(n − 1) = ' + fmt(ss) + '/' + (n - 1) + ' = ' + fmt(v6) + ' cm².'),
      num('p0_sd', 'Desviación típica', sd, 0.05, 'cm', 's = √' + fmt(v6) + ' = ' + fmt(sd) + ' cm.'),
      num('p0_K', 'Nº de intervalos K (Sturges, redondeado)', K, 0, '', 'K = 1 + 3,322·log₁₀(' + N + ') = ' + fmt(Kraw, 1) + ' → ' + K + ' intervalos.'),
      num('p0_A', 'Amplitud entera que cubre el rango', A, 0, 'cm', 'R = ' + hi + ' − ' + lo + ' = ' + R + '. R/K = ' + fmt(R / K) + '. Se toma el entero A tal que K·A > R (el último intervalo no incluye su extremo superior): A = ' + A + '.')
    ];
    f.forEach(function (v, k) { items.push(num('p0_f' + k, 'fᵢ del intervalo ' + labels[k], v, 0, '', 'Se cuentan los datos x con ' + (lo + k * A) + ' ≤ x < ' + (lo + (k + 1) * A) + ': fᵢ = ' + v + '. Intervalos [a, b): incluyen el inferior y no el superior.')); });
    var kH = Math.min(3, K - 1);
    items.push(num('p0_H', 'Hᵢ (frecuencia relativa acumulada) del intervalo ' + labels[kH], Fc[kH] / N, 0.005, '', 'Fᵢ = ' + Fc[kH] + ' → Hᵢ = ' + Fc[kH] + '/' + N + ' = ' + fmt(Fc[kH] / N, 3) + '.', 'prop'));
    return {
      id: 'P0', name: 'Práctica 0 · Estatura', min: 20,
      intro: ['Se han medido las estaturas (cm) de 6 pacientes elegidos al azar del listado general, sin ningún criterio previo.', 'Después se amplía la muestra a 30 pacientes (más abajo). Agrupa con la regla de Sturges, intervalos [a, b) y amplitud entera.'],
      tables: [grid('Muestra inicial (n = 6), cm', s6, 6), grid('Ampliación (n = 30), cm', s30, 10)],
      copy: s6.join('\t') + '\n\n' + row10(s30).map(function (q) { return q.join('\t'); }).join('\n'),
      items: items, hist: { labels: labels, f: f, caption: 'Histograma (frecuencia absoluta)' },
      steps: ['Medidas de centro y de dispersión: x̄ = Σx/n; s² = Σ(xᵢ − x̄)²/(n − 1); s = √s².', 'Intervalos: K = 1 + 3,322·log₁₀(n); A = R/K (se sube a un entero que cubra el rango); marca de clase = (extremo inf. + extremo sup.)/2.', 'Comprobaciones: Σfᵢ = n y la última Hᵢ = 1.']
    };
  }

  /* ---------- Práctica 1 · IMC ---------- */
  function genP1(r, cuad) {
    var d, mu, sg, tries = 0;
    do {
      if (cuad) d = CUAD.imc.slice(); else { var c = 28 + r.norm() * 0.6, w = 2.4 + r() * 0.9; d = []; for (var i = 0; i < 25; i++) d.push(Math.max(21, Math.min(35, Math.round(c + w * r.norm())))); }
      mu = mean(d); sg = Math.sqrt(varP(d)); tries++;
      var okd = cuad || (sg >= 2.2 && sg <= 3.4 && count(d, function (x) { return x < mu - sg; }) >= 3 && count(d, function (x) { return x > mu + sg; }) >= 3);
    } while (!okd && tries < 500);
    var N = d.length, l1 = mu - sg, l2 = mu + sg, below = count(d, function (x) { return x < l1; }), above = count(d, function (x) { return x > l2; });
    var L1 = Math.round((mu - 2 * sg) * 100) / 100, L2 = Math.round((mu + 2 * sg) * 100) / 100, z1 = (L1 - mu) / sg, z2 = (L2 - mu) / sg;
    var items = [
      num('p1_mu', 'Media poblacional μ', mu, 0.02, '', 'μ = Σx/N = ' + sum(d) + '/' + N + ' = ' + fmt(mu) + '.'),
      num('p1_sg', 'Desviación estándar poblacional σ (÷ N)', sg, 0.02, '', 'σ = √(Σ(x − μ)²/N) = √' + fmt(varP(d), 3) + ' = ' + fmt(sg, 3) + '. Es una población: se divide entre N, no entre N − 1.'),
      num('p1_x1', 'Valor de IMC para z = −1', l1, 0.03, '', 'x = μ + z·σ = ' + fmt(mu) + ' − ' + fmt(sg, 3) + ' = ' + fmt(l1) + '.'),
      num('p1_x2', 'Valor de IMC para z = +1', l2, 0.03, '', 'x = μ + z·σ = ' + fmt(mu) + ' + ' + fmt(sg, 3) + ' = ' + fmt(l2) + '.'),
      num('p1_nb', 'Nº de pacientes con IMC por debajo de μ − σ', below, 0, '', 'Se cuentan los IMC < ' + fmt(l1) + ': ' + below + ' pacientes.'),
      num('p1_pb', 'Proporción por debajo de μ − σ', below / N, 0.005, '', below + '/' + N + ' = ' + fmt(below / N) + ' (' + fmt(below / N * 100, 0) + ' %).', 'prop'),
      num('p1_na', 'Nº de pacientes con IMC por encima de μ + σ', above, 0, '', 'Se cuentan los IMC > ' + fmt(l2) + ': ' + above + ' pacientes.'),
      num('p1_pa', 'Proporción por encima de μ + σ', above / N, 0.005, '', above + '/' + N + ' = ' + fmt(above / N) + ' (' + fmt(above / N * 100, 0) + ' %).', 'prop'),
      num('p1_z1', 'z del valor ' + fmt(L1), z1, 0.05, '', 'z = (x − μ)/σ = (' + fmt(L1) + ' − ' + fmt(mu) + ')/' + fmt(sg, 3) + ' = ' + fmt(z1) + ' ≈ −2.'),
      num('p1_z2', 'z del valor ' + fmt(L2), z2, 0.05, '', 'z = (' + fmt(L2) + ' − ' + fmt(mu) + ')/' + fmt(sg, 3) + ' = ' + fmt(z2) + ' ≈ +2.'),
      sel('p1_reg', 'Porcentaje de la población entre ' + fmt(L1) + ' y ' + fmt(L2), ['≈ 68 %', '≈ 95 %', '≈ 99,7 %', '≈ 50 %'], 1, 'Entre z = −2 y z = +2 hay ≈ 95 % (regla 68-95-99,7; exactamente 95,45 %).')
    ];
    return {
      id: 'P1', name: 'Práctica 1 · IMC', min: 12,
      intro: ['Se conoce el IMC de los 25 pacientes de una unidad. Se pide calcular los parámetros poblacionales (σ con N).', 'Pregunta 3: ¿qué porcentaje de la población tiene un IMC entre ' + fmt(L1) + ' y ' + fmt(L2) + '?'],
      tables: [grid('IMC (N = 25)', d, 5)], copy: row5(d).map(function (q) { return q.join('\t'); }).join('\n'), items: items,
      steps: ['μ = Σx/N; σ = √(Σ(x − μ)²/N); z = (x − μ)/σ; x = μ + z·σ.', 'Con z = ±1 se obtienen los límites; se cuentan los pacientes fuera de ellos.', 'Se tipifican los dos valores del enunciado y se aplica la regla 68-95-99,7.']
    };
  }

  /* ---------- Práctica 2 · Normalidad ---------- */
  function genP2(r, cuad) {
    var e, s, dd, i, res, tries = 0;
    do {
      if (cuad) { e = CUAD.edad.slice(); s = CUAD.sis.slice(); dd = CUAD.dia.slice(); }
      else {
        e = []; s = []; dd = [];
        for (i = 0; i < 16; i++) { var z = r.norm(); e.push(Math.round(83 + 2.8 * z + 0.7 * r.norm())); s.push(Math.round(154 + 4.6 * z + 1.2 * r.norm())); dd.push(Math.round(95 + 3.3 * z + 0.9 * r.norm())); }
        if (r() < 0.6) { var tgt = [e, s, dd][r.int(0, 2)], sd0 = Math.sqrt(varS(tgt)); [r.int(0, 7), r.int(8, 15)].forEach(function (ix, q) { tgt[ix] += Math.round((q ? 3.4 : 2.6) * sd0); }); }
      }
      res = [S.shapiro(e), S.shapiro(s), S.shapiro(dd)]; tries++;
    } while (!cuad && tries < 200 && (res.some(function (q) { return !q || Math.abs(q.p - 0.05) < 0.004; }) || [e, s, dd].some(function (a) { return new Set(a).size < 5; })));
    var vars = [['Edad', 'años', e], ['Presión sistólica', 'mmHg', s], ['Presión diastólica', 'mmHg', dd]], items = [];
    vars.forEach(function (v, k) {
      var rr = res[k], ok = rr.p >= 0.05;
      items.push(sel('p2_c' + k, 'Shapiro-Wilk · ' + v[0] + ' (W = ' + fmt(rr.W, 3) + '; p = ' + fmt(rr.p, 3) + ')', ['No se rechaza la normalidad (p ≥ 0,05)', 'Se rechaza la normalidad (p < 0,05)'], ok ? 0 : 1,
        'H₀: los datos son normales. p = ' + fmt(rr.p, 3) + (ok ? ' ≥ 0,05: no se rechaza la normalidad.' : ' < 0,05: se rechaza la normalidad.') + (Math.abs(rr.p - 0.05) < 0.02 ? ' Ojo: está justo en el límite.' : '')));
    });
    vars.forEach(function (v, k) {
      var m = mean(v[2]), md = median(v[2]), mo = modes(v[2]);
      items.push(num('p2_m' + k, 'Media de ' + v[0].toLowerCase(), m, 0.05, v[1], 'x̄ = ' + sum(v[2]) + '/16 = ' + fmt(m) + ' ' + v[1] + '.'));
      items.push(num('p2_d' + k, 'Mediana de ' + v[0].toLowerCase(), md, 0.05, v[1], 'Con n = 16 es la media de los dos centrales ordenados = ' + fmtN(md) + ' ' + v[1] + '. Moda: ' + mo.join(' y ') + (mo.length > 1 ? ' (multimodal)' : '') + '. Media − mediana = ' + fmt(m - md) + (Math.abs(m - md) < 0.1 ? ': muy simétrica.' : m < md ? ': ligera asimetría negativa.' : ': ligera asimetría positiva.')));
    });
    items.push(sel('p2_n1', 'En una distribución normal…', ['Media = mediana = moda', 'Media > mediana > moda', 'Moda > mediana > media', 'Las tres son siempre distintas'], 0, 'La campana es simétrica y su pico está en el centro: media = mediana = moda.'));
    items.push(sel('p2_n2', 'Si la media es menor que la mediana, hay…', ['Asimetría negativa', 'Asimetría positiva', 'Simetría perfecta', 'Normalidad asegurada'], 0, 'Media < mediana: cola hacia la izquierda, asimetría negativa. Media > mediana: asimetría positiva.'));
    var tbl = [{ caption: 'Edad · presión sistólica · presión diastólica (n = 16)', head: ['Edad (años)', 'Sistólica (mmHg)', 'Diastólica (mmHg)'], rows: e.map(function (_, i2) { return [e[i2], s[i2], dd[i2]]; }) }];
    return {
      id: 'P2', name: 'Práctica 2 · Normalidad', min: 12,
      intro: ['Se han registrado edad y presión arterial de 16 pacientes. El programa estadístico devuelve el test de Shapiro-Wilk de cada variable (H₀: los datos son normales; se rechaza si p < 0,05).'],
      tables: tbl, copy: ['Edad\tSistólica\tDiastólica'].concat(e.map(function (_, i2) { return [e[i2], s[i2], dd[i2]].join('\t'); })).join('\n'), items: items,
      steps: ['Shapiro-Wilk: si p ≥ 0,05 no se rechaza la normalidad; si p < 0,05 se rechaza.', 'Se apoya con media, mediana y moda: en una normal coinciden. Media < mediana → asimetría negativa; media > mediana → positiva.']
    };
  }

  /* ---------- Práctica 3 · Pretérmino ---------- */
  function genP3(r, cuad) {
    var d, mu0, sg0, tries = 0, muR, sgR;
    if (cuad) { d = CUAD.sem.slice(); muR = 38.1; sgR = 2.21; }
    else {
      do { d = []; var c = 34.6 + r() * 1.2; for (var i = 0; i < 25; i++) d.push(Math.max(31, Math.min(40, Math.round(c + 2.0 * r.norm())))); muR = 37.6 + r.int(0, 10) / 10; sgR = 1.9 + r.int(0, 60) / 100; mu0 = mean(d); sg0 = Math.sqrt(varS(d)); tries++; }
      while (tries < 300 && (count(d, function (x) { return x < mu0 - sg0; }) < 1 || count(d, function (x) { return x < muR - sgR; }) === count(d, function (x) { return x < mu0 - sg0; })));
    }
    var N = d.length; mu0 = mean(d); sg0 = Math.sqrt(varS(d));
    var mn = Math.min.apply(0, d), lim0 = mu0 - sg0, limR = muR - sgR, r0 = count(d, function (x) { return x < lim0; }), rR = count(d, function (x) { return x < limR; });
    var zp = (mn - mu0) / sg0, zr = (mn - muR) / sgR;
    var items = [];
    if (cuad) items.push(sel('p3_err', 'El enunciado dice que la media regional es 48,1 semanas. ¿Es un dato plausible?', ['Sí, es plausible', 'No: es imposible; se asume la errata 38,1 y se confirma con el profesor'], 1, 'Ningún embarazo dura 48 semanas (con ese valor todos los z saldrían entre −4 y −7). Es casi seguro una errata de 38,1. En lo que sigue se usa μ = 38,1.'));
    items.push(
      num('p3_m', 'Media propia (semanas)', mu0, 0.02, '', 'x̄ = ' + sum(d) + '/' + N + ' = ' + fmt(mu0) + ' semanas.'),
      num('p3_s', 'Desviación típica propia s (n − 1)', sg0, 0.02, '', 's = √(Σ(x − x̄)²/(n − 1)) = ' + fmt(sg0) + ' semanas.'),
      num('p3_zp', 'z de ' + mn + ' semanas con los datos propios', zp, 0.03, '', 'z = (' + mn + ' − ' + fmt(mu0) + ')/' + fmt(sg0) + ' = ' + fmt(zp) + '.'),
      num('p3_zr', 'z de ' + mn + ' semanas con la región', zr, 0.03, '', 'z = (' + mn + ' − ' + fmtN(muR) + ')/' + fmtN(sgR) + ' = ' + fmt(zr) + '.'),
      num('p3_l0', 'Límite de riesgo propio (media − 1·s)', lim0, 0.02, 'sem.', fmt(mu0) + ' − ' + fmt(sg0) + ' = ' + fmt(lim0) + ' semanas.'),
      num('p3_n0', 'Nº en riesgo (z < −1) con datos propios', r0, 0, '', 'Se cuentan los nacidos con menos de ' + fmt(lim0) + ' semanas: ' + r0 + '.'),
      num('p3_p0', '% en riesgo con datos propios', r0 / N, 0.005, '', r0 + '/' + N + ' = ' + fmt(r0 / N * 100, 0) + ' %.', 'prop'),
      num('p3_lr', 'Límite de riesgo de la región (μ − 1·σ)', limR, 0.02, 'sem.', fmtN(muR) + ' − ' + fmtN(sgR) + ' = ' + fmt(limR) + ' semanas.'),
      num('p3_nr', 'Nº en riesgo (z < −1) con la región', rR, 0, '', 'Se cuentan los nacidos con menos de ' + fmt(limR) + ' semanas: ' + rR + '.'),
      num('p3_pr', '% en riesgo con la región', rR / N, 0.005, '', rR + '/' + N + ' = ' + fmt(rR / N * 100, 0) + ' %.', 'prop')
    );
    var ia = rR > r0 ? 0 : rR === r0 ? 1 : 2;
    items.push(sel('p3_int', 'Interpretación', ['Respecto a la región hay más casos de riesgo que con los datos propios: el hospital tiene más pretérminos de lo esperable', 'Las dos referencias dan el mismo número de casos de riesgo', 'Respecto a la región hay menos casos de riesgo que con los datos propios'], ia,
      'Con datos propios: ' + r0 + ' en riesgo (' + fmt(r0 / N * 100, 0) + ' %). Con la región: ' + rR + ' (' + fmt(rR / N * 100, 0) + ' %). La comparación con la región es la que importa: ' + (ia === 0 ? 'el hospital tiene más nacimientos pretérmino de lo esperable.' : ia === 1 ? 'no hay diferencia.' : 'el hospital tiene menos pretérminos que la región.')));
    var cnt = {}; d.forEach(function (x) { cnt[x] = (cnt[x] || 0) + 1; });
    var intro = ['Se registran las semanas completas de gestación de 25 recién nacidos. Un recién nacido está en riesgo si su z < −1.'];
    intro.push(cuad ? 'Datos de la región: media 48,1 semanas y desviación típica 2,21 semanas (según el enunciado).' : 'Datos de la región: media ' + fmtN(muR) + ' semanas y desviación típica ' + fmtN(sgR) + ' semanas.');
    intro.push('Calcula los z con los datos propios (s con n − 1) y con los de la región, y compara.');
    return {
      id: 'P3', name: 'Práctica 3 · Pretérmino', min: 12, intro: intro, tables: [grid('Semanas de gestación (n = 25)', d, 5)],
      copy: row5(d).map(function (q) { return q.join('\t'); }).join('\n'), items: items,
      steps: ['z = (x − media)/desviación típica. En riesgo si z < −1, es decir, x < media − 1·desviación.', 'Se hace dos veces: con los datos de la propia muestra y con los de la región.', 'Distribución de semanas: ' + Object.keys(cnt).map(Number).sort(function (a, b) { return a - b; }).map(function (k) { return k + ' sem. → ' + cnt[k]; }).join(' · ') + '.']
    };
  }

  /* ---------- Práctica 4 · GRD ---------- */
  function genP4(r, cuad) {
    var glob, g;
    if (cuad) { glob = CUAD.grd.global; g = CUAD.grd.g.map(function (x) { return x.slice(); }); }
    else {
      glob = 3200 + 100 * r.int(0, 16);
      var rnd = function (v) { return Math.round(v / 50) * 50; };
      g = [['03', 'Oído, nariz, boca y garganta', rnd(glob * (0.7 + 0.28 * r()))], ['07', 'Sistema hepatobiliar y páncreas', rnd(glob * (1.7 + 0.6 * r()))], ['11', 'Riñón y vías urinarias', rnd(glob * (1.1 + 0.5 * r()))]];
    }
    var items = [], i;
    g.forEach(function (x, k) {
      var w = x[2] / glob; x.push(w);
      items.push(num('p4_w' + k, 'Peso relativo del GRD ' + x[0], w, 0.01, '', 'Peso = coste GRD / coste medio global = ' + x[2] + '/' + glob + ' = ' + fmt(w, 3) + '.'));
    });
    g.forEach(function (x, k) {
      var w = x[3], a = w < 0.9995 ? 0 : w > 1.0005 ? 2 : 1;
      items.push(sel('p4_i' + k, 'Interpretación del GRD ' + x[0] + ' (' + x[1] + ')', ['Consume menos recursos que la media', 'Consume lo mismo que la media', 'Consume más recursos que la media'], a, 'Peso ' + fmt(w, 3) + (a === 0 ? ' < 1: ' : a === 2 ? ' > 1: ' : ' = 1: ') + NOMS[a].toLowerCase() + ' recursos que un episodio de coste medio (' + fmt(Math.abs(w - 1) * 100, 1) + ' %).'));
    });
    var c = g[2];
    items.push(num('p4_pc', 'GRD ' + c[0] + ': ¿cuánto más consume que la media? (%)', c[3] - 1, 0.01, '', '(peso − 1) = ' + fmt(c[3], 3) + ' − 1 = ' + fmt(c[3] - 1, 3) + ' → ' + fmt((c[3] - 1) * 100, 1) + ' % más.', 'prop'));
    items.push(sel('p4_con', 'Un peso relativo de 2,00 significa que el GRD…', ['Consume el doble de recursos que la media', 'Consume la mitad que la media', 'Dura el doble de estancia', 'Tiene el doble de pacientes'], 0, 'Peso 2,00 = coste dos veces el coste medio global. El peso sirve para ajustar la financiación a la complejidad real.'));
    return {
      id: 'P4', name: 'Práctica 4 · GRD', min: 6,
      intro: ['El coste medio global de un episodio hospitalario es de ' + glob.toLocaleString('es-ES') + ' €.', 'Peso relativo = coste medio del GRD / coste medio global.'],
      tables: [{ caption: 'Costes por GRD', head: ['GRD', 'Descripción', 'Coste medio (€)'], rows: g.map(function (x) { return [x[0], x[1], x[2]]; }) }],
      copy: 'GRD\tDescripción\tCoste\n' + g.map(function (x) { return x[0] + '\t' + x[1] + '\t' + x[2]; }).join('\n'), items: items,
      steps: ['peso relativo = coste medio del GRD / coste medio global.', 'Peso = 1: consume lo mismo que la media; < 1: menos; > 1: más.']
    };
  }

  var GEN = { P0: genP0, P1: genP1, P2: genP2, P3: genP3, P4: genP4 };
  S.PRACTICES = [['P0', 'P0 · Estatura'], ['P1', 'P1 · IMC'], ['P2', 'P2 · Normalidad'], ['P3', 'P3 · Pretérmino'], ['P4', 'P4 · GRD']];
  S.build = function (seed, ids, cuaderno) {
    var ps = ids.map(function (id) { return GEN[id](S.rng(seed + ':' + id), !!cuaderno); });
    return { seed: seed, cuaderno: !!cuaderno, ps: ps };
  };

  /* ---------- corrección ---------- */
  S.parse = function (raw) {
    if (raw == null) return null; var t = String(raw).trim().replace(/\s+/g, ''); if (!t) return null;
    var pct = /%$/.test(t); t = t.replace(/%$/, '').replace('−', '-').replace(',', '.');
    if (!/^-?\d*\.?\d+(e-?\d+)?$/i.test(t)) return NaN; var v = parseFloat(t); return { v: v, pct: pct };
  };
  S.grade = function (it, raw) {
    if (it.kind === 'sel') { if (raw == null || raw === '') return { blank: true, ok: false }; return { blank: false, ok: +raw === it.ans, given: it.opts[+raw] }; }
    var p = S.parse(raw); if (p == null) return { blank: true, ok: false };
    if (p !== p) return { blank: false, ok: false, given: String(raw) };
    var v = p.v; if (it.kind === 'prop' && (p.pct || Math.abs(v) > 1)) v = v / 100;
    return { blank: false, ok: Math.abs(v - it.ans) <= (it.tol || 0) + 1e-9, given: String(raw).trim() };
  };
  S.correct = function (it) {
    if (it.kind === 'sel') return it.opts[it.ans];
    if (it.kind === 'prop') return fmt(it.ans, 3) + ' (' + fmt(it.ans * 100, 1) + ' %)';
    return (Math.abs(it.ans - Math.round(it.ans)) < 1e-9 ? String(Math.round(it.ans)) : fmt(it.ans, 3)) + (it.unit ? ' ' + it.unit : '');
  };

  root.HISSimP = S;
  if (typeof module !== 'undefined' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
