/* HISdata · registro del Service Worker (funcionamiento sin conexión) y aviso de estado */
(function(){
'use strict';
var sc=document.currentScript||[].slice.call(document.scripts).filter(function(s){return /his\.sw\.js/.test(s.src);})[0];
var BASE=sc?sc.src.replace(/assets\/js\/his\.sw\.js.*$/,''):'';
var ok=('serviceWorker' in navigator)&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1');
if(ok)navigator.serviceWorker.register(BASE+'sw.js').catch(function(){});
var live=document.createElement('div');live.setAttribute('role','status');live.setAttribute('aria-live','polite');live.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)';
function add(){document.body.appendChild(live);}
if(document.body)add();else document.addEventListener('DOMContentLoaded',add);
window.addEventListener('offline',function(){live.textContent='Sin conexión. Se usa la copia guardada de la wiki.';});
window.addEventListener('online',function(){live.textContent='Conexión recuperada.';});
})();
