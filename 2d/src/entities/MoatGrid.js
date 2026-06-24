/* ============================================================
 * MoatGrid.js — construction-grid helpers for the Build layer.
 * The grid data itself lives in GameState.moat (so it persists
 * across scenes). This class is a thin view-model the BuildScene
 * uses to translate clicks into dig operations.
 * ============================================================ */
class MoatGrid {
  constructor(){
    this.size = GameState.moat.size;
  }

  key(r, c){ return r + ',' + c; }
  isRequired(r, c){ return GameState.moat.required.includes(this.key(r, c)); }
  isDug(r, c){ return !!GameState.moat.dug[this.key(r, c)]; }

  // Attempt to dig; returns 'ok' | 'already' | 'poor' | 'invalid'
  dig(r, c){ return GameState.digCell(this.key(r, c)); }

  progress(){ return GameState.moatProgress(); }
  isComplete(){ return GameState.isMoatComplete(); }
}
window.MoatGrid = MoatGrid;
