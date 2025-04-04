// js/piece.js
class Piece {
  constructor(type) {
    this.type = type;
    this.originalShape = TETROMINOES[type].shape.map(row => row.slice());
    this.shape = TETROMINOES[type].shape.map(row => row.slice());
    this.color = TETROMINOES[type].color;
    this.pivot = TETROMINOES[type].pivot ? { ...TETROMINOES[type].pivot } : { x: 0, y: 0 };
    let bounds = getPieceBounds(this);
    this.spawnOffset = { x: bounds.minX, y: bounds.minY };
    let width = bounds.maxX - bounds.minX + 1;
    let height = bounds.maxY - bounds.minY + 1;
    this.x = Math.floor((COLS - width) / 2) - bounds.minX;
    this.y = -height;
    this.lastAction = null;
    this.isSpin = false;
    this.lastKick = null;
  }
  
  rotate(dir, board) {
    let rotated = rotateMatrix(this.shape, dir);
    const kicks = [
      {x: 0, y: 0},
      {x: 1, y: 0},
      {x: -1, y: 0},
      {x: 0, y: -1},
      {x: 1, y: -1},
      {x: -1, y: -1},
      {x: 2, y: 0},
      {x: -2, y: 0}
    ];
    for (let offset of kicks) {
      if (!board.collides(this, rotated, this.x + offset.x, this.y + offset.y)) {
        this.shape = rotated;
        this.x += offset.x;
        this.y += offset.y;
        this.lastAction = "rotate";
        this.lastKick = offset;
        return;
      }
    }
  }
}
