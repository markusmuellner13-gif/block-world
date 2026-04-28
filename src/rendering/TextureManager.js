import * as THREE from 'three';

const TEX = 16; // pixels per block face

function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function noise2(x, y, seed = 0) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.3) * 43758.5453;
  return n - Math.floor(n);
}

function drawNoisy(ctx, base, dark, light, freq = 1) {
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const n = noise2(x * freq, y * freq);
      if (n < 0.33) ctx.fillStyle = dark;
      else if (n > 0.66) ctx.fillStyle = light;
      else ctx.fillStyle = base;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawSolid(ctx, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, TEX, TEX);
}

function addCracks(ctx, density = 0.04) {
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      if (noise2(x * 3.1, y * 2.9, 99) < density) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

const BLOCK_TEXTURES = {
  grass_top:    (ctx) => {
    drawNoisy(ctx, '#5a9e3c', '#4a8a2c', '#6aae4c');
    // blades
    for (let i = 0; i < 8; i++) {
      const bx = Math.floor(noise2(i, 1) * TEX);
      ctx.fillStyle = '#3d7a20';
      ctx.fillRect(bx, 0, 1, 2);
    }
  },
  grass_side:   (ctx) => {
    ctx.fillStyle = '#8b6340';
    ctx.fillRect(0, 4, TEX, TEX);
    drawNoisy(ctx, '#5a9e3c', '#4a8a2c', '#6aae4c');
    ctx.clearRect(0, 4, TEX, TEX - 4);
    ctx.fillStyle = '#8b6340';
    ctx.fillRect(0, 4, TEX, TEX - 4);
    for (let x = 0; x < TEX; x++) {
      const dn = Math.floor(noise2(x * 2, 0) * 3);
      ctx.fillStyle = '#5a9e3c';
      ctx.fillRect(x, dn, 1, 4);
    }
    addCracks(ctx, 0.03);
  },
  dirt:         (ctx) => {
    drawNoisy(ctx, '#8b6340', '#7a5530', '#9b7350');
    addCracks(ctx, 0.02);
  },
  stone:        (ctx) => {
    drawNoisy(ctx, '#888', '#777', '#999');
    addCracks(ctx, 0.05);
  },
  cobblestone:  (ctx) => {
    drawNoisy(ctx, '#888', '#666', '#aaa', 2);
    // mortar lines
    for (let y = 0; y < TEX; y += 4) {
      ctx.fillStyle = '#555';
      ctx.fillRect(0, y, TEX, 1);
    }
    for (let x = 0; x < TEX; x += 4) {
      ctx.fillStyle = '#555';
      ctx.fillRect(x, 0, 1, TEX);
    }
  },
  sand:         (ctx) => {
    drawNoisy(ctx, '#d4b860', '#c4a850', '#e4c870');
  },
  gravel:       (ctx) => {
    drawNoisy(ctx, '#888', '#777', '#999', 3);
    for (let i = 0; i < 12; i++) {
      const gx = Math.floor(noise2(i, 0) * TEX);
      const gy = Math.floor(noise2(i, 5) * TEX);
      ctx.fillStyle = '#666';
      ctx.fillRect(gx, gy, 2, 2);
    }
  },
  water:        (ctx) => {
    ctx.fillStyle = '#1a6ea0';
    ctx.fillRect(0, 0, TEX, TEX);
    for (let y = 0; y < TEX; y++) {
      for (let x = 0; x < TEX; x++) {
        if (noise2(x * 0.7, y * 0.7) > 0.75) {
          ctx.fillStyle = 'rgba(100,200,255,0.4)';
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  },
  lava:         (ctx) => {
    for (let y = 0; y < TEX; y++) {
      for (let x = 0; x < TEX; x++) {
        const n = noise2(x * 0.8, y * 0.8);
        if (n > 0.6) ctx.fillStyle = '#ff8800';
        else if (n > 0.4) ctx.fillStyle = '#cc4400';
        else ctx.fillStyle = '#882200';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  },
  bedrock:      (ctx) => {
    drawNoisy(ctx, '#333', '#222', '#444', 3);
    addCracks(ctx, 0.08);
  },
  wood_log_side: (ctx) => {
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(0, 0, TEX, TEX);
    for (let y = 0; y < TEX; y++) {
      const n = noise2(y * 0.5, 1) * 20 - 10;
      ctx.fillStyle = y % 2 === 0 ? '#7a5a0f' : '#9b7920';
      ctx.fillRect(0, y, TEX, 1);
    }
    // bark edges
    ctx.fillStyle = '#5a3a05';
    ctx.fillRect(0, 0, 1, TEX);
    ctx.fillRect(TEX - 1, 0, 1, TEX);
  },
  wood_log_top:  (ctx) => {
    ctx.fillStyle = '#c8a015';
    ctx.fillRect(0, 0, TEX, TEX);
    // rings
    for (let r = 7; r >= 1; r -= 2) {
      ctx.strokeStyle = `rgba(100,60,0,0.4)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(8, 8, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // center dot
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(7, 7, 2, 2);
  },
  leaves:       (ctx) => {
    drawNoisy(ctx, '#2d8b1e', '#1d7b0e', '#3d9b2e');
    for (let y = 0; y < TEX; y++) {
      for (let x = 0; x < TEX; x++) {
        if (noise2(x * 2.1, y * 2.1, 11) > 0.85) {
          ctx.fillStyle = 'rgba(0,0,0,0)';
          ctx.clearRect(x, y, 1, 1);
        }
      }
    }
  },
  leaves_birch: (ctx) => {
    drawNoisy(ctx, '#4aab2e', '#3a9b1e', '#5abb3e');
  },
  leaves_pine:  (ctx) => {
    drawNoisy(ctx, '#1d6614', '#0d5604', '#2d7624');
  },
  birch_log_side: (ctx) => {
    ctx.fillStyle = '#ddd';
    ctx.fillRect(0, 0, TEX, TEX);
    for (let y = 0; y < TEX; y += 3) {
      ctx.fillStyle = '#888';
      ctx.fillRect(3, y, 10, 1);
    }
  },
  pine_log_side: (ctx) => {
    ctx.fillStyle = '#6b4a20';
    ctx.fillRect(0, 0, TEX, TEX);
    for (let y = 0; y < TEX; y++) {
      if (noise2(y, 3) > 0.7) {
        ctx.fillStyle = '#3b2010';
        ctx.fillRect(0, y, TEX, 1);
      }
    }
  },
  planks_oak:   (ctx) => {
    ctx.fillStyle = '#a07038';
    ctx.fillRect(0, 0, TEX, TEX);
    for (let y = 0; y < TEX; y += 4) {
      ctx.fillStyle = '#805820';
      ctx.fillRect(0, y, TEX, 1);
    }
    ctx.fillStyle = '#805820';
    ctx.fillRect(8, 0, 1, 4);
    ctx.fillRect(0, 4, 1, 4);
    ctx.fillRect(8, 8, 1, 4);
    ctx.fillRect(0, 12, 1, 4);
  },
  planks_birch: (ctx) => {
    ctx.fillStyle = '#cdb87a';
    ctx.fillRect(0, 0, TEX, TEX);
    for (let y = 0; y < TEX; y += 4) {
      ctx.fillStyle = '#b09860';
      ctx.fillRect(0, y, TEX, 1);
    }
  },
  planks_pine:  (ctx) => {
    ctx.fillStyle = '#8b5a28';
    ctx.fillRect(0, 0, TEX, TEX);
    for (let y = 0; y < TEX; y += 4) {
      ctx.fillStyle = '#6b3a18';
      ctx.fillRect(0, y, TEX, 1);
    }
  },
  glass:        (ctx) => {
    ctx.fillStyle = 'rgba(180,220,240,0.3)';
    ctx.fillRect(0, 0, TEX, TEX);
    ctx.strokeStyle = 'rgba(200,240,255,0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, TEX - 1, TEX - 1);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(TEX, TEX);
    ctx.moveTo(TEX, 0); ctx.lineTo(0, TEX);
    ctx.stroke();
  },
  brick:        (ctx) => {
    ctx.fillStyle = '#9e4a2a';
    ctx.fillRect(0, 0, TEX, TEX);
    // mortar
    ctx.fillStyle = '#888';
    for (let y = 0; y < TEX; y += 4) {
      ctx.fillRect(0, y, TEX, 1);
    }
    for (let x = 0; x < TEX; x += 8) {
      ctx.fillRect(x, 1, 1, 3);
      ctx.fillRect((x + 4) % TEX, 5, 1, 3);
    }
  },
  sandstone:    (ctx) => {
    drawNoisy(ctx, '#d4b860', '#c4a040', '#e4c870');
    for (let y = 0; y < TEX; y += 4) {
      ctx.fillStyle = '#b89040';
      ctx.fillRect(0, y, TEX, 1);
    }
  },
  snow:         (ctx) => {
    drawNoisy(ctx, '#f0f4f8', '#e0e8f0', '#ffffff');
  },
  ice:          (ctx) => {
    ctx.fillStyle = '#a0c8e8';
    ctx.fillRect(0, 0, TEX, TEX);
    for (let y = 0; y < TEX; y++) {
      for (let x = 0; x < TEX; x++) {
        if (noise2(x * 1.5, y * 1.5) > 0.8) {
          ctx.fillStyle = 'rgba(200,240,255,0.5)';
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  },
  obsidian:     (ctx) => {
    drawNoisy(ctx, '#1a0a2e', '#0a0018', '#2a1040', 2);
    for (let y = 0; y < TEX; y++) {
      for (let x = 0; x < TEX; x++) {
        if (noise2(x * 1.5, y * 1.5, 77) > 0.9) {
          ctx.fillStyle = 'rgba(180,100,255,0.3)';
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  },
  coal_ore:     (ctx) => {
    drawNoisy(ctx, '#888', '#777', '#999');
    addCracks(ctx, 0.03);
    // ore veins
    for (let i = 0; i < 4; i++) {
      const ox = Math.floor(noise2(i, 0) * 10) + 2;
      const oy = Math.floor(noise2(i, 1) * 10) + 2;
      ctx.fillStyle = '#111';
      ctx.fillRect(ox, oy, 3, 2);
    }
  },
  iron_ore:     (ctx) => {
    drawNoisy(ctx, '#888', '#777', '#999');
    addCracks(ctx, 0.03);
    for (let i = 0; i < 4; i++) {
      const ox = Math.floor(noise2(i, 10) * 10) + 2;
      const oy = Math.floor(noise2(i, 11) * 10) + 2;
      ctx.fillStyle = '#d4967a';
      ctx.fillRect(ox, oy, 3, 2);
    }
  },
  gold_ore:     (ctx) => {
    drawNoisy(ctx, '#888', '#777', '#999');
    addCracks(ctx, 0.03);
    for (let i = 0; i < 4; i++) {
      const ox = Math.floor(noise2(i, 20) * 10) + 2;
      const oy = Math.floor(noise2(i, 21) * 10) + 2;
      ctx.fillStyle = '#f0c820';
      ctx.fillRect(ox, oy, 3, 2);
    }
  },
  diamond_ore:  (ctx) => {
    drawNoisy(ctx, '#888', '#777', '#999');
    addCracks(ctx, 0.03);
    for (let i = 0; i < 3; i++) {
      const ox = Math.floor(noise2(i, 30) * 10) + 2;
      const oy = Math.floor(noise2(i, 31) * 10) + 2;
      ctx.fillStyle = '#50e8e0';
      ctx.fillRect(ox, oy, 3, 3);
    }
  },
  emerald_ore:  (ctx) => {
    drawNoisy(ctx, '#888', '#777', '#999');
    addCracks(ctx, 0.03);
    for (let i = 0; i < 3; i++) {
      const ox = Math.floor(noise2(i, 40) * 10) + 2;
      const oy = Math.floor(noise2(i, 41) * 10) + 2;
      ctx.fillStyle = '#30d050';
      ctx.fillRect(ox, oy, 3, 3);
    }
  },
  clay:         (ctx) => {
    drawNoisy(ctx, '#9aacb8', '#8a9ca8', '#aabcc8');
  },
  mycelium:     (ctx) => {
    drawNoisy(ctx, '#7a6888', '#6a5878', '#8a7898');
    for (let i = 0; i < 8; i++) {
      const wx = Math.floor(noise2(i, 50) * TEX);
      const wy = Math.floor(noise2(i, 51) * TEX);
      ctx.fillStyle = '#fff';
      ctx.fillRect(wx, wy, 1, 1);
    }
  },
  podzol_top:   (ctx) => {
    drawNoisy(ctx, '#7a5530', '#6a4520', '#8a6540');
  },
  red_sand:     (ctx) => {
    drawNoisy(ctx, '#c86020', '#b85010', '#d87030');
  },
  terracotta:   (ctx) => {
    drawNoisy(ctx, '#a0604a', '#905040', '#b0705a');
    addCracks(ctx, 0.02);
  },
  glowstone:    (ctx) => {
    for (let y = 0; y < TEX; y++) {
      for (let x = 0; x < TEX; x++) {
        const n = noise2(x, y);
        if (n > 0.5) ctx.fillStyle = '#f8d040';
        else ctx.fillStyle = '#c8a020';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  },
  netherrack:   (ctx) => {
    drawNoisy(ctx, '#8b2020', '#7b1010', '#9b3030', 2);
    addCracks(ctx, 0.04);
  },
  crafting_table_top: (ctx) => {
    ctx.fillStyle = '#a07038';
    ctx.fillRect(0, 0, TEX, TEX);
    ctx.fillStyle = '#805020';
    ctx.fillRect(1, 1, 14, 14);
    ctx.fillStyle = '#a07038';
    for (let i = 2; i < TEX; i += 4) {
      ctx.fillRect(i, 1, 2, 14);
      ctx.fillRect(1, i, 14, 2);
    }
  },
  furnace_front: (ctx) => {
    drawNoisy(ctx, '#888', '#777', '#999');
    // door outline
    ctx.fillStyle = '#333';
    ctx.fillRect(4, 8, 8, 6);
    // fire glow
    ctx.fillStyle = '#f84';
    ctx.fillRect(5, 9, 6, 4);
    ctx.fillStyle = '#ff0';
    ctx.fillRect(6, 10, 4, 2);
  },
  farmland:     (ctx) => {
    drawNoisy(ctx, '#6b4a28', '#5b3a18', '#7b5a38');
    for (let x = 0; x < TEX; x += 4) {
      ctx.fillStyle = '#4a2a10';
      ctx.fillRect(x, 0, 1, TEX);
    }
  },
  wheat_top:    (ctx) => {
    ctx.clearRect(0, 0, TEX, TEX);
    ctx.fillStyle = '#c8a820';
    for (let x = 2; x < TEX; x += 4) {
      ctx.fillRect(x, 2, 2, TEX - 2);
    }
    ctx.fillStyle = '#f0d040';
    for (let x = 2; x < TEX; x += 4) {
      ctx.fillRect(x, 2, 2, 3);
    }
  },
  bookshelf:    (ctx) => {
    ctx.fillStyle = '#a07038';
    ctx.fillRect(0, 0, TEX, TEX);
    // books
    const colors = ['#d44','#4d4','#44d','#dd4','#d84','#84d'];
    for (let row = 0; row < 3; row++) {
      let bx = 1;
      for (let b = 0; b < colors.length; b++) {
        const bw = 2 + (b % 2);
        if (bx + bw > TEX - 1) break;
        ctx.fillStyle = colors[b];
        ctx.fillRect(bx, row * 5 + 1, bw, 4);
        bx += bw + 1;
      }
    }
  },
  stone_brick:  (ctx) => {
    drawNoisy(ctx, '#888', '#777', '#999');
    ctx.fillStyle = '#555';
    ctx.fillRect(0, 0, TEX, 1);
    ctx.fillRect(0, 8, TEX, 1);
    ctx.fillRect(8, 1, 1, 7);
    ctx.fillRect(0, 9, 1, 6);
    ctx.fillRect(0, TEX - 1, TEX, 1);
  },
  mossy_cobble: (ctx) => {
    drawNoisy(ctx, '#888', '#666', '#aaa', 2);
    addCracks(ctx, 0.04);
    for (let y = 0; y < TEX; y++) {
      for (let x = 0; x < TEX; x++) {
        if (noise2(x * 1.2, y * 1.2, 44) > 0.78) {
          ctx.fillStyle = 'rgba(30,120,20,0.6)';
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  },
  cactus_side:  (ctx) => {
    ctx.fillStyle = '#2a7a1a';
    ctx.fillRect(0, 0, TEX, TEX);
    ctx.fillStyle = '#1a5a0a';
    for (let y = 0; y < TEX; y += 4) {
      ctx.fillRect(0, y, TEX, 1);
    }
    ctx.fillStyle = '#3a8a2a';
    for (let y = 1; y < TEX; y += 4) {
      ctx.fillRect(0, y, TEX, 1);
    }
  },
  soul_sand:    (ctx) => {
    drawNoisy(ctx, '#4a3020', '#3a2010', '#5a4030');
    // faces
    for (let i = 0; i < 2; i++) {
      const ex = Math.floor(noise2(i, 60) * 10) + 2;
      const ey = Math.floor(noise2(i, 61) * 10) + 2;
      ctx.fillStyle = '#1a0a00';
      ctx.fillRect(ex, ey, 2, 2);
      ctx.fillRect(ex + 5, ey, 2, 2);
      ctx.fillRect(ex + 1, ey + 4, 4, 1);
    }
  },
  wool_white:   (ctx) => {
    drawNoisy(ctx, '#f0f0f0', '#e0e0e0', '#ffffff');
  },
  wool_red:     (ctx) => {
    drawNoisy(ctx, '#cc2222', '#aa1111', '#ee3333');
  },
  wool_green:   (ctx) => {
    drawNoisy(ctx, '#226622', '#115511', '#337733');
  },
  wool_blue:    (ctx) => {
    drawNoisy(ctx, '#2244cc', '#1133aa', '#3355ee');
  },
  wool_yellow:  (ctx) => {
    drawNoisy(ctx, '#eecc11', '#ccaa00', '#ffdd22');
  },
  wool_orange:  (ctx) => {
    drawNoisy(ctx, '#ee7711', '#cc5500', '#ff8822');
  },
  wool_purple:  (ctx) => {
    drawNoisy(ctx, '#882299', '#661177', '#9933aa');
  },
  wool_black:   (ctx) => {
    drawNoisy(ctx, '#222222', '#111111', '#333333');
  },
  wool_cyan:    (ctx) => {
    drawNoisy(ctx, '#119999', '#007777', '#22aaaa');
  },
  wool_pink:    (ctx) => {
    drawNoisy(ctx, '#ee88aa', '#dd6699', '#ffaacc');
  },
  flower_rose:  (ctx) => {
    ctx.clearRect(0, 0, TEX, TEX);
    ctx.fillStyle = '#1a8a0a';
    ctx.fillRect(7, 8, 2, 8);
    ctx.fillStyle = '#ee2222';
    for (let [dx, dy] of [[-1,-1],[0,-2],[1,-1],[2,0],[1,1],[0,2],[-1,1],[-2,0]]) {
      ctx.fillRect(7 + dx * 2, 8 + dy * 2, 2, 2);
    }
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(7, 8, 2, 2);
  },
  flower_yellow: (ctx) => {
    ctx.clearRect(0, 0, TEX, TEX);
    ctx.fillStyle = '#1a8a0a';
    ctx.fillRect(7, 8, 2, 8);
    ctx.fillStyle = '#f0e000';
    for (let [dx, dy] of [[-1,-1],[0,-2],[1,-1],[2,0],[1,1],[0,2],[-1,1],[-2,0]]) {
      ctx.fillRect(7 + dx * 2, 8 + dy * 2, 2, 2);
    }
    ctx.fillStyle = '#aa6600';
    ctx.fillRect(7, 8, 2, 2);
  },
  mushroom_red: (ctx) => {
    ctx.clearRect(0, 0, TEX, TEX);
    ctx.fillStyle = '#ddd';
    ctx.fillRect(6, 10, 4, 6);
    ctx.fillStyle = '#cc2222';
    for (let x = 2; x < 14; x++) {
      const h = Math.floor(4 - Math.abs(x - 8) * 0.5);
      ctx.fillRect(x, 10 - h, 1, h + 1);
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect(4, 7, 2, 2);
    ctx.fillRect(10, 7, 2, 2);
  },
  tall_grass:   (ctx) => {
    ctx.clearRect(0, 0, TEX, TEX);
    for (let i = 0; i < 6; i++) {
      const bx = Math.floor(noise2(i, 70) * 12) + 1;
      const h = Math.floor(noise2(i, 71) * 8) + 4;
      ctx.fillStyle = i % 2 === 0 ? '#4a8a1a' : '#3a7a0a';
      ctx.fillRect(bx, TEX - h, 2, h);
      ctx.fillRect(bx - 1, TEX - h + 2, 1, h - 2);
    }
  },
};

export class TextureManager {
  constructor() {
    this._cache = new Map();
    this._atlas = null;
    this._atlasUVs = new Map();
    this._build();
  }

  _makeCanvas(drawFn) {
    const c = document.createElement('canvas');
    c.width = TEX; c.height = TEX;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    drawFn(ctx);
    return c;
  }

  _build() {
    const names = Object.keys(BLOCK_TEXTURES);
    const cols = 16;
    const rows = Math.ceil(names.length / cols);
    const aw = cols * TEX;
    const ah = rows * TEX;

    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = aw; atlasCanvas.height = ah;
    const actx = atlasCanvas.getContext('2d');
    actx.imageSmoothingEnabled = false;

    names.forEach((name, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const tc = this._makeCanvas(BLOCK_TEXTURES[name]);
      actx.drawImage(tc, col * TEX, row * TEX);

      const u0 = (col * TEX) / aw;
      const v0 = (row * TEX) / ah;
      const u1 = u0 + TEX / aw;
      const v1 = v0 + TEX / ah;
      this._atlasUVs.set(name, [u0, v0, u1, v1]);
    });

    const tex = new THREE.CanvasTexture(atlasCanvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    this._atlas = tex;

    // store for unknown fallback
    this._atlasUVs.set('fallback', [0, 0, TEX / aw, TEX / ah]);
  }

  getAtlas() {
    return this._atlas;
  }

  getUVs(name) {
    return this._atlasUVs.get(name) || this._atlasUVs.get('fallback');
  }
}
