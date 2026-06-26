// Block IDs — keep 0 = AIR always
export const BLOCKS = {
  AIR:            0,
  GRASS:          1,
  DIRT:           2,
  STONE:          3,
  COBBLESTONE:    4,
  SAND:           5,
  GRAVEL:         6,
  WATER:          7,
  LAVA:           8,
  BEDROCK:        9,
  WOOD_LOG:       10,
  BIRCH_LOG:      11,
  PINE_LOG:       12,
  LEAVES:         13,
  LEAVES_BIRCH:   14,
  LEAVES_PINE:    15,
  PLANKS_OAK:     16,
  PLANKS_BIRCH:   17,
  PLANKS_PINE:    18,
  GLASS:          19,
  BRICK:          20,
  SANDSTONE:      21,
  SNOW:           22,
  ICE:            23,
  OBSIDIAN:       24,
  COAL_ORE:       25,
  IRON_ORE:       26,
  GOLD_ORE:       27,
  DIAMOND_ORE:    28,
  EMERALD_ORE:    29,
  CLAY:           30,
  MYCELIUM:       31,
  PODZOL:         32,
  RED_SAND:       33,
  TERRACOTTA:     34,
  GLOWSTONE:      35,
  NETHERRACK:     36,
  CRAFTING_TABLE: 37,
  FURNACE:        38,
  FARMLAND:       39,
  WHEAT:          40,
  BOOKSHELF:      41,
  STONE_BRICK:    42,
  MOSSY_COBBLE:   43,
  CACTUS:         44,
  SOUL_SAND:      45,
  WOOL_WHITE:     46,
  WOOL_RED:       47,
  WOOL_GREEN:     48,
  WOOL_BLUE:      49,
  WOOL_YELLOW:    50,
  WOOL_ORANGE:    51,
  WOOL_PURPLE:    52,
  WOOL_BLACK:     53,
  WOOL_CYAN:      54,
  WOOL_PINK:      55,
  FLOWER_ROSE:    56,
  FLOWER_YELLOW:  57,
  MUSHROOM:       58,
  TALL_GRASS:     59,
};

// For easy iteration
export const BLOCK_COUNT = Object.keys(BLOCKS).length;

// Non-block item IDs (start at 200 to avoid conflicts with block IDs)
export const ITEMS = {
  COAL: 200, IRON_INGOT: 201, GOLD_INGOT: 202, DIAMOND: 203, EMERALD: 204,
  STICK: 205, SEEDS: 206, APPLE: 207, BREAD: 208,
  RAW_BEEF: 209, COOKED_BEEF: 210, RAW_CHICKEN: 211, COOKED_CHICKEN: 212,
  ROTTEN_FLESH: 213, BONE: 214, FEATHER: 215,
};

export const FOOD_VALUES = {
  [ITEMS.APPLE]: 4,
  [ITEMS.BREAD]: 5,
  [ITEMS.COOKED_BEEF]: 8,
  [ITEMS.RAW_BEEF]: 3,
  [ITEMS.COOKED_CHICKEN]: 6,
  [ITEMS.RAW_CHICKEN]: 2,
  [ITEMS.ROTTEN_FLESH]: 4,
};

export const ITEM_NAMES = {
  [ITEMS.COAL]: 'Coal',
  [ITEMS.IRON_INGOT]: 'Iron Ingot',
  [ITEMS.GOLD_INGOT]: 'Gold Ingot',
  [ITEMS.DIAMOND]: 'Diamond',
  [ITEMS.EMERALD]: 'Emerald',
  [ITEMS.STICK]: 'Stick',
  [ITEMS.SEEDS]: 'Seeds',
  [ITEMS.APPLE]: 'Apple',
  [ITEMS.BREAD]: 'Bread',
  [ITEMS.RAW_BEEF]: 'Raw Beef',
  [ITEMS.COOKED_BEEF]: 'Cooked Beef',
  [ITEMS.RAW_CHICKEN]: 'Raw Chicken',
  [ITEMS.COOKED_CHICKEN]: 'Cooked Chicken',
  [ITEMS.ROTTEN_FLESH]: 'Rotten Flesh',
  [ITEMS.BONE]: 'Bone',
  [ITEMS.FEATHER]: 'Feather',
};

