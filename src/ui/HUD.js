import { BLOCKS } from '../world/BlockRegistry.js';

const HOTBAR_COLORS = {
  grass:    '#5a9e3c',
  stone:    '#888',
  wood_log: '#8B6914',
  planks:   '#a07038',
  default:  '#aaa',
};

function blockColor(id) {
  if (!id) return '#888';
  if (id === BLOCKS.GRASS)       return '#5a9e3c';
  if (id === BLOCKS.DIRT)        return '#8b6340';
  if (id === BLOCKS.STONE)       return '#888';
  if (id === BLOCKS.SAND)        return '#d4b860';
  if (id === BLOCKS.WOOD_LOG || id === BLOCKS.BIRCH_LOG || id === BLOCKS.PINE_LOG) return '#8B6914';
  if (id === BLOCKS.LEAVES || id === BLOCKS.LEAVES_BIRCH || id === BLOCKS.LEAVES_PINE) return '#2d8b1e';
  if (id === BLOCKS.PLANKS_OAK || id === BLOCKS.PLANKS_BIRCH || id === BLOCKS.PLANKS_PINE) return '#a07038';
  if (id === BLOCKS.WATER)       return '#1a6ea0';
  if (id === BLOCKS.DIAMOND_ORE) return '#50e8e0';
  if (id === BLOCKS.GOLD_ORE)    return '#f0c820';
  if (id === BLOCKS.IRON_ORE)    return '#d4967a';
  if (id === BLOCKS.COAL_ORE)    return '#111';
  if (id === BLOCKS.SNOW)        return '#f0f4f8';
  if (id === BLOCKS.OBSIDIAN)    return '#1a0a2e';
  if (id === BLOCKS.GLOWSTONE)   return '#f8d040';
  if (id === BLOCKS.WOOL_RED)    return '#cc2222';
  if (id === BLOCKS.WOOL_BLUE)   return '#2244cc';
  return '#999';
}

export class HUD {
  constructor(root, player, game) {
    this.root   = root;
    this.player = player;
    this.game   = game;
    this._inventoryOpen = false;
    this._npcDialog = null;
    this._notifications = [];
    this._chatMessages  = [];

    this._build();
  }

  _build() {
    this.root.innerHTML = '';

    // Crosshair
    const crosshair = document.createElement('div');
    crosshair.id = 'crosshair';
    crosshair.style.cssText = `
      position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
      width:20px; height:20px; pointer-events:none;
    `;
    crosshair.innerHTML = `<svg width="20" height="20">
      <line x1="10" y1="2" x2="10" y2="18" stroke="white" stroke-width="2" opacity="0.8"/>
      <line x1="2" y1="10" x2="18" y2="10" stroke="white" stroke-width="2" opacity="0.8"/>
    </svg>`;
    this.root.appendChild(crosshair);

    // Hotbar
    const hotbar = document.createElement('div');
    hotbar.id = 'hotbar';
    hotbar.style.cssText = `
      position:absolute; bottom:16px; left:50%; transform:translateX(-50%);
      display:flex; gap:4px; pointer-events:none; z-index:20;
    `;
    this._hotbarEl = hotbar;
    this.root.appendChild(hotbar);

    // Health bar
    const healthBar = document.createElement('div');
    healthBar.id = 'health-bar';
    healthBar.style.cssText = `
      position:absolute; bottom:72px; left:50%; transform:translateX(-50%);
      display:flex; gap:2px; pointer-events:none;
    `;
    this._healthEl = healthBar;
    this.root.appendChild(healthBar);

    // Food bar
    const foodBar = document.createElement('div');
    foodBar.id = 'food-bar';
    foodBar.style.cssText = `
      position:absolute; bottom:72px; left:calc(50% + 100px);
      display:flex; gap:2px; pointer-events:none;
    `;
    this._foodEl = foodBar;
    this.root.appendChild(foodBar);

    // XP bar
    const xpBar = document.createElement('div');
    xpBar.style.cssText = `
      position:absolute; bottom:58px; left:50%; transform:translateX(-50%);
      width:182px; height:5px; background:#222; border-radius:3px; pointer-events:none;
    `;
    const xpFill = document.createElement('div');
    xpFill.style.cssText = `height:100%; width:0%; background:#7fff00; border-radius:3px; transition:width 0.3s;`;
    xpBar.appendChild(xpFill);
    this._xpFill = xpFill;
    this.root.appendChild(xpBar);

    // Camera mode indicator
    const camIndicator = document.createElement('div');
    camIndicator.style.cssText = `
      position:absolute; top:12px; right:16px; color:white; font-size:12px;
      background:rgba(0,0,0,0.5); padding:4px 8px; border-radius:4px; pointer-events:none;
    `;
    this._camIndicator = camIndicator;
    this.root.appendChild(camIndicator);

    // Controls hint
    const hint = document.createElement('div');
    hint.style.cssText = `
      position:absolute; top:12px; left:16px; color:rgba(255,255,255,0.7); font-size:11px;
      background:rgba(0,0,0,0.4); padding:6px 10px; border-radius:4px; pointer-events:none;
      line-height:1.6;
    `;
    hint.innerHTML = `WASD: Move &nbsp; Space: Jump &nbsp; Shift: Sprint<br>
      F: Camera &nbsp; V: Fly &nbsp; E: Inventory &nbsp; Esc: Pause<br>
      LMB: Break &nbsp; RMB: Place &nbsp; 1-9: Hotbar`;
    this.root.appendChild(hint);

    // Creative mode badge
    const creativeBadge = document.createElement('div');
    creativeBadge.style.cssText = `
      position:absolute; top:12px; left:50%; transform:translateX(-50%);
      background:rgba(80,40,160,0.85); color:#d0b0ff; font-size:12px;
      padding:4px 14px; border-radius:12px; pointer-events:none;
      display:none; letter-spacing:2px; border:1px solid #9a7aff;
    `;
    creativeBadge.textContent = 'CREATIVE';
    this._creativeBadge = creativeBadge;
    this.root.appendChild(creativeBadge);

    // Notification area
    const notifArea = document.createElement('div');
    notifArea.style.cssText = `
      position:absolute; top:60px; left:50%; transform:translateX(-50%);
      display:flex; flex-direction:column; align-items:center; gap:4px;
      pointer-events:none; z-index:25;
    `;
    this._notifArea = notifArea;
    this.root.appendChild(notifArea);

    // Chat log
    const chatLog = document.createElement('div');
    chatLog.style.cssText = `
      position:absolute; bottom:120px; left:12px;
      display:flex; flex-direction:column; gap:2px;
      pointer-events:none; z-index:25; max-width:320px;
    `;
    this._chatLog = chatLog;
    this.root.appendChild(chatLog);

    // Inventory overlay
    this._buildInventoryUI();

    // NPC dialog
    this._buildNPCDialog();
  }

