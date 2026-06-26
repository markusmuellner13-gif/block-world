import { BLOCKS } from './BlockRegistry.js';

export const BIOMES = {
  PLAINS:       'plains',
  FOREST:       'forest',
  BIRCH_FOREST: 'birch_forest',
  DARK_FOREST:  'dark_forest',
  TAIGA:        'taiga',
  DESERT:       'desert',
  SAVANNA:      'savanna',
  JUNGLE:       'jungle',
  MOUNTAINS:    'mountains',
  TUNDRA:       'tundra',
  SWAMP:        'swamp',
  OCEAN:        'ocean',
  BEACH:        'beach',
  MUSHROOM:     'mushroom',
};

const BIOME_DEFS = {
  [BIOMES.PLAINS]: {
    baseHeight: 66, heightVariation: 5,
    surfaceBlock: BLOCKS.GRASS, subsurfaceBlock: BLOCKS.DIRT,
    trees: { chance: 0.012, type: 'oak' },
    flora: [
      { block: BLOCKS.FLOWER_ROSE,   chance: 0.03 },
      { block: BLOCKS.FLOWER_YELLOW, chance: 0.04 },
      { block: BLOCKS.TALL_GRASS,    chance: 0.22 },
    ],
    oreMultiplier: 1.0,
    fogColor: 0x87ceeb, fogNear: 80, fogFar: 150,
    animals: ['cow', 'pig', 'sheep', 'chicken', 'horse'],
    villageChance: 0.003,
  },
  [BIOMES.FOREST]: {
    baseHeight: 68, heightVariation: 8,
    surfaceBlock: BLOCKS.GRASS, subsurfaceBlock: BLOCKS.DIRT,
    trees: { chance: 0.10, type: 'oak' },
    flora: [
      { block: BLOCKS.FLOWER_ROSE,   chance: 0.02 },
      { block: BLOCKS.MUSHROOM,      chance: 0.008 },
      { block: BLOCKS.TALL_GRASS,    chance: 0.18 },
    ],
    oreMultiplier: 1.0,
    fogColor: 0x6aab5a, fogNear: 40, fogFar: 80,
    animals: ['wolf', 'rabbit', 'fox', 'deer'],
    villageChance: 0.001,
  },
  [BIOMES.BIRCH_FOREST]: {
    baseHeight: 68, heightVariation: 5,
    surfaceBlock: BLOCKS.GRASS, subsurfaceBlock: BLOCKS.DIRT,
    trees: { chance: 0.08, type: 'birch' },
    flora: [
      { block: BLOCKS.FLOWER_YELLOW, chance: 0.04 },
      { block: BLOCKS.TALL_GRASS,    chance: 0.15 },
    ],
    oreMultiplier: 1.0,
    fogColor: 0x8bc87a, fogNear: 50, fogFar: 100,
    animals: ['rabbit', 'fox', 'deer'],
    villageChance: 0.001,
  },
  [BIOMES.DARK_FOREST]: {
    baseHeight: 67, heightVariation: 4,
    surfaceBlock: BLOCKS.GRASS, subsurfaceBlock: BLOCKS.DIRT,
    trees: { chance: 0.06, type: 'oak' },
    flora: [
      { block: BLOCKS.MUSHROOM,   chance: 0.01 },
      { block: BLOCKS.TALL_GRASS, chance: 0.04 },
    ],
    oreMultiplier: 1.0,
    fogColor: 0x3a5a2a, fogNear: 25, fogFar: 60,
    animals: ['wolf', 'rabbit'],
    villageChance: 0.0005,
  },
  [BIOMES.TAIGA]: {
    baseHeight: 70, heightVariation: 8,
    surfaceBlock: BLOCKS.GRASS, subsurfaceBlock: BLOCKS.DIRT,
    trees: { chance: 0.04, type: 'pine' },
    flora: [
      { block: BLOCKS.MUSHROOM, chance: 0.005 },
    ],
    oreMultiplier: 1.0,
    fogColor: 0x8ab8cc, fogNear: 60, fogFar: 120,
    animals: ['wolf', 'rabbit', 'fox'],
    villageChance: 0.002,
  },
  [BIOMES.DESERT]: {
    baseHeight: 65, heightVariation: 3,
    surfaceBlock: BLOCKS.SAND, subsurfaceBlock: BLOCKS.SAND,
    stoneBlock: BLOCKS.SANDSTONE,
    trees: { chance: 0.001, type: 'cactus' },
    flora: [
      { block: BLOCKS.CACTUS, chance: 0.003 },
    ],
    oreMultiplier: 0.8,
    fogColor: 0xd4b060, fogNear: 80, fogFar: 160,
    animals: ['rabbit'],
    villageChance: 0.003,
  },
  [BIOMES.SAVANNA]: {
    baseHeight: 66, heightVariation: 3,
    surfaceBlock: BLOCKS.GRASS, subsurfaceBlock: BLOCKS.DIRT,
    trees: { chance: 0.006, type: 'oak' },
    flora: [
      { block: BLOCKS.TALL_GRASS, chance: 0.03 },
    ],
    oreMultiplier: 1.0,
    fogColor: 0xd4c080, fogNear: 80, fogFar: 160,
    animals: ['cow', 'horse', 'chicken'],
    villageChance: 0.003,
  },
  [BIOMES.JUNGLE]: {
    baseHeight: 72, heightVariation: 10,
    surfaceBlock: BLOCKS.GRASS, subsurfaceBlock: BLOCKS.DIRT,
    trees: { chance: 0.07, type: 'jungle' },
    flora: [
      { block: BLOCKS.FLOWER_ROSE,   chance: 0.01 },
      { block: BLOCKS.FLOWER_YELLOW, chance: 0.01 },
      { block: BLOCKS.TALL_GRASS,    chance: 0.1 },
    ],
    oreMultiplier: 1.0,
    fogColor: 0x4aaa2a, fogNear: 20, fogFar: 60,
    animals: ['pig', 'chicken', 'rabbit'],
    villageChance: 0.001,
  },
  [BIOMES.MOUNTAINS]: {
    baseHeight: 85, heightVariation: 50,
    surfaceBlock: BLOCKS.STONE, subsurfaceBlock: BLOCKS.STONE,
    snowLine: 120,
    trees: { chance: 0.01, type: 'pine' },
    flora: [],
    oreMultiplier: 1.5,
    fogColor: 0xaaccdd, fogNear: 60, fogFar: 200,
    animals: ['rabbit'],
    villageChance: 0.0005,
  },
  [BIOMES.TUNDRA]: {
    baseHeight: 65, heightVariation: 3,
    surfaceBlock: BLOCKS.SNOW, subsurfaceBlock: BLOCKS.DIRT,
    trees: { chance: 0.008, type: 'pine' },
    flora: [],
    oreMultiplier: 1.0,
    fogColor: 0xd0e4f0, fogNear: 60, fogFar: 150,
    animals: ['rabbit', 'wolf'],
    villageChance: 0.001,
  },
  [BIOMES.SWAMP]: {
    baseHeight: 63, heightVariation: 2,
    surfaceBlock: BLOCKS.GRASS, subsurfaceBlock: BLOCKS.DIRT,
    trees: { chance: 0.025, type: 'swamp_oak' },
    flora: [
      { block: BLOCKS.MUSHROOM,   chance: 0.008 },
      { block: BLOCKS.TALL_GRASS, chance: 0.06 },
    ],
    oreMultiplier: 0.9,
    fogColor: 0x6a8a5a, fogNear: 30, fogFar: 80,
    animals: [],
    villageChance: 0.001,
  },
  [BIOMES.OCEAN]: {
    baseHeight: 45, heightVariation: 5,
    surfaceBlock: BLOCKS.SAND, subsurfaceBlock: BLOCKS.GRAVEL,
    trees: { chance: 0, type: 'none' },
    flora: [],
    oreMultiplier: 0.5,
    fogColor: 0x1a5ea0, fogNear: 30, fogFar: 80,
    animals: [],
    villageChance: 0,
  },
  [BIOMES.BEACH]: {
    baseHeight: 64, heightVariation: 2,
    surfaceBlock: BLOCKS.SAND, subsurfaceBlock: BLOCKS.SAND,
    trees: { chance: 0, type: 'none' },
    flora: [],
    oreMultiplier: 0.8,
    fogColor: 0x8ad4f0, fogNear: 80, fogFar: 160,
    animals: ['chicken'],
    villageChance: 0.001,
  },
  [BIOMES.MUSHROOM]: {
    baseHeight: 68, heightVariation: 4,
    surfaceBlock: BLOCKS.MYCELIUM, subsurfaceBlock: BLOCKS.DIRT,
    trees: { chance: 0.01, type: 'mushroom_tree' },
    flora: [
      { block: BLOCKS.MUSHROOM, chance: 0.04 },
    ],
    oreMultiplier: 1.0,
    fogColor: 0x9a70aa, fogNear: 60, fogFar: 120,
    animals: [],
    villageChance: 0,
  },
};

