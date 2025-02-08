// js/assets.js
const Assets = {
  images: {},
  sounds: {},
  loadImage: function(name, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        Assets.images[name] = img;
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`Image "${src}" not found. Fallback will be used.`);
        Assets.images[name] = null;
        resolve(null);
      };
      img.src = src;
    });
  },
  loadSound: function(name, src, loop = false) {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.loop = loop;
      audio.oncanplaythrough = () => {
        Assets.sounds[name] = audio;
        resolve(audio);
      };
      audio.onerror = () => {
        console.warn(`Sound "${src}" not found or cannot be played.`);
        Assets.sounds[name] = null;
        resolve(null);
      };
      audio.src = src;
      audio.load();
    });
  },
  loadAll: async function() {
    const promises = [];
    // 画像の読み込み例
    promises.push(Assets.loadImage('background', 'img/background.png'));
    promises.push(Assets.loadImage('block', 'img/block.png'));
    // 必要に応じて他の画像を追加
    
    // 音声の読み込み例（BGMはループ再生）
    promises.push(Assets.loadSound('bgm', 'sounds/bgm.mp3', true));
    promises.push(Assets.loadSound('rotate', 'sounds/rotate.wav'));
    promises.push(Assets.loadSound('drop', 'sounds/drop.wav'));
    promises.push(Assets.loadSound('tspin', 'sounds/tspin.wav'));
    // 必要に応じて他の効果音を追加
    
    await Promise.all(promises);
    console.log("Assets loaded:", Assets);
  }
};

function playSound(name) {
  if (Assets.sounds && Assets.sounds[name]) {
    try {
      Assets.sounds[name].currentTime = 0;
      Assets.sounds[name].play();
    } catch (e) {
      console.warn(`Failed to play sound "${name}":`, e);
    }
  }
}
