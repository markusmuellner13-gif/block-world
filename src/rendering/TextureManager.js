import * as THREE from 'three';

const TEX = 16; // pixels per block face

// ── Noise helpers ─────────────────────────────────────────────────────────────
function hash(x, y, seed = 0) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.3) * 43758.5453;
  return n - Math.floor(n);
}
function noise(x, y, seed = 0) { return hash(Math.floor(x), Math.floor(y), seed); }

// Smooth noise (bilinear)
function snoise(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return (
    hash(ix,   iy,   seed) * (1-u) * (1-v) +
    hash(ix+1, iy,   seed) * u     * (1-v) +
    hash(ix,   iy+1, seed) * (1-u) * v     +
    hash(ix+1, iy+1, seed) * u     * v
  );
}

// Fractal noise (multiple octaves)
function fbm(x, y, octaves = 3, seed = 0) {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += snoise(x * freq, y * freq, seed + i * 17) * amp;
    amp *= 0.5; freq *= 2;
  }
  return val;
}

// Parse hex color → [r, g, b] 0-255
function hex(c) {
  c = c.replace('#', '');
  if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
  return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)];
}

// Lerp two [r,g,b] arrays
function lerpRGB(a, b, t) {
  return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
}

// Set pixel with optional alpha
function setPixel(data, x, y, r, g, b, a = 255) {
  const i = (y * TEX + x) * 4;
  data[i]   = r; data[i+1] = g; data[i+2] = b; data[i+3] = a;
}

function getPixel(data, x, y) {
  const i = (y * TEX + x) * 4;
  return [data[i], data[i+1], data[i+2], data[i+3]];
}

