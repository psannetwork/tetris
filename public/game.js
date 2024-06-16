const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");
context.scale(30, 30);

const holdCanvas = document.getElementById("holdCanvas");
const holdContext = holdCanvas.getContext("2d");
holdContext.scale(15, 15);

const colors = [
    null,
    "#FF0D72",
    "#0DC2FF",
    "#0DFF72",
    "#F538FF",
    "#FF8E0D",
    "#FFE138",
    "#3877FF",
];

const arena = createMatrix(10, 20);

let holdPiece = null;
let holdUsed = false;
let gameOver = false;

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0,
};

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function createPiece(type) {
    if (type === "T") {
        return [
            [0, 0, 0],
            [1, 1, 1],
            [0, 1, 0],
        ];
    } else if (type === "O") {
        return [
            [2, 2],
            [2, 2],
        ];
    } else if (type === "L") {
        return [
            [0, 3, 0],
            [0, 3, 0],
            [0, 3, 3],
        ];
    } else if (type === "J") {
        return [
            [0, 4, 0],
            [0, 4, 0],
            [4, 4, 0],
        ];
    } else if (type === "I") {
        return [
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
        ];
    } else if (type === "S") {
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ];
    } else if (type === "Z") {
        return [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0],
        ];
    }
}

function drawMatrix(matrix, offset, context, scale) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = colors[value];
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
                context.strokeStyle = "#000";
                context.lineWidth = 0.05;
                context.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function draw() {
    context.fillStyle = "#000";
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(arena, { x: 0, y: 0 }, context, 30);
    drawMatrix(player.matrix, player.pos, context, 30);

    holdContext.fillStyle = "#000";
    holdContext.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (holdPiece) {
        drawMatrix(holdPiece, { x: 1, y: 1 }, holdContext, 15);
    }
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (
                m[y][x] !== 0 &&
                (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0
            ) {
                return true;
            }
        }
    }
    return false;
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }

    if (dir > 0) {
        matrix.forEach((row) => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
        if (gameOver) {
            alert("Game Over! Your score: " + player.score);
            document.location.reload();
        }
    }
    dropCounter = 0;
}

function playerHardDrop() {
    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
    if (gameOver) {
        alert("Game Over! Your score: " + player.score);
        document.location.reload();
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerHold() {
    if (!holdUsed) {
        if (holdPiece) {
            let temp = player.matrix;
            player.matrix = holdPiece;
            holdPiece = temp;
        } else {
            holdPiece = player.matrix;
            playerReset();
        }
        holdUsed = true;
    }
}

function playerReset() {
    const pieces = "TJLOSZI";
    player.matrix = createPiece(pieces[(pieces.length * Math.random()) | 0]);
    player.pos.y = 0;
    player.pos.x =
        ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);
    holdUsed = false;
    if (collide(arena, player)) {
        arena.forEach((row) => row.fill(0));
        gameOver = true;
    }
}
function arenaSweep() {
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }

        // ブロックを消す処理
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        player.score += 10;
        if (player.score % 50 === 0) {
            dropInterval = Math.max(dropInterval - 50, 100);
        }
    }
}

let dropCounter = 0;
let dropInterval = 1000;

let lastTime = 0;
function update(time = 0) {
    const deltaTime = time - lastTime;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    lastTime = time;

    draw();
    requestAnimationFrame(update);
}

function updateScore() {
    document.getElementById("score").innerText = "Score: " + player.score;
}

const keyState = {};

document.addEventListener("keydown", (event) => {
    console.log(event.keyCode);

    if (event.keyCode === 37) {
        keyState.left = true;
    } else if (event.keyCode === 39) {
        keyState.right = true;
    } else if (event.keyCode === 40) {
        keyState.down = true;
    } else if (event.keyCode === 90) {
        playerRotate(-1);
    } else if (event.keyCode === 88) {
        playerRotate(1);
    } else if (event.keyCode === 38) {
        playerHardDrop();
    } else if (event.keyCode === 32) {
        playerHold();
    }
});

document.addEventListener("keyup", (event) => {
    if (event.keyCode === 37) {
        keyState.left = false;
    } else if (event.keyCode === 39) {
        keyState.right = false;
    } else if (event.keyCode === 40) {
        keyState.down = false;
    }
});

function handleKeyStates() {
    if (keyState.left) {
        playerMove(-1);
    } else if (keyState.right) {
        playerMove(1);
    } else if (keyState.down) {
        playerDrop();
    }
}

function placeDebugValue(x, y, value) {
    if (x === null && y >= 0 && y < arena.length) {
        const randomIndex = Math.floor(Math.random() * arena[y].length);
        for (let i = 0; i < arena[y].length; i++) {
            if (i !== randomIndex) {
                arena[y][i] = value;
            }
        }
        draw();
    } else if (x >= 0 && x < arena[0].length && y >= 0 && y < arena.length) {
        arena[y][x] = value;
        draw();
    } else {
        console.log("Invalid coordinates:", x, y);
    }
}

function moveRowsUp() {
    for (let y = 1; y < arena.length; y++) {
        arena[y - 1] = arena[y].slice();
    }
    arena[arena.length - 1] = new Array(arena[0].length).fill(0);
}

function setkiller() {
    moveRowsUp();
    placeDebugValue(null, arena.length - 1, 3);
    draw();
}
//setkiller();でおじゃま実行

//ここまで

setInterval(handleKeyStates, 100);

playerReset();
update();
updateScore();
setInterval(() => {
    arenaSweep();
}, 1000);
