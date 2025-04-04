const countDisplay = document.getElementById('countDisplay');

socket.on("chat message", function (msg) {
  console.log(msg);
  if (msg === "消えたよ") {
    setkiller();
  }
  if (msg === "stop") {
        pauseAudio();

    alert("You win!");
    location.reload();
  }
  if (msg === "start") {
    startgames();
        playAudio();

  }
});

  socket.on("update users count", (count) => {
    const userCountElement = document.getElementById("userCount");
    userCountElement.textContent = "Total users: " + count;
  });

function updateUsersCount(count) {
  var userCountElement = document.getElementById("user-count");
  userCountElement.textContent = "Users: " + count;
}

socket.on("connect", function () {
  socket.emit("new user");

  socket.emit("update users count", socket.io.engine.clientsCount);

  var playerName = "player" + Math.floor(Math.random() * 1000);
  socket.emit("chat message", "Join a " + playerName);
});

let countElement = null;

socket.on("count message", function (counts) {
  console.log(counts);

  const newElement = document.createElement("div");
  newElement.textContent = "Please wait... " + counts;
  newElement.style.position = "fixed";
  newElement.style.top = "50%";
  newElement.style.left = "50%";
  newElement.style.transform = "translate(-50%, -50%)";
  newElement.style.zIndex = "2";

  if (countElement) {
    countElement.remove();
  }

  document.body.appendChild(newElement);
  countElement = newElement;

  if (counts === 1) {
    countElement.remove();
    countElement = null;
  }
});

socket.on("disconnect", function () {
  socket.emit("update users count", socket.io.engine.clientsCount - 1);
});

function getCurrentTetrisConfiguration() {
  const configuration = arena.map((row) => row.slice());

  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        configuration[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });

  return configuration;
}

function generateRandomUserId() {
  return Math.floor(Math.random() * 10 ** 20)
    .toString()
    .padStart(20, "0");
}

var user = generateRandomUserId();

function sendCurrent() {
  var currents = getCurrentTetrisConfiguration();
  socket.emit("current", currents, user);
}

setInterval(sendCurrent, 1000);

socket.on("current", (currents, user) => {
  console.log(currents);
  console.log(user);
});

//接続確認
setInterval(() => {
  if (socket.connected) {
    console.log("接続が確立されています");
  } else {
    console.log("接続が切断されています");
    location.reload();
  }
}, 10000);


function playAudio() {
  var audio = document.getElementById("audio");
  audio.play();
}

function pauseAudio() {
  var audio = document.getElementById("audio");
  audio.pause();
}
