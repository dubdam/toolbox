# toolbox

Ferretería local: utilidades que reemplazan sitios ajenos (xdownload, TinyPNG, strippers de metadatos, transcripción). Corre en `http://127.0.0.1:3460`. El browser no habla con internet.

Local hardware store: replacements for third-party web utilities (xdownload, TinyPNG, metadata strippers, transcription). Runs at `http://127.0.0.1:3460`. The browser does not talk to the internet.

**v0:** downloader (YouTube/X) · PNG/JPG compressor · Markdown (ByteMD) · URL cleaner · metadata · transcription (OpenAI).

[NORTH.md](NORTH.md) · [CLAUDE.md](CLAUDE.md) · [MIT](LICENSE)

---

## Español

### Requisitos

- [Bun](https://bun.sh)
- `yt-dlp` y `ffmpeg` en PATH (downloader; ffmpeg también para video)
- `exiftool` opcional (metadatos sin re-encodear fotos)
- `OPENAI_API_KEY` solo si usás transcripción

### Uso

```bash
bun install
# crear .env con OPENAI_API_KEY=... si vas a transcribir
bun run dev        # http://127.0.0.1:3460
bun test src
bun run check
```

El proceso **solo escucha en localhost**. No hay deploy ni nginx.

`.env` y `storage/` no van a git.

### Transcripción

Default `gpt-transcribe`. Opción `whisper-1`. El audio **sale a OpenAI**. El resto de las tools es offline, salvo yt-dlp al bajar.

---

## English

### Requirements

- [Bun](https://bun.sh)
- `yt-dlp` and `ffmpeg` on PATH (downloader; ffmpeg also for video)
- `exiftool` optional (strip photo metadata without re-encoding)
- `OPENAI_API_KEY` only if you use transcription

### Usage

```bash
bun install
# create .env with OPENAI_API_KEY=... if you will transcribe
bun run dev        # http://127.0.0.1:3460
bun test src
bun run check
```

The process **listens on localhost only**. No deploy, no nginx.

`.env` and `storage/` are gitignored.

### Transcription

Default `gpt-transcribe`. Option `whisper-1`. Audio **is sent to OpenAI**. Every other tool is offline, except yt-dlp when downloading.
