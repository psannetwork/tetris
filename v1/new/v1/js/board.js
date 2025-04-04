// js/board.js
(function(){
  // Board クラスをグローバルに定義する
  class Board {
    constructor(rows, cols) {
      this.rows = rows;
      this.cols = cols;
      this.grid = this.createGrid(rows, cols);
      // 最後に操作があった時刻（ミリ秒）を記録する
      this.lastOperationTime = Date.now();
    }
    
    // 指定サイズのグリッドを作成（各セルは null で初期化）
    createGrid(rows, cols) {
      return Array.from({ length: rows }, () => Array(cols).fill(null));
    }
    
    // 指定座標 (x, y) が盤面内かチェックする
    isInside(x, y) {
      return x >= 0 && x < this.cols && y < this.rows;
    }
    
    // ピースが指定位置に配置された場合に衝突するか判定する
    // shape, offsetX, offsetY は省略時はピースのプロパティを使用
    collides(piece, shape = piece.shape, offsetX = piece.x, offsetY = piece.y) {
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            let boardX = offsetX + x;
            let boardY = offsetY + y;
            if (boardX < 0 || boardX >= this.cols) return true;
            if (boardY >= 0) {
              if (boardY >= this.rows || this.grid[boardY][boardX]) return true;
            }
          }
        }
      }
      return false;
    }
    
    // ピースを盤面に固定する（グリッドにピースの色を記録）
    placePiece(piece) {
      // 操作があったので最後の操作時刻を更新
      this.recordOperation();
      for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
          if (piece.shape[y][x]) {
            let boardX = piece.x + x;
            let boardY = piece.y + y;
            if (boardY >= 0) {
              this.grid[boardY][boardX] = piece.color;
            }
          }
        }
      }
    }
    
    // ラインが全て埋まっている行を消去する
    // 消去後、空行を上部に追加して元の行数に戻す
    // callback には消去されたライン数が渡される
    clearLines(callback) {
      let linesCleared = [];
      for (let y = 0; y < this.rows; y++) {
        if (this.grid[y].every(cell => cell !== null)) {
          linesCleared.push(y);
        }
      }
      if (linesCleared.length > 0) {
        linesCleared.sort((a, b) => b - a);
        for (let y of linesCleared) {
          this.grid[y] = this.grid[y].map(cell => '#FFFFFF');
        }
        setTimeout(() => {
          let newGrid = [];
          for (let y = 0; y < this.rows; y++) {
            if (!linesCleared.includes(y)) {
              newGrid.push(this.grid[y]);
            }
          }
          while (newGrid.length < this.rows) {
            newGrid.unshift(Array(this.cols).fill(null));
          }
          this.grid = newGrid;
          requestAnimationFrame(() => {
            if (callback) callback(linesCleared.length);
          });
        }, 100);
      } else {
        if (callback) callback(0);
      }
    }
    
    // ------------------------------
    // 無操作によるタイムアウト判定
    // ------------------------------
    
    recordOperation() {
      this.lastOperationTime = Date.now();
    }
    
    isIdle(timeoutDuration) {
      return (Date.now() - this.lastOperationTime) > timeoutDuration;
    }
    
    checkIdleTimeout(timeoutDuration, onTimeoutCallback) {
      if (this.isIdle(timeoutDuration)) {
        onTimeoutCallback();
      }
    }
    
    // ------------------------------
    // 複数プレイヤー用の背景リモートボード計算
    // ------------------------------
static getRemoteBoardRect(index, total, canvasWidth, canvasHeight, mainBoardRect) {
  const margin = 20;
  let rect = {};
  
  const remoteWidth = mainBoardRect.width * 0.25;
  const remoteHeight = mainBoardRect.height * 0.25;

  const rows = Math.ceil(total / 2); 
  const col = index % 2; 
  const row = Math.floor(index / 2);

  rect = {
    x: margin + col * (remoteWidth + margin),
    y: margin + row * (remoteHeight + margin),
    width: remoteWidth,
    height: remoteHeight
  };

  return rect;
}

  }
  
  // グローバルに公開
  window.Board = Board;
})();
