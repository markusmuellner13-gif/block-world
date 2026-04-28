import * as THREE from 'three';

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this._createSun();
    this._createMoon();
    this._createStars();
    this._createClouds();
  }

  _createSun() {
    const geo = new THREE.SphereGeometry(8, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xfffde0, fog: false });
    this.sun = new THREE.Mesh(geo, mat);
    this.scene.add(this.sun);
  }

  _createMoon() {
    const geo = new THREE.SphereGeometry(5, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xddeeff, fog: false });
    this.moon = new THREE.Mesh(geo, mat);
    this.scene.add(this.moon);
  }

  _createStars() {
    const count = 800;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      pos[i * 3]     = Math.sin(phi) * Math.cos(theta) * 380;
      pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * 380;
      pos[i * 3 + 2] = Math.cos(phi) * 380;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, fog: false });
    this.stars = new THREE.Points(geo, this.starMat);
    this.scene.add(this.stars);
  }

  _createClouds() {
    this.clouds = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false });
    for (let i = 0; i < 30; i++) {
      const group = new THREE.Group();
      const nx = (Math.random() - 0.5) * 300;
      const nz = (Math.random() - 0.5) * 300;
      group.position.set(nx, 100, nz);
      for (let j = 0; j < 4; j++) {
        const geo = new THREE.BoxGeometry(
          8 + Math.random() * 16,
          3 + Math.random() * 3,
          8 + Math.random() * 16
        );
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 10
        );
        group.add(mesh);
      }
      this.clouds.add(group);
    }
    this.scene.add(this.clouds);
  }

  update(dayTime) {
    const angle = dayTime * Math.PI * 2 - Math.PI / 2;
    const r = 350;
    this.sun.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
    this.moon.position.set(-Math.cos(angle) * r, -Math.sin(angle) * r, 0);

    const dayStrength = Math.max(0, Math.sin(angle + Math.PI / 2));
    const nightStrength = 1 - dayStrength;

    this.starMat.opacity = nightStrength;
    this.sun.visible = dayStrength > 0.05;
    this.moon.visible = nightStrength > 0.05;

    // drift clouds slowly
    this.clouds.children.forEach((c, i) => {
      c.position.x = (c.position.x + 0.005 + i * 0.0002) % 300 - 150;
    });
  }
}
