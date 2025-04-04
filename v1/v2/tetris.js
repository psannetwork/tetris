"use strict";
const LOCK_DELAY = 500;
const DAS = 150;
const ARR = 50;
const SD_ARR = 50;
const MAX_FLOOR_KICKS = 15;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const TETROMINOES = {
  I: {
    shape: [
      [[-1, 0], [0, 0], [1, 0], [2, 0]],
      [[1, -1], [1, 0], [1, 1], [1, 2]],
      [[-1, 1], [0, 1], [1, 1], [2, 1]],
      [[0, -1], [0, 0], [0, 1], [0, 2]]
    ],
    color: CONFIG.colors.tetromino[1]
  },
  J: {
    shape: [
      [[-1, -1], [-1, 0], [0, 0], [1, 0]],
      [[0, -1], [0, 0], [0, 1], [1, -1]],
      [[-1, 0], [0, 0], [1, 0], [1, 1]],
      [[-1, 1], [0, -1], [0, 0], [0, 1]]
    ],
    color: CONFIG.colors.tetromino[2]
  },
  L: {
    shape: [
      [[1, -1], [-1, 0], [0, 0], [1, 0]],
      [[0, -1], [0, 0], [0, 1], [1, 1]],
      [[-1, 0], [0, 0], [1, 0], [-1, 1]],
      [[-1, -1], [0, -1], [0, 0], [0, 1]]
    ],
    color: CONFIG.colors.tetromino[3]
  },
  O: {
    shape: [
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [0, 1], [1, 1]]
    ],
    color: CONFIG.colors.tetromino[4]
  },
  S: {
    shape: [
      [[0, -1], [1, -1], [-1, 0], [0, 0]],
      [[0, -1], [0, 0], [1, 0], [1, 1]],
      [[0, 0], [1, 0], [-1, 1], [0, 1]],
      [[-1, -1], [-1, 0], [0, 0], [0, 1]]
    ],
    color: CONFIG.colors.tetromino[5]
  },
  T: {
    shape: [
      [[0, -1], [-1, 0], [0, 0], [1, 0]],
      [[0, -1], [0, 0], [1, 0], [0, 1]],
      [[-1, 0], [0, 0], [1, 0], [0, 1]],
      [[0, -1], [-1, 0], [0, 0], [0, 1]]
    ],
    color: CONFIG.colors.tetromino[6]
  },
  Z: {
    shape: [
      [[-1, -1], [0, -1], [0, 0], [1, 0]],
      [[1, -1], [0, 0], [1, 0], [0, 1]],
      [[-1, 0], [0, 0], [0, 1], [1, 1]],
      [[0, -1], [-1, 0], [0, 0], [-1, 1]]
    ],
    color: CONFIG.colors.tetromino[7]
  }
};

const WALL_KICKS = {
  normal: {
    "0->1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "1->0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    "1->2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    "2->1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "2->3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    "3->2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "3->0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "0->3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
  },
  I: {
    "0->1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    "1->0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    "1->2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    "2->1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    "2->3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    "3->2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    "3->0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    "0->3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
  }
};

let board, currentPiece, nextPiece, holdPiece = null, holdUsed = false, score = 0, level = 1, linesCleared = 0;
const boardRows = CONFIG.board.rows;
const boardCols = CONFIG.board.cols;
const cellSize = CONFIG.board.cellSize;

function createBoard() {
  const b = [];
  for (let r = 0; r < boardRows; r++) b[r] = new Array(boardCols).fill(0);
  return b;
}
board = createBoard();

let keys = {};
document.addEventListener("keydown", event => {
  if (!keys[event.code]) {
    keys[event.code] = { startTime: performance.now(), lastRepeat: performance.now() };
    switch (event.code) {
      case CONFIG.keyBindings.moveLeft:
        movePiece({ x: -1, y: 0 });
        break;
      case CONFIG.keyBindings.moveRight:
        movePiece({ x: 1, y: 0 });
        break;
      case CONFIG.keyBindings.softDrop:
        movePiece({ x: 0, y: 1 });
        break;
      case CONFIG.keyBindings.rotateCCW:
        rotatePiece(currentPiece, -1);
        break;
      case CONFIG.keyBindings.rotateCW:
        rotatePiece(currentPiece, 1);
        break;
      case CONFIG.keyBindings.hardDrop:
        hardDrop();
        break;
      case CONFIG.keyBindings.hold:
        hold();
        break;
      case "KeyG":
        if (CONFIG.debug.enableGarbage) addGarbageLine();
        break;
    }
  }
  if (Object.values(CONFIG.keyBindings).includes(event.code) || event.code === "KeyG") event.preventDefault();
});
document.addEventListener("keyup", event => { if (keys[event.code]) delete keys[event.code]; });

