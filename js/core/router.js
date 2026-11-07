/* Router por hash (#/e/slug): funciona en servidor estático y abriendo el archivo directamente */
HIS.router={parse:function(){var h=location.hash.replace(/^#\/?/,""),a=h.split("?"),p=a[0].split("/").filter(Boolean),q=new URLSearchParams(a[1]||"").get("q")||"",V=HIS.views;
if(!p.length)return V.home();if(p[0]=="e")return V.entry(p[1]);if(p[0]=="etiqueta")return V.tag(decodeURIComponent(p[1]||""));if(p[0]=="glosario")return V.glossary();if(p[0]=="formulas")return V.formulas();if(p[0]=="sesion")return V.session(p[1]);if(p[0]=="buscar")return V.search(q);return V.notfound()},
go:function(first){var v=this.parse(),m=HIS.u.$("#main");m.innerHTML=v.html;
HIS.seo.set({title:v.title,desc:v.desc,path:v.path,ld:v.ld});HIS.menu.mark(v.id);HIS.reader.show(!!v.entry);HIS.widgets.mount(m);if(v.entry)HIS.quiz.mount(v.e);
HIS.u.$("#q").value=v.q||"";
if(!first){HIS.a11y.focusMain();var h=HIS.u.$("h1",m);HIS.a11y.say((h?h.textContent:v.title||"Página")+", página cargada")}},
init:function(){var s=this;window.addEventListener("hashchange",function(){s.go(false)});this.go(true)}};
