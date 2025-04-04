class Renderer {
  constructor(canvas, board) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.board = board;
    this.boardOffsetX = BOARD_OFFSET_X;
    this.boardOffsetY = 0;
  }
  
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  drawBoard() {
    this.ctx.strokeStyle = "#555";
    this.ctx.strokeRect(this.boardOffsetX, this.boardOffsetY, PLAYFIELD_WIDTH, ROWS * BLOCK_SIZE);
  }
  
  drawLockedPieces() {
    for (let y = 0; y < this.board.rows; y++) {
      for (let x = 0; x < this.board.cols; x++) {
        let cell = this.board.grid[y][x];
        if (cell) {
          this.drawBlock(this.boardOffsetX + x * BLOCK_SIZE, this.boardOffsetY + y * BLOCK_SIZE, BLOCK_SIZE, cell);
        }
      }
    }
  }
  
  drawBlock(x, y, size, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, size, size);
    this.ctx.strokeStyle = '#000';
    this.ctx.strokeRect(x, y, size, size);
  }
  
  drawPiece(piece, offsetX, offsetY, blockSize) {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          this.drawBlock(offsetX + (piece.x + x) * blockSize,
                         offsetY + (piece.y + y) * blockSize,
                         blockSize, piece.color);
        }
      }
    }
  }
  
  // ゴーストピース（透明度 0.3）
  drawGhostPiece(piece) {
    let ghost = {
      type: piece.type,
      shape: piece.shape.map(row => row.slice()),
      color: piece.color,
      x: piece.x,
      y: piece.y
    };
    while (!this.board.collides(ghost, ghost.shape, ghost.x, ghost.y + 1)) {
      ghost.y++;
    }
    this.ctx.save();
    this.ctx.globalAlpha = 0.3;
    this.drawPiece(ghost, this.boardOffsetX, this.boardOffsetY, BLOCK_SIZE);
    this.ctx.restore();
  }
  
  // サイドUI（ホールド／Next）の描画
  drawUI(holdPiece, nextQueue) {
    // ホールド枠
    const holdBoxX = 0, holdBoxY = 20;
    const holdBoxW = HOLD_PANEL_WIDTH, holdBoxH = HOLD_PANEL_HEIGHT * BLOCK_SIZE;
    this.ctx.strokeStyle = "#fff";
    this.ctx.strokeRect(holdBoxX, holdBoxY, holdBoxW, holdBoxH);
    this.ctx.font = "16px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#fff";
    this.ctx.fillText("HOLD", holdBoxX + holdBoxW / 2, holdBoxY - 5);
    if (holdPiece) {
      this.drawPieceInBox(holdPiece, holdBoxX, holdBoxY, holdBoxW, holdBoxH);
    }
    
    // Next枠：常に3個表示
    const nextBoxX = BOARD_OFFSET_X + PLAYFIELD_WIDTH, nextBoxY = 20;
    const nextBoxW = NEXT_PANEL_WIDTH;
    this.ctx.fillStyle = "#fff";
    this.ctx.fillText("NEXT", nextBoxX + nextBoxW / 2, nextBoxY - 5);
    for (let i = 0; i < 3; i++) {
      let boxY = nextBoxY + i * (NEXT_PANEL_BOX_HEIGHT * BLOCK_SIZE + 10);
      this.ctx.strokeStyle = "#fff";
      this.ctx.strokeRect(nextBoxX, boxY, nextBoxW, NEXT_PANEL_BOX_HEIGHT * BLOCK_SIZE);
      if (nextQueue[i]) {
        this.drawPieceInBox(nextQueue[i], nextBoxX, boxY, nextBoxW, NEXT_PANEL_BOX_HEIGHT * BLOCK_SIZE);
      }
    }
  }
  
  // 枠内にピースを中央寄せして描画
  drawPieceInBox(piece, boxX, boxY, boxW, boxH) {
    const previewBlockSize = BLOCK_SIZE * 0.5;
    let bounds = getPieceBounds(piece);
    const pieceW = (bounds.maxX - bounds.minX + 1) * previewBlockSize;
    const pieceH = (bounds.maxY - bounds.minY + 1) * previewBlockSize;
    const startX = boxX + (boxW - pieceW) / 2;
    const startY = boxY + (boxH - pieceH) / 2;
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          this.ctx.fillStyle = piece.color;
          this.ctx.fillRect(startX + (x - bounds.minX) * previewBlockSize,
                            startY + (y - bounds.minY) * previewBlockSize,
                            previewBlockSize, previewBlockSize);
          this.ctx.strokeStyle = '#000';
          this.ctx.strokeRect(startX + (x - bounds.minX) * previewBlockSize,
                              startY + (y - bounds.minY) * previewBlockSize,
                              previewBlockSize, previewBlockSize);
        }
      }
    }
  }
  
  // 攻撃ゲージ描画：
  // 通常分は MAX_GAUGE まで、超過分は別色で下側に表示。
  // また、ゲージの蓄積時間（gaugeAge）により色が変化し、6秒以降は点滅します。
  drawAttackGauge(attackGauge, gaugeAge, currentTime) {
    const gaugeX = HOLD_PANEL_WIDTH;
    // ゲージ枠
    this.ctx.strokeStyle = "#fff";
    this.ctx.strokeRect(gaugeX, 0, GAUGE_WIDTH, CANVAS_HEIGHT);
    
    // 通常分
    let baseValue = Math.min(attackGauge, MAX_GAUGE);
    let baseRatio = baseValue / MAX_GAUGE;
    let baseFillHeight = CANVAS_HEIGHT * baseRatio;
    
    // ゲージの経過時間 gaugeAge に応じた色変化
    let baseColor = "white";
    if (gaugeAge < GAUGE_TIME_WHITE) {
      baseColor = "white";
    } else if (gaugeAge < GAUGE_TIME_YELLOW) {
      baseColor = "yellow";
    } else if (gaugeAge < GAUGE_TIME_RED) {
      baseColor = "red";
    } else {
      baseColor = (Math.floor(currentTime / 500) % 2 === 0) ? "red" : "darkred";
    }
    this.ctx.fillStyle = baseColor;
    this.ctx.fillRect(gaugeX, CANVAS_HEIGHT - baseFillHeight, GAUGE_WIDTH, baseFillHeight);
    
    // 超過分：点滅表示（例として青点滅）
    if (attackGauge > MAX_GAUGE) {
      let extra = attackGauge - MAX_GAUGE;
      let extraFillHeight = (CANVAS_HEIGHT / MAX_GAUGE) * extra;
      let extraColor = (Math.floor(currentTime / 500) % 2 === 0) ? "blue" : "darkblue";
      this.ctx.fillStyle = extraColor;
      this.ctx.fillRect(gaugeX, CANVAS_HEIGHT, GAUGE_WIDTH, extraFillHeight);
    }
  }
  
  render(currentPiece, holdPiece, nextQueue, spinMessage, currentTime, spinMessageTime, attackGauge, gaugeAge) {
    this.clear();
    this.drawBoard();
    this.drawLockedPieces();
    if (currentPiece) {
      this.drawGhostPiece(currentPiece);
      this.drawPiece(currentPiece, this.boardOffsetX, this.boardOffsetY, BLOCK_SIZE);
    }
    this.drawUI(holdPiece, nextQueue);
    if (spinMessage && (currentTime - spinMessageTime < SPIN_MESSAGE_DURATION)) {
      this.ctx.font = "bold 32px sans-serif";
      this.ctx.fillStyle = "yellow";
      this.ctx.textAlign = "center";
      this.ctx.fillText(spinMessage, this.canvas.width / 2, 40);
    }
    this.drawAttackGauge(attackGauge, gaugeAge, currentTime);
  }
}
