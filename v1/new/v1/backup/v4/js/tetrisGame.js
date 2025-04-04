// js/tetrisGame.js
class TetrisGame {
  constructor(canvas, socket) {
    this.canvas = canvas;
    this.socket = socket;
    this.board = new Board(ROWS, COLS);
    this.renderer = new Renderer(canvas, this.board);
    this.inputManager = new InputManager();
    this.dropInterval = DROP_INTERVAL_INITIAL;
    this.lastDropTime = performance.now();
    this.gameOver = false;
    this.score = 0;
    this.ren = 0;
    this.backToBack = false;
    
    this.bag = [];
    this.nextQueue = [this.getNextPiece(), this.getNextPiece(), this.getNextPiece()];
    this.currentPiece = this.nextQueue.shift();
    this.nextQueue.push(this.getNextPiece());
    
    this.holdPiece = null;
    this.holdUsed = false;
    this.lockDelayStart = null;
    this.lockResetCount = 0;
    this.spinMessage = null;
    this.spinMessageTime = 0;
    
    this.attackGauge = 0;
    this.gaugeTimestamp = performance.now();
    this.lastUserInputTime = performance.now();
    
    this.garbageAnimating = false;
    this.lastRotationAttemptTime = 0;
    this.lastRotationDir = null;
    this.rotationFailCount = 0;
    this.lastUpdateTime = performance.now();
    
    this.locked = false;
    
    this.socketId = null;
    this.roomId = null;
    this.remotePlayers = [];
    this.roomDetails = null;
    
    // カウントダウン・開始状態
    this.countdown = null;
    this.countdownStartTime = null;
    this.waitingForStart = true;
    
    // 順位情報
    this.ranking = null;
    // スペクテイターモードフラグ
    this.spectatorMode = false;
    
    this.update = this.update.bind(this);
    requestAnimationFrame(this.update);
  }
  
  getNextPiece() {
    if (this.bag.length === 0) {
      this.bag = shuffleArray(Object.keys(TETROMINOES));
    }
    let type = this.bag.pop();
    return new Piece(type);
  }
  
  isPieceOnGround() {
    return this.board.collides(this.currentPiece, this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1);
  }
  
  move(direction) {
    let newX = this.currentPiece.x + direction;
    if (this.board.collides(this.currentPiece, this.currentPiece.shape, newX, this.currentPiece.y)) return;
    this.currentPiece.x = newX;
    this.currentPiece.lastAction = "move";
    if (this.isPieceOnGround() && this.lockResetCount < MAX_LOCK_RESETS) {
      this.lockDelayStart = performance.now();
      this.lockResetCount++;
    }
  }
  
  rotate(dir) {
    let prevShape = JSON.stringify(this.currentPiece.shape);
    this.currentPiece.rotate(dir, this.board);
    let newShape = JSON.stringify(this.currentPiece.shape);
    if (prevShape !== newShape && this.currentPiece.lastAction === "rotate") {
      playSound('rotate');
    }
    if (this.isPieceOnGround() && this.lockResetCount < MAX_LOCK_RESETS) {
      this.lockDelayStart = performance.now();
      this.lockResetCount++;
    }
  }
  
