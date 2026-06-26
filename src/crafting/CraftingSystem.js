import { BLOCKS, ITEMS } from '../world/BlockRegistry.js';
import { makeItem } from '../inventory/Inventory.js';

// Plank IDs
const PLANKS = [BLOCKS.PLANKS_OAK, BLOCKS.PLANKS_BIRCH, BLOCKS.PLANKS_PINE];
function isPlank(id) { return PLANKS.includes(id); }

// Tool material mapping: id -> tier name
const MAT = {
  [BLOCKS.PLANKS_OAK]:   'wood',
  [BLOCKS.PLANKS_BIRCH]: 'wood',
  [BLOCKS.PLANKS_PINE]:  'wood',
  [BLOCKS.COBBLESTONE]:  'stone',
  [BLOCKS.MOSSY_COBBLE]: 'stone',
  [ITEMS.IRON_INGOT]:    'iron',
  [ITEMS.GOLD_INGOT]:    'gold',
  [ITEMS.DIAMOND]:       'diamond',
};
function isMat(id) { return id in MAT; }

const LOG_TO_PLANK = {
  [BLOCKS.WOOD_LOG]:  BLOCKS.PLANKS_OAK,
  [BLOCKS.BIRCH_LOG]: BLOCKS.PLANKS_BIRCH,
  [BLOCKS.PINE_LOG]:  BLOCKS.PLANKS_PINE,
};
const PLANK_NAMES = {
  [BLOCKS.PLANKS_OAK]:   'Oak Planks',
  [BLOCKS.PLANKS_BIRCH]: 'Birch Planks',
  [BLOCKS.PLANKS_PINE]:  'Pine Planks',
};
const LOGS = [BLOCKS.WOOD_LOG, BLOCKS.BIRCH_LOG, BLOCKS.PINE_LOG];

// Build recipe book entries for display
export const RECIPE_BOOK = [
  { label: 'Oak Planks',     grid2x2: [BLOCKS.WOOD_LOG,    0, 0, 0], result: { id: BLOCKS.PLANKS_OAK,     count: 4 } },
  { label: 'Crafting Table', grid2x2: [BLOCKS.PLANKS_OAK, BLOCKS.PLANKS_OAK, BLOCKS.PLANKS_OAK, BLOCKS.PLANKS_OAK], result: { id: BLOCKS.CRAFTING_TABLE, count: 1 } },
  { label: 'Sticks',         grid2x2: [BLOCKS.PLANKS_OAK,  0, BLOCKS.PLANKS_OAK, 0], result: { id: ITEMS.STICK, count: 4 } },
  { label: 'Furnace',        grid2x2: [BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE, BLOCKS.COBBLESTONE], result: { id: BLOCKS.FURNACE, count: 1 } },
  { label: 'Stone Bricks',   grid2x2: [BLOCKS.STONE, BLOCKS.STONE, BLOCKS.STONE, BLOCKS.STONE], result: { id: BLOCKS.STONE_BRICK, count: 4 } },
  { label: 'Sandstone',      grid2x2: [BLOCKS.SAND, BLOCKS.SAND, BLOCKS.SAND, BLOCKS.SAND], result: { id: BLOCKS.SANDSTONE, count: 4 } },
];

export class CraftingSystem {
  constructor(is3x3 = false) {
    this.is3x3 = is3x3;
    this.size  = is3x3 ? 9 : 4;
    this.grid  = new Array(this.size).fill(null);
  }

  setSlot(i, item) { this.grid[i] = item ? { ...item } : null; }
  getGrid()        { return [...this.grid]; }

  getResult() {
    if (this.is3x3) return this._getResult3x3();
    return this._getResult2x2();
  }

