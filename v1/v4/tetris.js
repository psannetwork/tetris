"use strict";
const LOCK_DELAY = 500;
const DAS = 150;
const ARR = 50;
const SD_ARR = 50;
const MAX_FLOOR_KICKS = 15;
let previousClearWasB2B = false; // Added to avoid ReferenceError
let isClearing = false;
// 新たに追加：ゲームオーバー状態の管理フラグ
let isGameOver = false;
// Attack bar globals
let attackBar = 0;
const MAX_ATTACK = 100; // maximum attack bar value


const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

let board,
    currentPiece,
    holdPiece = null,
    holdUsed = false,
    score = 0,
    level = 1,
    linesCleared = 0;
const boardRows = CONFIG.board.rows;
const boardCols = CONFIG.board.cols;
const cellSize = CONFIG.board.cellSize;

function createBoard() {
  const b = [];
  for (let r = 0; r < boardRows; r++) b[r] = new Array(boardCols).fill(0);
  return b;
}
board = createBoard();

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
    const x = piece.x + shape[i][0],
          y = piece.y + shape[i][1];
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
    triggerLineClearEffect(lines);
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
  if (tspinEffect && now - tspinEffect.startTime >= tspinEffect.duration)
    tspinEffect = null;
}

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
  if (piece.type === "O") {
    piece.rotation = newRotation;
    piece.lockDelay = 0;
    return;
  }
  if (piece.type === "I") {
    let offsets = [];
    if (oldRotation === 0) {
      if (direction === -1) { 
        offsets = [ [-1, 0], [2, 0], [-1, -2], [2, 1] ];
      } else if (direction === 1) {
        offsets = [ [-2, 0], [1, 0], [-2, 1], [1, -2] ];
      }
    } else if (oldRotation === 1) {
      if (direction === -1) {
        offsets = [ [2, 0], [-1, 0], [2, -1], [-1, 2] ];
      } else if (direction === 1) { 
        offsets = [ [-1, 0], [2, 0], [-1, -2], [2, 1] ];
      }
    } else if (oldRotation === 2) {
      if (direction === -1) { 
        offsets = [ [1, 0], [-2, 0], [1, 2], [-2, -1] ];
      } else if (direction === 1) { 
        offsets = [ [2, 0], [-1, 0], [2, -1], [-1, 2] ];
      }
    } else if (oldRotation === 3) {
      if (direction === -1) { 
        offsets = [ [1, 0], [-2, 0], [-2, 1], [1, -2] ];
      } else if (direction === 1) { 
        offsets = [ [-2, 0], [1, 0], [1, 2], [-2, -1] ];
      }
    }
    for (let i = 0; i < offsets.length; i++) {
      const [dx, dy] = offsets[i];
      if ((dx !== 0 || dy !== 0) && piece.floorKickCount >= MAX_FLOOR_KICKS) {
        continue;
      }
      if (isValidPosition(piece, dx, dy, newRotation)) {
        piece.x += dx;
        piece.y += dy;
        piece.rotation = newRotation;
        piece.isRotation = true;
        piece.lastKick = [dx, dy];
        piece.lastSRS = i + 1;
        if (dx !== 0 || dy !== 0) piece.floorKickCount++;
        piece.lockDelay = 0;
        return;
      }
    }
    piece.isRotation = false;
    return;
  }
  if (isValidPosition(piece, 0, 0, newRotation)) {
    piece.rotation = newRotation;
    piece.lockDelay = 0;
    piece.isRotation = true;
    piece.lastKick = [0, 0];
    piece.lastSRS = 0;
    return;
  }
  let offsets = [];
  switch (oldRotation) {
    case 0:
      if (direction === -1) {
        offsets = [[ 1,  0], [ 1, -1], [ 0,  2], [ 1,  2]];
      } else if (direction === 1) {
        offsets = [[-1,  0], [-1, -1], [ 0,  2], [-1,  2]];
      }
      break;
    case 1:
      offsets = [[ 1,  0], [ 1,  1], [ 0, -2], [ 1, -2]];
      break;
    case 2:
      if (direction === 1) {
        offsets = [[ 1,  0], [ 1, -1], [ 0,  2], [ 1,  2]];
      } else if (direction === -1) {
        offsets = [[-1,  0], [-1, -1], [ 0,  2], [-1,  2]];
      }
      break;
    case 3:
      if (direction === -1) {
        offsets = [[-1,  0], [-1,  1], [ 0, -2], [-1, -2]];
      } else if (direction === 1) {
        offsets = [[-1,  0], [-1,  1], [ 0, -2], [-1, -2]];
      }
      break;
  }
  for (let i = 0; i < offsets.length; i++) {
    const [dx, dy] = offsets[i];
    if ((dx !== 0 || dy !== 0) && piece.floorKickCount >= MAX_FLOOR_KICKS) {
      continue;
    }
    if (isValidPosition(piece, dx, dy, newRotation)) {
      piece.x += dx;
      piece.y += dy;
      piece.rotation = newRotation;
      piece.isRotation = true;
      piece.lastKick = [dx, dy];
      piece.lastSRS = i + 1;
      if (dx !== 0 || dy !== 0) piece.floorKickCount++;
      piece.lockDelay = 0;
      return;
    }
  }
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
  let cellsDropped = 0;
  while (isValidPosition(currentPiece, 0, 1)) {
    currentPiece.y += 1;
    cellsDropped++;
  }
  score += cellsDropped * CONFIG.scoring.drop;
  lockPiece();
}

