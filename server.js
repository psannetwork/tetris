const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

let users = 0; // 接続しているユーザーの総数

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

io.on("connection", (socket) => {
    console.log("a user connected");
    users++; // ユーザー数を増やす
    io.emit("update users count", users); // 現在のユーザー数を全てのクライアントに送信
    console.log(users);
    socket.on("disconnect", () => {
        console.log("user disconnected");
        users--; // ユーザー数を減らす
        io.emit("update users count", users); // 現在のユーザー数を全てのクライアントに送信
        console.log(users);
    });

    socket.on("chat message", (msg) => {
        io.emit("chat message", msg);
    });
});

const PORT = process.env.PORT || 1000;
server.listen(PORT, () => {
    console.log(`listening on http://localhost:${PORT}`);
});
