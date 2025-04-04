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
