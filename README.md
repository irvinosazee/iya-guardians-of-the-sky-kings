# Iya: Guardians of the Sky-Kings

A top-down stealth + crafting + city-builder game set in 15th-century Benin City
(*Igodomigodo*), during the reign of Oba Ewuare. Built with **Phaser 3** and
**Tailwind CSS**. You play **Adesua**, a royal bronze caster who must steal
construction plans, forge bronze plaques, and dig the Great Iya moat to guard the
Oba from the Ogiso loyalists.

## How to run

**Just double-click `index.html`** — it runs in any modern browser with no build
step and no local server (scripts are loaded as ordered `<script>` tags, not ES
modules, so `file://` works). An internet connection is needed the first time to
pull Phaser + Tailwind from their CDNs.

Optional (nicer): serve it locally —
```bash
cd "SEN 408/iya"
python3 -m http.server 8000
# open http://localhost:8000
```

## Controls

| Key | Action |
|-----|--------|
| **WASD / Arrows** | Move Adesua |
| **F** | Open the Forge (crafting) |
| **B** | Open the Moat builder |
| **ESC** | Close the Moat builder |
| Stand in a **bush** | Hide (breaks guard line-of-sight) |

## The game loop

1. **Stealth** — sneak past patrolling guards, grab materials + cowries, steal the
   plans, and reach the gate. Getting fully detected costs health.
2. **Forge (F)** — spend materials on bronze plaques that buff you: more health
   (coral), −35% noise (leopard), and mud-dash (mudfish).
3. **Moat (B)** — spend cowries to dig the ring-shaped Iya. A sealed moat thins out
   night patrols — and is required for the final victory in Act III.

Earn in stealth → spend in Forge/Moat → stealth gets easier → win.

## Architecture (for the write-up)

```
index.html            UI helper + Tailwind overlays (HUD, dialogue, forge)
src/state.js          Global game state: resources, tech tree, story, moat
src/main.js           Phaser config + scene routing
src/entities/
  Player.js           Movement + stealth state (hidden / noise)
  Guard.js            Patrol AI, vision cone, raycast LOS, calm→suspicious→alert FSM
  MoatGrid.js         Moat grid view-model
src/scenes/
  BootScene.js        Procedural canvas texture generation (no image files needed)
  MenuScene.js        Title + Act I narrative
  StealthScene.js     Core gameplay loop
  ForgeScene.js       Crafting (Tailwind DOM overlay)
  BuildScene.js       16×16 moat construction grid
  VictoryScene.js     End screen
```

### Concepts demonstrated
- **AI vision & detection:** distance + field-of-view check, then a
  `Line → Rectangle` raycast against wall geometry for true line-of-sight.
- **Finite state machine:** each guard runs `calm → suspicious → alert`.
- **Arcade physics:** velocity-based movement, collision, overlap triggers.
- **Scene management:** boot/menu/gameplay routing, plus overlay scenes via
  `launch` + `pause`/`resume`.
- **State-driven progression:** a single global state object ties stealth rewards
  to crafting buffs and moat safety.
