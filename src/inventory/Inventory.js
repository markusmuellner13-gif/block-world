import { BLOCKS } from '../world/BlockRegistry.js';
import { TOOL_TYPES, TOOL_TIERS } from '../Constants.js';

const HOTBAR_SIZE = 9;
const INV_ROWS    = 3;
const INV_SIZE    = HOTBAR_SIZE + HOTBAR_SIZE * INV_ROWS;

export class Inventory {
  constructor() {
    this.slots = new Array(INV_SIZE).fill(null);
    this.selectedSlot = 0;

  }

  // Called from Player.applyMode when switching to creative
  giveCreativeKit() {
    this.slots[0] = makeItem('pickaxe', 'diamond');
    this.slots[1] = makeItem('axe',     'diamond');
    this.slots[2] = makeItem('shovel',  'diamond');
    this.slots[3] = makeItem('sword',   'diamond');
    this.slots[4] = { id: BLOCKS.PLANKS_OAK, name: 'Oak Planks', count: 64, type: 'block' };
    this.slots[5] = { id: BLOCKS.STONE,      name: 'Stone',       count: 64, type: 'block' };
    this.slots[6] = { id: BLOCKS.GLOWSTONE,  name: 'Glowstone',   count: 64, type: 'block' };
    this.slots[7] = { id: BLOCKS.WOOD_LOG,   name: 'Oak Log',     count: 64, type: 'block' };
    this.slots[8] = { id: BLOCKS.GRASS,      name: 'Grass Block', count: 64, type: 'block' };
  }

  getSelected() {
    return this.slots[this.selectedSlot] || null;
  }

  selectSlot(i) {
    this.selectedSlot = Math.max(0, Math.min(HOTBAR_SIZE - 1, i));
  }

  addItem(item) {
    // Try to stack
    for (let i = 0; i < INV_SIZE; i++) {
      if (this.slots[i] && this.slots[i].id === item.id && this.slots[i].count < 64) {
        this.slots[i].count = Math.min(64, this.slots[i].count + (item.count || 1));
        return true;
      }
    }
    // Find empty slot
    for (let i = 0; i < INV_SIZE; i++) {
      if (!this.slots[i]) {
        this.slots[i] = { ...item, count: item.count || 1 };
        return true;
      }
    }
    return false; // inventory full
  }

  consumeSelected() {
    const s = this.slots[this.selectedSlot];
    if (!s) return;
    s.count--;
    if (s.count <= 0) this.slots[this.selectedSlot] = null;
  }

  getHotbar() { return this.slots.slice(0, HOTBAR_SIZE); }
  getMain()   { return this.slots.slice(HOTBAR_SIZE); }
}

export function makeItem(toolType, tier = 'iron') {
  const t = TOOL_TIERS[tier.toUpperCase()] || TOOL_TIERS.IRON;
  const names = { pickaxe: 'Pickaxe', axe: 'Axe', shovel: 'Shovel', sword: 'Sword', hoe: 'Hoe' };
  return {
    id: null,
    name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} ${names[toolType]}`,
    type: toolType,
    tier,
    durability: t.durability,
    maxDurability: t.durability,
    miningSpeed: t.speed,
    count: 1,
  };
}
