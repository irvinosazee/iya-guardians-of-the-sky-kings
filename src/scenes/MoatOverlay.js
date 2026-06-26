/* ============================================================
 * MoatOverlay.js — DOM Moat builder. Click or DRAG across the
 * glowing ring tiles to dig them (great for touch). Bigger cells
 * on mobile via CSS.
 * ============================================================ */
const Moat = {
  onClose: null,
  _dragging: false,
  _wired: false,

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
        cell.dataset.key = key;
        cell.dataset.req = required ? '1' : '0';
        cell.className = 'aspect-square rounded-[3px] ' +
          (dug ? 'bg-sky-600' : required ? 'bg-amber-800/70 ring-1 ring-amber-500/60 cursor-pointer' : 'bg-stone-800/40');
        grid.appendChild(cell);
      }
    }
    if(!this._wired){ this._wireDrag(grid); this._wired = true; }
    this.refresh();
  },

  _wireDrag(grid){
    const digAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      if(el && el.dataset && el.dataset.req === '1') this.dig(el.dataset.key);
    };
    grid.addEventListener('pointerdown', (e) => { this._dragging = true; digAt(e.clientX, e.clientY); e.preventDefault(); });
    grid.addEventListener('pointermove', (e) => { if(this._dragging) digAt(e.clientX, e.clientY); });
    window.addEventListener('pointerup', () => { this._dragging = false; });
    grid.style.touchAction = 'none';
  },

  dig(key){
    if(GameState.moat.dug[key]) return;       // already dug — stay quiet during a drag
    const res = GameState.digCell(key);
    if(res === 'ok'){
      const cell = document.querySelector('#moat-grid [data-key="' + key + '"]');
      if(cell) cell.className = 'aspect-square rounded-[3px] bg-sky-600';
      if(window.Sound) Sound.dig();
      if(window.Haptics) Haptics.tap();
      if(window.autosave) autosave();
      this.refresh();
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
