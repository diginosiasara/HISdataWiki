/* Arranque de la aplicación */
(function(){document.addEventListener("DOMContentLoaded",function(){HIS.prefs.init();HIS.menu.init();HIS.reader.init();
HIS.u.$("#search-form").addEventListener("submit",function(e){e.preventDefault();var q=HIS.u.$("#q").value.trim();if(q)location.hash="#/buscar?q="+encodeURIComponent(q)});
document.addEventListener("click",function(e){var a=e.target.closest("[data-scroll]"),b=e.target.closest("[data-focus]");if(a){var t=document.getElementById(a.dataset.scroll);if(t){t.scrollIntoView({behavior:"smooth"});t.setAttribute("tabindex","-1");t.focus({preventScroll:true})}}if(b)document.getElementById(b.dataset.focus).focus();var k=e.target.closest("[data-copy]");if(k){var t=k.dataset.copy;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){HIS.a11y.say("Idea copiada al portapapeles")},function(){HIS.a11y.say("No se pudo copiar")})}});
HIS.widgets.init();HIS.router.init()})})();
