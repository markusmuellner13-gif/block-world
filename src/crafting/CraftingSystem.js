import { BLOCKS } from '../world/BlockRegistry.js';

// Grid indices for a 2×2 crafting table: [0]=TL [1]=TR [2]=BL [3]=BR
//
// Recipe types:
//   any1  – exactly 1 ingredient anywhere, rest empty
//   fill4 – all 4 slots match ingredient
//   row2  – 2 matching slots in the same row (TL+TR or BL+BR), rest empty
//   col2  – 2 matching slots in the same column (TL+BL or TR+BR), rest empty

const PLANKS = [BLOCKS.PLANKS_OAK, BLOCKS.PLANKS_BIRCH, BLOCKS.PLANKS_PINE];

const RECIPES = [
  // Logs → planks
  { type:'any1',  ingredient: BLOCKS.WOOD_LOG,  output:{ id: BLOCKS.PLANKS_OAK,      count: 4, name: 'Oak Planks'    } },
  { type:'any1',  ingredient: BLOCKS.BIRCH_LOG, output:{ id: BLOCKS.PLANKS_BIRCH,    count: 4, name: 'Birch Planks'  } },
  { type:'any1',  ingredient: BLOCKS.PINE_LOG,  output:{ id: BLOCKS.PLANKS_PINE,     count: 4, name: 'Pine Planks'   } },
  // 4 planks (any mix) → crafting table
  { type:'fill4', ingredient: PLANKS,            output:{ id: BLOCKS.CRAFTING_TABLE,  count: 1, name: 'Crafting Table' } },
  // Stone variants
  { type:'fill4', ingredient: BLOCKS.STONE,      output:{ id: BLOCKS.STONE_BRICK,    count: 4, name: 'Stone Bricks'  } },
  { type:'fill4', ingredient: BLOCKS.COBBLESTONE,output:{ id: BLOCKS.FURNACE,        count: 1, name: 'Furnace'        } },
  // Sand → glass / sandstone
  { type:'fill4', ingredient: BLOCKS.SAND,       output:{ id: BLOCKS.SANDSTONE,      count: 4, name: 'Sandstone'     } },
  { type:'row2',  ingredient: BLOCKS.SAND,       output:{ id: BLOCKS.GLASS,          count: 2, name: 'Glass'         } },
  // Gravel → cobblestone (compressed)
  { type:'fill4', ingredient: BLOCKS.GRAVEL,     output:{ id: BLOCKS.COBBLESTONE,    count: 4, name: 'Cobblestone'   } },
  // Clay → brick block
  { type:'fill4', ingredient: BLOCKS.CLAY,       output:{ id: BLOCKS.BRICK,          count: 2, name: 'Brick'         } },
  // Snow (2 in a row) → ice
  { type:'fill4', ingredient: BLOCKS.SNOW,       output:{ id: BLOCKS.ICE,            count: 2, name: 'Ice'           } },
  // Planks (col of 2, any type) → more planks cross-recipe (oak output as default)
  // Mossy cobblestone: cobble + leaves in same row
  { type:'row2',  ingredient: BLOCKS.MOSSY_COBBLE, output:{ id: BLOCKS.STONE_BRICK,  count: 2, name: 'Stone Bricks'  } },
  // Wool fill → colour-matched already; extra: bookshelf from planks col
  { type:'fill4', ingredient: BLOCKS.PLANKS_OAK, output:{ id: BLOCKS.BOOKSHELF,      count: 1, name: 'Bookshelf'     } },
];

export const RECIPE_BOOK = RECIPES.map(r => {
  const ingr  = Array.isArray(r.ingredient) ? r.ingredient[0] : r.ingredient;
  const grid  = [0, 0, 0, 0];
  if      (r.type === 'any1')  { grid[0] = ingr; }
  else if (r.type === 'fill4') { grid.fill(ingr); }
  else if (r.type === 'row2')  { grid[0] = ingr; grid[1] = ingr; }
  else if (r.type === 'col2')  { grid[0] = ingr; grid[2] = ingr; }
  return { label: r.output.name, grid2x2: grid, result: r.output };
});

export class CraftingSystem {
  constructor() {
    this.grid = [null, null, null, null]; // [TL, TR, BL, BR]
  }

  setSlot(i, item) { this.grid[i] = item ? { ...item } : null; }
  getGrid()        { return [...this.grid]; }

  getResult() {
    const ids = this.grid.map(s => s?.id ?? 0);
    for (const r of RECIPES) {
      if (this._matches(ids, r)) return { ...r.output, type: 'block' };
    }
    return null;
  }

  _matches(ids, recipe) {
    const ingr    = recipe.ingredient;
    const isMatch = id => id !== 0 && (Array.isArray(ingr) ? ingr.includes(id) : id === ingr);

    switch (recipe.type) {
      case 'any1': {
        const filled = ids.filter(id => id !== 0);
        return filled.length === 1 && isMatch(filled[0]);
      }
      case 'fill4':
        return ids.every(id => isMatch(id));

      case 'row2': {
        // top row: [0,1] match, [2,3] empty
        const topRow = ids[0] !== 0 && isMatch(ids[0]) && ids[0] === ids[1] && ids[2] === 0 && ids[3] === 0;
        // bottom row: [2,3] match, [0,1] empty
        const botRow = ids[2] !== 0 && isMatch(ids[2]) && ids[2] === ids[3] && ids[0] === 0 && ids[1] === 0;
        return topRow || botRow;
      }
      case 'col2': {
        // left col: [0,2] match, [1,3] empty
        const leftCol  = ids[0] !== 0 && isMatch(ids[0]) && ids[0] === ids[2] && ids[1] === 0 && ids[3] === 0;
        // right col: [1,3] match, [0,2] empty
        const rightCol = ids[1] !== 0 && isMatch(ids[1]) && ids[1] === ids[3] && ids[0] === 0 && ids[2] === 0;
        return leftCol || rightCol;
      }
      default:
        return false;
    }
  }

  // Consume one of each ingredient in the grid and return the crafted item
  consume() {
    const result = this.getResult();
    if (!result) return null;
    for (let i = 0; i < 4; i++) {
      if (this.grid[i]) {
        this.grid[i].count--;
        if (this.grid[i].count <= 0) this.grid[i] = null;
      }
    }
    return result;
  }
}
