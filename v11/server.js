const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const PORT = 6000;
const MAX_PLAYERS = 99;
const MIN_PLAYERS_TO_START = 2;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static("public"));

// ルーム管理用のマップ
const rooms = new Map();         // roomId -> roomオブジェクト
const playerRoom = new Map();    // socket.id -> roomId
const playerRanks = new Map();   // roomId -> ゲームオーバー順のプレイヤーID配列
let roomCounter = 0;             // ルームID生成用

/**
 * 新しいルームを作成する
 * @param {string} playerId - ルーム作成者のsocket.id
 * @returns {object} 作成したルームオブジェクト
 */
function createRoom(playerId) {
  roomCounter++;
  const roomId = `room_${roomCounter}`;
  const room = {
    roomId,
    players: new Set([playerId]),
    initialPlayers: new Set([playerId]),
    isCountingDown: false,
    isGameStarted: false,
    totalPlayers: null
  };
  rooms.set(roomId, room);
  return room;
}

/**
 * ゲーム開始前で参加可能なルームを探す
 * @returns {object|null} 参加可能なルームがあれば返す、なければ null
 */
function getAvailableRoom() {
  for (const room of rooms.values()) {
    if (!room.isGameStarted && room.players.size < MAX_PLAYERS) {
      return room;
    }
  }
  return null;
}

/**
 * ルームのカウントダウンを開始する
 * @param {object} room - 対象のルームオブジェクト
 */
function startCountdown(room) {
  if (!room || room.isCountingDown) return;
  room.isCountingDown = true;
  let count = 10;
  console.log(`⏳ Room ${room.roomId} countdown started.`);

  const countdownInterval = setInterval(() => {
    // ルームが存在しない場合は終了
    if (!rooms.has(room.roomId)) {
      clearInterval(countdownInterval);
      console.log(`🛑 Room ${room.roomId} deleted, stopping countdown.`);
      return;
    }
    // 必要なプレイヤー数に満たない場合は待機メッセージを送信
    if (room.players.size < MIN_PLAYERS_TO_START) {
      io.to(room.roomId).emit("CountDown", "プレイヤーを待機中です...");
      console.log(`⏳ Room ${room.roomId} waiting for players (${room.players.size} present).`);
      return;
    }
    io.to(room.roomId).emit("CountDown", count);
    console.log(`⏳ Room ${room.roomId} countdown: ${count}`);
    count--;
    if (count < 0 || room.players.size >= MAX_PLAYERS) {
      clearInterval(countdownInterval);
      room.isGameStarted = true;
      room.totalPlayers = room.initialPlayers.size;
      io.to(room.roomId).emit("StartGame");
      console.log(`🎮 Room ${room.roomId} game started (totalPlayers: ${room.totalPlayers}).`);
    }
  }, 1000);
}

/**
 * ゲームオーバー時の処理（ルーム内ランキング更新）
 * @param {object} socket - 対象のsocket
 * @param {string} reason - ゲームオーバー理由
 */
function handleGameOver(socket, reason) {
  const roomId = playerRoom.get(socket.id);
  if (!roomId || !rooms.has(roomId)) return;

  // ルームごとにゲームオーバー順を管理する配列を初期化
  if (!playerRanks.has(roomId)) {
    playerRanks.set(roomId, []);
  }
  const ranks = playerRanks.get(roomId);

  if (!ranks.includes(socket.id)) {
    ranks.push(socket.id);
    const room = rooms.get(roomId);
    const totalPlayers = room.totalPlayers || room.initialPlayers.size;
    const orderIndex = ranks.indexOf(socket.id) + 1; // 1から始まる順番
    const yourRank = totalPlayers - orderIndex + 1;
    console.log(`💀 ${socket.id} in ${roomId} game over (order: ${orderIndex}, rank: ${yourRank}, reason: ${reason})`);
  }

  // 自身のルーム割当は解除
  playerRoom.delete(socket.id);

  // ルーム内の初回参加者全体に対してランキング情報を作成
  const roomData = rooms.get(roomId);
  const totalPlayers = roomData.totalPlayers || roomData.initialPlayers.size;
  const yourRankMap = Object.fromEntries(
    Array.from(roomData.initialPlayers).map(playerId => {
      if (ranks.includes(playerId)) {
        const orderIndex = ranks.indexOf(playerId) + 1;
        return [playerId, totalPlayers - orderIndex + 1];
      } else {
        // まだゲームオーバーしていない場合
        return [playerId, (ranks.length === totalPlayers - 1) ? 1 : null];
      }
    })
  );

  // ルーム内全員にランキング情報を送信
  io.to(roomId).emit("ranking", {
    ranking: ranks,
    yourRankMap
  });

  // 全員がゲームオーバーならルームをクリーンアップ
  if (ranks.length === roomData.initialPlayers.size) {
    console.log(`🏁 Room ${roomId} game ended.`);
    rooms.delete(roomId);
    playerRanks.delete(roomId);
  }
}

