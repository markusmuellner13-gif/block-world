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

export class Chunk {
  constructor(chunkX, chunkZ) {
    this.cx = chunkX;
    this.cz = chunkZ;
    this.data = null;
    this.mesh = null;
    this.waterMesh = null;
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
    const positions = [], normals = [], uvs = [], indices = [], colors = [];
    const wPositions = [], wNormals = [], wUVs = [], wIndices = [], wColors = [];

    const atlas = textureManager.getAtlas();
    let vi = 0, wvi = 0;

    // Returns true if a block at world coords is solid (casts AO)
    const isSolid = (bx, by, bz) => {
      const b = world ? world.getBlockWorld(bx, by, bz) : BLOCKS.STONE;
      return b !== BLOCKS.AIR && !BLOCK_IS_TRANSPARENT[b];
    };

    // Compute per-vertex AO factor (0.5 = fully occluded, 1.0 = open).
    // vx/vy/vz = corner world position, fnx/fny/fnz = face normal.
    const aoVertex = (vx, vy, vz, fnx, fny, fnz) => {
      // Tangent offset signs relative to the vertex (the vertex is at a corner so
      // we want to check the blocks that share this corner, on the face plane).
      let s1, s2, cn;
      if (fny !== 0) {
        // Y-axis face — tangents along X and Z
        const tx = (vx % 1 === 0) ? (vx > 0 ? -1 : 1) : Math.sign(vx - Math.floor(vx) - 0.5);
        const tz = (vz % 1 === 0) ? (vz > 0 ? -1 : 1) : Math.sign(vz - Math.floor(vz) - 0.5);
        const fx = vx + tx, fz = vz + tz;
        s1 = isSolid(Math.floor(fx), Math.floor(vy), Math.floor(vz));
        s2 = isSolid(Math.floor(vx), Math.floor(vy), Math.floor(fz));
        cn = isSolid(Math.floor(fx), Math.floor(vy), Math.floor(fz));
      } else if (fnx !== 0) {
        // X-axis face — tangents along Y and Z
        const ty = (vy % 1 === 0) ? (vy > 0 ? -1 : 1) : Math.sign(vy - Math.floor(vy) - 0.5);
        const tz = (vz % 1 === 0) ? (vz > 0 ? -1 : 1) : Math.sign(vz - Math.floor(vz) - 0.5);
        const fy = vy + ty, fz = vz + tz;
        s1 = isSolid(Math.floor(vx), Math.floor(fy), Math.floor(vz));
        s2 = isSolid(Math.floor(vx), Math.floor(vy), Math.floor(fz));
        cn = isSolid(Math.floor(vx), Math.floor(fy), Math.floor(fz));
      } else {
        // Z-axis face — tangents along X and Y
        const tx = (vx % 1 === 0) ? (vx > 0 ? -1 : 1) : Math.sign(vx - Math.floor(vx) - 0.5);
        const ty = (vy % 1 === 0) ? (vy > 0 ? -1 : 1) : Math.sign(vy - Math.floor(vy) - 0.5);
        const fx = vx + tx, fy = vy + ty;
        s1 = isSolid(Math.floor(fx), Math.floor(vy), Math.floor(vz));
        s2 = isSolid(Math.floor(vx), Math.floor(fy), Math.floor(vz));
        cn = isSolid(Math.floor(fx), Math.floor(fy), Math.floor(vz));
      }
      const clearness = (s1 && s2) ? 0 : 3 - ((s1 ? 1 : 0) + (s2 ? 1 : 0) + (cn ? 1 : 0));
      return 0.5 + 0.5 * (clearness / 3); // range [0.5, 1.0]
    };

    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          const block = this.getBlock(lx, y, lz);
          if (block === BLOCKS.AIR) continue;

          const isWater = block === BLOCKS.WATER;
          const texDef  = getBlockTextures(block);

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

            if (!BLOCK_IS_TRANSPARENT[neighbor]) continue;
            if (isWater && neighbor === BLOCKS.WATER) continue;

            const texName = texDef[face.uvKey] || texDef.side;
            const [u0, v0, u1, v1] = textureManager.getUVs(texName);

            const wx = this.cx * CHUNK_SIZE + lx;
            const wz = this.cz * CHUNK_SIZE + lz;

            const faceUVs = [u0, v1, u1, v1, u1, v0, u0, v0];
            const [fnx, fny, fnz] = face.normal;
            // Directional face shading: top=1.0, bottom=0.5, N/S=0.8, E/W=0.6
            const shade = fny === 1 ? 1.0 : fny === -1 ? 0.5 : Math.abs(fnx) === 1 ? 0.6 : 0.8;

            const arr  = isWater ? wPositions : positions;
            const narr = isWater ? wNormals   : normals;
            const uarr = isWater ? wUVs       : uvs;
            const iarr = isWater ? wIndices   : indices;
            const carr = isWater ? wColors    : colors;
            const vidx = isWater ? wvi : vi;

            const ao = [0, 0, 0, 0];
            for (let ci = 0; ci < 4; ci++) {
              const [cx2, cy2, cz2] = face.corners[ci];
              const vx = wx + cx2, vy = y + cy2, vz = wz + cz2;
              arr.push(vx, vy, vz);
              narr.push(fnx, fny, fnz);
              uarr.push(faceUVs[ci * 2], faceUVs[ci * 2 + 1]);
              ao[ci] = isWater ? 1.0 : aoVertex(vx, vy, vz, fnx, fny, fnz);
              const s = shade * ao[ci];
              carr.push(s, s, s);
            }

            // Flip quad diagonal when AO is anisotropic to avoid the 'crease' artifact
            if (!isWater && ao[0] + ao[2] < ao[1] + ao[3]) {
              iarr.push(vidx+1, vidx+2, vidx+3, vidx+1, vidx+3, vidx);
            } else {
              iarr.push(vidx, vidx+1, vidx+2, vidx, vidx+2, vidx+3);
            }

            if (isWater) wvi += 4; else vi += 4;
          }
        }
      }
    }

    this._disposeMesh(this.mesh);
    this._disposeMesh(this.waterMesh);
    this.mesh      = positions.length  > 0 ? this._createMesh(positions, normals, uvs, indices, colors, atlas, false) : null;
    this.waterMesh = wPositions.length > 0 ? this._createMesh(wPositions, wNormals, wUVs, wIndices, wColors, atlas, true) : null;
    this.dirty = false;
  }

  _createMesh(positions, normals, uvs, indices, colors, atlas, transparent) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals,   3));
    geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs,       2));
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors,    3));
    geo.setIndex(indices);
    geo.computeBoundingBox();

    const mat = new THREE.MeshLambertMaterial({
      map: atlas,
      vertexColors: true,
      transparent,
      opacity: transparent ? 0.72 : 1.0,
      side: transparent ? THREE.DoubleSide : THREE.FrontSide,
      alphaTest: transparent ? 0 : 0.1,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow    = !transparent;
    mesh.receiveShadow = true;
    return mesh;
  }

  _disposeMesh(mesh) {
    if (!mesh) return;
    mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
    else mesh.material.dispose();
  }

  dispose() {
    this._disposeMesh(this.mesh);
    this._disposeMesh(this.waterMesh);
  }
}
