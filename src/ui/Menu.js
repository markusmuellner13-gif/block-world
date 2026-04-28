export class Menu {
  constructor(root, game) {
    this.root    = root;
    this.game    = game;
    this._visible = false;
    this._el     = null;
    this._startEl = null;
  }

  showStart() {
    this._startEl = document.createElement('div');
    this._startEl.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.85);
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      z-index:100; pointer-events:all; font-family:'Courier New',monospace;
    `;
    this._startEl.innerHTML = `
      <h1 style="color:#fff;font-size:clamp(28px,5vw,56px);margin:0 0 8px;
        text-shadow:0 0 20px rgba(100,200,255,0.7);">
        ⛏ Block World
      </h1>
      <p style="color:#aaa;font-size:clamp(12px,2vw,16px);margin:0 0 40px;">
        A Minecraft-like voxel game
      </p>
      <button id="start-btn" style="
        padding:16px 48px; font-size:clamp(16px,2.5vw,22px); font-weight:bold;
        background:linear-gradient(135deg,#3a8a2a,#5aaa3a); color:#fff;
        border:none; border-radius:8px; cursor:pointer;
        font-family:'Courier New',monospace; letter-spacing:2px;
        box-shadow:0 4px 16px rgba(0,0,0,0.5); margin-bottom:24px;
        transition:transform 0.1s;
      ">PLAY</button>
      <div style="color:#666;font-size:12px;text-align:center;max-width:400px;line-height:1.8;">
        WASD: Move &nbsp;|&nbsp; Space: Jump &nbsp;|&nbsp; Shift: Sprint<br>
        F: Camera Mode &nbsp;|&nbsp; V: Toggle Fly &nbsp;|&nbsp; E: Inventory<br>
        Left Click: Break Block &nbsp;|&nbsp; Right Click: Place Block<br>
        1-9: Select Hotbar Slot &nbsp;|&nbsp; Esc: Pause
      </div>
    `;

    const btn = this._startEl.querySelector('#start-btn');
    btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.05)');
    btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
    btn.addEventListener('click', () => this._onStart());
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); this._onStart(); }, { passive: false });

    this.root.appendChild(this._startEl);
  }

  _onStart() {
    if (this._startEl) {
      this._startEl.remove();
      this._startEl = null;
    }
    this.game.controls.lock();
  }

  setVisible(show) {
    this._visible = show;
    if (show) {
      this._show();
    } else {
      if (this._el) { this._el.remove(); this._el = null; }
    }
  }

  _show() {
    if (this._el) this._el.remove();

    this._el = document.createElement('div');
    this._el.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.7);
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      z-index:100; pointer-events:all; font-family:'Courier New',monospace;
    `;
    this._el.innerHTML = `
      <div style="background:rgba(20,20,20,0.95);border:2px solid #444;border-radius:12px;
        padding:40px 60px;text-align:center;">
        <h2 style="color:#fff;margin:0 0 32px;font-size:28px;">Game Paused</h2>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <button class="menu-btn" id="resume-btn">Resume</button>
          <button class="menu-btn" id="controls-btn">Controls</button>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `.menu-btn {
      padding:12px 48px; font-size:16px; background:rgba(60,60,60,0.9);
      color:#fff; border:2px solid #666; border-radius:6px; cursor:pointer;
      font-family:'Courier New',monospace; letter-spacing:1px;
      transition:background 0.15s, border-color 0.15s;
    }
    .menu-btn:hover { background:rgba(100,100,100,0.9); border-color:#aaa; }`;
    this._el.appendChild(style);

    this._el.querySelector('#resume-btn').addEventListener('click', () => {
      this.game.togglePause();
    });
    this._el.querySelector('#controls-btn').addEventListener('click', () => {
      this._showControls();
    });

    this.root.appendChild(this._el);
  }

  _showControls() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.85);
      display:flex; align-items:center; justify-content:center;
      z-index:110; pointer-events:all; font-family:'Courier New',monospace;
    `;
    overlay.innerHTML = `
      <div style="background:rgba(20,20,20,0.98);border:2px solid #555;border-radius:10px;
        padding:32px; color:#ccc; font-size:14px; line-height:2;min-width:320px;">
        <h3 style="color:#fff;margin:0 0 16px;text-align:center;">Controls</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#aaa">WASD / Arrow Keys</td><td>Move</td></tr>
          <tr><td style="color:#aaa">Space</td><td>Jump</td></tr>
          <tr><td style="color:#aaa">Shift</td><td>Sprint</td></tr>
          <tr><td style="color:#aaa">Ctrl</td><td>Sneak</td></tr>
          <tr><td style="color:#aaa">Left Click (hold)</td><td>Break Block</td></tr>
          <tr><td style="color:#aaa">Right Click</td><td>Place Block</td></tr>
          <tr><td style="color:#aaa">Mouse Wheel / 1-9</td><td>Select Hotbar</td></tr>
          <tr><td style="color:#aaa">F</td><td>Cycle Camera</td></tr>
          <tr><td style="color:#aaa">V</td><td>Toggle Fly</td></tr>
          <tr><td style="color:#aaa">E</td><td>Inventory</td></tr>
          <tr><td style="color:#aaa">Escape</td><td>Pause</td></tr>
        </table>
        <button onclick="this.parentElement.parentElement.remove()" style="
          margin-top:20px; width:100%; padding:10px; background:#444;
          color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:14px;
          font-family:'Courier New',monospace;
        ">Back</button>
      </div>
    `;
    document.body.appendChild(overlay);
  }
}
