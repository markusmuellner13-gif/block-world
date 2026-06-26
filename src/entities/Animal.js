import * as THREE from 'three';
import { BLOCKS, ITEMS } from '../world/BlockRegistry.js';

const WANDER_RADIUS = 12;
const WANDER_SPEED  = 1.5;
const FLEE_SPEED    = 4;
const DETECT_RADIUS = 6;
const ANIMAL_GRAVITY = -20;

const ANIMAL_CONFIGS = {
  cow: {
    color: [0xffffff, 0x333333],   // body, spots
    bodyW: 0.85, bodyH: 0.7, bodyD: 1.4,
    legH: 0.65, headW: 0.5, headH: 0.45,
    fleePlayer: false,
  },
  pig: {
    color: [0xffb0b0, 0xff8a8a],
    bodyW: 0.7, bodyH: 0.6, bodyD: 1.1,
    legH: 0.5, headW: 0.5, headH: 0.45,
    fleePlayer: false,
  },
  sheep: {
    color: [0xe8e8e8, 0xdddddd],
    bodyW: 0.8, bodyH: 0.8, bodyD: 1.2,
    legH: 0.5, headW: 0.45, headH: 0.4,
    fleePlayer: false,
  },
  chicken: {
    color: [0xffffff, 0xff8800],
    bodyW: 0.4, bodyH: 0.45, bodyD: 0.6,
    legH: 0.35, headW: 0.3, headH: 0.28,
    fleePlayer: false,
  },
  wolf: {
    color: [0x888888, 0x555555],
    bodyW: 0.65, bodyH: 0.6, bodyD: 1.1,
    legH: 0.55, headW: 0.45, headH: 0.4,
    fleePlayer: false,
    chasePlayer: true,
  },
  rabbit: {
    color: [0xccaa88, 0xaa8866],
    bodyW: 0.3, bodyH: 0.3, bodyD: 0.4,
    legH: 0.25, headW: 0.25, headH: 0.22,
    fleePlayer: true,
    hoppy: true,
  },
  fox: {
    color: [0xff6600, 0xffffff],
    bodyW: 0.5, bodyH: 0.45, bodyD: 0.9,
    legH: 0.4, headW: 0.38, headH: 0.35,
    fleePlayer: true,
  },
  deer: {
    color: [0xcc8844, 0xffd0a0],
    bodyW: 0.7, bodyH: 0.9, bodyD: 1.3,
    legH: 0.9, headW: 0.4, headH: 0.45,
    fleePlayer: true,
  },
  horse: {
    color: [0x8B4513, 0x333333],
    bodyW: 0.9, bodyH: 1.1, bodyD: 1.8,
    legH: 1.1, headW: 0.5, headH: 0.6,
    fleePlayer: false,
  },
};

export class Animal {
  constructor(type, position, world) {
    this.type     = type;
    this.position = position.clone();
    this.velocity = new THREE.Vector3();
    this.world    = world;
    this.onGround = false;

    this.cfg = ANIMAL_CONFIGS[type] || ANIMAL_CONFIGS.pig;

    this.health = 10;
    this.dead   = false;

    this._wanderTarget = position.clone();
    this._wanderTimer  = Math.random() * 4;
    this._idleTimer    = Math.random() * 3;
    this._idle         = false;
    this._hopPhase     = 0;

    this.group = new THREE.Group();
    this._buildModel();
    this.group.position.copy(this.position);
  }

  _mat(color) {
    return new THREE.MeshLambertMaterial({ color });
  }

  _buildModel() {
    const c = this.cfg;
    const [bodyColor, accentColor] = c.color;

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(c.bodyW, c.bodyH, c.bodyD),
      this._mat(bodyColor)
    );
    body.position.y = c.legH + c.bodyH / 2;
    this.group.add(body);
    this._body = body;

