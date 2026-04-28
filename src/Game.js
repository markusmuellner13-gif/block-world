import * as THREE from 'three';
import { World } from './world/World.js';
import { Player } from './player/Player.js';
import { Controls } from './player/Controls.js';
import { HUD } from './ui/HUD.js';
import { Menu } from './ui/Menu.js';
import { MobileControls } from './ui/MobileControls.js';
import { Sky } from './rendering/Sky.js';
import { TextureManager } from './rendering/TextureManager.js';
import { EntityManager } from './entities/EntityManager.js';
import { DAY_LENGTH } from './Constants.js';

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.uiRoot = uiRoot;
    this.running = false;
    this.paused = false;
    this.dayTime = 0.25; // start at dawn
    this._lastTime = 0;

    this._setupRenderer();
    this._setupScene();
    this.textures = new TextureManager();
    this.world = new World(this.scene, this.textures);
    this.entities = new EntityManager(this.scene, this.world, this.textures);
    this.player = new Player(this.scene, this.world, this.camera);
    this.controls = new Controls(this.canvas, this.player, this);
    this.sky = new Sky(this.scene);
    this.hud = new HUD(uiRoot, this.player);
    this.menu = new Menu(uiRoot, this);
    this.mobileControls = new MobileControls(uiRoot, this.controls);
    this._bindEvents();
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,     // pixelated look like Minecraft
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87ceeb, 60, 120);

    this.camera = new THREE.PerspectiveCamera(
      70, window.innerWidth / window.innerHeight, 0.05, 400
    );

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 200;
    this.sunLight.shadow.camera.left = -80;
    this.sunLight.shadow.camera.right = 80;
    this.sunLight.shadow.camera.top = 80;
    this.sunLight.shadow.camera.bottom = -80;
    this.scene.add(this.sunLight);
  }

  _bindEvents() {
    window.addEventListener('resize', () => {
      const w = window.innerWidth, h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') this.togglePause();
    });
  }

  togglePause() {
    this.paused = !this.paused;
    this.menu.setVisible(this.paused);
    if (this.paused) {
      this.controls.unlock();
    } else {
      this.controls.lock();
    }
  }

  start() {
    this.running = true;
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
    this.hud.update();
    this.sky.update(this.dayTime);

    this.renderer.render(this.scene, this.camera);
  }

  _updateLighting() {
    const t = this.dayTime;
    const angle = t * Math.PI * 2 - Math.PI / 2;
    this.sunLight.position.set(
      Math.cos(angle) * 100,
      Math.sin(angle) * 100,
      50
    );

    // Night/day color transition
    const dayStrength = Math.max(0, Math.sin(angle + Math.PI / 2));
    const nightBlend = 1 - dayStrength;

    const skyDay = new THREE.Color(0x87ceeb);
    const skyNight = new THREE.Color(0x05051a);
    const sky = skyDay.clone().lerp(skyNight, nightBlend);
    this.scene.background = sky;
    this.scene.fog.color.copy(sky);

    this.sunLight.intensity = dayStrength * 1.2;
    this.ambientLight.intensity = 0.15 + dayStrength * 0.45;

    this.sunLight.color.setHSL(0.08, 0.5, 0.5 + dayStrength * 0.5);
  }
}
