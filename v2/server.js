// server_uwebsockets.js
// uWebSockets.js を用いた Tetris99風リアルタイムゲームサーバー
// 元の Express + Socket.IO 実装と同機能を提供します

const uWS = require('uWebSockets.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const MAX_PLAYERS = 99;
const MIN_PLAYERS_TO_START = 2;

// --- データ構造 ---
const rooms = new Map();                 // roomId → { roomId, players:Set, initialPlayers:Set, isCountingDown, isGameStarted, isGameOver, totalPlayers, boards:{} }
const playerRoom = new Map();           // clientId → roomId
const playerRanks = new Map();          // roomId → [clientId, ...] (gameover順)
let roomCounter = 0;
const spectators = new Map();           // roomId → Set(clientId)

// WebSocket 管理
const wsMap = new Map();                // ws → clientId
const idMap = new Map();                // clientId → ws

// --- ユーティリティ関数 ---
function createRoom(playerId) {
  roomCounter++;
  const roomId = `room_${roomCounter}`;
  const room = {
    roomId,
    players: new Set([playerId]),
    initialPlayers: new Set([playerId]),
    isCountingDown: false,
    isGameStarted: false,
    isGameOver: false,
    totalPlayers: null,
    boards: {}
  };
  rooms.set(roomId, room);
  return room;
}

function getAvailableRoom() {
  for (const room of rooms.values()) {
    if (!room.isGameStarted && !room.isGameOver && room.players.size < MAX_PLAYERS) {
      return room;
    }
  }
  return null;
}

function broadcastToRoom(roomId, type, data, excludeId = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const pid of room.players) {
    if (pid === excludeId) continue;
    const clientWs = idMap.get(pid);
    if (clientWs) {
      clientWs.send(JSON.stringify({ type, data }));
    }
  }
}

function emitToSpectators(roomId, type, data) {
  const specSet = spectators.get(roomId);
  if (!specSet) return;
  for (const sid of specSet) {
    const specWs = idMap.get(sid);
    if (specWs) specWs.send(JSON.stringify({ type, data }));
  }
}

function startCountdown(room) {
  if (!room || room.isCountingDown) return;
  room.isCountingDown = true;
  let count = 1;
  console.log(`⏳ Room ${room.roomId} countdown started.`);

  const iv = setInterval(() => {
    if (!rooms.has(room.roomId)) {
      clearInterval(iv);
      return;
    }
    if (room.players.size < MIN_PLAYERS_TO_START) {
      const msg = "プレイヤーを待機中です...";
      broadcastToRoom(room.roomId, 'CountDown', msg);
      emitToSpectators(room.roomId, 'CountDown', msg);
      return;
    }
    broadcastToRoom(room.roomId, 'CountDown', count);
    emitToSpectators(room.roomId, 'CountDown', count);
    count--;
    if (count < 0 || room.players.size >= MAX_PLAYERS) {
      clearInterval(iv);
      room.isGameStarted = true;
      room.totalPlayers = room.initialPlayers.size;
      broadcastToRoom(room.roomId, 'StartGame', null);
      emitToSpectators(room.roomId, 'StartGame', null);
      console.log(`🎮 Room ${room.roomId} game started (totalPlayers: ${room.totalPlayers}).`);
    }
  }, 1000);
}

