"use strict";

const io = require("socket.io-client");
const fs = require("fs");
const path = require("path");

// 自動再マッチングフラグ
const AUTO_REMATCH = true;

// =====================
// ■ Bot/AI 設定
// =====================
const BASE_AI_PARAMETERS = {
  weightLineClear: 1.0,
  weightTetris: 8.0,
  weightTSpin: 2.0,
  weightCombo: 3.5,

  weightAggregateHeight: -0.71,
  weightBumpiness: -0.18,
  weightHoles: -1.8,         // 穴ペナルティ（強化）
  weightBottomHoles: -2.0,   // 下部穴のペナルティ（強化）
  weightUpperRisk: -1.0,

  weightMiddleOpen: 1.9,
  weightHoldFlexibility: 1.0,
  weightNextPiece: 1.5,

  weightLowerPlacement: 0.7,
  weightUpperPlacement: -0.5,
  weightEdgePenalty: -0.2,

  lineClearBonus: 1.0,
  weightGarbage: 10
};

const BOT_COUNT = 50;
const BOT_MOVE_DELAY = 400;
const MOVE_ANIMATION_DELAY = 100;
const SOFT_DROP_DELAY = 100;

const SERVER_URL = "https://tetris.psannetwork.net/";
const dataDir = "./data";
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// =====================
// ■ テトリミノ定義＆ SRS キックテーブル
// =====================
const tetrominoes = {
  I: { base: [[0, 0], [1, 0], [2, 0], [3, 0]], spawn: { x: 3, y: 0 } },
  J: { base: [[0, 0], [0, 1], [1, 1], [2, 1]], spawn: { x: 3, y: 0 } },
  L: { base: [[2, 0], [0, 1], [1, 1], [2, 1]], spawn: { x: 3, y: 0 } },
  O: { base: [[0, 0], [1, 0], [0, 1], [1, 1]], spawn: { x: 4, y: 0 } },
  S: { base: [[1, 0], [2, 0], [0, 1], [1, 1]], spawn: { x: 3, y: 0 } },
  T: { base: [[1, 0], [0, 1], [1, 1], [2, 1]], spawn: { x: 3, y: 0 } },
  Z: { base: [[0, 0], [1, 0], [1, 1], [2, 1]], spawn: { x: 3, y: 0 } }
};

const srsKick = {
  normal: {
    "0_L": { newOrientation: 3, offsets: [{ x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }] },
    "0_R": { newOrientation: 1, offsets: [{ x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }] },
    "90_L": { newOrientation: 0, offsets: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }] },
    "90_R": { newOrientation: 2, offsets: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }] },
    "180_L": { newOrientation: 1, offsets: [{ x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }] },
    "180_R": { newOrientation: 3, offsets: [{ x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }] },
    "270_L": { newOrientation: 2, offsets: [{ x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }] },
    "270_R": { newOrientation: 0, offsets: [{ x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }] }
  },
  I: {
    "0_L": { newOrientation: 3, offsets: [{ x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: -2 }, { x: 2, y: 1 }] },
    "0_R": { newOrientation: 1, offsets: [{ x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 1 }, { x: 1, y: -2 }] },
    "90_L": { newOrientation: 0, offsets: [{ x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: -1 }, { x: -1, y: 2 }] },
    "90_R": { newOrientation: 2, offsets: [{ x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: -2 }, { x: 2, y: 1 }] },
    "180_L": { newOrientation: 1, offsets: [{ x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 2 }, { x: -2, y: -1 }] },
    "180_R": { newOrientation: 3, offsets: [{ x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: -1 }, { x: -1, y: 2 }] },
    "270_L": { newOrientation: 2, offsets: [{ x: 1, y: 0 }, { x: -2, y: 0 }, { x: -2, y: 1 }, { x: 1, y: -2 }] },
    "270_R": { newOrientation: 0, offsets: [{ x: 2, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 2 }, { x: -2, y: -1 }] }
  }
};

// =====================
// ■ 盤面・ミノ操作の基本関数
// =====================
function createEmptyBoard() {
  const rows = 22, cols = 10;
  return Array.from({ length: rows }, () => new Array(cols).fill(0));
}

