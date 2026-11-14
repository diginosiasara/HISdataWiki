/* HISdata Wiki · motor matemático y estadístico (sin dependencias) */
(function(){
'use strict';
var M={};
/* ---------- utilidades ---------- */
M.fmt=function(x,sig){
  if(typeof x!=='number')return String(x);
  if(!isFinite(x))return isNaN(x)?'Error':(x>0?'∞':'−∞');
  sig=sig||10;
  var ax=Math.abs(x);
  if(ax!==0&&(ax>=1e12||ax<1e-7)){var e=x.toExponential(Math.min(sig-1,9)).replace(/\.?0+e/,'e').replace('e+','e');return e.replace('.',',').replace('e',' ×10^');}
  var s=String(parseFloat(x.toPrecision(sig)));
  if(s.indexOf('e')>=0)s=x.toFixed(10).replace(/\.?0+$/,'');
  return s.replace('.',',');
};
M.round=function(x,d){var f=Math.pow(10,d);return Math.round((x+Number.EPSILON)*f)/f;};
M.parseNumbers=function(text){
  var out=[];
  String(text||'').replace(/−/g,'-').split(/[\s;]+/).forEach(function(t){
    if(!t)return; t=t.replace(/,/g,'.');
    var v=Number(t); if(t!==''&&isFinite(v))out.push(v);
  });
  return out;
};
/* ---------- funciones especiales ---------- */
function lgamma(x){
  var c=[76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5];
  var y=x,t=x+5.5; t-=(x+0.5)*Math.log(t); var s=1.000000000190015;
  for(var j=0;j<6;j++)s+=c[j]/++y;
  return -t+Math.log(2.5066282746310005*s/x);
}
function betacf(a,b,x){
  var m,m2,aa,c,d,del,h,qab=a+b,qap=a+1,qam=a-1; c=1; d=1-qab*x/qap; if(Math.abs(d)<1e-30)d=1e-30; d=1/d; h=d;
  for(m=1;m<=300;m++){m2=2*m;aa=m*(b-m)*x/((qam+m2)*(a+m2));d=1+aa*d;if(Math.abs(d)<1e-30)d=1e-30;c=1+aa/c;if(Math.abs(c)<1e-30)c=1e-30;d=1/d;h*=d*c;
    aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));d=1+aa*d;if(Math.abs(d)<1e-30)d=1e-30;c=1+aa/c;if(Math.abs(c)<1e-30)c=1e-30;d=1/d;del=d*c;h*=del;if(Math.abs(del-1)<3e-12)break;}
  return h;
}
function betai(a,b,x){
  if(x<=0)return 0; if(x>=1)return 1;
  var bt=Math.exp(lgamma(a+b)-lgamma(a)-lgamma(b)+a*Math.log(x)+b*Math.log(1-x));
  return x<(a+1)/(a+b+2)?bt*betacf(a,b,x)/a:1-bt*betacf(b,a,1-x)/b;
}
function gammp(a,x){
  if(x<=0)return 0; var gln=lgamma(a),i,sum,del,ap,b,c,d,h;
  if(x<a+1){ap=a;del=sum=1/a;for(i=0;i<500;i++){ap++;del*=x/ap;sum+=del;if(Math.abs(del)<Math.abs(sum)*1e-13)break;}return sum*Math.exp(-x+a*Math.log(x)-gln);}
  b=x+1-a;c=1/1e-30;d=1/b;h=d;for(i=1;i<500;i++){var an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<1e-30)d=1e-30;c=b+an/c;if(Math.abs(c)<1e-30)c=1e-30;d=1/d;del=d*c;h*=del;if(Math.abs(del-1)<1e-13)break;}
  return 1-Math.exp(-x+a*Math.log(x)-gln)*h;
}
M.erfc=function(x){var z=Math.abs(x),t=1/(1+0.5*z);
  var r=t*Math.exp(-z*z-1.26551223+t*(1.00002368+t*(0.37409196+t*(0.09678418+t*(-0.18628806+t*(0.27886807+t*(-1.13520398+t*(1.48851587+t*(-0.82215223+t*0.17087277)))))))));
  return x>=0?r:2-r;};
