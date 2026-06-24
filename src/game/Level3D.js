/* ============================================================
 * Level3D.js — builds the palace from the same tile grid the
 * 2D game used. Converts grid (col,row) -> world (x,z).
 * Exposes collision AABBs, wall meshes (for LOS raycast),
 * items, bush/mud volumes, gate, brazier lights, guard routes.
 * ============================================================ */
class Level3D {
  constructor(world){
    this.world = world;
    this.T = MeshFactory.T;
    this.W = 26; this.H = 18;
    this.walls = [];        // AABBs {minX,maxX,minZ,maxZ}
    this.wallMeshes = [];   // for raycasting LOS
    this.items = [];        // groups with userData.itemType
    this.bushes = [];       // {x,z,r}
    this.muds = [];         // {x,z,r}
    this.brazierFires = [];
    this.lights = [];       // {x,z,range} for light/shadow stealth
    this.build();
  }

  // grid cell center -> world coords
  wx(col){ return (col - this.W/2 + 0.5) * this.T; }
  wz(row){ return (row - this.H/2 + 0.5) * this.T; }

  build(){
    const scene = this.world.scene, T = this.T;

    // ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(this.W*T, this.H*T),
      MeshFactory.mat(MeshFactory.COL.floor, { roughness: 1 }));
    ground.rotation.x = -Math.PI/2; ground.receiveShadow = true;
    scene.add(ground);
    // subtle grid lines
    const grid = new THREE.GridHelper(this.W*T, this.W, 0x6b4a2a, 0x5a3e22);
    grid.position.y = 0.02; grid.material.opacity = 0.25; grid.material.transparent = true;
    scene.add(grid);

    const addWall = (col, row) => {
      const m = MeshFactory.wall();
      m.position.set(this.wx(col), m.position.y, this.wz(row));
      // face stud outward-ish randomly (cosmetic)
      m.rotation.y = (Math.floor((col+row)) % 4) * Math.PI/2;
      scene.add(m);
      this.wallMeshes.push(m);
      const hx = this.wx(col), hz = this.wz(row);
      this.walls.push({ minX:hx-T/2, maxX:hx+T/2, minZ:hz-T/2, maxZ:hz+T/2 });
    };

    // border
    for(let x=0;x<this.W;x++){ addWall(x,0); addWall(x,this.H-1); }
    for(let y=1;y<this.H-1;y++){ addWall(0,y); addWall(this.W-1,y); }
    // internal walls (same layout as 2D)
    const cells = [];
    const vline=(x,y0,y1)=>{ for(let y=y0;y<=y1;y++) cells.push([x,y]); };
    const hline=(y,x0,x1)=>{ for(let x=x0;x<=x1;x++) cells.push([x,y]); };
    vline(7,1,6); vline(15,4,12); hline(9,9,14);
    for(let x=18;x<=21;x++) for(let y=8;y<=10;y++) cells.push([x,y]);
    cells.forEach(([x,y]) => addWall(x,y));

    // pillars (decor, no collision needed beyond walls)
    [[7,1],[15,4],[15,12],[9,9],[14,9]].forEach(([c,r])=>{
      const p = MeshFactory.pillar(); p.position.set(this.wx(c), 0, this.wz(r)); scene.add(p);
    });

    // collectibles
    const place=(c,r,type)=>{
      const g = MeshFactory.item(type);
      g.position.set(this.wx(c), 0, this.wz(r));
      scene.add(g); this.items.push(g); return g;
    };
    [[2,4],[20,14]].forEach(p=>place(p[0],p[1],'coral'));
    [[12,2],[3,14]].forEach(p=>place(p[0],p[1],'bronze'));
    [[23,8],[10,15]].forEach(p=>place(p[0],p[1],'mudfish'));
    [[22,3],[4,8],[13,15],[18,2],[8,12]].forEach(p=>place(p[0],p[1],'cowrie'));
    this.planItem = place(12,12,'plan');

    // bushes (hide volumes)
    [[10,2],[11,2],[2,9],[2,10],[20,5],[21,5],[5,15],[6,15]].forEach(([c,r])=>{
      const b = MeshFactory.bush(); b.position.set(this.wx(c), 0, this.wz(r)); scene.add(b);
      this.bushes.push({ x:this.wx(c), z:this.wz(r), r:T*0.6 });
    });

