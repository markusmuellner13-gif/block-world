import * as THREE from 'three';
import { Chunk } from './Chunk.js';
import { WorldGenerator } from './WorldGenerator.js';
import { BLOCKS, BLOCK_IS_TRANSPARENT } from './BlockRegistry.js';
import { CHUNK_SIZE, CHUNK_HEIGHT, RENDER_DISTANCE, SEA_LEVEL } from '../Constants.js';

export class World {
  constructor(scene, textureManager, seed) {
    this.scene = scene;
    this.textures = textureManager;
    this.chunks = new Map();
    this.generator = new WorldGenerator(seed ?? Math.floor(Math.random() * 99999));
    this._buildQueue = [];
    this._meshQueue = [];
    this._meshQueueSet = new Set(); // fast O(1) membership check
    this._villageQueue = [];
  }

  _key(cx, cz) { return `${cx},${cz}`; }

  getChunk(cx, cz) { return this.chunks.get(this._key(cx, cz)) || null; }

  getBlockWorld(wx, y, wz) {
    if (y < 0 || y >= CHUNK_HEIGHT) return BLOCKS.AIR;
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk || !chunk.generated) return BLOCKS.AIR;
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.getBlock(lx, y, lz);
  }

  setBlockWorld(wx, y, wz, blockId) {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk || !chunk.generated) return;
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    chunk.setBlock(lx, y, lz, blockId);
    this._rebuildChunk(chunk);
    // Also rebuild neighbors if on edge
    if (lx === 0) this._rebuildChunkAt(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) this._rebuildChunkAt(cx + 1, cz);
    if (lz === 0) this._rebuildChunkAt(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) this._rebuildChunkAt(cx, cz + 1);
  }

  _rebuildChunkAt(cx, cz) {
    const chunk = this.getChunk(cx, cz);
    if (chunk && chunk.generated) this._rebuildChunk(chunk);
  }

  _rebuildChunk(chunk) {
    chunk.dirty = true;
    if (!this._meshQueueSet.has(chunk)) {
      this._meshQueue.push(chunk);
      this._meshQueueSet.add(chunk);
    }
  }

  update(playerPos) {
    const pcx = Math.floor(playerPos.x / CHUNK_SIZE);
    const pcz = Math.floor(playerPos.z / CHUNK_SIZE);

    // Load needed chunks
    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        if (dx * dx + dz * dz > RENDER_DISTANCE * RENDER_DISTANCE) continue;
        const cx = pcx + dx, cz = pcz + dz;
        const key = this._key(cx, cz);
        if (!this.chunks.has(key)) {
          const chunk = new Chunk(cx, cz);
          this.chunks.set(key, chunk);
          this._buildQueue.push(chunk);
        }
      }
    }

    // Process build queue (generate chunk data)
    const genPerFrame = 2;
    for (let i = 0; i < genPerFrame && this._buildQueue.length > 0; i++) {
      const chunk = this._buildQueue.shift();
      chunk.data = this.generator.generateChunk(chunk.cx, chunk.cz);
      chunk.generated = true;
      if (!this._meshQueueSet.has(chunk)) {
        this._meshQueue.push(chunk);
        this._meshQueueSet.add(chunk);
      }
      // Trigger neighboring chunks to rebuild so boundary faces cull correctly
      this._rebuildChunkAt(chunk.cx - 1, chunk.cz);
      this._rebuildChunkAt(chunk.cx + 1, chunk.cz);
      this._rebuildChunkAt(chunk.cx, chunk.cz - 1);
      this._rebuildChunkAt(chunk.cx, chunk.cz + 1);
    }

    // Process mesh queue
    const meshPerFrame = 2;
    let built = 0;
    while (built < meshPerFrame && this._meshQueue.length > 0) {
      const chunk = this._meshQueue.shift();
      this._meshQueueSet.delete(chunk);
      if (!chunk.generated || !chunk.dirty) continue;
      chunk.buildMesh(this.textures, this);
      chunk.addToScene(this.scene);
      built++;
    }

    // Unload distant chunks
    for (const [key, chunk] of this.chunks.entries()) {
      const [cx, cz] = key.split(',').map(Number);
      const dist = Math.abs(cx - pcx) + Math.abs(cz - pcz);
      if (dist > RENDER_DISTANCE + 2) {
        chunk.removeFromScene(this.scene);
        chunk.dispose();
        this._meshQueueSet.delete(chunk);
        this.chunks.delete(key);
      }
    }
  }

  // Raycast for block interaction
  raycast(origin, direction, maxDist = 5) {
    const step = 0.05;
    const pos = origin.clone();
    let lastEmpty = null;

    for (let t = 0; t < maxDist; t += step) {
      pos.addScaledVector(direction, step);
      const bx = Math.floor(pos.x);
      const by = Math.floor(pos.y);
      const bz = Math.floor(pos.z);
      const block = this.getBlockWorld(bx, by, bz);

      if (block !== BLOCKS.AIR && block !== BLOCKS.WATER) {
        return {
          block, position: { x: bx, y: by, z: bz },
          face: lastEmpty ? {
            x: lastEmpty.x - bx,
            y: lastEmpty.y - by,
            z: lastEmpty.z - bz
          } : { x: 0, y: 1, z: 0 },
          placePosition: lastEmpty || { x: bx, y: by + 1, z: bz },
        };
      }
      lastEmpty = { x: bx, y: by, z: bz };
    }
    return null;
  }

  // Get surface height at world X, Z
  getSurfaceHeight(wx, wz) {
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
      const b = this.getBlockWorld(wx, y, wz);
      if (b !== BLOCKS.AIR && b !== BLOCKS.WATER && b !== BLOCKS.LEAVES &&
          b !== BLOCKS.LEAVES_BIRCH && b !== BLOCKS.LEAVES_PINE &&
          b !== BLOCKS.TALL_GRASS && b !== BLOCKS.FLOWER_ROSE &&
          b !== BLOCKS.FLOWER_YELLOW && b !== BLOCKS.MUSHROOM) {
        return y + 1;
      }
    }
    return SEA_LEVEL;
  }

  // Synchronously generate the 3×3 chunks around spawn so the player
  // always lands on a solid block and never falls through un-loaded terrain.
  generateSpawnArea() {
    // Find a good spawn: not ocean, not deep water, not mountain peak
    const spawnCX = this._findGoodSpawnChunk();
    const spawnWX = spawnCX.cx * CHUNK_SIZE + 8;
    const spawnWZ = spawnCX.cz * CHUNK_SIZE + 8;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const cx = spawnCX.cx + dx, cz = spawnCX.cz + dz;
        const key = this._key(cx, cz);
        if (!this.chunks.has(key)) {
          const chunk = new Chunk(cx, cz);
          chunk.data = this.generator.generateChunk(cx, cz);
          chunk.generated = true;
          this.chunks.set(key, chunk);
          this._meshQueue.push(chunk);
        }
      }
    }
    this._spawnOffset = { x: spawnWX, z: spawnWZ };
    return this.getSurfaceHeight(spawnWX, spawnWZ);
  }

  _findGoodSpawnChunk() {
    // Spiral outward from 0,0 until we find a plains/forest chunk above sea level
    for (let r = 0; r <= 12; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          const wx = dx * CHUNK_SIZE + 8, wz = dz * CHUNK_SIZE + 8;
          const h = this.generator.getApproximateHeight(wx, wz);
          if (h >= SEA_LEVEL + 2 && h < 100) return { cx: dx, cz: dz };
        }
      }
    }
    return { cx: 0, cz: 0 };
  }

  getSpawnOffset() { return this._spawnOffset || { x: 0, z: 0 }; }
}
