import * as THREE from 'three';
import { CHUNK_SIZE, CHUNK_HEIGHT } from '../Constants.js';
import { BLOCKS, BLOCK_IS_TRANSPARENT, getBlockTextures } from './BlockRegistry.js';

// Each face: direction to check for visibility, corner offsets, normal, and UV face key
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

            const neighborTrans = BLOCK_IS_TRANSPARENT[neighbor];
            if (!neighborTrans) continue;
            if (isWater && neighbor === BLOCKS.WATER) continue;

            const texName = texDef[face.uvKey] || texDef.side;
            const uvRect  = textureManager.getUVs(texName);
            const [u0, v0, u1, v1] = uvRect;

            const wx = this.cx * CHUNK_SIZE + lx;
            const wz = this.cz * CHUNK_SIZE + lz;

            const faceUVs = [u0, v1, u1, v1, u1, v0, u0, v0];

            // Normal-based shading (like Minecraft)
            const [fnx, fny, fnz] = face.normal;
            const shade = fny === 1 ? 1.0 : fny === -1 ? 0.6 : Math.abs(fnx) === 1 ? 0.8 : 0.75;

            const arr  = isWater ? wPositions : positions;
            const narr = isWater ? wNormals   : normals;
            const uarr = isWater ? wUVs       : uvs;
            const iarr = isWater ? wIndices   : indices;
            const carr = isWater ? wColors    : colors;
            const vidx = isWater ? wvi : vi;

            for (let ci = 0; ci < 4; ci++) {
              const [cx2, cy2, cz2] = face.corners[ci];
              arr.push(wx + cx2, y + cy2, wz + cz2);
              narr.push(fnx, fny, fnz);
              uarr.push(faceUVs[ci * 2], faceUVs[ci * 2 + 1]);
              carr.push(shade, shade, shade);
            }

            iarr.push(vidx, vidx + 1, vidx + 2, vidx, vidx + 2, vidx + 3);

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
