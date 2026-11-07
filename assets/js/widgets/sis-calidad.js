/*!
 * HISdata Wiki · widgets/sis-calidad.js
 * Responsabilidad ÚNICA: explorar las 6 dimensiones de calidad del dato y jugar a «¿qué dimensión falla?».
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, D = HIS.dom, h = D.h;
  var DIM = [
    { id: 'precision', n: 'Precisión', d: 'Los datos reflejan la realidad clínica o administrativa.', e: 'Si a un paciente se le opera de un infarto, el procedimiento queda con el nombre y el código correctos (CIE-10-ES, SNOMED CT u otro).' },
    { id: 'integridad', n: 'Integridad', d: 'Toda la información relevante está registrada y disponible.', e: 'Todas las intervenciones y visitas al hospital de un paciente aparecen en su historial.' },
    { id: 'consistencia', n: 'Consistencia', d: 'No hay contradicciones entre fuentes o registros.', e: 'Una misma intervención no tiene fechas distintas en documentos diferentes.' },
    { id: 'actualizacion', n: 'Actualización', d: 'Los datos reflejan el estado del paciente en este momento.', e: 'Un cambio de medicación se registra en el momento en que ocurre.' },
    { id: 'relevancia', n: 'Relevancia', d: 'Los datos son apropiados y útiles para el fin concreto.', e: 'Las alergias están bien recogidas cuando el paciente va a ser anestesiado.' },
    { id: 'accesibilidad', n: 'Accesibilidad', d: 'Disponibles para profesionales autorizados cuando los necesitan, respetando la privacidad.', e: 'El INE ofrece datos anonimizados de nacimientos para investigación.' }
  ];
  var CASOS = [
    ['En el registro quirúrgico, una apendicectomía se ha codificado con el código de una colecistectomía.', 'precision', 'El dato no refleja lo que realmente se hizo: falla la precisión.'],
    ['Un paciente estuvo ingresado hace dos meses en otro servicio del mismo hospital, pero ese ingreso no aparece en su historial.', 'integridad', 'Falta información relevante que existe: falla la integridad.'],
    ['El informe de alta dice que la operación fue el día 3 y el informe de quirófano dice que fue el día 5.', 'consistencia', 'Dos fuentes se contradicen sobre el mismo hecho: falla la consistencia.'],
    ['El lunes se cambió el anticoagulante del paciente, pero la historia electrónica sigue mostrando el anterior hasta el viernes.', 'actualizacion', 'El dato no refleja el estado actual: falla la actualización.'],
    ['El formulario de preparación para anestesia pide datos de seguro y de facturación, pero no tiene un campo visible para las alergias.', 'relevancia', 'Se recogen datos poco útiles para el fin y falta el que importa: falla la relevancia.'],
    ['Una médica autorizada de guardia necesita el último informe de un paciente, pero su perfil no le deja abrirlo y tarda 20 minutos en solucionarse.', 'accesibilidad', 'El dato existe pero no está disponible para quien está autorizado cuando lo necesita: falla la accesibilidad.']
  ];
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  HIS.widgets.register('sis-calidad', function (el) {
    /* Parte A: chips */
    var panel = h('div.sis-panel');
    var chips = [];
    function show(k) {
      chips.forEach(function (c, j) { c.setAttribute('aria-pressed', j === k ? 'true' : 'false'); });
      D.clear(panel);
      panel.append(h('h4', null, DIM[k].n), h('p', null, DIM[k].d), h('p', null, h('b', null, 'Ejemplo: '), DIM[k].e));
    }
    DIM.forEach(function (d, k) {
      var b = h('button.chip', { type: 'button', 'aria-pressed': 'false', onclick: function () { show(k); HIS.a11y.announce(DIM[k].n + '. ' + DIM[k].d + ' Ejemplo: ' + DIM[k].e); } }, d.n);
      chips.push(b);
    });
    var A = h('section', { 'aria-labelledby': D.uid('cal-a') });
    var ha = h('h4#' + A.getAttribute('aria-labelledby'), null, 'Explora las 6 dimensiones');
    A.append(ha, h('div.chip-row', { role: 'group', 'aria-label': 'Dimensiones de calidad del dato' }, chips), panel);
    show(0);

    /* Parte B: juego */
    var B = h('section.sis-game'); var ronda, i, ok, answered;
    var hb = h('h4', null, 'Juego: ¿qué dimensión falla?');
    var body = h('div');
    B.append(hb, body);
    function start() { ronda = shuffle(CASOS); i = 0; ok = 0; draw(); }
    function draw() {
      D.clear(body); answered = false;
      if (i >= ronda.length) {
        body.append(h('div.result-line', { role: 'status' }, h('b', null, ok + ' de ' + ronda.length), ' casos acertados.'), HIS.ui.button('Jugar otra vez', function () { start(); }, 'primary'));
        HIS.a11y.announce('Juego terminado. ' + ok + ' de ' + ronda.length + ' aciertos.');
        return;
      }
      var c = ronda[i], fb = h('p.sis-fb', { hidden: true }), btns = [];
      var next = HIS.ui.button(i === ronda.length - 1 ? 'Ver resultado' : 'Siguiente caso', function () { i++; draw(); HIS.a11y.focus(body.querySelector('.sis-case') || body); }, 'primary');
      next.hidden = true;
      DIM.forEach(function (d) {
        btns.push(h('button.chip', { type: 'button', onclick: function (ev) {
          if (answered) return; answered = true;
          var good = d.id === c[1]; if (good) ok++;
          btns.forEach(function (b) { b.disabled = true; });
          fb.hidden = false; fb.className = 'sis-fb ' + (good ? 'is-ok' : 'is-ko');
          fb.textContent = (good ? 'Correcto. ' : 'No: la dimensión que falla es ' + DIM.filter(function (x) { return x.id === c[1]; })[0].n + '. ') + c[2];
          next.hidden = false; next.focus(); HIS.a11y.announce(fb.textContent);
        } }, d.n));
      });
      body.append(
        h('p.sis-meta', null, 'Caso ' + (i + 1) + ' de ' + ronda.length + ' · Aciertos: ' + ok),
        h('p.sis-case', { tabindex: '-1' }, c[0]),
        h('div.chip-row', { role: 'group', 'aria-label': 'Elige la dimensión de calidad que falla' }, btns),
        fb, next
      );
    }
    start();
    el.append(A, B);
  });
})(window);
