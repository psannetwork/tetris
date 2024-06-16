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

// 前のカウント要素を格納するための変数
let countElement = null;

socket.on("count message", function (counts) {
  console.log(counts); // デバッグ用にコンソールに表示

  // 新しいカウント要素を作成
  const newElement = document.createElement("div");
  newElement.textContent = "Please wait... " + counts;
  newElement.style.position = "fixed";
  newElement.style.top = "50%";
  newElement.style.left = "50%";
  newElement.style.transform = "translate(-50%, -50%)";

  // 前のカウント要素が存在する場合は削除
  if (countElement) {
    countElement.remove();
  }

  // 新しいカウント要素をbodyに追加
  document.body.appendChild(newElement);

  // 新しいカウント要素をcountElementに格納して更新
  countElement = newElement;

  // カウントが1になったら要素を削除
  if (counts === 1) {
    countElement.remove();
    countElement = null; // countElementをリセット
  }
});

// ユーザーが切断した時の処理
socket.on("disconnect", function () {
  // 接続された全てのクライアントに現在の接続数を送信
  socket.emit("update users count", socket.io.engine.clientsCount - 1);
});