function isBoardEmpty(board) {
  return board.every(row => row.every(cell => cell === 0));
}

function triggerGameOver() {
  isGameOver = true;
  console.log("Game Over!");
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#FF0000";
  ctx.font = "bold 50px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
}

function lockPiece() {
  if (isClearing) return;
  mergePiece(currentPiece);
  let tSpinDetected = false, tSpinMini = false;
  if (currentPiece.type === "T") {
    const result = detectTSpin(currentPiece);
    tSpinDetected = result.detected;
    tSpinMini = result.mini;
    if (tSpinDetected) {
      score += tSpinMini ? CONFIG.scoring.tspinMini : CONFIG.scoring.tspin;
      triggerTspinEffect(currentPiece.x, currentPiece.y);
    }
  }
  const fullLines = [];
  for (let r = 0; r < boardRows; r++) {
    if (board[r].every(cell => cell !== 0)) {
      fullLines.push(r);
    }
  }
  const renCount = currentPiece.combo || 0;
  let b2b = false;
  if (currentPiece.type === "T" || fullLines.length === 4) {
    b2b = previousClearWasB2B || false;
  }
  if (fullLines.length > 0) {
    isClearing = true;
    triggerLineClearEffect(fullLines);
    setTimeout(() => {
      board = board.filter((row, idx) => !fullLines.includes(idx));
      while (board.length < boardRows) {
        board.unshift(new Array(boardCols).fill(0));
      }
      const perfectClear = isBoardEmpty(board);
      const points = calculateScore({
        lines: fullLines.length,
        tSpin: tSpinDetected,
        isMini: tSpinMini,
        ren: renCount,
        b2b: b2b,
        perfectClear: perfectClear
      });
      score += points;
      linesCleared += fullLines.length;
      currentPiece = nextPieces.shift();
      currentPiece.lockDelay = 0;
      nextPieces.push(getNextPieceFromBag());
      holdUsed = false;
      // Only trigger game over if the new piece is colliding and at least one block is visible (y >= 0)
      if (!isValidPosition(currentPiece, 0, 0) && currentPiece.y >= 0) {
        triggerGameOver();
      } else {
        previousClearWasB2B = (currentPiece.type === "T" || fullLines.length === 4);
        currentPiece.combo = renCount + 1;
      }
      isClearing = false;
    }, CONFIG.effects.lineClearDuration);
  } else {
    currentPiece = nextPieces.shift();
    currentPiece.lockDelay = 0;
    nextPieces.push(getNextPieceFromBag());
    holdUsed = false;
    // Only trigger game over if the new piece is colliding and visible.
    if (!isValidPosition(currentPiece, 0, 0) && currentPiece.y >= 0) {
      triggerGameOver();
    }
    currentPiece.combo = 0;
    previousClearWasB2B = false;
  }
}