  showNotification(msg) {
    const el = document.createElement('div');
    el.style.cssText = `
      background:rgba(0,0,0,0.6); color:#fff; font-size:12px;
      padding:4px 14px; border-radius:10px; opacity:1;
      transition:opacity 1s; white-space:nowrap;
    `;
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
    el.style.cssText = `
      background:rgba(0,0,0,0.5); color:#fff; font-size:12px;
      padding:3px 10px; border-radius:4px; opacity:1;
      transition:opacity 1.5s; white-space:pre-wrap; max-width:320px; word-break:break-word;
    `;
    el.innerHTML = `<span style="color:#7bcfff;font-weight:bold;">${name.replace(/</g,'&lt;')}</span>: ${msg.replace(/</g,'&lt;')}`;
    this._chatLog.appendChild(el);
    this._chatMessages.push(el);
    if (this._chatMessages.length > 8) {
      const old = this._chatMessages.shift();
      old.remove();
    }
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => { el.remove(); this._chatMessages = this._chatMessages.filter(m => m !== el); }, 1500);
    }, 6000);
  }

  _buildInventoryUI() {
    const inv = document.createElement('div');
    inv.id = 'inventory-ui';
    inv.style.cssText = `
      position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
      background:rgba(30,30,30,0.95); border:2px solid #555; border-radius:8px;
      padding:16px; display:none; pointer-events:all; z-index:30; min-width:400px;
    `;
    inv.innerHTML = `
      <div style="color:#fff;font-size:16px;margin-bottom:12px;text-align:center;">Inventory</div>
      <div id="inv-main" style="display:grid;grid-template-columns:repeat(9,40px);gap:4px;margin-bottom:12px;"></div>
      <hr style="border-color:#444;margin:8px 0;">
      <div id="inv-hotbar-grid" style="display:grid;grid-template-columns:repeat(9,40px);gap:4px;"></div>
    `;
    this._inventoryUI = inv;
    this.root.appendChild(inv);
  }

  _buildNPCDialog() {
    const dlg = document.createElement('div');
    dlg.id = 'npc-dialog';
    dlg.style.cssText = `
      position:absolute; bottom:120px; left:50%; transform:translateX(-50%);
      background:rgba(20,20,20,0.9); color:#fff; border:2px solid #888; border-radius:8px;
      padding:12px 20px; font-size:14px; display:none; pointer-events:none; max-width:300px;
      text-align:center;
    `;
    this._npcDlg = dlg;
    this.root.appendChild(dlg);
  }

  toggleInventory() {
    this._inventoryOpen = !this._inventoryOpen;
    this._inventoryUI.style.display = this._inventoryOpen ? 'block' : 'none';
    if (this._inventoryOpen) this._renderInventoryContents();
  }

  _renderInventoryContents() {
    const main = document.getElementById('inv-main');
    const hbar = document.getElementById('inv-hotbar-grid');
    if (!main || !hbar) return;

    const renderSlots = (container, slots) => {
      container.innerHTML = '';
      slots.forEach((item, i) => {
        const slot = document.createElement('div');
        slot.style.cssText = `
          width:40px; height:40px; border:2px solid #666; border-radius:3px;
          background:#222; display:flex; align-items:center; justify-content:center;
          font-size:10px; color:#fff; cursor:pointer; position:relative; overflow:hidden;
        `;
        if (item) {
          slot.style.background = blockColor(item.id) || '#444';
          const label = document.createElement('div');
          label.style.cssText = `
            position:absolute; bottom:1px; right:2px; font-size:9px;
            color:#fff; text-shadow:1px 1px #000;
          `;
          label.textContent = item.count > 1 ? item.count : '';
          slot.appendChild(label);
          const name = document.createElement('div');
          name.style.cssText = `
            position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
            font-size:8px; color:#fff; text-shadow:1px 1px #000; text-align:center;
            white-space:nowrap; overflow:hidden; max-width:38px;
          `;
          name.textContent = item.name?.slice(0, 6) || '';
          slot.appendChild(name);
        }
        container.appendChild(slot);
      });
    };

    renderSlots(main, this.player.inventory.getMain());
    renderSlots(hbar, this.player.inventory.getHotbar());
  }

  showNPCMessage(msg) {
    this._npcDlg.textContent = msg;
    this._npcDlg.style.display = 'block';
    clearTimeout(this._npcTimer);
    this._npcTimer = setTimeout(() => { this._npcDlg.style.display = 'none'; }, 3000);
  }

  update() {
    this._updateHotbar();
    this._updateHealth();
    this._updateCamera();
    this._creativeBadge.style.display = this.game?.mode === 'creative' ? 'block' : 'none';
  }

  _updateHotbar() {
    const slots = this.player.inventory.getHotbar();
    const selected = this.player.inventory.selectedSlot;
    this._hotbarEl.innerHTML = '';

    slots.forEach((item, i) => {
      const slot = document.createElement('div');
      slot.style.cssText = `
        width:44px; height:44px; border:2px solid ${i === selected ? '#fff' : '#555'};
        border-radius:4px; background:rgba(30,30,30,0.8);
        display:flex; align-items:center; justify-content:center;
        position:relative; overflow:hidden;
        ${i === selected ? 'box-shadow:0 0 8px rgba(255,255,255,0.4);' : ''}
      `;
      if (item) {
        slot.style.background = item.id ? blockColor(item.id) : '#444';
        const label = document.createElement('div');
        label.style.cssText = `
          position:absolute; bottom:2px; right:3px; font-size:10px;
          color:#fff; text-shadow:1px 1px #000;
        `;
        label.textContent = item.count > 1 ? item.count : '';
        const name = document.createElement('div');
        name.style.cssText = `
          font-size:8px; color:#fff; text-align:center;
          text-shadow:1px 1px #000; max-width:42px; overflow:hidden;
        `;
        name.textContent = item.type !== 'block' ? (item.type || '') : (item.name?.split(' ')[0] || '');
        slot.appendChild(name);
        slot.appendChild(label);
      }
      this._hotbarEl.appendChild(slot);
    });
  }

  _updateHealth() {
    // Hearts
    this._healthEl.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const h = document.createElement('div');
      const full = (this.player.health / 2) > i;
      const half = !full && (this.player.health / 2) > i - 0.5;
      h.style.cssText = `
        width:16px; height:16px; font-size:14px; line-height:16px; text-align:center;
        filter: drop-shadow(0 0 2px rgba(0,0,0,0.8));
      `;
      h.textContent = full ? '♥' : half ? '♡' : '♡';
      h.style.color = full ? '#ff2222' : '#555';
      this._healthEl.appendChild(h);
    }

    // XP
    const xpPct = (this.player.xp % 100);
    this._xpFill.style.width = xpPct + '%';

    // Camera mode
    const modeNames = { first: '1st Person', third: '3rd Person', fifth: '5th Person' };
    this._camIndicator.textContent = modeNames[this.player.cameraMode] || '';
  }

  _updateCamera() {
    const modeNames = { first: '1st', third: '3rd', fifth: '5th' };
    this._camIndicator.textContent = `[F] ${modeNames[this.player.cameraMode] || ''} Person`;
  }
}
