export class WorldSettings {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this._el  = null;
  }

  show() {
    this.remove();
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.75);
      display:flex; align-items:center; justify-content:center;
      z-index:120; pointer-events:all; font-family:'Courier New',monospace;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background:rgba(10,18,30,0.97); border:2px solid #2a4a6a;
      border-radius:12px; padding:28px 32px; min-width:320px; max-width:420px; width:90%;
      color:#cce4ff;
    `;
    el.appendChild(panel);

    // Title
    const title = document.createElement('div');
    title.textContent = '⚙  World Settings';
    title.style.cssText = 'font-size:20px;font-weight:bold;margin-bottom:24px;color:#fff;letter-spacing:1px;';
    panel.appendChild(title);

    // ── Game Mode ─────────────────────────────────────────────────────────
    this._addSection(panel, 'GAME MODE');

    const modeRow = document.createElement('div');
    modeRow.style.cssText = 'display:flex;gap:10px;margin-bottom:8px;';

    const survBtn = this._btn('⚔️  Survival', this.game.mode === 'survival');
    const creaBtn = this._btn('🎨  Creative', this.game.mode === 'creative');

    const setMode = (mode) => {
      this.game.setMode(mode);
      survBtn.style.background = mode === 'survival' ? '#1a3a1a' : '#0d1a2e';
      survBtn.style.borderColor = mode === 'survival' ? '#3a9a3a' : '#2a4a6a';
      survBtn.style.color = mode === 'survival' ? '#fff' : '#4a7a9a';
      creaBtn.style.background = mode === 'creative' ? '#2a1a6a' : '#0d1a2e';
      creaBtn.style.borderColor = mode === 'creative' ? '#6a4aff' : '#2a4a6a';
      creaBtn.style.color = mode === 'creative' ? '#fff' : '#4a7a9a';
      descEl.textContent = mode === 'survival'
        ? 'Health & hunger active. You can be hurt.'
        : 'No damage. Instant break. Fly freely.';
    };

    survBtn.addEventListener('click', () => setMode('survival'));
    creaBtn.addEventListener('click', () => setMode('creative'));
    modeRow.appendChild(survBtn);
    modeRow.appendChild(creaBtn);
    panel.appendChild(modeRow);

    const descEl = document.createElement('div');
    descEl.style.cssText = 'font-size:11px;color:#6a9ab0;margin-bottom:20px;min-height:18px;';
    descEl.textContent = this.game.mode === 'survival'
      ? 'Health & hunger active. You can be hurt.'
      : 'No damage. Instant break. Fly freely.';
    panel.appendChild(descEl);

    // ── Multiplayer ───────────────────────────────────────────────────────
    this._addSection(panel, 'MULTIPLAYER');

    if (this.game.multiplayer?.connected) {
      // Already in a multiplayer room — show code + player list
      const code = this.game.multiplayer.roomCode;

      const codeBox = document.createElement('div');
      codeBox.style.cssText = `
        background:#0d1a2e; border:2px solid #2a4a6a; border-radius:8px;
        padding:14px; margin-bottom:12px; text-align:center;
      `;
      codeBox.innerHTML = `
        <div style="font-size:11px;color:#4a7a9a;letter-spacing:2px;margin-bottom:6px;">ROOM CODE — SHARE THIS WITH FRIENDS</div>
        <div style="font-size:32px;letter-spacing:8px;color:#7bcfff;font-weight:bold;">${code}</div>
      `;
      panel.appendChild(codeBox);

      const copyBtn = this._btn('📋  Copy Code', false);
      copyBtn.style.cssText += 'width:100%;margin-bottom:12px;';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard?.writeText(code).catch(() => {});
        copyBtn.textContent = '✓  Copied!';
        setTimeout(() => { copyBtn.textContent = '📋  Copy Code'; }, 2000);
      });
      panel.appendChild(copyBtn);

      // Player count
      const pCount = this.game.multiplayer.getPlayerCount?.() ?? 1;
      const pDiv = document.createElement('div');
      pDiv.style.cssText = 'font-size:12px;color:#6a9ab0;margin-bottom:16px;';
      pDiv.textContent = `Players in world: ${pCount}`;
      panel.appendChild(pDiv);

    } else {
      // Singleplayer — offer to open to multiplayer
      const mpDesc = document.createElement('div');
      mpDesc.style.cssText = 'font-size:12px;color:#6a9ab0;margin-bottom:12px;line-height:1.6;';
      mpDesc.textContent = 'Open this world to multiplayer. Other players can join using the room code.';
      panel.appendChild(mpDesc);

      const openBtn = this._btn('👥  Open to Multiplayer', false);
      openBtn.style.cssText += 'width:100%;margin-bottom:8px;';
      openBtn.addEventListener('click', () => {
        this.game.openToMultiplayer().then(code => {
          openBtn.style.display = 'none';
          const codeBox = document.createElement('div');
          codeBox.style.cssText = `
            background:#0d1a2e; border:2px solid #2a7a4a; border-radius:8px;
            padding:14px; text-align:center;
          `;
          codeBox.innerHTML = `
            <div style="font-size:11px;color:#4a9a6a;letter-spacing:2px;margin-bottom:6px;">ROOM CREATED — SHARE THIS CODE</div>
            <div style="font-size:32px;letter-spacing:8px;color:#7bcfff;font-weight:bold;">${code}</div>
            <div style="font-size:11px;color:#4a7a9a;margin-top:8px;">Friends can join from the home screen → Join World</div>
          `;
          panel.insertBefore(codeBox, openBtn);
        }).catch(err => {
          mpDesc.textContent = `Failed to open: ${err.message}`;
          mpDesc.style.color = '#ff6060';
        });
      });
      panel.appendChild(openBtn);
    }

    // ── Close button ──────────────────────────────────────────────────────
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      width:100%; margin-top:20px; padding:12px; border-radius:6px;
      background:#1a2a3a; color:#8aaccc; border:2px solid #2a4a6a;
      cursor:pointer; font-family:'Courier New',monospace; font-size:14px;
      transition:background 0.15s;
    `;
    closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = '#2a3a4a');
    closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = '#1a2a3a');
    closeBtn.addEventListener('click', () => this.remove());
    panel.appendChild(closeBtn);

    el.addEventListener('click', (e) => { if (e.target === el) this.remove(); });
    this._el = el;
    this.root.appendChild(el);
  }

  _addSection(parent, label) {
    const s = document.createElement('div');
    s.textContent = label;
    s.style.cssText = 'font-size:10px;letter-spacing:3px;color:#3a6a8a;margin-bottom:8px;padding-top:4px;';
    parent.appendChild(s);
  }

  _btn(label, active) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `
      flex:1; padding:10px 12px; border-radius:6px;
      border:2px solid ${active ? '#3a9a3a' : '#2a4a6a'};
      background:${active ? '#1a3a1a' : '#0d1a2e'};
      color:${active ? '#fff' : '#4a7a9a'};
      cursor:pointer; font-family:'Courier New',monospace;
      font-size:13px; font-weight:bold; transition:all 0.15s;
    `;
    return btn;
  }

  remove() {
    this._el?.remove();
    this._el = null;
  }
}
