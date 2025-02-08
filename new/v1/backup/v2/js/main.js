window.onload = () => {
  const canvas = document.getElementById('gameCanvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  new TetrisGame(canvas);
};
