# Iya: Guardians of the Sky-Kings — Presentation Brief

*Everything a teammate needs to present the project: the story, the tech, the
architecture, the mechanics, and a ready-to-use talk script.*

---

## 1. One-line pitch

> **Iya: Guardians of the Sky-Kings** is a stealth game set in 15th-century Benin
> City. You play **Adesua**, a royal bronze caster, sneaking through the palace at
> night to protect Oba Ewuare. It ships in **two versions from one codebase** — a
> 3D third-person game and a classic 2D top-down game — both running in the browser
> with **no installation and no build step**.

---

## 2. Back story & setting (the narrative)

The game is rooted in **real history**: the **Kingdom of Benin** (*Igodomigodo*) and
its famous earthworks, the **Iya** — the Great Moat that once ringed Benin City
(among the largest man-made earthworks in the world).

- **Protagonist — Adesua:** a Royal Bronze Caster. Benin was renowned for its
  bronze/brass plaque art ("Benin Bronzes").
- **The ruler — Oba Ewuare** (Ewuare the Great): the historical Oba credited with
  rebuilding the city and its defensive moats.
- **The threat — the Ogiso loyalists:** remnants of the old *Ogiso* ("Sky-Kings")
  dynasty, plotting to assassinate the Oba before the **Igue festival**.
- **The mentor — Iyoba Idia:** the Queen Mother, a powerful historical figure, who
  lends "juju" (ancestral charms) for the final act.

**Three acts:**
1. **The Shadows of Igodomigodo** — steal the assassins' plans by night.
2. **The Trench and the Totem** — Oba Ewuare decrees the building of the Great Iya;
   you both steal plans and oversee digging.
3. **The Queen Mother's Blessing** — seek Iyoba Idia and seal the moat to break the
   curse and win.

**Educational angle for the talk:** the game teaches real Edo/Benin heritage —
bronze casting, cowrie-shell currency, coral regalia, the moat, the Oba and Queen
Mother — wrapped in playable mechanics.

---

## 3. The core gameplay loop

```
   STEAL (stealth missions)  →  earn cowries + materials
            │                              │
            ▼                              ▼
   BUILD the Moat (spend cowries)   FORGE plaques (spend materials)
   → fewer guards, required to win  → permanent upgrades
            └──────────────┬───────────────┘
                           ▼
              stealth gets easier → clear 3 acts → win
```

- **Stealth:** avoid guards' vision cones, hide in bushes, stay in shadow, steal the
  plans (a scroll), reach the gate. Getting fully detected costs a "coral bead" of health.
- **Forge:** craft three bronze plaques — **Coral** (+health), **Leopard** (quieter
  steps), **Mudfish** (dash through mud).
- **Moat:** a 16×16 grid; spend cowrie shells to dig the ring. A sealed moat reduces
  night patrols and is required for the final victory.

---

## 4. Technology used (the stack)

| Area | 3D version (root) | 2D version (`/2d/`) |
|---|---|---|
| **Engine** | **Three.js** r149 (WebGL) | **Phaser 3.60** |
| **UI** | **Tailwind CSS** (CDN) + custom DOM HUD | Tailwind + DOM HUD |
| **Language** | Vanilla **JavaScript** (no framework, no bundler) | Vanilla JavaScript |
| **Art** | **Procedural 3D meshes** (built in code) | **Procedural canvas textures** |
| **Audio** | **Web Audio API** — sound synthesized in code | Same engine |
| **Saves** | **IndexedDB** (progress) + **localStorage** (settings) | Same |
| **Loading** | Ordered `<script>` tags (runs from `file://`) | Same |

