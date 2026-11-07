/*!
 * HISdata Wiki · widgets/sis-hce-balance.js
 * Responsabilidad ÚNICA: ventajas y desventajas de la HCE con filtro y mitigaciones (ampliación).
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, D = HIS.dom, h = D.h;
  var IT = [
    { t: 'v', n: 'Orden, organización y uniformidad', d: 'Todos los documentos siguen la misma estructura y se encuentran siempre en el mismo sitio.', m: 'Revisar periódicamente las plantillas con los clínicos para que sigan siendo útiles.' },
    { t: 'v', n: 'Se acaba la letra ilegible', d: 'Lo escrito en pantalla se lee igual para todos.', m: 'Combinar campos estructurados con texto libre claro y revisable.' },
    { t: 'v', n: 'Acceso rápido, sencillo y simultáneo', d: 'Varios profesionales pueden consultar la misma historia a la vez, desde distintos puntos.', m: 'Limitar el acceso por perfiles y registrar quién consulta qué (trazabilidad).' },
    { t: 'v', n: 'Facilita explotar los datos', d: 'Permite sacar estadísticas, gestionar diagnósticos y apoyar la investigación y la gestión.', m: 'Cuidar la calidad del dato en origen: la estadística solo es tan buena como lo registrado.' },
    { t: 'd', n: 'Rigidez por estructuración excesiva', d: 'Los campos obligatorios no siempre encajan con la realidad de cada caso.', m: 'Plantillas por especialidad, campos de texto libre y mejora continua con retroalimentación de los usuarios.' },
    { t: 'd', n: 'Más tiempo para introducir información', d: 'Registrar en el sistema puede llevar más tiempo que anotar en papel.', m: 'Plantillas y valores por defecto, dictado por voz y formación práctica; reutilizar datos ya registrados.' },
    { t: 'd', n: 'Complejidad para quien no la conoce', d: 'Quien no está familiarizado puede cometer errores o evitar usarla.', m: 'Formación inicial y de refuerzo, soporte cercano, guías rápidas e interfaces sencillas.' },
    { t: 'd', n: 'Costes económicos altos', d: 'Licencias, equipos, formación, mantenimiento y migración de datos.', m: 'Planificar por fases, calcular el coste total y comparar con el ahorro en archivo, papel y duplicidades.' },
    { t: 'd', n: 'Dependencia técnica y fallos de red', d: 'Si cae el sistema o la red, se puede perder el acceso a la historia.', m: 'Plan de contingencia: copias de seguridad, redundancia, y procedimiento en papel para «caídas» con posterior volcado.' },
    { t: 'd', n: 'Desconfianza de los pacientes sobre la confidencialidad', d: 'Temen que más gente pueda ver sus datos.', m: 'Control de accesos por perfil, registro de consultas, auditorías y explicar al paciente cómo se protege su información.' }
  ];
  HIS.widgets.register('sis-hce-balance', function (el) {
    var filtro = 'todas', btns = [];
    var cnt = h('p.field__help', { 'aria-hidden': 'true' });
    var list = h('div.sis-balance');
    var cards = IT.map(function (x) {
      var d = h('details.fold.sis-b-' + x.t, null,
        h('summary', null, h('span', null, h('span.pill', null, x.t === 'v' ? 'Ventaja' : 'Desventaja'), ' ' + x.n)),
        h('p', null, x.d),
        h('p', null, h('span.badge-ampl', null, 'Ampliación'), ' ', h('b', null, x.t === 'v' ? 'Para sacarle partido: ' : 'Cómo mitigarla: '), x.m));
      list.appendChild(d); return d;
    });
    function aplicar(f, say) {
      filtro = f; var n = 0;
      cards.forEach(function (c, i) { var show = f === 'todas' || IT[i].t === f; c.hidden = !show; if (show) n++; });
      btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-f') === f ? 'true' : 'false'); });
      cnt.textContent = 'Mostrando ' + n + ' elementos.';
      if (say) HIS.a11y.announce('Mostrando ' + n + ' elementos.');
    }
    var row = h('div.chip-row', { role: 'group', 'aria-label': 'Filtrar la lista' });
    [['todas', 'Todas'], ['v', 'Ventajas'], ['d', 'Desventajas']].forEach(function (p) {
      var b = h('button.chip', { type: 'button', 'data-f': p[0], 'aria-pressed': 'false', onclick: function () { aplicar(p[0], true); } }, p[1]);
      btns.push(b); row.appendChild(b);
    });
    el.append(row, cnt, list);
    aplicar('todas', false);
  });
})(window);
