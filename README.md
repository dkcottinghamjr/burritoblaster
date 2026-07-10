# 🌯 Burrito Blaster

A physics-based slingshot game prototype (Angry Birds-style) built with
**Matter.js** (via CDN) and vanilla JS in a strict **MVC** architecture.
No build step, no framework, no dependencies to install.

## Run it

You need a local web server so the browser loads the scripts over `http://`
(some browser features — like the Web Audio API used for sound — behave
better over http than from a `file://` path).

**With Node (recommended):**

```bash
npm run dev
```

This starts a tiny zero-dependency static server (`server.js`) and prints a
`http://127.0.0.1:8080/` URL — open it in your browser. Nothing is
downloaded or installed; it uses only Node's built-in modules.

- Port in use? It automatically tries 8081, 8082, … or set one yourself:
  `PORT=3000 npm run dev`

**No Node? Any static server works, e.g. Python:**

```bash
python3 -m http.server 8080
# then open http://127.0.0.1:8080/
```

**Quickest look:** you can also just open `index.html` directly in a
browser. Everything renders; only audio may be slightly more restricted.

## Project layout (MVC)

| File | Role |
|------|------|
| `config.js`     | **The brain.** Every tunable value — physics, levels, scoring, juice, audio, haptics. |
| `model.js`      | **Model.** Matter.js engine, bodies, game state machine, trajectory prediction. |
| `view.js`       | **View.** Canvas rendering, particles, chips, popups, screen shake. |
| `controller.js` | **Controller.** Input, main loop, HUD/DOM, persistence, collision → juice. |
| `audio.js`      | Procedural Web Audio (no sample files). |
| `haptics.js`    | `navigator.vibrate` wrapper (Android; no-op on iOS). |
| `index.html`    | Page shell, HUD, overlays, styles, script bootstrap. |
| `server.js`     | Zero-dependency dev server (only used by `npm run dev`). |

## Controls

- **Drag** the burrito on the chili launcher, aim, and release to fire.
- Keyboard: **R** retry · **N** next level · **1–5** jump to a level.