function handleGameOver(clientId, reason) {
  const roomId = playerRoom.get(clientId);
  if (!roomId || !rooms.has(roomId)) return;
  const room = rooms.get(roomId);

  if (!playerRanks.has(roomId)) playerRanks.set(roomId, []);
  const ranks = playerRanks.get(roomId);
  if (!ranks.includes(clientId)) {
    ranks.push(clientId);
    const total = room.totalPlayers || room.initialPlayers.size;
    const idx = ranks.indexOf(clientId) + 1;
    const rank = total - idx + 1;
    console.log(`💀 ${clientId} in ${roomId} game over (rank: ${rank}, reason: ${reason})`);
  }

  playerRoom.delete(clientId);

  const total = room.totalPlayers || room.initialPlayers.size;
  const yourRankMap = Object.fromEntries(
    Array.from(room.initialPlayers).map(pid => {
      if (ranks.includes(pid)) {
        const idx = ranks.indexOf(pid) + 1;
        return [pid, total - idx + 1];
      } else {
        return [pid, (ranks.length === total - 1) ? 1 : null];
      }
    })
  );

  // 最後の1人を自動で1位
  if (ranks.length === total - 1) {
    const rem = Array.from(room.initialPlayers).find(pid => !ranks.includes(pid));
    if (rem) {
      ranks.push(rem);
      yourRankMap[rem] = 1;
    }
    broadcastToRoom(roomId, 'ranking', { ranking: ranks, yourRankMap });
    emitToSpectators(roomId, 'ranking', { ranking: ranks, yourRankMap });
    broadcastToRoom(roomId, 'GameOver', null);
    emitToSpectators(roomId, 'GameOver', null);
    room.isGameOver = true;
    setTimeout(() => {
      rooms.delete(roomId);
      playerRanks.delete(roomId);
      console.log(`🗑️ Room ${roomId} deleted after game over.`);
    }, 30000);
    return;
  }

  // 通常時のランキング＆KO通知
  broadcastToRoom(roomId, 'ranking', { ranking: ranks, yourRankMap });
  broadcastToRoom(roomId, 'playerKO', clientId);
  emitToSpectators(roomId, 'ranking', { ranking: ranks, yourRankMap });
  emitToSpectators(roomId, 'playerKO', clientId);
}

// --- HTTP & Static ファイルサーバー ---
const mimeTypes = {
  html: 'text/html', js: 'application/javascript', css: 'text/css', png: 'image/png',
  jpg: 'image/jpeg', svg: 'image/svg+xml', json: 'application/json', ico: 'image/x-icon'
};

