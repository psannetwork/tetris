const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const players = new Set();
let countdown = null;
let gameStarted = false; 
let locked = false;

app.use(express.static("public")); 

io.on("connection", (socket) => {
  console.log("ユーザーが接続しました:", socket.id);

  socket.on("positions", (msg) => {
    io.emit("positions", msg);
  });
  socket.on("ren", (msg) => {
    io.emit("ren", msg);
  });
  socket.on("counter", (msg) => {
    io.emit("counter", msg);
  });
  socket.on("offer", (offer) => {
    socket.broadcast.emit("offer", offer);
  });

  socket.on("answer", (answer) => {
    socket.broadcast.emit("answer", answer);
  });

  socket.on("candidate", (candidate) => {
    socket.broadcast.emit("candidate", candidate);
  });
  if (gameStarted) {
    // ゲームが進行中の場合は新規接続をブロック
    socket.emit("chatMessage", "blocked");
    socket.disconnect();
    return;
  }
  // プレイヤーを追加
  players.add(socket.id);
  console.log(
    `ユーザー ${socket.id} が参加しました。現在のプレイヤー数: ${players.size}`,
  );

  // ゲームの状態を確認
  checkGameState();

  // プレイヤーの切断を処理
  socket.on("disconnect", () => {
    console.log(`ユーザー ${socket.id} が切断しました`);
    players.delete(socket.id);
    console.log(
      `ユーザー ${socket.id} が離脱しました。現在のプレイヤー数: ${players.size}`,
    );

    if (players.size === 0) {
      // 全員が切断された場合
      console.log("全員が切断されたため、状態をリセットします");
      resetGame();
    } else {
      // ゲームの状態を再確認
      checkGameState();
    }
  });
});

function checkGameState() {
  const playerCount = players.size;
  console.log(`ゲームの状態を確認中。プレイヤー数: ${playerCount}`);

  if (gameStarted) {
    // ゲームが開始されている場合
    if (playerCount < 2) {
      // プレイヤーが2人未満の場合
      stopGame(); // ゲームを停止する
    }
    return;
  }

  if (playerCount >= 2 && !locked && !countdown) {
    startCountdown(); // プレイヤーが2人以上、ロックされておらず、カウントダウンが進行中でない場合にカウントダウンを開始
  } else if (playerCount < 2 && countdown) {
    clearTimeout(countdown);
    console.log("カウントダウンをクリアしました。プレイヤー数が不足しています");
    countdown = null;
  }
}

function startCountdown() {
  if (countdown) {
    console.log("カウントダウンはすでに進行中です");
    return; // 複数のカウントダウンを防ぐ
  }

  console.log("カウントダウンを開始します");

  let timeLeft = 10; // カウントダウンの秒数
  countdown = setInterval(() => {
    console.log(timeLeft);
    io.emit("counter", timeLeft);

    if (timeLeft === 1) {
      clearInterval(countdown); // カウントダウン終了
      console.log("カウントダウンが終了しました。ゲームを開始します");
      gameStarted = true; // ゲームを開始済みとしてマーク
      locked = true; // ルームをロックして新しいプレイヤーの参加を防ぐ
      io.emit("chatMessage", "start");
      countdown = null;
    } else {
      timeLeft--;
    }
  }, 1000); // 1秒ごとにカウントを表示
}

function stopGame() {
  console.log("ゲームを停止します");
  io.emit("chatMessage", "stop");
  resetGame();
}

function resetGame() {
  gameStarted = false;
  locked = false;
  if (countdown) {
    clearInterval(countdown);
    countdown = null;
  }
}

server.listen(5000, () => {
  console.log("サーバーがポート6000で起動しました");
});
