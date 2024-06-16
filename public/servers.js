var socket = io();
var test = "a";
socket.emit("chat message", test);

socket.on("chat message", function (msg) {
  console.log(msg);
  if (msg === "消えたよ") {
    setkiller();
  }
  if (msg === "stop") {
    alert("You win!");
  }
  if (msg === "start") {
    startgames();
  }
});
socket.on("update users count", (count) => {
  console.log("Total users:", count);
});
function updateUsersCount(count) {
  var userCountElement = document.getElementById("user-count");
  userCountElement.textContent = count;
}

socket.on("connect", function () {
  socket.emit("new user");

  socket.emit("update users count", socket.io.engine.clientsCount);

  var playerName = "player" + Math.floor(Math.random() * 1000);
  socket.emit("chat message", "Join a " + playerName);
});

// 接続されたユーザー数を更新
socket.on("update users count", function (count) {
  updateUsersCount(count);
});

// ユーザーが切断した時の処理
socket.on("disconnect", function () {
  // 接続された全てのクライアントに現在の接続数を送信
  socket.emit("update users count", socket.io.engine.clientsCount - 1);
});

function startAllUsers() {
  socket.emit("chat message", "start");
}