function getPieceBlocks(piece) {
  return piece.base.map(([x, y]) => {
    switch (piece.orientation) {
      case 0: return [x, y];
      case 1: return [y, -x];
      case 2: return [-x, -y];
      case 3: return [-y, x];
      default: return [x, y];
    }
  });
}

function isValidPosition(piece, board, dx, dy, candidateBlocks = null) {
  const blocks = candidateBlocks || getPieceBlocks(piece);
  for (let block of blocks) {
    const newX = piece.x + dx + block[0];
    const newY = piece.y + dy + block[1];
    if (newX < 0 || newX >= 10) return false;
    if (newY >= 22) return false;
    if (newY >= 0 && board[newY][newX] !== 0) return false;
  }
  return true;
}

function mergePiece(piece, board) {
  const blocks = getPieceBlocks(piece);
  for (let block of blocks) {
    const x = piece.x + block[0];
    const y = piece.y + block[1];
    if (y >= 0 && y < 22 && x >= 0 && x < 10) {
      board[y][x] = piece.type;
    }
  }
}

function clearLines(board) {
  let cleared = 0;
  for (let r = board.length - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(10).fill(0));
      cleared++;
    }
  }
  return cleared;
}

function attemptRotation(piece, direction, board) {
  // ※ この関数は実際の回転処理に用い、非破壊版は下記 rotatedPiece() を参照
  if (piece.type === "O") return true;
  const table = (piece.type === "I") ? srsKick.I : srsKick.normal;
  const key = `${piece.orientation}_${direction}`;
  if (!table[key]) return false;
  const { newOrientation, offsets } = table[key];
  const candidateBlocks = piece.base.map(([x, y]) => {
    switch (newOrientation) {
      case 0: return [x, y];
      case 1: return [y, -x];
      case 2: return [-x, -y];
      case 3: return [-y, x];
      default: return [x, y];
    }
  });
  for (let off of offsets) {
    const candidateX = piece.x + off.x;
    const candidateY = piece.y + off.y;
    if (isValidPosition({ ...piece, x: candidateX, y: candidateY, orientation: newOrientation },
                         board, 0, 0, candidateBlocks)) {
      piece.x = candidateX;
      piece.y = candidateY;
      piece.orientation = newOrientation;
      if (piece.type === "T") piece.rotated = true;
      return true;
    }
  }
  return false;
}

function hardDrop(piece, board) {
  while (isValidPosition(piece, board, 0, 1)) {
    piece.y++;
  }
  return piece;
}

async function softDropAnimation(piece, board, targetY) {
  while (piece.y < targetY && isValidPosition(piece, board, 0, 1)) {
    piece.y++;
    await delay(SOFT_DROP_DELAY);
  }
}

function spawnPiece() {
  const types = Object.keys(tetrominoes);
  const type = types[Math.floor(Math.random() * types.length)];
  const spawnPos = tetrominoes[type].spawn;
  return {
    type,
    base: tetrominoes[type].base,
    x: spawnPos.x,
    y: spawnPos.y,
    orientation: 0,
    isTSpin: false,
    rotated: false
  };
}

function drawBoard(fixedBoard, currentPiece) {
  const board = fixedBoard.map(row => row.slice());
  if (currentPiece) {
    const blocks = getPieceBlocks(currentPiece);
    for (let block of blocks) {
      const x = currentPiece.x + block[0];
      const y = currentPiece.y + block[1];
      if (y >= 0 && y < 22 && x >= 0 && x < 10) {
        board[y][x] = currentPiece.type;
      }
    }
  }
  return board;
}

// =====================
// ■ 危険判定／盤面評価系の関数
// （元コードと同様）
// =====================
function isDangerous(board) {
  for (let i = 0; i < 5; i++) {
    if (board[i].some(cell => cell !== 0)) return true;
  }
  let heights = getColumnHeights(board);
  let aggregate = heights.reduce((sum, h) => sum + h, 0);
  return aggregate > 50;
}

