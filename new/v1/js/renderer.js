// js/renderer.js
class Renderer {
  constructor(canvas, board) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.board = board;
    // レイアウト用の各種座標プロパティ（calculateLayout()で再計算）
    this.holdBoxX = 0;
    this.holdBoxY = 0;
    this.boardOffsetX = 0;
    this.boardOffsetY = 0;
    this.gaugeX = 0;
    this.gaugeY = 0;
    this.nextBoxX = 0;
    this.nextBoxY = 0;
    // 初期レイアウト計算
    this.calculateLayout();
  }
  
  // キャンバスサイズに合わせたレイアウトを計算する
  calculateLayout() {
    // MARGINなどは任意の余白（ここでは10px）
    const MARGIN = 10;
    // ここではグローバル定数として定義済みと仮定
    const boardWidth = COLS * BLOCK_SIZE;  // PLAYFIELD_WIDTH と同等
    const boardHeight = ROWS * BLOCK_SIZE;
    const holdWidth = HOLD_PANEL_WIDTH;
    const holdHeight = HOLD_PANEL_HEIGHT * BLOCK_SIZE;
    const nextWidth = NEXT_PANEL_WIDTH;
    const nextPanelTotalHeight = 3 * (NEXT_PANEL_BOX_HEIGHT * BLOCK_SIZE) + 20; // 3個分＋テキストの余白
    const gaugeWidth = GAUGE_WIDTH;
    
    // 全体の幅：左端の余白 + ホールド + 余白 + ゲージ + 余白 + ボード + 余白 + ネクスト + 右端の余白
    const totalWidth = MARGIN + holdWidth + MARGIN + gaugeWidth + MARGIN + boardWidth + MARGIN + nextWidth + MARGIN;
    const gameAreaX = (this.canvas.width - totalWidth) / 2;
    // ボード（＝ゲームプレイ領域）をキャンバス中央に配置
    const verticalOffset = (this.canvas.height - boardHeight) / 2;
    
    this.holdBoxX = gameAreaX + MARGIN;
    // ホールドパネルはボードの縦中央に合わせる
    this.holdBoxY = verticalOffset + (boardHeight - holdHeight) / 2;
    
    this.gaugeX = this.holdBoxX + holdWidth + MARGIN;
    this.gaugeY = verticalOffset;
    
    this.boardOffsetX = this.gaugeX + gaugeWidth + MARGIN;
    this.boardOffsetY = verticalOffset;
    
    this.nextBoxX = this.boardOffsetX + boardWidth + MARGIN;
    // ネクストパネルもボードの縦中央に合わせる
    this.nextBoxY = verticalOffset + (boardHeight - nextPanelTotalHeight) / 2;
  }
  
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  drawBoard() {
    this.ctx.strokeStyle = "#555";
    // ボードは COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE のサイズ
    this.ctx.strokeRect(this.boardOffsetX, this.boardOffsetY, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE);
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
    if (Assets.images && Assets.images.block) {
      this.ctx.drawImage(Assets.images.block, x, y, size, size);
    } else {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, size, size);
      this.ctx.strokeStyle = '#000';
      this.ctx.strokeRect(x, y, size, size);
    }
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
  
  drawUI(holdPiece, nextQueue) {
    // ホールド枠の描画
    const holdBoxW = HOLD_PANEL_WIDTH;
    const holdBoxH = HOLD_PANEL_HEIGHT * BLOCK_SIZE;
    this.ctx.strokeStyle = "#fff";
    this.ctx.strokeRect(this.holdBoxX, this.holdBoxY, holdBoxW, holdBoxH);
    this.ctx.font = "16px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#fff";
    this.ctx.fillText("HOLD", this.holdBoxX + holdBoxW / 2, this.holdBoxY - 5);
    if (holdPiece) {
      this.drawPieceInBox(holdPiece, this.holdBoxX, this.holdBoxY, holdBoxW, holdBoxH);
    }
    
    // NEXT 枠（常に3個表示）
    const nextBoxW = NEXT_PANEL_WIDTH;
    this.ctx.fillStyle = "#fff";
    this.ctx.fillText("NEXT", this.nextBoxX + nextBoxW / 2, this.nextBoxY - 5);
    for (let i = 0; i < 3; i++) {
      let boxY = this.nextBoxY + i * (NEXT_PANEL_BOX_HEIGHT * BLOCK_SIZE + 10);
      this.ctx.strokeStyle = "#fff";
      this.ctx.strokeRect(this.nextBoxX, boxY, nextBoxW, NEXT_PANEL_BOX_HEIGHT * BLOCK_SIZE);
      if (nextQueue[i]) {
        this.drawPieceInBox(nextQueue[i], this.nextBoxX, boxY, nextBoxW, NEXT_PANEL_BOX_HEIGHT * BLOCK_SIZE);
      }
    }
  }
  
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
  
  // 他プレイヤーのボード描画（spectatorModeの場合はフルサイズ、通常時はミニボード）
  drawRemotePlayers(remotePlayers, spectatorMode) {
    if (!remotePlayers || remotePlayers.length === 0) return;
    
    if (spectatorMode) {
      remotePlayers.forEach((player, idx) => {
        const scale = 1.0;
        for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col < COLS; col++) {
            const cell = player.state && player.state.board ? player.state.board[row][col] : null;
            if (cell) {
              this.ctx.fillStyle = cell;
              this.ctx.fillRect(col * BLOCK_SIZE * scale, row * BLOCK_SIZE * scale, BLOCK_SIZE * scale, BLOCK_SIZE * scale);
            }
          }
        }
        if (player.state && player.state.piece) {
          const piece = player.state.piece;
          const shape = piece.shape || TETROMINOES[piece.type].shape;
          for (let py = 0; py < shape.length; py++) {
            for (let px = 0; px < shape[py].length; px++) {
              if (shape[py][px]) {
                let drawX = (piece.x + px) * BLOCK_SIZE * scale;
                let drawY = (piece.y + py) * BLOCK_SIZE * scale;
                this.ctx.fillStyle = piece.color || TETROMINOES[piece.type].color;
                this.ctx.fillRect(drawX, drawY, BLOCK_SIZE * scale, BLOCK_SIZE * scale);
                this.ctx.strokeStyle = '#000';
                this.ctx.strokeRect(drawX, drawY, BLOCK_SIZE * scale, BLOCK_SIZE * scale);
              }
            }
          }
        }
      });
    } else {
      const scale = 0.2;
      const boardWidthScaled = COLS * BLOCK_SIZE * scale;
      const boardHeightScaled = ROWS * BLOCK_SIZE * scale;
      let x = 10, y = this.canvas.height - boardHeightScaled - 10;
      remotePlayers.forEach((player) => {
        this.ctx.fillStyle = "#333";
        this.ctx.fillRect(x, y, boardWidthScaled, boardHeightScaled);
        if (player.state && player.state.board) {
          for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
              const cell = player.state.board[row][col];
              if (cell) {
                this.ctx.fillStyle = cell;
                this.ctx.fillRect(x + col * BLOCK_SIZE * scale, y + row * BLOCK_SIZE * scale, BLOCK_SIZE * scale, BLOCK_SIZE * scale);
              }
            }
          }
        }
        if (player.state && player.state.piece) {
          const piece = player.state.piece;
          const shape = piece.shape || TETROMINOES[piece.type].shape;
          for (let py = 0; py < shape.length; py++) {
            for (let px = 0; px < shape[py].length; px++) {
              if (shape[py][px]) {
                let drawX = x + (piece.x + px) * BLOCK_SIZE * scale;
                let drawY = y + (piece.y + py) * BLOCK_SIZE * scale;
                this.ctx.fillStyle = piece.color || TETROMINOES[piece.type].color;
                this.ctx.fillRect(drawX, drawY, BLOCK_SIZE * scale, BLOCK_SIZE * scale);
                this.ctx.strokeStyle = '#000';
                this.ctx.strokeRect(drawX, drawY, BLOCK_SIZE * scale, BLOCK_SIZE * scale);
              }
            }
          }
        }
        this.ctx.font = "10px sans-serif";
        this.ctx.fillStyle = "#fff";
        this.ctx.textAlign = "left";
        if (player.name) {
          this.ctx.fillText(`${player.name} (${player.rating}) R:${player.rank || '-'}`, x, y - 5);
        }
        x += boardWidthScaled + 5;
        if (x + boardWidthScaled > this.canvas.width) {
          x = 10;
          y -= boardHeightScaled + 5;
        }
      });
    }
  }
  
  drawCountdown(countdown) {
    if (countdown == null || countdown <= 0) return;
    this.ctx.font = "bold 64px sans-serif";
    this.ctx.fillStyle = "rgba(255,255,255,0.8)";
    this.ctx.textAlign = "center";
    this.ctx.fillText(Math.ceil(countdown).toString(), this.canvas.width / 2, this.canvas.height / 2);
  }
  
  drawRanking(ranking) {
    let rankingdisplay = false;
    if (rankingdisplay === false) return;
    if (!ranking) return;
    this.ctx.font = "bold 24px sans-serif";
    this.ctx.fillStyle = "white";
    this.ctx.textAlign = "left";
    let x = 10, y = 30;
    this.ctx.fillText("Ranking:", x, y);
    ranking.forEach(p => {
      y += 30;
      this.ctx.fillText(`${p.rank}. ${p.name} (${p.rating}) - ${p.score}`, x, y);
    });
  }
  
  drawAttackGauge(attackGauge, gaugeAge, currentTime) {
    // ゲージの高さはボードの高さ（ROWS * BLOCK_SIZE）に合わせる
    this.ctx.strokeStyle = "#fff";
    this.ctx.strokeRect(this.gaugeX, this.gaugeY, GAUGE_WIDTH, ROWS * BLOCK_SIZE);
    
    let baseValue = Math.min(attackGauge, MAX_GAUGE);
    let baseRatio = baseValue / MAX_GAUGE;
    let baseFillHeight = ROWS * BLOCK_SIZE * baseRatio;
    
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
    this.ctx.fillRect(this.gaugeX, this.gaugeY + ROWS * BLOCK_SIZE - baseFillHeight, GAUGE_WIDTH, baseFillHeight);
    
    if (attackGauge > MAX_GAUGE) {
      let extra = attackGauge - MAX_GAUGE;
      let extraFillHeight = (ROWS * BLOCK_SIZE / MAX_GAUGE) * extra;
      let extraColor = (Math.floor(currentTime / 500) % 2 === 0) ? "blue" : "darkblue";
      this.ctx.fillStyle = extraColor;
      this.ctx.fillRect(this.gaugeX, this.gaugeY + ROWS * BLOCK_SIZE, GAUGE_WIDTH, extraFillHeight);
    }
  }
  
  render(currentPiece, holdPiece, nextQueue, spinMessage, currentTime, spinMessageTime, attackGauge, gaugeAge, remotePlayers, countdown, ranking, spectatorMode, roomDetails) {
    // 毎フレーム、キャンバスサイズに合わせてレイアウト再計算（リサイズ対応）
    this.calculateLayout();
    
    if (Assets.images && Assets.images.background) {
      this.ctx.drawImage(Assets.images.background, 0, 0, this.canvas.width, this.canvas.height);
    } else {
      this.clear();
    }
    // 背景にリモートプレイヤーの画面描写
    this.drawRemotePlayers(remotePlayers, spectatorMode);
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
    this.drawCountdown(countdown);
    if (ranking) {
      this.drawRanking(ranking);
    }
    if (roomDetails) {
      this.ctx.font = "14px sans-serif";
      this.ctx.fillStyle = "white";
      this.ctx.textAlign = "right";
      this.ctx.fillText(`Room: ${roomDetails.count} players`, this.canvas.width - 10, 20);
    }
  }
}