export class BiomeManager {
  constructor(seed) {
    this.seed = seed;
  }

  getBiome(temperature, humidity, continentalness) {
    if (continentalness < 0.25) return BIOMES.OCEAN;
    if (continentalness < 0.32) return BIOMES.BEACH;
    if (continentalness > 0.85 && temperature < 0.3) return BIOMES.MOUNTAINS;
    if (temperature < 0.15) return BIOMES.TUNDRA;
    if (temperature < 0.3 && humidity > 0.6) return BIOMES.TAIGA;
    if (temperature > 0.8 && humidity < 0.2) return BIOMES.DESERT;
    if (temperature > 0.7 && humidity > 0.7) return BIOMES.JUNGLE;
    if (temperature > 0.6 && humidity < 0.4) return BIOMES.SAVANNA;
    if (humidity < 0.3) return BIOMES.PLAINS;
    if (humidity > 0.8) return BIOMES.SWAMP;
    if (humidity > 0.7) return BIOMES.DARK_FOREST;
    if (temperature > 0.45 && temperature < 0.65) return BIOMES.BIRCH_FOREST;
    return BIOMES.FOREST;
  }

  getDef(biome) {
    return BIOME_DEFS[biome] || BIOME_DEFS[BIOMES.PLAINS];
  }
}
