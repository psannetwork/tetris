const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let users = 0;
let gameStarted = false;
let starter = 0;

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

io.on("connection", (socket) => {
    console.log("a user connected");

    if (gameStarted) {
        console.log("game is already started, disconnecting user");
        return socket.disconnect(true);
    }

    users++;
    io.emit("update users count", users);
    console.log(users);

    if (users >= 2 && !gameStarted && starter === 0) {
        starter = 1;
        let count = 10;
        const countDown = setInterval(() => {
            console.log(count);
            io.emit("count message", count);
            count--;

            if (count === 0) {
                clearInterval(countDown);
                io.emit("chat message", "start");
                gameStarted = true;
            }
        }, 1000);

        console.log("Game starting in 10 seconds...");
    }

    socket.on("disconnect", () => {
        console.log("user disconnected");
        users--;
        io.emit("update users count", users);
        console.log(users);

        if (users < 2 && gameStarted) {
            gameStarted = false;
            starter = 0;
            io.emit("chat message", "stop");
        }
    });

    socket.on("chat message", (msg) => {
        io.emit("chat message", msg);
    });

    socket.on("current", (currents, user) => {
        console.log("currents:", currents);
        console.log("user:", user);
        io.emit("current", currents, user);
    });

    socket.on("controller", (user, msg) => {
        io.emit("controller", user, msg);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`listening on http://localhost:${PORT}`);
});
