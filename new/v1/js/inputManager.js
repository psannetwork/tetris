// js/inputManager.js
class InputManager {
  constructor() {
    this.keys = {};
    this.prevKeys = {};
    this.lastLeftTime = null;
    this.lastLeftRepeat = null;
    this.lastRightTime = null;
    this.lastRightRepeat = null;
    this.lastDownTime = null;
    this.lastDownRepeat = null;
    this.moveDelay = 150;
    this.moveInterval = 50;
    
    window.addEventListener("keydown", e => {
      this.keys[e.code] = true;
    });
    window.addEventListener("keyup", e => {
      this.keys[e.code] = false;
      if (e.code === "ArrowLeft") { this.lastLeftTime = null; this.lastLeftRepeat = null; }
      if (e.code === "ArrowRight") { this.lastRightTime = null; this.lastRightRepeat = null; }
      if (e.code === "ArrowDown") { this.lastDownTime = null; this.lastDownRepeat = null; }
    });
  }
  
  update(currentTime, game) {
    const justPressed = code => this.keys[code] && !this.prevKeys[code];
    if (justPressed("KeyZ")) { game.rotate(-1); }
    if (justPressed("KeyX")) { game.rotate(1); }
    if (justPressed("KeyC")) { game.hold(); }
    if (justPressed("Space")) { game.hardDrop(); }
    if (this.keys["ArrowLeft"]) {
      if (this.lastLeftTime === null) {
        this.lastLeftTime = currentTime;
        game.move(-1);
      } else if (currentTime - this.lastLeftTime > this.moveDelay) {
        if (this.lastLeftRepeat === null || currentTime - this.lastLeftRepeat > this.moveInterval) {
          game.move(-1);
          this.lastLeftRepeat = currentTime;
        }
      }
    } else {
      this.lastLeftTime = null;
      this.lastLeftRepeat = null;
    }
    
    if (this.keys["ArrowRight"]) {
      if (this.lastRightTime === null) {
        this.lastRightTime = currentTime;
        game.move(1);
      } else if (currentTime - this.lastRightTime > this.moveDelay) {
        if (this.lastRightRepeat === null || currentTime - this.lastRightRepeat > this.moveInterval) {
          game.move(1);
          this.lastRightRepeat = currentTime;
        }
      }
    } else {
      this.lastRightTime = null;
      this.lastRightRepeat = null;
    }
    
    if (this.keys["ArrowDown"]) {
      if (this.lastDownTime === null) {
        this.lastDownTime = currentTime;
        game.softDrop();
      } else if (currentTime - this.lastDownTime > this.moveDelay) {
        if (this.lastDownRepeat === null || currentTime - this.lastDownRepeat > this.moveInterval) {
          game.softDrop();
          this.lastDownRepeat = currentTime;
        }
      }
    } else {
      this.lastDownTime = null;
      this.lastDownRepeat = null;
    }
    
    for (let key in this.keys) {
      if (this.keys[key]) { game.lastUserInputTime = currentTime; break; }
    }
    for (let key in this.keys) {
      this.prevKeys[key] = this.keys[key];
    }
  }
}
