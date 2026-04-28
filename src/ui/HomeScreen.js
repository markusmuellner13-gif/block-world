export class HomeScreen {
  constructor(root, onStart) {
    this.root    = root;
    this.onStart = onStart; // fn(config) where config = { name, mode, multiplayer, roomCode, playerName }
    this._el     = null;
    this._tab    = 'new'; // 'new' | 'join'
    this._mode   = 'survival';
    this._mp     = false;
    this._build();
  }

  _build() {
    this._el = document.createElement('div');
    this._el.style.cssText = `
      position:fixed; inset:0; z-index:200; pointer-events:all;
      background: linear-gradient(180deg, #0a0a1a 0%, #0d1a2e 40%, #0a1a0a 100%);
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      font-family:'Courier New',Courier,monospace;
      overflow:hidden;
    `;

    // Animated background stars
    const stars = document.createElement('canvas');
    stars.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    this._el.appendChild(stars);
    this._animateStars(stars);

    // Floating block icons
    this._buildFloatingBlocks();

    // Content wrapper
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      position:relative; display:flex; flex-direction:column; align-items:center;
      width:100%; max-width:480px; padding:0 20px;
    `;
    this._el.appendChild(wrap);

    // ── Title ────────────────────────────────────────────────────────────────
    const title = document.createElement('div');
    title.innerHTML = `
      <div style="
        font-size:clamp(36px,7vw,72px); font-weight:900; letter-spacing:4px;
        color:#fff; text-shadow:0 0 30px rgba(80,200,255,0.6), 3px 3px 0 #1a3a6a;
        text-align:center; margin-bottom:6px; line-height:1;
      ">⛏ BLOCK WORLD</div>
      <div style="color:#4a9ad4;font-size:clamp(11px,2vw,14px);text-align:center;
        letter-spacing:3px; margin-bottom:clamp(24px,4vh,48px); opacity:0.8;">
        VOXEL ADVENTURE
      </div>
    `;
    wrap.appendChild(title);

    // ── Tab switcher ─────────────────────────────────────────────────────────
    const tabs = document.createElement('div');
    tabs.style.cssText = `
      display:flex; width:100%; margin-bottom:20px; border-radius:8px;
      overflow:hidden; border:2px solid #2a4a6a;
    `;
    const tabNew  = this._tabBtn('🌍  New World',  'new');
    const tabJoin = this._tabBtn('🔗  Join World', 'join');
    tabs.appendChild(tabNew);
    tabs.appendChild(tabJoin);
    wrap.appendChild(tabs);
    this._tabNew  = tabNew;
    this._tabJoin = tabJoin;

    // ── Panel area ───────────────────────────────────────────────────────────
    const panel = document.createElement('div');
    panel.style.cssText = `
      width:100%; background:rgba(10,20,35,0.85); border:2px solid #2a4a6a;
      border-radius:10px; padding:clamp(16px,3vw,28px); backdrop-filter:blur(8px);
    `;
    this._panel = panel;
    wrap.appendChild(panel);

    this._renderPanel();
    this.root.appendChild(this._el);
  }

  _tabBtn(label, id) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.dataset.tab = id;
    btn.style.cssText = `
      flex:1; padding:12px; border:none; cursor:pointer;
      font-family:'Courier New',monospace; font-size:clamp(12px,2vw,15px);
      font-weight:bold; letter-spacing:1px; transition:background 0.2s,color 0.2s;
      ${this._tab === id
        ? 'background:#1a4a8a; color:#7bcfff;'
        : 'background:#0d1a2e; color:#4a7a9a;'}
    `;
    btn.addEventListener('click', () => {
      this._tab = id;
      this._updateTabStyles();
      this._renderPanel();
    });
    return btn;
  }

  _updateTabStyles() {
    [this._tabNew, this._tabJoin].forEach(btn => {
      const active = btn.dataset.tab === this._tab;
      btn.style.background = active ? '#1a4a8a' : '#0d1a2e';
      btn.style.color      = active ? '#7bcfff' : '#4a7a9a';
    });
  }

  _renderPanel() {
    this._panel.innerHTML = '';
    if (this._tab === 'new') this._renderNewWorld();
    else                      this._renderJoinWorld();
  }

  _renderNewWorld() {
    const p = this._panel;

    // World name
    p.appendChild(this._label('World Name'));
    const nameInput = this._input('My World', 'text');
    p.appendChild(nameInput);

    // Player name
    p.appendChild(this._label('Your Name'));
    const playerInput = this._input('Player', 'text');
    p.appendChild(playerInput);

    // Mode selector
    p.appendChild(this._label('Game Mode'));
    const modeRow = document.createElement('div');
    modeRow.style.cssText = 'display:flex; gap:10px; margin-bottom:16px;';

    const survBtn = this._modeBtn('⚔️  Survival', 'survival');
    const creaBtn = this._modeBtn('🎨  Creative', 'creative');
    modeRow.appendChild(survBtn);
    modeRow.appendChild(creaBtn);
    p.appendChild(modeRow);
    this._survBtn = survBtn; this._creaBtn = creaBtn;
    this._refreshModeBtns();

    survBtn.addEventListener('click', () => { this._mode = 'survival'; this._refreshModeBtns(); });
    creaBtn.addEventListener('click', () => { this._mode = 'creative'; this._refreshModeBtns(); });

    // Mode description
    const modeDesc = document.createElement('div');
    modeDesc.id = 'mode-desc';
    modeDesc.style.cssText = `
      font-size:11px; color:#6a9ab0; margin-bottom:18px; min-height:32px; line-height:1.6;
    `;
    this._modeDesc = modeDesc;
    this._updateModeDesc();
    p.appendChild(modeDesc);

    // Multiplayer toggle
    p.appendChild(this._label('Players'));
    const mpRow = document.createElement('div');
    mpRow.style.cssText = 'display:flex; gap:10px; margin-bottom:20px;';
    const spBtn = this._modeBtn('👤  Single Player', 'sp');
    const mpBtn = this._modeBtn('👥  Multiplayer',   'mp');
    mpRow.appendChild(spBtn);
    mpRow.appendChild(mpBtn);
    p.appendChild(mpRow);
    this._spBtn = spBtn; this._mpBtn = mpBtn;
    this._refreshMpBtns();

    spBtn.addEventListener('click', () => { this._mp = false; this._refreshMpBtns(); });
    mpBtn.addEventListener('click', () => { this._mp = true;  this._refreshMpBtns(); });

    // Create button
    const createBtn = document.createElement('button');
    createBtn.textContent = '▶  CREATE WORLD';
    createBtn.style.cssText = `
      width:100%; padding:16px; font-size:clamp(14px,2.5vw,18px); font-weight:bold;
      letter-spacing:2px; background:linear-gradient(135deg,#1a6a2a,#2a9a3a);
      color:#fff; border:none; border-radius:8px; cursor:pointer;
      font-family:'Courier New',monospace;
      box-shadow:0 4px 16px rgba(0,0,0,0.5); transition:transform 0.1s,filter 0.1s;
    `;
    createBtn.addEventListener('mouseenter', () => createBtn.style.filter = 'brightness(1.2)');
    createBtn.addEventListener('mouseleave', () => createBtn.style.filter = '');
    createBtn.addEventListener('click', () => {
      this.onStart({
        worldName:  nameInput.value.trim() || 'My World',
        playerName: playerInput.value.trim() || 'Player',
        mode:       this._mode,
        multiplayer: this._mp,
        roomCode:   null,
      });
    });
    createBtn.addEventListener('touchstart', (e) => { e.preventDefault(); createBtn.click(); }, { passive: false });
    p.appendChild(createBtn);
  }

  _renderJoinWorld() {
    const p = this._panel;

    p.appendChild(this._label('Your Name'));
    const playerInput = this._input('Player', 'text');
    p.appendChild(playerInput);

    p.appendChild(this._label('Room Code'));
    const codeInput = this._input('ABC123', 'text');
    codeInput.style.cssText += 'text-transform:uppercase; letter-spacing:4px; font-size:20px; text-align:center;';
    codeInput.maxLength = 6;
    codeInput.addEventListener('input', () => { codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g,''); });
    p.appendChild(codeInput);

    // Error display
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'color:#ff6060;font-size:12px;min-height:20px;margin-bottom:10px;text-align:center;';
    this._joinErr = errDiv;
    p.appendChild(errDiv);

    const joinBtn = document.createElement('button');
    joinBtn.textContent = '🔗  JOIN WORLD';
    joinBtn.style.cssText = `
      width:100%; padding:16px; font-size:clamp(14px,2.5vw,18px); font-weight:bold;
      letter-spacing:2px; background:linear-gradient(135deg,#1a3a8a,#2a5aaa);
      color:#fff; border:none; border-radius:8px; cursor:pointer;
      font-family:'Courier New',monospace;
      box-shadow:0 4px 16px rgba(0,0,0,0.5); transition:filter 0.1s;
    `;
    joinBtn.addEventListener('mouseenter', () => joinBtn.style.filter = 'brightness(1.2)');
    joinBtn.addEventListener('mouseleave', () => joinBtn.style.filter = '');
    joinBtn.addEventListener('click', () => {
      const code = codeInput.value.trim();
      if (code.length < 6) { errDiv.textContent = 'Enter a 6-character room code.'; return; }
      errDiv.textContent = 'Connecting…';
      this.onStart({
        worldName:  'Joined World',
        playerName: playerInput.value.trim() || 'Player',
        mode:       'survival',
        multiplayer: true,
        roomCode:   code,
      });
    });
    joinBtn.addEventListener('touchstart', (e) => { e.preventDefault(); joinBtn.click(); }, { passive: false });
    p.appendChild(joinBtn);

    const hint = document.createElement('div');
    hint.style.cssText = 'color:#4a7a9a;font-size:11px;margin-top:12px;text-align:center;line-height:1.6;';
    hint.textContent = 'Ask the world host for their 6-character room code.';
    p.appendChild(hint);
  }

  _label(text) {
    const l = document.createElement('div');
    l.textContent = text;
    l.style.cssText = 'color:#7aaccf;font-size:11px;letter-spacing:2px;margin-bottom:6px;text-transform:uppercase;';
    return l;
  }

  _input(placeholder, type = 'text') {
    const i = document.createElement('input');
    i.type        = type;
    i.placeholder = placeholder;
    i.style.cssText = `
      width:100%; padding:10px 14px; background:rgba(0,20,40,0.7);
      border:2px solid #2a4a6a; border-radius:6px; color:#cce4ff;
      font-family:'Courier New',monospace; font-size:15px;
      outline:none; margin-bottom:14px; box-sizing:border-box;
      transition:border-color 0.2s;
    `;
    i.addEventListener('focus', () => i.style.borderColor = '#4a8abf');
    i.addEventListener('blur',  () => i.style.borderColor = '#2a4a6a');
    return i;
  }

  _modeBtn(label, id) {
    const btn = document.createElement('button');
    btn.textContent  = label;
    btn.dataset.mode = id;
    btn.style.cssText = `
      flex:1; padding:10px 8px; border-radius:6px; border:2px solid #2a4a6a;
      background:#0d1a2e; color:#4a7a9a; cursor:pointer;
      font-family:'Courier New',monospace; font-size:clamp(11px,1.8vw,13px);
      font-weight:bold; transition:all 0.2s; white-space:nowrap;
    `;
    return btn;
  }

  _refreshModeBtns() {
    [this._survBtn, this._creaBtn].forEach(btn => {
      if (!btn) return;
      const active = btn.dataset.mode === this._mode;
      btn.style.background    = active ? (this._mode === 'creative' ? '#2a1a6a' : '#1a3a1a') : '#0d1a2e';
      btn.style.color         = active ? '#fff' : '#4a7a9a';
      btn.style.borderColor   = active ? (this._mode === 'creative' ? '#6a4aff' : '#3a9a3a') : '#2a4a6a';
    });
    if (this._updateModeDesc) this._updateModeDesc();
  }

  _updateModeDesc() {
    if (!this._modeDesc) return;
    this._modeDesc.textContent = this._mode === 'survival'
      ? 'Gather resources, manage health & hunger. You can be hurt and must survive.'
      : 'Unlimited blocks, instant breaking, fly freely. No damage — build anything.';
  }

  _refreshMpBtns() {
    [this._spBtn, this._mpBtn].forEach(btn => {
      if (!btn) return;
      const active = btn.dataset.mode === (this._mp ? 'mp' : 'sp');
      btn.style.background  = active ? '#1a3a5a' : '#0d1a2e';
      btn.style.color       = active ? '#7bcfff' : '#4a7a9a';
      btn.style.borderColor = active ? '#3a7abf' : '#2a4a6a';
    });
  }

  _animateStars(canvas) {
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const ctx  = canvas.getContext('2d');
    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.5 + 0.3,
      b: Math.random(),
      s: Math.random() * 0.005 + 0.002,
    }));
    const tick = (t) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.b = (s.b + s.s) % 1;
        ctx.globalAlpha = 0.3 + Math.sin(s.b * Math.PI * 2) * 0.3;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  _buildFloatingBlocks() {
    const colors = ['#5a9e3c','#888','#d4b860','#8B6914','#50e8e0','#f0c820'];
    for (let i = 0; i < 8; i++) {
      const b = document.createElement('div');
      const size = 24 + Math.random() * 32;
      b.style.cssText = `
        position:absolute; width:${size}px; height:${size}px;
        background:${colors[i % colors.length]};
        opacity:${0.05 + Math.random() * 0.08};
        left:${Math.random() * 90}%; top:${Math.random() * 90}%;
        border-radius:4px; pointer-events:none;
        animation: float${i} ${5 + Math.random() * 6}s ease-in-out infinite;
        transform:rotate(${Math.random() * 45}deg);
      `;
      this._el.appendChild(b);
    }
    const style = document.createElement('style');
    for (let i = 0; i < 8; i++) {
      style.textContent += `
        @keyframes float${i} {
          0%,100%{ transform:translateY(0) rotate(${i*5}deg); }
          50%{ transform:translateY(-${10+i*3}px) rotate(${i*5+10}deg); }
        }`;
    }
    document.head.appendChild(style);
  }

  showError(message) {
    if (this._joinErr) this._joinErr.textContent = message;
  }

  remove() {
    this._el?.remove();
  }
}