function isValidPosition(piece, offsetX, offsetY, newRotation = piece.rotation) {
  const shape = piece.shape[newRotation];
  for (let i = 0; i < shape.length; i++) {
    const x = piece.x + shape[i][0] + offsetX;
    const y = piece.y + shape[i][1] + offsetY;
    if (x < 0 || x >= boardCols || y >= boardRows) return false;
    if (y >= 0 && board[y][x] !== 0) return false;
  }
  return true;
}

function createPiece(type) {
  const t = TETROMINOES[type];
  return {
    type: type,
    shape: t.shape,
    rotation: 0,
    x: Math.floor(boardCols / 2),
    y: -1,
    color: t.color,
    isRotation: false,
    lockDelay: 0,
    floorKickCount: 0,
    lastKick: [0, 0],
    lastSRS: 0,
    combo: 0
  };
}
function randomPiece() {
  const types = Object.keys(TETROMINOES);
  return createPiece(types[Math.floor(Math.random() * types.length)]);
}

function mergePiece(piece) {
  const shape = piece.shape[piece.rotation];
  for (let i = 0; i < shape.length; i++) {
    const x = piece.x + shape[i][0], y = piece.y + shape[i][1];
    if (y >= 0) board[y][x] = piece.type;
  }
}

function clearLines() {
  const lines = [];
  for (let r = 0; r < boardRows; r++) {
    if (board[r].every(cell => cell !== 0)) {
      lines.push(r);
    }
  }
  if (lines.length > 0) {
    // エフェクトを先にトリガー：消える前にラインを光らせる
    triggerLineClearEffect(lines);
    
    // エフェクトの表示期間後に、実際にラインを削除する
    setTimeout(() => {
      for (const row of lines) {
        board.splice(row, 1);
        board.unshift(new Array(boardCols).fill(0));
      }
      let points = 0;
      switch (lines.length) {
        case 1: points = CONFIG.scoring.single; break;
        case 2: points = CONFIG.scoring.double; break;
        case 3: points = CONFIG.scoring.triple; break;
        case 4: points = CONFIG.scoring.tetris; break;
      }
      score += points;
      linesCleared += lines.length;
    }, CONFIG.effects.lineClearDuration);
  }
}


let effects = [];
function triggerLineClearEffect(lineRows) {
  effects.push({ type: "lineClear", rows: lineRows, startTime: Date.now(), duration: CONFIG.effects.lineClearDuration });
}
let tspinEffect = null;
function triggerTspinEffect(x, y) {
  tspinEffect = { type: "tspin", x: x, y: y, startTime: Date.now(), duration: CONFIG.effects.tspinEffectDuration };
}
function updateEffects() {
  const now = Date.now();
  effects = effects.filter(e => now - e.startTime < e.duration);
  if (tspinEffect && now - tspinEffect.startTime >= tspinEffect.duration) tspinEffect = null;
}

// ★ Tスピン判定（detectTspin）の修正例 ★  
// SRS方式に基づき、Tミノの回転軸周囲4箇所のブロック状況と、使用した壁キック（lastSRS）でTスピン / Tスピンミニを判定する
function detectTSpin(piece) {
  if (piece.type !== "T" || !piece.isRotation) return { detected: false, mini: false };

  const corners = [
    [piece.x - 1, piece.y - 1],
    [piece.x + 1, piece.y - 1],
    [piece.x - 1, piece.y + 1],
    [piece.x + 1, piece.y + 1]
  ];
  let occupied = 0;
  for (const [x, y] of corners) {
    if (x < 0 || x >= boardCols || y >= boardRows || (y >= 0 && board[y][x] !== 0)) {
      occupied++;
    }
  }
  if (occupied >= 3) {
    return { detected: true, mini: false };
  }
  if (occupied === 2 && (piece.lastKick[0] !== 0 || piece.lastKick[1] !== 0) && piece.lastSRS < 4) {
    return { detected: true, mini: true };
  }
  return { detected: false, mini: false };
}



