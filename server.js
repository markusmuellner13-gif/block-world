import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// ── Room state ────────────────────────────────────────────────────────────────
const rooms = new Map();   // code → { code, seed, mode, players: Map<id,player>, blockChanges: [] }
const clients = new Map(); // ws → { id, name, roomCode }

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

function broadcast(room, msg, excludeId = null) {
  const json = JSON.stringify(msg);
  for (const [pid, p] of room.players) {
    if (pid !== excludeId && p.ws.readyState === 1) p.ws.send(json);
  }
}

wss.on('connection', (ws) => {
  const id = randomUUID();
  clients.set(ws, { id, name: 'Player', roomCode: null });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const client = clients.get(ws);

    switch (msg.type) {

      case 'create': {
        let code;
        do { code = generateCode(); } while (rooms.has(code));
        const seed = Math.floor(Math.random() * 999999) + 1;
        const room = { code, seed, mode: msg.mode || 'survival', players: new Map(), blockChanges: [] };
        rooms.set(code, room);
        client.name = msg.name || 'Player';
        client.roomCode = code;
        room.players.set(id, { id, name: client.name, ws, x: 0, y: 80, z: 0, yaw: 0, pitch: 0 });
        ws.send(JSON.stringify({ type: 'created', code, seed, mode: room.mode, playerId: id }));
        console.log(`Room ${code} created (seed ${seed}, ${room.mode})`);
        break;
      }

      case 'join': {
        const code = (msg.code || '').toUpperCase().trim();
        const room = rooms.get(code);
        if (!room) { ws.send(JSON.stringify({ type: 'error', message: 'Room not found. Check the code and try again.' })); return; }
        client.name = msg.name || 'Player';
        client.roomCode = code;
        const existing = [...room.players.values()].map(p => ({ id: p.id, name: p.name, x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch }));
        room.players.set(id, { id, name: client.name, ws, x: 0, y: 80, z: 0, yaw: 0, pitch: 0 });
        ws.send(JSON.stringify({ type: 'joined', code, seed: room.seed, mode: room.mode, playerId: id, players: existing, blockChanges: room.blockChanges }));
        broadcast(room, { type: 'playerJoin', id, name: client.name }, id);
        console.log(`${client.name} joined room ${code}`);
        break;
      }

      case 'playerUpdate': {
        const room = rooms.get(client.roomCode);
        if (!room) return;
        const p = room.players.get(id);
        if (p) { p.x = msg.x; p.y = msg.y; p.z = msg.z; p.yaw = msg.yaw; p.pitch = msg.pitch; }
        broadcast(room, { type: 'playerUpdate', id, x: msg.x, y: msg.y, z: msg.z, yaw: msg.yaw, pitch: msg.pitch }, id);
        break;
      }

      case 'blockChange': {
        const room = rooms.get(client.roomCode);
        if (!room) return;
        room.blockChanges.push({ wx: msg.wx, wy: msg.wy, wz: msg.wz, blockId: msg.blockId });
        if (room.blockChanges.length > 50000) room.blockChanges.splice(0, 1000);
        broadcast(room, { type: 'blockChange', id, wx: msg.wx, wy: msg.wy, wz: msg.wz, blockId: msg.blockId }, id);
        break;
      }

      case 'modeChange': {
        const room = rooms.get(client.roomCode);
        if (!room) return;
        room.mode = msg.mode;
        broadcast(room, { type: 'modeChange', mode: msg.mode });
        break;
      }

      case 'chat': {
        const room = rooms.get(client.roomCode);
        if (!room) return;
        broadcast(room, { type: 'chat', id, name: client.name, message: String(msg.message).slice(0, 200) });
        break;
      }
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    if (client?.roomCode) {
      const room = rooms.get(client.roomCode);
      if (room) {
        room.players.delete(id);
        broadcast(room, { type: 'playerLeave', id });
        if (room.players.size === 0) {
          rooms.delete(client.roomCode);
          console.log(`Room ${client.roomCode} closed (empty)`);
        }
      }
    }
    clients.delete(ws);
  });

  ws.on('error', () => ws.terminate());
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Block World running on port ${PORT}`);
});
