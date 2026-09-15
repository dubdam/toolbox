# NORTH — toolbox

> Documento de visión y dirección. Si una decisión técnica contradice este documento, se discute primero acá.

## Qué es

Una ferretería local: reemplazos de sitios web de utilidades (xdownload, TinyPNG, lectores de markdown online, transcripción en la nube, strippers de metadatos) que corren en la máquina.

No es un dashboard ni un archivo. Entras, usás la herramienta, te vas.

Carpeta: `toolbox/` (sin prefijo `vps-`: es local-first). No hay dominio público en v0.

## Por qué existe

Las utilidades que hacen falta todo el tiempo viven en sitios ajenos. Pegás un link, subís una foto, soltás un audio — y el archivo cruza internet. El flujo está bien; el destino no. Falta la misma experiencia (pegar URL, drop de archivo, bajar resultado) con la garantía de que el trabajo queda en disco.

Privacidad no es un suite aparte (VPN, Tor, contraseñas). Es el *por qué* estas tools son locales y *qué se rechaza*: el archivo y la URL no se mandan a un tercero.

## Principio rector

> Misma utilidad que el sitio web; el archivo no sale de la máquina.

- Cada tool hace una sola cosa. No hay "plataforma".
- El browser no habla con internet. Si una tool necesita red (bajar un video), lo hace el proceso local, no la página.
- Las tools que pueden ser 100% offline lo son. Una tool no hereda la red de otra.
- **Excepción, transcripción:** el audio **sí sale** a OpenAI (`gpt-transcribe` default, `whisper-1` opcional). El browser no habla con OpenAI; lo hace el server local. No hay whisper.cpp en esta máquina.
- No hay cuenta, no hay sync, no hay nube propia. Si se borra `storage/`, no se pierde conocimiento: los originales están en el disco del usuario. `storage/` es working directory descartable.
- No es el dashboard (leer el mundo) ni el second brain (archivar lo elegido). Toolbox **transforma** archivos y media.
- No se consulta a un tercero "para chequear privacidad" (HIBP, VirusTotal, etc.). Eso es el anti-patrón.

## Frontera

| | Dashboard | Second brain | toolbox |
| --- | --- | --- | --- |
| Rol | leer el mundo | archivar lo elegido | transformar archivos y media |
| Dónde corre | VPS (`home.agoraops.org`) | VPS (`ai.agoraops.org`) | local (`127.0.0.1:3460`, URL `toolbox.localhost`) |
| Persistencia | cache efímero | fuente de verdad | working files, descartables |
| Red | fetch de feeds | ingest + vault | downloader (yt-dlp) y transcripción (OpenAI API) |

Sin integración obligatoria con los otros dos en v0. Un "mandar transcripción al second brain" es backlog, no requisito.

## Alcance post-v0 (oleada 1)

Además de las seis de v0:

7. **Portapapeles** — pegar HTML de Word/Notion/Docs/web → plaintext o Markdown limpio. Saca tracking de URLs, zero-width, NBSP. 100% cliente.
8. **Recortar** — fragmento de audio/video con ffmpeg (`00:13:42–00:17:08 → MP3` o copia del contenedor). Jobs + SSE, como el downloader.
9. **Hash** — SHA-256 / SHA-512 / BLAKE3 / SHA-1 / MD5. Archivo o texto (UTF-8). Comparar y verificar un hash publicado. Stream in-process, sin binario.
10. **Limpiar URLs (inspector)** — además del strip de tracking: listar query params, punycode/IDN, AMP y hosts móviles canónicos. **Sigue sin red.** Expandir shortlinks queda para después (botón explícito).
11. **QR** — crear (URL, texto, Wi-Fi, Bitcoin URI, vCard) y leer de una imagen. 100% cliente (`uqr` + `jsQR`). Cámara queda para después.
12. **Contar** — palabras, párrafos, caracteres, grafemas, bytes UTF-8, tiempo de lectura. 100% cliente.

## Alcance v0 (seis tools)

1. **Downloader** — pegar URL de X o YouTube → video o audio en disco. Equivalente local de xdownload, con YouTube incluido. Un solo tool, no dos.
2. **Compresor** — PNG/JPG, drop de archivos, preview de peso antes/después. Equivalente local de TinyPNG.
3. **Markdown** — abrir un `.md` o pegar con Ctrl+V, verlo y editarlo con **ByteMD** (split fuente/preview, GFM). Guardar copia en `storage/markdown` o bajar el archivo. No reemplaza Obsidian: es un archivo suelto, no un vault.
4. **Transcripción** — audio/video → texto vía **OpenAI API**. Default **`gpt-transcribe`**. Opción **`whisper-1`** (Whisper hosteado, no local). ffmpeg extrae audio si hace falta. Misma familia de API que el second brain (`ai.agoraops.org` usa `gpt-4o-mini-transcribe`).
5. **Metadatos** — **ver** y **sacar** metadatos de foto, video y audio (cámara, GPS, fechas, software). EXIF es el caso principal, no el límite de formatos.
6. **Limpiar URLs** — pegar un link, salir sin `utm_*`, `fbclid`, `si=`, y el resto de tracking. Cero motores nuevos.

## No incluye (v0)

