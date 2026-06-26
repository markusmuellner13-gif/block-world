import * as THREE from 'three';
import { CHUNK_SIZE, CHUNK_HEIGHT } from '../Constants.js';
import { BLOCKS, BLOCK_IS_TRANSPARENT, getBlockTextures } from './BlockRegistry.js';

const FACE_DIRS = [
  { dir: [ 0,  1,  0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], normal: [ 0, 1, 0], uvKey: 'top'    },
  { dir: [ 0, -1,  0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], normal: [ 0,-1, 0], uvKey: 'bottom' },
  { dir: [ 1,  0,  0], corners: [[1,0,1],[1,1,1],[1,1,0],[1,0,0]], normal: [ 1, 0, 0], uvKey: 'side'   },
  { dir: [-1,  0,  0], corners: [[0,0,0],[0,1,0],[0,1,1],[0,0,1]], normal: [-1, 0, 0], uvKey: 'side'   },
  { dir: [ 0,  0,  1], corners: [[1,0,1],[0,0,1],[0,1,1],[1,1,1]], normal: [ 0, 0, 1], uvKey: 'side'   },
  { dir: [ 0,  0, -1], corners: [[0,0,0],[1,0,0],[1,1,0],[0,1,0]], normal: [ 0, 0,-1], uvKey: 'side'   },
];

// Sprite-like blocks rendered as two crossing quads (X cross)
const SPRITE_BLOCKS = new Set([
  BLOCKS.FLOWER_ROSE, BLOCKS.FLOWER_YELLOW, BLOCKS.MUSHROOM,
  BLOCKS.TALL_GRASS, BLOCKS.WHEAT,
]);

// Leaf-like blocks: solid but use cutout rendering (DoubleSide + alphaTest)
const LEAF_BLOCKS = new Set([
  BLOCKS.LEAVES, BLOCKS.LEAVES_BIRCH, BLOCKS.LEAVES_PINE,
]);

export class Chunk {
  constructor(chunkX, chunkZ) {
    this.cx = chunkX;
    this.cz = chunkZ;
    this.data = null;
    this.mesh = null;       // opaque solid blocks
    this.leafMesh = null;   // leaves (cutout)
    this.waterMesh = null;  // water (transparent)
    this.spriteMesh = null; // flowers, grass (cross sprite)
    this.dirty = true;
    this.generated = false;
  }

  blockIndex(lx, y, lz) {
    return lx + lz * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
  }

