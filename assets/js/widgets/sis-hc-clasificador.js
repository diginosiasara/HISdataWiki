/*!
 * HISdata Wiki · widgets/sis-hc-clasificador.js
 * Responsabilidad ÚNICA: juego «¿va o no va en la historia clínica?» (16 documentos del contenido mínimo + distractores administrativos).
 */
(function (root) {
  'use strict';
  var HIS = root.HIS, D = HIS.dom, h = D.h;

  var SI = [
    ['La hoja clínico-estadística', 'Sí (a): es el resumen administrativo-estadístico del episodio (datos de filiación, diagnóstico, destino al alta).'],
    ['La autorización de ingreso', 'Sí (b): deja constancia de que el ingreso fue indicado y autorizado.'],
    ['El informe de urgencia', 'Sí (c): recoge lo ocurrido en urgencias y la decisión tomada.'],
    ['La anamnesis y la exploración física', 'Sí (d): es la «entrevista» y el examen del paciente; base de todo el proceso.'],
    ['La evolución médica', 'Sí (e): anotaciones del día a día sobre cómo progresa el paciente.'],
    ['Las órdenes médicas', 'Sí (f): lo que el médico indica (tratamientos, pruebas, dieta, cuidados).'],
    ['La hoja de interconsulta', 'Sí (g): petición de opinión a otro especialista y su respuesta.'],
    ['Los informes de exploraciones complementarias', 'Sí (h): resultados de analíticas, radiografías, ecografías, etc.'],
    ['El consentimiento informado', 'Sí (i): prueba de que el paciente fue informado y aceptó el procedimiento.'],
    ['El informe de anestesia', 'Sí (j): técnica anestésica empleada y su seguimiento.'],
    ['El informe de quirófano o el registro del parto', 'Sí (k): qué se hizo en la intervención o cómo fue el parto.'],
    ['El informe de anatomía patológica', 'Sí (l): resultado del estudio de tejidos o muestras.'],
    ['La evolución y planificación de cuidados de enfermería', 'Sí (m): seguimiento y plan de cuidados que lleva enfermería.'],
    ['La aplicación terapéutica de enfermería', 'Sí (n): registro de lo administrado (fármacos, curas) y cuándo.'],
    ['El gráfico de constantes', 'Sí (ñ): tensión, temperatura, pulso, saturación… a lo largo del tiempo.'],
    ['El informe clínico de alta', 'Sí (o): resumen final del proceso con diagnóstico, tratamiento y recomendaciones.']
  ];
  var NO = [
    ['La factura del hospital', 'No: es un documento administrativo-económico; va en la gestión de facturación, no en la historia clínica.'],
    ['El informe financiero de gastos hospitalarios', 'No: es información económica del centro, no del estado de salud del paciente.'],
    ['La nómina de un profesional del servicio', 'No: es un documento de personal y no tiene relación con la atención al paciente.'],
    ['El contrato con un proveedor de material', 'No: pertenece a compras y contratación.'],
    ['El presupuesto anual del servicio', 'No: es información de gestión económica.'],
    ['El cuadrante de turnos del personal', 'No: es organización interna de recursos humanos.'],
    ['La encuesta de satisfacción agregada del hospital', 'No: es un dato de calidad del centro; no recoge el estado de salud de este paciente.']
  ];

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  HIS.widgets.register('sis-hc-clasificador', function (el) {
    var qy = shuffle(SI), qn = shuffle(NO), py = 0, pn = 0;
    var ronda = [], i = 0, ok = 0, answered = false;
    var body = h('div.sis-w');
    el.appendChild(body);

    function take(q, p, n) { var out = []; for (var k = 0; k < n; k++) { out.push(q[p % q.length]); p++; } return out; }
    function nueva() {
      var a = take(qy, py, 8).map(function (x) { return { t: x[0], n: x[1], y: true }; });
      var b = take(qn, pn, 4).map(function (x) { return { t: x[0], n: x[1], y: false }; });
      py += 8; pn += 4;
      ronda = shuffle(a.concat(b)); i = 0; ok = 0; render();
    }
    function render() {
      D.clear(body); answered = false;
      if (i >= ronda.length) {
        body.appendChild(h('div.result-line', { role: 'status', tabindex: '-1' }, h('b', null, ok + ' de ' + ronda.length), ' aciertos. ' + (ok === ronda.length ? '¡Perfecto!' : 'Repasa los documentos que has fallado en la lista de contenido mínimo.')));
        body.appendChild(HIS.ui.button('Nueva ronda con otros documentos', nueva, 'primary'));
        HIS.a11y.announce('Ronda terminada. ' + ok + ' aciertos de ' + ronda.length + '.');
        return;
      }
      var it = ronda[i];
      var fb = h('p.sis-fb', { hidden: true });
      var next = HIS.ui.button(i === ronda.length - 1 ? 'Ver resultado' : 'Siguiente documento', function () { i++; render(); var f = body.querySelector('.sis-doc'); if (f) HIS.a11y.focus(f); else HIS.a11y.focus(body.firstChild); }, 'primary');
      next.hidden = true;
      function resp(v) {
        if (answered) return; answered = true;
        var good = v === it.y; if (good) ok++;
        fb.hidden = false; fb.className = 'sis-fb ' + (good ? 'is-ok' : 'is-ko');
        fb.textContent = (good ? 'Correcto. ' : 'No exactamente. ') + it.n;
        bs.forEach(function (b) { b.disabled = true; });
        next.hidden = false; next.focus();
        HIS.a11y.announce(fb.textContent);
      }
      var bSi = HIS.ui.button('Va en la historia clínica', function () { resp(true); });
      var bNo = HIS.ui.button('No va en la historia clínica', function () { resp(false); });
      var bs = [bSi, bNo];
      body.append(
        h('p.sis-meta', null, 'Documento ' + (i + 1) + ' de ' + ronda.length + ' · Aciertos: ' + ok),
        h('p.sis-doc', { tabindex: '-1' }, it.t),
        h('div.btn-row', { role: 'group', 'aria-label': 'Decide si este documento va en la historia clínica' }, bSi, bNo),
        fb, next
      );
    }
    nueva();
  });
})(window);
