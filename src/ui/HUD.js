import { BLOCKS, ITEMS, ITEM_NAMES } from '../world/BlockRegistry.js';
import { RECIPE_BOOK } from '../crafting/CraftingSystem.js';

// ── Colour lookup for hotbar slot backgrounds ──────────────────────────────
function blockColor(id) {
  if (!id) return '#888';
  const map = {
    [BLOCKS.GRASS]: '#5da62c', [BLOCKS.DIRT]: '#866043', [BLOCKS.STONE]: '#808080',
    [BLOCKS.SAND]: '#d4b860', [BLOCKS.GRAVEL]: '#888',
    [BLOCKS.WOOD_LOG]: '#9b7826', [BLOCKS.BIRCH_LOG]: '#ddd', [BLOCKS.PINE_LOG]: '#6b4a20',
    [BLOCKS.LEAVES]: '#4a9e20', [BLOCKS.LEAVES_BIRCH]: '#5db030', [BLOCKS.LEAVES_PINE]: '#1e6a14',
    [BLOCKS.PLANKS_OAK]: '#a07038', [BLOCKS.PLANKS_BIRCH]: '#cdb87a', [BLOCKS.PLANKS_PINE]: '#8b5a28',
    [BLOCKS.WATER]: '#3f76e4', [BLOCKS.LAVA]: '#ff4400', [BLOCKS.OBSIDIAN]: '#1a0a2e',
    [BLOCKS.COAL_ORE]: '#444', [BLOCKS.IRON_ORE]: '#d4967a', [BLOCKS.GOLD_ORE]: '#f0c820',
    [BLOCKS.DIAMOND_ORE]: '#50e8e0', [BLOCKS.EMERALD_ORE]: '#30d050',
    [BLOCKS.SNOW]: '#f0f4f8', [BLOCKS.ICE]: '#a0c8e8', [BLOCKS.GLASS]: '#a0c8e8',
    [BLOCKS.GLOWSTONE]: '#f8d040', [BLOCKS.NETHERRACK]: '#8b2020',
    [BLOCKS.WOOL_WHITE]: '#f0f0f0', [BLOCKS.WOOL_RED]: '#cc2222', [BLOCKS.WOOL_GREEN]: '#226622',
    [BLOCKS.WOOL_BLUE]: '#2244cc', [BLOCKS.WOOL_YELLOW]: '#eecc11', [BLOCKS.WOOL_ORANGE]: '#ee7711',
    [BLOCKS.WOOL_PURPLE]: '#882299', [BLOCKS.WOOL_BLACK]: '#222', [BLOCKS.WOOL_CYAN]: '#119999',
    [BLOCKS.WOOL_PINK]: '#ee88aa', [BLOCKS.CRAFTING_TABLE]: '#a07038', [BLOCKS.FURNACE]: '#808080',
    [BLOCKS.BRICK]: '#9e4a2a', [BLOCKS.STONE_BRICK]: '#888', [BLOCKS.SANDSTONE]: '#d4b860',
    [BLOCKS.CACTUS]: '#2a7a1a', [BLOCKS.SOUL_SAND]: '#4a3020',
    // Items
    [ITEMS?.COAL]: '#222', [ITEMS?.IRON_INGOT]: '#d4d4d4', [ITEMS?.GOLD_INGOT]: '#f0d020',
    [ITEMS?.DIAMOND]: '#40ddd8', [ITEMS?.EMERALD]: '#28c848', [ITEMS?.STICK]: '#9b6020',
    [ITEMS?.SEEDS]: '#c8a820', [ITEMS?.APPLE]: '#cc2222', [ITEMS?.BREAD]: '#c87830',
    [ITEMS?.RAW_BEEF]: '#c04040', [ITEMS?.COOKED_BEEF]: '#6b2a0a',
    [ITEMS?.RAW_CHICKEN]: '#e0a080', [ITEMS?.COOKED_CHICKEN]: '#c07838',
    [ITEMS?.ROTTEN_FLESH]: '#665544', [ITEMS?.BONE]: '#f0ead8',
    [ITEMS?.FEATHER]: '#f0f0f0',
  };
  return map[id] || '#777';
}

const css = (el, s) => (el.style.cssText = s);