- Splitter / merge de PDFs.
- Hilo de X → Markdown.
- Convertir/redimensionar a WebP/AVIF (puede colgarse del compresor después; no es tool nueva).
- OCR, quitar fondo, favicon/OG generator.
- Cifrar/descifrar (`age`), redactar PDF.
- Seguir redirects / expandir shortlinks (la tool de URLs no hereda red).
- Auth, multi-usuario, exposición a la LAN o a internet.
- Integración con el second brain o el dashboard.
- VPN, Tor, gestor de contraseñas, fingerprint del browser, HIBP.

## Backlog (post v0, sin orden)

- Hilo de X → Markdown.
- Convertir/redimensionar imágenes (WebP/AVIF, resize) como extra del compresor.
- Splitter de PDFs.
- Cifrar/descifrar con `age`.
- Mandar resultado (transcripción, markdown) al second brain.
- URL inspector: botón “seguir redirects” (red explícita, no default).

## Motores

JS in-process cuando el ecosistema es JS; CLI spawn cuando el ecosistema es un binario. El browser no ve estos procesos.

| Cimiento | Rol |
| --- | --- |
| ffmpeg + ffprobe | media transversal (merge, extraer audio, inspeccionar, strip de metadata de video) |
| yt-dlp | downloader |
| sharp | compresor |
| ByteMD | visor + editor MD (GFM, highlight). Sanitiza XSS por default. |
| OpenAI Audio API | transcripción. Default `gpt-transcribe`; opción `whisper-1`. Key en `.env` (`OPENAI_API_KEY`). |
| exifr + exiftool | metadatos: leer / strip |
| jobs + sqlite + SSE | descargas, transcripciones y recortes largos |
| (nada extra) | limpiar URLs + portapapeles: JS puro |
| @noble/hashes | BLAKE3 (SHA-* van por `Bun.CryptoHasher`) |
| uqr + jsQR | QR: generar / leer de imagen, solo cliente |

Dependencias de sistema en v0: `yt-dlp`, `ffmpeg`, `exiftool`. Recortar pide también `ffprobe` (viene con ffmpeg). Transcripción pide `OPENAI_API_KEY` (no un modelo en disco). Si falta un binario o la key, esa tool lo dice claro; las otras siguen.

No ImageMagick, Pandoc, Tesseract, qpdf, MAT2/Python, PyTorch ni whisper.cpp.

## Cómo se mide el éxito

Métrica principal: **¿deja de abrir xdownload / TinyPNG / un transcriptor online / un stripper de EXIF online para estas tareas?**

Secundarias:

- ¿Bajar un video de X o YouTube es pegar-y-esperar, sin pelear con la tool?
- ¿Comprimir una OG image es más rápido que subirla a un sitio?
- ¿Ver y sacar el GPS de una foto (y de un video) es obvio, no un menú escondido?
- ¿Transcribir un audio no implica esperar un upload?
- ¿Pegar un link sucio y copiarlo limpio es más barato que hacerlo a mano?

v0 es exitosa si después de dos semanas esas pestañas de terceros no se abren más para este trabajo.

## Decisiones tomadas

- Nombre: **toolbox**. Carpeta `toolbox/`.
- Local-first. Sin prefijo `vps-`. Sin dominio público en v0.
- Forma: app web local. El proceso escucha **solo en `127.0.0.1`**. Ni LAN, ni VPS, ni nginx en v0.
- Host: **SvelteKit + Bun** (mismo par del dashboard). Primer toolbox, segundo proyecto Svelte del ecosistema.
- UI: **shadcn-svelte** (componentes en el repo, sobre Bits UI). Tailwind v4 queda como motor de estilos de shadcn, no como capa en la que se diseña a mano. Puerto **3460**, bind `127.0.0.1`. La metáfora visual no es la consola Palantir del dashboard; se elige en la primera pantalla.
- Ángulo: pro-privacidad como *por qué* es local, no como suite de privacidad.
- Seis tools en v0, lista de arriba. EXIF se amplía a **Metadatos**. Se suma **Limpiar URLs**.
- Un downloader para X y YouTube, no dos tools.
- Markdown: **ByteMD** (v1, `bytemd` + `@bytemd/plugin-gfm` + highlight). Visor y editor. No Milkdown, no Carta. HashMD (v2) cuando esté estable.
- Motores: tabla de arriba. ffmpeg es cimiento transversal, no accesorio del downloader.
- Transcripción: **no corre un modelo en esta PC**. API OpenAI. Default `gpt-transcribe`, Whisper (`whisper-1`) como opción. El audio sale a OpenAI; es la excepción al principio “el archivo no sale”.
- Salida: `toolbox/storage/`, gitignored, una subcarpeta por tool. La UI muestra la carpeta en el explorador; “guardar una copia” es extra. `OUTPUT_DIR` en `.env` queda para después.
- Sin auth en v0. La puerta es `127.0.0.1`, no una contraseña. Si algún día escucha en LAN o VPS, se reabre esta decisión.

## Decisiones abiertas

Ninguna de producto/stack para v0. Metáfora visual: abierta, se decide al construir la primera pantalla.

## Visión a futuro

Una sola superficie local, propia, que reemplaza la ronda de sitios de utilidades. Cada tool nueva tiene que pasar la prueba: ¿hoy lo haría en un sitio ajeno, y no quiero que ese sitio vea el archivo?
