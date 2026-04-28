export class MultiplayerClient {
  constructor() {
    this._ws        = null;
    this._handlers  = {};
    this.connected  = false;
    this.playerId   = null;
    this.roomCode   = null;
    this._players   = new Map(); // id → {name,x,y,z,yaw,pitch}
  }

  connect() {
    return new Promise((resolve, reject) => {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url   = `${proto}//${location.host}`;
      this._ws    = new WebSocket(url);

      const timeout = setTimeout(() => reject(new Error('Connection timed out')), 8000);

      this._ws.addEventListener('open', () => {
        clearTimeout(timeout);
        this.connected = true;
        resolve();
      });

      this._ws.addEventListener('close', () => {
        this.connected = false;
        this._emit('disconnect', {});
      });

      this._ws.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(new Error('WebSocket connection failed'));
      });

      this._ws.addEventListener('message', (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        this._handleMessage(msg);
      });
    });
  }

  _handleMessage(msg) {
    switch (msg.type) {
      case 'created':
        this.playerId = msg.playerId;
        this.roomCode = msg.code;
        this._emit('created', msg);
        break;

      case 'joined':
        this.playerId = msg.playerId;
        this.roomCode = msg.code;
        for (const p of (msg.players || [])) this._players.set(p.id, p);
        this._emit('joined', msg);
        break;

      case 'playerJoin':
        this._players.set(msg.id, { id: msg.id, name: msg.name, x: 0, y: 80, z: 0, yaw: 0, pitch: 0 });
        this._emit('playerJoin', msg);
        break;

      case 'playerLeave':
        this._players.delete(msg.id);
        this._emit('playerLeave', msg);
        break;

      case 'playerUpdate':
        if (this._players.has(msg.id)) {
          const p = this._players.get(msg.id);
          p.x = msg.x; p.y = msg.y; p.z = msg.z;
          p.yaw = msg.yaw; p.pitch = msg.pitch;
        }
        this._emit('playerUpdate', msg);
        break;

      case 'blockChange':
        this._emit('blockChange', msg);
        break;

      case 'modeChange':
        this._emit('modeChange', msg);
        break;

      case 'chat':
        this._emit('chat', msg);
        break;

      case 'error':
        this._emit('error', msg);
        break;
    }
  }

  // ── Send helpers ──────────────────────────────────────────────────────────
  _send(obj) {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(obj));
    }
  }

  createRoom(playerName, mode) {
    return new Promise((resolve, reject) => {
      this.once('created', resolve);
      this.once('error',   reject);
      this._send({ type: 'create', name: playerName, mode });
    });
  }

  joinRoom(code, playerName) {
    return new Promise((resolve, reject) => {
      this.once('joined', resolve);
      this.once('error',  (msg) => reject(new Error(msg.message)));
      this._send({ type: 'join', code, name: playerName });
    });
  }

  sendPlayerUpdate(x, y, z, yaw, pitch) {
    this._send({ type: 'playerUpdate', x, y, z, yaw, pitch });
  }

  sendBlockChange(wx, wy, wz, blockId) {
    this._send({ type: 'blockChange', wx, wy, wz, blockId });
  }

  sendModeChange(mode) {
    this._send({ type: 'modeChange', mode });
  }

  sendChat(message) {
    this._send({ type: 'chat', message });
  }

  getPlayerCount() {
    return this._players.size + 1; // +1 for self
  }

  getRemotePlayers() {
    return [...this._players.values()];
  }

  disconnect() {
    this._ws?.close();
    this.connected = false;
  }

  // ── Event emitter (tiny) ─────────────────────────────────────────────────
  on(event, fn) {
    if (!this._handlers[event]) this._handlers[event] = [];
    this._handlers[event].push(fn);
    return this;
  }

  once(event, fn) {
    const wrapper = (data) => { this.off(event, wrapper); fn(data); };
    return this.on(event, wrapper);
  }

  off(event, fn) {
    this._handlers[event] = (this._handlers[event] || []).filter(h => h !== fn);
    return this;
  }

  _emit(event, data) {
    for (const fn of (this._handlers[event] || [])) fn(data);
  }
}
