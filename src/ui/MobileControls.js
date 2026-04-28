export class MobileControls {
  constructor(root, controls) {
    this.root     = root;
    this.controls = controls;
    this._isMobile = window.matchMedia('(pointer:coarse)').matches || window.innerWidth < 900;
    if (this._isMobile) this._build();
    window.addEventListener('resize', () => {
      const wasMobile = this._isMobile;
      this._isMobile = window.matchMedia('(pointer:coarse)').matches || window.innerWidth < 900;
      if (this._isMobile && !wasMobile) this._build();
      if (!this._isMobile && wasMobile && this._container) this._container.remove();
    });
  }

  _build() {
    if (this._container) this._container.remove();

    const c = document.createElement('div');
    c.style.cssText = `
      position:fixed; inset:0; pointer-events:none; z-index:50;
    `;
    this._container = c;
    this.root.appendChild(c);

    // Joystick zone (left 45% of screen)
    const jZone = document.createElement('div');
    jZone.style.cssText = `
      position:absolute; left:0; top:0; width:45%; height:100%;
      pointer-events:all;
    `;
    c.appendChild(jZone);

    // Joystick visual
    this._jBase = document.createElement('div');
    this._jBase.style.cssText = `
      position:absolute; width:80px; height:80px; border-radius:50%;
      background:rgba(255,255,255,0.15); border:2px solid rgba(255,255,255,0.4);
      left:50px; bottom:100px; pointer-events:none; transition:opacity 0.2s;
    `;
    jZone.appendChild(this._jBase);

    this._jStick = document.createElement('div');
    this._jStick.style.cssText = `
      position:absolute; width:36px; height:36px; border-radius:50%;
      background:rgba(255,255,255,0.5); left:22px; top:22px; pointer-events:none;
    `;
    this._jBase.appendChild(this._jStick);

    // Sync joystick visual with controls
    const updateJoy = () => {
      const jx = this.controls.joystick.bx - this.controls.joystick.ox;
      const jy = this.controls.joystick.by - this.controls.joystick.oy;
      this._jStick.style.left = 22 + jx + 'px';
      this._jStick.style.top  = 22 + jy + 'px';
      this._jBase.style.opacity = this.controls.joystick.active ? '1' : '0.5';
      requestAnimationFrame(updateJoy);
    };
    updateJoy();

    // Action buttons (right side)
    const btnArea = document.createElement('div');
    btnArea.style.cssText = `
      position:absolute; right:16px; bottom:80px;
      display:flex; flex-direction:column; gap:10px; pointer-events:all;
    `;
    c.appendChild(btnArea);

    const makeBtn = (label, color, action) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = `
        width:64px; height:64px; border-radius:50%; border:none;
        background:${color}; color:#fff; font-size:13px; font-weight:bold;
        cursor:pointer; -webkit-tap-highlight-color:transparent;
        font-family:'Courier New',monospace; box-shadow:0 4px 8px rgba(0,0,0,0.4);
        touch-action:manipulation;
      `;
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.controls.touchButtons[action] = true;
      }, { passive: false });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.controls.touchButtons[action] = false;
      }, { passive: false });
      return btn;
    };

    // Jump
    const jumpRow = document.createElement('div');
    jumpRow.style.cssText = 'display:flex; gap:10px; justify-content:flex-end;';
    jumpRow.appendChild(makeBtn('JUMP', 'rgba(60,150,60,0.8)', 'jump'));
    btnArea.appendChild(jumpRow);

    // Break / Place
    const actRow = document.createElement('div');
    actRow.style.cssText = 'display:flex; gap:10px;';
    actRow.appendChild(makeBtn('⛏', 'rgba(180,80,20,0.8)', 'break'));
    actRow.appendChild(makeBtn('🧱', 'rgba(80,80,180,0.8)', 'place'));
    btnArea.appendChild(actRow);

    // Sprint / Sneak
    const moveRow = document.createElement('div');
    moveRow.style.cssText = 'display:flex; gap:10px;';
    moveRow.appendChild(makeBtn('↑↑', 'rgba(180,140,20,0.8)', 'sprint'));
    moveRow.appendChild(makeBtn('▼', 'rgba(80,80,80,0.8)', 'sneak'));
    btnArea.appendChild(moveRow);

    // Top bar: inventory, camera, fly
    const topBar = document.createElement('div');
    topBar.style.cssText = `
      position:absolute; top:16px; right:16px;
      display:flex; gap:10px; pointer-events:all;
    `;
    c.appendChild(topBar);

    const topBtn = (label, color, cb) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = `
        padding:8px 12px; border-radius:6px; border:none;
        background:${color}; color:#fff; font-size:12px;
        cursor:pointer; font-family:'Courier New',monospace;
        touch-action:manipulation;
      `;
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); cb(); }, { passive: false });
      return btn;
    };

    topBar.appendChild(topBtn('E', 'rgba(80,80,80,0.7)', () => {
      const e = new KeyboardEvent('keydown', { code: 'KeyE' });
      window.dispatchEvent(e);
    }));
    topBar.appendChild(topBtn('F', 'rgba(80,80,80,0.7)', () => {
      const e = new KeyboardEvent('keydown', { code: 'KeyF' });
      window.dispatchEvent(e);
    }));
    topBar.appendChild(topBtn('V', 'rgba(80,80,80,0.7)', () => {
      const e = new KeyboardEvent('keydown', { code: 'KeyV' });
      window.dispatchEvent(e);
    }));
  }
}
