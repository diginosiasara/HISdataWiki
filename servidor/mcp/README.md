# Servidor MCP de HISdata (Google Antigravity y otros clientes MCP)

Servidor de solo lectura, sin dependencias, que expone:
- `buscar_en_wiki`: busca fragmentos de la wiki.
- `calcular_estadisticos`: media, mediana, moda, cuartiles, varianza y desviación típica (÷ n por defecto).
- `calcular_probabilidad`: normal, exponencial, uniforme, t y chi cuadrado.
- `listar_conjuntos`: conjuntos de datos didácticos.

## Instalación
1. Node 18 o superior.
2. Copia `mcp_config.ejemplo.json` a la configuración MCP de tu cliente y sustituye la ruta por la absoluta a `server.js`.
3. Reinicia el cliente. Las herramientas aparecen como `hisdata-wiki`.

Probado con peticiones JSON-RPC por STDIO (`initialize`, `tools/list`, `tools/call`). No se ha probado desde Antigravity real.

Una web abierta no puede detectar Antigravity: la integración va al revés (Antigravity llama a este servidor).
