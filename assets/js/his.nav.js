/* HISdata · menú de temas: grupos plegables, filtro, tema actual visible y teclado */
(function(){
'use strict';
var nav=document.querySelector('#sidebar nav.nav');if(!nav||nav.getAttribute('data-enh'))return;nav.setAttribute('data-enh','1');
function norm(s){return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
var LS='his-nav-v2',saved={};try{saved=JSON.parse(localStorage.getItem(LS)||'{}');}catch(e){}
function persist(){try{localStorage.setItem(LS,JSON.stringify(saved));}catch(e){}}
var kids=[].slice.call(nav.children),groups=[],top=null;
for(var i=0;i<kids.length;i++){var k=kids[i];if(k.tagName==='UL'&&!groups.length&&!top)top=k;else if(k.tagName==='H2'&&kids[i+1]&&kids[i+1].tagName==='UL'){groups.push({h:k,ul:kids[i+1],title:k.textContent.trim()});i++;}}
if(!groups.length)return;
/* herramientas */
var tools=document.createElement('div');tools.className='ng-tools';
tools.innerHTML='<label class="ng-sr" for="ng-filter">Filtrar temas</label><input id="ng-filter" type="search" placeholder="Filtrar temas…" autocomplete="off" aria-describedby="ng-count"><div class="ng-row"><button type="button" class="ng-btn" id="ng-all">Abrir todo</button><button type="button" class="ng-btn" id="ng-none">Cerrar todo</button><button type="button" class="ng-btn" id="ng-cur">Tema actual</button></div><p id="ng-count" class="ng-sr" role="status" aria-live="polite"></p>';
nav.insertBefore(tools,nav.firstChild);
function setOpen(g,o,store){g.open=o;g.ul.hidden=!o;g.btn.setAttribute('aria-expanded',o?'true':'false');if(store){saved[g.title]=o;persist();}}
groups.forEach(function(g,n){
  var id='ng-g'+n,cur=!!g.ul.querySelector('[aria-current="page"]'),cnt=g.ul.querySelectorAll('li').length;
  var b=document.createElement('button');b.type='button';b.className='ng-toggle';b.setAttribute('aria-controls',id);
  b.innerHTML='<span class="ng-ttl"></span><span class="ng-cnt" aria-hidden="true">'+cnt+'</span><span class="ng-chev" aria-hidden="true">▾</span>';b.querySelector('.ng-ttl').textContent=g.title;
  if(cur){b.querySelector('.ng-ttl').insertAdjacentHTML('beforeend','<span class="ng-sr"> (contiene la página actual)</span>');g.h.classList.add('ng-has-cur');}
  g.h.textContent='';g.h.appendChild(b);g.ul.id=id;g.btn=b;g.cur=cur;
  var o=cur?true:(g.title in saved?!!saved[g.title]:false);
  setOpen(g,o,false);
  b.addEventListener('click',function(){setOpen(g,!g.open,true);});
});
/* los enlaces de los grupos: título largo en una sola línea de lectura */
function eachLi(fn){groups.forEach(function(g){[].forEach.call(g.ul.querySelectorAll('li'),function(li){fn(li,g);});});}
var f=tools.querySelector('#ng-filter'),count=tools.querySelector('#ng-count');
function filter(){var q=norm(f.value.trim()),n=0;
  if(!q){eachLi(function(li){li.hidden=false;});groups.forEach(function(g){g.h.hidden=false;setOpen(g,g.cur?true:(g.title in saved?!!saved[g.title]:false),false);});count.textContent='';return;}
  groups.forEach(function(g){var any=false;[].forEach.call(g.ul.querySelectorAll('li'),function(li){var m=norm(li.textContent).indexOf(q)>=0||norm(g.title).indexOf(q)>=0&&false;li.hidden=!m;if(m){any=true;n++;}});g.h.hidden=!any;setOpen(g,any,false);});
  count.textContent=n?n+(n===1?' tema encontrado.':' temas encontrados.'):'No hay temas que coincidan.';}
f.addEventListener('input',filter);f.addEventListener('keydown',function(e){if(e.key==='Escape'&&f.value){f.value='';filter();e.stopPropagation();}});
tools.querySelector('#ng-all').addEventListener('click',function(){groups.forEach(function(g){setOpen(g,true,true);});});
tools.querySelector('#ng-none').addEventListener('click',function(){groups.forEach(function(g){setOpen(g,g.cur,true);});});
function goCur(){var a=nav.querySelector('[aria-current="page"]');if(!a)return;var g=groups.filter(function(x){return x.ul.contains(a);})[0];if(g)setOpen(g,true,false);a.scrollIntoView({block:'center'});a.focus({preventScroll:true});}
tools.querySelector('#ng-cur').addEventListener('click',goCur);
var a=nav.querySelector('[aria-current="page"]');if(a){var sb=document.getElementById('sidebar');setTimeout(function(){var r=a.getBoundingClientRect(),s=sb.getBoundingClientRect();if(r.top<s.top||r.bottom>s.bottom)sb.scrollTop+=r.top-s.top-s.height/3;},30);}
/* teclado: flechas arriba/abajo recorren los enlaces visibles del menú */
nav.addEventListener('keydown',function(e){if(e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;var els=[].filter.call(nav.querySelectorAll('a,button,input'),function(x){return x.offsetParent!==null;}),i=els.indexOf(document.activeElement);if(i<0)return;e.preventDefault();var n=els[i+(e.key==='ArrowDown'?1:-1)];if(n)n.focus();});
document.addEventListener('keydown',function(e){if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||'')&&!e.ctrlKey&&!e.metaKey&&!e.altKey){var sb=document.getElementById('sidebar');if(sb&&sb.getBoundingClientRect().width>0){e.preventDefault();f.focus();}}});
})();