function rotatePiece(piece, direction) {
  const oldRotation = piece.rotation;
  const newRotation = (piece.rotation + direction + 4) % 4;

  // Oミノはそのまま回転
  if (piece.type === "O") {
    piece.rotation = newRotation;
    piece.lockDelay = 0;
    return;
  }

// Iミノ専用のスーパーローテーション処理
if (piece.type === "I") {
  let offsets = [];
  // oldRotation: 0° (状態0)
  if (oldRotation === 0) {
    if (direction === -1) { // 左回転（0° -> 270°）
      // ・軸を左に１ずらす    => (-1, 0)
      // ・軸を右に２ずらす    => (2, 0)
      // ・軸を左に１　上に２ずらす  => (-1, -2)
      // ・軸を右に２　下に１ずらす  => (2, 1)
      offsets = [ [-1, 0], [2, 0], [-1, -2], [2, 1] ];
    } else if (direction === 1) { // 右回転（0° -> 90°）
      // ・軸を左に２ずらす    => (-2, 0)
      // ・軸を右に１ずらす    => (1, 0)
      // ・軸を左に２　下に１ずらす  => (-2, 1)
      // ・軸を右に１　上に２ずらす  => (1, -2)
      offsets = [ [-2, 0], [1, 0], [-2, 1], [1, -2] ];
    }
  }
  // oldRotation: 90° (状態1)
  else if (oldRotation === 1) {
    if (direction === -1) { // 左回転（90° -> 0°）
      // ・軸を右に２ずらす    => (2, 0)
      // ・軸を左に１ずらす    => (-1, 0)
      // ・軸を右に２　上に１ずらす  => (2, -1)
      // ・軸を左に１　下に２ずらす  => (-1, 2)
      offsets = [ [2, 0], [-1, 0], [2, -1], [-1, 2] ];
    } else if (direction === 1) { // 右回転（90° -> 180°）
      // ・軸を左に１ずらす    => (-1, 0)
      // ・軸を右に２ずらす    => (2, 0)
      // ・軸を左に１　上に２ずらす  => (-1, -2)
      // ・軸を右に２　下に１ずらす  => (2, 1)
      offsets = [ [-1, 0], [2, 0], [-1, -2], [2, 1] ];
    }
  }
  // oldRotation: 180° (状態2)
  else if (oldRotation === 2) {
    if (direction === -1) { // 左回転（180° -> 90°）
      // ・軸を右に１ずらす    => (1, 0)
      // ・軸を左に２ずらす    => (-2, 0)
      // ・軸を右に１　下に２ずらす  => (1, 2)
      // ・軸を左に２　上に１ずらす  => (-2, -1)
      offsets = [ [1, 0], [-2, 0], [1, 2], [-2, -1] ];
    } else if (direction === 1) { // 右回転（180° -> 270°）
      // ・軸を右に２ずらす    => (2, 0)
      // ・軸を左に１ずらす    => (-1, 0)
      // ・軸を右に２　上に１ずらす  => (2, -1)
      // ・軸を左に１　下に２ずらす  => (-1, 2)
      offsets = [ [2, 0], [-1, 0], [2, -1], [-1, 2] ];
    }
  }
  // oldRotation: 270° (状態3)
  else if (oldRotation === 3) {
    if (direction === -1) { // 左回転（270° -> 180°）
      // ・軸を右に１ずらす    => (1, 0)
      // ・軸を左に２ずらす    => (-2, 0)
      // ・軸を左に２　下に１ずらす  => (-2, 1)
      // ・軸を右に１　上に２ずらす  => (1, -2)
      offsets = [ [1, 0], [-2, 0], [-2, 1], [1, -2] ];
    } else if (direction === 1) { // 右回転（270° -> 0°）
      // ・軸を左に２ずらす（「ひらりに２ずらす」と解釈） => (-2, 0)
      // ・軸を右に１ずらす    => (1, 0)
      // ・軸を右に１　下に２ずらす  => (1, 2)
      // ・軸を左に２　上に１ずらす  => (-2, -1)
      offsets = [ [-2, 0], [1, 0], [1, 2], [-2, -1] ];
    }
  }

  // 候補のオフセット順にチェックし、最初に有効なものを採用する
  for (let i = 0; i < offsets.length; i++) {
    const [dx, dy] = offsets[i];
    if (isValidPosition(piece, dx, dy, newRotation)) {
      piece.x += dx;
      piece.y += dy;
      piece.rotation = newRotation;
      piece.isRotation = true;
      piece.lastKick = [dx, dy];
      piece.lastSRS = i + 1; // オフセット候補番号（1～4）
      piece.lockDelay = 0;
      return;
    }
  }
  // どのオフセットも有効でなければ回転はキャンセル
  piece.isRotation = false;
  return;
}


  // 非I・非Oミノの場合
  // まず通常回転（オフセット (0,0)）を試す
  if (isValidPosition(piece, 0, 0, newRotation)) {
    piece.rotation = newRotation;
    piece.lockDelay = 0;
    piece.isRotation = true;
    piece.lastKick = [0, 0];
    piece.lastSRS = 0;
    return;
  }

  // ここからSRSのオフセット（回転軸のずらし処理）を適用
  // ※下記オフセットは、ミノの現在の向き(oldRotation)と回転方向(direction)に応じたものです。
  let offsets = [];
  switch (oldRotation) {
    case 0:
      if (direction === -1) { // 左回転：0° -> 270°
        offsets = [
          [ 1,  0],    // 軸を右に1ずらす
          [ 1, -1],    // 軸を右に1、上に1ずらす
          [ 0,  2],    // 軸を下に2ずらす
          [ 1,  2]     // 軸を右に1、下に2ずらす
        ];
      } else if (direction === 1) { // 右回転：0° -> 90°
        offsets = [
          [-1,  0],    // 軸を左に1ずらす
          [-1, -1],    // 軸を左に1、上に1ずらす
          [ 0,  2],    // 軸を下に2ずらす
          [-1,  2]     // 軸を左に1、下に2ずらす
        ];
      }
      break;
    case 1:
      // 90°の場合（左右回転で同じオフセット）
      offsets = [
        [ 1,  0],    // 軸を右に1ずらす
        [ 1,  1],    // 軸を右に1、下に1ずらす
        [ 0, -2],    // 軸を上に2ずらす
        [ 1, -2]     // 軸を右に1、上に2ずらす
      ];
      break;
    case 2:
      if (direction === 1) { // 右回転：180° -> 270°
        offsets = [
          [ 1,  0],    // 軸を右に1ずらす
          [ 1, -1],    // 軸を右に1、上に1ずらす
          [ 0,  2],    // 軸を下に2ずらす
          [ 1,  2]     // 軸を右に1、下に2ずらす
        ];
      } else if (direction === -1) { // 左回転：180° -> 90°
        offsets = [
          [-1,  0],    // 軸を左に1ずらす
          [-1, -1],    // 軸を左に1、上に1ずらす
          [ 0,  2],    // 軸を下に2ずらす
          [-1,  2]     // 軸を左に1、下に2ずらす
        ];
      }
      break;
    case 3:
      if (direction === -1) { // 左回転：270° -> 180°
        offsets = [
          [-1,  0],    // 軸を左に1ずらす
          [-1,  1],    // 軸を左に1、下に1ずらす
          [ 0, -2],    // 軸を上に2ずらす
          [-1, -2]     // 軸を左に1、上に2ずらす
        ];
      } else if (direction === 1) { // 右回転：270° -> 0°
        offsets = [
          [-1,  0],    // 軸を左に1ずらす
          [-1,  1],    // 軸を左に1、下に1ずらす
          [ 0, -2],    // 軸を上に2ずらす
          [-1, -2]     // 軸を左に1、上に2ずらす
        ];
      }
      break;
  }

  // 上記オフセット候補を順にチェックし、最初に有効なものを採用
  for (let i = 0; i < offsets.length; i++) {
    const [dx, dy] = offsets[i];
    if (isValidPosition(piece, dx, dy, newRotation)) {
      piece.x += dx;
      piece.y += dy;
      piece.rotation = newRotation;
      piece.isRotation = true;
      piece.lastKick = [dx, dy];
      piece.lastSRS = i + 1; // オフセット候補は1～4とする
      piece.lockDelay = 0;
      return;
    }
  }
  // どのオフセットも有効でなければ回転をキャンセル
  piece.isRotation = false;
}



