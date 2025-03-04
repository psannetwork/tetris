function getGameState() {
  return {
    board, // 現在のボード状態
    hold: holdPiece, // ホールド中のミノ
    next: nextPieces, // Next キューのミノたち
    currentPiece: {
      type: currentPiece.type,
      x: currentPiece.x,
      y: currentPiece.y,
      rotation: currentPiece.rotation
    }, // 操作中のミノの情報
    score // 現在のスコア
  };
}