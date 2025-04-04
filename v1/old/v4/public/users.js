const canvasLastSeen = {};
const TIMEOUT = 5000; 

function generateRandomString(length) {
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength),
        );
    }
    return result;
}

let randomString = generateRandomString(30);

function sendArenaPosition() {
    var ArenaPosition = JSON.stringify(arena) + randomString;
    socket.emit("positions", ArenaPosition);
}

setInterval(sendArenaPosition, 1000);

socket.on("positions", (message) => {
    console.log(message);
    const id = message.slice(-30);
    const arenaDataString = message.slice(0, -30);
    const arenaData = JSON.parse(arenaDataString);
    renderTetrisGrid(id, arenaData);

    canvasLastSeen[id] = Date.now();
});

function renderTetrisGrid(id, arenaData) {
    let canvas = document.getElementById(id);
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = id;
        canvas.width = 200 / 2; 
        canvas.height = 400 / 2; 
        document.getElementById("canvasContainer").appendChild(canvas);
    }

    const ctx = canvas.getContext("2d");
    const blockSize = 20 / 2; 

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < arenaData.length; row++) {
        for (let col = 0; col < arenaData[row].length; col++) {
            if (arenaData[row][col] !== 0) {
                ctx.fillStyle = "blue"; 
                ctx.fillRect(
                    col * blockSize,
                    row * blockSize,
                    blockSize,
                    blockSize,
                );
                ctx.strokeRect(
                    col * blockSize,
                    row * blockSize,
                    blockSize,
                    blockSize,
                );
            }
        }
    }
}

function removeOldCanvases() {
    const now = Date.now();
    for (let id in canvasLastSeen) {
        if (now - canvasLastSeen[id] > TIMEOUT) {
            let canvas = document.getElementById(id);
            if (canvas) {
                document.getElementById("canvasContainer").removeChild(canvas);
            }
            delete canvasLastSeen[id];
        }
    }
}

setInterval(removeOldCanvases, 3000);
