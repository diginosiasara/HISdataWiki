# Dictado por voz integrado (sin conexión)

El chat puede dictar con un motor que **va dentro del paquete** (Vosk en WebAssembly + modelo pequeño en español).
Cuando está instalado, el usuario final **no descarga nada y no necesita Internet**.

## Instalarlo (una sola vez, por quien prepara el paquete)
```
node modelos-ia/preparar-voz.mjs            # instala vosk.js y model-es.tar.gz en modelos-ia/speech-to-text/vosk/
node modelos-ia/preparar-voz.mjs --comprobar
node servidor/generar-sw.mjs                # actualiza la copia sin conexión
```
Ocupa unos 45 MB. Revisa las licencias de vosk-browser y del modelo antes de redistribuir.

## Cómo elige motor el chat
1. **Integrado**, si existen `vosk.js` y `model-es.tar.gz` (solo con la wiki servida por http/https: `node servidor/servidor.js`).
2. **Reconocimiento del navegador**, si no hay motor integrado (puede enviar el audio al servicio del navegador; se avisa antes).
3. Sin ninguno: mensaje claro y alternativas (dictado del sistema o escribir). Nunca se pide instalar nada.

## Estado
- Probado: selección de motor, captura de audio, resultados parciales y finales, parada al callar, conversión de números hablados («ocho coma cinco» → 8,5) y comandos, **con un motor simulado**.
- **No probado con los archivos reales de Vosk** (esta versión se preparó sin Internet): la precisión y el rendimiento reales hay que medirlos.