uWS.App()
  // API: /rooms
  .get('/rooms', (res, req) => {
    const list = Array.from(rooms.values())
      .filter(r => r.players.size > 0 && !r.isGameOver)
      .map(r => ({ roomId: r.roomId, playersCount: r.players.size, isGameStarted: r.isGameStarted }));
    const json = JSON.stringify({ rooms: list });
    res.writeHeader('Content-Type', 'application/json').end(json);
  })

  // Static: public フォルダ
  .any('/*', (res, req) => {
    const url = req.getUrl();
    let filePath = path.join(__dirname, 'public', url);
    if (url.endsWith('/')) filePath = path.join(filePath, 'index.html');
    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeStatus('404 Not Found').end('Not found');
      } else {
        fs.readFile(filePath, (e, data) => {
          if (e) {
            res.writeStatus('500 Internal Server Error').end();
          } else {
            const ext = path.extname(filePath).slice(1);
            const ct = mimeTypes[ext] || 'application/octet-stream';
            res.writeHeader('Content-Type', ct).end(data);
          }
        });
      }
    });
  })

  // WebSocket: 全パス
  .ws('/*', {
    idleTimeout: 60,
    open: (ws) => {
      const id = crypto.randomUUID();
      wsMap.set(ws, id);
      idMap.set(id, ws);
      ws.send(JSON.stringify({ type: 'connected', data: { id } }));
      console.log(`🚀 Connected: ${id}`);
    },
    message: (ws, msg, isBinary) => {
      let m;
      try { m = JSON.parse(Buffer.from(msg).toString()); }
      catch { return; }
      const { type, data } = m;
      const clientId = wsMap.get(ws);
      if (!clientId) return;

      switch (type) {
        case 'matching': {
          let room = getAvailableRoom() || createRoom(clientId);
          if (!rooms.has(room.roomId)) rooms.set(room.roomId, room);
          if (!room.isCountingDown) startCountdown(room);
          room.players.add(clientId);
          room.initialPlayers.add(clientId);
          playerRoom.set(clientId, room.roomId);
          broadcastToRoom(room.roomId, 'roomInfo', { roomId: room.roomId, members: Array.from(room.players) });
          break;
        }
        case 'spectateRoom': {
          const rid = data;
          if (!rooms.has(rid)) {
            ws.send(JSON.stringify({ type: 'spectateError', data: `指定されたルーム (${rid}) は存在しません。` }));
            break;
          }
          const room = rooms.get(rid);
          if (room.players.size === 0) {
            ws.send(JSON.stringify({ type: 'spectateError', data: `指定されたルーム (${rid}) は既に終了しています。` }));
            break;
          }
          // プレイヤー解除
          if (playerRoom.has(clientId)) {
            const prev = playerRoom.get(clientId);
            const pr = rooms.get(prev);
            if (pr) { pr.players.delete(clientId); pr.initialPlayers.delete(clientId); }
            playerRoom.delete(clientId);
          }
          if (!spectators.has(rid)) spectators.set(rid, new Set());
          spectators.get(rid).add(clientId);
          ws.send(JSON.stringify({ type: 'spectateRoomInfo', data: { roomId: rid, playersCount: room.players.size, isGameStarted: room.isGameStarted } }));
          ws.send(JSON.stringify({ type: 'BoardStatusBulk', data: room.boards }));
          break;
        }
        case 'BoardStatus': {
          const board = data;
          const rid = playerRoom.get(clientId);
          if (!rid) break;
          const room = rooms.get(rid);
          if (room) {
            room.boards[clientId] = board;
            broadcastToRoom(rid, 'BoardStatus', { userId: clientId, board }, clientId);
            emitToSpectators(rid, 'BoardStatus', { userId: clientId, board });
          }
          break;
        }
        case 'PlayerGameStatus': {
          if (typeof data === 'string' && data.includes('gameover')) {
            handleGameOver(clientId, 'normal');
          }
          break;
        }
        case 'SendGarbage': {
          const { targetId, lines } = data;
          const rid = playerRoom.get(clientId);
          if (!rid) break;
          const room = rooms.get(rid);
          if (!room || room.players.size <= 1) break;
          const gone = playerRanks.get(rid) || [];
          let to = targetId;
          const members = Array.from(room.players);
          if (!to || !members.includes(to) || gone.includes(to)) {
            const cand = members.filter(pid => pid !== clientId && !gone.includes(pid));
            if (cand.length === 0) break;
            to = cand[Math.floor(Math.random() * cand.length)];
          }
          const destWs = idMap.get(to);
          if (destWs) destWs.send(JSON.stringify({ type: 'ReceiveGarbage', data: { from: clientId, lines } }));
          break;
        }
      }
    },
    close: (ws, code) => {
      const clientId = wsMap.get(ws);
      wsMap.delete(ws);
      idMap.delete(clientId);
      const rid = playerRoom.get(clientId);
      if (rid && rooms.has(rid)) {
        const room = rooms.get(rid);
        // エラー切断コード (1000以外) はゲームオーバー扱い
        if (code !== 1000) {
          handleGameOver(clientId, `code ${code}`);
        } else {
          room.players.delete(clientId);
          playerRoom.delete(clientId);
          if (room.players.size === 0) {
            setTimeout(() => {
              if (rooms.has(rid) && rooms.get(rid).players.size === 0) {
                rooms.delete(rid);
                console.log(`🗑️ Room ${rid} deleted (empty).`);
              }
            }, 5000);
          }
        }
      }
      // 観戦者解除
      for (const [r, specSet] of spectators.entries()) {
        if (specSet.has(clientId)) {
          specSet.delete(clientId);
          if (specSet.size === 0) spectators.delete(r);
        }
      }
    }
  })

  .listen(PORT, (token) => {
    if (token) console.log(`🔥 Server listening on port ${PORT}`);
    else console.error(`❌ Failed to listen on port ${PORT}`);
  });