export class HUD {
  constructor(root, player, game) {
    this.root   = root;
    this.player = player;
    this.game   = game;

    this._inventoryOpen = false;
    this._f3Open        = false;
    this._recipeOpen    = false;
    this._notifications = [];
    this._chatMessages  = [];
    this._fps           = 60;
    this._fpsTimer      = 0;
    this._fpsCount      = 0;

    this._build();
  }

  // ── Build all UI elements ────────────────────────────────────────────────
  _build() {
    this.root.innerHTML = '';
    this._buildCrosshair();
    this._buildHotbar();
    this._buildStatBars();
    this._buildBadges();
    this._buildF3();
    this._buildNotifications();
    this._buildChat();
    this._buildInventoryUI();
    this._buildRecipeBook();
    this._buildNPCDialog();
    this._buildHint();
  }

  _buildCrosshair() {
    const el = document.createElement('div');
    css(el, `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
             width:20px;height:20px;pointer-events:none;`);
    el.innerHTML = `<svg width="20" height="20">
      <line x1="10" y1="2" x2="10" y2="18" stroke="white" stroke-width="2" opacity="0.8"/>
      <line x1="2" y1="10" x2="18" y2="10" stroke="white" stroke-width="2" opacity="0.8"/>
    </svg>`;
    this.root.appendChild(el);
  }

  _buildHotbar() {
    // XP bar sits just above the hotbar
    const xpWrap = document.createElement('div');
    css(xpWrap, `position:absolute;bottom:82px;left:50%;transform:translateX(-50%);
                 width:486px;height:5px;background:#222;border-radius:3px;pointer-events:none;`);
    const xpFill = document.createElement('div');
    css(xpFill, `height:100%;width:0%;background:#7fff00;border-radius:3px;transition:width 0.3s;`);
    xpWrap.appendChild(xpFill);
    this._xpFill = xpFill;
    this.root.appendChild(xpWrap);

    // Health (left half) + food (right half) sit above the hotbar
    const bars = document.createElement('div');
    css(bars, `position:absolute;bottom:90px;left:50%;transform:translateX(-50%);
               display:flex;gap:16px;pointer-events:none;`);

    const healthEl = document.createElement('div');
    css(healthEl, `display:flex;gap:2px;`);
    this._healthEl = healthEl;

    const foodEl = document.createElement('div');
    css(foodEl, `display:flex;gap:2px;`);
    this._foodEl = foodEl;

    bars.appendChild(healthEl);
    bars.appendChild(foodEl);
    this.root.appendChild(bars);

    // Hotbar (54 px slots)
    const hotbar = document.createElement('div');
    css(hotbar, `position:absolute;bottom:16px;left:50%;transform:translateX(-50%);
                 display:flex;gap:4px;pointer-events:none;z-index:20;`);
    this._hotbarEl = hotbar;
    this.root.appendChild(hotbar);
  }

  _buildStatBars() { /* slots populated in update() */ }

  _buildBadges() {
    // Mode badge (top-centre)
    const badge = document.createElement('div');
    css(badge, `position:absolute;top:12px;left:50%;transform:translateX(-50%);
                background:rgba(80,40,160,0.85);color:#d0b0ff;font-size:12px;
                padding:4px 14px;border-radius:12px;pointer-events:none;
                display:none;letter-spacing:2px;border:1px solid #9a7aff;`);
    badge.textContent = 'CREATIVE';
    this._creativeBadge = badge;
    this.root.appendChild(badge);

    // Fly button (below badge, creative only)
    const flyBtn = document.createElement('button');
    css(flyBtn, `position:absolute;top:44px;left:50%;transform:translateX(-50%);
                 background:rgba(30,30,60,0.85);color:#a0c0ff;font-size:11px;
                 padding:3px 14px;border-radius:10px;border:1px solid #5566cc;
                 cursor:pointer;display:none;letter-spacing:1px;pointer-events:all;
                 font-family:'Courier New',monospace;`);
    flyBtn.addEventListener('click', () => this.game.player.toggleFly());
    this._flyBtn = flyBtn;
    this.root.appendChild(flyBtn);

    // Camera mode indicator (top-right)
    const camInd = document.createElement('div');
    css(camInd, `position:absolute;top:12px;right:16px;color:white;font-size:12px;
                 background:rgba(0,0,0,0.5);padding:4px 8px;border-radius:4px;pointer-events:none;`);
    this._camIndicator = camInd;
    this.root.appendChild(camInd);
  }

