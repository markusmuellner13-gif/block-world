import * as THREE from 'three';
import { ITEMS } from '../world/BlockRegistry.js';

const SPEED        = 2.2;
const DETECT_RANGE = 22;
const ATTACK_RANGE = 1.4;
const ATTACK_CD    = 1.0;
const DAMAGE       = 4;
const GRAVITY      = -20;

export class Zombie {
  constructor(position, world) {
    this.position = position.clone();
    this.velocity = new THREE.Vector3();
    this.world    = world;
    this.onGround = false;
    this.health   = 20;
    this.dead     = false;
    this._attackTimer = 0;
    this._groanTimer  = 2 + Math.random() * 3;
    this._burnTimer   = 0;

    this.group = new THREE.Group();
    this._buildModel();
    this.group.position.copy(this.position);
  }

  _mat(color) { return new THREE.MeshLambertMaterial({ color }); }

  _buildModel() {
    const skin  = this._mat(0x669966);
    const shirt = this._mat(0x2a4a2a);
    const pants = this._mat(0x1a2a1a);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), shirt);
    body.position.y = 0.875;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skin);
    head.position.y = 1.5;

    // Arms outstretched forward (classic zombie pose)
    this._armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), shirt);
    this._armL.position.set(-0.375, 1.05, 0.22);
    this._armL.rotation.x = -1.2;

    this._armR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), shirt);
    this._armR.position.set(0.375, 1.05, 0.22);
    this._armR.rotation.x = -1.2;

    this._legL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), pants);
    this._legL.position.set(-0.125, 0.375, 0);

    this._legR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), pants);
    this._legR.position.set(0.125, 0.375, 0);

    this.group.add(body, head, this._armL, this._armR, this._legL, this._legR);
  }

  update(dt, playerPos, game) {
    if (this.dead) return;

    this._attackTimer = Math.max(0, this._attackTimer - dt);

    // Groaning
    this._groanTimer -= dt;
    if (this._groanTimer <= 0) {
      game?.audio?.zombieGroan();
      this._groanTimer = 4 + Math.random() * 5;
    }

    // Daylight burning (daytime = game.dayTime 0.25–0.75)
    const isDay = game && game.dayTime > 0.25 && game.dayTime < 0.75;
    if (isDay) {
      const surfY = this.world.getSurfaceHeight(
        Math.floor(this.position.x), Math.floor(this.position.z)
      );
      // Only burn if exposed to open sky
      if (this.position.y >= surfY - 2) {
        this._burnTimer += dt;
        if (this._burnTimer >= 1) {
          this.takeDamage(1);
          this._burnTimer = 0;
          game?.particles?.smoke(this.position.x, this.position.y + 1.5, this.position.z);
        }
      }
    } else {
      this._burnTimer = 0;
    }

    const dist = this.position.distanceTo(playerPos);

    if (dist < DETECT_RANGE) {
      const dx = playerPos.x - this.position.x;
      const dz = playerPos.z - this.position.z;
      const d  = Math.sqrt(dx * dx + dz * dz);

      if (d > ATTACK_RANGE) {
        this.velocity.x = (dx / d) * SPEED;
        this.velocity.z = (dz / d) * SPEED;
        this.group.rotation.y = Math.atan2(dx, dz);
      } else {
        this.velocity.x = 0;
        this.velocity.z = 0;
        if (this._attackTimer <= 0 && game) {
          game.player.health = Math.max(0, game.player.health - DAMAGE);
          game.audio?.playerHurt();
          this._attackTimer = ATTACK_CD;
        }
      }
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    if (!this.onGround) this.velocity.y += GRAVITY * dt;
    else                this.velocity.y  = Math.max(0, this.velocity.y);

    const nx = this.position.x + this.velocity.x * dt;
    const ny = this.position.y + this.velocity.y * dt;
    const nz = this.position.z + this.velocity.z * dt;

    // getSurfaceHeight returns the Y directly above the top solid block — that's the floor
    const floorY = this.world.getSurfaceHeight(Math.floor(nx), Math.floor(nz));
    if (ny <= floorY) {
      this.position.y = floorY;
      this.velocity.y = 0;
      this.onGround   = true;
    } else {
      this.position.y = ny;
      this.onGround   = false;
    }
    this.position.x = nx;
    this.position.z = nz;
    this.group.position.copy(this.position);

    const walkSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
    if (walkSpeed > 0.1) {
      const swing = Math.sin(performance.now() * 0.006) * 0.4;
      this._legL.rotation.x =  swing;
      this._legR.rotation.x = -swing;
    }
  }

  // knockbackDir: optional {x, z} unit vector pointing away from attacker
  // player: optional Player reference to receive drops
  takeDamage(amount, knockbackDir = null, player = null) {
    if (this.dead) return;
    this.health -= amount;
    if (knockbackDir) {
      this.velocity.x += knockbackDir.x * 6;
      this.velocity.z += knockbackDir.z * 6;
      this.velocity.y  = 4;
      this.onGround    = false;
    }
    if (this.health <= 0) {
      this.dead = true;
      if (player) {
        // Drop 0-2 rotten flesh
        const fleshCount = Math.floor(Math.random() * 3);
        if (fleshCount > 0) {
          player.inventory.addItem({ id: ITEMS.ROTTEN_FLESH, count: fleshCount, name: 'Rotten Flesh', type: 'item' });
        }
        // 5% chance to drop iron ingot
        if (Math.random() < 0.05) {
          player.inventory.addItem({ id: ITEMS.IRON_INGOT, count: 1, name: 'Iron Ingot', type: 'item' });
        }
      }
    }
  }

  dispose(scene) {
    scene.remove(this.group);
  }
}
