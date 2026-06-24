# Iya: Guardians of the Sky-Kings

A stealth game set in 15th-century Benin City (*Igodomigodo*), during the reign of
Oba Ewuare. You play **Adesua**, a royal bronze caster: sneak past leopard-cultist
guards, **forge** bronze plaques that upgrade you, and dig the **Great Iya moat** to
guard the Oba across three acts.

This repo ships **two versions** that share the same game logic:

| Version | Location | Tech |
|---------|----------|------|
| **3D** (third-person) — the main game | `/` (repo root) | Three.js (WebGL) |
| **Classic 2D** (top-down) | `/2d/` | Phaser 3 |

## Run locally

Just **double-click `index.html`** (3D) or **`2d/index.html`** (classic). Both run with
no build step and no local server — scripts load as ordered `<script>` tags. An internet
connection is needed on first load to pull Three.js / Phaser / Tailwind from their CDNs.

Optional local server:
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Controls (3D)

| Input | Action |
|-------|--------|
| **WASD** | Move (camera-relative) |
| **Mouse drag** | Orbit the camera · **Scroll** zoom · **Arrows** rotate |
| **Shift** | Sprint (fast, loud) · **C** Crouch (slow, quiet) |
| **E** | Throw a distraction |
| **F** / **B** | Forge / Moat · **Esc** Pause · **H** Help · **M** Mute |
| Stand in a **bush** | Hide (breaks line of sight) |

## The loop

**Steal** materials + cowries in the night → **Forge** plaques (more health, quieter
steps, mud-dash) → spend cowries to dig the **Moat** (thins out patrols). Clear all
three acts **and** seal the moat to win. Progress auto-saves (IndexedDB).

## Deploy (Vercel)

Static, zero-config. Import the repo in Vercel (framework preset **Other**, no build
command, output dir `.`). After deploy:

- `/` → 3D game · `/2d/` → classic 2D game
- Replace `YOUR-PROJECT.vercel.app` in `robots.txt` and `sitemap.xml` with your domain.
- For guaranteed social previews, switch the `og:image` paths to absolute URLs.

## Structure

```
index.html            3D game (Three.js)
src/                  3D engine, entities, game loop, UI
2d/index.html         classic 2D game (Phaser)
2d/src/               2D scenes, entities, managers
assets/brand/         favicons, Open Graph image, web manifest
docs/                 design specs
vercel.json           static deploy config (cleanUrls + asset caching)
```