function computeHoleAccessibilityPenalty(board) {
  let penalty = 0;
  const rows = board.length;
  const cols = board[0].length;
  for (let j = 0; j < cols; j++) {
    let blockFound = false;
    for (let i = 0; i < rows; i++) {
      if (board[i][j] !== 0) {
        blockFound = true;
      } else if (blockFound && board[i][j] === 0) {
        let accessible = false;
        if (j > 0 && board[i][j - 1] === 0) accessible = true;
        if (j < cols - 1 && board[i][j + 1] === 0) accessible = true;
        if (!accessible) penalty += 1;
        else penalty -= 0.5;
      }
    }
  }
  return penalty;
}

function detectTSpin(piece, board) {
  if (piece.type !== "T" || !piece.rotated) return false;
  const cx = piece.x + 1, cy = piece.y + 1;
  let count = 0;
  const corners = [
    { x: cx - 1, y: cy - 1 },
    { x: cx + 1, y: cy - 1 },
    { x: cx - 1, y: cy + 1 },
    { x: cx + 1, y: cy + 1 }
  ];
  for (let corner of corners) {
    if (corner.x < 0 || corner.x >= 10 || corner.y < 0 || corner.y >= 22 ||
        board[corner.y][corner.x] !== 0) {
      count++;
    }
  }
  return count >= 3;
}

function computeMoveGarbage(piece, linesCleared, board, renChain, aiParameters) {
  let bonus = 0;
  const dangerous = isDangerous(board);
  if (piece.type === "T" && detectTSpin(piece, board)) {
    bonus += aiParameters.weightTSpin * (dangerous ? 0.5 : 1);
  }
  if (linesCleared === 1) {
    bonus += aiParameters.weightLineClear;
  } else if (linesCleared === 2) {
    bonus += aiParameters.weightLineClear * 2;
  } else if (linesCleared === 3) {
    bonus += aiParameters.weightLineClear * 3;
  } else if (linesCleared === 4) {
    let tetrisBonus = aiParameters.weightTetris;
    if (dangerous) tetrisBonus *= 0.5;
    bonus += tetrisBonus;
  }
  if (renChain > 1) {
    let comboWeight = aiParameters.weightCombo;
    if (dangerous) comboWeight *= 0.5;
    bonus += comboWeight * (renChain - 1);
  }
  const isAllClear = board.every(row => row.every(cell => cell === 0));
  if (isAllClear) bonus += 10;
  return bonus;
}

function getColumnHeights(board) {
  const cols = board[0].length;
  let heights = new Array(cols).fill(0);
  for (let j = 0; j < cols; j++) {
    for (let i = 0; i < board.length; i++) {
      if (board[i][j] !== 0) {
        heights[j] = board.length - i;
        break;
      }
    }
  }
  return heights;
}

function computeBumpiness(heights) {
  let bumpiness = 0;
  for (let j = 0; j < heights.length - 1; j++) {
    bumpiness += Math.abs(heights[j] - heights[j + 1]);
  }
  return bumpiness;
}

function computeHoles(board) {
  const cols = board[0].length;
  let holes = 0;
  for (let j = 0; j < cols; j++) {
    let blockFound = false;
    for (let i = 0; i < board.length; i++) {
      if (board[i][j] !== 0) blockFound = true;
      else if (blockFound && board[i][j] === 0) holes++;
    }
  }
  return holes;
}

function computeBottomHoles(board) {
  let bottomHoles = 0;
  const startRow = board.length - 5;
  const cols = board[0].length;
  for (let i = startRow; i < board.length; i++) {
    for (let j = 0; j < cols; j++) {
      if (board[i][j] === 0) {
        let blockAbove = false;
        for (let k = 0; k < i; k++) {
          if (board[k][j] !== 0) { blockAbove = true; break; }
        }
        if (blockAbove) bottomHoles++;
      }
    }
  }
  return bottomHoles;
}

function computeUpperRisk(board) {
  let risk = 0;
  const upperRows = 4;
  for (let i = 0; i < upperRows; i++) {
    for (let j = 0; j < board[0].length; j++) {
      if (board[i][j] !== 0) {
        risk += (upperRows - i);
      }
    }
  }
  return risk;
}

