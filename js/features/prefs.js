/* Preferencias persistentes: tema (auto/claro/oscuro) y tamaño de texto */
HIS.prefs={themes:["auto","light","dark"],names:{auto:"automático",light:"claro",dark:"oscuro"},
init:function(){var u=HIS.u,root=document.documentElement,self=this,th=u.store.get("theme","auto"),fs=parseFloat(u.store.get("fs","1"))||1;
function apply(){root.setAttribute("data-theme",th);root.style.setProperty("--fs",fs);var b=u.$("#theme-btn");b.setAttribute("aria-label","Cambiar tema: "+self.names[th]);b.setAttribute("aria-pressed",th=="dark")}
apply();
u.$("#theme-btn").addEventListener("click",function(){th=self.themes[(self.themes.indexOf(th)+1)%3];u.store.set("theme",th);apply();HIS.a11y.say("Tema "+self.names[th])});
function sz(d){fs=Math.min(1.5,Math.max(.85,Math.round((fs+d)*100)/100));u.store.set("fs",fs);apply();HIS.a11y.say("Tamaño de texto "+Math.round(fs*100)+" %")}
u.$("#font-up").addEventListener("click",function(){sz(.1)});u.$("#font-down").addEventListener("click",function(){sz(-.1)})}};