io.on("connection", (socket) => {
  console.log("🚀 User connected:", socket.id);

  // マッチング処理：参加可能なルームがあれば参加、なければ新規作成
  socket.on("matching", () => {
    let room = getAvailableRoom();
    if (room) {
      room.players.add(socket.id);
      room.initialPlayers.add(socket.id);
      console.log(`🏠 ${socket.id} joined ${room.roomId}`);
    } else {
      room = createRoom(socket.id);
      console.log(`🏠 ${socket.id} created new room ${room.roomId}`);
      startCountdown(room);
    }
    playerRoom.set(socket.id, room.roomId);
    socket.join(room.roomId);

    io.to(room.roomId).emit("roomInfo", {
      roomId: room.roomId,
      members: Array.from(room.players)
    });
  });

  // ボード状態の更新を同じルーム内に中継
  socket.on("BoardStatus", (board) => {
    const roomId = playerRoom.get(socket.id);
    if (!roomId) return;
    socket.to(roomId).emit("BoardStatus", board);
  });

  // プレイヤーのゲーム状態（例：gameover）を受信
  socket.on("PlayerGameStatus", (status) => {
    const roomId = playerRoom.get(socket.id);
    if (!roomId) return;
    if (status.includes("gameover")) {
      handleGameOver(socket, "normal");
    }
  });

socket.on("SendGarbage", ({ targetId, lines }) => {
  const roomId = playerRoom.get(socket.id);
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room || room.players.size <= 1) return;

  // 現在のルームのゲームオーバー済みのプレイヤーを取得（なければ空配列）
  const gameOverPlayers = playerRanks.get(roomId) || [];
  let recipientId = targetId;
  const members = Array.from(room.players);

  // targetIdが未指定、ルームに存在しない、またはゲームオーバー済みの場合は候補から選ぶ
  if (!recipientId || !members.includes(recipientId) || gameOverPlayers.includes(recipientId)) {
    // 自分自身とゲームオーバー済みのユーザーは除外
    const candidates = members.filter(id => id !== socket.id && !gameOverPlayers.includes(id));
    if (candidates.length === 0) {
      console.log(`💥 有効な送り先が見つからなかったため、${socket.id}の SendGarbage をスキップしました。`);
      return;
    }
    recipientId = candidates[Math.floor(Math.random() * candidates.length)];
  }

  io.to(recipientId).emit("ReceiveGarbage", { from: socket.id, lines });
  console.log(`💥 ${socket.id} が ${roomId} 内で ${recipientId} に ${lines} ラインのお邪魔行を送信しました。`);
});


  // エラー時の処理
  socket.on("error", (err) => {
    console.error(`⚠️ Socket error (${socket.id}):`, err);
    handleGameOver(socket, "error");
  });

  // 切断時の処理（通信エラーと自発的退出を区別）
  socket.on("disconnect", (reason) => {
    const roomId = playerRoom.get(socket.id);
    if (!roomId || !rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    const errorReasons = ["ping timeout", "transport error", "transport close", "server disconnect"];
    if (errorReasons.includes(reason)) {
      console.log(`🚨 ${socket.id} encountered error (${reason}), treated as game over.`);
      handleGameOver(socket, reason);
    } else {
      room.players.delete(socket.id);
      playerRoom.delete(socket.id);
      console.log(`❌ ${socket.id} left ${roomId} voluntarily (${reason}).`);
      // ルーム内が空になったら一定時間後にルーム削除
      if (room.players.size === 0) {
        console.log(`🗑️ Room ${roomId} will be deleted in 5 seconds (empty).`);
        setTimeout(() => {
          if (rooms.has(roomId) && rooms.get(roomId).players.size === 0) {
            rooms.delete(roomId);
            console.log(`🗑️ Room ${roomId} deleted.`);
          }
        }, 5000);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🔥 Server running: http://localhost:${PORT}`);
});