  _buildHint() {
    const hint = document.createElement('div');
    css(hint, `position:absolute;top:12px;left:16px;color:rgba(255,255,255,0.7);font-size:11px;
               background:rgba(0,0,0,0.4);padding:6px 10px;border-radius:4px;pointer-events:none;
               line-height:1.6;`);
    hint.innerHTML = `WASD Move &nbsp;|&nbsp; Space Jump &nbsp;|&nbsp; Shift Sneak &nbsp;|&nbsp; 2×W Sprint<br>
      F Camera &nbsp;|&nbsp; V/2×Space Fly(Creative) &nbsp;|&nbsp; E Inventory &nbsp;|&nbsp; Esc Pause<br>
      LMB Break &nbsp;|&nbsp; RMB Place &nbsp;|&nbsp; 1-9 Hotbar &nbsp;|&nbsp; F3 Debug`;
    this.root.appendChild(hint);
  }

  _buildF3() {
    const el = document.createElement('div');
    css(el, `position:absolute;top:0;left:0;padding:10px 14px;
             background:rgba(0,0,0,0.55);color:#0f0;font-size:12px;
             font-family:'Courier New',monospace;line-height:1.7;
             pointer-events:none;display:none;z-index:50;border-radius:0 0 6px 0;`);
    this._f3El = el;
    this.root.appendChild(el);
  }

  toggleF3() {
    this._f3Open = !this._f3Open;
    this._f3El.style.display = this._f3Open ? 'block' : 'none';
  }

  _buildNotifications() {
    const el = document.createElement('div');
    css(el, `position:absolute;top:60px;left:50%;transform:translateX(-50%);
             display:flex;flex-direction:column;align-items:center;gap:4px;
             pointer-events:none;z-index:25;`);
    this._notifArea = el;
    this.root.appendChild(el);
  }

  _buildChat() {
    const el = document.createElement('div');
    css(el, `position:absolute;bottom:120px;left:12px;
             display:flex;flex-direction:column;gap:2px;
             pointer-events:none;z-index:25;max-width:320px;`);
    this._chatLog = el;
    this.root.appendChild(el);
  }

  // ── Inventory UI ─────────────────────────────────────────────────────────
  _buildInventoryUI() {
    const inv = document.createElement('div');
    css(inv, `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
              background:rgba(25,25,25,0.97);border:2px solid #555;border-radius:10px;
              padding:20px;display:none;pointer-events:all;z-index:30;min-width:440px;
              font-family:'Courier New',monospace;`);

    inv.innerHTML = `
      <div style="color:#fff;font-size:16px;margin-bottom:14px;text-align:center;letter-spacing:2px;">INVENTORY</div>
      <div id="inv-main" style="display:grid;grid-template-columns:repeat(9,44px);gap:4px;margin-bottom:12px;"></div>
      <hr style="border-color:#444;margin:10px 0;">
      <div id="inv-hotbar-grid" style="display:grid;grid-template-columns:repeat(9,44px);gap:4px;"></div>
      <div style="margin-top:14px;display:flex;gap:8px;justify-content:center;">
        <button id="inv-recipe-btn" style="background:#333;color:#9cf;border:1px solid #559;
          padding:5px 14px;border-radius:6px;cursor:pointer;font-size:12px;">
          Recipe Book
        </button>
        <button id="inv-close-btn" style="background:#333;color:#f88;border:1px solid #855;
          padding:5px 14px;border-radius:6px;cursor:pointer;font-size:12px;">
          Close [E]
        </button>
      </div>
    `;
    this._inventoryUI = inv;
    this.root.appendChild(inv);

    // Wire buttons after DOM is set
    setTimeout(() => {
      inv.querySelector('#inv-close-btn')?.addEventListener('click', () => this.closeInventory());
      inv.querySelector('#inv-recipe-btn')?.addEventListener('click', () => this._toggleRecipeBook());
    }, 0);
  }

