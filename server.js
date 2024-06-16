const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let users = 0; // 接続しているユーザーの総数
let gameStarted = false; // ゲームの状態を管理
let startUserName = null; // ゲーム開始時のユーザー名

// 静的ファイルの提供
app.use(express.static("public"));

// ルートへのアクセス時にindex.htmlを送信
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

// 接続時の処理
io.on("connection", (socket) => {
    console.log("a user connected");
    if (gameStarted) {
        // ゲームが開始している場合は、接続を切断して新規接続を許可しない
        console.log("game is already started, disconnecting user");
        return socket.disconnect(true);
    }
    users++; // ユーザー数を増やす
    io.emit("update users count", users); // 現在のユーザー数を全てのクライアントに送信
    console.log(users);

    // ゲーム開始条件を満たしているかチェックし、条件を満たしていれば10秒後にゲームを開始する
    if (users >= 2 && !gameStarted) {
        let count = 10;
        const countDown = setInterval(() => {
            console.log(count);
            io.emit("count message", count);

            count--;
            if (count === 0) {
                clearInterval(countDown); // カウントダウン停止
                io.emit("chat message", "start");
                gameStarted = true; // ゲームを開始状態にする
            }
        }, 1000); // 1秒ごとにカウントダウン

        console.log("Game starting in 10 seconds...");
    }

    // 切断時の処理
    socket.on("disconnect", () => {
        console.log("user disconnected");
        users--; // ユーザー数を減らす
        io.emit("update users count", users); // 現在のユーザー数を全てのクライアントに送信
        console.log(users);

        // ユーザーが1人になった場合、ゲームを終了状態にする
        if (users < 2 && gameStarted) {
            gameStarted = false;
            io.emit("chat message", "stop");
        }
    });

    // チャットメッセージの受信と送信
    socket.on("chat message", (msg) => {
        io.emit("chat message", msg);
    });

    // ゲーム開始時のユーザー名を記録
    if (!gameStarted) {
        startUserName = socket.id;
    }
});

// サーバーの起動
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`listening on http://localhost:${PORT}`);
});
