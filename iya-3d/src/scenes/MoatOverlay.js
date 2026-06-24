/* ============================================================
 * MoatOverlay.js — DOM-based Moat builder (replaces the Phaser
 * BuildScene for the 3D build). Renders the 16x16 ring grid as
 * HTML cells; clicking a glowing ring tile digs it for cowries.
 * ============================================================ */
const Moat = {
  onClose: null,

  open(onClose){
    this.onClose = onClose || null;
    this.render();
    const ov = document.getElementById('moat-overlay');
    ov.classList.remove('hidden'); ov.classList.add('flex');
  },
  close(){
    const ov = document.getElementById('moat-overlay');
    ov.classList.add('hidden'); ov.classList.remove('flex');
    const cb = this.onClose; this.onClose = null;
    if(window.Sound) Sound.click();
    if(cb) cb();
  },

  render(){
    const size = GameState.moat.size;
    const grid = document.getElementById('moat-grid');
    grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    grid.innerHTML = '';
    for(let r=0;r<size;r++){
      for(let c=0;c<size;c++){
        const key = r+','+c;
        const required = GameState.moat.required.includes(key);
        const dug = !!GameState.moat.dug[key];
        const cell = document.createElement('div');
        cell.className = 'aspect-square rounded-[2px] ' +
          (dug ? 'bg-sky-700' : required ? 'bg-amber-800/70 hover:bg-amber-600 cursor-pointer ring-1 ring-amber-500/60' : 'bg-stone-800/40');
        if(required && !dug) cell.onclick = () => this.dig(key);
        grid.appendChild(cell);
      }
    }
    this.refresh();
  },

  dig(key){
    const res = GameState.digCell(key);
    if(res === 'ok'){
      if(window.Sound) Sound.dig();
      if(window.autosave) autosave();
      this.render();
      if(GameState.isMoatComplete()) UI.toast('The Iya is sealed! Patrols thin out.');
    } else if(res === 'poor'){
      UI.toast('Not enough cowries (need 5). Steal more in the night.');
    }
  },

  refresh(){
    const pct = Math.round(GameState.moatProgress()*100);
    document.getElementById('moat-info').textContent =
      `Cowries: ${GameState.cowries}    Moat: ${pct}%    (a sealed moat reduces night patrols)`;
    document.getElementById('moat-bar').style.width = pct + '%';
    if(window.UI) UI.updateHUD();
  },
};
window.Moat = Moat;
