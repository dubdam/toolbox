# toolbox

Ferretería local: utilidades que reemplazan sitios ajenos (xdownload, TinyPNG, strippers de metadatos, transcripción). Corre en `http://127.0.0.1:3460`. El browser no habla con internet.

**v0:** downloader (YouTube/X), compresor PNG/JPG, Markdown (ByteMD), limpiar URLs, metadatos, transcripción (OpenAI).

Visión y no-goals: [NORTH.md](NORTH.md). Convenciones: [CLAUDE.md](CLAUDE.md).

## Requisitos

- [Bun](https://bun.sh)
- `yt-dlp` y `ffmpeg` en PATH (downloader; ffmpeg también para video)
- `exiftool` opcional (metadatos sin re-encodear fotos)
- `OPENAI_API_KEY` solo si usás transcripción

## Uso

```bash
bun install
# crear .env con OPENAI_API_KEY=... si vas a transcribir
bun run dev        # http://127.0.0.1:3460
bun test src
bun run check
```

El proceso **solo escucha en localhost**. No hay deploy ni nginx.

`.env` y `storage/` no van a git.

## Transcripción

Default `gpt-transcribe`. Opción `whisper-1`. El audio **sale a OpenAI**; el resto de las tools es offline (salvo yt-dlp al bajar).

## Licencia

MIT.