// Create a 16×16 canvas texture using a pixel-art draw function
function makeCanvas(drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = TEX; canvas.height = TEX;
  const ctx = canvas.getContext('2d');
  // Use ImageData for pixel-level control
  const imgData = ctx.createImageData(TEX, TEX);
  drawFn(imgData.data);
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// ── Block texture definitions ─────────────────────────────────────────────────
// Each draws into raw RGBA ImageData

const DEFS = {
  // ── Terrain ──────────────────────────────────────────────────────────────
  grass_top: (d) => {
    const base = hex('#5d9e2b'), dark = hex('#4a8820'), light = hex('#6db234');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x * 0.6, y * 0.6, 3, 0);
      const c = lerpRGB(dark, light, n);
      // Add some dark speckles for detail
      const sp = noise(x * 1.3, y * 1.3, 7);
      if (sp > 0.82) { c[0] -= 15; c[1] -= 15; c[2] -= 10; }
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0);
    }
    // Scattered darker grass blades
    for (let i = 0; i < 6; i++) {
      const bx = Math.floor(hash(i,0,3) * TEX);
      const [r,g,b] = hex('#3d7818');
      for (let h = 0; h < 3; h++) setPixel(d, bx, h, r, g, b);
    }
  },

  grass_side: (d) => {
    const dirtBase = hex('#866043'), dirtDark = hex('#7a5535'), dirtLight = hex('#9a7050');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x * 0.7, y * 0.7, 2, 1);
      let c = lerpRGB(dirtDark, dirtLight, n);
      // Crack details
      if (noise(x * 2.1, y * 2.4, 99) > 0.88) { c = c.map(v => Math.max(0, v - 25)); }
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0);
    }
    // Grass band at top: 2-4px thick with jagged edge
    const grass = hex('#5d9e2b'), grassDark = hex('#4a8820'), grassSide = hex('#4d8820');
    for (let x = 0; x < TEX; x++) {
      const depth = 2 + Math.floor(noise(x * 1.5, 0, 5) * 3);
      for (let y = 0; y < depth; y++) {
        const shade = y === 0 ? grass : grassDark;
        setPixel(d, x, y, shade[0], shade[1], shade[2]);
      }
      // Transition row
      const [dr,dg,db] = getPixel(d, x, depth);
      const blend = lerpRGB(grassSide, [dr,dg,db], 0.5);
      setPixel(d, x, depth, blend[0]|0, blend[1]|0, blend[2]|0);
    }
  },

  dirt: (d) => {
    const base = hex('#866043'), dark = hex('#7a5535'), light = hex('#9a7050');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x * 0.7, y * 0.7, 2, 2);
      const c = lerpRGB(dark, light, n);
      if (noise(x * 2.2, y * 1.9, 88) > 0.9) { c[0] = Math.max(0, c[0]-18); c[1] = Math.max(0, c[1]-12); }
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0);
    }
  },

  stone: (d) => {
    const base = hex('#808080'), dark = hex('#696969'), light = hex('#999999');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x * 0.5, y * 0.5, 3, 3);
      const c = lerpRGB(dark, light, n);
      // Crack lines
      const cr = noise(x * 3.1, y * 2.9, 99);
      if (cr > 0.9) { c[0] = Math.max(0, c[0]-35); c[1] = Math.max(0, c[1]-35); c[2] = Math.max(0, c[2]-35); }
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0);
    }
  },

  cobblestone: (d) => {
    // Stone colored base
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x * 0.8, y * 0.8, 2, 4);
      const [r,g,b] = lerpRGB(hex('#606060'), hex('#a0a0a0'), n);
      setPixel(d, x, y, r|0, g|0, b|0);
    }
    // Mortar grid (dark lines creating cobble shapes)
    const mortarColor = hex('#444444');
    const grid = [
      // Horizontal mortar lines
      {x1:0,y1:4,x2:TEX,y2:4}, {x1:0,y1:8,x2:TEX,y2:8}, {x1:0,y1:12,x2:TEX,y2:12},
    ];
    for (let x = 0; x < TEX; x++) {
      for (const gy of [4,8,12]) setPixel(d, x, gy, ...mortarColor, 255);
    }
    for (let y = 0; y < TEX; y++) {
      // Staggered vertical mortar
      const offset = (Math.floor(y / 4) % 2) * 4;
      for (const gx of [0,4,8,12].map(v => (v + offset) % TEX)) {
        setPixel(d, gx, y, ...mortarColor, 255);
      }
    }
  },

  sand: (d) => {
    const base = hex('#dbc570'), dark = hex('#c9b158'), light = hex('#ede384');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x * 1.2, y * 1.2, 2, 5);
      const c = lerpRGB(dark, light, n);
      // Small grains
      if (noise(x * 3, y * 3, 44) > 0.78) { c[0] = Math.min(255,c[0]+12); c[1] = Math.min(255,c[1]+10); }
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0);
    }
  },

  gravel: (d) => {
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x * 1.5, y * 1.5, 2, 6);
      const c = lerpRGB(hex('#666666'), hex('#aaaaaa'), n);
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0);
    }
    // Pebble spots
    for (let i = 0; i < 14; i++) {
      const px = Math.floor(hash(i,0,7) * TEX);
      const py = Math.floor(hash(i,1,7) * TEX);
      const bright = hash(i,2,7) > 0.5;
      const [r,g,b] = bright ? hex('#999999') : hex('#555555');
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = (px+dx+TEX)%TEX, ny = (py+dy+TEX)%TEX;
        setPixel(d, nx, ny, r, g, b);
      }
    }
  },

  water: (d) => {
    const base = hex('#2d5fc0'), light = hex('#6090e8'), foam = hex('#90b8ff');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x * 0.8, y * 0.8, 2, 8);
      const c = lerpRGB(base, light, n);
      if (n > 0.72) { const t = (n-0.72)/0.28; const fc = lerpRGB(light, foam, t); c[0]=fc[0];c[1]=fc[1];c[2]=fc[2]; }
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0, 200);
    }
  },

  lava: (d) => {
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x * 0.6, y * 0.6, 3, 9);
      let c;
      if (n > 0.65) c = lerpRGB(hex('#ff6600'), hex('#ffaa00'), (n-0.65)/0.35);
      else if (n > 0.35) c = lerpRGB(hex('#cc3300'), hex('#ff6600'), (n-0.35)/0.3);
      else c = lerpRGB(hex('#551100'), hex('#cc3300'), n/0.35);
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0);
    }
  },

  bedrock: (d) => {
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x * 1.2, y * 1.2, 3, 10);
      const c = lerpRGB(hex('#111111'), hex('#444444'), n);
      if (noise(x*2,y*2,77) > 0.85) { c[0]=Math.min(255,c[0]+30); c[1]=Math.min(255,c[1]+30); c[2]=Math.min(255,c[2]+30); }
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0);
    }
  },

  // ── Wood ────────────────────────────────────────────────────────────────────
  wood_log_side: (d) => {
    const bark = hex('#7b5a1a'), barkLight = hex('#9c7030'), barkDark = hex('#5a3a08');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      // Vertical grain
      const n = snoise(x * 0.5, y * 2, 11) * 0.4 + snoise(x * 2, y * 0.3, 12) * 0.3;
      const c = lerpRGB(barkDark, barkLight, 0.3 + n);
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0);
    }
    // Left and right dark edges
    for (let y = 0; y < TEX; y++) {
      setPixel(d, 0, y, ...barkDark);
      setPixel(d, 15, y, ...barkDark);
    }
    // Horizontal bark line details
    for (let y = 2; y < TEX; y += 3) {
      if (noise(y, 0, 13) > 0.6) {
        for (let x = 1; x < TEX-1; x++) {
          const [r,g,b] = getPixel(d,x,y);
          setPixel(d, x, y, Math.max(0,r-20), Math.max(0,g-15), Math.max(0,b-8));
        }
      }
    }
  },

  wood_log_top: (d) => {
    const outerBark = hex('#7b5a1a'), innerWood = hex('#c8a020'), heartwood = hex('#8B4513');
    // Base wood color
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const cx2 = x - 7.5, cy2 = y - 7.5;
      const r2 = Math.sqrt(cx2*cx2 + cy2*cy2);
      let c;
      if (r2 > 6.5) c = outerBark;
      else if (r2 < 2) c = heartwood;
      else {
        const t = (r2 - 2) / 4.5;
        c = lerpRGB(heartwood, innerWood, t);
      }
      // Add grain noise
      const n = snoise(cx2*0.5, cy2*0.5, 14) * 0.15;
      c = c.map(v => Math.min(255, Math.max(0, v + n*40)));
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0);
    }
    // Rings
    for (let ring = 3; ring <= 6; ring++) {
      for (let a = 0; a < 360; a += 2) {
        const rad = a * Math.PI / 180;
        const rx = Math.round(7.5 + Math.cos(rad) * ring);
        const ry = Math.round(7.5 + Math.sin(rad) * ring);
        if (rx >= 0 && rx < TEX && ry >= 0 && ry < TEX) {
          const [r,g,b] = getPixel(d,rx,ry);
          setPixel(d, rx, ry, Math.max(0,r-30), Math.max(0,g-25), Math.max(0,b-10));
        }
      }
    }
  },

  birch_log_side: (d) => {
    const white = hex('#d6d0c8'), dark = hex('#2a2620'), gray = hex('#a0988a');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = snoise(x * 0.3, y * 0.8, 15);
      const c = lerpRGB(white, hex('#c0b8b0'), n * 0.3);
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0);
    }
    // Distinctive black marks
    const markRows = [1,2,5,6,10,11,14];
    for (const my of markRows) {
      if (noise(my,0,16) > 0.4) {
        const mx1 = Math.floor(hash(my,1,16) * 4) + 3;
        const mw  = Math.floor(hash(my,2,16) * 6) + 4;
        for (let x = mx1; x < mx1+mw && x < TEX; x++) {
          setPixel(d, x, my, ...dark);
          if (my+1 < TEX && noise(x,my,17) > 0.5) setPixel(d, x, my+1, ...gray);
        }
      }
    }
    // Edges slightly darker
    for (let y = 0; y < TEX; y++) {
      setPixel(d, 0, y, ...gray);
      setPixel(d, 15, y, ...gray);
    }
  },

  pine_log_side: (d) => {
    const base = hex('#5a3a18'), dark = hex('#3b2210'), light = hex('#7b5030');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = snoise(x*0.4, y*1.5, 18) * 0.5;
      const c = lerpRGB(dark, light, 0.2 + n);
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0);
    }
    for (let y = 0; y < TEX; y++) {
      setPixel(d, 0, y, ...dark);
      setPixel(d, 15, y, ...dark);
    }
  },

  leaves: (d) => {
    const base = hex('#4a9a20'), dark = hex('#357018'), light = hex('#5db030');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x*0.9, y*0.9, 2, 20);
      const c = lerpRGB(dark, light, n);
      // Some spots slightly lighter
      if (noise(x*1.5, y*1.5, 21) > 0.85) { c[0]=Math.min(255,c[0]+15); c[1]=Math.min(255,c[1]+20); }
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0);
    }
  },

  leaves_birch: (d) => {
    const base = hex('#6fc040'), dark = hex('#50a028'), light = hex('#88d050');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x*0.9, y*0.9, 2, 22);
      const c = lerpRGB(dark, light, n);
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0);
    }
  },

  leaves_pine: (d) => {
    const base = hex('#1a5e12'), dark = hex('#0a4208'), light = hex('#2a7020');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x*0.9, y*0.9, 2, 24);
      const c = lerpRGB(dark, light, n);
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0);
    }
  },

  // ── Planks ──────────────────────────────────────────────────────────────────
  planks_oak: (d) => {
    const base = hex('#a07038'), dark = hex('#7a5020'), light = hex('#c09050');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = snoise(x * 0.2, y * 2, 30) * 0.4 + 0.3;
      const c = lerpRGB(dark, light, n);
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0);
    }
    // Horizontal plank lines every 4px
    for (let y = 3; y < TEX; y += 4) {
      for (let x = 0; x < TEX; x++) setPixel(d, x, y, ...dark);
    }
    // Vertical plank join lines (staggered)
    for (let x = 0; x < TEX; x += 8) {
      for (let y = 0; y < 4; y++) setPixel(d, x, y, ...dark);
      for (let y = 4; y < 8; y++) setPixel(d, (x+4)%TEX, y, ...dark);
      for (let y = 8; y < 12; y++) setPixel(d, x, y, ...dark);
      for (let y = 12; y < TEX; y++) setPixel(d, (x+4)%TEX, y, ...dark);
    }
  },

  planks_birch: (d) => {
    const base = hex('#c8b070'), dark = hex('#a08848'), light = hex('#e0c888');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = snoise(x * 0.2, y * 2, 31) * 0.4 + 0.3;
      const c = lerpRGB(dark, light, n);
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0);
    }
    for (let y = 3; y < TEX; y += 4) for (let x = 0; x < TEX; x++) setPixel(d, x, y, ...dark);
    for (let x = 0; x < TEX; x += 8) {
      for (let y = 0; y < 4; y++) setPixel(d, x, y, ...dark);
      for (let y = 4; y < 8; y++) setPixel(d, (x+4)%TEX, y, ...dark);
      for (let y = 8; y < 12; y++) setPixel(d, x, y, ...dark);
      for (let y = 12; y < TEX; y++) setPixel(d, (x+4)%TEX, y, ...dark);
    }
  },

  planks_pine: (d) => {
    const base = hex('#804e20'), dark = hex('#5c3010'), light = hex('#a86830');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = snoise(x * 0.2, y * 2, 32) * 0.4 + 0.3;
      const c = lerpRGB(dark, light, n);
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0);
    }
    for (let y = 3; y < TEX; y += 4) for (let x = 0; x < TEX; x++) setPixel(d, x, y, ...dark);
    for (let x = 0; x < TEX; x += 8) {
      for (let y = 0; y < 4; y++) setPixel(d, x, y, ...dark);
      for (let y = 4; y < 8; y++) setPixel(d, (x+4)%TEX, y, ...dark);
      for (let y = 8; y < 12; y++) setPixel(d, x, y, ...dark);
      for (let y = 12; y < TEX; y++) setPixel(d, (x+4)%TEX, y, ...dark);
    }
  },

  // ── Special ──────────────────────────────────────────────────────────────────
  glass: (d) => {
    const frame = hex('#8ab8d4'), pane = hex('#a0cce0');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const isEdge = x===0||x===TEX-1||y===0||y===TEX-1;
      const isInner = x===1||x===TEX-2||y===1||y===TEX-2;
      if (isEdge || isInner) {
        setPixel(d, x, y, ...frame, 240);
      } else {
        const n = snoise(x*0.5, y*0.5, 33) * 0.15;
        const [r,g,b] = lerpRGB(pane, hex('#d0eeff'), n);
        // Diagonal highlight
        const diagH = Math.abs(x - y) < 2 || Math.abs(x - (TEX-1-y)) < 2;
        if (diagH) setPixel(d, x, y, Math.min(255,r+30)|0, Math.min(255,g+30)|0, Math.min(255,b+30)|0, 160);
        else setPixel(d, x, y, r|0, g|0, b|0, 140);
      }
    }
  },

  brick: (d) => {
    const brickC = hex('#a04530'), mortarC = hex('#888888');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) setPixel(d, x, y, ...mortarC);
    // Draw bricks
    const rows = [[0,3],[4,7],[8,11],[12,15]];
    for (const [y1,y2] of rows) {
      const offset = (Math.floor(y1/4) % 2) * 5;
      for (let bx = -1; bx < TEX; bx += 9) {
        const sx = (bx + offset + TEX) % (TEX+1) - 0;
        for (let y = y1+1; y <= y2; y++) {
          for (let x = sx+1; x < sx+8 && x < TEX; x++) {
            if (x >= 0) {
              const n = snoise(x * 0.5, y * 0.5, 34) * 0.15;
              const [r,g,b] = lerpRGB(hex('#8b3520'), brickC, 0.5+n);
              setPixel(d, x, y, r|0, g|0, b|0);
            }
          }
        }
      }
    }
  },

  sandstone: (d) => {
    const base = hex('#d4b860'), dark = hex('#b89840'), light = hex('#e8cc78');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x*0.5, y*0.5, 2, 35);
      const c = lerpRGB(dark, light, n);
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0);
    }
    // Horizontal layer lines
    for (let y = 4; y < TEX; y += 4) {
      for (let x = 0; x < TEX; x++) {
        const [r,g,b] = getPixel(d,x,y);
        setPixel(d, x, y, Math.max(0,r-30), Math.max(0,g-25), Math.max(0,b-15));
      }
    }
  },

  snow: (d) => {
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x*0.8, y*0.8, 2, 36);
      const v = 230 + (n * 25)|0;
      setPixel(d, x, y, Math.min(255,v), Math.min(255,v+3), Math.min(255,v+5));
    }
  },

  ice: (d) => {
    const base = hex('#90b8d8'), light = hex('#b8d8f0');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x*0.6, y*0.6, 2, 37);
      const c = lerpRGB(base, light, n);
      // Cracks
      const cr = noise(x*2, y*2, 38);
      if (cr > 0.88) { c[0]=Math.max(0,c[0]-40); c[1]=Math.max(0,c[1]-30); c[2]=Math.max(0,c[2]-20); }
      setPixel(d, x, y, c[0]|0, c[1]|0, c[2]|0, 200);
    }
  },

  obsidian: (d) => {
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x*0.8, y*0.8, 3, 39);
      const [r,g,b] = lerpRGB(hex('#0a0518'), hex('#251040'), n);
      // Purple shimmer veins
      const v = snoise(x*1.2, y*1.2, 40);
      if (v > 0.72) {
        setPixel(d, x, y, Math.min(255,r+60), Math.min(255,g+20), Math.min(255,b+80));
      } else {
        setPixel(d, x, y, r|0, g|0, b|0);
      }
    }
  },

  // ── Ores ────────────────────────────────────────────────────────────────────
  coal_ore: (d) => {
    // Stone base
    DEFS.stone(d);
    // Coal veins (dark angular blobs)
    for (let i = 0; i < 4; i++) {
      const ox = Math.floor(hash(i,0,41) * 10) + 2;
      const oy = Math.floor(hash(i,1,41) * 10) + 2;
      const w = 2 + (hash(i,2,41) > 0.5 ? 1 : 0);
      const h = 2 + (hash(i,3,41) > 0.5 ? 1 : 0);
      for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
        if (ox+dx < TEX && oy+dy < TEX) setPixel(d, ox+dx, oy+dy, 20, 20, 20);
      }
    }
  },

  iron_ore: (d) => {
    DEFS.stone(d);
    const oreC = hex('#d49070');
    for (let i = 0; i < 4; i++) {
      const ox = Math.floor(hash(i,0,42) * 10) + 1;
      const oy = Math.floor(hash(i,1,42) * 10) + 1;
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
        if (ox+dx < TEX && oy+dy < TEX) setPixel(d, ox+dx, oy+dy, ...oreC);
      }
    }
  },

  gold_ore: (d) => {
    DEFS.stone(d);
    const oreC = hex('#f0d020');
    for (let i = 0; i < 4; i++) {
      const ox = Math.floor(hash(i,0,43) * 10) + 1;
      const oy = Math.floor(hash(i,1,43) * 10) + 1;
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
        if (ox+dx < TEX && oy+dy < TEX) setPixel(d, ox+dx, oy+dy, ...oreC);
      }
    }
  },

  diamond_ore: (d) => {
    DEFS.stone(d);
    const oreC = hex('#40ddd8');
    for (let i = 0; i < 3; i++) {
      const ox = Math.floor(hash(i,0,44) * 10) + 1;
      const oy = Math.floor(hash(i,1,44) * 10) + 1;
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
        if (ox+dx < TEX && oy+dy < TEX) setPixel(d, ox+dx, oy+dy, ...oreC);
      }
    }
  },

  emerald_ore: (d) => {
    DEFS.stone(d);
    const oreC = hex('#28c848');
    for (let i = 0; i < 3; i++) {
      const ox = Math.floor(hash(i,0,45) * 10) + 1;
      const oy = Math.floor(hash(i,1,45) * 10) + 1;
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
        if (ox+dx < TEX && oy+dy < TEX) setPixel(d, ox+dx, oy+dy, ...oreC);
      }
    }
  },

  // ── Misc terrain ─────────────────────────────────────────────────────────────
  clay: (d) => {
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x*0.6, y*0.6, 2, 46);
      const [r,g,b] = lerpRGB(hex('#8a9ba8'), hex('#b0c0cc'), n);
      setPixel(d, x, y, r|0, g|0, b|0);
    }
  },

  mycelium: (d) => {
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x*0.8, y*0.8, 2, 47);
      const [r,g,b] = lerpRGB(hex('#5a4868'), hex('#8a7898'), n);
      setPixel(d, x, y, r|0, g|0, b|0);
    }
    // White spore dots
    for (let i = 0; i < 10; i++) {
      const wx = Math.floor(hash(i,0,48) * TEX);
      const wy = Math.floor(hash(i,1,48) * TEX);
      setPixel(d, wx, wy, 255, 255, 255);
    }
  },

  podzol_top: (d) => {
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x*0.7, y*0.7, 2, 49);
      const [r,g,b] = lerpRGB(hex('#6a4520'), hex('#8a6538'), n);
      setPixel(d, x, y, r|0, g|0, b|0);
    }
  },

  red_sand: (d) => {
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x*1.2, y*1.2, 2, 50);
      const [r,g,b] = lerpRGB(hex('#b85010'), hex('#d87030'), n);
      setPixel(d, x, y, r|0, g|0, b|0);
    }
  },

  terracotta: (d) => {
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x*0.7, y*0.7, 2, 51);
      const [r,g,b] = lerpRGB(hex('#904840'), hex('#b06858'), n);
      // Cracks
      if (noise(x*2,y*2,52) > 0.88) setPixel(d, x, y, Math.max(0,r-30)|0, Math.max(0,g-25)|0, Math.max(0,b-20)|0);
      else setPixel(d, x, y, r|0, g|0, b|0);
    }
  },

  glowstone: (d) => {
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x*0.8, y*0.8, 2, 53);
      const [r,g,b] = lerpRGB(hex('#c89020'), hex('#fce040'), n);
      // Bright spot texture
      const sp = noise(x*1.5, y*1.5, 54);
      if (sp > 0.7) setPixel(d, x, y, Math.min(255,r+30)|0, Math.min(255,g+25)|0, Math.min(255,b+0)|0);
      else setPixel(d, x, y, r|0, g|0, b|0);
    }
  },

  netherrack: (d) => {
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x*0.9, y*0.9, 3, 55);
      const [r,g,b] = lerpRGB(hex('#6a1010'), hex('#9a3030'), n);
      if (noise(x*2.5, y*2.5, 56) > 0.88) setPixel(d, x, y, Math.max(0,r-30)|0, Math.max(0,g-20)|0, Math.max(0,b-15)|0);
      else setPixel(d, x, y, r|0, g|0, b|0);
    }
  },

  crafting_table_top: (d) => {
    DEFS.planks_oak(d);
    // Grid overlay
    const lineC = hex('#5a3010');
    for (let x = 0; x < TEX; x++) {
      setPixel(d, x, 4, ...lineC);
      setPixel(d, x, 10, ...lineC);
    }
    for (let y = 0; y < TEX; y++) {
      setPixel(d, 4, y, ...lineC);
      setPixel(d, 10, y, ...lineC);
    }
  },

  furnace_front: (d) => {
    DEFS.stone(d);
    // Door frame
    const frame = hex('#333333'), fire = hex('#ff6600'), glow = hex('#ffcc00');
    for (let x = 3; x <= 12; x++) for (let y = 7; y <= 14; y++) setPixel(d, x, y, ...frame);
    // Fire inside
    for (let x = 4; x <= 11; x++) for (let y = 8; y <= 13; y++) {
      const n = fbm(x*0.8, y*0.5, 2, 57);
      const [r,g,b] = lerpRGB(fire, glow, n);
      setPixel(d, x, y, r|0, g|0, b|0);
    }
    // Vent dots top
    for (let i = 4; i <= 11; i += 2) setPixel(d, i, 5, ...frame);
  },

  farmland: (d) => {
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x*0.8, y*0.8, 2, 58);
      const [r,g,b] = lerpRGB(hex('#5c3a18'), hex('#7a5530'), n);
      setPixel(d, x, y, r|0, g|0, b|0);
    }
    // Furrows
    for (let y = 3; y < TEX; y += 4) {
      for (let x = 0; x < TEX; x++) {
        const [r,g,b] = getPixel(d,x,y);
        setPixel(d, x, y, Math.max(0,r-15), Math.max(0,g-10), Math.max(0,b-8));
      }
    }
  },

  wheat_top: (d) => {
    // Transparent bg
    for (let i = 0; i < TEX*TEX*4; i+=4) { d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0; }
    // Wheat stalks
    const stalk = hex('#c8a820'), grain = hex('#f0d840'), stem = hex('#6a8820');
    for (let x = 0; x < TEX; x += 4) {
      const h = 8 + Math.floor(hash(x, 0, 59) * 5);
      // Stem
      for (let y = TEX-1; y >= TEX-h; y--) setPixel(d, x+1, y, ...stem);
      // Grain head
      setPixel(d, x, TEX-h, ...grain);
      setPixel(d, x+1, TEX-h-1, ...grain);
      setPixel(d, x+2, TEX-h, ...grain);
      setPixel(d, x+1, TEX-h+1, ...stalk);
    }
  },

  bookshelf: (d) => {
    DEFS.planks_oak(d);
    // Books on shelves
    const bookColors = [hex('#cc3333'),hex('#33aa33'),hex('#3344cc'),hex('#cc8833'),hex('#8833cc'),hex('#33aacc')];
    for (let row = 0; row < 3; row++) {
      const y1 = row * 5 + 1, y2 = row * 5 + 4;
      let bx = 1;
      for (let i = 0; bx < TEX-1; i++) {
        const bw = 2 + (hash(i+row*6, 0, 60) > 0.5 ? 1 : 0);
        const bc = bookColors[i % bookColors.length];
        for (let y = y1; y <= y2; y++) for (let x = bx; x < bx+bw && x < TEX-1; x++) setPixel(d, x, y, ...bc);
        bx += bw + 1;
      }
    }
  },

  stone_brick: (d) => {
    DEFS.stone(d);
    // Mortar lines
    const mortar = hex('#555555');
    for (let x = 0; x < TEX; x++) { setPixel(d, x, 0, ...mortar); setPixel(d, x, 8, ...mortar); setPixel(d, x, 15, ...mortar); }
    for (let y = 0; y < 8; y++) { setPixel(d, 8, y, ...mortar); }
    for (let y = 8; y < TEX; y++) { setPixel(d, 0, y, ...mortar); setPixel(d, 8, y, ...mortar); }
  },

  mossy_cobble: (d) => {
    DEFS.cobblestone(d);
    // Moss overlay
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x*1.2, y*1.2, 2, 61);
      if (n > 0.65) {
        const t = (n-0.65)/0.35;
        const [r,g,b] = getPixel(d, x, y);
        const [mr,mg,mb] = hex('#2a8a20');
        setPixel(d, x, y, lerpRGB([r,g,b],[mr,mg,mb],t*0.7)[0]|0, lerpRGB([r,g,b],[mr,mg,mb],t*0.7)[1]|0, lerpRGB([r,g,b],[mr,mg,mb],t*0.7)[2]|0);
      }
    }
  },

  cactus_side: (d) => {
    const base = hex('#2a7a1a'), dark = hex('#1a5a08'), light = hex('#3a8a2a');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = snoise(x * 0.3, y * 2, 62);
      const [r,g,b] = lerpRGB(dark, light, 0.3+n*0.5);
      setPixel(d, x, y, r|0, g|0, b|0);
    }
    for (let y = 2; y < TEX; y += 4) {
      const [r,g,b] = hex('#4a9a38');
      for (let x = 0; x < TEX; x++) setPixel(d, x, y, r|0, g|0, b|0);
    }
    // Spine dots
    for (let y = 3; y < TEX; y += 4) {
      setPixel(d, 0, y, ...hex('#f0e0a0'));
      setPixel(d, TEX-1, y, ...hex('#f0e0a0'));
    }
  },

  cactus_top: (d) => {
    const base = hex('#1a5a08'), mid = hex('#2a7a1a'), center = hex('#3a8a2a');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const cx2 = x-7.5, cy2 = y-7.5;
      const r2 = Math.sqrt(cx2*cx2+cy2*cy2);
      const [r,g,b] = r2 < 3 ? center : r2 < 6 ? mid : base;
      setPixel(d, x, y, r|0, g|0, b|0);
    }
  },

  soul_sand: (d) => {
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const n = fbm(x*0.7, y*0.7, 2, 63);
      const [r,g,b] = lerpRGB(hex('#3a2010'), hex('#5a4030'), n);
      setPixel(d, x, y, r|0, g|0, b|0);
    }
    // Creepy face
    const faceX = 4, faceY = 4;
    // Eyes
    setPixel(d, faceX, faceY, 10, 5, 0);
    setPixel(d, faceX+1, faceY, 10, 5, 0);
    setPixel(d, faceX+5, faceY, 10, 5, 0);
    setPixel(d, faceX+6, faceY, 10, 5, 0);
    // Mouth
    for (let x = faceX+1; x <= faceX+6; x++) setPixel(d, x, faceY+5, 10, 5, 0);
    setPixel(d, faceX+1, faceY+4, 10, 5, 0);
    setPixel(d, faceX+6, faceY+4, 10, 5, 0);
  },

  // ── Wool ────────────────────────────────────────────────────────────────────
  wool_white:  (d) => { for (let y=0;y<TEX;y++) for (let x=0;x<TEX;x++) { const n=fbm(x*.8,y*.8,2,70); const v=lerpRGB(hex('#d8d8d8'),hex('#ffffff'),n); setPixel(d,x,y,v[0]|0,v[1]|0,v[2]|0); } },
  wool_red:    (d) => { for (let y=0;y<TEX;y++) for (let x=0;x<TEX;x++) { const n=fbm(x*.8,y*.8,2,71); const v=lerpRGB(hex('#aa1111'),hex('#dd3333'),n); setPixel(d,x,y,v[0]|0,v[1]|0,v[2]|0); } },
  wool_green:  (d) => { for (let y=0;y<TEX;y++) for (let x=0;x<TEX;x++) { const n=fbm(x*.8,y*.8,2,72); const v=lerpRGB(hex('#115511'),hex('#337733'),n); setPixel(d,x,y,v[0]|0,v[1]|0,v[2]|0); } },
  wool_blue:   (d) => { for (let y=0;y<TEX;y++) for (let x=0;x<TEX;x++) { const n=fbm(x*.8,y*.8,2,73); const v=lerpRGB(hex('#1133aa'),hex('#3355cc'),n); setPixel(d,x,y,v[0]|0,v[1]|0,v[2]|0); } },
  wool_yellow: (d) => { for (let y=0;y<TEX;y++) for (let x=0;x<TEX;x++) { const n=fbm(x*.8,y*.8,2,74); const v=lerpRGB(hex('#ccaa00'),hex('#eecc22'),n); setPixel(d,x,y,v[0]|0,v[1]|0,v[2]|0); } },
  wool_orange: (d) => { for (let y=0;y<TEX;y++) for (let x=0;x<TEX;x++) { const n=fbm(x*.8,y*.8,2,75); const v=lerpRGB(hex('#cc5500'),hex('#ee7722'),n); setPixel(d,x,y,v[0]|0,v[1]|0,v[2]|0); } },
  wool_purple: (d) => { for (let y=0;y<TEX;y++) for (let x=0;x<TEX;x++) { const n=fbm(x*.8,y*.8,2,76); const v=lerpRGB(hex('#661177'),hex('#9933aa'),n); setPixel(d,x,y,v[0]|0,v[1]|0,v[2]|0); } },
  wool_black:  (d) => { for (let y=0;y<TEX;y++) for (let x=0;x<TEX;x++) { const n=fbm(x*.8,y*.8,2,77); const v=lerpRGB(hex('#111111'),hex('#333333'),n); setPixel(d,x,y,v[0]|0,v[1]|0,v[2]|0); } },
  wool_cyan:   (d) => { for (let y=0;y<TEX;y++) for (let x=0;x<TEX;x++) { const n=fbm(x*.8,y*.8,2,78); const v=lerpRGB(hex('#007777'),hex('#22aaaa'),n); setPixel(d,x,y,v[0]|0,v[1]|0,v[2]|0); } },
  wool_pink:   (d) => { for (let y=0;y<TEX;y++) for (let x=0;x<TEX;x++) { const n=fbm(x*.8,y*.8,2,79); const v=lerpRGB(hex('#dd6699'),hex('#ffaacc'),n); setPixel(d,x,y,v[0]|0,v[1]|0,v[2]|0); } },

  // ── Sprites ────────────────────────────────────────────────────────────────
  flower_rose: (d) => {
    for (let i = 0; i < TEX*TEX*4; i+=4) { d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0; }
    // Stem
    for (let y = 5; y < TEX; y++) setPixel(d, 7, y, ...hex('#4a8820'));
    for (let y = 7; y < TEX; y++) setPixel(d, 8, y, ...hex('#4a8820'));
    // Leaf
    setPixel(d, 5, 9, ...hex('#3a7815'));
    setPixel(d, 6, 9, ...hex('#3a7815'));
    // Petals
    const petalC = hex('#dd2222');
    for (const [dx,dy] of [[-2,-1],[-1,-2],[0,-3],[1,-2],[2,-1],[2,0],[1,1],[0,2],[-1,1],[-2,0]]) {
      setPixel(d, 7+dx, 5+dy, ...petalC);
    }
    setPixel(d, 7, 5, ...hex('#ffcc00')); // Center
    setPixel(d, 8, 5, ...hex('#ffcc00'));
  },

  flower_yellow: (d) => {
    for (let i = 0; i < TEX*TEX*4; i+=4) { d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0; }
    for (let y = 5; y < TEX; y++) setPixel(d, 7, y, ...hex('#4a8820'));
    for (let y = 7; y < TEX; y++) setPixel(d, 8, y, ...hex('#4a8820'));
    setPixel(d, 5, 9, ...hex('#3a7815'));
    const petalC = hex('#f0d800');
    for (const [dx,dy] of [[-2,-1],[-1,-2],[0,-3],[1,-2],[2,-1],[2,0],[1,1],[0,2],[-1,1],[-2,0]]) {
      setPixel(d, 7+dx, 5+dy, ...petalC);
    }
    setPixel(d, 7, 5, ...hex('#cc8800'));
    setPixel(d, 8, 5, ...hex('#cc8800'));
  },

  mushroom_red: (d) => {
    for (let i = 0; i < TEX*TEX*4; i+=4) { d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0; }
    // Stem
    for (let x = 6; x <= 9; x++) for (let y = 10; y < TEX; y++) setPixel(d, x, y, ...hex('#cccccc'));
    // Cap
    const capC = hex('#cc2222');
    for (let x = 2; x < TEX-2; x++) {
      const h = Math.floor(5 - Math.abs(x-7.5) * 0.8);
      for (let y = 10-h; y <= 10; y++) setPixel(d, x, y, ...capC);
    }
    // White spots
    for (const [sx,sy] of [[4,8],[9,7],[6,6],[11,8]]) setPixel(d, sx, sy, 255, 255, 255);
  },

  tall_grass: (d) => {
    for (let i = 0; i < TEX*TEX*4; i+=4) { d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0; }
    for (let i = 0; i < 7; i++) {
      const bx = Math.floor(hash(i,0,80) * 12) + 1;
      const h  = 7 + Math.floor(hash(i,1,80) * 8);
      const isLong = hash(i,2,80) > 0.5;
      const c = isLong ? hex('#4a8a18') : hex('#3a7a08');
      for (let y = TEX-1; y >= TEX-h; y--) {
        // Slight lean
        const lean = Math.floor((TEX-1-y) / h * (isLong ? 2 : 1));
        const px = Math.min(TEX-1, Math.max(0, bx + lean));
        setPixel(d, px, y, ...c);
        setPixel(d, px-1, y, ...c); // 2px wide
      }
    }
  },

  // ── Items (small icons in inventory) ──────────────────────────────────────
  item_coal: (d) => {
    for (let i = 0; i < TEX*TEX*4; i+=4) { d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0; }
    // Coal lump shape
    const c = hex('#111111');
    const sp = hex('#333333');
    for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) {
      const dist = Math.abs(x-8)+Math.abs(y-8);
      if (dist < 6) setPixel(d, x, y, ...(noise(x,y,81)>0.7?sp:c));
    }
  },

  item_iron_ingot: (d) => {
    for (let i = 0; i < TEX*TEX*4; i+=4) { d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0; }
    const c = hex('#c8c8c8'), dark = hex('#888888');
    for (let y = 5; y < 13; y++) for (let x = 3; x < 13; x++) {
      const isTop = y === 5, isBot = y === 12;
      setPixel(d, x, y, ...(isTop||isBot ? dark : c));
    }
  },

  item_gold_ingot: (d) => {
    for (let i = 0; i < TEX*TEX*4; i+=4) { d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0; }
    const c = hex('#f0c820'), dark = hex('#c09010');
    for (let y = 5; y < 13; y++) for (let x = 3; x < 13; x++) setPixel(d, x, y, ...(y===5||y===12?dark:c));
  },

  item_diamond: (d) => {
    for (let i = 0; i < TEX*TEX*4; i+=4) { d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0; }
    // Diamond shape
    const c = hex('#40d8d0'), light = hex('#80f0e8');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const dist = Math.abs(x-8)/5 + Math.abs(y-8)/7;
      if (dist < 1.0) setPixel(d, x, y, ...(dist<0.5?light:c));
    }
  },

  item_emerald: (d) => {
    for (let i = 0; i < TEX*TEX*4; i+=4) { d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0; }
    const c = hex('#28c840'), light = hex('#60e870');
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const dist = Math.abs(x-8)/5 + Math.abs(y-8)/7;
      if (dist < 1.0) setPixel(d, x, y, ...(dist<0.5?light:c));
    }
  },

  item_stick: (d) => {
    for (let i = 0; i < TEX*TEX*4; i+=4) { d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0; }
    const c = hex('#9b6020'), dark = hex('#7a4a10');
    for (let y = 1; y < TEX-1; y++) {
      setPixel(d, 6+((y%2)), y, ...c);
      setPixel(d, 7+((y%2)), y, ...dark);
    }
  },

  item_seeds: (d) => {
    for (let i = 0; i < TEX*TEX*4; i+=4) { d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0; }
    const c = hex('#c8a820');
    for (let i = 0; i < 5; i++) {
      const sx = 3 + Math.floor(hash(i,0,82) * 10);
      const sy = 3 + Math.floor(hash(i,1,82) * 10);
      setPixel(d, sx, sy, ...c);
      setPixel(d, sx+1, sy, ...c);
    }
  },

  item_apple: (d) => {
    for (let i = 0; i < TEX*TEX*4; i+=4) { d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0; }
    const c = hex('#cc2222'), light = hex('#ee4444'), stem = hex('#6a4a10');
    for (let y = 3; y < 14; y++) for (let x = 3; x < 13; x++) {
      const cx2=x-8, cy2=y-8.5;
      if (cx2*cx2/18+cy2*cy2/20 < 1) setPixel(d, x, y, ...(cx2<-1&&cy2<0?light:c));
    }
    setPixel(d, 8, 2, ...stem);
    setPixel(d, 8, 3, ...stem);
  },

  item_bread: (d) => {
    for (let i = 0; i < TEX*TEX*4; i+=4) { d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0; }
    const crust = hex('#c87830'), inside = hex('#e8a850');
    for (let y = 5; y < 12; y++) for (let x = 2; x < 14; x++) {
      const isEdge = x<=3||x>=12||y<=5||y>=11;
      setPixel(d, x, y, ...(isEdge?crust:inside));
    }
    // Top dome
    for (let x = 4; x < 12; x++) setPixel(d, x, 4, ...crust);
    for (let x = 5; x < 11; x++) setPixel(d, x, 3, ...crust);
  },

  item_raw_beef: (d) => {
    for (let i = 0; i < TEX*TEX*4; i+=4) { d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0; }
    const c = hex('#c04040'), fat = hex('#f0d0a0');
    for (let y = 4; y < 13; y++) for (let x = 3; x < 13; x++) {
      if (fbm(x*.8,y*.8,2,83)>0.6) setPixel(d, x, y, ...fat);
      else setPixel(d, x, y, ...c);
    }
  },

  item_cooked_beef: (d) => {
    for (let i = 0; i < TEX*TEX*4; i+=4) { d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0; }
    const c = hex('#6b2a0a'), light = hex('#8b4a1a');
    for (let y = 4; y < 13; y++) for (let x = 3; x < 13; x++) {
      setPixel(d, x, y, ...(noise(x,y,84)>0.5?light:c));
    }
  },

  item_rotten_flesh: (d) => {
    for (let i = 0; i < TEX*TEX*4; i+=4) { d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0; }
    const c = hex('#665544'), green = hex('#448844');
    for (let y = 4; y < 13; y++) for (let x = 3; x < 13; x++) {
      setPixel(d, x, y, ...(fbm(x*.8,y*.8,2,85)>0.65?green:c));
    }
  },

  item_raw_chicken: (d) => {
    for (let i = 0; i < TEX*TEX*4; i+=4) { d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0; }
    const c = hex('#e0a080');
    for (let y = 4; y < 13; y++) for (let x = 4; x < 12; x++) setPixel(d, x, y, ...c);
  },

  item_cooked_chicken: (d) => {
    for (let i = 0; i < TEX*TEX*4; i+=4) { d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0; }
    const c = hex('#c07838'), dark = hex('#904820');
    for (let y = 4; y < 13; y++) for (let x = 4; x < 12; x++) {
      setPixel(d, x, y, ...(noise(x,y,86)>0.5?dark:c));
    }
  },
};

