import * as THREE from 'three';
import { Physics } from './Physics.js';
import { Inventory } from '../inventory/Inventory.js';
import { BLOCKS, BLOCK_HARDNESS } from '../world/BlockRegistry.js';
import {
  PLAYER_HEIGHT, PLAYER_EYE_HEIGHT,
  REACH_DISTANCE, CAMERA_MODES, SEA_LEVEL,
} from '../Constants.js';

const SENSITIVITY   = 0.002;
const THIRD_OFFSET  = new THREE.Vector3(0, 2, 6);
const FIFTH_OFFSET  = new THREE.Vector3(0, 4, 14);
// Hunger drain rates (food points per second)
const HUNGER_WALK   = 1 / 45;
const HUNGER_SPRINT = 1 / 15;

export class Player {
  constructor(scene, world, camera, game) {
    this.scene    = scene;
    this.world    = world;
    this.camera   = camera;
    this.game     = game;
    this.position = new THREE.Vector3(0, SEA_LEVEL + 5, 0);

    this.yaw   = 0;
    this.pitch = 0;
    this.cameraMode = CAMERA_MODES.FIRST_PERSON;

    this.physics   = new Physics(world);
    this.inventory = new Inventory();

    this.health    = 20;
    this.maxHealth = 20;
    this.food      = 20;
    this.maxFood   = 20;
    this.xp        = 0;

    this.breakingBlock = null;
    this.breakProgress = 0;
    this.placeDelay    = 0;
    this._lastSpaceTime = 0;
    this._hungerTimer   = 0;
    this._sneaking      = false;

    this._buildCharacter();
    this._buildArmModel();
    this._buildBreakOverlay();
    this._buildHighlight();
  }

  spawnAt(x, y, z) {
    this.position.set(x, y + 0.1, z);
    this.physics.velocity.set(0, 0, 0);
  }

  applyMode(mode) {
    if (mode === 'creative') {
      this.health = this.maxHealth;
      this.food   = this.maxFood;
      this.inventory.giveCreativeKit();
    } else {
      this.physics.flying = false;
    }
  }

  get mode() { return this.game?.mode || 'survival'; }

