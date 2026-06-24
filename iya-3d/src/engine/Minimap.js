/* ============================================================
 * Minimap.js — top-down 2D minimap drawn to a small canvas.
 * Shows walls, guards (with state color), the player + heading,
 * and the current objective. Reads world coords from the level.
 * ============================================================ */
class Minimap {
  constructor(level){
    this.level = level;
    this.canvas = document.getElementById('minimap');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    document.getElementById('minimap-wrap').classList.remove('hidden');
    // world bounds (centered on origin)
    const T = level.T;
    this.halfW = level.W * T / 2;
    this.halfH = level.H * T / 2;
  }

  // world (x,z) -> canvas (px,py)
  _p(x, z){
    const w = this.canvas.width, h = this.canvas.height, m = 8;
    const px = m + ((x + this.halfW) / (this.halfW*2)) * (w - 2*m);
    const py = m + ((z + this.halfH) / (this.halfH*2)) * (h - 2*m);
    return [px, py];
  }

  update(game){
    if(!this.ctx) return;
    const c = this.ctx, w = this.canvas.width, h = this.canvas.height;
    c.clearRect(0,0,w,h);
    c.fillStyle = 'rgba(10,7,4,.78)'; c.fillRect(0,0,w,h);

    // walls
    c.fillStyle = 'rgba(160,72,40,.85)';
    const T = this.level.T, s = ((w-16)/(this.halfW*2)) * T;
    this.level.walls.forEach(a => {
      const [px,py] = this._p((a.minX+a.maxX)/2, (a.minZ+a.maxZ)/2);
      c.fillRect(px - s/2, py - s/2, Math.max(1.5,s), Math.max(1.5,s));
    });

    // objective
    let obj = null;
    if(game.objectiveTaken) obj = this.level.exit;
    else if(this.level.planItem && this.level.planItem.visible) obj = this.level.planItem.position;
    if(obj){
      const [ox,oy] = this._p(obj.x, obj.z);
      c.fillStyle = '#f0c040';
      c.beginPath(); c.moveTo(ox,oy-4); c.lineTo(ox+4,oy+3); c.lineTo(ox-4,oy+3); c.closePath(); c.fill();
    }

    // guards
    game.guards.forEach(g => {
      const [gx,gy] = this._p(g.position.x, g.position.z);
      c.fillStyle = g.state==='alert' ? '#ff3030' : g.state==='suspicious' ? '#f0c040' : '#40c060';
      c.beginPath(); c.arc(gx,gy,2.6,0,Math.PI*2); c.fill();
    });

    // player + heading
    const p = game.player.position;
    const [pxx,pyy] = this._p(p.x, p.z);
    c.save(); c.translate(pxx,pyy); c.rotate(game.player.heading);
    c.fillStyle = '#E06040';
    c.beginPath(); c.moveTo(5,0); c.lineTo(-3,3); c.lineTo(-3,-3); c.closePath(); c.fill();
    c.restore();
  }

  destroy(){ const w=document.getElementById('minimap-wrap'); if(w) w.classList.add('hidden'); }
}
window.Minimap = Minimap;
