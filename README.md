# Vice Cover Studio

[![Make GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/competitions/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/memelljk/vice-cover-studio/rank.svg)](https://make.fun/competitions/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/memelljk/vice-cover-studio/reward.svg)](https://make.fun/competitions/gta6-cover-art-01)

**Vice Cover Studio: 5-panel multi-photo covers, 4 sunset/neon grades, 3 layouts, bold caption lettering, PNG export in 3 post sizes.**

An offline web app that turns any photo and a caption into GTA-style multi-panel cover art, exported as a PNG to share. Photos never leave your machine — everything runs in the browser from static files.

## How it works

1. **Add photos** — three demo pictures are loaded already; drop in 1–5 of your own (drag & drop or file picker). One photo can fill every panel, or each panel can use a different photo.
2. **Pick a layout** — Sunset Grid (1 hero + 4 panels), Neon Strip (5 vertical strips), or Vice Duo (2 big panels).
3. **Pick a grade** — Sunset, Neon Nights, Vice Pink, or Palm Noir. Every photo is treated into poster art: posterized colours, gradient-map grade, comic ink outlines, halftone dots, vignette + grain.
4. **Write the caption** — big bold Anton lettering with outline and accent shadow, top or bottom, plus an optional sub-caption.
5. **Crop per panel** — click a panel, drag its photo to move it, scroll to zoom, or use the zoom slider.
6. **Export PNG** — 1080×1080, 1080×1350, or 1920×1080, one click each (or all three at once). No watermark, no upload.

## Run it locally

```sh
node serve.ts        # serves app/ at http://localhost:8080
```

Open the page in desktop Chrome. No build step, no network requests: every script, style, and font is a file under `app/`.

## Build the entry dossier

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored `vendor/makefun-app.ts` library.

## Credits

- Display type: **Anton** by the Anton Project Authors, under the SIL Open Font License 1.1 (see `app/fonts/OFL.txt`).
- Demo pictures are drawn procedurally by the app itself — no real people, no game artwork, no logos.
- License: MIT (see `LICENSE`).
