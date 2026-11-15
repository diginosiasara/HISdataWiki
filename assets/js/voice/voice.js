/* HISdata Voice · dictado (STT) y lectura en voz alta (TTS) con el control en manos del usuario */
(function(){
'use strict';
var V=window.HISVoice={},SR=window.SpeechRecognition||window.webkitSpeechRecognition,TTS=window.speechSynthesis;
V.supportsSTT=!!SR;V.supportsTTS=!!TTS;
var LS='his-voice-v1',S={rate:1,voice:''};try{var sv=JSON.parse(localStorage.getItem(LS)||'{}');for(var k in sv)S[k]=sv[k];}catch(e){}
function save(){try{localStorage.setItem(LS,JSON.stringify(S));}catch(e){}}
V.settings=S;V.save=save;
/* vocabulario sanitario y estadístico: solo sustituye frases completas habituales */
var VOC=[[/\b(c ?m ?b ?d|ce eme be de|cemebede)\b/gi,'CMBD'],[/\b(g ?r ?d|ge erre de)\b/gi,'GRD'],[/\b(h ?c ?e|hache ce e)\b/gi,'HCE'],[/\bcie ?(10|diez)( ?es)?\b/gi,'CIE-10-ES'],[/\bdesviación estándar\b/gi,'desviación típica'],[/\bpoa\b/gi,'POA'],[/\bsis\b/gi,'SIS'],[/\brgpd\b/gi,'RGPD']];
V.correct=function(t){VOC.forEach(function(v){t=t.replace(v[0],v[1]);});return t;};
/* ---------- dictado: motor integrado (sin conexión) o reconocimiento del navegador ---------- */
V.fix=function(t){t=V.correct(t);return (window.HISVoiceNumbers?HISVoiceNumbers.numbers(t):t);};
var rec=null,listening=false,using=null;
V.consent=function(){try{return sessionStorage.getItem('his-voice-ok')==='1';}catch(e){return false;}};
V.giveConsent=function(){try{sessionStorage.setItem('his-voice-ok','1');}catch(e){}};
V.listening=function(){return listening||!!(window.HISVoiceOffline&&HISVoiceOffline.listening());};
V.stopDictation=function(){if(rec&&listening)rec.stop();if(window.HISVoiceOffline)HISVoiceOffline.stop();};
V.engineLabel=function(id){return id==='embedded'?'motor integrado (sin conexión)':id==='browser'?'reconocimiento del navegador':'no disponible';};
V.NOENGINE='El dictado por voz no está disponible en este navegador. Puedes usar el dictado del sistema (Windows: tecla Windows + H; Mac: pulsa dos veces Fn; Android e iOS: el micrófono del teclado) o escribir la consulta.';
/* qué motores hay: el integrado solo si sus archivos están en modelos-ia/speech-to-text/vosk/ */
V.engines=function(){var O=window.HISVoiceOffline;return (O?O.available():Promise.resolve(false)).then(function(e){return {embedded:!!e,browser:!!SR};});};
V.pickEngine=function(){var pref=S.engine||'auto';return V.engines().then(function(e){
  if(pref==='browser')return e.browser?'browser':(e.embedded?'embedded':null);
  if(pref==='embedded')return e.embedded?'embedded':(e.browser?'browser':null);
  return e.embedded?'embedded':(e.browser?'browser':null);});};
function browserDictate(cb){
  if(!SR){cb.state('unsupported',V.NOENGINE);return;}
  if(listening){rec.stop();return;}
  rec=new SR();rec.lang='es-ES';rec.interimResults=true;rec.continuous=false;rec.maxAlternatives=1;var final='',err=false,started=false,wd=setTimeout(function(){if(!started){err=true;listening=false;try{rec.abort();}catch(e){}cb.state('error','El reconocimiento de voz del navegador no se ha iniciado. '+V.NOENGINE);}},5000);
  rec.onstart=function(){started=true;clearTimeout(wd);listening=true;cb.state('listening','Escuchando con el reconocimiento del navegador. Habla ahora; pulsa de nuevo para detener.');};
  rec.onresult=function(e){var t='';for(var i=0;i<e.results.length;i++){t+=e.results[i][0].transcript;if(e.results[i].isFinal)final=t;}cb.text(V.fix(t),false);};
  rec.onerror=function(e){clearTimeout(wd);listening=false;err=true;var m={'not-allowed':'No hay permiso para usar el micrófono. Puedes escribir la consulta.','service-not-allowed':'Este navegador no permite el reconocimiento de voz aquí. '+V.NOENGINE,'language-not-supported':'El reconocimiento de voz del navegador no admite el español en este equipo. '+V.NOENGINE,'no-speech':'No he oído nada. Inténtalo de nuevo.','audio-capture':'No encuentro ningún micrófono.','network':'No hay conexión con el servicio de reconocimiento del navegador. '+V.NOENGINE,'aborted':'Dictado detenido.'}[e.error]||('Error de reconocimiento: '+e.error);cb.state('error',m);};
  rec.onend=function(){clearTimeout(wd);listening=false;if(!started&&err)return;var t=V.fix((final||'').trim());if(t){cb.text(t,true);cb.state('done','Transcripción disponible. Revisa el texto y pulsa Enviar.');}else if(!err)cb.state('idle','Micrófono desactivado.');};
  try{rec.start();}catch(e){cb.state('error','No se pudo iniciar el micrófono.');}
}
V.dictate=function(cb){
  if(V.listening()){V.stopDictation();return;}
  V.pickEngine().then(function(id){
    if(!id){cb.state('unsupported',V.NOENGINE);return;}
    using=id;if(cb.engine)cb.engine(id);
    if(id==='embedded'){
      var failed=false,cb2={text:cb.text,state:function(s,m){if(s==='error'&&SR&&/No se pudo iniciar el dictado integrado/.test(m)){failed=true;cb.state('loading','El motor integrado no arrancó; uso el del navegador.');if(cb.engine)cb.engine('browser');browserDictate(cb);return;}cb.state(s,m);}};
      HISVoiceOffline.dictate(cb2,V.fix);
    }else browserDictate(cb);
  });
};
V.engineUsed=function(){return using;};
/* ---------- lectura ---------- */
V.clean=function(t){return String(t).replace(/\[\[l:[^|\]]*\|([^\]]*)\]\]/g,'$1').replace(/\[\[act:[^\]]*\]\]/g,'').replace(/\*\*/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[•·]/g,', ').replace(/\s*\n+\s*/g,'. ').replace(/\s+/g,' ').trim();};
V.voices=function(){return TTS?TTS.getVoices().filter(function(v){return /^es/i.test(v.lang);}):[];};
var queue=[],speaking=false,onEnd=null;
function pickVoice(){var vs=V.voices();return vs.filter(function(v){return v.name===S.voice;})[0]||vs.filter(function(v){return /es-ES/i.test(v.lang);})[0]||vs[0]||null;}
function next(){if(!queue.length){speaking=false;onEnd&&onEnd();return;}var u=new SpeechSynthesisUtterance(queue.shift());u.lang='es-ES';u.rate=S.rate;var v=pickVoice();if(v)u.voice=v;u.onend=next;u.onerror=function(){speaking=false;};TTS.speak(u);}
V.speak=function(text,end){if(!TTS)return false;V.stop();var t=V.clean(text);queue=t.match(/[^.!?;:]+[.!?;:]?/g)||[t];queue=queue.map(function(s){return s.trim();}).filter(Boolean);onEnd=end;speaking=true;next();return true;};
V.stop=function(){if(!TTS)return;queue=[];speaking=false;TTS.cancel();};
V.pause=function(){TTS&&TTS.pause();};V.resume=function(){TTS&&TTS.resume();};
V.isSpeaking=function(){return speaking;};
})();