  _getResult2x2() {
    const ids = this.grid.map(s => s?.id ?? 0);

    // Single log → planks
    const filled = ids.filter(id => id !== 0);
    if (filled.length === 1 && LOGS.includes(filled[0])) {
      const log = filled[0];
      return { id: LOG_TO_PLANK[log], count: 4, name: PLANK_NAMES[LOG_TO_PLANK[log]], type: 'block' };
    }

    // 2 planks in a column → 4 sticks
    // Left column: [0],[2] planks, [1],[3] empty
    if (isPlank(ids[0]) && ids[1] === 0 && isPlank(ids[2]) && ids[3] === 0) {
      return { id: ITEMS.STICK, count: 4, name: 'Stick', type: 'item' };
    }
    // Right column: [1],[3] planks, [0],[2] empty
    if (ids[0] === 0 && isPlank(ids[1]) && ids[2] === 0 && isPlank(ids[3])) {
      return { id: ITEMS.STICK, count: 4, name: 'Stick', type: 'item' };
    }

    // 4 planks → crafting table
    if (ids.every(id => isPlank(id))) {
      return { id: BLOCKS.CRAFTING_TABLE, count: 1, name: 'Crafting Table', type: 'block' };
    }

    // 4 cobblestone → furnace
    if (ids.every(id => id === BLOCKS.COBBLESTONE)) {
      return { id: BLOCKS.FURNACE, count: 1, name: 'Furnace', type: 'block' };
    }

    // 4 stone → stone bricks
    if (ids.every(id => id === BLOCKS.STONE)) {
      return { id: BLOCKS.STONE_BRICK, count: 4, name: 'Stone Bricks', type: 'block' };
    }

    // 4 sand → sandstone
    if (ids.every(id => id === BLOCKS.SAND)) {
      return { id: BLOCKS.SANDSTONE, count: 4, name: 'Sandstone', type: 'block' };
    }

    // 4 gravel → cobblestone
    if (ids.every(id => id === BLOCKS.GRAVEL)) {
      return { id: BLOCKS.COBBLESTONE, count: 4, name: 'Cobblestone', type: 'block' };
    }

    // 4 clay → bricks
    if (ids.every(id => id === BLOCKS.CLAY)) {
      return { id: BLOCKS.BRICK, count: 2, name: 'Brick', type: 'block' };
    }

    // 2 sand in a row → glass
    if (ids[0] === BLOCKS.SAND && ids[1] === BLOCKS.SAND && ids[2] === 0 && ids[3] === 0) {
      return { id: BLOCKS.GLASS, count: 2, name: 'Glass', type: 'block' };
    }
    if (ids[0] === 0 && ids[1] === 0 && ids[2] === BLOCKS.SAND && ids[3] === BLOCKS.SAND) {
      return { id: BLOCKS.GLASS, count: 2, name: 'Glass', type: 'block' };
    }

    // 4 oak planks → bookshelf
    if (ids.every(id => id === BLOCKS.PLANKS_OAK)) {
      return { id: BLOCKS.BOOKSHELF, count: 1, name: 'Bookshelf', type: 'block' };
    }

    return null;
  }