function movePiece(offset) {
  if (isValidPosition(currentPiece, offset.x, offset.y)) {
    currentPiece.x += offset.x;
    currentPiece.y += offset.y;
    currentPiece.lockDelay = 0;
    currentPiece.isRotation = false;
  }
}

function hardDrop() {
  while (isValidPosition(currentPiece, 0, 1)) currentPiece.y += 1;
  lockPiece();
}

// グローバルにエフェクト中かどうかのフラグを定義
let isClearing = false;

function lockPiece() {
  // すでに消去エフェクト中なら何もしない
  if (isClearing) return;

  // 現在のピースを盤面に固定
  mergePiece(currentPiece);

  // Tミノの場合はTスピン判定
  if (currentPiece.type === "T") {
    const result = detectTSpin(currentPiece);
    if (result.detected) {
      if (result.mini) score += CONFIG.scoring.tspinMini;
      else score += CONFIG.scoring.tspin;
      triggerTspinEffect(currentPiece.x, currentPiece.y);
    }
  }

  // 消去対象となる行を収集
  const fullLines = [];
  for (let r = 0; r < boardRows; r++) {
    if (board[r].every(cell => cell !== 0)) {
      fullLines.push(r);
    }
  }

  // 対象行がある場合、エフェクトを開始して一定時間後にライン削除・次ミノ生成
  if (fullLines.length > 0) {
    isClearing = true;
    triggerLineClearEffect(fullLines);

    setTimeout(() => {
      // ライン削除処理
      board = board.filter((row, idx) => !fullLines.includes(idx));
      while (board.length < boardRows) {
        board.unshift(new Array(boardCols).fill(0));
      }

      // スコア計算
      let points = 0;
      switch (fullLines.length) {
        case 1: points = CONFIG.scoring.single; break;
        case 2: points = CONFIG.scoring.double; break;
        case 3: points = CONFIG.scoring.triple; break;
        case 4: points = CONFIG.scoring.tetris; break;
      }
      score += points;
      linesCleared += fullLines.length;

      // **Nextキューを適切に更新**
      currentPiece = nextPieces.shift();
      currentPiece.lockDelay = 0;
      nextPieces.push(getNextPieceFromBag());
      holdUsed = false;

      // 新しいピースが設置不可能ならゲームオーバー処理（ここでは盤面リセット）
      if (!isValidPosition(currentPiece, 0, 0)) {
        board = createBoard();
        score = 0;
        linesCleared = 0;
      }

      isClearing = false; // **フラグを確実にリセット**
    }, CONFIG.effects.lineClearDuration);
  } else {
    // **消去対象行がない場合は、即座にNextを更新**
    currentPiece = nextPieces.shift();
    currentPiece.lockDelay = 0;
    nextPieces.push(getNextPieceFromBag());
    holdUsed = false;

    if (!isValidPosition(currentPiece, 0, 0)) {
      board = createBoard();
      score = 0;
      linesCleared = 0;
    }
  }
}



