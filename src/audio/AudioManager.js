export class AudioManager {
  constructor() {
    this._ctx = null;
    this._footstepTimer = 0;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) {}
  }

  _resume() {
    if (!this._ctx) return false;
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return true;
  }

  _osc(freq, dur, vol, type = 'square') {
    if (!this._resume()) return;
    const t = this._ctx.currentTime;
    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq * 0.3), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this._ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  _noise(dur, vol, decay = 0.35) {
    if (!this._resume()) return;
    const sr  = this._ctx.sampleRate;
    const len = Math.floor(sr * dur);
    const buf = this._ctx.createBuffer(1, len, sr);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * vol * Math.exp(-i / (len * decay));
    const src  = this._ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this._ctx.destination);
    src.start();
  }

  blockBreak() {
    this._noise(0.14, 0.5, 0.3);
    this._osc(90 + Math.random() * 30, 0.09, 0.2);
  }

  blockPlace() {
    this._osc(130 + Math.random() * 20, 0.08, 0.3);
    this._noise(0.05, 0.28, 0.8);
  }

  footstep() {
    this._osc(55 + Math.random() * 15, 0.06, 0.11);
  }

  playerHurt() {
    this._osc(340, 0.15, 0.4, 'sine');
    this._osc(200, 0.12, 0.2, 'sine');
  }

  splash() {
    this._noise(0.25, 0.6, 0.5);
  }

  zombieGroan() {
    this._osc(70 + Math.random() * 25, 0.5, 0.28, 'sawtooth');
  }

  // Call every frame; triggers footstep at regular intervals while moving on ground
  updateFootsteps(dt, isMoving, isOnGround, isSprinting) {
    if (isMoving && isOnGround) {
      this._footstepTimer -= dt;
      if (this._footstepTimer <= 0) {
        this.footstep();
        this._footstepTimer = isSprinting ? 0.28 : 0.38;
      }
    } else {
      this._footstepTimer = 0;
    }
  }
}
