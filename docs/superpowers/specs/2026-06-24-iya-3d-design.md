# Iya 3D — Design Spec

**Date:** 2026-06-24
**Goal:** Convert the 2D Phaser game "Iya: Guardians of the Sky-Kings" into a full 3D game in the browser, keeping all game logic and running with no build step (opens from `file://`).

## Decisions (locked)
- **Engine:** Three.js, using the **classic global build** (`three.min.js` exposes global `THREE`, no ES modules) so it runs by double-clicking `index.html`, exactly like the 2D version.
- **Camera:** Third-person follow — floats behind/above Adesua, smooth lerp + look-ahead.
- **Assets:** Procedural meshes built from Three.js geometry in code. No downloaded binaries. Consistent with the existing procedural-art approach.
- **Delivery:** New `iya-3d/` folder. The 2D game stays intact and demoable.

## Architecture — logic stays, rendering swaps
The 2D game's logic is 3D-ready and is reused as-is:
- `state.js` — resources, plaques/tech-tree, moat data, save serialization
- `managers/` — `Sound.js`, `Settings.js`, `Storage.js`, `Tutorial.js`
- Forge & Moat UIs — existing Tailwind DOM overlays, reused unchanged

New 3D rendering/movement layer:
```
iya-3d/
  index.html              three.min.js (global CDN) + Tailwind + HUD overlays
  src/
    state.js              (reused)
    managers/*            (reused: Sound, Settings, Storage, Tutorial)
    engine/
      World3D.js          scene, renderer, lights, shadows, resize loop
      CameraRig.js        third-person follow camera
      Input.js            keyboard -> XZ movement vector
    entities/
      MeshFactory.js      all procedural meshes (Adesua, guard, wall, brazier, items)
      Player3D.js         Adesua mesh + movement + collision
      Guard3D.js          guard mesh + patrol + 3D vision cone + raycast LOS + FSM
    game/
      Level3D.js          builds palace from the tile grid
      StealthGame.js      main loop: detection, perceive(), win/lose, acts
```

## Detection model (ported to XZ ground plane)
- **Distance:** Euclidean on (x, z).
- **Facing:** guard forward vector vs guard→player vector; compare angle to FOV/2.
- **Line of sight:** `THREE.Raycaster` from guard to player, tested against wall meshes; any hit closer than the player blocks sight.
- **Hearing:** player moving within `hearingRadius * noiseMultiplier`.
- **Hiding:** standing in a bush volume blocks sight (not sound).
- Detection meter, FSM (calm→suspicious→alert), and difficulty multipliers reuse the 2D tuning.

## Visual style
- Night palace: warm directional "moon/torch" light + point lights at braziers, real shadows.
- Vision cone = translucent cone mesh, recolors green/yellow/red by guard state.
- Procedural Adesua: capsule body (coral), sphere head, cone crown, facing pip.
- Guards: boxy gold body, helm, leopard-spot material, floating !/? sprite.
- Walls: extruded red-clay boxes; braziers: cylinder + ember Points; gate, moat tiles, bushes, mud — all primitives.

## Build phases (each ends with syntax check + commit)
1. **Skeleton:** World3D + follow camera + ground + controllable Adesua. Playable proof.
2. **Level:** walls/floor/props from grid, collision, lighting/shadows.
3. **Guards:** patrol, 3D vision cones, raycast LOS, FSM, detection wired to HUD.
4. **Full loop:** items, plan, gate, acts, Forge/Moat overlays, tutorial, save.
5. **Polish:** particles, camera feel, audio, indicators, win/lose flow.

## Success criteria
- Runs by opening `iya-3d/index.html` (no server, no build).
- You can walk Adesua in 3D with a following camera.
- Guards patrol with visible 3D vision cones and catch the player via real line-of-sight.
- The full earn→forge→moat→win loop works across 3 acts.
- 2D game remains untouched and functional.

## Non-goals
- Rigged skeletal animation (procedural bob/rotation only).
- Downloaded model assets.
- Multiplayer / networking.
