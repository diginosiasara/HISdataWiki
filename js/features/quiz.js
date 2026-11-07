/* Mini quiz accesible: opciones radio con letra, comprobación, explicación y marcador */
HIS.quiz={mount:function(en){var u=HIS.u,qs=HIS.quizzes&&HIS.quizzes[en.id],card=u.$("#qcard"),sc=u.$("#qs");if(!qs||!card)return;var i=0,score=0,L="ABCD";
var data=qs.map(function(q){var o=q[1].map(function(t,k){return{t:t,ok:k==q[2]}});for(var a=o.length-1;a>0;a--){var b=Math.floor(Math.random()*(a+1)),x=o[a];o[a]=o[b];o[b]=x}return{q:q[0],o:o,e:q[3]}});
function show(){var d=data[i];card.innerHTML="<div class=\"qcard__p\"><span>Pregunta "+(i+1)+" de "+data.length+"</span><progress max=\""+data.length+"\" value=\""+(i+1)+"\" aria-hidden=\"true\"></progress></div><fieldset><legend class=\"qcard__q\">"+u.esc(d.q)+"</legend>"+d.o.map(function(o,k){return"<label class=\"opt\"><input type=\"radio\" name=\"opt\" value=\""+k+"\"><span class=\"ltr\" aria-hidden=\"true\">"+L[k]+"</span><span>"+u.esc(o.t)+"</span></label>"}).join("")+"</fieldset><div class=\"qcard__f\"><button class=\"btn btn--pri\" type=\"button\" id=\"qchk\" disabled>Comprobar respuesta</button><span id=\"qmsg\" role=\"status\" aria-live=\"polite\">Elige una opción para comprobarla.</span></div>";
var chk=u.$("#qchk"),msg=u.$("#qmsg");
if(i>0){var lg=card.querySelector("legend");lg.tabIndex=-1;lg.focus()}
card.querySelectorAll("input").forEach(function(r){r.addEventListener("change",function(){chk.disabled=false;msg.textContent="Pulsa comprobar respuesta."})});
chk.addEventListener("click",function(){if(chk.dataset.s=="next"){i++;i<data.length?show():end();return}
var sel=card.querySelector("input:checked");if(!sel)return;var k=+sel.value,ok=d.o[k].ok;if(ok){score++;sc.textContent=score}
card.querySelectorAll(".opt").forEach(function(l,n){l.querySelector("input").disabled=true;if(d.o[n].ok)l.classList.add("opt--ok");else if(n==k)l.classList.add("opt--no")});
msg.textContent=(ok?"¡Correcto! ":"Incorrecto. ")+d.e;chk.textContent=i<data.length-1?"Siguiente →":"Ver resultado";chk.dataset.s="next";chk.focus()})}
function end(){card.innerHTML="<div class=\"qcard__end\"><p class=\"qcard__q\" tabindex=\"-1\" id=\"qend\">Has acertado "+score+" de "+data.length+"</p><p>"+(score==data.length?"¡Lo tienes claro!":"Repasa la ficha y vuelve a intentarlo.")+"</p><button class=\"btn btn--pri\" type=\"button\" id=\"qrep\">Repetir quiz</button></div>";u.$("#qend").focus();u.$("#qrep").addEventListener("click",function(){HIS.quiz.mount(en)})}
sc.textContent="0";show()}};