  // ── Recipe Book ───────────────────────────────────────────────────────────
  _buildRecipeBook() {
    const panel = document.createElement('div');
    css(panel, `position:absolute;top:50%;left:calc(50% + 240px);transform:translateY(-50%);
                background:rgba(20,20,30,0.97);border:2px solid #446;border-radius:10px;
                padding:16px;width:240px;max-height:400px;overflow-y:auto;
                display:none;pointer-events:all;z-index:31;
                font-family:'Courier New',monospace;`);
    panel.innerHTML = `<div style="color:#9cf;font-size:13px;margin-bottom:10px;text-align:center;">RECIPES</div>`;
    RECIPE_BOOK.forEach(r => {
      const row = document.createElement('div');
      css(row, `display:flex;align-items:center;gap:8px;margin-bottom:8px;
                border-bottom:1px solid #333;padding-bottom:6px;`);

      // Mini 2×2 grid
      const grid = document.createElement('div');
      css(grid, `display:grid;grid-template-columns:repeat(2,18px);gap:2px;flex-shrink:0;`);
      r.grid2x2.forEach(id => {
        const cell = document.createElement('div');
        css(cell, `width:18px;height:18px;background:${id ? blockColor(id) : '#111'};
                   border:1px solid #444;border-radius:2px;`);
        grid.appendChild(cell);
      });

      // Arrow + result
      const arrow = document.createElement('div');
      css(arrow, `color:#888;font-size:11px;`);
      arrow.textContent = '→';

      const result = document.createElement('div');
      css(result, `width:22px;height:22px;background:${blockColor(r.result.id)};
                   border:1px solid #555;border-radius:3px;flex-shrink:0;`);

      const lbl = document.createElement('div');
      css(lbl, `font-size:10px;color:#aaa;flex:1;`);
      lbl.textContent = `${r.label}\n×${r.result.count}`;
      lbl.style.whiteSpace = 'pre';

      row.appendChild(grid);
      row.appendChild(arrow);
      row.appendChild(result);
      row.appendChild(lbl);
      panel.appendChild(row);
    });
    this._recipePanel = panel;
    this.root.appendChild(panel);
  }

  _toggleRecipeBook() {
    this._recipeOpen = !this._recipeOpen;
    this._recipePanel.style.display = this._recipeOpen ? 'block' : 'none';
  }

