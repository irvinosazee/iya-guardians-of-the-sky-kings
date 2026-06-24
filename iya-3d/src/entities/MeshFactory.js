/* ============================================================
 * MeshFactory.js — builds every game object from procedural
 * Three.js geometry. No external model files.
 * All characters face +X by convention (rotation.y = atan2(dz?..)).
 * Tile size T = 2 world units; ground plane is XZ, up is +Y.
 * ============================================================ */
const MeshFactory = {
  T: 2,                       // world units per grid tile
  COL: {
    clay: 0x9c3f20, clayHi: 0xb55a30, floor: 0xc9a16e, floorDk: 0xb8915f,
    coral: 0xE06040, coralLt: 0xff8a6a, gold: 0xf0c040, bronze: 0xD4AF37,
    bronzeDk: 0x9c6a22, green: 0x2f7a3c, greenDk: 0x1f5a2c, water: 0x2f6fa8,
    mud: 0x5e4226, dark: 0x2a1c10, cowrie: 0xfdf3d6, ember: 0xff8a20,
  },

  mat(color, opts={}){
    return new THREE.MeshStandardMaterial(Object.assign({
      color, roughness: 0.85, metalness: 0.05,
    }, opts));
  },

  /* ---------- environment ---------- */
  wall(){
    const g = new THREE.BoxGeometry(this.T, this.T*1.6, this.T);
    const m = this.mat(this.COL.clay, { roughness: 0.95 });
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.position.y = this.T*0.8;
    // bronze stud accent
    const stud = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 10), this.mat(this.COL.gold, { metalness: 0.6, roughness: 0.3 }));
    stud.position.set(0, 0, this.T/2 + 0.01);
    mesh.add(stud);
    return mesh;
  },

  pillar(){
    const grp = new THREE.Group();
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.5, this.T*2.1, 12), this.mat(this.COL.clayHi, { roughness: 0.9 }));
    shaft.castShadow = true; shaft.position.y = this.T*1.05;
    grp.add(shaft);
    [0.2, this.T*2.0].forEach(y => {
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(0.56, 0.56, 0.18, 12), this.mat(this.COL.gold, { metalness: 0.5, roughness: 0.4 }));
      ring.position.y = y; grp.add(ring);
    });
    return grp;
  },

  floorTile(){
    const g = new THREE.PlaneGeometry(this.T, this.T);
    const m = this.mat(this.COL.floor, { roughness: 1 });
    const mesh = new THREE.Mesh(g, m);
    mesh.rotation.x = -Math.PI/2; mesh.receiveShadow = true;
    return mesh;
  },

  brazier(){
    const grp = new THREE.Group();
    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.2, 1.0, 8), this.mat(this.COL.dark));
    stand.position.y = 0.5; stand.castShadow = true; grp.add(stand);
    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.26, 0.3, 12), this.mat(0x5a3a1e, { metalness: 0.3 }));
    bowl.position.y = 1.05; bowl.castShadow = true; grp.add(bowl);
    const fire = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.6, 10), new THREE.MeshBasicMaterial({ color: this.COL.ember }));
    fire.position.y = 1.4; fire.name = 'fire'; grp.add(fire);
    return grp;
  },

  bush(){
    const grp = new THREE.Group();
    const m = this.mat(this.COL.green, { roughness: 1 });
    [[0,0.35,0,0.55],[0.4,0.3,0.1,0.42],[-0.35,0.32,-0.1,0.46],[0.05,0.55,0.05,0.4]].forEach(([x,y,z,r])=>{
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), m);
      b.position.set(x,y,z); b.castShadow = true; grp.add(b);
    });
    return grp;
  },

  mud(){
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(this.T*0.55, 16), this.mat(this.COL.mud, { roughness: 1 }));
    mesh.rotation.x = -Math.PI/2; mesh.position.y = 0.02; mesh.receiveShadow = true;
    return mesh;
  },

  gate(){
    const grp = new THREE.Group();
    const frame = this.mat(this.COL.dark);
    const goldM = this.mat(this.COL.gold, { metalness: 0.5, roughness: 0.35, emissive: 0x3a2a00, emissiveIntensity: 0.4 });
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.25, this.T*2, 0.4), frame);
    left.position.set(-0.7, this.T, 0); left.castShadow = true;
    const right = left.clone(); right.position.x = 0.7;
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.3, 0.4), frame);
    top.position.set(0, this.T*2, 0);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, this.T*1.7, 0.15), goldM);
    door.position.set(0, this.T*0.92, 0); door.name = 'door';
    grp.add(left, right, top, door);
    return grp;
  },

  /* ---------- collectibles (each tagged via .userData.itemType) ---------- */
  item(type){
    let mesh;
    switch(type){
      case 'cowrie':
        mesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), this.mat(this.COL.cowrie, { roughness: 0.5 }));
        mesh.scale.set(1, 1.3, 0.7); break;
      case 'coral':
        mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(0.18, 0.07, 48, 6), this.mat(this.COL.coral, { roughness: 0.6 })); break;
      case 'bronze':
        mesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.08), this.mat(this.COL.bronze, { metalness: 0.6, roughness: 0.35 })); break;
      case 'mudfish':
        mesh = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 10), this.mat(this.COL.green, { roughness: 0.5 }));
        mesh.rotation.z = Math.PI/2; break;
      case 'plan':
      default:
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.6, 12), this.mat(0xefe6c8, { roughness: 0.7 }));
        mesh.rotation.z = Math.PI/2;
        const seal = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), this.mat(0xc02828));
        seal.position.y = 0.18; mesh.add(seal); break;
    }
    mesh.castShadow = true;
    const grp = new THREE.Group();
    mesh.position.y = 0.55; grp.add(mesh);
    grp.userData.itemType = type;
    grp.userData.spin = mesh;
    return grp;
  },

  /* ---------- characters ---------- */
  adesua(){
    const grp = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.34, 0.5, 6, 12), this.mat(this.COL.coral, { roughness: 0.7 }));
    body.position.y = 0.75; body.castShadow = true; grp.add(body);
    const sash = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.06, 8, 20), this.mat(0x7a2a1a));
    sash.position.y = 0.7; sash.rotation.x = Math.PI/2; grp.add(sash);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 16, 14), this.mat(0x6a4636, { roughness: 0.6 }));
    head.position.y = 1.32; head.castShadow = true; grp.add(head);
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.34, 12), this.mat(this.COL.gold, { metalness: 0.5, roughness: 0.3 }));
    crown.position.y = 1.62; grp.add(crown);
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), this.mat(this.COL.coral));
    gem.position.set(0, 1.5, 0.24); grp.add(gem);
    // facing pip (+X)
    const pip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), this.mat(0xffe9b0, { emissive: 0x554000, emissiveIntensity: 0.5 }));
    pip.position.set(0.3, 1.32, 0); grp.add(pip);
    grp.userData.body = body; grp.userData.head = head;
    return grp;
  },

  guard(){
    const grp = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.95, 0.5), this.mat(this.COL.bronze, { metalness: 0.4, roughness: 0.5 }));
    body.position.y = 0.78; body.castShadow = true; grp.add(body);
    // leopard spots
    const spotM = this.mat(0x5a3a08);
    for(let i=0;i<6;i++){
      const s = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), spotM);
      s.position.set((Math.sin(i*2.1))*0.25, 0.6+ (i%3)*0.22, 0.26);
      grp.add(s);
    }
    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 14, 12, 0, Math.PI*2, 0, Math.PI/2), this.mat(0xe9cf6a, { metalness: 0.5, roughness: 0.3 }));
    helm.position.y = 1.3; grp.add(helm);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), this.mat(0x5a4020));
    head.position.y = 1.22; head.castShadow = true; grp.add(head);
    const pip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), this.mat(0xffe9b0, { emissive: 0x554000, emissiveIntensity: 0.5 }));
    pip.position.set(0.34, 1.0, 0); grp.add(pip);
    grp.userData.body = body;
    return grp;
  },

  /* tall translucent beam of light marking the objective */
  beam(){
    const grp = new THREE.Group();
    const geo = new THREE.CylinderGeometry(0.45, 0.6, 14, 16, 1, true);
    const mat = new THREE.MeshBasicMaterial({ color:this.COL.gold, transparent:true, opacity:0.18, side:THREE.DoubleSide, depthWrite:false });
    const cyl = new THREE.Mesh(geo, mat); cyl.position.y = 7;
    grp.add(cyl);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.85, 24),
      new THREE.MeshBasicMaterial({ color:this.COL.gold, transparent:true, opacity:0.5, side:THREE.DoubleSide, depthWrite:false }));
    ring.rotation.x = -Math.PI/2; ring.position.y = 0.06; grp.add(ring);
    grp.userData.cyl = cyl; grp.userData.ring = ring;
    return grp;
  },

  /* per-guard "eye" detection meter billboard */
  eyeMeter(){
    const cv = document.createElement('canvas'); cv.width = 96; cv.height = 40;
    const ctx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true, depthTest:false }));
    sprite.scale.set(1.3, 0.55, 1); sprite.visible = false;
    sprite.userData.draw = (fill, color) => {
      ctx.clearRect(0,0,96,40);
      // eye glyph
      ctx.strokeStyle = color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(20,20,14,9,0,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(20,20,4,0,Math.PI*2); ctx.fill();
      // bar
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(40,14,48,12);
      ctx.fillStyle = color; ctx.fillRect(40,14,48*Math.max(0,Math.min(1,fill)),12);
      tex.needsUpdate = true;
    };
    return sprite;
  },

  /* a floating colored billboard sprite for !/? bubbles */
  bubbleSprite(){
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const ctx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.6, 0.6, 0.6);
    sprite.userData.draw = (ch, color) => {
      ctx.clearRect(0,0,64,64);
      if(ch){ ctx.fillStyle = color; ctx.font = 'bold 52px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 4; ctx.strokeText(ch,32,34); ctx.fillText(ch,32,34); }
      tex.needsUpdate = true;
    };
    return sprite;
  },
};
window.MeshFactory = MeshFactory;
