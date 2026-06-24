/* ============================================================
 * Tutorial.js — first-run guided steps. Non-blocking tips that
 * wait for the player to perform each action. Skippable; once
 * finished it sets Settings.tutorialDone so it never repeats.
 * Driven by StealthScene: start() once, update(scene) each frame.
 * ============================================================ */
const Tutorial = {
  active: false,
  step: 0,
  STEPS: [
    { text:'Move with WASD or the Arrow keys.',                         done:(s)=>s._everMoved },
    { text:'Guards see in green cones — avoid them. Step into a leafy bush to hide.', done:(s)=>s._everHid },
    { text:'Collect cowrie shells and crafting materials lying around.', done:(s)=>s._everPicked },
    { text:'Now steal the construction plans — the scroll on the floor.', done:(s)=>s.objectiveTaken },
    { text:'Escape through the glowing gate to finish the act.',         done:()=>false },
  ],

  start(){
    if(window.Settings && Settings.tutorialDone){ this.active = false; return; }
    this.active = true; this.step = 0;
    this._show(this.STEPS[0].text);
  },

  update(scene){
    if(!this.active) return;
    const cur = this.STEPS[this.step];
    if(cur && cur.done(scene)){
      this.step++;
      if(this.step >= this.STEPS.length || this.step === this.STEPS.length - 1){
        // reaching the final "escape" step means the core lesson is taught
        if(this.step >= this.STEPS.length){ this.finish(); return; }
      }
      const next = this.STEPS[this.step];
      if(next) this._show(next.text);
      // mark complete once they've taken the plans (lesson learned)
      if(this.step >= 4 && window.Settings){ Settings.tutorialDone = true; Settings.save(); }
    }
  },

  skip(){
    if(window.Settings){ Settings.tutorialDone = true; Settings.save(); }
    this.finish();
  },

  finish(){
    this.active = false;
    this._hide();
  },

  _show(text){
    const el = document.getElementById('tutorial-tip');
    if(!el) return;
    document.getElementById('tut-text').textContent = text;
    el.classList.remove('hidden'); el.classList.add('flex');
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  },
  _hide(){
    const el = document.getElementById('tutorial-tip');
    if(el){ el.classList.add('hidden'); el.classList.remove('flex'); }
  },
};
window.Tutorial = Tutorial;
