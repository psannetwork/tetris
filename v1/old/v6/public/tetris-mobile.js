const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");
context.scale(30, 7.5);

const nextCanvas = document.getElementById("next");
const nextContext = nextCanvas.getContext("2d");
nextContext.scale(50, 50);

const holdCanvas = document.getElementById("hold");
const holdContext = holdCanvas.getContext("2d");
holdContext.scale(50, 50);

let lineCount = 0;
let renCount = 0; 

function arenaSweep() {
    let rowCount = 1;
    let linesCleared = 0;

    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }

        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;

        player.score += rowCount * 10;
        rowCount *= 2;

        lineCount++;
        linesCleared++;
    }

    let chainCount = 0;

    if (linesCleared > 0) {
        renCount++; 
        if (renCount === 1) {
            chainCount = linesCleared;
        } else if (renCount >= 2) {
            chainCount = linesCleared + renCount - 1;
        }
        attacker = 1; 
        socket.emit("ren", chainCount);
        setTimeout(() => {
            attacker = 0;
            console.log("attacker:", attacker);
        }, 600);
    } else {
        renCount = 0; // Reset renCount if no lines were cleared
    }

    lineCount = 0;
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

function drawMatrix(context, matrix, offset, alpha = 1) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = colors[value];
                context.globalAlpha = alpha;
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
                context.globalAlpha = 1;
                context.strokeStyle = "black";
                context.lineWidth = 0.05;
                context.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function draw() {
    context.fillStyle = "#000";
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(context, arena, { x: 0, y: 0 });
    drawMatrix(context, player.matrix, player.pos);
    drawPrediction();

    holdContext.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (player.heldMatrix) {
        drawMatrix(holdContext, player.heldMatrix, { x: 0, y: 0 });
    }

    nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (player.nextMatrix) {
        drawMatrix(nextContext, player.nextMatrix, { x: 0, y: 0 });
    }
}