export function getBlockDrop(blockId) {
  switch (blockId) {
    case BLOCKS.STONE:        return { id: BLOCKS.COBBLESTONE, count: 1, name: 'Cobblestone', type: 'block' };
    case BLOCKS.GRASS:        return { id: BLOCKS.DIRT, count: 1, name: 'Dirt', type: 'block' };
    case BLOCKS.COAL_ORE:     return { id: ITEMS.COAL, count: 1, name: 'Coal', type: 'item' };
    case BLOCKS.DIAMOND_ORE:  return { id: ITEMS.DIAMOND, count: 1, name: 'Diamond', type: 'item' };
    case BLOCKS.EMERALD_ORE:  return { id: ITEMS.EMERALD, count: 1, name: 'Emerald', type: 'item' };
    case BLOCKS.IRON_ORE:     return { id: BLOCKS.IRON_ORE, count: 1, name: 'Iron Ore', type: 'block' };
    case BLOCKS.GOLD_ORE:     return { id: BLOCKS.GOLD_ORE, count: 1, name: 'Gold Ore', type: 'block' };
    case BLOCKS.LEAVES:       return Math.random() < 0.05 ? { id: ITEMS.APPLE, count: 1, name: 'Apple', type: 'item' } : null;
    case BLOCKS.LEAVES_BIRCH: return null;
    case BLOCKS.LEAVES_PINE:  return null;
    case BLOCKS.GLOWSTONE:    return { id: BLOCKS.GLOWSTONE, count: 2 + Math.floor(Math.random() * 3), name: 'Glowstone', type: 'block' };
    case BLOCKS.WHEAT:        return { id: ITEMS.BREAD, count: 1, name: 'Bread', type: 'item' };
    case BLOCKS.TALL_GRASS:   return Math.random() < 0.15 ? { id: ITEMS.SEEDS, count: 1, name: 'Seeds', type: 'item' } : null;
    case BLOCKS.FLOWER_ROSE:
    case BLOCKS.FLOWER_YELLOW:
    case BLOCKS.MUSHROOM:
      return { id: blockId, count: 1, name: 'Block', type: 'block' };
    default:
      return {
        id: blockId, count: 1, type: 'block',
        name: Object.entries(BLOCKS).find(([, v]) => v === blockId)?.[0]?.toLowerCase().replace(/_/g, ' ') || 'Block',
      };
  }
}

// Which tool type breaks this fastest
export const TOOL_AFFINITY = {
  pickaxe: new Set([
    BLOCKS.STONE, BLOCKS.COBBLESTONE, BLOCKS.SANDSTONE, BLOCKS.BRICK,
    BLOCKS.STONE_BRICK, BLOCKS.MOSSY_COBBLE, BLOCKS.COAL_ORE, BLOCKS.IRON_ORE,
    BLOCKS.GOLD_ORE, BLOCKS.DIAMOND_ORE, BLOCKS.EMERALD_ORE, BLOCKS.OBSIDIAN,
    BLOCKS.GLOWSTONE, BLOCKS.NETHERRACK, BLOCKS.ICE, BLOCKS.BEDROCK,
    BLOCKS.FURNACE, BLOCKS.CRAFTING_TABLE,
  ]),
  axe: new Set([
    BLOCKS.WOOD_LOG, BLOCKS.BIRCH_LOG, BLOCKS.PINE_LOG,
    BLOCKS.PLANKS_OAK, BLOCKS.PLANKS_BIRCH, BLOCKS.PLANKS_PINE,
    BLOCKS.BOOKSHELF,
  ]),
  shovel: new Set([
    BLOCKS.GRASS, BLOCKS.DIRT, BLOCKS.SAND, BLOCKS.GRAVEL, BLOCKS.CLAY,
    BLOCKS.SNOW, BLOCKS.PODZOL, BLOCKS.MYCELIUM, BLOCKS.RED_SAND,
    BLOCKS.SOUL_SAND, BLOCKS.FARMLAND,
  ]),
};