  _buildCharacter() {
    this.characterGroup = new THREE.Group();
    const skin  = new THREE.MeshLambertMaterial({ color: 0xffe0c0 });
    const shirt = new THREE.MeshLambertMaterial({ color: 0x4466cc });
    const pants = new THREE.MeshLambertMaterial({ color: 0x2244aa });
    const hair  = new THREE.MeshLambertMaterial({ color: 0x442200 });

    const head  = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), [skin,skin,hair,skin,skin,skin]);
    head.position.y = 1.5;
    const body  = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), shirt);
    body.position.y = 0.875;
    const armL  = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), shirt);
    armL.position.set(-0.375, 0.875, 0);
    const armR  = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), shirt);
    armR.position.set(0.375, 0.875, 0);
    const legL  = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), pants);
    legL.position.set(-0.125, 0.375, 0);
    const legR  = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), pants);
    legR.position.set(0.125, 0.375, 0);

    this.characterGroup.add(head, body, armL, armR, legL, legR);
    this._armL = armL; this._armR = armR;
    this._legL = legL; this._legR = legR;
    this._head = head;
    this._body = body;
    this.scene.add(this.characterGroup);
  }

  _buildArmModel() {
    const mat = new THREE.MeshLambertMaterial({ color: 0x4466cc });
    this._fpArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), mat);
    this._fpArm.position.set(0.35, -0.45, -0.6);
    this._fpArm.rotation.x = 0.3;
    this.camera.add(this._fpArm);
    this.scene.add(this.camera);
  }

  _buildBreakOverlay() {
    const geo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, wireframe: true });
    this._breakOverlay = new THREE.Mesh(geo, mat);
    this._breakOverlay.visible = false;
    this.scene.add(this._breakOverlay);
  }

  _buildHighlight() {
    const geo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, wireframe: true });
    this._highlight = new THREE.Mesh(geo, mat);
    this._highlight.visible = false;
    this.scene.add(this._highlight);
  }

  cycleCamera() {
    const modes = Object.values(CAMERA_MODES);
    const idx = modes.indexOf(this.cameraMode);
    this.cameraMode = modes[(idx + 1) % modes.length];
    this._fpArm.visible = this.cameraMode === CAMERA_MODES.FIRST_PERSON;
    this.characterGroup.visible = this.cameraMode !== CAMERA_MODES.FIRST_PERSON;
  }

  toggleFly() {
    this.physics.flying = !this.physics.flying;
  }

  update(dt, controls) {
    if (!controls) return;

    const { dx, dy, scroll } = controls.consumeDeltas();
    this._sneaking = controls.sneaking;

    this.yaw   -= dx * SENSITIVITY;
    this.pitch  = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch - dy * SENSITIVITY));

    if (scroll !== 0) {
      const dir = scroll > 0 ? 1 : -1;
      this.inventory.selectSlot((this.inventory.selectedSlot + dir + 9) % 9);
    }

    // Double-tap Space → toggle fly in creative
    if (this.mode === 'creative') {
      const spaceDown = controls.isDown('Space');
      if (spaceDown && !this._prevSpaceDown) {
        const now = performance.now();
        if (now - this._lastSpaceTime < 250) {
          this.physics.flying = !this.physics.flying;
          this._lastSpaceTime = 0;
        } else {
          this._lastSpaceTime = now;
        }
      }
      this._prevSpaceDown = spaceDown;
    }

    if (this.mode === 'survival') {
      // Fall damage
      if (this.physics.onGround && this.physics._fallSpeed > 10) {
        const dmg = Math.floor((this.physics._fallSpeed - 10) * 0.5);
        this.health = Math.max(0, this.health - dmg);
        if (dmg > 0) this.game?.audio?.playerHurt();
      }

      // Hunger drain while moving
      const { fx, fz } = controls.getMovement();
      const isMoving = Math.abs(fx) + Math.abs(fz) > 0.1;
      if (isMoving && this.physics.onGround && this.food > 0) {
        const rate = controls.sprinting ? HUNGER_SPRINT : HUNGER_WALK;
        this._hungerTimer += dt * rate;
        if (this._hungerTimer >= 1) {
          this.food = Math.max(0, this.food - 1);
          this._hungerTimer -= 1;
        }
      }

      // At zero food, can't sprint; at very low food health drains
      if (this.food === 0) {
        this._hungerTimer += dt * 0.01; // ~1 HP per 100s at zero food
        if (this._hungerTimer >= 1) {
          this.health = Math.max(1, this.health - 1);
          this._hungerTimer -= 1;
        }
      }
    } else {
      this.health = this.maxHealth;
      this.food   = this.maxFood;
    }

    // Footstep audio
    const { fx: mx, fz: mz } = controls.getMovement();
    this.game?.audio?.updateFootsteps(dt, Math.abs(mx) + Math.abs(mz) > 0.1, this.physics.onGround, controls.sprinting);

    this.physics.setYaw(this.yaw);
    this.physics.step(this.position, controls, dt);
    this._updateCamera();
    this._animateCharacter(controls);
    this._handleBlockInteraction(dt, controls);
    this._updateHighlight();
  }

  _updateCamera() {
    // Sneak lowers the eye slightly (crouch effect)
    const eyeOff = this._sneaking ? PLAYER_EYE_HEIGHT - 0.35 : PLAYER_EYE_HEIGHT;
    const eyePos = this.position.clone().add(new THREE.Vector3(0, eyeOff, 0));
    const qYaw   = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
    const q      = qYaw.multiply(qPitch);

    if (this.cameraMode === CAMERA_MODES.FIRST_PERSON) {
      this.camera.position.copy(eyePos);
      this.camera.quaternion.copy(q);
    } else {
      const offset = this.cameraMode === CAMERA_MODES.THIRD_PERSON ? THIRD_OFFSET : FIFTH_OFFSET;
      const back   = offset.clone().applyQuaternion(q);
      this.camera.position.copy(eyePos).add(back);
      this.camera.lookAt(eyePos);
    }

    // Sneak: visually lower the character body
    const sneakLower = this._sneaking ? -0.25 : 0;
    this.characterGroup.position.copy(this.position).add(new THREE.Vector3(0, sneakLower, 0));
    this.characterGroup.rotation.y = this.yaw;

    // Tilt body forward when sneaking
    this._body.rotation.x = this._sneaking ? 0.4 : 0;
    this._head.rotation.x = this._sneaking ? -0.3 : 0;
  }

  _animateCharacter(controls) {
    const { fx, fz } = controls.getMovement();
    const moving = Math.abs(fx) + Math.abs(fz) > 0.1;
    const time   = performance.now() * 0.005;
    if (moving) {
      const swing = Math.sin(time * 2) * 0.4;
      this._armL.rotation.x = swing;
      this._armR.rotation.x = -swing;
      this._legL.rotation.x = -swing;
      this._legR.rotation.x = swing;
    } else {
      this._armL.rotation.x *= 0.9;
      this._armR.rotation.x *= 0.9;
      this._legL.rotation.x *= 0.9;
      this._legR.rotation.x *= 0.9;
    }
  }

  _raycastForward() {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    return this.world.raycast(this.camera.position, dir, REACH_DISTANCE);
  }

  _updateHighlight() {
    const hit = this._raycastForward();
    if (hit) {
      this._highlight.position.set(hit.position.x + 0.5, hit.position.y + 0.5, hit.position.z + 0.5);
      this._highlight.visible = true;
    } else {
      this._highlight.visible = false;
    }
  }

  _handleBlockInteraction(dt, controls) {
    this.placeDelay = Math.max(0, this.placeDelay - dt);
    const hit = this._raycastForward();

    // ── Break block ──────────────────────────────────────────────────────
    if (controls.breaking && hit) {
      const key      = `${hit.position.x},${hit.position.y},${hit.position.z}`;
      const blockId  = hit.block;
      const hardness = BLOCK_HARDNESS[blockId];

      if (hardness === -1) {
        this.breakingBlock = null;
        this.breakProgress = 0;
        this._breakOverlay.visible = false;
      } else {
        if (this.breakingBlock !== key) { this.breakingBlock = key; this.breakProgress = 0; }

        const item     = this.inventory.getSelected();
        const toolMult = item?.miningSpeed || 1;
        const speed    = this.mode === 'creative' ? 999 : toolMult;
        this.breakProgress += dt * speed / Math.max(0.05, hardness);

        this._breakOverlay.position.set(hit.position.x + 0.5, hit.position.y + 0.5, hit.position.z + 0.5);
        this._breakOverlay.visible          = true;
        this._breakOverlay.material.opacity = Math.min(0.6, this.breakProgress * 0.6);

        if (this.breakProgress >= 1) {
          const { x, y, z } = hit.position;
          this.world.setBlockWorld(x, y, z, BLOCKS.AIR);
          this.game?.multiplayer?.sendBlockChange(x, y, z, BLOCKS.AIR);
          this.game?.audio?.blockBreak();
          this.game?.particles?.blockBurst(x, y, z, blockId);
          if (this.mode === 'survival') {
            this.inventory.addItem({ id: blockId, name: this._blockName(blockId), count: 1 });
          }
          this.breakingBlock = null;
          this.breakProgress = 0;
          this._breakOverlay.visible = false;
        }
      }
    } else {
      this.breakingBlock = null;
      this.breakProgress = 0;
      this._breakOverlay.visible = false;
    }

    // ── Place block ──────────────────────────────────────────────────────
    if (controls.placing && hit && this.placeDelay <= 0) {
      const item = this.inventory.getSelected();
      if (item?.id && item.id !== BLOCKS.AIR) {
        const { x, y, z } = hit.placePosition;
        const hw = 0.4, px = this.position.x, pz = this.position.z, py = this.position.y;
        const tooClose = x + 1 > px - hw && x < px + hw &&
                         y + 1 > py && y < py + PLAYER_HEIGHT &&
                         z + 1 > pz - hw && z < pz + hw;
        if (!tooClose) {
          this.world.setBlockWorld(x, y, z, item.id);
          this.game?.multiplayer?.sendBlockChange(x, y, z, item.id);
          this.game?.audio?.blockPlace();
          if (this.mode === 'survival') this.inventory.consumeSelected();
          this.placeDelay = 0.25;
        }
      }
    }
  }

  _blockName(id) {
    return Object.entries(BLOCKS).find(([, v]) => v === id)?.[0]?.toLowerCase().replace(/_/g, ' ') || 'block';
  }
}
