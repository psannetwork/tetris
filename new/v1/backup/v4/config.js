// config.js
module.exports = {
  port: 6000,
  defaultPlayer: {
    name: "Anonymous",
    rating: 1000
  },
  normalMatch: {
    minPlayers: 2,
    maxPlayers: 99,
    waitingTime: 5 // 待機時間（秒）
  },
  clientTimeout: 30,      // クライアントからの応答がこの秒数以内に来なければ通信エラーとする
  heartbeatInterval: 5    // サーバーがクライアントに ping を送る間隔（秒）
};