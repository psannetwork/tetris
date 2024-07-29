const socket = io();

let currentRoomId = "";
let attacker = 0;
const urlParams = new URLSearchParams(window.location.search);
const roomIdFromUrl = urlParams.get("ids");

if (roomIdFromUrl) {
  currentRoomId = roomIdFromUrl;
  socket.emit("joinRoom", currentRoomId);
}

//socket.emit("ren", chaincount);
socket.on("ren", (message) => {
  if (attacker === 0) {
    var chains = parseInt(message, 10);
    attacked(chains);
  }
});

const counterDiv = document.createElement("div");
counterDiv.id = "counter";
counterDiv.style.display = "none"; // Initially hidden
counterDiv.style.position = "absolute";
counterDiv.style.top = "50%";
counterDiv.style.left = "50%";
counterDiv.style.transform = "translate(-50%, -50%)";
counterDiv.style.fontSize = "2em";
counterDiv.style.padding = "20px";
counterDiv.style.backgroundColor = "black";
counterDiv.style.border = "1px solid #ccc";
counterDiv.style.borderRadius = "10px";
counterDiv.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
document.body.appendChild(counterDiv);
socket.on("counter", (message) => {
  console.log(message);
  if (message == 1) {
    counterDiv.style.display = "none";
  } else {
    counterDiv.style.display = "block";
    counterDiv.innerText = message - 1;
  }
});

socket.on("chatMessage", (message) => {
  const match = message;
  console.log(match);
  if (message.match(/ren(\d+)/)) {
    const number = match[1];
    attacked(number);
  } else if (match === "start") {
    startgames();
    audioPlayer.play();
  } else if (match === "stop") {
    stopgames();
    audioPlayer.pause();
  } else if (match === "blocked") {
    setTimeout(() => {
      location.reload();
    }, 9000); // 9秒後にリロード
  }
});

const audioPlayer = document.getElementById("audioPlayer");
