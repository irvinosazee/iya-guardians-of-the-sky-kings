/* ============================================================
 * state.js — Global game state (Resources, Tech Tree, Story).
 * Plain global object (no ES modules) so the game runs from file://
 * ============================================================ */
const GameState = {
  // --- Story progress ---
  currentAct: 1,
  maxAct: 3,

  // --- Resources ---
  cowries: 40,
  materials: { coral: 0, bronze: 0, mudfish: 0 },

  // --- Player stats / buffs (mutated by forged plaques) ---
  maxHealth: 3,
  hp: 3,
  noiseMultiplier: 1,    // Leopard plaque -> 0.65  (smaller hearing radius)
  canMudDash: false,     // Mudfish plaque -> true  (no mud slowdown)
  ownedPlaques: {},      // id -> true

  // --- Tech tree: craftable bronze plaques ---
  PLAQUES: {
    coral:   { id:'coral',   name:'Coral Bead Strand',     icon:'🔴', cost:{ coral:3 },
               desc:'Royal coral regalia steels the heart. +2 max health.' },
    leopard: { id:'leopard', name:'Bronze Leopard Plaque', icon:'🐆', cost:{ bronze:4 },
               desc:'Tread like the leopard. −35% noise, so guards hear you from much closer.' },
    mudfish: { id:'mudfish', name:'Mudfish Plaque',        icon:'🐟', cost:{ mudfish:2 },
               desc:"Ewuare's mudfish glides through mire. Dash through mud with no slowdown." },
  },

  // --- Moat city-builder data (16x16; required cells form a square ring) ---
  moat: { size:16, ring:{ min:3, max:12 }, cost:5, required:[], dug:{} },

  init(){
    const { min, max } = this.moat.ring;
    const req=[];
    for(let r=min; r<=max; r++)
      for(let c=min; c<=max; c++)
        if(r===min || r===max || c===min || c===max) req.push(r+','+c);
    this.moat.required = req;
  },

  // --- Moat helpers ---
  digCell(key){
    if(!this.moat.required.includes(key)) return 'invalid';
    if(this.moat.dug[key]) return 'already';
    if(this.cowries < this.moat.cost) return 'poor';
    this.cowries -= this.moat.cost;
    this.moat.dug[key] = true;
    return 'ok';
  },
  moatProgress(){
    const total = this.moat.required.length || 1;
    let dug=0; this.moat.required.forEach(k=>{ if(this.moat.dug[k]) dug++; });
    return dug/total;
  },
  isMoatComplete(){ return this.moatProgress() >= 1; },

  // --- Crafting ---
  canAfford(cost){ return Object.entries(cost).every(([m,n]) => this.materials[m] >= n); },
  craft(id){
    const p = this.PLAQUES[id];
    if(!p || this.ownedPlaques[id] || !this.canAfford(p.cost)) return false;
    Object.entries(p.cost).forEach(([m,n]) => this.materials[m] -= n);
    this.ownedPlaques[id] = true;
    if(id==='coral'){ this.maxHealth += 2; this.hp += 2; }
    if(id==='leopard'){ this.noiseMultiplier = 0.65; }
    if(id==='mudfish'){ this.canMudDash = true; }
    return true;
  },

  reset(){
    this.currentAct=1; this.cowries=40;
    this.materials={ coral:0, bronze:0, mudfish:0 };
    this.maxHealth=3; this.hp=3; this.noiseMultiplier=1; this.canMudDash=false;
    this.ownedPlaques={}; this.moat.dug={};
  },

  // --- save/load serialization ---
  serialize(){
    return {
      currentAct:this.currentAct, cowries:this.cowries,
      materials:{ ...this.materials },
      maxHealth:this.maxHealth, hp:this.hp,
      noiseMultiplier:this.noiseMultiplier, canMudDash:this.canMudDash,
      ownedPlaques:{ ...this.ownedPlaques }, moatDug:{ ...this.moat.dug },
    };
  },
  apply(d){
    if(!d) return;
    this.currentAct = d.currentAct || 1;
    this.cowries = d.cowries != null ? d.cowries : 40;
    this.materials = Object.assign({ coral:0, bronze:0, mudfish:0 }, d.materials || {});
    this.maxHealth = d.maxHealth || 3;
    this.hp = d.hp != null ? d.hp : this.maxHealth;
    this.noiseMultiplier = d.noiseMultiplier || 1;
    this.canMudDash = !!d.canMudDash;
    this.ownedPlaques = d.ownedPlaques || {};
    this.moat.dug = d.moatDug || {};
  },
};
GameState.init();
window.GameState = GameState;
