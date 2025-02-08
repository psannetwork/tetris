class Board {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.grid = this.createGrid(rows, cols);
  }
  
  createGrid(rows, cols) {
    return Array.from({ length: rows }, () => Array(cols).fill(null));
  }
  
  isInside(x, y) {
    return x >= 0 && x < this.cols && y < this.rows;
  }
  
  // 衝突判定（上部は出現中なので許容）
  collides(piece, shape = piece.shape, offsetX = piece.x, offsetY = piece.y) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          let boardX = offsetX + x;
          let boardY = offsetY + y;
          if (boardY < 0) continue;
          if (!this.isInside(boardX, boardY) || this.grid[boardY][boardX]) {
            return true;
          }
        }
      }
    }
    return false;
  }
  
  // ピースを盤面に固定（盤面外は無視）
  placePiece(piece) {
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
  
  // ラインクリア：全行をチェックし、完全に埋まっている行を削除する  
  // 【修正】削除処理は、対象行を除いた新しいグリッドを作成する方式に変更
  clearLines(callback) {
    let linesCleared = [];
    for (let y = 0; y < this.rows; y++) {
      if (this.grid[y].every(cell => cell !== null)) {
        linesCleared.push(y);
      }
    }
    if (linesCleared.length > 0) {
      // 降順にソートしておく（ただし新しいグリッド作成方式であれば順序は気にしなくてもよい）
      linesCleared.sort((a, b) => b - a);
      // 一瞬エフェクト用に白く表示
      for (let y of linesCleared) {
        this.grid[y] = this.grid[y].map(cell => '#FFFFFF');
      }
      setTimeout(() => {
        // 新しいグリッドを作成（削除すべき行以外の行をそのまま保持し、足りなければ空行を先頭に追加）
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
}
