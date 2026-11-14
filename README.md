# HISdata Wiki
Wiki estática de estadística sanitaria (sesiones 0 y 1). Sin dependencias ni compilación: abre `index.html` o publícala en cualquier hosting estático.

## Arquitectura (una responsabilidad por archivo)
- `index.html` — estructura semántica, metadatos SEO/Open Graph/Twitter Card y JSON-LD.
- `css/` — `tokens` (variables), `base` (reset, foco, accesibilidad), `layout` (cabecera, menú, rejilla), `components` (tarjetas, tablas), `pages` (héroe, secciones, panel OJO, quiz), `widgets` (gráficos, calculadoras, muestreo con puntos, fases).
- `js/config.js` — ajustes.
- `js/data/` — `entries` (fichas), `meta` (iconos), `visuals` (visualizaciones por ficha y héroes), `quizzes` (preguntas), `manual` (ampliación del manual UAX por ficha), `guide` (guía del manual y casos prácticos), `glossary` (glosario y fórmulas).
- `js/core/` — utilidades, accesibilidad (avisos y foco), SEO dinámico, router.
- `js/features/` — buscador, preferencias, menú, lector de voz, quiz.
- `js/views/` — `widgets` (componentes interactivos), `render` (bloques y héroe), `views` (vistas).
- `js/app.js` — arranque.

## Antes de publicar
Sustituye `https://TU-DOMINIO/hisdata-wiki/` en `index.html` y `js/config.js`, y añade `assets/og.png` (1200×630).

## Añadir una ficha
Añade un objeto a `HIS.entries` (id, s, title, desc, tags, b). Opcional: icono en `meta.js`, visualizaciones en `visuals.js` y preguntas en `quizzes.js`. Menú, buscador, etiquetas y relacionadas se actualizan solos.

## Asistente, IA, accesibilidad y paneles visuales
- `assets/js/ai/`: `ai.providers.js` (Integrado, Ollama, LM Studio, nube, Antigravity/MCP; autodetección), `ai.gateway.js` (agentes, herramientas, privacidad, verificación con HISMath) y `ai.center.js` (pestaña IA). La clave de API ya no se guarda en localStorage: solo en la sesión.
- `assets/js/his.assistant.js`: chat (role="log", mensajes identificados, pestañas con teclado), calculadora, datos y distribuciones. `his.math.js`: motor estadístico.
- `assets/js/voice/` (dictado y lectura en voz alta) y `assets/js/dyslexia/` + `assets/css/reading.css` (preferencias de lectura, regla de lectura, modo concentración).
- `assets/js/his.nav.js` + `assets/css/nav.css`: menú de temas plegable con filtro.
- `modelos-ia/`: catálogo, descargador y carpetas para los modelos (los pesos no se incluyen; ver su README).
- `servidor/mcp/`: servidor MCP de solo lectura para Google Antigravity (Node 18+).
- `assets/js/kb.js` es la base de conocimiento del chat: hay que regenerarla si cambias el contenido.
- `visual/` contiene paneles interactivos autónomos (`visual/app/*.html`) incrustados en páginas de la wiki.
