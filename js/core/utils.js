HIS.u={esc:function(s){return String(s).replace(/[&<>"\u0027]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","\u0027":"&#39;"}[c]})},
norm:function(s){return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")},
$:function(s,r){return (r||document).querySelector(s)},
store:{get:function(k,d){try{var v=localStorage.getItem("his."+k);return v===null?d:v}catch(e){return d}},set:function(k,v){try{localStorage.setItem("his."+k,v)}catch(e){}}}};
