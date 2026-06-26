/* ============================================================
 * ForgeScene.js — The Artisan's Forge (crafting / tech tree).
 * Rendered as a Tailwind DOM overlay (per spec) rather than a
 * Phaser canvas scene, so the inventory UI stays responsive.
 * Exposes window.Forge = { open, close, render }.
 * ============================================================ */
const Forge = {
  onClose: null,

  open(onClose){
    this.onClose = onClose || null;
    this.render();
    const ov = document.getElementById('forge-overlay');
    ov.classList.remove('hidden'); ov.classList.add('flex');
  },

  close(){
    const ov = document.getElementById('forge-overlay');
    ov.classList.add('hidden'); ov.classList.remove('flex');
    const cb = this.onClose; this.onClose = null;
    if(cb) cb();
  },

  render(){
    const m = GameState.materials;
    document.getElementById('forge-mats').textContent =
      `Coral ${m.coral}   •   Bronze ${m.bronze}   •   Mudfish ${m.mudfish}   •   Cowries ${GameState.cowries}`;

    const body = document.getElementById('forge-cards');
    body.innerHTML = '';

    Object.values(GameState.PLAQUES).forEach(p => {
      const owned  = !!GameState.ownedPlaques[p.id];
      const afford = GameState.canAfford(p.cost);
      const costStr = Object.entries(p.cost).map(([k,v]) => `${v} ${k}`).join(', ');

      const card = document.createElement('div');
      card.className = 'bg-stone-800/80 border border-amber-700/40 rounded-xl p-4 flex flex-col';
      card.innerHTML = `
        <div class="flex items-center gap-3 sm:block">
          <div class="text-4xl mb-1">${p.icon}</div>
          <div class="text-amber-300 font-semibold text-lg">${p.name}</div>
        </div>
        <div class="text-stone-300 text-sm flex-1 my-2 leading-relaxed">${p.desc}</div>
        <div class="text-xs text-stone-400 mb-2">Cost: ${costStr}</div>`;

      const btn = document.createElement('button');
      const big = 'py-3 text-base rounded-lg font-semibold transition';
      if(owned){
        btn.textContent = '✓ Forged';
        btn.disabled = true;
        btn.className = big + ' bg-emerald-700/60 text-emerald-100 cursor-default';
      } else if(!afford){
        btn.textContent = 'Need materials';
        btn.disabled = true;
        btn.className = big + ' bg-stone-700 text-stone-400 cursor-not-allowed';
      } else {
        btn.textContent = 'Forge plaque';
        btn.className = big + ' bg-amber-600 hover:bg-amber-500 text-stone-900';
        btn.onclick = () => {
          if(GameState.craft(p.id)){
            if(window.Sound) Sound.craft();
            if(window.Haptics) Haptics.craft();
            UI.toast(p.name + ' forged!');
            this.render();
            UI.updateHUD();
            if(window.autosave) autosave();
          }
        };
      }
      card.appendChild(btn);
      body.appendChild(card);
    });
  },
};
window.Forge = Forge;