// 7ミノバッグ方式用のグローバル変数
let pieceBag = [];

// 配列をシャッフルするヘルパー関数（Fisher-Yates法）
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// バッグを補充する関数
function refillBag() {
  // TETROMINOES のキー（"I", "J", "L", "O", "S", "T", "Z"）をコピーしてシャッフル
  pieceBag = Object.keys(TETROMINOES).slice();
  shuffle(pieceBag);
}

// バッグから次のミノを取り出す関数
function getNextPieceFromBag() {
  if (pieceBag.length === 0) refillBag();
  const type = pieceBag.pop();
  return createPiece(type);
}

// グローバル変数
let nextPieces = [];

// 初期化時：現在のピースと Next キューの5個先を生成
currentPiece = getNextPieceFromBag();
for (let i = 0; i < 5; i++) {
  nextPieces.push(getNextPieceFromBag());
}




function hold() {
  if (holdUsed) return;
  if (holdPiece == null) {
    holdPiece = currentPiece;
    currentPiece = nextPiece;
    currentPiece.lockDelay = 0;
    nextPiece = randomPiece();
  } else {
    const temp = currentPiece;
    currentPiece = holdPiece;
    holdPiece = temp;
    currentPiece.x = Math.floor(boardCols / 2);
    currentPiece.y = -1;
    currentPiece.lockDelay = 0;
  }
  holdUsed = true;
}

function addGarbageLine() {
  const newRow = new Array(boardCols).fill("G");
  newRow[Math.floor(Math.random() * boardCols)] = 0;
  board.shift();
  board.push(newRow);
}