**Key engineering decisions worth mentioning in the talk:**
- **No build step.** Everything loads via plain `<script>` tags, so the game opens by
  double-clicking `index.html` — no Node, no npm, no webpack. (We deliberately used
  Three.js's *classic global build* to keep this true.)
- **Procedural everything.** No downloaded art or audio assets — sprites, 3D models,
  textures, and all sound effects/music are generated in code. This keeps the repo
  tiny, license-clean, and instantly runnable.
- **Shared game logic.** The state, resources, tech-tree, save system, settings,
  sound, and tutorial are written once and reused by *both* the 2D and 3D games.

---

## 5. How the key systems work (talking points)

**AI guard detection (the "smart" part):**
- Each guard has a **vision cone** (radius + field-of-view angle).
- Detection = three checks: (1) is the player within radius? (2) within the cone
  angle? (3) **line-of-sight** — a ray from guard to player that must not hit a wall.
- In 3D this uses a real **`THREE.Raycaster`**; in 2D it's a line-vs-rectangle test.
- Guards run a **finite-state machine**: **calm → suspicious → alert** (green →
  yellow → red cones), with hearing (a moving player makes noise) and "last seen"
  investigation.

**Other systems:**
- **Light & shadow stealth (3D):** standing in torchlight makes you easier to spot;
  shadows hide you.
- **Crouch / Sprint / Distraction throw (3D):** quiet-slow vs fast-loud movement, and
  a thrown pebble that lures guards away.
- **Difficulty scaling, auto-save, settings** (volume, brightness, sensitivity,
  reduce-motion), a **guided tutorial**, **minimap**, objective beam + arrow, and a
  **per-guard "eye" detection meter**.
- **Mobile:** auto-detected touch controls — virtual joystick, drag-to-look,
  pinch-zoom, on-screen action buttons, landscape prompt, and a low-spec performance
  mode for phone GPUs.

---

## 6. Architecture (file map)

```
index.html            3D game — Three.js
src/
  engine/             World3D (scene/lights/shadows), OrbitCameraRig,
                      Input, TouchControls, Minimap
  entities/           MeshFactory (all procedural models), Player3D, Guard3D
  game/               Level3D (builds the palace), StealthGame (main loop)
  managers/           Sound, Settings, Storage (IndexedDB), Tutorial
  scenes/             ForgeScene, MoatOverlay
  ui.js, main3d.js    HUD/overlay bridge + boot

2d/index.html         classic 2D game — Phaser
2d/src/               scenes (Boot/Menu/Stealth/Forge/Build/Victory),
                      entities (Player/Guard/MoatGrid), managers, state

assets/brand/         favicons, Open Graph image, web manifest (SEO/branding)
docs/                 design specs + this brief
vercel.json           static deploy config
```

**Design principle:** logic is separated from rendering. The same state machine and
detection math power both a 2D Phaser renderer and a 3D Three.js renderer.

---

## 7. Running & hosting

- **Run locally:** double-click `index.html` (3D) or `2d/index.html` (2D). Needs
  internet on first load to fetch the CDN libraries.
- **Deploy:** static, zero-config on **Vercel** (or any static host). After deploy:
  `/` → 3D game, `/2d/` → 2D game.
- **SEO/branding done:** full favicon set, 1200×630 Open Graph social image, meta
  tags, web manifest (installable), `robots.txt`, `sitemap.xml`.
- **Source:** the project is in Git and pushed to GitHub.

---

## 8. Suggested 5-minute talk script

1. **Hook (30s):** "We built a stealth game set in the real Kingdom of Benin — you're
   a bronze caster protecting Oba Ewuare — and it runs in any browser with zero
   installation, in both 2D and full 3D."
2. **Story (45s):** Adesua, the Ogiso plot, the three acts, the Great Iya moat — tie
   it to real Benin history (bronzes, the moat, Iyoba Idia).
3. **Demo (90s):** Show the 3D game — move with the camera, walk into a guard's cone
   to show the meter rising, hide in a bush, steal the plans, reach the gate. Then
   open Forge and the Moat builder to show the loop.
4. **Tech (60s):** "No game engine downloads, no build tools — Three.js + Phaser +
   vanilla JS. All art and sound are generated in code. The guard AI uses vision
   cones with raycast line-of-sight and a calm/suspicious/alert state machine."
5. **Engineering highlights (45s):** one codebase → two renderers; auto-save;
   settings; mobile touch controls; deployed on Vercel.
6. **Close (30s):** "It's playable now on desktop and mobile — and it teaches real
   Edo heritage through play."

---

## 9. Quick Q&A prep

- **"Why two versions?"** The 2D was built first as a reliable, fast deliverable; the
  3D is the showcase. They share logic, so we got both for limited extra cost.
- **"What was hardest?"** Porting the stealth detection to 3D (raycast line-of-sight)
  and building a good third-person orbit camera with wall-aware zoom.
- **"Any AI / pathfinding?"** Guards use waypoint patrols, vision-cone detection with
  raycasting, and a finite-state machine; the distraction system makes them
  investigate noises.
- **"Is the history accurate?"** The setting, figures (Ewuare, Idia), the Iya moat,
  bronze casting, and cowrie currency are real; the plot is dramatized.
