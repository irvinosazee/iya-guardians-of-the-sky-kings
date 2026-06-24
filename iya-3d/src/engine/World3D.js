/* ============================================================
 * World3D.js — Three.js scene, renderer, lights, shadows.
 * Night-palace mood: low ambient + warm moonlight (shadowed)
 * + per-brazier point lights added by the level.
 * ============================================================ */
class World3D {
  constructor(canvas){
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0710);
    this.scene.fog = new THREE.FogExp2(0x0a0710, 0.018);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    this.camera.position.set(0, 14, 14);

    this._buildLights();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  _buildLights(){
    this.ambient = new THREE.AmbientLight(0x5566aa, 0.32);
    this.scene.add(this.ambient);

    // warm moonlight, casts shadows
    this.moon = new THREE.DirectionalLight(0xffd9a0, 0.55);
    this.moon.position.set(18, 30, 10);
    this.moon.castShadow = true;
    const s = this.moon.shadow;
    s.mapSize.width = s.mapSize.height = 2048;
    s.camera.near = 1; s.camera.far = 90;
    s.camera.left = -40; s.camera.right = 40; s.camera.top = 40; s.camera.bottom = -40;
    s.bias = -0.0004;
    this.scene.add(this.moon);
    this.scene.add(this.moon.target);

    // cool fill from the opposite side
    this.fill = new THREE.DirectionalLight(0x3344aa, 0.18);
    this.fill.position.set(-15, 12, -8);
    this.scene.add(this.fill);
  }

  setBrightness(v){ // 0..1 -> scale ambient + moon
    this.ambient.intensity = 0.18 + v * 0.4;
    this.moon.intensity = 0.4 + v * 0.5;
  }

  // remove everything except the lights (used between acts / screens)
  clearScene(){
    const keep = new Set([this.ambient, this.moon, this.moon.target, this.fill]);
    for(let i = this.scene.children.length - 1; i >= 0; i--){
      const c = this.scene.children[i];
      if(!keep.has(c)){ this.scene.remove(c); }
    }
  }

  resize(){
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(){ this.renderer.render(this.scene, this.camera); }
}
window.World3D = World3D;