// Hardness in seconds with empty hand
export const BLOCK_HARDNESS = new Float32Array(BLOCK_COUNT + 1);
{
  const H = BLOCK_HARDNESS;
  H[BLOCKS.GRASS]          = 0.6;
  H[BLOCKS.DIRT]           = 0.5;
  H[BLOCKS.STONE]          = 7.5;
  H[BLOCKS.COBBLESTONE]    = 10;
  H[BLOCKS.SAND]           = 0.75;
  H[BLOCKS.GRAVEL]         = 0.9;
  H[BLOCKS.WATER]          = -1; // unbreakable
  H[BLOCKS.LAVA]           = -1;
  H[BLOCKS.BEDROCK]        = -1;
  H[BLOCKS.WOOD_LOG]       = 3;
  H[BLOCKS.BIRCH_LOG]      = 3;
  H[BLOCKS.PINE_LOG]       = 3;
  H[BLOCKS.LEAVES]         = 0.2;
  H[BLOCKS.LEAVES_BIRCH]   = 0.2;
  H[BLOCKS.LEAVES_PINE]    = 0.2;
  H[BLOCKS.PLANKS_OAK]     = 3;
  H[BLOCKS.PLANKS_BIRCH]   = 3;
  H[BLOCKS.PLANKS_PINE]    = 3;
  H[BLOCKS.GLASS]          = 0.3;
  H[BLOCKS.BRICK]          = 10;
  H[BLOCKS.SANDSTONE]      = 4;
  H[BLOCKS.SNOW]           = 0.2;
  H[BLOCKS.ICE]            = 0.5;
  H[BLOCKS.OBSIDIAN]       = 250;
  H[BLOCKS.COAL_ORE]       = 15;
  H[BLOCKS.IRON_ORE]       = 15;
  H[BLOCKS.GOLD_ORE]       = 15;
  H[BLOCKS.DIAMOND_ORE]    = 15;
  H[BLOCKS.EMERALD_ORE]    = 15;
  H[BLOCKS.CLAY]           = 0.9;
  H[BLOCKS.MYCELIUM]       = 0.6;
  H[BLOCKS.PODZOL]         = 0.5;
  H[BLOCKS.RED_SAND]       = 0.75;
  H[BLOCKS.TERRACOTTA]     = 4.2;
  H[BLOCKS.GLOWSTONE]      = 0.3;
  H[BLOCKS.NETHERRACK]     = 0.4;
  H[BLOCKS.CRAFTING_TABLE] = 2.5;
  H[BLOCKS.FURNACE]        = 3.5;
  H[BLOCKS.FARMLAND]       = 0.6;
  H[BLOCKS.WHEAT]          = 0.0;
  H[BLOCKS.BOOKSHELF]      = 2.5;
  H[BLOCKS.STONE_BRICK]    = 10;
  H[BLOCKS.MOSSY_COBBLE]   = 10;
  H[BLOCKS.CACTUS]         = 0.4;
  H[BLOCKS.SOUL_SAND]      = 0.5;
  H[BLOCKS.WOOL_WHITE]     = 0.8;
  H[BLOCKS.WOOL_RED]       = 0.8;
  H[BLOCKS.WOOL_GREEN]     = 0.8;
  H[BLOCKS.WOOL_BLUE]      = 0.8;
  H[BLOCKS.WOOL_YELLOW]    = 0.8;
  H[BLOCKS.WOOL_ORANGE]    = 0.8;
  H[BLOCKS.WOOL_PURPLE]    = 0.8;
  H[BLOCKS.WOOL_BLACK]     = 0.8;
  H[BLOCKS.WOOL_CYAN]      = 0.8;
  H[BLOCKS.WOOL_PINK]      = 0.8;
  H[BLOCKS.FLOWER_ROSE]    = 0.0;
  H[BLOCKS.FLOWER_YELLOW]  = 0.0;
  H[BLOCKS.MUSHROOM]       = 0.0;
  H[BLOCKS.TALL_GRASS]     = 0.0;
}

// Used by Chunk.js face-culling: only render a face when the NEIGHBOUR is transparent
export const BLOCK_IS_TRANSPARENT = new Uint8Array(BLOCK_COUNT + 1);
{
  const T = BLOCK_IS_TRANSPARENT;
  T[BLOCKS.AIR]           = 1;
  T[BLOCKS.WATER]         = 1;
  T[BLOCKS.GLASS]         = 1;
  T[BLOCKS.ICE]           = 1;
  // Sprite-like blocks still need neighbours to render faces toward them
  T[BLOCKS.FLOWER_ROSE]   = 1;
  T[BLOCKS.FLOWER_YELLOW] = 1;
  T[BLOCKS.MUSHROOM]      = 1;
  T[BLOCKS.TALL_GRASS]    = 1;
  T[BLOCKS.WHEAT]         = 1;
  // Leaves are passable so neighbour faces must render through them
  T[BLOCKS.LEAVES]        = 1;
  T[BLOCKS.LEAVES_BIRCH]  = 1;
  T[BLOCKS.LEAVES_PINE]   = 1;
}

