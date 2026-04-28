import * as THREE from 'three';
import { Physics } from './Physics.js';
import { Inventory } from '../inventory/Inventory.js';
import { BLOCKS, BLOCK_HARDNESS } from '../world/BlockRegistry.js';
import {
  PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_EYE_HEIGHT,
  REACH_DISTANCE, CAMERA_MODES, SEA_LEVEL,
} from '../Constants.js';

const SENSITIVITY = 0.002;
const THIRD_OFFSET  = new THREE.Vector3(0, 2, 6);
const FIFTH_OFFSET  = new THREE.Vector3(0, 4, 14);

export class Player {
  constructor(scene, world, camera) {
    this.scene   = scene;
    this.world   = world;
    this.camera  = camera;
    this.position = new THREE.Vector3(0, SEA_LEVEL + 5, 0);

    this.yaw   = 0;
    this.pitch = 0;
    this.cameraMode = CAMERA_MODES.FIRST_PERSON;

    this.physics = new Physics(world);
    this.inventory = new Inventory();

    this.health = 20;
    this.maxHealth = 20;
    this.food = 20;
    this.maxFood = 20;
    this.xp = 0;

    this.breakingBlock = null;
    this.breakProgress = 0;
    this.placeDelay = 0;
    this._mouseBreaking = false;

    this._buildCharacter();
    this._buildArmModel();
    this._buildBreakOverlay();
    this._buildCrosshair();
    this._buildHighlight();
  }

  _buildCharacter() {
    this.characterGroup = new THREE.Group();
    const skin = new THREE.MeshLambertMaterial({ color: 0xffe0c0 });
    const shirt = new THREE.MeshLambertMaterial({ color: 0x4466cc });
    const pants = new THREE.MeshLambertMaterial({ color: 0x2244aa });
    const hair  = new THREE.MeshLambertMaterial({ color: 0x442200 });

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

    this.characterGroup.add(head, body, armL, armR, legL, legR);
    this._armL = armL; this._armR = armR;
    this._legL = legL; this._legR = legR;
    this._head = head;

    this.scene.add(this.characterGroup);
  }

  _buildArmModel() {
    // First-person arm
    const mat = new THREE.MeshLambertMaterial({ color: 0x4466cc });
    const geo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
    this._fpArm = new THREE.Mesh(geo, mat);
    this._fpArm.position.set(0.35, -0.45, -0.6);
    this._fpArm.rotation.x = 0.3;
    this.camera.add(this._fpArm);
    this.scene.add(this.camera);
  }

  _buildBreakOverlay() {
    const geo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0, wireframe: true,
    });
    this._breakOverlay = new THREE.Mesh(geo, mat);
    this._breakOverlay.visible = false;
    this.scene.add(this._breakOverlay);
  }

  _buildHighlight() {
    const geo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.4, wireframe: true,
    });
    this._highlight = new THREE.Mesh(geo, mat);
    this._highlight.visible = false;
    this.scene.add(this._highlight);
  }

  _buildCrosshair() {
    // CSS crosshair — injected by HUD
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

    // Camera rotation
    this.yaw   -= dx * SENSITIVITY;
    this.pitch  = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch - dy * SENSITIVITY));

    // Scroll = hotbar
    if (scroll !== 0) {
      const dir = scroll > 0 ? 1 : -1;
      this.inventory.selectSlot((this.inventory.selectedSlot + dir + 9) % 9);
    }

    // Physics
    this.physics.setYaw(this.yaw);
    this.physics.step(this.position, controls, dt);

    // Camera positioning
    this._updateCamera();

    // Animate character
    this._animateCharacter(dt, controls);

    // Block interaction
    this._handleBlockInteraction(dt, controls);

    // Highlight target block
    this._updateHighlight();
  }

  _updateCamera() {
    const eyePos = this.position.clone().add(new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 0));
    const qYaw   = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
    const q = qYaw.multiply(qPitch);

    if (this.cameraMode === CAMERA_MODES.FIRST_PERSON) {
      this.camera.position.copy(eyePos);
      this.camera.quaternion.copy(q);
    } else {
      const offset = this.cameraMode === CAMERA_MODES.THIRD_PERSON ? THIRD_OFFSET : FIFTH_OFFSET;
      const back = offset.clone().applyQuaternion(q);
      this.camera.position.copy(eyePos).add(back);
      this.camera.lookAt(eyePos);
    }

    // Keep character group under player
    this.characterGroup.position.copy(this.position);
    this.characterGroup.rotation.y = this.yaw;
  }

  _animateCharacter(dt, controls) {
    const { fx, fz } = controls.getMovement();
    const moving = Math.abs(fx) + Math.abs(fz) > 0.1;
    const time = performance.now() * 0.005;

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

    // Break block (hold left mouse)
    if (controls.breaking && hit) {
      const key = `${hit.position.x},${hit.position.y},${hit.position.z}`;
      if (this.breakingBlock !== key) {
        this.breakingBlock = key;
        this.breakProgress = 0;
      }

      const blockId = hit.block;
      const hardness = BLOCK_HARDNESS[blockId];
      if (hardness === -1) { this.breakingBlock = null; return; }

      const item = this.inventory.getSelected();
      const toolMult = item ? item.miningSpeed || 1 : 1;
      this.breakProgress += dt * toolMult / Math.max(0.05, hardness);

      // Overlay
      this._breakOverlay.position.set(hit.position.x + 0.5, hit.position.y + 0.5, hit.position.z + 0.5);
      this._breakOverlay.visible = true;
      this._breakOverlay.material.opacity = this.breakProgress * 0.6;

      if (this.breakProgress >= 1) {
        this.world.setBlockWorld(hit.position.x, hit.position.y, hit.position.z, BLOCKS.AIR);
        this.inventory.addItem({ id: blockId, name: this._blockName(blockId), count: 1 });
        this.breakingBlock = null;
        this.breakProgress = 0;
        this._breakOverlay.visible = false;
      }
    } else {
      this.breakingBlock = null;
      this.breakProgress = 0;
      this._breakOverlay.visible = false;
    }

    // Place block (right click)
    if (controls.placing && hit && this.placeDelay <= 0) {
      const item = this.inventory.getSelected();
      if (item && item.id && item.id !== BLOCKS.AIR) {
        const { x, y, z } = hit.placePosition;
        // Don't place inside player
        const pw = 0.4;
        const px = this.position.x, pz = this.position.z, py = this.position.y;
        const tooClose = x + 1 > px - pw && x < px + pw &&
                         y + 1 > py && y < py + PLAYER_HEIGHT &&
                         z + 1 > pz - pw && z < pz + pw;
        if (!tooClose) {
          this.world.setBlockWorld(x, y, z, item.id);
          this.inventory.consumeSelected();
          this.placeDelay = 0.25;
        }
      }
    }
  }

  _blockName(id) {
    return Object.entries(BLOCKS).find(([, v]) => v === id)?.[0]?.toLowerCase().replace(/_/g, ' ') || 'block';
  }

  // Called by Game — pass controls separately since it's initialized later
  setControls(controls) { this._controls = controls; }
}
