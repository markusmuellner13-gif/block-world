import * as THREE from 'three';

const VILLAGER_COLORS = [0xffe0b2, 0xffcc80, 0xf4a460, 0xd2691e];
const ROBE_COLORS     = [0x2244aa, 0x44aa22, 0xaa2244, 0xaa8822, 0x224444];
const HAT_COLORS      = [0x44281a, 0x281a0a, 0x1a0a44];

export class NPC {
  constructor(position, world) {
    this.position = position.clone();
    this.world    = world;
    this.velocity = new THREE.Vector3();
    this.onGround = true;

    this._wanderTimer = Math.random() * 4 + 2;
    this._wanderTarget = position.clone();
    this._idle = true;
    this._talkTimer = 0;
    this.isTalking = false;

    this.robeColor = ROBE_COLORS[Math.floor(Math.random() * ROBE_COLORS.length)];
    this.skinColor = VILLAGER_COLORS[Math.floor(Math.random() * VILLAGER_COLORS.length)];
    this.hatColor  = HAT_COLORS[Math.floor(Math.random() * HAT_COLORS.length)];

    this.group = new THREE.Group();
    this._buildModel();
    this.group.position.copy(this.position);
  }

  _mat(color, transparent = false, opacity = 1) {
    return new THREE.MeshLambertMaterial({ color, transparent, opacity });
  }

  _buildModel() {
    const skin = this._mat(this.skinColor);
    const robe = this._mat(this.robeColor);
    const hat  = this._mat(this.hatColor);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skin);
    head.position.y = 1.75;
    this.group.add(head);
    this._head = head;

    // Big villager nose
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.14), skin);
    nose.position.set(0, 1.72, 0.28);
    this.group.add(nose);

    // Eyes
    const eyeMat = this._mat(0x111111);
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.02);
    [-0.12, 0.12].forEach(ex => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(ex, 1.78, 0.26);
      this.group.add(eye);
    });

    // Hat
    const hatBrim = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.7), hat);
    hatBrim.position.y = 2.02;
    const hatTop = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.45), hat);
    hatTop.position.y = 2.2;
    this.group.add(hatBrim, hatTop);

    // Body (robe)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.85, 0.3), robe);
    body.position.y = 1.1;
    this.group.add(body);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
    const armL = new THREE.Mesh(armGeo, robe);
    armL.position.set(-0.375, 1.1, 0);
    const armR = new THREE.Mesh(armGeo, robe);
    armR.position.set(0.375, 1.1, 0);
    this.group.add(armL, armR);
    this._armL = armL; this._armR = armR;

    // Legs
    const legGeo = new THREE.BoxGeometry(0.2, 0.65, 0.25);
    const legMat = this._mat(0x333355);
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.125, 0.35, 0);
    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.125, 0.35, 0);
    this.group.add(legL, legR);
    this._legL = legL; this._legR = legR;

    // Nameplate (bubble)
    this._createNameplate();
  }

  _createNameplate() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.roundRect(0, 0, 128, 32, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '18px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('Villager', 64, 22);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    this._nameSprite = new THREE.Sprite(mat);
    this._nameSprite.scale.set(1.2, 0.3, 1);
    this._nameSprite.position.y = 2.8;
    this.group.add(this._nameSprite);
  }

  update(dt, playerPos) {
    this._wanderTimer -= dt;
    if (this._wanderTimer <= 0) {
      this._pickWander();
      this._wanderTimer = 4 + Math.random() * 6;
      this._idle = Math.random() < 0.4;
    }

    const distToPlayer = this.position.distanceTo(playerPos);

    // Face player when close
    if (distToPlayer < 5) {
      const dx = playerPos.x - this.position.x;
      const dz = playerPos.z - this.position.z;
      this.group.rotation.y = Math.atan2(dx, dz);
      this._idle = true;
    }

    this.isTalking = distToPlayer < 3;

    if (!this._idle) {
      const dx = this._wanderTarget.x - this.position.x;
      const dz = this._wanderTarget.z - this.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const speed = 1.8;
      if (dist > 0.5) {
        this.position.x += (dx / dist) * speed * dt;
        this.position.z += (dz / dist) * speed * dt;
        this.group.rotation.y = Math.atan2(dx, dz);

        // Walk animation
        const swing = Math.sin(performance.now() * 0.006) * 0.3;
        this._armL.rotation.x = swing;
        this._armR.rotation.x = -swing;
        this._legL.rotation.x = -swing;
        this._legR.rotation.x = swing;
      }
    } else {
      this._armL.rotation.x *= 0.9;
      this._armR.rotation.x *= 0.9;
    }

    // Snap to ground
    const floorY = this.world.getSurfaceHeight(Math.floor(this.position.x), Math.floor(this.position.z));
    this.position.y = floorY - 0.5;
    this.group.position.copy(this.position);

    // Nameplate always faces camera
    this._nameSprite.visible = distToPlayer < 15;
  }

  _pickWander() {
    this._wanderTarget.set(
      this.position.x + (Math.random() - 0.5) * 16,
      this.position.y,
      this.position.z + (Math.random() - 0.5) * 16
    );
  }

  getTradeMessage() {
    const msgs = [
      'I have items for trade!',
      'Emeralds accepted!',
      'Greetings, traveler!',
      'Have you seen the forest?',
      'Good day to mine!',
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
}
