/* HISdata AI · registro de proveedores, autodetección y configuración (sin dependencias) */
(function(){
'use strict';
var AI=window.HISAI=window.HISAI||{};
var sc=document.currentScript||[].slice.call(document.scripts).filter(function(s){return /ai\.providers\.js/.test(s.src);})[0];
var BASE=sc?sc.src.replace(/assets\/js\/ai\/ai\.providers\.js.*$/,''):'';
AI.BASE=BASE;
var LS='his-ai-v2',DEFAULTS={mode:'auto',primary:'builtin',fallback:true,offlinePreferred:true,
  ollama:{endpoint:'http://localhost:11434',model:''},lmstudio:{endpoint:'http://localhost:1234/v1',model:''},cloud:{endpoint:'',model:'claude-haiku-5-5'}};
function clone(o){return JSON.parse(JSON.stringify(o));}
var cfg=clone(DEFAULTS);
try{var sv=JSON.parse(localStorage.getItem(LS)||'null');if(sv){['mode','primary','fallback','offlinePreferred'].forEach(function(k){if(k in sv)cfg[k]=sv[k];});['ollama','lmstudio','cloud'].forEach(function(p){if(sv[p])for(var k in sv[p])cfg[p][k]=sv[p][k];});}
  /* migración de seguridad: la clave de la versión anterior no debe seguir en localStorage */
  var old=JSON.parse(localStorage.getItem('his-asst-v1')||'null');if(old&&old.key){old.key='';localStorage.setItem('his-asst-v1',JSON.stringify(old));}}catch(e){}
AI.config=cfg;
AI.saveConfig=function(){try{localStorage.setItem(LS,JSON.stringify(cfg));}catch(e){}};
/* la clave de API solo vive en la sesión del navegador */
AI.getKey=function(){try{return sessionStorage.getItem('his-ai-cloudkey')||'';}catch(e){return '';}};
AI.setKey=function(k){try{if(k)sessionStorage.setItem('his-ai-cloudkey',k);else sessionStorage.removeItem('his-ai-cloudkey');}catch(e){}};
function tfetch(url,opt,ms){var c=new AbortController(),t=setTimeout(function(){c.abort();},ms||2500);opt=opt||{};opt.signal=c.signal;return fetch(url,opt).finally(function(){clearTimeout(t);});}
function trim(u){return String(u||'').replace(/\/+$/,'');}
function why(e,local){
  if(e&&e.name==='AbortError')return 'No respondió a tiempo.';
  if(location.protocol==='file:'&&!local)return 'Las páginas abiertas como archivo local tienen restricciones de red; usa un servidor local o la versión publicada.';
  return 'No se pudo conectar. Puede estar apagado, o el navegador lo bloquea (CORS o permiso de red local).';
}
function isEmbed(n){return /embed|bge|e5|minilm|gte-|nomic|mxbai|snowflake-arctic-embed/i.test(n);}
/* ---------- proveedores ---------- */
var P={};
P.builtin={id:'builtin',name:'Integrado (paquete de la wiki)',kind:'embedded',llm:false,
  detect:function(){
    var out={id:'builtin',ok:true,connected:true,engine:true,models:[],notes:[]};
    return tfetch(BASE+'modelos-ia/catalogo/modelos.json',{cache:'no-store'},2500).then(function(r){if(!r.ok)throw 0;return r.json();}).then(function(cat){
      var chk=(cat.modelos||[]).map(function(m){return tfetch(BASE+m.sonda,{method:'HEAD',cache:'no-store'},2500).then(function(r){m.instalado=r.ok;return m;}).catch(function(){m.instalado=false;return m;});});
      return Promise.all(chk).then(function(ms){out.models=ms.map(function(m){return {id:m.id,name:m.nombre,rol:m.rol,instalado:m.instalado,tamano:m.tamano,licencia:m.licencia};});
        var n=ms.filter(function(m){return m.instalado;}).length;out.notes.push(n?n+' de '+ms.length+' modelos del paquete están instalados.':'Los pesos de los modelos aún no están en la carpeta modelos-ia/. Funciona el motor documental y de cálculo integrado.');return out;});
    }).catch(function(){out.notes.push(location.protocol==='file:'?'Abre la wiki desde un servidor (http) para comprobar la carpeta modelos-ia/.':'No se encontró el catálogo modelos-ia/catalogo/modelos.json.');return out;});},
  chat:null};
P.ollama={id:'ollama',name:'Ollama',kind:'local',llm:true,
  detect:function(){var u=trim(cfg.ollama.endpoint);return tfetch(u+'/api/tags',{},2500).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(function(j){
      var ms=(j.models||[]).map(function(m){return {id:m.name,name:m.name,size:m.size,embed:isEmbed(m.name)};});return {id:'ollama',ok:true,connected:true,models:ms};}).catch(function(e){return {id:'ollama',ok:false,connected:false,models:[],reason:why(e,true)};});},
  chat:function(msgs,sys,opt){var u=trim(cfg.ollama.endpoint),m=opt.model||cfg.ollama.model;if(!m)return Promise.reject(new Error('Elige un modelo de Ollama.'));
    return tfetch(u+'/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:m,stream:false,messages:[{role:'system',content:sys}].concat(msgs)})},opt.timeout||120000).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return (j.message&&j.message.content)||'';});});}};
P.lmstudio={id:'lmstudio',name:'LM Studio',kind:'local',llm:true,
  detect:function(){var u=trim(cfg.lmstudio.endpoint);return tfetch(u+'/models',{},2500).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(function(j){
      var ms=(j.data||[]).map(function(m){return {id:m.id,name:m.id,embed:isEmbed(m.id)};});return {id:'lmstudio',ok:true,connected:true,models:ms};}).catch(function(e){return {id:'lmstudio',ok:false,connected:false,models:[],reason:why(e,true)};});},
  chat:function(msgs,sys,opt){var u=trim(cfg.lmstudio.endpoint),m=opt.model||cfg.lmstudio.model;if(!m)return Promise.reject(new Error('Elige un modelo de LM Studio.'));
    return tfetch(u+'/chat/completions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:m,stream:false,messages:[{role:'system',content:sys}].concat(msgs)})},opt.timeout||120000).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error((j.error&&j.error.message)||('HTTP '+r.status));return (j.choices&&j.choices[0]&&j.choices[0].message.content)||'';});});}};
P.cloud={id:'cloud',name:'IA en la nube (Claude)',kind:'remote',llm:true,
  detect:function(){var ep=trim(cfg.cloud.endpoint),k=AI.getKey();return Promise.resolve({id:'cloud',ok:!!(ep||k),connected:!!(ep||k),models:[{id:'claude-haiku-5-5',name:'claude-haiku-5-5 (rápido)'},{id:'claude-sonnet-5-5',name:'claude-sonnet-5-5 (equilibrado)'},{id:'claude-opus-5-5',name:'claude-opus-5-5 (máxima calidad)'}],
      reason:(ep||k)?'':'Configura un endpoint propio (recomendado) o una clave para esta sesión.',notes:ep?['Proxy propio: la clave no pasa por el navegador.']:['Clave solo en esta sesión del navegador; evita usarla en equipos compartidos.']});},
  chat:function(msgs,sys,opt){var ep=trim(cfg.cloud.endpoint),url=ep||'https://api.anthropic.com/v1/messages',h={'content-type':'application/json','anthropic-version':'2023-06-01'};
    if(!ep){var k=AI.getKey();if(!k)return Promise.reject(new Error('Falta la clave de API.'));h['x-api-key']=k;h['anthropic-dangerous-direct-browser-access']='true';}
    return tfetch(url,{method:'POST',headers:h,body:JSON.stringify({model:opt.model||cfg.cloud.model,max_tokens:900,system:sys,messages:msgs})},opt.timeout||90000).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error((j.error&&j.error.message)||('HTTP '+r.status));return (j.content||[]).map(function(b){return b.text||'';}).join('').trim()||j.answer||'';});});}};
P.antigravity={id:'antigravity',name:'Google Antigravity (MCP)',kind:'tools',llm:false,
  detect:function(){return Promise.resolve({id:'antigravity',ok:false,connected:false,models:[],notes:['Antigravity es un entorno de desarrollo con agentes, no un servidor de inferencia: una página web no puede detectar si está instalado.','La integración es al revés: Antigravity usa las herramientas de HISdata mediante el servidor MCP de servidor/mcp/ (ver pestaña IA).']});},chat:null};
AI.providers=P;AI.order=['builtin','ollama','lmstudio','cloud','antigravity'];
AI.status={};
AI.discover=function(ids){ids=ids||['builtin','ollama','lmstudio','cloud','antigravity'];
  return Promise.all(ids.map(function(id){return P[id].detect().then(function(r){AI.status[id]=r;return r;});}));};
AI.recommend=function(){ /* elige proveedor principal sin forzar: prioriza local, nunca la nube de forma automática */
  var o=AI.status.ollama,l=AI.status.lmstudio;
  function pick(s){var g=(s.models||[]).filter(function(m){return !m.embed;});
    var pref=['qwen2.5:3b','qwen2.5:1.5b','llama3.2:3b','gemma','qwen','llama','phi'];
    for(var i=0;i<pref.length;i++){var f=g.filter(function(m){return m.id.toLowerCase().indexOf(pref[i])===0||m.id.toLowerCase().indexOf(pref[i])>=0;})[0];if(f)return f.id;}
    return g[0]&&g[0].id;}
  if(o&&o.connected&&pick(o))return {provider:'ollama',model:pick(o)};
  if(l&&l.connected&&pick(l))return {provider:'lmstudio',model:pick(l)};
  return {provider:'builtin',model:''};};
AI.active=function(){var id=cfg.primary,p=P[id];if(!p||!p.llm)return null;var m=(cfg[id]||{}).model;if(id!=='cloud'&&!m)return null;return {id:id,provider:p,model:m};};
AI.test=function(id){var p=P[id];if(!p||!p.chat)return Promise.reject(new Error('Este proveedor no genera texto.'));var t0=Date.now();return p.chat([{role:'user',content:'Responde solo con la palabra: listo'}],'Eres un asistente de pruebas.',{model:(cfg[id]||{}).model,timeout:60000}).then(function(t){return {text:String(t).slice(0,80),ms:Date.now()-t0};});};
})();
