import { HomeScreen } from './ui/HomeScreen.js';
import { Game } from './Game.js';
import { MultiplayerClient } from './multiplayer/MultiplayerClient.js';

const canvas  = document.getElementById('game-canvas');
const uiRoot  = document.getElementById('ui-root');

// Keep canvas always full-screen at native DPR
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width  = Math.floor(window.innerWidth  * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width  = window.innerWidth  + 'px';
  canvas.style.height = window.innerHeight + 'px';
}
resize();
window.addEventListener('resize', resize);

// ── Show home screen ───────────────────────────────────────────────────────
const homeScreen = new HomeScreen(uiRoot, async (config) => {
  // config = { worldName, playerName, mode, multiplayer, roomCode }

  let mp     = null;
  let seed   = null;
  let mode   = config.mode;
  let roomCode = null;

  if (config.multiplayer) {
    mp = new MultiplayerClient();

    // Show loading overlay
    const loadEl = _showLoading(uiRoot, config.roomCode ? 'Joining world…' : 'Creating room…');

    try {
      await mp.connect();

      if (config.roomCode) {
        // Joining an existing room
        const data = await mp.joinRoom(config.roomCode, config.playerName);
        seed     = data.seed;
        mode     = data.mode;
        roomCode = data.code;
      } else {
        // Creating a new room
        const data = await mp.createRoom(config.playerName, mode);
        seed     = data.seed;
        roomCode = data.code;
      }
      loadEl.remove();
    } catch (err) {
      loadEl.remove();
      homeScreen.showError(err.message || 'Connection failed. Try again.');
      mp.disconnect();
      return;
    }
  }

  homeScreen.remove();

  const game = new Game(canvas, uiRoot, {
    worldName:  config.worldName,
    playerName: config.playerName,
    mode,
    seed:       seed ?? Math.floor(Math.random() * 999999) + 1,
    multiplayer: mp,
    roomCode,
  });
  game.start();
});

function _showLoading(root, text) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.7);
    display:flex; align-items:center; justify-content:center;
    z-index:300; font-family:'Courier New',monospace; color:#7bcfff; font-size:18px;
    letter-spacing:2px;
  `;
  el.textContent = text;
  root.appendChild(el);
  return el;
}