  // ── NPC dialog ────────────────────────────────────────────────────────────
  _buildNPCDialog() {
    const dlg = document.createElement('div');
    css(dlg, `position:absolute;bottom:120px;left:50%;transform:translateX(-50%);
              background:rgba(20,20,20,0.9);color:#fff;border:2px solid #888;border-radius:8px;
              padding:12px 20px;font-size:14px;display:none;pointer-events:none;max-width:300px;text-align:center;`);
    this._npcDlg = dlg;
    this.root.appendChild(dlg);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  toggleInventory() {
    if (this._inventoryOpen) this.closeInventory();
    else                      this.openInventory();
  }

  openInventory() {
    this._inventoryOpen = true;
    this._inventoryUI.style.display = 'block';
    this.game.setInventoryOpen(true);
    this._renderInventoryContents();
  }

  closeInventory() {
    this._inventoryOpen = false;
    this._inventoryUI.style.display = 'none';
    this._recipeOpen = false;
    this._recipePanel.style.display = 'none';
    this.game.setInventoryOpen(false);
  }

  showNotification(msg) {
    const el = document.createElement('div');
    css(el, `background:rgba(0,0,0,0.6);color:#fff;font-size:12px;
             padding:4px 14px;border-radius:10px;opacity:1;
             transition:opacity 1s;white-space:nowrap;`);
    el.textContent = msg;
    this._notifArea.appendChild(el);
    this._notifications.push(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => { el.remove(); this._notifications = this._notifications.filter(n => n !== el); }, 1000);
    }, 3000);
  }

  showChat(name, msg) {
    const el = document.createElement('div');
    css(el, `background:rgba(0,0,0,0.5);color:#fff;font-size:12px;
             padding:3px 10px;border-radius:4px;opacity:1;transition:opacity 1.5s;
             white-space:pre-wrap;max-width:320px;word-break:break-word;`);
    el.innerHTML = `<span style="color:#7bcfff;font-weight:bold;">${name.replace(/</g,'&lt;')}</span>: ${msg.replace(/</g,'&lt;')}`;
    this._chatLog.appendChild(el);
    this._chatMessages.push(el);
    if (this._chatMessages.length > 8) { const old = this._chatMessages.shift(); old.remove(); }
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => { el.remove(); this._chatMessages = this._chatMessages.filter(m => m !== el); }, 1500);
    }, 6000);
  }

  showNPCMessage(msg) {
    this._npcDlg.textContent = msg;
    this._npcDlg.style.display = 'block';
    clearTimeout(this._npcTimer);
    this._npcTimer = setTimeout(() => { this._npcDlg.style.display = 'none'; }, 3000);
  }

  // ── Frame update ─────────────────────────────────────────────────────────
  update(dt = 0) {
    // FPS counter
    this._fpsCount++;
    this._fpsTimer += dt;
    if (this._fpsTimer >= 0.5) {
      this._fps = Math.round(this._fpsCount / this._fpsTimer);
      this._fpsCount = 0;
      this._fpsTimer = 0;
    }

    this._updateHotbar();
    this._updateHealth();
    this._updateCamera();
    this._updateBadges();
    if (this._f3Open)    this._updateF3();
    if (this._inventoryOpen) this._renderInventoryContents();
  }

  _updateHotbar() {
    const slots    = this.player.inventory.getHotbar();
    const selected = this.player.inventory.selectedSlot;
    this._hotbarEl.innerHTML = '';

    slots.forEach((item, i) => {
      const slot = document.createElement('div');
      const sel  = i === selected;
      css(slot, `width:54px;height:54px;border:2px solid ${sel ? '#fff' : '#555'};
                 border-radius:5px;background:rgba(20,20,20,0.85);
                 display:flex;align-items:center;justify-content:center;
                 position:relative;overflow:hidden;
                 ${sel ? 'box-shadow:0 0 10px rgba(255,255,255,0.45);' : ''}`);
      if (item) {
        const color = item.id ? blockColor(item.id) : (item.type === 'pickaxe' ? '#b0b0b0' : item.type === 'axe' ? '#c09060' : item.type === 'sword' ? '#b8b8d0' : item.type === 'shovel' ? '#d08040' : '#888');
        slot.style.background = color;
        const cnt = document.createElement('div');
        css(cnt, `position:absolute;bottom:2px;right:4px;font-size:11px;
                  color:#fff;text-shadow:1px 1px #000;font-weight:bold;`);
        cnt.textContent = item.count > 1 ? item.count : '';
        const name = document.createElement('div');
        css(name, `font-size:8px;color:#fff;text-align:center;
                   text-shadow:1px 1px #000;max-width:52px;overflow:hidden;
                   white-space:nowrap;padding:0 2px;line-height:1.1;`);
        // Use ITEM_NAMES for items, or proper name for tools/blocks
        const displayName = ITEM_NAMES?.[item.id] || item.name?.split(' ').slice(-1)[0] || item.type || '';
        name.textContent = displayName.slice(0, 8);
        slot.appendChild(name);
        slot.appendChild(cnt);
        // Tool durability bar
        if (item.durability !== undefined && item.maxDurability) {
          const durPct = item.durability / item.maxDurability;
          const durBar = document.createElement('div');
          css(durBar, `position:absolute;bottom:0;left:0;right:0;height:3px;background:#333;`);
          const fill = document.createElement('div');
          const durColor = durPct > 0.5 ? '#44ff44' : durPct > 0.25 ? '#ffaa00' : '#ff3333';
          css(fill, `height:100%;width:${durPct*100}%;background:${durColor};`);
          durBar.appendChild(fill);
          slot.appendChild(durBar);
        }
      }
      this._hotbarEl.appendChild(slot);
    });
  }

  _updateHealth() {
    const isSurvival = this.game?.mode !== 'creative';

    this._healthEl.innerHTML = '';
    this._foodEl.innerHTML   = '';

    if (!isSurvival) return;

    for (let i = 0; i < 10; i++) {
      const h   = document.createElement('div');
      const full = this.player.health / 2 > i;
      css(h, `width:16px;height:16px;font-size:14px;line-height:16px;text-align:center;
              filter:drop-shadow(0 0 2px rgba(0,0,0,0.8));`);
      h.textContent = '♥';
      h.style.color = full ? '#ff3333' : '#555';
      this._healthEl.appendChild(h);
    }

    for (let i = 0; i < 10; i++) {
      const f    = document.createElement('div');
      const full = this.player.food / 2 > i;
      css(f, `width:16px;height:16px;font-size:14px;line-height:16px;text-align:center;
              filter:drop-shadow(0 0 2px rgba(0,0,0,0.8));`);
      f.textContent = '◉';
      f.style.color = full ? '#d4a030' : '#555';
      this._foodEl.appendChild(f);
    }

    this._xpFill.style.width = (this.player.xp % 100) + '%';
  }

  _updateCamera() {
    const modeNames = { first: '1st', third: '3rd', fifth: '5th' };
    this._camIndicator.textContent = `[F] ${modeNames[this.player.cameraMode] || ''} Person`;
  }

  _updateBadges() {
    const isCreative = this.game?.mode === 'creative';
    this._creativeBadge.style.display = isCreative ? 'block' : 'none';
    this._flyBtn.style.display        = isCreative ? 'block' : 'none';
    if (isCreative) {
      const flying = this.game.player.physics.flying;
      this._flyBtn.textContent    = flying ? '✈ FLY: ON  [V]' : '▶ FLY: OFF [V]';
      this._flyBtn.style.color    = flying ? '#80ffcc' : '#a0c0ff';
      this._flyBtn.style.borderColor = flying ? '#44aa88' : '#5566cc';
    }
  }

  _updateF3() {
    const p   = this.player.position;
    const hit = this.player._raycastForward?.();
    const blockName = hit
      ? Object.entries(BLOCKS).find(([,v]) => v === hit.block)?.[0]?.toLowerCase() || 'unknown'
      : '—';
    this._f3El.innerHTML = [
      `FPS: ${this._fps}`,
      `XYZ: ${p.x.toFixed(1)} / ${p.y.toFixed(1)} / ${p.z.toFixed(1)}`,
      `Mode: ${this.game.mode}`,
      `Flying: ${this.player.physics.flying}`,
      `OnGround: ${this.player.physics.onGround}`,
      `Target: ${blockName}`,
      `DayTime: ${(this.game.dayTime * 24).toFixed(1)}h`,
      `Zombies: ${this.game.entities.zombies.length}`,
      `Rain: ${this.game.rain ? (this.game.rain.intensity * 100).toFixed(0) + '%' : 'off'}`,
    ].join('<br>');
  }

  // ── Inventory content renderer ────────────────────────────────────────────
  _renderInventoryContents() {
    const mainEl = document.getElementById('inv-main');
    const hbarEl = document.getElementById('inv-hotbar-grid');
    if (!mainEl || !hbarEl) return;

    const renderSlots = (container, slots) => {
      container.innerHTML = '';
      slots.forEach((item) => {
        const slot = document.createElement('div');
        css(slot, `width:44px;height:44px;border:2px solid #666;border-radius:3px;
                   background:${item?.id ? blockColor(item.id) : (item?.type ? '#555' : '#222')};
                   display:flex;align-items:center;justify-content:center;
                   font-size:10px;color:#fff;cursor:pointer;position:relative;overflow:hidden;`);
        if (item) {
          const cnt = document.createElement('div');
          css(cnt, `position:absolute;bottom:1px;right:2px;font-size:9px;
                    color:#fff;text-shadow:1px 1px #000;`);
          cnt.textContent = item.count > 1 ? item.count : '';
          const name = document.createElement('div');
          css(name, `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                     font-size:8px;color:#fff;text-shadow:1px 1px #000;text-align:center;
                     white-space:nowrap;overflow:hidden;max-width:42px;`);
          name.textContent = (ITEM_NAMES?.[item.id] || item.name || item.type || '').slice(0, 8);
          slot.appendChild(cnt);
          slot.appendChild(name);
        }
        container.appendChild(slot);
      });
    };

    renderSlots(mainEl, this.player.inventory.getMain());
    renderSlots(hbarEl, this.player.inventory.getHotbar());
  }
}
