// js/tetrisGame.js
class TetrisGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.board = new Board(ROWS, COLS);
    this.renderer = new Renderer(canvas, this.board);
    this.inputManager = new InputManager();
    this.dropInterval = DROP_INTERVAL_INITIAL;
    this.lastDropTime = performance.now();
    this.gameOver = false;
    this.score = 0;
    this.ren = 0;             // 連続消し（REN）
    this.backToBack = false;  // Back-to-Back フラグ
    
    // バッグ方式でピース生成：Next キューは常に3個表示
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
    
    this.locked = false; // 重複ロック防止フラグ
    
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
      for (let i = 0; i < GARBAGE_LINES_PER_ADD; i++) {
        this.addGarbageLine();
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
      this.ren = this.ren + 1;
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
        console.log("Garbage added immediately due to critical gauge.");
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
    const isOperating = Object.values(this.inputManager.keys).some(x => x);
    if (!isOperating && this.attackGauge >= MAX_GAUGE && !this.garbageAnimating && this.ren === 0) {
      this.startGarbageAnimation();
    }
  }
  
  endGame() {
    this.gameOver = true;
    document.getElementById('gameOver').style.display = 'block';
  }
  
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
  
  startGarbageAnimation() {
    if (this.garbageAnimating) return;
    if (this.ren > 0) return;
    this.garbageAnimating = true;
    this.garbageIntervalId = setInterval(() => {
      const isOperating = Object.values(this.inputManager.keys).some(x => x);
      if (isOperating) {
        clearInterval(this.garbageIntervalId);
        this.garbageAnimating = false;
        return;
      }
      if (this.attackGauge >= MAX_GAUGE) {
        if (performance.now() - this.lastUserInputTime > 3000) {
          for (let i = 0; i < GARBAGE_LINES_PER_ADD; i++) {
            this.addGarbageLine();
          }
          this.attackGauge = Math.max(this.attackGauge - MAX_GAUGE, 0);
          console.log("Garbage added due to idle gauge accumulation.");
        }
      } else {
        clearInterval(this.garbageIntervalId);
        this.garbageAnimating = false;
      }
    }, GARBAGE_ANIM_INTERVAL);
  }
  
  update(currentTime = performance.now()) {
    if (this.gameOver) return;
    this.inputManager.update(currentTime, this);
    
    let dt = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;
    
    let gaugeAge = (this.attackGauge > 0) ? (currentTime - this.gaugeTimestamp) : 0;
    
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
    const isOperating = Object.values(this.inputManager.keys).some(x => x);
    if (!isOperating && (currentTime - this.lastUserInputTime > IDLE_THRESHOLD) && this.attackGauge >= MAX_GAUGE && !this.garbageAnimating && this.ren === 0) {
      this.startGarbageAnimation();
    }
    let bounds = getPieceBounds(this.currentPiece);
    this.currentPiece.x = Math.max(-bounds.minX, Math.min(this.currentPiece.x, COLS - 1 - bounds.maxX));
    
    this.renderer.render(
      this.currentPiece,
      this.holdPiece,
      this.nextQueue,
      this.spinMessage,
      currentTime,
      this.spinMessageTime,
      this.attackGauge,
      gaugeAge
    );
    requestAnimationFrame(this.update);
  }
}
