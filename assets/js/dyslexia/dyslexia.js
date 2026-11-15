/* HISdata Lectura · "Mi experiencia de lectura": ajustes de presentación, regla de lectura y apoyo al estudio.
   Son preferencias, no etiquetas: no se pregunta ni se guarda ningún diagnóstico. */
(function(){
'use strict';
var R=window.HISRead={},LS='his-read-v1',D={font:'default',size:100,lh:0,ls:0,ws:0,width:'default',bg:'default',ruler:false,focus:false,spacing:false};
var S={};for(var k in D)S[k]=D[k];
try{var sv=JSON.parse(localStorage.getItem(LS)||'{}');for(var k in sv)if(k in D)S[k]=sv[k];}catch(e){}
var FONTS={default:'',arial:'Arial,Helvetica,sans-serif',verdana:'Verdana,Geneva,sans-serif',tahoma:'Tahoma,Verdana,sans-serif',trebuchet:'"Trebuchet MS",Arial,sans-serif',georgia:'Georgia,"Times New Roman",serif',mono:'"Atkinson Hyperlegible","Segoe UI",Verdana,sans-serif'};
var BGS={default:null,warm:['#fffaf0','#fffdf7','#1f1a12'],cream:['#fdf6e3','#fffbee','#2b2417'],beige:['#f4ecd8','#f9f3e3','#2e2616'],gray:['#eceff1','#f5f6f7','#1c2024'],dark:['#17181c','#202228','#ececf1']};
var root=document.documentElement;
R.settings=S;
R.save=function(){try{localStorage.setItem(LS,JSON.stringify(S));}catch(e){}};
R.apply=function(){
  var st=root.style,on=false;
  function set(n,v){if(v===null||v===''){st.removeProperty(n);}else{st.setProperty(n,v);on=true;}}
  set('--read-font',FONTS[S.font]||null);
  set('--read-size',S.size!==100?S.size+'%':null);
  set('--read-lh',S.lh?String(S.lh):null);
  set('--read-ls',S.ls?S.ls+'em':null);
  set('--read-ws',S.ws?S.ws+'em':null);
  set('--read-width',S.width==='default'?null:S.width+'ch');
  var b=BGS[S.bg];
  if(b){st.setProperty('--paper',b[0]);st.setProperty('--surface',b[1]);st.setProperty('--ink',b[2]);on=true;}else{st.removeProperty('--paper');st.removeProperty('--surface');st.removeProperty('--ink');}
  if(S.font!=='default'||S.size!==100||S.lh||S.ls||S.ws||S.width!=='default'||b)on=true;
  if(on)root.setAttribute('data-read','1');else root.removeAttribute('data-read');
  root.classList.toggle('read-focus',!!S.focus);
  ruler();
};
/* regla de lectura: banda que acompaña al puntero y al foco */
var bar=null,rulerOn=false;
function moveTo(y){if(bar)bar.style.top=Math.max(0,y-18)+'px';}
function ruler(){
  if(S.ruler&&!bar){bar=document.createElement('div');bar.className='read-ruler';bar.setAttribute('aria-hidden','true');bar.style.cssText='';document.body&&document.body.appendChild(bar);
    document.addEventListener('mousemove',function(e){if(bar)moveTo(e.clientY);},{passive:true});
    document.addEventListener('focusin',function(e){if(bar&&e.target&&e.target.getBoundingClientRect){var r=e.target.getBoundingClientRect();moveTo(r.top+r.height/2);}});
    document.addEventListener('keydown',function(e){if(bar&&e.altKey&&(e.key==='ArrowDown'||e.key==='ArrowUp')){e.preventDefault();var y=(parseFloat(bar.style.top)||200)+18+(e.key==='ArrowDown'?32:-32);moveTo(y);}});}
  if(bar)bar.style.display=S.ruler?'block':'none';
}
R.reset=function(){for(var k in D)S[k]=D[k];R.save();R.apply();};
R.apply();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){R.apply();});
/* ---------- panel ---------- */
R.build=function(box,hooks){
  hooks=hooks||{};
  function opt(map,sel){return Object.keys(map).map(function(k){return '<option value="'+k+'"'+(sel===k?' selected':'')+'>'+map[k]+'</option>';}).join('');}
  function slider(id,label,min,max,step,val,unit){return '<label class="rd-f" for="rd-'+id+'">'+label+' <output id="rd-'+id+'-o">'+val+unit+'</output></label><input type="range" id="rd-'+id+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'">';}
  box.innerHTML='<h3 class="rd-h">Mi experiencia de lectura</h3><p class="rd-s">Ajusta cómo se muestran los textos de la wiki. Son preferencias personales: no hace falta indicar ningún diagnóstico y puedes restablecerlo cuando quieras.</p>'+
   '<label class="rd-f" for="rd-font">Tipo de letra</label><select id="rd-font">'+opt({default:'Predeterminada de la wiki',arial:'Arial',verdana:'Verdana',tahoma:'Tahoma',trebuchet:'Trebuchet MS',georgia:'Georgia (con serifa)',mono:'Atkinson Hyperlegible / Segoe UI'},S.font)+'</select>'+
   slider('size','Tamaño del texto',100,160,5,S.size,' %')+slider('lh','Altura de línea (0 = automática)',0,2.2,0.1,S.lh,'')+slider('ls','Espacio entre letras',0,0.12,0.01,S.ls,' em')+slider('ws','Espacio entre palabras',0,0.3,0.02,S.ws,' em')+
   '<label class="rd-f" for="rd-width">Anchura del texto</label><select id="rd-width">'+opt({default:'Predeterminada',55:'Estrecha (55 caracteres)',65:'Media (65)',75:'Amplia (75)',90:'Muy amplia (90)'},String(S.width))+'</select>'+
   '<label class="rd-f" for="rd-bg">Fondo</label><select id="rd-bg">'+opt({default:'Predeterminado',warm:'Blanco cálido',cream:'Crema',beige:'Beige suave',gray:'Gris claro',dark:'Oscuro'},S.bg)+'</select>'+
   '<label class="rd-c"><input type="checkbox" id="rd-ruler"'+(S.ruler?' checked':'')+'> Regla de lectura (sigue al puntero y al foco; Alt + ↑ ↓ la mueve)</label>'+
   '<label class="rd-c"><input type="checkbox" id="rd-focus"'+(S.focus?' checked':'')+'> Modo concentración (oculta el menú lateral)</label>'+
   '<div class="rd-row"><button type="button" class="rd-b" id="rd-reset">Restablecer</button></div>'+
   '<h4 class="rd-h2">Ayuda con el texto seleccionado</h4><p class="rd-s">Selecciona un párrafo de la página y elige una acción. El texto original no se modifica.</p>'+
   '<div class="rd-row"><button type="button" class="rd-b" data-act="read">🔊 Leer en voz alta</button><button type="button" class="rd-b" data-act="claro">Explicar con palabras sencillas</button><button type="button" class="rd-b" data-act="pasos">Dividir en pasos</button><button type="button" class="rd-b" data-act="glosario">Explicar los términos difíciles</button></div><div id="rd-live" role="status" aria-live="polite" class="rd-live"></div>';
  function sync(){R.save();R.apply();}
  box.querySelector('#rd-font').addEventListener('change',function(e){S.font=e.target.value;sync();});
  [['size',1],['lh',1],['ls',1],['ws',1]].forEach(function(p){var el=box.querySelector('#rd-'+p[0]),o=box.querySelector('#rd-'+p[0]+'-o'),u={size:' %',lh:'',ls:' em',ws:' em'}[p[0]];el.addEventListener('input',function(){S[p[0]]=parseFloat(el.value);o.textContent=el.value+u;sync();});});
  box.querySelector('#rd-width').addEventListener('change',function(e){S.width=e.target.value;sync();});
  box.querySelector('#rd-bg').addEventListener('change',function(e){S.bg=e.target.value;sync();});
  box.querySelector('#rd-ruler').addEventListener('change',function(e){S.ruler=e.target.checked;sync();});
  box.querySelector('#rd-focus').addEventListener('change',function(e){S.focus=e.target.checked;sync();});
  box.querySelector('#rd-reset').addEventListener('click',function(){R.reset();R.build(box,hooks);box.querySelector('#rd-live').textContent='Ajustes restablecidos.';});
  box.querySelectorAll('[data-act]').forEach(function(b){b.addEventListener('click',function(){
    var t=(window.getSelection()||'').toString().trim(),live=box.querySelector('#rd-live');
    if(t.length<8){live.textContent='Primero selecciona un texto en la página (al menos una frase).';return;}
    var a=b.dataset.act;if(a==='read'){if(window.HISVoice&&HISVoice.supportsTTS){HISVoice.speak(t);live.textContent='Leyendo la selección.';}else live.textContent='Tu navegador no incluye síntesis de voz.';return;}
    var pre={claro:'Explícame con palabras sencillas, sin perder ningún dato técnico: ',pasos:'Divide en pasos numerados esta explicación: ',glosario:'Explica uno por uno los términos técnicos y abreviaturas de este texto: '}[a];
    hooks.ask&&hooks.ask(pre+t.slice(0,1200),a,t.slice(0,1200));live.textContent='Enviado al asistente.';});});
};
})();