function evaluateMiddleOpen(board, parameters) {
  if (isDangerous(board)) return 0;
  let bonus = 0;
  const centerCols = [4, 5];
  for (let i = 0; i < Math.floor(board.length / 2); i++) {
    for (let j of centerCols) {
      if (board[i][j] === 0) bonus += parameters.weightMiddleOpen;
    }
  }
  return bonus;
}

function computePlacementBonus(placement, parameters) {
  let bonus = 0;
  const blocks = getPieceBlocks(placement);
  let totalRow = 0, count = 0;
  for (let block of blocks) {
    const row = placement.y + block[1];
    totalRow += row;
    count++;
    if (row < 4) bonus += parameters.weightUpperPlacement;
    const col = placement.x + block[0];
    if (col === 0 || col === 9) bonus += parameters.weightEdgePenalty;
  }
  const avgRow = totalRow / count;
  bonus += parameters.weightLowerPlacement * avgRow;
  return bonus;
}

function evaluateBoard(board, parameters) {
  const dangerous = isDangerous(board);
  const heights = getColumnHeights(board);
  const aggregateHeight = heights.reduce((sum, h) => sum + h, 0);
  const bumpiness = computeBumpiness(heights);
  const holes = computeHoles(board);
  const bottomHoles = computeBottomHoles(board);
  const upperRisk = computeUpperRisk(board);
  const maxHeight = Math.max(...heights);
  let score = 0;
  
  if (dangerous) {
    score += parameters.weightAggregateHeight * aggregateHeight * 1.5;
    score += parameters.weightBumpiness * bumpiness * 1.5;
    score += parameters.weightHoles * holes * 2;
    score += parameters.weightBottomHoles * bottomHoles * 2;
    score += parameters.weightUpperRisk * upperRisk * 2;
    score -= 0.5 * maxHeight;
  } else {
    score += parameters.weightAggregateHeight * aggregateHeight;
    score += parameters.weightBumpiness * bumpiness;
    score += parameters.weightHoles * holes;
    score += parameters.weightBottomHoles * bottomHoles;
    score += parameters.weightUpperRisk * upperRisk;
    score += evaluateMiddleOpen(board, parameters);
    score += parameters.weightNextPiece * countTSpinOpportunities(board);
  }
  score += computeHoleAccessibilityPenalty(board);
  return score;
}

function countTSpinOpportunities(board) {
  let count = 0;
  const Tpiece = { type: "T", base: tetrominoes["T"].base, x: tetrominoes["T"].spawn.x, y: tetrominoes["T"].spawn.y, orientation: 0, rotated: false };
  for (let orientation = 0; orientation < 4; orientation++) {
    let testPiece = { ...Tpiece, orientation };
    for (let x = -3; x < 10; x++) {
      let candidate = { ...testPiece, x: x, y: testPiece.y };
      if (!isValidPosition(candidate, board, 0, 0)) continue;
      let finalCandidate = hardDrop({ ...candidate }, board);
      if (detectTSpin(finalCandidate, board)) count++;
    }
  }
  return count;
}

// =====================
// ■ 以下、移動経路探索（BFS）による到達可能性の判定とアニメーション
// =====================

// 状態（pieceの x, y, orientation など）のクローン
function clonePiece(piece) {
  return { type: piece.type, base: piece.base, x: piece.x, y: piece.y, orientation: piece.orientation, rotated: piece.rotated || false };
}

// 非破壊版回転処理（SRS対応）※元の attemptRotation は状態を直接変更するため
function rotatedPiece(piece, direction, board) {
  if (piece.type === "O") return clonePiece(piece);
  const table = (piece.type === "I") ? srsKick.I : srsKick.normal;
  const key = `${piece.orientation}_${direction}`;
  if (!table[key]) return null;
  const { newOrientation, offsets } = table[key];
  const candidateBlocks = piece.base.map(([x, y]) => {
    switch (newOrientation) {
      case 0: return [x, y];
      case 1: return [y, -x];
      case 2: return [-x, -y];
      case 3: return [-y, x];
      default: return [x, y];
    }
  });
  for (let off of offsets) {
    let candidateX = piece.x + off.x;
    let candidateY = piece.y + off.y;
    let candidate = { ...piece, x: candidateX, y: candidateY, orientation: newOrientation };
    if (isValidPosition(candidate, board, 0, 0, candidateBlocks)) {
      return candidate;
    }
  }
  return null;
}

