// js/main.js
window.onload = async () => {
  const canvas = document.getElementById('gameCanvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  
  // アセットの読み込み（画像・音声が存在しなくてもエラーにならない）
  await Assets.loadAll();
  
  // ゲーム開始
  new TetrisGame(canvas);
  
  // BGM があれば再生（再生できなくても問題なく動作するように）
  if (Assets.sounds && Assets.sounds.bgm) {
    try {
      Assets.sounds.bgm.volume = 0.5;
      Assets.sounds.bgm.play();
    } catch (e) {
      console.warn("BGM playback failed:", e);
    }
  }
};
