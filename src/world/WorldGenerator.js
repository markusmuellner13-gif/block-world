import { createNoise2D, createNoise3D } from 'simplex-noise';
import { BLOCKS } from './BlockRegistry.js';
import { BiomeManager, BIOMES } from './BiomeManager.js';
import { CHUNK_SIZE, CHUNK_HEIGHT, SEA_LEVEL } from '../Constants.js';

function alea(seed) {
  // Simple seeded PRNG for use in noise functions
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };
}

export class WorldGenerator {
  constructor(seed = 12345) {
    this.seed = seed;
    this.biomeManager = new BiomeManager(seed);

    // Create seeded noise functions
    this._n2 = createNoise2D(alea(seed));
    this._n2b = createNoise2D(alea(seed + 1));
    this._n2c = createNoise2D(alea(seed + 2));
    this._n2d = createNoise2D(alea(seed + 3));
    this._n2e = createNoise2D(alea(seed + 4));
    this._n3 = createNoise3D(alea(seed + 5));
  }

  // Fractal noise: multiple octaves
  _fbm2(fn, x, z, octaves, lacunarity = 2, gain = 0.5) {
    let val = 0, amp = 1, freq = 1, max = 0;
    for (let i = 0; i < octaves; i++) {
      val += fn(x * freq, z * freq) * amp;
      max += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return val / max;
  }

  _temperature(x, z) {
    return (this._fbm2(this._n2b, x * 0.0008, z * 0.0008, 3) + 1) * 0.5;
  }
  _humidity(x, z) {
    return (this._fbm2(this._n2c, x * 0.001, z * 0.001, 3) + 1) * 0.5;
  }
  _continentalness(x, z) {
    return (this._fbm2(this._n2d, x * 0.0005, z * 0.0005, 4) + 1) * 0.5;
  }

  _terrainHeight(x, z, biome, biomeDef) {
    const base = biomeDef.baseHeight;
    const variation = biomeDef.heightVariation;
    const n = this._fbm2(this._n2, x * 0.006, z * 0.006, 6, 2, 0.55);
    return Math.round(base + n * variation);
  }

  _isCave(x, y, z) {
    const n = this._n3(x * 0.04, y * 0.05, z * 0.04);
    const n2 = this._n3(x * 0.02 + 100, y * 0.025 + 100, z * 0.02 + 100);
    return n > 0.3 && n2 > 0.1 && y > 4 && y < 60;
  }

  generateChunk(chunkX, chunkZ) {
    const data = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT);
    const idx = (lx, y, lz) => lx + lz * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = chunkX * CHUNK_SIZE + lx;
        const wz = chunkZ * CHUNK_SIZE + lz;

        const temp = this._temperature(wx, wz);
        const hum  = this._humidity(wx, wz);
        const cont = this._continentalness(wx, wz);

        const biomeId  = this.biomeManager.getBiome(temp, hum, cont);
        const biomeDef = this.biomeManager.getDef(biomeId);

        const surfaceY = this._terrainHeight(wx, wz, biomeId, biomeDef);

        // Bedrock
        data[idx(lx, 0, lz)] = BLOCKS.BEDROCK;

        for (let y = 1; y < CHUNK_HEIGHT; y++) {
          if (y > surfaceY) {
            // Water fill
            if (y <= SEA_LEVEL) data[idx(lx, y, lz)] = BLOCKS.WATER;
            continue;
          }

          if (this._isCave(wx, y, wz)) {
            // Leave as air
            continue;
          }

          const depth = surfaceY - y;

          if (depth === 0) {
            // Surface
            if (y < SEA_LEVEL - 1) {
              data[idx(lx, y, lz)] = BLOCKS.GRAVEL;
            } else if (y < SEA_LEVEL + 1) {
              data[idx(lx, y, lz)] = BLOCKS.SAND;
            } else {
              data[idx(lx, y, lz)] = biomeDef.surfaceBlock;
              // Snow cap
              if (biomeDef.snowLine && y >= biomeDef.snowLine) {
                data[idx(lx, y, lz)] = BLOCKS.SNOW;
              }
            }
          } else if (depth <= 4) {
            data[idx(lx, y, lz)] = biomeDef.subsurfaceBlock;
          } else {
            // Stone (or biome-specific base)
            data[idx(lx, y, lz)] = biomeDef.stoneBlock || BLOCKS.STONE;
          }

          // Ore generation (underground)
          if (y < surfaceY - 4 && y > 1) {
            const rand = this._n3(wx * 0.3 + y, wz * 0.3, y * 0.5);
            const ore = this._pickOre(y, rand * biomeDef.oreMultiplier);
            if (ore) data[idx(lx, y, lz)] = ore;
          }
        }

        // Flora and features on surface
        if (surfaceY >= SEA_LEVEL) {
          this._placeFeatures(data, idx, lx, lz, wx, wz, surfaceY, biomeDef);
        }
      }
    }

    return data;
  }

  _pickOre(y, rand) {
    if (y < 16 && rand > 0.985) return BLOCKS.DIAMOND_ORE;
    if (y < 32 && rand > 0.98)  return BLOCKS.GOLD_ORE;
    if (y < 32 && rand > 0.975) return BLOCKS.EMERALD_ORE;
    if (y < 64 && rand > 0.96)  return BLOCKS.IRON_ORE;
    if (y < 80 && rand > 0.94)  return BLOCKS.COAL_ORE;
    return null;
  }

  _placeFeatures(data, idx, lx, lz, wx, wz, surfaceY, biomeDef) {
    if (surfaceY >= CHUNK_HEIGHT - 20) return;

    const rand = (this._n2e(wx * 0.3, wz * 0.3) + 1) * 0.5;
    const rand2 = (this._n2e(wx * 0.7 + 5, wz * 0.7 + 5) + 1) * 0.5;

    // Trees
    if (biomeDef.trees && rand < biomeDef.trees.chance) {
      this._placeTree(data, idx, lx, lz, surfaceY, biomeDef.trees.type);
      return; // don't add flora under tree
    }

    // Flora
    for (const flora of (biomeDef.flora || [])) {
      if (rand2 < flora.chance) {
        if (surfaceY + 1 < CHUNK_HEIGHT) {
          data[idx(lx, surfaceY + 1, lz)] = flora.block;
        }
        break;
      }
    }
  }

  _placeTree(data, idx, lx, lz, surfaceY, type) {
    const CSIZE = CHUNK_SIZE;
    const safeIdx = (x, y, z) => {
      if (x < 0 || x >= CSIZE || z < 0 || z >= CSIZE || y < 0 || y >= CHUNK_HEIGHT) return -1;
      return idx(x, y, z);
    };
    const set = (x, y, z, block) => {
      const i = safeIdx(x, y, z);
      if (i >= 0 && data[i] === BLOCKS.AIR) data[i] = block;
    };

    if (type === 'cactus') {
      const h = 2 + Math.floor(Math.random() * 2);
      for (let dy = 1; dy <= h; dy++) {
        const i = safeIdx(lx, surfaceY + dy, lz);
        if (i >= 0) data[i] = BLOCKS.CACTUS;
      }
      return;
    }

    if (type === 'mushroom_tree') {
      const h = 4 + Math.floor(Math.random() * 3);
      for (let dy = 1; dy <= h; dy++) set(lx, surfaceY + dy, lz, BLOCKS.WOOD_LOG);
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          set(lx + dx, surfaceY + h, lz + dz, BLOCKS.WOOL_RED);
          set(lx + dx, surfaceY + h + 1, lz + dz, BLOCKS.WOOL_RED);
        }
      }
      return;
    }

    let logBlock = BLOCKS.WOOD_LOG;
    let leafBlock = BLOCKS.LEAVES;
    let trunkH = 5 + Math.floor(Math.random() * 3);

    if (type === 'birch') { logBlock = BLOCKS.BIRCH_LOG; leafBlock = BLOCKS.LEAVES_BIRCH; trunkH = 6 + Math.floor(Math.random() * 2); }
    if (type === 'pine')  { logBlock = BLOCKS.PINE_LOG;  leafBlock = BLOCKS.LEAVES_PINE; trunkH = 8 + Math.floor(Math.random() * 4); }
    if (type === 'jungle'){ trunkH = 10 + Math.floor(Math.random() * 6); }
    if (type === 'swamp_oak') { trunkH = 4 + Math.floor(Math.random() * 2); }

    // Trunk
    for (let dy = 1; dy <= trunkH; dy++) set(lx, surfaceY + dy, lz, logBlock);

    // Leaves
    if (type === 'pine') {
      for (let dy = 2; dy <= trunkH; dy++) {
        const r = Math.max(1, Math.floor((trunkH - dy) * 0.5));
        for (let dx = -r; dx <= r; dx++) {
          for (let dz = -r; dz <= r; dz++) {
            if (Math.abs(dx) + Math.abs(dz) <= r + 1) {
              set(lx + dx, surfaceY + dy, lz + dz, leafBlock);
            }
          }
        }
      }
      set(lx, surfaceY + trunkH + 1, lz, leafBlock);
    } else {
      const leafStart = trunkH - 2;
      for (let dy = leafStart; dy <= trunkH + 1; dy++) {
        const r = dy <= trunkH - 1 ? 2 : 1;
        for (let dx = -r; dx <= r; dx++) {
          for (let dz = -r; dz <= r; dz++) {
            if (Math.abs(dx) + Math.abs(dz) <= r + 1) {
              set(lx + dx, surfaceY + dy, lz + dz, leafBlock);
            }
          }
        }
      }
    }
  }

  // Generate village structures at a world position
  generateVillage(chunkX, chunkZ, startY) {
    // Returns list of {wx, y, wz, block} placements for the caller to apply
    const placements = [];
    const cx = chunkX * CHUNK_SIZE + 8;
    const cz = chunkZ * CHUNK_SIZE + 8;

    const houseCount = 3 + Math.floor(Math.random() * 4);
    const angles = [];
    for (let i = 0; i < houseCount; i++) {
      angles.push((i / houseCount) * Math.PI * 2);
    }

    // Central well
    placements.push(...this._buildWell(cx, startY, cz));

    // Houses
    for (let i = 0; i < houseCount; i++) {
      const dist = 12 + Math.random() * 8;
      const hx = Math.round(cx + Math.cos(angles[i]) * dist);
      const hz = Math.round(cz + Math.sin(angles[i]) * dist);
      placements.push(...this._buildHouse(hx, startY, hz));
    }

    return placements;
  }

  _buildWell(cx, y, cz) {
    const p = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        p.push({ wx: cx + dx, y, wz: cz + dz, block: BLOCKS.STONE_BRICK });
        for (let dy = 1; dy <= 3; dy++) {
          if (Math.abs(dx) === 1 && Math.abs(dz) === 1) continue;
          p.push({ wx: cx + dx, y: y + dy, wz: cz + dz, block: BLOCKS.AIR });
        }
      }
    }
    // Pillars
    for (const [dx, dz] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      for (let dy = 1; dy <= 3; dy++) {
        p.push({ wx: cx + dx, y: y + dy, wz: cz + dz, block: BLOCKS.PLANKS_OAK });
      }
    }
    return p;
  }

  _buildHouse(cx, y, cz) {
    const p = [];
    const W = 6, D = 5, H = 4;
    // Floor
    for (let dx = 0; dx < W; dx++) for (let dz = 0; dz < D; dz++) {
      p.push({ wx: cx + dx, y, wz: cz + dz, block: BLOCKS.PLANKS_OAK });
    }
    // Walls
    for (let dx = 0; dx < W; dx++) for (let dy = 1; dy <= H; dy++) {
      p.push({ wx: cx + dx, y: y + dy, wz: cz, block: BLOCKS.PLANKS_OAK });
      p.push({ wx: cx + dx, y: y + dy, wz: cz + D - 1, block: BLOCKS.PLANKS_OAK });
    }
    for (let dz = 1; dz < D - 1; dz++) for (let dy = 1; dy <= H; dy++) {
      p.push({ wx: cx, y: y + dy, wz: cz + dz, block: BLOCKS.PLANKS_OAK });
      p.push({ wx: cx + W - 1, y: y + dy, wz: cz + dz, block: BLOCKS.PLANKS_OAK });
    }
    // Roof
    for (let dx = 0; dx < W; dx++) for (let dz = 0; dz < D; dz++) {
      p.push({ wx: cx + dx, y: y + H + 1, wz: cz + dz, block: BLOCKS.PLANKS_OAK });
    }
    // Windows
    p.push({ wx: cx + 1, y: y + 2, wz: cz, block: BLOCKS.GLASS });
    p.push({ wx: cx + 4, y: y + 2, wz: cz, block: BLOCKS.GLASS });
    // Door gap
    p.push({ wx: cx + 2, y: y + 1, wz: cz, block: BLOCKS.AIR });
    p.push({ wx: cx + 2, y: y + 2, wz: cz, block: BLOCKS.AIR });
    // Crafting + furnace
    p.push({ wx: cx + 1, y: y + 1, wz: cz + 1, block: BLOCKS.CRAFTING_TABLE });
    p.push({ wx: cx + 1, y: y + 1, wz: cz + 2, block: BLOCKS.FURNACE });
    p.push({ wx: cx + W - 2, y: y + 1, wz: cz + 1, block: BLOCKS.BOOKSHELF });

    return p;
  }
}