function moveLeft(state, board) {
  let next = clonePiece(state);
  next.x--;
  return isValidPosition(next, board, 0, 0) ? next : null;
}

function moveRight(state, board) {
  let next = clonePiece(state);
  next.x++;
  return isValidPosition(next, board, 0, 0) ? next : null;
}

function moveDown(state, board) {
  let next = clonePiece(state);
  next.y++;
  return isValidPosition(next, board, 0, 0) ? next : null;
}

function moveRotateCW(state, board) {
  return rotatedPiece(state, "R", board);
}

function moveRotateCCW(state, board) {
  return rotatedPiece(state, "L", board);
}

// hardDropをシミュレーション（盤面にぶつかる直前まで落下させた結果を返す）
function simulateHardDrop(state, board) {
  let test = clonePiece(state);
  while (isValidPosition(test, board, 0, 1)) {
    test.y++;
  }
  return test;
}

// BFS により、初期状態からある移動列で到達可能かを判定
// 目的：候補の配置 (target) と、初期状態からハードドロップした結果が一致するか
function findMoveSequence(initial, target, board) {
  let queue = [];
  let visited = new Set();
  // state: { piece, path }  path は ["L", "R", "CW", ...] の配列
  queue.push({ piece: clonePiece(initial), path: [] });
  visited.add(`${initial.x},${initial.y},${initial.orientation}`);
  
  const moves = [
    { move: "L", func: moveLeft },
    { move: "R", func: moveRight },
    { move: "D", func: moveDown },
    { move: "CW", func: moveRotateCW },
    { move: "CCW", func: moveRotateCCW }
  ];
  
  while (queue.length) {
    const { piece, path } = queue.shift();
    // ハードドロップ後の結果が目的と一致すれば成功
    const dropped = simulateHardDrop(piece, board);
    if (dropped.x === target.x &&
        dropped.y === target.y &&
        dropped.orientation === target.orientation) {
      return path;
    }
    
    for (let m of moves) {
      const next = m.func(piece, board);
      if (!next) continue;
      const key = `${next.x},${next.y},${next.orientation}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ piece: next, path: [...path, m.move] });
    }
  }
  return null;
}

// getAllPlacements: 元々の候補生成に加え、到達可能なものだけ返す
function getAllPlacements(board, piece) {
  const placements = [];
  for (let orientation = 0; orientation < 4; orientation++) {
    const testPiece = { ...piece, orientation, rotated: (orientation !== piece.orientation) };
    for (let x = -3; x < 10; x++) {
      let candidate = { ...testPiece, x: x, y: testPiece.y };
      if (!isValidPosition(candidate, board, 0, 0)) continue;
      let finalCandidate = hardDrop({ ...candidate }, board);
      // 到達可能性をチェック
      let moveSeq = findMoveSequence(piece, finalCandidate, board);
      if (!moveSeq) continue; // 到達できなければ除外
      finalCandidate.moveSequence = moveSeq;  // アニメーション用に記録
      finalCandidate.tspinBonus = (finalCandidate.type === "T" && detectTSpin(finalCandidate, board)) ? 2 : 0;
      placements.push(finalCandidate);
    }
  }
  return placements;
}

// Botの最善手選択（到達可能な配置のみを評価）
function findBestMove(board, currentPiece, aiParameters, socket, botStrength) {
  const placements = getAllPlacements(board, currentPiece);
  if (placements.length === 0) return null;
  let bestScore = -Infinity, bestMove = null;
  const FIREPOWER_THRESHOLD = 20;
  const currentAttack = socket.gameStats.totalAttack;
  
  for (let placement of placements) {
    // シミュレーション用盤面（ディープコピー）
    const simulatedBoard = board.map(row => row.slice());
    mergePiece(placement, simulatedBoard);
    const linesCleared = clearLines(simulatedBoard);
    placement.isTSpin = (placement.type === "T" && detectTSpin(placement, simulatedBoard));
    const garbagePotential = computeMoveGarbage(placement, linesCleared, simulatedBoard, socket.gameStats.renChain, aiParameters);
    let dynamicGarbageWeight = aiParameters.weightGarbage;
    if (currentAttack > FIREPOWER_THRESHOLD) dynamicGarbageWeight *= 2;
    else dynamicGarbageWeight *= 0.5;
    let score = evaluateBoard(simulatedBoard, aiParameters) + (garbagePotential * dynamicGarbageWeight);
    score += computePlacementBonus(placement, aiParameters);
    if (placement.type === "T" && placement.isTSpin) score += placement.tspinBonus;
    if (socket.lastMove && placement.x === socket.lastMove.x && placement.orientation === socket.lastMove.orientation) {
      score -= aiParameters.weightCombo;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMove = placement;
    }
  }
  
  if (bestMove) socket.lastMove = { x: bestMove.x, orientation: bestMove.orientation };
  let errorChance = (100 - botStrength) / 400;
  if (Math.random() < errorChance) bestMove = placements[Math.floor(Math.random() * placements.length)];
  return bestMove;
}

// =====================
// ■ 学習処理とパラメータ永続化（元コードと同様）
// =====================
function updateLearning(socket, botIndex) {
  const stats = socket.gameStats;
  const targetMoves = 300;
  const targetAttack = 3;
  const averageAttack = stats.moves > 0 ? stats.totalAttack / stats.moves : 0;
  const learningRate = 0.01;
  const survivalFactor = (targetMoves - stats.moves) / targetMoves;
  const attackFactor = (targetAttack - averageAttack) / targetAttack;
  
  socket.aiParameters.weightAggregateHeight -= learningRate * survivalFactor;
  socket.aiParameters.weightGarbage += learningRate * attackFactor;
  
  const currentHoles = computeHoles(socket.currentBoard);
  const currentBottomHoles = computeBottomHoles(socket.currentBoard);
  const targetHoles = 3;
  const targetBottomHoles = 1;
  socket.aiParameters.weightHoles -= learningRate * (currentHoles - targetHoles);
  socket.aiParameters.weightBottomHoles -= learningRate * (currentBottomHoles - targetBottomHoles);
  
  const filename = path.join(dataDir, `bot_${botIndex}.json`);
  fs.writeFileSync(filename, JSON.stringify(socket.aiParameters, null, 2));
}

// =====================
// ■ ゲームループ（ガーベージ追加タイミング修正）
// =====================
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function gameLoop(socket, botIndex) {
  async function animateMove(piece, bestMove, board) {
    // BFSで得た移動シーケンスに従って再現する
    if (!bestMove.moveSequence) {
      // 移動経路が無い場合はハードドロップ
      hardDrop(piece, board);
      socket.emit("BoardStatus", { UserID: socket.id, board: drawBoard(board, piece) });
      return;
    }
    for (let move of bestMove.moveSequence) {
      let next;
      if (move === "L") next = moveLeft(piece, board);
      else if (move === "R") next = moveRight(piece, board);
      else if (move === "D") next = moveDown(piece, board);
      else if (move === "CW") next = moveRotateCW(piece, board);
      else if (move === "CCW") next = moveRotateCCW(piece, board);
      if (next) {
        piece.x = next.x;
        piece.y = next.y;
        piece.orientation = next.orientation;
        piece.rotated = next.rotated;
      }
      socket.emit("BoardStatus", { UserID: socket.id, board: drawBoard(board, piece) });
      await delay(MOVE_ANIMATION_DELAY);
    }
    // 最終的に安全に落下
    hardDrop(piece, board);
    socket.emit("BoardStatus", { UserID: socket.id, board: drawBoard(board, piece) });
  }
  
  let currentBoard = createEmptyBoard();
  socket.currentBoard = currentBoard;
  socket.gameStats = { totalCleared: 0, moves: 0, totalAttack: 0, renChain: 0 };
  // pendingGarbage の初期化
  socket.pendingGarbage = 0;
  
  let currentPiece = spawnPiece();
  
  while (true) {
    if (!isValidPosition(currentPiece, currentBoard, 0, 0)) break;
    
    const bestMove = findBestMove(currentBoard, currentPiece, socket.aiParameters, socket, socket.botStrength);
    if (bestMove) await animateMove(currentPiece, bestMove, currentBoard);
    else hardDrop(currentPiece, currentBoard);
    
    mergePiece(currentPiece, currentBoard);
    const cleared = clearLines(currentBoard);
    socket.gameStats.totalCleared += cleared;
    socket.gameStats.moves++;
    socket.gameStats.renChain = (cleared > 0) ? socket.gameStats.renChain + 1 : 0;
    const moveGarbage = computeMoveGarbage(currentPiece, cleared, currentBoard, socket.gameStats.renChain, socket.aiParameters);
    socket.gameStats.totalAttack += moveGarbage;
    if (moveGarbage > 0) {
      // 自分から送信するガーベージは通常即時送信
      socket.emit("SendGarbage", { targetId: null, lines: moveGarbage });
    }
    // ※【修正】ここではガーベージは「保留」状態にし、次ミノ生成直前に反映する
    socket.emit("BoardStatus", { UserID: socket.id, board: drawBoard(currentBoard, null) });
    
    // ガーベージ保留があれば、次ミノ操作直前に適用
    if (socket.pendingGarbage && socket.pendingGarbage > 0) {
      for (let i = 0; i < socket.pendingGarbage; i++) {
        currentBoard.shift();
        let newRow = new Array(10).fill("G");
        const gapIndex = Math.floor(Math.random() * 10);
        newRow[gapIndex] = 0;
        currentBoard.push(newRow);
      }
      socket.pendingGarbage = 0;
      socket.emit("BoardStatus", { UserID: socket.id, board: drawBoard(currentBoard, null) });
    }
    
    let nextPiece = spawnPiece();
    if (!isValidPosition(nextPiece, currentBoard, 0, 0)) break;
    currentPiece = nextPiece;
    socket.currentBoard = currentBoard;
    await delay(BOT_MOVE_DELAY);
  }
  
  socket.emit("PlayerGameStatus", "gameover");
  updateLearning(socket, botIndex);
  socket.emit("BoardStatus", { UserID: socket.id, board: drawBoard(currentBoard, null) });
  await delay(100);
  socket.disconnect();
  if (AUTO_REMATCH) {
    setTimeout(() => {
      createBot(botIndex, socket.botStrength, socket.aiParameters);
    }, 10000);
  }
}

// =====================
// ■ Multi-Bot サポート（ガーベージ受信処理修正）
// =====================
function createBot(botIndex, strength, aiParameters) {
  const socket = io(SERVER_URL, { reconnection: false });
  const botStrength = (typeof strength === "number") ? strength : Math.floor(Math.random() * 101);
  socket.botStrength = botStrength;
  socket.aiParameters = aiParameters ? { ...aiParameters } : { ...BASE_AI_PARAMETERS };
  
  socket.on("connect", () => {
    socket.emit("matching");
  });
  
  socket.on("roomInfo", (data) => {});
  socket.on("CountDown", (data) => {});
  socket.on("ReceiveGarbage", ({ from, lines }) => {
    const numLines = parseInt(lines, 10) || 0;
    // 【修正】受信したガーベージは即時盤面に反映せず、pending に蓄積する
    socket.pendingGarbage = (socket.pendingGarbage || 0) + numLines;
  });
  socket.on("disconnect", (reason) => {});
  socket.on("error", (err) => {});
  socket.on("StartGame", () => {
    socket.currentBoard = createEmptyBoard();
    socket.gameStats = { totalCleared: 0, moves: 0, totalAttack: 0, renChain: 0 };
    gameLoop(socket, botIndex);
  });
}

for (let i = 0; i < BOT_COUNT; i++) {
  createBot(i + 1);
}