  softDrop() {
    if (!this.board.collides(this.currentPiece, this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
      this.currentPiece.y += 1;
      this.currentPiece.lastAction = "move";
      this.score += SCORE_VALUES.SOFT_DROP;
      if (this.isPieceOnGround() && this.lockResetCount < MAX_LOCK_RESETS) {
        this.lockDelayStart = performance.now();
        this.lockResetCount++;
      }
    }
  }
  
  hardDrop() {
    let startY = this.currentPiece.y;
    while (!this.board.collides(this.currentPiece, this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
      this.currentPiece.y += 1;
    }
    this.currentPiece.lastAction = "harddrop";
    this.score += (this.currentPiece.y - startY) * SCORE_VALUES.HARD_DROP;
    playSound('drop');
    this.lockPiece();
  }
  
  hold() {
    if (this.holdUsed) return;
    if (this.holdPiece === null) {
      this.holdPiece = new Piece(this.currentPiece.type);
      this.currentPiece = this.nextQueue.shift();
      this.nextQueue.push(this.getNextPiece());
    } else {
      let temp = new Piece(this.currentPiece.type);
      this.currentPiece = new Piece(this.holdPiece.type);
      this.holdPiece = temp;
    }
    let bounds = getPieceBounds(this.currentPiece);
    this.currentPiece.x = Math.floor((COLS - (bounds.maxX - bounds.minX + 1)) / 2) - bounds.minX;
    this.currentPiece.y = - (bounds.maxY - bounds.minY + 1);
    this.holdUsed = true;
    this.lockDelayStart = null;
    this.lockResetCount = 0;
  }
  
  detectTSpin(piece) {
    if (piece.type !== "T") return false;
    if (piece.lastAction !== "rotate") return false;
    if (piece.y < 0) return false;
    let pivotX = piece.x + (piece.pivot.x - piece.spawnOffset.x);
    let pivotY = piece.y + (piece.pivot.y - piece.spawnOffset.y);
    const isBlocked = (x, y) => {
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true;
      return this.board.grid[y][x] !== null;
    };
    let count = 0;
    if (isBlocked(pivotX - 1, pivotY - 1)) count++;
    if (isBlocked(pivotX + 1, pivotY - 1)) count++;
    if (isBlocked(pivotX - 1, pivotY + 1)) count++;
    if (isBlocked(pivotX + 1, pivotY + 1)) count++;
    return count >= 3;
  }
  
  lockPiece() {
    if (this.locked) return;
    this.locked = true;
    
    let bounds = getPieceBounds(this.currentPiece);
    this.currentPiece.x = Math.max(-bounds.minX, Math.min(this.currentPiece.x, COLS - 1 - bounds.maxX));
    this.board.placePiece(this.currentPiece);
    
    let isTSpin = false;
    if (this.currentPiece.type === "T") {
      isTSpin = this.detectTSpin(this.currentPiece);
      if (isTSpin) {
        this.spinMessage = "T-Spin!";
        this.spinMessageTime = performance.now();
        playSound('tspin');
        console.log("T-Spin detected!");
      }
    }
    
    let gaugeAge = performance.now() - this.gaugeTimestamp;
    if (this.attackGauge > 0 && this.gaugeTimestamp > 0 && gaugeAge >= GAUGE_TIME_RED && this.ren === 0) {
      console.log("Adding garbage: gauge has charge, red blinking expired, and REN is inactive.");
      let garbageLinesToAdd = Math.floor(this.attackGauge / GAUGE_CONSUMPTION_PER_LINE);
      for (let i = 0; i < garbageLinesToAdd; i++) {
        setTimeout(() => {
          this.addGarbageLine();
        }, i * 30);
      }
      this.attackGauge = 0;
      this.gaugeTimestamp = 0;
      console.log("Gauge reset after garbage addition.");
    }
    
    this.board.clearLines((linesCleared) => {
      this.afterClearLines(linesCleared, isTSpin);
    });
  }
  
  afterClearLines(linesCleared, isTSpin) {
    if (linesCleared > 0) {
      this.ren++;
    } else {
      this.ren = 0;
    }
    let addPts = this.addScore(linesCleared, isTSpin);
    this.score += addPts;
    console.log(`Lines cleared: ${linesCleared}, REN: ${this.ren}, Score added: ${addPts}`);
    
    let gaugeReduction = linesCleared * GAUGE_CONSUMPTION_PER_LINE;
    this.attackGauge = Math.max(this.attackGauge - gaugeReduction, 0);
    
    let perfect = this.board.grid.every(row => row.every(cell => cell === null));
    if (perfect) {
      this.score += SCORE_VALUES.PERFECT_CLEAR;
      console.log("Perfect Clear! Bonus score added.");
    }
    
    if (this.ren === 0) {
      while (this.attackGauge >= MAX_GAUGE) {
        for (let i = 0; i < GARBAGE_LINES_PER_ADD; i++) {
          this.addGarbageLine();
        }
        this.attackGauge -= MAX_GAUGE;
      }
    }
    
    // 攻撃情報の送信
    if (linesCleared > 0 && this.socket && this.socket.readyState === WebSocket.OPEN) {
      let baseAmount = linesCleared * GAUGE_INCREMENT_AMOUNT;
      if (isTSpin) { baseAmount *= 1.5; }
      if (this.backToBack) { baseAmount *= 1.2; }
      const amount = Math.floor(baseAmount);
      if (amount > 0) {
        const attackMsg = {
          type: 'attack',
          linesCleared: linesCleared,
          tSpin: isTSpin,
          amount: amount
        };
        this.socket.send(JSON.stringify(attackMsg));
        console.log("Sent attack message:", attackMsg);
      }
    }
    
    this.spawnNextPiece();
  }
  
  addScore(linesCleared, isTSpin) {
    let baseScore = 0;
    if (isTSpin) {
      if (linesCleared === 0) baseScore = SCORE_VALUES.TSPIN;
      else if (linesCleared === 1) baseScore = SCORE_VALUES.TSPIN_SINGLE;
      else if (linesCleared === 2) baseScore = SCORE_VALUES.TSPIN_DOUBLE;
      else if (linesCleared === 3) baseScore = SCORE_VALUES.TSPIN_TRIPLE;
    } else {
      if (linesCleared === 1) baseScore = SCORE_VALUES.SINGLE;
      else if (linesCleared === 2) baseScore = SCORE_VALUES.DOUBLE;
      else if (linesCleared === 3) baseScore = SCORE_VALUES.TRIPLE;
      else if (linesCleared === 4) baseScore = SCORE_VALUES.TETRIS;
    }
    let b2bEligible = (!isTSpin && linesCleared === 4) || (isTSpin && linesCleared >= 1);
    if (b2bEligible) {
      if (this.backToBack) {
        baseScore = Math.floor(baseScore * 1.5);
      }
      this.backToBack = true;
    } else {
      this.backToBack = false;
    }
    let renBonus = (this.ren > 1) ? Math.min(50 * (this.ren - 1), 1000) : 0;
    return baseScore + renBonus;
  }
  
  spawnNextPiece() {
    this.currentPiece = this.nextQueue.shift();
    let bounds = getPieceBounds(this.currentPiece);
    this.currentPiece.x = Math.floor((COLS - (bounds.maxX - bounds.minX + 1)) / 2) - bounds.minX;
    this.currentPiece.y = - (bounds.maxY - bounds.minY + 1);
    this.currentPiece.isSpin = false;
    this.nextQueue.push(this.getNextPiece());
    this.holdUsed = false;
    this.lockDelayStart = null;
    this.lockResetCount = 0;
    this.locked = false;
    
    if (this.board.collides(this.currentPiece, this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y)) {
      this.endGame();
    }
  }
  
endGame() {
  this.gameOver = true;
  const gameOverEl = document.getElementById('gameOver');

  // 対戦相手がいない場合は Victory、そうでなければ Game Over と表示
  if (this.remotePlayers.length === 0) {
    gameOverEl.innerText = "Victory!";
  } else {
    gameOverEl.innerText = "Game Over";
  }
  
  gameOverEl.style.display = 'block';
  
  // ゲーム終了時は順位情報も表示しない
  this.ranking = null;  // 3秒後に WebSocket 接続を切断する（ws がオープン状態の場合）
  setTimeout(() => {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log("Game over: closing WebSocket connection.");
      this.socket.close();
    }
  }, 1000);
}


  
  // サーバーから攻撃情報を受信
  receiveAttack(amount) {
    this.attackGauge = Math.min(this.attackGauge + amount, MAX_GAUGE * 2);
    this.gaugeTimestamp = performance.now();
  }
  
  addGarbageLine() {
    let hole = Math.floor(Math.random() * COLS);
    let garbageLine = Array(COLS).fill("#666");
    garbageLine[hole] = null;
    this.board.grid.shift();
    this.board.grid.push(garbageLine);
  }
  
  update(currentTime = performance.now()) {
    if (this.gameOver) return;
    
    if (this.waitingForStart) {
      if (this.countdown != null && this.countdownStartTime != null) {
        let elapsed = (currentTime - this.countdownStartTime) / 1000;
        let remain = COUNTDOWN_TIME - elapsed;
        if (remain <= 0) {
          this.countdown = null;
          this.waitingForStart = false;
        } else {
          this.countdown = remain;
        }
      }
    } else {
      this.inputManager.update(currentTime, this);
      if (currentTime - this.lastDropTime > this.dropInterval) {
        this.softDrop();
        this.lastDropTime = currentTime;
      }
      if (this.isPieceOnGround()) {
        if (this.lockDelayStart === null) {
          this.lockDelayStart = currentTime;
        } else if (currentTime - this.lockDelayStart > LOCK_DELAY) {
          this.lockPiece();
        }
      } else {
        this.lockDelayStart = null;
      }
      // 放置状態のタイムアウトチェック（例：30秒以上操作がなければ）
      this.board.checkIdleTimeout(30000, () => {
        console.log("Idle timeout reached.");
        this.endGame();
      });
      
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        const stateMsg = {
          type: 'playerAction',
          state: {
            board: this.board.grid,
            score: this.score,
            piece: {
              type: this.currentPiece.type,
              x: this.currentPiece.x,
              y: this.currentPiece.y,
              shape: this.currentPiece.shape,
              color: this.currentPiece.color
            }
          }
        };
        this.socket.send(JSON.stringify(stateMsg));
      }
    }
    
    this.renderer.render(
      this.currentPiece,
      this.holdPiece,
      this.nextQueue,
      this.spinMessage,
      currentTime,
      this.spinMessageTime,
      this.attackGauge,
      (this.attackGauge > 0 ? (currentTime - this.gaugeTimestamp) : 0),
      this.remotePlayers,
      this.countdown,
      this.ranking,
      this.spectatorMode,
      this.roomDetails
    );
    requestAnimationFrame(this.update);
  }
}
