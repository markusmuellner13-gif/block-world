import { CAMERA_MODES } from '../Constants.js';

const DOUBLE_TAP_MS = 280; // max gap between W presses to trigger sprint

export class Controls {
  constructor(canvas, player, game) {
    this.canvas = canvas;
    this.player = player;
    this.game   = game;
    this.locked = false;

    this.keys         = {};
    this.mouseButtons = {};
    this.mouseDelta   = { x: 0, y: 0 };
    this.scrollDelta  = 0;

    // Mobile touch
    this.joystick    = { active: false, x: 0, y: 0, id: -1, ox: 0, oy: 0, bx: 0, by: 0 };
    this.touchLook   = { active: false, id: -1, lx: 0, ly: 0 };
    this.touchButtons = {};

    // Sprint state (double-tap W)
    this._sprintDetect = { lastPress: 0, active: false };

    this._bindPointerLock();
    this._bindKeyboard();
    this._bindMouse();
    this._bindTouch();
  }

  _bindPointerLock() {
    this.canvas.addEventListener('click', () => {
      if (!this.locked && !this.game.paused && !this.game.inventoryOpen) {
        this.canvas.requestPointerLock();
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
    });
  }

  lock()   { this.canvas.requestPointerLock(); }
  unlock() { document.exitPointerLock(); }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      const wasDown = this.keys[e.code];
      this.keys[e.code] = true;

      if (e.code === 'KeyF' && !e.repeat) this.player.cycleCamera();
      if (e.code === 'KeyE' && !e.repeat) this.game.hud.toggleInventory();
      if (e.code === 'KeyV' && !e.repeat) this.player.toggleFly();
      if (e.code === 'F3'  && !e.repeat) this.game.hud.toggleF3();

      // Double-tap W → sprint
      if (e.code === 'KeyW' && !wasDown) {
        const now = performance.now();
        if (now - this._sprintDetect.lastPress < DOUBLE_TAP_MS) {
          this._sprintDetect.active = true;
        }
        this._sprintDetect.lastPress = now;
      }

      // Hotbar 1-9
      if (e.code.startsWith('Digit')) {
        const n = parseInt(e.code.replace('Digit', '')) - 1;
        if (n >= 0 && n <= 8) this.player.inventory.selectSlot(n);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      // Cancel sprint when W is released
      if (e.code === 'KeyW') {
        this._sprintDetect.active = false;
      }
      // Cancel sprint when sneaking
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        // sneak released – sprint may resume if W still held
      }
    });
  }

  _bindMouse() {
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDelta.x += e.movementX;
      this.mouseDelta.y += e.movementY;
    });
    this.canvas.addEventListener('mousedown', (e) => { this.mouseButtons[e.button] = true; });
    this.canvas.addEventListener('mouseup',   (e) => { this.mouseButtons[e.button] = false; });
    this.canvas.addEventListener('wheel', (e) => { this.scrollDelta += e.deltaY; }, { passive: true });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _bindTouch() {
    const el = this.canvas;

    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const { clientX: x, clientY: y, identifier: id } = touch;
        const leftSide = x < window.innerWidth * 0.45;
        if (leftSide && !this.joystick.active) {
          this.joystick = { active: true, id, ox: x, oy: y, bx: x, by: y, x: 0, y: 0 };
        } else if (!leftSide && !this.touchLook.active) {
          this.touchLook = { active: true, id, lx: x, ly: y };
          this.locked = true;
        }
      }
    }, { passive: false });

    el.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const { clientX: x, clientY: y, identifier: id } = touch;
        if (this.joystick.active && id === this.joystick.id) {
          const dx = x - this.joystick.ox;
          const dy = y - this.joystick.oy;
          const len = Math.sqrt(dx * dx + dy * dy);
          const maxR = 40;
          const scale = len > maxR ? maxR / len : 1;
          this.joystick.x  = dx * scale / maxR;
          this.joystick.y  = dy * scale / maxR;
          this.joystick.bx = this.joystick.ox + dx * scale;
          this.joystick.by = this.joystick.oy + dy * scale;
        } else if (this.touchLook.active && id === this.touchLook.id) {
          this.mouseDelta.x += (x - this.touchLook.lx) * 1.5;
          this.mouseDelta.y += (y - this.touchLook.ly) * 1.5;
          this.touchLook.lx = x;
          this.touchLook.ly = y;
        }
      }
    }, { passive: false });

    el.addEventListener('touchend', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const { identifier: id } = touch;
        if (this.joystick.active && id === this.joystick.id)
          this.joystick = { active: false, id: -1, x: 0, y: 0, ox: 0, oy: 0, bx: 0, by: 0 };
        if (this.touchLook.active && id === this.touchLook.id)
          this.touchLook = { active: false, id: -1, lx: 0, ly: 0 };
      }
    }, { passive: false });
  }

  consumeDeltas() {
    const dx = this.mouseDelta.x, dy = this.mouseDelta.y, scroll = this.scrollDelta;
    this.mouseDelta.x = 0; this.mouseDelta.y = 0; this.scrollDelta = 0;
    return { dx, dy, scroll };
  }

  isDown(code)      { return !!this.keys[code]; }
  isMouseDown(btn)  { return !!this.mouseButtons[btn]; }

  getMovement() {
    let fx = 0, fz = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp'))    fz -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown'))  fz += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft'))  fx -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) fx += 1;
    if (this.joystick.active) { fx += this.joystick.x; fz += this.joystick.y; }
    const len = Math.sqrt(fx*fx + fz*fz);
    if (len > 1) { fx /= len; fz /= len; }
    return { fx, fz };
  }

  get jumping()   { return this.isDown('Space') || !!this.touchButtons['jump']; }
  // Sprint = double-tap W (held) – also cancel when sneaking
  get sprinting() {
    return (this._sprintDetect.active && this.isDown('KeyW') && !this.sneaking)
      || !!this.touchButtons['sprint'];
  }
  // Sneak = Shift (left or right)
  get sneaking()  { return this.isDown('ShiftLeft') || this.isDown('ShiftRight') || !!this.touchButtons['sneak']; }
  get breaking()  { return this.isMouseDown(0) || !!this.touchButtons['break']; }
  get placing()   { return this.isMouseDown(2) || !!this.touchButtons['place']; }
}
