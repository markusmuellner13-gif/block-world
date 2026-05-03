import * as THREE from 'three';
import { BLOCKS } from '../world/BlockRegistry.js';

const BLOCK_PARTICLE_COLOR = {
  [BLOCKS.GRASS]:          0x5da62c,
  [BLOCKS.DIRT]:           0x866043,
  [BLOCKS.STONE]:          0x808080,
  [BLOCKS.COBBLESTONE]:    0x888888,
  [BLOCKS.SAND]:           0xd4b860,
  [BLOCKS.GRAVEL]:         0x888888,
  [BLOCKS.WATER]:          0x3f76e4,
  [BLOCKS.LAVA]:           0xff4400,
  [BLOCKS.BEDROCK]:        0x333333,
  [BLOCKS.WOOD_LOG]:       0x9b7826,
  [BLOCKS.BIRCH_LOG]:      0xdddddd,
  [BLOCKS.PINE_LOG]:       0x6b4a20,
  [BLOCKS.LEAVES]:         0x4a9e20,
  [BLOCKS.LEAVES_BIRCH]:   0x5db030,
  [BLOCKS.LEAVES_PINE]:    0x1e6a14,
  [BLOCKS.PLANKS_OAK]:     0xa07038,
  [BLOCKS.PLANKS_BIRCH]:   0xcdb87a,
  [BLOCKS.PLANKS_PINE]:    0x8b5a28,
  [BLOCKS.GLASS]:          0xa0c8e8,
  [BLOCKS.BRICK]:          0x9e4a2a,
  [BLOCKS.SANDSTONE]:      0xd4b860,
  [BLOCKS.SNOW]:           0xf0f4f8,
  [BLOCKS.ICE]:            0xa0c8e8,
  [BLOCKS.OBSIDIAN]:       0x1a0a2e,
  [BLOCKS.COAL_ORE]:       0x444444,
  [BLOCKS.IRON_ORE]:       0xd4967a,
  [BLOCKS.GOLD_ORE]:       0xf0c820,
  [BLOCKS.DIAMOND_ORE]:    0x50e8e0,
  [BLOCKS.EMERALD_ORE]:    0x30d050,
  [BLOCKS.CLAY]:           0x9aacb8,
  [BLOCKS.MYCELIUM]:       0x7a6888,
  [BLOCKS.PODZOL]:         0x7a5530,
  [BLOCKS.RED_SAND]:       0xc86020,
  [BLOCKS.TERRACOTTA]:     0xa0604a,
  [BLOCKS.GLOWSTONE]:      0xf8d040,
  [BLOCKS.NETHERRACK]:     0x8b2020,
  [BLOCKS.CRAFTING_TABLE]: 0xa07038,
  [BLOCKS.FURNACE]:        0x808080,
  [BLOCKS.FARMLAND]:       0x6b4a28,
  [BLOCKS.BOOKSHELF]:      0xa07038,
  [BLOCKS.STONE_BRICK]:    0x888888,
  [BLOCKS.MOSSY_COBBLE]:   0x668866,
  [BLOCKS.CACTUS]:         0x2a7a1a,
  [BLOCKS.SOUL_SAND]:      0x4a3020,
  [BLOCKS.WOOL_WHITE]:     0xf0f0f0,
  [BLOCKS.WOOL_RED]:       0xcc2222,
  [BLOCKS.WOOL_GREEN]:     0x226622,
  [BLOCKS.WOOL_BLUE]:      0x2244cc,
  [BLOCKS.WOOL_YELLOW]:    0xeecc11,
  [BLOCKS.WOOL_ORANGE]:    0xee7711,
  [BLOCKS.WOOL_PURPLE]:    0x882299,
  [BLOCKS.WOOL_BLACK]:     0x222222,
  [BLOCKS.WOOL_CYAN]:      0x119999,
  [BLOCKS.WOOL_PINK]:      0xee88aa,
};

export class ParticleSystem {
  constructor(scene) {
    this.scene   = scene;
    this._active = [];
  }

  // Generic point-cloud burst
  burst(wx, wy, wz, colorHex, count = 12, speed = 4, upBias = 1.5) {
    const positions  = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i*3]   = wx + 0.5 + (Math.random() - 0.5) * 0.6;
      positions[i*3+1] = wy + 0.5 + (Math.random() - 0.5) * 0.6;
      positions[i*3+2] = wz + 0.5 + (Math.random() - 0.5) * 0.6;
      velocities[i*3]   = (Math.random() - 0.5) * speed;
      velocities[i*3+1] = upBias + Math.random() * speed * 0.5;
      velocities[i*3+2] = (Math.random() - 0.5) * speed;
    }
    this._spawn(positions, velocities, colorHex, 0.18, 0.65);
  }

  // Block break — auto-picks color from block ID
  blockBurst(wx, wy, wz, blockId) {
    this.burst(wx, wy, wz, BLOCK_PARTICLE_COLOR[blockId] ?? 0x808080);
  }

  // Water splash — upward fountain of blue drops
  splash(wx, wy, wz) {
    const count     = 16;
    const positions  = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i*3]   = wx + 0.5 + (Math.random() - 0.5) * 0.8;
      positions[i*3+1] = wy + 0.5;
      positions[i*3+2] = wz + 0.5 + (Math.random() - 0.5) * 0.8;
      const angle = Math.random() * Math.PI * 2;
      const r     = Math.random() * 2;
      velocities[i*3]   = Math.cos(angle) * r;
      velocities[i*3+1] = 3 + Math.random() * 4;
      velocities[i*3+2] = Math.sin(angle) * r;
    }
    this._spawn(positions, velocities, 0x3f76e4, 0.15, 0.7);
  }

  // Rising smoke — slow gray particles for fire/furnace/lava
  smoke(wx, wy, wz) {
    const count     = 6;
    const positions  = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i*3]   = wx + 0.5 + (Math.random() - 0.5) * 0.4;
      positions[i*3+1] = wy + 1.0;
      positions[i*3+2] = wz + 0.5 + (Math.random() - 0.5) * 0.4;
      velocities[i*3]   = (Math.random() - 0.5) * 0.6;
      velocities[i*3+1] = 0.5 + Math.random() * 1.0;
      velocities[i*3+2] = (Math.random() - 0.5) * 0.6;
    }
    this._spawn(positions, velocities, 0x555555, 0.22, 1.4);
  }

  _spawn(positions, velocities, colorHex, size, maxAge) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions.slice(), 3));
    const mat = new THREE.PointsMaterial({
      color: colorHex, size, sizeAttenuation: true, transparent: true, opacity: 1,
    });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this._active.push({ pts, velocities, age: 0, maxAge });
  }

  update(dt) {
    const GRAV = -14;
    for (let i = this._active.length - 1; i >= 0; i--) {
      const p = this._active[i];
      p.age += dt;
      if (p.age >= p.maxAge) {
        this.scene.remove(p.pts);
        p.pts.geometry.dispose();
        p.pts.material.dispose();
        this._active.splice(i, 1);
        continue;
      }
      const pos = p.pts.geometry.attributes.position.array;
      const n   = pos.length / 3;
      for (let j = 0; j < n; j++) {
        p.velocities[j*3+1] += GRAV * dt;
        pos[j*3]   += p.velocities[j*3]   * dt;
        pos[j*3+1] += p.velocities[j*3+1] * dt;
        pos[j*3+2] += p.velocities[j*3+2] * dt;
      }
      p.pts.geometry.attributes.position.needsUpdate = true;
      p.pts.material.opacity = 1 - p.age / p.maxAge;
    }
  }
}
