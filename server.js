const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

io.on("connection", (socket) => {
    console.log("a user connected");

    socket.on("disconnect", () => {
        console.log("user disconnected");
    });

    socket.on("join room", (roomid) => {
        socket.leaveAll();
        socket.join(roomid);
        console.log(`user joined room ${roomid}`);
    });

    socket.on("chat message", (msg, roomid) => {
        io.to(roomid).emit("chat message", msg);
    });

    io.emit("update users count", io.sockets.adapter.rooms.size);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});
