const socket = io("https://dl.psannetwork.net/"); // サーバーのポートに合わせる
let isRanking = null;
        socket.on("connect", () => {
            console.log("✅ サーバーに接続:", socket.id);
            draw();
            joinRoom();
        });

        function joinRoom() {
            socket.emit("matching");
        }

        socket.on("roomInfo", (data) => {
            console.log(`ルーム: ${data.roomId}, 参加者: ${data.members.length}`);
        });

        socket.on("CountDown", (count) => {
            drawCount(count);
        });

        socket.on("StartGame", () => {
            update();
        });



        socket.on("ReceiveGarbage", ({ from, lines }) => {
            addGarbagebar(lines);
            
        });

// ランキング情報受信時（ゲームオーバー状態の更新）
socket.on("ranking", ({ ranking, yourRankMap }) => {
  console.log("📊 受け取ったランキングデータ:", ranking);
  console.log("📌 プレイヤー別順位:", yourRankMap);

  // 自分の順位処理はそのまま…
  const myRank = yourRankMap[socket.id];
  if (myRank !== null) {
    console.log(`🏆 あなたの順位は ${myRank} 位です！`);
    isRanking = myRank;
    if (myRank !== 1) {
      drawGameOver();
    }
    if (myRank === 1) {
      isGameClear = true;
    }
  } else {
    console.log("⌛ あなたの順位はまだ確定していません...");
  }
  
  // 各ユーザーのゲームオーバー状態を更新
  for (const userId in yourRankMap) {
    gameOverStatus[userId] = yourRankMap[userId] !== null;
  }
});
function drawGameOver() {
  // ゲームオーバーの描画処理
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
  ctx.fillStyle = "#FF0000";
  ctx.font = "bold 50px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`GAME OVER`, canvasElement.width / 2, canvasElement.height / 2);
  
  // ゲームオーバー時に状態を送信
  socket.emit("PlayerGameStatus", "gameover");
}




function drawCount(count) {
    draw();

  // 既存のキャンバスを半透明の黒でオーバーレイ（暗くする）
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // 50%透明の黒
  ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
  
  const attackBarWidth = 30, gap = 20;
  const boardWidth = CONFIG.board.cols * CONFIG.board.cellSize;
  const boardHeight = CONFIG.board.visibleRows * CONFIG.board.cellSize;
  const totalWidth = attackBarWidth + gap + boardWidth;
  const startX = (canvasElement.width - totalWidth) / 2;
  const attackBarX = startX;
  const boardX = startX + attackBarWidth + gap;
  const boardY = (canvasElement.height - boardHeight) / 2;
  
  ctx.strokeStyle = '#000';
  ctx.strokeRect(attackBarX, boardY, attackBarWidth, boardHeight);

  // カウントダウンの描画
  ctx.fillStyle = "#FFF"; // 文字の色を白に
  ctx.font = "bold 80px Arial"; // 大きくて太いフォント
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // キャンバスの中央にカウントを描画
  ctx.fillText(count, canvasElement.width / 2, canvasElement.height / 2);
}




// ライン送信ボタンが押されたときに呼ばれる関数
function sendGarbage(targetId, lines) {
    // ターゲットIDが指定されていない場合はランダムな相手に送信
    if (!targetId) {
        socket.emit("SendGarbage", { targetId: null, lines });
    } else {
        // ターゲットIDが指定されている場合はその相手に送信
        socket.emit("SendGarbage", { targetId, lines });
    }
}











// グローバル変数
const userMiniBoardMapping = {};
let nextMiniBoardIndex = 0;
const miniBoardsData = [];           // ミニボードのグリッド情報
const lastBoardStates = {};          // ユーザーごとの最新の boardState を保存
const miniCellSize = Math.floor(CONFIG.board.cellSize * 0.15);
const gameOverStatus = {};


// 毎フレーム呼ばれる描画ループ
function drawminiboardloop() {
  // 既存のメイン描画などはそのまま…

  // miniBoardsData の再生成
  initMiniBoards();

  // 各ユーザーに割り当てられた miniBoard に最新の boardState を描画
  for (const userID in userMiniBoardMapping) {
    const boardID = userMiniBoardMapping[userID];
    const boardState = lastBoardStates[userID] || Array.from({ length: 22 }, () => Array(10).fill(0));
    // userID を渡して描画する
    drawSpecificMiniBoard(userID, boardID, boardState);
  }
}


function initMiniBoards() {
  // miniBoardsData をクリアして再計算
  miniBoardsData.length = 0;
  
  const attackBarWidth = 30, gap = 20;
  const boardWidth = CONFIG.board.cols * CONFIG.board.cellSize;
  const boardHeight = CONFIG.board.visibleRows * CONFIG.board.cellSize;
  const totalWidth = attackBarWidth + gap + boardWidth;
  const startX = (canvasElement.width - totalWidth) / 2;
  const attackBarX = startX;
  const boardX = startX + attackBarWidth + gap;
  const boardY = (canvasElement.height - boardHeight) / 2;

  // miniボードの設定（縦23×横10 のボード）
  const miniBoardWidth = 10 * miniCellSize;
  const miniBoardHeight = 23 * miniCellSize;
  const miniGap = 10;  // 間隔

  // 左側（Holdの左）のスタート位置
  const miniLeftStartX = attackBarX - 110 - gap - (7 * (miniBoardWidth + miniGap));
  const miniLeftStartY = boardY;
  // 右側（メインボードの右）のスタート位置
  const miniRightStartX = boardX + 110 + boardWidth + gap;
  const miniRightStartY = boardY;

  // 7×7 の mini ボードグリッドを描画（左側＆右側）
  drawMiniBoardGrid(miniLeftStartX, miniLeftStartY, miniBoardWidth, miniBoardHeight, miniGap, "left");
  drawMiniBoardGrid(miniRightStartX, miniRightStartY, miniBoardWidth, miniBoardHeight, miniGap, "right");
}


