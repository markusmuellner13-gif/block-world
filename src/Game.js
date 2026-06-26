import * as THREE from 'three';
import { World } from './world/World.js';
import { Player } from './player/Player.js';
import { Controls } from './player/Controls.js';
import { HUD } from './ui/HUD.js';
import { Menu } from './ui/Menu.js';
import { MobileControls } from './ui/MobileControls.js';
import { WorldSettings } from './ui/WorldSettings.js';
import { Sky } from './rendering/Sky.js';
import { TextureManager } from './rendering/TextureManager.js';
import { ParticleSystem } from './rendering/ParticleSystem.js';
import { RainSystem } from './rendering/RainSystem.js';
import { AudioManager } from './audio/AudioManager.js';
import { EntityManager } from './entities/EntityManager.js';
import { RemotePlayer } from './multiplayer/RemotePlayer.js';
import { BLOCKS } from './world/BlockRegistry.js';
import { DAY_LENGTH } from './Constants.js';

const DAY_COLOR   = new THREE.Color(0x87ceeb);
const DUSK_COLOR  = new THREE.Color(0xff7733);
const NIGHT_COLOR = new THREE.Color(0x05051a);

export class Game {
  constructor(canvas, uiRoot, config = {}) {
    this.canvas      = canvas;
    this.uiRoot      = uiRoot;
    this.config      = config;
    this.mode        = config.mode || 'survival';
    this.multiplayer = config.multiplayer || null;
    this.roomCode    = config.roomCode || null;

    this.running       = false;
    this.paused        = false;
    this.inventoryOpen = false;
    this.dayTime       = 0.25;
    this._lastTime     = 0;
    this._mpUpdateTimer = 0;
    this._currentFOV   = 70;

    this.remotePlayers = new Map();

    this._setupRenderer();
    this._setupScene();

    this.textures  = new TextureManager();
    this.audio     = new AudioManager();
    this.world     = new World(this.scene, this.textures, config.seed);
    this.particles = new ParticleSystem(this.scene);
    this.entities  = new EntityManager(this.scene, this.world, this.textures);
    this.player    = new Player(this.scene, this.world, this.camera, this);
    this.controls  = new Controls(this.canvas, this.player, this);
    this.sky       = new Sky(this.scene);
    this.rain      = new RainSystem(this.scene);
    this.hud       = new HUD(uiRoot, this.player, this);
    this.menu      = new Menu(uiRoot, this);
    this.worldSettings = new WorldSettings(uiRoot, this);
    this.mobileControls = new MobileControls(uiRoot, this.controls);

    this._bindEvents();
    if (this.multiplayer) this._bindMultiplayer();
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas, antialias: false, powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace   = THREE.SRGBColorSpace;
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87ceeb, 60, 120);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 400);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near   = 0.5;
    this.sunLight.shadow.camera.far    = 200;
    this.sunLight.shadow.camera.left   = -80;
    this.sunLight.shadow.camera.right  = 80;
    this.sunLight.shadow.camera.top    = 80;
    this.sunLight.shadow.camera.bottom = -80;
    this.scene.add(this.sunLight);
  }

  _bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.inventoryOpen) {
          this.hud.closeInventory();
        } else {
          this.togglePause();
        }
      }
    });
  }

  _bindMultiplayer() {
    const mp = this.multiplayer;

    mp.on('playerJoin', ({ id, name }) => {
      const rp = new RemotePlayer(id, name, this.scene);
      this.remotePlayers.set(id, rp);
      this.hud.showNotification(`${name} joined the world`);
    });

    mp.on('playerLeave', ({ id }) => {
      const rp = this.remotePlayers.get(id);
      if (rp) { rp.dispose(this.scene); this.remotePlayers.delete(id); }
      this.hud.showNotification('A player left');
    });

    mp.on('playerUpdate', ({ id, x, y, z, yaw, pitch }) => {
      const rp = this.remotePlayers.get(id);
      if (rp) rp.update(x, y, z, yaw, pitch);
    });

    mp.on('blockChange', ({ wx, wy, wz, blockId }) => {
      this.world.setBlockWorld(wx, wy, wz, blockId);
    });

    mp.on('modeChange', ({ mode }) => {
      this.mode = mode;
      this.player.applyMode(mode);
      this.hud.update();
    });

    mp.on('chat', ({ name, message }) => {
      this.hud.showChat(name, message);
    });

    mp.on('disconnect', () => {
      this.hud.showNotification('Disconnected from server');
    });

    for (const p of mp.getRemotePlayers()) {
      const rp = new RemotePlayer(p.id, p.name, this.scene);
      this.remotePlayers.set(p.id, rp);
    }
  }

  setMode(mode) {
    this.mode = mode;
    this.player.applyMode(mode);
    this.hud.update();
    if (this.multiplayer?.connected) this.multiplayer.sendModeChange(mode);
  }

  async openToMultiplayer() {
    const { MultiplayerClient } = await import('./multiplayer/MultiplayerClient.js');
    const mp = new MultiplayerClient();
    await mp.connect();
    const data = await mp.createRoom(this.config.playerName || 'Player', this.mode);
    this.multiplayer = mp;
    this.roomCode    = data.code;
    this._bindMultiplayer();
    return data.code;
  }

  togglePause() {
    this.paused = !this.paused;
    this.menu.setVisible(this.paused);
    if (this.paused) this.controls.unlock();
    else             this.controls.lock();
  }

  setInventoryOpen(open) {
    this.inventoryOpen = open;
    if (open) this.controls.unlock();
    else      this.controls.lock();
  }

  start() {
    this.running = true;
    const spawnY = this.world.generateSpawnArea();
    this.player.spawnAt(0, spawnY, 0);
    this.menu.showStart();
    this._loop(0);
  }

  _loop(timestamp) {
    if (!this.running) return;
    requestAnimationFrame((t) => this._loop(t));

    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
    this._lastTime = timestamp;

    if (this.paused) return;

    // Always update world and sky regardless of pointer lock / inventory state
    this.dayTime = (this.dayTime + dt / DAY_LENGTH) % 1;
    this._updateLighting();
    this.world.update(this.player.position);
    this.sky.update(this.dayTime, this.player.position);
    this.rain.update(dt, this.player.position, this.world);
    this.particles.update(dt);
    this._updateRainFog();

    if (this.controls.locked) {
      // Full update: player can move, entities tick
      this.player.update(dt, this.controls);
      this.entities.update(dt, this.player.position, this);
      this._updateFOV(dt);

      if (this.multiplayer?.connected) {
        this._mpUpdateTimer += dt;
        if (this._mpUpdateTimer >= 0.05) {
          this._mpUpdateTimer = 0;
          const p = this.player;
          this.multiplayer.sendPlayerUpdate(p.position.x, p.position.y, p.position.z, p.yaw, p.pitch);
        }
      }
    }
    // Inventory open or briefly unlocked: world still renders, player frozen

    this.hud.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  _updateFOV(dt) {
    const sprinting   = this.controls.sprinting && this.player.physics.onGround && !this.player.physics.inWater;
    const targetFOV   = sprinting ? 85 : 70;
    this._currentFOV += (targetFOV - this._currentFOV) * Math.min(1, 8 * dt);
    if (Math.abs(this._currentFOV - this.camera.fov) > 0.05) {
      this.camera.fov = this._currentFOV;
      this.camera.updateProjectionMatrix();
    }
  }

  _updateRainFog() {
    const rainBoost = this.rain.intensity * 0.5;
    const baseFar   = 120 - rainBoost * 60;
    const baseNear  = 60  - rainBoost * 30;
    this.scene.fog.near = baseNear;
    this.scene.fog.far  = baseFar;
  }

  _updateLighting() {
    // t: 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
    const angle        = this.dayTime * Math.PI * 2 - Math.PI / 2;
    const sinElev      = Math.sin(angle + Math.PI / 2);  // +1 at noon, -1 at midnight
    const dayStrength  = Math.max(0, sinElev);
    // horizon factor peaks at sunrise (t≈0.25) and sunset (t≈0.75) when sun is near horizon
    const horizFactor  = Math.max(0, 1 - Math.abs(sinElev) * 4);

    // Tri-color sky blend: night → dusk/dawn glow → day
    const sky = NIGHT_COLOR.clone().lerp(DAY_COLOR, dayStrength);
    sky.lerp(DUSK_COLOR, horizFactor * 0.55);

    this.scene.background = sky;
    this.scene.fog.color.copy(sky);

    this.sunLight.position.set(Math.cos(angle) * 100, Math.sin(angle) * 100, 50);
    this.sunLight.intensity          = dayStrength * 1.2;
    this.ambientLight.intensity      = 0.15 + dayStrength * 0.45;

    // Warm orange tint at horizon, white at noon
    const sunHue = 0.08 + horizFactor * 0.06;
    const sunSat = 0.5  + horizFactor * 0.3;
    const sunLit = 0.5  + dayStrength * 0.5;
    this.sunLight.color.setHSL(sunHue, sunSat, sunLit);
  }
}
