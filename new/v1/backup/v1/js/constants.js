// 盤面・落下関連の定数
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 32;
const DROP_INTERVAL_INITIAL = 1000;
const LOCK_DELAY = 500;
const SPIN_MESSAGE_DURATION = 1000;
const MAX_LOCK_RESETS = 15;

// 攻撃（防御）ゲージ関連
const MAX_GAUGE = 100;
const GARBAGE_DAMAGE = 20;
const GARBAGE_ANIM_INTERVAL = 300;
const IDLE_THRESHOLD = 2000;
// １列消去あたりのゲージ消費量（例：20）
const GAUGE_CONSUMPTION_PER_LINE = 20;
// ガベージ追加時に一度に追加する行数
const GARBAGE_LINES_PER_ADD = 4;

// ゲージの表示幅を1マス分に変更
const GAUGE_WIDTH = BLOCK_SIZE;  // 32px

// ゲージ蓄積時間に応じた色変化の閾値（ミリ秒）
const GAUGE_TIME_WHITE = 2000;   // 0～2秒：白
const GAUGE_TIME_YELLOW = 4000;  // 2～4秒：黄色
const GAUGE_TIME_RED = 6000;     // 4～6秒：赤（6秒以降は点滅）

// ★【修正】1マス分のゲージ増加量（MAX_GAUGE を ROWS で割る）  
const GAUGE_INCREMENT_AMOUNT = MAX_GAUGE / ROWS;  // 例: 100/20 = 5

// サイドパネル
const HOLD_PANEL_BLOCKS = 6;
const HOLD_PANEL_HEIGHT = 4;
const NEXT_PANEL_BLOCKS = 6;
const NEXT_PANEL_BOX_HEIGHT = 4;

const HOLD_PANEL_WIDTH = HOLD_PANEL_BLOCKS * BLOCK_SIZE;
const GAP_BETWEEN = 10;
const BOARD_OFFSET_X = HOLD_PANEL_WIDTH + GAUGE_WIDTH + GAP_BETWEEN;
const PLAYFIELD_WIDTH = COLS * BLOCK_SIZE;
const NEXT_PANEL_WIDTH = NEXT_PANEL_BLOCKS * BLOCK_SIZE;
const CANVAS_WIDTH = HOLD_PANEL_WIDTH + GAUGE_WIDTH + GAP_BETWEEN + PLAYFIELD_WIDTH + NEXT_PANEL_WIDTH;
const CANVAS_HEIGHT = ROWS * BLOCK_SIZE;

// テトリミノ定義（T, L には回転軸 pivot を設定。その他はデフォルト {0,0}）
const TETROMINOES = {
  'I': {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: '#00FFFF'
  },
  'O': {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#FFFF00'
  },
  'T': {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#AA00FF',
    pivot: { x: 1, y: 1 }
  },
  'S': {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: '#00FF00'
  },
  'Z': {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: '#FF0000'
  },
  'J': {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#0000FF'
  },
  'L': {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#FFA500',
    pivot: { x: 1, y: 1 }
  }
};

// 採点定数（あくまで例です）
const SCORE_VALUES = {
  SINGLE: 100,
  DOUBLE: 300,
  TRIPLE: 500,
  TETRIS: 800,
  TSPIN: 400,            // T-Spin（ライン消しなし）
  TSPIN_SINGLE: 800,
  TSPIN_DOUBLE: 1200,
  TSPIN_TRIPLE: 1600,
  TSPIN_MINI: 100,       // T-Spin Mini（ライン消しなし／例）
  SOFT_DROP: 2,
  HARD_DROP: 2,
  PERFECT_CLEAR: 2000    // パーフェクトクリアボーナス
};
