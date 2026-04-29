import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this._active = [];
  }

  burst(wx, wy, wz, colorHex) {
    const count = 12;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i*3]   = wx + 0.5 + (Math.random()-0.5)*0.6;
      positions[i*3+1] = wy + 0.5 + (Math.random()-0.5)*0.6;
      positions[i*3+2] = wz + 0.5 + (Math.random()-0.5)*0.6;
      velocities[i*3]   = (Math.random()-0.5)*5;
      velocities[i*3+1] = 1.5 + Math.random()*3;
      velocities[i*3+2] = (Math.random()-0.5)*5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions.slice(), 3));
    const mat = new THREE.PointsMaterial({
      color: colorHex, size: 0.18, sizeAttenuation: true, transparent: true, opacity: 1,
    });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this._active.push({ pts, velocities, age: 0 });
  }

  update(dt) {
    const MAX_AGE = 0.65;
    for (let i = this._active.length - 1; i >= 0; i--) {
      const p = this._active[i];
      p.age += dt;
      if (p.age >= MAX_AGE) {
        this.scene.remove(p.pts);
        p.pts.geometry.dispose();
        p.pts.material.dispose();
        this._active.splice(i, 1);
        continue;
      }
      const pos = p.pts.geometry.attributes.position.array;
      const n = pos.length / 3;
      for (let j = 0; j < n; j++) {
        p.velocities[j*3+1] -= 14 * dt;
        pos[j*3]   += p.velocities[j*3]   * dt;
        pos[j*3+1] += p.velocities[j*3+1] * dt;
        pos[j*3+2] += p.velocities[j*3+2] * dt;
      }
      p.pts.geometry.attributes.position.needsUpdate = true;
      p.pts.material.opacity = 1 - p.age / MAX_AGE;
    }
  }
}
