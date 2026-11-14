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

## Asistente, calculadora y paneles visuales
- `assets/js/his.math.js` (motor estadístico) y `assets/js/his.assistant.js` (chat con avatar, calculadora científica, datos y distribuciones) se cargan en todas las páginas junto a `assets/css/assistant.css`.
- `assets/js/kb.js` es la base de conocimiento del chat (secciones de las páginas). Hay que regenerarla si cambias el contenido.
- Modo IA opcional: ⚙ en el chat, clave de API de Anthropic (se guarda solo en el navegador) o endpoint propio.
- `visual/` contiene paneles interactivos autónomos (`visual/app/*.html`) incrustados en páginas de la wiki.