function drawMiniPiece(piece, posX, posY, cellSize) {
  const shape = piece.shape[0];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  shape.forEach(([x, y]) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });
  const width = maxX - minX + 1, height = maxY - minY + 1;
  const offsetX = Math.floor((4 - width) / 2) - minX, offsetY = Math.floor((4 - height) / 2) - minY;
  shape.forEach(([x, y]) => {
    const drawX = posX + (x + offsetX) * cellSize, drawY = posY + (y + offsetY) * cellSize;
    ctx.fillStyle = piece.color;
    ctx.fillRect(drawX, drawY, cellSize, cellSize);
    ctx.strokeStyle = "#000";
    ctx.strokeRect(drawX, drawY, cellSize, cellSize);
  });
}

function draw() {
  ctx.fillStyle = CONFIG.colors.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const boardWidth = CONFIG.board.cols * CONFIG.board.cellSize;
  const boardHeight = CONFIG.board.visibleRows * CONFIG.board.cellSize;
  const boardX = (canvas.width - boardWidth) / 2;
  const boardY = (canvas.height - boardHeight) / 2;

  // 盤面の枠
  ctx.fillStyle = CONFIG.colors.boardBackground;
  ctx.fillRect(boardX, boardY, boardWidth, boardHeight);

  // ボード描画
  for (let r = CONFIG.board.rows - CONFIG.board.visibleRows; r < CONFIG.board.rows; r++) {
    for (let c = 0; c < CONFIG.board.cols; c++) {
      const cell = board[r][c];
      if (cell !== 0) {
        ctx.fillStyle = (cell === "G") ? "#555" : CONFIG.colors.tetromino[tetrominoTypeToIndex(cell)];
        ctx.fillRect(
          boardX + c * CONFIG.board.cellSize,
          boardY + (r - (CONFIG.board.rows - CONFIG.board.visibleRows)) * CONFIG.board.cellSize,
          CONFIG.board.cellSize,
          CONFIG.board.cellSize
        );
        ctx.strokeStyle = "#000";
        ctx.strokeRect(
          boardX + c * CONFIG.board.cellSize,
          boardY + (r - (CONFIG.board.rows - CONFIG.board.visibleRows)) * CONFIG.board.cellSize,
          CONFIG.board.cellSize,
          CONFIG.board.cellSize
        );
      }
    }
  }

  // ゴーストピース描画（半透明）
  let ghostPiece = Object.assign({}, currentPiece);
  while (isValidPosition(ghostPiece, 0, 1)) ghostPiece.y += 1;
  ctx.globalAlpha = 0.3; // 半透明
  ctx.fillStyle = CONFIG.colors.ghost;
  ghostPiece.shape[ghostPiece.rotation].forEach(([dx, dy]) => {
    const gx = ghostPiece.x + dx, gy = ghostPiece.y + dy;
    if (gy >= 0) {
      ctx.fillRect(
        boardX + gx * CONFIG.board.cellSize,
        boardY + (gy - (CONFIG.board.rows - CONFIG.board.visibleRows)) * CONFIG.board.cellSize,
        CONFIG.board.cellSize,
        CONFIG.board.cellSize
      );
    }
  });
  ctx.globalAlpha = 1.0; // 透明度をリセット

  // 現在のミノ描画
  ctx.fillStyle = currentPiece.color;
  currentPiece.shape[currentPiece.rotation].forEach(([dx, dy]) => {
    const x = currentPiece.x + dx, y = currentPiece.y + dy;
    if (y >= 0) {
      ctx.fillRect(
        boardX + x * CONFIG.board.cellSize,
        boardY + (y - (CONFIG.board.rows - CONFIG.board.visibleRows)) * CONFIG.board.cellSize,
        CONFIG.board.cellSize,
        CONFIG.board.cellSize
      );
      ctx.strokeStyle = "#000";
      ctx.strokeRect(
        boardX + x * CONFIG.board.cellSize,
        boardY + (y - (CONFIG.board.rows - CONFIG.board.visibleRows)) * CONFIG.board.cellSize,
        CONFIG.board.cellSize,
        CONFIG.board.cellSize
      );
    }
  });

  const now = Date.now();

  // ライン消去エフェクト（光らせる）
  for (const effect of effects) {
    if (effect.type === "lineClear") {
      const elapsed = now - effect.startTime;
      const alpha = Math.max(0, 1 - elapsed / effect.duration);
      ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
      for (const row of effect.rows) {
        const displayRow = row - (CONFIG.board.rows - CONFIG.board.visibleRows);
        if (displayRow >= 0) {
          ctx.fillRect(boardX, boardY + displayRow * CONFIG.board.cellSize, boardWidth, CONFIG.board.cellSize);
        }
      }
    }
  }

  // Tスピンエフェクト
  if (tspinEffect) {
    const elapsed = now - tspinEffect.startTime;
    const alpha = Math.max(0, 1 - elapsed / tspinEffect.duration);
    ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("T-SPIN!", boardX + boardWidth / 2, boardY + boardHeight / 2);
  }

  // Hold表示（枠あり）
  const previewCellSize = Math.floor(CONFIG.board.cellSize * 0.8);
  const holdBoxX = boardX - previewCellSize * 4 - 20, holdBoxY = boardY;
  ctx.strokeStyle = "#FFF";
  ctx.lineWidth = 2;
  ctx.strokeRect(holdBoxX - 5, holdBoxY - 5, previewCellSize * 4 + 10, previewCellSize * 4 + 10);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("HOLD", holdBoxX, holdBoxY - 10);
  if (holdPiece) drawMiniPiece(holdPiece, holdBoxX, holdBoxY, previewCellSize);

  // Next表示（枠あり）
  const nextBoxX = boardX + boardWidth + 20, nextBoxY = boardY;
  ctx.strokeStyle = "#FFF";
  ctx.lineWidth = 2;
  ctx.strokeRect(nextBoxX - 5, nextBoxY - 5, previewCellSize * 4 + 10, previewCellSize * 15 + 10);
  ctx.fillText("NEXT", nextBoxX, nextBoxY - 10);
  for (let i = 0; i < Math.min(5, nextPieces.length); i++) {
    drawMiniPiece(nextPieces[i], nextBoxX, nextBoxY + i * previewCellSize * 3, previewCellSize);
  }

  // スコア、ライン数、レベル表示
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, boardX, boardY + boardHeight + 30);
  ctx.fillText(`Lines: ${linesCleared}`, boardX, boardY + boardHeight + 60);
  ctx.fillText(`Level: ${level}`, boardX, boardY + boardHeight + 90);
}