// Used by Physics.js: player and entities can pass through these blocks
export const BLOCK_IS_PASSABLE = new Uint8Array(BLOCK_COUNT + 1);
{
  const P = BLOCK_IS_PASSABLE;
  P[BLOCKS.AIR]           = 1;
  P[BLOCKS.WATER]         = 1;
  P[BLOCKS.LEAVES]        = 1;
  P[BLOCKS.LEAVES_BIRCH]  = 1;
  P[BLOCKS.LEAVES_PINE]   = 1;
  P[BLOCKS.FLOWER_ROSE]   = 1;
  P[BLOCKS.FLOWER_YELLOW] = 1;
  P[BLOCKS.MUSHROOM]      = 1;
  P[BLOCKS.TALL_GRASS]    = 1;
  P[BLOCKS.WHEAT]         = 1;
}

export const BLOCK_EMITS_LIGHT = new Uint8Array(BLOCK_COUNT + 1);
{
  BLOCK_EMITS_LIGHT[BLOCKS.GLOWSTONE] = 15;
  BLOCK_EMITS_LIGHT[BLOCKS.LAVA]      = 15;
}

// Map block ID + face to texture name
// Faces: top, bottom, north, south, east, west  (we use top/side/bottom for simplicity)
export function getBlockTextures(blockId) {
  switch (blockId) {
    case BLOCKS.GRASS:          return { top: 'grass_top',   side: 'grass_side',    bottom: 'dirt' };
    case BLOCKS.DIRT:           return { top: 'dirt',        side: 'dirt',          bottom: 'dirt' };
    case BLOCKS.STONE:          return { top: 'stone',       side: 'stone',         bottom: 'stone' };
    case BLOCKS.COBBLESTONE:    return { top: 'cobblestone', side: 'cobblestone',   bottom: 'cobblestone' };
    case BLOCKS.SAND:           return { top: 'sand',        side: 'sand',          bottom: 'sand' };
    case BLOCKS.GRAVEL:         return { top: 'gravel',      side: 'gravel',        bottom: 'gravel' };
    case BLOCKS.WATER:          return { top: 'water',       side: 'water',         bottom: 'water' };
    case BLOCKS.LAVA:           return { top: 'lava',        side: 'lava',          bottom: 'lava' };
    case BLOCKS.BEDROCK:        return { top: 'bedrock',     side: 'bedrock',       bottom: 'bedrock' };
    case BLOCKS.WOOD_LOG:       return { top: 'wood_log_top',side: 'wood_log_side', bottom: 'wood_log_top' };
    case BLOCKS.BIRCH_LOG:      return { top: 'wood_log_top',side: 'birch_log_side',bottom: 'wood_log_top' };
    case BLOCKS.PINE_LOG:       return { top: 'wood_log_top',side: 'pine_log_side', bottom: 'wood_log_top' };
    case BLOCKS.LEAVES:         return { top: 'leaves',      side: 'leaves',        bottom: 'leaves' };
    case BLOCKS.LEAVES_BIRCH:   return { top: 'leaves_birch',side: 'leaves_birch',  bottom: 'leaves_birch' };
    case BLOCKS.LEAVES_PINE:    return { top: 'leaves_pine', side: 'leaves_pine',   bottom: 'leaves_pine' };
    case BLOCKS.PLANKS_OAK:     return { top: 'planks_oak',  side: 'planks_oak',    bottom: 'planks_oak' };
    case BLOCKS.PLANKS_BIRCH:   return { top: 'planks_birch',side: 'planks_birch',  bottom: 'planks_birch' };
    case BLOCKS.PLANKS_PINE:    return { top: 'planks_pine', side: 'planks_pine',   bottom: 'planks_pine' };
    case BLOCKS.GLASS:          return { top: 'glass',       side: 'glass',         bottom: 'glass' };
    case BLOCKS.BRICK:          return { top: 'brick',       side: 'brick',         bottom: 'brick' };
    case BLOCKS.SANDSTONE:      return { top: 'sandstone',   side: 'sandstone',     bottom: 'sandstone' };
    case BLOCKS.SNOW:           return { top: 'snow',        side: 'snow',          bottom: 'snow' };
    case BLOCKS.ICE:            return { top: 'ice',         side: 'ice',           bottom: 'ice' };
    case BLOCKS.OBSIDIAN:       return { top: 'obsidian',    side: 'obsidian',      bottom: 'obsidian' };
    case BLOCKS.COAL_ORE:       return { top: 'coal_ore',    side: 'coal_ore',      bottom: 'coal_ore' };
    case BLOCKS.IRON_ORE:       return { top: 'iron_ore',    side: 'iron_ore',      bottom: 'iron_ore' };
    case BLOCKS.GOLD_ORE:       return { top: 'gold_ore',    side: 'gold_ore',      bottom: 'gold_ore' };
    case BLOCKS.DIAMOND_ORE:    return { top: 'diamond_ore', side: 'diamond_ore',   bottom: 'diamond_ore' };
    case BLOCKS.EMERALD_ORE:    return { top: 'emerald_ore', side: 'emerald_ore',   bottom: 'emerald_ore' };
    case BLOCKS.CLAY:           return { top: 'clay',        side: 'clay',          bottom: 'clay' };
    case BLOCKS.MYCELIUM:       return { top: 'mycelium',    side: 'mycelium',      bottom: 'dirt' };
    case BLOCKS.PODZOL:         return { top: 'podzol_top',  side: 'dirt',          bottom: 'dirt' };
    case BLOCKS.RED_SAND:       return { top: 'red_sand',    side: 'red_sand',      bottom: 'red_sand' };
    case BLOCKS.TERRACOTTA:     return { top: 'terracotta',  side: 'terracotta',    bottom: 'terracotta' };
    case BLOCKS.GLOWSTONE:      return { top: 'glowstone',   side: 'glowstone',     bottom: 'glowstone' };
    case BLOCKS.NETHERRACK:     return { top: 'netherrack',  side: 'netherrack',    bottom: 'netherrack' };
    case BLOCKS.CRAFTING_TABLE: return { top: 'crafting_table_top', side: 'planks_oak', bottom: 'planks_oak' };
    case BLOCKS.FURNACE:        return { top: 'stone',       side: 'furnace_front', bottom: 'stone' };
    case BLOCKS.FARMLAND:       return { top: 'farmland',    side: 'dirt',          bottom: 'dirt' };
    case BLOCKS.WHEAT:          return { top: 'wheat_top',   side: 'wheat_top',     bottom: 'wheat_top' };
    case BLOCKS.BOOKSHELF:      return { top: 'planks_oak',  side: 'bookshelf',     bottom: 'planks_oak' };
    case BLOCKS.STONE_BRICK:    return { top: 'stone_brick', side: 'stone_brick',   bottom: 'stone_brick' };
    case BLOCKS.MOSSY_COBBLE:   return { top: 'mossy_cobble',side: 'mossy_cobble',  bottom: 'mossy_cobble' };
    case BLOCKS.CACTUS:         return { top: 'cactus_top',  side: 'cactus_side',   bottom: 'cactus_top' };
    case BLOCKS.SOUL_SAND:      return { top: 'soul_sand',   side: 'soul_sand',     bottom: 'soul_sand' };
    case BLOCKS.WOOL_WHITE:     return { top: 'wool_white',  side: 'wool_white',    bottom: 'wool_white' };
    case BLOCKS.WOOL_RED:       return { top: 'wool_red',    side: 'wool_red',      bottom: 'wool_red' };
    case BLOCKS.WOOL_GREEN:     return { top: 'wool_green',  side: 'wool_green',    bottom: 'wool_green' };
    case BLOCKS.WOOL_BLUE:      return { top: 'wool_blue',   side: 'wool_blue',     bottom: 'wool_blue' };
    case BLOCKS.WOOL_YELLOW:    return { top: 'wool_yellow', side: 'wool_yellow',   bottom: 'wool_yellow' };
    case BLOCKS.WOOL_ORANGE:    return { top: 'wool_orange', side: 'wool_orange',   bottom: 'wool_orange' };
    case BLOCKS.WOOL_PURPLE:    return { top: 'wool_purple', side: 'wool_purple',   bottom: 'wool_purple' };
    case BLOCKS.WOOL_BLACK:     return { top: 'wool_black',  side: 'wool_black',    bottom: 'wool_black' };
    case BLOCKS.WOOL_CYAN:      return { top: 'wool_cyan',   side: 'wool_cyan',     bottom: 'wool_cyan' };
    case BLOCKS.WOOL_PINK:      return { top: 'wool_pink',   side: 'wool_pink',     bottom: 'wool_pink' };
    case BLOCKS.FLOWER_ROSE:    return { top: 'flower_rose', side: 'flower_rose',   bottom: 'flower_rose' };
    case BLOCKS.FLOWER_YELLOW:  return { top: 'flower_yellow',side:'flower_yellow', bottom: 'flower_yellow' };
    case BLOCKS.MUSHROOM:       return { top: 'mushroom_red',side: 'mushroom_red',  bottom: 'mushroom_red' };
    case BLOCKS.TALL_GRASS:     return { top: 'tall_grass',  side: 'tall_grass',    bottom: 'tall_grass' };
    default:                    return { top: 'stone',       side: 'stone',         bottom: 'stone' };
  }
}
