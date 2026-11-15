/* HISdata Voice · motor de dictado integrado y sin conexión (Vosk en WebAssembly).
   Usa los archivos del paquete en modelos-ia/speech-to-text/vosk/ (vosk.js y model-es.tar.gz).
   El usuario final no descarga nada: los instala una sola vez quien prepara el paquete (preparar-voz.mjs). */
(function(){
'use strict';
var O=window.HISVoiceOffline={},sc=document.currentScript||[].slice.call(document.scripts).filter(function(s){return /voice\.offline\.js/.test(s.src);})[0];
var BASE=sc?sc.src.replace(/assets\/js\/voice\/voice\.offline\.js.*$/,''):'';
var DIR='modelos-ia/speech-to-text/vosk/',RUNTIME=DIR+'vosk.js',MODEL=DIR+'model-es.tar.gz';
var avail=null,modelP=null;
function head(u){return fetch(BASE+u,{method:'HEAD',cache:'no-store'}).then(function(r){return r.ok;}).catch(function(){return false;});}
O.files={runtime:RUNTIME,model:MODEL};
O.supported=!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&(window.AudioContext||window.webkitAudioContext)&&window.WebAssembly);
O.available=function(){
  if(avail!==null)return Promise.resolve(avail);
  if(!O.supported||location.protocol==='file:'){avail=false;return Promise.resolve(false);}
  return Promise.all([head(RUNTIME),head(MODEL)]).then(function(r){avail=!!(r[0]&&r[1]);return avail;});};
function script(u){return new Promise(function(ok,ko){if(window.Vosk)return ok();var s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=function(){ko(new Error('No se pudo cargar el motor de voz integrado.'));};document.head.appendChild(s);});}
O.load=function(){
  if(modelP)return modelP;
  modelP=script(BASE+RUNTIME).then(function(){if(!window.Vosk||!window.Vosk.createModel)throw new Error('El motor de voz integrado no es válido.');return window.Vosk.createModel(BASE+MODEL);}).catch(function(e){modelP=null;throw e;});
  return modelP;};
var cur=null;
O.listening=function(){return !!cur;};
O.stop=function(){if(cur)cur.finish();};
/* cb: {state(s,msg), text(t,final)}; fix: función que corrige el texto (vocabulario y números) */
O.dictate=function(cb,fix){
  fix=fix||function(x){return x;};
  if(cur){cur.finish();return;}
  cb.state('loading','Preparando el dictado integrado…');
  O.load().then(function(model){
    return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,channelCount:1}}).then(function(stream){
      var AC=window.AudioContext||window.webkitAudioContext,ctx=new AC(),src=ctx.createMediaStreamSource(stream),proc=ctx.createScriptProcessor(4096,1,1),rec=new model.KaldiRecognizer(ctx.sampleRate);
      var finals=[],partial='',last=Date.now(),spoke=false,done=false,timer=null,t0=Date.now();
      function show(){var t=fix((finals.join(' ')+' '+partial).trim());cb.text(t,false);}
      rec.on('partialresult',function(m){partial=(m&&m.result&&m.result.partial)||'';if(partial){spoke=true;last=Date.now();}show();});
      rec.on('result',function(m){var x=(m&&m.result&&m.result.text)||'';if(x){finals.push(x);spoke=true;last=Date.now();}partial='';show();});
      proc.onaudioprocess=function(e){try{rec.acceptWaveform(e.inputBuffer);}catch(x){}};
      src.connect(proc);proc.connect(ctx.destination);
      function finish(){
        if(done)return;done=true;clearInterval(timer);
        try{proc.disconnect();src.disconnect();}catch(e){}
        stream.getTracks().forEach(function(t){t.stop();});
        try{if(rec.retrieveFinalResult)rec.retrieveFinalResult();}catch(e){}
        setTimeout(function(){
          var t=fix((finals.join(' ')+' '+partial).trim());
          try{rec.remove&&rec.remove();}catch(e){}try{ctx.close();}catch(e){}cur=null;
          if(t){cb.text(t,true);cb.state('done','Transcripción disponible. Revisa el texto y pulsa Enviar.');}else cb.state('idle','No he oído nada. Inténtalo de nuevo.');
        },350);}
      cur={finish:finish};
      timer=setInterval(function(){var now=Date.now();if((spoke&&now-last>2200)||now-t0>45000)finish();},300);
      cb.state('listening','Escuchando con el motor integrado, sin conexión. Habla ahora; se detiene solo al callar o pulsa de nuevo.');
    });
  }).catch(function(e){cur=null;var m=(e&&e.name==='NotAllowedError')?'No hay permiso para usar el micrófono. Puedes escribir la consulta.':(e&&e.name==='NotFoundError')?'No encuentro ningún micrófono.':'No se pudo iniciar el dictado integrado: '+(e&&e.message||e);cb.state('error',m);});
};
})();
