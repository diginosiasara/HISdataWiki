/* Buscador: índice normalizado (sin tildes), AND de términos, #etiquetas y puntuación por campo */
HIS.search={idx:null,build:function(){var u=HIS.u;this.idx=HIS.entries.map(function(e){var body=e.b.map(function(b){return JSON.stringify(b.slice(1))}).join(" ");return{e:e,t:u.norm(e.title),d:u.norm(e.desc),g:e.tags.map(u.norm),x:u.norm(body)}})},
run:function(q){if(!this.idx)this.build();var u=HIS.u,toks=u.norm(q).split(/\s+/).filter(Boolean);if(!toks.length)return[];
return this.idx.map(function(r){var s=0,ok=toks.every(function(k){var tag=k.charAt(0)=="#",w=tag?k.slice(1):k,v=0;
if(r.g.some(function(g){return tag?g==w:g.indexOf(w)>-1}))v+=6;if(tag)return v>0&&(s+=v,true);
if(r.t.indexOf(w)>-1)v+=10;if(r.d.indexOf(w)>-1)v+=4;if(r.x.indexOf(w)>-1)v+=1;s+=v;return v>0});return ok?{e:r.e,s:s}:null}).filter(Boolean).sort(function(a,b){return b.s-a.s}).map(function(r){return r.e})}};
