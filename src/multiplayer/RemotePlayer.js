import * as THREE from 'three';

export class RemotePlayer {
  constructor(id, name, scene) {
    this.id   = id;
    this.name = name;

    this.group = new THREE.Group();
    this._buildModel();
    this._buildNameplate(name);
    scene.add(this.group);
  }

  _mat(color) {
    return new THREE.MeshLambertMaterial({ color });
  }

  _buildModel() {
    // Same blocky Minecraft proportions as the local player
    const skin  = this._mat(0xffe0c0);
    const shirt = this._mat(0xcc4422);  // red shirt so remotes stand out
    const pants = this._mat(0x2244aa);
    const hair  = this._mat(0x442200);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), [skin,skin,hair,skin,skin,skin]);
    head.position.y = 1.5;

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), shirt);
    body.position.y = 0.875;

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), shirt);
    armL.position.set(-0.375, 0.875, 0);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), shirt);
    armR.position.set(0.375, 0.875, 0);

    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), pants);
    legL.position.set(-0.125, 0.375, 0);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), pants);
    legR.position.set(0.125, 0.375, 0);

    this.group.add(head, body, armL, armR, legL, legR);
    this._head = head;
    this._armL = armL; this._armR = armR;
    this._legL = legL; this._legR = legR;
  }

  _buildNameplate(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 160; canvas.height = 36;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.roundRect(0, 0, 160, 36, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(name.slice(0, 12), 80, 24);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.4, 0.32, 1);
    sprite.position.y = 2.2;
    this.group.add(sprite);
  }

  update(x, y, z, yaw, pitch) {
    // Lerp position for smooth movement
    this.group.position.lerp(new THREE.Vector3(x, y, z), 0.25);
    this.group.rotation.y = yaw;
    this._head.rotation.x = pitch;

    // Walk animation based on horizontal speed
    const dx = x - this._lastX || 0;
    const dz = z - this._lastZ || 0;
    const moving = Math.sqrt(dx * dx + dz * dz) > 0.01;
    if (moving) {
      const t = performance.now() * 0.008;
      const swing = Math.sin(t * 2) * 0.35;
      this._armL.rotation.x = swing;
      this._armR.rotation.x = -swing;
      this._legL.rotation.x = -swing;
      this._legR.rotation.x = swing;
    } else {
      this._armL.rotation.x *= 0.85;
      this._armR.rotation.x *= 0.85;
      this._legL.rotation.x *= 0.85;
      this._legR.rotation.x *= 0.85;
    }
    this._lastX = x; this._lastZ = z;
  }

  dispose(scene) {
    scene.remove(this.group);
    this.group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}