function tetrominoTypeToIndex(type) {
  switch (type) {
    case "I": return 1;
    case "J": return 2;
    case "L": return 3;
    case "O": return 4;
    case "S": return 5;
    case "T": return 6;
    case "Z": return 7;
    default: return 0;
  }
}

let lastTime = performance.now(), dropCounter = 0;
function update(time = performance.now()) {
  const deltaTime = time - lastTime;
  lastTime = time;
  const now = performance.now();
  if (keys[CONFIG.keyBindings.moveLeft]) {
    const keyObj = keys[CONFIG.keyBindings.moveLeft];
    if (now - keyObj.startTime >= DAS && now - keyObj.lastRepeat >= ARR) {
      movePiece({ x: -1, y: 0 });
      keyObj.lastRepeat = now;
    }
  }
  if (keys[CONFIG.keyBindings.moveRight]) {
    const keyObj = keys[CONFIG.keyBindings.moveRight];
    if (now - keyObj.startTime >= DAS && now - keyObj.lastRepeat >= ARR) {
      movePiece({ x: 1, y: 0 });
      keyObj.lastRepeat = now;
    }
  }
  if (keys[CONFIG.keyBindings.softDrop]) {
    const keyObj = keys[CONFIG.keyBindings.softDrop];
    if (now - keyObj.lastRepeat >= SD_ARR) {
      movePiece({ x: 0, y: 1 });
      keyObj.lastRepeat = now;
    }
  }
  if (effects.length === 0 && tspinEffect === null) {
    dropCounter += deltaTime;
    if (dropCounter > CONFIG.dropInterval / level) {
      movePiece({ x: 0, y: 1 });
      dropCounter = 0;
    }
  } else dropCounter = 0;
  if (!isValidPosition(currentPiece, 0, 1)) {
    currentPiece.lockDelay += deltaTime;
    if (currentPiece.lockDelay >= LOCK_DELAY) {
      lockPiece();
      requestAnimationFrame(update);
      return;
    }
  } else {
    currentPiece.lockDelay = 0;
  }
  updateEffects();
  draw();
  requestAnimationFrame(update);
}

currentPiece = randomPiece();
nextPiece = randomPiece();
update();
