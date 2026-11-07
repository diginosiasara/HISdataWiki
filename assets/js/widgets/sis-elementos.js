/*!
 * HISdata Wiki · widgets/sis-elementos.js
 * Responsabilidad ÚNICA: ciclo clicable de los 4 elementos de un SIS con ejemplos hospitalarios.
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, D = HIS.dom, h = D.h;
  var EL = [
    { n: 'Fuentes de datos', q: 'De dónde salen los datos.', ej: 'El laboratorio registra la analítica de un paciente y queda guardada en su historia clínica electrónica; admisión anota la fecha de ingreso.', fallo: 'Si no se recogen los datos necesarios, después no se pueden calcular indicadores de calidad asistencial.' },
    { n: 'Procedimientos', q: 'Las reglas para recoger, codificar, validar, almacenar y procesar los datos.', ej: 'Un codificador asigna el código CIE-10-ES de la intervención y el sistema comprueba que sea coherente con el diagnóstico.', fallo: 'Si los procedimientos fallan, aparecen códigos erróneos en el registro de procedimientos quirúrgicos.' },
    { n: 'Indicadores', q: 'Medidas resumidas que convierten los datos en información útil.', ej: 'Estancia media de cardiología este trimestre, porcentaje de reingresos a 30 días o tiempo medio de espera para una consulta.', fallo: 'Sin indicadores fiables no se puede evaluar ni comparar la actividad.' },
    { n: 'Usuarios', q: 'Quienes usan la información para decidir: clínicos, gestores, directores, investigadores y salud pública.', ej: 'La dirección consulta los costes por servicio para decidir cómo redistribuir recursos.', fallo: 'Si los usuarios tienen un acceso limitado, la información existe pero no llega a quien debe decidir; además, sus nuevas preguntas deberían volver a alimentar las fuentes de datos.' }
  ];
  HIS.widgets.register('sis-elementos', function (el) {
    var cur = 0, btns = [];
    var panel = h('div.sis-panel', { id: D.uid('el-p'), tabindex: '-1' });
    var row = h('div.sis-ciclo', { role: 'group', 'aria-label': 'Los 4 elementos del sistema de información sanitaria, en ciclo' });
    function show(k, say) {
      cur = k;
      btns.forEach(function (b, j) { b.setAttribute('aria-pressed', j === k ? 'true' : 'false'); });
      D.clear(panel);
      var e = EL[k];
      panel.append(h('h4', null, (k + 1) + '. ' + e.n), h('p', null, e.q),
        h('p', null, h('b', null, 'Ejemplo en el hospital: '), e.ej),
        h('p', null, h('b', null, 'Si falla: '), e.fallo),
        h('p.field__help', null, k < 3 ? 'Siguiente paso del ciclo: ' + EL[k + 1].n + '.' : 'El ciclo se cierra: lo que piden los usuarios decide qué datos hay que recoger de nuevo (vuelta a Fuentes de datos).'));
      if (say) HIS.a11y.announce(e.n + '. ' + e.q + ' Ejemplo: ' + e.ej + ' Si falla: ' + e.fallo);
    }
    EL.forEach(function (e, k) {
      var b = h('button.sis-ciclo__b', { type: 'button', 'aria-pressed': 'false', 'aria-controls': panel.id, onclick: function () { show(k, true); },
        onkeydown: function (ev) {
          var d = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 0;
          if (d) { ev.preventDefault(); var n = (k + d + 4) % 4; btns[n].focus(); show(n, true); }
        } }, h('span.sis-ciclo__n', null, String(k + 1)), h('span', null, e.n));
      btns.push(b); row.appendChild(b);
      row.appendChild(h('span.sis-ciclo__arrow', { 'aria-hidden': 'true' }, k < 3 ? '→' : '↺'));
    });
    var nxt = HIS.ui.button('Siguiente paso del ciclo', function () { var n = (cur + 1) % 4; show(n, true); btns[n].focus(); });
    el.append(row, h('div.btn-row', null, nxt), panel);
    show(0, false);
  });
})(window);
