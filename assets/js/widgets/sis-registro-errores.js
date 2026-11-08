/*!
 * HISdata Wiki · widgets/sis-registro-errores.js
 * Responsabilidad ÚNICA: fichas de pacientes (ejercicios E4 y E5) donde se marcan los campos erróneos
 * y se obtiene la dimensión de calidad vulnerada, el motivo y la corrección propuesta.
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, D = HIS.dom, h = D.h;
  var FICHAS = [
    {
      id: 'e4', nombre: 'E4 · Juan Pérez',
      campos: [
        ['nombre', 'Paciente', 'Juan Pérez'], ['nac', 'Fecha de nacimiento', '32/13/1985'], ['peso', 'Peso', '450 kg'],
        ['alt', 'Altura', '1,75 m'], ['dx', 'Diagnóstico principal', 'Hipertensión arterial (HTA)'], ['ing', 'Fecha de ingreso', '15/06/2023'], ['alta', 'Fecha de alta', '12/06/2023']
      ],
      errores: [
        { campos: ['nac'], dim: 'Precisión', motivo: 'El día 32 y el mes 13 no existen: la fecha es imposible.', sol: 'Validar el formato de fecha al escribirla y recuperar la fecha real del documento de identidad o de la fuente original.' },
        { campos: ['peso'], dim: 'Precisión', motivo: '450 kg es un valor implausible para un adulto con 1,75 m (probable error de tecleo, por ejemplo 45 u 80).', sol: 'Definir un rango plausible que avise al introducir el dato y repetir/confirmar la medición.' },
        { campos: ['ing', 'alta'], dim: 'Consistencia', motivo: 'El alta (12/06) es anterior al ingreso (15/06): las dos fechas se contradicen.', sol: 'Regla de validación «alta ≥ ingreso» y revisión con el documento original para saber cuál de las dos fechas es la errónea.' }
      ]
    },
    {
      id: 'e5', nombre: 'E5 · Ana López',
      campos: [
        ['nombre', 'Paciente', 'Ana López'], ['nac', 'Fecha de nacimiento', '15/15/1990'], ['peso', 'Peso', '15 kg'], ['alt', 'Altura', '3,25 m'],
        ['dx', 'Diagnóstico', 'Hipertensión arterial severa'], ['ing', 'Fecha de ingreso', '05/10/2023'], ['alta', 'Fecha de alta', '06/10/2023'], ['med', 'Medicación', 'Ibuprofeno 400 mg cada 6 horas']
      ],
      errores: [
        { campos: ['nac'], dim: 'Precisión', motivo: 'El mes 15 no existe: la fecha es inválida.', sol: 'Validar el formato en origen y recuperar la fecha correcta de la fuente fiable.' },
        { campos: ['peso', 'alt'], dim: 'Precisión y consistencia', motivo: '3,25 m es imposible para una persona; 15 kg es implausible para una adulta nacida en 1990, y juntos dan un índice de masa corporal absurdo.', sol: 'Volver a medir/pesar, corregir con trazabilidad (quién, cuándo y por qué) y activar rangos plausibles.' },
        { campos: ['med'], dim: 'Alerta clínica a revisar (no es un error de formato)', motivo: 'El ibuprofeno (un antiinflamatorio) puede elevar la tensión arterial; con HTA severa conviene que lo revise el facultativo.', sol: 'No decidir por cuenta propia: comunicar la alerta al médico responsable o al farmacéutico, que valorará si procede mantenerlo.' }
      ]
    }
  ];

  HIS.widgets.register('sis-registro-errores', function (el) {
    var cur = null, marcados = {}, comprobado = false;
    var tabs = [];
    var tabRow = h('div.chip-row', { role: 'group', 'aria-label': 'Elige la ficha del paciente' });
    var grid = h('div.sis-fields', { role: 'group' });
    var counter = h('p.sis-meta', { 'aria-hidden': 'true' });
    var out = h('div.sis-out');
    var btnCheck = HIS.ui.button('Comprobar', comprobar, 'primary');
    var btnReset = HIS.ui.button('Reiniciar ficha', function () { load(cur); HIS.a11y.announce('Ficha reiniciada.'); });
    var hint = h('p.field__help', null, 'Pulsa en cada campo que creas erróneo o dudoso. Después pulsa «Comprobar».');

    function load(k) {
      cur = k; marcados = {}; comprobado = false; D.clear(out); D.clear(grid);
      tabs.forEach(function (b, j) { b.setAttribute('aria-pressed', j === k ? 'true' : 'false'); });
      grid.setAttribute('aria-label', 'Campos de la ficha ' + FICHAS[k].nombre);
      FICHAS[k].campos.forEach(function (c) {
        var st = h('span.sis-field__state', null, 'Sin marcar');
        var b = h('button.sis-field', { type: 'button', 'aria-pressed': 'false', 'data-k': c[0], onclick: function () {
          if (comprobado) return;
          var on = b.getAttribute('aria-pressed') !== 'true';
          b.setAttribute('aria-pressed', on ? 'true' : 'false'); marcados[c[0]] = on; st.textContent = on ? 'Marcado como erróneo' : 'Sin marcar'; upd();
        } }, h('span.sis-field__l', null, c[1]), h('span.sis-field__v', null, c[2]), st);
        b._st = st; grid.appendChild(b);
      });
      btnCheck.disabled = false; upd();
    }
    function upd() { var n = Object.keys(marcados).filter(function (x) { return marcados[x]; }).length; counter.textContent = 'Campos marcados: ' + n; }

    function comprobar() {
      if (comprobado) return; comprobado = true; btnCheck.disabled = true;
      var f = FICHAS[cur], hallados = 0, ids = {};
      f.errores.forEach(function (e) { e.campos.forEach(function (c) { ids[c] = true; }); });
      var falsas = 0;
      D.qsa('.sis-field', grid).forEach(function (b) {
        var k = b.getAttribute('data-k'), m = !!marcados[k], err = !!ids[k];
        if (err && m) { b.classList.add('is-ok'); b._st.textContent = 'Error bien detectado'; }
        else if (err && !m) { b.classList.add('is-miss'); b._st.textContent = 'Error que no marcaste'; }
        else if (!err && m) { b.classList.add('is-fp'); b._st.textContent = 'Falsa alarma: este campo es correcto'; falsas++; }
        else { b._st.textContent = 'Correcto'; }
        b.disabled = true;
      });
      f.errores.forEach(function (e) { if (e.campos.some(function (c) { return marcados[c]; })) hallados++; });
      var rows = f.errores.map(function (e) {
        var names = e.campos.map(function (c) { return f.campos.filter(function (x) { return x[0] === c; })[0][1]; }).join(' + ');
        return h('tr', null, h('th', { scope: 'row' }, names), h('td', null, e.dim), h('td', null, e.motivo), h('td', null, e.sol));
      });
      var msg = 'Has detectado ' + hallados + ' de ' + f.errores.length + ' problemas y ' + falsas + (falsas === 1 ? ' falsa alarma.' : ' falsas alarmas.');
      D.clear(out);
      out.append(
        h('p.result-line', { role: 'status' }, h('b', null, hallados + ' de ' + f.errores.length), ' problemas detectados · ' + falsas + (falsas === 1 ? ' falsa alarma' : ' falsas alarmas')),
        h('div.table-wrap', { tabindex: '0', role: 'region', 'aria-label': 'Tabla (desplazable)' }, h('table.table', null, h('caption', null, 'Problemas de calidad de la ficha'),
          h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Campo(s)'), h('th', { scope: 'col' }, 'Dimensión'), h('th', { scope: 'col' }, 'Motivo'), h('th', { scope: 'col' }, 'Corrección propuesta'))),
          h('tbody', null, rows))),
        h('p.field__help', null, 'Sin la fuente original no se inventa el dato correcto: se verifica, se corrige y se deja constancia de quién lo cambió.')
      );
      HIS.a11y.announce(msg);
    }

    FICHAS.forEach(function (f, k) {
      tabs.push(h('button.chip', { type: 'button', 'aria-pressed': 'false', onclick: function () { load(k); HIS.a11y.announce('Ficha ' + f.nombre + ' cargada.'); } }, f.nombre));
    });
    tabs.forEach(function (b) { tabRow.appendChild(b); });
    el.append(tabRow, hint, grid, counter, h('div.btn-row', null, btnCheck, btnReset), out);
    load(0);
  });
})(window);