// ── Build the atlas ────────────────────────────────────────────────────────────
export class TextureManager {
  constructor() {
    this._atlas = null;
    this._atlasUVs = new Map();
    this._build();
  }

  _build() {
    const names = Object.keys(DEFS);
    const cols  = 16;
    const rows  = Math.ceil(names.length / cols);
    const aw = cols * TEX, ah = rows * TEX;

    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = aw; atlasCanvas.height = ah;
    const actx = atlasCanvas.getContext('2d');
    actx.imageSmoothingEnabled = false;

    names.forEach((name, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const tc  = makeCanvas(DEFS[name]);
      actx.drawImage(tc, col * TEX, row * TEX);

      const u0 = (col * TEX) / aw;
      const v0 = (row * TEX) / ah;
      const u1 = u0 + TEX / aw;
      const v1 = v0 + TEX / ah;
      this._atlasUVs.set(name, [u0, v0, u1, v1]);
    });

    const tex = new THREE.CanvasTexture(atlasCanvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    this._atlas = tex;

    this._atlasUVs.set('fallback', [0, 0, TEX/aw, TEX/ah]);
  }

  getAtlas() { return this._atlas; }

  getUVs(name) {
    return this._atlasUVs.get(name) || this._atlasUVs.get('fallback');
  }
}