    // mud
    [[16,14],[17,14],[16,15],[17,15]].forEach(([c,r])=>{
      const m = MeshFactory.mud(); m.position.set(this.wx(c), 0.02, this.wz(r)); scene.add(m);
      this.muds.push({ x:this.wx(c), z:this.wz(r), r:T*0.5 });
    });

    // gate / exit
    this.exit = { x: this.wx(24), z: this.wz(1) };
    const gate = MeshFactory.gate(); gate.position.set(this.exit.x, 0, this.exit.z);
    gate.rotation.y = Math.PI; scene.add(gate); this.gate = gate;
    const gateLight = new THREE.PointLight(0xf0c040, 0.8, 10); gateLight.position.set(this.exit.x, 2.5, this.exit.z);
    scene.add(gateLight);
    this.lights.push({ x:this.exit.x, z:this.exit.z, range:6 });
    const gGlow = MeshFactory.glow(0xf0c040, 4); gGlow.position.set(this.exit.x, 1.6, this.exit.z); scene.add(gGlow);

    // braziers + warm point lights + ember points
    [[5,3],[13,8],[20,12],[9,12]].forEach(([c,r])=>{
      const bz = MeshFactory.brazier(); bz.position.set(this.wx(c), 0, this.wz(r)); scene.add(bz);
      this.brazierFires.push(bz.getObjectByName('fire'));
      const pl = new THREE.PointLight(0xff8a30, 1.1, 9, 2); pl.position.set(this.wx(c), 1.6, this.wz(r));
      scene.add(pl);
      this.lights.push({ x:this.wx(c), z:this.wz(r), range:8 });
      const glow = MeshFactory.glow(0xff9030, 3.2); glow.position.set(this.wx(c), 1.5, this.wz(r)); scene.add(glow);
      this._embers(this.wx(c), 1.5, this.wz(r));
    });

    // start + guard routes (in world coords)
    this.playerStart = { x: this.wx(1), z: this.wz(1) };
    this._routes = [
      [[9,2],[13,2],[13,5],[9,5]],
      [[3,16],[22,16]],
      [[23,3],[23,12]],
      [[4,11],[14,11],[14,13],[4,13]],
      [[9,7],[14,7]],
    ];
  }

  guardRoutes(count){
    return this._routes.slice(0, count).map(r => r.map(([c,row]) => ({ x:this.wx(c), z:this.wz(row) })));
  }

  _embers(x, y, z){
    const N = window.MOBILE ? 8 : 18, pos = new Float32Array(N*3);
    for(let i=0;i<N;i++){ pos[i*3]=x+(Math.random()-0.5)*0.3; pos[i*3+1]=y+Math.random()*0.5; pos[i*3+2]=z+(Math.random()-0.5)*0.3; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    const mat = new THREE.PointsMaterial({ color:0xffb04a, size:0.12, transparent:true, opacity:0.9, depthWrite:false });
    const pts = new THREE.Points(geo, mat); pts.userData.base = { x, y, z };
    this.world.scene.add(pts);
    (this._emberSets = this._emberSets || []).push(pts);
  }

  update(time){
    // flicker fires + drift embers
    this.brazierFires.forEach((f,i)=>{ if(f){ const s = 0.85 + Math.sin(time*0.01 + i)*0.18; f.scale.set(s, 1+Math.sin(time*0.013+i)*0.25, s); } });
    if(this._emberSets) this._emberSets.forEach(p=>{
      const a = p.geometry.attributes.position, b = p.userData.base;
      for(let i=0;i<a.count;i++){
        let y = a.getY(i) + 0.012;
        if(y > b.y + 0.9) y = b.y;
        a.setY(i, y);
      }
      a.needsUpdate = true;
    });
    // spin items
    this.items.forEach(g=>{ if(g.visible && g.userData.spin){ g.userData.spin.rotation.y += 0.03; g.userData.spin.position.y = 0.55 + Math.sin(time*0.004 + g.position.x)*0.08; } });
  }
}
window.Level3D = Level3D;
