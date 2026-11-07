/* Accesibilidad: anuncios para lectores de pantalla y gestión del foco */
HIS.a11y={say:function(t){var l=HIS.u.$("#live");l.textContent="";setTimeout(function(){l.textContent=t},60)},
focusMain:function(){var m=HIS.u.$("#main");m.focus({preventScroll:true});window.scrollTo(0,0)}};
