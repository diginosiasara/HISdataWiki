/* HISdata Wiki · asistente (chat con avatar), calculadora científica, datos y distribuciones */
(function(){
'use strict';
if(window.__hisAssistant||!window.HISMath)return; window.__hisAssistant=true;
var M=window.HISMath,doc=document;
var sc=doc.currentScript||[].slice.call(doc.scripts).filter(function(s){return /his\.assistant\.js/.test(s.src);})[0];
var BASE=sc?sc.src.replace(/assets\/js\/his\.assistant\.js.*$/,''):'';
var LS='his-asst-v1',S={mode:'local',key:'',model:'claude-haiku-5-5',endpoint:'',tab:'chat',wide:false};
try{var sv=JSON.parse(localStorage.getItem(LS)||'{}');for(var k in sv)S[k]=sv[k];}catch(e){}
function save(){try{localStorage.setItem(LS,JSON.stringify(S));}catch(e){}}
function $(s,r){return (r||doc).querySelector(s);}
function el(tag,attrs,kids){var e=doc.createElement(tag);attrs=attrs||{};for(var k in attrs){if(k==='class')e.className=attrs[k];else if(k==='html')e.innerHTML=attrs[k];else if(k==='text')e.textContent=attrs[k];else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),attrs[k]);else e.setAttribute(k,attrs[k]);}
  (kids||[]).forEach(function(c){if(c)e.appendChild(typeof c==='string'?doc.createTextNode(c):c);});return e;}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function norm(s){return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
var f=M.fmt,f4=function(x){return M.fmt(x,6);};

/* ---------- datos de ejemplo del curso ---------- */
var PRESETS={
 glucosa:{n:'Glucosa en ayunas (25 pacientes, mg/dL)',d:[92,105,110,92,99,95,92,108,110,92,97,103,92,94,100,105,112,103,99,90,93,105,105,100,96]},
 presion:{n:'Presión sistólica (20 pacientes, mmHg)',d:[120.5,125.3,118.2,132.8,128.4,124.6,121.7,130.2,115.9,129.1,122.4,127.5,119.8,126.3,131.7,117.5,123.4,128.9,125.6,120.2]},
 colesterol:{n:'Colesterol (25 pacientes, mg/dL)',d:[190,202,185,210,198,205,192,200,188,215,195,207,183,203,211,189,197,204,206,193,208,187,199,212,194]},
 estaturas:{n:'Estaturas pediátricas (22 pacientes, cm)',d:[121,115,120,109,125,124,109,113,109,116,111,115,123,116,124,119,100,124,116,120,116,109]},
 consultas:{n:'Consultas al año (30 personas)',d:[0,3,2,0,2,1,4,0,3,0,1,2,4,0,3,2,0,1,3,2,2,2,3,4,0,2,3,2,1,0]}
};
/* ---------- gráficos SVG ---------- */
function svgHist(rows,W,H){
  var mx=Math.max.apply(null,rows.map(function(r){return r.f;}))||1,pl=34,pb=34,pt=10,pr=8,bw=(W-pl-pr)/rows.length,s='<svg viewBox="0 0 '+W+' '+H+'" class="hx-svg" role="img" aria-label="Histograma de frecuencias">';
  for(var i=0;i<=mx;i++){var y=pt+(H-pt-pb)*(1-i/mx);s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" class="hx-grid"/><text x="'+(pl-6)+'" y="'+(y+3)+'" text-anchor="end" class="hx-t">'+i+'</text>';if(mx>10)i+=Math.floor(mx/5);}
  rows.forEach(function(r,i){var h=(H-pt-pb)*r.f/mx,x=pl+i*bw;s+='<rect x="'+(x+1)+'" y="'+(H-pb-h)+'" width="'+(bw-2)+'" height="'+h+'" class="hx-bar"><title>'+esc(r.label)+': '+r.f+'</title></rect><text x="'+(x+bw/2)+'" y="'+(H-pb+13)+'" text-anchor="middle" class="hx-t hx-tx">'+esc(rows.length>8?String(r.c):r.label)+'</text>';
    if(r.f)s+='<text x="'+(x+bw/2)+'" y="'+(H-pb-h-3)+'" text-anchor="middle" class="hx-t hx-tv">'+r.f+'</text>';});
  var pts=rows.map(function(r,i){return (pl+i*bw+bw/2)+','+(H-pb-(H-pt-pb)*r.f/mx);}).join(' ');
  s+='<polyline points="'+pts+'" class="hx-poly"/></svg>';return s;
}
function svgBox(d,W,H){
  var lo=Math.min(d.min,d.fences.lo),hi=Math.max(d.max,d.fences.hi),pad=(d.max-d.min)*0.08||1,a=d.min-pad,b=d.max+pad,pl=12,pr=12,cy=H/2-6,bh=34;
  function X(v){return pl+(W-pl-pr)*(v-a)/(b-a);}
  var wl=d.sorted.filter(function(v){return v>=d.fences.lo;})[0],wh=d.sorted.filter(function(v){return v<=d.fences.hi;}).pop();
  var s='<svg viewBox="0 0 '+W+' '+H+'" class="hx-svg" role="img" aria-label="Diagrama de cajas">';
  s+='<line x1="'+X(wl)+'" x2="'+X(d.q1)+'" y1="'+cy+'" y2="'+cy+'" class="hx-whisk"/><line x1="'+X(d.q3)+'" x2="'+X(wh)+'" y1="'+cy+'" y2="'+cy+'" class="hx-whisk"/>';
  s+='<line x1="'+X(wl)+'" x2="'+X(wl)+'" y1="'+(cy-9)+'" y2="'+(cy+9)+'" class="hx-whisk"/><line x1="'+X(wh)+'" x2="'+X(wh)+'" y1="'+(cy-9)+'" y2="'+(cy+9)+'" class="hx-whisk"/>';
  s+='<rect x="'+X(d.q1)+'" y="'+(cy-bh/2)+'" width="'+Math.max(2,X(d.q3)-X(d.q1))+'" height="'+bh+'" class="hx-box"/><line x1="'+X(d.q2)+'" x2="'+X(d.q2)+'" y1="'+(cy-bh/2)+'" y2="'+(cy+bh/2)+'" class="hx-med"/>';
  d.sorted.forEach(function(v){if(v<d.fences.lo||v>d.fences.hi)s+='<circle cx="'+X(v)+'" cy="'+cy+'" r="3.5" class="hx-out"><title>Atípico: '+f(v)+'</title></circle>';});
  [[d.min,'mín'],[d.q1,'Q1'],[d.q2,'Q2'],[d.q3,'Q3'],[d.max,'máx']].forEach(function(p,i){s+='<text x="'+X(p[0])+'" y="'+(cy+bh/2+16+(i%2)*11)+'" text-anchor="middle" class="hx-t">'+p[1]+' '+f(M.round(p[0],2))+'</text>';});
  return s+'</svg>';
}
function svgCurve(pdf,dom,shade,W,H,disc){
  var pl=10,pr=10,pt=10,pb=22,N=160,xs=[],ys=[],mx=0,i,x;
  for(i=0;i<=N;i++){x=dom[0]+(dom[1]-dom[0])*i/N;var y=pdf(x);if(!isFinite(y))y=0;xs.push(x);ys.push(y);if(y>mx)mx=y;}
  mx=mx||1;function X(v){return pl+(W-pl-pr)*(v-dom[0])/(dom[1]-dom[0]);}function Y(v){return pt+(H-pt-pb)*(1-v/(mx*1.08));}
  var s='<svg viewBox="0 0 '+W+' '+H+'" class="hx-svg" role="img" aria-label="Curva de densidad">';
  if(shade){var a=Math.max(shade[0],dom[0]),b=Math.min(shade[1],dom[1]),pts='M'+X(a)+','+Y(0);
    for(i=0;i<=N;i++){if(xs[i]>=a&&xs[i]<=b)pts+=' L'+X(xs[i])+','+Y(ys[i]);}pts+=' L'+X(b)+','+Y(0)+' Z';s+='<path d="'+pts+'" class="hx-shade"/>';}
  s+='<polyline class="hx-curve" points="'+xs.map(function(v,i){return X(v)+','+Y(ys[i]);}).join(' ')+'"/><line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(0)+'" y2="'+Y(0)+'" class="hx-axis"/>';
  for(i=0;i<=4;i++){var v=dom[0]+(dom[1]-dom[0])*i/4;s+='<text x="'+X(v)+'" y="'+(H-6)+'" text-anchor="middle" class="hx-t">'+f(M.round(v,2))+'</text>';}
  return s+'</svg>';
}
/* ---------- tablas ---------- */
function tableHTML(head,rows){return '<div class="hx-tw"><table class="hx-table"><thead><tr>'+head.map(function(h){return '<th>'+h+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+r.map(function(c,i){return (i?'<td>':'<th scope="row">')+c+(i?'</td>':'</th>');}).join('')+'</tr>';}).join('')+'</tbody></table></div>';}
/* ---------- panel ---------- */
var AV=BASE+'assets/img/avatar-ia-128.webp',AV2=BASE+'assets/img/avatar-ia-384.webp';
var root=el('div',{class:'hx','data-open':'0'});
var fab=el('button',{class:'hx-fab',type:'button','aria-label':'Abrir asistente IA y calculadora','aria-expanded':'false',title:'Asistente IA · calculadora'},[el('img',{src:AV,alt:'',width:'64',height:'64'}),el('span',{class:'hx-fab-dot','aria-hidden':'true'})]);
var calcFab=el('button',{class:'hx-calcfab',type:'button','aria-label':'Abrir calculadora científica',title:'Calculadora científica',text:'🧮'});
var panel=el('section',{class:'hx-panel',role:'dialog','aria-label':'Asistente de HISdata Wiki',hidden:''});
var head=el('header',{class:'hx-head'},[el('img',{src:AV2,alt:'',width:'44',height:'44',class:'hx-ava'}),
  el('div',{class:'hx-ht'},[el('strong',{text:'Asistente HISdata'}),el('small',{id:'hx-sub',text:'Consulta la wiki y calcula'})]),
  el('button',{type:'button',class:'hx-ib','aria-label':'Ampliar o reducir',title:'Ampliar',text:'⤢',onclick:function(){S.wide=!S.wide;save();layout();}}),
  el('button',{type:'button',class:'hx-ib','aria-label':'Cerrar',title:'Cerrar (Esc)',text:'✕',onclick:function(){setOpen(false);}})]);
var tabs=el('nav',{class:'hx-tabs',role:'tablist','aria-label':'Herramientas'});
var TABS=[['chat','💬 Chat'],['calc','🧮 Calculadora'],['datos','📊 Datos'],['dist','📈 Distribuciones']];
var views={};
TABS.forEach(function(t){var b=el('button',{type:'button',role:'tab',class:'hx-tab','data-t':t[0],text:t[1],onclick:function(){setTab(t[0]);}});tabs.appendChild(b);views[t[0]]=el('div',{class:'hx-view',role:'tabpanel','data-v':t[0],hidden:''});});
panel.appendChild(head);panel.appendChild(tabs);TABS.forEach(function(t){panel.appendChild(views[t[0]]);});
root.appendChild(calcFab);root.appendChild(fab);root.appendChild(panel);
function layout(){panel.classList.toggle('hx-wide',!!S.wide);}
function setOpen(o){root.setAttribute('data-open',o?'1':'0');panel.hidden=!o;fab.setAttribute('aria-expanded',o?'true':'false');if(o){setTab(S.tab||'chat');loadKB();}else fab.focus();}
function setTab(t){S.tab=t;save();TABS.forEach(function(x){var on=x[0]===t;views[x[0]].hidden=!on;$('.hx-tab[data-t="'+x[0]+'"]',tabs).setAttribute('aria-selected',on?'true':'false');});
  if(t==='chat'){var i=$('#hx-in');i&&setTimeout(function(){i.focus();},30);}if(t==='calc'){var c=$('#hx-expr');c&&setTimeout(function(){c.focus();},30);}}
fab.addEventListener('click',function(){setOpen(root.getAttribute('data-open')!=='1');});
calcFab.addEventListener('click',function(){S.wide=true;layout();setOpen(true);setTab('calc');});
doc.addEventListener('keydown',function(e){if(e.key==='Escape'&&root.getAttribute('data-open')==='1')setOpen(false);if((e.ctrlKey||e.metaKey)&&e.key==='/'){e.preventDefault();setOpen(true);setTab('chat');}});

/* ======== CHAT ======== */
var KB=null,KBloading=false,msgs=[];
function loadKB(cb){if(KB||KBloading){cb&&cb();return;}KBloading=true;var s=doc.createElement('script');s.src=BASE+'assets/js/kb.js';s.onload=function(){KB=window.HIS_KB||[];buildIdx();cb&&cb();};s.onerror=function(){KB=[];buildIdx();cb&&cb();};doc.head.appendChild(s);}
var STOP=new Set('el la los las un una unos unas de del al y o u en a por para con sin que es son se su sus lo le les como mas muy ya si no ni qu cual cuales cuando donde hay ser esta este estos estas eso esa ese puede pueden tiene tienen sobre entre desde hasta me mi te tu nos'.split(' '));
function stem(w){return w.length>6?w.slice(0,6):w;}
function toks(s){return norm(s).replace(/[^a-z0-9ñ ]+/g,' ').split(/\s+/).filter(function(w){return w&&!STOP.has(w)&&(w.length>1||/\d/.test(w));}).map(stem);}
var IDX=null,DF={};
function buildIdx(){IDX=KB.map(function(c){var tf={};function add(arr,w){arr.forEach(function(t){tf[t]=(tf[t]||0)+w;});}add(toks(c.p),3);add(toks(c.h),2.5);add(toks(c.t),1);return {c:c,tf:tf,len:Math.sqrt(Object.keys(tf).length)+1};});
  IDX.forEach(function(x){for(var t in x.tf)DF[t]=(DF[t]||0)+1;});}
function search(q,n){if(!IDX)return [];var qt=toks(q);if(!qt.length)return [];var N=IDX.length;
  return IDX.map(function(x){var sc=0;qt.forEach(function(t){if(x.tf[t])sc+=Math.log(1+N/(DF[t]||1))*(1+Math.log(1+x.tf[t]));});return {c:x.c,s:sc/Math.pow(x.len,0.35)};}).filter(function(r){return r.s>0;}).sort(function(a,b){return b.s-a.s;}).slice(0,n||4);}
function snippet(c,q){var sents=c.t.replace(/\s+/g,' ').split(/(?<=[.!?:])\s+/),qt=toks(q);
  var sc=sents.map(function(s,i){var st=toks(s),m=0;qt.forEach(function(t){if(st.indexOf(t)>=0)m++;});return {s:s,i:i,m:m};});
  var best=sc.slice().sort(function(a,b){return b.m-a.m||a.i-b.i;})[0];var out=[best];var nx=sc[best.i+1];if(nx&&nx.m>=0)out.push(nx);
  out.sort(function(a,b){return a.i-b.i;});var t=out.map(function(o){return o.s;}).join(' ');return t.length>460?t.slice(0,457)+'…':t;}
function link(u,t){return '['+t+']('+BASE+u+')';}

function present(r){var A=r.analysis;return A;}
function statLines(a,name,which,opt){
  var d=M.describe(a,opt||{ddof:0}),o=[];
  var L={media:'Media = '+f4(d.sum)+' / '+d.n+' = **'+f4(d.mean)+'**',mediana:'Mediana = **'+f4(d.median)+'** ('+(d.n%2?'valor central':'media de los dos centrales')+')',
    moda:'Moda = **'+d.mode.values.map(f4).join(', ')+'**'+(d.mode.all?' (aparece '+d.mode.freq+' veces)':' (todos los valores aparecen una vez)'),
    rango:'Rango = '+f4(d.max)+' − '+f4(d.min)+' = **'+f4(d.range)+'**',cuartiles:'Q1 = **'+f4(d.q1)+'**, Q2 = **'+f4(d.q2)+'**, Q3 = **'+f4(d.q3)+'**, IQR = **'+f4(d.iqr)+'**',
    varianza:'Varianza (÷'+(d.ddof?'n−1':'n')+') = **'+f4(d.variance)+'**',desviacion:'Desviación típica = **'+f4(d.sd)+'**'};
  var order=which&&which.length?which:['media','mediana','moda','rango','cuartiles','varianza','desviacion'];
  o.push('**'+(name||'Datos')+'** · n = '+d.n);order.forEach(function(k){o.push('• '+L[k]);});
  return o.join('\n');
}
function numsIn(q){return (q.match(/-?\d+(?:[.,]\d+)?/g)||[]).map(function(x){return parseFloat(x.replace(',','.'));});}
function numAfter(q,re,span){q=norm(q);var m=new RegExp('(?:'+re+')[^0-9\\-]{0,'+(span||16)+'}(-?\\d+(?:[.,]\\d+)?)','i').exec(q);return m?parseFloat(m[1].replace(',','.')):null;}
function condOf(qn){if(/(entre)\s+-?\d/.test(qn))return 'between';if(/(mas de|mayor|supere|superior|exceda|>|por encima|despues de|tarde)/.test(qn))return 'gt';if(/(menos de|menor|inferior|<|antes|por debajo|dentro de|en menos|como maximo|maximo)/.test(qn))return 'lt';return null;}
function tryCompute(q){
  var qn=norm(q);
  /* conjunto de datos del curso */
  var dsKey=null;if(/gluc/.test(qn))dsKey='glucosa';else if(/(presion|sistolic|tension)/.test(qn)&&!/exponencial|normal\b/.test(qn))dsKey='presion';else if(/colester/.test(qn))dsKey='colesterol';else if(/estatur|altura|pediatric/.test(qn))dsKey='estaturas';else if(/consultas/.test(qn)&&!/historia/.test(qn))dsKey='consultas';
  var want=[];if(/\bmedia\b|promedio/.test(qn))want.push('media');if(/mediana/.test(qn))want.push('mediana');if(/\bmoda\b/.test(qn))want.push('moda');if(/rango/.test(qn)&&!/intercuart/.test(qn))want.push('rango');if(/cuartil|\bq[123]\b|iqr|intercuart/.test(qn))want.push('cuartiles');if(/varianza/.test(qn))want.push('varianza');if(/desviacion|desv\b|sigma/.test(qn))want.push('desviacion');
  var ddof=/n\s?-\s?1|n−1|muestral/.test(qn)?1:0;
  var nums=numsIn(q);
  /* z */
  if(/(puntuacion z|\bz\b|tipific)/.test(qn)&&nums.length>=3){var mu=numAfter(q,'media|mu|μ'),sg=numAfter(q,'desv\\w*|sigma|σ|sd|tipica');var x=numAfter(q,'\\bz\\b(?: de| para)?|valor|dato|de');
    if(mu!==null&&sg!==null){var rest=nums.filter(function(v){return v!==mu&&v!==sg;});x=rest.length?rest[0]:x;if(x!==null){var z=(x-mu)/sg;return '**Puntuación z**\nz = (x − μ) / σ = ('+f4(x)+' − '+f4(mu)+') / '+f4(sg)+' = **'+f4(z)+'**\nEl dato está a '+f4(Math.abs(z))+' desviaciones típicas '+(z<0?'por debajo':z>0?'por encima':'—justo en—')+' de la media.';}}}
  /* exponencial */
  if(/exponencial/.test(qn)&&nums.length>=2){var mu2=numAfter(q,'media|mu|μ|promedio|cada|tarda');var lam=numAfter(q,'lambda|λ|decaimiento');if(mu2===null&&lam)mu2=1/lam;
    var c=condOf(qn);var xs=nums.filter(function(v){return v!==mu2;});
    if(mu2&&c&&xs.length){var L=1/mu2,p,txt;if(c==='between'&&xs.length>=2){var a=Math.min(xs[0],xs[1]),b=Math.max(xs[0],xs[1]);p=Math.exp(-L*a)-Math.exp(-L*b);txt='P('+a+' < X < '+b+') = e^(−λ·'+a+') − e^(−λ·'+b+') = **'+f4(p)+'**';}
      else if(c==='gt'){p=Math.exp(-L*xs[0]);txt='P(X > '+xs[0]+') = e^(−λx) = e^(−'+f4(L)+'·'+xs[0]+') = **'+f4(p)+'**';}else{p=1-Math.exp(-L*xs[0]);txt='P(X < '+xs[0]+') = 1 − e^(−λx) = 1 − e^(−'+f4(L)+'·'+xs[0]+') = **'+f4(p)+'**';}
      return '**Distribución exponencial** (media μ = '+f4(mu2)+')\nλ = 1/μ = '+f4(L)+'\n'+txt+' → **'+f4(p*100)+' %**';}}
  /* normal */
  if(/\bnormal\b/.test(qn)&&nums.length>=3){var m3=numAfter(q,'media|mu|μ'),s3=numAfter(q,'desv\\w*|sigma|σ|sd'),c3=condOf(qn);var xs3=nums.filter(function(v){return v!==m3&&v!==s3;});
    if(m3!==null&&s3&&c3&&xs3.length){var res;if(c3==='between'&&xs3.length>=2){var a3=Math.min(xs3[0],xs3[1]),b3=Math.max(xs3[0],xs3[1]);res=M.normCdf((b3-m3)/s3)-M.normCdf((a3-m3)/s3);return '**Normal N('+f4(m3)+', '+f4(s3)+')**\nz₁ = '+f4((a3-m3)/s3)+' · z₂ = '+f4((b3-m3)/s3)+'\nP('+a3+' < X < '+b3+') = **'+f4(res)+'** ('+f4(res*100)+' %)';}
      var z3=(xs3[0]-m3)/s3;res=c3==='gt'?1-M.normCdf(z3):M.normCdf(z3);return '**Normal N('+f4(m3)+', '+f4(s3)+')**\nz = ('+xs3[0]+' − '+f4(m3)+') / '+f4(s3)+' = '+f4(z3)+'\nP(X '+(c3==='gt'?'>':'<')+' '+xs3[0]+') = **'+f4(res)+'** ('+f4(res*100)+' %)';}}
  /* intervalo de confianza */
  if(/(intervalo de confianza|\bic\b)/.test(qn)&&nums.length>=3){var xm=numAfter(q,'media|x̄'),sd4=numAfter(q,'desv\\w*|sigma|σ|sd'),nn=numAfter(q,'\\bn\\b|tamano|muestra');var lm=/(\d+(?:[.,]\d+)?)\s*%/.exec(q)||/nivel[^0-9]{0,12}(\d+(?:[.,]\d+)?)/i.exec(norm(q));var lvl=lm?parseFloat(lm[1].replace(',','.')):95;if(lvl<50||lvl>=100)lvl=95;
    if(xm!==null&&sd4&&nn){var zc=M.normInv(1-(1-lvl/100)/2),se=sd4/Math.sqrt(nn);return '**IC '+lvl+' % para la media**\nz = '+f4(zc)+' · error estándar = σ/√n = '+f4(sd4)+'/√'+nn+' = '+f4(se)+'\nIC = '+f4(xm)+' ± '+f4(zc)+' · '+f4(se)+' = **['+f4(xm-zc*se)+' ; '+f4(xm+zc*se)+']**';}}
  /* datasets */
  if(dsKey&&(want.length||/describ|resumen|estadistic|analiza|todo|calcula/.test(qn))){var P=PRESETS[dsKey];return statLines(P.d,P.n,want,{ddof:ddof})+'\n\n[[act:datos:'+dsKey+']]';}
  /* estadísticos con números dados */
  if(want.length&&nums.length>=3&&!/\bn\s*=/.test(qn)){return statLines(nums,'Tus '+nums.length+' datos',want,{ddof:ddof})+'\n\n[[act:datos:custom:'+nums.join(' ')+']]';}
  if(/(describ|resumen estad|estadisticos).*\d/.test(qn)&&nums.length>=3){return statLines(nums,'Tus '+nums.length+' datos',[],{ddof:ddof});}
  /* expresión matemática */
  var ex=q.replace(/^(calcula|calcular|cuanto es|cuánto es|resuelve|evalua|evalúa)[:\s]*/i,'').replace(/[?=]+$/,'').trim();
  if(/^[\d\s+\-*/^().,;!%a-zA-Záéíóúñπ√×÷−_]+$/.test(ex)&&/\d/.test(ex)&&(/[+\-*/^!%√×÷]|\(/.test(ex))){try{var v=M.evaluate(ex);if(!isNaN(v)||isFinite(v))return '**'+esc(ex.replace(/\*/g,'×'))+'** = **'+f(v)+'**';}catch(e){}}
  return null;
}
function convoQ(qn){
  if(/^(hola|buenas|hey|buenos dias|buenas tardes|buenas noches|ey)\b/.test(qn))return '¡Hola! Soy el asistente de HISdata. Puedo **buscar en la wiki**, **calcular** (medias, varianza, z, probabilidades, intervalos de confianza…) y abrirte la **calculadora científica**. ¿Qué necesitas?';
  if(/^(gracias|muchas gracias|vale gracias|perfecto|genial)/.test(qn))return '¡De nada! Si quieres, pregúntame otra cosa o abre la pestaña de datos.';
  if(/(quien eres|que eres|que puedes|ayuda|como funcionas|que sabes)/.test(qn))return 'Soy un asistente que **busca en el contenido de la wiki** (estadística, probabilidad, SIS, CMBD, GRD, calidad) y **resuelve cálculos**. Prueba con:\n• «¿Qué es la mediana?»\n• «Media y desviación de 4 6 8 10»\n• «z de 115 con media 121 y desviación 7»\n• «Exponencial media 6, probabilidad de menos de 3»\n• «Funciones de la historia clínica»\nEn el modo IA (⚙) puedo razonar con más libertad usando tu clave de Claude.';
  return null;
}
function renderMd(t){
  var h=esc(t).replace(/\[\[act:([^\]]+)\]\]/g,function(_,a){var p=a.split(':');return '<button type="button" class="hx-act" data-act="'+esc(a)+'">'+(p[0]==='datos'?'Abrir en la pestaña Datos':'Abrir')+'</button>';})
   .replace(/\[([^\]]+)\]\(([^)]+)\)/g,function(_,tx,u){return '<a href="'+u+'">'+tx+'</a>';}).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
  return h;
}
function addMsg(who,text,html){var m=el('div',{class:'hx-msg hx-'+who});var b=el('div',{class:'hx-bub'});b.innerHTML=html||renderMd(text);m.appendChild(b);$('#hx-log').appendChild(m);var lg=$('#hx-log');lg.scrollTop=lg.scrollHeight;return b;}
function localAnswer(q){
  var qn=norm(q);var c=convoQ(qn);if(c)return c;var calc=tryCompute(q);if(calc)return calc;
  var res=search(q,4);
  if(!res.length||res[0].s<2.2){return 'No encuentro nada claro sobre eso en la wiki. Prueba con otras palabras (por ejemplo «varianza», «historia clínica», «CMBD», «GRD») o usa el [buscador]('+BASE+'recursos/buscar.html). También puedo calcular: «media de 4 6 8» o «z de 115 con media 121 y desviación 7».';}
  var top=res[0].c,out='**'+(top.h===top.p?top.p:top.h+'** · '+top.p+'**'.slice(0,0))+(top.h===top.p?'**':'')+'\n'+snippet(top,q);
  var seen={},src=[];res.forEach(function(r){var k=r.c.u;if(seen[k])return;seen[k]=1;src.push(link(r.c.u,r.c.h===r.c.p?r.c.p:r.c.p+' › '+r.c.h));});
  out+='\n\n**Dónde leer más:** '+src.slice(0,3).join(' · ');return out;
}
function iaAnswer(q,done,fail){
  var ctx=search(q,5).map(function(r,i){return '['+(i+1)+'] '+r.c.p+' › '+r.c.h+' ('+BASE+r.c.u+')\n'+r.c.t;}).join('\n\n');
  var system='Eres el asistente de HISdata Wiki, una wiki de estudio de estadística sanitaria, sistemas de información sanitaria (SIS), CMBD, sistemas de clasificación de pacientes (GRD) y calidad asistencial, para estudiantes de documentación sanitaria. Responde SIEMPRE en español, de forma clara y breve, con pasos de cálculo cuando proceda. Usa el contexto de la wiki cuando sea pertinente y menciona las páginas. Criterio del curso: la varianza se divide entre n. Si no estás seguro de un dato, dilo. Contexto de la wiki:\n\n'+ctx;
  var hist=msgs.slice(-8).map(function(m){return {role:m.role,content:m.content};});
  var url=S.endpoint||'https://api.anthropic.com/v1/messages';
  fetch(url,{method:'POST',headers:{'content-type':'application/json','x-api-key':S.key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:S.model,max_tokens:900,system:system,messages:hist})})
   .then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error((j.error&&j.error.message)||('HTTP '+r.status));return j;});})
   .then(function(j){var t=(j.content||[]).map(function(b){return b.text||'';}).join('').trim()||(j.answer||'');if(!t)throw new Error('Respuesta vacía');done(t);}).catch(function(e){fail(e);});
}
function ask(q){
  q=q.trim();if(!q)return;addMsg('me',q);msgs.push({role:'user',content:q});
  var run=function(){
    var calc=tryCompute(q);
    if(S.mode==='ia'&&S.key&&!calc&&!convoQ(norm(q))){var b=addMsg('bot','Pensando…');iaAnswer(q,function(t){b.innerHTML=renderMd(t);msgs.push({role:'assistant',content:t});var lg=$('#hx-log');lg.scrollTop=lg.scrollHeight;},function(e){var a=localAnswer(q);b.innerHTML=renderMd('⚠️ No pude usar la IA ('+e.message+'). Respuesta local:\n\n'+a);msgs.push({role:'assistant',content:a});});return;}
    var a=localAnswer(q);addMsg('bot',a);msgs.push({role:'assistant',content:a});
  };
  if(!KB)loadKB(run);else run();
}
function buildChat(){
  var v=views.chat;v.innerHTML='';
  var set=el('div',{class:'hx-set',hidden:''});
  set.innerHTML='<h4>Modo del asistente</h4><label class="hx-r"><input type="radio" name="hxm" value="local"> <span><b>Local</b> (sin conexión): busca en la wiki y calcula.</span></label><label class="hx-r"><input type="radio" name="hxm" value="ia"> <span><b>IA (Claude)</b>: respuestas generadas con el contexto de la wiki.</span></label>'+
   '<div class="hx-iaf"><label>Clave de API de Anthropic<input id="hx-key" type="password" autocomplete="off" placeholder="sk-ant-…"></label><label>Modelo<select id="hx-model"><option value="claude-haiku-5-5">claude-haiku-5-5 (rápido)</option><option value="claude-sonnet-5-5">claude-sonnet-5-5 (equilibrado)</option><option value="claude-opus-5-5">claude-opus-5-5 (máxima calidad)</option></select></label><label>Endpoint propio (opcional)<input id="hx-ep" type="url" placeholder="https://… (proxy compatible)"></label>'+
   '<p class="hx-warn">La clave se guarda solo en este navegador (localStorage) y se envía directamente a la API. No la uses en un ordenador compartido. Con un proxy propio puedes evitar exponerla.</p></div><button type="button" class="hx-btn" id="hx-saveset">Guardar</button>';
  var log=el('div',{class:'hx-log',id:'hx-log','aria-live':'polite'});
  var chips=el('div',{class:'hx-chips'});
  ['¿Qué es la mediana?','Media y desviación de 4 6 8 10 12','z de 115 con media 121 y desviación 7','Exponencial media 6, menos de 3','Funciones de la historia clínica','¿Qué es el CMBD?','Calcula la media de la glucosa'].forEach(function(t){chips.appendChild(el('button',{type:'button',class:'hx-chip',text:t,onclick:function(){ask(t);}}));});
  var form=el('form',{class:'hx-form',onsubmit:function(e){e.preventDefault();var i=$('#hx-in');var q=i.value;i.value='';ask(q);}},[el('input',{id:'hx-in',type:'text',placeholder:'Pregunta o calcula…','aria-label':'Escribe tu pregunta',autocomplete:'off'}),el('button',{type:'submit',class:'hx-send','aria-label':'Enviar',text:'➤'}),
    el('button',{type:'button',class:'hx-ib2','aria-label':'Ajustes del asistente',title:'Ajustes (modo IA)',text:'⚙',onclick:function(){set.hidden=!set.hidden;}}),el('button',{type:'button',class:'hx-ib2','aria-label':'Limpiar chat',title:'Limpiar',text:'🧹',onclick:function(){msgs=[];log.innerHTML='';hello();}})]);
  v.appendChild(set);v.appendChild(log);v.appendChild(chips);v.appendChild(form);
  function hello(){addMsg('bot','¡Hola! Pregúntame sobre el temario de la wiki o pídeme un cálculo. Estoy en modo **'+(S.mode==='ia'&&S.key?'IA':'local')+'**.');}
  hello();
  var radios=set.querySelectorAll('input[name=hxm]');radios.forEach(function(r){r.checked=r.value===S.mode;});$('#hx-key',set).value=S.key||'';$('#hx-model',set).value=S.model;$('#hx-ep',set).value=S.endpoint||'';
  $('#hx-saveset',set).addEventListener('click',function(){radios.forEach(function(r){if(r.checked)S.mode=r.value;});S.key=$('#hx-key',set).value.trim();S.model=$('#hx-model',set).value;S.endpoint=$('#hx-ep',set).value.trim();if(S.mode==='ia'&&!S.key){S.mode='local';radios.forEach(function(r){r.checked=r.value==='local';});addMsg('bot','Para el modo IA necesito una clave. De momento sigo en modo **local**.');}else addMsg('bot','Ajustes guardados. Modo **'+(S.mode==='ia'?'IA':'local')+'**.');save();set.hidden=true;$('#hx-sub').textContent=S.mode==='ia'?'Modo IA · Claude':'Consulta la wiki y calcula';});
  $('#hx-sub').textContent=S.mode==='ia'&&S.key?'Modo IA · Claude':'Consulta la wiki y calcula';
  v.addEventListener('click',function(e){var b=e.target.closest('.hx-act');if(!b)return;var p=b.getAttribute('data-act').split(':');if(p[0]==='datos'){setTab('datos');if(p[1]==='custom')loadData(null,p.slice(2).join(':'));else loadData(p[1]);}});
  v.addEventListener('click',function(e){var a=e.target.closest('a');if(a&&a.getAttribute('href'))setOpen(false);});
}