  getBlock(lx, y, lz) {
    if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT) return BLOCKS.AIR;
    return this.data[this.blockIndex(lx, y, lz)];
  }

  setBlock(lx, y, lz, blockId) {
    if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT) return;
    this.data[this.blockIndex(lx, y, lz)] = blockId;
    this.dirty = true;
  }

  buildMesh(textureManager, world) {
    // Solid opaque geometry
    const positions = [], normals = [], uvs = [], indices = [], colors = [];
    // Leaf cutout geometry (DoubleSide, alphaTest)
    const lPositions = [], lNormals = [], lUVs = [], lIndices = [], lColors = [];
    // Water geometry
    const wPositions = [], wNormals = [], wUVs = [], wIndices = [], wColors = [];
    // Sprite geometry (cross planes)
    const sPositions = [], sNormals = [], sUVs = [], sIndices = [], sColors = [];

    const atlas = textureManager.getAtlas();
    let vi = 0, lvi = 0, wvi = 0, svi = 0;

    const isSolid = (bx, by, bz) => {
      const b = world ? world.getBlockWorld(bx, by, bz) : BLOCKS.STONE;
      return b !== BLOCKS.AIR && !BLOCK_IS_TRANSPARENT[b] && !SPRITE_BLOCKS.has(b);
    };

    const aoVertex = (vx, vy, vz, fnx, fny, fnz) => {
      let s1, s2, cn;
      if (fny !== 0) {
        const tx = (vx % 1 === 0) ? (vx > 0 ? -1 : 1) : Math.sign(vx - Math.floor(vx) - 0.5);
        const tz = (vz % 1 === 0) ? (vz > 0 ? -1 : 1) : Math.sign(vz - Math.floor(vz) - 0.5);
        const fx = vx + tx, fz = vz + tz;
        s1 = isSolid(Math.floor(fx), Math.floor(vy), Math.floor(vz));
        s2 = isSolid(Math.floor(vx), Math.floor(vy), Math.floor(fz));
        cn = isSolid(Math.floor(fx), Math.floor(vy), Math.floor(fz));
      } else if (fnx !== 0) {
        const ty = (vy % 1 === 0) ? (vy > 0 ? -1 : 1) : Math.sign(vy - Math.floor(vy) - 0.5);
        const tz = (vz % 1 === 0) ? (vz > 0 ? -1 : 1) : Math.sign(vz - Math.floor(vz) - 0.5);
        const fy = vy + ty, fz = vz + tz;
        s1 = isSolid(Math.floor(vx), Math.floor(fy), Math.floor(vz));
        s2 = isSolid(Math.floor(vx), Math.floor(vy), Math.floor(fz));
        cn = isSolid(Math.floor(vx), Math.floor(fy), Math.floor(fz));
      } else {
        const tx = (vx % 1 === 0) ? (vx > 0 ? -1 : 1) : Math.sign(vx - Math.floor(vx) - 0.5);
        const ty = (vy % 1 === 0) ? (vy > 0 ? -1 : 1) : Math.sign(vy - Math.floor(vy) - 0.5);
        const fx = vx + tx, fy = vy + ty;
        s1 = isSolid(Math.floor(fx), Math.floor(vy), Math.floor(vz));
        s2 = isSolid(Math.floor(vx), Math.floor(fy), Math.floor(vz));
        cn = isSolid(Math.floor(fx), Math.floor(fy), Math.floor(vz));
      }
      const clearness = (s1 && s2) ? 0 : 3 - ((s1 ? 1 : 0) + (s2 ? 1 : 0) + (cn ? 1 : 0));
      return 0.5 + 0.5 * (clearness / 3);
    };

    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          const block = this.getBlock(lx, y, lz);
          if (block === BLOCKS.AIR) continue;

          const isWater  = block === BLOCKS.WATER;
          const isLeaf   = LEAF_BLOCKS.has(block);
          const isSprite = SPRITE_BLOCKS.has(block);
          const texDef   = getBlockTextures(block);

          const wx = this.cx * CHUNK_SIZE + lx;
          const wz = this.cz * CHUNK_SIZE + lz;

          // ── Sprites: two crossing diagonal quads ──────────────────────────
          if (isSprite) {
            const texName = texDef.side || texDef.top;
            const [u0, v0, u1, v1] = textureManager.getUVs(texName);
            // Flat shade for sprites
            const shade = 0.9;

            // Two diagonals of the block unit cube
            const diags = [
              // diagonal from (-0.5,0,0.5)-(0.5,0,-0.5) to top
              [[wx+0,y+0,wz+1],[wx+1,y+0,wz+0],[wx+1,y+1,wz+0],[wx+0,y+1,wz+1]],
              // diagonal from (-0.5,0,-0.5)-(0.5,0,0.5) to top
              [[wx+1,y+0,wz+1],[wx+0,y+0,wz+0],[wx+0,y+1,wz+0],[wx+1,y+1,wz+1]],
            ];

            for (const quad of diags) {
              const faceUVs = [u0,v1, u1,v1, u1,v0, u0,v0];
              for (let ci = 0; ci < 4; ci++) {
                sPositions.push(...quad[ci]);
                sNormals.push(0, 1, 0);
                sUVs.push(faceUVs[ci*2], faceUVs[ci*2+1]);
                sColors.push(shade, shade, shade);
              }
              sIndices.push(svi,svi+1,svi+2, svi,svi+2,svi+3);
              svi += 4;
            }
            continue;
          }

          // ── Normal cube faces ─────────────────────────────────────────────
          for (const face of FACE_DIRS) {
            const [dx, dy, dz] = face.dir;
            const nx = lx + dx, ny = y + dy, nz = lz + dz;

            let neighbor;
            if (nx >= 0 && nx < CHUNK_SIZE && nz >= 0 && nz < CHUNK_SIZE && ny >= 0 && ny < CHUNK_HEIGHT) {
              neighbor = this.getBlock(nx, ny, nz);
            } else {
              neighbor = world ? world.getBlockWorld(
                this.cx * CHUNK_SIZE + nx, ny, this.cz * CHUNK_SIZE + nz
              ) : BLOCKS.AIR;
            }

            // Cull face if neighbor is solid (not transparent)
            if (!BLOCK_IS_TRANSPARENT[neighbor] && !SPRITE_BLOCKS.has(neighbor)) continue;
            // Water doesn't render face to another water block
            if (isWater && neighbor === BLOCKS.WATER) continue;
            // Leaves don't render face toward another leaf of same type (optional, skip for clarity)

            const texName = texDef[face.uvKey] || texDef.side;
            const [u0, v0, u1, v1] = textureManager.getUVs(texName);
            const faceUVs = [u0, v1, u1, v1, u1, v0, u0, v0];
            const [fnx, fny, fnz] = face.normal;
            const shade = fny === 1 ? 1.0 : fny === -1 ? 0.5 : Math.abs(fnx) === 1 ? 0.6 : 0.8;

            // Choose which buffer to write to
            let arr, narr, uarr, iarr, carr, vidx;
            if (isWater)     { arr=wPositions; narr=wNormals; uarr=wUVs; iarr=wIndices; carr=wColors; vidx=wvi; }
            else if (isLeaf) { arr=lPositions; narr=lNormals; uarr=lUVs; iarr=lIndices; carr=lColors; vidx=lvi; }
            else             { arr=positions;  narr=normals;  uarr=uvs;  iarr=indices;  carr=colors;  vidx=vi;  }

            const ao = [0, 0, 0, 0];
            for (let ci = 0; ci < 4; ci++) {
              const [cx2, cy2, cz2] = face.corners[ci];
              const vx = wx + cx2, vy = y + cy2, vz = wz + cz2;
              arr.push(vx, vy, vz);
              narr.push(fnx, fny, fnz);
              uarr.push(faceUVs[ci * 2], faceUVs[ci * 2 + 1]);
              ao[ci] = (isWater || isLeaf) ? 1.0 : aoVertex(vx, vy, vz, fnx, fny, fnz);
              const s = shade * ao[ci];
              carr.push(s, s, s);
            }

            const flip = !isWater && !isLeaf && ao[0] + ao[2] < ao[1] + ao[3];
            if (flip) { iarr.push(vidx+1,vidx+2,vidx+3, vidx+1,vidx+3,vidx); }
            else      { iarr.push(vidx,vidx+1,vidx+2, vidx,vidx+2,vidx+3); }

            if (isWater) wvi += 4;
            else if (isLeaf) lvi += 4;
            else vi += 4;
          }
        }
      }
    }

    this._disposeMesh(this.mesh);
    this._disposeMesh(this.leafMesh);
    this._disposeMesh(this.waterMesh);
    this._disposeMesh(this.spriteMesh);

    this.mesh       = positions.length  > 0 ? this._createMesh(positions, normals, uvs, indices, colors, atlas, 'solid') : null;
    this.leafMesh   = lPositions.length > 0 ? this._createMesh(lPositions, lNormals, lUVs, lIndices, lColors, atlas, 'leaf') : null;
    this.waterMesh  = wPositions.length > 0 ? this._createMesh(wPositions, wNormals, wUVs, wIndices, wColors, atlas, 'water') : null;
    this.spriteMesh = sPositions.length > 0 ? this._createMesh(sPositions, sNormals, sUVs, sIndices, sColors, atlas, 'sprite') : null;

    this.dirty = false;
  }

  _createMesh(positions, normals, uvs, indices, colors, atlas, type) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals,   3));
    geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs,       2));
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors,    3));
    geo.setIndex(indices);
    geo.computeBoundingBox();

    let mat;
    if (type === 'solid') {
      mat = new THREE.MeshLambertMaterial({
        map: atlas, vertexColors: true,
        side: THREE.FrontSide, alphaTest: 0.5,
      });
    } else if (type === 'leaf') {
      mat = new THREE.MeshLambertMaterial({
        map: atlas, vertexColors: true,
        side: THREE.DoubleSide, alphaTest: 0.1,
        transparent: false,
      });
    } else if (type === 'sprite') {
      mat = new THREE.MeshLambertMaterial({
        map: atlas, vertexColors: true,
        side: THREE.DoubleSide, alphaTest: 0.1,
        transparent: false,
      });
    } else { // water
      mat = new THREE.MeshLambertMaterial({
        map: atlas, vertexColors: true,
        transparent: true, opacity: 0.78,
        side: THREE.DoubleSide, alphaTest: 0,
      });
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow    = (type === 'solid');
    mesh.receiveShadow = true;
    return mesh;
  }

  addToScene(scene) {
    if (this.mesh       && !this.mesh.parent)       scene.add(this.mesh);
    if (this.leafMesh   && !this.leafMesh.parent)   scene.add(this.leafMesh);
    if (this.waterMesh  && !this.waterMesh.parent)  scene.add(this.waterMesh);
    if (this.spriteMesh && !this.spriteMesh.parent) scene.add(this.spriteMesh);
  }

  removeFromScene(scene) {
    if (this.mesh)       scene.remove(this.mesh);
    if (this.leafMesh)   scene.remove(this.leafMesh);
    if (this.waterMesh)  scene.remove(this.waterMesh);
    if (this.spriteMesh) scene.remove(this.spriteMesh);
  }

  _disposeMesh(mesh) {
    if (!mesh) return;
    mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
    else mesh.material.dispose();
  }

  dispose() {
    this._disposeMesh(this.mesh);
    this._disposeMesh(this.leafMesh);
    this._disposeMesh(this.waterMesh);
    this._disposeMesh(this.spriteMesh);
  }
}
