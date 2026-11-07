/* Menú de fichas plegable: se abre y se cierra, con foco atrapado y Escape */
HIS.menu={init:function(){var u=HIS.u,m=u.$("#menu"),sc=u.$("#scrim"),b=u.$("#menu-btn"),c=HIS.cfg,h="<p class=\"sr\">Índice de fichas</p><a href=\"#/\">Inicio</a>";
[0,1].forEach(function(s){h+="<h2>"+u.esc(c.sessions[s])+"</h2><ul>"+HIS.entries.filter(function(e){return e.s==s}).map(function(e){return"<li><a href=\"#/e/"+e.id+"\" data-id=\""+e.id+"\">"+u.esc(e.title)+"</a></li>"}).join("")+"</ul>"});
h+="<h2>Recursos</h2><ul><li><a href=\"#/glosario\">Glosario</a></li><li><a href=\"#/formulas\">Resumen de fórmulas</a></li></ul>";m.innerHTML=h;
function open(){m.hidden=sc.hidden=false;b.setAttribute("aria-expanded","true");b.setAttribute("aria-label","Cerrar menú de fichas");m.querySelector("a").focus()}
function close(){if(m.hidden)return;m.hidden=sc.hidden=true;b.setAttribute("aria-expanded","false");b.setAttribute("aria-label","Abrir menú de fichas");b.focus()}
b.addEventListener("click",function(){m.hidden?open():close()});sc.addEventListener("click",close);
m.addEventListener("click",function(e){if(e.target.closest("a"))close()});
document.addEventListener("keydown",function(e){if(m.hidden)return;if(e.key=="Escape")close();if(e.key=="Tab"){var f=m.querySelectorAll("a"),a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement==a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement==z){e.preventDefault();a.focus()}}});
this.mark=function(id){m.querySelectorAll("a").forEach(function(a){id&&a.dataset.id==id?a.setAttribute("aria-current","page"):a.removeAttribute("aria-current")})}}};
