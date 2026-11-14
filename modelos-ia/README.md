# modelos-ia/ · modelos de IA del paquete HISdata

Esta carpeta es el lugar donde viven los modelos que acompañan a la wiki (opción «Integrado» del Centro de IA).

## Qué hay ahora
- `catalogo/modelos.json`: catálogo con tamaño, licencia, origen y archivos de cada modelo.
- `descargar-modelos.mjs`: descarga los pesos a las carpetas de abajo.
- Carpetas `llm/`, `embeddings/`, `reranker/`, `clasificadores/`, `runtimes/`, `indices/`, `workers/`, `configuracion/`: vacías, listas para recibir los archivos.

**Los pesos no se incluyen en este paquete** (cientos de MB) y esta versión se preparó sin acceso a Internet, por lo que las URL del catálogo están **sin verificar**. Compruébalas y revisa las licencias antes de redistribuir nada.

## Qué funciona hoy sin modelos
El motor integrado (agentes, búsqueda en la wiki con TF-IDF y corrección de erratas, y cálculo con `HISMath`) funciona siempre, sin Internet y sin enviar nada fuera.

## Perfiles
| Perfil | Modelos | Para qué |
|---|---|---|
| A | multilingual-e5-small | Búsqueda semántica (pendiente de integrar en el navegador) |
| B | A + Qwen2.5-0.5B-Instruct | Además, generación local ligera |
| C | A + Qwen2.5-1.5B-Instruct | Generación local de mayor capacidad |

```
node modelos-ia/descargar-modelos.mjs --perfil A
```

## Estado de la integración
- Detección: el Centro de IA lee el catálogo y comprueba si cada archivo existe (solo con la wiki servida por http/https).
- **Pendiente:** cargar los modelos de esta carpeta en el navegador (Transformers.js / WebLLM). No está implementado ni probado con pesos reales. Mientras tanto, la forma de tener generación local es **Ollama** o **LM Studio** (ya conectados) y, si quieres modelos locales sin instalar nada, esta carpeta queda preparada para esa fase.
- Los modelos grandes deben cargarse bajo demanda, nunca al abrir la página.

## Reglas de privacidad
- Con modelos locales no sale ninguna consulta del equipo.
- La nube solo se usa si el usuario la elige y se bloquea el envío de DNI, correos, teléfonos y números de historia clínica.
