// js/main.js
window.onload = async () => {
  const canvas = document.getElementById('gameCanvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  await Assets.loadAll();
  const socket = new WebSocket(SERVER_URL);
  
  let tetrisGame = null;
  
  socket.onopen = () => {
    console.log("Connected to server.");
    socket.send(JSON.stringify({ type: 'join', matchType: 'normal', name: "Player" + Date.now(), rating: 1000 }));
  };
  
socket.onmessage = (message) => {
  let msg;
  try {
    msg = JSON.parse(message.data);
  } catch (e) {
    console.error("Invalid JSON received:", e);
    return;
  }
  
  if (msg.type === 'ping') {
    socket.send(JSON.stringify({ type: 'pong' }));
    return;
  }
  
  switch (msg.type) {
    case 'joined':
      console.log("Joined room", msg.roomId, "as", msg.matchType);
      if (msg.player && msg.player.id) {
        if (tetrisGame) tetrisGame.socketId = msg.player.id;
      }
      if (tetrisGame) tetrisGame.roomId = msg.roomId;
      break;
    case 'roomDetails':
      if (tetrisGame && msg.roomId === tetrisGame.roomId) {
        tetrisGame.roomDetails = msg.roomDetails;
      }
      break;
    case 'waitingTimeUpdate':
      console.log(`ゲーム開始まで: ${msg.remainingTime} 秒`);
      if (tetrisGame && msg.roomId === tetrisGame.roomId) {
        tetrisGame.countdown = msg.remainingTime;
        tetrisGame.countdownStartTime = performance.now() - ((COUNTDOWN_TIME - msg.remainingTime) * 1000);
        tetrisGame.waitingForStart = true;
      }
      break;
    case 'gameStart':
      if (tetrisGame && msg.roomId === tetrisGame.roomId) {
        console.log("Game start received from server.");
        tetrisGame.countdown = 0;
        tetrisGame.waitingForStart = false;
        tetrisGame.roomDetails = msg.roomDetails;
      }
      break;
    case 'stateUpdate':
      if (tetrisGame) {
        tetrisGame.remotePlayers = (msg.players || []).filter(p => p.id !== tetrisGame.socketId);
      }
      break;
    case 'attack':
      console.log("Received attack:", msg);
      if (tetrisGame) {
        tetrisGame.receiveAttack(msg.attack.amount);
      }
      break;
    case 'ranking':
      if (tetrisGame) {
        tetrisGame.ranking = msg.ranking;
      }
      break;
    case 'spectatorMode':
      if (tetrisGame) {
        tetrisGame.spectatorMode = true;
      }
      break;
    // ★ サーバー側からの勝利判定メッセージ受信時 ★
    case 'victory':
      console.log("Victory message received:", msg);
      if (tetrisGame) {
        tetrisGame.gameOver = true;
        const gameOverEl = document.getElementById('gameOver');
        if (msg.winner && tetrisGame.socketId === msg.winner.id) {
          gameOverEl.innerText = "Victory!";
        } else {
          gameOverEl.innerText = "Game Over";
        }
        gameOverEl.style.display = 'block';
        // 接続は切断せず、生き残り判定に基づく最終結果を待つ
      }
      break;
    default:
      console.warn("Unknown message type:", msg.type);
      break;
  }
};


  
  socket.onerror = (err) => {
    console.error("Socket error:", err);
  };
  
  socket.onclose = () => {
    console.log("Disconnected from server.");
  };
  
  tetrisGame = new TetrisGame(canvas, socket);
  
  // BGM の再生（存在すれば）
  if (Assets.sounds && Assets.sounds.bgm) {
    try {
      Assets.sounds.bgm.volume = 0.5;
      Assets.sounds.bgm.play();
    } catch (e) {
      console.warn("BGM playback failed:", e);
    }
  }
};