function drawPrediction() {
    const pos = { ...player.pos };
    while (!collide(arena, { ...player, pos })) {
        pos.y++;
    }
    pos.y--;
    drawMatrix(context, player.matrix, pos, 0.3);
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

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function hardDrop() {
    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function holdPiece() {
    if (!player.held) {
        player.held = true;
        const tempMatrix = player.heldMatrix;
        player.heldMatrix = player.matrix;
        if (tempMatrix) {
            player.matrix = tempMatrix;
        } else {
            playerReset();
        }
        player.pos.y = 0;
        player.pos.x =
            ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);
    }
}

function playerReset() {
    if (!player.nextMatrix) {
        const pieces = "TJLOSZI";
        player.nextMatrix = createPiece(
            pieces[(pieces.length * Math.random()) | 0]
        );
    }
    player.matrix = player.nextMatrix;
    const pieces = "TJLOSZI";
    player.nextMatrix = createPiece(
        pieces[(pieces.length * Math.random()) | 0]
    );
    player.pos.y = 0;
    player.pos.x =
        ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);

    if (collide(arena, player)) {
        arena.forEach((row) => row.fill(0));
        player.score = 0;
        updateScore();
        drawGameOver();
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
    player.held = false;
    renCount = 0; // Reset renCount on player reset
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

let dropCounter = 0;
let dropInterval = 1000;

let lastTime = 0;
function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

function updateScore() {
    document.getElementById("score").innerText = `Score: ${player.score}`;
}
function drawGameOver() {
    const gameover = document.createElement("div");
    gameover.id = "counter";
    gameover.style.display = "none"; 
    gameover.style.position = "absolute";
    gameover.style.top = "50%";
    gameover.style.left = "50%";
    gameover.style.transform = "translate(-50%, -50%)";
    gameover.style.fontSize = "2em";
    gameover.style.padding = "20px";
    gameover.style.backgroundColor = "black";
    gameover.style.border = "1px solid #ccc";
    gameover.style.borderRadius = "10px";
    gameover.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
    document.body.appendChild(gameover);
    gameover.style.display = "block";
    gameover.innerText = "Game Over";
}
function drawWin() {
    const gameover = document.createElement("div");
    gameover.id = "counter";
    gameover.style.display = "none"; 
    gameover.style.position = "absolute";
    gameover.style.top = "50%";
    gameover.style.left = "50%";
    gameover.style.transform = "translate(-50%, -50%)";
    gameover.style.fontSize = "2em";
    gameover.style.padding = "20px";
    gameover.style.backgroundColor = "black";
    gameover.style.border = "1px solid #ccc";
    gameover.style.borderRadius = "10px";
    gameover.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
    document.body.appendChild(gameover);
    gameover.style.display = "block";
    gameover.innerText = "You Win!";
}
function stopgames() {
    drawWin();

    setTimeout(() => {
        location.reload();
    }, 2000); 
}
const colors = [
    null,
    "#FF0D72", 
    "#0DC2FF", 
    "#0DFF72", 
    "#F538FF", 
    "#FF8E0D", 
    "#FFE138", 
    "#3877FF", 
    "#A9A9A9", 
];
const arena = createMatrix(10, 20);

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    nextMatrix: null,
    heldMatrix: null,
    held: false,
    score: 0,
};

let arrowLeft = false;
let arrowRight = false;
let arrowDown = false;

document.addEventListener("keydown", (event) => {
    if (event.keyCode === 37) {
        arrowLeft = true;
    } else if (event.keyCode === 39) {
        arrowRight = true;
    } else if (event.keyCode === 40) {
        arrowDown = true;
    } else if (event.keyCode === 90) {
        playerRotate(-1);
    } else if (event.keyCode === 88) {
        playerRotate(1);
    } else if (event.keyCode === 32) {
        hardDrop();
    } else if (event.keyCode === 67) {
        holdPiece();
    }
});

document.addEventListener("keyup", (event) => {
    if (event.keyCode === 37) {
        arrowLeft = false;
    } else if (event.keyCode === 39) {
        arrowRight = false;
    } else if (event.keyCode === 40) {
        arrowDown = false;
    }
});

function smoothMovement() {
    if (arrowLeft) {
        playerMove(-1);
    }
    if (arrowRight) {
        playerMove(1);
    }
    if (arrowDown) {
        playerDrop();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /iphone|android/.test(userAgent);

    if (isMobile) {
        document.getElementById("controlButtons").style.display = "flex";

        document
            .getElementById("leftButton")
            .addEventListener("click", () => playerMove(-1));
        document
            .getElementById("rightButton")
            .addEventListener("click", () => playerMove(1));
        document
            .getElementById("downButton")
            .addEventListener("click", () => playerDrop());
        document
            .getElementById("rotateLeftButton")
            .addEventListener("click", () => playerRotate(-1));
        document
            .getElementById("rotateRightButton")
            .addEventListener("click", () => playerRotate(1));
        document
            .getElementById("hardDropButton")
            .addEventListener("click", () => hardDrop());
        document
            .getElementById("holdButton")
            .addEventListener("click", () => holdPiece());
    }
});

function startgames() {
    setInterval(smoothMovement, 100); 

    playerReset();
    updateScore();
    update();
}

function attacked(lines) {
    for (let y = 0; y < arena.length - lines; ++y) {
        arena[y] = arena[y + lines];
    }
    for (let y = arena.length - lines; y < arena.length; ++y) {
        arena[y] = new Array(arena[0].length).fill(8);
        const hole = (Math.random() * arena[0].length) | 0;
        arena[y][hole] = 0;
    }
}

console.log(arena);

function debugAddBlock(arena, position, value) {
    const { x, y } = position;

    if (arena[y] && arena[y][x] !== undefined) {
        arena[y][x] = value;
    }
}

const blockValue = 1;


console.log(arena);