/* ======== CALCULADORA ======== */
var hist=[];
function buildCalc(){
  var v=views.calc;v.innerHTML='';
  var disp=el('div',{class:'hx-disp'},[el('input',{id:'hx-expr',type:'text',class:'hx-expr','aria-label':'Expresión',placeholder:'p. ej. sqrt(2)*sin(30)+nCr(5; 2)',autocomplete:'off',spellcheck:'false'}),el('div',{class:'hx-res',id:'hx-res','aria-live':'polite',text:'0'})]);
  var info=el('div',{class:'hx-mini'},[el('span',{id:'hx-mode',text:'DEG'}),el('span',{id:'hx-memi',text:'M: 0'}),el('span',{id:'hx-dat',text:'datos: 0'})]);
  var pad=el('div',{class:'hx-pad'});
  var keys=[['DEG','mode','fn'],['MC','mc','fn'],['MR','mr','fn'],['M+','mp','fn'],['M−','mm','fn'],
   ['sin','sin(','fn'],['cos','cos(','fn'],['tan','tan(','fn'],['ln','ln(','fn'],['log','log(','fn'],
   ['asin','asin(','fn'],['acos','acos(','fn'],['atan','atan(','fn'],['eˣ','e^(','fn'],['10ˣ','10^(','fn'],
   ['x²','^2','fn'],['xʸ','^','fn'],['√','sqrt(','fn'],['n!','!','fn'],['1/x','1/(','fn'],
   ['(','(','op'],[')',')','op'],['π','pi','fn'],['e','e','fn'],['⌫','bs','ctl'],
   ['7','7','num'],['8','8','num'],['9','9','num'],['÷','/','op'],['C','clr','ctl'],
   ['4','4','num'],['5','5','num'],['6','6','num'],['×','*','op'],['Ans','ans','fn'],
   ['1','1','num'],['2','2','num'],['3','3','num'],['−','-','op'],['nCr','nCr(','fn'],
   ['0','0','num'],[',',',','num'],['%','%','op'],['+','+','op'],['=','eq','eq']];
  keys.forEach(function(k){pad.appendChild(el('button',{type:'button',class:'hx-k hx-k-'+k[2],'data-k':k[1],text:k[0],'aria-label':({bs:'Borrar',clr:'Borrar todo',eq:'Calcular'})[k[1]]||k[0]}));});
  var fnsel=el('select',{class:'hx-fnsel','aria-label':'Insertar función',onchange:function(){if(this.value){ins(this.value+'(');this.value='';}}});fnsel.appendChild(el('option',{value:'',text:'ƒ  Más funciones…'}));
  ['mean','median','moda','sum','prod','max','min','rango','var','varp','sd','sdp','q1','q3','iqr','z','normcdf','norminv','expcdf','tcdf','tinv','chi2cdf','chi2inv','nPr','pow','logb','log2','cbrt','abs','round','floor','ceil','exp','sinh','cosh','tanh','rad','grad'].forEach(function(n){fnsel.appendChild(el('option',{value:n,text:n}));});
  var hl=el('div',{class:'hx-hist',id:'hx-hist','aria-label':'Historial'});
  var help=el('details',{class:'hx-help'},[el('summary',{text:'Ayuda y atajos'}),el('div',{html:'<p>Separa argumentos con <b>;</b> o con «, » (coma y espacio). La coma sin espacio es decimal: <code>1,5</code>.</p><p>Con la pestaña <b>Datos</b> cargas una lista y la usas como <code>datos</code>: <code>mean(datos)</code>, <code>sdp(datos)</code>, <code>z(115; mean(datos); sdp(datos))</code>.</p><p>Varianza del curso: <code>varp</code> / <code>sdp</code> (÷ n). Muestral: <code>var</code> / <code>sd</code> (÷ n−1).</p><p>Probabilidad: <code>normcdf(x; μ; σ)</code>, <code>norminv(p; μ; σ)</code>, <code>expcdf(x; media)</code>, <code>tinv(0,975; gl)</code>.</p>'})]);
  v.appendChild(disp);v.appendChild(info);v.appendChild(pad);v.appendChild(fnsel);v.appendChild(hl);v.appendChild(help);
  var inp=$('#hx-expr',v);
  function ins(t){var s=inp.selectionStart,e=inp.selectionEnd;if(s===null||s===undefined){s=e=inp.value.length;}inp.value=inp.value.slice(0,s)+t+inp.value.slice(e);var p=s+t.length;inp.focus();inp.setSelectionRange(p,p);preview();}
  function preview(){var r=$('#hx-res',v);if(!inp.value.trim()){r.textContent='0';r.className='hx-res';return;}try{r.textContent=f(M.evaluate(inp.value));r.className='hx-res';}catch(e){r.textContent='…';r.className='hx-res hx-dim';}}
  function eq(){var s=inp.value.trim();if(!s)return;var r=$('#hx-res',v);try{var val=M.evaluate(s);M.env.ans=val;r.textContent=f(val);r.className='hx-res hx-ok';hist.unshift({e:s,r:f(val)});hist=hist.slice(0,10);rh();inp.value='';}catch(e){r.textContent='Error: '+e.message;r.className='hx-res hx-err';}}
  function rh(){hl.innerHTML=hist.map(function(h,i){return '<button type="button" class="hx-h" data-i="'+i+'"><span>'+esc(h.e)+'</span><b>= '+esc(h.r)+'</b></button>';}).join('')||'<span class="hx-dim">El historial aparecerá aquí.</span>';}
  rh();
  function mi(){$('#hx-memi',v).textContent='M: '+f(M.env.mem);$('#hx-mode',v).textContent=M.env.deg?'DEG':'RAD';$('#hx-dat',v).textContent='datos: '+M.env.datos.length;var m=$('.hx-k[data-k=mode]',v);m.textContent=M.env.deg?'DEG':'RAD';}
  pad.addEventListener('click',function(e){var b=e.target.closest('.hx-k');if(!b)return;var k=b.getAttribute('data-k');
    if(k==='eq')eq();else if(k==='clr'){inp.value='';preview();}else if(k==='bs'){var s=inp.selectionStart;if(s>0){inp.value=inp.value.slice(0,s-1)+inp.value.slice(inp.selectionEnd);inp.setSelectionRange(s-1,s-1);}preview();inp.focus();}
    else if(k==='mode'){M.env.deg=!M.env.deg;mi();preview();}else if(k==='mc'){M.env.mem=0;mi();}else if(k==='mr')ins('m');
    else if(k==='mp'||k==='mm'){try{var val=inp.value.trim()?M.evaluate(inp.value):M.env.ans;M.env.mem+=(k==='mp'?val:-val);}catch(er){}mi();}
    else if(k==='ans')ins('ans');else ins(k);});
  inp.addEventListener('input',preview);inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();eq();}});
  hl.addEventListener('click',function(e){var b=e.target.closest('.hx-h');if(!b)return;inp.value=hist[+b.getAttribute('data-i')].e;inp.focus();preview();});
  v.__mi=mi;mi();
}

