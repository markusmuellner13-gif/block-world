export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 256;
export const SEA_LEVEL = 62;
export const RENDER_DISTANCE = 6;        // chunks in each direction
export const ENTITY_RENDER_DISTANCE = 3; // chunks
export const BLOCK_SIZE = 1;             // 1 metre per block

export const PLAYER_HEIGHT = 1.8;
export const PLAYER_WIDTH = 0.6;
export const PLAYER_EYE_HEIGHT = 1.62;

export const GRAVITY = -28;             // m/s²  (matches Minecraft ~-32 effective)
export const JUMP_VELOCITY = 8.4;       // m/s
export const WALK_SPEED = 4.3;
export const SPRINT_SPEED = 5.6;
export const SNEAK_SPEED = 1.3;
export const FLY_SPEED = 10;

export const REACH_DISTANCE = 5.0;      // block interaction range (metres)

export const DAY_LENGTH = 1200;         // seconds per full day/night cycle

export const CAMERA_MODES = {
  FIRST_PERSON: 'first',
  THIRD_PERSON: 'third',
  FIFTH_PERSON: 'fifth',
};

export const TOOL_TYPES = {
  HAND:     'hand',
  PICKAXE:  'pickaxe',
  AXE:      'axe',
  SHOVEL:   'shovel',
  SWORD:    'sword',
  HOE:      'hoe',
};

export const TOOL_TIERS = {
  WOOD:     { speed: 2, durability: 59 },
  STONE:    { speed: 4, durability: 131 },
  IRON:     { speed: 6, durability: 250 },
  GOLD:     { speed: 12, durability: 32 },
  DIAMOND:  { speed: 8, durability: 1561 },
};
