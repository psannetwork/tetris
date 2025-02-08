// server.js
const WebSocket = require('ws');
const config = require('./config');

const wss = new WebSocket.Server({ port: config.port });
console.log(`WebSocket server started on port ${config.port}`);

let roomIdCounter = 1;
const rooms = {};  // key: room id, value: Room instance

// Room class
class Room {
  constructor(matchType = 'normal') {
    this.id = roomIdCounter++;
    this.matchType = matchType;  // 'normal' or 'versus'
    this.clients = [];
    this.spectators = [];
    this.gameStarted = false;
    this.waitingInterval = null;
    this.remainingTime = null;
  }

  addClient(client, playerInfo) {
    Object.assign(client, {
      name: playerInfo.name || config.defaultPlayer.name,
      rating: playerInfo.rating || config.defaultPlayer.rating,
      score: 0,
      spectator: false,
      roomId: this.id,
      gameOver: false,
      lastActionTime: Date.now(),
    });

    this.clients.push(client);
    client.send(JSON.stringify({
      type: 'joined',
      roomId: this.id,
      matchType: this.matchType,
      player: { id: client.id, name: client.name, rating: client.rating },
    }));

    this.sendRoomDetails();

    if (!this.gameStarted && this.clients.length >= config.normalMatch.minPlayers && !this.waitingInterval) {
      this.startWaitingPeriod();
    }

    if (this.clients.length >= config.normalMatch.maxPlayers) {
      this.startGame();
    }
  }

  startWaitingPeriod() {
    this.remainingTime = config.normalMatch.waitingTime;

    this.broadcast({
      type: 'waitingTimeUpdate',
      roomId: this.id,
      remainingTime: this.remainingTime,
    });

    this.waitingInterval = setInterval(() => {
      this.remainingTime--;
      this.broadcast({ type: 'waitingTimeUpdate', roomId: this.id, remainingTime: this.remainingTime });

      if (this.remainingTime <= 0) {
        clearInterval(this.waitingInterval);
        this.waitingInterval = null;
        this.startGame();
      }
    }, 1000);
  }

  startGame() {
    if (this.waitingInterval) {
      clearInterval(this.waitingInterval);
      this.waitingInterval = null;
    }

    this.gameStarted = true;
    this.broadcast({
      type: 'gameStart',
      roomId: this.id,
      roomDetails: this.getRoomDetails(),
      countdown: 0,
    });
  }

  removeClient(client) {
    this.clients = this.clients.filter(c => c !== client);
    this.spectators = this.spectators.filter(c => c !== client);

    if (this.clients.length === 0 && this.spectators.length === 0) {
      delete rooms[this.id];
    } else {
      this.sendRoomDetails();
      this.checkVictory();
    }
  }

  broadcast(messageObj) {
    const message = JSON.stringify(messageObj);
    [...this.clients, ...this.spectators].forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  sendRoomDetails() {
    this.broadcast({ type: 'roomDetails', roomId: this.id, roomDetails: this.getRoomDetails() });
  }

  getRoomDetails() {
    const players = this.clients.map(client => ({
      id: client.id,
      name: client.name,
      rating: client.rating,
      score: client.score,
    })).sort((a, b) => b.score - a.score);

    players.forEach((p, index) => (p.rank = index + 1));
    return { players, count: this.clients.length };
  }

  checkVictory() {
    if (!this.gameStarted) return;
    const aliveClients = this.clients.filter(client => !client.gameOver);

    if (aliveClients.length === 1) {
      const winner = aliveClients[0];
      this.broadcast({
        type: 'victory',
        roomId: this.id,
        winner: { id: winner.id, name: winner.name, rating: winner.rating, score: winner.score },
      });
    }
  }
}

function getAvailableRoom(matchType) {
  for (const id in rooms) {
    const room = rooms[id];
    if (room.matchType === matchType && !room.gameStarted) return room;
  }

  const newRoom = new Room(matchType);
  rooms[newRoom.id] = newRoom;
  return newRoom;
}

// Ping-pong for heartbeat check
setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  });
}, config.heartbeatInterval * 1000);

setInterval(() => {
  wss.clients.forEach(ws => {
    if (Date.now() - ws.lastHeartbeat > config.clientTimeout * 1000) {
      console.log(`Client ${ws.id} timed out.`);
      ws.terminate();
    }
  });
}, 5000);

let clientIdCounter = 1;

wss.on('connection', ws => {
  ws.id = clientIdCounter++;
  ws.lastHeartbeat = Date.now();

  ws.on('message', message => {
    let msg;
    try {
      msg = JSON.parse(message);
    } catch (e) {
      console.error('Invalid JSON received:', e);
      return;
    }

    if (msg.type === 'pong') {
      ws.lastHeartbeat = Date.now();
      return;
    }

    switch (msg.type) {
      case 'join': {
        const room = getAvailableRoom(msg.matchType || 'normal');
        room.addClient(ws, { name: msg.name, rating: msg.rating });
        break;
      }
      case 'playerAction':
        ws.lastActionTime = Date.now();
        ws.score = msg.state?.score || ws.score;
        if (ws.roomId && rooms[ws.roomId]) {
          const room = rooms[ws.roomId];
          room.broadcast({
            type: 'stateUpdate',
            players: room.clients.map(c => ({
              id: c.id,
              state: c.state,
              name: c.name,
              rating: c.rating,
              score: c.score,
            })),
          });
        }
        break;
      case 'gameOver':
        ws.gameOver = true;
        if (ws.roomId && rooms[ws.roomId]) {
          rooms[ws.roomId].checkVictory();
        }
        break;
      default:
        break;
    }
  });

  ws.on('close', () => {
    if (ws.roomId && rooms[ws.roomId]) {
      rooms[ws.roomId].removeClient(ws);
    }
  });
});