  _getResult3x3() {
    const ids = this.grid.map(s => s?.id ?? 0);

    // Determine the primary material (non-stick, non-empty cells all same)
    const nonEmpty = ids.filter(id => id !== 0 && id !== ITEMS.STICK);
    const matId    = nonEmpty.length > 0 ? nonEmpty[0] : null;
    const tier     = matId !== null ? MAT[matId] : null;
    // All material cells must be the same id for tool recipes
    const allSameMat = nonEmpty.every(id => id === matId);

    if (tier && allSameMat) {
      // Pickaxe: [0,1,2]=mat, [3]=0, [4]=stick, [5]=0, [6]=0, [7]=stick, [8]=0
      if (isMat(ids[0]) && ids[0] === matId && isMat(ids[1]) && ids[1] === matId && isMat(ids[2]) && ids[2] === matId
          && ids[3] === 0 && ids[4] === ITEMS.STICK && ids[5] === 0
          && ids[6] === 0 && ids[7] === ITEMS.STICK && ids[8] === 0) {
        return makeItem('pickaxe', tier);
      }

      // Shovel: [1]=mat, [4]=stick, [7]=stick, rest 0
      if (ids[0] === 0 && isMat(ids[1]) && ids[1] === matId && ids[2] === 0
          && ids[3] === 0 && ids[4] === ITEMS.STICK && ids[5] === 0
          && ids[6] === 0 && ids[7] === ITEMS.STICK && ids[8] === 0) {
        return makeItem('shovel', tier);
      }

      // Sword: [1]=mat, [4]=mat, [7]=stick, rest 0
      if (ids[0] === 0 && isMat(ids[1]) && ids[1] === matId && ids[2] === 0
          && ids[3] === 0 && isMat(ids[4]) && ids[4] === matId && ids[5] === 0
          && ids[6] === 0 && ids[7] === ITEMS.STICK && ids[8] === 0) {
        return makeItem('sword', tier);
      }

      // Axe left: [0]=mat, [1]=mat, [3]=mat, [4]=stick, [7]=stick, rest 0
      if (isMat(ids[0]) && ids[0] === matId && isMat(ids[1]) && ids[1] === matId && ids[2] === 0
          && isMat(ids[3]) && ids[3] === matId && ids[4] === ITEMS.STICK && ids[5] === 0
          && ids[6] === 0 && ids[7] === ITEMS.STICK && ids[8] === 0) {
        return makeItem('axe', tier);
      }

      // Axe right: [1]=mat, [2]=mat, [5]=mat, [4]=stick, [7]=stick, rest 0
      if (ids[0] === 0 && isMat(ids[1]) && ids[1] === matId && isMat(ids[2]) && ids[2] === matId
          && ids[3] === 0 && ids[4] === ITEMS.STICK && isMat(ids[5]) && ids[5] === matId
          && ids[6] === 0 && ids[7] === ITEMS.STICK && ids[8] === 0) {
        return makeItem('axe', tier);
      }

      // Hoe left: [0]=mat, [1]=mat, [4]=stick, [7]=stick, rest 0
      if (isMat(ids[0]) && ids[0] === matId && isMat(ids[1]) && ids[1] === matId && ids[2] === 0
          && ids[3] === 0 && ids[4] === ITEMS.STICK && ids[5] === 0
          && ids[6] === 0 && ids[7] === ITEMS.STICK && ids[8] === 0) {
        return makeItem('hoe', tier);
      }

      // Hoe right: [1]=mat, [2]=mat, [4]=stick, [7]=stick, rest 0
      if (ids[0] === 0 && isMat(ids[1]) && ids[1] === matId && isMat(ids[2]) && ids[2] === matId
          && ids[3] === 0 && ids[4] === ITEMS.STICK && ids[5] === 0
          && ids[6] === 0 && ids[7] === ITEMS.STICK && ids[8] === 0) {
        return makeItem('hoe', tier);
      }
    }

    // Furnace: 8 cobblestone ring, center empty
    if ([0,1,2,3,5,6,7,8].every(i => ids[i] === BLOCKS.COBBLESTONE) && ids[4] === 0) {
      return { id: BLOCKS.FURNACE, count: 1, name: 'Furnace', type: 'block' };
    }

    // Chest: 8 planks ring, center empty
    if ([0,1,2,3,5,6,7,8].every(i => isPlank(ids[i])) && ids[4] === 0) {
      return { id: BLOCKS.CRAFTING_TABLE, count: 1, name: 'Chest', type: 'block' };
    }

    // Bread: 3 wheat/seeds in any horizontal row, rest empty
    const breadIngredient = id => id === ITEMS.SEEDS || id === BLOCKS.WHEAT;
    const checkBreadRow = (a, b, c, restIds) =>
      breadIngredient(a) && breadIngredient(b) && breadIngredient(c) && restIds.every(id => id === 0);
    if (checkBreadRow(ids[0], ids[1], ids[2], [ids[3],ids[4],ids[5],ids[6],ids[7],ids[8]])) {
      return { id: ITEMS.BREAD, count: 1, name: 'Bread', type: 'item' };
    }
    if (checkBreadRow(ids[3], ids[4], ids[5], [ids[0],ids[1],ids[2],ids[6],ids[7],ids[8]])) {
      return { id: ITEMS.BREAD, count: 1, name: 'Bread', type: 'item' };
    }
    if (checkBreadRow(ids[6], ids[7], ids[8], [ids[0],ids[1],ids[2],ids[3],ids[4],ids[5]])) {
      return { id: ITEMS.BREAD, count: 1, name: 'Bread', type: 'item' };
    }

    // Stone bricks ring (8 stone, center empty)
    if ([0,1,2,3,5,6,7,8].every(i => ids[i] === BLOCKS.STONE) && ids[4] === 0) {
      return { id: BLOCKS.STONE_BRICK, count: 8, name: 'Stone Bricks', type: 'block' };
    }

    // Log → planks (any single log anywhere in 3x3)
    const filled3 = ids.filter(id => id !== 0);
    if (filled3.length === 1 && LOGS.includes(filled3[0])) {
      const log = filled3[0];
      return { id: LOG_TO_PLANK[log], count: 4, name: PLANK_NAMES[LOG_TO_PLANK[log]], type: 'block' };
    }

    // 2 planks in any vertical pair in 3x3 → sticks
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 2; row++) {
        const idxA = row * 3 + col;
        const idxB = (row + 1) * 3 + col;
        if (isPlank(ids[idxA]) && isPlank(ids[idxB])) {
          const rest = ids.filter((_, i) => i !== idxA && i !== idxB);
          if (rest.every(x => x === 0)) {
            return { id: ITEMS.STICK, count: 4, name: 'Stick', type: 'item' };
          }
        }
      }
    }

    // Fall through: try 2x2 recipes using top-left 2x2 if bottom row/right col is all empty
    if (ids[2] === 0 && ids[5] === 0 && ids[6] === 0 && ids[7] === 0 && ids[8] === 0) {
      const savedGrid = this.grid;
      const savedIs3x3 = this.is3x3;
      this.grid = [this.grid[0], this.grid[1], this.grid[3], this.grid[4]];
      this.is3x3 = false;
      const r = this._getResult2x2();
      this.grid = savedGrid;
      this.is3x3 = savedIs3x3;
      if (r) return r;
    }

    return null;
  }

  consume() {
    const result = this.getResult();
    if (!result) return null;
    for (let i = 0; i < this.size; i++) {
      if (this.grid[i]) {
        this.grid[i].count--;
        if (this.grid[i].count <= 0) this.grid[i] = null;
      }
    }
    return result;
  }
}
