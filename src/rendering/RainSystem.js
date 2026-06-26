import * as THREE from 'three';

const RAIN_COUNT = 2000;
const RAIN_RADIUS = 40;
const RAIN_HEIGHT = 30;
const FALL_SPEED = 20;

export class RainSystem {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.intensity = 0;    // 0 = clear, 1 = heavy rain
    this._targetIntensity = 0;
    this._weatherTimer = 0;
    this._weatherDuration = 0;
    this._splashes = [];

    this._buildRain();
    this._buildSplashes();
    this._scheduleNextWeather();
  }

  _buildRain() {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(RAIN_COUNT * 3);
    const vel = new Float32Array(RAIN_COUNT);

    for (let i = 0; i < RAIN_COUNT; i++) {
      pos[i*3]   = (Math.random() - 0.5) * RAIN_RADIUS * 2;
      pos[i*3+1] = Math.random() * RAIN_HEIGHT;
      pos[i*3+2] = (Math.random() - 0.5) * RAIN_RADIUS * 2;
      vel[i] = 0.8 + Math.random() * 0.4;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this._positions = pos;
    this._velocities = vel;

    // Rain lines: each drop is a line segment
    const lineGeo = new THREE.BufferGeometry();
    const linePos = new Float32Array(RAIN_COUNT * 6); // 2 pts per line
    for (let i = 0; i < RAIN_COUNT; i++) {
      linePos[i*6]   = pos[i*3];
      linePos[i*6+1] = pos[i*3+1];
      linePos[i*6+2] = pos[i*3+2];
      linePos[i*6+3] = pos[i*3];
      linePos[i*6+4] = pos[i*3+1] - 0.4;
      linePos[i*6+5] = pos[i*3+2];
    }
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    this._linePositions = linePos;

    this.rainMat = new THREE.LineBasicMaterial({
      color: 0x8899bb, transparent: true, opacity: 0, fog: true,
    });

    // Build line segments as individual LineSegments
    this.rainMesh = new THREE.LineSegments(lineGeo, this.rainMat);
    this.rainMesh.frustumCulled = false;
    this.scene.add(this.rainMesh);
  }

  _buildSplashes() {
    // Small + cross sprites at ground impact
    const splashGeo = new THREE.BufferGeometry();
    const MAX_SPLASHES = 80;
    const sPos = new Float32Array(MAX_SPLASHES * 4 * 3); // 4 pts per splash (2 crossing lines)
    splashGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    this._splashPos = sPos;

    this.splashMat = new THREE.LineBasicMaterial({
      color: 0x88aacc, transparent: true, opacity: 0.6, fog: true,
    });
    this.splashMesh = new THREE.LineSegments(splashGeo, this.splashMat);
    this.splashMesh.frustumCulled = false;
    this.scene.add(this.splashMesh);
    this._splashData = [];
    this._MAX_SPLASHES = MAX_SPLASHES;
  }

  _scheduleNextWeather() {
    // Random clear period: 60-300s
    this._weatherTimer = 0;
    this._weatherDuration = 60 + Math.random() * 240;
    this._targetIntensity = 0;
  }

  _startRain() {
    this._targetIntensity = 0.4 + Math.random() * 0.6;
    this._weatherDuration = 30 + Math.random() * 120;
    this._weatherTimer = 0;
  }

  update(dt, playerPos, world) {
    // Weather cycle
    this._weatherTimer += dt;
    if (this._weatherTimer >= this._weatherDuration) {
      if (this._targetIntensity === 0) {
        this._startRain();
      } else {
        this._scheduleNextWeather();
      }
    }

    // Fade intensity toward target
    const fadeRate = 0.5 * dt;
    if (this.intensity < this._targetIntensity) this.intensity = Math.min(this._targetIntensity, this.intensity + fadeRate);
    else if (this.intensity > this._targetIntensity) this.intensity = Math.max(this._targetIntensity, this.intensity - fadeRate);

    this.active = this.intensity > 0.01;
    this.rainMat.opacity = this.intensity * 0.55;
    this.splashMat.opacity = this.intensity * 0.6;

    if (!this.active || !playerPos) return;

    const px = playerPos.x, py = playerPos.y, pz = playerPos.z;
    const activeCount = Math.floor(RAIN_COUNT * this.intensity);

    // Move rain drops
    for (let i = 0; i < activeCount; i++) {
      const speed = this._velocities[i] * FALL_SPEED * dt;
      this._positions[i*3+1] -= speed;

      // Wrap around player
      if (this._positions[i*3+1] < py - 5) {
        this._positions[i*3]   = px + (Math.random() - 0.5) * RAIN_RADIUS * 2;
        this._positions[i*3+1] = py + RAIN_HEIGHT * Math.random();
        this._positions[i*3+2] = pz + (Math.random() - 0.5) * RAIN_RADIUS * 2;

        // Spawn splash at landing
        const sx = this._positions[i*3], sz = this._positions[i*3+2];
        if (this._splashData.length < this._MAX_SPLASHES && Math.random() < 0.3) {
          // Find surface height for splash
          const groundY = py; // simplified: use player Y as ground estimate
          this._splashData.push({ x: sx, y: groundY, z: sz, life: 0.25 });
        }
      }

      // Horizontal drift
      this._positions[i*3] = px + (((this._positions[i*3] - px + RAIN_RADIUS) % (RAIN_RADIUS * 2)) - RAIN_RADIUS);
      this._positions[i*3+2] = pz + (((this._positions[i*3+2] - pz + RAIN_RADIUS) % (RAIN_RADIUS * 2)) - RAIN_RADIUS);

      // Update line geometry (top and bottom of raindrop)
      const dropLen = 0.3 + this._velocities[i] * 0.4;
      this._linePositions[i*6]   = this._positions[i*3];
      this._linePositions[i*6+1] = this._positions[i*3+1] + dropLen;
      this._linePositions[i*6+2] = this._positions[i*3+2];
      this._linePositions[i*6+3] = this._positions[i*3];
      this._linePositions[i*6+4] = this._positions[i*3+1];
      this._linePositions[i*6+5] = this._positions[i*3+2];
    }
    this.rainMesh.geometry.attributes.position.needsUpdate = true;

    // Update splashes
    this._splashData = this._splashData.filter(s => {
      s.life -= dt;
      return s.life > 0;
    });
    // Update splash geometry
    for (let si = 0; si < this._MAX_SPLASHES; si++) {
      const sp = this._splashData[si];
      if (!sp) {
        // Zero out unused
        for (let vi = 0; vi < 4; vi++) {
          this._splashPos[(si*4+vi)*3] = 0;
          this._splashPos[(si*4+vi)*3+1] = 0;
          this._splashPos[(si*4+vi)*3+2] = 0;
        }
        continue;
      }
      const r = (1 - sp.life / 0.25) * 0.4;
      // X arm
      this._splashPos[(si*4+0)*3] = sp.x - r;
      this._splashPos[(si*4+0)*3+1] = sp.y + 0.05;
      this._splashPos[(si*4+0)*3+2] = sp.z;
      this._splashPos[(si*4+1)*3] = sp.x + r;
      this._splashPos[(si*4+1)*3+1] = sp.y + 0.05;
      this._splashPos[(si*4+1)*3+2] = sp.z;
      // Z arm
      this._splashPos[(si*4+2)*3] = sp.x;
      this._splashPos[(si*4+2)*3+1] = sp.y + 0.05;
      this._splashPos[(si*4+2)*3+2] = sp.z - r;
      this._splashPos[(si*4+3)*3] = sp.x;
      this._splashPos[(si*4+3)*3+1] = sp.y + 0.05;
      this._splashPos[(si*4+3)*3+2] = sp.z + r;
    }
    this.splashMesh.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.rainMesh.geometry.dispose();
    this.rainMat.dispose();
    this.splashMesh.geometry.dispose();
    this.splashMat.dispose();
    this.scene.remove(this.rainMesh);
    this.scene.remove(this.splashMesh);
  }
}