    // Head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(c.headW, c.headH, c.headH),
      this._mat(bodyColor)
    );
    head.position.set(0, c.legH + c.bodyH + c.headH / 2, c.bodyD / 2 + c.headH / 2);
    this.group.add(head);
    this._head = head;

    // Eyes
    const eyeMat = this._mat(0x111111);
    const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.02);
    [-0.1, 0.1].forEach((ex) => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(ex, c.legH + c.bodyH + c.headH / 2 + 0.02, c.bodyD / 2 + c.headH + 0.01);
      this.group.add(eye);
    });

    // Legs
    const legGeo = new THREE.BoxGeometry(0.15, c.legH, 0.15);
    const legMat = this._mat(accentColor);
    const legOffsets = [
      [-c.bodyW * 0.3,  c.bodyD * 0.3],
      [ c.bodyW * 0.3,  c.bodyD * 0.3],
      [-c.bodyW * 0.3, -c.bodyD * 0.3],
      [ c.bodyW * 0.3, -c.bodyD * 0.3],
    ];
    this._legs = [];
    for (const [lx, lz] of legOffsets) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, c.legH / 2, lz);
      this.group.add(leg);
      this._legs.push(leg);
    }

    // Rabbit ears
    if (this.type === 'rabbit') {
      const earGeo = new THREE.BoxGeometry(0.08, 0.18, 0.05);
      const earMat = this._mat(0xffccaa);
      [-0.08, 0.08].forEach((ex) => {
        const ear = new THREE.Mesh(earGeo, earMat);
        ear.position.set(ex, c.legH + c.bodyH + c.headH + 0.1, c.bodyD / 2 + c.headH / 2);
        this.group.add(ear);
      });
    }

    // Wolf tail
    if (this.type === 'wolf') {
      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.35, 0.1),
        this._mat(0x888888)
      );
      tail.position.set(0, c.legH + c.bodyH * 0.8, -c.bodyD / 2 - 0.1);
      tail.rotation.x = -0.5;
      this.group.add(tail);
    }
  }

  update(dt, playerPos) {
    this._wanderTimer -= dt;
    if (this._wanderTimer <= 0) {
      this._pickWanderTarget();
      this._wanderTimer = 3 + Math.random() * 5;
      this._idle = Math.random() < 0.3;
    }

    let speed = WANDER_SPEED;
    let target = this._wanderTarget;

    // Flee or chase player
    const distToPlayer = this.position.distanceTo(playerPos);
    if (this.cfg.fleePlayer && distToPlayer < DETECT_RADIUS) {
      target = this.position.clone().add(this.position.clone().sub(playerPos).normalize().multiplyScalar(10));
      speed = FLEE_SPEED;
      this._idle = false;
    } else if (this.cfg.chasePlayer && distToPlayer < DETECT_RADIUS * 2) {
      target = playerPos.clone();
      speed = FLEE_SPEED;
      this._idle = false;
    }

    // Move toward target if not idle
    if (!this._idle) {
      const dx = target.x - this.position.x;
      const dz = target.z - this.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0.5) {
        this.velocity.x = (dx / dist) * speed;
        this.velocity.z = (dz / dist) * speed;
        this.group.rotation.y = Math.atan2(dx, dz);
      } else {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // Gravity
    if (!this.onGround) this.velocity.y += ANIMAL_GRAVITY * dt;
    else this.velocity.y = Math.max(0, this.velocity.y);

    // Hop for rabbits
    if (this.type === 'rabbit' && (this.velocity.x !== 0 || this.velocity.z !== 0)) {
      this._hopPhase += dt * 8;
      if (this.onGround && this._hopPhase > Math.PI) {
        this.velocity.y = 5;
        this._hopPhase = 0;
      }
    }

    // Apply movement
    const nx = this.position.x + this.velocity.x * dt;
    const ny = this.position.y + this.velocity.y * dt;
    const nz = this.position.z + this.velocity.z * dt;

    // Floor collision
    const floorY = this.world.getSurfaceHeight(Math.floor(nx), Math.floor(nz)) - 0.5;
    if (ny <= floorY) {
      this.position.y = floorY;
      this.velocity.y = 0;
      this.onGround = true;
    } else {
      this.position.y = ny;
      this.onGround = false;
    }
    this.position.x = nx;
    this.position.z = nz;

    this.group.position.copy(this.position);

    // Leg animation
    const walkSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
    if (walkSpeed > 0.1) {
      const swing = Math.sin(performance.now() * 0.008 * walkSpeed) * 0.4;
      if (this._legs[0]) {
        this._legs[0].rotation.x = swing;
        this._legs[1].rotation.x = -swing;
        this._legs[2].rotation.x = -swing;
        this._legs[3].rotation.x = swing;
      }
    }
  }

  _pickWanderTarget() {
    const angle = Math.random() * Math.PI * 2;
    const dist  = Math.random() * WANDER_RADIUS;
    this._wanderTarget.set(
      this.position.x + Math.cos(angle) * dist,
      this.position.y,
      this.position.z + Math.sin(angle) * dist
    );
  }

  _getDrops() {
    const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
    switch (this.type) {
      case 'cow':
      case 'deer':
      case 'horse':
        return [{ id: ITEMS.RAW_BEEF, count: rand(1, 3), name: 'Raw Beef', type: 'item' }];
      case 'pig':
        return [{ id: ITEMS.RAW_BEEF, count: rand(1, 3), name: 'Raw Beef', type: 'item' }];
      case 'sheep':
        return [{ id: ITEMS.RAW_BEEF, count: rand(1, 2), name: 'Raw Beef', type: 'item' }];
      case 'chicken':
        return [
          { id: ITEMS.RAW_CHICKEN, count: rand(1, 2), name: 'Raw Chicken', type: 'item' },
          { id: ITEMS.FEATHER,     count: 1,           name: 'Feather',    type: 'item' },
        ];
      case 'rabbit':
        return [{ id: ITEMS.RAW_CHICKEN, count: 1, name: 'Raw Chicken', type: 'item' }];
      case 'wolf':
      case 'fox':
        return [{ id: ITEMS.BONE, count: rand(0, 1), name: 'Bone', type: 'item' }];
      default:
        return [];
    }
  }

  takeDamage(amount, player = null, scene = null) {
    if (this.dead) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.dead = true;
      // Give drops to player inventory
      if (player) {
        for (const drop of this._getDrops()) {
          player.inventory.addItem(drop);
        }
      }
      // Remove from scene
      if (scene) scene.remove(this.group);
    }
  }

  dispose(scene) {
    scene.remove(this.group);
  }
}
