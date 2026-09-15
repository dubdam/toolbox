# toolbox

Ferretería local: utilidades que reemplazan sitios ajenos (xdownload, TinyPNG, transcripción, metadatos, URLs). El archivo no sale de la máquina.

**Para visión, features, motores y no-goals, leer primero `NORTH.md`.** Si una decisión técnica contradice NORTH, se discute primero ahí.

Principio rector:

> Misma utilidad que el sitio web; el archivo no sale de la máquina.

`storage/` es working directory descartable. Si se borra, no se pierde conocimiento.

## Stack

- **Framework**: SvelteKit con Svelte 5 (runes). Segundo proyecto Svelte del ecosistema (el primero es el dashboard).
- **Runtime**: Bun. Adapter `adapter-node`. En local: `bun run dev` o `bun ./build/index.js`.
- **Listen**: **solo** `127.0.0.1:3460`. Ni `0.0.0.0`, ni LAN, ni nginx, ni VPS.
- **DB**: `bun:sqlite` en `src/lib/server/`, solo para jobs (descargas y transcripciones). No es fuente de verdad.
- **UI**: **shadcn-svelte** (Svelte 5, componentes copiados a `$lib/components/ui`). Tailwind v4 es el motor interno de shadcn, no la capa de diseño. Bits UI para primitivas.
- **Validación**: Zod en form actions y endpoints server.
- **Auth**: ninguna en v0.
- **Sin fetch desde el browser a servicios externos.** El browser solo habla con este servidor. El server sale a internet para yt-dlp y para la transcripción (OpenAI).

## Motores

Spawn con `Bun.spawn` / `spawn` y **array de argumentos**. Nunca concatenar una URL o un path en un string de shell.

| Cimiento | Cómo |
| --- | --- |
| ffmpeg + ffprobe | CLI, PATH. Media transversal. |
| yt-dlp | CLI. Único proceso que habla con internet. |
| sharp | in-process |
| ByteMD (`bytemd`) | visor + editor MD, solo cliente. Plugins: GFM, highlight. XSS lo cubre ByteMD; no hace falta DOMPurify extra. Importar el bundle JS (`bytemd/dist`), no el `.svelte` interno (es Svelte 3). |
| OpenAI Audio API | `gpt-transcribe` (default) y `whisper-1`. Key: `OPENAI_API_KEY` en `.env` (nunca al cliente). |
| exifr | in-process, lectura |
| exiftool | CLI, strip |
| jobs + sqlite + SSE | descargas y transcripciones largas |

Si un binario no está, esa tool muestra el error y cómo instalarlo. Las otras tools siguen.

## Salida

`storage/` en la raíz del proyecto, gitignored, una subcarpeta por tool (`downloads/`, `compress/`, `transcribe/`, `metadata/`, …). La UI tiene “mostrar en el explorador”. No streamear videos enormes por el diálogo de descargas del browser como camino principal.

## Despliegue

No hay. No `deploy.sh`, no systemd, no nginx. Es un proceso local.

## Convenciones

- TypeScript estricto.
- Lógica de server (DB, jobs, spawn, filesystem) vive en `src/lib/server/` — SvelteKit garantiza que no se filtra al bundle del cliente.
- Jobs largos: no un form action que espera el archivo final. Crear job, SSE de progreso, archivo en `storage/` al terminar.
- Sin comentarios salvo cuando el "por qué" no es obvio.
- Prosa y docs en castellano rioplatense; código, commits e identificadores en inglés.
- **Proyecto didáctico**: Adam está aprendiendo SvelteKit con este repo (el segundo). La enseñanza va en la conversación, en ciclos cortos. Docs del repo: solo NORTH y CLAUDE.
- Componentes shadcn que falten se agregan con `bunx shadcn-svelte@latest add <nombre>`, no se reimplementan.
- La estética default de shadcn (slate, dashboard genérico) **no** es la identidad. No copiar la consola Palantir del dashboard.

## Diseño

Metáfora visual: abierta. Se elige al construir la primera pantalla. Hasta entonces: shadcn como cimiento, no como look final.

## Reglas inviolables

- Nunca commitear secretos, tokens, API keys o passwords.
- El proceso no escucha fuera de `127.0.0.1`.
- El browser no hace fetch a internet.
- Spawn de CLIs siempre con array de args, nunca `shell: true` con input del usuario.
- Una tool offline no hereda red del downloader.
- No consultar terceros “para chequear privacidad” (HIBP, VirusTotal, etc.).
- Cualquier cambio fuera de `toolbox/` requiere confirmación humana explícita.

## Estructura (objetivo)

```
src/
  hooks.server.ts
  app.css
  lib/
    server/
      db.ts            # bun:sqlite, tabla jobs
      jobs.ts          # cola + spawn + progreso
      binaries.ts      # detectar yt-dlp, ffmpeg, whisper-cli, exiftool
      download.ts
      compress.ts
      transcribe.ts
      metadata.ts
      urls.ts
      markdown.ts
    components/
      ui/              # shadcn-svelte
  routes/
    +layout.svelte     # shell: nav de tools
    +page.svelte       # índice / hub
    download/
    compress/
    markdown/
    transcribe/
    metadata/
    urls/
storage/               # gitignored
NORTH.md
CLAUDE.md
```

## Comandos comunes

```bash
bun install
bun run dev            # http://127.0.0.1:3460
bun run build
bun ./build/index.js
bunx shadcn-svelte@latest add button
```

## Contexto del usuario

Adam Dubove. toolbox es local-only (`127.0.0.1:3460`). No se despliega al VPS.
