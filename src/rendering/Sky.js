import * as THREE from 'three';

// Flat Minecraft-style sun/moon (billboard quads)
function makeQuad(w, h, color, addGlow = false) {
  const geo = new THREE.PlaneGeometry(w, h);
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: false, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  if (addGlow) {
    const glowGeo = new THREE.PlaneGeometry(w * 2.2, h * 2.2);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffe880, transparent: true, opacity: 0.18, side: THREE.DoubleSide, fog: false, depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    mesh.add(glow);
    mesh._glow = glow;
    mesh._glowMat = glowMat;
  }
  return mesh;
}

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this._createSun();
    this._createMoon();
    this._createStars();
    this._createClouds();
  }

  _createSun() {
    // Sun: flat quad, Minecraft yellow-white
    this.sun = makeQuad(30, 30, 0xfffde0, true);
    this.scene.add(this.sun);
  }

  _createMoon() {
    // Moon: flat quad, slightly blue-white
    this.moon = makeQuad(22, 22, 0xe8f0ff, false);
    // Simple moon face canvas
    const moonCanvas = document.createElement('canvas');
    moonCanvas.width = 32; moonCanvas.height = 32;
    const mctx = moonCanvas.getContext('2d');
    mctx.fillStyle = '#e8f0ff';
    mctx.fillRect(0, 0, 32, 32);
    // Simple moon texture: craters
    for (const [cx, cy, cr] of [[8,8,3],[20,12,2],[14,22,4],[25,22,2]]) {
      mctx.fillStyle = '#c0c8e0';
      mctx.beginPath();
      mctx.arc(cx, cy, cr, 0, Math.PI * 2);
      mctx.fill();
    }
    const moonTex = new THREE.CanvasTexture(moonCanvas);
    moonTex.magFilter = THREE.NearestFilter;
    this.moon.material.map = moonTex;
    this.moon.material.needsUpdate = true;
    this.scene.add(this.moon);
  }

  _createStars() {
    const count = 1200;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(Math.random() * 2 - 1);
      const r = 370;
      pos[i*3]   = Math.sin(phi) * Math.cos(theta) * r;
      pos[i*3+1] = Math.abs(Math.sin(phi) * Math.sin(theta)) * r + 20; // mostly upper hemisphere
      pos[i*3+2] = Math.cos(phi) * r;
      sizes[i] = 0.8 + Math.random() * 1.6;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, fog: false, transparent: true, opacity: 0 });
    this.stars = new THREE.Points(geo, this.starMat);
    this.scene.add(this.stars);
  }

  _createClouds() {
    this.clouds = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({
      color: 0xf8f8f8, transparent: true, opacity: 0.9, fog: false,
    });
    for (let i = 0; i < 32; i++) {
      const group = new THREE.Group();
      const nx = (Math.random() - 0.5) * 400;
      const nz = (Math.random() - 0.5) * 400;
      group.position.set(nx, 110, nz);
      // Each cloud is 3-5 overlapping box segments
      const segments = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < segments; j++) {
        const geo = new THREE.BoxGeometry(
          10 + Math.random() * 20,
          4 + Math.random() * 4,
          8 + Math.random() * 14
        );
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 8
        );
        group.add(mesh);
      }
      this.clouds.add(group);
    }
    this.scene.add(this.clouds);
  }

  update(dayTime, playerPos) {
    const angle = dayTime * Math.PI * 2 - Math.PI / 2;
    const r = 350;

    // Sun orbits the player (so it's always visible at the correct angle)
    const px = playerPos ? playerPos.x : 0;
    const pz = playerPos ? playerPos.z : 0;

    this.sun.position.set(
      px + Math.cos(angle) * r,
      Math.sin(angle) * r,
      pz
    );
    this.sun.lookAt(px, 0, pz); // always face player

    this.moon.position.set(
      px - Math.cos(angle) * r,
      -Math.sin(angle) * r,
      pz
    );
    this.moon.lookAt(px, 0, pz);

    const dayStrength   = Math.max(0, Math.sin(angle + Math.PI / 2));
    const nightStrength = 1 - dayStrength;
    const sinElev       = Math.sin(angle + Math.PI / 2);
    const horizFactor   = Math.max(0, 1 - Math.abs(sinElev) * 3.5);

    // Sun visibility and glow
    this.sun.visible  = dayStrength > 0.02;
    this.moon.visible = nightStrength > 0.02;

    // Glow brightens at sunrise/sunset
    if (this.sun._glowMat) {
      this.sun._glowMat.opacity = 0.08 + horizFactor * 0.35;
      this.sun._glow.scale.setScalar(1 + horizFactor * 0.5);
      // Orange tint near horizon
      this.sun._glowMat.color.setHSL(0.06 + horizFactor * 0.04, 0.8, 0.65);
    }

    // Stars fade in at night
    this.starMat.opacity = Math.min(1, nightStrength * 2.5);

    // Clouds drift slowly
    this.clouds.children.forEach((c, i) => {
      c.position.x += 0.008 + i * 0.0001;
      if (c.position.x > 200) c.position.x -= 400;
    });
    if (playerPos) {
      this.clouds.position.set(playerPos.x, 0, playerPos.z);
    }
  }
}