let pieceBag = [];
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
function refillBag() {
  pieceBag = Object.keys(TETROMINOES).slice();
  shuffle(pieceBag);
}
function getNextPieceFromBag() {
  if (pieceBag.length === 0) refillBag();
  const type = pieceBag.pop();
  return createPiece(type);
}

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
    currentPiece = nextPieces.shift();
    currentPiece.lockDelay = 0;
    currentPiece.rotation = 0;
    currentPiece.isRotation = false;
    currentPiece.x = Math.floor(boardCols / 2);
    currentPiece.y = -1;
    nextPieces.push(getNextPieceFromBag());
  } else {
    const temp = currentPiece;
    currentPiece = holdPiece;
    holdPiece = temp;
    currentPiece.rotation = 0;
    currentPiece.isRotation = false;
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
  const width = maxX - minX + 1,
        height = maxY - minY + 1;
  const offsetX = Math.floor((4 - width) / 2) - minX,
        offsetY = Math.floor((4 - height) / 2) - minY;
  shape.forEach(([x, y]) => {
    const drawX = posX + (x + offsetX) * cellSize,
          drawY = posY + (y + offsetY) * cellSize;
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

  ctx.fillStyle = CONFIG.colors.boardBackground;
  ctx.fillRect(boardX, boardY, boardWidth, boardHeight);

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

  let ghostPiece = Object.assign({}, currentPiece);
  while (isValidPosition(ghostPiece, 0, 1)) ghostPiece.y += 1;
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = CONFIG.colors.ghost;
  ghostPiece.shape[ghostPiece.rotation].forEach(([dx, dy]) => {
    const gx = ghostPiece.x + dx,
          gy = ghostPiece.y + dy;
    if (gy >= 0) {
      ctx.fillRect(
        boardX + gx * CONFIG.board.cellSize,
        boardY + (gy - (CONFIG.board.rows - CONFIG.board.visibleRows)) * CONFIG.board.cellSize,
        CONFIG.board.cellSize,
        CONFIG.board.cellSize
      );
    }
  });
  ctx.globalAlpha = 1.0;

  ctx.fillStyle = currentPiece.color;
  currentPiece.shape[currentPiece.rotation].forEach(([dx, dy]) => {
    const x = currentPiece.x + dx,
          y = currentPiece.y + dy;
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

  if (tspinEffect) {
    const elapsed = now - tspinEffect.startTime;
    const alpha = Math.max(0, 1 - elapsed / tspinEffect.duration);
    ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("T-SPIN!", boardX + boardWidth / 2, boardY + boardHeight / 2);
  }

  // ホールド表示
  const previewCellSize = Math.floor(CONFIG.board.cellSize * 0.8);
  const holdBoxX = boardX - previewCellSize * 4 - 20,
        holdBoxY = boardY;
  ctx.strokeStyle = "#FFF";
  ctx.lineWidth = 2;
  ctx.strokeRect(holdBoxX - 5, holdBoxY - 5, previewCellSize * 4 + 10, previewCellSize * 4 + 10);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("HOLD", holdBoxX, holdBoxY - 10);
  if (holdPiece) drawMiniPiece(holdPiece, holdBoxX, holdBoxY, previewCellSize);

  // Next表示
  const nextBoxX = boardX + boardWidth + 20,
        nextBoxY = boardY;
  ctx.strokeStyle = "#FFF";
  ctx.lineWidth = 2;
  ctx.strokeRect(nextBoxX - 5, nextBoxY - 5, previewCellSize * 4 + 10, previewCellSize * 15 + 10);
  ctx.fillText("NEXT", nextBoxX, nextBoxY - 10);
  for (let i = 0; i < Math.min(5, nextPieces.length); i++) {
    drawMiniPiece(nextPieces[i], nextBoxX, nextBoxY + i * previewCellSize * 3, previewCellSize);
  }

  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, boardX, boardY + boardHeight + 30);
  ctx.fillText(`Lines: ${linesCleared}`, boardX, boardY + boardHeight + 60);
  ctx.fillText(`Level: ${level}`, boardX, boardY + boardHeight + 90);

    
  if (isGameOver) {
    drawGameOver();
  }
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
  if (isGameOver) {
    draw();
    return;
  }
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
nextPieces = [];
for (let i = 0; i < 5; i++) {
  nextPieces.push(getNextPieceFromBag());
}
update();
