import * as THREE from 'three';
import { Animal } from './Animal.js';
import { NPC } from './NPC.js';
import { Vehicle } from './Vehicle.js';
import { CHUNK_SIZE, ENTITY_RENDER_DISTANCE, SEA_LEVEL } from '../Constants.js';

const ANIMAL_TYPES = ['cow', 'pig', 'sheep', 'chicken', 'wolf', 'rabbit', 'fox', 'deer', 'horse'];

export class EntityManager {
  constructor(scene, world, textures) {
    this.scene    = scene;
    this.world    = world;
    this.textures = textures;

    this.animals  = [];
    this.npcs     = [];
    this.vehicles = [];

    this._spawnedChunks = new Set();
    this._activeVehicle = null;
  }

  update(dt, playerPos) {
    const pcx = Math.floor(playerPos.x / CHUNK_SIZE);
    const pcz = Math.floor(playerPos.z / CHUNK_SIZE);

    // Spawn entities in nearby chunks
    for (let dx = -ENTITY_RENDER_DISTANCE; dx <= ENTITY_RENDER_DISTANCE; dx++) {
      for (let dz = -ENTITY_RENDER_DISTANCE; dz <= ENTITY_RENDER_DISTANCE; dz++) {
        const cx = pcx + dx, cz = pcz + dz;
        const key = `${cx},${cz}`;
        if (!this._spawnedChunks.has(key)) {
          this._spawnedChunks.add(key);
          this._spawnChunk(cx, cz);
        }
      }
    }

    // Remove far entities from scene
    const limit = (ENTITY_RENDER_DISTANCE + 2) * CHUNK_SIZE;
    for (const animal of this.animals) {
      const d = animal.position.distanceTo(playerPos);
      animal.group.visible = d < limit;
      if (animal.group.visible) animal.update(dt, playerPos);
    }

    for (const npc of this.npcs) {
      const d = npc.position.distanceTo(playerPos);
      npc.group.visible = d < limit;
      if (npc.group.visible) npc.update(dt, playerPos);
    }

    for (const vehicle of this.vehicles) {
      vehicle.update(dt, null, null);
    }
  }

  _spawnChunk(cx, cz) {
    const chunk = this.world.getChunk(cx, cz);
    if (!chunk || !chunk.generated) return;

    const wx0 = cx * CHUNK_SIZE;
    const wz0 = cz * CHUNK_SIZE;

    // Spawn 0-3 animals per chunk
    const animalCount = Math.floor(Math.random() * 4);
    for (let i = 0; i < animalCount; i++) {
      const wx = wx0 + Math.random() * CHUNK_SIZE;
      const wz = wz0 + Math.random() * CHUNK_SIZE;
      const wy = this.world.getSurfaceHeight(Math.floor(wx), Math.floor(wz));
      if (wy < SEA_LEVEL) continue;

      const type = ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)];
      const pos = new THREE.Vector3(wx, wy, wz);
      const animal = new Animal(type, pos, this.world);
      this.scene.add(animal.group);
      this.animals.push(animal);
    }

    // Spawn a car occasionally
    if (Math.random() < 0.02) {
      const wx = wx0 + CHUNK_SIZE / 2;
      const wz = wz0 + CHUNK_SIZE / 2;
      const wy = this.world.getSurfaceHeight(Math.floor(wx), Math.floor(wz));
      if (wy >= SEA_LEVEL) {
        const pos = new THREE.Vector3(wx, wy, wz);
        const vehicle = new Vehicle(pos, this.world);
        this.scene.add(vehicle.group);
        this.vehicles.push(vehicle);
      }
    }

    // Spawn NPCs in biome-appropriate spots (basic: 1 per 8 chunks)
    if (Math.random() < 0.12) {
      const wx = wx0 + Math.random() * CHUNK_SIZE;
      const wz = wz0 + Math.random() * CHUNK_SIZE;
      const wy = this.world.getSurfaceHeight(Math.floor(wx), Math.floor(wz));
      if (wy >= SEA_LEVEL) {
        const pos = new THREE.Vector3(wx, wy, wz);
        const npc = new NPC(pos, this.world);
        this.scene.add(npc.group);
        this.npcs.push(npc);
      }
    }
  }

  // For player to interact with nearby vehicles
  getNearbyVehicle(playerPos, radius = 3) {
    for (const v of this.vehicles) {
      if (v.position.distanceTo(playerPos) < radius) return v;
    }
    return null;
  }

  getNearbyNPC(playerPos, radius = 4) {
    for (const n of this.npcs) {
      if (n.position.distanceTo(playerPos) < radius && n.isTalking) return n;
    }
    return null;
  }
}
