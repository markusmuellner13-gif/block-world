import * as THREE from 'three';
import { Animal } from './Animal.js';
import { NPC } from './NPC.js';
import { Vehicle } from './Vehicle.js';
import { Zombie } from './Zombie.js';
import { CHUNK_SIZE, ENTITY_RENDER_DISTANCE, SEA_LEVEL } from '../Constants.js';

const ANIMAL_TYPES = ['cow', 'pig', 'sheep', 'chicken', 'wolf', 'rabbit', 'fox', 'deer', 'horse'];
const MAX_ZOMBIES  = 40;

export class EntityManager {
  constructor(scene, world, textures) {
    this.scene    = scene;
    this.world    = world;
    this.textures = textures;

    this.animals  = [];
    this.npcs     = [];
    this.vehicles = [];
    this.zombies  = [];

    this._spawnedChunks = new Set();
  }

  // game is passed each frame so we don't hold a circular reference in the constructor
  update(dt, playerPos, game) {
    const pcx = Math.floor(playerPos.x / CHUNK_SIZE);
    const pcz = Math.floor(playerPos.z / CHUNK_SIZE);
    const isNight = game && (game.dayTime < 0.25 || game.dayTime > 0.75);

    // Spawn entities in nearby chunks
    for (let dx = -ENTITY_RENDER_DISTANCE; dx <= ENTITY_RENDER_DISTANCE; dx++) {
      for (let dz = -ENTITY_RENDER_DISTANCE; dz <= ENTITY_RENDER_DISTANCE; dz++) {
        const cx = pcx + dx, cz = pcz + dz;
        const key = `${cx},${cz}`;
        if (!this._spawnedChunks.has(key)) {
          this._spawnedChunks.add(key);
          this._spawnChunk(cx, cz, isNight);
        }
      }
    }

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

    // Update zombies — remove dead ones
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      if (z.dead) {
        z.dispose(this.scene);
        this.zombies.splice(i, 1);
        continue;
      }
      const d = z.position.distanceTo(playerPos);
      z.group.visible = d < limit;
      if (z.group.visible) z.update(dt, playerPos, game);
    }

    // Spawn extra zombies at night near the player
    if (isNight && this.zombies.length < MAX_ZOMBIES && Math.random() < 0.005) {
      this._spawnZombieNear(playerPos);
    }
  }

  _spawnChunk(cx, cz, isNight) {
    const chunk = this.world.getChunk(cx, cz);
    if (!chunk || !chunk.generated) return;

    const wx0 = cx * CHUNK_SIZE;
    const wz0 = cz * CHUNK_SIZE;

    // Passive animals only spawn during the day (or at initial load regardless)
    const animalCount = Math.floor(Math.random() * 4);
    for (let i = 0; i < animalCount; i++) {
      const wx = wx0 + Math.random() * CHUNK_SIZE;
      const wz = wz0 + Math.random() * CHUNK_SIZE;
      const wy = this.world.getSurfaceHeight(Math.floor(wx), Math.floor(wz));
      if (wy < SEA_LEVEL) continue;

      const type   = ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)];
      const animal = new Animal(type, new THREE.Vector3(wx, wy, wz), this.world);
      this.scene.add(animal.group);
      this.animals.push(animal);
    }

    // Zombies spawn at night, a small chance per chunk
    if (isNight && this.zombies.length < MAX_ZOMBIES && Math.random() < 0.35) {
      const wx = wx0 + Math.random() * CHUNK_SIZE;
      const wz = wz0 + Math.random() * CHUNK_SIZE;
      const wy = this.world.getSurfaceHeight(Math.floor(wx), Math.floor(wz));
      if (wy >= SEA_LEVEL) {
        const zombie = new Zombie(new THREE.Vector3(wx, wy, wz), this.world);
        this.scene.add(zombie.group);
        this.zombies.push(zombie);
      }
    }

    // Car occasionally
    if (Math.random() < 0.02) {
      const wx = wx0 + CHUNK_SIZE / 2;
      const wz = wz0 + CHUNK_SIZE / 2;
      const wy = this.world.getSurfaceHeight(Math.floor(wx), Math.floor(wz));
      if (wy >= SEA_LEVEL) {
        const vehicle = new Vehicle(new THREE.Vector3(wx, wy, wz), this.world);
        this.scene.add(vehicle.group);
        this.vehicles.push(vehicle);
      }
    }

    // NPCs (roughly 1 per 8 chunks)
    if (Math.random() < 0.12) {
      const wx = wx0 + Math.random() * CHUNK_SIZE;
      const wz = wz0 + Math.random() * CHUNK_SIZE;
      const wy = this.world.getSurfaceHeight(Math.floor(wx), Math.floor(wz));
      if (wy >= SEA_LEVEL) {
        const npc = new NPC(new THREE.Vector3(wx, wy, wz), this.world);
        this.scene.add(npc.group);
        this.npcs.push(npc);
      }
    }
  }

  _spawnZombieNear(playerPos) {
    // Spawn 8–16 blocks away from the player
    const angle = Math.random() * Math.PI * 2;
    const dist  = 10 + Math.random() * 6;
    const wx    = playerPos.x + Math.cos(angle) * dist;
    const wz    = playerPos.z + Math.sin(angle) * dist;
    const wy    = this.world.getSurfaceHeight(Math.floor(wx), Math.floor(wz));
    if (wy < SEA_LEVEL) return;
    const zombie = new Zombie(new THREE.Vector3(wx, wy, wz), this.world);
    this.scene.add(zombie.group);
    this.zombies.push(zombie);
  }

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

  // Allow Player.js to deal damage to the nearest zombie (sword hit)
  hitNearestZombie(playerPos, damage, knockbackDir) {
    let best = null, bestDist = 2.5;
    for (const z of this.zombies) {
      const d = z.position.distanceTo(playerPos);
      if (d < bestDist) { best = z; bestDist = d; }
    }
    if (best) best.takeDamage(damage, knockbackDir);
  }
}