/* ======== DATOS ======== */
var curData=[];
function buildDatos(){
  var v=views.datos;v.innerHTML='';
  var sel=el('select',{id:'hx-pre','aria-label':'Conjunto de datos del curso'});sel.appendChild(el('option',{value:'',text:'— Conjunto del curso —'}));Object.keys(PRESETS).forEach(function(k){sel.appendChild(el('option',{value:k,text:PRESETS[k].n}));});
  var ta=el('textarea',{id:'hx-ta',rows:'2',placeholder:'Pega tus datos separados por espacios, saltos de línea o «;» (92 105 110…). Decimales con coma o punto.','aria-label':'Datos'});
  var opt=el('div',{class:'hx-opts'},[el('label',{},['Varianza ÷ ',el('select',{id:'hx-dd'},[el('option',{value:'0',text:'n (criterio del curso)'}),el('option',{value:'1',text:'n−1 (muestral)'})])]),el('label',{},['Cuartiles ',el('select',{id:'hx-qm'},[el('option',{value:'curso',text:'método del curso'}),el('option',{value:'lineal',text:'interpolación'})])]),el('label',{},['Intervalos ',el('select',{id:'hx-gr'},[el('option',{value:'auto',text:'automático'}),el('option',{value:'disc',text:'valores sueltos'}),el('option',{value:'agr',text:'agrupados (Sturges)'})])])]);
  var go=el('button',{type:'button',class:'hx-btn',text:'Analizar',onclick:function(){run();}});
  var out=el('div',{id:'hx-dout',class:'hx-out'});
  v.appendChild(sel);v.appendChild(ta);v.appendChild(opt);v.appendChild(el('div',{class:'hx-row'},[go,el('button',{type:'button',class:'hx-btn hx-btn2',text:'Usar como «datos» en la calculadora',onclick:function(){var a=M.parseNumbers(ta.value);M.env.datos=a;curData=a;views.calc.__mi&&views.calc.__mi();toast('«datos» = lista de '+a.length+' valores');}}),el('button',{type:'button',class:'hx-btn hx-btn2',text:'Copiar resumen',onclick:function(){var t=out.innerText;navigator.clipboard&&navigator.clipboard.writeText(t);toast('Copiado');}})]));v.appendChild(out);
  sel.addEventListener('change',function(){if(sel.value)loadData(sel.value);});
  function run(){
    var a=M.parseNumbers(ta.value);if(a.length<2){out.innerHTML='<p class="hx-dim">Introduce al menos 2 números.</p>';return;}
    curData=a;M.env.datos=a;views.calc.__mi&&views.calc.__mi();
    var d=M.describe(a,{ddof:+$('#hx-dd').value,qm:$('#hx-qm').value}),g=$('#hx-gr').value;
    var ft=M.freqTable(a,g==='disc'?{grouped:false,force:true}:g==='agr'?{grouped:true}:{});if(g==='disc'&&ft.kind!=='discreta'){ft=M.freqTable(a,{});}
    var dec=d.ddof?'n−1':'n';
    var kp=[['n',d.n],['Suma',f4(d.sum)],['Media',f4(d.mean)],['Mediana',f4(d.median)],['Moda',d.mode.values.slice(0,3).map(f4).join(', ')+(d.mode.all?'':' (sin moda)')],['Mínimo',f4(d.min)],['Máximo',f4(d.max)],['Rango',f4(d.range)],['Q1',f4(d.q1)],['Q3',f4(d.q3)],['IQR',f4(d.iqr)],['Varianza (÷'+dec+')',f4(d.variance)],['Desv. típica',f4(d.sd)],['CV',f4(d.cv)+' %'],['Asimetría',f4(d.skew)],['Atípicos',d.sorted.filter(function(x){return x<d.fences.lo||x>d.fences.hi;}).length]];
    var h='<div class="hx-kpis">'+kp.map(function(k){return '<div class="hx-kpi"><span>'+k[0]+'</span><b>'+k[1]+'</b></div>';}).join('')+'</div>';
    h+='<h4>Diagrama de cajas</h4>'+svgBox(d,420,110);
    h+='<h4>'+(ft.kind==='discreta'?'Tabla de frecuencias (datos discretos)':'Tabla de frecuencias · '+ft.k+' intervalos de amplitud '+f(ft.w)+' (k Sturges = '+f(M.round(ft.kRaw,2))+')')+'</h4>'+tableHTML([ft.kind==='discreta'?'Valor':'Intervalo','Marca','fᵢ','hᵢ','Fᵢ','Hᵢ'],ft.rows.map(function(r){return [esc(r.label),f(M.round(r.c,3)),r.f,f(M.round(r.h,4)),r.F,f(M.round(r.H,4))];}).concat([['Total','',ft.n,'1','','']]));
    h+='<h4>'+(ft.kind==='discreta'?'Diagrama de barras con polígono':'Histograma con polígono de frecuencias')+'</h4>'+svgHist(ft.rows,420,200);
    h+='<details class="hx-steps"><summary>Cómo se calcula</summary><div>'+
     '<p><b>Media</b> = Σx / n = '+f4(d.sum)+' / '+d.n+' = '+f4(d.mean)+'</p><p><b>Varianza</b> = Σ(xᵢ − x̄)² / '+dec+' = '+f4(d.variance*(d.n-d.ddof))+' / '+(d.n-d.ddof)+' = '+f4(d.variance)+'</p><p><b>Desviación</b> = √varianza = √'+f4(d.variance)+' = '+f4(d.sd)+'</p>'+
     '<p><b>Posición Q1</b> = N/4 = '+f(d.n/4)+' · <b>Q3</b> = 3N/4 = '+f(3*d.n/4)+(+$('#hx-qm').value?'':'')+'</p><p><b>IQR</b> = Q3 − Q1 = '+f4(d.q3)+' − '+f4(d.q1)+' = '+f4(d.iqr)+'</p><p>Valores atípicos fuera de ['+f4(d.fences.lo)+' ; '+f4(d.fences.hi)+'] (Q1 − 1,5·IQR, Q3 + 1,5·IQR).</p></div></details>';
    var z=M.zscores(a,d.ddof);h+='<details class="hx-steps"><summary>Puntuaciones z de cada dato</summary>'+tableHTML(['Dato','z'],a.slice(0,60).map(function(x,i){return [f(x),f4(z[i])];}))+(a.length>60?'<p class="hx-dim">Se muestran los 60 primeros.</p>':'')+'</details>';
    out.innerHTML=h;
  }
  v.__run=run;
}
function loadData(key,text){var ta=$('#hx-ta');if(!ta)return;if(key==null&&text!=null)ta.value=text;else{ta.value=PRESETS[key].d.join(' ');$('#hx-pre').value=key;}views.datos.__run();}
/* ======== DISTRIBUCIONES ======== */
var DS={
 normal:{n:'Normal',f:[['mu','Media μ',128],['sg','Desviación σ',25]],t:[['lt','P(X ≤ x)',['x','x',140]],['gt','P(X > x)',['x','x',140]],['bw','P(a < X < b)',['a','a',100],['b','b',150]],['inv','Valor x con P(X ≤ x) = p',['p','p',0.975]]]},
 exp:{n:'Exponencial',f:[['mu','Media μ (1/λ)',6]],t:[['lt','P(X ≤ x)',['x','x',3]],['gt','P(X > x)',['x','x',9]],['bw','P(a < X < b)',['a','a',3],['b','b',9]]]},
 unif:{n:'Uniforme',f:[['a0','Mínimo a',0],['b0','Máximo b',60]],t:[['bw','P(x₁ ≤ X ≤ x₂)',['a','x₁',10],['b','x₂',25]]]},
 t:{n:'t de Student',f:[['gl','Grados de libertad',7]],t:[['lt','P(T ≤ t)',['x','t',2]],['gt','P(T > t)',['x','t',2]],['inv','Valor crítico con P(T ≤ t) = p',['p','p',0.975]]]},
 chi:{n:'Chi cuadrado',f:[['gl','Grados de libertad',1]],t:[['lt','P(χ² ≤ x)',['x','x',3.84]],['gt','P(χ² > x)',['x','x',3.84]],['inv','Valor crítico con P(χ² ≤ x) = p',['p','p',0.95]]]},
 ic:{n:'Intervalo de confianza (media)',f:[['xm','Media muestral x̄',154],['sg','Desviación (σ o s)',5],['n','Tamaño muestral n',52],['lv','Nivel de confianza %',95]],t:[['z','Con z (σ conocida)'],['t','Con t (s muestral)']]},
 suc:{n:'Probabilidad de sucesos',f:[['pa','P(A)',0.3],['pb','P(B)',0.2]],t:[['ind','Sucesos independientes']]}
};
function buildDist(){
  var v=views.dist;v.innerHTML='';
  var sel=el('select',{id:'hx-ds','aria-label':'Distribución'});Object.keys(DS).forEach(function(k){sel.appendChild(el('option',{value:k,text:DS[k].n}));});
  var form=el('div',{class:'hx-dform',id:'hx-dform'}),out=el('div',{class:'hx-out',id:'hx-dres'});
  v.appendChild(sel);v.appendChild(form);v.appendChild(out);
  function field(id,label,val){return '<label>'+label+'<input data-f="'+id+'" type="text" inputmode="decimal" value="'+val+'"></label>';}
  function render(){var d=DS[sel.value],h='<div class="hx-grid2">'+d.f.map(function(x){return field(x[0],x[1],x[2]);}).join('')+'</div>';
    h+='<label>Tipo de cálculo<select data-f="tipo">'+d.t.map(function(t,i){return '<option value="'+i+'">'+t[1]+'</option>';}).join('')+'</select></label><div class="hx-grid2" id="hx-tf"></div>';form.innerHTML=h;tf();$('[data-f=tipo]',form).addEventListener('change',function(){tf();calc();});form.addEventListener('input',calc);calc();}
  function tf(){var d=DS[sel.value],i=+$('[data-f=tipo]',form).value,t=d.t[i],h='';for(var j=2;j<t.length;j++)h+=field(t[j][0],t[j][1],t[j][2]);$('#hx-tf',form).innerHTML=h;}
  function val(id){var e=$('[data-f='+id+']',form);return e?parseFloat(String(e.value).replace(',','.')):NaN;}
  function calc(){
    var k=sel.value,d=DS[k],ti=+$('[data-f=tipo]',form).value,tk=d.t[ti][0],res=[],chart=null,p;
    try{
    if(k==='normal'){var mu=val('mu'),sg=val('sg');if(!(sg>0))throw 0;var pdf=function(x){return M.normPdf((x-mu)/sg)/sg;},dom=[mu-4*sg,mu+4*sg];
      if(tk==='lt'){var x=val('x'),z=(x-mu)/sg;p=M.normCdf(z);res.push('z = (x − μ)/σ = ('+f4(x)+' − '+f4(mu)+')/'+f4(sg)+' = <b>'+f4(z)+'</b>','P(X ≤ '+f4(x)+') = <b>'+f4(p)+'</b> ('+f4(p*100)+' %)');chart=[pdf,dom,[dom[0],x]];}
      else if(tk==='gt'){var x2=val('x'),z2=(x2-mu)/sg;p=1-M.normCdf(z2);res.push('z = <b>'+f4(z2)+'</b>','P(X > '+f4(x2)+') = 1 − Φ(z) = <b>'+f4(p)+'</b> ('+f4(p*100)+' %)');chart=[pdf,dom,[x2,dom[1]]];}
      else if(tk==='bw'){var a=val('a'),b=val('b');p=M.normCdf((b-mu)/sg)-M.normCdf((a-mu)/sg);res.push('z₁ = <b>'+f4((a-mu)/sg)+'</b> · z₂ = <b>'+f4((b-mu)/sg)+'</b>','P('+f4(a)+' < X < '+f4(b)+') = <b>'+f4(p)+'</b> ('+f4(p*100)+' %)');chart=[pdf,dom,[a,b]];}
      else{var pp=val('p'),zi=M.normInv(pp),xi=mu+sg*zi;res.push('z con Φ(z) = '+f4(pp)+' → <b>'+f4(zi)+'</b>','x = μ + z·σ = <b>'+f4(xi)+'</b>');chart=[pdf,dom,[dom[0],xi]];}
      res.push('Regla empírica: μ ± σ = ['+f4(mu-sg)+' ; '+f4(mu+sg)+'] (≈ 68 %) · μ ± 2σ = ['+f4(mu-2*sg)+' ; '+f4(mu+2*sg)+'] (≈ 95 %)');}
    else if(k==='exp'){var m=val('mu');if(!(m>0))throw 0;var L=1/m,pdf2=function(x){return x<0?0:L*Math.exp(-L*x);},dm=[0,m*5];
      res.push('λ = 1/μ = 1/'+f4(m)+' = <b>'+f4(L)+'</b>');
      if(tk==='lt'){var xa=val('x');p=M.expCdf(xa,L);res.push('P(X ≤ '+f4(xa)+') = 1 − e<sup>−λx</sup> = 1 − e<sup>−'+f4(L*xa)+'</sup> = <b>'+f4(p)+'</b> ('+f4(p*100)+' %)');chart=[pdf2,dm,[0,xa]];}
      else if(tk==='gt'){var xb=val('x');p=Math.exp(-L*xb);res.push('P(X > '+f4(xb)+') = e<sup>−λx</sup> = e<sup>−'+f4(L*xb)+'</sup> = <b>'+f4(p)+'</b> ('+f4(p*100)+' %)');chart=[pdf2,dm,[xb,dm[1]]];}
      else{var a2=val('a'),b2=val('b');p=Math.exp(-L*a2)-Math.exp(-L*b2);res.push('P('+f4(a2)+' < X < '+f4(b2)+') = e<sup>−λa</sup> − e<sup>−λb</sup> = <b>'+f4(p)+'</b>');chart=[pdf2,dm,[a2,b2]];}
      res.push('Media = '+f4(m)+' · Varianza = μ² = '+f4(m*m));}
    else if(k==='unif'){var a0=val('a0'),b0=val('b0');if(!(b0>a0))throw 0;var x1=val('a'),x2=val('b'),lo=Math.max(a0,Math.min(x1,x2)),hi=Math.min(b0,Math.max(x1,x2));p=Math.max(0,hi-lo)/(b0-a0);
      res.push('f(x) = 1/(b − a) = 1/'+f4(b0-a0)+' = <b>'+f4(1/(b0-a0))+'</b>','P('+f4(x1)+' ≤ X ≤ '+f4(x2)+') = longitud del tramo / longitud total = '+f4(Math.max(0,hi-lo))+'/'+f4(b0-a0)+' = <b>'+f4(p)+'</b>','Media = (a+b)/2 = '+f4((a0+b0)/2)+' · Varianza = (b−a)²/12 = '+f4(Math.pow(b0-a0,2)/12));
      chart=[function(x){return x>=a0&&x<=b0?1/(b0-a0):0;},[a0-(b0-a0)*0.15,b0+(b0-a0)*0.15],[lo,hi]];}
    else if(k==='t'){var gl=val('gl');if(!(gl>0))throw 0;var pdf3=function(x){return M.tPdf(x,gl);},dm3=[-5,5];
      if(tk==='lt'){var t1=val('x');p=M.tCdf(t1,gl);res.push('P(T ≤ '+f4(t1)+') = <b>'+f4(p)+'</b>');chart=[pdf3,dm3,[-5,t1]];}else if(tk==='gt'){var t2=val('x');p=1-M.tCdf(t2,gl);res.push('P(T > '+f4(t2)+') = <b>'+f4(p)+'</b>');chart=[pdf3,dm3,[t2,5]];}
      else{var pi=val('p'),ti2=M.tInv(pi,gl);res.push('Valor crítico t<sub>'+f4(pi)+', '+gl+' g.l.</sub> = <b>'+f4(ti2)+'</b>');chart=[pdf3,dm3,[-5,ti2]];}
      res.push('Con muestras pequeñas: g.l. = n − 1 (una muestra) o (n₁−1)+(n₂−1) (dos muestras).');}
    else if(k==='chi'){var g=val('gl');if(!(g>0))throw 0;var pdf4=function(x){return M.chi2Pdf(x,g);},dm4=[0,Math.max(10,g+6*Math.sqrt(2*g))];
      if(tk==='lt'){var c1=val('x');p=M.chi2Cdf(c1,g);res.push('P(χ² ≤ '+f4(c1)+') = <b>'+f4(p)+'</b>');chart=[pdf4,dm4,[0,c1]];}else if(tk==='gt'){var c2=val('x');p=1-M.chi2Cdf(c2,g);res.push('P(χ² > '+f4(c2)+') = <b>'+f4(p)+'</b> (p-valor)');chart=[pdf4,dm4,[c2,dm4[1]]];}
      else{var pc=val('p'),ci=M.chi2Inv(pc,g);res.push('Valor crítico χ²<sub>'+f4(pc)+', '+g+' g.l.</sub> = <b>'+f4(ci)+'</b>');chart=[pdf4,dm4,[0,ci]];}
      res.push('En tablas de contingencia: g.l. = (filas − 1)(columnas − 1).');}
    else if(k==='ic'){var xm=val('xm'),s=val('sg'),n=val('n'),lv=val('lv');if(!(s>0&&n>1&&lv>0&&lv<100))throw 0;var al=1-lv/100,crit=tk==='z'?M.normInv(1-al/2):M.tInv(1-al/2,n-1),se=s/Math.sqrt(n);
      res.push((tk==='z'?'z':'t<sub>'+(n-1)+' g.l.</sub>')+' crítico ('+lv+' %) = <b>'+f4(crit)+'</b>','Error estándar = σ/√n = '+f4(s)+'/√'+f4(n)+' = <b>'+f4(se)+'</b>','Margen de error = '+f4(crit)+' · '+f4(se)+' = <b>'+f4(crit*se)+'</b>','IC '+lv+' % = '+f4(xm)+' ± '+f4(crit*se)+' = <b>['+f4(xm-crit*se)+' ; '+f4(xm+crit*se)+']</b>');
      var pdf5=tk==='z'?M.normPdf:function(x){return M.tPdf(x,n-1);};chart=[pdf5,[-4.2,4.2],[-crit,crit]];}
    else{var pa=val('pa'),pb=val('pb');if(!(pa>=0&&pa<=1&&pb>=0&&pb<=1))throw 0;res.push('P(A ∩ B) = P(A)·P(B) = '+f4(pa)+' · '+f4(pb)+' = <b>'+f4(pa*pb)+'</b> ('+f4(pa*pb*100)+' %)','P(A ∪ B) = P(A) + P(B) − P(A ∩ B) = <b>'+f4(pa+pb-pa*pb)+'</b>','P(Ā) = 1 − P(A) = <b>'+f4(1-pa)+'</b> · P(B̄) = <b>'+f4(1-pb)+'</b>','P(ninguno) = P(Ā)·P(B̄) = <b>'+f4((1-pa)*(1-pb))+'</b>');}
    }catch(e){res=['<span class="hx-dim">Revisa los valores (σ, n, g.l. deben ser positivos).</span>'];chart=null;}
    out.innerHTML=res.map(function(r){return '<p>'+r+'</p>';}).join('')+(chart?svgCurve(chart[0],chart[1],chart[2],420,180):'');
  }
  sel.addEventListener('change',render);render();
}
function toast(t){var x=el('div',{class:'hx-toast',role:'status',text:t});root.appendChild(x);setTimeout(function(){x.remove();},1800);}
/* ---------- arranque ---------- */
function init(){
  doc.body.appendChild(root);layout();buildChat();buildCalc();buildDatos();buildDist();
  var qs=new URLSearchParams(location.search);if(qs.get('asistente')==='calc'){S.wide=true;layout();setOpen(true);setTab('calc');}
  window.HISAssistant={open:function(t){setOpen(true);if(t)setTab(t);},ask:function(q){setOpen(true);setTab('chat');ask(q);}};
}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init);else init();
})();