M.normCdf=function(z){return 0.5*M.erfc(-z/Math.SQRT2);};
M.normPdf=function(z){return Math.exp(-z*z/2)/Math.sqrt(2*Math.PI);};
M.normInv=function(p){
  if(p<=0)return -Infinity; if(p>=1)return Infinity;
  var a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239],
      b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572],
      c=[-0.007784894002430293,-0.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783],
      d=[0.007784695709041462,0.3224671290700398,2.445134137142996,3.754408661907416],pl=0.02425,q,r,x;
  if(p<pl){q=Math.sqrt(-2*Math.log(p));x=(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  else if(p<=1-pl){q=p-0.5;r=q*q;x=(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);}
  else{q=Math.sqrt(-2*Math.log(1-p));x=-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  for(var i=0;i<2;i++){var e=M.normCdf(x)-p,u=e*Math.sqrt(2*Math.PI)*Math.exp(x*x/2);x=x-u/(1+x*u/2);}
  return x;
};
M.tCdf=function(t,v){var x=v/(v+t*t),p=0.5*betai(v/2,0.5,x);return t>0?1-p:p;};
M.tPdf=function(t,v){return Math.exp(lgamma((v+1)/2)-lgamma(v/2))/Math.sqrt(v*Math.PI)*Math.pow(1+t*t/v,-(v+1)/2);};
function bisect(f,lo,hi,target){for(var i=0;i<200;i++){var mid=(lo+hi)/2;if(f(mid)<target)lo=mid;else hi=mid;}return (lo+hi)/2;}
M.tInv=function(p,v){if(p<=0)return -Infinity;if(p>=1)return Infinity;return bisect(function(t){return M.tCdf(t,v);},-1e4,1e4,p);};
M.chi2Cdf=function(x,v){return x<=0?0:gammp(v/2,x/2);};
M.chi2Pdf=function(x,v){if(x<=0)return 0;return Math.exp((v/2-1)*Math.log(x)-x/2-(v/2)*Math.log(2)-lgamma(v/2));};
M.chi2Inv=function(p,v){if(p<=0)return 0;if(p>=1)return Infinity;return bisect(function(x){return M.chi2Cdf(x,v);},0,1e5,p);};
M.expCdf=function(x,lam){return x<=0?0:1-Math.exp(-lam*x);};
M.fact=function(n){if(n<0||Math.floor(n)!==n)return NaN;if(n>170)return Infinity;var r=1;for(var i=2;i<=n;i++)r*=i;return r;};
M.nCr=function(n,r){if(r<0||r>n)return 0;r=Math.min(r,n-r);var x=1;for(var i=1;i<=r;i++)x=x*(n-r+i)/i;return Math.round(x);};
M.nPr=function(n,r){if(r<0||r>n)return 0;var x=1;for(var i=0;i<r;i++)x*=(n-i);return x;};
/* ---------- estadística descriptiva ---------- */
M.sum=function(a){var s=0;for(var i=0;i<a.length;i++)s+=a[i];return s;};
M.mean=function(a){return M.sum(a)/a.length;};
M.sorted=function(a){return a.slice().sort(function(x,y){return x-y;});};
M.median=function(a){var s=M.sorted(a),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2;};
M.modes=function(a){var c={},mx=0;a.forEach(function(x){c[x]=(c[x]||0)+1;if(c[x]>mx)mx=c[x];});
  return {freq:mx,values:Object.keys(c).filter(function(k){return c[k]===mx;}).map(Number).sort(function(x,y){return x-y;}),all:!(mx===1)};};
M.variance=function(a,ddof){var m=M.mean(a),s=0;a.forEach(function(x){s+=(x-m)*(x-m);});return s/(a.length-(ddof||0));};
M.sd=function(a,ddof){return Math.sqrt(M.variance(a,ddof));};
/* cuartiles: 'curso' = N·k/4 promediando posiciones vecinas; 'lineal' = interpolación */
M.quantile=function(a,k,method){
  var s=M.sorted(a),n=s.length,p=n*k/4;
  if(method==='lineal'){var h=(n-1)*k/4,lo=Math.floor(h),hi=Math.ceil(h);return s[lo]+(s[hi]-s[lo])*(h-lo);}
  if(Number.isInteger(p))return (s[p-1]+s[Math.min(p,n-1)])/2;
  return (s[Math.floor(p)-1]+s[Math.ceil(p)-1])/2;
};
M.describe=function(a,opt){
  opt=opt||{};var ddof=opt.ddof?1:0,n=a.length,s=M.sorted(a);
  var q1=M.quantile(a,1,opt.qm),q2=M.median(a),q3=M.quantile(a,3,opt.qm),m=M.mean(a),sd=M.sd(a,ddof);
  var m3=0;a.forEach(function(x){m3+=Math.pow(x-m,3);});var sdp=M.sd(a,0);
  return {n:n,sum:M.sum(a),mean:m,median:q2,mode:M.modes(a),min:s[0],max:s[n-1],range:s[n-1]-s[0],q1:q1,q2:q2,q3:q3,iqr:q3-q1,
    variance:M.variance(a,ddof),sd:sd,cv:m!==0?sd/Math.abs(m)*100:NaN,skew:sdp>0?(m3/n)/Math.pow(sdp,3):0,sorted:s,ddof:ddof,
    fences:{lo:q1-1.5*(q3-q1),hi:q3+1.5*(q3-q1)}};
};
M.freqTable=function(a,opt){
  opt=opt||{};var n=a.length,s=M.sorted(a),mn=s[0],mx=s[n-1],R=mx-mn;
  var discrete=a.every(Number.isInteger)&&new Set(a).size<=12&&!opt.force;
  var rows=[],F=0,cum=0;
  if(discrete&&!opt.grouped){var keys=Array.from(new Set(s));keys.forEach(function(k){var f=a.filter(function(x){return x===k;}).length;F+=f;rows.push({label:String(k),c:k,f:f,h:f/n,F:F,H:F/n});});
    return {kind:'discreta',rows:rows,n:n,R:R};}
  var k=opt.k||Math.max(1,Math.floor(1+3.332*Math.log10(n)));
  var w=opt.w||Math.max(1,Math.ceil(R/k)),start=opt.start!==undefined?opt.start:Math.floor(mn);
  while(start+k*w<=mx)k++;
  for(var i=0;i<k;i++){var lo=start+i*w,hi=lo+w,last=i===k-1;
    var f=a.filter(function(x){return x>=lo&&(x<hi||(last&&x<=hi));}).length;F+=f;
    rows.push({label:'['+M.fmt(lo)+', '+M.fmt(hi)+(last?']':')'),lo:lo,hi:hi,c:(lo+hi)/2,f:f,h:f/n,F:F,H:F/n});}
  return {kind:'agrupada',rows:rows,n:n,R:R,k:k,w:w,start:start,kRaw:1+3.332*Math.log10(n)};
};
M.zscores=function(a,ddof){var m=M.mean(a),sd=M.sd(a,ddof||0);return a.map(function(x){return (x-m)/sd;});};
/* ---------- intérprete de expresiones (sin eval) ---------- */
M.env={ans:0,mem:0,datos:[],deg:true};
function tokenize(src){
  src=src.replace(/\s+/g,' ').replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/π/g,'pi').replace(/√/g,'sqrt').replace(/\*\*/g,'^');
  var t=[],i=0,m;
  while(i<src.length){
    var c=src[i];
    if(c===' '){i++;continue;}
    if(m=/^(\d+([.,]\d+)?|[.,]\d+)(e[+-]?\d+)?/i.exec(src.slice(i))){t.push({t:'n',v:parseFloat(m[0].replace(',','.'))});i+=m[0].length;continue;}
    if(m=/^[a-zA-Záéíóúñ_][a-zA-Z0-9_áéíóúñ]*/.exec(src.slice(i))){t.push({t:'i',v:m[0].toLowerCase()});i+=m[0].length;continue;}
    if(c===','&&src[i+1]===' '){t.push({t:';'});i+=2;continue;}
    if(c===';'){t.push({t:';'});i++;continue;}
    if('+-*/^()!%'.indexOf(c)>=0){t.push({t:c});i++;continue;}
    throw new Error('Carácter no válido: '+c);
  }
  return t;
}
function flat(args){var o=[];args.forEach(function(a){if(Array.isArray(a))a.forEach(function(x){o.push(x);});else o.push(a);});return o;}
var FN={
  sqrt:function(a){return Math.sqrt(a[0]);},cbrt:function(a){return Math.cbrt(a[0]);},abs:function(a){return Math.abs(a[0]);},exp:function(a){return Math.exp(a[0]);},
  ln:function(a){return Math.log(a[0]);},log:function(a){return Math.log10(a[0]);},log2:function(a){return Math.log2(a[0]);},logb:function(a){return Math.log(a[0])/Math.log(a[1]);},
  floor:function(a){return Math.floor(a[0]);},ceil:function(a){return Math.ceil(a[0]);},round:function(a){return a.length>1?M.round(a[0],a[1]):Math.round(a[0]);},
  fact:function(a){return M.fact(a[0]);},ncr:function(a){return M.nCr(a[0],a[1]);},npr:function(a){return M.nPr(a[0],a[1]);},pow:function(a){return Math.pow(a[0],a[1]);},
  sin:function(a){return Math.sin(M.env.deg?a[0]*Math.PI/180:a[0]);},cos:function(a){return Math.cos(M.env.deg?a[0]*Math.PI/180:a[0]);},tan:function(a){return Math.tan(M.env.deg?a[0]*Math.PI/180:a[0]);},
  asin:function(a){var r=Math.asin(a[0]);return M.env.deg?r*180/Math.PI:r;},acos:function(a){var r=Math.acos(a[0]);return M.env.deg?r*180/Math.PI:r;},atan:function(a){var r=Math.atan(a[0]);return M.env.deg?r*180/Math.PI:r;},
  sinh:function(a){return Math.sinh(a[0]);},cosh:function(a){return Math.cosh(a[0]);},tanh:function(a){return Math.tanh(a[0]);},
  sum:function(a){return M.sum(flat(a));},suma:function(a){return M.sum(flat(a));},prod:function(a){return flat(a).reduce(function(x,y){return x*y;},1);},
  mean:function(a){return M.mean(flat(a));},media:function(a){return M.mean(flat(a));},median:function(a){return M.median(flat(a));},mediana:function(a){return M.median(flat(a));},
  moda:function(a){return M.modes(flat(a)).values[0];},max:function(a){return Math.max.apply(null,flat(a));},min:function(a){return Math.min.apply(null,flat(a));},
  rango:function(a){var f=flat(a);return Math.max.apply(null,f)-Math.min.apply(null,f);},
  varp:function(a){return M.variance(flat(a),0);},var:function(a){return M.variance(flat(a),1);},varianza:function(a){return M.variance(flat(a),0);},
  sdp:function(a){return M.sd(flat(a),0);},sd:function(a){return M.sd(flat(a),1);},desv:function(a){return M.sd(flat(a),0);},
  q1:function(a){return M.quantile(flat(a),1);},q3:function(a){return M.quantile(flat(a),3);},iqr:function(a){var f=flat(a);return M.quantile(f,3)-M.quantile(f,1);},
  z:function(a){return (a[0]-a[1])/a[2];},normcdf:function(a){return M.normCdf((a[0]-(a[1]||0))/(a.length>2?a[2]:1));},norminv:function(a){return (a[1]||0)+(a.length>2?a[2]:1)*M.normInv(a[0]);},
  expcdf:function(a){return M.expCdf(a[0],1/a[1]);},tcdf:function(a){return M.tCdf(a[0],a[1]);},tinv:function(a){return M.tInv(a[0],a[1]);},
  chi2cdf:function(a){return M.chi2Cdf(a[0],a[1]);},chi2inv:function(a){return M.chi2Inv(a[0],a[1]);},rad:function(a){return a[0]*Math.PI/180;},grad:function(a){return a[0]*180/Math.PI;}
};
M.functions=Object.keys(FN);
M.evaluate=function(src){
  var tk=tokenize(src),pos=0;
  function peek(){return tk[pos];}function eat(t){if(tk[pos]&&tk[pos].t===t){return tk[pos++];}return null;}
  function expr(){var v=term();for(;;){if(eat('+'))v+=term();else if(eat('-'))v-=term();else break;}return v;}
  function term(){var v=unary();for(;;){var p=peek();if(!p)break;
      if(eat('*')){v*=unary();}else if(eat('/')){v/=unary();}
      else if(p.t==='n'||p.t==='i'||p.t==='('){v*=unary();} else break;}return v;}
  function unary(){if(eat('-'))return -unary();if(eat('+'))return unary();return power();}
  function power(){var b=post();if(eat('^')){return Math.pow(b,unary());}return b;}
  function post(){var v=primary();for(;;){if(eat('!'))v=M.fact(v);else if(eat('%'))v=v/100;else break;}return v;}
  function primary(){
    var p=peek();if(!p)throw new Error('Expresión incompleta');
    if(p.t==='n'){pos++;return p.v;}
    if(p.t==='('){pos++;var v=expr();if(!eat(')'))throw new Error('Falta cerrar paréntesis');return v;}
    if(p.t==='i'){pos++;var nm=p.v;
      if(peek()&&peek().t==='('){pos++;var args=[];if(!(peek()&&peek().t===')')){do{args.push(exprOrList());}while(eat(';'));}if(!eat(')'))throw new Error('Falta cerrar paréntesis');
        var f=FN[nm];if(!f)throw new Error('Función desconocida: '+nm);var r=f(args);return r;}
      if(nm==='pi')return Math.PI;if(nm==='e')return Math.E;if(nm==='ans')return M.env.ans;if(nm==='m'||nm==='mem')return M.env.mem;
      if(nm==='datos')return M.env.datos;
      throw new Error('Nombre desconocido: '+nm);}
    throw new Error('Símbolo inesperado');
  }
  function exprOrList(){var v=expr();return v;}
  var r=expr();if(pos<tk.length)throw new Error('Sobra algo al final de la expresión');
  if(Array.isArray(r))throw new Error('El resultado es una lista');
  return r;
};
window.HISMath=M;
})();