function drawMiniBoardGrid(startX, startY, boardWidth, boardHeight, gap, position) {
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      let x = startX + col * (boardWidth + gap);
      let y = startY + row * (boardHeight + gap);
      const boardID = `${position}_board_${row}_${col}`; // 一意のID
      drawMiniBoard(x, y, boardWidth, boardHeight, boardID);
    }
  }
}

function drawMiniBoard(x, y, boardWidth, boardHeight, boardID) {
  // 枠線を描画
  ctx.strokeStyle = "#FFF";
  ctx.lineWidth = 0.1;
  ctx.strokeRect(x, y, boardWidth, boardHeight);
  
  // miniBoardsData に位置情報を保存
  miniBoardsData.push({ x, y, width: boardWidth, height: boardHeight, id: boardID });
}

function drawSpecificMiniBoard(userID, boardID, boardState) {
  const boardData = miniBoardsData.find(board => board.id === boardID);
  if (!boardData) {
    console.error(`Board with ID ${boardID} not found.`);
    return;
  }
  const { x, y, width, height } = boardData;
  
  // テトリス各ブロックの色定義
  const blockColors = {
    "I": "#00FFFF",
    "O": "#FFFF00",
    "T": "#800080",
    "J": "#0000FF",
    "L": "#FFA500",
    "Z": "#FF0000",
    "S": "#00FF00"
  };
  
  // miniBoard 内の描画領域をクリアし、枠を描画
  ctx.clearRect(x, y, width, height);
  ctx.strokeStyle = "#FF0000";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  
  // boardState に基づいて各セルを描画
  for (let row = 0; row < boardState.length; row++) {
    for (let col = 0; col < boardState[row].length; col++) {
      const block = boardState[row][col];
      if (block !== 0) { // 空セルでなければ描画
        const blockX = x + col * miniCellSize;
        const blockY = y + row * miniCellSize;
        const blockColor = blockColors[block] || "#000000";
        ctx.fillStyle = blockColor;
        ctx.fillRect(blockX, blockY, miniCellSize, miniCellSize);
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1;
        ctx.strokeRect(blockX, blockY, miniCellSize, miniCellSize);
      }
    }
  }
  
  // 該当ユーザーがゲームオーバーなら、「KO」をオーバーレイで表示
  if (gameOverStatus[userID]) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "#FF0000";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("KO", x + width / 2, y + height / 2);
  }
}


// socket.io 側の処理
socket.on("BoardStatus", (data) => {
  // 受信データは { UserID, board } を想定
  const { UserID, board } = data;
  
  // 最新の boardState を保存
  lastBoardStates[UserID] = board;
  
  // 初回の場合は、miniBoard を割り当てる
  if (!userMiniBoardMapping[UserID]) {
    if (nextMiniBoardIndex < miniBoardsData.length) {
      userMiniBoardMapping[UserID] = miniBoardsData[nextMiniBoardIndex].id;
      nextMiniBoardIndex++;
    } else {
      console.warn("利用可能なミニボードが足りません。最初のボードを再利用します。");
      userMiniBoardMapping[UserID] = miniBoardsData[0].id;
    }
  }
  // 次回の描画ループで反映される
});

// 初回の描画開始（例：サーバー接続時など）
socket.on("connect", () => {
  console.log("✅ サーバーに接続:", socket.id);
  joinRoom();   // ルーム参加などの初期処理
  draw();       // 描画ループ開始
});


window.addEventListener("blur", () => {
    console.log("ページがフォーカスを失いました");
    if (socket) {
        socket.disconnect(); // ソケット切断
        console.log("Socket.io 接続を切断しました");
        drawConnectError();
    }
});

function drawConnectError() {
        draw();

  // 既存のキャンバスを半透明の黒でオーバーレイ（暗くする）
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // 50%透明の黒
  ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
  
  const attackBarWidth = 30, gap = 20;
  const boardWidth = CONFIG.board.cols * CONFIG.board.cellSize;
  const boardHeight = CONFIG.board.visibleRows * CONFIG.board.cellSize;
  const totalWidth = attackBarWidth + gap + boardWidth;
  const startX = (canvasElement.width - totalWidth) / 2;
  const attackBarX = startX;
  const boardX = startX + attackBarWidth + gap;
  const boardY = (canvasElement.height - boardHeight) / 2;
  
  ctx.strokeStyle = '#000';
  ctx.strokeRect(attackBarX, boardY, attackBarWidth, boardHeight);

  // カウントダウンの描画
  ctx.fillStyle = "#FFF"; // 文字の色を白に
  ctx.font = "bold 40px Arial"; // 大きくて太いフォント
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // キャンバスの中央にカウントを描画
  ctx.fillText("通信エラーが発生しました", canvasElement.width / 2, canvasElement.height / 2);
}