import { BLOCKS } from '../world/BlockRegistry.js';

// Recipe types:
//  'any1'  – exactly 1 ingredient anywhere in 2x2, rest empty
//  'fill4' – all 4 slots same ingredient
//  'row2'  – 2 matching ingredients in same row (any row), rest empty
//  'col2'  – 2 matching ingredients in same column (any col), rest empty
const RECIPES = [
  // Logs → planks
  { type:'any1', ingredient:BLOCKS.WOOD_LOG,   output:{id:BLOCKS.PLANKS_OAK,   count:4, name:'Oak Planks'}   },
  { type:'any1', ingredient:BLOCKS.BIRCH_LOG,  output:{id:BLOCKS.PLANKS_BIRCH, count:4, name:'Birch Planks'} },
  { type:'any1', ingredient:BLOCKS.PINE_LOG,   output:{id:BLOCKS.PLANKS_PINE,  count:4, name:'Pine Planks'}  },
  // Crafting table – 4 of any planks
  { type:'fill4', ingredient:[BLOCKS.PLANKS_OAK,BLOCKS.PLANKS_BIRCH,BLOCKS.PLANKS_PINE],
    output:{id:BLOCKS.CRAFTING_TABLE, count:1, name:'Crafting Table'} },
  // Stone bricks
  { type:'fill4', ingredient:BLOCKS.STONE,     output:{id:BLOCKS.STONE_BRICK,  count:4, name:'Stone Bricks'} },
  // Sandstone
  { type:'fill4', ingredient:BLOCKS.SAND,      output:{id:BLOCKS.SANDSTONE,    count:2, name:'Sandstone'}    },
  // Wool + any dye wool (exact fill4 per colour already defined by wool colours in BLOCKS)
  { type:'fill4', ingredient:BLOCKS.GRAVEL,    output:{id:BLOCKS.COBBLESTONE,  count:4, name:'Cobblestone'}  },
  // Bookshelf – 2x planks row + bookshelf placeholder (simplified)
  { type:'fill4', ingredient:BLOCKS.CLAY,      output:{id:BLOCKS.BRICK,        count:2, name:'Brick'}        },
];

// Human-readable recipe list for the recipe book UI (includes visual-only 3×3 entries)
export const RECIPE_BOOK = [
  { label:'Oak Log → Oak Planks',    grid2x2:[BLOCKS.WOOD_LOG,0,0,0],         result:{id:BLOCKS.PLANKS_OAK,   count:4} },
  { label:'Birch Log → Birch Planks',grid2x2:[BLOCKS.BIRCH_LOG,0,0,0],        result:{id:BLOCKS.PLANKS_BIRCH, count:4} },
  { label:'Pine Log → Pine Planks',  grid2x2:[BLOCKS.PINE_LOG,0,0,0],         result:{id:BLOCKS.PLANKS_PINE,  count:4} },
  { label:'4 Oak Planks → Crafting Table',
    grid2x2:[BLOCKS.PLANKS_OAK,BLOCKS.PLANKS_OAK,BLOCKS.PLANKS_OAK,BLOCKS.PLANKS_OAK],
    result:{id:BLOCKS.CRAFTING_TABLE,count:1}
  },
  { label:'4 Stone → Stone Bricks',
    grid2x2:[BLOCKS.STONE,BLOCKS.STONE,BLOCKS.STONE,BLOCKS.STONE],
    result:{id:BLOCKS.STONE_BRICK,count:4}
  },
  { label:'4 Sand → Sandstone',
    grid2x2:[BLOCKS.SAND,BLOCKS.SAND,BLOCKS.SAND,BLOCKS.SAND],
    result:{id:BLOCKS.SANDSTONE,count:2}
  },
  { label:'4 Gravel → Cobblestone',
    grid2x2:[BLOCKS.GRAVEL,BLOCKS.GRAVEL,BLOCKS.GRAVEL,BLOCKS.GRAVEL],
    result:{id:BLOCKS.COBBLESTONE,count:4}
  },
  { label:'4 Clay → Bricks',
    grid2x2:[BLOCKS.CLAY,BLOCKS.CLAY,BLOCKS.CLAY,BLOCKS.CLAY],
    result:{id:BLOCKS.BRICK,count:2}
  },
];

export class CraftingSystem {
  constructor() {
    this.grid = [null, null, null, null]; // [tl, tr, bl, br]
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
    const ingr = recipe.ingredient;
    const isMatch = id => Array.isArray(ingr) ? ingr.includes(id) : id === ingr;

    if (recipe.type === 'any1') {
      const nonEmpty = ids.filter(id => id !== 0);
      return nonEmpty.length === 1 && isMatch(nonEmpty[0]);
    }

    if (recipe.type === 'fill4') {
      return ids.every(id => isMatch(id));
    }

    return false;
  }

  consume(inventory) {
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
