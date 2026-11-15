/* HISdata Voice · números hablados en español -> cifras ("cuatro coma cinco" -> "4,5").
   Los motores de voz sin conexión devuelven palabras; la calculadora necesita cifras. */
(function(root){
'use strict';
function n(s){return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
var U={cero:0,uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9};
var SP={diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veintiuno:21,veintiun:21,veintiuna:21,veintidos:22,veintitres:23,veinticuatro:24,veinticinco:25,veintiseis:26,veintisiete:27,veintiocho:28,veintinueve:29};
var T={treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90};
var H={cien:100,ciento:100,doscientos:200,doscientas:200,trescientos:300,trescientas:300,cuatrocientos:400,cuatrocientas:400,quinientos:500,quinientas:500,seiscientos:600,seiscientas:600,setecientos:700,setecientas:700,ochocientos:800,ochocientas:800,novecientos:900,novecientas:900};
function under1000(t,i){
  var v=0,j=i,got=false;
  if(H[t[j]]!==undefined){v+=H[t[j]];j++;got=true;}
  if(SP[t[j]]!==undefined){v+=SP[t[j]];j++;got=true;}
  else if(T[t[j]]!==undefined){v+=T[t[j]];j++;got=true;if(t[j]==='y'&&(U[t[j+1]]>0||t[j+1]==='un'||t[j+1]==='una')){v+=(t[j+1]==='un'||t[j+1]==='una')?1:U[t[j+1]];j+=2;}}
  else if(U[t[j]]!==undefined&&(!got||H[t[i]]!==undefined)&&U[t[j]]>0){v+=U[t[j]];j++;got=true;}
  else if(!got&&U[t[j]]===0){v=0;j++;got=true;}
  return got?{v:v,next:j}:null;
}
function parse(t,i){
  var a=under1000(t,i);
  if(t[a?a.next:i]==='mil'){var m=a?a.v:1,j=(a?a.next:i)+1,b=under1000(t,j);return {v:m*1000+(b?b.v:0),next:b?b.next:j};}
  if(!a&&t[i]==='mil')return {v:1000,next:i+1};
  return a;
}
function fmt(v){return String(v);}
root.numbers=function(text){
  var raw=String(text).split(/\s+/).filter(Boolean),t=raw.map(function(w){return n(w).replace(/[.,;:!?¿¡"()]/g,'');}),out=[],i=0;
  while(i<raw.length){
    var neg=false,k=i;
    if(t[k]==='menos'&&k+1<raw.length){var tt=parse(t,k+1);if(tt){neg=true;k=k+1;}}
    var r=parse(t,k);
    if(r){
      var s=fmt(r.v),j=r.next;
      if((t[j]==='coma'||t[j]==='punto')&&j+1<raw.length){
        var d=parse(t,j+1);
        if(d){var ds;var run=[],q=j+1;while(t[q]!==undefined&&U[t[q]]!==undefined){run.push(U[t[q]]);q++;}
          if(run.length>1){ds=run.join('');j=q;}else{ds=fmt(d.v);j=d.next;}
          s=s+','+ds;}
      }
      out.push((neg?'-':'')+s);i=j;continue;
    }
    out.push(raw[i]);i++;
  }
  return out.join(' ');
};
if(typeof module!=='undefined'&&module.exports)module.exports=root;
})(typeof window!=='undefined'?(window.HISVoiceNumbers=window.HISVoiceNumbers||{}):{});
