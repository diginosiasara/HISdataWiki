/* Lector de voz (Web Speech API): por sección, por selección, ficha completa o al pulsar un bloque */
HIS.reader={tap:false,run:0,els:function(root){return Array.prototype.slice.call(root.querySelectorAll("h2,p,li,.rd"))},
supported:function(){return "speechSynthesis" in window},
show:function(v){var r=HIS.u.$("#reader");r.hidden=!(v&&this.supported());if(!v)this.stop()},
stop:function(){this.run++;if(this.supported())speechSynthesis.cancel();document.querySelectorAll(".rd-on").forEach(function(e){e.classList.remove("rd-on")});var p=HIS.u.$("#rd-pause");if(p)p.setAttribute("aria-pressed","false")},
say:function(items){if(!items.length)return;this.stop();var id=this.run,rate=parseFloat(HIS.u.$("#rd-rate").value)||1,cur;
function next(i){if(cur)cur.classList.remove("rd-on");if(i>=items.length||id!==HIS.reader.run)return;var el=items[i],txt=typeof el=="string"?el:el.innerText;cur=typeof el=="string"?null:el;if(cur)cur.classList.add("rd-on");
var u=new SpeechSynthesisUtterance(txt);u.lang="es-ES";u.rate=rate;u.onend=function(){next(i+1)};u.onerror=function(){if(cur)cur.classList.remove("rd-on")};speechSynthesis.speak(u)}
next(0)},
section:function(){var s=window.getSelection(),n=(s&&s.anchorNode)||document.activeElement,el=n&&(n.nodeType==1?n:n.parentElement),sec=el&&el.closest?el.closest("section"):null;sec=sec||HIS.u.$(".art section");if(sec)this.say(this.els(sec))},
init:function(){var self=this,u=HIS.u;if(!this.supported())return;
u.$("#rd-sec").addEventListener("click",function(){self.section()});
u.$("#rd-all").addEventListener("click",function(){var a=u.$(".art");if(a)self.say([u.$("h1",a)].concat(self.els(a)))});
u.$("#rd-sel").addEventListener("click",function(){var t=String(window.getSelection()).trim();t?self.say([t]):HIS.a11y.say("Selecciona primero un texto para leerlo")});
u.$("#rd-stop").addEventListener("click",function(){self.stop()});
u.$("#rd-pause").addEventListener("click",function(){var b=this,p=speechSynthesis.paused;p?speechSynthesis.resume():speechSynthesis.pause();b.setAttribute("aria-pressed",!p)});
u.$("#rd-tap").addEventListener("click",function(){self.tap=!self.tap;this.setAttribute("aria-pressed",self.tap);HIS.a11y.say(self.tap?"Leer al pulsar activado":"Leer al pulsar desactivado")});
u.$("#main").addEventListener("click",function(e){if(!self.tap||e.target.closest("a,button")||String(window.getSelection()))return;var el=e.target.closest(".art h2,.art p,.art li,.art .rd");if(el)self.say([el])});
document.addEventListener("keydown",function(e){if(e.key=="Escape")self.stop()});
u.$("#main").addEventListener("click",function(e){var b=e.target.closest("[data-read]");if(b){var s=b.closest("section");self.say(self.els(s))}})}};
