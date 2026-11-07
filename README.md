# HISdata Wiki
Wiki estática de estadística sanitaria (sesiones 0 y 1). Sin dependencias ni compilación: abre `index.html` o publícala en cualquier hosting estático.

## Arquitectura (una responsabilidad por archivo)
- `index.html` — estructura semántica, metadatos SEO/Open Graph/Twitter Card y JSON-LD.
- `css/` — `tokens` (variables), `base` (reset, foco, accesibilidad), `layout` (cabecera, menú, rejilla), `components` (tarjetas, tablas), `pages` (héroe, secciones, panel OJO, quiz), `widgets` (gráficos, calculadoras, muestreo con puntos, fases).
- `js/config.js` — ajustes.
- `js/data/` — `entries` (fichas), `meta` (iconos), `visuals` (visualizaciones por ficha y héroes), `quizzes` (preguntas).
- `js/core/` — utilidades, accesibilidad (avisos y foco), SEO dinámico, router.
- `js/features/` — buscador, preferencias, menú, lector de voz, quiz.
- `js/views/` — `widgets` (componentes interactivos), `render` (bloques y héroe), `views` (vistas).
- `js/app.js` — arranque.

## Antes de publicar
Sustituye `https://TU-DOMINIO/hisdata-wiki/` en `index.html` y `js/config.js`, y añade `assets/og.png` (1200×630).

## Añadir una ficha
Añade un objeto a `HIS.entries` (id, s, title, desc, tags, b). Opcional: icono en `meta.js`, visualizaciones en `visuals.js` y preguntas en `quizzes.js`. Menú, buscador, etiquetas y relacionadas se actualizan solos.
