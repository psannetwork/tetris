// js/constants.js

const SERVER_URL = 'wss://tetris.psannetwork.net';

const COUNTDOWN_TIME = 5; // ※この値は config.js の countdownSeconds と同じ

// 以下、盤面・落下、ゲージ、サイドパネル、テトリミノ定義、採点定数は前述の通り…
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 32;
const DROP_INTERVAL_INITIAL = 1000;
const LOCK_DELAY = 500;
const SPIN_MESSAGE_DURATION = 1000;
const MAX_LOCK_RESETS = 15;
const GAUGE_HEIGHT = 200;     // ゲージの高さ（調整用）

const GARBAGE_DAMAGE = 20;
const GARBAGE_ANIM_INTERVAL = 300;
const IDLE_THRESHOLD = 2000;
const GAUGE_CONSUMPTION_PER_LINE = 5;
const MAX_GAUGE = 100;
const GARBAGE_LINES_PER_ADD = 2; // もともと4→2に変更：100ゲージで2ライン追加
const GAUGE_WIDTH = BLOCK_SIZE;

const GAUGE_TIME_WHITE = 2000;
const GAUGE_TIME_YELLOW = 4000;
const GAUGE_TIME_RED = 6000;
const GAUGE_INCREMENT_AMOUNT = MAX_GAUGE / ROWS;

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

const TETROMINOES = {
  'I': { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: '#00FFFF' },
  'O': { shape: [[1,1],[1,1]], color: '#FFFF00' },
  'T': { shape: [[0,1,0],[1,1,1],[0,0,0]], color: '#AA00FF', pivot: { x: 1, y: 1 } },
  'S': { shape: [[0,1,1],[1,1,0],[0,0,0]], color: '#00FF00' },
  'Z': { shape: [[1,1,0],[0,1,1],[0,0,0]], color: '#FF0000' },
  'J': { shape: [[1,0,0],[1,1,1],[0,0,0]], color: '#0000FF' },
  'L': { shape: [[0,0,1],[1,1,1],[0,0,0]], color: '#FFA500', pivot: { x: 1, y: 1 } }
};

const SCORE_VALUES = {
  SINGLE: 100,
  DOUBLE: 300,
  TRIPLE: 500,
  TETRIS: 800,
  TSPIN: 400,
  TSPIN_SINGLE: 800,
  TSPIN_DOUBLE: 1200,
  TSPIN_TRIPLE: 1600,
  TSPIN_MINI: 100,
  SOFT_DROP: 2,
  HARD_DROP: 2,
  PERFECT_CLEAR: 2000
};
