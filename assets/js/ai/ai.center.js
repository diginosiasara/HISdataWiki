/* HISdata AI · Centro de IA (configuración automática y manual, diagnóstico de proveedores) */
(function(){
'use strict';
var AI=window.HISAI=window.HISAI||{};
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function $(s,r){return (r||document).querySelector(s);}
var NAMES={builtin:'Integrado (paquete de la wiki)',ollama:'Ollama',lmstudio:'LM Studio',cloud:'IA en la nube (Claude)',antigravity:'Google Antigravity (MCP)'};
AI.label=function(){var a=AI.active();if(!a)return 'Motor integrado';return NAMES[a.id]+(a.model?' · '+a.model:'');};
AI.center={};
AI.center.build=function(box,onChange){
  var cfg=AI.config,P=AI.providers;
  function status(id){var s=AI.status[id];if(!s)return {t:'Sin comprobar',c:'idle'};if(id==='builtin')return {t:'Integrado',c:'ok'};if(id==='antigravity')return {t:'Se integra por MCP',c:'idle'};return s.connected?{t:id==='cloud'?'Configurado':'Conectado',c:'ok'}:{t:'No encontrado',c:'bad'};}
  function modelsOpts(id,sel){var s=AI.status[id],ms=(s&&s.models||[]).filter(function(m){return !m.embed;});
    if(!ms.length)return '<option value="">'+(id==='cloud'?'Modelo…':'(sin modelos detectados)')+'</option>';
    return '<option value="">— elige un modelo —</option>'+ms.map(function(m){return '<option value="'+esc(m.id)+'"'+(m.id===sel?' selected':'')+'>'+esc(m.name||m.id)+'</option>';}).join('');}
  function card(id){var s=status(id),c=cfg[id]||{},st=AI.status[id]||{};
    var h='<fieldset class="ai-card"><legend class="ai-sr">'+esc(NAMES[id])+'</legend><div class="ai-row"><label class="ai-radio"><input type="radio" name="ai-primary" value="'+id+'"'+(cfg.primary===id?' checked':'')+(id==='antigravity'?' disabled':'')+'> <b>'+esc(NAMES[id])+'</b></label><span class="ai-badge ai-'+s.c+'">'+s.t+'</span></div>';
    if(id==='builtin')h+='<p class="ai-small">Búsqueda en la wiki y cálculo con HISMath, sin enviar nada fuera. Los modelos de la carpeta <code>modelos-ia/</code> se usan cuando están descargados.</p>';
    if(id==='ollama'||id==='lmstudio'){h+='<label class="ai-f">Dirección<input type="url" data-p="'+id+'" data-k="endpoint" value="'+esc(c.endpoint)+'"></label><label class="ai-f">Modelo<select data-p="'+id+'" data-k="model">'+modelsOpts(id,c.model)+'</select></label>';
      if(st.reason)h+='<p class="ai-small ai-warn">'+esc(st.reason)+'</p>';h+='<button type="button" class="ai-b2" data-test="'+id+'">Probar conexión</button>';}
    if(id==='cloud'){h+='<label class="ai-f">Endpoint propio (recomendado)<input type="url" data-p="cloud" data-k="endpoint" placeholder="https://tu-servidor/…" value="'+esc(c.endpoint)+'"></label><label class="ai-f">Modelo<select data-p="cloud" data-k="model">'+['claude-haiku-5-5','claude-sonnet-5-5','claude-opus-5-5'].map(function(m){return '<option'+(c.model===m?' selected':'')+'>'+m+'</option>';}).join('')+'</select></label>'+
      '<label class="ai-f">Clave de API solo para esta sesión<input type="password" id="ai-key" autocomplete="off" placeholder="sk-ant-… (opcional con endpoint propio)" value="'+esc(AI.getKey())+'"></label><p class="ai-small ai-warn">La clave no se guarda en el navegador y se borra al cerrar la pestaña. Con un endpoint propio la clave no pasa por esta página: ejecuta <code>ANTHROPIC_API_KEY=… node servidor/servidor.js</code> y usa <code>http://localhost:8787/api/chat</code>. No envío datos personales a la nube: los bloqueo antes de enviar.</p><button type="button" class="ai-b2" data-test="cloud">Probar conexión</button>';}
    if(id==='antigravity')h+='<p class="ai-small">Antigravity no es un servidor de modelos. Para usar las herramientas de HISdata desde Antigravity, añade el servidor MCP (ver más abajo).</p>';
    if(id==='builtin'&&st.models&&st.models.length)h+='<div class="ai-tw"><table><caption>Modelos del paquete</caption><thead><tr><th scope="col">Modelo</th><th scope="col">Función</th><th scope="col">Estado</th></tr></thead><tbody>'+st.models.map(function(m){return '<tr><th scope="row">'+esc(m.name)+'</th><td>'+esc(m.rol)+'</td><td>'+(m.instalado?'Instalado':'No descargado')+'</td></tr>';}).join('')+'</tbody></table></div>';
    if(id==='builtin'&&st.notes)h+=st.notes.map(function(n){return '<p class="ai-small">'+esc(n)+'</p>';}).join('');
    return h+'</fieldset>';}
  function render(){
    var origin=location.origin&&location.origin!=='null'?location.origin:'https://tu-dominio';
    box.innerHTML='<h3 class="ai-h">Centro de IA</h3><p class="ai-small">Elige qué motor responde en el chat. El asistente de HISdata (agentes, búsqueda en la wiki y calculadora) trabaja siempre por delante del modelo.</p>'+
     '<div class="ai-mode" role="radiogroup" aria-label="Modo de configuración"><label><input type="radio" name="ai-mode" value="auto"'+(cfg.mode==='auto'?' checked':'')+'> Automático</label><label><input type="radio" name="ai-mode" value="manual"'+(cfg.mode==='manual'?' checked':'')+'> Manual</label></div>'+
     '<div class="ai-row"><button type="button" class="ai-b" id="ai-scan">Buscar proveedores en mi equipo</button><button type="button" class="ai-b2" id="ai-apply">Aplicar recomendación</button></div><div id="ai-live" role="status" aria-live="polite" class="ai-live"></div>'+
     AI.order.map(card).join('')+
     '<label class="ai-chk"><input type="checkbox" id="ai-fb"'+(cfg.fallback?' checked':'')+'> Si el proveedor falla, usar el motor integrado</label>'+
     '<details class="ai-d"><summary>Cómo conectar Ollama</summary><ol class="ai-small"><li>Instala Ollama y descarga un modelo, por ejemplo <code>ollama pull qwen2.5:3b</code>.</li><li>Para que el navegador pueda hablar con Ollama, permite el origen de esta web: define <code>OLLAMA_ORIGINS='+esc(origin)+'</code> y reinicia Ollama. No uses «*» salvo en pruebas.</li><li>Pulsa «Buscar proveedores». Si no aparece, puede estar apagado o el navegador pide permiso de red local.</li></ol></details>'+
     '<details class="ai-d"><summary>Conectar Google Antigravity (MCP)</summary><p class="ai-small">Copia la carpeta <code>servidor/mcp/</code>, instala Node 18 o superior y añade a <code>mcp_config.json</code>:</p><pre class="ai-pre" tabindex="0">{\n  "mcpServers": {\n    "hisdata-wiki": {\n      "command": "node",\n      "args": ["RUTA/HISdataWiki/servidor/mcp/server.js"]\n    }\n  }\n}</pre><p class="ai-small">Herramientas: <code>buscar_en_wiki</code>, <code>calcular_estadisticos</code>, <code>calcular_probabilidad</code> y <code>listar_conjuntos</code>. Solo lectura.</p></details>'+
     '<details class="ai-d"><summary>Privacidad</summary><p class="ai-small">Con «Integrado», Ollama o LM Studio tus preguntas no salen de tu equipo. La nube solo se usa si la eliges y no se le envían DNI, correos, teléfonos ni números de historia clínica. Usa siempre datos didácticos.</p></details>';
    wire();}
  function say(t){var l=$('#ai-live',box);if(l)l.textContent=t;}
  function wire(){
    box.querySelectorAll('input[name=ai-mode]').forEach(function(r){r.addEventListener('change',function(){cfg.mode=r.value;AI.saveConfig();say('Modo '+(r.value==='auto'?'automático':'manual')+'.');});});
    box.querySelectorAll('input[name=ai-primary]').forEach(function(r){r.addEventListener('change',function(){cfg.primary=r.value;AI.saveConfig();say('Proveedor principal: '+NAMES[r.value]+'.');onChange&&onChange();});});
    box.querySelectorAll('[data-p]').forEach(function(e){e.addEventListener('change',function(){cfg[e.dataset.p][e.dataset.k]=e.value.trim();AI.saveConfig();onChange&&onChange();});});
    var k=$('#ai-key',box);if(k)k.addEventListener('change',function(){AI.setKey(k.value.trim());say('Clave guardada solo para esta sesión.');});
    $('#ai-fb',box).addEventListener('change',function(e){cfg.fallback=e.target.checked;AI.saveConfig();});
    $('#ai-scan',box).addEventListener('click',scan);
    $('#ai-apply',box).addEventListener('click',function(){var r=AI.recommend();cfg.primary=r.provider;if(r.model)cfg[r.provider].model=r.model;AI.saveConfig();render();say(r.provider==='builtin'?'No he encontrado modelos locales; uso el motor integrado.':'Recomendación aplicada: '+NAMES[r.provider]+' con '+r.model+'.');onChange&&onChange();});
    box.querySelectorAll('[data-test]').forEach(function(b){b.addEventListener('click',function(){var id=b.dataset.test;say('Probando '+NAMES[id]+'…');b.disabled=true;AI.test(id).then(function(r){say(NAMES[id]+' responde ('+r.ms+' ms): «'+r.text+'».');}).catch(function(e){say('Error al probar '+NAMES[id]+': '+e.message);}).then(function(){b.disabled=false;});});});
  }
  function scan(){var b=$('#ai-scan',box);b.disabled=true;say('Comprobando proveedores accesibles desde este navegador…');
    AI.discover().then(function(rs){var f=rs.filter(function(r){return r.connected&&r.id!=='builtin'&&r.id!=='antigravity';}).map(function(r){return NAMES[r.id]+' ('+r.models.length+' modelos)';});
      if(cfg.mode==='auto'){var rec=AI.recommend();if(rec.provider!=='builtin'){cfg.primary=rec.provider;cfg[rec.provider].model=rec.model;AI.saveConfig();}}
      render();say(f.length?'Encontrado: '+f.join('; ')+'.'+(cfg.mode==='auto'?' Seleccionado automáticamente: '+AI.label()+'.':''):'No he encontrado Ollama ni LM Studio accesibles. Una web no puede ver los programas instalados, solo los servicios que responden. Sigue usándose el motor integrado.');onChange&&onChange();});}
  AI.center.rescan=scan;
  render();
  if(!AI.status.builtin)AI.discover(['builtin','cloud','antigravity']).then(render);
};
})();
