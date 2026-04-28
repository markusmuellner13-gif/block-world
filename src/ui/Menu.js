export class Menu {
  constructor(root, game) {
    this.root    = root;
    this.game    = game;
    this._visible = false;
    this._el     = null;
    this._startEl = null;
  }

  showStart() {
    // World has been set up by HomeScreen. Show a minimal "click to play" prompt.
    this._startEl = document.createElement('div');
    this._startEl.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.55);
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      z-index:100; pointer-events:all; font-family:'Courier New',monospace;
      cursor:pointer;
    `;
    const worldName  = this.game.config.worldName  || 'Block World';
    const modeBadge  = this.game.mode === 'creative'
      ? '<span style="color:#9a7aff;">🎨 Creative</span>'
      : '<span style="color:#4a9a4a;">⚔️ Survival</span>';
    const mpBadge    = this.game.roomCode
      ? `<span style="color:#4a9abf;">👥 Room: ${this.game.roomCode}</span>`
      : '';

    this._startEl.innerHTML = `
      <div style="text-align:center;padding:32px 48px;background:rgba(10,18,30,0.9);
        border:2px solid #2a4a6a;border-radius:12px;pointer-events:none;">
        <div style="color:#fff;font-size:clamp(22px,4vw,36px);font-weight:bold;
          margin-bottom:8px;letter-spacing:2px;">${worldName}</div>
        <div style="font-size:13px;margin-bottom:28px;display:flex;gap:16px;
          justify-content:center;flex-wrap:wrap;">
          ${modeBadge} ${mpBadge}
        </div>
        <div style="color:#7bcfff;font-size:clamp(14px,2.5vw,18px);letter-spacing:3px;
          animation:blink 1.2s ease-in-out infinite;">CLICK TO PLAY</div>
      </div>
    `;
    const style = document.createElement('style');
    style.textContent = `@keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}`;
    this._startEl.appendChild(style);

    const doStart = () => this._onStart();
    this._startEl.addEventListener('click', doStart);
    this._startEl.addEventListener('touchstart', (e) => { e.preventDefault(); doStart(); }, { passive: false });
    this.root.appendChild(this._startEl);
  }

  _onStart() {
    if (this._startEl) { this._startEl.remove(); this._startEl = null; }
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
    const modeLabel = this.game.mode === 'creative' ? '🎨 Creative' : '⚔️ Survival';
    const mpLabel   = this.game.multiplayer?.connected ? `👥 Room: ${this.game.roomCode}` : '👤 Singleplayer';
    this._el.innerHTML = `
      <div style="background:rgba(10,18,30,0.97);border:2px solid #2a4a6a;border-radius:12px;
        padding:36px 56px;text-align:center;min-width:280px;">
        <h2 style="color:#fff;margin:0 0 4px;font-size:26px;letter-spacing:1px;">Game Paused</h2>
        <div style="color:#4a8abf;font-size:12px;margin-bottom:28px;letter-spacing:2px;">
          ${modeLabel} &nbsp;·&nbsp; ${mpLabel}
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <button class="menu-btn" id="resume-btn">▶  Resume</button>
          <button class="menu-btn" id="settings-btn">⚙  World Settings</button>
          <button class="menu-btn" id="controls-btn">⌨  Controls</button>
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
    this._el.querySelector('#settings-btn').addEventListener('click', () => {
      this.game.worldSettings.show();
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
