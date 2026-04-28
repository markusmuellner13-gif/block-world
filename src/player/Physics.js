import * as THREE from 'three';
import { BLOCKS, BLOCK_IS_TRANSPARENT } from '../world/BlockRegistry.js';
import {
  PLAYER_HEIGHT, PLAYER_WIDTH, GRAVITY,
  JUMP_VELOCITY, WALK_SPEED, SPRINT_SPEED, SNEAK_SPEED, FLY_SPEED, SEA_LEVEL
} from '../Constants.js';

export class Physics {
  constructor(world) {
    this.world = world;
    this.velocity = new THREE.Vector3();
    this.onGround = false;
    this.inWater  = false;
    this.flying   = false;
    this._fallSpeed = 0; // tracks downward speed for fall-damage calc
  }

  // Axis-Aligned Bounding Box check
  _collides(wx, wy, wz) {
    const hw = PLAYER_WIDTH / 2;
    const x0 = wx - hw, x1 = wx + hw;
    const y0 = wy,       y1 = wy + PLAYER_HEIGHT;
    const z0 = wz - hw, z1 = wz + hw;

    for (let bx = Math.floor(x0); bx <= Math.floor(x1 - 0.001); bx++) {
      for (let by = Math.floor(y0); by <= Math.floor(y1 - 0.001); by++) {
        for (let bz = Math.floor(z0); bz <= Math.floor(z1 - 0.001); bz++) {
          const b = this.world.getBlockWorld(bx, by, bz);
          if (b !== BLOCKS.AIR && b !== BLOCKS.WATER && !BLOCK_IS_TRANSPARENT[b]) return true;
        }
      }
    }
    return false;
  }

  _isInWater(px, py, pz) {
    const eyeY = py + PLAYER_HEIGHT * 0.5;
    return this.world.getBlockWorld(Math.floor(px), Math.floor(eyeY), Math.floor(pz)) === BLOCKS.WATER;
  }

  step(position, controls, dt) {
    const { fx, fz } = controls.getMovement();
    const jumping = controls.jumping;
    const sprinting = controls.sprinting && !controls.sneaking;
    const sneaking = controls.sneaking;

    this.inWater = this._isInWater(position.x, position.y, position.z);

    let speed = sneaking ? SNEAK_SPEED : sprinting ? SPRINT_SPEED : WALK_SPEED;
    if (this.inWater) speed *= 0.5;
    if (this.flying) speed = FLY_SPEED;

    // Convert movement relative to camera yaw
    const yaw = this._yaw || 0;
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const moveX = fx * cosY - fz * sinY;
    const moveZ = fx * sinY + fz * cosY;

    if (this.flying) {
      this.velocity.x = moveX * speed;
      this.velocity.z = moveZ * speed;
      if (jumping)          this.velocity.y = FLY_SPEED;
      else if (sneaking)    this.velocity.y = -FLY_SPEED;
      else                  this.velocity.y *= 0.8;
    } else {
      this.velocity.x = moveX * speed;
      this.velocity.z = moveZ * speed;

      if (this.inWater) {
        this.velocity.y *= 0.8;
        if (jumping) this.velocity.y = 3;
        else this.velocity.y += GRAVITY * dt * 0.3;
      } else {
        this.velocity.y += GRAVITY * dt;
        if (jumping && this.onGround) {
          this.velocity.y = JUMP_VELOCITY;
          this.onGround = false;
        }
      }
    }

    // Sub-step collision resolution
    const STEPS = 3;
    const ddt = dt / STEPS;

    for (let s = 0; s < STEPS; s++) {
      let nx = position.x + this.velocity.x * ddt;
      let ny = position.y + this.velocity.y * ddt;
      let nz = position.z + this.velocity.z * ddt;

      // X
      if (this._collides(nx, position.y, position.z)) {
        nx = position.x;
        this.velocity.x = 0;
      }
      // Z
      if (this._collides(nx, position.y, nz)) {
        nz = position.z;
        this.velocity.z = 0;
      }
      // Y
      if (this._collides(nx, ny, nz)) {
        if (this.velocity.y < 0) {
          this._fallSpeed = -this.velocity.y; // record speed at impact
          ny = Math.floor(ny) + 1 - 0.001;
          this.onGround = true;
        } else {
          ny = position.y;
          this._fallSpeed = 0;
        }
        this.velocity.y = 0;
      } else {
        this.onGround = false;
        if (this.velocity.y < 0) this._fallSpeed = -this.velocity.y;
      }

      position.x = nx;
      position.y = ny;
      position.z = nz;
    }

    // Prevent falling below world
    if (position.y < 0) { position.y = 0; this.velocity.y = 0; this.onGround = true; }
  }

  setYaw(yaw) { this._yaw = yaw; }
}
