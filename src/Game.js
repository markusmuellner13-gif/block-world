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
import { EntityManager } from './entities/EntityManager.js';
import { RemotePlayer } from './multiplayer/RemotePlayer.js';
import { BLOCKS } from './world/BlockRegistry.js';
import { DAY_LENGTH } from './Constants.js';

export class Game {
  constructor(canvas, uiRoot, config = {}) {
    this.canvas     = canvas;
    this.uiRoot     = uiRoot;
    this.config     = config;
    this.mode       = config.mode || 'survival';  // 'survival' | 'creative'
    this.multiplayer = config.multiplayer || null; // MultiplayerClient or null
    this.roomCode   = config.roomCode || null;

    this.running    = false;
    this.paused     = false;
    this.dayTime    = 0.25;
    this._lastTime  = 0;
    this._mpUpdateTimer = 0;

    this.remotePlayers = new Map(); // id → RemotePlayer

    this._setupRenderer();
    this._setupScene();

    this.textures  = new TextureManager();
    this.world     = new World(this.scene, this.textures, config.seed);
    this.entities  = new EntityManager(this.scene, this.world, this.textures);
    this.player    = new Player(this.scene, this.world, this.camera, this);
    this.controls  = new Controls(this.canvas, this.player, this);
    this.sky       = new Sky(this.scene);
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
      if (e.code === 'Escape') this.togglePause();
    });
  }

  // ── Multiplayer wiring ───────────────────────────────────────────────────
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
      this.hud.showNotification(`A player left`);
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

    // Spawn remote players already in room
    for (const p of mp.getRemotePlayers()) {
      const rp = new RemotePlayer(p.id, p.name, this.scene);
      this.remotePlayers.set(p.id, rp);
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────
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

  start() {
    this.running = true;
    // Force-generate spawn area so player doesn't fall through
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
    if (this.paused || !this.controls.locked) return;

    this.dayTime = (this.dayTime + dt / DAY_LENGTH) % 1;
    this._updateLighting();

    this.world.update(this.player.position);
    this.player.update(dt, this.controls);
    this.entities.update(dt, this.player.position);
    this.sky.update(this.dayTime);
    this.hud.update();

    // Send position to server ~20 times/sec
    if (this.multiplayer?.connected) {
      this._mpUpdateTimer += dt;
      if (this._mpUpdateTimer >= 0.05) {
        this._mpUpdateTimer = 0;
        const p = this.player;
        this.multiplayer.sendPlayerUpdate(
          p.position.x, p.position.y, p.position.z, p.yaw, p.pitch
        );
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  _updateLighting() {
    const angle      = this.dayTime * Math.PI * 2 - Math.PI / 2;
    this.sunLight.position.set(Math.cos(angle) * 100, Math.sin(angle) * 100, 50);
    const dayStrength  = Math.max(0, Math.sin(angle + Math.PI / 2));
    const nightBlend   = 1 - dayStrength;
    const sky          = new THREE.Color(0x87ceeb).lerp(new THREE.Color(0x05051a), nightBlend);
    this.scene.background   = sky;
    this.scene.fog.color.copy(sky);
    this.sunLight.intensity  = dayStrength * 1.2;
    this.ambientLight.intensity = 0.15 + dayStrength * 0.45;
    this.sunLight.color.setHSL(0.08, 0.5, 0.5 + dayStrength * 0.5);
  }
}
